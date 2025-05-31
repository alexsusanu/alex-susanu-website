# Kubernetes Networking: Complete Deep Technical Guide
category: DevOps
tags: kubernetes, networking, cni, pod-networking, cluster-networking, network-policies, ingress, dns

## Introduction to Kubernetes Networking

Kubernetes networking is fundamentally different from traditional server networking. Instead of static IP addresses assigned to physical machines, Kubernetes creates a **flat network space** where every pod gets its own IP address that can communicate with every other pod in the cluster, regardless of which physical node they're running on.

### The Four Kubernetes Networking Problems

Kubernetes networking solves four fundamental problems:

**1. Container-to-Container Communication (within same pod)**
- Containers in the same pod share a network namespace
- They communicate via `localhost` and must use different ports
- Solved by the shared network namespace created by the pause container

**2. Pod-to-Pod Communication (across the cluster)**  
- Every pod gets its own cluster-wide unique IP address
- Pods can communicate directly without NAT (Network Address Translation)
- This requires a **flat network** where all pod IPs are routable

**3. Pod-to-Service Communication (stable endpoints)**
- Services provide stable virtual IPs that don't change when pods restart
- Load balancing and service discovery through DNS
- Implemented through kube-proxy and iptables/IPVS rules

**4. External-to-Service Communication (outside world to cluster)**
- Ingress controllers, LoadBalancers, and NodePorts
- Bringing external traffic into the cluster and routing it to the right pods

### What "Flat Network" Actually Means

A **flat network** means all pods can reach all other pods directly using their IP addresses, as if they were all connected to the same giant switch. There's no NAT, no port forwarding, no complex routing - just direct IP communication.

**Traditional Server Networking:**
```
Server A (10.0.1.5) → Router → NAT → Internet → NAT → Router → Server B (192.168.1.10)
```

**Kubernetes Flat Network:**
```
Pod A (10.244.1.5) → Direct IP communication → Pod B (10.244.2.10)
```

This flat network is **virtual** - it's created by software (CNI plugins) that handle the actual packet routing across physical network infrastructure.

## Pod Networking Deep Dive

### How Pods Get IP Addresses

When Kubernetes schedules a pod to a node, the **Container Network Interface (CNI)** plugin on that node assigns the pod an IP address from a subnet allocated to that node.

**IP Address Allocation Process:**
1. **Cluster CIDR defined** - Cluster admin sets overall IP range (e.g., `10.244.0.0/16`)
2. **Node subnets allocated** - Each node gets a smaller subnet (e.g., Node1: `10.244.1.0/24`, Node2: `10.244.2.0/24`)
3. **Pod IP assignment** - CNI plugin assigns next available IP from node's subnet
4. **Network namespace creation** - Pod gets isolated network stack with assigned IP
5. **Route programming** - CNI ensures other nodes know how to reach this pod IP

**Example IP allocation:**
```
Cluster CIDR: 10.244.0.0/16 (65,536 IPs available)
├── Node1 subnet: 10.244.1.0/24 (254 pod IPs)
│   ├── Pod A: 10.244.1.5
│   ├── Pod B: 10.244.1.6
│   └── Pod C: 10.244.1.7
├── Node2 subnet: 10.244.2.0/24 (254 pod IPs)
│   ├── Pod D: 10.244.2.5
│   └── Pod E: 10.244.2.6
└── Node3 subnet: 10.244.3.0/24 (254 pod IPs)
    └── Pod F: 10.244.3.5
```

### CNI (Container Network Interface) Explained

**CNI** is the standard interface between Kubernetes and network plugins. It's not a single piece of software, but a specification that different networking solutions implement.

**What CNI Actually Does:**
- **IP Address Management (IPAM)** - Assigns and tracks IP addresses
- **Network Interface Creation** - Creates virtual network interfaces in pods
- **Route Management** - Programs routes so pods can reach each other
- **Network Policy Implementation** - Enforces traffic filtering rules

**Popular CNI Plugins:**
- **Flannel** - Simple overlay network using VXLAN
- **Calico** - BGP-based routing with network policies
- **Cilium** - eBPF-based networking with advanced features
- **Weave** - Mesh network with encryption
- **AWS VPC CNI** - Uses real AWS VPC IPs for pods

### Pod Network Namespace Deep Dive

Each pod gets its own **network namespace** - an isolated network stack that includes:

**Network Interface (`eth0`)**
- Virtual ethernet interface inside the pod
- Assigned the pod's cluster IP address
- Connected to the node's network bridge

**Routing Table**
- Default route pointing to node's gateway
- Routes for cluster communication
- Loopback interface (`lo`) for localhost communication

**iptables Rules**
- Packet filtering and NAT rules
- Service routing rules (managed by kube-proxy)
- Network policy enforcement rules

**Example of pod's network view:**
```bash
# Inside a pod, you'd see:
$ ip addr show
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN
    inet 127.0.0.1/8 scope host lo

2: eth0@if123: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue state UP
    inet 10.244.1.5/24 brd 10.244.1.255 scope global eth0

$ ip route show
default via 10.244.1.1 dev eth0
10.244.0.0/16 via 10.244.1.1 dev eth0
10.244.1.0/24 dev eth0 proto kernel scope link src 10.244.1.5
```

### How Pause Containers Work

Every pod actually contains a hidden **pause container** (also called infrastructure container) that:

**Creates the Network Namespace:**
- First container started in the pod
- Sets up the network interfaces and IP address
- Runs a minimal program that just sleeps forever
- Never gets restarted - provides stable network identity

**Shares Network with App Containers:**
- Application containers join the pause container's network namespace
- All containers see the same network interfaces
- Same IP address, same ports, same routing table

**Pod Creation Process:**
```
1. kubelet creates pause container → gets IP 10.244.1.5, creates network namespace
2. CNI plugin sets up networking → routes, bridges, etc.
3. App container A starts → joins pause container's network namespace
4. App container B starts → joins same network namespace
5. All containers now share IP 10.244.1.5
```

**Why Pause Containers Exist:**
- **Stable network identity** - Network persists even if app containers restart
- **Shared networking** - Multiple containers can share the same IP
- **Lifecycle management** - Network setup/teardown independent of app containers

## Cluster Networking Deep Dive

### How Cross-Node Pod Communication Works

When Pod A on Node1 wants to talk to Pod B on Node2, the packet journey involves multiple networking layers:

**Packet Journey Example:**
```
Pod A (10.244.1.5 on Node1) → Pod B (10.244.2.6 on Node2)

1. Pod A sends packet to 10.244.2.6
2. Packet hits Pod A's default route → goes to Node1's network bridge
3. Node1 routing table: "10.244.2.0/24 is on Node2" → forwards to Node2's IP
4. Physical network routes packet from Node1 to Node2
5. Node2 receives packet, routing table: "10.244.2.6 is local" → forwards to Pod B
6. Pod B receives packet
```

### CNI Plugin Implementation Patterns

#### Overlay Networks (Flannel, Weave)
**What "overlay" means:** Creates a virtual network on top of the physical network by encapsulating pod packets inside node packets.

**How VXLAN Overlay Works:**
```
Original packet: Pod A (10.244.1.5) → Pod B (10.244.2.6)
Encapsulated packet: Node1 (192.168.1.10) → Node2 (192.168.1.11) containing the pod packet
```

**Encapsulation Process:**
1. Pod A sends packet to Pod B's IP (10.244.2.6)
2. Node1's VXLAN interface receives packet
3. Node1 wraps packet in UDP header with Node2's physical IP as destination
4. Physical network routes UDP packet from Node1 to Node2
5. Node2's VXLAN interface unwraps packet
6. Node2 delivers original packet to Pod B

**Flannel Example Configuration:**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kube-flannel-cfg
  namespace: kube-system
data:
  cni-conf.json: |
    {
      "name": "cbr0",
      "cniVersion": "0.3.1",
      "plugins": [
        {
          "type": "flannel",
          "delegate": {
            "hairpinMode": true,
            "isDefaultGateway": true
          }
        },
        {
          "type": "portmap",
          "capabilities": {
            "portMappings": true
          }
        }
      ]
    }
  net-conf.json: |
    {
      "Network": "10.244.0.0/16",
      "Backend": {
        "Type": "vxlan"
      }
    }
