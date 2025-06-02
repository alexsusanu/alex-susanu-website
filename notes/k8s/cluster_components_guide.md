# Cluster Components - Comprehensive Study Guide
category: Kubernetes Certification
tags: cka, kubernetes, exam, kubectl, certification

## WHY Cluster Components Matter (Conceptual Foundation)

### The Kubernetes Control Plane as a Distributed System
Understanding cluster components is understanding **how Kubernetes actually works** - not just what it does:

- **Control Plane** = The brain of Kubernetes (decision makers)
- **Data Plane** = The workers executing decisions (kubelet, kube-proxy)
- **Distributed Consensus** = How multiple masters coordinate (etcd + raft)
- **Event-Driven Architecture** = Components react to state changes
- **Reconciliation Loops** = Continuous convergence toward desired state

### Exam Context: Why Component Mastery is Critical
- **Troubleshooting cluster issues** - 40% of advanced problems stem from component failures
- **Backup/restore scenarios** - etcd operations are common exam tasks
- **Performance optimization** - understanding bottlenecks and resource allocation
- **Security hardening** - component configuration affects cluster security
- **Multi-master setups** - HA cluster design and troubleshooting

**Key Insight**: Every kubectl command, every pod creation, every service discovery - it all flows through these components in predictable patterns.

---

## Kubernetes Architecture Overview

### Control Plane vs Data Plane
```
┌─────────────────────────────────────────────────────────────┐
│                    CONTROL PLANE                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │kube-apiserver│ │    etcd     │ │  kube-controller-mgr   ││
│  │             │ │             │ │                         ││
│  │   Gateway   │ │ State Store │ │   Reconciliation        ││
│  └─────────────┘ └─────────────┘ └─────────────────────────┘│
│                   ┌─────────────┐                          │
│                   │kube-scheduler│                          │
│                   │             │                          │
│                   │  Placement  │                          │
│                   └─────────────┘                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     DATA PLANE                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │   kubelet   │ │ kube-proxy  │ │   Container Runtime     ││
│  │             │ │             │ │                         ││
│  │ Node Agent  │ │  Networking │ │  Docker/containerd/CRI  ││
│  └─────────────┘ └─────────────┘ └─────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow
```
1. User/kubectl → kube-apiserver (REST API)
2. kube-apiserver → etcd (store state)
3. kube-scheduler watches → apiserver (new pods)
4. kube-scheduler → apiserver (pod binding)
5. kubelet watches → apiserver (assigned pods)
6. kubelet → container runtime (create containers)
7. controllers watch → apiserver (desired state)
8. controllers → apiserver (reconciliation actions)
```

**Conceptual Insight**: All components communicate through the API server - it's the **single source of truth** and **communication hub**.

---

## kube-apiserver: The Gateway and State Manager

### What kube-apiserver Does (Conceptual)
The API server is the **front door** to Kubernetes and the **state management engine**:

- **REST API Gateway** - Exposes Kubernetes API over HTTPS
- **Authentication & Authorization** - Who can do what to which resources
- **Admission Control** - Policy enforcement and resource validation
- **State Persistence** - Coordinates with etcd for data storage
- **Watch/Event Mechanism** - Notifies clients of state changes
- **API Versioning** - Manages multiple API versions simultaneously

### API Server Architecture
```yaml
# API Server Request Flow
┌──────────────┐    ┌─────────────────┐    ┌────────────────┐
│   kubectl    │───▶│  Authentication │───▶│  Authorization │
│              │    │  (who are you?) │    │ (what can you  │
│              │    │                 │    │    do?)       │
└──────────────┘    └─────────────────┘    └────────────────┘
                                                   │
                    ┌─────────────────┐           ▼
                    │      etcd       │    ┌────────────────┐
                    │   (persistence) │◀───│ Admission      │
                    │                 │    │ Controllers    │
                    └─────────────────┘    │ (policy &      │
                                          │  validation)   │
                                          └────────────────┘
