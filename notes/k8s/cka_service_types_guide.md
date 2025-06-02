# CKA Study Guide: ClusterIP, NodePort, LoadBalancer Service Types and Endpoints
category: Kubernetes Certification
tags: cka, kubernetes, exam, kubectl, certification

## **The Service Abstraction: Solving the Dynamic Pod Problem**

In a world where pods are ephemeral and their IP addresses change constantly, applications need a stable way to communicate with each other. Kubernetes Services provide this stability by creating a persistent virtual IP address that automatically routes traffic to healthy pods, regardless of where they're running or how many instances exist.

### The Fundamental Service Challenge

**Why Direct Pod Communication Fails at Scale**:
- **Pod IP Instability**: Pods get new IP addresses when they restart, reschedule, or scale
- **Dynamic Discovery**: Applications can't hardcode IP addresses when replicas change constantly
- **Load Distribution**: Traffic needs to be distributed across multiple pod instances
- **Health Awareness**: Failed pods should be automatically removed from traffic rotation
- **Cross-Cluster Communication**: Services need to work across different network environments

**The Pre-Service Era Problems**:
```bash
# Before Services, applications had to:
# 1. Discover pod IPs manually
kubectl get pods -l app=backend -o jsonpath='{.items[*].status.podIP}'
# Output: 10.244.1.5 10.244.2.8 10.244.3.12

# 2. Implement their own load balancing
# 3. Handle pod failures and replacements
# 4. Manage service discovery and registration
# 5. Deal with network changes manually
```

**What Services Provide**:
- **Stable Virtual IP**: A consistent IP address that never changes
- **Automatic Load Balancing**: Built-in traffic distribution across healthy pods
- **Service Discovery**: DNS-based naming that applications can rely on
- **Health Integration**: Automatic endpoint management based on pod health
- **Multiple Access Patterns**: Different service types for different use cases

---

## **Service Architecture and Components**

### Understanding the Service Ecosystem

```
┌─────────────────────────────────────────────────────────────┐
│                        Service                              │
│                 (Virtual IP + Port)                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│                    Endpoints                                │
│              (List of Pod IP:Port)                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│                      Pods                                   │
│            (Actual Running Instances)                       │
└─────────────────────────────────────────────────────────────┘
```

### The Service Control Loop

**How Services Maintain Pod Mappings**:
```bash
# 1. Service Controller watches for:
#    - New services being created
#    - Pod label changes
#    - Pod health status changes

# 2. Endpoint Controller maintains endpoint lists:
#    - Scans pods matching service selector
#    - Includes only ready pods in endpoints
#    - Updates endpoint list when pods change

# 3. kube-proxy implements service networking:
#    - Creates iptables/IPVS rules for service IPs
#    - Routes traffic to endpoint pods
#    - Handles load balancing and failover
```

**Service Components Interaction**:
```bash
# View service components
kubectl get svc,endpoints,pods -l app=web-app

# Example output showing the relationship:
# NAME                 TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)   AGE
# service/web-app-svc  ClusterIP   10.96.45.123   <none>        80/TCP    5m

# NAME                   ENDPOINTS                           AGE
# endpoints/web-app-svc  10.244.1.5:80,10.244.2.8:80        5m

# NAME                       READY   STATUS    RESTARTS   AGE   IP
# pod/web-app-deployment-abc  1/1     Running   0          5m    10.244.1.5
# pod/web-app-deployment-def  1/1     Running   0          5m    10.244.2.8
```

---

## **ClusterIP: Internal Cluster Communication**

### ClusterIP Architecture and Use Cases

**What ClusterIP Provides**:
- **Cluster-Internal Access**: Service is only accessible from within the cluster
- **Stable Virtual IP**: Allocated from the service CIDR range
- **DNS Integration**: Automatic DNS records for service discovery
- **Load Balancing**: Distributes traffic across all healthy endpoints

**ClusterIP Configuration**:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  labels:
    app: backend
