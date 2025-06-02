# CKA Study Guide: etcd Backup and Restore

## **Understanding etcd: The Heart of Kubernetes**

etcd is not just another database - it's the single source of truth for your entire Kubernetes cluster. Every resource you create, every configuration change you make, every piece of state about running workloads exists only in etcd. Understanding this fundamental truth explains why etcd backup and restore is so critical.

### What Lives in etcd

**All Kubernetes Resources**:
- Pods, Services, Deployments, ConfigMaps, Secrets
- RBAC policies, Network policies, Custom resources
- Node registrations and health status
- Scheduler decisions and resource allocations

**Cluster Configuration State**:
- API server configuration and feature gates
- Controller manager and scheduler configurations
- Cluster-wide settings and admission controllers
- Certificate data and encryption keys

**Runtime State**:
- Which pods are running on which nodes
- Service endpoint mappings
- Persistent volume claims and bindings
- Lease information for leader election

### The Catastrophic Risk of etcd Loss

**Without etcd backup, losing your etcd cluster means**:
- **Complete cluster rebuild**: Start from scratch with new infrastructure
- **Application redeployment**: Manually recreate all workloads and configurations
- **Data loss**: Lose all secrets, configurations, and state history
- **Extended downtime**: Hours to days of recovery time vs minutes with backup
- **Compliance violations**: Loss of audit trails and configuration history

**Real-world incident costs**:
- Netflix: 8-hour outage due to database corruption cost ~$150M in lost revenue
- GitHub: 24-hour partial outage in 2018 required complex data recovery
- Many companies report $100,000-$1M+ per hour costs for major system outages

This explains why etcd backup is not optional - it's the foundation of disaster recovery.

---

## **etcd Architecture and Data Model**

### How etcd Stores Kubernetes Data

**Key-Value Structure**:
```bash
# etcd stores everything as key-value pairs in a hierarchical namespace
# Example keys in Kubernetes etcd:

/registry/pods/default/my-pod          # Pod definition
/registry/services/specs/default/my-service  # Service spec
/registry/secrets/default/my-secret    # Secret data
/registry/configmaps/default/my-config # ConfigMap data
/registry/nodes/worker-1               # Node registration
```

**Why This Matters for Backup**:
- **Atomic consistency**: All related data is stored together
- **Point-in-time snapshots**: Backup captures exact cluster state at specific moment
- **Incremental impossibility**: Can't easily do incremental backups due to interdependencies
- **Restore atomicity**: Must restore complete snapshot, not partial data

### etcd Clustering and Replication

**Understanding etcd Consensus**:
```
┌─────────┐    ┌─────────┐    ┌─────────┐
│ etcd-1  │    │ etcd-2  │    │ etcd-3  │
│(Leader) │────│(Follower)───│(Follower)│
└─────────┘    └─────────┘    └─────────┘
     │              │              │
     └──────────────┼──────────────┘
                    │
              ┌─────┴─────┐
              │ Consensus │
              │   Log     │
              └───────────┘
```

**Raft Consensus Implications for Backup**:
- **Single backup suffices**: All nodes contain identical data
- **Backup timing matters**: Capture during stable periods for consistency
- **Restore coordination**: Must restore to same point on all nodes
- **Quorum requirements**: Need majority of nodes for restore validation

### etcd Storage Engine Evolution

**Different etcd Storage Backends**:
```bash
# Check etcd storage version
kubectl -n kube-system exec etcd-master1 -- etcdctl version

# etcd v3 uses bolt database (bbolt)
# - Better performance and reliability
# - More efficient storage format
# - Supports larger datasets
# - Different backup format than v2
```

**Why Storage Version Matters**:
- **Backup compatibility**: v2 and v3 backups are not interchangeable
- **Restore procedures**: Different commands and options
- **Performance characteristics**: v3 handles larger clusters better
- **Feature availability**: Some features only in v3 (like lease management)

---

## **etcd Backup Strategies and Types**

### Snapshot-Based Backups (Recommended)

**What is an etcd Snapshot**:
A snapshot is a point-in-time copy of the entire etcd database that includes:
- All key-value data
- Metadata and revision history
- Cluster membership information
- Consistent state across all keys

**Why Snapshots vs File System Backups**:
```bash
# File system backup (WRONG approach)
tar -czf etcd-backup.tar.gz /var/lib/etcd/

# Problems with filesystem backup:
# - May capture inconsistent state
# - Doesn't handle WAL (Write-Ahead Log) properly
# - Can't guarantee transactional consistency
# - Misses in-memory state

# Snapshot backup (CORRECT approach)
ETCDCTL_API=3 etcdctl snapshot save backup.db

# Benefits of snapshot:
# - Guarantees consistency
# - Handles all etcd internals correctly
# - Includes complete cluster state
# - Can be restored atomically
```

### Understanding etcd Data Consistency

