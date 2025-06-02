# CKA Guide: Kubernetes Security - RBAC, ServiceAccounts, SecurityContext & NetworkPolicies

## Fundamental Conceptual Understanding

### The Defense in Depth Security Model

**Kubernetes Security Layers:**
```
Layer 7: Application Security
├── Application-level authentication and authorization
├── Input validation and sanitization
├── Secure coding practices
├── Dependency vulnerability management
└── Runtime application security monitoring

Layer 6: Pod Security
├── SecurityContext: Container runtime security
├── Pod Security Standards: Policy enforcement
├── Resource limits: DoS prevention
├── Image security: Vulnerability scanning
└── Secrets management: Sensitive data protection

Layer 5: Network Security
├── NetworkPolicies: Micro-segmentation
├── Service mesh: mTLS and traffic encryption
├── Ingress security: TLS termination and WAF
├── CNI security: Network plugin hardening
└── East-west traffic control: Pod-to-pod communication

Layer 4: Access Control
├── RBAC: Role-based access control
├── ServiceAccounts: Pod identity and permissions
├── Admission Controllers: Policy enforcement at API level
├── Authentication: Identity verification
└── Authorization: Permission validation

Layer 3: Node Security
├── Node hardening: OS security configurations
├── Container runtime security: CRI security
├── kubelet security: API and certificate management
├── Host filesystem protection: Read-only root filesystems
└── Kernel security: Seccomp and AppArmor profiles

Layer 2: Cluster Security
├── API server security: TLS and certificate management
├── etcd security: Encryption at rest and in transit
├── Control plane isolation: Network and compute separation
├── Audit logging: Security event monitoring
└── Certificate rotation: PKI lifecycle management

Layer 1: Infrastructure Security
├── Cloud provider security: IAM and network controls
├── Physical security: Data center and hardware protection
├── Supply chain security: Software and hardware provenance
├── Compliance: Regulatory and industry standards
└── Incident response: Security operations and forensics
```

**The Principle of Least Privilege:**
```
Traditional "God Mode" Approach:
├── Broad, permissive access controls
├── Shared administrative accounts
├── Long-lived, static credentials
├── Minimal access monitoring
└── Reactive security posture

Zero Trust Security Model:
├── Minimal required permissions only
├── Identity-based access control
├── Short-lived, rotated credentials
├── Continuous access validation
├── Proactive threat detection
└── Assume breach mentality

Kubernetes Implementation:
├── RBAC: Granular permissions per user/service
├── ServiceAccounts: Dedicated identity per workload
├── NetworkPolicies: Default-deny network segmentation
├── SecurityContext: Minimal container privileges
└── Admission Controllers: Policy enforcement at creation time
```

### Security Information Flow

**Authentication, Authorization, and Admission Control:**
```
Kubernetes Request Security Pipeline:

1. Authentication: "Who are you?"
   ├── X.509 certificates (mutual TLS)
   ├── Bearer tokens (ServiceAccount tokens, OIDC)
   ├── Basic authentication (username/password)
   ├── External authentication (webhook, proxy)
   └── Anonymous access (if enabled)

2. Authorization: "What can you do?"
   ├── RBAC (Role-Based Access Control)
   ├── ABAC (Attribute-Based Access Control)
   ├── Node authorization (kubelet permissions)
   ├── Webhook authorization (external policy)
   └── AlwaysAllow/AlwaysDeny (testing only)

3. Admission Control: "How can you do it?"
   ├── Validating Admission: Policy validation
   ├── Mutating Admission: Request modification
   ├── Pod Security Standards: Runtime security policies
   ├── Resource Quotas: Resource limit enforcement
   └── Custom Admission Controllers: Organization policies

Request Flow:
kubectl/Client → API Server → Authentication → Authorization → Admission → etcd
                                    ↓              ↓           ↓
                               "Valid User"   "Allowed"  "Compliant"
```

## Role-Based Access Control (RBAC)

### RBAC Architecture and Components

**RBAC Component Model:**
```
RBAC Building Blocks:

Subjects (Who):
├── User: Human users (certificate CN, OIDC claims)
├── Group: Collection of users (certificate O, OIDC groups)
├── ServiceAccount: Pod/application identity
└── system:* accounts: Built-in Kubernetes identities

Resources (What):
├── API Groups: Core, apps, extensions, etc.
├── Resource Types: pods, services, deployments, etc.
├── Resource Names: Specific resource instances
├── Subresources: logs, exec, portforward, etc.
└── Non-resource URLs: /api, /version, /healthz, etc.

Verbs (How):
├── get, list, watch: Read operations
├── create, update, patch: Write operations
├── delete, deletecollection: Removal operations
├── bind, escalate: Special RBAC operations
└── * (all): Wildcard for all verbs

Rules: Combinations of resources and verbs
Roles: Collections of rules (namespace-scoped)
ClusterRoles: Collections of rules (cluster-scoped)
Bindings: Associate subjects with roles
```

**RBAC Permission Model:**
```
Permission Evaluation:
├── Explicit ALLOW only (no implicit permissions)
├── No DENY rules (everything not allowed is denied)
├── Union of all applicable rules (additive permissions)
├── Namespace-scoped vs cluster-scoped resources
└── API group and version specific permissions

Inheritance and Scope:
├── ClusterRole: Applies across entire cluster
├── Role: Applies within specific namespace
├── ClusterRoleBinding: Binds subjects to ClusterRoles globally
├── RoleBinding: Binds subjects to Roles/ClusterRoles in namespace
└── ServiceAccount: Automatically bound in its namespace
```

