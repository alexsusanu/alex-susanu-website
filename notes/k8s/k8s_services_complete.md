# Kubernetes Services: Deep Technical Explanations with Istio and Helm
category: DevOps
tags: kubernetes, services, networking, virtual-ip, endpoints, load-balancing

## Introduction to Kubernetes Service Types

Kubernetes Services provide stable network endpoints for accessing pods. There are five main service types, each designed for specific use cases and access patterns. Understanding when and why to use each type is crucial for proper application architecture.

### What Services Actually Do
- **Stable Endpoints** - An endpoint is a network address (IP + port) where you can connect to something. "Stable" means this address never changes, even when the underlying pods restart, get rescheduled to different nodes, or are replaced with new versions. Without services, you'd have to constantly update your app configuration every time a pod restarts and gets a new IP.

**Example of why stability matters:**
```
Without Service:
Frontend app config: "Connect to backend at 192.168.1.10:8080"
Backend pod restarts and gets new IP: 192.168.1.25:8080
Frontend can't connect anymore - you'd need to manually update config

With Service:
Frontend app config: "Connect to backend-service:80"
Backend pod restarts and gets new IP: 192.168.1.25:8080  
Service still works - Kubernetes automatically updates the routing
Frontend continues working without any changes
```

- **Load Balancing** - Automatically distribute incoming traffic across multiple identical pod replicas, so no single pod gets overwhelmed
- **Service Discovery** - Automatic DNS entries so applications can find each other by name instead of IP addresses
- **Decoupling** - Your frontend doesn't need to know how many backend pods exist or where they're running
- **Health Integration** - Only send traffic to pods that are ready and healthy (failed health checks = no traffic)

### Service Core Concepts
- **Selectors** - Labels that identify which pods belong to the service (like saying "this service includes all pods with app=frontend")
- **Endpoints** - The actual IP addresses and ports of pods currently backing the service (these change as pods start/stop)
- **Ports** - Port mappings between service port (what clients connect to) and pod target ports (what your app actually listens on)
- **Load Balancing** - When multiple pods back a service, Kubernetes automatically distributes incoming requests across all healthy pods. By default, it uses round-robin (request 1 goes to pod A, request 2 to pod B, request 3 to pod C, request 4 back to pod A, etc.)
- **Session Affinity** - Option to make all requests from the same client always go to the same pod (useful for applications that store user state in memory)
- **External Access** - Methods for making services reachable from outside the Kubernetes cluster

**How Load Balancing Actually Works:**
```
Client makes request to service IP: 10.96.0.1:80
↓
Kubernetes networking sees this request
↓ 
Checks available healthy pods: 192.168.1.10, 192.168.1.11, 192.168.1.12
↓
Picks one pod using round-robin algorithm
↓
Forwards request to chosen pod: 192.168.1.11:8080
↓
Pod processes request and responds
↓
Response goes back through the same path to client
```

## ClusterIP Service - Internal Cluster Communication

### What ClusterIP Does
ClusterIP creates a **virtual IP address** - this is an IP address that doesn't belong to any physical network interface or actual machine. Instead, it exists only in software/networking rules. When you create a ClusterIP service, Kubernetes assigns it an IP like `10.96.0.1` from a special IP range, but no actual network card has this IP address.

**What makes it "virtual":**
- No physical network interface has this IP
- The IP exists only in iptables/IPVS rules on each node
- When traffic goes to this IP, networking rules redirect it to actual pod IPs
- The IP persists even when all pods behind it restart or change

ClusterIP provides a **stable internal endpoint** - an endpoint is simply a network address (IP + port) where you can connect to a service. "Internal" means this endpoint is only reachable from inside the Kubernetes cluster - no external traffic can reach it. "Stable" means the IP address never changes, unlike pod IPs which change constantly.

**How the virtual IP works:**
```
Application connects to: 10.96.0.1:80 (virtual IP)
↓
Kubernetes networking intercepts this traffic
↓
Redirects to actual pod IPs: 192.168.1.10:8080, 192.168.1.11:8080, etc.
```

### When to Use ClusterIP
- **Internal microservices communication** - Services that only need to talk to other services within the cluster
- **Database connections** - When your app needs to connect to databases running in the cluster
- **Backend APIs** - Services that should never be exposed to the internet
- **Internal tools** - Monitoring, logging, or utility services used only internally
- **Security-first environments** - When you want zero external exposure