**ACID Properties in etcd**:
- **Atomicity**: Either all changes in a transaction succeed or all fail
- **Consistency**: Database remains in valid state before/after transactions
- **Isolation**: Concurrent transactions don't interfere with each other
- **Durability**: Committed changes survive system failures

**How Snapshots Preserve Consistency**:
```bash
# When you take a snapshot, etcd:
# 1. Stops accepting new writes temporarily
# 2. Flushes all pending writes to disk
# 3. Creates consistent copy of database
# 4. Resumes normal operations
# 5. Returns snapshot with guaranteed consistency
```

### Backup Frequency and Timing

**Backup Frequency Considerations**:
```bash
# Factors affecting backup frequency:
# - Change rate in cluster (how often resources are modified)
# - Recovery time objectives (RTO)
# - Recovery point objectives (RPO)
# - Storage costs and retention requirements

# Common backup schedules:
# High-change environments: Every 4-6 hours
# Medium-change environments: Every 12-24 hours  
# Low-change environments: Daily
# Before major changes: Always
```

**Optimal Backup Timing**:
```bash
# Best times to take backups:
# - During low activity periods (minimize performance impact)
# - Before cluster upgrades or major changes
# - After significant configuration changes
# - Before maintenance windows

# Check cluster activity before backup
kubectl top nodes
kubectl get events --sort-by=.metadata.creationTimestamp | tail -10
```

---

## **Implementing etcd Backup Procedures**

### Basic Snapshot Creation

**Standard Backup Command**:
```bash
# Basic etcd snapshot with proper authentication
ETCDCTL_API=3 etcdctl snapshot save /backup/etcd-snapshot-$(date +%Y%m%d_%H%M%S).db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
  --key=/etc/kubernetes/pki/etcd/healthcheck-client.key
```

**Understanding Each Parameter**:

**`--endpoints=https://127.0.0.1:2379`**: 
- Points to etcd API endpoint
- Use localhost if running on etcd node
- Use cluster IPs if running remotely
- Can specify multiple endpoints for HA clusters

**Certificate Parameters**:
- **`--cacert`**: Certificate Authority to verify etcd server identity
- **`--cert`**: Client certificate for authentication  
- **`--key`**: Private key for client certificate
- **Authentication is mandatory**: etcd rejects unauthenticated backup requests

### Advanced Backup Configuration

**Multi-Node Cluster Backup**:
```bash
#!/bin/bash
# backup-etcd-cluster.sh

# Configuration
BACKUP_DIR="/backup/etcd"
DATE=$(date +%Y%m%d_%H%M%S)
ENDPOINTS="https://10.0.1.10:2379,https://10.0.1.11:2379,https://10.0.1.12:2379"

# Certificate paths
CACERT="/etc/kubernetes/pki/etcd/ca.crt"
CERT="/etc/kubernetes/pki/etcd/healthcheck-client.crt"
KEY="/etc/kubernetes/pki/etcd/healthcheck-client.key"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Check etcd cluster health before backup
echo "Checking etcd cluster health..."
ETCDCTL_API=3 etcdctl endpoint health \
  --endpoints="$ENDPOINTS" \
  --cacert="$CACERT" \
  --cert="$CERT" \
  --key="$KEY"

if [ $? -ne 0 ]; then
    echo "ERROR: etcd cluster unhealthy, aborting backup"
    exit 1
fi

# Create snapshot from leader node
echo "Creating etcd snapshot..."
ETCDCTL_API=3 etcdctl snapshot save "$BACKUP_DIR/etcd-snapshot-$DATE.db" \
  --endpoints="$ENDPOINTS" \
  --cacert="$CACERT" \
  --cert="$CERT" \
  --key="$KEY"

# Verify snapshot integrity
echo "Verifying snapshot integrity..."
ETCDCTL_API=3 etcdctl snapshot status "$BACKUP_DIR/etcd-snapshot-$DATE.db" --write-out=table

# Compress snapshot for storage efficiency
echo "Compressing snapshot..."
gzip "$BACKUP_DIR/etcd-snapshot-$DATE.db"

# Calculate and store checksum
echo "Calculating checksum..."
sha256sum "$BACKUP_DIR/etcd-snapshot-$DATE.db.gz" > "$BACKUP_DIR/etcd-snapshot-$DATE.db.gz.sha256"

# Clean up old backups (keep last 30 days)
find "$BACKUP_DIR" -name "etcd-snapshot-*.db.gz" -mtime +30 -delete
find "$BACKUP_DIR" -name "*.sha256" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/etcd-snapshot-$DATE.db.gz"
ls -la "$BACKUP_DIR/etcd-snapshot-$DATE.db.gz"
```

### Backup Validation and Testing

