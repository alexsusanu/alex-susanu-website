# CKA Study Guide: Highly-Available Kubernetes Clusters
category: Kubernetes Certification
tags: cka, kubernetes, exam, kubectl, certification

## **The Fundamental Problem of Single Points of Failure**

A basic kubeadm cluster has a critical weakness: if the control plane node fails, the entire cluster becomes unmanageable. While existing workloads continue running (pods keep serving traffic), you cannot:
- Deploy new applications
- Scale existing workloads  
- Access cluster resources through kubectl
- Respond to node failures or pod crashes
- Manage secrets, configmaps, or any cluster state

This creates an unacceptable risk for production systems where downtime directly impacts revenue, user experience, and business operations.

### Why High Availability is More Complex Than Just "Add More Servers"

Kubernetes control plane components are stateful and require careful coordination:
- **etcd** maintains strict consistency requirements and needs quorum
- **API server** instances must all serve identical data from the same etcd
- **Controller managers** use leader election to prevent conflicting actions
- **Schedulers** coordinate to prevent double-scheduling pods
- **Load balancing** must intelligently route traffic to healthy API servers

This isn't just about redundancy - it's about maintaining cluster integrity while providing seamless failover.

---

## **Understanding High Availability Architecture Patterns**

### The Control Plane HA Challenge

In a single-node control plane, all components run on one machine:
```
┌─────────────────────────────────────┐
│           Control Plane             │
│  ┌─────────┐ ┌──────────────────┐   │
│  │  etcd   │ │   kube-apiserver │   │
│  └─────────┘ └──────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │ kube-controller-manager      │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │ kube-scheduler               │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

For HA, we need multiple control plane nodes, but this creates coordination challenges:
```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│Control Plane │  │Control Plane │  │Control Plane │
│     Node 1   │  │     Node 2   │  │     Node 3   │
└──────────────┘  └──────────────┘  └──────────────┘
       │                 │                 │
       └─────────────────┼─────────────────┘
                         │
                   ┌──────────┐
                   │ etcd     │
                   │ Cluster  │
                   └──────────┘
```

### The Two Main HA Topologies

**Stacked etcd topology** (etcd runs on control plane nodes):
- Pros: Simpler setup, fewer machines required
- Cons: Coupled failure domains, more complex recovery

**External etcd topology** (dedicated etcd cluster):
- Pros: Independent failure domains, easier etcd management
- Cons: More infrastructure, additional complexity

---

## **Deep Dive: etcd Clustering and Quorum**

### Why etcd Requires Odd Numbers

etcd uses the Raft consensus algorithm, which requires a majority (quorum) to make decisions:

- **1 node**: Quorum = 1, can tolerate 0 failures
- **3 nodes**: Quorum = 2, can tolerate 1 failure  
- **5 nodes**: Quorum = 3, can tolerate 2 failures
- **7 nodes**: Quorum = 4, can tolerate 3 failures

**Why not even numbers?** With 4 nodes, if they split 2-2 due to network partition, neither side has majority and the cluster becomes unavailable (split-brain).

### Raft Consensus in Practice

When a client writes to etcd:
1. **Leader receives write** request
2. **Leader replicates** to followers
3. **Majority acknowledges** the write
4. **Leader commits** and responds to client
5. **Leader notifies followers** to commit

This ensures consistency but requires majority availability:
```bash
# Check etcd cluster health
ETCDCTL_API=3 etcdctl endpoint health \
  --endpoints=https://10.0.1.10:2379,https://10.0.1.11:2379,https://10.0.1.12:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
  --key=/etc/kubernetes/pki/etcd/healthcheck-client.key

# Check cluster member status  
ETCDCTL_API=3 etcdctl member list \
  --endpoints=https://10.0.1.10:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
  --key=/etc/kubernetes/pki/etcd/healthcheck-client.key
