# CKA Study Guide: Kubernetes Cluster Upgrades with kubeadm
category: Kubernetes Certification
tags: cka, kubernetes, exam, kubectl, certification

## **The Complexity of Distributed System Upgrades**

Upgrading a Kubernetes cluster is fundamentally different from upgrading a monolithic application. You're coordinating the upgrade of multiple interdependent components across many nodes, each with different compatibility requirements, while maintaining service availability for running workloads.

### Why Kubernetes Upgrades Are Inherently Risky

**API Compatibility Matrix**: Kubernetes follows a strict version skew policy where components must be within specific version ranges of each other. A mismatch can cause:
- Control plane components unable to communicate
- kubelet unable to register with API server
- Applications failing due to deprecated API usage
- Network policies or storage drivers becoming incompatible

**Stateful Component Dependencies**: Unlike stateless web applications, Kubernetes has stateful components (etcd) and complex interdependencies:
- etcd schema changes require careful migration
- Custom Resource Definitions may become incompatible
- Admission controllers might reject previously valid resources
- Network plugins may need updates to support new features

**Zero-Downtime Expectations**: Modern applications expect continuous availability, but upgrades involve:
- Temporary API server unavailability during control plane upgrades
- Pod rescheduling when nodes are drained and upgraded
- Potential service disruption if workloads aren't designed for high availability

### The Financial Impact of Failed Upgrades

**Direct Costs**:
- Downtime costs (often $5,000-$100,000+ per hour for enterprise applications)
- Emergency response team costs
- Recovery efforts and data restoration

**Indirect Costs**:
- Customer trust and satisfaction impact
- Delayed feature releases while fixing upgrade issues
- Technical debt from rushed rollback decisions
- Regulatory compliance issues if SLA breaches occur

Understanding these risks explains why upgrade procedures are detailed and conservative.

---

## **Understanding Kubernetes Version Skew Policies**

### The N-1 Support Matrix

Kubernetes enforces strict version compatibility rules to ensure cluster stability:

**Control Plane Component Compatibility**:
```
kube-apiserver: N (master version)
kube-controller-manager: N-1 to N
kube-scheduler: N-1 to N
etcd: 3.4.3+ (specific versions tested with each K8s release)
```

**Node Component Compatibility**:
```
kubelet: N-2 to N-1 (cannot be newer than API server)
kube-proxy: N-2 to N-1
kubectl: N-1 to N+1 (one version in either direction)
```

### Why These Restrictions Exist

**API Evolution Management**: The API server is the authoritative source of API definitions. If controller-manager is newer than API server, it might try to use APIs that don't exist yet.

**Graceful Feature Rollout**: Features are added gradually across releases. Version skew policies ensure that components don't assume features exist before they're actually available.

**Testing Matrix Limitations**: Kubernetes project can't test every possible version combination. The supported matrix represents thoroughly tested scenarios.

### Checking Current Versions

```bash
# Check control plane component versions
kubectl version --short

# Check node versions (kubelet and kube-proxy)
kubectl get nodes -o wide

# Check etcd version
kubectl -n kube-system exec etcd-master1 -- etcdctl version

# Detailed component version information
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.nodeInfo.kubeletVersion}{"\t"}{.status.nodeInfo.kubeProxyVersion}{"\n"}{end}'

# Check for deprecated API usage
kubectl api-versions | grep -v v1

# Identify deprecated APIs in use (requires pluto or similar tool)
pluto detect-helm --output json
pluto detect-files -d /path/to/manifests --output json
```

### API Deprecation and Removal Timeline

**Understanding API Lifecycle**:
1. **Alpha** (v1alpha1): Experimental, may change without notice
2. **Beta** (v1beta1): Stable API, deprecated in favor of GA within 9 months
3. **General Availability** (v1): Stable, guaranteed backward compatibility

**Deprecation Timeline Example**:
```
K8s 1.25: extensions/v1beta1 Ingress deprecated (use networking.k8s.io/v1)
K8s 1.26: extensions/v1beta1 Ingress removed
K8s 1.27: policy/v1beta1 PodSecurityPolicy deprecated
K8s 1.28: policy/v1beta1 PodSecurityPolicy removed
```

**Finding Deprecated API Usage**:
```bash
# Check for deprecated API usage in your manifests
grep -r "apiVersion: extensions/v1beta1" /path/to/manifests
grep -r "apiVersion: policy/v1beta1" /path/to/manifests

# Use kubectl to identify deprecated resources
kubectl get ingress.extensions -A 2>/dev/null || echo "No deprecated ingress resources found"
kubectl get podsecuritypolicy.policy 2>/dev/null || echo "No PSP resources found"

# Audit current API usage
kubectl api-resources --verbs=list --output=name | xargs -n 1 kubectl get --show-kind --ignore-not-found -A | grep -E "(extensions|policy)" || echo "No deprecated APIs in use"
```

---

## **Pre-Upgrade Planning and Assessment**

### Cluster Health Validation

