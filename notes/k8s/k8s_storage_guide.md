# Kubernetes Storage: Complete Deep Technical Guide
category: DevOps
tags: kubernetes, storage, persistent-volumes, pvc, storage-classes, statefulsets, volumes

## Introduction to Kubernetes Storage

Kubernetes storage solves the fundamental problem that **containers are ephemeral** - when a container restarts, all data inside it is lost. Storage in Kubernetes provides ways to persist data beyond the container lifecycle and share data between containers.

### The Container Storage Problem

**Without Persistent Storage:**
```
Container starts → Creates data → Container dies → Data is LOST forever
```

**With Persistent Storage:**
```
Container starts → Mounts persistent volume → Creates data → Container dies → Data SURVIVES
New container starts → Mounts same volume → Sees previous data → Continues working
```

### Kubernetes Storage Concepts Hierarchy

```
Physical Storage (Disk, NFS, Cloud Storage)
↓
Persistent Volume (PV) - Cluster resource representing actual storage
↓
Persistent Volume Claim (PVC) - User's request for storage
↓
Pod Volume Mount - How pods access the claimed storage
```

**Key Insight:** Kubernetes separates the **implementation** (how storage actually works) from the **interface** (how users request storage). This allows the same application to work with different storage backends.

## Persistent Volumes (PV) Deep Dive

### What Persistent Volumes Actually Are

A **Persistent Volume (PV)** is a Kubernetes API object that represents a piece of actual storage that exists somewhere - on a local disk, network file system, or cloud storage service. Think of it like a "storage ID card" that tells Kubernetes where to find real storage.

**PV vs Actual Storage:**
- **Actual Storage** - The real disk/SSD/NFS share that stores bytes
- **Persistent Volume** - Kubernetes object that points to that storage and describes its properties

**What PVs Contain:**
- **Capacity** - How much storage space is available
- **Access Modes** - How the storage can be accessed (read-write, read-only, etc.)
- **Volume Plugin** - Which technology provides the storage (NFS, AWS EBS, etc.)
- **Connection Details** - How to actually connect to the storage
- **Reclaim Policy** - What happens to data when PV is released

### PV Lifecycle States

**Available** - PV exists and is ready to be claimed
```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: my-pv
status:
  phase: Available  # Ready for use, no PVC bound to it
```

**Bound** - PV is claimed by a PVC and in use
```yaml
status:
  phase: Bound
  claimRef:
    name: my-pvc
    namespace: production
```

**Released** - PVC was deleted but PV still contains data
```yaml
status:
  phase: Released  # PVC gone, but data still exists
```

**Failed** - PV has a problem and can't be used
```yaml
status:
  phase: Failed
  message: "Failed to mount volume"
```

### Access Modes Explained

**ReadWriteOnce (RWO)** - Can be mounted read-write by **one node only**
- Most common for databases, single-instance applications
- Examples: AWS EBS, Google Persistent Disk, Azure Disk
- **Important:** "One node" not "one pod" - multiple pods on same node can share

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: database-pv
spec:
  capacity:
    storage: 100Gi
  accessModes:
  - ReadWriteOnce  # Only one node can mount this
  awsElasticBlockStore:
    volumeID: vol-12345678
    fsType: ext4
```

**ReadOnlyMany (ROX)** - Can be mounted read-only by **multiple nodes**
- Good for static content, configuration files, shared data
- Examples: NFS, CephFS (read-only mode)

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: static-content-pv
spec:
  capacity:
    storage: 50Gi
  accessModes:
  - ReadOnlyMany  # Multiple nodes can read
  nfs:
    server: nfs-server.company.com
    path: /exports/static-content
```

**ReadWriteMany (RWX)** - Can be mounted read-write by **multiple nodes**
- Required for shared file systems, multi-writer scenarios
- Examples: NFS, CephFS, Azure Files
- **Warning:** Not all storage types support this!

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: shared-data-pv
spec:
  capacity:
    storage: 200Gi
  accessModes:
  - ReadWriteMany  # Multiple nodes can read AND write
  nfs:
    server: nfs-server.company.com
    path: /exports/shared-data
```

**ReadWriteOncePod (RWOP)** - Can be mounted read-write by **one pod only**
- Newest access mode, strictest restriction
- Ensures only one pod can write at a time
- Good for databases that can't handle multiple writers

### Reclaim Policies Explained

**Retain** - Keep data when PVC is deleted (manual cleanup required)
```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: important-data-pv
spec:
  persistentVolumeReclaimPolicy: Retain  # Data survives PVC deletion
  capacity:
    storage: 100Gi
  # When PVC is deleted:
  # 1. PV status becomes "Released"
  # 2. Data still exists on storage
  # 3. Admin must manually clean up and make PV "Available" again
```

**Delete** - Delete underlying storage when PVC is deleted
```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: temp-data-pv
spec:
  persistentVolumeReclaimPolicy: Delete  # Storage gets deleted too
  capacity:
    storage: 50Gi
  # When PVC is deleted:
  # 1. PV gets deleted
  # 2. Underlying storage (AWS EBS, etc.) gets deleted
  # 3. Data is PERMANENTLY LOST
```

**Recycle** - Wipe data and make PV available again (deprecated)
```yaml
# DON'T USE - deprecated and dangerous
persistentVolumeReclaimPolicy: Recycle  # Runs "rm -rf" on data
```

### PV Examples by Storage Type

#### Local Storage PV
```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: local-storage-pv
spec:
  capacity:
    storage: 100Gi
  accessModes:
  - ReadWriteOnce
  persistentVolumeReclaimPolicy: Delete
  storageClassName: local-storage
  local:
    path: /mnt/ssd1  # Path on the node
  nodeAffinity:
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: kubernetes.io/hostname
          operator: In
          values:
          - worker-node-1  # Only available on this specific node
