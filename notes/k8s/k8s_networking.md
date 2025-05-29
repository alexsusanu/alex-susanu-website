# Kubernetes Networking
category: DevOps
tags: kubernetes, k8s, networking, service, ingress, networkpolicy, dns

## Service

**What it is:** Stable network endpoint that provides access to a set of pods, with built-in load balancing and service discovery.

**Why it matters:** Pods are ephemeral and get new IP addresses when recreated. Services provide stable networking that doesn't change, enabling reliable communication between application components.

### **ClusterIP (Default)**
**What it is:** Creates an internal IP address that's only accessible within the Kubernetes cluster.

**Why use it:** 
- **Internal communication** - Backend services that don't need external access
- **Security** - Keep sensitive services (databases, internal APIs) hidden from outside
- **Service discovery** - Other pods can reach this service by name via DNS
- **Microservices architecture** - Enable service-to-service communication

**How it works:**
- **Virtual IP** - Kubernetes assigns a cluster-internal IP (e.g., 10.96.0.1)
- **DNS resolution** - Service accessible via `service-name.namespace.svc.cluster.local`
- **Load balancing** - Distributes traffic across healthy pod replicas using iptables rules
- **Port mapping** - Service port can differ from container port
- **Endpoint tracking** - Automatically updates as pods are added/removed

**Example:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: database-service
  namespace: production
spec:
  type: ClusterIP  # This is the default
  ports:
  - name: postgres
    port: 5432        # Service port (what clients connect to)
    targetPort: 5432  # Container port (where app listens)
    protocol: TCP
  selector:
    app: postgres
    tier: database
```

**Service discovery:**
```bash
# DNS resolution within cluster
nslookup database-service.production.svc.cluster.local

# Environment variables (legacy)
echo $DATABASE_SERVICE_SERVICE_HOST
echo $DATABASE_SERVICE_SERVICE_PORT
```

**When you'll use it:** Database services, internal APIs, background services, caching layers - any service that only needs cluster-internal access.

### **NodePort**
**What it is:** Exposes the service on a specific port on every node in the cluster, making it accessible from outside.

**Why use it:**
- **External access** - Allow traffic from outside the cluster without cloud load balancer
- **Simple setup** - No cloud provider integration needed
- **Development/testing** - Easy way to test services externally
- **On-premises** - When you don't have cloud load balancers available
- **Legacy integration** - Connect to applications that expect specific ports

**How it works:**
- **Port allocation** - Kubernetes assigns a port between 30000-32767 (configurable)
- **Every node listens** - All cluster nodes forward traffic to the service
- **Automatic routing** - Traffic reaches correct pods regardless of which node receives it
- **Still has ClusterIP** - Internal access continues to work
- **kube-proxy** - Handles the port forwarding on each node

**Limitations:**
- **Port range restriction** - Limited to 30000-32767 range by default
- **Node dependency** - Clients need to know node IP addresses
- **Not highly available** - If node fails, that access point is lost
- **Security exposure** - Opens ports on all nodes in cluster
- **Port conflicts** - Limited port space can cause conflicts

**Example:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-app-service
spec:
  type: NodePort
  ports:
  - name: http
    port: 80          # ClusterIP port (internal access)
    targetPort: 8080  # Container port
    nodePort: 30080   # External port (optional, auto-assigned if omitted)
    protocol: TCP
  selector:
    app: web-app
    tier: frontend
```

**Access methods:**
```bash
# Access via any node IP
curl http://192.168.1.10:30080
curl http://192.168.1.11:30080  # Works from any node

# Find node IPs
kubectl get nodes -o wide

# Find assigned NodePort
kubectl get service web-app-service
```

**When you'll use it:** Development environments, on-premises setups, temporary external access, or when cloud load balancers aren't available.

### **LoadBalancer**
**What it is:** Creates an external load balancer (through cloud provider) that routes traffic to the service.

