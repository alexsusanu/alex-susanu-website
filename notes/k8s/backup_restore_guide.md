# Backup/Restore - Comprehensive Study Guide
category: Kubernetes Certification
tags: cka, kubernetes, exam, kubectl, certification

## WHY Backup/Restore Matters (Conceptual Foundation)

### etcd as the Single Point of Truth
Understanding backup/restore is understanding **cluster data protection and disaster recovery**:

- **etcd Contains Everything** - All cluster state, configurations, secrets live in etcd
- **Data Loss Scenarios** - Hardware failures, human errors, corruption, ransomware
- **Business Continuity** - Minimizing downtime and data loss during disasters
- **Compliance Requirements** - Many industries mandate backup and recovery procedures
- **Testing and Development** - Restore to previous states for testing and rollbacks

### Exam Context: Why Backup/Restore Mastery is Critical
- **15-20% of exam tasks** involve backup/restore scenarios
- **High-value questions** - Backup/restore tasks often worth significant points
- **Time pressure** - Must execute backup/restore quickly under exam conditions
- **Real-world relevance** - Essential skill for production Kubernetes operations
- **Disaster scenarios** - Common exam setup: "etcd is corrupted, restore from backup"

**Key Insight**: etcd backup/restore is **the most critical operational skill** for Kubernetes administrators. A failed restore can mean complete cluster loss.

---

## etcd Architecture and Data Storage

### What Lives in etcd
```
┌─────────────────────────────────────────────────────────────┐
│                    etcd Data Structure                     │
│                                                             │
│  /registry/                                                 │
│  ├── pods/                    ← All pod definitions         │
│  │   ├── default/                                          │
│  │   ├── kube-system/                                      │
│  │   └── production/                                       │
│  ├── services/                ← Service definitions        │
│  ├── deployments/             ← Deployment specs           │
│  ├── configmaps/              ← Configuration data         │
│  ├── secrets/                 ← Encrypted secret data      │
│  ├── persistentvolumes/       ← Storage definitions        │
│  ├── nodes/                   ← Node registrations        │
│  ├── namespaces/              ← Namespace definitions      │
│  └── rbac/                    ← RBAC policies             │
│      ├── roles/                                            │
│      ├── rolebindings/                                     │
│      ├── clusterroles/                                     │
│      └── clusterrolebindings/                              │
└─────────────────────────────────────────────────────────────┘
```

**Critical Understanding**: When you backup etcd, you're backing up **the entire cluster state** - every Kubernetes object, every configuration, every secret.

### etcd Cluster Topology
```
┌─────────────────────────────────────────────────────────────┐
│                  etcd Cluster Architecture                 │
│                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │   etcd-1    │ │   etcd-2    │ │        etcd-3           ││
│  │  (leader)   │ │ (follower)  │ │     (follower)          ││
│  │             │ │             │ │                         ││
│  │/var/lib/etcd│ │/var/lib/etcd│ │    /var/lib/etcd        ││
│  └─────────────┘ └─────────────┘ └─────────────────────────┘│
│         │               │                      │           │
│         └───────────────┼──────────────────────┘           │
│                         │                                  │
│              ┌─────────────────┐                           │
│              │  Raft Consensus │                           │
│              │ (Data Sync)     │                           │
│              └─────────────────┘                           │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
    ┌─────────────────────────────────┐
    │         Backup Strategy         │
    │                                 │
    │ • Backup any etcd member        │
    │ • All members have same data    │
    │ • Restore affects entire cluster│
    └─────────────────────────────────┘
```

---

## etcd Backup Procedures

### Understanding etcdctl
```bash
# etcdctl is the command-line client for etcd
# Critical: Always use API version 3
export ETCDCTL_API=3

# etcdctl requires authentication for secure etcd clusters
export ETCDCTL_ENDPOINTS=https://127.0.0.1:2379
export ETCDCTL_CACERT=/etc/kubernetes/pki/etcd/ca.crt
export ETCDCTL_CERT=/etc/kubernetes/pki/etcd/server.crt
export ETCDCTL_KEY=/etc/kubernetes/pki/etcd/server.key
```

