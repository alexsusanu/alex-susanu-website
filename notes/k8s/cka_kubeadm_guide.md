# CKA Study Guide: kubeadm Cluster Installation
category: Kubernetes Certification
tags: cka, kubernetes, exam, kubectl, certification

## **The Fundamental Problem kubeadm Solves**

Before kubeadm, installing Kubernetes was a nightmare of manual configuration, cryptographic complexity, and system administration. You had to:
- Generate and distribute TLS certificates manually
- Configure etcd cluster with proper certificates
- Set up the API server with correct flags and certificates
- Bootstrap the kubelet on each node with proper authentication
- Configure networking, DNS, and service discovery
- Handle certificate rotation and cluster lifecycle

kubeadm abstracts this complexity into a simple, opinionated workflow while maintaining production-grade security and best practices.

### Why NOT Use Managed Services for Learning?

While cloud providers offer managed Kubernetes (EKS, GKE, AKS), understanding kubeadm is crucial because:
- **Debugging skills**: When things go wrong, you need to understand the underlying components
- **Cost management**: Self-managed clusters can be significantly cheaper
- **Compliance requirements**: Some organizations require on-premises or specific configurations
- **Educational value**: Understanding how the sausage is made makes you a better Kubernetes operator
- **Career advancement**: Many companies run self-managed clusters

---

## **Understanding Kubernetes Cluster Architecture**

### The Control Plane Components

Before diving into kubeadm, you must understand what you're actually building:

**etcd**: The distributed key-value store that holds all cluster state. Everything else is stateless and can be rebuilt from etcd data.

**kube-apiserver**: The REST API frontend that validates and stores resources in etcd. Everything talks to the cluster through this component.

**kube-controller-manager**: Runs the control loops that watch cluster state and make changes to achieve desired state (deployment scaling, node health management, etc.).

**kube-scheduler**: Decides which nodes should run which pods based on resource requirements, constraints, and policies.

**kube-proxy**: Runs on each node and implements service networking (load balancing to pod endpoints).

**kubelet**: The node agent that manages pods, containers, and communicates with the API server.

### Why This Architecture Matters

This design implements several critical patterns:
- **Separation of concerns**: Each component has a single responsibility
- **Declarative state**: Everything is stored as desired state, controllers reconcile to that state
- **API-driven**: All interactions go through the API server, enabling consistent access control and auditing
- **Horizontal scaling**: Multiple instances of stateless components for high availability
- **Pluggable**: Components can be replaced or enhanced (different CNI, CRI, storage)

---

## **How kubeadm Approaches the Bootstrapping Problem**

### The Bootstrap Paradox

How do you start a Kubernetes cluster when Kubernetes manages itself? This is a chicken-and-egg problem:
- kubelet needs to know about the API server to get pod specs
- API server needs to be running for kubelet to communicate with it
- But API server itself runs as pods managed by kubelet

### kubeadm's Solution: Static Pods

kubeadm solves this with static pods - pods that kubelet manages directly from local files without requiring an API server:

1. **Phase 1**: kubelet starts and finds static pod manifests in `/etc/kubernetes/manifests/`
2. **Phase 2**: kubelet starts control plane components (API server, controller-manager, scheduler) as static pods
3. **Phase 3**: Once API server is running, kubeadm uses it to configure the rest of the cluster
4. **Phase 4**: Install networking, DNS, and other cluster components through the API

This bootstrapping approach is elegant because it uses Kubernetes to manage Kubernetes, but doesn't require Kubernetes to already be running.

### The kubeadm Workflow Philosophy

kubeadm follows these principles:
- **Minimal and opinionated**: Provides a working cluster with sensible defaults
- **Composable**: Can be used as part of larger automation
- **Production-ready**: Implements security best practices by default
- **Extensible**: Allows customization through configuration files and phases

---

## **Prerequisites and System Requirements**

### Hardware Requirements
```bash
# Minimum requirements for each node:
# - 2 CPUs (for control plane nodes)
# - 2GB RAM
# - Network connectivity between nodes
# - Unique hostname, MAC address, and product_uuid for each node

# Check system requirements
lscpu | grep "CPU(s)"                    # Check CPU count
free -h                                  # Check memory
ip link                                  # Check network interfaces
cat /sys/class/dmi/id/product_uuid       # Check product UUID
```