```

### API Server Configuration Examples

#### Static Pod Manifest (kubeadm clusters)
```yaml
# /etc/kubernetes/manifests/kube-apiserver.yaml
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
    - --advertise-address=192.168.1.100
    - --etcd-servers=https://127.0.0.1:2379
    - --etcd-cafile=/etc/kubernetes/pki/etcd/ca.crt
    - --etcd-certfile=/etc/kubernetes/pki/apiserver-etcd-client.crt
    - --etcd-keyfile=/etc/kubernetes/pki/apiserver-etcd-client.key
    - --client-ca-file=/etc/kubernetes/pki/ca.crt
    - --tls-cert-file=/etc/kubernetes/pki/apiserver.crt
    - --tls-private-key-file=/etc/kubernetes/pki/apiserver.key
    - --secure-port=6443
    - --allow-privileged=true
    - --authorization-mode=Node,RBAC
    - --enable-admission-plugins=NodeRestriction
    - --service-cluster-ip-range=10.96.0.0/12
    - --service-account-key-file=/etc/kubernetes/pki/sa.pub
    - --service-account-signing-key-file=/etc/kubernetes/pki/sa.key
    - --service-account-issuer=https://kubernetes.default.svc.cluster.local
    ports:
    - containerPort: 6443
      hostPort: 6443
      name: https
    volumeMounts:
    - mountPath: /etc/kubernetes/pki
      name: k8s-certs
      readOnly: true
    - mountPath: /etc/ca-certificates
      name: ca-certs
      readOnly: true
  volumes:
  - hostPath:
      path: /etc/kubernetes/pki
      type: DirectoryOrCreate
    name: k8s-certs
  - hostPath:
      path: /etc/ca-certificates
      type: DirectoryOrCreate
    name: ca-certs
```

### Critical API Server Parameters

#### Security Configuration
```bash
# Authentication methods
--client-ca-file=/path/to/ca.crt                    # Client certificate CA
--oidc-issuer-url=https://accounts.google.com       # OIDC provider
--basic-auth-file=/path/to/basic-auth.csv           # Basic auth (deprecated)

# Authorization modes (processed in order)
--authorization-mode=Node,RBAC,ABAC,Webhook         # Multiple modes
--authorization-policy-file=/path/to/policy.json    # ABAC policy

# Admission controllers (order matters!)
--enable-admission-plugins=NodeRestriction,PodSecurityPolicy,LimitRanger
--disable-admission-plugins=DefaultStorageClass
```

#### Networking and Service Configuration
```bash
# Service network configuration
--service-cluster-ip-range=10.96.0.0/12             # ClusterIP range
--service-node-port-range=30000-32767               # NodePort range

# API server networking
--advertise-address=192.168.1.100                   # External API server IP
--bind-address=0.0.0.0                              # Listen on all interfaces
--secure-port=6443                                  # HTTPS port
--insecure-port=0                                   # Disable HTTP (secure default)
```

### Troubleshooting API Server Issues

#### Common Problems and Diagnostics
```bash
# Check API server status
kubectl get componentstatus
kubectl get --raw='/healthz'
kubectl get --raw='/metrics' | grep apiserver

# API server logs (static pod)
kubectl logs -n kube-system kube-apiserver-master-node

# Direct systemd service (non-kubeadm)
sudo journalctl -u kube-apiserver -f

# Check API server connectivity
curl -k https://localhost:6443/healthz
openssl s_client -connect localhost:6443 -showcerts
```

#### Performance Monitoring
```bash
# API server request metrics
kubectl get --raw='/metrics' | grep 'apiserver_request_total'
kubectl get --raw='/metrics' | grep 'apiserver_request_duration'

# etcd interaction metrics
kubectl get --raw='/metrics' | grep 'etcd_request_duration'