```

### etcd Performance Considerations

**Disk I/O is critical**: etcd commits every write to disk for durability. Use SSDs and monitor disk latency.

**Network latency matters**: Cross-region etcd clusters can become slow due to consensus round-trips.

**Memory usage**: etcd stores entire keyspace in memory. Monitor usage and set appropriate limits.

```bash
# Monitor etcd performance metrics
curl -L https://10.0.1.10:2381/metrics | grep etcd_disk_wal_fsync_duration

# Check etcd database size
ETCDCTL_API=3 etcdctl endpoint status \
  --endpoints=https://10.0.1.10:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
  --key=/etc/kubernetes/pki/etcd/healthcheck-client.key \
  --write-out=table
```

---

## **Load Balancer Requirements and Patterns**

### Why API Server Load Balancing is Complex

Unlike typical web application load balancing, Kubernetes API servers require:
- **Persistent connections**: kubectl watch operations need long-lived connections
- **Health checking**: Must detect API server failures quickly
- **TLS termination handling**: Can terminate TLS or pass-through
- **Backup behavior**: Must handle all backends being down gracefully

### Load Balancer Options

**HAProxy Configuration Example**:
```bash
# /etc/haproxy/haproxy.cfg
global
    log stdout local0

defaults
    mode tcp
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms

frontend k8s-api
    bind *:6443
    default_backend k8s-api-backend

backend k8s-api-backend
    balance roundrobin
    option tcp-check
    server master1 10.0.1.10:6443 check fall 3 rise 2
    server master2 10.0.1.11:6443 check fall 3 rise 2  
    server master3 10.0.1.12:6443 check fall 3 rise 2
```

```bash
# Start HAProxy
systemctl enable --now haproxy

# Verify load balancer is working
curl -k https://loadbalancer:6443/healthz
```

**NGINX Configuration Example**:
```nginx
# /etc/nginx/nginx.conf
stream {
    upstream k8s-api {
        server 10.0.1.10:6443 max_fails=3 fail_timeout=30s;
        server 10.0.1.11:6443 max_fails=3 fail_timeout=30s;
        server 10.0.1.12:6443 max_fails=3 fail_timeout=30s;
    }
    
    server {
        listen 6443;
        proxy_pass k8s-api;
        proxy_timeout 10s;
        proxy_connect_timeout 1s;
    }
}
```

**Cloud Load Balancer Considerations**:
- **AWS NLB**: Use TCP mode, enable cross-zone load balancing
- **GCP Load Balancer**: Configure proper health checks on /healthz
- **Azure Load Balancer**: Use Standard SKU for production

### Load Balancer Health Checking

The API server provides health endpoints:
```bash
# Liveness probe (is the server running?)
curl -k https://api-server:6443/livez

# Readiness probe (is the server ready to serve traffic?)
curl -k https://api-server:6443/readyz

# Overall health (combines multiple checks)
curl -k https://api-server:6443/healthz
```

---

## **Setting Up Stacked etcd HA Cluster**

### Prerequisites and Planning

**Hardware Requirements**:
- 3 or 5 control plane nodes (odd number for quorum)
- Each node: 4 CPUs, 8GB RAM minimum for production
- Fast disks (SSDs) for etcd performance
- Reliable network with low latency between nodes

**Network Planning**:
```bash
# Example IP layout:
# Load Balancer: 10.0.1.100:6443
# Control Plane 1: 10.0.1.10
# Control Plane 2: 10.0.1.11  
# Control Plane 3: 10.0.1.12
# Worker Nodes: 10.0.1.20-29
```

### Step 1: Initialize First Control Plane Node

```bash
# Create kubeadm configuration for HA
cat <<EOF > kubeadm-config.yaml
apiVersion: kubeadm.k8s.io/v1beta3
kind: InitConfiguration
localAPIEndpoint:
  advertiseAddress: 10.0.1.10
  bindPort: 6443
nodeRegistration:
  criSocket: unix:///var/run/containerd/containerd.sock