### RBAC Configuration Patterns

**Basic Role and RoleBinding:**
```yaml
# Namespace-scoped role for pod management
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: development
  name: pod-manager
rules:
# Pod management permissions
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# Pod logs and exec access
- apiGroups: [""]
  resources: ["pods/log", "pods/exec"]
  verbs: ["get", "create"]

# ConfigMap and Secret read access
- apiGroups: [""]
  resources: ["configmaps", "secrets"]
  verbs: ["get", "list", "watch"]

# Service management
- apiGroups: [""]
  resources: ["services"]
  verbs: ["get", "list", "watch", "create", "update", "patch"]

---
# Bind role to user
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: pod-manager-binding
  namespace: development
subjects:
- kind: User
  name: developer@company.com
  apiGroup: rbac.authorization.k8s.io
- kind: Group
  name: development-team
  apiGroup: rbac.authorization.k8s.io
- kind: ServiceAccount
  name: deployment-service-account
  namespace: development
roleRef:
  kind: Role
  name: pod-manager
  apiGroup: rbac.authorization.k8s.io
```

**ClusterRole for Cluster-Wide Permissions:**
```yaml
# Cluster-wide read-only access
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cluster-reader
rules:
# Read access to most resources
- apiGroups: [""]
  resources: ["*"]
  verbs: ["get", "list", "watch"]

- apiGroups: ["apps"]
  resources: ["*"]
  verbs: ["get", "list", "watch"]

- apiGroups: ["extensions"]
  resources: ["*"]
  verbs: ["get", "list", "watch"]

# Node information access
- apiGroups: [""]
  resources: ["nodes"]
  verbs: ["get", "list", "watch"]

# Non-resource URLs
- nonResourceURLs: ["/api/*", "/apis/*", "/version", "/healthz"]
  verbs: ["get"]

# Exclude sensitive resources
# (Note: This is accomplished by NOT including them in rules)
# - secrets (excluded for security)
# - persistentvolumes (excluded for data protection)

---
# Bind ClusterRole to subjects
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cluster-reader-binding
subjects:
- kind: User
  name: readonly-user@company.com
  apiGroup: rbac.authorization.k8s.io
- kind: Group
  name: monitoring-team
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: cluster-reader
  apiGroup: rbac.authorization.k8s.io
```

**Advanced RBAC Patterns:**

**Resource Name Restrictions:**
```yaml
# Role with specific resource name access
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: production
  name: specific-resource-manager
rules:
# Access to specific named resources only
- apiGroups: [""]
  resources: ["configmaps"]
  resourceNames: ["app-config", "database-config"]
  verbs: ["get", "update", "patch"]

# Access to specific secrets
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames: ["app-tls-secret", "database-credentials"]
  verbs: ["get"]

# Full access to pods (no name restriction)
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["*"]
```

**Multi-Namespace Role Access:**
```yaml
# ClusterRole for multi-namespace access
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: multi-namespace-deployer
rules:
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

- apiGroups: [""]
  resources: ["pods", "services", "configmaps"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

---
# RoleBinding in development namespace
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: deployer-dev
  namespace: development
subjects:
- kind: User
  name: deployer@company.com
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: multi-namespace-deployer
  apiGroup: rbac.authorization.k8s.io

---
# RoleBinding in staging namespace
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: deployer-staging
  namespace: staging
subjects:
- kind: User
  name: deployer@company.com
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: multi-namespace-deployer
  apiGroup: rbac.authorization.k8s.io
```

**Custom Resource Access:**
```yaml
# Role for custom resource management
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: custom-resource-manager
rules:
# Custom resource definitions
- apiGroups: ["apiextensions.k8s.io"]
  resources: ["customresourcedefinitions"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# Specific custom resources
- apiGroups: ["example.com"]
  resources: ["myresources"]
  verbs: ["*"]

# Istio resources (if using service mesh)
- apiGroups: ["networking.istio.io"]
  resources: ["virtualservices", "destinationrules", "gateways"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# Cert-manager resources (if using)
- apiGroups: ["cert-manager.io"]
  resources: ["certificates", "certificaterequests", "issuers"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
```

### Built-in Roles and System Accounts

**Default ClusterRoles:**
```yaml
# View built-in cluster roles
# kubectl get clusterroles

# Key built-in ClusterRoles:
cluster-admin:        # Superuser access to all resources
├── Full access to all resources in all API groups
├── Can create and modify RBAC rules
├── Should be used sparingly and only for break-glass access
└── Default binding: system:masters group

admin:               # Namespace admin access
├── Full access to most resources within namespace
├── Can create roles and role bindings within namespace
├── Cannot modify resource quotas or namespace itself
└── Good for namespace owners/administrators

edit:                # Read/write access to most resources
├── Can create, modify, and delete most resources
├── Cannot view or modify roles, role bindings, or secrets
├── Cannot access pod logs or exec into containers
└── Good for developers who need to modify resources

view:                # Read-only access to most resources
├── Can view most resources but not secrets
├── Cannot modify any resources
├── Cannot access pod logs or exec capabilities
└── Good for monitoring and troubleshooting roles

system:*:            # System component roles
├── system:kube-controller-manager
├── system:kube-scheduler
├── system:node (for kubelet)
└── Various system service accounts
```

**System ServiceAccounts:**
```bash
# View system service accounts
kubectl get serviceaccounts --all-namespaces | grep system

# Key system service accounts:
default                    # Default SA for pods (minimal permissions)
system:serviceaccount:kube-system:*  # System component service accounts

# Check what permissions a service account has
kubectl auth can-i --list --as=system:serviceaccount:kube-system:default
```

