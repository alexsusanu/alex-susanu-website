# Kubernetes Storage
category: DevOps
tags: kubernetes, k8s, storage, volumes, persistentvolume, pvc, storageclass

## Volume

**What it is:** A directory accessible to containers in a pod, providing storage that can persist beyond individual container lifecycles and be shared between containers.

**Why it matters:** Containers are stateless and ephemeral by default. Volumes provide data persistence, enable data sharing between containers in a pod, and allow applications to maintain state across container restarts.

**Volume vs Container filesystem:**
- **Container filesystem** - Ephemeral, lost when container dies
- **Volume** - Can persist beyond container lifecycle
- **Shared access** - Multiple containers in pod can access same volume
- **External storage** - Can connect to external storage systems

**Volume types:**
- **emptyDir** - Temporary storage, lifecycle tied to pod
- **hostPath** - Mount directory from host node
- **configMap/secret** - Mount configuration data as files
- **persistentVolumeClaim** - Request for persistent storage
- **nfs, cephfs, glusterfs** - Network storage systems
- **cloud volumes** - AWS EBS, GCP PD, Azure Disk

**Common commands:**
```bash
# Volume inspection
kubectl describe pod <pod-name>                     # Show pod's volumes
kubectl get pv                                     # List persistent volumes
kubectl get pvc                                    # List persistent volume claims

# Troubleshooting volumes
kubectl exec <pod-name> -- df -h                   # Check mounted filesystems
kubectl exec <pod-name> -- ls -la /path/to/volume  # List volume contents
kubectl logs <pod-name> -c <container-name>        # Check for mount errors
```

### **emptyDir Volumes**

**What it is:** Temporary storage that exists for the lifetime of a pod, shared between all containers in the pod.

**Characteristics:**
- **Pod lifecycle** - Created when pod starts, deleted when pod terminates
- **Shared storage** - All containers in pod can access
- **Node storage** - Uses node's local storage (disk or memory)
- **No persistence** - Data lost when pod is deleted

**Use cases:**
- **Temporary files** - Scratch space for computations
- **Shared data** - Communication between containers in same pod
- **Cache** - Temporary caching that doesn't need persistence
- **Logs** - Temporary log storage before shipping elsewhere

**Example:**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-with-cache
spec:
  containers:
  - name: web-server
    image: nginx
    volumeMounts:
    - name: cache-volume
      mountPath: /var/cache/nginx
  - name: cache-warmer
    image: busybox
    command: ['sh', '-c', 'while true; do echo "warming cache" > /cache/warm; sleep 3600; done']
    volumeMounts:
    - name: cache-volume
      mountPath: /cache
  volumes:
  - name: cache-volume
    emptyDir: {}
```

**emptyDir with memory storage:**
```yaml
volumes:
- name: memory-volume
  emptyDir:
    medium: Memory      # Use RAM instead of disk
    sizeLimit: 1Gi     # Limit size to 1GB
```

### **hostPath Volumes**

**What it is:** Mount a file or directory from the host node's filesystem into the pod.

**Use cases:**
- **Node monitoring** - Access to /proc, /sys for system monitoring
- **Docker socket** - Access Docker daemon from container
- **Log collection** - Access host log directories
- **Development** - Mount source code during development

**Security considerations:**
- **Host access** - Container can access host filesystem
- **Privilege escalation** - Potential security risk
- **Node dependency** - Pod tied to specific node
- **Not portable** - Doesn't work across different nodes

**Example:**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: host-access-pod
spec:
  containers:
  - name: monitor
    image: busybox
    command: ['sh', '-c', 'while true; do df -h /host-root; sleep 30; done']
    volumeMounts:
    - name: host-root
      mountPath: /host-root
      readOnly: true
  volumes:
  - name: host-root
    hostPath:
      path: /
      type: Directory
```

**hostPath types:**
- **DirectoryOrCreate** - Create directory if it doesn't exist
- **Directory** - Directory must exist
- **FileOrCreate** - Create file if it doesn't exist
- **File** - File must exist
- **Socket** - Unix socket must exist
- **CharDevice** - Character device must exist
- **BlockDevice** - Block device must exist

### **configMap and secret Volumes**

**What they are:** Volumes that mount ConfigMaps and Secrets as files in the container filesystem.

**Use cases:**
- **Configuration files** - App configs, nginx.conf, etc.
- **Environment-specific settings** - Different configs per environment
- **Certificates** - SSL certificates and keys
- **API keys** - Sensitive configuration data

**ConfigMap volume example:**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  database.conf: |
    host=localhost
    port=5432
    database=myapp
  cache.conf: |
    redis_host=redis-service
    redis_port=6379