### Why Use ClusterIP
- **Security** - No external access possible, eliminates external attack surface
- **Simplicity** - Default service type, requires minimal configuration
- **Performance** - Direct internal routing without external load balancers
- **Cost** - No cloud provider costs for external load balancers
- **DNS integration** - Automatic service discovery within cluster

### ClusterIP Benefits
- **Zero external exposure** - Impossible to access from outside cluster
- **Automatic load balancing** - Traffic distributed across healthy pods
- **Service discovery** - DNS names automatically created
- **Stable endpoints** - IP addresses don't change when pods restart
- **No configuration overhead** - Works out of the box

### ClusterIP Examples

#### Backend API Service
```yaml
apiVersion: v1
kind: Service
metadata:
  name: user-api
  namespace: backend
spec:
  type: ClusterIP
  selector:
    app: user-api
  ports:
  - port: 80
    targetPort: 8080
---
# Usage: Other services connect via http://user-api/users
```

#### Database Service
```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: database
spec:
  type: ClusterIP
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
---
# Usage: Apps connect via postgres:5432
```

#### Internal Cache Service
```yaml
apiVersion: v1
kind: Service
metadata:
  name: redis-cache
  namespace: infrastructure
spec:
  type: ClusterIP
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
---
# Usage: Apps connect via redis-cache:6379
```

## NodePort Service - External Access via Node Ports

### What NodePort Does
NodePort **opens a specific port on every node** in the cluster - this means Kubernetes configures the operating system on each worker node to listen for incoming network connections on a specific port number (like port 30080). When traffic arrives at any node's IP address on this port, the node's networking rules forward that traffic to the service.

**What "opens a port" actually means:**
- Kubernetes configures iptables/IPVS rules on each node's operating system
- The node's kernel starts accepting connections on that port
- Any external system can connect to `NodeIP:30080` and reach your service
- This happens on ALL nodes simultaneously - you can connect via any node's IP

NodePort **forwards traffic from that port to the service** - when external traffic hits `NodeIP:30080`, the node's networking stack uses the same virtual IP mechanism as ClusterIP to distribute that traffic among the healthy pods backing the service.

**Complete traffic flow:**
```
External client connects to: 192.168.1.100:30080 (any node IP + NodePort)
↓
Node's iptables rules capture this traffic
↓
Traffic gets forwarded to service's virtual IP: 10.96.0.1:80
↓
Service load-balances to actual pods: 192.168.1.10:8080, 192.168.1.11:8080, etc.
```

### When to Use NodePort
- **Development environments** - Quick external access for testing
- **Simple external access** - When you don't need advanced load balancing features
- **Cost-conscious deployments** - Avoiding cloud load balancer costs
- **Legacy system integration** - When external systems expect specific ports
- **On-premises clusters** - When cloud load balancers aren't available
- **Backup access methods** - Secondary access when load balancers fail

### Why Use NodePort
- **Simple external access** - No dependency on cloud providers
- **Cost effective** - No additional cloud charges
- **Direct node access** - Can access via any node IP
- **No external dependencies** - Works in any Kubernetes environment
- **Quick setup** - Immediate external access without complex configuration

### NodePort Benefits
- **Cloud provider independent** - Works on any Kubernetes cluster
- **Multiple access points** - Can access via any node IP address
- **Built-in redundancy** - If one node fails, others still work
- **Simple debugging** - Easy to test and troubleshoot
- **No additional costs** - No cloud load balancer charges

### NodePort Limitations
- **High ports only** - Limited to ports 30000-32767 by default
- **Node dependency** - Must know node IP addresses
- **No SSL termination** - No built-in SSL/TLS handling
- **Manual load balancing** - Need external load balancer for production
- **Security exposure** - Opens ports on all nodes

### NodePort Examples

#### Development Web App
```yaml
apiVersion: v1
kind: Service
metadata:
  name: webapp-dev
  namespace: development
spec:
  type: NodePort
  selector:
    app: webapp
  ports:
  - port: 80
    targetPort: 3000
    nodePort: 30080
---
# Access: http://any-node-ip:30080
```

#### API Testing Service
```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-test
  namespace: testing
spec:
  type: NodePort
  selector:
    app: api-server
  ports:
  - port: 8080
    targetPort: 8080
    nodePort: 30808
---
# Access: http://any-node-ip:30808
```

## LoadBalancer Service - Cloud-Managed External Access

