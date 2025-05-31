# Kubernetes Cluster Internals: Complete Deep Technical Guide
category: DevOps
tags: kubernetes, cluster-internals, control-plane, api-server, etcd, kubelet, scheduler, controllers

## Introduction to Kubernetes Cluster Internals

Understanding Kubernetes cluster internals is crucial for troubleshooting, performance optimization, and designing robust systems. Kubernetes is essentially a **distributed system** that manages containerized workloads across multiple machines.

### High-Level Cluster Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CONTROL PLANE                           │
├─────────────────┬─────────────────┬─────────────────────────┤
│   API Server    │   Controller    │      Scheduler          │
│                 │   Manager       │                         │
├─────────────────┼─────────────────┼─────────────────────────┤
│                 │      etcd       │                         │
│                 │  (Data Store)   │                         │
└─────────────────┴─────────────────┴─────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
         ┌────▼────┐   ┌─────▼─────┐   ┌────▼────┐
         │ Node 1  │   │  Node 2   │   │ Node 3  │
         │         │   │           │   │         │
         │ kubelet │   │  kubelet  │   │ kubelet │
         │ kube-   │   │  kube-    │   │ kube-   │
         │ proxy   │   │  proxy    │   │ proxy   │
         │         │   │           │   │         │
         │ Pods    │   │  Pods     │   │ Pods    │
         └─────────┘   └───────────┘   └─────────┘
```

### Master vs Worker Node Split

**Control Plane (Master Nodes):**
- Makes global decisions about the cluster
- Stores cluster state and configuration
- Schedules workloads to worker nodes
- Exposes the Kubernetes API

**Worker Nodes:**
- Run application workloads (pods)
- Communicate with control plane
- Execute containers and provide networking
- Report status back to control plane

## API Server Deep Dive

### What the API Server Actually Does

The **kube-apiserver** is the **central hub** of the entire Kubernetes cluster. Every operation in Kubernetes goes through the API server - it's the only component that directly interacts with etcd.

**API Server Responsibilities:**
- **HTTP API Gateway** - Exposes REST APIs for all Kubernetes operations
- **Authentication & Authorization** - Validates who can do what
- **Admission Control** - Validates and potentially modifies requests
- **etcd Interface** - Only component that reads/writes to etcd
- **Event Notification** - Notifies clients about resource changes via watch APIs

### API Server Request Flow

**Complete Request Journey:**
```
kubectl create pod → API Server → Authentication → Authorization → Admission Controllers → Validation → etcd → Response
```

**Detailed Flow:**
1. **HTTP Request** - Client sends HTTP request to API server
2. **TLS Termination** - API server handles SSL/TLS
3. **Authentication** - Verify client identity (certificates, tokens, etc.)
4. **Authorization** - Check if client can perform this action (RBAC)
5. **Admission Controllers** - Validate and potentially modify request
6. **Schema Validation** - Ensure request matches Kubernetes API schema
7. **etcd Write** - Store object in etcd if all checks pass
8. **Response** - Return success/failure to client
9. **Watch Notifications** - Notify other components watching this resource type

### API Server Configuration

#### Complete API Server Configuration
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: kube-apiserver
  namespace: kube-system
spec:
  containers:
  - name: kube-apiserver
    image: k8s.gcr.io/kube-apiserver:v1.28.0
    command:
    - kube-apiserver
    
    # Basic connectivity
    - --bind-address=0.0.0.0
    - --secure-port=6443
    - --insecure-port=0  # Disable insecure port
    
    # etcd configuration
    - --etcd-servers=https://127.0.0.1:2379
    - --etcd-cafile=/etc/kubernetes/pki/etcd/ca.crt
    - --etcd-certfile=/etc/kubernetes/pki/apiserver-etcd-client.crt
    - --etcd-keyfile=/etc/kubernetes/pki/apiserver-etcd-client.key
    
    # Client certificate authentication
    - --client-ca-file=/etc/kubernetes/pki/ca.crt
    - --tls-cert-file=/etc/kubernetes/pki/apiserver.crt
    - --tls-private-key-file=/etc/kubernetes/pki/apiserver.key
    
    # Service account token authentication
    - --service-account-key-file=/etc/kubernetes/pki/sa.pub
    - --service-account-signing-key-file=/etc/kubernetes/pki/sa.key
    - --service-account-issuer=https://kubernetes.default.svc.cluster.local
    
    # Authorization
    - --authorization-mode=Node,RBAC
    
    # Admission controllers
    - --enable-admission-plugins=NamespaceLifecycle,LimitRanger,ServiceAccount,DefaultStorageClass,DefaultTolerationSeconds,MutatingAdmissionWebhook,ValidatingAdmissionWebhook,ResourceQuota,NodeRestriction
    
    # Aggregation layer (for custom APIs)
    - --requestheader-client-ca-file=/etc/kubernetes/pki/front-proxy-ca.crt
    - --requestheader-allowed-names=front-proxy-client
    - --requestheader-extra-headers-prefix=X-Remote-Extra-
    - --requestheader-group-headers=X-Remote-Group
    - --requestheader-username-headers=X-Remote-User
    - --proxy-client-cert-file=/etc/kubernetes/pki/front-proxy-client.crt
    - --proxy-client-key-file=/etc/kubernetes/pki/front-proxy-client.key
    
    # API priority and fairness
    - --enable-priority-and-fairness=true
    - --max-requests-inflight=400
    - --max-mutating-requests-inflight=200
    
    # Audit logging
    - --audit-log-path=/var/log/audit.log
    - --audit-log-maxage=30
    - --audit-log-maxbackup=3
    - --audit-log-maxsize=100
    - --audit-policy-file=/etc/kubernetes/audit-policy.yaml
    
    # Performance and reliability
    - --default-watch-cache-size=100
    - --watch-cache-sizes=pods#1000,nodes#100
    - --runtime-config=api/all=true
    
    # Security
    - --anonymous-auth=false
    - --kubelet-certificate-authority=/etc/kubernetes/pki/ca.crt
    - --kubelet-client-certificate=/etc/kubernetes/pki/apiserver-kubelet-client.crt
    - --kubelet-client-key=/etc/kubernetes/pki/apiserver-kubelet-client.key
    
    ports:
    - containerPort: 6443
      name: https
    
    volumeMounts:
    - name: etc-kubernetes
      mountPath: /etc/kubernetes
      readOnly: true
    - name: var-log
      mountPath: /var/log
    
    resources:
      requests:
        cpu: 250m
        memory: 512Mi
      limits:
        cpu: 1000m
        memory: 2Gi
    
    livenessProbe:
      httpGet:
        host: 127.0.0.1
        path: /livez
        port: 6443
        scheme: HTTPS
      initialDelaySeconds: 10
      periodSeconds: 10
      timeoutSeconds: 15
      failureThreshold: 8
    
    readinessProbe:
      httpGet:
        host: 127.0.0.1
        path: /readyz
        port: 6443
        scheme: HTTPS
      initialDelaySeconds: 0
      periodSeconds: 1
      timeoutSeconds: 15
      failureThreshold: 3
  
  volumes:
  - name: etc-kubernetes
    hostPath:
      path: /etc/kubernetes
      type: DirectoryOrCreate
  - name: var-log
    hostPath:
      path: /var/log
      type: DirectoryOrCreate
```