---
apiVersion: v1
kind: Pod
metadata:
  name: app-with-config
spec:
  containers:
  - name: app
    image: myapp
    volumeMounts:
    - name: config-volume
      mountPath: /etc/config
  volumes:
  - name: config-volume
    configMap:
      name: app-config
```

**Secret volume example:**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
data:
  username: YWRtaW4=  # base64 encoded
  password: MWYyZDFlMmU2N2Rm  # base64 encoded
---
apiVersion: v1
kind: Pod
metadata:
  name: app-with-secrets
spec:
  containers:
  - name: app
    image: myapp
    volumeMounts:
    - name: secret-volume
      mountPath: /etc/secrets
      readOnly: true
  volumes:
  - name: secret-volume
    secret:
      secretName: app-secrets
      defaultMode: 0400  # Read-only for owner only
```

## PersistentVolume (PV)

**What it is:** A piece of storage in the cluster that has been provisioned by an administrator or dynamically provisioned using Storage Classes.

**Why it matters:** PersistentVolumes provide durable storage that exists independently of pods. They enable stateful applications, data persistence across pod restarts, and centralized storage management in Kubernetes clusters.

**PV characteristics:**
- **Cluster resource** - Independent of any individual pod
- **Lifecycle independent** - Exists beyond pod lifecycle
- **Admin provisioned** - Usually created by cluster administrators
- **Capacity and access modes** - Define storage size and access patterns
- **Reclaim policies** - What happens when PV is released

**Access modes:**
- **ReadWriteOnce (RWO)** - Volume can be mounted read-write by single node
- **ReadOnlyMany (ROX)** - Volume can be mounted read-only by many nodes
- **ReadWriteMany (RWX)** - Volume can be mounted read-write by many nodes
- **ReadWriteOncePod (RWOP)** - Volume can be mounted read-write by single pod