### What LoadBalancer Does
LoadBalancer **provisions an external cloud load balancer** - this means Kubernetes automatically creates and configures a real cloud infrastructure component (like AWS Application Load Balancer, Google Cloud Load Balancer, or Azure Load Balancer) by making API calls to your cloud provider.

**What "provisions" actually means:**
- Kubernetes calls cloud provider APIs (AWS, GCP, Azure, etc.)
- Cloud provider creates a new load balancer resource in your account
- Load balancer gets assigned a public IP address from the cloud provider
- Cloud provider configures the load balancer to forward traffic to your cluster nodes
- You get billed by the cloud provider for this load balancer resource

LoadBalancer **assigns it a public IP address** - the cloud provider allocates a real, routable IP address from their public IP pool. This IP address is accessible from anywhere on the internet (unless you configure source restrictions).

**How LoadBalancer builds on NodePort:**
```
Internet traffic → Cloud Load Balancer (public IP: 203.0.113.100) 
↓
Cloud Load Balancer forwards to → Cluster Nodes (NodePort: 30080)
↓
Node networking forwards to → Service Virtual IP (10.96.0.1:80)
↓
Service distributes to → Actual Pods (192.168.1.10:8080, etc.)
```

**What the cloud load balancer provides:**
- Public IP address that works from anywhere on the internet
- Health checking of your cluster nodes
- SSL/TLS termination (encryption handling)
- DDoS protection and traffic filtering
- Geographic distribution and caching

### When to Use LoadBalancer
- **Production web applications** - Public-facing services needing high availability
- **Cloud deployments** - When using managed Kubernetes services (EKS, GKE, AKS)
- **High traffic applications** - Services requiring robust load balancing
- **SSL termination needed** - When you need SSL/TLS at the load balancer level
- **Global availability** - Multi-region deployments with traffic distribution
- **Enterprise features** - Need advanced health checks, monitoring, and logging

### Why Use LoadBalancer
- **Production ready** - Designed for enterprise production workloads
- **Cloud integration** - Leverages cloud provider managed services
- **Advanced features** - SSL termination, health checks, monitoring
- **High availability** - Built-in redundancy and failover
- **Automatic scaling** - Handles traffic spikes automatically
- **Managed service** - Cloud provider handles maintenance and updates

### LoadBalancer Benefits
- **Public IP address** - Automatic external IP assignment
- **SSL/TLS termination** - Handles encryption at load balancer level
- **Health monitoring** - Advanced health checks and monitoring
- **High availability** - Multiple availability zones support
- **DDoS protection** - Built-in protection against attacks
- **Global load balancing** - Traffic distribution across regions
- **Automatic scaling** - Handles traffic increases automatically
- **Managed maintenance** - Cloud provider handles updates and patches

### LoadBalancer Examples

#### Production Web Application
```yaml
apiVersion: v1
kind: Service
metadata:
  name: webapp-prod
  namespace: production
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-ssl-cert: "arn:aws:acm:us-west-2:123456789:certificate/12345"
spec:
  type: LoadBalancer
  selector:
    app: webapp
    tier: frontend
  ports:
  - name: https
    port: 443
    targetPort: 8443
  - name: http
    port: 80
    targetPort: 8080
---
# Access: https://external-ip-from-cloud-provider
```

## ExternalName Service - External Service Integration

### What ExternalName Does
ExternalName **creates a DNS alias** - a DNS alias is like a nickname in the phone book. Instead of looking up "John Smith" and getting his phone number, you look up "Dad" and the phone book tells you "that's actually John Smith" and gives you his number.

**How DNS aliases work:**
- Your app wants to connect to `external-database:5432`
- Kubernetes DNS (CoreDNS) receives this lookup request
- Instead of returning an IP address, DNS returns a CNAME record saying "this is actually `prod-db.company.com`"
- Your app then looks up `prod-db.company.com` and gets the real IP address
- Your app connects to that external IP address

ExternalName **points to an external service outside the cluster** - "external" means the actual service/server is running somewhere else entirely, not in your Kubernetes cluster. This could be:
- A managed database service (AWS RDS, Google Cloud SQL)
- A third-party API (Stripe, Twilio)
- A legacy system in your data center
- Another service in a different Kubernetes cluster

