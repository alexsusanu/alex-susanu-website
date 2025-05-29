# Kubernetes Core Concepts
category: DevOps
tags: kubernetes, k8s, containers, orchestration, core-concepts

## Pod

**What it is:** The smallest deployable unit in Kubernetes, containing one or more containers that share storage and network resources.

**Why it matters:** Pods are the fundamental building block of Kubernetes. Every other Kubernetes object either creates, manages, or interacts with pods. Understanding pods is essential because everything else builds on this concept.

**Key characteristics:**
- **Shared network** - All containers in a pod share the same IP address and port space
- **Shared storage** - Volumes can be mounted and shared between containers in the pod
- **Ephemeral** - Pods are temporary; they can be created, destroyed, and recreated
- **Atomic unit** - All containers in a pod are scheduled together on the same node
- **Single responsibility** - Best practice is one main application container per pod

**Pod lifecycle:**
- **Pending** - Pod accepted but containers not yet created
- **Running** - Pod bound to node and at least one container is running
- **Succeeded** - All containers terminated successfully
- **Failed** - All containers terminated, at least one failed
- **Unknown** - Pod state cannot be determined

**Multi-container patterns:**
- **Sidecar** - Helper container (logging, monitoring)
- **Ambassador** - Proxy container for external communications
- **Adapter** - Transform container output for consumption

**Common commands:**
```bash
# Basic pod operations
kubectl get pods                              # List all pods
kubectl get pods -o wide                      # List pods with additional info
kubectl describe pod <pod-name>               # Detailed pod information
kubectl logs <pod-name>                       # View pod logs
kubectl logs <pod-name> -c <container-name>   # Logs from specific container
kubectl delete pod <pod-name>                 # Delete a pod

# Interactive operations
kubectl exec -it <pod-name> -- /bin/bash      # Shell into pod
kubectl exec -it <pod-name> -c <container> -- /bin/bash  # Shell into specific container
kubectl port-forward <pod-name> 8080:80       # Forward local port to pod

# Debugging
kubectl get pod <pod-name> -o yaml            # Get pod YAML definition
kubectl edit pod <pod-name>                   # Edit pod (limited changes allowed)
```

**Example Pod YAML:**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-pod
  labels:
    app: web
spec:
  containers:
  - name: web-container
    image: nginx:1.21
    ports:
    - containerPort: 80
    resources:
      limits:
        memory: "128Mi"
        cpu: "500m"
      requests:
        memory: "64Mi"
        cpu: "250m"
```

**When you'll use it:** Every Kubernetes deployment involves pods. You'll work with them daily for deployment, debugging, and maintenance.

## Container

**What it is:** A lightweight, standalone package that includes everything needed to run an application: code, runtime, system tools, libraries, and settings, running within a pod.

**Why it matters:** Containers provide consistent environments across different stages of development and deployment. In Kubernetes, containers are the actual workload that runs your applications.

**Container states in Kubernetes:**
- **Waiting** - Container is not running (pulling image, waiting for dependencies)
- **Running** - Container is executing without issues
- **Terminated** - Container finished execution or was killed

**Container specifications:**
- **Image** - Docker image to run
- **Command** - Override default command in image
- **Args** - Arguments to pass to command
- **Environment variables** - Configuration for the container
- **Resource limits** - CPU and memory constraints
- **Volume mounts** - Storage attachments

**Resource management:**
- **Requests** - Minimum resources guaranteed to container
- **Limits** - Maximum resources container can use
- **QoS classes** - Guaranteed, Burstable, BestEffort based on resource specs

**Health checks:**
- **Liveness probe** - Checks if container is alive (restarts if failed)
- **Readiness probe** - Checks if container is ready to serve traffic
- **Startup probe** - Checks container startup (for slow-starting containers)

**Common commands:**
```bash
# Container-specific operations
kubectl logs <pod-name> -c <container-name>   # Logs from specific container
kubectl exec -it <pod-name> -c <container-name> -- /bin/bash  # Shell into container
kubectl describe pod <pod-name>               # Shows container status and events

# Resource usage
kubectl top pod <pod-name> --containers       # Resource usage by container
```

**Example container spec with probes:**
```yaml
containers:
- name: app-container
  image: myapp:v1.0
  ports:
  - containerPort: 8080
  env:
  - name: DATABASE_URL
    value: "postgres://db:5432/myapp"
  resources:
    requests:
      memory: "256Mi"
      cpu: "250m"
    limits:
      memory: "512Mi"
      cpu: "500m"
  livenessProbe:
    httpGet:
      path: /health
      port: 8080
    initialDelaySeconds: 30
    periodSeconds: 10
  readinessProbe:
    httpGet:
      path: /ready
      port: 8080
    initialDelaySeconds: 5
    periodSeconds: 5