**Before any upgrade, validate cluster health**:
```bash
# Check overall cluster status
kubectl cluster-info
kubectl get nodes
kubectl get componentstatuses  # Deprecated but still useful

# Verify all system pods are healthy
kubectl get pods -n kube-system

# Check for resource pressure
kubectl top nodes
kubectl top pods -A --sort-by=memory | head -20

# Validate etcd health
kubectl -n kube-system exec etcd-master1 -- etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  endpoint health

# Check for failing pods or nodes
kubectl get pods -A --field-selector=status.phase!=Running
kubectl get nodes --field-selector=status.phase!=Ready
```

### Workload Assessment

**Identify upgrade impact on applications**:
```bash
# List all deployments and their replica counts
kubectl get deployments -A -o wide

# Check PodDisruptionBudgets
kubectl get pdb -A

# Identify single-replica deployments (high risk during upgrade)
kubectl get deployments -A -o jsonpath='{range .items[?(@.spec.replicas==1)]}{.metadata.namespace}{"\t"}{.metadata.name}{"\t"}{.spec.replicas}{"\n"}{end}'

# Check for StatefulSets (require special handling)
kubectl get statefulsets -A

# Review DaemonSets (affected by node upgrades)
kubectl get daemonsets -A
```

### Backup Strategy Validation

**Comprehensive backup before upgrade**:
```bash
#!/bin/bash
# pre-upgrade-backup.sh

BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/pre-upgrade-$BACKUP_DATE"
mkdir -p "$BACKUP_DIR"

# 1. etcd snapshot
echo "Creating etcd backup..."
ETCDCTL_API=3 etcdctl snapshot save "$BACKUP_DIR/etcd-snapshot.db" \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
  --key=/etc/kubernetes/pki/etcd/healthcheck-client.key

# Verify etcd backup
ETCDCTL_API=3 etcdctl snapshot status "$BACKUP_DIR/etcd-snapshot.db" --write-out=table

# 2. Kubernetes configuration and certificates
echo "Backing up Kubernetes configs..."
tar -czf "$BACKUP_DIR/kubernetes-config.tar.gz" \
  /etc/kubernetes/ \
  /var/lib/kubelet/config.yaml 2>/dev/null

# 3. Export all cluster resources
echo "Exporting cluster resources..."
kubectl get all --all-namespaces -o yaml > "$BACKUP_DIR/all-resources.yaml"
kubectl get pv,pvc,storageclass -o yaml > "$BACKUP_DIR/storage-resources.yaml"
kubectl get crd -o yaml > "$BACKUP_DIR/custom-resources.yaml"

# 4. Export RBAC resources
kubectl get clusterroles,clusterrolebindings,roles,rolebindings -A -o yaml > "$BACKUP_DIR/rbac-resources.yaml"

# 5. Export secrets and configmaps
kubectl get secrets -A -o yaml > "$BACKUP_DIR/secrets.yaml"
kubectl get configmaps -A -o yaml > "$BACKUP_DIR/configmaps.yaml"

# 6. Create restore instructions
cat > "$BACKUP_DIR/restore-instructions.md" << EOF
# Cluster Restore Instructions

## Pre-requisites
- Cluster with same number of nodes
- Same Kubernetes version as backup source
- Same container runtime and CNI

## Restore etcd
\`\`\`bash
systemctl stop kubelet
ETCDCTL_API=3 etcdctl snapshot restore etcd-snapshot.db \\
  --data-dir=/var/lib/etcd-restore
mv /var/lib/etcd /var/lib/etcd-old
mv /var/lib/etcd-restore /var/lib/etcd
systemctl start kubelet
\`\`\`

## Restore configurations
\`\`\`bash
tar -xzf kubernetes-config.tar.gz -C /
systemctl restart kubelet
\`\`\`

Backup created: $(date)
EOF

echo "Backup completed in: $BACKUP_DIR"
ls -la "$BACKUP_DIR"
```

### Upgrade Path Planning

**Determine required upgrade steps**:
```bash
# Check current version
CURRENT_VERSION=$(kubectl version --short | grep "Server Version" | awk '{print $3}')
echo "Current version: $CURRENT_VERSION"

# Check available kubeadm versions
apt list -a kubeadm | head -10

# Plan upgrade path (must be sequential for minor versions)
# Example: 1.26.x -> 1.27.x -> 1.28.x (cannot skip 1.27)

# Check what version kubeadm can upgrade to
kubeadm upgrade plan
```

---

## **Understanding the kubeadm Upgrade Process**

### Upgrade Workflow Philosophy

kubeadm follows a conservative, phase-based approach:

1. **Preflight Checks**: Validate cluster state and upgrade feasibility
2. **Control Plane Upgrade**: Update API server, controller-manager, scheduler, etcd
3. **CNI/DNS Upgrade**: Update cluster networking and DNS components
4. **kubelet and kubectl Upgrade**: Update node-level components
5. **Worker Node Upgrade**: Update worker nodes one by one

### What kubeadm upgrade Actually Does

