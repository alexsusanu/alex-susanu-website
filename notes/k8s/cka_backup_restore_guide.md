# CKA Guide: Kubernetes Backup & Restore - etcd Backup, Disaster Recovery & Cluster Management
category: Kubernetes Certification
tags: cka, kubernetes, exam, kubectl, certification

## Fundamental Conceptual Understanding

### The Data Hierarchy in Kubernetes

**Understanding What Needs Protection:**
```
Kubernetes Data Classification:

Cluster State Data (Critical - Must Backup):
├── etcd: All Kubernetes objects and configuration
│   ├── API objects: Deployments, Services, ConfigMaps, Secrets
│   ├── Cluster configuration: Nodes, namespaces, RBAC rules
│   ├── Resource quotas and limit ranges
│   ├── Custom resources and CRDs
│   └── Runtime state: Pod assignments, service endpoints
├── Certificates: PKI infrastructure for cluster security
├── Configuration files: kubelet, kube-proxy, CNI configurations
└── Add-on state: DNS, metrics, logging configurations

Application Data (Important - Separate Backup Strategy):
├── Persistent Volume data: Application databases and files
├── Application configurations: External to Kubernetes
├── Application state: Business data and user content
├── External dependencies: Databases, message queues
└── Container images: Registry backup and disaster recovery

Infrastructure State (Recoverable - Infrastructure as Code):
├── Node configurations: Can be rebuilt from automation
├── Network configurations: Cloud provider or infrastructure
├── Storage infrastructure: Usually managed separately
├── Monitoring and logging: Can be redeployed
└── CI/CD systems: Usually external to cluster
```

**The Recovery Time Hierarchy:**
```
Recovery Time Objectives (RTO) by Data Type:

Tier 1 - Critical (< 15 minutes):
├── etcd cluster state
├── Control plane certificates
├── DNS and networking configuration
└── Core system workloads

Tier 2 - Important (< 1 hour):
├── Application configurations
├── RBAC and security policies
├── Monitoring and logging
└── Development tools and dashboards

Tier 3 - Standard (< 4 hours):
├── Application data (if not in external systems)
├── Build artifacts and container images
├── Documentation and wikis
└── Development and testing environments

Tier 4 - Low Priority (< 24 hours):
├── Historical logs and metrics
├── Temporary development data
├── Non-critical testing environments
└── Archive and backup data
```

### etcd Architecture and Data Model

**etcd as the Source of Truth:**
```
etcd Role in Kubernetes:
├── Single Source of Truth: All cluster state stored in etcd
├── Distributed Consensus: Raft algorithm ensures consistency
├── High Availability: Multiple etcd instances for redundancy
├── Transactional: ACID properties for state changes
├── Watch API: Real-time notifications for state changes
├── Revision History: Point-in-time recovery capabilities
└── Compaction: Automatic cleanup of old revisions

Data Storage Model:
├── Key-Value Store: Hierarchical keys with binary values
├── Kubernetes Paths: /registry/deployments/default/webapp
├── Revisions: Each change gets incrementing revision number
├── Compaction: Old revisions removed to save space
├── Snapshots: Point-in-time backup of entire database
└── WAL (Write-Ahead Log): Transaction log for recovery

Backup Strategies:
├── Snapshot: Complete database backup (most common)
├── WAL Backup: Transaction log backup (continuous)
├── Data Directory: File system level backup (risky)
├── Streaming: Real-time replication to backup cluster
└── Cluster Restore: Complete cluster recreation from backup
```

**etcd Cluster Topology:**
```
Single etcd Instance (Development Only):
├── No redundancy or fault tolerance
├── Single point of failure
├── Simple backup and restore
├── Not recommended for production
└── Useful for testing and development

Multi-Member etcd Cluster (Production):
├── Odd number of members (3, 5, 7)
├── Quorum-based decisions (majority required)
├── Leader election for write operations
├── Automatic failover and recovery
├── Distributed backup considerations
└── Network partition tolerance

External etcd Cluster:
├── Separate from Kubernetes control plane
├── Dedicated etcd infrastructure
├── Independent scaling and management
├── Specialized backup procedures
└── Enterprise-grade high availability
```

## etcd Backup Procedures

### Snapshot-Based Backup

**Basic etcd Snapshot Creation:**
```bash
# Basic etcd snapshot command
ETCDCTL_API=3 etcdctl snapshot save snapshot.db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
  --key=/etc/kubernetes/pki/etcd/healthcheck-client.key

# Verify snapshot integrity
ETCDCTL_API=3 etcdctl snapshot status snapshot.db --write-out=table

# Example output:
# +----------+----------+------------+------------+
# |   HASH   | REVISION | TOTAL KEYS | TOTAL SIZE |
# +----------+----------+------------+------------+
# | 8e6f5b2c |      123 |       456  |     2.1 MB |
# +----------+----------+------------+------------+

# Get detailed snapshot information
ETCDCTL_API=3 etcdctl snapshot status snapshot.db --write-out=json | jq
```

**Production Backup Script:**
```bash
#!/bin/bash
# Production etcd backup script

set -euo pipefail

# Configuration
BACKUP_DIR="/opt/etcd-backups"
ETCD_ENDPOINTS="https://127.0.0.1:2379"
ETCD_CACERT="/etc/kubernetes/pki/etcd/ca.crt"
ETCD_CERT="/etc/kubernetes/pki/etcd/healthcheck-client.crt"
ETCD_KEY="/etc/kubernetes/pki/etcd/healthcheck-client.key"
RETENTION_DAYS=30
BACKUP_PREFIX="etcd-snapshot"

# Functions
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$BACKUP_DIR/backup.log"
}

check_etcd_health() {
    log "Checking etcd cluster health..."
    if ! ETCDCTL_API=3 etcdctl endpoint health \
        --endpoints="$ETCD_ENDPOINTS" \
        --cacert="$ETCD_CACERT" \
        --cert="$ETCD_CERT" \
        --key="$ETCD_KEY"; then
        log "ERROR: etcd cluster is not healthy"
        exit 1
    fi
    log "etcd cluster health check passed"
}

create_backup() {
    local timestamp=$(date +'%Y%m%d-%H%M%S')
    local backup_file="$BACKUP_DIR/${BACKUP_PREFIX}-${timestamp}.db"
    local temp_file="${backup_file}.tmp"
    
    log "Creating backup: $backup_file"
    
    # Create snapshot
    if ETCDCTL_API=3 etcdctl snapshot save "$temp_file" \
        --endpoints="$ETCD_ENDPOINTS" \
        --cacert="$ETCD_CACERT" \
        --cert="$ETCD_CERT" \
        --key="$ETCD_KEY"; then
        
        # Verify snapshot
        if ETCDCTL_API=3 etcdctl snapshot status "$temp_file" >/dev/null 2>&1; then
            mv "$temp_file" "$backup_file"
            log "Backup created successfully: $backup_file"
            
            # Get backup statistics
            local stats=$(ETCDCTL_API=3 etcdctl snapshot status "$backup_file" --write-out=json)
            local revision=$(echo "$stats" | jq -r '.revision')
            local total_keys=$(echo "$stats" | jq -r '.totalKey')
            local size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file")
            
            log "Backup stats - Revision: $revision, Keys: $total_keys, Size: $size bytes"
            
            # Create checksum
            sha256sum "$backup_file" > "${backup_file}.sha256"
            log "Checksum created: ${backup_file}.sha256"
            
            return 0
        else
            log "ERROR: Backup verification failed"
            rm -f "$temp_file"
            return 1
        fi
    else
        log "ERROR: Failed to create backup"
        rm -f "$temp_file"
        return 1
    fi
}

cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days"
    
    find "$BACKUP_DIR" -name "${BACKUP_PREFIX}-*.db" -mtime +$RETENTION_DAYS -type f | while read -r old_backup; do
        log "Removing old backup: $old_backup"
        rm -f "$old_backup" "${old_backup}.sha256"
    done
}

upload_to_remote() {
    local backup_file="$1"
    
    # Example: Upload to S3 (uncomment and configure as needed)
    # aws s3 cp "$backup_file" "s3://your-backup-bucket/etcd-backups/"
    # aws s3 cp "${backup_file}.sha256" "s3://your-backup-bucket/etcd-backups/"
    
    # Example: Upload to remote server via rsync
    # rsync -avz "$backup_file" backup-server:/backup/etcd/
    # rsync -avz "${backup_file}.sha256" backup-server:/backup/etcd/
    
    log "Remote upload completed (implement as needed)"
}

# Main execution
main() {
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    log "Starting etcd backup process"
    
    # Check etcd health before backup
    check_etcd_health
    
    # Create backup
    if create_backup; then
        # Get the latest backup file
        local latest_backup=$(ls -t "$BACKUP_DIR"/${BACKUP_PREFIX}-*.db | head -1)
        
        # Upload to remote storage (optional)
        upload_to_remote "$latest_backup"
        
        # Cleanup old backups
        cleanup_old_backups
        
        log "Backup process completed successfully"
    else
        log "ERROR: Backup process failed"
        exit 1
    fi
}

# Execute main function
main "$@"
```