### Basic Backup Command
```bash
# Simple backup command (exam-ready format)
ETCDCTL_API=3 etcdctl snapshot save /backup/etcd-snapshot-$(date +%Y%m%d-%H%M%S).db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key

# Verify backup was created successfully
ls -la /backup/
ETCDCTL_API=3 etcdctl snapshot status /backup/etcd-snapshot-20240115-143000.db --write-out=table
```

### Complete Backup Script
```bash
#!/bin/bash
# Production-ready etcd backup script

# Configuration
BACKUP_DIR="/backup/etcd"
ETCD_ENDPOINTS="https://127.0.0.1:2379"
ETCD_CACERT="/etc/kubernetes/pki/etcd/ca.crt"
ETCD_CERT="/etc/kubernetes/pki/etcd/server.crt"
ETCD_KEY="/etc/kubernetes/pki/etcd/server.key"
RETENTION_DAYS=7

# Set etcdctl API version
export ETCDCTL_API=3

# Create backup directory
mkdir -p $BACKUP_DIR

# Generate backup filename with timestamp
BACKUP_FILE="$BACKUP_DIR/etcd-snapshot-$(date +%Y%m%d-%H%M%S).db"

echo "Starting etcd backup to $BACKUP_FILE..."

# Perform backup
etcdctl snapshot save $BACKUP_FILE \
  --endpoints=$ETCD_ENDPOINTS \
  --cacert=$ETCD_CACERT \
  --cert=$ETCD_CERT \
  --key=$ETCD_KEY

# Check backup status
if [ $? -eq 0 ]; then
    echo "Backup completed successfully!"
    
    # Verify backup integrity
    etcdctl snapshot status $BACKUP_FILE --write-out=table
    
    # Show backup file details
    echo "Backup file details:"
    ls -lh $BACKUP_FILE
    
    # Cleanup old backups (keep only last 7 days)
    find $BACKUP_DIR -name "etcd-snapshot-*.db" -mtime +$RETENTION_DAYS -delete
    echo "Cleaned up backups older than $RETENTION_DAYS days"
    
else
    echo "Backup failed!"
    exit 1
fi
```

### Automated Backup with CronJob
```yaml
# Kubernetes CronJob for automated etcd backups
apiVersion: batch/v1
kind: CronJob
metadata:
  name: etcd-backup
  namespace: kube-system
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
  jobTemplate:
    spec:
      template:
        spec:
          hostNetwork: true  # Access etcd on host network
          nodeSelector:
            node-role.kubernetes.io/control-plane: ""  # Run on master node
          tolerations:
          - operator: "Exists"
            effect: "NoSchedule"
          containers:
          - name: etcd-backup
            image: k8s.gcr.io/etcd:3.5.7-0
            command:
            - /bin/sh
            - -c
            - |
              export ETCDCTL_API=3
              etcdctl snapshot save /backup/etcd-snapshot-$(date +%Y%m%d-%H%M%S).db \
                --endpoints=https://127.0.0.1:2379 \
                --cacert=/etc/kubernetes/pki/etcd/ca.crt \
                --cert=/etc/kubernetes/pki/etcd/server.crt \
                --key=/etc/kubernetes/pki/etcd/server.key
              
              # Verify backup
              etcdctl snapshot status /backup/etcd-snapshot-$(date +%Y%m%d)*.db --write-out=table
              
              # Cleanup old backups (keep 7 days)
              find /backup -name "etcd-snapshot-*.db" -mtime +7 -delete
            volumeMounts:
            - name: etcd-certs
              mountPath: /etc/kubernetes/pki/etcd
              readOnly: true
            - name: backup-storage
              mountPath: /backup
          volumes:
          - name: etcd-certs
            hostPath:
              path: /etc/kubernetes/pki/etcd
              type: Directory
          - name: backup-storage
            hostPath:
              path: /backup/etcd
              type: DirectoryOrCreate
          restartPolicy: OnFailure
```