**Phase 1 - Preflight Validation**:
```bash
# kubeadm checks:
# - Current cluster version and upgrade target compatibility
# - etcd health and backup recommendations
# - Container runtime compatibility
# - Available disk space and system resources
# - Network connectivity between components
# - Certificate expiration dates
```

**Phase 2 - Control Plane Component Upgrade**:
```bash
# kubeadm performs:
# - Updates static pod manifests in /etc/kubernetes/manifests/
# - Waits for new control plane pods to become healthy
# - Updates kubeconfig files with new server information
# - Upgrades cluster-wide resources (RBAC, etc.)
# - Updates CoreDNS and kube-proxy configurations
```

**Phase 3 - Add-on Management**:
```bash
# kubeadm manages:
# - CoreDNS deployment upgrade
# - kube-proxy DaemonSet upgrade  
# - Other kubeadm-managed add-ons
# Note: CNI plugins usually require manual upgrade
```

### Upgrade Scope and Limitations

**What kubeadm DOES upgrade**:
- Control plane static pods (API server, controller-manager, scheduler)
- etcd (if managed by kubeadm)
- CoreDNS
- kube-proxy
- Cluster-level RBAC and configurations

**What kubeadm DOES NOT upgrade**:
- kubelet (must be upgraded separately on each node)
- kubectl (upgrade manually)
- CNI plugins (manage separately)
- Custom add-ons (Ingress controllers, monitoring, etc.)
- Container runtime (containerd, CRI-O)

This separation of concerns allows for granular control but requires understanding of what needs manual intervention.

---

## **Step-by-Step Control Plane Upgrade**

### Pre-Upgrade Preparation

**Update kubeadm first**:
```bash
# Check current kubeadm version
kubeadm version

# Update apt repositories
apt update

# Find target kubeadm version
apt-cache madison kubeadm | grep 1.28

# Upgrade kubeadm to target version
apt-mark unhold kubeadm
apt-get update && apt-get install -y kubeadm=1.28.0-00
apt-mark hold kubeadm

# Verify kubeadm version
kubeadm version
```

### Control Plane Upgrade Process

**Step 1: Plan and validate upgrade**:
```bash
# Generate upgrade plan (run on first control plane node)
kubeadm upgrade plan

# Example output analysis:
# - Shows current and target versions
# - Lists component upgrade paths
# - Warns about manual steps required
# - Estimates upgrade time and impact
```

**Step 2: Upgrade first control plane node**:
```bash
# Drain the control plane node (optional but recommended)
kubectl drain master1 --ignore-daemonsets --delete-emptydir-data

# Apply the upgrade
kubeadm upgrade apply v1.28.0

# Monitor the upgrade process
watch kubectl get pods -n kube-system

# Verify control plane health
kubectl get nodes
kubectl get componentstatuses
kubectl cluster-info
```

**What happens during `kubeadm upgrade apply`**:
```bash
# 1. Preflight checks
[upgrade/config] Making sure the configuration is correct
[upgrade/version] You have chosen to change the cluster version to "v1.28.0"

# 2. Certificate renewal (if needed)
[upgrade/prepull] Pulling images required for setting up a Kubernetes cluster

# 3. Static pod manifest updates
[upgrade/apply] Upgrading your Static Pod-hosted control plane to version "v1.28.0"
[upgrade/staticpods] Writing new Static Pod manifests to "/etc/kubernetes/manifests"

# 4. Health checks
[upgrade/staticpods] Waiting for the kubelet to restart the component
[upgrade/apply] Waiting for the kubelet to restart

# 5. Add-on upgrades
[upgrade/addons] Upgrading to the new "CoreDNS" add-on
```

**Step 3: Upgrade kubelet and kubectl on control plane**:
```bash
# Upgrade kubelet and kubectl
apt-mark unhold kubelet kubectl
apt-get update && apt-get install -y kubelet=1.28.0-00 kubectl=1.28.0-00
apt-mark hold kubelet kubectl

# Restart kubelet
systemctl daemon-reload
systemctl restart kubelet

# Verify kubelet is working
systemctl status kubelet
journalctl -u kubelet -n 50

# Uncordon the node
kubectl uncordon master1

# Verify node status
kubectl get nodes -o wide
```

### Multi-Control-Plane Upgrades

**For additional control plane nodes**:
```bash
# On each additional control plane node:

# 1. Drain the node
kubectl drain master2 --ignore-daemonsets --delete-emptydir-data

# 2. Upgrade kubeadm (same as first master)
apt-mark unhold kubeadm
apt-get update && apt-get install -y kubeadm=1.28.0-00
apt-mark hold kubeadm

# 3. Upgrade control plane components
kubeadm upgrade node

# 4. Upgrade kubelet and kubectl
apt-mark unhold kubelet kubectl
apt-get update && apt-get install -y kubelet=1.28.0-00 kubectl=1.28.0-00
apt-mark hold kubelet kubectl

systemctl daemon-reload
systemctl restart kubelet

# 5. Uncordon the node
kubectl uncordon master2

# 6. Verify cluster health
kubectl get nodes
kubectl get pods -n kube-system | grep master2
```