---
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
kubernetesVersion: v1.28.0
clusterName: production-cluster
controlPlaneEndpoint: "10.0.1.100:6443"  # Load balancer endpoint
networking:
  serviceSubnet: "10.96.0.0/12"
  podSubnet: "10.244.0.0/16"
apiServer:
  extraArgs:
    audit-log-maxage: "30"
    audit-log-maxbackup: "10"
    audit-log-path: "/var/log/audit.log"
  extraVolumes:
  - name: audit-log
    hostPath: "/var/log"
    mountPath: "/var/log"
    readOnly: false
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
apiVersion: kubeproxy.config.k8s.io/v1alpha1
kind: KubeProxyConfiguration
bindAddress: "0.0.0.0"
EOF

# Initialize first control plane
kubeadm init --config=kubeadm-config.yaml --upload-certs
```

**Key Parameters Explained**:

**controlPlaneEndpoint**: This is crucial - it's the load balancer address that all nodes will use to communicate with the API server. Must be set during init and cannot be changed later.

**--upload-certs**: Uploads control plane certificates to a secret in the cluster, allowing other control plane nodes to download them automatically.

### Step 2: Set Up kubectl and CNI

```bash
# Configure kubectl
mkdir -p $HOME/.kube
cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
chown $(id -u):$(id -g) $HOME/.kube/config

# Install CNI (Calico example)
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.26.1/manifests/tigera-operator.yaml

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
EOF
```

### Step 3: Join Additional Control Plane Nodes

The `kubeadm init` output provides join commands for both control plane and worker nodes:

```bash
# On additional control plane nodes (10.0.1.11, 10.0.1.12)
kubeadm join 10.0.1.100:6443 --token abcdef.0123456789abcdef \
    --discovery-token-ca-cert-hash sha256:1234567890abcdef... \
    --control-plane --certificate-key f8902e114ef118304e561c3ecd4d0b543adc226b7d42
```

**What --certificate-key does**: Downloads the uploaded certificates from the cluster secret, allowing this node to become a control plane without manual certificate copying.

### Step 4: Verify HA Setup

```bash
# Check all control plane nodes are ready
kubectl get nodes -l node-role.kubernetes.io/control-plane

# Verify etcd cluster health
kubectl -n kube-system exec etcd-master1 -- etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  member list

# Test API server failover
kubectl get nodes
# Stop one API server, verify cluster still works
systemctl stop kubelet  # on one control plane node
kubectl get nodes  # should still work via load balancer
```

---

## **External etcd HA Cluster Setup**

### Why Choose External etcd

**Advantages**:
- **Failure isolation**: etcd failures don't affect API servers directly
- **Independent scaling**: Can optimize etcd hardware separately
- **Easier backup/restore**: Dedicated etcd management
- **Security**: Can apply different security policies to etcd

**Disadvantages**:
- **More infrastructure**: Additional servers required
- **Network complexity**: More network paths to secure and monitor
- **Operational overhead**: Two clusters to manage instead of one

### Setting Up External etcd Cluster

**Step 1: Prepare etcd Nodes**
```bash
# On each etcd node (etcd1, etcd2, etcd3)
# Install etcd
ETCD_VER=v3.5.9
curl -L https://github.com/etcd-io/etcd/releases/download/${ETCD_VER}/etcd-${ETCD_VER}-linux-amd64.tar.gz -o etcd-${ETCD_VER}-linux-amd64.tar.gz
tar xzf etcd-${ETCD_VER}-linux-amd64.tar.gz
mv etcd-${ETCD_VER}-linux-amd64/etcd* /usr/local/bin/
```

**Step 2: Generate etcd Certificates**
```bash
# Create CA for etcd
mkdir -p /etc/etcd/pki
cd /etc/etcd/pki

# Generate CA
openssl genrsa -out ca-key.pem 2048
openssl req -new -x509 -key ca-key.pem -out ca.pem -days 3650 -subj "/CN=etcd-ca"