```

#### NFS PV
```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: nfs-pv
spec:
  capacity:
    storage: 500Gi
  accessModes:
  - ReadWriteMany  # NFS supports multiple writers
  persistentVolumeReclaimPolicy: Retain
  nfs:
    server: 192.168.1.100
    path: /exports/kubernetes-data
  mountOptions:
  - hard
  - nfsvers=4.1
  - rsize=1048576
  - wsize=1048576
```

#### AWS EBS PV
```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: aws-ebs-pv
spec:
  capacity:
    storage: 20Gi
  accessModes:
  - ReadWriteOnce  # EBS only supports single node
  persistentVolumeReclaimPolicy: Delete
  awsElasticBlockStore:
    volumeID: vol-0123456789abcdef0
    fsType: ext4
  nodeAffinity:
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: failure-domain.beta.kubernetes.io/zone
          operator: In
          values:
          - us-west-2a  # EBS volumes are zone-specific
```

#### Google Persistent Disk PV
```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: gcp-disk-pv
spec:
  capacity:
    storage: 50Gi
  accessModes:
  - ReadWriteOnce
  persistentVolumeReclaimPolicy: Delete
  gcePersistentDisk:
    pdName: my-data-disk
    fsType: ext4
  nodeAffinity:
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: failure-domain.beta.kubernetes.io/zone
          operator: In
          values:
          - us-central1-a
```

## Persistent Volume Claims (PVC) Deep Dive

### What PVCs Actually Do

A **Persistent Volume Claim (PVC)** is a user's request for storage. It's like going to a restaurant and saying "I want a table for 4 people" - you're not specifying which exact table, just your requirements. Kubernetes finds a PV that matches your requirements and "binds" it to your PVC.

**PVC as Storage Request:**
- "I need 10GB of storage"
- "I need ReadWriteOnce access"
- "I need fast SSD storage class"
- "Find me a PV that matches these requirements"

**Binding Process:**
1. **User creates PVC** - Specifies storage requirements
2. **Kubernetes searches** - Looks for PV that matches requirements
3. **Binding occurs** - PVC gets connected to suitable PV
4. **Pod uses PVC** - Pod mounts the claimed storage
5. **Exclusive relationship** - One PVC can only bind to one PV

### PVC Binding Requirements

For a PVC to bind to a PV, **ALL** of these must match:

**Storage Capacity** - PV must have at least as much capacity as requested
```yaml
# PVC requests 10Gi
spec:
  resources:
    requests:
      storage: 10Gi

# PV has 20Gi - MATCH (PV has enough)
spec:
  capacity:
    storage: 20Gi

# PV has 5Gi - NO MATCH (PV too small)
```

**Access Modes** - PV must support requested access mode
```yaml
# PVC wants ReadWriteOnce
spec:
  accessModes:
  - ReadWriteOnce

# PV supports ReadWriteOnce - MATCH
spec:
  accessModes:
  - ReadWriteOnce

# PV only supports ReadOnlyMany - NO MATCH
```

**Storage Class** - Must match (or both empty)
```yaml
# PVC requests specific storage class
spec:
  storageClassName: fast-ssd

# PV has same storage class - MATCH
spec:
  storageClassName: fast-ssd

# PV has different storage class - NO MATCH
```

**Node Affinity** - Pod's node must be able to access the PV
```yaml
# PV only available on specific node
spec:
  nodeAffinity:
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: kubernetes.io/hostname
          operator: In
          values:
          - worker-node-1

# Pod scheduled on worker-node-1 - MATCH
# Pod scheduled on worker-node-2 - NO MATCH
```

### Static vs Dynamic Provisioning

#### Static Provisioning - Pre-Created PVs

**How it works:** Administrator creates PVs in advance, users claim them with PVCs.

**Example Workflow:**
```yaml
# 1. Admin creates PV
apiVersion: v1
kind: PersistentVolume
metadata:
  name: manual-pv-1
spec:
  capacity:
    storage: 10Gi
  accessModes:
  - ReadWriteOnce
  nfs:
    server: nfs-server.company.com
    path: /exports/pv-1
---
# 2. User creates PVC
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-storage-claim
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
# 3. Kubernetes binds PVC to PV automatically
```

**When to use static provisioning:**
- Small clusters with predictable storage needs
- Using storage systems that don't support dynamic provisioning
- Need specific configuration or pre-created storage
- Maximum control over storage allocation

#### Dynamic Provisioning - Automatic PV Creation

**How it works:** When PVC is created, Kubernetes automatically creates a matching PV using a StorageClass.

**Example Workflow:**
```yaml
# 1. User creates PVC with storageClassName
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: dynamic-claim
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
  storageClassName: aws-ebs-gp2  # Tells K8s how to create PV

# 2. Kubernetes automatically creates PV using StorageClass
# 3. PVC gets bound to the new PV
# 4. Underlying storage (AWS EBS volume) gets created
```

**Benefits of dynamic provisioning:**
- No pre-planning required
- Storage created on-demand
- Right-sized storage (no waste)
- Scales automatically

### PVC Examples

#### Basic Application Storage
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: webapp-storage
  namespace: production
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
  storageClassName: fast-ssd
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
spec:
  replicas: 1  # Only 1 replica because RWO
  template:
    spec:
      containers:
      - name: app
        image: myapp:latest
        volumeMounts:
        - name: app-data
          mountPath: /var/lib/app
      volumes:
      - name: app-data
        persistentVolumeClaim:
          claimName: webapp-storage
```