**Reclaim policies:**
- **Retain** - Manual reclamation of the resource
- **Recycle** - Basic scrub (rm -rf /thevolume/*)  - deprecated
- **Delete** - Delete the volume from infrastructure

**Common commands:**
```bash
# PersistentVolume operations
kubectl get pv                                     # List all persistent volumes
kubectl describe pv <pv-name>                      # Detailed PV information
kubectl delete pv <pv-name>                        # Delete persistent volume

# PV status and troubleshooting
kubectl get pv -o wide                             # PV with additional info
kubectl get events --field-selector involvedObject.kind=PersistentVolume
```

**PV lifecycle states:**
- **Available** - Free resource not yet bound to claim
- **Bound** - Volume is bound to a claim
- **Released** - Claim has been deleted but resource not reclaimed
- **Failed** - Volume has failed its automatic reclamation

**Example PersistentVolume (NFS):**
```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: nfs-pv
  labels:
    type: nfs
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  storageClassName: slow
  nfs:
    server: 192.168.1.100
    path: /exported/path
```

**Example PersistentVolume (AWS EBS):**
```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: ebs-pv
spec:
  capacity:
    storage: 20Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Delete
  storageClassName: gp2
  awsElasticBlockStore:
    volumeID: vol-12345678
    fsType: ext4
```

**Local PersistentVolume:**
```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: local-pv
spec:
  capacity:
    storage: 100Gi
  accessModes:
  - ReadWriteOnce
  persistentVolumeReclaimPolicy: Delete
  storageClassName: local-storage
  local:
    path: /mnt/disks/ssd1
  nodeAffinity:
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: kubernetes.io/hostname
          operator: In
          values:
          - worker-node-1
```

## PersistentVolumeClaim (PVC)

**What it is:** A request for storage by a user, similar to how pods consume node resources, PVCs consume PV resources.

**Why it matters:** PVCs provide an abstraction layer between applications and storage. Applications request storage through PVCs without needing to know the underlying storage implementation details.

**PVC workflow:**
1. **User creates PVC** - Specifies storage requirements
2. **Kubernetes finds matching PV** - Based on size, access mode, storage class
3. **Binding occurs** - PVC is bound to suitable PV
4. **Pod uses PVC** - Mounts the bound storage
5. **Release** - When PVC is deleted, PV follows reclaim policy

**PVC specifications:**
- **Storage size** - Amount of storage requested
- **Access modes** - How the storage will be accessed
- **Storage class** - Type of storage required
- **Label selectors** - Additional criteria for matching PVs

**Common commands:**
```bash
# PVC operations
kubectl get pvc                                    # List all PVCs
kubectl describe pvc <pvc-name>                    # Detailed PVC information
kubectl delete pvc <pvc-name>                     # Delete PVC

# PVC troubleshooting
kubectl get pvc -o wide                           # PVC with additional info
kubectl get events --field-selector involvedObject.kind=PersistentVolumeClaim
```

**PVC states:**
- **Pending** - PVC is waiting to be bound to a PV
- **Bound** - PVC is bound to a PV
- **Lost** - PV backing the PVC is lost

**Example PVC:**
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: database-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
  storageClassName: fast-ssd
  selector:
    matchLabels:
      environment: production
```

**Using PVC in Pod:**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: database-pod
spec:
  containers:
  - name: database
    image: postgres:13
    env:
    - name: POSTGRES_DB
      value: myapp
    - name: POSTGRES_USER
      value: admin
    - name: POSTGRES_PASSWORD
      value: secretpassword
    volumeMounts:
    - name: database-storage
      mountPath: /var/lib/postgresql/data
  volumes:
  - name: database-storage
    persistentVolumeClaim:
      claimName: database-pvc
```

**PVC in StatefulSet:**
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
spec:
  serviceName: database
  replicas: 3
  selector:
    matchLabels:
      app: database
  template:
    metadata:
      labels:
        app: database
    spec:
      containers:
      - name: postgres
        image: postgres:13
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
      storageClassName: fast-ssd
```

## StorageClass

**What it is:** A way to describe different "classes" of storage available in a cluster, enabling dynamic provisioning of PersistentVolumes.

**Why it matters:** StorageClasses eliminate the need for administrators to pre-provision PersistentVolumes. They enable on-demand storage provisioning with different performance characteristics, backup policies, and other parameters.

**Key features:**
- **Dynamic provisioning** - Automatically create PVs when PVCs are created
- **Storage types** - Define different tiers (fast SSD, slow HDD, etc.)
- **Parameters** - Configure storage-specific settings
- **Provisioners** - Backend storage systems that create volumes
- **Reclaim policies** - Default behavior when PVCs are deleted

**Common provisioners:**
- **kubernetes.io/aws-ebs** - Amazon Elastic Block Store
- **kubernetes.io/gce-pd** - Google Compute Engine Persistent Disk
- **kubernetes.io/azure-disk** - Azure Managed Disk
- **kubernetes.io/cinder** - OpenStack Cinder
- **kubernetes.io/vsphere-volume** - vSphere
- **kubernetes.io/no-provisioner** - Local volumes

**Common commands:**
```bash
# StorageClass operations
kubectl get storageclass                           # List all storage classes
kubectl get sc                                    # Short form
kubectl describe storageclass <sc-name>           # Detailed SC information
kubectl delete storageclass <sc-name>             # Delete storage class

# Set default storage class
kubectl patch storageclass <sc-name> -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
```

**Example StorageClass (AWS EBS):**
```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
  annotations:
    storageclass.kubernetes.io/is-default-class: "false"
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
  fsType: ext4
  encrypted: "true"
allowVolumeExpansion: true
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
```

**Example StorageClass (GCP Persistent Disk):**
```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: regional-ssd
provisioner: kubernetes.io/gce-pd
parameters:
  type: pd-ssd
  replication-type: regional-pd
  zones: us-central1-a,us-central1-b
allowVolumeExpansion: true
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
```

**Example StorageClass (Local storage):**
```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-storage
provisioner: kubernetes.io/no-provisioner
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Delete
```

**StorageClass parameters by provider:**

**AWS EBS parameters:**
- **type** - gp2, gp3, io1, io2, sc1, st1
- **fsType** - ext4, xfs
- **encrypted** - true/false
- **kmsKeyId** - KMS key for encryption

**GCP PD parameters:**
- **type** - pd-standard, pd-ssd, pd-balanced
- **replication-type** - none, regional-pd
- **zones** - Comma-separated zone list

**Azure Disk parameters:**
- **skuName** - Standard_LRS, Premium_LRS, StandardSSD_LRS
- **location** - Azure region
- **storageAccount** - Storage account name

**Volume binding modes:**
- **Immediate** - PV created immediately when PVC is created
- **WaitForFirstConsumer** - Wait until pod using PVC is scheduled

**Dynamic provisioning workflow:**
1. **PVC created** - User creates PVC with storageClassName
2. **StorageClass matched** - Kubernetes finds matching StorageClass
3. **Provisioner called** - Storage provisioner creates actual volume
4. **PV created** - Kubernetes creates PV representing the volume
5. **Binding** - PVC is bound to the newly created PV
6. **Pod mount** - Pod can now use the storage

**When you'll use it:** Any time you need persistent storage in Kubernetes - databases, file storage, application data, logs, or any stateful workload requiring data persistence.