**Automated Backup with Kubernetes CronJob:**
```yaml
# etcd backup CronJob
apiVersion: batch/v1
kind: CronJob
metadata:
  name: etcd-backup
  namespace: kube-system
spec:
  schedule: "0 2 * * *"              # Daily at 2 AM
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
  concurrencyPolicy: Forbid          # Don't run concurrent backups
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: etcd-backup
          hostNetwork: true          # Access etcd on host network
          tolerations:
          - effect: NoSchedule
            key: node-role.kubernetes.io/control-plane
            operator: Exists
          nodeSelector:
            node-role.kubernetes.io/control-plane: ""
          containers:
          - name: etcd-backup
            image: k8s.gcr.io/etcd:3.5.4-0
            command:
            - /bin/sh
            - -c
            - |
              set -e
              
              # Configuration
              BACKUP_DIR=/backup
              TIMESTAMP=$(date +%Y%m%d-%H%M%S)
              BACKUP_FILE="$BACKUP_DIR/etcd-snapshot-$TIMESTAMP.db"
              
              # Create backup directory
              mkdir -p $BACKUP_DIR
              
              # Create snapshot
              echo "Creating etcd snapshot..."
              ETCDCTL_API=3 etcdctl snapshot save $BACKUP_FILE \
                --endpoints=https://127.0.0.1:2379 \
                --cacert=/etc/kubernetes/pki/etcd/ca.crt \
                --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
                --key=/etc/kubernetes/pki/etcd/healthcheck-client.key
              
              # Verify snapshot
              echo "Verifying snapshot..."
              ETCDCTL_API=3 etcdctl snapshot status $BACKUP_FILE
              
              # Create checksum
              sha256sum $BACKUP_FILE > $BACKUP_FILE.sha256
              
              # Cleanup old backups (keep last 7 days)
              find $BACKUP_DIR -name "etcd-snapshot-*.db" -mtime +7 -delete
              find $BACKUP_DIR -name "etcd-snapshot-*.db.sha256" -mtime +7 -delete
              
              echo "Backup completed successfully: $BACKUP_FILE"
              
            volumeMounts:
            - name: etcd-certs
              mountPath: /etc/kubernetes/pki/etcd
              readOnly: true
            - name: backup-storage
              mountPath: /backup
            resources:
              requests:
                cpu: 100m
                memory: 128Mi
              limits:
                cpu: 500m
                memory: 512Mi
          volumes:
          - name: etcd-certs
            hostPath:
              path: /etc/kubernetes/pki/etcd
              type: DirectoryOrCreate
          - name: backup-storage
            persistentVolumeClaim:
              claimName: etcd-backup-pvc
          restartPolicy: OnFailure

---
# ServiceAccount for backup job
apiVersion: v1
kind: ServiceAccount
metadata:
  name: etcd-backup
  namespace: kube-system

---
# PVC for backup storage
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: etcd-backup-pvc
  namespace: kube-system
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
  storageClassName: fast-ssd
```

### Certificate and Configuration Backup

**Kubernetes PKI Backup:**
```bash
#!/bin/bash
# Backup Kubernetes certificates and configuration

BACKUP_DIR="/opt/kubernetes-backup"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_PATH="$BACKUP_DIR/k8s-backup-$TIMESTAMP"

# Create backup directory
mkdir -p "$BACKUP_PATH"

# Backup PKI certificates
echo "Backing up PKI certificates..."
cp -r /etc/kubernetes/pki "$BACKUP_PATH/"

# Backup kubeconfig files
echo "Backing up kubeconfig files..."
cp -r /etc/kubernetes/*.conf "$BACKUP_PATH/" 2>/dev/null || true

# Backup kubelet configuration
echo "Backing up kubelet configuration..."
mkdir -p "$BACKUP_PATH/kubelet"
cp /var/lib/kubelet/config.yaml "$BACKUP_PATH/kubelet/" 2>/dev/null || true
cp /etc/kubernetes/kubelet.conf "$BACKUP_PATH/kubelet/" 2>/dev/null || true

# Backup static pod manifests
echo "Backing up static pod manifests..."
cp -r /etc/kubernetes/manifests "$BACKUP_PATH/"

# Backup important system configurations
echo "Backing up system configurations..."
mkdir -p "$BACKUP_PATH/system"
cp /etc/systemd/system/kubelet.service.d/10-kubeadm.conf "$BACKUP_PATH/system/" 2>/dev/null || true

# Create archive
echo "Creating archive..."
cd "$BACKUP_DIR"
tar -czf "k8s-backup-$TIMESTAMP.tar.gz" "k8s-backup-$TIMESTAMP"
rm -rf "k8s-backup-$TIMESTAMP"

echo "Kubernetes configuration backup completed: $BACKUP_DIR/k8s-backup-$TIMESTAMP.tar.gz"

# Verify certificate expiration dates
echo "Certificate expiration check:"
for cert in /etc/kubernetes/pki/*.crt; do
    echo "$(basename "$cert"): $(openssl x509 -in "$cert" -noout -enddate | cut -d= -f2)"
done
```