### RBAC Debugging and Auditing

**Permission Testing:**
```bash
# Test current user permissions
kubectl auth can-i create pods
kubectl auth can-i create pods --namespace=production
kubectl auth can-i '*' '*'  # Check if cluster admin

# Test specific user permissions
kubectl auth can-i create deployments --as=user@company.com
kubectl auth can-i delete pods --as=system:serviceaccount:default:webapp

# List all permissions for user
kubectl auth can-i --list
kubectl auth can-i --list --as=user@company.com

# Test access to specific resources
kubectl auth can-i get pods/log
kubectl auth can-i create pods/exec

# Test non-resource URL access
kubectl auth can-i get /api/v1/
```

**RBAC Analysis:**
```bash
# View role bindings for a user
kubectl get rolebindings,clusterrolebindings -o wide | grep user@company.com

# Describe role content
kubectl describe role pod-manager -n development
kubectl describe clusterrole cluster-admin

# View all subjects bound to a role
kubectl describe rolebinding pod-manager-binding -n development
kubectl describe clusterrolebinding cluster-admin

# Find all permissions for a service account
kubectl describe clusterrolebinding | grep -A 10 system:serviceaccount:kube-system:default
```

**RBAC Troubleshooting:**
```bash
# Common RBAC errors and debugging:

# Error: "User cannot create pods"
# 1. Check if user is authenticated
kubectl config view --minify

# 2. Check user's permissions
kubectl auth can-i create pods --as=user@company.com

# 3. Check existing role bindings
kubectl get rolebindings,clusterrolebindings -o wide | grep user@company.com

# 4. Check role contents
kubectl describe role <role-name> -n <namespace>

# Error: "ServiceAccount cannot access secrets"
# 1. Check service account permissions
kubectl auth can-i get secrets --as=system:serviceaccount:default:webapp

# 2. Check service account role bindings
kubectl get rolebindings -o yaml | grep -A 10 -B 10 webapp

# 3. Create appropriate role and binding if missing
kubectl create role secret-reader --verb=get,list --resource=secrets -n default
kubectl create rolebinding webapp-secret-reader --role=secret-reader --serviceaccount=default:webapp -n default
```

## ServiceAccounts and Pod Identity

### ServiceAccount Architecture

**ServiceAccount Identity Model:**
```
ServiceAccount Components:
├── ServiceAccount Object: Identity definition in Kubernetes
├── JWT Token: Authentication credential for API server
├── CA Certificate: API server verification
├── Token Volume: Automatic mounting in pods
├── Image Pull Secrets: Optional registry credentials
└── RBAC Bindings: Authorization permissions

Automatic Token Mounting:
├── Default behavior: Token automatically mounted in pods
├── Mount path: /var/run/secrets/kubernetes.io/serviceaccount/
├── Files: token, ca.crt, namespace
├── Token refresh: Automatic rotation (Kubernetes 1.22+)
└── Disable option: automountServiceAccountToken: false

Identity Resolution:
├── Pod → ServiceAccount → JWT Token → API Server
├── Token contains: Namespace, ServiceAccount name, expiration
├── API server validates: Signature, expiration, issuer
└── Authorization: RBAC rules applied to ServiceAccount identity
```

**ServiceAccount Configuration:**
```yaml
# Custom ServiceAccount with specific permissions
apiVersion: v1
kind: ServiceAccount
metadata:
  name: webapp-service-account
  namespace: production
  labels:
    app: webapp
    environment: production
  annotations:
    description: "Service account for webapp with limited permissions"
automountServiceAccountToken: true    # Default: true
imagePullSecrets:                     # Optional: for private registries
- name: private-registry-secret

---
# Role for ServiceAccount
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: production
  name: webapp-role
rules:
# ConfigMap access for configuration
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list", "watch"]

# Secret access for credentials
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames: ["webapp-secrets", "database-credentials"]
  verbs: ["get"]

# Service discovery
- apiGroups: [""]
  resources: ["services", "endpoints"]
  verbs: ["get", "list", "watch"]

# Pod information (for health checks)
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]
  resourceNames: [] # Can access pods in same namespace

---
# Bind ServiceAccount to Role
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: webapp-role-binding
  namespace: production
subjects:
- kind: ServiceAccount
  name: webapp-service-account
  namespace: production
roleRef:
  kind: Role
  name: webapp-role
  apiGroup: rbac.authorization.k8s.io

---
# Pod using custom ServiceAccount
apiVersion: v1
kind: Pod
metadata:
  name: webapp-pod
  namespace: production
spec:
  serviceAccountName: webapp-service-account
  containers:
  - name: webapp
    image: webapp:1.0
    env:
    # ServiceAccount token automatically available at:
    # /var/run/secrets/kubernetes.io/serviceaccount/token
    - name: KUBERNETES_NAMESPACE
      valueFrom:
        fieldRef:
          fieldPath: metadata.namespace
    ports:
    - containerPort: 8080
```

### ServiceAccount Token Management