### Backup Verification
```bash
# Always verify backup after creation
BACKUP_FILE="/backup/etcd-snapshot-20240115-143000.db"

# Check backup file integrity and metadata
ETCDCTL_API=3 etcdctl snapshot status $BACKUP_FILE --write-out=table
# Expected output:
# +----------+----------+------------+------------+
# |   HASH   | REVISION | TOTAL KEYS | TOTAL SIZE |
# +----------+----------+------------+------------+
# | c42e2d8a |     1847 |       1234 |     2.1 MB |
# +----------+----------+------------+------------+

# Verify backup file is not corrupted
file $BACKUP_FILE
# Expected: should show it's a valid file, not corrupted

# Check backup file size (should be > 0)
ls -lh $BACKUP_FILE
du -h $BACKUP_FILE
```

---

## etcd Restore Procedures

### Pre-Restore Preparation
```bash
# CRITICAL: Restore is a DESTRUCTIVE operation
# Always backup current state before restore!

# 1. Stop kube-apiserver (prevents new writes to etcd)
sudo mv /etc/kubernetes/manifests/kube-apiserver.yaml /tmp/

# 2. Verify apiserver is stopped
kubectl get nodes  # Should fail with connection error

# 3. Stop etcd
sudo mv /etc/kubernetes/manifests/etcd.yaml /tmp/

# 4. Verify etcd is stopped
sudo ss -tlnp | grep 2379  # Should show no process listening

# 5. Backup existing etcd data (safety measure)
sudo mv /var/lib/etcd /var/lib/etcd-backup-$(date +%Y%m%d-%H%M%S)
```

### Basic Restore Command
```bash
# Restore etcd from snapshot
ETCDCTL_API=3 etcdctl snapshot restore /backup/etcd-snapshot-20240115-143000.db \
  --data-dir=/var/lib/etcd \
  --name=master-node \
  --initial-cluster=master-node=https://192.168.1.100:2380 \
  --initial-advertise-peer-urls=https://192.168.1.100:2380

# Fix ownership (etcd user must own the data directory)
sudo chown -R etcd:etcd /var/lib/etcd

# Restart etcd
sudo mv /tmp/etcd.yaml /etc/kubernetes/manifests/

# Wait for etcd to start and verify
sleep 10
sudo ss -tlnp | grep 2379  # Should show etcd listening

# Restart kube-apiserver
sudo mv /tmp/kube-apiserver.yaml /etc/kubernetes/manifests/

# Verify cluster is functional
kubectl get nodes
kubectl get pods --all-namespaces
```

