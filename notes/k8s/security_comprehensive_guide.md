# Security - Comprehensive Study Guide
category: Kubernetes Certification
tags: cka, kubernetes, exam, kubectl, certification

## WHY Security Matters (Conceptual Foundation)

### Kubernetes as a Multi-Tenant Platform
Security in Kubernetes is about **controlling access and enforcing boundaries** in a shared platform:

- **Identity and Access Management** - Who can do what to which resources
- **Resource Isolation** - Preventing workloads from interfering with each other
- **Network Segmentation** - Controlling communication between services
- **Process and Container Security** - Limiting privileges and attack surface
- **Data Protection** - Securing secrets, configurations, and persistent data

### Exam Context: Why Security Mastery is Critical
- **25% of exam content** focuses on security configuration and troubleshooting
- **Cluster hardening** - Common exam scenarios for RBAC, NetworkPolicies
- **Pod security** - SecurityContext configuration and debugging
- **Authentication/authorization** - ServiceAccount and permission troubleshooting
- **Network isolation** - Creating and debugging NetworkPolicy restrictions

**Key Insight**: Kubernetes security is **layered defense** - no single mechanism provides complete protection. Understanding how RBAC, SecurityContext, and NetworkPolicies work together is essential.

---

## Security Architecture Overview

### The Kubernetes Security Model
```
┌─────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │               Network Security                          ││
│  │  NetworkPolicies, Ingress/Egress Control              ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │               Runtime Security                          ││
│  │  SecurityContext, PodSecurityPolicy, Admission        ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │            Identity & Access (RBAC)                    ││
│  │  Users, ServiceAccounts, Roles, RoleBindings          ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │              API Server Security                       ││
│  │  Authentication, Authorization, Admission Control     ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Security Request Flow
```
┌──────────────┐    ┌─────────────────┐    ┌────────────────┐
│   kubectl    │───▶│ Authentication  │───▶│ Authorization  │
│   (client)   │    │ (who are you?)  │    │ (what can you  │
│              │    │                 │    │    do?)       │
└──────────────┘    └─────────────────┘    └────────────────┘
                                                   │
                    ┌─────────────────┐           ▼
                    │   Pod Created   │    ┌────────────────┐
                    │  with Security  │◀───│ Admission      │
                    │   Context       │    │ Controllers    │
                    └─────────────────┘    │ (policy        │
                                          │  enforcement)  │
                                          └────────────────┘
```

**Conceptual Model**: Every request flows through Authentication → Authorization → Admission Control, then runtime security is enforced via SecurityContext and NetworkPolicies.

---

## RBAC (Role-Based Access Control)

### What RBAC Does (Conceptual)
RBAC is the **authorization engine** that answers "what can this identity do?":

- **Subject** - Who is making the request (User, ServiceAccount)
- **Verb** - What action is being attempted (get, create, delete)
- **Resource** - What object is being accessed (pods, services, secrets)
- **Namespace** - Where the action is taking place (optional scope)

### RBAC Components Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                      RBAC Model                            │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │   Subject   │    │  Binding    │    │      Role       │  │
│  │             │    │             │    │                 │  │
│  │ • User      │◀───│ • RoleB     │───▶│ • Rules         │  │
│  │ • SA        │    │ • ClusterRB │    │ • Verbs         │  │
│  │ • Group     │    │             │    │ • Resources     │  │
│  └─────────────┘    └─────────────┘    └─────────────────┘  │
│                                                             │
│  Example: ServiceAccount "api-service" has RoleBinding     │
│          that grants Role "pod-reader" permissions         │
└─────────────────────────────────────────────────────────────┘
```

### Basic RBAC Objects

#### Role and RoleBinding (Namespace-scoped)
```yaml
# Role defines permissions within a namespace
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: development
  name: pod-manager
rules:
- apiGroups: [""]         # Core API group
  resources: ["pods"]
  verbs: ["get", "list", "create", "delete"]
- apiGroups: [""]
  resources: ["pods/log"]  # Subresources
  verbs: ["get"]
- apiGroups: ["apps"]     # apps API group
  resources: ["deployments"]
  verbs: ["get", "list", "create", "update", "patch"]
---
# RoleBinding grants Role to subjects
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: pod-manager-binding
  namespace: development
subjects:
- kind: User
  name: jane.doe
  apiGroup: rbac.authorization.k8s.io
- kind: ServiceAccount
  name: api-service
  namespace: development
roleRef:
  kind: Role
  name: pod-manager
  apiGroup: rbac.authorization.k8s.io
```