**Why use it:**
- **Production external access** - Proper way to expose services to internet
- **Cloud integration** - Leverages cloud provider's load balancing infrastructure
- **High availability** - Built-in redundancy and health checking
- **Automatic setup** - Cloud provider handles external IP assignment and routing
- **Enterprise features** - SSL termination, WAF, DDoS protection (depending on provider)

**How it works:**
- **Cloud provisioning** - Creates actual load balancer resource in cloud (AWS ELB, GCP Load Balancer, Azure LB)
- **External IP assignment** - Gets public IP address automatically from cloud provider
- **Health checks** - Cloud load balancer monitors service/pod health
- **Traffic routing** - Routes external traffic to healthy cluster nodes
- **Includes NodePort** - Still creates NodePort as backup access method
- **Integration** - Works with cloud provider's networking stack

**Requirements:**
- **Cloud provider** - Only works on supported cloud platforms (AWS, GCP, Azure, etc.)
- **Cloud integration** - Cluster must be configured with cloud provider credentials
- **Costs money** - Each LoadBalancer service creates billable cloud resource
- **Permissions** - Cluster needs permissions to create cloud load balancers

**Example:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
  annotations:
    # AWS-specific annotations
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
    # GCP-specific annotations
    cloud.google.com/load-balancer-type: "External"
spec:
  type: LoadBalancer
  ports:
  - name: http
    port: 80
    targetPort: 3000
    protocol: TCP
  - name: https
    port: 443
    targetPort: 3000
    protocol: TCP
  selector:
    app: frontend
    tier: web
```

**Cloud provider features:**
```yaml
# AWS Application Load Balancer
metadata:
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "alb"
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
    service.beta.kubernetes.io/aws-load-balancer-certificate-arn: "arn:aws:acm:..."

# Azure Load Balancer
metadata:
  annotations:
    service.beta.kubernetes.io/azure-load-balancer-internal: "false"
    service.beta.kubernetes.io/azure-dns-label-name: "myapp"
```

**Checking LoadBalancer status:**
```bash
# Check external IP assignment
kubectl get service frontend-service -w  # Watch for EXTERNAL-IP

# Check LoadBalancer events
kubectl describe service frontend-service

# Find cloud provider load balancer
# AWS: Check EC2 console > Load Balancers
# GCP: Check Network services > Load balancing
# Azure: Check Load balancers in portal
```

**When you'll use it:** Production web applications, public APIs, any service that needs reliable internet access with high availability.

### **ExternalName**
**What it is:** Maps the service to an external DNS name, acting as an alias for external services without proxying traffic.

**Why use it:**
- **External service integration** - Access external databases, APIs, third-party services
- **Service abstraction** - Hide external service details from applications
- **Environment flexibility** - Point to different external services per environment
- **Migration support** - Gradually move external services to internal ones
- **Legacy integration** - Connect to services that can't be moved to Kubernetes

**How it works:**
- **DNS CNAME** - Creates DNS alias to external service (no traffic proxying)
- **No load balancing** - Just DNS redirection, external service handles load balancing
- **No health checking** - Kubernetes doesn't monitor external service health
- **No port mapping** - Applications connect directly to external service ports
- **Cluster DNS integration** - Works with Kubernetes internal DNS

**Limitations:**
- **DNS only** - Only works for DNS-resolvable services
- **No service mesh** - Traffic doesn't go through Kubernetes networking
- **No policies** - Can't apply Kubernetes network policies
- **External dependency** - Service availability depends on external system

**Example:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: external-database
  namespace: production
spec:
  type: ExternalName
  externalName: database.company.com  # External DNS name
  ports:
  - port: 5432  # Optional: document the port for clarity
```

**Usage in applications:**
```yaml
# Application can connect to external-database.production.svc.cluster.local
# which resolves to database.company.com
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  template:
    spec:
      containers:
      - name: app
        image: myapp:v1.0
        env:
        - name: DATABASE_HOST
          value: "external-database.production.svc.cluster.local"
        - name: DATABASE_PORT
          value: "5432"
```