spec:
  type: ClusterIP  # Default type, can be omitted
  selector:
    app: backend
    tier: api
  ports:
  - name: http
    port: 80        # Port exposed by the service
    targetPort: 8080 # Port on the pods
    protocol: TCP
  - name: metrics
    port: 9090
    targetPort: metrics  # Can reference named ports
    protocol: TCP
```

**Advanced ClusterIP Features**:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: advanced-service
spec:
  type: ClusterIP
  clusterIP: 10.96.100.200  # Specify exact IP (optional)
  # clusterIP: None          # Headless service (no virtual IP)
  
  selector:
    app: backend
  
  ports:
  - port: 80
    targetPort: 8080
    
  # Session affinity for sticky sessions
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 10800  # 3 hours
```

### ClusterIP Networking Implementation

**How kube-proxy Implements ClusterIP**:
```bash
# kube-proxy creates iptables rules for service virtual IPs
# Example for service 10.96.45.123:80

# 1. Intercept traffic to service IP
sudo iptables -t nat -L KUBE-SERVICES -n | grep 10.96.45.123

# Example output:
# KUBE-SVC-XYZ123ABC  tcp  --  0.0.0.0/0  10.96.45.123  tcp dpt:80

# 2. Load balance to endpoints
sudo iptables -t nat -L KUBE-SVC-XYZ123ABC -n

# Example rules for 2 endpoints:
# KUBE-SEP-ABC123  all  --  0.0.0.0/0  0.0.0.0/0  statistic mode random probability 0.50000000000
# KUBE-SEP-DEF456  all  --  0.0.0.0/0  0.0.0.0/0

# 3. DNAT to specific pod IPs
sudo iptables -t nat -L KUBE-SEP-ABC123 -n
# DNAT  tcp  --  0.0.0.0/0  0.0.0.0/0  tcp to:10.244.1.5:8080
```

**ClusterIP Traffic Flow**:
```bash
# When pod A connects to service IP:
# 1. Pod sends packet to 10.96.45.123:80
# 2. iptables intercepts packet in KUBE-SERVICES chain
# 3. Packet redirected to KUBE-SVC-XYZ123ABC chain
# 4. Random selection chooses endpoint (KUBE-SEP-ABC123)
# 5. DNAT changes destination to 10.244.1.5:8080
# 6. Packet routed to destination pod
# 7. Response follows reverse path with SNAT

# Monitor service traffic
sudo tcpdump -i any -n "host 10.96.45.123 or host 10.244.1.5"
```

### DNS Integration for ClusterIP Services

**Service DNS Records**:
```bash
# Services get automatic DNS records
# Format: <service-name>.<namespace>.svc.<cluster-domain>

# Example DNS records for backend-service in default namespace:
# backend-service.default.svc.cluster.local  → 10.96.45.123
# backend-service.default.svc                → 10.96.45.123  
# backend-service.default                    → 10.96.45.123
# backend-service                            → 10.96.45.123 (same namespace only)

# Test DNS resolution from a pod
kubectl run test-pod --image=busybox --rm -it -- nslookup backend-service
kubectl run test-pod --image=busybox --rm -it -- nslookup backend-service.default.svc.cluster.local
```

**Port-Specific DNS Records**:
```bash
# Named ports get SRV records
# Format: _<port-name>._<protocol>.<service-name>.<namespace>.svc.<cluster-domain>

# For service with named port "http":
kubectl run test-pod --image=busybox --rm -it -- nslookup _http._tcp.backend-service.default.svc.cluster.local

# SRV record provides port information:
# _http._tcp.backend-service.default.svc.cluster.local. 30 IN SRV 0 100 80 backend-service.default.svc.cluster.local.
```

### Headless Services (ClusterIP: None)

**Understanding Headless Services**:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: headless-service
spec:
  clusterIP: None  # No virtual IP assigned
  selector:
    app: database
  ports:
  - port: 5432
    targetPort: 5432
```

**Headless Service DNS Behavior**:
```bash
# Headless services return pod IPs directly in DNS
kubectl run test-pod --image=busybox --rm -it -- nslookup headless-service