#### ClusterRole and ClusterRoleBinding (Cluster-scoped)
```yaml
# ClusterRole for cluster-wide permissions
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: node-reader
rules:
- apiGroups: [""]
  resources: ["nodes"]
  verbs: ["get", "list"]
- apiGroups: ["metrics.k8s.io"]
  resources: ["nodes", "pods"]
  verbs: ["get", "list"]
---
# ClusterRoleBinding grants ClusterRole to subjects
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: monitoring-team
subjects:
- kind: Group
  name: monitoring-team
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: node-reader
  apiGroup: rbac.authorization.k8s.io
```

### Advanced RBAC Patterns

#### Resource Names and Wildcards
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: production
  name: specific-pod-access
rules:
# Access specific pods by name
- apiGroups: [""]
  resources: ["pods"]
  resourceNames: ["web-pod-1", "web-pod-2"]  # Specific resources
  verbs: ["get", "delete"]
# Access all configmaps but only specific operations
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list"]  # No create/update/delete
# Wildcard access to all resources in apps group
- apiGroups: ["apps"]
  resources: ["*"]  # All resources
  verbs: ["get", "list"]
# Access subresources
- apiGroups: [""]
  resources: ["pods/exec", "pods/portforward"]
  verbs: ["create"]
```

#### Service Account with Multiple Roles
```yaml
# ServiceAccount
apiVersion: v1
kind: ServiceAccount
metadata:
  name: microservice-sa
  namespace: application
---
# Role 1: Pod management
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: application
  name: pod-operator
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "create", "delete"]
---
# Role 2: ConfigMap management
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: application
  name: config-reader
rules:
- apiGroups: [""]
  resources: ["configmaps", "secrets"]
  verbs: ["get", "list"]
---
# Binding 1
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: microservice-pod-binding
  namespace: application
subjects:
- kind: ServiceAccount
  name: microservice-sa
  namespace: application
roleRef:
  kind: Role
  name: pod-operator
  apiGroup: rbac.authorization.k8s.io
---
# Binding 2
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: microservice-config-binding
  namespace: application
subjects:
- kind: ServiceAccount
  name: microservice-sa
  namespace: application
roleRef:
  kind: Role
  name: config-reader
  apiGroup: rbac.authorization.k8s.io
```

### RBAC Troubleshooting

#### Testing Permissions
```bash
# Check if current user can perform action
kubectl auth can-i create pods
kubectl auth can-i delete pods --namespace=production
kubectl auth can-i "*" "*"  # All permissions

# Check permissions for other users/service accounts
kubectl auth can-i create pods --as=system:serviceaccount:default:my-sa
kubectl auth can-i get nodes --as=jane.doe

# List all permissions for a service account
kubectl auth can-i --list --as=system:serviceaccount:default:my-sa

# Debug permission denials
kubectl get events --sort-by='.lastTimestamp' | grep -i forbidden
kubectl logs -n kube-system kube-apiserver-master | grep -i "forbidden\|unauthorized"
```

#### Common RBAC Issues
```bash
# Issue 1: ServiceAccount doesn't exist
# Error: "User system:serviceaccount:default:non-existent cannot create pods"
kubectl get serviceaccount non-existent  # Check if SA exists
kubectl create serviceaccount missing-sa  # Create if missing

# Issue 2: No RoleBinding exists
# Error: "User system:serviceaccount:default:my-sa cannot create pods"
kubectl get rolebindings,clusterrolebindings --all-namespaces | grep my-sa

# Issue 3: Wrong namespace in RoleBinding
# Check that RoleBinding and ServiceAccount are in same namespace
kubectl get rolebinding -n correct-namespace
kubectl get serviceaccount my-sa -n correct-namespace