**Why `kubeadm upgrade node` vs `kubeadm upgrade apply`**:
- **`upgrade apply`**: Used only on the first control plane node, updates cluster-wide configurations
- **`upgrade node`**: Used on additional control plane and worker nodes, updates only local components

---

## **Worker Node Upgrade Process**

### Rolling Worker Node Updates

**The challenge**: Worker nodes run application workloads that must remain available during upgrades. This requires careful orchestration.

**Step-by-step worker upgrade**:
```bash
# 1. Cordon the node (prevent new pods from scheduling)
kubectl cordon worker1

# 2. Drain the node (move existing pods to other nodes)
kubectl drain worker1 --ignore-daemonsets --delete-emptydir-data --force --grace-period=300

# Watch pods being rescheduled
kubectl get pods -A -o wide | grep worker1
```

**Understanding drain behavior**:
```bash
# Drain respects PodDisruptionBudgets by default
kubectl get pdb -A

# Force drain if PDBs are blocking (use carefully)
kubectl drain worker1 --ignore-daemonsets --delete-emptydir-data --disable-eviction

# Drain with longer grace period for slow-stopping apps
kubectl drain worker1 --ignore-daemonsets --delete-emptydir-data --grace-period=600

# Skip certain pods (for debugging)
kubectl drain worker1 --ignore-daemonsets --pod-selector='app!=critical-app'
```

**On the worker node itself**:
```bash
# 3. Upgrade kubeadm
apt-mark unhold kubeadm
apt-get update && apt-get install -y kubeadm=1.28.0-00
apt-mark hold kubeadm

# 4. Upgrade node configuration
kubeadm upgrade node

# 5. Upgrade kubelet and kubectl
apt-mark unhold kubelet kubectl
apt-get update && apt-get install -y kubelet=1.28.0-00 kubectl=1.28.0-00
apt-mark hold kubelet kubectl

# 6. Restart kubelet
systemctl daemon-reload
systemctl restart kubelet

# 7. Verify kubelet health
systemctl status kubelet
journalctl -u kubelet -n 20
```

**From control plane**:
```bash
# 8. Verify node is ready
kubectl get node worker1

# 9. Uncordon the node (allow pod scheduling)
kubectl uncordon worker1

# 10. Verify workloads are redistributed
kubectl get pods -A -o wide | grep worker1
```

### Batch Worker Node Upgrades

**For large clusters, upgrade multiple workers in parallel**:
```bash
#!/bin/bash
# batch-worker-upgrade.sh

WORKERS=("worker1" "worker2" "worker3")
BATCH_SIZE=2

for ((i=0; i<${#WORKERS[@]}; i+=BATCH_SIZE)); do
    batch=("${WORKERS[@]:i:BATCH_SIZE}")
    echo "Upgrading batch: ${batch[*]}"
    
    # Drain nodes in parallel
    for worker in "${batch[@]}"; do
        kubectl drain "$worker" --ignore-daemonsets --delete-emptydir-data &
    done
    wait
    
    # Upgrade nodes in parallel
    for worker in "${batch[@]}"; do
        ssh "$worker" 'bash -s' << 'EOF' &
            apt-mark unhold kubeadm kubelet kubectl
            apt-get update && apt-get install -y kubeadm=1.28.0-00 kubelet=1.28.0-00 kubectl=1.28.0-00
            apt-mark hold kubeadm kubelet kubectl
            kubeadm upgrade node
            systemctl daemon-reload
            systemctl restart kubelet
EOF
    done
    wait
    
    # Uncordon nodes
    for worker in "${batch[@]}"; do
        kubectl uncordon "$worker"
    done
    
    # Wait for nodes to be ready before next batch
    for worker in "${batch[@]}"; do
        kubectl wait --for=condition=Ready node/"$worker" --timeout=300s
    done
    
    echo "Batch complete: ${batch[*]}"
    sleep 30  # Brief pause between batches
done
```

**Considerations for batch upgrades**:
- **Cluster capacity**: Ensure remaining nodes can handle workload from drained nodes
- **PodDisruptionBudgets**: May prevent draining if too many replicas would be unavailable
- **Network policies**: Ensure pods can still reach each other after rescheduling
- **Persistent volumes**: StatefulSets with local storage cannot be moved

---

## **Advanced Upgrade Scenarios**

### CNI Plugin Upgrades

**CNI plugins require separate upgrade procedures**:

**Calico upgrade example**:
```bash
# Check current Calico version
kubectl get pods -n calico-system -o jsonpath='{.items[*].spec.containers[*].image}' | tr ' ' '\n' | grep calico | sort -u

# Download new Calico manifests
curl -O https://raw.githubusercontent.com/projectcalico/calico/v3.26.1/manifests/tigera-operator.yaml

# Review changes before applying
kubectl diff -f tigera-operator.yaml

# Apply upgrade
kubectl apply -f tigera-operator.yaml

# Monitor upgrade progress
kubectl get pods -n calico-system -w

# Verify networking after upgrade
kubectl run test-pod --image=busybox --restart=Never -- sleep 3600
kubectl exec test-pod -- nslookup kubernetes.default
kubectl delete pod test-pod
```