### Why These Requirements Exist

**2 CPUs minimum**: The control plane components (especially etcd) are CPU-intensive during cluster operations. Single CPU nodes will be slow and potentially unstable.

**2GB RAM minimum**: Control plane components have memory overhead, plus space for system pods, networking, and monitoring.

**Unique identifiers**: Kubernetes uses these to distinguish nodes. Cloned VMs often have identical values, causing cluster issues.

### Network Requirements
```bash
# Required ports for control plane:
# 6443: kube-apiserver
# 2379-2380: etcd server client API
# 10250: kubelet API
# 10259: kube-scheduler
# 10257: kube-controller-manager

# Check if ports are available
netstat -tlnp | grep :6443
ss -tlnp | grep :2379

# Required ports for worker nodes:
# 10250: kubelet API
# 30000-32767: NodePort services
```

### Container Runtime Setup

Kubernetes needs a container runtime (CRI-compatible). Docker is no longer supported directly; containerd is the recommended choice:

```bash
# Install containerd
apt-get update
apt-get install -y containerd

# Configure containerd for Kubernetes
mkdir -p /etc/containerd
containerd config default | tee /etc/containerd/config.toml

# Enable systemd cgroup driver (required for kubelet)
sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml

# Restart containerd
systemctl restart containerd
systemctl enable containerd
```

**Why systemd cgroup driver?** kubelet and the container runtime must use the same cgroup driver to manage resource limits. systemd is the standard on most Linux distributions.

### System Configuration
```bash
# Disable swap (Kubernetes requires this)
swapoff -a
sed -i '/ swap / s/^\(.*\)$/#\1/g' /etc/fstab

# Load required kernel modules
cat <<EOF | tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF

modprobe overlay
modprobe br_netfilter

# Configure sysctl for networking
cat <<EOF | tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF

sysctl --system
```

**Why disable swap?** kubelet's memory management assumes predictable memory allocation. Swap can cause unpredictable performance and OOM behavior.

**Why these kernel modules?** 
- `overlay`: Required for container filesystems
- `br_netfilter`: Required for bridge networking and iptables rules

**Why these sysctl settings?**
- Bridge netfilter: Allows iptables to process bridged traffic (pod-to-pod networking)
- IP forwarding: Required for routing between pods and services

---

## **Installing kubeadm, kubelet, and kubectl**

### Package Installation
```bash
# Add Kubernetes apt repository
apt-get update
apt-get install -y apt-transport-https ca-certificates curl

curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.28/deb/Release.key | gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.28/deb/ /' | tee /etc/apt/sources.list.d/kubernetes.list

# Install specific versions (important for cluster consistency)
apt-get update
apt-get install -y kubelet=1.28.0-00 kubeadm=1.28.0-00 kubectl=1.28.0-00

# Prevent automatic updates
apt-mark hold kubelet kubeadm kubectl

# Start kubelet (it will fail until cluster is initialized)
systemctl enable --now kubelet
```

### Why Version Pinning Matters

**Cluster consistency**: All nodes should run the same kubelet version to avoid compatibility issues.

**Controlled upgrades**: Kubernetes has a strict upgrade path (N to N+1 minor versions only). Automatic updates can break this.

**API compatibility**: kubectl should be within one minor version of the API server to ensure full compatibility.

### Understanding the Components

**kubeadm**: The cluster bootstrapping tool. Only used during installation and upgrades.

**kubelet**: The node agent that runs on every node. Manages pods and communicates with the API server.

**kubectl**: The CLI client for interacting with the cluster. Can be installed on any machine with network access to the API server.

---

## **Initializing the Control Plane**

### Basic Cluster Initialization
```bash
# Initialize control plane with specific pod subnet
kubeadm init --pod-network-cidr=10.244.0.0/16

# Alternative with custom API server address
kubeadm init \
  --apiserver-advertise-address=192.168.1.100 \
  --pod-network-cidr=10.244.0.0/16 \
  --service-cidr=10.96.0.0/12
```