**Application Data Backup Strategy:**
```yaml
# Example: Database backup using Kubernetes Job
apiVersion: batch/v1
kind: Job
metadata:
  name: postgres-backup
  namespace: production
spec:
  template:
    spec:
      serviceAccountName: backup-service-account
      containers:
      - name: postgres-backup
        image: postgres:13
        command:
        - /bin/bash
        - -c
        - |
          set -e
          
          # Configuration
          TIMESTAMP=$(date +%Y%m%d-%H%M%S)
          BACKUP_FILE="/backup/postgres-backup-$TIMESTAMP.sql"
          
          # Create database backup
          echo "Creating PostgreSQL backup..."
          pg_dump -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB > $BACKUP_FILE
          
          # Compress backup
          gzip $BACKUP_FILE
          
          # Create checksum
          sha256sum $BACKUP_FILE.gz > $BACKUP_FILE.gz.sha256
          
          # Upload to S3 (if configured)
          if [ -n "$AWS_ACCESS_KEY_ID" ]; then
            aws s3 cp $BACKUP_FILE.gz s3://$S3_BUCKET/postgres-backups/
            aws s3 cp $BACKUP_FILE.gz.sha256 s3://$S3_BUCKET/postgres-backups/
          fi
          
          # Cleanup old local backups
          find /backup -name "postgres-backup-*.sql.gz" -mtime +7 -delete
          
          echo "Backup completed: $BACKUP_FILE.gz"
        env:
        - name: POSTGRES_HOST
          value: postgres-service
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: password
        - name: POSTGRES_DB
          value: myapp
        - name: S3_BUCKET
          value: my-backup-bucket
        volumeMounts:
        - name: backup-storage
          mountPath: /backup
      volumes:
      - name: backup-storage
        persistentVolumeClaim:
          claimName: backup-pvc
      restartPolicy: OnFailure
```

## etcd Restore Procedures

### Single-Node etcd Restore

**Basic Restore Process:**
```bash
#!/bin/bash
# etcd restore procedure for single-node cluster

set -euo pipefail

# Configuration
SNAPSHOT_FILE="/backup/etcd-snapshot-20231215-020000.db"
ETCD_DATA_DIR="/var/lib/etcd"
ETCD_DATA_DIR_BACKUP="/var/lib/etcd.backup.$(date +%Y%m%d-%H%M%S)"
RESTORE_DATA_DIR="/var/lib/etcd-restore"

# Validation
if [ ! -f "$SNAPSHOT_FILE" ]; then
    echo "ERROR: Snapshot file not found: $SNAPSHOT_FILE"
    exit 1
fi

# Verify snapshot integrity
echo "Verifying snapshot integrity..."
if ! ETCDCTL_API=3 etcdctl snapshot status "$SNAPSHOT_FILE" >/dev/null 2>&1; then
    echo "ERROR: Snapshot file is corrupted or invalid"
    exit 1
fi

echo "Snapshot verification passed"

# Step 1: Stop Kubernetes control plane components
echo "Stopping Kubernetes control plane components..."
systemctl stop kubelet

# Move static pod manifests to prevent restart
mkdir -p /etc/kubernetes/manifests.backup
mv /etc/kubernetes/manifests/* /etc/kubernetes/manifests.backup/

# Wait for containers to stop
sleep 30

# Step 2: Backup existing etcd data
echo "Backing up existing etcd data..."
if [ -d "$ETCD_DATA_DIR" ]; then
    mv "$ETCD_DATA_DIR" "$ETCD_DATA_DIR_BACKUP"
    echo "Existing etcd data backed up to: $ETCD_DATA_DIR_BACKUP"
fi

# Step 3: Restore from snapshot
echo "Restoring etcd from snapshot..."
ETCDCTL_API=3 etcdctl snapshot restore "$SNAPSHOT_FILE" \
    --data-dir="$RESTORE_DATA_DIR" \
    --name=master \
    --initial-cluster=master=https://127.0.0.1:2380 \
    --initial-cluster-token=etcd-cluster-1 \
    --initial-advertise-peer-urls=https://127.0.0.1:2380

# Step 4: Move restored data to etcd directory
mv "$RESTORE_DATA_DIR" "$ETCD_DATA_DIR"

# Fix ownership
chown -R etcd:etcd "$ETCD_DATA_DIR"

# Step 5: Start etcd and Kubernetes components
echo "Starting Kubernetes control plane..."

# Restore static pod manifests
mv /etc/kubernetes/manifests.backup/* /etc/kubernetes/manifests/

# Start kubelet
systemctl start kubelet

# Wait for control plane to be ready
echo "Waiting for control plane to be ready..."
for i in {1..60}; do
    if kubectl get nodes >/dev/null 2>&1; then
        echo "Control plane is ready!"
        break
    fi
    echo "Waiting for control plane... ($i/60)"
    sleep 5
done

# Verify cluster health
echo "Verifying cluster health..."
kubectl get nodes
kubectl get pods -n kube-system

echo "etcd restore completed successfully!"
echo "Backup of original data available at: $ETCD_DATA_DIR_BACKUP"
```