### API Server Watch Mechanism

**How Watch Works:**
The API server provides a **watch** mechanism that allows clients to receive real-time notifications when resources change.

```go
// Example of how controllers watch for changes
package main

import (
    "context"
    "fmt"
    
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/watch"
    "k8s.io/client-go/kubernetes"
)

func watchPods(clientset *kubernetes.Clientset) {
    watchlist := cache.NewListWatchFromClient(
        clientset.CoreV1().RESTClient(),
        "pods",
        metav1.NamespaceAll,
        fields.Everything(),
    )
    
    watcher, err := watchlist.Watch(context.TODO(), metav1.ListOptions{})
    if err != nil {
        panic(err)
    }
    
    for event := range watcher.ResultChan() {
        pod := event.Object.(*v1.Pod)
        
        switch event.Type {
        case watch.Added:
            fmt.Printf("Pod ADDED: %s/%s\n", pod.Namespace, pod.Name)
        case watch.Modified:
            fmt.Printf("Pod MODIFIED: %s/%s\n", pod.Namespace, pod.Name)
        case watch.Deleted:
            fmt.Printf("Pod DELETED: %s/%s\n", pod.Namespace, pod.Name)
        }
    }
}
```

**Watch Implementation Details:**
- **Long-polling HTTP connections** - Client keeps connection open
- **Resource versions** - Each object has a version number for consistency
- **Bookmarks** - Periodic events to keep connections alive
- **Watch resumption** - Can resume watching from a specific resource version

### API Server Scaling and High Availability

#### Multi-Master Setup
```yaml
# API Server with load balancer
apiVersion: v1
kind: Pod
metadata:
  name: kube-apiserver-master1
spec:
  containers:
  - name: kube-apiserver
    command:
    - kube-apiserver
    - --advertise-address=10.0.1.10  # This master's IP
    - --etcd-servers=https://10.0.1.10:2379,https://10.0.1.11:2379,https://10.0.1.12:2379
    # ... other flags
---
# Load balancer configuration (HAProxy example)
global
    daemon

defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms

frontend kubernetes-frontend
    bind *:6443
    mode tcp
    default_backend kubernetes-backend

backend kubernetes-backend
    mode tcp
    balance roundrobin
    server master1 10.0.1.10:6443 check
    server master2 10.0.1.11:6443 check
    server master3 10.0.1.12:6443 check
```

## etcd Deep Dive

### What etcd Actually Does

**etcd** is a distributed key-value store that serves as Kubernetes' "brain" - it stores all cluster state, configuration, and metadata. Understanding etcd is crucial because it's the single source of truth for your entire cluster.

**etcd Responsibilities:**
- **Cluster State Storage** - All Kubernetes objects (pods, services, etc.)
- **Configuration Data** - ConfigMaps, Secrets, policies
- **Distributed Consensus** - Uses Raft algorithm for consistency
- **Watch Notifications** - Notifies API server of changes
- **Atomic Operations** - Ensures consistency during updates

### etcd Data Model

**How Kubernetes Data is Stored in etcd:**
```bash
# etcd stores Kubernetes objects as key-value pairs
/registry/pods/default/my-pod → {pod object JSON}
/registry/services/default/my-service → {service object JSON}
/registry/configmaps/default/my-config → {configmap object JSON}

# Hierarchical structure
/registry/
├── pods/
│   ├── default/
│   │   ├── pod1
│   │   └── pod2
│   └── kube-system/
│       ├── api-server-pod
│       └── etcd-pod
├── services/
├── configmaps/
└── secrets/
```

**Example etcd Operations:**
```bash
# View all Kubernetes data in etcd
ETCDCTL_API=3 etcdctl get /registry --prefix --keys-only

# Get specific pod data
ETCDCTL_API=3 etcdctl get /registry/pods/default/my-pod

# Watch for changes to pods
ETCDCTL_API=3 etcdctl watch /registry/pods --prefix

# View cluster member list
ETCDCTL_API=3 etcdctl member list
```

### etcd Cluster Configuration