### Understanding the Parameters

**--pod-network-cidr**: Defines the IP range for pod networking. Must not overlap with node or service networks. Different CNI plugins have different requirements:
- Flannel: typically uses 10.244.0.0/16
- Calico: flexible, often 192.168.0.0/16
- Weave: typically 10.32.0.0/12

**--apiserver-advertise-address**: The IP address the API server advertises to other cluster members. Critical for multi-node clusters and load balancers.

**--service-cidr**: IP range for cluster services (ClusterIP). Default is 10.96.0.0/12, which provides ~1M service IPs.

### What kubeadm init Actually Does

1. **Preflight checks**: Validates system requirements, ports, container runtime
2. **Certificate generation**: Creates CA and component certificates with proper SANs
3. **Control plane static pods**: Generates manifests for API server, controller-manager, scheduler
4. **etcd setup**: Initializes etcd cluster (local or external)
5. **kubectl configuration**: Sets up admin kubeconfig
6. **Bootstrap tokens**: Creates tokens for node joining
7. **Add-ons**: Installs CoreDNS and kube-proxy

### The Generated Certificates

kubeadm creates a complete PKI infrastructure:

```bash
# Certificate files location
ls -la /etc/kubernetes/pki/

# Key certificates:
# ca.crt/ca.key - Cluster CA (signs all other certs)
# apiserver.crt/apiserver.key - API server TLS cert
# apiserver-kubelet-client.crt/key - API server to kubelet authentication
# front-proxy-ca.crt/key - Front proxy CA
# etcd/ca.crt/key - etcd CA (if using local etcd)
# sa.pub/sa.key - Service account token signing keys
```

**Why so many certificates?** Each component needs its own identity and encryption. This implements zero-trust networking where every connection is authenticated and encrypted.

### Setting Up kubectl Access
```bash
# Copy admin config (as root)
mkdir -p $HOME/.kube
cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
chown $(id -u):$(id -g) $HOME/.kube/config

# Verify cluster status
kubectl cluster-info
kubectl get nodes
kubectl get pods -n kube-system
```

---

## **Understanding and Installing Container Network Interface (CNI)**

### Why CNI is Required

After kubeadm init, nodes show "NotReady" status because there's no pod networking:

```bash
kubectl get nodes
# NAME           STATUS     ROLES           AGE   VERSION
# control-plane  NotReady   control-plane   5m    v1.28.0
```

Kubernetes defines the networking model but doesn't implement it. CNI plugins provide:
- Pod-to-pod networking across nodes
- Network policies for security
- Service load balancing (in cooperation with kube-proxy)

### Installing Flannel (Simple Example)
```bash
# Install Flannel CNI
kubectl apply -f https://github.com/coreos/flannel/raw/master/Documentation/kube-flannel.yml

# Watch nodes become ready
kubectl get nodes -w
```

### Installing Calico (Production Example)
```bash
# Install Calico operator
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.26.1/manifests/tigera-operator.yaml

# Configure Calico with custom pod CIDR
cat <<EOF | kubectl apply -f -
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    ipPools:
    - blockSize: 26
      cidr: 10.244.0.0/16
      encapsulation: VXLANCrossSubnet
      natOutgoing: Enabled
      nodeSelector: all()
EOF
```

### CNI Plugin Comparison

**Flannel**:
- Pros: Simple, minimal configuration, stable
- Cons: Limited network policy support, basic routing
- Use case: Development, simple clusters

**Calico**:
- Pros: Rich network policies, BGP routing, performance
- Cons: More complex, requires understanding of networking
- Use case: Production, security-focused environments

**Weave**:
- Pros: Built-in encryption, automatic mesh networking
- Cons: Performance overhead, less actively maintained
- Use case: Secure environments, multi-cloud

### Verifying CNI Installation
```bash
# Check that nodes are Ready
kubectl get nodes

# Verify CNI pods are running
kubectl get pods -n kube-system | grep -E "(flannel|calico|weave)"

# Test pod networking
kubectl run test-pod --image=nginx --restart=Never
kubectl get pod test-pod -o wide  # Note the pod IP
kubectl exec test-pod -- ip addr show eth0
```