### Complete Restore Procedure
```bash
#!/bin/bash
# Production-ready etcd restore script

BACKUP_FILE="$1"
ETCD_DATA_DIR="/var/lib/etcd"
ETCD_BACKUP_DIR="/var/lib/etcd-backup-$(date +%Y%m%d-%H%M%S)"
NODE_NAME="master-node"
NODE_IP="192.168.1.100"

# Validate input
if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup-file>"
    echo "Example: $0 /backup/etcd-snapshot-20240115-143000.db"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Backup file $BACKUP_FILE does not exist!"
    exit 1
fi

echo "Starting etcd restore from $BACKUP_FILE..."

# Verify backup integrity before restore
echo "Verifying backup integrity..."
ETCDCTL_API=3 etcdctl snapshot status $BACKUP_FILE --write-out=table
if [ $? -ne 0 ]; then
    echo "Backup file is corrupted!"
    exit 1
fi

# Stop kube-apiserver
echo "Stopping kube-apiserver..."
sudo mv /etc/kubernetes/manifests/kube-apiserver.yaml /tmp/
sleep 5

# Stop etcd
echo "Stopping etcd..."
sudo mv /etc/kubernetes/manifests/etcd.yaml /tmp/
sleep 10

# Backup existing etcd data
echo "Backing up existing etcd data to $ETCD_BACKUP_DIR..."
sudo mv $ETCD_DATA_DIR $ETCD_BACKUP_DIR

# Restore from snapshot
echo "Restoring etcd data..."
ETCDCTL_API=3 etcdctl snapshot restore $BACKUP_FILE \
  --data-dir=$ETCD_DATA_DIR \
  --name=$NODE_NAME \
  --initial-cluster=$NODE_NAME=https://$NODE_IP:2380 \
  --initial-advertise-peer-urls=https://$NODE_IP:2380

if [ $? -ne 0 ]; then
    echo "Restore failed! Rolling back..."
    sudo mv $ETCD_BACKUP_DIR $ETCD_DATA_DIR
    exit 1
fi

# Fix ownership
echo "Fixing etcd data ownership..."
sudo chown -R etcd:etcd $ETCD_DATA_DIR

# Restart etcd
echo "Starting etcd..."
sudo mv /tmp/etcd.yaml /etc/kubernetes/manifests/

# Wait for etcd to be ready
echo "Waiting for etcd to start..."
for i in {1..30}; do
    if sudo ss -tlnp | grep -q 2379; then
        echo "etcd is running!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "etcd failed to start!"
        exit 1
    fi
    sleep 2
done

# Restart kube-apiserver
echo "Starting kube-apiserver..."
sudo mv /tmp/kube-apiserver.yaml /etc/kubernetes/manifests/

# Wait for apiserver to be ready
echo "Waiting for kube-apiserver to start..."
for i in {1..30}; do
    if kubectl get nodes &>/dev/null; then
        echo "kube-apiserver is running!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "kube-apiserver failed to start!"
        exit 1
    fi
    sleep 2
done

# Verify restore success
echo "Verifying cluster health..."
kubectl get nodes
kubectl get pods --all-namespaces | head -10

echo "Restore completed successfully!"
echo "Original etcd data backed up to: $ETCD_BACKUP_DIR"
```

### Multi-Master Cluster Restore
```bash
# For clusters with multiple etcd members
# This is more complex and requires coordination

# 1. Stop all kube-apiservers on all master nodes
for node in master-1 master-2 master-3; do
    ssh $node "sudo mv /etc/kubernetes/manifests/kube-apiserver.yaml /tmp/"
done

# 2. Stop all etcd instances
for node in master-1 master-2 master-3; do
    ssh $node "sudo mv /etc/kubernetes/manifests/etcd.yaml /tmp/"
done

# 3. Backup existing etcd data on all nodes
for node in master-1 master-2 master-3; do
    ssh $node "sudo mv /var/lib/etcd /var/lib/etcd-backup-$(date +%Y%m%d-%H%M%S)"
done

# 4. Restore on each node with proper cluster configuration
ETCDCTL_API=3 etcdctl snapshot restore /backup/etcd-snapshot.db \
  --data-dir=/var/lib/etcd \
  --name=master-1 \
  --initial-cluster=master-1=https://192.168.1.100:2380,master-2=https://192.168.1.101:2380,master-3=https://192.168.1.102:2380 \
  --initial-advertise-peer-urls=https://192.168.1.100:2380

# Repeat for each node with appropriate --name and --initial-advertise-peer-urls

# 5. Fix ownership on all nodes
for node in master-1 master-2 master-3; do
    ssh $node "sudo chown -R etcd:etcd /var/lib/etcd"
done

# 6. Start etcd on all nodes
for node in master-1 master-2 master-3; do
    ssh $node "sudo mv /tmp/etcd.yaml /etc/kubernetes/manifests/"
done

# 7. Start kube-apiserver on all nodes
for node in master-1 master-2 master-3; do
    ssh $node "sudo mv /tmp/kube-apiserver.yaml /etc/kubernetes/manifests/"
done
```

---

## Disaster Recovery Scenarios