#### Three-Node etcd Cluster
```yaml
# etcd member 1
apiVersion: v1
kind: Pod
metadata:
  name: etcd-master1
  namespace: kube-system
spec:
  containers:
  - name: etcd
    image: k8s.gcr.io/etcd:3.5.6-0
    command:
    - etcd
    - --name=master1
    - --data-dir=/var/lib/etcd
    
    # Cluster configuration
    - --initial-cluster=master1=https://10.0.1.10:2380,master2=https://10.0.1.11:2380,master3=https://10.0.1.12:2380
    - --initial-cluster-state=new
    - --initial-cluster-token=k8s-etcd-cluster
    
    # This member's URLs
    - --listen-peer-urls=https://10.0.1.10:2380
    - --listen-client-urls=https://10.0.1.10:2379,https://127.0.0.1:2379
    - --advertise-client-urls=https://10.0.1.10:2379
    - --initial-advertise-peer-urls=https://10.0.1.10:2380
    
    # Security
    - --cert-file=/etc/kubernetes/pki/etcd/server.crt
    - --key-file=/etc/kubernetes/pki/etcd/server.key
    - --trusted-ca-file=/etc/kubernetes/pki/etcd/ca.crt
    - --client-cert-auth=true
    - --peer-cert-file=/etc/kubernetes/pki/etcd/peer.crt
    - --peer-key-file=/etc/kubernetes/pki/etcd/peer.key
    - --peer-trusted-ca-file=/etc/kubernetes/pki/etcd/ca.crt
    - --peer-client-cert-auth=true
    
    # Performance and reliability
    - --snapshot-count=10000
    - --heartbeat-interval=100
    - --election-timeout=1000
    - --max-snapshots=5
    - --max-wals=5
    - --quota-backend-bytes=2147483648  # 2GB
    
    ports:
    - containerPort: 2379
      name: client
    - containerPort: 2380
      name: peer
    
    volumeMounts:
    - name: etcd-data
      mountPath: /var/lib/etcd
    - name: etcd-certs
      mountPath: /etc/kubernetes/pki/etcd
      readOnly: true
    
    resources:
      requests:
        cpu: 100m
        memory: 512Mi
      limits:
        cpu: 1000m
        memory: 2Gi
    
    livenessProbe:
      exec:
        command:
        - /bin/sh
        - -c
        - ETCDCTL_API=3 etcdctl --endpoints=https://127.0.0.1:2379 --cacert=/etc/kubernetes/pki/etcd/ca.crt --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt --key=/etc/kubernetes/pki/etcd/healthcheck-client.key get foo
      initialDelaySeconds: 15
      periodSeconds: 15
      timeoutSeconds: 15
      failureThreshold: 8
  
  volumes:
  - name: etcd-data
    hostPath:
      path: /var/lib/etcd
      type: DirectoryOrCreate
  - name: etcd-certs
    hostPath:
      path: /etc/kubernetes/pki/etcd
      type: DirectoryOrCreate
```

### etcd Backup and Restore

#### Automated Backup Script
```bash
#!/bin/bash
# etcd backup script

BACKUP_DIR="/var/backups/etcd"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Create snapshot
ETCDCTL_API=3 etcdctl snapshot save $BACKUP_DIR/etcd-snapshot-$TIMESTAMP.db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key

# Verify snapshot
ETCDCTL_API=3 etcdctl snapshot status $BACKUP_DIR/etcd-snapshot-$TIMESTAMP.db

# Compress backup
gzip $BACKUP_DIR/etcd-snapshot-$TIMESTAMP.db

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/etcd-snapshot-$TIMESTAMP.db.gz s3://k8s-etcd-backups/

# Clean up old backups
find $BACKUP_DIR -name "etcd-snapshot-*.db.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: etcd-snapshot-$TIMESTAMP.db.gz"
```

#### Backup as Kubernetes CronJob
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: etcd-backup
  namespace: kube-system
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          hostNetwork: true
          tolerations:
          - operator: Exists
            effect: NoSchedule
          nodeSelector:
            node-role.kubernetes.io/control-plane: ""
          containers:
          - name: etcd-backup
            image: k8s.gcr.io/etcd:3.5.6-0
            command:
            - /bin/sh
            - -c
            - |
              BACKUP_DIR="/backup"
              TIMESTAMP=$(date +%Y%m%d_%H%M%S)
              
              # Create snapshot
              ETCDCTL_API=3 etcdctl snapshot save $BACKUP_DIR/etcd-snapshot-$TIMESTAMP.db \
                --endpoints=https://127.0.0.1:2379 \
                --cacert=/etc/kubernetes/pki/etcd/ca.crt \
                --cert=/etc/kubernetes/pki/etcd/server.crt \
                --key=/etc/kubernetes/pki/etcd/server.key
              
              # Verify and compress
              ETCDCTL_API=3 etcdctl snapshot status $BACKUP_DIR/etcd-snapshot-$TIMESTAMP.db
              gzip $BACKUP_DIR/etcd-snapshot-$TIMESTAMP.db
              
              # Clean up old backups
              find $BACKUP_DIR -name "*.db.gz" -mtime +7 -delete
              
              echo "Backup completed: etcd-snapshot-$TIMESTAMP.db.gz"
            
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
          - name: backup-storage
            hostPath:
              path: /var/backups/etcd
          
          restartPolicy: OnFailure
```

#### Disaster Recovery Process
```bash
# 1. Stop all API servers
systemctl stop kubelet

# 2. Remove existing etcd data
rm -rf /var/lib/etcd

# 3. Restore from snapshot
ETCDCTL_API=3 etcdctl snapshot restore /var/backups/etcd/etcd-snapshot-20240115_020000.db.gz \
  --data-dir=/var/lib/etcd \
  --name=master1 \
  --initial-cluster=master1=https://10.0.1.10:2380,master2=https://10.0.1.11:2380,master3=https://10.0.1.12:2380 \
  --initial-cluster-token=k8s-etcd-cluster \
  --initial-advertise-peer-urls=https://10.0.1.10:2380

# 4. Fix ownership
chown -R etcd:etcd /var/lib/etcd

# 5. Start etcd and API server
systemctl start kubelet

# 6. Verify cluster state
kubectl get nodes
kubectl get pods --all-namespaces
```

## kubelet Deep Dive

### What kubelet Actually Does

The **kubelet** is the "node agent" that runs on every worker node. It's responsible for managing the lifecycle of pods and ensuring that containers are running and healthy.

**kubelet Responsibilities:**
- **Pod Lifecycle Management** - Create, update, and delete pods
- **Container Runtime Interface** - Communicate with container runtime (Docker, containerd, CRI-O)
- **Resource Monitoring** - Collect node and pod metrics
- **Volume Management** - Mount and unmount volumes for pods
- **Network Setup** - Work with CNI plugins for pod networking
- **Node Status Reporting** - Report node health and capacity to API server

### kubelet Configuration

#### Complete kubelet Configuration
```yaml
# /var/lib/kubelet/config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration

# Basic settings
address: 0.0.0.0
port: 10250
readOnlyPort: 0

# Authentication and authorization
authentication:
  anonymous:
    enabled: false
  webhook:
    enabled: true
    cacheTTL: 2m0s
  x509:
    clientCAFile: /etc/kubernetes/pki/ca.crt