**Why Backup Validation Matters**:
- Corrupted backups are discovered during emergency recovery (worst possible time)
- Network issues during backup can create incomplete snapshots
- Storage problems can corrupt backup files
- Certificate issues can cause authentication failures

**Backup Integrity Verification**:
```bash
# Verify snapshot can be read
ETCDCTL_API=3 etcdctl snapshot status backup.db --write-out=table

# Expected output shows:
# - Database size
# - Number of keys
# - Database hash
# - Revision number

# Test restore capability (non-destructive test)
mkdir -p /tmp/etcd-restore-test
ETCDCTL_API=3 etcdctl snapshot restore backup.db \
  --data-dir=/tmp/etcd-restore-test \
  --name=test-restore \
  --initial-cluster=test-restore=http://localhost:2380 \
  --initial-advertise-peer-urls=http://localhost:2380

# Verify restored data structure
ls -la /tmp/etcd-restore-test/
rm -rf /tmp/etcd-restore-test
```

**Automated Backup Testing**:
```bash
#!/bin/bash
# test-etcd-backup.sh

BACKUP_FILE="$1"
TEST_DIR="/tmp/etcd-restore-test-$(date +%s)"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Test 1: Verify snapshot status
echo "Testing snapshot status..."
ETCDCTL_API=3 etcdctl snapshot status "$BACKUP_FILE" --write-out=json > /tmp/snapshot-status.json

# Extract key metrics
HASH=$(jq -r '.hash' /tmp/snapshot-status.json)
KEYS=$(jq -r '.totalKey' /tmp/snapshot-status.json)
SIZE=$(jq -r '.totalSize' /tmp/snapshot-status.json)

echo "Snapshot Hash: $HASH"
echo "Total Keys: $KEYS"
echo "Total Size: $SIZE bytes"

# Test 2: Restore to temporary directory
echo "Testing restore capability..."
ETCDCTL_API=3 etcdctl snapshot restore "$BACKUP_FILE" \
  --data-dir="$TEST_DIR" \
  --name=test-restore \
  --initial-cluster=test-restore=http://localhost:2380 \
  --initial-advertise-peer-urls=http://localhost:2380

if [ $? -eq 0 ]; then
    echo "SUCCESS: Backup restore test passed"
    # Verify directory structure
    ls -la "$TEST_DIR/"
    du -sh "$TEST_DIR"
    rm -rf "$TEST_DIR"
else
    echo "ERROR: Backup restore test failed"
    exit 1
fi

# Test 3: Verify file integrity if compressed
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo "Testing compressed file integrity..."
    gzip -t "$BACKUP_FILE"
    if [ $? -eq 0 ]; then
        echo "SUCCESS: Compressed file integrity verified"
    else
        echo "ERROR: Compressed file is corrupted"
        exit 1
    fi
fi

echo "All backup tests passed for: $BACKUP_FILE"
```

---

## **etcd Restore Procedures**

### Understanding Restore Scenarios

**Complete Cluster Loss**:
- All etcd nodes failed simultaneously
- Data corruption across all nodes
- Accidental deletion of etcd data directories
- **Recovery approach**: Restore from snapshot to new cluster

**Single Node Failure**:
- One etcd node fails in multi-node cluster
- Hardware failure or corruption on one node
- **Recovery approach**: Re-add node to existing cluster

**Partial Data Corruption**:
- Some data corrupted but cluster still functional
- Inconsistent state between nodes
- **Recovery approach**: Restore all nodes from same snapshot

### Complete Cluster Restore

**Step-by-Step Restore Process**:
```bash
#!/bin/bash
# etcd-cluster-restore.sh

SNAPSHOT_FILE="$1"
CLUSTER_NAME="kubernetes"

if [ ! -f "$SNAPSHOT_FILE" ]; then
    echo "ERROR: Snapshot file not found: $SNAPSHOT_FILE"
    exit 1
fi

echo "Starting etcd cluster restore from: $SNAPSHOT_FILE"

# Step 1: Stop all Kubernetes services
echo "Stopping Kubernetes services..."
systemctl stop kubelet
systemctl stop containerd  # or docker

# Step 2: Stop etcd if running
systemctl stop etcd 2>/dev/null || echo "etcd service not running"

# Step 3: Backup existing etcd data (if any)
if [ -d /var/lib/etcd ]; then
    echo "Backing up existing etcd data..."
    mv /var/lib/etcd /var/lib/etcd-backup-$(date +%s)
fi

# Step 4: Restore snapshot
echo "Restoring etcd snapshot..."
ETCDCTL_API=3 etcdctl snapshot restore "$SNAPSHOT_FILE" \
  --data-dir=/var/lib/etcd \
  --name=master1 \
  --initial-cluster=master1=https://10.0.1.10:2380,master2=https://10.0.1.11:2380,master3=https://10.0.1.12:2380 \
  --initial-cluster-token="$CLUSTER_NAME" \
  --initial-advertise-peer-urls=https://10.0.1.10:2380

# Step 5: Set proper permissions
chown -R etcd:etcd /var/lib/etcd
chmod 700 /var/lib/etcd

# Step 6: Start etcd
echo "Starting etcd..."
systemctl start etcd

# Step 7: Wait for etcd to be healthy
echo "Waiting for etcd to become healthy..."
for i in {1..30}; do
    if ETCDCTL_API=3 etcdctl endpoint health \
        --endpoints=https://127.0.0.1:2379 \
        --cacert=/etc/kubernetes/pki/etcd/ca.crt \
        --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
        --key=/etc/kubernetes/pki/etcd/healthcheck-client.key; then
        echo "etcd is healthy"
        break
    fi
    echo "Waiting for etcd... ($i/30)"
    sleep 10
done

# Step 8: Start Kubernetes services
echo "Starting Kubernetes services..."
systemctl start containerd
systemctl start kubelet

# Step 9: Verify cluster health
echo "Verifying cluster health..."
sleep 30
kubectl get nodes
kubectl get pods -n kube-system

echo "Restore completed. Verify all applications are working correctly."
```