**Automated Restore Script with Safety Checks:**
```bash
#!/bin/bash
# Production etcd restore script with comprehensive safety checks

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/etcd-restore.log"
LOCK_FILE="/var/run/etcd-restore.lock"

# Functions
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

cleanup() {
    rm -f "$LOCK_FILE"
    if [ -n "${TEMP_DIR:-}" ] && [ -d "$TEMP_DIR" ]; then
        rm -rf "$TEMP_DIR"
    fi
}

trap cleanup EXIT

acquire_lock() {
    if [ -f "$LOCK_FILE" ]; then
        log "ERROR: Another restore process is running (lock file exists)"
        exit 1
    fi
    echo $$ > "$LOCK_FILE"
}

validate_environment() {
    log "Validating environment..."
    
    # Check if running as root
    if [ "$(id -u)" -ne 0 ]; then
        log "ERROR: This script must be run as root"
        exit 1
    fi
    
    # Check if this is a control plane node
    if [ ! -f "/etc/kubernetes/manifests/kube-apiserver.yaml" ]; then
        log "ERROR: This doesn't appear to be a control plane node"
        exit 1
    fi
    
    # Check if etcdctl is available
    if ! command -v etcdctl >/dev/null 2>&1; then
        log "ERROR: etcdctl command not found"
        exit 1
    fi
    
    log "Environment validation passed"
}

validate_snapshot() {
    local snapshot_file="$1"
    
    log "Validating snapshot file: $snapshot_file"
    
    if [ ! -f "$snapshot_file" ]; then
        log "ERROR: Snapshot file not found: $snapshot_file"
        exit 1
    fi
    
    # Check file size (should be > 1MB for real cluster)
    local file_size=$(stat -f%z "$snapshot_file" 2>/dev/null || stat -c%s "$snapshot_file")
    if [ "$file_size" -lt 1048576 ]; then
        log "WARNING: Snapshot file is very small ($file_size bytes)"
        read -p "Continue anyway? [y/N]: " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # Verify snapshot integrity
    if ! ETCDCTL_API=3 etcdctl snapshot status "$snapshot_file" >/dev/null 2>&1; then
        log "ERROR: Snapshot file is corrupted or invalid"
        exit 1
    fi
    
    # Get snapshot info
    local snapshot_info=$(ETCDCTL_API=3 etcdctl snapshot status "$snapshot_file" --write-out=json)
    local revision=$(echo "$snapshot_info" | jq -r '.revision')
    local total_keys=$(echo "$snapshot_info" | jq -r '.totalKey')
    
    log "Snapshot validation passed - Revision: $revision, Keys: $total_keys"
}

create_pre_restore_backup() {
    local backup_dir="/opt/etcd-pre-restore-backup"
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local backup_path="$backup_dir/pre-restore-$timestamp"
    
    log "Creating pre-restore backup..."
    
    mkdir -p "$backup_path"
    
    # Backup current etcd data
    if [ -d "/var/lib/etcd" ]; then
        cp -r /var/lib/etcd "$backup_path/"
    fi
    
    # Backup Kubernetes configuration
    cp -r /etc/kubernetes "$backup_path/"
    
    # Create current cluster snapshot if possible
    if systemctl is-active --quiet kubelet; then
        log "Creating current cluster snapshot..."
        ETCDCTL_API=3 etcdctl snapshot save "$backup_path/current-cluster-snapshot.db" \
            --endpoints=https://127.0.0.1:2379 \
            --cacert=/etc/kubernetes/pki/etcd/ca.crt \
            --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
            --key=/etc/kubernetes/pki/etcd/healthcheck-client.key 2>/dev/null || \
            log "WARNING: Could not create current cluster snapshot"
    fi
    
    log "Pre-restore backup created at: $backup_path"
    echo "$backup_path" # Return backup path for cleanup reference
}

stop_control_plane() {
    log "Stopping control plane components..."
    
    # Stop kubelet
    systemctl stop kubelet
    
    # Move static pod manifests
    TEMP_DIR=$(mktemp -d)
    mv /etc/kubernetes/manifests/* "$TEMP_DIR/"
    
    # Wait for pods to terminate
    local wait_count=0
    while [ $wait_count -lt 60 ]; do
        if ! docker ps --format "table {{.Names}}" | grep -q "k8s_"; then
            break
        fi
        log "Waiting for control plane pods to stop... ($wait_count/60)"
        sleep 5
        ((wait_count++))
    done
    
    log "Control plane stopped"
}

perform_restore() {
    local snapshot_file="$1"
    local etcd_data_dir="/var/lib/etcd"
    local restore_dir="/var/lib/etcd-restore-temp"
    
    log "Performing etcd restore from: $snapshot_file"
    
    # Remove existing etcd data
    if [ -d "$etcd_data_dir" ]; then
        rm -rf "$etcd_data_dir"
    fi
    
    # Restore from snapshot
    ETCDCTL_API=3 etcdctl snapshot restore "$snapshot_file" \
        --data-dir="$restore_dir" \
        --name=master \
        --initial-cluster=master=https://127.0.0.1:2380 \
        --initial-cluster-token=etcd-cluster-1 \
        --initial-advertise-peer-urls=https://127.0.0.1:2380
    
    # Move restored data
    mv "$restore_dir" "$etcd_data_dir"
    
    # Fix ownership
    chown -R etcd:etcd "$etcd_data_dir" 2>/dev/null || \
    chown -R 999:999 "$etcd_data_dir"  # fallback for containerized etcd
    
    log "etcd restore completed"
}

start_control_plane() {
    log "Starting control plane components..."
    
    # Restore static pod manifests
    mv "$TEMP_DIR"/* /etc/kubernetes/manifests/
    
    # Start kubelet
    systemctl start kubelet
    
    # Wait for control plane to be ready
    local wait_count=0
    while [ $wait_count -lt 120 ]; do
        if kubectl get nodes >/dev/null 2>&1; then
            log "Control plane is ready!"
            return 0
        fi
        log "Waiting for control plane to be ready... ($wait_count/120)"
        sleep 5
        ((wait_count++))
    done
    
    log "ERROR: Control plane failed to start within timeout"
    return 1
}

verify_cluster_health() {
    log "Verifying cluster health..."
    
    # Basic connectivity
    if ! kubectl get nodes; then
        log "ERROR: Unable to connect to cluster"
        return 1
    fi
    
    # Check system pods
    local not_ready=$(kubectl get pods -n kube-system --no-headers | grep -v Running | grep -v Completed | wc -l)
    if [ "$not_ready" -gt 0 ]; then
        log "WARNING: $not_ready system pods are not in Running state"
        kubectl get pods -n kube-system | grep -v Running | grep -v Completed
    fi
    
    # Check etcd health
    if ETCDCTL_API=3 etcdctl endpoint health \
        --endpoints=https://127.0.0.1:2379 \
        --cacert=/etc/kubernetes/pki/etcd/ca.crt \
        --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
        --key=/etc/kubernetes/pki/etcd/healthcheck-client.key >/dev/null 2>&1; then
        log "etcd health check passed"
    else
        log "ERROR: etcd health check failed"
        return 1
    fi
    
    log "Cluster health verification completed"
    return 0
}

# Main function
main() {
    local snapshot_file="${1:-}"
    
    if [ -z "$snapshot_file" ]; then
        echo "Usage: $0 <snapshot-file>"
        echo "Example: $0 /backup/etcd-snapshot-20231215-020000.db"
        exit 1
    fi
    
    log "Starting etcd restore process with snapshot: $snapshot_file"
    
    # Safety checks
    acquire_lock
    validate_environment
    validate_snapshot "$snapshot_file"
    
    # Confirmation prompt
    echo "WARNING: This will replace the current cluster state with the snapshot."
    echo "Snapshot file: $snapshot_file"
    read -p "Are you sure you want to proceed? [y/N]: " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Restore cancelled by user"
        exit 0
    fi
    
    # Create backup of current state
    local pre_restore_backup=$(create_pre_restore_backup)
    
    # Perform restore
    stop_control_plane
    perform_restore "$snapshot_file"
    
    if start_control_plane && verify_cluster_health; then
        log "etcd restore completed successfully!"
        log "Pre-restore backup available at: $pre_restore_backup"
    else
        log "ERROR: Restore failed or cluster health check failed"
        log "Pre-restore backup available at: $pre_restore_backup"
        exit 1
    fi
}

# Execute main function
main "$@"
```

### Multi-Node etcd Cluster Restore