**Token Lifecycle and Security:**
```yaml
# ServiceAccount with token configuration
apiVersion: v1
kind: ServiceAccount
metadata:
  name: secure-service-account
  namespace: default
# Kubernetes 1.22+ automatically creates bound tokens
# Kubernetes 1.24+ deprecated legacy ServiceAccount tokens

---
# Manual token creation (Kubernetes 1.24+)
apiVersion: v1
kind: Secret
metadata:
  name: webapp-token
  namespace: default
  annotations:
    kubernetes.io/service-account.name: secure-service-account
type: kubernetes.io/service-account-token

---
# Pod with explicit token configuration
apiVersion: v1
kind: Pod
metadata:
  name: token-aware-pod
spec:
  serviceAccountName: secure-service-account
  automountServiceAccountToken: true
  containers:
  - name: app
    image: webapp:1.0
    env:
    # Access token programmatically
    - name: SERVICE_ACCOUNT_TOKEN
      valueFrom:
        secretKeyRef:
          name: webapp-token
          key: token
    volumeMounts:
    # Standard token mount (automatic)
    - name: kube-api-access
      mountPath: /var/run/secrets/kubernetes.io/serviceaccount
      readOnly: true
  volumes:
  # Kubernetes automatically creates this volume
  - name: kube-api-access
    projected:
      sources:
      - serviceAccountToken:
          expirationSeconds: 3607
          path: token
      - configMap:
          name: kube-root-ca.crt
          items:
          - key: ca.crt
            path: ca.crt
      - downwardAPI:
          items:
          - path: namespace
            fieldRef:
              fieldPath: metadata.namespace
```

**Token Usage in Applications:**
```bash
# Access Kubernetes API from within pod
# Token automatically mounted at /var/run/secrets/kubernetes.io/serviceaccount/

# Example application code using ServiceAccount token:
#!/bin/bash
SERVICEACCOUNT_TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)
KUBE_CA_CERT=/var/run/secrets/kubernetes.io/serviceaccount/ca.crt
NAMESPACE=$(cat /var/run/secrets/kubernetes.io/serviceaccount/namespace)

# Call Kubernetes API
curl -H "Authorization: Bearer $SERVICEACCOUNT_TOKEN" \
     --cacert $KUBE_CA_CERT \
     https://kubernetes.default.svc.cluster.local/api/v1/namespaces/$NAMESPACE/pods

# Using kubectl with ServiceAccount token
kubectl --token=$SERVICEACCOUNT_TOKEN get pods
```

### Multi-Tenant ServiceAccount Patterns

**Namespace Isolation with ServiceAccounts:**
```yaml
# Development environment ServiceAccount
apiVersion: v1
kind: ServiceAccount
metadata:
  name: developer-sa
  namespace: development

---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: development
  name: developer-role
rules:
- apiGroups: ["", "apps", "extensions"]
  resources: ["*"]
  verbs: ["*"]
# Note: Full access within development namespace only

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: developer-binding
  namespace: development
subjects:
- kind: ServiceAccount
  name: developer-sa
  namespace: development
roleRef:
  kind: Role
  name: developer-role
  apiGroup: rbac.authorization.k8s.io

---
# Production environment ServiceAccount (more restrictive)
apiVersion: v1
kind: ServiceAccount
metadata:
  name: production-app-sa
  namespace: production

---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: production
  name: production-app-role
rules:
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames: ["app-secrets"]  # Only specific secrets
  verbs: ["get"]
# Note: Minimal permissions for production workloads

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: production-app-binding
  namespace: production
subjects:
- kind: ServiceAccount
  name: production-app-sa
  namespace: production
roleRef:
  kind: Role
  name: production-app-role
  apiGroup: rbac.authorization.k8s.io
```

**Cross-Namespace ServiceAccount Access:**
```yaml
# ServiceAccount that can access multiple namespaces
apiVersion: v1
kind: ServiceAccount
metadata:
  name: multi-namespace-sa
  namespace: default

---
# ClusterRole for cross-namespace access
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: multi-namespace-role
rules:
- apiGroups: [""]
  resources: ["pods", "services"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch", "update", "patch"]

---
# ClusterRoleBinding for global access
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: multi-namespace-binding
subjects:
- kind: ServiceAccount
  name: multi-namespace-sa
  namespace: default
roleRef:
  kind: ClusterRole
  name: multi-namespace-role
  apiGroup: rbac.authorization.k8s.io
```

## SecurityContext and Runtime Security

### SecurityContext Architecture

**Pod-Level vs Container-Level Security:**
```
Security Context Hierarchy:
├── Pod SecurityContext: Applies to all containers in pod
│   ├── User/Group IDs for all containers
│   ├── SELinux labels for pod
│   ├── Seccomp profiles for pod
│   ├── Sysctl settings for pod
│   └── File system group permissions
├── Container SecurityContext: Overrides pod settings
│   ├── User/Group IDs for specific container
│   ├── Capabilities: Linux capabilities to add/drop
│   ├── Privileged mode: Full host access
│   ├── Read-only root filesystem
│   ├── Allow privilege escalation
│   └── SELinux options for container
└── Inheritance: Container settings override pod settings

Security Enforcement:
├── Container Runtime: Enforces security context settings
├── Linux Kernel: Applies capabilities, namespaces, cgroups
├── SELinux/AppArmor: Mandatory access control
├── Seccomp: System call filtering
└── Admission Controllers: Policy validation before creation
```