# Issue 4: Insufficient permissions in Role
kubectl describe role my-role -n my-namespace
# Verify that required verbs and resources are included
```

---

## ServiceAccounts: Identity for Pods

### What ServiceAccounts Do (Conceptual)
ServiceAccounts provide **identity for pods** to authenticate with the API server:

- **Pod Identity** - Every pod runs with a ServiceAccount identity
- **API Authentication** - ServiceAccounts use JWT tokens for API calls
- **RBAC Integration** - ServiceAccounts are subjects in RBAC bindings
- **Namespace Scoped** - ServiceAccounts belong to specific namespaces
- **Automatic Token Mounting** - Tokens automatically mounted in pods

### ServiceAccount Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                  ServiceAccount Flow                       │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │    Pod      │───▶│ SA Token    │───▶│   API Server    │  │
│  │             │    │ (JWT)       │    │  Authentication │  │
│  │/var/run/    │    │             │    │                 │  │
│  │secrets/k8s..│    │             │    │                 │  │
│  └─────────────┘    └─────────────┘    └─────────────────┘  │
│         │                                       │           │
│         ▼                                       ▼           │
│  ┌─────────────┐                     ┌─────────────────┐    │
│  │ Mounted     │                     │ RBAC Check      │    │
│  │ Token       │                     │ (what can this  │    │
│  │ Files       │                     │  SA do?)        │    │
│  └─────────────┘                     └─────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### ServiceAccount Creation and Management

#### Basic ServiceAccount
```yaml
# ServiceAccount definition
apiVersion: v1
kind: ServiceAccount
metadata:
  name: application-sa
  namespace: production
automountServiceAccountToken: true  # Default: true
---
# Using ServiceAccount in Pod
apiVersion: v1
kind: Pod
metadata:
  name: app-pod
  namespace: production
spec:
  serviceAccountName: application-sa  # Use specific SA
  containers:
  - name: app
    image: myapp:latest
    # Token automatically mounted at:
    # /var/run/secrets/kubernetes.io/serviceaccount/token
    # /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    # /var/run/secrets/kubernetes.io/serviceaccount/namespace
```

#### ServiceAccount with RBAC
```yaml
# Complete ServiceAccount setup
apiVersion: v1
kind: ServiceAccount
metadata:
  name: pod-reader-sa
  namespace: monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: monitoring
  name: pod-reader-role
rules:
- apiGroups: [""]
  resources: ["pods", "pods/log"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: pod-reader-binding
  namespace: monitoring
subjects:
- kind: ServiceAccount
  name: pod-reader-sa
  namespace: monitoring
roleRef:
  kind: Role
  name: pod-reader-role
  apiGroup: rbac.authorization.k8s.io
---
# Pod using the ServiceAccount
apiVersion: apps/v1
kind: Deployment
metadata:
  name: monitoring-app
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: monitoring
  template:
    metadata:
      labels:
        app: monitoring
    spec:
      serviceAccountName: pod-reader-sa
      containers:
      - name: monitor
        image: monitor:latest
        # Application can now call Kubernetes API
        # using mounted token with pod read permissions
```

### ServiceAccount Token Management

#### Token Mounting and Access
```bash
# Inside a pod, ServiceAccount token is mounted at:
ls -la /var/run/secrets/kubernetes.io/serviceaccount/
# token      - JWT token for API authentication
# ca.crt     - Cluster CA certificate
# namespace  - Current namespace

# Using the token to call API
TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)
NAMESPACE=$(cat /var/run/secrets/kubernetes.io/serviceaccount/namespace)
curl -H "Authorization: Bearer $TOKEN" \
     --cacert /var/run/secrets/kubernetes.io/serviceaccount/ca.crt \
     https://kubernetes.default.svc.cluster.local/api/v1/namespaces/$NAMESPACE/pods
```

#### Disabling Token Mounting
```yaml
# ServiceAccount with token mounting disabled
apiVersion: v1
kind: ServiceAccount
metadata:
  name: no-token-sa
  namespace: production
automountServiceAccountToken: false
---
# Pod can override ServiceAccount setting
apiVersion: v1
kind: Pod
metadata:
  name: secure-pod
spec:
  serviceAccountName: no-token-sa
  automountServiceAccountToken: false  # Explicitly disable
  containers:
  - name: app
    image: myapp
    # No token mounted in this pod
```

### ServiceAccount Security Best Practices

#### Least Privilege ServiceAccounts
```yaml
# Specific SA for each application component
apiVersion: v1
kind: ServiceAccount
metadata:
  name: web-frontend-sa
  namespace: ecommerce
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: ecommerce
  name: frontend-role