### Scenario 1: Single Node etcd Corruption
```bash
# Symptoms: 
# - kubectl commands fail
# - etcd logs show corruption errors
# - API server cannot connect to etcd

# Recovery steps:
echo "Scenario 1: etcd corruption on single-node cluster"

# 1. Identify the issue
kubectl get nodes  # Fails
sudo journalctl -u kubelet | grep -i etcd
kubectl logs -n kube-system etcd-master-node

# 2. Stop cluster components
sudo mv /etc/kubernetes/manifests/kube-apiserver.yaml /tmp/
sudo mv /etc/kubernetes/manifests/etcd.yaml /tmp/

# 3. Attempt etcd repair (if possible)
sudo etcd --data-dir=/var/lib/etcd --force-new-cluster

# 4. If repair fails, restore from backup
ETCDCTL_API=3 etcdctl snapshot restore /backup/latest-etcd-snapshot.db \
  --data-dir=/var/lib/etcd-new

sudo rm -rf /var/lib/etcd
sudo mv /var/lib/etcd-new /var/lib/etcd
sudo chown -R etcd:etcd /var/lib/etcd

# 5. Restart components
sudo mv /tmp/etcd.yaml /etc/kubernetes/manifests/
sudo mv /tmp/kube-apiserver.yaml /etc/kubernetes/manifests/
```

### Scenario 2: Complete Cluster Loss
```bash
# Symptoms:
# - All master nodes down
# - etcd data lost on all nodes
# - Need to rebuild cluster from backup

echo "Scenario 2: Complete cluster reconstruction"

# 1. Reinstall Kubernetes on master node(s)
# (This assumes you have cluster configuration backed up separately)

# 2. Initialize new cluster
sudo kubeadm init --config=/backup/kubeadm-config.yaml

# 3. Stop default etcd
sudo mv /etc/kubernetes/manifests/etcd.yaml /tmp/
sudo mv /etc/kubernetes/manifests/kube-apiserver.yaml /tmp/

# 4. Restore etcd data
sudo rm -rf /var/lib/etcd
ETCDCTL_API=3 etcdctl snapshot restore /backup/etcd-snapshot.db \
  --data-dir=/var/lib/etcd

sudo chown -R etcd:etcd /var/lib/etcd

# 5. Restart components
sudo mv /tmp/etcd.yaml /etc/kubernetes/manifests/
sudo mv /tmp/kube-apiserver.yaml /etc/kubernetes/manifests/

# 6. Rejoin worker nodes
kubeadm token create --print-join-command
# Run join command on worker nodes
```

### Scenario 3: Accidental Resource Deletion
```bash
# Symptoms:
# - Critical resources accidentally deleted
# - Need to restore to previous state
# - Cluster is running but missing objects

echo "Scenario 3: Restore specific resources"

# This requires a full etcd restore to get deleted resources back
# You cannot selectively restore individual objects from etcd backup

# 1. Create backup of current state (in case you need to roll forward)
ETCDCTL_API=3 etcdctl snapshot save /backup/pre-restore-$(date +%Y%m%d-%H%M%S).db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key

# 2. Restore from backup that contains the deleted resources
# (Follow standard restore procedure)

# 3. After restore, manually recreate any resources that were created
#    between the backup time and now (if needed)
```

---

## Backup Strategy and Best Practices

### Backup Frequency and Retention
```bash
# Production backup strategy recommendations:

# 1. Automated backups every 6 hours
0 */6 * * * /scripts/etcd-backup.sh

# 2. Retention policy:
# - Hourly backups: Keep for 48 hours
# - Daily backups: Keep for 30 days  
# - Weekly backups: Keep for 90 days
# - Monthly backups: Keep for 1 year

# 3. Multiple storage locations:
# - Local storage for quick recovery
# - Remote storage for disaster recovery
# - Cloud storage for long-term retention
```