#### Database Storage with Specific Requirements
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-storage
  namespace: database
  labels:
    app: postgres
    tier: database
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
  storageClassName: high-iops-ssd
  selector:
    matchLabels:
      type: database-storage  # Only bind to PVs with this label
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
  replicas: 1
  template:
    spec:
      containers:
      - name: postgres
        image: postgres:14
        env:
        - name: POSTGRES_DB
          value: myapp
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: postgres-data
        persistentVolumeClaim:
          claimName: postgres-storage
```

#### Shared Storage for Multiple Pods
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-files
  namespace: production
spec:
  accessModes:
  - ReadWriteMany  # Multiple pods can mount
  resources:
    requests:
      storage: 200Gi
  storageClassName: nfs-storage
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: file-processors
spec:
  replicas: 3  # Multiple replicas can share RWX volume
  template:
    spec:
      containers:
      - name: processor
        image: file-processor:latest
        volumeMounts:
        - name: shared-data
          mountPath: /shared
      volumes:
      - name: shared-data
        persistentVolumeClaim:
          claimName: shared-files
```

## Storage Classes Deep Dive

### What Storage Classes Actually Do

A **StorageClass** is like a "storage profile" that defines how to dynamically create storage when needed. It's a template that tells Kubernetes:
- What storage technology to use (AWS EBS, GCP Persistent Disk, etc.)
- What parameters to use (disk type, replication, encryption, etc.)
- How fast or durable the storage should be

**StorageClass as Storage Menu:**
Think of StorageClasses like a restaurant menu:
- "fast-ssd" = Premium option, expensive but fast
- "standard-disk" = Regular option, balanced price/performance  
- "slow-archive" = Budget option, slow but cheap

### Dynamic Provisioning Process

**Complete Dynamic Provisioning Flow:**
1. **User creates PVC** with `storageClassName: fast-ssd`
2. **Kubernetes finds StorageClass** named "fast-ssd"
3. **StorageClass calls provisioner** (e.g., AWS EBS CSI driver)
4. **Provisioner creates actual storage** (e.g., creates AWS EBS volume)
5. **Kubernetes creates PV** representing the new storage
6. **PVC binds to new PV** automatically
7. **Pod can mount the storage** through PVC

**Example with real AWS resources:**
```yaml
# 1. StorageClass defines how to create storage
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: aws-ebs-gp3
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
  encrypted: "true"
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
---
# 2. PVC requests storage using this class
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-app-storage
spec:
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 50Gi
  storageClassName: aws-ebs-gp3

# 3. Result: AWS EBS GP3 volume gets created automatically
# - Type: gp3
# - Size: 50GB
# - IOPS: 3000
# - Throughput: 125 MiB/s
# - Encrypted: Yes
```

### StorageClass Parameters by Provider

#### AWS EBS StorageClass Examples
```yaml
# High Performance SSD
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: aws-ebs-io1-high-perf
provisioner: ebs.csi.aws.com
parameters:
  type: io1          # Provisioned IOPS SSD
  iopsPerGB: "50"    # 50 IOPS per GB
  encrypted: "true"
  kmsKeyId: "arn:aws:kms:us-west-2:123456789:key/12345678-1234-1234-1234-123456789012"
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
---
# Balanced Performance
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: aws-ebs-gp3-standard
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "3000"       # Baseline IOPS
  throughput: "125"  # MiB/s
  encrypted: "true"
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
---
# Budget Option
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: aws-ebs-gp2-budget
provisioner: ebs.csi.aws.com
parameters:
  type: gp2          # Previous generation, cheaper
  encrypted: "false"
reclaimPolicy: Delete
volumeBindingMode: Immediate
allowVolumeExpansion: true
```

#### Google Cloud StorageClass Examples
```yaml
# High Performance Regional SSD
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gcp-ssd-regional
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-ssd
  replication-type: regional-pd  # Replicated across zones
  zones: us-central1-a,us-central1-b,us-central1-c
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
---
# Standard Persistent Disk
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gcp-standard
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-standard  # Traditional spinning disks
  replication-type: none
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

#### Azure StorageClass Examples
```yaml
# Premium SSD
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: azure-premium-ssd
provisioner: disk.csi.azure.com
parameters:
  skuName: Premium_LRS  # Premium Locally Redundant Storage
  kind: Managed
  cachingmode: ReadOnly
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
---
# Standard HDD
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: azure-standard-hdd
provisioner: disk.csi.azure.com
parameters:
  skuName: Standard_LRS
  kind: Managed
reclaimPolicy: Delete
volumeBindingMode: Immediate
allowVolumeExpansion: true
```

#### NFS StorageClass Example
```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-client
provisioner: k8s-sigs.io/nfs-subdir-external-provisioner
parameters:
  server: nfs-server.company.com
  path: /exports/kubernetes
  archiveOnDelete: "true"  # Move to archive instead of delete