---

## **Adding Worker Nodes**

### The Join Process

During `kubeadm init`, you get a join command:
```bash
kubeadm join 192.168.1.100:6443 --token abcdef.0123456789abcdef \
    --discovery-token-ca-cert-hash sha256:1234567890abcdef...
```

### Understanding the Join Parameters

**--token**: A bootstrap token that allows the node to authenticate with the API server during the join process. Tokens are time-limited (24 hours by default).

**--discovery-token-ca-cert-hash**: A hash of the cluster CA certificate. This prevents man-in-the-middle attacks during bootstrap.

**--discovery-token-unsafe-skip-ca-verification**: Alternative to CA hash for testing (never use in production).

### What Happens During Node Join

1. **Token validation**: New node presents token to API server
2. **CA verification**: Node verifies it's talking to the correct cluster
3. **TLS bootstrap**: Node requests client certificate from API server
4. **kubelet registration**: Node registers itself with the API server
5. **Pod scheduling**: Node becomes available for pod scheduling

### Managing Join Tokens
```bash
# List existing tokens
kubeadm token list

# Create new token (if original expired)
kubeadm token create

# Create token with custom TTL
kubeadm token create --ttl 2h

# Get CA cert hash for join command
openssl x509 -pubkey -in /etc/kubernetes/pki/ca.crt | openssl rsa -pubin -outform der 2>/dev/null | openssl dgst -sha256 -hex | sed 's/^.* //'

# Generate complete join command
kubeadm token create --print-join-command
```

### Worker Node Setup
```bash
# On worker node: Install container runtime and kubelet (same as control plane)
# Then join the cluster
kubeadm join 192.168.1.100:6443 --token abc123.xyz789 \
    --discovery-token-ca-cert-hash sha256:hash...

# Verify from control plane
kubectl get nodes
kubectl describe node worker-node-1
```

---

## **Advanced Configuration with kubeadm**

### Using Configuration Files

For complex setups, use configuration files instead of command-line flags:

```yaml
# kubeadm-config.yaml
apiVersion: kubeadm.k8s.io/v1beta3
kind: InitConfiguration
localAPIEndpoint:
  advertiseAddress: 192.168.1.100
  bindPort: 6443
nodeRegistration:
  criSocket: unix:///var/run/containerd/containerd.sock
  kubeletExtraArgs:
    node-labels: "environment=production,zone=us-west-1a"
---
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
kubernetesVersion: v1.28.0
clusterName: production-cluster
controlPlaneEndpoint: "k8s-api.company.com:6443"
networking:
  serviceSubnet: "10.96.0.0/12"
  podSubnet: "10.244.0.0/16"
  dnsDomain: "cluster.local"
apiServer:
  extraArgs:
    audit-log-maxage: "30"
    audit-log-maxbackup: "10"
    audit-log-maxsize: "100"
    audit-log-path: "/var/log/audit.log"
  extraVolumes:
  - name: audit-log
    hostPath: "/var/log"
    mountPath: "/var/log"
    readOnly: false
    pathType: DirectoryOrCreate
controllerManager:
  extraArgs:
    bind-address: "0.0.0.0"
scheduler:
  extraArgs:
    bind-address: "0.0.0.0"
etcd:
  local:
    dataDir: "/var/lib/etcd"
    extraArgs:
      listen-metrics-urls: "http://0.0.0.0:2381"
---
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
cgroupDriver: systemd
serverTLSBootstrap: true
rotateCertificates: true
```

```bash
# Initialize with config file
kubeadm init --config=kubeadm-config.yaml
```

### Why Configuration Files Matter

**Version control**: Cluster configuration can be stored in git and reviewed
**Repeatability**: Identical clusters can be created consistently
**Complexity management**: Advanced configurations become manageable
**Documentation**: Serves as documentation of cluster setup

### External etcd Setup

For production high availability, use external etcd:

```yaml
# In ClusterConfiguration
etcd:
  external:
    endpoints:
    - https://etcd1.company.com:2379
    - https://etcd2.company.com:2379
    - https://etcd3.company.com:2379
    caFile: /etc/etcd/ca.crt
    certFile: /etc/etcd/etcd-client.crt
    keyFile: /etc/etcd/etcd-client.key
```

**Why external etcd?**
- **Isolation**: etcd failures don't affect control plane components
- **Scaling**: etcd can be scaled independently
- **Backup/restore**: Easier to manage etcd lifecycle
- **Performance**: Dedicated resources for the most critical component

---

## **Troubleshooting kubeadm Installations**

### Common Initialization Failures

**Port conflicts**:
```bash
# Check if required ports are in use
netstat -tlnp | grep -E ":(6443|2379|2380|10250|10259|10257)"

# Kill processes using required ports
lsof -ti:6443 | xargs kill -9
```

**Container runtime issues**:
```bash
# Check containerd status
systemctl status containerd

# Check container runtime detection
crictl info

# Verify kubelet can communicate with runtime
journalctl -u kubelet -f
```

**Certificate issues**:
```bash
# Check certificate validity
openssl x509 -in /etc/kubernetes/pki/ca.crt -text -noout

# Regenerate certificates if needed
kubeadm certs renew all
```

### Node Join Failures

**Token expiration**:
```bash
# Check token status
kubeadm token list

# Create new token
kubeadm token create --print-join-command
```

**Network connectivity**:
```bash
# Test connectivity to API server
telnet 192.168.1.100 6443

# Check firewall rules
iptables -L INPUT -n | grep 6443
```

**CA hash mismatch**:
```bash
# Regenerate correct hash
openssl x509 -pubkey -in /etc/kubernetes/pki/ca.crt | openssl rsa -pubin -outform der 2>/dev/null | openssl dgst -sha256 -hex | sed 's/^.* //'
```

### kubelet Troubleshooting

The kubelet logs are crucial for diagnosing issues:

```bash
# Check kubelet status
systemctl status kubelet

# Follow kubelet logs
journalctl -u kubelet -f

# Check kubelet configuration
cat /var/lib/kubelet/config.yaml

# Verify kubelet can reach API server
curl -k https://localhost:10250/healthz
```

### Common Log Messages and Solutions

**"failed to run Kubelet: unable to load bootstrap kubeconfig"**
- Solution: Regenerate bootstrap tokens and kubeconfig

**"node not found"**
- Solution: Check node registration and API server connectivity

**"pod sandbox changed, it will be killed and re-created"**
- Solution: Usually normal during networking setup, but check CNI

**"failed to create pod sandbox"**
- Solution: Check container runtime and CNI configuration

---

## **Cluster Validation and Health Checks**

### Comprehensive Cluster Testing
```bash
# Check all nodes are ready
kubectl get nodes -o wide

# Verify system pods
kubectl get pods -n kube-system

# Test DNS resolution
kubectl run dnsutils --image=gcr.io/kubernetes-e2e-test-images/dnsutils:1.3 --restart=Never
kubectl exec dnsutils -- nslookup kubernetes.default
kubectl delete pod dnsutils

# Test service connectivity
kubectl create deployment nginx --image=nginx
kubectl expose deployment nginx --port=80 --type=ClusterIP
kubectl run test --image=busybox --restart=Never -- wget -qO- nginx
kubectl delete deployment nginx
kubectl delete service nginx
kubectl delete pod test

# Check cluster info
kubectl cluster-info
kubectl cluster-info dump > cluster-dump.txt
```

### Performance and Resource Validation
```bash
# Check resource allocation
kubectl top nodes
kubectl top pods -A

# Verify scheduler is placing pods
kubectl get events --sort-by=.metadata.creationTimestamp

# Test horizontal scaling
kubectl create deployment test-scale --image=nginx
kubectl scale deployment test-scale --replicas=3
kubectl get pods -l app=test-scale -o wide
kubectl delete deployment test-scale
```

### Security Validation
```bash
# Check RBAC is working
kubectl auth can-i create pods
kubectl auth can-i create pods --as=system:anonymous

# Verify network policies (if using Calico/other NP-capable CNI)
kubectl get networkpolicies -A

# Check Pod Security Standards
kubectl get pods -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.securityContext}{"\n"}{end}'
```