rules:
# Only permissions needed by frontend
- apiGroups: [""]
  resources: ["configmaps"]
  resourceNames: ["frontend-config"]  # Specific configmap only
  verbs: ["get"]
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames: ["frontend-secrets"]  # Specific secret only
  verbs: ["get"]
---
# Separate SA for backend with different permissions
apiVersion: v1
kind: ServiceAccount
metadata:
  name: api-backend-sa
  namespace: ecommerce
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: ecommerce
  name: backend-role
rules:
# Backend needs more permissions
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]  # Monitor other pods
- apiGroups: [""]
  resources: ["configmaps", "secrets"]
  verbs: ["get", "list"]  # Access configuration
```

---

## SecurityContext: Process and Container Security

### What SecurityContext Does (Conceptual)
SecurityContext controls the **runtime security settings** for pods and containers:

- **User and Group IDs** - What user/group processes run as
- **Capabilities** - Linux capabilities granted or dropped
- **Privilege Escalation** - Whether processes can gain additional privileges
- **Read-only Root Filesystem** - Prevents filesystem modifications
- **SELinux/AppArmor** - Mandatory access control integration

### SecurityContext Levels
```
┌─────────────────────────────────────────────────────────────┐
│                SecurityContext Hierarchy                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │               PodSecurityContext                       ││
│  │         (applies to all containers)                    ││
│  └─────────────────────────────────────────────────────────┘│
│                            │                               │
│                            ▼                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │             Container SecurityContext                  ││
│  │          (overrides pod settings)                      ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Container settings take precedence over Pod settings      │
└─────────────────────────────────────────────────────────────┘
```

### Pod SecurityContext

#### Basic Pod Security Settings
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-pod
spec:
  securityContext:
    # Run as non-root user
    runAsNonRoot: true
    runAsUser: 1000      # Specific user ID
    runAsGroup: 3000     # Specific group ID
    fsGroup: 2000        # Volume ownership group
    
    # Security profiles
    seccompProfile:
      type: RuntimeDefault  # Use runtime default seccomp profile
    
    # SELinux context (if SELinux enabled)
    seLinuxOptions:
      level: "s0:c123,c456"
    
    # Sysctls (kernel parameters)
    sysctls:
    - name: net.core.somaxconn
      value: "1024"
  
  containers:
  - name: app
    image: nginx:1.20
    securityContext:
      # Container-specific overrides
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
        - ALL
        add:
        - NET_BIND_SERVICE  # Allow binding to privileged ports
    
    # Writable volumes for read-only root filesystem
    volumeMounts:
    - name: tmp-volume
      mountPath: /tmp
    - name: var-cache
      mountPath: /var/cache/nginx
    - name: var-run
      mountPath: /var/run
  
  volumes:
  - name: tmp-volume
    emptyDir: {}
  - name: var-cache
    emptyDir: {}
  - name: var-run
    emptyDir: {}
```

### Container SecurityContext

#### Advanced Security Configuration
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: hardened-pod
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 2000
  
  containers:
  - name: web
    image: nginx:alpine
    securityContext:
      # Prevent privilege escalation
      allowPrivilegeEscalation: false
      
      # Read-only root filesystem
      readOnlyRootFilesystem: true
      
      # Drop all capabilities, add only what's needed
      capabilities:
        drop:
        - ALL
        add:
        - NET_BIND_SERVICE  # nginx needs to bind to port 80
        - CHOWN            # nginx needs to change file ownership
        - SETUID           # nginx needs to switch users
        - SETGID           # nginx needs to switch groups
      
      # Seccomp profile for syscall filtering
      seccompProfile:
        type: Localhost
        localhostProfile: nginx-seccomp.json
    
    # Required volumes for read-only root filesystem
    volumeMounts:
    - name: nginx-cache
      mountPath: /var/cache/nginx
    - name: nginx-run
      mountPath: /var/run
    - name: tmp
      mountPath: /tmp
  
  # Init container to set up volumes with correct permissions
  initContainers:
  - name: setup
    image: busybox
    securityContext:
      runAsUser: 0  # Root needed for setup
    command:
    - /bin/sh
    - -c
    - |
      mkdir -p /var/cache/nginx /var/run
      chown 1000:2000 /var/cache/nginx /var/run /tmp
      chmod 755 /var/cache/nginx /var/run /tmp
    volumeMounts:
    - name: nginx-cache
      mountPath: /var/cache/nginx
    - name: nginx-run
      mountPath: /var/run
    - name: tmp
      mountPath: /tmp
  
  volumes:
  - name: nginx-cache
    emptyDir: {}
  - name: nginx-run
    emptyDir: {}
  - name: tmp
    emptyDir: {}