# Check API server resource usage
kubectl top pods -n kube-system | grep apiserver
```

**Gotcha**: API server restarts cause brief cluster unavailability. Always check logs for certificate expiration, etcd connectivity issues, or resource exhaustion.

---

## etcd: The Cluster State Database

### What etcd Does (Conceptual)
etcd is the **single source of truth** for all cluster state:

- **Distributed Key-Value Store** - Stores all Kubernetes objects
- **Raft Consensus Algorithm** - Ensures data consistency across replicas
- **Watch Mechanism** - Notifies clients of data changes
- **ACID Transactions** - Ensures data integrity
- **Strong Consistency** - Read-after-write consistency guaranteed

### etcd Architecture and Data Model
```
┌─────────────────────────────────────────────────────────────┐
│                    etcd Cluster                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │    etcd-1   │ │    etcd-2   │ │        etcd-3           ││
│  │   (leader)  │ │ (follower)  │ │     (follower)          ││
│  │             │ │             │ │                         ││
│  └─────────────┘ └─────────────┘ └─────────────────────────┘│
│         │               │                      │           │
│         └───────────────┼──────────────────────┘           │
│                         │                                  │
│              ┌─────────────────┐                           │
│              │  Raft Consensus │                           │
│              │   Protocol      │                           │
│              └─────────────────┘                           │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
              ┌─────────────────┐
              │  kube-apiserver │
              │                 │
              └─────────────────┘
```

### etcd Data Organization
```bash
# Kubernetes data structure in etcd
/registry/
├── pods/default/
│   ├── web-pod-12345
│   └── api-pod-67890
├── services/default/
│   ├── kubernetes
│   └── web-service
├── deployments/default/
│   └── web-deployment
├── secrets/default/
│   └── app-secret
└── configmaps/kube-system/
    └── cluster-info
```

### etcd Configuration and Management

#### etcd Static Pod Configuration
```yaml
# /etc/kubernetes/manifests/etcd.yaml
apiVersion: v1
kind: Pod
metadata:
  name: etcd
  namespace: kube-system
spec:
  containers:
  - name: etcd
    image: k8s.gcr.io/etcd:3.5.7-0
    command:
    - etcd
    - --name=master-node
    - --data-dir=/var/lib/etcd
    - --listen-client-urls=https://127.0.0.1:2379,https://192.168.1.100:2379
    - --advertise-client-urls=https://192.168.1.100:2379
    - --listen-peer-urls=https://192.168.1.100:2380
    - --initial-advertise-peer-urls=https://192.168.1.100:2380
    - --cert-file=/etc/kubernetes/pki/etcd/server.crt
    - --key-file=/etc/kubernetes/pki/etcd/server.key
    - --trusted-ca-file=/etc/kubernetes/pki/etcd/ca.crt
    - --client-cert-auth=true
    - --peer-cert-file=/etc/kubernetes/pki/etcd/peer.crt
    - --peer-key-file=/etc/kubernetes/pki/etcd/peer.key
    - --peer-trusted-ca-file=/etc/kubernetes/pki/etcd/ca.crt
    - --peer-client-cert-auth=true
    - --snapshot-count=10000
    - --quota-backend-bytes=8589934592  # 8GB
    volumeMounts:
    - mountPath: /var/lib/etcd
      name: etcd-data
    - mountPath: /etc/kubernetes/pki/etcd
      name: etcd-certs
  volumes:
  - hostPath:
      path: /var/lib/etcd
      type: DirectoryOrCreate
    name: etcd-data
  - hostPath:
      path: /etc/kubernetes/pki/etcd
      type: DirectoryOrCreate
    name: etcd-certs
```

### etcd Operations and Management

#### Basic etcd Interactions
```bash
# etcdctl setup (v3 API)
export ETCDCTL_API=3
export ETCDCTL_ENDPOINTS=https://127.0.0.1:2379
export ETCDCTL_CACERT=/etc/kubernetes/pki/etcd/ca.crt
export ETCDCTL_CERT=/etc/kubernetes/pki/etcd/server.crt
export ETCDCTL_KEY=/etc/kubernetes/pki/etcd/server.key

# Check etcd cluster health
etcdctl endpoint health
etcdctl endpoint status --write-out=table

# List all keys (Kubernetes objects)
etcdctl get --prefix --keys-only /registry/

# Get specific object data
etcdctl get /registry/pods/default/web-pod --print-value-only