reclaimPolicy: Delete
volumeBindingMode: Immediate
allowVolumeExpansion: false  # NFS doesn't support expansion
```

### Volume Binding Modes

#### Immediate Binding
```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: immediate-binding
provisioner: ebs.csi.aws.com
volumeBindingMode: Immediate  # Create volume as soon as PVC is created
# Pros: Fast PVC binding
# Cons: Volume might be created in wrong availability zone
```

**Immediate binding process:**
1. PVC created → Storage provisioned immediately
2. Pod scheduled → Might be in different zone than storage
3. Pod fails to start → Storage and pod in different zones

#### WaitForFirstConsumer Binding
```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: wait-for-consumer
provisioner: ebs.csi.aws.com
volumeBindingMode: WaitForFirstConsumer  # Wait for pod to be scheduled
# Pros: Storage created in same zone as pod
# Cons: Slightly slower pod startup
```

**WaitForFirstConsumer process:**
1. PVC created → Storage NOT provisioned yet
2. Pod scheduled → Kubernetes knows which zone pod will run in
3. Storage provisioned → Created in same zone as pod
4. Pod starts successfully → Storage and pod in same zone

### Default StorageClass

**Setting Default StorageClass:**
```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: default-storage
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"  # Makes this default
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
```

**How Default Works:**
```yaml
# PVC without storageClassName
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: auto-storage
spec:
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 10Gi
  # No storageClassName specified - uses default StorageClass
```

## StatefulSets Storage Deep Dive

### Why StatefulSets Need Special Storage

**StatefulSets** are designed for applications that need:
- **Stable storage identity** - Each pod gets its own persistent storage
- **Ordered deployment** - Pods start and stop in sequence
- **Stable network identity** - Predictable DNS names

**Problem with Deployments and Storage:**
```yaml
# This DOESN'T WORK for databases
apiVersion: apps/v1
kind: Deployment
metadata:
  name: database
spec:
  replicas: 3  # 3 database pods
  template:
    spec:
      volumes:
      - name: db-data
        persistentVolumeClaim:
          claimName: shared-db-storage  # ALL pods share same storage!
```

**Problems:**
- All 3 database pods write to same storage = corruption
- Pods have random names = can't identify which is primary
- Pods can start in any order = split-brain scenarios

### StatefulSet Storage Architecture

**How StatefulSets Solve Storage:**
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
spec:
  serviceName: database
  replicas: 3
  volumeClaimTemplates:  # Creates separate PVC for each pod
  - metadata:
      name: db-data
    spec:
      accessModes: [ReadWriteOnce]
      resources:
        requests:
          storage: 100Gi
      storageClassName: fast-ssd
  template:
    spec:
      containers:
      - name: postgres
        image: postgres:14
        volumeMounts:
        - name: db-data
          mountPath: /var/lib/postgresql/data
```

**What StatefulSet Creates:**
```
database-0 pod → db-data-database-0 PVC → PV-1 → Storage-1
database-1 pod → db-data-database-1 PVC → PV-2 → Storage-2  
database-2 pod → db-data-database-2 PVC → PV-3 → Storage-3
```

**Storage Identity Properties:**
- **Each pod gets unique storage** - database-0 has different storage than database-1
- **Storage survives pod restart** - If database-0 pod dies, new database-0 pod gets same storage
- **Ordered scaling** - database-1 won't start until database-0 is ready
- **Stable storage names** - db-data-database-0 PVC name never changes

### VolumeClaimTemplates Explained

**VolumeClaimTemplate** is like a PVC factory - it creates a new PVC for each StatefulSet pod using the same template.

**Template Expansion:**
```yaml
# StatefulSet has this template:
volumeClaimTemplates:
- metadata:
    name: data-volume
  spec:
    accessModes: [ReadWriteOnce]
    resources:
      requests:
        storage: 50Gi

# Kubernetes creates these actual PVCs:
# data-volume-myapp-0 (for pod myapp-0)
# data-volume-myapp-1 (for pod myapp-1)  
# data-volume-myapp-2 (for pod myapp-2)
```

**PVC Naming Pattern:**
```
{volumeClaimTemplate.name}-{statefulset.name}-{ordinal}

Examples:
data-volume-postgres-0
data-volume-postgres-1
logs-volume-elasticsearch-0
config-volume-kafka-2
```

### StatefulSet Storage Examples

#### PostgreSQL Primary-Replica Cluster
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-cluster
  namespace: database
spec:
  serviceName: postgres-cluster
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  volumeClaimTemplates:
  # Main database storage
  - metadata:
      name: postgres-data
      labels:
        app: postgres
        type: data
    spec:
      accessModes: [ReadWriteOnce]
      resources:
        requests:
          storage: 200Gi
      storageClassName: high-iops-ssd
  # Write-Ahead Log storage (separate for performance)
  - metadata:
      name: postgres-wal
      labels:
        app: postgres
        type: wal
    spec:
      accessModes: [ReadWriteOnce]
      resources:
        requests:
          storage: 50Gi
      storageClassName: ultra-fast-ssd
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:14
        env:
        - name: POSTGRES_DB
          value: myapp
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
        - name: postgres-wal
          mountPath: /var/lib/postgresql/wal
        # Configuration based on pod ordinal
        command:
        - sh
        - -c
        - |
          if [ "$HOSTNAME" = "postgres-cluster-0" ]; then
            # This is the primary
            echo "Starting as primary"
            postgres -c wal_level=replica -c max_wal_senders=3
          else
            # This is a replica
            echo "Starting as replica"
            pg_basebackup -h postgres-cluster-0 -D /var/lib/postgresql/data -U postgres -v -P -W
            postgres -c hot_standby=on
          fi