**Multi-Node Cluster Restore**:
```bash
# For HA etcd clusters, restore on each node with appropriate parameters

# Node 1 (master1):
ETCDCTL_API=3 etcdctl snapshot restore backup.db \
  --data-dir=/var/lib/etcd \
  --name=master1 \
  --initial-cluster=master1=https://10.0.1.10:2380,master2=https://10.0.1.11:2380,master3=https://10.0.1.12:2380 \
  --initial-cluster-token=kubernetes-cluster \
  --initial-advertise-peer-urls=https://10.0.1.10:2380

# Node 2 (master2):
ETCDCTL_API=3 etcdctl snapshot restore backup.db \
  --data-dir=/var/lib/etcd \
  --name=master2 \
  --initial-cluster=master1=https://10.0.1.10:2380,master2=https://10.0.1.11:2380,master3=https://10.0.1.12:2380 \
  --initial-cluster-token=kubernetes-cluster \
  --initial-advertise-peer-urls=https://10.0.1.11:2380

# Node 3 (master3):
ETCDCTL_API=3 etcdctl snapshot restore backup.db \
  --data-dir=/var/lib/etcd \
  --name=master3 \
  --initial-cluster=master1=https://10.0.1.10:2380,master2=https://10.0.1.11:2380,master3=https://10.0.1.12:2380 \
  --initial-cluster-token=kubernetes-cluster \
  --initial-advertise-peer-urls=https://10.0.1.12:2380
```

### Understanding Restore Parameters

**Critical Restore Parameters Explained**:

**`--data-dir`**: 
- Specifies where to create restored etcd database
- Must match etcd configuration in systemd/static pod
- Should be empty directory for clean restore

**`--name`**: 
- Unique identifier for this etcd member
- Must match name in cluster configuration
- Different for each node in HA setup

**`--initial-cluster`**: 
- Defines all etcd cluster members
- Format: name=peer-url,name=peer-url
- Must be identical on all nodes

**`--initial-cluster-token`**: 
- Security token to distinguish this cluster
- Prevents accidental joining of wrong clusters
- Should be unique per cluster

**`--initial-advertise-peer-urls`**: 
- URL this member advertises to other cluster members
- Must be reachable by other etcd nodes
- Different for each node (its own IP)

### Single Node Recovery

**Adding New Node to Existing Cluster**:
```bash
# If one node fails in HA cluster, add replacement node

# Step 1: On healthy etcd node, add new member
ETCDCTL_API=3 etcdctl member add master3-new \
  --peer-urls=https://10.0.1.13:2380 \
  --endpoints=https://10.0.1.10:2379,https://10.0.1.11:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
  --key=/etc/kubernetes/pki/etcd/healthcheck-client.key

# Step 2: On new node, start etcd with --initial-cluster-state=existing
ETCDCTL_API=3 etcdctl snapshot restore backup.db \
  --data-dir=/var/lib/etcd \
  --name=master3-new \
  --initial-cluster=master1=https://10.0.1.10:2380,master2=https://10.0.1.11:2380,master3-new=https://10.0.1.13:2380 \
  --initial-cluster-state=existing \
  --initial-advertise-peer-urls=https://10.0.1.13:2380

# Step 3: Start etcd service
systemctl start etcd

# Step 4: Verify cluster health
ETCDCTL_API=3 etcdctl member list
ETCDCTL_API=3 etcdctl endpoint health --cluster
```

---

## **Automation and Production Practices**

### Automated Backup Pipeline