# Watch for changes (useful for debugging)
etcdctl watch --prefix /registry/pods/
```

#### etcd Backup and Restore (Critical Exam Skill)
```bash
# Create snapshot backup
ETCDCTL_API=3 etcdctl snapshot save /backup/etcd-snapshot-$(date +%Y%m%d-%H%M%S).db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key

# Verify snapshot
etcdctl snapshot status /backup/etcd-snapshot.db --write-out=table

# Restore from snapshot (DESTRUCTIVE - stops cluster)
# 1. Stop kube-apiserver
sudo mv /etc/kubernetes/manifests/kube-apiserver.yaml /tmp/

# 2. Stop etcd
sudo mv /etc/kubernetes/manifests/etcd.yaml /tmp/

# 3. Restore data
sudo rm -rf /var/lib/etcd
ETCDCTL_API=3 etcdctl snapshot restore /backup/etcd-snapshot.db \
  --data-dir=/var/lib/etcd \
  --name=master-node \
  --initial-cluster=master-node=https://192.168.1.100:2380 \
  --initial-advertise-peer-urls=https://192.168.1.100:2380

# 4. Fix ownership
sudo chown -R etcd:etcd /var/lib/etcd

# 5. Restart etcd and apiserver
sudo mv /tmp/etcd.yaml /etc/kubernetes/manifests/
sudo mv /tmp/kube-apiserver.yaml /etc/kubernetes/manifests/
```

### etcd Performance and Monitoring
```bash
# Check etcd performance metrics
etcdctl endpoint status --write-out=table
etcdctl endpoint hashkv --write-out=table

# Monitor etcd logs
kubectl logs -n kube-system etcd-master-node

# Check disk usage and performance
df -h /var/lib/etcd
iostat -x 1 5  # Monitor disk I/O

# etcd compaction (manage history)
etcdctl compact $(etcdctl endpoint status --write-out="json" | jq -r '.[] | .Status.header.revision')
etcdctl defrag --endpoints=$ETCDCTL_ENDPOINTS
```

**Critical Gotcha**: etcd needs low-latency storage (SSD recommended). Network partitions can cause split-brain - always use odd numbers of nodes (3, 5, 7) for HA.

---

## kube-scheduler: The Pod Placement Engine

### What kube-scheduler Does (Conceptual)
The scheduler is the **placement intelligence** of Kubernetes:

- **Resource Awareness** - Considers CPU, memory, storage requirements
- **Constraint Satisfaction** - Node selectors, affinity, anti-affinity
- **Load Balancing** - Distributes workloads across nodes
- **Policy Enforcement** - Custom scheduling policies and priorities
- **Future Resource Planning** - Considers pending resource requests

### Scheduling Process Flow
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Pod Created     │───▶│ Scheduler       │───▶│ Node Selected   │
│ (Unscheduled)   │    │ Filtering &     │    │ (Pod Binding)   │
│ spec.nodeName   │    │ Scoring         │    │ spec.nodeName   │
│ is empty        │    │                 │    │ = "worker-2"    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Watch apiserver │    │ Filter Nodes    │    │ kubelet Pulls   │
│ for new pods    │    │ • Resources     │    │ Pod & Starts    │
│ with no node    │    │ • Constraints   │    │ Containers      │
│                 │    │ • Policies      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Scheduler Configuration

#### kube-scheduler Static Pod
```yaml
# /etc/kubernetes/manifests/kube-scheduler.yaml
apiVersion: v1
kind: Pod
metadata:
  name: kube-scheduler
  namespace: kube-system