authorization:
  mode: Webhook
  webhook:
    cacheAuthorizedTTL: 5m0s
    cacheUnauthorizedTTL: 30s

# Cluster configuration
clusterDomain: cluster.local
clusterDNS:
- 10.96.0.10

# Container runtime
containerRuntimeEndpoint: unix:///var/run/containerd/containerd.sock

# Resource management
maxPods: 110
podsPerCore: 0
enableControllerAttachDetach: true

# Cgroup configuration
cgroupDriver: systemd
cgroupRoot: /
cgroupsPerQOS: true
enforceNodeAllocatable:
- pods
- kube-reserved
- system-reserved

# Resource reservations
kubeReserved:
  cpu: 100m
  memory: 128Mi
  ephemeral-storage: 1Gi
systemReserved:
  cpu: 100m
  memory: 128Mi
  ephemeral-storage: 1Gi

# Eviction policies
evictionHard:
  memory.available: 100Mi
  nodefs.available: 10%
  nodefs.inodesFree: 5%
  imagefs.available: 15%
evictionSoft:
  memory.available: 300Mi
  nodefs.available: 15%
evictionSoftGracePeriod:
  memory.available: 1m30s
  nodefs.available: 1m30s
evictionMaxPodGracePeriod: 90

# Image management
imageMinimumGCAge: 2m0s
imageGCHighThresholdPercent: 85
imageGCLowThresholdPercent: 80

# Logging
logging:
  format: json
  verbosity: 2

# Feature gates
featureGates:
  RotateKubeletServerCertificate: true
  PodSecurity: true

# TLS configuration
tlsCertFile: /var/lib/kubelet/pki/kubelet.crt
tlsPrivateKeyFile: /var/lib/kubelet/pki/kubelet.key
tlsCipherSuites:
- TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256
- TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256

# Health and monitoring
healthzBindAddress: 127.0.0.1
healthzPort: 10248
metricsBindAddress: 127.0.0.1:10249

# Volume plugin directory
volumePluginDir: /usr/libexec/kubernetes/kubelet-plugins/volume/exec/

# Node status update frequency
nodeStatusUpdateFrequency: 10s
nodeStatusReportFrequency: 5m0s

# Pod termination
shutdownGracePeriod: 30s
shutdownGracePeriodCriticalPods: 10s
```

### Container Runtime Interface (CRI)

#### How kubelet Communicates with Container Runtime
```go
// Simplified example of kubelet CRI interaction
package main

import (
    "context"
    "google.golang.org/grpc"
    runtimeapi "k8s.io/cri-api/pkg/apis/runtime/v1"
)

func createPod(client runtimeapi.RuntimeServiceClient, podConfig *runtimeapi.PodSandboxConfig) {
    // 1. Create pod sandbox (network namespace)
    sandboxResponse, err := client.RunPodSandbox(context.Background(), &runtimeapi.RunPodSandboxRequest{
        Config: podConfig,
    })
    if err != nil {
        panic(err)
    }
    
    podSandboxID := sandboxResponse.PodSandboxId
    
    // 2. Create containers in the pod
    for _, containerConfig := range podConfig.Containers {
        // Pull image if needed
        _, err := client.PullImage(context.Background(), &runtimeapi.PullImageRequest{
            Image: &runtimeapi.ImageSpec{
                Image: containerConfig.Image,
            },
        })
        
        // Create container
        createResponse, err := client.CreateContainer(context.Background(), &runtimeapi.CreateContainerRequest{
            PodSandboxId:  podSandboxID,
            Config:        containerConfig,
            SandboxConfig: podConfig,
        })
        
        containerID := createResponse.ContainerId
        
        // Start container
        _, err = client.StartContainer(context.Background(), &runtimeapi.StartContainerRequest{
            ContainerId: containerID,
        })
    }
}
```

#### Container Runtime Options

**containerd Configuration:**
```toml
# /etc/containerd/config.toml
version = 2

[grpc]
  address = "/var/run/containerd/containerd.sock"