**Flannel upgrade example**:
```bash
# Check current Flannel version
kubectl get daemonset -n kube-system kube-flannel-ds -o jsonpath='{.spec.template.spec.containers[*].image}'

# Apply new Flannel manifest
kubectl apply -f https://raw.githubusercontent.com/coreos/flannel/master/Documentation/kube-flannel.yml

# Flannel updates as rolling update automatically
kubectl rollout status daemonset/kube-flannel-ds -n kube-system

# Verify pod networking
kubectl get pods -A -o wide | grep flannel
```

### etcd Upgrades

**etcd upgrades are handled by kubeadm but require special attention**:

**Before etcd upgrade**:
```bash
# Backup etcd data
ETCDCTL_API=3 etcdctl snapshot save /backup/etcd-pre-upgrade.db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
  --key=/etc/kubernetes/pki/etcd/healthcheck-client.key

# Check etcd cluster health
ETCDCTL_API=3 etcdctl endpoint health \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
  --key=/etc/kubernetes/pki/etcd/healthcheck-client.key

# Check etcd member list
ETCDCTL_API=3 etcdctl member list \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
  --key=/etc/kubernetes/pki/etcd/healthcheck-client.key
```

**Monitor etcd during upgrade**:
```bash
# Watch etcd pods during upgrade
kubectl get pods -n kube-system -l component=etcd -w

# Check etcd logs for errors
kubectl logs -n kube-system etcd-master1 -f

# Verify etcd performance after upgrade
ETCDCTL_API=3 etcdctl endpoint status \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
  --key=/etc/kubernetes/pki/etcd/healthcheck-client.key \
  --write-out=table
```

### Custom Resource Definition Updates

**CRDs may require manual attention during upgrades**:

```bash
# List all CRDs before upgrade
kubectl get crd

# Check for deprecated CRD versions
kubectl get crd -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.versions[*].name}{"\n"}{end}'

# Update CRDs if needed (example with cert-manager)
kubectl apply -f https://github.com/jetstack/cert-manager/releases/download/v1.13.0/cert-manager.crds.yaml

# Verify CRD instances still work
kubectl get certificates -A
kubectl describe certificate example-cert
```

---

## **Troubleshooting Upgrade Failures**

### Common Failure Scenarios

**Control Plane Upgrade Failures**:

**Scenario 1: API Server Won't Start**
```bash
# Check static pod manifest
cat /etc/kubernetes/manifests/kube-apiserver.yaml

# Check kubelet logs
journalctl -u kubelet -f

# Common issues:
# - Invalid configuration in manifest
# - Certificate problems
# - Port conflicts
# - Insufficient resources

# Rollback approach:
# 1. Restore previous manifest from backup
cp /backup/kubernetes-config/manifests/kube-apiserver.yaml /etc/kubernetes/manifests/
systemctl restart kubelet
```

**Scenario 2: etcd Upgrade Failure**
```bash
# Check etcd pod logs
kubectl logs -n kube-system etcd-master1

# Common etcd issues:
# - Data directory permissions
# - Disk space exhaustion
# - Network connectivity between etcd members
# - Configuration mismatch

# Emergency etcd recovery:
systemctl stop kubelet
ETCDCTL_API=3 etcdctl snapshot restore /backup/etcd-pre-upgrade.db \
  --data-dir=/var/lib/etcd-restore
mv /var/lib/etcd /var/lib/etcd-failed
mv /var/lib/etcd-restore /var/lib/etcd
chown -R etcd:etcd /var/lib/etcd
systemctl start kubelet
```

**Scenario 3: Control Plane Split Brain**
```bash
# Check if multiple API servers are running different versions
kubectl get pods -n kube-system -l component=kube-apiserver -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[0].image}{"\n"}{end}'

# Check cluster health from each control plane node
kubectl --kubeconfig=/etc/kubernetes/admin.conf get nodes

# Resolution:
# 1. Stop kubelet on problematic nodes
# 2. Restore consistent configuration
# 3. Restart in sequence (leader first)
```

### Worker Node Upgrade Failures

**Scenario 1: kubelet Won't Start After Upgrade**
```bash
# Check kubelet logs
journalctl -u kubelet -f

# Common kubelet issues:
# - Configuration file incompatibility
# - Container runtime connectivity
# - Certificate problems
# - Resource constraints

# Debug kubelet configuration
kubelet --config=/var/lib/kubelet/config.yaml --dry-run

# Check container runtime
crictl info
crictl ps

# Rollback kubelet if needed
apt-get install -y kubelet=1.27.0-00
systemctl restart kubelet
```