**DNS resolution flow:**
```
App requests: external-database:5432
↓
Kubernetes DNS lookup: "external-database.namespace.svc.cluster.local"
↓
DNS returns CNAME: "This is actually prod-db.company.com"
↓
App looks up: prod-db.company.com → gets real IP: 203.0.113.50
↓
App connects to: 203.0.113.50:5432
```

**Why this is useful:**
- Your app code uses the same connection string in all environments
- You can change external endpoints without changing application code
- You get consistent service discovery patterns for both internal and external services

### When to Use ExternalName
- **External database connections** - Connecting to managed databases outside the cluster
- **Third-party API integration** - Consistent internal naming for external APIs
- **Service migration** - Gradually moving external services into the cluster
- **Environment abstraction** - Different external services per environment
- **Legacy system integration** - Connecting to existing external systems

### ExternalName Examples

#### External Database
```yaml
apiVersion: v1
kind: Service
metadata:
  name: external-postgres
  namespace: production
spec:
  type: ExternalName
  externalName: prod-db.company.com
  ports:
  - port: 5432
---
# Usage: Apps connect to external-postgres:5432
# DNS resolves to prod-db.company.com:5432
```

## Headless Service - Direct Pod Access

### What Headless Service Does
Headless services **return the IP addresses of individual pods** instead of a single virtual IP. When you set `clusterIP: None`, you're telling Kubernetes "don't create a virtual IP for this service."

**How headless services work differently:**
- Normal service: DNS lookup returns ONE IP (the virtual service IP)
- Headless service: DNS lookup returns MULTIPLE IPs (all the pod IPs)

**What happens with DNS lookups:**
```
Normal ClusterIP service DNS lookup:
myservice.namespace.svc.cluster.local → 10.96.0.1 (virtual IP)

Headless service DNS lookup:
myservice.namespace.svc.cluster.local → 192.168.1.10, 192.168.1.11, 192.168.1.12 (actual pod IPs)
```

**What "clusterIP: None" means:**
- Kubernetes doesn't assign a virtual IP address
- No load balancing happens at the service level
- No iptables rules are created for traffic distribution
- DNS returns actual pod IP addresses directly
- Applications get direct access to individual pods

**Why you'd want direct pod access:**
- **StatefulSets**: Each pod has a unique identity (like database primary vs replicas)
- **Peer-to-peer apps**: Applications that need to connect to all instances (like Elasticsearch nodes discovering each other)
- **Custom load balancing**: Your application implements its own traffic distribution logic
- **Database clusters**: You need to connect to specific database roles (primary for writes, replicas for reads)

**StatefulSet integration:**
With StatefulSets, headless services create predictable DNS names for each pod:
```
Pod names: myapp-0, myapp-1, myapp-2
DNS names: 
  myapp-0.myservice.namespace.svc.cluster.local
  myapp-1.myservice.namespace.svc.cluster.local  
  myapp-2.myservice.namespace.svc.cluster.local
```

### When to Use Headless Service
- **StatefulSets** - When you need to access specific pod instances
- **Database clusters** - Direct connections to primary/replica databases
- **Peer-to-peer applications** - Apps that need to discover and connect to all peers
- **Custom load balancing** - Applications implementing their own load balancing logic
- **Service mesh** - When using service mesh for load balancing

### Headless Service Examples

#### Database Cluster
```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres-cluster
  namespace: database
spec:
  clusterIP: None  # Makes it headless
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
---
# DNS returns all pod IPs:
# postgres-cluster-0.postgres-cluster.database.svc.cluster.local
# postgres-cluster-1.postgres-cluster.database.svc.cluster.local
# postgres-cluster-2.postgres-cluster.database.svc.cluster.local
```

## Istio Service Mesh Integration

### What is Istio
Istio is a **service mesh** - a service mesh is additional networking infrastructure that sits between your application services and handles all the network communication between them.

**What "service mesh" actually means:**
Think of it like a telephone operator from the old days. Instead of your services calling each other directly, every network call goes through the "operator" (the mesh) who then connects the call. The mesh operator can:
- Record who's calling whom (observability)
- Decide if the call is allowed (security)
- Route the call to a different destination (traffic management)
- Retry failed calls or route around problems (resilience)

**How Istio implements the mesh:**
Istio injects a **sidecar proxy** (called Envoy) into every pod alongside your application container. This proxy intercepts all network traffic in and out of your pod.

```
Without Istio:
App Container → Network → Other App Container

With Istio:
App Container → Sidecar Proxy → Network → Sidecar Proxy → Other App Container
```