**Systemd Timer for Regular Backups**:
```bash
# /etc/systemd/system/etcd-backup.service
[Unit]
Description=etcd backup
After=network.target

[Service]
Type=oneshot
User=root
ExecStart=/usr/local/bin/etcd-backup.sh
StandardOutput=journal
StandardError=journal

# /etc/systemd/system/etcd-backup.timer
[Unit]
Description=etcd backup timer
Requires=etcd-backup.service

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target

# Enable the timer
systemctl enable etcd-backup.timer
systemctl start etcd-backup.timer
systemctl list-timers | grep etcd-backup
```

**Production Backup Script**:
```bash
#!/bin/bash
# /usr/local/bin/etcd-backup.sh

set -euo pipefail

# Configuration
BACKUP_DIR="/backup/etcd"
RETENTION_DAYS=30
MAX_BACKUP_SIZE="10G"
ALERT_EMAIL="admin@company.com"

# etcd configuration
ENDPOINTS="https://127.0.0.1:2379"
CACERT="/etc/kubernetes/pki/etcd/ca.crt"
CERT="/etc/kubernetes/pki/etcd/healthcheck-client.crt"
KEY="/etc/kubernetes/pki/etcd/healthcheck-client.key"

# Logging
LOG_FILE="/var/log/etcd-backup.log"
exec 1> >(tee -a "$LOG_FILE")
exec 2>&1

echo "=== etcd Backup Started: $(date) ==="

# Pre-backup checks
echo "Performing pre-backup health checks..."

# Check disk space
AVAILABLE_SPACE=$(df "$BACKUP_DIR" | tail -1 | awk '{print $4}')
REQUIRED_SPACE=5000000  # 5GB in KB
if [ "$AVAILABLE_SPACE" -lt "$REQUIRED_SPACE" ]; then
    echo "ERROR: Insufficient disk space for backup"
    echo "Available: ${AVAILABLE_SPACE}KB, Required: ${REQUIRED_SPACE}KB" | mail -s "etcd Backup Failed - Disk Space" "$ALERT_EMAIL"
    exit 1
fi

# Check etcd health
if ! ETCDCTL_API=3 etcdctl endpoint health \
    --endpoints="$ENDPOINTS" \
    --cacert="$CACERT" \
    --cert="$CERT" \
    --key="$KEY" >/dev/null 2>&1; then
    echo "ERROR: etcd cluster is unhealthy"
    echo "etcd health check failed before backup" | mail -s "etcd Backup Failed - Unhealthy Cluster" "$ALERT_EMAIL"
    exit 1
fi

# Create backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/etcd-snapshot-$TIMESTAMP.db"

echo "Creating backup: $BACKUP_FILE"
if ETCDCTL_API=3 etcdctl snapshot save "$BACKUP_FILE" \
    --endpoints="$ENDPOINTS" \
    --cacert="$CACERT" \
    --cert="$CERT" \
    --key="$KEY"; then
    echo "Backup created successfully"
else
    echo "ERROR: Backup creation failed"
    echo "etcd snapshot creation failed" | mail -s "etcd Backup Failed - Snapshot Error" "$ALERT_EMAIL"
    exit 1
fi

# Verify backup
echo "Verifying backup integrity..."
if ETCDCTL_API=3 etcdctl snapshot status "$BACKUP_FILE" --write-out=table; then
    echo "Backup verification successful"
else
    echo "ERROR: Backup verification failed"
    rm -f "$BACKUP_FILE"
    echo "Backup verification failed, file removed" | mail -s "etcd Backup Failed - Verification Error" "$ALERT_EMAIL"
    exit 1
fi

# Compress backup
echo "Compressing backup..."
gzip "$BACKUP_FILE"
COMPRESSED_FILE="${BACKUP_FILE}.gz"

# Generate checksum
sha256sum "$COMPRESSED_FILE" > "${COMPRESSED_FILE}.sha256"

# Upload to remote storage (example with AWS S3)
if command -v aws >/dev/null 2>&1; then
    echo "Uploading to S3..."
    aws s3 cp "$COMPRESSED_FILE" s3://company-etcd-backups/$(hostname)/
    aws s3 cp "${COMPRESSED_FILE}.sha256" s3://company-etcd-backups/$(hostname)/
fi

# Cleanup old backups
echo "Cleaning up old backups..."
find "$BACKUP_DIR" -name "etcd-snapshot-*.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.sha256" -mtime +$RETENTION_DAYS -delete

# Report success
BACKUP_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
echo "=== etcd Backup Completed Successfully: $(date) ==="
echo "Backup file: $COMPRESSED_FILE"
echo "Backup size: $BACKUP_SIZE"

# Send success notification
echo "etcd backup completed successfully. Size: $BACKUP_SIZE" | mail -s "etcd Backup Success" "$ALERT_EMAIL"
```

### Monitoring and Alerting