```

#### Elasticsearch Cluster with Different Storage Types
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch
  namespace: search
spec:
  serviceName: elasticsearch
  replicas: 3
  selector:
    matchLabels:
      app: elasticsearch
  volumeClaimTemplates:
  # Fast storage for Elasticsearch data
  - metadata:
      name: es-data
    spec:
      accessModes: [ReadWriteOnce]
      resources:
        requests:
          storage: 500Gi
      storageClassName: nvme-ssd
  # Separate storage for logs
  - metadata:
      name: es-logs
    spec:
      accessModes: [ReadWriteOnce]
      resources:
        requests:
          storage: 100Gi
      storageClassName: standard-ssd
  template:
    metadata:
      labels:
        app: elasticsearch
    spec:
      initContainers:
      # Set proper permissions
      - name: fix-permissions
        image: busybox
        command: ["sh", "-c", "chown -R 1000:1000 /usr/share/elasticsearch/data"]
        volumeMounts:
        - name: es-data
          mountPath: /usr/share/elasticsearch/data
      containers:
      - name: elasticsearch
        image: elasticsearch:8.5.0
        env:
        - name: cluster.name
          value: "elasticsearch-cluster"
        - name: node.name
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: discovery.seed_hosts
          value: "elasticsearch-0.elasticsearch,elasticsearch-1.elasticsearch,elasticsearch-2.elasticsearch"
        - name: cluster.initial_master_nodes
          value: "elasticsearch-0,elasticsearch-1,elasticsearch-2"
        - name: ES_JAVA_OPTS
          value: "-Xms2g -Xmx2g"
        volumeMounts:
        - name: es-data
          mountPath: /usr/share/elasticsearch/data
        - name: es-logs
          mountPath: /usr/share/elasticsearch/logs
        resources:
          requests:
            memory: 4Gi
            cpu: 1000m
          limits:
            memory: 4Gi
            cpu: 2000m
```

#### Kafka Cluster with Separate Log Storage
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: kafka
  namespace: messaging
spec:
  serviceName: kafka
  replicas: 3
  selector:
    matchLabels:
      app: kafka
  volumeClaimTemplates:
  # Kafka log segments (the actual message data)
  - metadata:
      name: kafka-logs
    spec:
      accessModes: [ReadWriteOnce]
      resources:
        requests:
          storage: 1Ti
      storageClassName: high-throughput-ssd
  # Kafka metadata and configuration
  - metadata:
      name: kafka-data
    spec:
      accessModes: [ReadWriteOnce]
      resources:
        requests:
          storage: 50Gi
      storageClassName: standard-ssd
  template:
    metadata:
      labels:
        app: kafka
    spec:
      containers:
      - name: kafka
        image: confluentinc/cp-kafka:7.0.1
        env:
        - name: KAFKA_BROKER_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: KAFKA_ZOOKEEPER_CONNECT
          value: "zookeeper:2181"
        - name: KAFKA_ADVERTISED_LISTENERS
          value: "PLAINTEXT://$(POD_NAME).kafka:9092"
        - name: KAFKA_LOG_DIRS
          value: "/var/kafka-logs"
        - name: KAFKA_LOG_RETENTION_HOURS
          value: "168"  # 1 week
        - name: KAFKA_LOG_SEGMENT_BYTES
          value: "1073741824"  # 1GB segments
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        volumeMounts:
        - name: kafka-logs
          mountPath: /var/kafka-logs
        - name: kafka-data
          mountPath: /var/kafka-data
        ports:
        - containerPort: 9092
        resources:
          requests:
            memory: 2Gi
            cpu: 500m
          limits:
            memory: 4Gi
            cpu: 1000m
```

### StatefulSet Storage Scaling

#### Scaling Up (Adding Pods)
```bash
# Scale from 3 to 5 replicas
kubectl scale statefulset postgres-cluster --replicas=5

# What happens:
# 1. postgres-cluster-3 pod created with new PVC: postgres-data-postgres-cluster-3
# 2. postgres-cluster-4 pod created with new PVC: postgres-data-postgres-cluster-4
# 3. New pods start in order: 3 then 4
```

#### Scaling Down (Removing Pods)
```bash
# Scale from 5 to 3 replicas
kubectl scale statefulset postgres-cluster --replicas=3

# What happens:
# 1. postgres-cluster-4 pod deleted (highest ordinal first)
# 2. postgres-cluster-3 pod deleted
# 3. PVCs postgres-data-postgres-cluster-3 and postgres-data-postgres-cluster-4 remain!
#    (Data is preserved even though pods are gone)
```

**Important:** PVCs are NOT automatically deleted when scaling down StatefulSets. This prevents accidental data loss.

#### Manual PVC Cleanup
```bash
# After scaling down, manually delete PVCs if you want to free storage
kubectl delete pvc postgres-data-postgres-cluster-3
kubectl delete pvc postgres-data-postgres-cluster-4

# Or delete all PVCs for a StatefulSet (DANGEROUS!)
kubectl delete pvc -l app=postgres
```

## Volume Types Deep Dive

### emptyDir - Temporary Shared Storage

**What emptyDir Actually Is:**
- Temporary directory created when pod starts
- Shared between all containers in the pod
- Deleted when pod is removed from node
- Can be stored on disk or in memory (tmpfs)

**emptyDir Storage Location:**
```
Default: /var/lib/kubelet/pods/{pod-uid}/volumes/kubernetes.io~empty-dir/{volume-name}
Memory: tmpfs mounted in RAM
```

#### Disk-Based emptyDir
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: shared-storage-pod
spec:
  containers:
  - name: writer
    image: busybox
    command: ["sh", "-c", "while true; do echo $(date) >> /shared/log.txt; sleep 5; done"]
    volumeMounts:
    - name: shared-data
      mountPath: /shared
  - name: reader
    image: busybox
    command: ["sh", "-c", "while true; do tail -f /shared/log.txt; done"]
    volumeMounts:
    - name: shared-data
      mountPath: /shared
  volumes:
  - name: shared-data
    emptyDir: {}  # Stored on node's disk
```

#### Memory-Based emptyDir (tmpfs)
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: memory-cache-pod
spec:
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: cache-volume
      mountPath: /tmp/cache
  volumes:
  - name: cache-volume
    emptyDir:
      medium: Memory  # Stored in RAM
      sizeLimit: 1Gi  # Limit memory usage
