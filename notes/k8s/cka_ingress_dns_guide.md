# CKA Guide: Ingress Controllers, CoreDNS, and Advanced Networking
category: Kubernetes Certification
tags: cka, kubernetes, exam, kubectl, certification

## Fundamental Conceptual Understanding

### The Ingress Philosophy

**The Problem Ingress Solves:**
```
Without Ingress (Service-based External Access):
├── Each service needs its own LoadBalancer
├── Multiple external IPs to manage
├── No centralized SSL termination
├── No path-based routing
├── High cloud provider costs
└── Complex DNS management

Service 1 → LoadBalancer 1 → External IP 1
Service 2 → LoadBalancer 2 → External IP 2  
Service 3 → LoadBalancer 3 → External IP 3

With Ingress (Centralized Layer 7 Routing):
├── Single external IP for multiple services
├── Path-based and host-based routing
├── Centralized SSL/TLS termination
├── Advanced traffic management
├── Cost-effective external access
└── Unified configuration

External Traffic → Ingress Controller → Multiple Services
                       │
                  Single Entry Point
```

**The Layer 7 Advantage:**
```
Layer 4 Load Balancing (Service LoadBalancer):
├── Routes based on IP and port only
├── No application protocol awareness
├── Limited routing capabilities
├── Simple but less flexible
└── Example: TCP/UDP load balancing

Layer 7 Load Balancing (Ingress):
├── Routes based on HTTP headers, paths, hostnames
├── SSL termination and certificate management
├── Advanced features: redirects, rewrites, auth
├── Application-aware routing decisions
└── Example: HTTP reverse proxy with routing rules
```

### Ingress Architecture Components

**The Three-Layer Ingress Model:**
```
Layer 1: Ingress Resource (Configuration)
├── Kubernetes API object defining routing rules
├── Declarative specification of desired routing
├── Host-based and path-based routing rules
├── TLS configuration and certificate references
└── Backend service definitions

Layer 2: Ingress Controller (Implementation)  
├── Watches Ingress resources for changes
├── Implements routing rules in load balancer
├── Manages certificates and TLS termination
├── Provides metrics and health checks
└── Vendor-specific implementation (nginx, traefik, etc.)

Layer 3: Load Balancer (Infrastructure)
├── Receives external traffic
├── Forwards to Ingress Controller pods
├── Provides external IP address
├── Cloud provider integration
└── High availability and failover
```

**Ingress Traffic Flow:**
```
External Client → DNS Resolution → Load Balancer → Ingress Controller → Service → Pod
       │              │               │               │              │        │
   example.com    External IP     NodePort/LB      nginx/traefik   ClusterIP  App
   192.168.1.100   203.0.113.10      :80/:443        Pod           10.96.1.100  Container
```

## Ingress Controllers Deep Dive

### Popular Ingress Controller Comparison

**NGINX Ingress Controller:**
```
Architecture: nginx reverse proxy + Kubernetes controller
├── Pros: Mature, feature-rich, high performance
├── Cons: Complex configuration, resource intensive
├── Use cases: Production websites, API gateways
├── Features: SSL termination, path rewriting, rate limiting
└── Deployment: DaemonSet or Deployment + Service

Configuration via annotations:
├── nginx.ingress.kubernetes.io/rewrite-target
├── nginx.ingress.kubernetes.io/ssl-redirect
├── nginx.ingress.kubernetes.io/rate-limit
└── nginx.ingress.kubernetes.io/auth-basic
```

**Traefik Ingress Controller:**
```
Architecture: Go-based reverse proxy with automatic service discovery
├── Pros: Automatic HTTPS, dynamic configuration, built-in dashboard
├── Cons: Newer, smaller ecosystem than nginx
├── Use cases: Microservices, development environments
├── Features: Let's Encrypt integration, circuit breakers, metrics
└── Deployment: Deployment + Service + CRDs

Configuration via labels and CRDs:
├── traefik.ingress.kubernetes.io/router.middlewares
├── traefik.ingress.kubernetes.io/service.loadbalancer.method
├── Native support for Kubernetes CRDs
└── Web UI for configuration visualization
```