# Example output:
# Name:      headless-service.default.svc.cluster.local
# Address 1: 10.244.1.5 database-0.headless-service.default.svc.cluster.local
# Address 2: 10.244.2.8 database-1.headless-service.default.svc.cluster.local
# Address 3: 10.244.3.12 database-2.headless-service.default.svc.cluster.local

# Use cases for headless services:
# - StatefulSet pod discovery
# - Custom load balancing in applications
# - Service mesh sidecar discovery
# - Database cluster member discovery
```

---

## **NodePort: External Access via Node IPs**

### NodePort Architecture and Implementation

**What NodePort Provides**:
- **External Accessibility**: Service accessible from outside the cluster
- **Node IP Integration**: Service available on every node's IP address
- **Port Allocation**: Automatic assignment from nodePort range (30000-32767)
- **ClusterIP Inheritance**: Includes all ClusterIP functionality

**NodePort Configuration**:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-nodeport
spec:
  type: NodePort
  selector:
    app: web-app
  ports:
  - port: 80          # ClusterIP port
    targetPort: 8080  # Pod port
    nodePort: 30080   # External port (optional, auto-assigned if not specified)
    protocol: TCP
```

**NodePort Range Configuration**:
```bash
# Default NodePort range: 30000-32767
# Configured in kube-apiserver:
# --service-node-port-range=30000-32767

# Check current range
kubectl cluster-info dump | grep -i "service-node-port-range"

# Or check API server configuration
ps aux | grep kube-apiserver | grep -o '\--service-node-port-range=[0-9-]*'
```

### NodePort Networking Implementation

**kube-proxy NodePort Rules**:
```bash
# kube-proxy creates iptables rules for NodePort access
# Example for NodePort 30080

# 1. Accept traffic on NodePort
sudo iptables -t nat -L KUBE-NODEPORTS -n | grep 30080

# Example output:
# KUBE-SVC-XYZ123ABC  tcp  --  0.0.0.0/0  0.0.0.0/0  tcp dpt:30080

# 2. Route to same service chain as ClusterIP
sudo iptables -t nat -L KUBE-SVC-XYZ123ABC -n
# (Same load balancing rules as ClusterIP)

# 3. Source NAT for external traffic
sudo iptables -t nat -L POSTROUTING -n | grep KUBE-POSTROUTING
# SNAT ensures return traffic goes back through same node
```

**NodePort Traffic Flow**:
```bash
# External client connects to node:30080
# 1. Client sends packet to node-ip:30080
# 2. iptables intercepts in KUBE-NODEPORTS chain
# 3. Packet routed to service load balancing rules
# 4. DNAT to selected pod IP:port
# 5. SNAT applied to ensure return path
# 6. Response returns via same node

# Test NodePort connectivity
curl http://<node-ip>:30080
curl http://<any-node-ip>:30080  # Works from any node
```

### NodePort Load Balancing Behavior

**External Traffic Policy**:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: nodeport-service
spec:
  type: NodePort
  externalTrafficPolicy: Local  # Cluster (default) or Local
  selector:
    app: web-app
  ports:
  - port: 80
    targetPort: 8080
    nodePort: 30080
```

**Traffic Policy Comparison**:
```bash
# externalTrafficPolicy: Cluster (default)
# - Traffic distributed to pods on any node
# - Source IP is lost (SNAT applied)
# - Additional network hop for cross-node traffic
# - Even load distribution

# externalTrafficPolicy: Local  
# - Traffic only to pods on receiving node
# - Source IP preserved (no SNAT)
# - No additional network hops
# - Uneven load if pods not evenly distributed

# Check service traffic policy
kubectl get svc nodeport-service -o yaml | grep externalTrafficPolicy
```

**NodePort High Availability Considerations**:
```bash
# NodePort challenges for production:
# - Single node failure affects external access
# - Client needs to know all node IPs
# - No health checking of nodes
# - Manual load balancing required