**Scenario 2: Pods Stuck in Terminating State**
```bash
# Identify stuck pods
kubectl get pods -A | grep Terminating

# Force delete stuck pods (use carefully)
kubectl delete pod stuck-pod --grace-period=0 --force

# Check for finalizers preventing deletion
kubectl get pod stuck-pod -o yaml | grep finalizers

# Remove finalizers if safe
kubectl patch pod stuck-pod -p '{"metadata":{"finalizers":null}}'

# Investigate underlying cause
kubectl describe pod stuck-pod
kubectl logs stuck-pod --previous
```

**Scenario 3: Node Not Ready After Upgrade**
```bash
# Check node conditions
kubectl describe node worker1

# Common "NotReady" causes:
# - kubelet not running
# - CNI plugin issues
# - Resource pressure
# - Container runtime problems

# Debug network issues
# On the node:
ip route show
iptables -L -n
systemctl status containerd

# Test pod scheduling
kubectl run debug-pod --image=busybox --restart=Never --overrides='{"spec":{"nodeName":"worker1"}}' -- sleep 3600
kubectl get pod debug-pod -o wide
```

### Rollback Procedures

**Control Plane Rollback**:
```bash
#!/bin/bash
# control-plane-rollback.sh

PREVIOUS_VERSION="1.27.0"

echo "Rolling back control plane to $PREVIOUS_VERSION"

# 1. Downgrade kubeadm
apt-mark unhold kubeadm
apt-get install -y kubeadm=$PREVIOUS_VERSION-00
apt-mark hold kubeadm

# 2. Rollback cluster configuration
kubeadm upgrade apply $PREVIOUS_VERSION --force

# 3. Downgrade kubelet and kubectl
apt-mark unhold kubelet kubectl
apt-get install -y kubelet=$PREVIOUS_VERSION-00 kubectl=$PREVIOUS_VERSION-00
apt-mark hold kubelet kubectl

systemctl daemon-reload
systemctl restart kubelet

echo "Rollback complete, verify cluster health"
kubectl get nodes
kubectl get pods -n kube-system
```

**Worker Node Rollback**:
```bash
# Simpler worker rollback (per node)
apt-mark unhold kubeadm kubelet kubectl
apt-get install -y kubeadm=1.27.0-00 kubelet=1.27.0-00 kubectl=1.27.0-00
apt-mark hold kubeadm kubelet kubectl

kubeadm upgrade node  # Apply previous configuration
systemctl daemon-reload
systemctl restart kubelet
```

---

## **Post-Upgrade Validation and Testing**

### Comprehensive Cluster Validation

**System-Level Validation**:
```bash
#!/bin/bash
# post-upgrade-validation.sh

echo "=== Post-Upgrade Validation ==="

# 1. Check cluster basic health
echo "Checking cluster health..."
kubectl cluster-info
kubectl get nodes -o wide
kubectl get componentstatuses 2>/dev/null || echo "ComponentStatuses deprecated"

# 2. Verify all system pods are running
echo "Checking system pods..."
kubectl get pods -n kube-system
UNHEALTHY_PODS=$(kubectl get pods -n kube-system --field-selector=status.phase!=Running --no-headers | wc -l)
if [ $UNHEALTHY_PODS -gt 0 ]; then
    echo "WARNING: $UNHEALTHY_PODS system pods are not running"
    kubectl get pods -n kube-system --field-selector=status.phase!=Running
fi

# 3. Test API server functionality
echo "Testing API server..."
kubectl auth can-i '*' '*' --as=system:admin
kubectl get events --limit=5

# 4. Test scheduler functionality
echo "Testing scheduler..."
kubectl run upgrade-test --image=nginx --restart=Never
sleep 10
kubectl get pod upgrade-test -o wide
kubectl delete pod upgrade-test

# 5. Test networking
echo "Testing networking..."
kubectl run net-test --image=busybox --restart=Never -- sleep 3600
sleep 5
kubectl exec net-test -- nslookup kubernetes.default
kubectl exec net-test -- wget -qO- httpbin.org/ip --timeout=10
kubectl delete pod net-test

# 6. Verify persistent volumes
echo "Checking storage..."
kubectl get pv,pvc -A
kubectl get storageclass

# 7. Test RBAC
echo "Testing RBAC..."
kubectl auth can-i create pods --as=system:anonymous 2>/dev/null
if [ $? -eq 0 ]; then
    echo "WARNING: Anonymous users can create pods"
fi

echo "=== Validation Complete ==="
```

### Application-Level Testing

**Workload Validation**:
```bash
# Check all deployments are healthy
kubectl get deployments -A
kubectl get deployments -A -o jsonpath='{range .items[?(@.status.readyReplicas!=@.status.replicas)]}{.metadata.namespace}{"\t"}{.metadata.name}{"\t"}{.status.readyReplicas}/{.status.replicas}{"\n"}{end}'

# Test rolling update capability
kubectl create deployment test-rollout --image=nginx:1.20
kubectl scale deployment test-rollout --replicas=3
kubectl set image deployment/test-rollout nginx=nginx:1.21
kubectl rollout status deployment/test-rollout
kubectl delete deployment test-rollout

# Verify StatefulSets
kubectl get statefulsets -A
for sts in $(kubectl get statefulsets -A -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name} {end}'); do
    echo "Checking StatefulSet: $sts"
    kubectl rollout status statefulset/$sts
done

# Test service connectivity
kubectl get services -A
kubectl run service-test --image=busybox --restart=Never -- sleep 3600
kubectl exec service-test -- nslookup kubernetes.default.svc.cluster.local
kubectl delete pod service-test
```