**Cluster Restore Strategy:**
```bash
#!/bin/bash
# Multi-node etcd cluster restore procedure

# This script should be run on ALL etcd nodes simultaneously
# Configuration must be identical across all nodes

set -euo pipefail

# Cluster configuration
CLUSTER_NAME="etcd-cluster"
CLUSTER_TOKEN="etcd-cluster-token-$(date +%s)"
SNAPSHOT_FILE="$1"

# Node-specific configuration (customize for each node)
NODE_NAME="${ETCD_NODE_NAME:-etcd-1}"  # Set via environment variable
NODE_IP="${ETCD_NODE_IP:-10.0.1.10}"   # Set via environment variable

# Cluster member configuration
CLUSTER_MEMBERS="etcd-1=https://10.0.1.10:2380,etcd-2=https://10.0.1.11:2380,etcd-3=https://10.0.1.12:2380"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [$NODE_NAME] $1"
}

validate_cluster_config() {
    log "Validating cluster configuration..."
    
    if [ -z "$NODE_NAME" ] || [ -z "$NODE_IP" ]; then
        log "ERROR: NODE_NAME and NODE_IP must be set"
        exit 1
    fi
    
    # Verify snapshot file exists
    if [ ! -f "$SNAPSHOT_FILE" ]; then
        log "ERROR: Snapshot file not found: $SNAPSHOT_FILE"
        exit 1
    fi
    
    # Verify snapshot integrity
    if ! ETCDCTL_API=3 etcdctl snapshot status "$SNAPSHOT_FILE" >/dev/null 2>&1; then
        log "ERROR: Snapshot file is corrupted"
        exit 1
    fi
    
    log "Cluster configuration validated"
}

stop_etcd_cluster() {
    log "Stopping etcd and Kubernetes components..."
    
    # Stop kubelet first
    systemctl stop kubelet || true
    
    # Move static pod manifests
    mkdir -p /etc/kubernetes/manifests.backup
    mv /etc/kubernetes/manifests/* /etc/kubernetes/manifests.backup/ 2>/dev/null || true
    
    # Stop etcd service if running as systemd service
    systemctl stop etcd || true
    
    # Wait for processes to stop
    sleep 30
    
    log "Services stopped"
}

restore_etcd_data() {
    local data_dir="/var/lib/etcd"
    local restore_dir="/var/lib/etcd-restore"
    
    log "Restoring etcd data from snapshot..."
    
    # Backup existing data
    if [ -d "$data_dir" ]; then
        mv "$data_dir" "${data_dir}.backup.$(date +%Y%m%d-%H%M%S)"
    fi
    
    # Perform restore
    ETCDCTL_API=3 etcdctl snapshot restore "$SNAPSHOT_FILE" \
        --data-dir="$restore_dir" \
        --name="$NODE_NAME" \
        --initial-cluster="$CLUSTER_MEMBERS" \
        --initial-cluster-token="$CLUSTER_TOKEN" \
        --initial-advertise-peer-urls="https://${NODE_IP}:2380"
    
    # Move restored data
    mv "$restore_dir" "$data_dir"
    
    # Fix ownership
    chown -R etcd:etcd "$data_dir"
    
    log "etcd data restored"
}

start_etcd_cluster() {
    log "Starting etcd cluster..."
    
    # Restore static pod manifests
    mv /etc/kubernetes/manifests.backup/* /etc/kubernetes/manifests/ 2>/dev/null || true
    
    # Start kubelet
    systemctl start kubelet
    
    # Wait for etcd to be ready
    local wait_count=0
    while [ $wait_count -lt 60 ]; do
        if ETCDCTL_API=3 etcdctl endpoint health \
            --endpoints="https://${NODE_IP}:2379" \
            --cacert=/etc/kubernetes/pki/etcd/ca.crt \
            --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
            --key=/etc/kubernetes/pki/etcd/healthcheck-client.key >/dev/null 2>&1; then
            log "etcd is healthy on this node"
            break
        fi
        log "Waiting for etcd to be ready... ($wait_count/60)"
        sleep 5
        ((wait_count++))
    done
    
    if [ $wait_count -eq 60 ]; then
        log "ERROR: etcd failed to start within timeout"
        return 1
    fi
    
    # Wait for Kubernetes API server
    wait_count=0
    while [ $wait_count -lt 60 ]; do
        if kubectl get nodes >/dev/null 2>&1; then
            log "Kubernetes API server is ready"
            break
        fi
        log "Waiting for Kubernetes API server... ($wait_count/60)"
        sleep 5
        ((wait_count++))
    done
    
    log "Cluster startup completed"
}

verify_cluster_health() {
    log "Verifying cluster health..."
    
    # Check etcd cluster health
    ETCDCTL_API=3 etcdctl endpoint health \
        --cluster \
        --cacert=/etc/kubernetes/pki/etcd/ca.crt \
        --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
        --key=/etc/kubernetes/pki/etcd/healthcheck-client.key
    
    # Check cluster member list
    log "Cluster members:"
    ETCDCTL_API=3 etcdctl member list \
        --endpoints="https://${NODE_IP}:2379" \
        --cacert=/etc/kubernetes/pki/etcd/ca.crt \
        --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
        --key=/etc/kubernetes/pki/etcd/healthcheck-client.key
    
    # Check Kubernetes cluster
    kubectl get nodes
    kubectl get pods -n kube-system
    
    log "Cluster health verification completed"
}

main() {
    if [ -z "${1:-}" ]; then
        echo "Usage: $0 <snapshot-file>"
        echo "Environment variables required:"
        echo "  ETCD_NODE_NAME: Name of this etcd node (e.g., etcd-1)"
        echo "  ETCD_NODE_IP: IP address of this etcd node"
        exit 1
    fi
    
    log "Starting multi-node etcd cluster restore..."
    log "Node: $NODE_NAME, IP: $NODE_IP"
    log "Snapshot: $SNAPSHOT_FILE"
    
    validate_cluster_config
    
    # Confirmation
    echo "WARNING: This will restore the entire etcd cluster from snapshot."
    echo "This script must be run on ALL etcd nodes simultaneously."
    read -p "Proceed with restore? [y/N]: " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
    
    stop_etcd_cluster
    restore_etcd_data
    start_etcd_cluster
    verify_cluster_health
    
    log "Multi-node etcd restore completed successfully!"
}

main "$@"
```

## Disaster Recovery Strategies

### Complete Cluster Recovery

**Cluster Rebuild from Backup:**
```bash
#!/bin/bash
# Complete Kubernetes cluster recovery from backup

set -euo pipefail

# Configuration
BACKUP_DIR="/opt/cluster-backup"
ETCD_SNAPSHOT="$BACKUP_DIR/etcd-snapshot.db"
K8S_CONFIG_BACKUP="$BACKUP_DIR/k8s-config.tar.gz"
NODE_IP="10.0.1.10"
CLUSTER_NAME="kubernetes"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

validate_backups() {
    log "Validating backup files..."
    
    if [ ! -f "$ETCD_SNAPSHOT" ]; then
        log "ERROR: etcd snapshot not found: $ETCD_SNAPSHOT"
        exit 1
    fi
    
    if [ ! -f "$K8S_CONFIG_BACKUP" ]; then
        log "ERROR: Kubernetes config backup not found: $K8S_CONFIG_BACKUP"
        exit 1
    fi
    
    # Validate etcd snapshot
    if ! ETCDCTL_API=3 etcdctl snapshot status "$ETCD_SNAPSHOT" >/dev/null 2>&1; then
        log "ERROR: Invalid etcd snapshot"
        exit 1
    fi
    
    log "Backup validation passed"
}

restore_kubernetes_config() {
    log "Restoring Kubernetes configuration..."
    
    # Backup current config if exists
    if [ -d "/etc/kubernetes" ]; then
        mv /etc/kubernetes /etc/kubernetes.backup.$(date +%Y%m%d-%H%M%S)
    fi
    
    # Extract configuration backup
    cd /
    tar -xzf "$K8S_CONFIG_BACKUP"
    
    # Fix permissions
    chmod 600 /etc/kubernetes/pki/*.key
    chmod 644 /etc/kubernetes/pki/*.crt
    
    log "Kubernetes configuration restored"
}

initialize_etcd() {
    log "Initializing etcd from snapshot..."
    
    # Remove existing etcd data
    rm -rf /var/lib/etcd
    
    # Restore etcd from snapshot
    ETCDCTL_API=3 etcdctl snapshot restore "$ETCD_SNAPSHOT" \
        --data-dir="/var/lib/etcd" \
        --name=master \
        --initial-cluster=master=https://${NODE_IP}:2380 \
        --initial-cluster-token=etcd-cluster-1 \
        --initial-advertise-peer-urls=https://${NODE_IP}:2380
    
    # Fix ownership
    chown -R etcd:etcd /var/lib/etcd
    
    log "etcd initialized from snapshot"
}

start_cluster() {
    log "Starting Kubernetes cluster..."
    
    # Start kubelet
    systemctl enable kubelet
    systemctl start kubelet
    
    # Wait for cluster to be ready
    local wait_count=0
    while [ $wait_count -lt 120 ]; do
        if kubectl get nodes >/dev/null 2>&1; then
            log "Cluster is ready!"
            break
        fi
        log "Waiting for cluster to be ready... ($wait_count/120)"
        sleep 5
        ((wait_count++))
    done
    
    if [ $wait_count -eq 120 ]; then
        log "ERROR: Cluster failed to start within timeout"
        return 1
    fi
    
    return 0
}

post_recovery_tasks() {
    log "Performing post-recovery tasks..."
    
    # Restart system pods
    kubectl delete pods -n kube-system --all --force --grace-period=0 || true
    
    # Wait for system pods to restart
    sleep 60
    
    # Check cluster health
    kubectl get nodes
    kubectl get pods -n kube-system
    
    # Restart any failed pods
    kubectl get pods --all-namespaces | grep -E "(Error|CrashLoopBackOff|ImagePullBackOff)" | \
    while read namespace pod rest; do
        log "Restarting failed pod: $namespace/$pod"
        kubectl delete pod "$pod" -n "$namespace" --force --grace-period=0
    done
    
    log "Post-recovery tasks completed"
}

main() {
    log "Starting complete cluster recovery..."
    
    # Confirmation
    echo "WARNING: This will completely rebuild the Kubernetes cluster from backup."
    echo "All current cluster state will be lost."
    read -p "Are you sure you want to proceed? [y/N]: " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
    
    validate_backups
    restore_kubernetes_config
    initialize_etcd
    
    if start_cluster; then
        post_recovery_tasks
        log "Cluster recovery completed successfully!"
    else
        log "ERROR: Cluster recovery failed"
        exit 1
    fi
}

main "$@"
```