# Common solutions:
# 1. External load balancer in front of nodes
# 2. DNS round-robin across node IPs
# 3. Hardware load balancer with health checks
# 4. Cloud provider integration (LoadBalancer type)
```

---

## **LoadBalancer: Cloud Provider Integration**

### LoadBalancer Architecture

**What LoadBalancer Provides**:
- **External Load Balancer**: Cloud provider provisions actual load balancer
- **Single External IP**: Stable external IP address for client access
- **Health Checking**: Cloud LB monitors node and pod health
- **NodePort Inheritance**: Includes NodePort and ClusterIP functionality

**LoadBalancer Configuration**:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-loadbalancer
  annotations:
    # Cloud-specific annotations
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: "true"
spec:
  type: LoadBalancer
  selector:
    app: web-app
  ports:
  - port: 80
    targetPort: 8080
    protocol: TCP
  
  # Optional: specify desired external IP
  loadBalancerIP: 203.0.113.45
  
  # Optional: restrict source IPs
  loadBalancerSourceRanges:
  - 192.168.1.0/24
  - 10.0.0.0/16
```

### Cloud Provider Implementations

**AWS Load Balancer Controller**:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: aws-loadbalancer
  annotations:
    # Network Load Balancer (Layer 4)
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    
    # Application Load Balancer (Layer 7) - requires AWS Load Balancer Controller
    service.beta.kubernetes.io/aws-load-balancer-type: "alb"
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
    
    # SSL configuration
    service.beta.kubernetes.io/aws-load-balancer-ssl-cert: "arn:aws:acm:us-west-2:123456789:certificate/abc123"
    service.beta.kubernetes.io/aws-load-balancer-ssl-ports: "443"
    
    # Health check configuration
    service.beta.kubernetes.io/aws-load-balancer-healthcheck-path: "/health"
    service.beta.kubernetes.io/aws-load-balancer-healthcheck-port: "8080"
spec:
  type: LoadBalancer
  selector:
    app: web-app
  ports:
  - port: 443
    targetPort: 8080
    protocol: TCP
```

**Google Cloud Load Balancer**:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: gcp-loadbalancer
  annotations:
    # Internal load balancer
    networking.gke.io/load-balancer-type: "Internal"
    
    # Regional vs Global
    cloud.google.com/load-balancer-type: "External"
    
    # Backend configuration
    cloud.google.com/backend-config: '{"default": "my-backend-config"}'
    
    # Firewall rules
    networking.gke.io/allow-firewall-rules: "true"
spec:
  type: LoadBalancer
  selector:
    app: web-app
  ports:
  - port: 80
    targetPort: 8080
```

**Azure Load Balancer**:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: azure-loadbalancer
  annotations:
    # Internal load balancer
    service.beta.kubernetes.io/azure-load-balancer-internal: "true"
    service.beta.kubernetes.io/azure-load-balancer-internal-subnet: "subnet1"
    
    # Resource group
    service.beta.kubernetes.io/azure-load-balancer-resource-group: "my-resource-group"
    
    # Health probe configuration
    service.beta.kubernetes.io/azure-load-balancer-health-probe-request-path: "/health"
spec:
  type: LoadBalancer
  selector:
    app: web-app
  ports:
  - port: 80
    targetPort: 8080
```

### LoadBalancer Status and Troubleshooting

**LoadBalancer Provisioning Process**:
```bash
# 1. Service created with type: LoadBalancer
kubectl apply -f loadbalancer-service.yaml

# 2. Initially shows <pending> external IP
kubectl get svc web-loadbalancer
# NAME              TYPE           CLUSTER-IP     EXTERNAL-IP   PORT(S)        AGE
# web-loadbalancer  LoadBalancer   10.96.45.123   <pending>     80:30123/TCP   30s

# 3. Cloud controller provisions load balancer
# 4. External IP populated when ready
kubectl get svc web-loadbalancer
# NAME              TYPE           CLUSTER-IP     EXTERNAL-IP    PORT(S)        AGE
# web-loadbalancer  LoadBalancer   10.96.45.123   203.0.113.45   80:30123/TCP   2m
```

**Troubleshooting LoadBalancer Issues**:
```bash
# Check service events
kubectl describe svc web-loadbalancer