### Performance Validation

**Resource Usage Monitoring**:
```bash
# Monitor resource usage after upgrade
kubectl top nodes
kubectl top pods -A --sort-by=memory | head -20

# Check for resource pressure
kubectl describe nodes | grep -E "(Pressure|Allocatable|Allocated)"

# Monitor etcd performance
kubectl -n kube-system exec etcd-master1 -- etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  endpoint status --write-out=table

# Check API server response times
kubectl get --raw /healthz -v 6 2>&1 | grep "Response Status"
time kubectl get nodes >/dev/null
```

**Load Testing**:
```bash
# Simple load test for API server
for i in {1..100}; do
    kubectl get nodes >/dev/null &
done
wait
echo "Load test completed"

# Test pod creation performance
time (
    for i in {1..10}; do
        kubectl run perf-test-$i --image=busybox --restart=Never -- sleep 60 &
    done
    wait
)

# Cleanup
kubectl delete pods -l run=perf-test
```

---

## **Best Practices for Production Upgrades**

### Change Management and Planning

**Upgrade Windows and Communication**:
```bash
# Create upgrade runbook template
cat > upgrade-runbook.md << 'EOF'
# Kubernetes Upgrade Runbook

## Pre-Upgrade Checklist
- [ ] Cluster health validated
- [ ] Backup completed and verified
- [ ] Application teams notified
- [ ] Rollback plan confirmed
- [ ] Emergency contacts available

## Upgrade Steps
1. [ ] Control plane upgrade (Master 1)
2. [ ] Control plane validation
3. [ ] Control plane upgrade (Masters 2-3)
4. [ ] Worker node upgrades (batch 1)
5. [ ] Application validation
6. [ ] Worker node upgrades (remaining batches)

## Post-Upgrade Validation
- [ ] All nodes ready
- [ ] All system pods running
- [ ] Application health checks passed
- [ ] Performance metrics normal

## Rollback Triggers
- API server unavailable for >5 minutes
- >20% of application pods failing
- Critical application functionality broken
- Performance degradation >50%
EOF
```

**Automated Testing Pipeline**:
```yaml
# .github/workflows/upgrade-test.yml
name: Kubernetes Upgrade Test
on:
  schedule:
    - cron: '0 2 * * 1'  # Weekly on Monday
  workflow_dispatch:

jobs:
  upgrade-test:
    runs-on: ubuntu-latest
    steps:
    - name: Create test cluster
      run: |
        kind create cluster --config=test-cluster-config.yaml
        
    - name: Deploy test applications
      run: |
        kubectl apply -f test-applications/
        kubectl wait --for=condition=ready pod -l app=test-app --timeout=300s
        
    - name: Perform upgrade
      run: |
        # Simulate upgrade process
        ./scripts/upgrade-test-cluster.sh
        
    - name: Validate post-upgrade
      run: |
        ./scripts/validate-cluster.sh
        kubectl get pods -A
        
    - name: Cleanup
      run: |
        kind delete cluster
```

### Blue-Green Cluster Strategy

**For critical production environments**:
```bash
#!/bin/bash
# blue-green-upgrade.sh

# Assumes you have infrastructure automation (Terraform, etc.)

echo "Starting blue-green cluster upgrade"

# 1. Create new cluster (green) with target version
terraform -chdir=infrastructure/green apply -var="k8s_version=1.28.0"

# 2. Deploy applications to green cluster
kubectl --kubeconfig=green-cluster.conf apply -f applications/

# 3. Run validation tests on green cluster
./scripts/validate-applications.sh green-cluster.conf

# 4. Update DNS/load balancer to point to green cluster
# (Implementation depends on your infrastructure)

# 5. Monitor green cluster for issues
echo "Monitoring green cluster for 30 minutes..."
sleep 1800

# 6. If successful, destroy blue cluster
read -p "Green cluster stable? Destroy blue cluster? (y/N): " confirm
if [[ $confirm == [yY] ]]; then
    terraform -chdir=infrastructure/blue destroy
    echo "Blue-green upgrade completed"
else
    echo "Rolling back to blue cluster"
    # Revert DNS/load balancer
fi
```

### Monitoring During Upgrades