**Prometheus Metrics for Backup Monitoring**:
```yaml
# etcd-backup-exporter.py (custom metrics exporter)
#!/usr/bin/env python3

import os
import time
import glob
from prometheus_client import start_http_server, Gauge, Counter

# Metrics
backup_age_seconds = Gauge('etcd_backup_age_seconds', 'Age of latest backup in seconds')
backup_size_bytes = Gauge('etcd_backup_size_bytes', 'Size of latest backup in bytes')
backup_success_total = Counter('etcd_backup_success_total', 'Total successful backups')
backup_failure_total = Counter('etcd_backup_failure_total', 'Total failed backups')

def collect_backup_metrics():
    backup_dir = '/backup/etcd'
    
    # Find latest backup
    backups = glob.glob(f"{backup_dir}/etcd-snapshot-*.gz")
    if backups:
        latest_backup = max(backups, key=os.path.getctime)
        
        # Calculate age
        backup_time = os.path.getctime(latest_backup)
        age_seconds = time.time() - backup_time
        backup_age_seconds.set(age_seconds)
        
        # Get size
        size_bytes = os.path.getsize(latest_backup)
        backup_size_bytes.set(size_bytes)
    
    # Read success/failure counts from log
    # (Implementation depends on your logging format)

if __name__ == '__main__':
    start_http_server(8080)
    while True:
        collect_backup_metrics()
        time.sleep(300)  # Update every 5 minutes
```

**Alerting Rules**:
```yaml
# prometheus-etcd-backup-alerts.yml
groups:
- name: etcd-backup
  rules:
  - alert: EtcdBackupTooOld
    expr: etcd_backup_age_seconds > 86400  # 24 hours
    for: 1h
    labels:
      severity: warning
    annotations:
      summary: "etcd backup is too old"
      description: "Latest etcd backup is {{ $value }} seconds old"
      
  - alert: EtcdBackupMissing
    expr: absent(etcd_backup_age_seconds)
    for: 30m
    labels:
      severity: critical
    annotations:
      summary: "etcd backup metrics missing"
      description: "No etcd backup metrics available"
      
  - alert: EtcdBackupFailed
    expr: increase(etcd_backup_failure_total[24h]) > 0
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "etcd backup failures detected"
      description: "{{ $value }} etcd backup failures in last 24 hours"
```

---

## **Security and Encryption Considerations**

### Backup Encryption

**Why Encrypt Backups**:
- etcd contains all cluster secrets (passwords, API keys, certificates)
- Backup files stored on disk or transmitted over network
- Compliance requirements (GDPR, HIPAA, SOX)
- Insider threat mitigation

**Encryption at Rest**:
```bash
#!/bin/bash
# encrypted-etcd-backup.sh

BACKUP_FILE="etcd-snapshot-$(date +%Y%m%d_%H%M%S).db"
ENCRYPTED_FILE="${BACKUP_FILE}.gpg"
GPG_RECIPIENT="backup@company.com"

# Create backup
ETCDCTL_API=3 etcdctl snapshot save "$BACKUP_FILE" \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
  --key=/etc/kubernetes/pki/etcd/healthcheck-client.key

# Encrypt backup
gpg --cipher-algo AES256 --compress-algo 2 --symmetric --output "$ENCRYPTED_FILE" "$BACKUP_FILE"

# Securely delete unencrypted backup
shred -vfz -n 3 "$BACKUP_FILE"

echo "Encrypted backup created: $ENCRYPTED_FILE"

# For restore, decrypt first:
# gpg --decrypt etcd-snapshot.db.gpg > etcd-snapshot.db
```

**Certificate Management for Backups**:
```bash
# Create dedicated backup user certificate
openssl genrsa -out etcd-backup.key 2048

openssl req -new -key etcd-backup.key -out etcd-backup.csr \
  -subj "/CN=etcd-backup/O=system:masters"

# Sign with etcd CA
openssl x509 -req -in etcd-backup.csr \
  -CA /etc/kubernetes/pki/etcd/ca.crt \
  -CAkey /etc/kubernetes/pki/etcd/ca.key \
  -out etcd-backup.crt -days 365

# Use dedicated certificates for backups
ETCDCTL_API=3 etcdctl snapshot save backup.db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/ssl/etcd-backup.crt \
  --key=/etc/ssl/etcd-backup.key
```

### Access Control and Audit

**Limiting Backup Access**:
```bash
# Create dedicated backup user
useradd -r -s /bin/false etcd-backup

# Set restrictive permissions on backup directory
mkdir -p /backup/etcd
chown etcd-backup:etcd-backup /backup/etcd
chmod 700 /backup/etcd

# Use sudo for controlled access
# /etc/sudoers.d/etcd-backup
etcd-backup ALL=(root) NOPASSWD: /usr/local/bin/etcd-backup.sh
```

**Audit Logging for Backups**:
```bash
# Log all backup operations
logger -t etcd-backup "Backup started by $(whoami) from $(who am i)"

# Monitor backup file access
auditctl -w /backup/etcd -p rwxa -k etcd-backup-access

# Review audit logs
ausearch -k etcd-backup-access
```