# Common failure reasons:
# - Insufficient cloud provider quotas
# - Invalid annotations or configuration
# - Network connectivity issues
# - Cloud controller not properly configured

# Check cloud controller logs
kubectl logs -n kube-system -l app=cloud-controller-manager

# Verify cloud provider credentials
kubectl get secrets -n kube-system | grep cloud

# Test connectivity to LoadBalancer
curl http://203.0.113.45/
curl -I http://203.0.113.45/health
```

---

## **Endpoints: The Service-Pod Connection**

### Understanding Endpoint Objects

**What Endpoints Represent**:
```bash
# Endpoints are the actual IP:port combinations that services route to
kubectl get endpoints

# Example output:
# NAME              ENDPOINTS                                 AGE
# kubernetes        192.168.1.100:6443                       5d
# web-service       10.244.1.5:8080,10.244.2.8:8080         2h
# database-service  10.244.3.12:5432                         1d
```

**Endpoint Object Structure**:
```yaml
apiVersion: v1
kind: Endpoints
metadata:
  name: web-service  # Must match service name
subsets:
- addresses:
  - ip: 10.244.1.5
    targetRef:
      kind: Pod
      name: web-app-deployment-abc123
      namespace: default
  - ip: 10.244.2.8
    targetRef:
      kind: Pod
      name: web-app-deployment-def456
      namespace: default
  ports:
  - port: 8080
    protocol: TCP
```

### Endpoint Controller Behavior

**How Endpoints Are Managed**:
```bash
# Endpoint controller continuously:
# 1. Watches for pods matching service selectors
# 2. Checks pod readiness status
# 3. Updates endpoint lists automatically
# 4. Removes failed/unready pods from endpoints

# Only ready pods are included in endpoints
kubectl get pods -l app=web-app
kubectl get endpoints web-service

# If pods are not ready, they won't appear in endpoints
kubectl describe pod unready-pod | grep "Ready.*False"
kubectl get endpoints web-service  # Won't include unready pod
```

**Manual Endpoint Management**:
```yaml
# Service without selector (manual endpoint management)
apiVersion: v1
kind: Service
metadata:
  name: external-service
spec:
  ports:
  - port: 80
    targetPort: 80
  # No selector means manual endpoint management

---
# Manually created endpoints
apiVersion: v1
kind: Endpoints
metadata:
  name: external-service  # Must match service name
subsets:
- addresses:
  - ip: 192.168.1.100  # External server IP
  - ip: 192.168.1.101
  ports:
  - port: 80
```

### EndpointSlices (Modern Endpoint Management)

**Understanding EndpointSlices**:
```bash
# EndpointSlices replace Endpoints for better scalability
# Introduced in Kubernetes 1.17, GA in 1.21

kubectl get endpointslices

# Example output:
# NAME                    ADDRESSTYPE   PORTS   ENDPOINTS   AGE
# web-service-abc123      IPv4          8080    10.244.1.5,10.244.2.8   2h
# kubernetes-def456       IPv4          6443    192.168.1.100            5d
```

**EndpointSlice Advantages**:
```bash
# Benefits over Endpoints:
# 1. Better scalability (up to 1000 endpoints per slice)
# 2. Support for multiple address types (IPv4, IPv6, FQDN)
# 3. Improved network efficiency
# 4. Better support for topology-aware routing

# Enable EndpointSlice mirroring
kubectl get service web-service -o yaml | grep -A5 metadata.annotations
# endpointslice.kubernetes.io/managed-by: endpointslice-controller.k8s.io
```

### Endpoint Troubleshooting

**Common Endpoint Issues**:
```bash
# Issue 1: Service has no endpoints
kubectl get svc web-service
kubectl get endpoints web-service

# Debugging steps:
# 1. Check if pods exist with correct labels
kubectl get pods -l app=web-app --show-labels

# 2. Check pod readiness
kubectl get pods -l app=web-app -o wide

# 3. Check service selector
kubectl describe svc web-service | grep Selector