**What "sidecar proxy" means:**
- A separate container that runs in the same pod as your application
- Your app thinks it's talking directly to other services
- Actually, all traffic goes through the sidecar first
- Sidecar handles encryption, routing, retries, load balancing, etc.
- Your application code doesn't need to change

**What Istio provides that regular Kubernetes services don't:**
- **Mutual TLS**: Automatic encryption between all services
- **Traffic splitting**: Send 10% of traffic to new version, 90% to old version
- **Circuit breakers**: Stop calling failing services automatically
- **Retries and timeouts**: Automatic retry logic with intelligent backoff
- **Distributed tracing**: See exactly how requests flow through your system
- **Advanced routing**: Route based on headers, user ID, request size, etc.

### Why Use Istio
- **Advanced traffic management** - Sophisticated routing, load balancing, and fault injection
- **Security** - Mutual TLS, authentication, and authorization policies
- **Observability** - Distributed tracing, metrics, and logging
- **Policy enforcement** - Rate limiting, access control, and compliance
- **Gradual rollouts** - Canary deployments and A/B testing
- **Fault tolerance** - Circuit breakers, retries, and timeouts

### Istio Examples

#### Istio Gateway - External Traffic Entry
```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: webapp-gateway
  namespace: production
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - myapp.example.com
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: myapp-tls
    hosts:
    - myapp.example.com
```

#### VirtualService - Traffic Routing Rules
```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: webapp-routing
  namespace: production
spec:
  hosts:
  - myapp.example.com
  gateways:
  - webapp-gateway
  http:
  # Route 20% to new version, 80% to stable
  - match:
    - uri:
        prefix: /api/v2
    route:
    - destination:
        host: backend-service
        subset: v2
      weight: 20
    - destination:
        host: backend-service
        subset: v1
      weight: 80
```

## Helm Package Management

### What is Helm
Helm is the **package manager** for Kubernetes - a package manager is like an app store for your cluster. Just like you use `apt install` on Ubuntu or `brew install` on Mac to install software, you use `helm install` to install complete applications on Kubernetes.

**What "package manager" means:**
- **Packages applications**: Bundles all the Kubernetes YAML files needed for an app
- **Manages dependencies**: Handles when App A needs Database B and Cache C
- **Handles versions**: Install, upgrade, rollback to different application versions
- **Manages releases**: Tracks what's installed where and when

**What "templated YAML manifests" means:**
Instead of writing separate YAML files for development, staging, and production, you write template files with variables that get filled in differently for each environment.