# Generate server certificates for each etcd node
for node in etcd1 etcd2 etcd3; do
  openssl genrsa -out ${node}-key.pem 2048
  openssl req -new -key ${node}-key.pem -out ${node}.csr -subj "/CN=${node}" \
    -config <(echo "[req]"; echo "distinguished_name=req"; echo "[san]"; echo "subjectAltName=DNS:${node},DNS:localhost,IP:127.0.0.1,IP:${node_ip}")
  openssl x509 -req -in ${node}.csr -CA ca.pem -CAkey ca-key.pem -out ${node}.pem -days 365 -extensions san \
    -extfile <(echo "[san]"; echo "subjectAltName=DNS:${node},DNS:localhost,IP:127.0.0.1,IP:${node_ip}")
done
```

**Step 3: Configure etcd Cluster**
```bash
# /etc/systemd/system/etcd.service on etcd1 (10.0.1.20)
[Unit]
Description=etcd
Documentation=https://github.com/coreos

[Service]
Type=notify
User=etcd
ExecStart=/usr/local/bin/etcd \
  --name=etcd1 \
  --data-dir=/var/lib/etcd \
  --listen-peer-urls=https://10.0.1.20:2380 \
  --listen-client-urls=https://10.0.1.20:2379,https://127.0.0.1:2379 \
  --advertise-client-urls=https://10.0.1.20:2379 \
  --initial-advertise-peer-urls=https://10.0.1.20:2380 \
  --initial-cluster=etcd1=https://10.0.1.20:2380,etcd2=https://10.0.1.21:2380,etcd3=https://10.0.1.22:2380 \
  --initial-cluster-token=etcd-cluster-1 \
  --initial-cluster-state=new \
  --cert-file=/etc/etcd/pki/etcd1.pem \
  --key-file=/etc/etcd/pki/etcd1-key.pem \
  --peer-cert-file=/etc/etcd/pki/etcd1.pem \
  --peer-key-file=/etc/etcd/pki/etcd1-key.pem \
  --trusted-ca-file=/etc/etcd/pki/ca.pem \
  --peer-trusted-ca-file=/etc/etcd/pki/ca.pem
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
# Start etcd on all nodes
systemctl enable --now etcd

# Verify cluster
ETCDCTL_API=3 etcdctl member list \
  --endpoints=https://10.0.1.20:2379,https://10.0.1.21:2379,https://10.0.1.22:2379 \
  --cacert=/etc/etcd/pki/ca.pem
```

**Step 4: Configure Kubernetes with External etcd**
```yaml
# kubeadm-external-etcd.yaml
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
kubernetesVersion: v1.28.0
controlPlaneEndpoint: "10.0.1.100:6443"
etcd:
  external:
    endpoints:
    - https://10.0.1.20:2379
    - https://10.0.1.21:2379
    - https://10.0.1.22:2379
    caFile: /etc/kubernetes/pki/etcd/ca.pem
    certFile: /etc/kubernetes/pki/etcd/client.pem
    keyFile: /etc/kubernetes/pki/etcd/client-key.pem
```

---

## **HA Components: Controller Manager and Scheduler**

### Leader Election Mechanism

Both kube-controller-manager and kube-scheduler use leader election to ensure only one instance is active at a time, preventing conflicting operations.

**How Leader Election Works**:
1. Each instance tries to create/update a lease object in the API server
2. The instance that successfully updates the lease becomes the leader
3. Leader periodically renews the lease to maintain leadership
4. If leader fails to renew, other instances compete to become new leader
5. Non-leader instances remain in standby, ready to take over

```bash
# Check current leaders
kubectl get lease -n kube-system

# View leader election logs
kubectl logs -n kube-system kube-controller-manager-master1 | grep leader
kubectl logs -n kube-system kube-scheduler-master1 | grep leader
```

### Controller Manager HA Configuration

In the static pod manifest `/etc/kubernetes/manifests/kube-controller-manager.yaml`:
```yaml
spec:
  containers:
  - command:
    - kube-controller-manager
    - --bind-address=0.0.0.0  # Listen on all interfaces for metrics
    - --leader-elect=true      # Enable leader election
    - --leader-elect-lease-duration=15s
    - --leader-elect-renew-deadline=10s
    - --leader-elect-retry-period=2s
    # ... other flags