# 4. Check readiness probe configuration
kubectl describe pod pod-name | grep -A10 "Readiness"
```

**Endpoint Synchronization Issues**:
```bash
# Issue 2: Endpoints not updating
# Check endpoint controller logs
kubectl logs -n kube-system -l component=kube-controller-manager | grep endpoint

# Check for endpoint controller errors
kubectl get events --field-selector reason=FailedToUpdateEndpoint

# Verify RBAC permissions for endpoint controller
kubectl auth can-i update endpoints --as=system:serviceaccount:kube-system:endpoint-controller
```

---

## **Service Discovery and DNS Integration**

### CoreDNS Configuration for Services

**Service DNS Records**:
```bash
# CoreDNS automatically creates DNS records for services
# A records: <service>.<namespace>.svc.<cluster-domain> → ClusterIP
# SRV records: _<port>._<protocol>.<service>.<namespace>.svc.<cluster-domain>

# Check CoreDNS configuration
kubectl get configmap coredns -n kube-system -o yaml

# Example CoreDNS config:
apiVersion: v1
data:
  Corefile: |
    .:53 {
        errors
        health {
           lameduck 5s
        }
        ready
        kubernetes cluster.local in-addr.arpa ip6.arpa {
           pods insecure
           fallthrough in-addr.arpa ip6.arpa
           ttl 30
        }
        prometheus :9153
        forward . /etc/resolv.conf
        cache 30
        loop
        reload
        loadbalance
    }
```

**DNS-Based Service Discovery**:
```bash
# Test service discovery from within cluster
kubectl run dns-test --image=busybox --rm -it -- sh

# Inside the pod:
nslookup web-service
nslookup web-service.default.svc.cluster.local
nslookup web-service.production.svc.cluster.local

# SRV record lookup for port information
nslookup -type=srv _http._tcp.web-service.default.svc.cluster.local

# Example SRV response:
# _http._tcp.web-service.default.svc.cluster.local service = 0 100 80 web-service.default.svc.cluster.local.
```

### Service Discovery Best Practices

**Environment-Based Service Discovery**:
```yaml
# ConfigMap with service endpoints
apiVersion: v1
kind: ConfigMap
metadata:
  name: service-config
data:
  database_url: "postgresql://database-service.production.svc.cluster.local:5432/app"
  cache_url: "redis://redis-service.production.svc.cluster.local:6379"
  api_url: "http://api-service.production.svc.cluster.local:80"

---
# Pod using service discovery
apiVersion: v1
kind: Pod
metadata:
  name: app-pod
spec:
  containers:
  - name: app
    image: my-app:latest
    envFrom:
    - configMapRef:
        name: service-config
```

**Service Mesh Integration**:
```yaml
# Istio service discovery
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-service
spec:
  hosts:
  - external-api.example.com
  ports:
  - number: 443
    name: https
    protocol: HTTPS
  location: MESH_EXTERNAL
  resolution: DNS
```

---

## **Advanced Service Configuration**

### Session Affinity and Load Balancing

**Client IP Session Affinity**:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: sticky-service
spec:
  selector:
    app: web-app
  ports:
  - port: 80
    targetPort: 8080
  
  # Enable session affinity
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 10800  # 3 hours
```

**Load Balancing Algorithms**:
```bash
# kube-proxy load balancing modes:
# 1. iptables (default): Random selection with equal weights
# 2. IPVS: Multiple algorithms available

# Enable IPVS mode
kubectl edit configmap kube-proxy -n kube-system
# Change mode from "iptables" to "ipvs"

# IPVS algorithms:
# - rr (round robin)
# - lc (least connection)
# - dh (destination hashing)
# - sh (source hashing)
# - sed (shortest expected delay)
# - nq (never queue)

# Check IPVS configuration
sudo ipvsadm -L -n
```

### Multi-Port Services

**Service with Multiple Ports**:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: multi-port-service
spec:
  selector:
    app: web-app
  ports:
  - name: http
    port: 80
    targetPort: 8080
    protocol: TCP
  - name: https
    port: 443
    targetPort: 8443
    protocol: TCP
  - name: metrics
    port: 9090
    targetPort: prometheus
    protocol: TCP
  - name: grpc
    port: 9000
    targetPort: 9000
    protocol: TCP