```

**When to use emptyDir:**
- Temporary file processing
- Cache that doesn't need to persist
- Communication between containers in same pod
- Scratch space for applications

### hostPath - Direct Node Access

**What hostPath Does:**
Mounts a file or directory from the node's filesystem directly into the pod. The data persists on the node even when pods are deleted.

**Security Warning:** hostPath gives pods direct access to the node's filesystem, which can be a security risk.

#### Basic hostPath Examples
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: hostpath-pod
spec:
  containers:
  - name: app
    image: busybox
    command: ["sleep", "3600"]
    volumeMounts:
    - name: host-data
      mountPath: /host-data
    - name: host-logs
      mountPath: /var/log/host
  volumes:
  # Mount directory from node
  - name: host-data
    hostPath:
      path: /data/app-storage
      type: DirectoryOrCreate  # Create directory if it doesn't exist
  # Mount existing file from node
  - name: host-logs
    hostPath:
      path: /var/log/messages
      type: File  # Must be an existing file
```

#### hostPath Types
```yaml
volumes:
- name: example-volume
  hostPath:
    path: /path/on/node
    type: Directory         # Must be existing directory
    # type: DirectoryOrCreate # Create directory if missing
    # type: File              # Must be existing file
    # type: FileOrCreate      # Create file if missing
    # type: Socket            # Must be existing Unix socket
    # type: CharDevice        # Must be existing character device
    # type: BlockDevice       # Must be existing block device
```

#### Common hostPath Use Cases

**Docker Socket Access (for Docker-in-Docker):**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: docker-client
spec:
  containers:
  - name: docker
    image: docker:20.10
    command: ["docker", "ps"]  # List containers on node
    volumeMounts:
    - name: docker-socket
      mountPath: /var/run/docker.sock
  volumes:
  - name: docker-socket
    hostPath:
      path: /var/run/docker.sock
      type: Socket
```

**System Monitoring (Access to /proc and /sys):**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: node-monitor
spec:
  containers:
  - name: monitor
    image: monitoring-agent:latest
    volumeMounts:
    - name: proc
      mountPath: /host/proc
      readOnly: true
    - name: sys
      mountPath: /host/sys
      readOnly: true
  volumes:
  - name: proc
    hostPath:
      path: /proc
      type: Directory
  - name: sys
    hostPath:
      path: /sys
      type: Directory
```

### ConfigMap and Secret Volumes

#### ConfigMap Volumes
**How ConfigMap volumes work:** Mount configuration data as files in the pod.

```yaml
# Create ConfigMap with configuration files
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  app.properties: |
    database.host=postgres.database.svc.cluster.local
    database.port=5432
    log.level=INFO
  nginx.conf: |
    server {
        listen 80;
        location / {
            proxy_pass http://backend:8080;
        }
    }
---
apiVersion: v1
kind: Pod
metadata:
  name: app-with-config
spec:
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: config-volume
      mountPath: /etc/config
  volumes:
  - name: config-volume
    configMap:
      name: app-config
      items:  # Optional: map specific keys to specific paths
      - key: app.properties
        path: application.properties
      - key: nginx.conf
        path: nginx/nginx.conf
```

**Result in pod:**
```
/etc/config/
├── application.properties  (content from app.properties key)
└── nginx/
    └── nginx.conf         (content from nginx.conf key)
```

#### Secret Volumes
**How Secret volumes work:** Mount sensitive data as files, with additional security features.

```yaml
# Create Secret with sensitive data
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
data:
  database-password: cGFzc3dvcmQxMjM=  # base64 encoded "password123"
  api-key: YWJjZGVmZ2hpams=            # base64 encoded "abcdefghijk"
stringData:
  ssl-cert.pem: |
    -----BEGIN CERTIFICATE-----
    MIIDXTCCAkWgAwIBAgIJAKlwmMhJlJb...
    -----END CERTIFICATE-----
---
apiVersion: v1
kind: Pod
metadata:
  name: app-with-secrets
spec:
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: secret-volume
      mountPath: /etc/secrets
      readOnly: true  # Secrets should be read-only
  volumes:
  - name: secret-volume
    secret:
      secretName: app-secrets
      defaultMode: 0400  # Read-only for owner only
      items:
      - key: database-password
        path: db-password
        mode: 0400
      - key: ssl-cert.pem
        path: ssl/cert.pem
        mode: 0444
```

**Result in pod:**
```
/etc/secrets/
├── db-password     (contains "password123", mode 0400)
└── ssl/
    └── cert.pem    (contains SSL certificate, mode 0444)
```

### Network Storage Types

#### NFS (Network File System)
```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: nfs-pv
spec:
  capacity:
    storage: 100Gi
  accessModes:
  - ReadWriteMany  # NFS supports multiple writers
  persistentVolumeReclaimPolicy: Retain
  nfs:
    server: nfs-server.company.com
    path: /exports/shared-data
  mountOptions:
  - hard           # Hard mount (retries on failure)
  - nfsvers=4.1    # Use NFSv4.1
  - rsize=1048576  # Read buffer size
  - wsize=1048576  # Write buffer size
  - timeo=600      # Timeout in deciseconds (60 seconds)
  - retrans=2      # Number of retries
```

#### CephFS (Ceph File System)
```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: cephfs-pv
spec:
  capacity:
    storage: 200Gi
  accessModes:
  - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  cephfs:
    monitors:
    - 192.168.1.10:6789
    - 192.168.1.11:6789
    - 192.168.1.12:6789
    path: /kubernetes-volumes
    user: admin
    secretRef:
      name: ceph-secret
    readOnly: false
```