**Comprehensive Security Context Configuration:**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-pod
  annotations:
    # Pod Security Standards annotation
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
spec:
  # Pod-level security context
  securityContext:
    # User and group settings
    runAsUser: 1000                    # Non-root user ID
    runAsGroup: 3000                   # Primary group ID
    runAsNonRoot: true                 # Enforce non-root user
    fsGroup: 2000                      # File system group for volumes
    fsGroupChangePolicy: Always        # How to apply fsGroup
    
    # Supplemental groups
    supplementalGroups:
    - 4000
    - 5000
    
    # SELinux settings
    seLinuxOptions:
      level: "s0:c123,c456"            # SELinux context
      type: "container_t"
      user: "system_u"
      role: "object_r"
    
    # Seccomp profile
    seccompProfile:
      type: RuntimeDefault             # Use container runtime default
      # type: Localhost                # Use custom profile
      # localhostProfile: my-profile.json
    
    # Windows-specific settings (if applicable)
    windowsOptions:
      gmsaCredentialSpecName: gmsa-webapp
      gmsaCredentialSpec: "credspec contents"
      runAsUserName: "ContainerUser"
    
    # System controls
    sysctls:
    - name: net.core.somaxconn
      value: "1024"
    - name: kernel.shm_rmid_forced
      value: "1"

  containers:
  - name: webapp
    image: webapp:1.0
    
    # Container-level security context (overrides pod settings)
    securityContext:
      # User settings (override pod settings)
      runAsUser: 1001                  # Different from pod setting
      runAsGroup: 3001
      runAsNonRoot: true
      
      # Privilege settings
      privileged: false                # Never use privileged containers
      allowPrivilegeEscalation: false  # Prevent privilege escalation
      readOnlyRootFilesystem: true     # Immutable container filesystem
      
      # Linux capabilities
      capabilities:
        add:
        - NET_BIND_SERVICE             # Bind to privileged ports
        drop:
        - ALL                          # Drop all capabilities first
        # Common capabilities to drop:
        # - CHOWN, DAC_OVERRIDE, FOWNER, SETGID, SETUID, SYS_CHROOT
      
      # SELinux (container-specific)
      seLinuxOptions:
        type: "webapp_t"               # Custom SELinux type
      
      # Seccomp (container-specific)
      seccompProfile:
        type: RuntimeDefault
      
      # Proc mount type
      procMount: Default               # Default, Unmasked
    
    # Application configuration
    ports:
    - containerPort: 8080
    
    # Volume mounts with security considerations
    volumeMounts:
    - name: app-data
      mountPath: /app/data
      readOnly: false                  # Application data (read-write)
    - name: app-config
      mountPath: /app/config
      readOnly: true                   # Configuration (read-only)
    - name: tmp-volume
      mountPath: /tmp                  # Writable temp space
    - name: var-cache
      mountPath: /var/cache
      
  # Volume configuration
  volumes:
  - name: app-data
    persistentVolumeClaim:
      claimName: app-data-pvc
  - name: app-config
    configMap:
      name: app-config
      defaultMode: 0644                # Readable by group
  - name: tmp-volume
    emptyDir: {}                       # Temporary writable space
  - name: var-cache
    emptyDir: {}
```

### Linux Capabilities Management

**Capability-Based Security:**
```yaml
# Minimal capabilities example
apiVersion: v1
kind: Pod
metadata:
  name: minimal-capabilities-pod
spec:
  containers:
  - name: webapp
    image: nginx:1.21
    securityContext:
      capabilities:
        drop:
        - ALL                          # Drop all capabilities
        add:
        - NET_BIND_SERVICE             # Only add what's needed
      runAsNonRoot: true
      runAsUser: 101                   # nginx user
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
    ports:
    - containerPort: 80                # Can bind to port 80 with NET_BIND_SERVICE
    volumeMounts:
    - name: nginx-cache
      mountPath: /var/cache/nginx      # Writable cache directory
    - name: nginx-run
      mountPath: /var/run              # Runtime files
  volumes:
  - name: nginx-cache
    emptyDir: {}
  - name: nginx-run
    emptyDir: {}

# Common Linux capabilities:
# CAP_CHOWN: Change file ownership
# CAP_DAC_OVERRIDE: Bypass file permission checks
# CAP_FOWNER: Bypass permission checks for operations that normally require filesystem ownership
# CAP_SETGID: Make arbitrary manipulations of process GIDs
# CAP_SETUID: Make arbitrary manipulations of process UIDs
# CAP_NET_BIND_SERVICE: Bind to ports < 1024
# CAP_SYS_CHROOT: Use chroot()
# CAP_KILL: Send signals to processes
# CAP_AUDIT_WRITE: Write to audit log
```

**Network Capabilities Example:**
```yaml
# Pod requiring network capabilities
apiVersion: v1
kind: Pod
metadata:
  name: network-tools-pod
spec:
  containers:
  - name: network-tools
    image: nicolaka/netshoot
    securityContext:
      capabilities:
        drop:
        - ALL
        add:
        - NET_ADMIN                    # Network administration
        - NET_RAW                      # Raw network access (ping, traceroute)
        - SYS_PTRACE                   # Process tracing (debugging)
      runAsUser: 0                     # May need root for network tools
      allowPrivilegeEscalation: false
    command: ["sleep", "3600"]
```

### Pod Security Standards

**Pod Security Standards Levels:**
```yaml
# Privileged level (most permissive)
apiVersion: v1
kind: Namespace
metadata:
  name: privileged-workloads
  labels:
    pod-security.kubernetes.io/enforce: privileged
    pod-security.kubernetes.io/audit: privileged
    pod-security.kubernetes.io/warn: privileged
# Allows: Privileged containers, host networking, all capabilities

---
# Baseline level (minimally restrictive)
apiVersion: v1
kind: Namespace
metadata:
  name: baseline-workloads
  labels:
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/audit: baseline
    pod-security.kubernetes.io/warn: baseline
# Prohibits: Privileged containers, host networking, most capabilities
# Allows: Non-root users, some capabilities like NET_BIND_SERVICE

---
# Restricted level (most secure)
apiVersion: v1
kind: Namespace
metadata:
  name: restricted-workloads
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
# Requires: Non-root users, read-only root filesystem, no privilege escalation
# Prohibits: Most capabilities, privileged containers