spec:
  containers:
  - name: kube-scheduler
    image: k8s.gcr.io/kube-scheduler:v1.28.0
    command:
    - kube-scheduler
    - --authentication-kubeconfig=/etc/kubernetes/scheduler.conf
    - --authorization-kubeconfig=/etc/kubernetes/scheduler.conf
    - --bind-address=127.0.0.1
    - --kubeconfig=/etc/kubernetes/scheduler.conf
    - --leader-elect=true
    - --port=0  # Disable insecure port
    - --secure-port=10259
    - --config=/etc/kubernetes/scheduler-config.yaml  # Custom config
    volumeMounts:
    - mountPath: /etc/kubernetes/scheduler.conf
      name: kubeconfig
      readOnly: true
    - mountPath: /etc/kubernetes/scheduler-config.yaml
      name: config
      readOnly: true
  volumes:
  - hostPath:
      path: /etc/kubernetes/scheduler.conf
      type: FileOrCreate
    name: kubeconfig
  - hostPath:
      path: /etc/kubernetes/scheduler-config.yaml
      type: FileOrCreate
    name: config
```

#### Custom Scheduler Configuration
```yaml
# scheduler-config.yaml
apiVersion: kubescheduler.config.k8s.io/v1beta3
kind: KubeSchedulerConfiguration
profiles:
- schedulerName: default-scheduler
  plugins:
    score:
      enabled:
      - name: NodeResourcesFit
      - name: NodeAffinity
      - name: PodTopologySpread
    filter:
      enabled:
      - name: NodeResourcesFilter
      - name: NodeAffinity
      - name: PodTopologySpread
  pluginConfig:
  - name: NodeResourcesFit
    args:
      scoringStrategy:
        type: LeastAllocated  # Prefer nodes with more available resources
```

### Scheduling Constraints and Policies

#### Node Selection and Affinity
```yaml
# Node selector (simple)
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
spec:
  nodeSelector:
    accelerator: nvidia-tesla-k80
  containers:
  - name: gpu-app
    image: tensorflow/tensorflow:latest-gpu
---
# Node affinity (advanced)
apiVersion: v1
kind: Pod
metadata:
  name: affinity-pod
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: kubernetes.io/arch
            operator: In
            values:
            - amd64
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 1
        preference:
          matchExpressions:
          - key: instance-type
            operator: In
            values:
            - m5.large
  containers:
  - name: app
    image: nginx
```

#### Pod Affinity and Anti-Affinity
```yaml
# Pod anti-affinity (avoid co-location)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - web
            topologyKey: kubernetes.io/hostname  # Different nodes
      containers:
      - name: web
        image: nginx
```

#### Taints and Tolerations
```bash
# Add taint to node (repel pods)
kubectl taint nodes worker-1 special=true:NoSchedule

# Remove taint
kubectl taint nodes worker-1 special=true:NoSchedule-

# Pod with toleration
apiVersion: v1
kind: Pod
metadata:
  name: tolerant-pod
spec:
  tolerations:
  - key: "special"
    operator: "Equal"
    value: "true"
    effect: "NoSchedule"
  containers:
  - name: app
    image: nginx
```

### Scheduler Troubleshooting

#### Debugging Scheduling Issues
```bash
# Check scheduler status
kubectl get componentstatus
kubectl get events --sort-by='.lastTimestamp' | grep -i schedul

# Pod scheduling status
kubectl describe pod pending-pod
# Look for: "Events:" section with scheduling failures

# Scheduler logs
kubectl logs -n kube-system kube-scheduler-master-node

# Node capacity and allocations
kubectl describe nodes
kubectl top nodes
```

#### Common Scheduling Problems
```bash
# Insufficient resources
kubectl describe node worker-1 | grep -A 5 "Allocated resources"

# Taints preventing scheduling
kubectl describe node worker-1 | grep -A 5 "Taints"