#### iSCSI Storage
```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: iscsi-pv
spec:
  capacity:
    storage: 50Gi
  accessModes:
  - ReadWriteOnce  # iSCSI typically single-writer
  persistentVolumeReclaimPolicy: Retain
  iscsi:
    targetPortal: 192.168.1.100:3260
    iqn: iqn.2019-04.com.company:storage.target01
    lun: 0
    fsType: ext4
    readOnly: false
    chapAuthDiscovery: true
    chapAuthSession: true
    secretRef:
      name: iscsi-chap-secret
```

## Volume Snapshots Deep Dive

### What Volume Snapshots Actually Are

**Volume Snapshots** are point-in-time copies of persistent volumes. Think of them like "save points" in a video game - you can create a snapshot of your data and restore back to that exact state later.

**Snapshot vs Backup:**
- **Snapshot** - Point-in-time copy, usually stored on same storage system
- **Backup** - Copy moved to different storage system/location

### Snapshot API Objects

#### VolumeSnapshotClass
**Defines how snapshots are created:**
```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: aws-ebs-snapshot-class
driver: ebs.csi.aws.com  # CSI driver that handles snapshots
deletionPolicy: Delete   # Delete snapshot when VolumeSnapshot is deleted
parameters:
  encrypted: "true"      # Driver-specific parameters
```

#### VolumeSnapshot
**Request to create a snapshot:**
```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: database-snapshot-20240101
  namespace: production
spec:
  volumeSnapshotClassName: aws-ebs-snapshot-class
  source:
    persistentVolumeClaimName: postgres-data-pvc  # PVC to snapshot
```

#### VolumeSnapshotContent
**Represents the actual snapshot (like PV for snapshots):**
```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotContent
metadata:
  name: snapcontent-12345
spec:
  deletionPolicy: Delete
  driver: ebs.csi.aws.com
  source:
    snapshotHandle: snap-0123456789abcdef0  # Actual cloud snapshot ID
  volumeSnapshotRef:
    name: database-snapshot-20240101
    namespace: production
```

### Snapshot Workflow Examples

#### Manual Database Backup
```yaml
# 1. Create snapshot before maintenance
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: postgres-before-upgrade
  namespace: database
spec:
  volumeSnapshotClassName: fast-snapshot-class
  source:
    persistentVolumeClaimName: postgres-data-postgres-0
---
# 2. Wait for snapshot to be ready
# kubectl wait --for=condition=ReadyToUse volumesnapshot/postgres-before-upgrade --timeout=300s

# 3. Perform maintenance/upgrade
# kubectl apply -f new-postgres-version.yaml

# 4. If something goes wrong, restore from snapshot
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-restored-data
  namespace: database
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
  storageClassName: fast-ssd
  dataSource:
    name: postgres-before-upgrade  # Restore from snapshot
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
```

#### Automated Backup with CronJob
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: database-backup
  namespace: database
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccount: snapshot-creator
          containers:
          - name: backup
            image: kubectl:latest
            command:
            - sh
            - -c
            - |
              TIMESTAMP=$(date +%Y%m%d-%H%M%S)
              SNAPSHOT_NAME="postgres-backup-${TIMESTAMP}"
              
              # Create snapshot
              kubectl apply -f - <<EOF
              apiVersion: snapshot.storage.k8s.io/v1
              kind: VolumeSnapshot
              metadata:
                name: ${SNAPSHOT_NAME}
                namespace: database
                labels:
                  backup-type: automated
                  backup-date: $(date +%Y-%m-%d)
              spec:
                volumeSnapshotClassName: aws-ebs-snapshot-class
                source:
                  persistentVolumeClaimName: postgres-data-postgres-0
              EOF
              
              # Wait for snapshot to complete
              kubectl wait --for=condition=ReadyToUse \
                volumesnapshot/${SNAPSHOT_NAME} --timeout=600s
              
              # Clean up old snapshots (keep last 7 days)
              kubectl get volumesnapshot -l backup-type=automated \
                --sort-by=.metadata.creationTimestamp \
                -o name | head -n -7 | xargs -r kubectl delete
          restartPolicy: OnFailure
---
# RBAC for snapshot creation
apiVersion: v1
kind: ServiceAccount
metadata:
  name: snapshot-creator
  namespace: database
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: snapshot-manager
  namespace: database