**Real-time Health Monitoring**:
```bash
#!/bin/bash
# upgrade-monitor.sh

# Monitor key metrics during upgrade
while true; do
    clear
    echo "=== Kubernetes Upgrade Monitor ==="
    echo "Time: $(date)"
    echo
    
    echo "Node Status:"
    kubectl get nodes --no-headers | awk '{print $1 "\t" $2}'
    echo
    
    echo "Control Plane Pods:"
    kubectl get pods -n kube-system -l tier=control-plane --no-headers | awk '{print $1 "\t" $3}'
    echo
    
    echo "API Server Responsiveness:"
    time kubectl get --raw /healthz >/dev/null 2>&1 && echo "API server responsive" || echo "API server slow/unresponsive"
    echo
    
    echo "etcd Health:"
    kubectl -n kube-system exec etcd-master1 -- etcdctl \
      --endpoints=https://127.0.0.1:2379 \
      --cacert=/etc/kubernetes/pki/etcd/ca.crt \
      --cert=/etc/kubernetes/pki/etcd/server.crt \
      --key=/etc/kubernetes/pki/etcd/server.key \
      endpoint health 2>/dev/null || echo "etcd health check failed"
    
    sleep 30
done
```

**Alert Integration**:
```yaml
# prometheus-upgrade-alerts.yml
groups:
- name: kubernetes-upgrade
  rules:
  - alert: UpgradeAPIServerDown
    expr: up{job="kubernetes-apiservers"} == 0
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "API server down during upgrade"
      
  - alert: UpgradeEtcdDown
    expr: up{job="etcd"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "etcd down during upgrade"
      
  - alert: UpgradeHighErrorRate
    expr: rate(apiserver_request_total{code=~"5.."}[5m]) > 0.1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High error rate during upgrade"
```

---

## **Version-Specific Upgrade Considerations**

### Major Version Changes

**Kubernetes 1.24 → 1.25 Changes**:
```bash
# Key changes to validate:
# 1. PodSecurityPolicy removal (replaced by Pod Security Standards)
kubectl get podsecuritypolicy 2>/dev/null && echo "PSPs found - migration needed"

# 2. Ingress API changes
kubectl get ingress.extensions -A 2>/dev/null && echo "Old Ingress API in use"

# Migration script for PSP to PSS
kubectl label namespace default pod-security.kubernetes.io/enforce=baseline
kubectl label namespace default pod-security.kubernetes.io/audit=restricted
kubectl label namespace default pod-security.kubernetes.io/warn=restricted
```

**Kubernetes 1.25 → 1.26 Changes**:
```bash
# Key changes:
# 1. CRI v1alpha2 removal
crictl info | grep -i version

# 2. Dynamic kubelet configuration removal
kubectl get configmap -n kube-system kubelet-config-* 2>/dev/null
```

**Kubernetes 1.27 → 1.28 Changes**:
```bash
# Key changes:
# 1. Legacy package repositories deprecated
# Update apt sources before upgrade
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.28/deb/Release.key | gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.28/deb/ /' | tee /etc/apt/sources.list.d/kubernetes.list
```

### Container Runtime Considerations

**containerd upgrades alongside Kubernetes**:
```bash
# Check containerd compatibility
containerd --version
crictl info

# Update containerd if needed
apt-get update && apt-get install -y containerd.io

# Restart containerd and kubelet
systemctl restart containerd
systemctl restart kubelet

# Verify functionality
crictl ps
kubectl get nodes
```

**CRI-O upgrade considerations**:
```bash
# CRI-O versions must match Kubernetes minor versions
# Check current CRI-O version
crio version

# Update CRI-O version to match Kubernetes
# (Installation process varies by distribution)

# Restart after upgrade
systemctl restart crio
systemctl restart kubelet
```

---

## **Exam Tips**

### Key Upgrade Concepts
- **Version skew policy**: Control plane must be upgraded before workers, kubelet cannot be newer than API server
- **Sequential minor versions**: Cannot skip minor versions (1.26 → 1.27 → 1.28)
- **Component upgrade order**: kubeadm → control plane → worker nodes
- **Backup before upgrade**: Always backup etcd and configurations

### Common Exam Scenarios
1. **Upgrade control plane from version X to Y**: Know the full kubeadm workflow
2. **Upgrade worker nodes safely**: Understand drain/cordon/uncordon process
3. **Troubleshoot failed upgrades**: Identify common failure points and resolution
4. **Validate upgrade success**: Check cluster health and application functionality

### Time-Saving Commands
```bash
# Quick upgrade status check
kubectl get nodes -o wide
kubectl version --short
kubeadm version

# Fast health validation
kubectl get pods -n kube-system
kubectl cluster-info
kubectl get componentstatuses

# Emergency rollback check
ls /etc/kubernetes/manifests/
journalctl -u kubelet -n 20
```

### Critical Details to Remember
- Use `kubeadm upgrade apply` only on first control plane node
- Use `kubeadm upgrade node` on additional control plane and worker nodes
- Always upgrade kubeadm first, then use it to upgrade cluster components
- kubelet and kubectl must be upgraded separately on each node
- CNI plugins require separate upgrade procedures
- PodDisruptionBudgets can block node draining
- etcd backups are mandatory before any upgrade
- Validate cluster health before and after each phase