---

## **Performance Optimization and Troubleshooting**

### Backup Performance Considerations

**Factors Affecting Backup Performance**:
```bash
# Database size impact
ETCDCTL_API=3 etcdctl endpoint status --write-out=table

# I/O performance during backup
iostat -x 1 5 &
ETCDCTL_API=3 etcdctl snapshot save backup.db
kill %1

# Network latency (for remote backups)
ping -c 5 backup-server
iperf3 -c backup-server -t 30
```

**Optimizing Backup Performance**:
```bash
# Use local storage for initial backup
ETCDCTL_API=3 etcdctl snapshot save /tmp/backup.db

# Compress and transfer separately
gzip /tmp/backup.db
rsync -avz /tmp/backup.db.gz backup-server:/backups/

# Parallel compression for large backups
pigz /tmp/backup.db  # Use pigz instead of gzip for parallel compression
```

### Troubleshooting Backup Issues

**Common Backup Failures**:

**Authentication Issues**:
```bash
# Test certificate validity
openssl x509 -in /etc/kubernetes/pki/etcd/healthcheck-client.crt -text -noout | grep -A2 "Not After"

# Test certificate chain
openssl verify -CAfile /etc/kubernetes/pki/etcd/ca.crt /etc/kubernetes/pki/etcd/healthcheck-client.crt

# Debug TLS connection
openssl s_client -connect 127.0.0.1:2379 -cert /etc/kubernetes/pki/etcd/healthcheck-client.crt -key /etc/kubernetes/pki/etcd/healthcheck-client.key -CAfile /etc/kubernetes/pki/etcd/ca.crt
```

**Permission Errors**:
```bash
# Check etcd data directory permissions
ls -la /var/lib/etcd/
ps aux | grep etcd  # Check which user etcd runs as

# Fix permissions if needed
chown -R etcd:etcd /var/lib/etcd
chmod 700 /var/lib/etcd
```

**Network Connectivity Issues**:
```bash
# Test etcd endpoint connectivity
telnet 127.0.0.1 2379

# Check firewall rules
iptables -L INPUT -n | grep 2379
systemctl status firewalld

# Test with verbose etcdctl
ETCDCTL_API=3 etcdctl --debug snapshot save backup.db
```

### Restore Troubleshooting

**Common Restore Failures**:

**Snapshot Corruption**:
```bash
# Verify snapshot integrity
ETCDCTL_API=3 etcdctl snapshot status backup.db

# If corrupted, try previous backup
ls -la /backup/etcd/etcd-snapshot-*.gz
```

**Permission Issues During Restore**:
```bash
# Ensure correct ownership after restore
chown -R etcd:etcd /var/lib/etcd
chmod 700 /var/lib/etcd

# Check SELinux contexts (if enabled)
restorecon -R /var/lib/etcd
```

**Cluster Configuration Mismatches**:
```bash
# Verify cluster configuration matches restore parameters
cat /etc/systemd/system/etcd.service | grep -E "(initial-cluster|name)"

# Check etcd static pod configuration
cat /etc/kubernetes/manifests/etcd.yaml | grep -E "(initial-cluster|name)"
```

**Post-Restore Validation**:
```bash
# Check etcd cluster health
ETCDCTL_API=3 etcdctl endpoint health --cluster

# Verify Kubernetes functionality
kubectl get nodes
kubectl get pods -n kube-system
kubectl create deployment test --image=nginx
kubectl get deployments
kubectl delete deployment test
```

---

## **Disaster Recovery Planning**

### Recovery Time and Point Objectives

**Defining RPO and RTO for etcd**:
- **RPO (Recovery Point Objective)**: Maximum acceptable data loss
  - Typical values: 1-24 hours depending on change frequency
  - Determines backup frequency
  - Factor in cluster change rate and business impact

- **RTO (Recovery Time Objective)**: Maximum acceptable downtime
  - Cluster restore: 30-60 minutes
  - Application restart: Additional 15-30 minutes
  - Total system recovery: 1-2 hours typical

**Backup Strategy Based on Objectives**:
```bash
# High availability requirements (RPO: 1 hour, RTO: 30 minutes)
# - Hourly backups
# - Hot standby cluster
# - Automated restore procedures

# Standard requirements (RPO: 24 hours, RTO: 2 hours)  
# - Daily backups
# - Documented manual procedures
# - Tested restore process

# Low-criticality (RPO: 1 week, RTO: 1 day)
# - Weekly backups
# - Basic documentation
# - Best-effort recovery
```

### Multi-Region Backup Strategy