### Backup Storage Locations
```yaml
# Example: Backup to multiple locations
apiVersion: batch/v1
kind: CronJob
metadata:
  name: etcd-backup-multi-location
  namespace: kube-system
spec:
  schedule: "0 */6 * * *"  # Every 6 hours
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: etcd-backup
            image: etcd-backup:latest
            command:
            - /bin/bash
            - -c
            - |
              # Create backup
              export ETCDCTL_API=3
              BACKUP_FILE="/tmp/etcd-snapshot-$(date +%Y%m%d-%H%M%S).db"
              
              etcdctl snapshot save $BACKUP_FILE \
                --endpoints=https://127.0.0.1:2379 \
                --cacert=/certs/ca.crt \
                --cert=/certs/server.crt \
                --key=/certs/server.key
              
              # Store locally
              cp $BACKUP_FILE /backup/local/
              
              # Store in NFS
              cp $BACKUP_FILE /backup/nfs/
              
              # Upload to S3
              aws s3 cp $BACKUP_FILE s3://my-etcd-backups/$(date +%Y/%m/%d)/
              
              # Upload to Azure Blob
              az storage blob upload --file $BACKUP_FILE \
                --container-name etcd-backups \
                --name $(date +%Y/%m/%d)/$(basename $BACKUP_FILE)
              
              # Cleanup local temp file
              rm $BACKUP_FILE
            volumeMounts:
            - name: etcd-certs
              mountPath: /certs
            - name: local-backup
              mountPath: /backup/local
            - name: nfs-backup
              mountPath: /backup/nfs
          restartPolicy: OnFailure
```

### Testing Backup and Restore
```bash
#!/bin/bash
# Backup/restore testing script for non-production

echo "Testing backup and restore procedures..."

# 1. Create test resources
kubectl create namespace backup-test
kubectl create deployment test-app --image=nginx -n backup-test
kubectl create configmap test-config --from-literal=key=value -n backup-test

# 2. Create backup
BACKUP_FILE="/tmp/test-backup-$(date +%Y%m%d-%H%M%S).db"
ETCDCTL_API=3 etcdctl snapshot save $BACKUP_FILE \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key

# 3. Delete test resources
kubectl delete namespace backup-test

# 4. Verify deletion
kubectl get namespace backup-test  # Should show "not found"

# 5. Restore from backup
# (Follow standard restore procedure)

# 6. Verify restoration
kubectl get namespace backup-test  # Should exist again
kubectl get deployments -n backup-test  # Should show test-app
kubectl get configmap -n backup-test  # Should show test-config

echo "Backup/restore test completed successfully!"
```

---

## Troubleshooting Backup and Restore

### Common Backup Issues

#### Issue 1: Authentication Failures
```bash
# Error: "certificate verify failed" or "permission denied"

# Check etcd certificate paths
ls -la /etc/kubernetes/pki/etcd/
# Should show: ca.crt, server.crt, server.key

# Verify certificate validity
openssl x509 -in /etc/kubernetes/pki/etcd/server.crt -text -noout | grep -A 2 Validity

# Test etcd connectivity
ETCDCTL_API=3 etcdctl endpoint health \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key
```

#### Issue 2: Backup File Corruption
```bash
# Error: "snapshot file corrupted" during restore

# Verify backup file integrity
file /backup/etcd-snapshot.db
# Should show: "data" or similar, not "ASCII text" or "empty"

# Check backup file size
ls -lh /backup/etcd-snapshot.db
# Should be > 0 bytes, typically several MB

# Try to read backup metadata
ETCDCTL_API=3 etcdctl snapshot status /backup/etcd-snapshot.db --write-out=table
# Should show hash, revision, keys, size
```

#### Issue 3: Insufficient Disk Space
```bash
# Error: "no space left on device"

# Check available space
df -h /backup
df -h /var/lib/etcd

# Clean up old backups
find /backup -name "etcd-snapshot-*.db" -mtime +7 -ls
find /backup -name "etcd-snapshot-*.db" -mtime +7 -delete

# Use compression for backups
gzip /backup/etcd-snapshot-$(date +%Y%m%d).db
```

### Common Restore Issues

#### Issue 1: Restore Fails with "cluster ID mismatch"
```bash
# Error: "database snapshot integrity check failed"

# This happens when trying to restore to existing etcd data
# Solution: Ensure etcd data directory is empty/removed

sudo systemctl stop etcd  # or move static pod manifest
sudo rm -rf /var/lib/etcd/*  # Clear existing data
# Then retry restore
```