```

### Privileged and Host Access

#### Privileged Containers (Avoid in Production)
```yaml
# WARNING: Privileged containers have full host access
apiVersion: v1
kind: Pod
metadata:
  name: privileged-pod
spec:
  containers:
  - name: privileged-container
    image: busybox
    securityContext:
      privileged: true  # Full host access - dangerous!
    # Can access all host devices, kernel modules, etc.
    # Use only for system-level utilities like CNI, CSI drivers
```

#### Host Namespace Access
```yaml
# System monitoring pod (like node-exporter)
apiVersion: v1
kind: Pod
metadata:
  name: system-monitor
spec:
  # Host namespace access
  hostNetwork: true    # Use host networking
  hostPID: true        # See host processes
  hostIPC: true        # Access host IPC
  
  containers:
  - name: monitor
    image: prom/node-exporter
    securityContext:
      runAsNonRoot: true
      runAsUser: 65534  # nobody user
    ports:
    - containerPort: 9100
      hostPort: 9100   # Expose on host
    volumeMounts:
    - name: proc
      mountPath: /host/proc
      readOnly: true
    - name: sys
      mountPath: /host/sys
      readOnly: true
  
  volumes:
  - name: proc
    hostPath:
      path: /proc
  - name: sys
    hostPath:
      path: /sys
  
  # Allow on all nodes including masters
  tolerations:
  - operator: Exists
```

### SecurityContext Troubleshooting

#### Common Security Issues
```bash
# Issue 1: Permission denied errors
kubectl logs pod-name
# Look for: "Permission denied", "Operation not permitted"
# Solution: Check runAsUser, fsGroup, volume permissions

# Issue 2: Cannot bind to privileged ports
kubectl describe pod pod-name
# Error: "bind: permission denied" for ports < 1024
# Solution: Add NET_BIND_SERVICE capability

# Issue 3: Read-only filesystem errors
kubectl logs pod-name
# Error: "Read-only file system"
# Solution: Mount writable volumes for temp directories

# Issue 4: SELinux/AppArmor denials
# Check node logs for SELinux/AppArmor messages
sudo ausearch -m AVC  # SELinux denials
sudo dmesg | grep apparmor  # AppArmor denials
```

#### Security Validation
```bash
# Check effective user/group in running container
kubectl exec pod-name -- id
kubectl exec pod-name -- ps aux

# Verify capabilities
kubectl exec pod-name -- grep Cap /proc/self/status

# Check filesystem permissions
kubectl exec pod-name -- ls -la /
kubectl exec pod-name -- touch /test-write  # Should fail with read-only root

# Verify seccomp profile
kubectl exec pod-name -- grep Seccomp /proc/self/status
```

---

## NetworkPolicies: Traffic Segmentation

### What NetworkPolicies Do (Conceptual)
NetworkPolicies provide **microsegmentation** at the pod level:

- **Default Deny** - Block all traffic unless explicitly allowed
- **Pod Selection** - Target specific pods using label selectors
- **Traffic Direction** - Control ingress (incoming) and egress (outgoing)
- **Namespace Isolation** - Segment traffic between namespaces
- **Protocol and Port Control** - Layer 4 traffic filtering

### NetworkPolicy Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                NetworkPolicy Model                         │
│                                                             │
│  ┌─────────────┐                           ┌─────────────┐  │
│  │  Frontend   │                           │  Database   │  │
│  │    Pods     │──── ✓ ALLOWED ────────────│    Pods     │  │
│  │             │                           │             │  │
│  └─────────────┘                           └─────────────┘  │
│         │                                         ▲         │
│         ▼                                         │         │
│  ┌─────────────┐                           ┌─────────────┐  │
│  │  External   │──── ✗ DENIED ─────────────│  Database   │  │
│  │   Traffic   │                           │    Pods     │  │
│  │             │                           │             │  │
│  └─────────────┘                           └─────────────┘  │
│                                                             │
│  NetworkPolicy selects Database pods and allows only       │
│  ingress from Frontend pods on specific ports              │
└─────────────────────────────────────────────────────────────┘
```