# Pod affinity conflicts
kubectl get pods -o wide --all-namespaces | grep -v Running
```

**Exam Tip**: Always check `kubectl describe pod` for scheduling failures. The Events section shows exactly why a pod couldn't be scheduled.

---

## kube-controller-manager: The Reconciliation Engine

### What kube-controller-manager Does (Conceptual)
The controller manager runs the **reconciliation loops** that make Kubernetes work:

- **Desired State Monitoring** - Watches API server for object changes
- **Current State Assessment** - Compares actual vs desired state
- **Corrective Actions** - Takes steps to achieve desired state
- **Multiple Controllers** - Manages different resource types independently
- **Event Generation** - Creates events for troubleshooting

### Controller Architecture
```
┌─────────────────────────────────────────────────────────────┐
│              kube-controller-manager                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │ Deployment  │ │  ReplicaSet │ │     Node Controller     ││
│  │ Controller  │ │ Controller  │ │                         ││
│  └─────────────┘ └─────────────┘ └─────────────────────────┘│
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │ Service     │ │ Endpoint    │ │  Namespace Controller   ││
│  │ Controller  │ │ Controller  │ │                         ││
│  └─────────────┘ └─────────────┘ └─────────────────────────┘│
│                              └──────▲──────┘                │
└──────────────────────────────────────┼──────────────────────┘
                                       │
                    ┌─────────────────────────────────┐
                    │         API Server              │
                    │    (Watch & Update Objects)     │
                    └─────────────────────────────────┘
```

### Controller Manager Configuration
```yaml
# /etc/kubernetes/manifests/kube-controller-manager.yaml
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
    - --authentication-kubeconfig=/etc/kubernetes/controller-manager.conf
    - --authorization-kubeconfig=/etc/kubernetes/controller-manager.conf
    - --bind-address=127.0.0.1
    - --kubeconfig=/etc/kubernetes/controller-manager.conf
    - --leader-elect=true
    - --port=0
    - --secure-port=10257
    - --cluster-cidr=10.244.0.0/16        # Pod network CIDR
    - --service-cluster-ip-range=10.96.0.0/12  # Service network
    - --cluster-name=kubernetes
    - --root-ca-file=/etc/kubernetes/pki/ca.crt
    - --service-account-private-key-file=/etc/kubernetes/pki/sa.key
    - --use-service-account-credentials=true
    - --controllers=*,bootstrapsigner,tokencleaner  # Enable all controllers
    volumeMounts:
    - mountPath: /etc/kubernetes/controller-manager.conf
      name: kubeconfig
      readOnly: true
    - mountPath: /etc/kubernetes/pki
      name: k8s-certs
      readOnly: true
```

### Key Controllers and Their Functions

#### Deployment Controller
```bash
# Controls the lifecycle of ReplicaSets
# Handles rolling updates, rollbacks, scaling

# Example reconciliation loop:
# 1. Watch for Deployment changes
# 2. Create/update ReplicaSet with new pod template
# 3. Gradually scale down old ReplicaSet
# 4. Gradually scale up new ReplicaSet
# 5. Update Deployment status
```

#### ReplicaSet Controller
```bash
# Ensures desired number of pod replicas
# Creates/deletes pods to match spec.replicas

# Reconciliation logic:
# Current pods = kubectl get pods -l app=web | wc -l
# Desired pods = deployment.spec.replicas
# If current < desired: create new pods
# If current > desired: delete excess pods
```

#### Node Controller
```bash
# Monitors node health and manages node lifecycle
# Handles node cordoning, draining, and pod eviction

# Node conditions monitored:
# - Ready: kubelet is healthy and ready to accept pods
# - MemoryPressure: node has memory pressure
# - DiskPressure: node has disk pressure
# - PIDPressure: node has PID pressure
# - NetworkUnavailable: node network is unavailable
```

### Controller Troubleshooting

#### Debugging Controller Issues
```bash
# Check controller manager status
kubectl get componentstatus
kubectl logs -n kube-system kube-controller-manager-master-node

# Check specific controller behavior
kubectl get events --sort-by='.lastTimestamp' | grep -i replicaset
kubectl get events --sort-by='.lastTimestamp' | grep -i deployment

# Monitor controller metrics
kubectl get --raw='/metrics' | grep 'controller_manager'
```

#### Common Controller Problems
```bash
# ReplicaSet not creating pods (check resources)
kubectl describe rs my-replicaset
kubectl describe nodes | grep -A 5 "Allocated resources"

# Deployment stuck in rollout
kubectl rollout status deployment/my-deployment
kubectl rollout history deployment/my-deployment