```

**Key Parameters**:
- **leader-elect-lease-duration**: How long a lease is valid (15s default)
- **leader-elect-renew-deadline**: When leader must renew before losing leadership (10s default)  
- **leader-elect-retry-period**: How often non-leaders check for leadership opportunity (2s default)

### Scheduler HA Configuration

Similar configuration in `/etc/kubernetes/manifests/kube-scheduler.yaml`:
```yaml
spec:
  containers:
  - command:
    - kube-scheduler
    - --bind-address=0.0.0.0
    - --leader-elect=true
    - --leader-elect-lease-duration=15s
    # ... other flags
```

### Understanding Leader Election Timing

**Failover Time**: If a leader dies, failover takes approximately:
- Leader detection: lease-duration (15s)
- New leader election: retry-period * attempts (2-6s)
- **Total**: ~20s maximum downtime

**Tuning Considerations**:
- **Shorter timers**: Faster failover, more API server load
- **Longer timers**: Slower failover, less API server load
- **Production recommendation**: Use defaults unless you have specific requirements

---

## **Monitoring and Alerting for HA Clusters**

### Critical Metrics to Monitor

**etcd Health Metrics**:
```bash
# Key metrics to watch:
# - etcd_server_is_leader: Which node is leader (should be 1)
# - etcd_server_leader_changes_seen_total: Leader changes (should be rare)
# - etcd_disk_wal_fsync_duration_seconds: Disk performance
# - etcd_network_peer_round_trip_time_seconds: Network latency

# Scrape etcd metrics
curl -L https://10.0.1.20:2381/metrics | grep etcd_server_is_leader
```

**API Server Health**:
```bash
# Health endpoints for monitoring
curl -k https://10.0.1.10:6443/livez
curl -k https://10.0.1.10:6443/readyz

# Metrics endpoint
curl -k https://10.0.1.10:6443/metrics | grep apiserver_request_duration
```

**Controller Manager and Scheduler**:
```bash
# Check leader status
kubectl get endpoints -n kube-system kube-controller-manager -o yaml
kubectl get endpoints -n kube-system kube-scheduler -o yaml

# Metrics (if enabled)
curl http://10.0.1.10:10257/metrics  # controller-manager
curl http://10.0.1.10:10259/metrics  # scheduler
```

### Essential Alerts

**etcd Alerts**:
- etcd cluster has no leader for > 1 minute
- etcd leader changes > 3 times per hour
- etcd disk fsync duration > 100ms
- etcd cluster size != expected size

**API Server Alerts**:
- API server down on > 1 control plane node
- API server response time > 1s for 95th percentile
- API server error rate > 5%

**Control Plane Alerts**:
- Controller manager leader absent for > 30s
- Scheduler leader absent for > 30s
- Control plane node down for > 5 minutes

### Prometheus Monitoring Setup

```yaml
# ServiceMonitor for etcd
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: etcd
  namespace: kube-system
spec:
  selector:
    matchLabels:
      component: etcd
  endpoints:
  - port: http-metrics
    interval: 30s
    scheme: https
    tlsConfig:
      caFile: /etc/prometheus/secrets/etcd-certs/ca.crt
      certFile: /etc/prometheus/secrets/etcd-certs/client.crt
      keyFile: /etc/prometheus/secrets/etcd-certs/client.key
```

---

## **Troubleshooting HA Cluster Issues**

### Common etcd Problems

**Split Brain Detection**:
```bash
# Check if etcd cluster has quorum
ETCDCTL_API=3 etcdctl endpoint status \
  --endpoints=https://10.0.1.20:2379,https://10.0.1.21:2379,https://10.0.1.22:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
  --key=/etc/kubernetes/pki/etcd/healthcheck-client.key \
  --write-out=table