**Migration pattern:**
```yaml
# Stage 1: Point to external service
apiVersion: v1
kind: Service
metadata:
  name: user-service
spec:
  type: ExternalName
  externalName: users.legacy-system.com

---
# Stage 2: Migrate to internal service (change type, add selector)
apiVersion: v1
kind: Service
metadata:
  name: user-service
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 8080
  selector:
    app: user-service
```

**When you'll use it:** Accessing external databases during migration, third-party APIs, legacy systems, SaaS services, or any external dependency that needs service discovery integration.

## Common Service Commands

```bash
# Service operations
kubectl get services                                 # List all services
kubectl get svc                                     # Short form
kubectl get svc -o wide                             # Additional information
kubectl describe service <service-name>              # Detailed service info
kubectl delete service <service-name>               # Delete service

# Service endpoints
kubectl get endpoints                               # List service endpoints
kubectl get endpoints <service-name>                # Specific service endpoints
kubectl describe endpoints <service-name>           # Detailed endpoint info

# Service discovery testing
kubectl run test-pod --image=busybox -it --rm -- nslookup <service-name>
kubectl run test-pod --image=busybox -it --rm -- wget -qO- <service-name>:<port>

# Port forwarding (for testing)
kubectl port-forward service/<service-name> 8080:80  # Forward local port to service

# Service troubleshooting
kubectl get pods --selector=<service-selector>      # Find pods behind service
kubectl logs deployment/<deployment-name>           # Check application logs
```

## Ingress

**What it is:** API object that manages external access to services in a cluster, typically HTTP/HTTPS, providing load balancing, SSL termination, and name-based virtual hosting.

**Why it matters:** Ingress provides a single entry point for multiple services, enables path-based and host-based routing, handles SSL certificates, and reduces the need for multiple LoadBalancer services (which can be expensive).

**Ingress vs Service:**
- **Service LoadBalancer** - One external IP per service, expensive in cloud
- **Ingress** - One external IP for many services, more cost-effective
- **Ingress** - Layer 7 (HTTP/HTTPS) routing with advanced features
- **Service** - Layer 4 (TCP/UDP) routing, simpler but less flexible

**Key features:**
- **Path-based routing** - Route different URLs to different services
- **Host-based routing** - Route different domains to different services
- **SSL/TLS termination** - Handle HTTPS certificates centrally
- **Load balancing** - Distribute traffic across service endpoints
- **Authentication** - Integration with auth providers (OAuth, LDAP)

**Ingress Controller requirement:**
- **Not built-in** - Kubernetes doesn't include Ingress controller by default
- **Must install** - Need to deploy controller (NGINX, Traefik, HAProxy, etc.)
- **Cloud managed** - Some cloud providers offer managed controllers

**Common commands:**
```bash
# Ingress operations
kubectl get ingress                                 # List all ingresses
kubectl get ing                                    # Short form
kubectl describe ingress <ingress-name>            # Detailed ingress info
kubectl delete ingress <ingress-name>             # Delete ingress

# Ingress troubleshooting
kubectl get ingress -o wide                        # Show ingress with addresses
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller  # NGINX controller logs
kubectl get events --sort-by=.metadata.creationTimestamp  # Recent events

# SSL certificate management
kubectl get certificates                           # List TLS certificates (if using cert-manager)
kubectl describe certificate <cert-name>          # Certificate details
```

**Example Ingress YAML (Basic routing):**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - myapp.example.com
    secretName: myapp-tls
  rules:
  - host: myapp.example.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 80
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
```

**Advanced Ingress example (Multiple hosts, auth):**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: multi-app-ingress
  annotations:
    # NGINX specific
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/auth-secret: basic-auth
    nginx.ingress.kubernetes.io/auth-realm: 'Authentication Required'
    # Rate limiting
    nginx.ingress.kubernetes.io/rate-limit: "100"
    # CORS
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/cors-allow-origin: "https://mydomain.com"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - app1.example.com
    - app2.example.com
    secretName: multi-app-tls
  rules:
  - host: app1.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app1-service
            port:
              number: 80
  - host: app2.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app2-service
            port:
              number: 80
```