---

## **Cluster Lifecycle Management**

### Backing Up the Cluster

**etcd backup (most critical)**:
```bash
# Create etcd snapshot
ETCDCTL_API=3 etcdctl snapshot save backup.db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
  --key=/etc/kubernetes/pki/etcd/healthcheck-client.key

# Verify backup
ETCDCTL_API=3 etcdctl snapshot status backup.db
```

**Certificate backup**:
```bash
# Backup certificates and configs
tar -czf k8s-backup-$(date +%Y%m%d).tar.gz \
  /etc/kubernetes/pki/ \
  /etc/kubernetes/admin.conf \
  /etc/kubernetes/kubelet.conf \
  /etc/kubernetes/controller-manager.conf \
  /etc/kubernetes/scheduler.conf
```

### Node Maintenance

**Draining nodes safely**:
```bash
# Cordon node (prevent new pods)
kubectl cordon worker-node-1

# Drain node (move existing pods)
kubectl drain worker-node-1 --ignore-daemonsets --delete-emptydir-data

# Perform maintenance...

# Uncordon node (allow scheduling)
kubectl uncordon worker-node-1
```

**Removing nodes**:
```bash
# Drain and remove from cluster
kubectl drain worker-node-1 --ignore-daemonsets --force
kubectl delete node worker-node-1

# On the node itself: reset and clean up
kubeadm reset
iptables -F && iptables -t nat -F && iptables -t mangle -F && iptables -X
ipvsadm -C  # if using ipvs
```

---

## **Security Best Practices for kubeadm Clusters**

### Certificate Management
- **Regular rotation**: Use `kubeadm certs renew all` before expiration
- **Secure storage**: Protect private keys and backup certificates securely
- **Monitoring**: Set up alerts for certificate expiration

### Network Security
```bash
# Disable insecure API server port (if accidentally enabled)
# Remove --insecure-port=8080 from API server manifest

# Use network policies to restrict pod-to-pod communication
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: default
spec:
  podSelector: {}
  policyTypes:
  - Ingress
EOF
```

### Access Control
- **Disable default ServiceAccount auto-mount**: Add `automountServiceAccountToken: false`
- **Use dedicated ServiceAccounts**: Don't use default SA for applications
- **Implement proper RBAC**: Follow principle of least privilege
- **Regular audits**: Review who has cluster-admin access

### System Hardening
```bash
# Set up audit logging in API server
# Add to /etc/kubernetes/manifests/kube-apiserver.yaml:
# --audit-log-path=/var/log/audit.log
# --audit-policy-file=/etc/kubernetes/audit-policy.yaml

# Restrict kubelet permissions
# In kubelet config: authorization-mode=Webhook,RBAC

# Enable Pod Security Standards
# Add to API server: --enable-admission-plugins=PodSecurity
```

---

## **Exam Tips**

### Time Management
- **Practice the full workflow**: From fresh VMs to working cluster in under 30 minutes
- **Use configuration files**: Faster than remembering all command-line flags
- **Know the common troubleshooting steps**: Port conflicts, token expiration, CNI issues

### Key Commands to Master
```bash
# Fast cluster setup
kubeadm init --pod-network-cidr=10.244.0.0/16
kubectl apply -f flannel.yaml

# Quick troubleshooting
journalctl -u kubelet -f
kubectl get pods -n kube-system
kubeadm token create --print-join-command

# Validation
kubectl get nodes
kubectl run test --image=nginx --restart=Never
kubectl delete pod test
```

### Common Scenarios
1. **Initialize control plane with specific networking**
2. **Add worker nodes to existing cluster**
3. **Troubleshoot node join failures**
4. **Verify cluster networking and DNS**
5. **Backup and restore cluster state**

### Things to Remember
- Always check prerequisites (swap, ports, container runtime)
- CNI must match the pod-network-cidr specified during init
- Tokens expire - know how to generate new ones
- Node names must be unique and resolvable
- kubelet logs are your best friend for troubleshooting