---
# Pod that complies with restricted standard
apiVersion: v1
kind: Pod
metadata:
  name: restricted-compliant-pod
  namespace: restricted-workloads
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    runAsGroup: 3000
    fsGroup: 2000
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: app
    image: webapp:1.0
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      runAsNonRoot: true
      runAsUser: 1000
      capabilities:
        drop:
        - ALL
      seccompProfile:
        type: RuntimeDefault
    ports:
    - containerPort: 8080
    volumeMounts:
    - name: tmp-volume
      mountPath: /tmp
  volumes:
  - name: tmp-volume
    emptyDir: {}
```

### Advanced Security Patterns

**Multi-Container Security:**
```yaml
# Secure multi-container pod with sidecar
apiVersion: v1
kind: Pod
metadata:
  name: secure-multi-container
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 2000
    seccompProfile:
      type: RuntimeDefault
  
  containers:
  # Main application container
  - name: webapp
    image: webapp:1.0
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      runAsUser: 1001                  # Different user than pod default
      capabilities:
        drop:
        - ALL
        add:
        - NET_BIND_SERVICE
    ports:
    - containerPort: 8080
    volumeMounts:
    - name: app-data
      mountPath: /app/data
    - name: tmp-volume
      mountPath: /tmp
  
  # Logging sidecar with different security context
  - name: log-forwarder
    image: fluent/fluent-bit:1.9
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      runAsUser: 1002                  # Different user for sidecar
      capabilities:
        drop:
        - ALL
    volumeMounts:
    - name: app-data
      mountPath: /app/data
      readOnly: true                   # Sidecar only reads logs
    - name: fluent-config
      mountPath: /fluent-bit/etc
      readOnly: true
  
  volumes:
  - name: app-data
    emptyDir: {}
  - name: tmp-volume
    emptyDir: {}
  - name: fluent-config
    configMap:
      name: fluent-bit-config
```

**Init Container Security:**
```yaml
# Secure init container pattern
apiVersion: v1
kind: Pod
metadata:
  name: secure-init-container
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 2000
  
  # Init container with elevated permissions for setup
  initContainers:
  - name: setup
    image: busybox:1.35
    securityContext:
      runAsUser: 0                     # Root needed for setup tasks
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
        - ALL
        add:
        - CHOWN                        # Needed to change file ownership
        - DAC_OVERRIDE                 # Needed for file operations
    command:
    - sh
    - -c
    - |
      # Set up file permissions for main container
      touch /shared/app.log
      chown 1000:2000 /shared/app.log
      chmod 644 /shared/app.log
    volumeMounts:
    - name: shared-data
      mountPath: /shared
  
  # Main container runs with restricted permissions
  containers:
  - name: app
    image: webapp:1.0
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      runAsUser: 1000                  # Non-root user
      capabilities:
        drop:
        - ALL
    volumeMounts:
    - name: shared-data
      mountPath: /app/data
  
  volumes:
  - name: shared-data
    emptyDir: {}
```

## Network Policies

### Network Policy Architecture

**Network Segmentation Model:**
```
Network Policy Concepts:
├── Default Deny: All traffic blocked unless explicitly allowed
├── Default Allow: All traffic permitted (Kubernetes default)
├── Ingress Rules: Control incoming traffic to pods
├── Egress Rules: Control outgoing traffic from pods
├── Namespace Isolation: Separate network domains
├── Pod Selection: Label-based traffic targeting
└── Policy Combination: Multiple policies are additive

Traffic Types:
├── Pod-to-Pod: Communication between pods in cluster
├── Pod-to-Service: Communication via Kubernetes services
├── Pod-to-External: Communication to internet/external services
├── External-to-Pod: Ingress traffic from outside cluster
└── Namespace-to-Namespace: Cross-namespace communication

Rule Matching:
├── From/To: Source/destination specification
├── Ports: Protocol and port combinations
├── NamespaceSelector: Target namespaces by labels
├── PodSelector: Target pods by labels
└── IPBlock: Target external IP ranges
```

**Network Policy Components:**
```yaml
# Complete network policy structure
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: comprehensive-network-policy
  namespace: production
spec:
  # Pod selection (which pods this policy applies to)
  podSelector:
    matchLabels:
      app: webapp
      tier: frontend
  
  # Policy types (what traffic to control)
  policyTypes:
  - Ingress                            # Control incoming traffic
  - Egress                             # Control outgoing traffic
  
  # Ingress rules (incoming traffic)
  ingress:
  # Rule 1: Allow from specific pods
  - from:
    - podSelector:
        matchLabels:
          app: api-gateway
    ports:
    - protocol: TCP
      port: 8080
  
  # Rule 2: Allow from specific namespaces
  - from:
    - namespaceSelector:
        matchLabels:
          environment: production
      podSelector:
        matchLabels:
          component: loadbalancer
    ports:
    - protocol: TCP
      port: 80
  
  # Rule 3: Allow from external IP range
  - from:
    - ipBlock:
        cidr: 10.0.0.0/8
        except:
        - 10.0.1.0/24                  # Exclude specific subnet
    ports:
    - protocol: TCP
      port: 443
  
  # Egress rules (outgoing traffic)
  egress:
  # Rule 1: Allow to specific pods
  - to:
    - podSelector:
        matchLabels:
          app: database
    ports:
    - protocol: TCP
      port: 5432
  
  # Rule 2: Allow to external services
  - to:
    - ipBlock:
        cidr: 0.0.0.0/0                # All external IPs
        except:
        - 169.254.169.254/32           # Exclude metadata service
    ports:
    - protocol: TCP
      port: 443                        # HTTPS only
    - protocol: TCP
      port: 80                         # HTTP
  
  # Rule 3: Allow DNS resolution
  - to: []                             # Any destination
    ports:
    - protocol: UDP
      port: 53                         # DNS
    - protocol: TCP
      port: 53                         # DNS over TCP