**Popular Ingress Controllers:**
- **NGINX Ingress** - Most popular, feature-rich, good performance
- **Traefik** - Modern, automatic service discovery, good for microservices
- **HAProxy Ingress** - High performance, enterprise features
- **AWS ALB Ingress** - AWS Application Load Balancer integration
- **GCE Ingress** - Google Cloud Load Balancer integration
- **Istio Gateway** - Service mesh integration, advanced traffic management

**When you'll use it:** Web applications needing external access, microservices with different paths, SSL termination, domain-based routing, or when you need Layer 7 load balancing features.

## NetworkPolicy

**What it is:** Kubernetes resource that defines rules for controlling network traffic between pods, providing micro-segmentation and security at the network level.

**Why it matters:** By default, all pods in a Kubernetes cluster can communicate with each other. NetworkPolicies enable zero-trust networking by explicitly defining allowed communication paths, improving security posture.

**Default behavior without NetworkPolicies:**
- **All pods can communicate** - No network restrictions
- **All ingress allowed** - Pods accept traffic from anywhere
- **All egress allowed** - Pods can send traffic anywhere
- **Potential security risk** - Compromised pod can access everything

**NetworkPolicy behavior:**
- **Deny by default** - Once a NetworkPolicy selects a pod, only explicitly allowed traffic is permitted
- **Additive** - Multiple policies can apply to same pod, rules are combined
- **Namespace scoped** - Policies apply within their namespace
- **Requires CNI support** - Not all network plugins support NetworkPolicies

**NetworkPolicy types:**
- **Ingress** - Control incoming traffic to pods
- **Egress** - Control outgoing traffic from pods
- **Both** - Can specify both ingress and egress rules

**Common commands:**
```bash
# NetworkPolicy operations
kubectl get networkpolicies                         # List all network policies
kubectl get netpol                                # Short form
kubectl describe networkpolicy <policy-name>       # Detailed policy info
kubectl delete networkpolicy <policy-name>        # Delete policy

# Testing network connectivity
kubectl run test-pod --image=busybox -it --rm -- wget -qO- <service-name>
kubectl exec <pod-name> -- nc -zv <target-ip> <port>  # Test connection
```

**Example NetworkPolicy (Deny all ingress):**
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-ingress
  namespace: production
spec:
  podSelector: {}  # Selects all pods in namespace
  policyTypes:
  - Ingress
  # No ingress rules = deny all ingress traffic
```

**Example NetworkPolicy (Allow specific traffic):**
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: web-app-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: web-app
  policyTypes:
  - Ingress
  - Egress
  ingress:
  # Allow traffic from frontend pods
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 8080
  # Allow traffic from specific namespace
  - from:
    - namespaceSelector:
        matchLabels:
          name: monitoring
    ports:
    - protocol: TCP
      port: 8080
  egress:
  # Allow DNS resolution
  - to: []
    ports:
    - protocol: UDP
      port: 53
  # Allow access to database
  - to:
    - podSelector:
        matchLabels:
          app: database
    ports:
    - protocol: TCP
      port: 5432
```

**Complex NetworkPolicy example:**
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-service-policy
spec:
  podSelector:
    matchLabels:
      app: api-service
      tier: backend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  # Allow from web tier in same namespace
  - from:
    - podSelector:
        matchLabels:
          tier: web
    - namespaceSelector:
        matchLabels:
          environment: production
      podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 8080
  # Allow monitoring from any namespace
  - from:
    - namespaceSelector:
        matchLabels:
          name: monitoring
    ports:
    - protocol: TCP
      port: 9090
  egress:
  # Allow DNS
  - to: []
    ports:
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 53
  # Allow database access
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
  # Allow external API calls
  - to: []
    ports:
    - protocol: TCP
      port: 443