**Important**: NetworkPolicies are **additive** - multiple policies selecting the same pods combine their rules.

### Basic NetworkPolicy Patterns

#### Default Deny All Traffic
```yaml
# Deny all ingress traffic to all pods in namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-ingress
  namespace: production
spec:
  podSelector: {}  # Selects all pods in namespace
  policyTypes:
  - Ingress
  # No ingress rules = deny all ingress
---
# Deny all egress traffic from all pods in namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-egress
  namespace: production
spec:
  podSelector: {}  # Selects all pods in namespace
  policyTypes:
  - Egress
  # No egress rules = deny all egress
---
# Deny all ingress AND egress (complete isolation)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
```

#### Allow Specific Pod-to-Pod Communication
```yaml
# Allow frontend to access backend on specific port
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: application
spec:
  podSelector:
    matchLabels:
      tier: backend  # Policy applies to backend pods
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          tier: frontend  # Allow from frontend pods
    ports:
    - protocol: TCP
      port: 8080
```

### Advanced NetworkPolicy Patterns

#### Multi-tier Application Security
```yaml
# Web tier: Allow ingress from internet, egress to API tier
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: web-tier-policy
  namespace: ecommerce
spec:
  podSelector:
    matchLabels:
      tier: web
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - {}  # Allow all ingress (internet traffic)
  egress:
  - to:
    - podSelector:
        matchLabels:
          tier: api
    ports:
    - protocol: TCP
      port: 8080
  - to: {}  # Allow DNS resolution
    ports:
    - protocol: UDP
      port: 53
---
# API tier: Allow ingress from web tier, egress to database tier
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-tier-policy
  namespace: ecommerce
spec:
  podSelector:
    matchLabels:
      tier: api
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          tier: web
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - podSelector:
        matchLabels:
          tier: database
    ports:
    - protocol: TCP
      port: 5432
  - to: {}  # Allow DNS
    ports:
    - protocol: UDP
      port: 53
---
# Database tier: Allow ingress only from API tier
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: database-tier-policy
  namespace: ecommerce
spec:
  podSelector:
    matchLabels:
      tier: database
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          tier: api
    ports:
    - protocol: TCP
      port: 5432
  egress:
  - to: {}  # Allow DNS only
    ports:
    - protocol: UDP
      port: 53
```

#### Namespace-based Isolation
```yaml
# Allow cross-namespace communication for monitoring
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-monitoring-access
  namespace: production
spec:
  podSelector:
    matchLabels:
      monitoring: "true"  # Pods that expose metrics
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: monitoring  # From monitoring namespace
    - podSelector:
        matchLabels:
          app: prometheus
    ports:
    - protocol: TCP
      port: 9090  # Metrics port
---
# Allow ingress from specific external IPs
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-external-ips
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: web
  policyTypes:
  - Ingress
  ingress:
  - from:
    - ipBlock:
        cidr: 10.0.0.0/8     # Internal networks
    - ipBlock:
        cidr: 192.168.1.0/24  # Office network
        except:
        - 192.168.1.100/32    # Exclude specific IP
    ports:
    - protocol: TCP
      port: 80
    - protocol: TCP
      port: 443
```

### NetworkPolicy Troubleshooting

#### Testing Network Connectivity
```bash
# Test pod-to-pod connectivity
kubectl run test-pod --image=busybox -it --rm -- /bin/sh
# Inside test pod:
wget -qO- http://target-service:8080
nslookup target-service
ping target-pod-ip

# Test specific port connectivity
kubectl run test-pod --image=busybox -it --rm -- \
  nc -zv target-service 8080

# Test connectivity with netshoot (advanced debugging)
kubectl run netshoot --image=nicolaka/netshoot -it --rm -- /bin/bash
# Inside netshoot:
nmap -p 8080 target-service
tcptraceroute target-service 8080
```