rules:
- apiGroups: ["snapshot.storage.k8s.io"]
  resources: ["volumesnapshots"]
  verbs: ["create", "get", "list", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: snapshot-creator-binding
  namespace: database
subjects:
- kind: ServiceAccount
  name: snapshot-creator
  namespace: database
roleRef:
  kind: Role
  name: snapshot-manager
  apiGroup: rbac.authorization.k8s.io
```

#### Cross-Namespace Restore
```yaml
# Snapshot in production namespace
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: production-data-snapshot
  namespace: production
spec:
  volumeSnapshotClassName: aws-ebs-snapshot-class
  source:
    persistentVolumeClaimName: app-data-pvc
---
# Restore in staging namespace for testing
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: staging-data-from-prod
  namespace: staging
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
  storageClassName: standard-ssd  # Can use different storage class
  dataSource:
    name: production-data-snapshot
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
    namespace: production  # Cross-namespace reference
```

### CSI Driver Support

#### AWS EBS CSI Driver Snapshots
```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ebs-with-snapshots
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  encrypted: "true"
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
---
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: ebs-snapshot-class
driver: ebs.csi.aws.com
deletionPolicy: Delete
parameters:
  encrypted: "true"
  # AWS-specific: copy snapshot to different region
  # sourceRegion: us-west-2
  # destinationRegion: us-east-1
```

#### Google Cloud Persistent Disk Snapshots
```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: gcp-snapshot-class
driver: pd.csi.storage.gke.io
deletionPolicy: Retain  # Keep snapshots even if VolumeSnapshot is deleted
parameters:
  storage-locations: us-central1  # Store snapshot in specific region
  snapshot-type: regional        # Regional snapshot for durability
```

#### Azure Disk Snapshots
```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: azure-snapshot-class
driver: disk.csi.azure.com
deletionPolicy: Delete
parameters:
  incremental: "true"  # Use incremental snapshots to save space
```

## Key Concepts Summary
- **Persistent Volumes (PV)** - Cluster resources representing actual storage with capacity, access modes, and connection details
- **Persistent Volume Claims (PVC)** - User requests for storage that get bound to matching PVs
- **Storage Classes** - Templates for dynamic storage provisioning with cloud provider integration
- **Static Provisioning** - Admin pre-creates PVs, users claim them with PVCs
- **Dynamic Provisioning** - Storage automatically created when PVC is created using StorageClass
- **StatefulSets** - Workloads requiring stable storage identity with VolumeClaimTemplates
- **Access Modes** - RWO (single node), ROX (multiple read-only), RWX (multiple read-write), RWOP (single pod)
- **Volume Types** - emptyDir (temporary), hostPath (node access), ConfigMap/Secret (configuration), network storage (NFS, iSCSI)
- **Volume Snapshots** - Point-in-time copies for backup and restore operations

## Best Practices / Tips

1. **Choose appropriate access modes** - Use RWO for most applications, RWX only when truly needed
2. **Set reclaim policies carefully** - Use Retain for important data, Delete for temporary storage
3. **Use StorageClasses for dynamic provisioning** - More flexible than static PVs
4. **Plan storage capacity** - Include growth projections and snapshot space
5. **Implement backup strategy** - Use volume snapshots or external backup tools
6. **Monitor storage performance** - Watch IOPS, throughput, and latency metrics
7. **Use appropriate storage types** - Match storage performance to application needs
8. **Configure volume binding mode** - Use WaitForFirstConsumer for zone-aware scheduling
9. **Set resource limits** - Prevent storage exhaustion with quotas and limits
10. **Document storage architecture** - Maintain clear documentation of storage design and dependencies

## Common Issues / Troubleshooting

### Problem 1: PVC Stuck in Pending
- **Symptom:** PVC remains in "Pending" status indefinitely
- **Cause:** No PV matches requirements, or storage provisioning failed
- **Solution:** Check PV availability, StorageClass configuration, and node affinity

```bash
# Check PVC status and events
kubectl describe pvc my-pvc

# Check available PVs
kubectl get pv

# Check StorageClass
kubectl describe storageclass my-storage-class

# Check CSI driver pods
kubectl get pods -n kube-system | grep csi
```

### Problem 2: Pod Can't Mount Volume
- **Symptom:** Pod stuck in "ContainerCreating" with volume mount errors
- **Cause:** Storage not accessible from node, permission issues, or driver problems
- **Solution:** Check node affinity, CSI driver status, and storage permissions

```bash
# Check pod events
kubectl describe pod my-pod

# Check node where pod is scheduled
kubectl get pod my-pod -o wide

# Check if storage is in same zone as node
kubectl get node NODE_NAME --show-labels
```

### Problem 3: Volume Snapshot Failing
- **Symptom:** VolumeSnapshot stuck in "Pending" or "Error" state
- **Cause:** CSI driver doesn't support snapshots, or cloud provider issues
- **Solution:** Verify snapshot support and check CSI driver logs

```bash
# Check snapshot status
kubectl describe volumesnapshot my-snapshot

# Check if CSI driver supports snapshots
kubectl get csidriver -o yaml

# Check snapshot controller
kubectl get pods -n kube-system | grep snapshot
```

### Problem 4: StatefulSet Volume Not Persistent
- **Symptom:** StatefulSet pod data lost when pod restarts
- **Cause:** Using emptyDir instead of PVC, or PVC not properly configured
- **Solution:** Verify VolumeClaimTemplates and PVC binding

```bash
# Check StatefulSet volume configuration
kubectl describe statefulset my-statefulset

# Check PVCs created by StatefulSet
kubectl get pvc -l app=my-statefulset

# Verify PVC is bound
kubectl describe pvc my-pvc
```

### Problem 5: Performance Issues
- **Symptom:** Slow storage I/O affecting application performance
- **Cause:** Wrong storage type, insufficient IOPS, or network bottlenecks
- **Solution:** Use appropriate storage class and monitor storage metrics

```bash
# Check storage class parameters
kubectl describe storageclass my-storage-class

# Monitor pod resource usage
kubectl top pod my-pod

# Check node disk usage
kubectl exec -it my-pod -- df -h
```

## References / Further Reading
- [Kubernetes Storage Documentation](https://kubernetes.io/docs/concepts/storage/)
- [Persistent Volumes Guide](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Storage Classes Documentation](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [StatefulSets Documentation](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)
- [Volume Snapshots Guide](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [CSI Drivers List](https://kubernetes-csi.github.io/docs/drivers.html)
- [AWS EBS CSI Driver](https://github.com/kubernetes-sigs/aws-ebs-csi-driver)
- [Google Cloud Storage CSI](https://github.com/kubernetes-sigs/gcp-compute-persistent-disk-csi-driver)
- [Azure Disk CSI Driver](https://github.com/kubernetes-sigs/azuredisk-csi-driver)