```

**Named Ports in Pod Specifications**:
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-port-pod
spec:
  containers:
  - name: web-app
    image: my-app:latest
    ports:
    - name: http
      containerPort: 8080
      protocol: TCP
    - name: https
      containerPort: 8443
      protocol: TCP
    - name: prometheus
      containerPort: 9090
      protocol: TCP
```

### Service Topology and Traffic Routing

**Topology Aware Hints**:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: topology-aware-service
  annotations:
    service.kubernetes.io/topology-aware-hints: auto
spec:
  selector:
    app: web-app
  ports:
  - port: 80
    targetPort: 8080
```

**Internal Traffic Policy**:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: local-traffic-service
spec:
  selector:
    app: web-app
  ports:
  - port: 80
    targetPort: 8080
  
  # Route cluster traffic to local endpoints when possible
  internalTrafficPolicy: Local  # Cluster (default) or Local
```

---

## **Service Monitoring and Troubleshooting**

### Service Health Monitoring

**Service Connectivity Testing**:
```bash
#!/bin/bash
# service-connectivity-test.sh

SERVICE_NAME="$1"
NAMESPACE="${2:-default}"

if [ -z "$SERVICE_NAME" ]; then
    echo "Usage: $0 <service-name> [namespace]"
    exit 1
fi

echo "=== Service Connectivity Test: $SERVICE_NAME ==="

# 1. Check service exists
kubectl get svc "$SERVICE_NAME" -n "$NAMESPACE" || exit 1

# 2. Get service details
SERVICE_IP=$(kubectl get svc "$SERVICE_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.clusterIP}')
SERVICE_PORT=$(kubectl get svc "$SERVICE_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.ports[0].port}')
SERVICE_TYPE=$(kubectl get svc "$SERVICE_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.type}')

echo "Service IP: $SERVICE_IP"
echo "Service Port: $SERVICE_PORT"
echo "Service Type: $SERVICE_TYPE"

# 3. Check endpoints
ENDPOINT_COUNT=$(kubectl get endpoints "$SERVICE_NAME" -n "$NAMESPACE" -o jsonpath='{.subsets[*].addresses[*].ip}' | wc -w)
echo "Endpoint Count: $ENDPOINT_COUNT"

if [ "$ENDPOINT_COUNT" -eq 0 ]; then
    echo "ERROR: No endpoints found"
    kubectl describe endpoints "$SERVICE_NAME" -n "$NAMESPACE"
    exit 1
fi

# 4. Test connectivity from within cluster
echo "Testing connectivity..."
kubectl run test-pod --image=busybox --rm -it --restart=Never -- sh -c "
    nc -zv $SERVICE_IP $SERVICE_PORT && echo 'SUCCESS: Service reachable' || echo 'FAILED: Service unreachable'
"

# 5. Test DNS resolution
echo "Testing DNS resolution..."
kubectl run test-pod --image=busybox --rm -it --restart=Never -- sh -c "
    nslookup $SERVICE_NAME.$NAMESPACE.svc.cluster.local && echo 'SUCCESS: DNS resolution working' || echo 'FAILED: DNS resolution failed'
"

# 6. For NodePort services, test external access
if [ "$SERVICE_TYPE" = "NodePort" ]; then
    NODE_PORT=$(kubectl get svc "$SERVICE_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.ports[0].nodePort}')
    NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')
    echo "Testing NodePort access: $NODE_IP:$NODE_PORT"
    curl -m 5 "http://$NODE_IP:$NODE_PORT" || echo "NodePort access test failed"
fi

echo "=== Service connectivity test completed ==="
```

### Performance Monitoring

**Service Performance Metrics**:
```bash
# Monitor service request latency and throughput
kubectl top pods -l app=web-app

# Check service endpoint distribution
kubectl get endpoints web-service -o yaml | grep -A5 addresses

# Monitor connection distribution with IPVS
sudo ipvsadm -L -n --stats

# Example output:
# IP Virtual Server version 1.2.1 (size=4096)
# Prot LocalAddress:Port               Conns   InPkts  OutPkts  InBytes OutBytes
#   -> RemoteAddress:Port
# TCP  10.96.45.123:80                    45      234      189    23.4K    18.9K
#   -> 10.244.1.5:8080                    23      117       94    11.7K     9.4K
#   -> 10.244.2.8:8080                    22      117       95    11.7K     9.5K
```