# Look for:
# - Is Leader column (should have exactly one "true")  
# - DB Size differences (should be similar)
# - Raft Term (should be same across healthy members)
```

**etcd Performance Issues**:
```bash
# Check disk performance
iostat -x 1 5  # Watch disk utilization

# Check etcd metrics
curl -L https://10.0.1.20:2381/metrics | grep -E "(fsync_duration|backend_commit_duration)"

# Monitor etcd logs
journalctl -u etcd -f | grep -E "(slow|timeout|failed)"
```

**etcd Member Recovery**:
```bash
# Remove failed member
ETCDCTL_API=3 etcdctl member remove MEMBER_ID \
  --endpoints=https://10.0.1.20:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt

# Add new member
ETCDCTL_API=3 etcdctl member add etcd3 \
  --peer-urls=https://10.0.1.22:2380 \
  --endpoints=https://10.0.1.20:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt
```

### API Server Load Balancer Issues

**Health Check Failures**:
```bash
# Test load balancer endpoints directly
curl -k https://10.0.1.10:6443/healthz
curl -k https://10.0.1.11:6443/healthz
curl -k https://10.0.1.12:6443/healthz

# Check HAProxy stats (if using HAProxy)
echo "show stat" | socat stdio /var/lib/haproxy/stats

# Test through load balancer
curl -k https://10.0.1.100:6443/healthz
```

**Certificate Issues**:
```bash
# Check certificate validity on each API server
openssl x509 -in /etc/kubernetes/pki/apiserver.crt -text -noout | grep -A2 "Not After"

# Test TLS connection
openssl s_client -connect 10.0.1.10:6443 -servername kubernetes
```

### Controller Manager and Scheduler Issues

**Leader Election Problems**:
```bash
# Check which instance is leader
kubectl get endpoints -n kube-system kube-controller-manager -o yaml
kubectl get endpoints -n kube-system kube-scheduler -o yaml

# Look for frequent leader changes
kubectl logs -n kube-system kube-controller-manager-master1 | grep "became leader"
kubectl logs -n kube-system kube-controller-manager-master1 | grep "lost leader"

# Check for connectivity issues between nodes
ping 10.0.1.11  # from each control plane node
```

**Performance Issues**:
```bash
# Check controller manager queue depth
kubectl logs -n kube-system kube-controller-manager-master1 | grep "queue depth"

# Monitor resource usage
kubectl top pods -n kube-system | grep -E "(controller-manager|scheduler)"
```

---

## **Disaster Recovery for HA Clusters**

### Backup Strategy

**Regular etcd Backups**:
```bash
#!/bin/bash
# backup-etcd.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/etcd"

ETCDCTL_API=3 etcdctl snapshot save ${BACKUP_DIR}/etcd-backup-${DATE}.db \
  --endpoints=https://10.0.1.20:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
  --key=/etc/kubernetes/pki/etcd/healthcheck-client.key

# Verify backup
ETCDCTL_API=3 etcdctl snapshot status ${BACKUP_DIR}/etcd-backup-${DATE}.db