### Multi-Region Disaster Recovery

**Cross-Region Backup Strategy:**
```yaml
# Multi-region backup and disaster recovery setup
apiVersion: batch/v1
kind: CronJob
metadata:
  name: multi-region-backup
  namespace: kube-system
spec:
  schedule: "0 */6 * * *"            # Every 6 hours
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: backup-service-account
          containers:
          - name: backup-replication
            image: backup-replication:latest
            command:
            - /bin/bash
            - -c
            - |
              set -e
              
              # Configuration
              PRIMARY_REGION="us-west-2"
              BACKUP_REGIONS=("us-east-1" "eu-west-1")
              TIMESTAMP=$(date +%Y%m%d-%H%M%S)
              
              # Create etcd snapshot
              echo "Creating etcd snapshot..."
              ETCDCTL_API=3 etcdctl snapshot save /tmp/etcd-snapshot-$TIMESTAMP.db \
                --endpoints=https://127.0.0.1:2379 \
                --cacert=/etc/kubernetes/pki/etcd/ca.crt \
                --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
                --key=/etc/kubernetes/pki/etcd/healthcheck-client.key
              
              # Compress snapshot
              gzip /tmp/etcd-snapshot-$TIMESTAMP.db
              
              # Create configuration backup
              echo "Creating configuration backup..."
              cd /
              tar -czf /tmp/k8s-config-$TIMESTAMP.tar.gz \
                etc/kubernetes \
                var/lib/kubelet/config.yaml
              
              # Upload to primary region
              echo "Uploading to primary region..."
              aws s3 cp /tmp/etcd-snapshot-$TIMESTAMP.db.gz \
                s3://k8s-backup-$PRIMARY_REGION/etcd/
              aws s3 cp /tmp/k8s-config-$TIMESTAMP.tar.gz \
                s3://k8s-backup-$PRIMARY_REGION/configs/
              
              # Replicate to backup regions
              for region in "${BACKUP_REGIONS[@]}"; do
                echo "Replicating to $region..."
                
                # Copy etcd snapshot
                aws s3 cp s3://k8s-backup-$PRIMARY_REGION/etcd/etcd-snapshot-$TIMESTAMP.db.gz \
                  s3://k8s-backup-$region/etcd/ --region $region
                
                # Copy configuration
                aws s3 cp s3://k8s-backup-$PRIMARY_REGION/configs/k8s-config-$TIMESTAMP.tar.gz \
                  s3://k8s-backup-$region/configs/ --region $region
              done
              
              # Cleanup old backups (keep last 30 days)
              for region in $PRIMARY_REGION "${BACKUP_REGIONS[@]}"; do
                echo "Cleaning up old backups in $region..."
                
                # List and delete old etcd snapshots
                aws s3 ls s3://k8s-backup-$region/etcd/ --region $region | \
                while read -r line; do
                  file_date=$(echo $line | awk '{print $1}')
                  file_name=$(echo $line | awk '{print $4}')
                  if [ -n "$file_name" ] && [ "$file_name" != "PRE" ]; then
                    file_age_days=$(( ($(date +%s) - $(date -d "$file_date" +%s)) / 86400 ))
                    if [ $file_age_days -gt 30 ]; then
                      echo "Deleting old backup: $file_name (${file_age_days} days old)"
                      aws s3 rm s3://k8s-backup-$region/etcd/$file_name --region $region
                    fi
                  fi
                done
              done
              
              echo "Multi-region backup completed successfully"
              
            env:
            - name: AWS_DEFAULT_REGION
              value: us-west-2
            volumeMounts:
            - name: etcd-certs
              mountPath: /etc/kubernetes/pki/etcd
              readOnly: true
            - name: k8s-config
              mountPath: /etc/kubernetes
              readOnly: true
            - name: kubelet-config
              mountPath: /var/lib/kubelet
              readOnly: true
          volumes:
          - name: etcd-certs
            hostPath:
              path: /etc/kubernetes/pki/etcd
          - name: k8s-config
            hostPath:
              path: /etc/kubernetes
          - name: kubelet-config
            hostPath:
              path: /var/lib/kubelet
          restartPolicy: OnFailure
          hostNetwork: true
          tolerations:
          - effect: NoSchedule
            key: node-role.kubernetes.io/control-plane
```

## Backup Testing and Validation

### Automated Backup Testing