#### Issue 2: Restored Cluster Shows Wrong Data
```bash
# Issue: Restore completed but cluster state is not as expected

# Check backup timestamp and contents
ETCDCTL_API=3 etcdctl snapshot status /backup/etcd-snapshot.db --write-out=table

# Verify you restored the correct backup
ls -la /backup/
# Ensure you used the intended backup file

# Check if restore process completed fully
kubectl get all --all-namespaces
kubectl get pv  # Check persistent volumes
kubectl get crd  # Check custom resource definitions
```

#### Issue 3: Nodes Not Rejoining Cluster
```bash
# Issue: After restore, worker nodes show "NotReady"

# Check kubelet logs on worker nodes
sudo journalctl -u kubelet -f

# Common causes:
# 1. Node certificates expired
# 2. Network connectivity issues
# 3. Container runtime issues

# Solution: Re-join nodes to cluster
kubeadm token create --print-join-command
# Run join command on affected nodes
```

---

## Exam-Specific Backup/Restore Tasks

### Common Exam Scenarios

#### Task 1: Create etcd Backup
```bash
# Exam Task: "Create a backup of etcd and save it to /opt/backup/etcd-snapshot.db"

# Solution:
export ETCDCTL_API=3

# Find etcd endpoint and certificates (common exam step)
kubectl describe pod etcd-master -n kube-system | grep -E "listen-client-urls|cert-file|key-file|trusted-ca-file"

# Or check etcd static pod manifest
cat /etc/kubernetes/manifests/etcd.yaml | grep -E "endpoints|cert|key"

# Create backup
etcdctl snapshot save /opt/backup/etcd-snapshot.db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key

# Verify backup
etcdctl snapshot status /opt/backup/etcd-snapshot.db --write-out=table
```

#### Task 2: Restore from Backup
```bash
# Exam Task: "etcd is corrupted. Restore from backup located at /opt/backup/etcd-snapshot.db"

# Solution:
export ETCDCTL_API=3

# 1. Stop kube-apiserver
mv /etc/kubernetes/manifests/kube-apiserver.yaml /tmp/

# 2. Stop etcd  
mv /etc/kubernetes/manifests/etcd.yaml /tmp/

# 3. Backup existing data
mv /var/lib/etcd /var/lib/etcd-backup

# 4. Restore from snapshot
etcdctl snapshot restore /opt/backup/etcd-snapshot.db \
  --data-dir=/var/lib/etcd \
  --name=master \
  --initial-cluster=master=https://192.168.1.100:2380 \
  --initial-advertise-peer-urls=https://192.168.1.100:2380

# 5. Fix ownership
chown -R etcd:etcd /var/lib/etcd

# 6. Start etcd
mv /tmp/etcd.yaml /etc/kubernetes/manifests/

# 7. Start kube-apiserver  
mv /tmp/kube-apiserver.yaml /etc/kubernetes/manifests/

# 8. Verify cluster works
kubectl get nodes
```

#### Task 3: Automated Backup Setup
```bash
# Exam Task: "Set up automated daily backups of etcd"

# Solution: Create cron job
crontab -e
# Add line:
0 2 * * * /usr/local/bin/etcd-backup.sh

# Create backup script
cat > /usr/local/bin/etcd-backup.sh << 'EOF'
#!/bin/bash
export ETCDCTL_API=3
etcdctl snapshot save /backup/etcd-$(date +%Y%m%d).db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key
find /backup -name "etcd-*.db" -mtime +7 -delete
EOF

chmod +x /usr/local/bin/etcd-backup.sh
```

### Quick Reference Commands
```bash
# Essential etcd backup/restore commands for exam:

# Backup:
ETCDCTL_API=3 etcdctl snapshot save /backup/snap.db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key

# Restore:
mv /etc/kubernetes/manifests/kube-apiserver.yaml /tmp/
mv /etc/kubernetes/manifests/etcd.yaml /tmp/
mv /var/lib/etcd /var/lib/etcd-backup
ETCDCTL_API=3 etcdctl snapshot restore /backup/snap.db --data-dir=/var/lib/etcd
chown -R etcd:etcd /var/lib/etcd
mv /tmp/etcd.yaml /etc/kubernetes/manifests/
mv /tmp/kube-apiserver.yaml /etc/kubernetes/manifests/

# Verify:
etcdctl snapshot status /backup/snap.db --write-out=table
kubectl get nodes
```