```

**When you'll use it:** Every pod contains containers. You'll configure container specs, troubleshoot container issues, and monitor container performance.

## Node

**What it is:** A worker machine (physical or virtual) that runs pods and is managed by the Kubernetes control plane.

**Why it matters:** Nodes provide the compute resources where your applications actually run. Understanding nodes helps with capacity planning, troubleshooting, and understanding cluster architecture.

**Node components:**
- **kubelet** - Agent that communicates with control plane and manages pods
- **kube-proxy** - Network proxy handling service routing
- **Container runtime** - Docker, containerd, or CRI-O that actually runs containers
- **Operating system** - Linux (typically) or Windows

**Node types:**
- **Master nodes** - Run control plane components (API server, scheduler, etc.)
- **Worker nodes** - Run application workloads (pods)
- **Hybrid nodes** - Can run both control plane and workloads (single-node clusters)

**Node status conditions:**
- **Ready** - Node is healthy and ready to accept pods
- **OutOfDisk** - Node is out of disk space
- **MemoryPressure** - Node is experiencing memory pressure
- **PIDPressure** - Node is experiencing process ID pressure
- **DiskPressure** - Node is experiencing disk pressure
- **NetworkUnavailable** - Node network is not configured correctly

**Node resources:**
- **Allocatable resources** - Resources available for pods (capacity minus system reserved)
- **Capacity** - Total resources on the node
- **Reserved resources** - Resources reserved for system components

**Common commands:**
```bash
# Node operations
kubectl get nodes                             # List all nodes
kubectl get nodes -o wide                     # List nodes with additional info
kubectl describe node <node-name>            # Detailed node information
kubectl top node                             # Resource usage by node
kubectl top node <node-name>                 # Specific node resource usage

# Node management
kubectl cordon <node-name>                   # Mark node unschedulable
kubectl uncordon <node-name>                 # Mark node schedulable
kubectl drain <node-name>                   # Safely evict pods from node
kubectl taint node <node-name> key=value:effect  # Add taint to node

# Troubleshooting
kubectl get pods --field-selector spec.nodeName=<node-name>  # Pods on specific node
```

**Node information includes:**
- **System info** - OS, kernel version, container runtime
- **Conditions** - Current node health status
- **Addresses** - Internal IP, external IP, hostname
- **Capacity and allocatable** - CPU, memory, storage, pods
- **Images** - Container images cached on node

**When you'll use it:** Node management for cluster administration, troubleshooting pod scheduling issues, capacity planning, and cluster maintenance.

## Cluster

**What it is:** A set of nodes (machines) that run containerized applications managed by Kubernetes, consisting of a control plane and worker nodes.

**Why it matters:** The cluster is your entire Kubernetes environment. Understanding cluster architecture helps with deployment planning, security, networking, and troubleshooting distributed applications.

**Cluster components:**

**Control Plane (Master components):**
- **API Server** - Frontend for Kubernetes control plane, handles REST operations
- **etcd** - Distributed key-value store for all cluster data
- **Scheduler** - Assigns pods to nodes based on resource requirements
- **Controller Manager** - Runs controller processes (deployment, service controllers)
- **Cloud Controller Manager** - Integrates with cloud provider APIs

**Node components (on each worker):**
- **kubelet** - Agent that manages pods and communicates with control plane
- **kube-proxy** - Network proxy for Kubernetes services
- **Container runtime** - Runs containers (Docker, containerd, CRI-O)

**Cluster networking:**
- **Pod network** - Internal network for pod-to-pod communication
- **Service network** - Virtual network for service discovery
- **Node network** - Physical network connecting cluster nodes
- **CNI (Container Network Interface)** - Plugin for pod networking

**Cluster types:**
- **Single-node** - Development/testing (minikube, kind)
- **Multi-node** - Production clusters with separate control plane and workers
- **Managed** - Cloud provider managed (EKS, GKE, AKS)
- **Self-managed** - You manage all components

**Common commands:**
```bash
# Cluster information
kubectl cluster-info                          # Basic cluster info
kubectl cluster-info dump                     # Detailed cluster state
kubectl get componentstatuses                 # Control plane component health
kubectl version                              # Client and server versions

# Cluster-wide resources
kubectl get all --all-namespaces             # All resources across namespaces
kubectl get events --all-namespaces          # All events in cluster
kubectl top nodes                            # Resource usage across nodes

# Cluster administration
kubectl config current-context               # Current cluster context
kubectl config get-contexts                  # Available contexts
kubectl config use-context <context-name>    # Switch cluster context
```

**Cluster networking concepts:**
- **Cluster CIDR** - IP range for pods (e.g., 10.244.0.0/16)
- **Service CIDR** - IP range for services (e.g., 10.96.0.0/12)
- **Pod CIDR** - Per-node IP ranges for pods
- **DNS** - Internal DNS for service discovery (CoreDNS)

**High availability considerations:**
- **Multiple master nodes** - Redundant control plane
- **Load balancer** - Distribute API server traffic
- **Backup strategy** - Regular etcd backups
- **Network redundancy** - Multiple network paths
- **Geographic distribution** - Nodes across availability zones

**When you'll use it:** Cluster management is ongoing - monitoring health, scaling, upgrades, security, backup/recovery, and troubleshooting cluster-wide issues.