**Cross-Region Backup Replication**:
```bash
#!/bin/bash
# cross-region-backup.sh

PRIMARY_REGION="us-west-2"
SECONDARY_REGION="us-east-1"
BACKUP_BUCKET="company-etcd-backups"

# Create backup in primary region
BACKUP_FILE="etcd-snapshot-$(date +%Y%m%d_%H%M%S).db"
ETCDCTL_API=3 etcdctl snapshot save "$BACKUP_FILE"

# Encrypt and compress
gpg --symmetric --cipher-algo AES256 --output "${BACKUP_FILE}.gpg" "$BACKUP_FILE"
rm "$BACKUP_FILE"

# Upload to primary region
aws s3 cp "${BACKUP_FILE}.gpg" "s3://${BACKUP_BUCKET}/${PRIMARY_REGION}/"

# Replicate to secondary region
aws s3 cp "s3://${BACKUP_BUCKET}/${PRIMARY_REGION}/${BACKUP_FILE}.gpg" \
         "s3://${BACKUP_BUCKET}/${SECONDARY_REGION}/"

# Verify replication
aws s3 ls "s3://${BACKUP_BUCKET}/${SECONDARY_REGION}/" | grep "${BACKUP_FILE}.gpg"
```

### Testing Disaster Recovery

**Automated DR Testing**:
```bash
#!/bin/bash
# dr-test.sh

DR_CLUSTER_CONFIG="dr-cluster-kubeconfig"
PRODUCTION_BACKUP="/backup/etcd/latest-snapshot.db"

echo "Starting DR test with backup: $PRODUCTION_BACKUP"

# 1. Deploy DR cluster (using terraform/ansible)
cd infrastructure/dr-cluster
terraform apply -auto-approve

# 2. Restore backup to DR cluster
scp "$PRODUCTION_BACKUP" dr-master:/tmp/
ssh dr-master "
  systemctl stop kubelet
  rm -rf /var/lib/etcd/*
  ETCDCTL_API=3 etcdctl snapshot restore /tmp/$(basename $PRODUCTION_BACKUP) \\
    --data-dir=/var/lib/etcd \\
    --name=dr-master \\
    --initial-cluster=dr-master=https://10.1.1.10:2380 \\
    --initial-advertise-peer-urls=https://10.1.1.10:2380
  chown -R etcd:etcd /var/lib/etcd
  systemctl start kubelet
"

# 3. Wait for cluster to be ready
echo "Waiting for DR cluster to be ready..."
kubectl --kubeconfig="$DR_CLUSTER_CONFIG" wait --for=condition=Ready nodes --all --timeout=300s

# 4. Validate applications
echo "Validating applications in DR cluster..."
kubectl --kubeconfig="$DR_CLUSTER_CONFIG" get pods -A
kubectl --kubeconfig="$DR_CLUSTER_CONFIG" get deployments -A

# 5. Run application tests
./scripts/test-applications.sh "$DR_CLUSTER_CONFIG"

# 6. Cleanup DR cluster
read -p "DR test complete. Destroy DR cluster? (y/N): " confirm
if [[ $confirm == [yY] ]]; then
    terraform destroy -auto-approve
fi

echo "DR test completed"
```

---

## **Exam Tips**

### Key Concepts to Master
- **etcd is the single source of truth**: Understanding why backup is critical
- **Snapshot vs filesystem backup**: Know why snapshots are the correct approach
- **Authentication requirements**: All etcd operations require proper certificates
- **Restore process**: Complete cluster rebuild from snapshot

### Common Exam Scenarios
1. **Create etcd backup**: Know the complete etcdctl command with certificates
2. **Restore etcd from backup**: Understand the restore process and parameters
3. **Troubleshoot backup/restore issues**: Certificate problems, permission errors
4. **Validate backup integrity**: Use snapshot status command

### Essential Commands to Memorize
```bash
# Create backup
ETCDCTL_API=3 etcdctl snapshot save backup.db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
  --key=/etc/kubernetes/pki/etcd/healthcheck-client.key

# Verify backup
ETCDCTL_API=3 etcdctl snapshot status backup.db --write-out=table

# Restore backup
ETCDCTL_API=3 etcdctl snapshot restore backup.db \
  --data-dir=/var/lib/etcd-restore \
  --name=master \
  --initial-cluster=master=https://127.0.0.1:2380 \
  --initial-advertise-peer-urls=https://127.0.0.1:2380

# Check etcd health
ETCDCTL_API=3 etcdctl endpoint health \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
  --key=/etc/kubernetes/pki/etcd/healthcheck-client.key
```

### Critical Details
- Always use `ETCDCTL_API=3` (not v2)
- Certificate paths are typically `/etc/kubernetes/pki/etcd/`
- Default etcd data directory: `/var/lib/etcd`
- Default etcd endpoint: `https://127.0.0.1:2379`
- Restore creates new cluster, not addition to existing
- Must stop kubelet before restore, restart after
- Verify backup integrity before relying on it
- Each node in HA cluster needs unique name and peer URLs