#### NetworkPolicy Debugging
```bash
# List all NetworkPolicies
kubectl get networkpolicies --all-namespaces

# Describe specific policy
kubectl describe networkpolicy allow-frontend-to-backend -n application

# Check if CNI supports NetworkPolicies
kubectl get nodes -o jsonpath='{.items[*].status.nodeInfo.containerRuntimeVersion}'
# Calico, Cilium, Weave support NetworkPolicies
# Flannel does NOT support NetworkPolicies

# View policy in effect for specific pod
kubectl get pod frontend-pod -o yaml | grep -A 10 labels
kubectl get networkpolicy -o yaml | grep -A 20 "podSelector"
```

#### Common NetworkPolicy Issues
```bash
# Issue 1: CNI doesn't support NetworkPolicies
# Solution: Use Calico, Cilium, or Weave instead of Flannel

# Issue 2: DNS resolution blocked
# Error: "nslookup: can't resolve"
# Solution: Allow egress to kube-dns
egress:
- to:
  - namespaceSelector:
      matchLabels:
        name: kube-system
    podSelector:
      matchLabels:
        k8s-app: kube-dns
  ports:
  - protocol: UDP
    port: 53

# Issue 3: Multiple policies causing confusion
# NetworkPolicies are additive - check all policies selecting the pod
kubectl get networkpolicy -o yaml | grep -B 5 -A 10 "tier: web"
```

---

## Integrated Security Example

### Complete Secure Application Deployment
```yaml
# Namespace with NetworkPolicy isolation
apiVersion: v1
kind: Namespace
metadata:
  name: secure-app
  labels:
    name: secure-app
---
# ServiceAccount with minimal permissions
apiVersion: v1
kind: ServiceAccount
metadata:
  name: web-app-sa
  namespace: secure-app
automountServiceAccountToken: true
---
# Role with least privilege
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: secure-app
  name: web-app-role
rules:
- apiGroups: [""]
  resources: ["configmaps"]
  resourceNames: ["web-config"]
  verbs: ["get"]
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames: ["web-secrets"]
  verbs: ["get"]
---
# RoleBinding
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: web-app-binding
  namespace: secure-app
subjects:
- kind: ServiceAccount
  name: web-app-sa
  namespace: secure-app
roleRef:
  kind: Role
  name: web-app-role
  apiGroup: rbac.authorization.k8s.io
---
# Secure deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-web-app
  namespace: secure-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web
      tier: frontend
  template:
    metadata:
      labels:
        app: web
        tier: frontend
    spec:
      serviceAccountName: web-app-sa
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 3000
        fsGroup: 2000
        seccompProfile:
          type: RuntimeDefault
      containers:
      - name: web
        image: nginx:1.20-alpine
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
            add:
            - NET_BIND_SERVICE
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: var-cache
          mountPath: /var/cache/nginx
        - name: var-run
          mountPath: /var/run
        - name: config
          mountPath: /etc/nginx/conf.d
          readOnly: true
      volumes:
      - name: tmp
        emptyDir: {}
      - name: var-cache
        emptyDir: {}
      - name: var-run
        emptyDir: {}
      - name: config
        configMap:
          name: web-config
---
# NetworkPolicy - default deny + specific allows
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: secure-app
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-web-traffic
  namespace: secure-app
spec:
  podSelector:
    matchLabels:
      tier: frontend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from: []  # Allow from anywhere (internet)
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to: {}  # Allow DNS
    ports:
    - protocol: UDP
      port: 53
```

---

## Exam-Specific Security Tasks

### Common Exam Scenarios

#### 1. Create RBAC for ServiceAccount
```bash
# Task: Create ServiceAccount that can create/delete pods in namespace "development"

# Solution:
kubectl create namespace development
kubectl create serviceaccount pod-manager -n development

# Create Role
cat <<EOF | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: development
  name: pod-manager-role
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["create", "delete", "get", "list"]
EOF

# Create RoleBinding
kubectl create rolebinding pod-manager-binding \
  --role=pod-manager-role \
  --serviceaccount=development:pod-manager \
  -n development

# Test permissions
kubectl auth can-i create pods --as=system:serviceaccount:development:pod-manager -n development
```