**Service Monitoring with Prometheus**:
```yaml
# ServiceMonitor for Prometheus scraping
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: web-app-monitor
spec:
  selector:
    matchLabels:
      app: web-app
  endpoints:
  - port: metrics
    path: /metrics
    interval: 30s
```

### Common Service Issues and Solutions

**Issue 1: Service Not Accessible**:
```bash
# Debug service accessibility
kubectl describe svc problematic-service

# Check service configuration
kubectl get svc problematic-service -o yaml

# Verify endpoints exist
kubectl get endpoints problematic-service

# Check pod readiness
kubectl get pods -l app=problematic-app
kubectl describe pod problematic-pod | grep -A10 Readiness

# Test from different pods/namespaces
kubectl run debug-pod --image=busybox --rm -it -- telnet service-ip port
```

**Issue 2: Load Balancing Not Working**:
```bash
# Check if multiple endpoints exist
kubectl get endpoints service-name -o wide

# Test multiple requests to see distribution
for i in {1..10}; do
    kubectl run test-$i --image=busybox --rm --restart=Never -- wget -qO- http://service-name/ | grep hostname
done

# Check kube-proxy configuration
kubectl logs -n kube-system -l k8s-app=kube-proxy | grep -i error

# Verify iptables rules
sudo iptables -t nat -L | grep service-name
```

**Issue 3: External Load Balancer Not Provisioning**:
```bash
# Check service status
kubectl describe svc loadbalancer-service

# Look for events indicating provisioning issues
kubectl get events --field-selector involvedObject.name=loadbalancer-service

# Check cloud controller manager logs
kubectl logs -n kube-system -l app=cloud-controller-manager

# Verify cloud provider configuration
kubectl get secrets -n kube-system | grep cloud
kubectl describe secret cloud-provider-secret -n kube-system
```

---

## **Exam Tips**

### Essential Commands to Master
```bash
# Service management
kubectl create service clusterip web-svc --tcp=80:8080
kubectl create service nodeport web-svc --tcp=80:8080 --node-port=30080
kubectl expose deployment web-app --port=80 --target-port=8080 --type=LoadBalancer

# Service inspection
kubectl get svc,endpoints -o wide
kubectl describe svc service-name
kubectl get endpoints service-name -o yaml
```

### Key Concepts for Exam
- **ClusterIP provides internal cluster access with virtual IP**
- **NodePort adds external access via node IPs on high ports**
- **LoadBalancer adds cloud provider load balancer integration**
- **Endpoints connect services to actual pod IPs automatically**
- **DNS provides service discovery via predictable names**

### Common Exam Scenarios
1. **Create different service types for applications**
2. **Troubleshoot service connectivity issues**
3. **Debug why services have no endpoints**
4. **Test service accessibility from pods**
5. **Configure service with session affinity**
6. **Create headless service for StatefulSet**

### Time-Saving Shortcuts
```bash
# Quick service creation
kubectl expose deploy app --port=80 --type=NodePort

# Fast connectivity test
kubectl run test --image=busybox --rm -it -- wget -qO- http://service-name/

# Quick endpoint check
kubectl get endpoints service-name

# Fast service description
kubectl describe svc service-name | grep -E "(IP|Port|Endpoints)"
```

### Critical Details to Remember
- Services get ClusterIP from service-cidr range (typically 10.96.0.0/12)
- NodePort range is 30000-32767 by default
- Only ready pods appear in endpoints
- Service selector must match pod labels exactly
- LoadBalancer includes NodePort and ClusterIP functionality
- DNS format: service-name.namespace.svc.cluster.local
- Session affinity only supports ClientIP, not cookie-based
- External traffic policy affects source IP preservation and load distribution