```

**NetworkPolicy best practices:**
- **Start with deny-all** - Create restrictive baseline
- **Allow necessary traffic** - Add specific allow rules
- **Test thoroughly** - Verify application functionality
- **Monitor traffic** - Use network monitoring tools
- **Document policies** - Clear naming and documentation

**CNI support:**
- **Supported** - Calico, Cilium, Weave Net, Antrea
- **Not supported** - Flannel (basic version), Docker bridge
- **Cloud providers** - Most managed Kubernetes services support NetworkPolicies

**When you'll use it:** Security-conscious environments, multi-tenant clusters, compliance requirements (PCI DSS, HIPAA), microservices with sensitive data, or any application requiring network segmentation.

## DNS

**What it is:** Kubernetes internal DNS service that provides name resolution for services and pods within the cluster, enabling service discovery by name rather than IP address.

**Why it matters:** DNS makes it possible for applications to find and communicate with services using human-readable names instead of ever-changing IP addresses. It's fundamental to how Kubernetes networking and service discovery work.

**Kubernetes DNS components:**
- **CoreDNS** - Default DNS server (replaced kube-dns)
- **DNS pods** - Run in kube-system namespace
- **DNS service** - ClusterIP service exposing DNS to pods
- **kubelet** - Configures pod DNS settings

**DNS resolution patterns:**
- **Services** - `<service-name>.<namespace>.svc.cluster.local`
- **Pods** - `<pod-ip-dashed>.<namespace>.pod.cluster.local`
- **Headless services** - Direct pod DNS records
- **External services** - Custom DNS entries

**DNS search domains:**
Pods automatically get search domains configured:
- `<namespace>.svc.cluster.local`
- `svc.cluster.local`
- `cluster.local`

**Common commands:**
```bash
# DNS troubleshooting
kubectl get pods -n kube-system -l k8s-app=kube-dns    # Check DNS pods
kubectl logs -n kube-system -l k8s-app=kube-dns       # DNS pod logs
kubectl get service -n kube-system kube-dns           # DNS service

# Test DNS resolution
kubectl run test-pod --image=busybox -it --rm -- nslookup kubernetes.default
kubectl run test-pod --image=busybox -it --rm -- nslookup <service-name>.<namespace>

# Check pod DNS configuration
kubectl exec <pod-name> -- cat /etc/resolv.conf
kubectl exec <pod-name> -- nslookup <service-name>
```

**DNS resolution examples:**
```bash
# Full DNS names
nslookup web-service.production.svc.cluster.local

# Short names (using search domains)
nslookup web-service.production    # From any namespace
nslookup web-service              # From same namespace (production)

# Service types
nslookup database-service         # ClusterIP service
nslookup api-service             # NodePort service  
nslookup web-service             # LoadBalancer service
```

**Headless service DNS:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: database-headless
spec:
  clusterIP: None  # Makes it headless
  ports:
  - port: 5432
  selector:
    app: database
```

**Headless service resolution:**
```bash
# Returns individual pod IPs instead of service IP
nslookup database-headless.production.svc.cluster.local

# Individual pod records
nslookup 10-244-1-5.production.pod.cluster.local
```

**Custom DNS configuration:**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: custom-dns-pod
spec:
  dnsPolicy: "None"
  dnsConfig:
    nameservers:
    - 8.8.8.8
    - 8.8.4.4
    searches:
    - my-company.com
    options:
    - name: ndots
      value: "2"
  containers:
  - name: app
    image: busybox
```

**DNS policies:**
- **ClusterFirst** (default) - Use cluster DNS, fallback to upstream
- **ClusterFirstWithHostNet** - For pods using host network
- **Default** - Use node's DNS configuration
- **None** - Custom DNS configuration required

**DNS performance optimization:**
```yaml
# CoreDNS configuration
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
        kubernetes cluster.local in-addr.arpa ip6.arpa {
           pods insecure
           fallthrough in-addr.arpa ip6.arpa
           ttl 30
        }
        prometheus :9153
        forward . /etc/resolv.conf {
           max_concurrent 1000
        }
        cache 30
        loop
        reload
        loadbalance
    }
```

**When you'll use it:** DNS is used automatically by all Kubernetes applications. You'll work with it when troubleshooting connectivity issues, setting up service discovery, configuring external DNS, or optimizing DNS performance.