```

#### BGP-Based Networks (Calico)
**What BGP means:** Border Gateway Protocol - routes are distributed between nodes like internet routing, no packet encapsulation needed.

**How BGP Routing Works:**
1. Each node runs a BGP router (bird/Felix)
2. Nodes advertise their pod subnets to other nodes
3. Each node builds routing table with direct routes to other nodes' pods
4. No encapsulation - packets routed directly through physical network

**Calico Route Advertisement:**
```
Node1 advertises: "I can reach 10.244.1.0/24 via 192.168.1.10"
Node2 advertises: "I can reach 10.244.2.0/24 via 192.168.1.11"
Node3 advertises: "I can reach 10.244.3.0/24 via 192.168.1.12"
```

**Resulting routing table on Node1:**
```bash
$ ip route show
10.244.1.0/24 dev cali123 scope link  # Local pods
10.244.2.0/24 via 192.168.1.11 dev eth0  # Node2's pods
10.244.3.0/24 via 192.168.1.12 dev eth0  # Node3's pods
```

#### Cloud Provider Integration (AWS VPC CNI)
**How cloud integration works:** Uses real cloud network IPs for pods instead of overlay networks.

**AWS VPC CNI Process:**
1. Each node gets multiple Elastic Network Interfaces (ENIs)
2. Each ENI has multiple secondary IP addresses
3. Pods get assigned real VPC IP addresses from these ENIs
4. No overlay needed - AWS VPC routes packets directly

**IP Assignment in AWS:**
```
Node1 (m5.large): 
├── Primary ENI (eth0): 10.0.1.5 (node IP)
├── Secondary ENI (eth1): 
│   ├── Primary IP: 10.0.1.10
│   ├── Secondary IP: 10.0.1.11 → Pod A
│   ├── Secondary IP: 10.0.1.12 → Pod B
│   └── Secondary IP: 10.0.1.13 → Pod C
```

### Node-Level Network Components

#### Bridge Networks
**What a bridge does:** Connects multiple network segments together, like a network switch inside the node.

**Typical Node Bridge Setup:**
```
┌─ Pod A (veth123) ──┐
├─ Pod B (veth456) ──┤
├─ Pod C (veth789) ──┼─ cbr0 bridge ── eth0 (node's physical interface)
├─ docker0 ──────────┤
└─ cni0 ─────────────┘
```

**How veth pairs work:**
- **Virtual Ethernet** pair creates a "virtual cable"
- One end inside pod's network namespace (`eth0`)
- Other end connected to node's bridge (`veth123`)
- Traffic flows through this virtual cable

#### iptables Integration
**How kube-proxy uses iptables:** Creates rules that intercept service traffic and redirect to pod IPs.

**Service traffic flow through iptables:**
```bash
# Example: Service IP 10.96.0.1:80 → Pod IPs 10.244.1.5:8080, 10.244.2.6:8080

# PREROUTING chain - catches incoming packets
-A PREROUTING -j KUBE-SERVICES
-A KUBE-SERVICES -d 10.96.0.1/32 -p tcp -m tcp --dport 80 -j KUBE-SVC-EXAMPLE

# Service chain - load balancing logic
-A KUBE-SVC-EXAMPLE -m statistic --mode random --probability 0.5 -j KUBE-SEP-POD1
-A KUBE-SVC-EXAMPLE -j KUBE-SEP-POD2

# Endpoint chains - DNAT to actual pod IPs
-A KUBE-SEP-POD1 -p tcp -j DNAT --to-destination 10.244.1.5:8080
-A KUBE-SEP-POD2 -p tcp -j DNAT --to-destination 10.244.2.6:8080
```

## Network Policies Deep Dive

### What Network Policies Actually Do

**Network Policies** are Kubernetes resources that create firewall rules controlling traffic between pods. They're implemented by CNI plugins using iptables, eBPF, or other packet filtering mechanisms.

**What "default allow" means:** By default, all pods can communicate with all other pods. Network policies create exceptions to this rule by implementing "default deny" for selected pods.

**Policy Implementation:**
- **No NetworkPolicy** → All traffic allowed
- **NetworkPolicy exists** → Default deny for selected pods, only explicitly allowed traffic passes
- **Multiple policies** → Union of all policies (if any policy allows traffic, it's permitted)

### How Network Policy Enforcement Works

**Technical Implementation (Calico example):**
1. **Policy Creation** - User creates NetworkPolicy resource
2. **Controller Detection** - Calico controller watches for policy changes
3. **Rule Translation** - Controller translates policy to iptables rules
4. **Rule Programming** - Felix agent programs iptables on each node
5. **Traffic Filtering** - Kernel filters packets using iptables rules

**iptables rules generated by NetworkPolicy:**
```bash
# Example: Deny all ingress to app=frontend pods except from app=backend
-A cali-fw-frontend-pods -m set --match-set cali-backend-pods src -j ACCEPT
-A cali-fw-frontend-pods -j DROP
```

### Network Policy Types and Examples

#### Ingress Policies (Incoming Traffic Control)

**Basic Ingress Policy - Allow only from specific pods:**
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: frontend-ingress-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: frontend  # Apply to pods with app=frontend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: backend  # Only allow traffic from app=backend pods
    ports:
    - protocol: TCP
      port: 8080
```

**What this policy actually does:**
1. **Selects target pods** - All pods with `app=frontend` label in `production` namespace
2. **Default deny** - Blocks all incoming traffic to selected pods
3. **Explicit allow** - Only allows TCP traffic on port 8080 from pods labeled `app=backend`
4. **Same namespace** - `podSelector` without `namespaceSelector` means same namespace only

**Namespace-based Ingress Policy:**
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: database-access-policy
  namespace: database
spec:
  podSelector:
    matchLabels:
      app: postgres
  policyTypes:
  - Ingress
  ingress:
  # Allow from production namespace
  - from:
    - namespaceSelector:
        matchLabels:
          name: production
    ports:
    - protocol: TCP
      port: 5432
  # Allow from staging namespace on different port
  - from:
    - namespaceSelector:
        matchLabels:
          name: staging
    ports:
    - protocol: TCP
      port: 5433
```

**IP Block-based Policy (External Traffic):**
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: external-access-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api-gateway
  policyTypes:
  - Ingress
  ingress:
  # Allow from corporate network
  - from:
    - ipBlock:
        cidr: 10.0.0.0/8
        except:
        - 10.0.1.0/24  # Except this specific subnet
    ports:
    - protocol: TCP
      port: 443
  # Allow from specific external IPs
  - from:
    - ipBlock:
        cidr: 203.0.113.0/24  # Partner company network
    ports:
    - protocol: TCP
      port: 8080
```

#### Egress Policies (Outgoing Traffic Control)

**Basic Egress Policy - Restrict outbound connections:**
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: frontend-egress-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: frontend
  policyTypes:
  - Egress
  egress:
  # Allow DNS queries
  - to: []
    ports:
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 53
  # Allow to backend services
  - to:
    - podSelector:
        matchLabels:
          app: backend
    ports:
    - protocol: TCP
      port: 8080
  # Allow to external APIs
  - to:
    - ipBlock:
        cidr: 0.0.0.0/0
    ports:
    - protocol: TCP
      port: 443
```

**Database Egress Policy - Highly Restrictive:**
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: database-egress-policy
  namespace: database
spec:
  podSelector:
    matchLabels:
      app: postgres
  policyTypes:
  - Egress
  egress:
  # Only allow DNS
  - to: []
    ports:
    - protocol: UDP
      port: 53
  # Only allow to backup storage
  - to:
    - ipBlock:
        cidr: 203.0.113.100/32  # Backup server IP
    ports:
    - protocol: TCP
      port: 22  # SSH for backup transfers
```

#### Combined Ingress and Egress Policies

**Complete Microservice Isolation:**
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: payment-service-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: payment-service
  policyTypes:
  - Ingress
  - Egress
  ingress:
  # Only accept from order service
  - from:
    - podSelector:
        matchLabels:
          app: order-service
    ports:
    - protocol: TCP
      port: 8080
  egress:
  # Allow DNS
  - to: []
    ports:
    - protocol: UDP
      port: 53
  # Allow to database
  - to:
    - namespaceSelector:
        matchLabels:
          name: database
      podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
  # Allow to external payment API
  - to:
    - ipBlock:
        cidr: 203.0.113.0/24
    ports:
    - protocol: TCP
      port: 443
```

### Advanced Network Policy Patterns

#### Default Deny All Traffic
```yaml
# Deny all ingress traffic to all pods in namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: production
spec:
  podSelector: {}  # Empty selector = all pods
  policyTypes:
  - Ingress
---
# Deny all egress traffic from all pods in namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-egress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Egress
```

#### Allow All Traffic (Override Default Deny)
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-all-ingress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  ingress:
  - {}  # Empty rule = allow from anywhere
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-all-egress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - {}  # Empty rule = allow to anywhere
```

### Network Policy Troubleshooting

#### Common Policy Issues

**Problem: DNS Not Working After Applying Egress Policy**
```yaml
# BROKEN - Blocks DNS
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
spec:
  podSelector:
    matchLabels:
      app: myapp
  policyTypes:
  - Egress
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: backend
---
# FIXED - Allows DNS
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
spec:
  podSelector:
    matchLabels:
      app: myapp
  policyTypes:
  - Egress
  egress:
  # Always allow DNS
  - to: []
    ports:
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 53
  # Then your other rules
  - to:
    - podSelector:
        matchLabels:
          app: backend
```

**Testing Network Policies:**
```bash
# Test connectivity between pods
kubectl exec -it frontend-pod -- curl backend-service:8080

# Check if policy is applied
kubectl describe networkpolicy policy-name

# View generated iptables rules (on node)
sudo iptables -L -n | grep cali

# Debug with temporary test pod
kubectl run test-pod --image=busybox --rm -it -- /bin/sh
# Then test connectivity from inside
```

## Ingress Controllers Deep Dive

### What Ingress Controllers Actually Do

An **Ingress Controller** is a reverse proxy that runs inside your Kubernetes cluster and routes external HTTP/HTTPS traffic to your services. It's the "front door" to your cluster.

**Why Services Aren't Enough for HTTP:**
- **LoadBalancer services** create one cloud load balancer per service (expensive)
- **NodePort services** require high ports and don't handle SSL well
- **ClusterIP services** have no external access at all

**Ingress Controller Solution:**
- **One external load balancer** for the entire cluster
- **HTTP/HTTPS routing** based on hostnames and paths
- **SSL termination** centralized in one place
- **Advanced features** like redirects, authentication, rate limiting

### How Ingress Traffic Flow Works

**Complete HTTP Request Journey:**
```
External Client (internet)
↓
Cloud Load Balancer (if using LoadBalancer service)
↓
Node IP:Port (NodePort service for ingress controller)
↓
Ingress Controller Pod (nginx, traefik, etc.)
↓
Service Virtual IP (ClusterIP)
↓
Backend Pod IP
```

**Example with real IPs:**
```
1. Client requests: https://api.mycompany.com/users
2. DNS resolves to: 203.0.113.100 (cloud load balancer IP)
3. Load balancer forwards to: 192.168.1.10:30080 (node IP + NodePort)
4. Node routes to: 10.244.1.5:80 (ingress controller pod)
5. Ingress controller routes to: 10.96.0.1:80 (backend service)
6. Service load-balances to: 10.244.2.6:8080 (backend pod)
```

### Ingress Resource vs Ingress Controller

**Ingress Resource** - Kubernetes API object that defines routing rules:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-ingress
spec:
  rules:
  - host: api.mycompany.com
    http:
      paths:
      - path: /users
        pathType: Prefix
        backend:
          service:
            name: user-service
            port:
              number: 80
```

**Ingress Controller** - The actual software that reads Ingress resources and implements the routing:
- **NGINX Ingress Controller** - Most popular, uses nginx as reverse proxy
- **Traefik** - Modern proxy with automatic service discovery
- **HAProxy Ingress** - Enterprise-grade load balancer
- **Cloud Provider Controllers** - AWS ALB, GCP, Azure controllers

### NGINX Ingress Controller Deep Dive

#### How NGINX Ingress Works Internally

**Controller Components:**
1. **Ingress Controller Pod** - Runs nginx and controller logic
2. **ConfigMap** - Global nginx configuration
3. **Service** - Exposes controller (usually LoadBalancer or NodePort)
4. **ServiceAccount/RBAC** - Permissions to watch Ingress resources

**Configuration Generation Process:**
1. **Watch Ingress Resources** - Controller watches for changes
2. **Generate nginx.conf** - Translates Ingress rules to nginx configuration
3. **Reload nginx** - Applies new configuration without dropping connections
4. **Update Status** - Reports back IP addresses and status to Ingress resources

**Generated nginx.conf structure:**
```nginx
# Global settings from ConfigMap
worker_processes auto;

http {
    # Upstream definitions (one per service)
    upstream production-user-service-80 {
        server 10.244.1.5:8080;  # Pod IPs
        server 10.244.2.6:8080;
        server 10.244.3.7:8080;
    }
    
    upstream production-order-service-80 {
        server 10.244.1.8:8080;
        server 10.244.2.9:8080;
    }
    
    # Server blocks (one per host)
    server {
        listen 80;
        server_name api.mycompany.com;
        
        # Path-based routing
        location /users {
            proxy_pass http://production-user-service-80;
        }
        
        location /orders {
            proxy_pass http://production-order-service-80;
        }
    }
    
    server {
        listen 443 ssl;
        server_name api.mycompany.com;
        ssl_certificate /etc/ssl/tls.crt;
        ssl_certificate_key /etc/ssl/tls.key;
        
        # Same location blocks as HTTP
    }
}
```

#### Advanced Ingress Configuration

**SSL Termination with Certificates:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: tls-ingress
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - api.mycompany.com
    - www.mycompany.com
    secretName: mycompany-tls  # Contains tls.crt and tls.key
  rules:
  - host: api.mycompany.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 80
  - host: www.mycompany.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-service
            port:
              number: 80
```

**Path-Based Routing with Different Backends:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: microservices-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$2
spec:
  rules:
  - host: api.mycompany.com
    http:
      paths:
      # /api/v1/users → user-service/users
      - path: /api/v1/users(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: user-service
            port:
              number: 80
      # /api/v1/orders → order-service/orders  
      - path: /api/v1/orders(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: order-service
            port:
              number: 80
      # /api/v1/payments → payment-service/payments
      - path: /api/v1/payments(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: payment-service
            port:
              number: 80
      # Default backend for unmatched paths
      - path: /
        pathType: Prefix
        backend:
          service:
            name: default-backend
            port:
              number: 80
```

**Advanced Annotations for Traffic Control:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: advanced-ingress
  annotations:
    # Rate limiting
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
    
    # Authentication
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/auth-secret: basic-auth-secret
    
    # CORS headers
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/cors-allow-origin: "https://mycompany.com"
    
    # Custom headers
    nginx.ingress.kubernetes.io/configuration-snippet: |
      add_header X-Custom-Header "MyValue" always;
      add_header X-Frame-Options "SAMEORIGIN" always;
    
    # Load balancing method
    nginx.ingress.kubernetes.io/upstream-hash-by: "$request_uri"
    
    # Session affinity
    nginx.ingress.kubernetes.io/affinity: "cookie"
    nginx.ingress.kubernetes.io/session-cookie-name: "INGRESSCOOKIE"
    nginx.ingress.kubernetes.io/session-cookie-expires: "86400"
    
    # Request/response modifications
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "300"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "300"
spec:
  rules:
  - host: api.mycompany.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 80
```

#### Multiple Ingress Controllers

**Why Multiple Controllers:**
- **Different requirements** - Internal vs external traffic
- **Different features** - nginx for HTTP, traefik for gRPC
- **Different environments** - Separate controllers per namespace

**Ingress Class Configuration:**
```yaml
# Define ingress classes
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: nginx-internal
spec:
  controller: k8s.io/ingress-nginx
  parameters:
    apiGroup: k8s.io
    kind: ConfigMap
    name: nginx-internal-config
---
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: nginx-external
spec:
  controller: k8s.io/ingress-nginx
  parameters:
    apiGroup: k8s.io
    kind: ConfigMap
    name: nginx-external-config
---
# Use specific ingress class
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: internal-api
spec:
  ingressClassName: nginx-internal  # Uses internal controller
  rules:
  - host: internal-api.company.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: internal-service
            port:
              number: 80
```

## DNS in Kubernetes Deep Dive

### How Kubernetes DNS Works

Kubernetes runs a **DNS server** (CoreDNS) inside the cluster that provides name resolution for services and pods. Every pod automatically gets configured to use this DNS server.

**DNS Resolution Hierarchy:**
1. **Service DNS** - `service-name.namespace.svc.cluster.local`
2. **Pod DNS** - `pod-ip.namespace.pod.cluster.local` (if enabled)
3. **External DNS** - Forwarded to upstream DNS servers

**Automatic DNS Configuration in Pods:**
```bash
# Every pod gets these DNS settings automatically:
$ cat /etc/resolv.conf
search default.svc.cluster.local svc.cluster.local cluster.local
nameserver 10.96.0.10  # ClusterIP of kube-dns service
options ndots:5
```

### Service Discovery Through DNS

#### DNS Names for Services

**Short Names (same namespace):**
```bash
# From pod in 'default' namespace
curl http://web-service/api        # → web-service.default.svc.cluster.local
curl http://database:5432          # → database.default.svc.cluster.local
```

**Namespace-Qualified Names:**
```bash
# From any namespace
curl http://web-service.production/api     # → web-service.production.svc.cluster.local
curl http://postgres.database:5432        # → postgres.database.svc.cluster.local
```

**Fully Qualified Domain Names (FQDN):**
```bash
# Explicit full DNS name
curl http://api-service.production.svc.cluster.local:8080
curl http://redis.cache.svc.cluster.local:6379
```

#### CoreDNS Configuration

**CoreDNS Corefile Example:**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        errors
        health {
            lameduck 5s
        }
        ready
        # Kubernetes zone - handles cluster.local
        kubernetes cluster.local in-addr.arpa ip6.arpa {
            pods insecure
            fallthrough in-addr.arpa ip6.arpa
            ttl 30
        }
        # Prometheus metrics
        prometheus :9153
        # Forward external queries to upstream DNS
        forward . /etc/resolv.conf {
            max_concurrent 1000
        }
        # Cache responses
        cache 30
        # Detect loops
        loop
        # Reload config automatically
        reload
        # Load balancing
        loadbalance
    }
```

**How DNS Resolution Works:**
1. **Pod makes DNS query** - App requests `web-service`
2. **Search domains applied** - Tries `web-service.default.svc.cluster.local`
3. **CoreDNS receives query** - DNS query hits CoreDNS pod
4. **Kubernetes plugin** - Looks up service in etcd via API server
5. **Returns service ClusterIP** - CoreDNS returns virtual IP address
6. **App connects to service** - App uses IP to connect, kube-proxy handles routing

#### Custom DNS Configuration

**Pod-Level DNS Config:**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: custom-dns-pod
spec:
  dnsPolicy: "None"  # Disable automatic DNS config
  dnsConfig:
    nameservers:
    - 8.8.8.8
    - 1.1.1.1
    searches:
    - mycompany.com
    - example.com
    options:
    - name: ndots
      value: "2"
    - name: edns0
  containers:
  - name: app
    image: busybox
    command: ["sleep", "3600"]
```

**Service-Level DNS Customization:**
```yaml
# Headless service with custom DNS
apiVersion: v1
kind: Service
metadata:
  name: custom-dns-service
  annotations:
    service.alpha.kubernetes.io/tolerate-unready-endpoints: "true"
spec:
  clusterIP: None  # Headless
  selector:
    app: myapp
  ports:
  - port: 80
    targetPort: 8080
---
# StatefulSet pods get predictable DNS names
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: web-statefulset
spec:
  serviceName: custom-dns-service
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: web
        image: nginx
        ports:
        - containerPort: 80
```

**Generated DNS Names:**
```
web-statefulset-0.custom-dns-service.default.svc.cluster.local
web-statefulset-1.custom-dns-service.default.svc.cluster.local  
web-statefulset-2.custom-dns-service.default.svc.cluster.local
```

#### DNS-Based Service Discovery Patterns

**Environment Variable vs DNS:**
```yaml
# Old way - environment variables
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: frontend
    image: myapp:latest
    env:
    - name: BACKEND_HOST
      value: "backend-service.production.svc.cluster.local"
    - name: BACKEND_PORT
      value: "8080"
---
# Better way - DNS resolution in code
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: frontend
    image: myapp:latest
    env:
    - name: BACKEND_URL
      value: "http://backend-service:8080"  # Short name, DNS resolves
```

**Service Mesh DNS Integration:**
```yaml
# Istio service entry for external service
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-api
spec:
  hosts:
  - external-api.mycompany.com
  ports:
  - number: 443
    name: https
    protocol: HTTPS
  location: MESH_EXTERNAL
  resolution: DNS
---
# Now pods can use DNS name as if it's internal
# curl https://external-api.mycompany.com/api
```

## Key Concepts Summary
- **Flat Network** - All pods can communicate directly using IP addresses without NAT
- **CNI Plugins** - Software that implements pod networking (Flannel, Calico, Cilium, etc.)
- **Pod IP Assignment** - Each pod gets unique cluster IP from node's subnet allocated by CNI
- **Pause Containers** - Hidden infrastructure containers that create shared network namespaces
- **Overlay Networks** - Virtual networks on top of physical infrastructure using encapsulation
- **BGP Routing** - Direct routing between nodes without encapsulation using route advertisement
- **Network Policies** - Firewall rules controlling traffic between pods using iptables/eBPF
- **Ingress Controllers** - Reverse proxies that route external HTTP/HTTPS traffic to services
- **CoreDNS** - Cluster DNS server providing service discovery and name resolution
- **Service Mesh** - Additional networking layer providing advanced traffic management and security

## Best Practices / Tips

1. **Choose the right CNI** - Flannel for simplicity, Calico for network policies, Cilium for advanced features
2. **Plan IP addressing** - Size cluster CIDR appropriately, avoid conflicts with existing networks
3. **Use Network Policies** - Implement zero-trust networking with default deny policies
4. **SSL at Ingress** - Terminate SSL/TLS at ingress controllers, not individual services
5. **DNS naming conventions** - Use consistent service naming across environments
6. **Monitor network performance** - Watch for packet loss, latency, and bandwidth issues
7. **Secure inter-pod communication** - Use service mesh or network policies for sensitive workloads
8. **Plan for scale** - Consider networking overhead when planning cluster growth
9. **Test network policies** - Always test connectivity after applying network restrictions
10. **Document network architecture** - Maintain clear documentation of network design and policies

## Common Issues / Troubleshooting

### Problem 1: Pods Can't Communicate Cross-Node
- **Symptom:** Pods on same node work, cross-node communication fails
- **Cause:** CNI misconfiguration, firewall rules, or routing issues
- **Solution:** Check CNI plugin status, node firewall rules, and routing tables

```bash
# Check CNI plugin status
kubectl get pods -n kube-system | grep -E "(flannel|calico|cilium)"

# Test cross-node connectivity
kubectl exec -it pod-on-node1 -- ping pod-ip-on-node2

# Check node routing
ip route show | grep 10.244
```

### Problem 2: Network Policy Not Working
- **Symptom:** Traffic still flows despite network policy
- **Cause:** CNI doesn't support network policies or policy misconfiguration
- **Solution:** Verify CNI supports policies, check policy syntax and selectors

```bash
# Check if CNI supports network policies
kubectl describe networkpolicy test-policy

# Test with simple deny-all policy
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
EOF
```

### Problem 3: DNS Resolution Failures
- **Symptom:** Services unreachable by name, only IP works
- **Cause:** CoreDNS issues, incorrect DNS configuration, or network policies blocking DNS
- **Solution:** Check CoreDNS status, verify DNS configuration, allow DNS traffic

```bash
# Check CoreDNS status
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Test DNS resolution
kubectl exec -it test-pod -- nslookup kubernetes.default.svc.cluster.local

# Check DNS configuration
kubectl exec -it test-pod -- cat /etc/resolv.conf
```

### Problem 4: Ingress Not Accessible
- **Symptom:** External clients can't reach ingress controller
- **Cause:** Ingress controller service misconfiguration or cloud load balancer issues
- **Solution:** Check ingress controller service type and external IP assignment

```bash
# Check ingress controller service
kubectl get svc -n ingress-nginx

# Check ingress controller pods
kubectl get pods -n ingress-nginx

# Check ingress resource status
kubectl describe ingress my-ingress
```

### Problem 5: High Network Latency
- **Symptom:** Slow pod-to-pod communication
- **Cause:** Overlay network overhead, suboptimal routing, or resource constraints
- **Solution:** Consider BGP-based CNI, optimize routing, check resource limits

```bash
# Test network latency between pods
kubectl exec -it pod1 -- ping -c 10 pod2-ip

# Check network interface statistics
kubectl exec -it pod1 -- cat /proc/net/dev

# Monitor network traffic
kubectl top nodes
kubectl top pods
```

## References / Further Reading
- [Kubernetes Networking Concepts](https://kubernetes.io/docs/concepts/services-networking/)
- [CNI Specification](https://github.com/containernetworking/cni)
- [Network Policies Documentation](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Ingress Controllers Comparison](https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/)
- [CoreDNS Documentation](https://coredns.io/manual/toc/)
- [Calico Networking Guide](https://docs.projectcalico.org/networking/)
- [Flannel Networking Guide](https://github.com/flannel-io/flannel)
- [Cilium Documentation](https://docs.cilium.io/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)