**AWS Load Balancer Controller:**
```
Architecture: Native AWS Application Load Balancer integration
├── Pros: Deep AWS integration, cost-effective, managed
├── Cons: AWS-specific, limited to AWS features
├── Use cases: AWS-native applications, cost optimization
├── Features: ALB/NLB provisioning, WAF integration, autoscaling
└── Deployment: Deployment with AWS IAM permissions

Configuration via annotations:
├── kubernetes.io/ingress.class: alb
├── alb.ingress.kubernetes.io/scheme: internet-facing
├── alb.ingress.kubernetes.io/target-type: ip
└── alb.ingress.kubernetes.io/certificate-arn
```

### NGINX Ingress Controller Implementation

**Installation and Configuration:**
```yaml
# NGINX Ingress Controller deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-ingress-controller
  namespace: ingress-nginx
spec:
  replicas: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: ingress-nginx
  template:
    metadata:
      labels:
        app.kubernetes.io/name: ingress-nginx
    spec:
      serviceAccountName: nginx-ingress-serviceaccount
      containers:
      - name: nginx-ingress-controller
        image: k8s.gcr.io/ingress-nginx/controller:v1.1.1
        args:
        - /nginx-ingress-controller
        - --configmap=$(POD_NAMESPACE)/nginx-configuration
        - --tcp-services-configmap=$(POD_NAMESPACE)/tcp-services
        - --udp-services-configmap=$(POD_NAMESPACE)/udp-services
        - --publish-service=$(POD_NAMESPACE)/ingress-nginx
        - --annotations-prefix=nginx.ingress.kubernetes.io
        env:
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        ports:
        - name: http
          containerPort: 80
        - name: https
          containerPort: 443
        - name: metrics
          containerPort: 10254
        livenessProbe:
          httpGet:
            path: /healthz
            port: 10254
            scheme: HTTP
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /healthz
            port: 10254
            scheme: HTTP
          periodSeconds: 1
        resources:
          requests:
            cpu: 100m
            memory: 90Mi
          limits:
            cpu: 1000m
            memory: 1Gi

---
# Service to expose the ingress controller
apiVersion: v1
kind: Service
metadata:
  name: ingress-nginx
  namespace: ingress-nginx
spec:
  type: LoadBalancer
  ports:
  - name: http
    port: 80
    targetPort: 80
    protocol: TCP
  - name: https
    port: 443
    targetPort: 443
    protocol: TCP
  selector:
    app.kubernetes.io/name: ingress-nginx
```

**NGINX Global Configuration:**
```yaml
# ConfigMap for global nginx settings
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-configuration
  namespace: ingress-nginx
data:
  # Global nginx configuration
  proxy-connect-timeout: "15"
  proxy-send-timeout: "600"
  proxy-read-timeout: "600"
  proxy-buffers-number: "4"
  proxy-buffer-size: "4k"
  
  # SSL configuration
  ssl-protocols: "TLSv1.2 TLSv1.3"
  ssl-ciphers: "ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384"
  ssl-prefer-server-ciphers: "true"
  
  # Performance tuning
  worker-processes: "auto"
  max-worker-connections: "16384"
  worker-rlimit-nofile: "65536"
  
  # Logging
  access-log-path: "/var/log/nginx/access.log"
  error-log-path: "/var/log/nginx/error.log"
  log-format-upstream: '$remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent" $request_length $request_time [$proxy_upstream_name] [$proxy_alternative_upstream_name] $upstream_addr $upstream_response_length $upstream_response_time $upstream_status $req_id'
```

## Ingress Resources and Routing

### Basic Ingress Configuration

**Simple Host-based Routing:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: simple-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 80
  - host: web.example.com
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

**Path-based Routing:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: path-based-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/use-regex: "true"
    nginx.ingress.kubernetes.io/rewrite-target: /$2