**Backup Validation Pipeline:**
```bash
#!/bin/bash
# Automated backup testing and validation

set -euo pipefail

BACKUP_DIR="/opt/etcd-backups"
TEST_CLUSTER_CONFIG="/opt/test-cluster"
LOG_FILE="/var/log/backup-validation.log"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

find_latest_backup() {
    local latest_backup=$(ls -t "$BACKUP_DIR"/etcd-snapshot-*.db 2>/dev/null | head -1)
    if [ -z "$latest_backup" ]; then
        log "ERROR: No backup files found in $BACKUP_DIR"
        exit 1
    fi
    echo "$latest_backup"
}

validate_backup_integrity() {
    local backup_file="$1"
    
    log "Validating backup integrity: $(basename "$backup_file")"
    
    # Check file exists and is readable
    if [ ! -r "$backup_file" ]; then
        log "ERROR: Backup file is not readable: $backup_file"
        return 1
    fi
    
    # Check file size (should be reasonable)
    local file_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file")
    if [ "$file_size" -lt 1048576 ]; then  # Less than 1MB
        log "WARNING: Backup file seems very small: $file_size bytes"
    fi
    
    # Validate etcd snapshot
    if ! ETCDCTL_API=3 etcdctl snapshot status "$backup_file" >/dev/null 2>&1; then
        log "ERROR: Backup file is corrupted or invalid"
        return 1
    fi
    
    # Get backup statistics
    local stats=$(ETCDCTL_API=3 etcdctl snapshot status "$backup_file" --write-out=json)
    local revision=$(echo "$stats" | jq -r '.revision')
    local total_keys=$(echo "$stats" | jq -r '.totalKey')
    local hash=$(echo "$stats" | jq -r '.hash')
    
    log "Backup validation passed:"
    log "  Revision: $revision"
    log "  Total Keys: $total_keys"
    log "  Hash: $hash"
    log "  Size: $file_size bytes"
    
    return 0
}

test_backup_restore() {
    local backup_file="$1"
    local test_dir="/tmp/etcd-restore-test-$$"
    
    log "Testing backup restore functionality..."
    
    # Test restore to temporary directory
    if ETCDCTL_API=3 etcdctl snapshot restore "$backup_file" \
        --data-dir="$test_dir" \
        --name=test-restore \
        --initial-cluster=test-restore=https://127.0.0.1:2380 \
        --initial-cluster-token=test-token \
        --initial-advertise-peer-urls=https://127.0.0.1:2380 \
        >/dev/null 2>&1; then
        
        log "Backup restore test passed"
        rm -rf "$test_dir"
        return 0
    else
        log "ERROR: Backup restore test failed"
        rm -rf "$test_dir"
        return 1
    fi
}

validate_backup_content() {
    local backup_file="$1"
    local test_dir="/tmp/etcd-content-test-$$"
    local test_etcd_dir="$test_dir/etcd"
    
    log "Validating backup content..."
    
    # Restore to temporary directory
    ETCDCTL_API=3 etcdctl snapshot restore "$backup_file" \
        --data-dir="$test_etcd_dir" \
        --name=content-test \
        --initial-cluster=content-test=https://127.0.0.1:2380 \
        --initial-cluster-token=content-test-token \
        --initial-advertise-peer-urls=https://127.0.0.1:2380 \
        >/dev/null 2>&1
    
    # Start temporary etcd instance
    etcd --name=content-test \
         --data-dir="$test_etcd_dir" \
         --listen-client-urls=http://127.0.0.1:23790 \
         --advertise-client-urls=http://127.0.0.1:23790 \
         --listen-peer-urls=http://127.0.0.1:23800 \
         --initial-advertise-peer-urls=http://127.0.0.1:23800 \
         --initial-cluster=content-test=http://127.0.0.1:23800 \
         --initial-cluster-token=content-test-token \
         --initial-cluster-state=new \
         >/dev/null 2>&1 &
    
    local etcd_pid=$!
    
    # Wait for etcd to start
    sleep 5
    
    # Test basic operations
    local test_passed=true
    
    # Check if we can list keys
    if ! ETCDCTL_API=3 etcdctl --endpoints=http://127.0.0.1:23790 get --prefix /registry >/dev/null 2>&1; then
        log "ERROR: Cannot read Kubernetes data from backup"
        test_passed=false
    fi
    
    # Check for essential Kubernetes objects
    local namespaces=$(ETCDCTL_API=3 etcdctl --endpoints=http://127.0.0.1:23790 get --prefix /registry/namespaces 2>/dev/null | grep -c "^/registry/namespaces" || echo "0")
    if [ "$namespaces" -eq 0 ]; then
        log "WARNING: No namespaces found in backup"
        test_passed=false
    else
        log "Found $namespaces namespaces in backup"
    fi
    
    # Cleanup
    kill $etcd_pid >/dev/null 2>&1 || true
    wait $etcd_pid >/dev/null 2>&1 || true
    rm -rf "$test_dir"
    
    if [ "$test_passed" = true ]; then
        log "Backup content validation passed"
        return 0
    else
        log "ERROR: Backup content validation failed"
        return 1
    fi
}

check_backup_freshness() {
    local backup_file="$1"
    local max_age_hours=24
    
    log "Checking backup freshness..."
    
    local file_time=$(stat -f%m "$backup_file" 2>/dev/null || stat -c%Y "$backup_file")
    local current_time=$(date +%s)
    local age_hours=$(( (current_time - file_time) / 3600 ))
    
    if [ $age_hours -gt $max_age_hours ]; then
        log "WARNING: Backup is $age_hours hours old (max recommended: $max_age_hours hours)"
        return 1
    else
        log "Backup freshness check passed: $age_hours hours old"
        return 0
    fi
}

generate_validation_report() {
    local backup_file="$1"
    local validation_results="$2"
    local report_file="/opt/backup-reports/validation-$(date +%Y%m%d-%H%M%S).json"
    
    mkdir -p "$(dirname "$report_file")"
    
    # Get backup statistics
    local stats=$(ETCDCTL_API=3 etcdctl snapshot status "$backup_file" --write-out=json)
    local file_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file")
    local file_time=$(stat -f%m "$backup_file" 2>/dev/null || stat -c%Y "$backup_file")
    
    # Create JSON report
    cat > "$report_file" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "backup_file": "$backup_file",
  "backup_size": $file_size,
  "backup_time": $file_time,
  "validation_results": $validation_results,
  "etcd_stats": $stats
}
EOF
    
    log "Validation report generated: $report_file"
}

main() {
    log "Starting backup validation process..."
    
    # Find latest backup
    local latest_backup=$(find_latest_backup)
    log "Testing backup: $(basename "$latest_backup")"
    
    # Run validation tests
    local validation_passed=true
    local test_results="{"
    
    # Test 1: Integrity check
    if validate_backup_integrity "$latest_backup"; then
        test_results="${test_results}\"integrity\": \"passed\","
    else
        test_results="${test_results}\"integrity\": \"failed\","
        validation_passed=false
    fi
    
    # Test 2: Restore test
    if test_backup_restore "$latest_backup"; then
        test_results="${test_results}\"restore\": \"passed\","
    else
        test_results="${test_results}\"restore\": \"failed\","
        validation_passed=false
    fi
    
    # Test 3: Content validation
    if validate_backup_content "$latest_backup"; then
        test_results="${test_results}\"content\": \"passed\","
    else
        test_results="${test_results}\"content\": \"failed\","
        validation_passed=false
    fi
    
    # Test 4: Freshness check
    if check_backup_freshness "$latest_backup"; then
        test_results="${test_results}\"freshness\": \"passed\""
    else
        test_results="${test_results}\"freshness\": \"warning\""
    fi
    
    test_results="${test_results}}"
    
    # Generate report
    generate_validation_report "$latest_backup" "$test_results"
    
    # Final result
    if [ "$validation_passed" = true ]; then
        log "All backup validation tests passed successfully"
        exit 0
    else
        log "ERROR: One or more backup validation tests failed"
        exit 1
    fi
}

main "$@"
```

## Exam Tips & Quick Reference

### ⚡ Essential Backup/Restore Commands

```bash
# Create etcd snapshot
ETCDCTL_API=3 etcdctl snapshot save snapshot.db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
  --key=/etc/kubernetes/pki/etcd/healthcheck-client.key

# Verify snapshot
ETCDCTL_API=3 etcdctl snapshot status snapshot.db --write-out=table

# Restore from snapshot
ETCDCTL_API=3 etcdctl snapshot restore snapshot.db \
  --data-dir=/var/lib/etcd-restore \
  --name=master \
  --initial-cluster=master=https://127.0.0.1:2380 \
  --initial-cluster-token=etcd-cluster-1 \
  --initial-advertise-peer-urls=https://127.0.0.1:2380

# Check etcd health
ETCDCTL_API=3 etcdctl endpoint health \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
  --key=/etc/kubernetes/pki/etcd/healthcheck-client.key
```