**Regular YAML (you'd need 3 separate files):**
```yaml
# dev-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp-dev
  namespace: development
spec:
  type: NodePort
  ports:
  - port: 80
    nodePort: 30080

# prod-service.yaml  
apiVersion: v1
kind: Service
metadata:
  name: myapp-prod
  namespace: production
spec:
  type: LoadBalancer
  ports:
  - port: 443
```

**Helm Template (one file works for all environments):**
```yaml
# templates/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: {{ .Values.appName }}-{{ .Values.environment }}
  namespace: {{ .Values.namespace }}
spec:
  type: {{ .Values.service.type }}
  ports:
  - port: {{ .Values.service.port }}
    {{- if eq .Values.service.type "NodePort" }}
    nodePort: {{ .Values.service.nodePort }}
    {{- end }}
```

**Values files (different variables for each environment):**
```yaml
# values-dev.yaml
appName: myapp
environment: dev
namespace: development
service:
  type: NodePort
  port: 80
  nodePort: 30080

# values-prod.yaml
appName: myapp
environment: prod
namespace: production
service:
  type: LoadBalancer
  port: 443
```

**What Helm does when you deploy:**
1. Takes the template file
2. Substitutes variables from your values file
3. Generates the final Kubernetes YAML
4. Applies it to your cluster
5. Tracks the deployment as a "release"

### Helm Deployment Commands

#### Basic Operations
```bash
# Install with default values
helm install myapp ./myapp-chart

# Install with environment-specific values
helm install myapp-dev ./myapp-chart -f values-dev.yaml -n development
helm install myapp-staging ./myapp-chart -f values-staging.yaml -n staging
helm install myapp-prod ./myapp-chart -f values-prod.yaml -n production

# Upgrade deployments
helm upgrade myapp-dev ./myapp-chart -f values-dev.yaml
helm upgrade myapp-prod ./myapp-chart -f values-prod.yaml

# Override specific values
helm install myapp ./myapp-chart --set service.type=LoadBalancer
```

## Service Comparison Matrix

### Access Patterns
| Service Type | Internal Access | External Access | Direct Pod Access |
|--------------|----------------|-----------------|-------------------|
| ClusterIP    | ✅ Yes         | ❌ No           | ❌ No             |
| NodePort     | ✅ Yes         | ✅ Yes          | ❌ No             |
| LoadBalancer | ✅ Yes         | ✅ Yes          | ❌ No             |
| ExternalName | ✅ Yes         | ➡️ External     | ❌ No             |
| Headless     | ✅ Yes         | ❌ No           | ✅ Yes            |

### Cost and Complexity
| Service Type | Cloud Cost | Configuration | Management |
|--------------|------------|---------------|------------|
| ClusterIP    | Free       | Simple        | Easy       |
| NodePort     | Free       | Simple        | Easy       |
| LoadBalancer | Paid       | Complex       | Managed    |
| ExternalName | Free       | Simple        | Easy       |
| Headless     | Free       | Complex       | Complex    |

## Key Concepts Summary
- **ClusterIP** - Internal cluster communication only, most secure, default choice
- **NodePort** - External access via node ports, good for development and simple use cases
- **LoadBalancer** - Production external access with cloud provider integration
- **ExternalName** - DNS mapping to external services, useful for service abstraction
- **Headless** - Direct pod access without load balancing, required for StatefulSets
- **Istio** - Service mesh providing advanced traffic management, security, and observability
- **Helm** - Package manager for templated Kubernetes deployments across environments

## Best Practices / Tips

1. **Default to ClusterIP** - Use ClusterIP for internal services unless external access is specifically needed
2. **LoadBalancer for Production** - Use LoadBalancer for production external services, avoid NodePort
3. **ExternalName for Migration** - Use ExternalName when gradually migrating external services to Kubernetes
4. **Headless for StatefulSets** - Always use headless services with StatefulSets for stable pod identities
5. **Helm for Multi-Environment** - Use Helm charts with environment-specific values for consistent deployments
6. **Istio for Complex Networking** - Consider Istio when you need advanced traffic management or security
7. **Service Naming** - Use consistent, descriptive names that indicate service purpose
8. **Health Checks** - Always configure proper readiness and liveness probes for service endpoints
9. **Resource Limits** - Set appropriate resource requests and limits on pods backing services
10. **Documentation** - Document service dependencies and communication patterns clearly

## Common Issues / Troubleshooting

### Problem 1: Service Not Accessible
- **Symptom:** Cannot connect to service from other pods or externally
- **Cause:** Incorrect selectors, no healthy pods, or network policies blocking traffic
- **Solution:** Verify selectors match pod labels, check pod readiness, review network policies

```bash
# Check service endpoints
kubectl get endpoints service-name
kubectl describe service service-name

# Verify pod labels
kubectl get pods --show-labels
```

### Problem 2: NodePort Not Working
- **Symptom:** Cannot access NodePort service from outside cluster
- **Cause:** Firewall rules, security groups, or node network configuration
- **Solution:** Check firewall rules, verify security groups allow NodePort range

```bash
# Check service configuration
kubectl get service service-name -o yaml

# Test from within cluster
kubectl exec -it pod-name -- curl http://service-name:port
```

### Problem 3: LoadBalancer Pending
- **Symptom:** LoadBalancer service shows EXTERNAL-IP as <pending>
- **Cause:** Cloud provider integration issues, quotas, or unsupported environment
- **Solution:** Verify cloud controller manager, check quotas, ensure LoadBalancer support

```bash
# Check service events
kubectl describe service loadbalancer-service

# Verify cloud controller
kubectl get pods -n kube-system | grep cloud-controller
```

## References / Further Reading
- [Kubernetes Services Documentation](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Istio Traffic Management](https://istio.io/latest/docs/concepts/traffic-management/)
- [Helm Charts Guide](https://helm.sh/docs/chart_template_guide/)
- [Service Types Comparison](https://kubernetes.io/docs/concepts/services-networking/service/#publishing-services-service-types)
- [Istio Security Policies](https://istio.io/latest/docs/concepts/security/)
- [Helm Best Practices](https://helm.sh/docs/chart_best_practices/)
- [Kubernetes DNS Specification](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)