#### 2. Secure Pod with SecurityContext
```yaml
# Task: Create pod that runs as non-root with read-only filesystem
apiVersion: v1
kind: Pod
metadata:
  name: secure-exam-pod
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 2000
  containers:
  - name: app
    image: nginx:alpine
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
        - ALL
        add:
        - NET_BIND_SERVICE
    volumeMounts:
    - name: tmp
      mountPath: /tmp
    - name: var-cache
      mountPath: /var/cache/nginx
    - name: var-run
      mountPath: /var/run
  volumes:
  - name: tmp
    emptyDir: {}
  - name: var-cache
    emptyDir: {}
  - name: var-run
    emptyDir: {}
```

#### 3. NetworkPolicy Implementation
```yaml
# Task: Block all traffic to database pods except from API pods
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: database-isolation
  namespace: production
spec:
  podSelector:
    matchLabels:
      tier: database
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          tier: api
    ports:
    - protocol: TCP
      port: 5432
```

---

## Security Troubleshooting Workflows

### Systematic Security Debugging

#### RBAC Permission Issues
```bash
# 1. Identify the subject (user/SA)
kubectl auth whoami
# or check pod's service account
kubectl get pod my-pod -o jsonpath='{.spec.serviceAccountName}'

# 2. Check what permissions they have
kubectl auth can-i --list --as=system:serviceaccount:default:my-sa

# 3. Find relevant RoleBindings/ClusterRoleBindings
kubectl get rolebindings,clusterrolebindings --all-namespaces | grep my-sa

# 4. Examine the Role/ClusterRole
kubectl describe role my-role -n my-namespace
kubectl describe clusterrole my-clusterrole

# 5. Fix by adding missing permissions or creating bindings
```

#### SecurityContext Problems
```bash
# 1. Check pod events for security-related errors
kubectl describe pod my-pod | grep -A 10 Events

# 2. Check container logs for permission errors
kubectl logs my-pod

# 3. Verify effective user/capabilities in container
kubectl exec my-pod -- id
kubectl exec my-pod -- grep Cap /proc/self/status

# 4. Test filesystem permissions
kubectl exec my-pod -- ls -la /
kubectl exec my-pod -- touch /test-readonly

# 5. Adjust SecurityContext settings as needed
```

#### NetworkPolicy Connectivity Issues
```bash
# 1. Test basic connectivity
kubectl run test --image=busybox -it --rm -- nc -zv target-service 8080

# 2. Check if NetworkPolicies exist
kubectl get networkpolicy --all-namespaces

# 3. Identify which policies affect your pods
kubectl describe networkpolicy -n my-namespace

# 4. Verify CNI supports NetworkPolicies
kubectl get nodes -o jsonpath='{.items[*].status.nodeInfo.containerRuntimeVersion}'

# 5. Add necessary allow rules or fix policy logic
```

---

## Conceptual Mastery Framework

### Security as Layered Defense
Understanding that **no single security mechanism** is sufficient:
1. **API Server Security** - Authentication and authorization
2. **RBAC** - Fine-grained access control to resources
3. **ServiceAccounts** - Identity and token management for pods
4. **SecurityContext** - Process and container runtime security
5. **NetworkPolicies** - Network-level microsegmentation

### Security Integration Patterns
Security mechanisms **work together**:
- **ServiceAccounts** provide identity for **RBAC** authorization
- **SecurityContext** enforces runtime security for **pods**
- **NetworkPolicies** provide network security for **pod communication**
- **All layers** must be configured for defense in depth

### Least Privilege Principle
Every security configuration should follow **minimum necessary access**:
- **RBAC roles** with only required permissions
- **ServiceAccounts** with specific, limited roles
- **SecurityContext** dropping all capabilities, adding only needed ones
- **NetworkPolicies** denying all traffic, allowing only necessary flows

---

## Conceptual Mastery Checklist

✅ **Understand RBAC as the authorization mechanism for API access**
✅ **Master ServiceAccount token mounting and API authentication**
✅ **Comprehend SecurityContext controls for runtime security**
✅ **Know NetworkPolicy microsegmentation patterns**
✅ **Practice integrated security configurations**
✅ **Internalize troubleshooting workflows for security issues**
✅ **Apply least privilege principles across all security layers**

---

*Mastering Kubernetes security means understanding how authentication, authorization, runtime security, and network controls work together to create defense in depth. Each layer addresses different attack vectors and must be properly configured for comprehensive protection.*