```

### Common Network Policy Patterns

**Default Deny All Traffic:**
```yaml
# Deny all ingress traffic (default deny)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: production
spec:
  podSelector: {}                      # Applies to all pods in namespace
  policyTypes:
  - Ingress
  # No ingress rules = deny all ingress

---
# Deny all egress traffic
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-egress
  namespace: production
spec:
  podSelector: {}                      # Applies to all pods
  policyTypes:
  - Egress
  # No egress rules = deny all egress

---
# Deny all ingress and egress traffic
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  # No rules = deny all traffic
```

**Allow DNS and Common Services:**
```yaml
# Allow DNS resolution for all pods
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: production
spec:
  podSelector: {}                      # All pods
  policyTypes:
  - Egress
  egress:
  # Allow DNS queries to kube-system namespace
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 53
  
  # Allow DNS queries to any IP (for external DNS)
  - to: []
    ports:
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 53

---
# Allow access to Kubernetes API server
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-kube-api
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - to:
    - ipBlock:
        cidr: 10.96.0.1/32             # API server ClusterIP
    ports:
    - protocol: TCP
      port: 443
```

**Three-Tier Application Network Policy:**
```yaml
# Frontend network policy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: frontend-netpol
  namespace: webapp
spec:
  podSelector:
    matchLabels:
      tier: frontend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  # Allow from ingress controller
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 80
  egress:
  # Allow to backend tier
  - to:
    - podSelector:
        matchLabels:
          tier: backend
    ports:
    - protocol: TCP
      port: 8080
  # Allow DNS
  - to: []
    ports:
    - protocol: UDP
      port: 53

---
# Backend network policy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-netpol
  namespace: webapp
spec:
  podSelector:
    matchLabels:
      tier: backend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  # Allow from frontend tier
  - from:
    - podSelector:
        matchLabels:
          tier: frontend
    ports:
    - protocol: TCP
      port: 8080
  egress:
  # Allow to database tier
  - to:
    - podSelector:
        matchLabels:
          tier: database
    ports:
    - protocol: TCP
      port: 5432
  # Allow to external APIs
  - to:
    - ipBlock:
        cidr: 0.0.0.0/0
    ports:
    - protocol: TCP
      port: 443
  # Allow DNS
  - to: []
    ports:
    - protocol: UDP
      port: 53

---
# Database network policy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: database-netpol
  namespace: webapp
spec:
  podSelector:
    matchLabels:
      tier: database
  policyTypes:
  - Ingress
  - Egress
  ingress:
  # Only allow from backend tier
  - from:
    - podSelector:
        matchLabels:
          tier: backend
    ports:
    - protocol: TCP
      port: 5432
  egress:
  # Allow DNS only (no external access)
  - to: []
    ports:
    - protocol: UDP
      port: 53
```

**Cross-Namespace Communication:**
```yaml
# Allow specific cross-namespace communication
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-monitoring
  namespace: webapp
spec:
  podSelector:
    matchLabels:
      app: webapp
  policyTypes:
  - Ingress
  ingress:
  # Allow monitoring namespace to scrape metrics
  - from:
    - namespaceSelector:
        matchLabels:
          name: monitoring
      podSelector:
        matchLabels:
          app: prometheus
    ports:
    - protocol: TCP
      port: 9090                       # Metrics port

---
# Allow logging namespace access
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-logging
  namespace: webapp
spec:
  podSelector: {}                      # All pods in namespace
  policyTypes:
  - Ingress
  ingress:
  # Allow log collection from logging namespace
  - from:
    - namespaceSelector:
        matchLabels:
          name: logging
    ports:
    - protocol: TCP
      port: 24224                      # Fluentd forward protocol
```

### Network Policy Debugging

**Testing Network Connectivity:**
```bash
# Create test pods for connectivity testing
kubectl run test-client --image=busybox --rm -it -- /bin/sh
kubectl run test-server --image=nginx --port=80

# Test pod-to-pod connectivity
kubectl exec -it test-client -- wget -qO- http://test-server

# Test service connectivity
kubectl exec -it test-client -- wget -qO- http://test-server-service

# Test external connectivity
kubectl exec -it test-client -- wget -qO- http://google.com

# Test DNS resolution
kubectl exec -it test-client -- nslookup kubernetes.default
kubectl exec -it test-client -- nslookup test-server-service

# Check network policy application
kubectl describe networkpolicy <policy-name>
kubectl get networkpolicy -o yaml
```

**Network Policy Troubleshooting:**
```bash
# Common network policy issues:

# 1. DNS not working after applying network policy
# Solution: Add DNS egress rule
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - to: []
    ports:
    - protocol: UDP
      port: 53
EOF

# 2. Pods can't reach Kubernetes API
# Solution: Add API server egress rule
kubectl get svc kubernetes -o jsonpath='{.spec.clusterIP}'
# Add egress rule for this IP on port 443

# 3. Cross-namespace communication blocked
# Check namespace labels
kubectl get namespaces --show-labels

# 4. Service discovery not working
# Check if service endpoints are populated
kubectl get endpoints <service-name>