# Service endpoints not updating
kubectl get endpoints my-service
kubectl describe service my-service
```

**Controller Insight**: Each controller runs an independent reconciliation loop. Understanding which controller manages which resource type is crucial for troubleshooting.

---

## Component Interactions and Dependencies

### Startup Dependencies
```
1. etcd must start first (data store)
2. kube-apiserver starts (needs etcd)
3. kube-controller-manager starts (needs apiserver)
4. kube-scheduler starts (needs apiserver)
5. kubelet starts on nodes (needs apiserver)
6. kube-proxy starts on nodes (needs apiserver)
```

### Communication Patterns
```bash
# All components authenticate to API server via:
# - Client certificates
# - Service account tokens
# - Kubeconfig files

# API server connects to etcd via:
# - Mutual TLS (mTLS)
# - Client certificates

# Controllers and scheduler use:
# - Watch API for efficient event notifications
# - Leader election for HA deployments
```

### High Availability Considerations
```yaml
# Multi-master setup requires:
# 1. External etcd cluster (3+ nodes)
# 2. Load balancer for API servers
# 3. Shared storage for certificates
# 4. Leader election for controllers/scheduler

# Example HA configuration:
# - etcd-1, etcd-2, etcd-3 (separate nodes)
# - master-1, master-2, master-3 (API servers)
# - Load balancer: 192.168.1.10:6443 → masters
```

---

## Cluster Component Health Monitoring

### Health Check Commands
```bash
# Overall cluster health
kubectl get componentstatus
kubectl cluster-info
kubectl get nodes

# Individual component health
kubectl get --raw='/healthz'
kubectl get --raw='/readyz'
kubectl get --raw='/livez'

# Component-specific health
kubectl get --raw='/healthz/etcd'
kubectl get --raw='/healthz/poststarthook/generic-apiserver-start-informers'
```

### Monitoring and Alerting
```bash
# Critical metrics to monitor:
# - API server response time and error rate
# - etcd latency and space usage
# - Scheduler queue depth
# - Controller loop duration

# Log locations (systemd)
sudo journalctl -u kubelet -f
sudo journalctl -u kube-proxy -f

# Log locations (static pods)
kubectl logs -n kube-system kube-apiserver-master
kubectl logs -n kube-system etcd-master
kubectl logs -n kube-system kube-scheduler-master
kubectl logs -n kube-system kube-controller-manager-master
```

---

## Exam-Specific Component Tasks

### Common Exam Scenarios
1. **etcd backup/restore** - Critical skill, often tested
2. **Component troubleshooting** - Diagnose why cluster is unhealthy
3. **Certificate management** - Renew or fix certificate issues
4. **Scheduler configuration** - Custom scheduling policies
5. **Controller parameter tuning** - Adjust reconciliation behavior

### Quick Diagnostic Workflow
```bash
# 1. Check overall cluster health
kubectl get componentstatus
kubectl get nodes

# 2. Check component logs
kubectl logs -n kube-system <component-pod>

# 3. Check component configuration
ls -la /etc/kubernetes/manifests/
cat /etc/kubernetes/manifests/kube-apiserver.yaml

# 4. Check certificates
openssl x509 -in /etc/kubernetes/pki/apiserver.crt -text -noout | grep -A 2 Validity

# 5. Check networking
netstat -tlnp | grep 6443  # API server
netstat -tlnp | grep 2379  # etcd client
netstat -tlnp | grep 2380  # etcd peer
```

---

## Conceptual Mastery Checklist

✅ **Understand component roles and interactions in the distributed system**
✅ **Know the API server as the single communication hub**
✅ **Master etcd as the source of truth and backup/restore procedures**
✅ **Comprehend scheduler filtering and scoring algorithms**
✅ **Internalize controller reconciliation loop patterns**
✅ **Practice component troubleshooting workflows**
✅ **Understand HA deployment patterns and failure scenarios**

---

*Understanding cluster components means understanding Kubernetes as a distributed system where each component has a specific role in maintaining desired state. The API server is the hub, etcd is the memory, scheduler is the brain for placement, and controllers are the hands that do the work.*