# Cleanup old backups (keep last 7 days)
find ${BACKUP_DIR} -name "etcd-backup-*.db" -mtime +7 -delete
```

**Certificate and Configuration Backup**:
```bash
# Backup control plane configurations
tar -czf control-plane-backup-$(date +%Y%m%d).tar.gz \
  /etc/kubernetes/pki/ \
  /etc/kubernetes/*.conf \
  /etc/kubernetes/manifests/
```

### Cluster Recovery Scenarios

**Total Cluster Loss with etcd Backup**:
```bash
# 1. Restore etcd from backup
ETCDCTL_API=3 etcdctl snapshot restore etcd-backup.db \
  --data-dir=/var/lib/etcd-restored

# 2. Initialize first control plane with restored data
kubeadm init --ignore-preflight-errors=DirAvailable--var-lib-etcd

# 3. Replace etcd data
systemctl stop kubelet
rm -rf /var/lib/etcd/*
mv /var/lib/etcd-restored/* /var/lib/etcd/
systemctl start kubelet

# 4. Rejoin other control plane nodes
kubeadm join --control-plane ...
```

**Single Control Plane Node Recovery**:
```bash
# If control plane node fails but etcd data is intact:
# 1. Reinstall OS and Kubernetes components
# 2. Copy certificates from other control plane nodes
scp -r master1:/etc/kubernetes/pki/ /etc/kubernetes/

# 3. Rejoin as control plane
kubeadm join --control-plane --certificate-key <key>
```

**etcd Member Recovery**:
```bash
# If single etcd member fails:
# 1. Remove failed member from cluster
ETCDCTL_API=3 etcdctl member remove <member-id>

# 2. Clean data directory on failed node
rm -rf /var/lib/etcd/*

# 3. Re-add member and start etcd
ETCDCTL_API=3 etcdctl member add etcd3 --peer-urls=https://10.0.1.22:2380
# Start etcd with --initial-cluster-state=existing
```

---

## **Best Practices for Production HA Clusters**

### Infrastructure Design

**Geographic Distribution**:
- Spread control plane nodes across availability zones
- Consider network latency impact on etcd performance
- Use dedicated control plane nodes (no workloads)

**Hardware Specifications**:
- Control plane: 4+ CPUs, 8+ GB RAM, SSD storage
- etcd (if external): 8+ CPUs, 16+ GB RAM, high-IOPS SSD
- Network: Low latency, high bandwidth between control plane nodes

**Security Hardening**:
```bash
# Restrict etcd access
iptables -A INPUT -p tcp --dport 2379 -s 10.0.1.0/24 -j ACCEPT
iptables -A INPUT -p tcp --dport 2379 -j DROP

# Use TLS for all components
# Rotate certificates regularly
kubeadm certs renew all

# Enable audit logging
# Set resource limits for control plane pods
```

### Operational Procedures

**Change Management**:
- Test all changes in staging HA cluster first
- Update one control plane node at a time
- Verify cluster health after each change
- Maintain rollback procedures

**Monitoring and Alerting**:
- Monitor etcd performance and cluster health
- Alert on leader election changes
- Track API server response times and error rates
- Monitor certificate expiration dates

**Regular Maintenance**:
```bash
# Weekly etcd defragmentation
ETCDCTL_API=3 etcdctl defrag \
  --endpoints=https://10.0.1.20:2379,https://10.0.1.21:2379,https://10.0.1.22:2379

# Monthly certificate rotation testing
kubeadm certs check-expiration

# Quarterly disaster recovery testing
# Practice full cluster recovery from backups
```

---

## **Exam Tips**

### Key Concepts to Master
- **etcd quorum requirements**: Understand odd numbers and failure tolerance
- **Load balancer configuration**: Know how to set up and troubleshoot
- **Leader election**: Understand how controller-manager and scheduler coordinate
- **Certificate management**: Know certificate locations and renewal

### Common Scenarios
1. **Set up 3-node HA cluster with stacked etcd**
2. **Configure external load balancer for API servers** 
3. **Troubleshoot etcd cluster health issues**
4. **Recover from control plane node failure**
5. **Verify HA components are working correctly**

### Time-Saving Commands
```bash
# Quick HA cluster validation
kubectl get nodes -l node-role.kubernetes.io/control-plane
kubectl get pods -n kube-system -l component=etcd
kubectl get endpoints -n kube-system kube-controller-manager

# Fast troubleshooting
kubectl cluster-info
journalctl -u kubelet -f
ETCDCTL_API=3 etcdctl member list --write-out=table
```

### Critical Details
- controlPlaneEndpoint must be set during kubeadm init (cannot change later)
- --upload-certs is required for additional control plane nodes to join
- etcd backup location: `/var/lib/etcd` (default)
- Leader election happens at endpoint level, not configmap level
- Load balancer must health check /healthz, not just port connectivity