spec:
  rules:
  - host: example.com
    http:
      paths:
      # API routes
      - path: /api(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 8080
      
      # Static assets
      - path: /static(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: static-service
            port:
              number: 80
              
      # Default route (must be last)
      - path: /(.*)
        pathType: Prefix
        backend:
          service:
            name: web-service
            port:
              number: 80
```

### TLS/SSL Configuration

**Basic TLS Setup:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: tls-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - secure.example.com
    - api.example.com
    secretName: example-tls-secret
  rules:
  - host: secure.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: secure-service
            port:
              number: 443

---
# TLS certificate secret
apiVersion: v1
kind: Secret
metadata:
  name: example-tls-secret
type: kubernetes.io/tls
data:
  tls.crt: LS0tLS1CRUdJTi... # base64 encoded certificate
  tls.key: LS0tLS1CRUdJTi... # base64 encoded private key
```

**Certificate Management with cert-manager:**
```yaml
# Automatic certificate provisioning
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: auto-tls-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - auto.example.com
    secretName: auto-tls-secret  # Will be created automatically
  rules:
  - host: auto.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-service
            port:
              number: 80

---
# ClusterIssuer for Let's Encrypt
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
```

### Advanced Ingress Features

**Rate Limiting and Security:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: secured-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    
    # Rate limiting
    nginx.ingress.kubernetes.io/rate-limit: "100"  # requests per minute
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
    nginx.ingress.kubernetes.io/rate-limit-connections: "10"
    
    # Authentication
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/auth-secret: basic-auth-secret
    nginx.ingress.kubernetes.io/auth-realm: "Authentication Required"
    
    # Security headers
    nginx.ingress.kubernetes.io/configuration-snippet: |
      add_header X-Frame-Options "SAMEORIGIN" always;
      add_header X-Content-Type-Options "nosniff" always;
      add_header X-XSS-Protection "1; mode=block" always;
      add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # IP whitelisting
    nginx.ingress.kubernetes.io/whitelist-source-range: "10.0.0.0/8,192.168.0.0/16"
    
spec:
  rules:
  - host: secure-api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 8080

---
# Basic auth secret
apiVersion: v1
kind: Secret
metadata:
  name: basic-auth-secret
type: Opaque
data:
  auth: YWRtaW46JGFwcjEkSDY... # htpasswd generated hash
```

**Advanced Routing and Rewriting:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: advanced-routing
  annotations:
    kubernetes.io/ingress.class: nginx
    
    # URL rewriting
    nginx.ingress.kubernetes.io/rewrite-target: /$2
    nginx.ingress.kubernetes.io/use-regex: "true"
    
    # Custom headers
    nginx.ingress.kubernetes.io/configuration-snippet: |
      proxy_set_header X-Forwarded-Proto $scheme;
      proxy_set_header X-Forwarded-Host $host;
      proxy_set_header X-Real-IP $remote_addr;
    
    # Session affinity
    nginx.ingress.kubernetes.io/affinity: "cookie"
    nginx.ingress.kubernetes.io/session-cookie-name: "INGRESSCOOKIE"
    nginx.ingress.kubernetes.io/session-cookie-expires: "86400"
    nginx.ingress.kubernetes.io/session-cookie-max-age: "86400"
    nginx.ingress.kubernetes.io/session-cookie-path: "/"
    
    # Load balancing method
    nginx.ingress.kubernetes.io/upstream-hash-by: "$request_uri"
    
spec:
  rules:
  - host: app.example.com
    http:
      paths:
      # API v1 routes
      - path: /api/v1(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: api-v1-service
            port:
              number: 8080
      
      # API v2 routes (newer version)
      - path: /api/v2(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: api-v2-service
            port:
              number: 8080
      
      # Legacy API redirect
      - path: /legacy-api(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: api-v2-service  # Redirect to v2
            port:
              number: 8080
```

## CoreDNS Configuration and Management

### CoreDNS Architecture Deep Dive

**CoreDNS Plugin Chain:**
```
CoreDNS Server → Plugin Chain → Response
     │              │             │
   DNS Query    ┌─────────────┐   DNS Answer
   (port 53)    │   errors    │   (A, AAAA, etc.)
                │   health    │
                │   ready     │
                │ kubernetes  │  ← Service discovery
                │ prometheus  │  ← Metrics
                │  forward    │  ← Upstream DNS
                │   cache     │  ← Response caching
                │   loop      │  ← Loop detection
                │  reload     │  ← Config reload
                │loadbalance  │  ← Response balancing
                └─────────────┘
```

**CoreDNS Configuration Structure:**
```
Corefile Syntax:
<zone> {
    <plugin> [parameters]
    <plugin> [parameters]
    ...
}

Example zones:
├── . (root zone - all queries)
├── cluster.local (Kubernetes internal)
├── consul.local (Consul service discovery)
└── example.com (custom domain)
```

### Advanced CoreDNS Configuration

**Production CoreDNS Corefile:**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    # Internal Kubernetes DNS
    cluster.local:53 {
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
        cache 30
        loop
        reload
        loadbalance
    }
    
    # Custom internal domain
    company.internal:53 {
        errors
        file /etc/coredns/company.internal.db
        prometheus :9153
        cache 300
        reload
    }
    
    # External DNS with custom upstream
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
        
        # Custom upstream servers
        forward . 8.8.8.8 8.8.4.4 {
            max_concurrent 1000
            except company.internal
        }
        
        # Cache external queries longer
        cache 300 {
            success 9984 30
            denial 9984 5
        }
        
        loop
        reload
        loadbalance
    }
  
  # Custom zone file
  company.internal.db: |
    $ORIGIN company.internal.
    @    3600 IN SOA sns.dns.icann.org. noc.dns.icann.org. (
                    2017042745 ; serial
                    7200       ; refresh (2 hours)
                    3600       ; retry (1 hour)
                    1209600    ; expire (2 weeks)
                    3600       ; minimum (1 hour)
                    )
    
    @         IN A     10.1.1.1
    www       IN A     10.1.1.10
    api       IN A     10.1.1.20
    database  IN A     10.1.1.30
    
    ; Service records
    _http._tcp.www  IN SRV 0 5 80 www.company.internal.
    _https._tcp.www IN SRV 0 5 443 www.company.internal.
```

**CoreDNS with External DNS Integration:**
```yaml
# External DNS for cloud provider integration
apiVersion: apps/v1
kind: Deployment
metadata:
  name: external-dns
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: external-dns
  template:
    metadata:
      labels:
        app: external-dns
    spec:
      serviceAccountName: external-dns
      containers:
      - name: external-dns
        image: k8s.gcr.io/external-dns/external-dns:v0.10.2
        args:
        - --source=service
        - --source=ingress
        - --domain-filter=example.com  # Only manage this domain
        - --provider=aws              # Cloud provider
        - --policy=upsert-only        # Only create/update, never delete
        - --aws-zone-type=public      # Public hosted zone
        - --registry=txt
        - --txt-owner-id=k8s-cluster-1
        env:
        - name: AWS_DEFAULT_REGION
          value: us-east-1
        resources:
          requests:
            memory: 50Mi
            cpu: 50m
          limits:
            memory: 100Mi
            cpu: 100m

---
# Service with external DNS annotation
apiVersion: v1
kind: Service
metadata:
  name: web-service
  annotations:
    external-dns.alpha.kubernetes.io/hostname: web.example.com
    external-dns.alpha.kubernetes.io/ttl: "300"
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 8080
  selector:
    app: web
```

### DNS Performance Optimization

**CoreDNS Scaling and Performance:**
```yaml
# CoreDNS deployment with performance tuning
apiVersion: apps/v1
kind: Deployment
metadata:
  name: coredns
  namespace: kube-system
spec:
  replicas: 3  # Scale based on cluster size
  selector:
    matchLabels:
      k8s-app: kube-dns
  template:
    metadata:
      labels:
        k8s-app: kube-dns
    spec:
      priorityClassName: system-cluster-critical
      serviceAccountName: coredns
      tolerations:
      - key: "CriticalAddonsOnly"
        operator: "Exists"
      - effect: NoSchedule
        key: node-role.kubernetes.io/master
      nodeSelector:
        kubernetes.io/os: linux
      containers:
      - name: coredns
        image: k8s.gcr.io/coredns/coredns:v1.8.6
        imagePullPolicy: IfNotPresent
        resources:
          limits:
            memory: 170Mi
            cpu: 1000m
          requests:
            cpu: 100m
            memory: 70Mi
        args: [ "-conf", "/etc/coredns/Corefile" ]
        volumeMounts:
        - name: config-volume
          mountPath: /etc/coredns
          readOnly: true
        ports:
        - containerPort: 53
          name: dns
          protocol: UDP
        - containerPort: 53
          name: dns-tcp
          protocol: TCP
        - containerPort: 9153
          name: metrics
          protocol: TCP
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
            scheme: HTTP
          initialDelaySeconds: 60
          timeoutSeconds: 5
          successThreshold: 1
          failureThreshold: 5
        readinessProbe:
          httpGet:
            path: /ready
            port: 8181
            scheme: HTTP
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            add:
            - NET_BIND_SERVICE
            drop:
            - all
          readOnlyRootFilesystem: true
      dnsPolicy: Default
      volumes:
      - name: config-volume
        configMap:
          name: coredns
          items:
          - key: Corefile
            path: Corefile

---
# Horizontal Pod Autoscaler for CoreDNS
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: coredns-hpa
  namespace: kube-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: coredns
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

**DNS Caching Strategies:**
```yaml
# NodeLocal DNS Cache for improved performance
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-local-dns
  namespace: kube-system
spec:
  selector:
    matchLabels:
      k8s-app: node-local-dns
  template:
    metadata:
      labels:
        k8s-app: node-local-dns
    spec:
      priorityClassName: system-node-critical
      serviceAccountName: node-local-dns
      hostNetwork: true
      dnsPolicy: Default
      tolerations:
      - key: "CriticalAddonsOnly"
        operator: "Exists"
      - effect: NoSchedule
        key: node-role.kubernetes.io/master
      containers:
      - name: node-cache
        image: k8s.gcr.io/dns/k8s-dns-node-cache:1.21.1
        resources:
          requests:
            cpu: 25m
            memory: 5Mi
        args: [ "-localip", "169.254.20.10,10.96.0.10", "-conf", "/etc/Corefile", "-upstreamsvc", "kube-dns-upstream" ]
        securityContext:
          privileged: true
        ports:
        - containerPort: 53
          name: dns
          protocol: UDP
        - containerPort: 53
          name: dns-tcp
          protocol: TCP
        - containerPort: 9253
          name: metrics
          protocol: TCP
        livenessProbe:
          httpGet:
            host: 169.254.20.10
            path: /health
            port: 8080
          initialDelaySeconds: 60
          timeoutSeconds: 5
        volumeMounts:
        - mountPath: /run/xtables.lock
          name: xtables-lock
          readOnly: false
        - name: config-volume
          mountPath: /etc/coredns
        - name: kube-dns-config
          mountPath: /etc/kube-dns
      volumes:
      - name: xtables-lock
        hostPath:
          path: /run/xtables.lock
          type: FileOrCreate
      - name: kube-dns-config
        configMap:
          name: kube-dns
          optional: true
      - name: config-volume
        configMap:
          name: node-local-dns
          items:
          - key: Corefile
            path: Corefile.base
```

## CNI Plugin Selection and Management

### CNI Decision Framework

**CNI Selection Criteria:**
```
Performance Requirements:
├── High throughput: Cilium (eBPF), Calico (native routing)
├── Low latency: Calico BGP, host networking
├── Standard performance: Flannel, Weave
└── Development/testing: Bridge, host-local

Security Requirements:
├── Network policies: Calico, Cilium, Weave
├── Encryption: Weave (mesh), Cilium (WireGuard), service mesh
├── Micro-segmentation: Calico (GlobalNetworkPolicy), Cilium (L7 policies)
└── Zero-trust: Service mesh (Istio, Linkerd) with CNI

Operational Complexity:
├── Simple setup: Flannel, kindnet
├── Moderate complexity: Calico, Weave
├── High complexity: Cilium, custom solutions
└── Cloud-managed: Provider CNI (AWS VPC, GKE, AKS)

Infrastructure Requirements:
├── BGP support: Calico native routing
├── VXLAN overlay: Flannel, Calico IPIP
├── Cloud integration: Provider-specific CNI
└── On-premises: Calico, Cilium, Weave
```

**Network Policy Support Matrix:**
```
CNI Plugin    | L3/L4 Policies | L7 Policies | Encryption | BGP
------------- | -------------- | ----------- | ---------- | ---
Flannel       | ❌             | ❌          | ❌         | ❌
Calico        | ✅             | ✅*         | 🔶         | ✅
Cilium        | ✅             | ✅          | ✅         | 🔶
Weave         | ✅             | ❌          | ✅         | ❌
AWS VPC CNI   | ✅             | ❌          | 🔶         | ❌

✅ = Full support
🔶 = Partial/addon support  
❌ = Not supported
* = Requires Calico Enterprise
```

### Advanced CNI Configuration

**Calico with BGP Configuration:**
```yaml
# Calico installation manifest
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    # IP pool configuration
    ipPools:
    - blockSize: 26           # /26 blocks per node (64 IPs)
      cidr: 10.244.0.0/16    # Pod network CIDR
      encapsulation: None     # No overlay, pure BGP routing
      natOutgoing: Enabled    # SNAT for outbound traffic
      nodeSelector: all()
    
    # BGP configuration
    bgp: Enabled
    
    # Multi-interface configuration
    nodeAddressAutodetectionV4:
      interface: eth0          # Primary interface for BGP
    
    # IP-in-IP configuration for cross-subnet
    ipipMode: CrossSubnet     # Only use IPIP across subnets
    vxlanMode: Never          # Disable VXLAN overlay

---
# BGP Peer configuration
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: rack1-tor
spec:
  peerIP: 192.168.1.1        # Top-of-rack switch IP
  asNumber: 65001            # Switch AS number
  node: rack1-node1          # Specific node peering

---
# Global BGP configuration
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Info
  asNumber: 65000            # Cluster AS number
  serviceClusterIPs:
  - cidr: 10.96.0.0/12       # Advertise service CIDR
  serviceExternalIPs:
  - cidr: 203.0.113.0/24     # Advertise external IPs
```

**Cilium with eBPF Configuration:**
```yaml
# Cilium DaemonSet configuration
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: cilium
  namespace: kube-system
spec:
  selector:
    matchLabels:
      k8s-app: cilium
  template:
    metadata:
      labels:
        k8s-app: cilium
    spec:
      serviceAccountName: cilium
      hostNetwork: true
      containers:
      - name: cilium-agent
        image: quay.io/cilium/cilium:v1.11.2
        imagePullPolicy: IfNotPresent
        command:
        - cilium-agent
        args:
        - --config-dir=/tmp/cilium/config-map
        - --debug=$(CILIUM_DEBUG)
        env:
        - name: K8S_NODE_NAME
          valueFrom:
            fieldRef:
              apiVersion: v1
              fieldPath: spec.nodeName
        - name: CILIUM_DEBUG
          valueFrom:
            configMapKeyRef:
              key: debug
              name: cilium-config
              optional: true
        - name: CILIUM_CNI_CHAINING_MODE
          valueFrom:
            configMapKeyRef:
              key: cni-chaining-mode
              name: cilium-config
              optional: true
        lifecycle:
          preStop:
            exec:
              command:
              - /cni-uninstall.sh
        livenessProbe:
          httpGet:
            host: 127.0.0.1
            path: /healthz
            port: 9876
            scheme: HTTP
            httpHeaders:
            - name: brief
              value: "true"
          failureThreshold: 10
          periodSeconds: 30
          successThreshold: 1
          timeoutSeconds: 5
        readinessProbe:
          httpGet:
            host: 127.0.0.1
            path: /healthz
            port: 9876
            scheme: HTTP
            httpHeaders:
            - name: brief
              value: "true"
          failureThreshold: 3
          periodSeconds: 30
          successThreshold: 1
          timeoutSeconds: 5
        volumeMounts:
        - mountPath: /sys/fs/bpf
          name: bpf-maps
        - mountPath: /var/run/cilium
          name: cilium-run
        - mountPath: /host/opt/cni/bin
          name: cni-path
        - mountPath: /host/etc/cni/net.d
          name: etc-cni-netd
        - mountPath: /tmp/cilium/config-map
          name: cilium-config-path
          readOnly: true
        - mountPath: /lib/modules
          name: lib-modules
          readOnly: true
        - mountPath: /run/xtables.lock
          name: xtables-lock
        securityContext:
          capabilities:
            add:
            - NET_ADMIN
            - SYS_MODULE
          privileged: true
      hostNetwork: true
      restartPolicy: Always
      priorityClassName: system-node-critical
      serviceAccount: cilium
      serviceAccountName: cilium
      terminationGracePeriodSeconds: 1
      tolerations:
      - operator: Exists
      volumes:
      - hostPath:
          path: /var/run/cilium
          type: DirectoryOrCreate
        name: cilium-run
      - hostPath:
          path: /sys/fs/bpf
          type: DirectoryOrCreate
        name: bpf-maps
      - hostPath:
          path: /opt/cni/bin
          type: DirectoryOrCreate
        name: cni-path
      - hostPath:
          path: /etc/cni/net.d
          type: DirectoryOrCreate
        name: etc-cni-netd
      - configMap:
          name: cilium-config
        name: cilium-config-path
      - hostPath:
          path: /lib/modules
        name: lib-modules
      - hostPath:
          path: /run/xtables.lock
          type: FileOrCreate
        name: xtables-lock

---
# Cilium configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: cilium-config
  namespace: kube-system
data:
  # Core configuration
  debug: "false"
  enable-ipv4: "true"
  enable-ipv6: "false"
  
  # eBPF configuration
  enable-bpf-masquerade: "true"
  enable-xt-socket-fallback: "true"
  install-iptables-rules: "true"
  
  # Network configuration
  cluster-name: k8s-cluster
  cluster-id: "0"
  cluster-pool-ipv4-cidr: "10.244.0.0/16"
  cluster-pool-ipv4-mask-size: "24"
  
  # Service mesh features
  enable-l7-proxy: "true"
  enable-envoy-config: "true"
  
  # Hubble observability
  enable-hubble: "true"
  hubble-listen-address: ":4244"
  hubble-metrics-server: ":9091"
  hubble-metrics: "dns,drop,tcp,flow,icmp,http"
  
  # Security features
  enable-policy: "default"
  policy-enforcement-mode: "default"
  
  # Performance tuning
  tunnel: "disabled"                    # Use native routing
  enable-endpoint-routes: "true"        # Program per-endpoint routes
  auto-direct-node-routes: "true"       # Automatic node route detection
```

## Troubleshooting Advanced Networking

### Ingress Troubleshooting

**Systematic Ingress Debugging:**
```bash
# Step 1: Check ingress resource
kubectl get ingress
kubectl describe ingress <ingress-name>

# Step 2: Verify ingress controller
kubectl get pods -n ingress-nginx
kubectl logs -n ingress-nginx <controller-pod>

# Step 3: Check service and endpoints
kubectl get svc,endpoints <service-name>

# Step 4: Test internal connectivity
kubectl run test --image=busybox --rm -it -- \
  wget -qO- http://<service-name>.<namespace>

# Step 5: Check external DNS
nslookup <hostname>
dig <hostname>

# Step 6: Test external connectivity
curl -v http://<hostname>/path
curl -v https://<hostname>/path -k

# Step 7: Check TLS certificates
openssl s_client -connect <hostname>:443 -servername <hostname>
```

**Common Ingress Issues:**

**Issue 1: 404 Not Found**
```bash
# Check ingress rules
kubectl get ingress <name> -o yaml | grep -A 10 rules:

# Verify path matching
kubectl describe ingress <name> | grep Path:

# Check annotation syntax
kubectl get ingress <name> -o yaml | grep annotations: -A 10
```

**Issue 2: SSL/TLS Problems**
```bash
# Check TLS secret
kubectl get secret <tls-secret-name> -o yaml

# Verify certificate validity
kubectl get secret <tls-secret-name> -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | openssl x509 -text -noout

# Check certificate expiration
kubectl get secret <tls-secret-name> -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | openssl x509 -enddate -noout
```

### DNS Troubleshooting

**CoreDNS Debugging:**
```bash
# Check CoreDNS pod status
kubectl get pods -n kube-system -l k8s-app=kube-dns

# View CoreDNS logs
kubectl logs -n kube-system -l k8s-app=kube-dns

# Check CoreDNS configuration
kubectl get configmap coredns -n kube-system -o yaml

# Test DNS resolution from pod
kubectl run dns-debug --image=busybox --rm -it -- nslookup kubernetes.default

# Check DNS performance
kubectl run dns-perf --image=busybox --rm -it -- \
  sh -c 'time nslookup google.com && time nslookup kubernetes.default'

# Verify DNS policy
kubectl run test-pod --image=busybox --dry-run=client -o yaml | \
  grep dnsPolicy
```

### CNI Troubleshooting

**CNI Plugin Debugging:**
```bash
# Check CNI plugin pods
kubectl get pods -n kube-system | grep -E '(flannel|calico|cilium|weave)'

# View CNI plugin logs
kubectl logs -n kube-system <cni-pod-name>

# Check CNI configuration
ls -la /etc/cni/net.d/
cat /etc/cni/net.d/*.conf

# Test pod networking
kubectl exec -it <pod-name> -- ip addr show
kubectl exec -it <pod-name> -- ip route show

# Check cross-node connectivity
kubectl run test-1 --image=busybox -- sleep 3600
kubectl run test-2 --image=busybox -- sleep 3600
kubectl exec test-1 -- ping <test-2-pod-ip>
```

## Exam Tips & Quick Reference

### ⚡ Essential Commands

```bash
# Ingress management
kubectl create ingress simple --rule="host/path=service:port"
kubectl get ingress,svc,endpoints

# DNS testing
kubectl run dns-test --image=busybox --rm -it -- nslookup service-name

# Network debugging
kubectl run netshoot --image=nicolaka/netshoot --rm -it -- bash
kubectl exec -it pod-name -- netstat -tlnp

# TLS certificate management
kubectl create secret tls tls-secret --cert=tls.crt --key=tls.key
```

### 🎯 Common Exam Scenarios

**Scenario 1: Create Ingress with TLS**
```bash
# Create TLS secret
kubectl create secret tls webapp-tls --cert=webapp.crt --key=webapp.key

# Create ingress
kubectl create ingress webapp --rule="webapp.example.com/*=webapp-svc:80,tls=webapp-tls"
```

**Scenario 2: Debug Service Connectivity**
```bash
# Check service chain
kubectl get svc,endpoints webapp-svc
kubectl get pods -l app=webapp
kubectl run debug --image=busybox --rm -it -- telnet webapp-svc 80
```

### 🚨 Critical Gotchas

1. **Ingress Class**: Must specify correct ingress class annotation
2. **Path Types**: Prefix vs Exact vs ImplementationSpecific behavior
3. **TLS Secret Format**: Must be kubernetes.io/tls type with tls.crt and tls.key
4. **DNS Caching**: DNS queries may be cached, restart pods to clear
5. **CNI Plugin Health**: Network issues often trace to CNI plugin problems
6. **Service Endpoints**: Check endpoints match pod labels exactly
7. **Network Policies**: May block expected traffic if enabled

## WHY This Matters - The Deeper Philosophy

### Application Delivery Evolution

**The Historical Progression:**
```
Monolithic Era:    Single server, single domain, simple routing
SOA Era:          Multiple services, ESB routing, complex integration
Microservices:    Distributed services, API gateways, service mesh
Cloud-Native:     Dynamic routing, auto-scaling, observability

Ingress represents the evolution toward:
├── Declarative traffic management
├── Application-aware routing
├── Automated certificate management
├── Integrated security policies
└── Observable request flows
```

**The Network as Code Philosophy:**
```
Traditional Network Management:
├── Manual configuration changes
├── Imperative network commands  
├── Static routing rules
├── Siloed network/application teams
└── Change fear and rigidity

Kubernetes Network Management:
├── Declarative network policies
├── Version-controlled configurations
├── Dynamic routing based on application state
├── DevOps-driven network changes
└── Infrastructure as Code principles
```

Understanding advanced Kubernetes networking teaches you how to build **scalable, secure, and observable** application delivery platforms. This knowledge is essential for the CKA exam and critical for operating modern production workloads that require sophisticated traffic management, security policies, and reliable service discovery.

The networking layer is where applications meet infrastructure, making this knowledge fundamental for anyone designing or operating cloud-native systems at scale.