[plugins."io.containerd.grpc.v1.cri"]
  sandbox_image = "k8s.gcr.io/pause:3.9"
  
  [plugins."io.containerd.grpc.v1.cri".containerd]
    snapshotter = "overlayfs"
    default_runtime_name = "runc"
    
    [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc]
      runtime_type = "io.containerd.runc.v2"
      
      [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
        SystemdCgroup = true
        
  [plugins."io.containerd.grpc.v1.cri".cni]
    bin_dir = "/opt/cni/bin"
    conf_dir = "/etc/cni/net.d"
    
  [plugins."io.containerd.grpc.v1.cri".registry]
    [plugins."io.containerd.grpc.v1.cri".registry.mirrors]
      [plugins."io.containerd.grpc.v1.cri".registry.mirrors."docker.io"]
        endpoint = ["https://registry-1.docker.io"]
```

### kubelet Node Registration

#### How Nodes Join the Cluster
```bash
# 1. kubelet starts with bootstrap token
kubelet --bootstrap-kubeconfig=/etc/kubernetes/bootstrap-kubelet.conf \
        --kubeconfig=/etc/kubernetes/kubelet.conf \
        --config=/var/lib/kubelet/config.yaml

# 2. kubelet uses bootstrap token to create CSR
# 3. Controller manager auto-approves node CSR
# 4. kubelet gets signed certificate
# 5. kubelet registers node with API server
```

**Node Registration Process:**
```yaml
# kubelet creates Node object
apiVersion: v1
kind: Node
metadata:
  name: worker-node-1
  labels:
    kubernetes.io/arch: amd64
    kubernetes.io/hostname: worker-node-1
    kubernetes.io/os: linux
    node-role.kubernetes.io/worker: ""
spec:
  podCIDR: 10.244.1.0/24
  providerID: aws:///us-west-2a/i-1234567890abcdef0
status:
  addresses:
  - address: 10.0.1.100
    type: InternalIP
  - address: worker-node-1
    type: Hostname
  allocatable:
    cpu: "4"
    ephemeral-storage: 50Gi
    hugepages-1Gi: "0"
    hugepages-2Mi: "0"
    memory: 8Gi
    pods: "110"
  capacity:
    cpu: "4"
    ephemeral-storage: 50Gi
    hugepages-1Gi: "0"
    hugepages-2Mi: "0"
    memory: 8Gi
    pods: "110"
  conditions:
  - type: Ready
    status: "True"
    reason: KubeletReady
    message: kubelet is posting ready status
  - type: MemoryPressure
    status: "False"
    reason: KubeletHasSufficientMemory
  - type: DiskPressure
    status: "False"
    reason: KubeletHasNoDiskPressure
  - type: PIDPressure
    status: "False"
    reason: KubeletHasSufficientPID
  nodeInfo:
    architecture: amd64
    bootID: 12345678-1234-5678-9012-123456789abc
    containerRuntimeVersion: containerd://1.6.6
    kernelVersion: 5.4.0-74-generic
    kubeProxyVersion: v1.28.0
    kubeletVersion: v1.28.0
    machineID: 12345678901234567890123456789012
    operatingSystem: linux
    osImage: Ubuntu 20.04.3 LTS
    systemUUID: 12345678-1234-5678-9012-123456789abc
```

## Scheduler Deep Dive

### What the Scheduler Actually Does

The **kube-scheduler** watches for newly created pods that have no node assigned and selects a node for them to run on based on various factors.

**Scheduling Process:**
1. **Watch for Unscheduled Pods** - Monitor API server for pods with `spec.nodeName` empty
2. **Filtering** - Find nodes that meet pod requirements (resource, constraints)
3. **Scoring** - Rank suitable nodes based on priorities
4. **Binding** - Assign pod to highest-scoring node

### Scheduling Algorithm Deep Dive

#### Filtering Phase (Predicates)
```go
// Example predicates that filter nodes
func nodeAffinityPredicate(pod *v1.Pod, node *v1.Node) bool {
    // Check if node matches pod's node affinity requirements
    if pod.Spec.Affinity != nil && pod.Spec.Affinity.NodeAffinity != nil {
        return checkNodeAffinity(pod.Spec.Affinity.NodeAffinity, node)
    }
    return true
}

func resourcesPredicate(pod *v1.Pod, node *v1.Node) bool {
    // Check if node has enough CPU and memory
    podRequests := calculatePodRequests(pod)
    nodeAllocatable := node.Status.Allocatable
    
    if podRequests.CPU > nodeAllocatable.CPU {
        return false
    }
    if podRequests.Memory > nodeAllocatable.Memory {
        return false
    }
    return true
}

func podAntiAffinityPredicate(pod *v1.Pod, node *v1.Node, existingPods []*v1.Pod) bool {
    // Check if pod's anti-affinity rules are satisfied
    if pod.Spec.Affinity != nil && pod.Spec.Affinity.PodAntiAffinity != nil {
        return checkPodAntiAffinity(pod, node, existingPods)
    }
    return true
}
```

#### Scoring Phase (Priorities)
```go
// Example scoring functions
func nodeResourceScore(pod *v1.Pod, node *v1.Node) int {
    // Score based on resource utilization (prefer less utilized nodes)
    cpuFraction := node.Status.Allocatable.CPU / node.Status.Capacity.CPU
    memoryFraction := node.Status.Allocatable.Memory / node.Status.Capacity.Memory
    
    // Lower utilization = higher score
    score := int((2.0 - cpuFraction - memoryFraction) * 50)
    return score
}

func nodeAffinityScore(pod *v1.Pod, node *v1.Node) int {
    // Score based on node affinity preferences
    if pod.Spec.Affinity != nil && pod.Spec.Affinity.NodeAffinity != nil {
        return calculateNodeAffinityScore(pod.Spec.Affinity.NodeAffinity, node)
    }
    return 0
}

func podAffinityScore(pod *v1.Pod, node *v1.Node, existingPods []*v1.Pod) int {
    // Score based on pod affinity preferences
    score := 0
    if pod.Spec.Affinity != nil && pod.Spec.Affinity.PodAffinity != nil {
        score += calculatePodAffinityScore(pod, node, existingPods)
    }
    return score
}
```

### Scheduler Configuration

#### Custom Scheduler Configuration
```yaml
apiVersion: kubescheduler.config.k8s.io/v1beta3
kind: KubeSchedulerConfiguration
profiles:
- schedulerName: default-scheduler
  plugins:
    # Filtering plugins (predicates)
    filter:
      enabled:
      - name: NodeResourcesFit
      - name: NodeAffinity
      - name: PodTopologySpread
      - name: InterPodAffinity
      - name: VolumeBinding
      - name: NodePorts
      - name: NodeUnschedulable
      - name: TaintToleration
      disabled:
      - name: NodeResourcesLeastAllocated  # Use custom scoring instead
    
    # Scoring plugins (priorities)
    score:
      enabled:
      - name: NodeResourcesFit
        weight: 10
      - name: NodeAffinity
        weight: 5
      - name: InterPodAffinity
        weight: 5
      - name: NodeResourcesBalancedAllocation
        weight: 10
      - name: ImageLocality
        weight: 1
      - name: TaintToleration
        weight: 1
  
  pluginConfig:
  - name: NodeResourcesFit
    args:
      scoringStrategy:
        type: LeastAllocated  # or MostAllocated, RequestedToCapacityRatio
        resources:
        - name: cpu
          weight: 1
        - name: memory
          weight: 1
  
  - name: PodTopologySpread
    args:
      defaultConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: ScheduleAnyway
      - maxSkew: 3
        topologyKey: kubernetes.io/hostname
        whenUnsatisfiable: ScheduleAnyway

# Multiple scheduler profiles
- schedulerName: gpu-scheduler
  plugins:
    filter:
      enabled:
      - name: NodeResourcesFit
      - name: NodeAffinity
    score:
      enabled:
      - name: NodeResourcesFit
        weight: 100  # Heavily weight GPU resources
  pluginConfig:
  - name: NodeResourcesFit
    args:
      scoringStrategy:
        type: LeastAllocated
        resources:
        - name: nvidia.com/gpu
          weight: 100
        - name: cpu
          weight: 1
        - name: memory
          weight: 1
```

#### Advanced Scheduling Examples

**Pod Affinity and Anti-Affinity:**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-server
  labels:
    app: web
    tier: frontend
spec:
  affinity:
    # Pod affinity - prefer to be scheduled with cache pods
    podAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchExpressions:
            - key: app
              operator: In
              values:
              - cache
          topologyKey: kubernetes.io/hostname
    
    # Pod anti-affinity - avoid other web servers on same node
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchExpressions:
          - key: app
            operator: In
            values:
            - web
        topologyKey: kubernetes.io/hostname
    
    # Node affinity - prefer nodes with SSD storage
    nodeAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 80
        preference:
          matchExpressions:
          - key: storage-type
            operator: In
            values:
            - ssd
      
      # Required node affinity - must be in specific zones
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: topology.kubernetes.io/zone
            operator: In
            values:
            - us-west-2a
            - us-west-2b
  
  tolerations:
  - key: dedicated
    operator: Equal
    value: frontend
    effect: NoSchedule
  
  containers:
  - name: web
    image: nginx:latest
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 256Mi
```

**Topology Spread Constraints:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: distributed-app
spec:
  replicas: 12
  selector:
    matchLabels:
      app: distributed-app
  template:
    metadata:
      labels:
        app: distributed-app
    spec:
      topologySpreadConstraints:
      # Spread evenly across availability zones
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: distributed-app
      
      # Spread evenly across nodes (max 2 pods per node)
      - maxSkew: 1
        topologyKey: kubernetes.io/hostname
        whenUnsatisfiable: ScheduleAnyway
        labelSelector:
          matchLabels:
            app: distributed-app
      
      containers:
      - name: app
        image: myapp:latest
```

## Controller Manager Deep Dive

### What Controller Manager Actually Does

The **kube-controller-manager** runs various controllers that watch for changes in the cluster state and work to move the current state toward the desired state.

**Built-in Controllers:**
- **Deployment Controller** - Manages ReplicaSets for Deployments
- **ReplicaSet Controller** - Ensures desired number of pod replicas
- **Node Controller** - Monitors node health and handles node failures
- **Service Account Controller** - Creates default service accounts and tokens
- **Namespace Controller** - Handles namespace deletion and cleanup
- **Persistent Volume Controller** - Manages PV/PVC binding
- **Job Controller** - Manages batch jobs
- **CronJob Controller** - Manages scheduled jobs

### Controller Pattern Implementation

#### Example Custom Controller
```go
package main

import (
    "context"
    "fmt"
    "time"
    
    appsv1 "k8s.io/api/apps/v1"
    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/runtime"
    "k8s.io/apimachinery/pkg/watch"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/tools/cache"
)

// DeploymentController watches Deployments and ensures they have the right number of replicas
type DeploymentController struct {
    clientset    kubernetes.Interface
    deploymentInformer cache.SharedIndexInformer
    workqueue    chan string
}

func NewDeploymentController(clientset kubernetes.Interface) *DeploymentController {
    deploymentInformer := cache.NewSharedIndexInformer(
        &cache.ListWatch{
            ListFunc: func(options metav1.ListOptions) (runtime.Object, error) {
                return clientset.AppsV1().Deployments("").List(context.TODO(), options)
            },
            WatchFunc: func(options metav1.ListOptions) (watch.Interface, error) {
                return clientset.AppsV1().Deployments("").Watch(context.TODO(), options)
            },
        },
        &appsv1.Deployment{},
        time.Minute*10,
        cache.Indexers{},
    )
    
    controller := &DeploymentController{
        clientset:          clientset,
        deploymentInformer: deploymentInformer,
        workqueue:         make(chan string, 256),
    }
    
    // Add event handlers
    deploymentInformer.AddEventHandler(cache.ResourceEventHandlerFuncs{
        AddFunc:    controller.handleAdd,
        UpdateFunc: controller.handleUpdate,
        DeleteFunc: controller.handleDelete,
    })
    
    return controller
}

func (c *DeploymentController) handleAdd(obj interface{}) {
    deployment := obj.(*appsv1.Deployment)
    fmt.Printf("Deployment ADDED: %s/%s\n", deployment.Namespace, deployment.Name)
    c.enqueue(deployment)
}

func (c *DeploymentController) handleUpdate(oldObj, newObj interface{}) {
    deployment := newObj.(*appsv1.Deployment)
    fmt.Printf("Deployment UPDATED: %s/%s\n", deployment.Namespace, deployment.Name)
    c.enqueue(deployment)
}

func (c *DeploymentController) handleDelete(obj interface{}) {
    deployment := obj.(*appsv1.Deployment)
    fmt.Printf("Deployment DELETED: %s/%s\n", deployment.Namespace, deployment.Name)
}

func (c *DeploymentController) enqueue(deployment *appsv1.Deployment) {
    key := fmt.Sprintf("%s/%s", deployment.Namespace, deployment.Name)
    c.workqueue <- key
}

func (c *DeploymentController) Run(stopCh <-chan struct{}) {
    defer close(c.workqueue)
    
    // Start the informer
    go c.deploymentInformer.Run(stopCh)
    
    // Wait for cache sync
    if !cache.WaitForCacheSync(stopCh, c.deploymentInformer.HasSynced) {
        fmt.Println("Failed to sync cache")
        return
    }
    
    // Start worker goroutines
    for i := 0; i < 4; i++ {
        go c.worker()
    }
    
    <-stopCh
}

func (c *DeploymentController) worker() {
    for key := range c.workqueue {
        c.processDeployment(key)
    }
}

func (c *DeploymentController) processDeployment(key string) {
    namespace, name, err := cache.SplitMetaNamespaceKey(key)
    if err != nil {
        fmt.Printf("Error parsing key %s: %v\n", key, err)
        return
    }
    
    // Get deployment from cache
    obj, exists, err := c.deploymentInformer.GetIndexer().GetByKey(key)
    if err != nil {
        fmt.Printf("Error getting deployment %s: %v\n", key, err)
        return
    }
    
    if !exists {
        fmt.Printf("Deployment %s no longer exists\n", key)
        return
    }
    
    deployment := obj.(*appsv1.Deployment)
    
    // Reconcile deployment - ensure ReplicaSet exists and has correct spec
    err = c.reconcileDeployment(deployment)
    if err != nil {
        fmt.Printf("Error reconciling deployment %s/%s: %v\n", namespace, name, err)
    }
}

func (c *DeploymentController) reconcileDeployment(deployment *appsv1.Deployment) error {
    // This is where the real controller logic would go
    // 1. Check if ReplicaSet exists for this deployment
    // 2. Create or update ReplicaSet to match deployment spec
    // 3. Handle rolling updates
    // 4. Update deployment status
    
    fmt.Printf("Reconciling deployment %s/%s (replicas: %d)\n", 
        deployment.Namespace, deployment.Name, *deployment.Spec.Replicas)
    
    return nil
}
```

### Controller Manager Configuration

#### Controller Manager Setup
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: kube-controller-manager
  namespace: kube-system
spec:
  containers:
  - name: kube-controller-manager
    image: k8s.gcr.io/kube-controller-manager:v1.28.0
    command:
    - kube-controller-manager
    
    # Basic configuration
    - --bind-address=127.0.0.1
    - --secure-port=10257
    - --port=0  # Disable insecure port
    
    # Cluster configuration
    - --kubeconfig=/etc/kubernetes/controller-manager.conf
    - --authentication-kubeconfig=/etc/kubernetes/controller-manager.conf
    - --authorization-kubeconfig=/etc/kubernetes/controller-manager.conf
    - --client-ca-file=/etc/kubernetes/pki/ca.crt
    - --requestheader-client-ca-file=/etc/kubernetes/pki/front-proxy-ca.crt
    
    # Controller configuration
    - --controllers=*,bootstrapsigner,tokencleaner
    - --leader-elect=true
    - --leader-elect-lease-duration=15s
    - --leader-elect-renew-deadline=10s
    - --leader-elect-retry-period=2s
    
    # Node controller
    - --node-monitor-period=5s
    - --node-monitor-grace-period=40s
    - --pod-eviction-timeout=5m0s
    - --unhealthy-zone-threshold=0.55
    
    # Service account controller
    - --service-account-private-key-file=/etc/kubernetes/pki/sa.key
    - --root-ca-file=/etc/kubernetes/pki/ca.crt
    
    # Resource quotas and limits
    - --concurrent-deployment-syncs=5
    - --concurrent-replicaset-syncs=5
    - --concurrent-resource-quota-syncs=5
    - --concurrent-serviceaccount-token-syncs=5
    
    # Garbage collection
    - --enable-garbage-collector=true
    - --concurrent-gc-syncs=20
    
    # Feature gates
    - --feature-gates=RotateKubeletServerCertificate=true
    
    ports:
    - containerPort: 10257
      name: https
    
    volumeMounts:
    - name: k8s-certs
      mountPath: /etc/kubernetes/pki
      readOnly: true
    - name: kubeconfig
      mountPath: /etc/kubernetes/controller-manager.conf
      readOnly: true
    
    resources:
      requests:
        cpu: 200m
        memory: 512Mi
      limits:
        cpu: 1000m
        memory: 1Gi
    
    livenessProbe:
      httpGet:
        host: 127.0.0.1
        path: /healthz
        port: 10257
        scheme: HTTPS
      initialDelaySeconds: 15
      timeoutSeconds: 15
    
    startupProbe:
      httpGet:
        host: 127.0.0.1
        path: /healthz
        port: 10257
        scheme: HTTPS
      initialDelaySeconds: 10
      periodSeconds: 10
      timeoutSeconds: 15
      failureThreshold: 24
  
  volumes:
  - name: k8s-certs
    hostPath:
      path: /etc/kubernetes/pki
      type: DirectoryOrCreate
  - name: kubeconfig
    hostPath:
      path: /etc/kubernetes/controller-manager.conf
      type: FileOrCreate
```

### Node Controller Deep Dive

#### Node Lifecycle Management
```go
// Simplified node controller logic
func (nc *NodeController) syncNode(node *v1.Node) error {
    // Check node conditions
    ready := false
    for _, condition := range node.Status.Conditions {
        if condition.Type == v1.NodeReady {
            ready = (condition.Status == v1.ConditionTrue)
            break
        }
    }
    
    if !ready {
        // Node is not ready
        timeSinceLastHeartbeat := time.Since(condition.LastHeartbeatTime.Time)
        
        if timeSinceLastHeartbeat > nc.PodEvictionTimeout {
            // Node has been not ready for too long, evict pods
            return nc.evictPodsFromNode(node)
        }
        
        // Add NoSchedule taint to prevent new pods
        return nc.addNoScheduleTaint(node)
    } else {
        // Node is ready, remove NoSchedule taint
        return nc.removeNoScheduleTaint(node)
    }
}

func (nc *NodeController) evictPodsFromNode(node *v1.Node) error {
    pods, err := nc.getPodsOnNode(node.Name)
    if err != nil {
        return err
    }
    
    for _, pod := range pods {
        // Create eviction object
        eviction := &policy.Eviction{
            ObjectMeta: metav1.ObjectMeta{
                Name:      pod.Name,
                Namespace: pod.Namespace,
            },
        }
        
        // Evict pod
        err := nc.clientset.PolicyV1().Evictions(pod.Namespace).Evict(context.TODO(), eviction)
        if err != nil {
            log.Printf("Failed to evict pod %s/%s: %v", pod.Namespace, pod.Name, err)
        }
    }
    
    return nil
}
```

## Cluster Autoscaling

### How Cluster Autoscaler Works

**Cluster Autoscaler** automatically adjusts the number of nodes in the cluster based on pod scheduling needs.

**Scaling Logic:**
- **Scale Up** - When pods can't be scheduled due to insufficient resources
- **Scale Down** - When nodes are underutilized for a period of time

#### Cluster Autoscaler Configuration
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cluster-autoscaler
  template:
    metadata:
      labels:
        app: cluster-autoscaler
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8085"
    spec:
      serviceAccountName: cluster-autoscaler
      tolerations:
      - effect: NoSchedule
        key: node-role.kubernetes.io/control-plane
      nodeSelector:
        node-role.kubernetes.io/control-plane: ""
      containers:
      - name: cluster-autoscaler
        image: k8s.gcr.io/autoscaling/cluster-autoscaler:v1.28.0
        command:
        - ./cluster-autoscaler
        - --v=4
        - --stderrthreshold=info
        - --cloud-provider=aws
        - --skip-nodes-with-local-storage=false
        - --expander=least-waste
        - --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/my-cluster
        - --balance-similar-node-groups
        - --skip-nodes-with-system-pods=false
        - --scale-down-enabled=true
        - --scale-down-delay-after-add=10m
        - --scale-down-unneeded-time=10m
        - --scale-down-utilization-threshold=0.5
        - --max-node-provision-time=15m
        
        env:
        - name: AWS_REGION
          value: us-west-2
        
        ports:
        - name: http
          containerPort: 8085
          protocol: TCP
        
        resources:
          requests:
            cpu: 100m
            memory: 300Mi
          limits:
            cpu: 100m
            memory: 300Mi
        
        volumeMounts:
        - name: ssl-certs
          mountPath: /etc/ssl/certs/ca-certificates.crt
          readOnly: true
      
      volumes:
      - name: ssl-certs
        hostPath:
          path: /etc/ssl/certs/ca-certificates.crt
```

#### AWS Auto Scaling Group Integration
```bash
# Tag ASG for cluster autoscaler discovery
aws autoscaling create-or-update-tags \
  --tags \
    ResourceId=my-cluster-worker-nodes \
    ResourceType=auto-scaling-group \
    Key=k8s.io/cluster-autoscaler/enabled \
    Value=true \
    PropagateAtLaunch=false \
  --tags \
    ResourceId=my-cluster-worker-nodes \
    ResourceType=auto-scaling-group \
    Key=k8s.io/cluster-autoscaler/my-cluster \
    Value=owned \
    PropagateAtLaunch=false
```

## Key Concepts Summary
- **API Server** - Central hub handling all cluster operations, authentication, authorization, and etcd communication
- **etcd** - Distributed key-value store containing all cluster state and configuration data
- **kubelet** - Node agent managing pod lifecycle, container runtime communication, and resource monitoring
- **Scheduler** - Assigns pods to nodes based on resource requirements, constraints, and policies
- **Controller Manager** - Runs controllers that maintain desired cluster state through reconciliation loops
- **Container Runtime** - Actually runs containers (containerd, CRI-O) communicating via CRI
- **Watch API** - Real-time notification mechanism allowing components to react to state changes
- **Leader Election** - Ensures only one instance of controllers runs in multi-master setups
- **Node Registration** - Process by which kubelet joins nodes to the cluster
- **Cluster Autoscaling** - Automatic adjustment of cluster size based on workload demands

## Best Practices / Tips

1. **Monitor control plane health** - Use health check endpoints and metrics
2. **Backup etcd regularly** - Automated snapshots with proper retention policies
3. **Secure component communication** - Use TLS certificates for all inter-component communication
4. **Resource reservations** - Reserve CPU/memory for system components on nodes
5. **High availability** - Run multiple control plane replicas across availability zones
6. **Version consistency** - Keep all cluster components at compatible versions
7. **Audit logging** - Enable comprehensive audit logs for security and compliance
8. **Monitor resource usage** - Track API server, etcd, and kubelet resource consumption
9. **Certificate rotation** - Implement automatic certificate renewal
10. **Disaster recovery planning** - Document and test cluster recovery procedures

## Common Issues / Troubleshooting

### Problem 1: API Server Not Responding
- **Symptom:** kubectl commands timeout or fail
- **Cause:** API server overload, etcd issues, or certificate problems
- **Solution:** Check API server logs, etcd health, and certificate validity

```bash
# Check API server health
curl -k https://127.0.0.1:6443/healthz

# Check etcd cluster health
ETCDCTL_API=3 etcdctl endpoint health

# Check certificates
openssl x509 -in /etc/kubernetes/pki/apiserver.crt -text -noout
```

### Problem 2: Nodes Not Ready
- **Symptom:** Nodes show NotReady status
- **Cause:** kubelet issues, container runtime problems, or network connectivity
- **Solution:** Check kubelet logs and container runtime status

```bash
# Check node status
kubectl describe node node-name

# Check kubelet logs
journalctl -u kubelet -f

# Check container runtime
systemctl status containerd
crictl info
```

### Problem 3: Pods Stuck in Pending
- **Symptom:** Pods remain in Pending state
- **Cause:** Scheduling constraints, resource shortages, or node taints
- **Solution:** Check scheduler logs and pod events

```bash
# Check pod events
kubectl describe pod pod-name

# Check scheduler logs
kubectl logs -n kube-system kube-scheduler-master

# Check node resources
kubectl top nodes
```

### Problem 4: etcd Performance Issues
- **Symptom:** Slow API responses, high latency
- **Cause:** Disk I/O bottlenecks, network issues, or large objects
- **Solution:** Monitor etcd metrics and optimize storage

```bash
# Check etcd metrics
curl http://127.0.0.1:2381/metrics

# Check etcd logs
journalctl -u etcd -f

# Monitor disk I/O
iostat -x 1
```

### Problem 5: Controller Manager Not Working
- **Symptom:** Resources not being reconciled properly
- **Cause:** Leader election issues, RBAC problems, or controller crashes
- **Solution:** Check controller manager logs and leader election

```bash
# Check controller manager logs
kubectl logs -n kube-system kube-controller-manager-master

# Check leader election
kubectl get leases -n kube-system

# Check RBAC permissions
kubectl auth can-i "*" "*" --as=system:kube-controller-manager
```

## References / Further Reading
- [Kubernetes Components Documentation](https://kubernetes.io/docs/concepts/overview/components/)
- [API Server Deep Dive](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/)
- [etcd Operations Guide](https://etcd.io/docs/v3.5/op-guide/)
- [kubelet Configuration](https://kubernetes.io/docs/reference/config-file/kubelet-config.v1beta1/)
- [Scheduler Configuration](https://kubernetes.io/docs/reference/config-file/kube-scheduler-config.v1beta3/)
- [Controller Patterns](https://kubernetes.io/docs/concepts/architecture/controller/)
- [Cluster Autoscaler Documentation](https://github.com/kubernetes/autoscaler/tree/master/cluster-autoscaler)
- [Kubernetes API Concepts](https://kubernetes.io/docs/reference/using-api/api-concepts/)
- [CRI Specification](https://github.com/kubernetes/cri-api)