### 🎯 Common Exam Scenarios

**Scenario 1: Create etcd Backup**
```bash
# Standard backup command
ETCDCTL_API=3 etcdctl snapshot save /opt/backup.db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
  --key=/etc/kubernetes/pki/etcd/healthcheck-client.key

# Verify backup
ETCDCTL_API=3 etcdctl snapshot status /opt/backup.db
```

**Scenario 2: Restore etcd from Backup**
```bash
# Stop kubelet
systemctl stop kubelet

# Move static pods
mv /etc/kubernetes/manifests /etc/kubernetes/manifests.backup

# Restore etcd
ETCDCTL_API=3 etcdctl snapshot restore /opt/backup.db \
  --data-dir=/var/lib/etcd-restore

# Replace etcd data
mv /var/lib/etcd /var/lib/etcd.backup
mv /var/lib/etcd-restore /var/lib/etcd

# Fix ownership
chown -R etcd:etcd /var/lib/etcd

# Restore static pods and start kubelet
mv /etc/kubernetes/manifests.backup /etc/kubernetes/manifests
systemctl start kubelet
```

### 🚨 Critical Gotchas

1. **Certificate Paths**: etcd certificates are in `/etc/kubernetes/pki/etcd/`
2. **Stop Services**: Always stop kubelet before restore
3. **Data Directory**: Default etcd data dir is `/var/lib/etcd`
4. **Ownership**: Restored data must be owned by `etcd:etcd`
5. **Static Pods**: Move manifests to prevent auto-restart during restore
6. **Cluster Token**: Use new cluster token for restore to prevent conflicts
7. **Endpoints**: Use `127.0.0.1:2379` for local etcd access

## WHY This Matters - The Deeper Philosophy

### Business Continuity and Risk Management

**The Cost of Data Loss:**
```
Business Impact Categories:

Direct Costs:
├── Lost revenue during downtime
├── Data recovery and reconstruction costs
├── Emergency response and overtime costs
├── Hardware replacement and infrastructure
└── Third-party recovery service fees

Indirect Costs:
├── Customer trust and reputation damage
├── Market share loss to competitors
├── Employee productivity and morale impact
├── Regulatory fines and compliance costs
└── Legal costs and potential litigation

Strategic Costs:
├── Delayed product launches and innovation
├── Lost competitive advantages
├── Reduced investor confidence
├── Long-term customer relationship damage
└── Opportunity costs of incident response focus

Recovery Time Objectives (RTO) Business Impact:
├── < 15 minutes: Minimal business impact
├── 1-4 hours: Moderate impact, customer notices
├── 4-24 hours: Significant impact, revenue loss
├── > 24 hours: Severe impact, potential business threat
└── > 1 week: Existential threat to business
```

**Risk Mitigation Strategy:**
```
Traditional Backup Approach:
├── Periodic full backups (weekly/monthly)
├── Manual backup processes
├── Tape or offline storage
├── Long recovery times (hours/days)
└── High risk of data loss between backups

Modern Cloud-Native Approach:
├── Continuous incremental backups
├── Automated backup processes
├── Multiple geographic locations
├── Fast recovery times (minutes/hours)
└── Point-in-time recovery capabilities

Kubernetes Backup Strategy:
├── etcd snapshots for cluster state
├── Application data backups
├── Configuration and certificate backups
├── Automated testing and validation
└── Disaster recovery automation
```

### Production Engineering Philosophy

**Infrastructure as Code for Disaster Recovery:**
```
Traditional Disaster Recovery:
├── Manual documentation and runbooks
├── Untested recovery procedures
├── Dependency on specific personnel
├── Time-consuming manual processes
└── High probability of human error

Cloud-Native Disaster Recovery:
├── Automated backup and restore procedures
├── Continuously tested recovery processes
├── Self-service recovery capabilities
├── Infrastructure recreation from code
└── Reduced recovery time and error rates

GitOps Disaster Recovery:
├── All infrastructure defined in Git
├── Automated cluster recreation
├── Version-controlled backup policies
├── Audit trails for all changes
└── Collaborative disaster response
```

**The Principle of Defense in Depth for Data:**
```
Layer 1: Application Level
├── Application-specific backup procedures
├── Database transaction logs
├── Application state checkpoints
└── User data export capabilities

Layer 2: Kubernetes Level
├── etcd cluster state backups
├── Persistent volume snapshots
├── Configuration and secret backups
└── RBAC and policy backups

Layer 3: Infrastructure Level
├── Node and storage snapshots
├── Network configuration backups
├── Cloud provider backup services
└── Cross-region replication

Layer 4: Process Level
├── Automated backup schedules
├── Backup validation and testing
├── Incident response procedures
└── Recovery time monitoring
```

### Economic Model of Backup and Recovery

**Total Cost of Ownership (TCO) Analysis:**
```
Backup Infrastructure Costs:
├── Storage costs (local and cloud)
├── Network bandwidth for replication
├── Compute resources for backup processing
├── Software licensing and tooling
└── Personnel time for management

Recovery Infrastructure Costs:
├── Standby infrastructure maintenance
├── Cross-region network connectivity
├── Recovery testing environment costs
├── Emergency response team costs
└── Business continuity planning

Cost vs. Benefit Analysis:
├── Backup cost per GB per month
├── Recovery time reduction value
├── Business disruption cost avoidance
├── Compliance and regulatory value
└── Insurance premium reductions

ROI Calculation:
ROI = (Cost of Downtime Avoided - Backup Infrastructure Cost) / Backup Infrastructure Cost

Example:
├── 1 hour downtime cost: $100,000
├── Backup infrastructure cost: $10,000/month
├── Downtime probability: 1% per month
├── Expected downtime cost: $1,000/month
├── ROI: ($1,000 - $10,000) / $10,000 = -90%
└── Break-even point: 10% downtime probability
```

### Career Development Implications

**For the Exam:**
- **Backup Procedures**: Master etcd snapshot creation and validation
- **Restore Procedures**: Understand single-node and cluster restore processes
- **Troubleshooting**: Debug backup and restore failures
- **Best Practices**: Implement automated backup strategies

**For Production Systems:**
- **Business Continuity**: Design comprehensive disaster recovery strategies
- **Automation**: Implement automated backup and recovery procedures
- **Testing**: Regularly validate backup integrity and recovery procedures
- **Compliance**: Meet regulatory requirements for data protection

**For Your Career:**
- **Risk Management**: Understand business impact of system failures
- **Architecture**: Design resilient systems with recovery capabilities
- **Leadership**: Guide organizations in disaster preparedness
- **Innovation**: Develop novel approaches to backup and recovery challenges

Understanding backup and restore deeply teaches you how to build **resilient, recoverable systems** that can survive disasters and maintain business continuity. This knowledge is fundamental to the CKA exam and essential for anyone responsible for production Kubernetes environments.

Backup and restore isn't just about technology - it's about ensuring business survival and maintaining customer trust. The ability to quickly recover from disasters is what separates robust production systems from fragile experimental setups. Master these concepts, and you master one of the most critical aspects of production operations.