# 5. External connectivity blocked
# Check egress rules for external IP blocks
kubectl describe networkpolicy | grep -A 10 "Egress:"
```

## Exam Tips & Quick Reference

### ⚡ Essential Security Commands

```bash
# RBAC commands
kubectl auth can-i create pods                    # Check permissions
kubectl auth can-i --list                         # List all permissions
kubectl auth can-i create pods --as=user@company.com

# ServiceAccount commands
kubectl create serviceaccount webapp-sa
kubectl get serviceaccounts
kubectl describe serviceaccount webapp-sa

# Security context testing
kubectl run secure-pod --image=nginx --dry-run=client -o yaml > secure-pod.yaml
# Edit to add security context, then apply

# Network policy testing
kubectl run test-pod --image=busybox --rm -it -- /bin/sh
# Test connectivity before and after applying network policies
```

### 🎯 Common Exam Scenarios

**Scenario 1: Create RBAC for User**
```bash
# Create role
kubectl create role pod-reader --verb=get,list,watch --resource=pods

# Create role binding
kubectl create rolebinding pod-reader-binding --role=pod-reader --user=dev@company.com

# Test permissions
kubectl auth can-i get pods --as=dev@company.com
```

**Scenario 2: Secure Pod Configuration**
```bash
# Generate pod with security context
kubectl run secure-app --image=nginx --dry-run=client -o yaml > secure-app.yaml

# Edit to add:
# - runAsNonRoot: true
# - readOnlyRootFilesystem: true
# - capabilities drop ALL
# Then apply
```

**Scenario 3: Network Policy Implementation**
```bash
# Create default deny policy
kubectl create -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
spec:
  podSelector: {}
  policyTypes:
  - Ingress
EOF

# Test connectivity (should be blocked)
# Then create specific allow policies
```

### 🚨 Critical Gotchas

1. **RBAC Additive**: Multiple role bindings are additive (union of permissions)
2. **ServiceAccount Default**: Default SA has minimal permissions
3. **SecurityContext Inheritance**: Container settings override pod settings
4. **Network Policy CNI**: Requires CNI plugin support (Calico, Cilium, etc.)
5. **Default Allow**: Kubernetes allows all traffic by default
6. **Policy Types**: Must specify both Ingress and Egress for complete control
7. **DNS Access**: Always allow DNS unless explicitly blocked

## WHY This Matters - The Deeper Philosophy

### Security as Code and Shift-Left

**The Evolution of Security:**
```
Traditional Security (Perimeter-Based):
├── Network firewalls and DMZs
├── Host-based security after deployment
├── Reactive security patching
├── Manual security configurations
└── Security as separate operational concern

Cloud-Native Security (Zero-Trust):
├── Identity-based access control
├── Security policies as code
├── Proactive security by design
├── Automated security enforcement
├── Security integrated into development workflow
└── Continuous security validation

Kubernetes Security Principles:
├── Defense in depth across all layers
├── Principle of least privilege by default
├── Immutable infrastructure reduces attack surface
├── Declarative security policies
├── Automated policy enforcement
└── Observable security posture
```

### Economic Model of Security

**Security ROI Calculation:**
```
Security Investment Areas:
├── Prevention: RBAC, NetworkPolicies, SecurityContext
├── Detection: Audit logging, monitoring, alerting
├── Response: Incident response, forensics, recovery
├── Education: Training, awareness, best practices
└── Compliance: Auditing, reporting, certification

Cost of Security Breaches:
├── Direct costs: Data loss, system downtime, recovery
├── Indirect costs: Reputation damage, customer churn
├── Regulatory costs: Fines, legal fees, compliance
├── Opportunity costs: Delayed features, market share
└── Insurance costs: Higher premiums, coverage gaps

Kubernetes Security Benefits:
├── Automated policy enforcement reduces human error
├── Consistent security across environments
├── Audit trails for compliance and forensics
├── Rapid response through automation
└── Lower operational overhead through standardization
```

### Production Engineering Philosophy

**Security as Enabler, Not Blocker:**
```
Traditional Security Approach:
├── Security policies slow development
├── Manual approval processes
├── Security team as gatekeeper
├── "Security says no" culture
└── Security debt accumulation

Cloud-Native Security Approach:
├── Security policies enable safe development
├── Automated policy validation
├── Security team as platform provider
├── "Security helps you go faster" culture
└── Security by design, not afterthought

Platform Engineering Benefits:
├── Self-service security capabilities
├── Consistent security across teams
├── Reduced time to production
├── Improved compliance posture
└── Better developer experience
```

### Career Development Implications

**For the Exam:**
- **RBAC Mastery**: Understand roles, bindings, and permission model
- **SecurityContext Knowledge**: Configure secure container runtime settings
- **Network Policy Skills**: Implement micro-segmentation strategies
- **ServiceAccount Understanding**: Manage pod identity and API access

**For Production Systems:**
- **Zero Trust Architecture**: Design systems with identity-based security
- **Compliance Automation**: Implement automated security policy enforcement
- **Incident Response**: Build observable and auditable security systems
- **Risk Management**: Balance security requirements with operational needs

**For Your Career:**
- **Security Leadership**: Guide organizations in adopting secure practices
- **Platform Engineering**: Build secure, self-service development platforms
- **Architecture**: Design systems that are secure by default
- **DevSecOps**: Integrate security into development and operations workflows

Understanding Kubernetes security deeply teaches you how to build **secure, compliant, and auditable** systems that protect against modern threats while enabling developer productivity. This knowledge is fundamental to the CKA exam and essential for anyone operating production Kubernetes environments.

Security in Kubernetes isn't just about preventing attacks - it's about building systems that are resilient, observable, and maintainable while meeting the compliance and governance requirements of modern enterprises.