---

## Integration with Other CKA Topics

### Backup in Security Context
```bash
# Backup includes all security configurations:
# - RBAC roles and bindings
# - ServiceAccounts and their tokens
# - Secrets and their encrypted data
# - NetworkPolicies and SecurityContexts

# After restore, verify security is intact:
kubectl auth can-i create pods --as=system:serviceaccount:default:test
kubectl get networkpolicies --all-namespaces
kubectl get secrets --all-namespaces
```

### Backup and Pod Lifecycle
```bash
# Backup captures current pod states, but not running containers
# After restore:
# - Pod specifications are restored
# - Containers will be recreated by kubelet
# - Data in emptyDir volumes is lost
# - PersistentVolume data persists (separate from etcd)

# Verify pods restart correctly after restore:
kubectl get pods --all-namespaces
kubectl describe pod <stuck-pod> # Check for any issues
```

### Backup and Cluster Components
```bash
# etcd backup includes:
# - Node registrations and status
# - Component configurations
# - Resource quotas and limits

# After restore, check cluster health:
kubectl get componentstatus
kubectl get nodes
kubectl top nodes  # Verify metrics still work
```

---

## Conceptual Mastery Framework

### Understanding etcd as Cluster Memory
etcd is the **persistent memory** of your cluster:
- **Every kubectl apply** results in data written to etcd
- **Every resource definition** lives in etcd's key-value store
- **Cluster state recovery** is impossible without etcd data
- **Backup = snapshot of entire cluster state** at a point in time

### Backup/Restore as Time Travel
Think of backup/restore as **time travel for your cluster**:
- **Backup captures a moment** in cluster history
- **Restore rewinds cluster** to that exact moment
- **Everything after backup time** is lost unless separately preserved
- **Consistency is key** - partial restores don't exist

### Production Considerations
Real-world backup/restore involves:
- **Regular automated backups** with proper retention
- **Multiple storage locations** for disaster recovery
- **Tested restore procedures** - untested backups are useless
- **Documentation and runbooks** for emergency situations
- **Monitoring backup success** and storage capacity

---

## Conceptual Mastery Checklist

✅ **Understand etcd as the single source of truth for cluster state**
✅ **Master the complete backup procedure with authentication**
✅ **Know the detailed restore process including component management**
✅ **Practice disaster recovery scenarios and troubleshooting**
✅ **Implement automated backup strategies with proper retention**
✅ **Integrate backup/restore with other cluster security and operational practices**
✅ **Prepare for exam scenarios with quick, reliable execution**

---

## Final Integration: Complete CKA Mastery

This backup/restore guide completes your comprehensive CKA preparation. You now have deep understanding of:

1. **kubectl** - The client interface and command patterns
2. **YAML Manifests** - Declarative infrastructure definitions  
3. **Cluster Components** - How the distributed system actually works
4. **Pod Lifecycle** - Complete workload management from creation to termination
5. **Security** - Multi-layered defense with RBAC, SecurityContext, and NetworkPolicies
6. **Backup/Restore** - Data protection and disaster recovery procedures

**Key Integration Points**:
- **kubectl** commands interact with **cluster components** to manage **pod lifecycle**
- **YAML manifests** define desired state that **controllers** continuously reconcile
- **Security** policies protect resources throughout their **lifecycle**
- **Backup/restore** preserves all **configurations** and **state** across the entire system

**Exam Success Strategy**:
- **Practice the workflows** until they're muscle memory
- **Understand the conceptual models** behind each technology
- **Know the troubleshooting patterns** for systematic problem-solving
- **Master the integration points** where topics connect

You're now equipped with production-level Kubernetes expertise. The CKA exam will test your ability to apply this knowledge under pressure - trust your preparation and execute the procedures you've mastered.

*Backup/restore mastery means understanding that etcd is the memory of your cluster, and protecting that memory is protecting everything you've built. Every other Kubernetes skill is meaningless if you cannot recover from disaster.*