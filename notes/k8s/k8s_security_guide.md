# Kubernetes Security: Complete Deep Technical Guide
category: DevOps
tags: kubernetes, security, rbac, pod-security, secrets, admission-controllers, network-policies

## Introduction to Kubernetes Security

Kubernetes security is built on **multiple layers of defense** - no single security mechanism protects everything. Instead, Kubernetes uses several interconnected security systems that work together to create a secure environment.

### The Security Onion Model

**Authentication** → **Authorization** → **Admission Control** → **Runtime Security**

**Layer 1: Authentication** - "Who are you?"
- Proves the identity of users and services trying to access the cluster
- Uses certificates, tokens, or external identity providers

**Layer 2: Authorization** - "What can you do?"
- Determines what authenticated users/services are allowed to do
- Implemented primarily through RBAC (Role-Based Access Control)

**Layer 3: Admission Control** - "Is this request safe?"
- Validates and potentially modifies requests before they're stored
- Can reject dangerous configurations or automatically add security policies

**Layer 4: Runtime Security** - "What's happening inside?"
- Monitors running workloads for suspicious behavior
- Includes pod security standards, network policies, and runtime monitoring

### Why Kubernetes Security is Complex

**Multi-Tenant by Design:**
- Multiple users, teams, and applications share the same cluster
- Need to isolate workloads while maintaining shared infrastructure
- Default configuration is often "open" for ease of use

**Distributed Attack Surface:**
```
API Server ← Primary target (controls everything)
etcd ← Stores all secrets and configuration
Nodes ← Run untrusted workloads
Network ← East-west traffic between services
Images ← Code and dependencies from external sources
```

**Shared Responsibility Model:**
- **Kubernetes provides** - Security frameworks and APIs
- **You must configure** - Policies, access controls, and monitoring
- **Applications must implement** - Secure coding and secret management

## Authentication Deep Dive

### How Kubernetes Authentication Works

**Authentication happens at the API server** - Every request to the Kubernetes API must be authenticated before it can proceed to authorization.

**Authentication Flow:**
```
Client Request → API Server → Authentication → Authorization → Admission → etcd
                     ↓
              "Who are you?" ← Multiple authenticators tried in order
```

**Types of Clients:**
- **Human Users** - kubectl, dashboard users, CI/CD systems
- **Service Accounts** - Pods, controllers, system components
- **External Systems** - Monitoring, backup tools, operators

### Authentication Methods

#### X.509 Client Certificates

**How Certificate Authentication Works:**
1. **Certificate Authority (CA)** - Cluster has a root CA that signs all certificates
2. **Client Certificate** - Contains user identity in the "Common Name" and groups in "Organization"
3. **Certificate Verification** - API server validates certificate against cluster CA

**Certificate Structure:**
```
Subject: CN=jane.doe, O=developers, O=staging-users
         ↑            ↑           ↑
      Username    Group 1     Group 2
```

**Creating User Certificates:**
```bash
# 1. Generate private key
openssl genrsa -out jane.key 2048

# 2. Create certificate signing request
openssl req -new -key jane.key -out jane.csr -subj "/CN=jane.doe/O=developers/O=staging-users"

# 3. Sign with cluster CA (on master node)
sudo openssl x509 -req -in jane.csr -CA /etc/kubernetes/pki/ca.crt -CAkey /etc/kubernetes/pki/ca.key -CAcreateserial -out jane.crt -days 365

# 4. Create kubeconfig for user
kubectl config set-credentials jane --client-certificate=jane.crt --client-key=jane.key
kubectl config set-context jane-context --cluster=my-cluster --user=jane
```

**Using Certificate in kubeconfig:**
```yaml
apiVersion: v1
kind: Config
clusters:
- cluster:
    certificate-authority-data: LS0tLS1CRUdJTi... # Base64 encoded CA cert
    server: https://kubernetes.example.com:6443
  name: my-cluster
contexts:
- context:
    cluster: my-cluster
    user: jane
  name: jane-context
current-context: jane-context
users:
- name: jane
  user:
    client-certificate-data: LS0tLS1CRUdJTi... # Base64 encoded user cert
    client-key-data: LS0tLS1CRUdJTi...         # Base64 encoded private key
```

#### Service Account Tokens

**What Service Accounts Are:**
Service Accounts are Kubernetes resources that provide identity for pods and system components. Each pod automatically gets a service account token mounted as a file.

**Automatic Token Mounting:**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-pod
spec:
  serviceAccountName: my-service-account  # Optional: defaults to "default"
  containers:
  - name: app
    image: myapp:latest
    # Kubernetes automatically mounts token at:
    # /var/run/secrets/kubernetes.io/serviceaccount/token
```

**Service Account Token Structure:**
```bash
# Inside a pod
$ cat /var/run/secrets/kubernetes.io/serviceaccount/token
eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMzQ1In0.eyJpc3MiOiJrdWJlcm5ldGVzL3Nlcn...

# Decode the JWT token (header.payload.signature)
# Header: {"alg":"RS256","kid":"12345"}
# Payload: {
#   "iss": "kubernetes/serviceaccount",
#   "kubernetes.io/serviceaccount/namespace": "default",
#   "kubernetes.io/serviceaccount/secret.name": "my-sa-token-abc123",
#   "kubernetes.io/serviceaccount/service-account.name": "my-service-account",
#   "kubernetes.io/serviceaccount/service-account.uid": "12345678-1234-1234-1234-123456789012"
# }
```

**Custom Service Account Example:**
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: monitoring-sa
  namespace: monitoring
---
apiVersion: v1
kind: Secret
metadata:
  name: monitoring-sa-token
  namespace: monitoring
  annotations:
    kubernetes.io/service-account.name: monitoring-sa
type: kubernetes.io/service-account-token
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: monitoring-app
spec:
  template:
    spec:
      serviceAccountName: monitoring-sa
      containers:
      - name: monitor
        image: monitoring:latest
        # This pod will authenticate as monitoring-sa service account
```

#### OpenID Connect (OIDC) Integration

**How OIDC Works with Kubernetes:**
```
User → Identity Provider (Google, Azure AD, etc.) → ID Token → Kubernetes API
```

**API Server OIDC Configuration:**
```yaml
# In kube-apiserver configuration
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: kube-apiserver
    command:
    - kube-apiserver
    - --oidc-issuer-url=https://accounts.google.com
    - --oidc-client-id=abc123.apps.googleusercontent.com
    - --oidc-username-claim=email
    - --oidc-groups-claim=groups
    - --oidc-ca-file=/etc/ssl/certs/ca-certificates.crt
```

**OIDC kubeconfig Example:**
```yaml
apiVersion: v1
kind: Config
users:
- name: oidc-user
  user:
    auth-provider:
      name: oidc
      config:
        client-id: abc123.apps.googleusercontent.com
        client-secret: xyz789
        id-token: eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMzQ1In0...
        idp-issuer-url: https://accounts.google.com
        refresh-token: 1/Tl6awhpFjkMkSJoj1xsli0H2eL5YsMgU_NKPY2TyGWY
```

#### Webhook Token Authentication

**External Authentication Service:**
```yaml
# API server configuration
- --authentication-token-webhook-config-file=/etc/kubernetes/auth-webhook.yaml
- --authentication-token-webhook-cache-ttl=30s
```

**Webhook Configuration:**
```yaml
# /etc/kubernetes/auth-webhook.yaml
apiVersion: v1
kind: Config
clusters:
- name: auth-server
  cluster:
    server: https://auth.company.com/authenticate
    certificate-authority: /etc/ssl/certs/auth-ca.crt
contexts:
- context:
    cluster: auth-server
  name: webhook
current-context: webhook
```

**Webhook Request/Response:**
```json
// Request to webhook
{
  "apiVersion": "authentication.k8s.io/v1beta1",
  "kind": "TokenReview",
  "spec": {
    "token": "user-provided-token"
  }
}

// Response from webhook
{
  "apiVersion": "authentication.k8s.io/v1beta1",
  "kind": "TokenReview",
  "status": {
    "authenticated": true,
    "user": {
      "username": "jane.doe",
      "groups": ["developers", "staging-users"]
    }
  }
}
```

## RBAC (Role-Based Access Control) Deep Dive

### RBAC Core Concepts

**RBAC Model:**
```
Subject (User/Group/ServiceAccount) + Role (Permissions) = RoleBinding (Assignment)
```

**Four RBAC Resources:**
- **Role** - Defines permissions within a namespace
- **ClusterRole** - Defines permissions cluster-wide
- **RoleBinding** - Assigns Role to subjects within a namespace
- **ClusterRoleBinding** - Assigns ClusterRole to subjects cluster-wide

### Permissions Model

**Permissions are ADDITIVE** - No "deny" permissions, only "allow"
```yaml
# This means: Can do X OR Y OR Z
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["create", "update"]
```

**Verb Hierarchy:**
- **get** - Read single resource by name
- **list** - Read multiple resources
- **watch** - Watch for changes (real-time updates)
- **create** - Create new resources
- **update** - Modify existing resources (PUT)
- **patch** - Partially modify resources (PATCH)
- **delete** - Delete single resource
- **deletecollection** - Delete multiple resources

### Role Examples

#### Basic Namespace Role
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: production
  name: pod-reader
rules:
# Read pods
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]
# Read pod logs
- apiGroups: [""]
  resources: ["pods/log"]
  verbs: ["get", "list"]
# Can't create, update, or delete pods
```

#### Developer Role (More Permissions)
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: development
  name: developer
rules:
# Full access to most resources in namespace
- apiGroups: [""]
  resources: ["pods", "services", "configmaps", "secrets"]
  verbs: ["*"]  # All verbs
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
# Can't delete namespace or modify resource quotas
- apiGroups: [""]
  resources: ["namespaces", "resourcequotas"]
  verbs: []  # No permissions
```

#### Admin Role with Resource Names
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: production
  name: production-admin
rules:
# Full access to all resources
- apiGroups: ["*"]
  resources: ["*"]
  verbs: ["*"]
# Exception: Can only access specific secrets
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "list"]
  resourceNames: ["app-config", "database-credentials"]  # Only these secrets
```

### ClusterRole Examples

#### Read-Only Cluster Access
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cluster-reader
rules:
# Read all resources in all namespaces
- apiGroups: ["*"]
  resources: ["*"]
  verbs: ["get", "list", "watch"]
# Explicitly deny access to secrets
- apiGroups: [""]
  resources: ["secrets"]
  verbs: []
```

#### Monitoring ClusterRole
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: monitoring
rules:
# Read nodes and their metrics
- apiGroups: [""]
  resources: ["nodes", "nodes/metrics", "nodes/stats"]
  verbs: ["get", "list"]
# Read pods across all namespaces
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]
# Access metrics APIs
- apiGroups: ["metrics.k8s.io"]
  resources: ["nodes", "pods"]
  verbs: ["get", "list"]
```

#### Security Scanning ClusterRole
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: security-scanner
rules:
# Read pod security contexts
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]
# Read network policies
- apiGroups: ["networking.k8s.io"]
  resources: ["networkpolicies"]
  verbs: ["get", "list"]
# Read RBAC configuration
- apiGroups: ["rbac.authorization.k8s.io"]
  resources: ["roles", "rolebindings", "clusterroles", "clusterrolebindings"]
  verbs: ["get", "list"]
# Read pod security policies (if using PSP)
- apiGroups: ["policy"]
  resources: ["podsecuritypolicies"]
  verbs: ["get", "list"]
```

### RoleBinding Examples

#### Simple User Binding
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: developer-binding
  namespace: development
subjects:
# Individual user
- kind: User
  name: jane.doe
  apiGroup: rbac.authorization.k8s.io
# Group of users  
- kind: Group
  name: developers
  apiGroup: rbac.authorization.k8s.io
# Service account
- kind: ServiceAccount
  name: ci-cd-sa
  namespace: development
roleRef:
  kind: Role
  name: developer
  apiGroup: rbac.authorization.k8s.io
```

#### Cross-Namespace Service Account Binding
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: monitoring-access
  namespace: production
subjects:
# Service account from different namespace
- kind: ServiceAccount
  name: prometheus
  namespace: monitoring  # Different namespace!
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

### ClusterRoleBinding Examples

#### Cluster Admin Access
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cluster-admin-binding
subjects:
# Specific admin user
- kind: User
  name: admin@company.com
  apiGroup: rbac.authorization.k8s.io
# Admin group from OIDC
- kind: Group
  name: cluster-admins
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: cluster-admin  # Built-in cluster admin role
  apiGroup: rbac.authorization.k8s.io
```

#### Global Monitoring Access
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: monitoring-binding
subjects:
- kind: ServiceAccount
  name: prometheus
  namespace: monitoring
roleRef:
  kind: ClusterRole
  name: monitoring
  apiGroup: rbac.authorization.k8s.io
```

### Built-in ClusterRoles

**cluster-admin** - Full cluster access (dangerous!)
```bash
kubectl describe clusterrole cluster-admin
# Rules: [*] [*] [*] - Everything!
```

**admin** - Full namespace access
```bash
kubectl describe clusterrole admin
# Can do everything in a namespace except modify resource quotas/namespace itself
```

**edit** - Read/write access to most resources
```bash
kubectl describe clusterrole edit
# Can create/update/delete most resources but not view secrets or modify RBAC
```

**view** - Read-only access
```bash
kubectl describe clusterrole view
# Can read most resources but not secrets
```

### Advanced RBAC Patterns

#### Environment-Based Access Control
```yaml
# Production namespace - restrictive
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: production
  name: production-deployer
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "update", "patch"]  # Can update but not create/delete
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list"]  # Read-only config
---
# Development namespace - permissive
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: development
  name: development-full-access
rules:
- apiGroups: ["*"]
  resources: ["*"]
  verbs: ["*"]  # Full access for experimentation
```

#### Application-Specific Service Accounts
```yaml
# Database service account - only database permissions
apiVersion: v1
kind: ServiceAccount
metadata:
  name: database-sa
  namespace: production
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: production
  name: database-role
rules:
# Can read its own config
- apiGroups: [""]
  resources: ["configmaps", "secrets"]
  verbs: ["get"]
  resourceNames: ["database-config", "database-credentials"]
# Can update its own status
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: database-binding
  namespace: production
subjects:
- kind: ServiceAccount
  name: database-sa
  namespace: production
roleRef:
  kind: Role
  name: database-role
  apiGroup: rbac.authorization.k8s.io
```

#### CI/CD Pipeline Permissions
```yaml
# CI/CD service account with deployment permissions
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ci-cd-deployer
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: ci-cd-deployer
rules:
# Can manage deployments across all namespaces
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list", "create", "update", "patch", "delete"]
# Can read and create services
- apiGroups: [""]
  resources: ["services"]
  verbs: ["get", "list", "create", "update", "patch"]
# Can read but not modify secrets (for pulling images)
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "list"]
# Can create and update configmaps
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list", "create", "update", "patch", "delete"]
# Can read namespaces
- apiGroups: [""]
  resources: ["namespaces"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: ci-cd-deployer-binding
subjects:
- kind: ServiceAccount
  name: ci-cd-deployer
  namespace: kube-system
roleRef:
  kind: ClusterRole
  name: ci-cd-deployer
  apiGroup: rbac.authorization.k8s.io
```

## Pod Security Standards Deep Dive

### What Pod Security Standards Replace

**Old System: Pod Security Policies (PSP)** - Complex, deprecated
**New System: Pod Security Standards** - Three built-in levels with clear definitions

### Security Levels

#### Privileged Level
**What it means:** No restrictions - pods can do anything
```yaml
# Anything goes
securityContext:
  privileged: true
  runAsUser: 0  # root
  allowPrivilegeEscalation: true
  capabilities:
    add: ["SYS_ADMIN", "NET_ADMIN"]
```

#### Baseline Level  
**What it means:** Minimal restrictions - prevents known privilege escalations
```yaml
# Prevents most dangerous configurations
securityContext:
  runAsNonRoot: true  # Required
  # privileged: false  # Default
  # allowPrivilegeEscalation: false  # Default
  seccompProfile:
    type: RuntimeDefault  # Required
```

#### Restricted Level
**What it means:** Heavily restricted - follows security best practices
```yaml
# Very secure configuration
securityContext:
  runAsNonRoot: true
  runAsUser: 1000  # Non-root user ID
  runAsGroup: 3000
  fsGroup: 2000
  allowPrivilegeEscalation: false
  capabilities:
    drop: ["ALL"]  # Drop all capabilities
  seccompProfile:
    type: RuntimeDefault
  seLinuxOptions:
    level: "s0:c123,c456"
```

### Implementing Pod Security Standards

#### Namespace-Level Enforcement
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    # Enforce restricted security standard
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: v1.25
    
    # Warn on baseline violations  
    pod-security.kubernetes.io/warn: baseline
    pod-security.kubernetes.io/warn-version: v1.25
    
    # Audit all security levels
    pod-security.kubernetes.io/audit: baseline
    pod-security.kubernetes.io/audit-version: v1.25
```

#### What Happens with Enforcement
```yaml
# This pod will be REJECTED in namespace with "restricted" enforcement
apiVersion: v1
kind: Pod
metadata:
  name: bad-pod
spec:
  containers:
  - name: app
    image: myapp:latest
    securityContext:
      runAsUser: 0  # ROOT USER - violates restricted standard!
      privileged: true  # PRIVILEGED - violates restricted standard!
```

**API Server Response:**
```
Error creating pod: pods "bad-pod" is forbidden: violates PodSecurity "restricted:v1.25": 
privileged (container "app" must not set securityContext.privileged=true), 
runAsNonRoot != true (pod or container "app" must set securityContext.runAsNonRoot=true)
```

### Security Context Deep Dive

#### Pod-Level Security Context
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-pod
spec:
  securityContext:
    # Run as specific user/group
    runAsUser: 1000      # UID 1000
    runAsGroup: 3000     # GID 3000
    runAsNonRoot: true   # Ensure non-root
    fsGroup: 2000        # Files created belong to group 2000
    
    # Linux security modules
    seLinuxOptions:
      level: "s0:c123,c456"
    seccompProfile:
      type: RuntimeDefault
    
    # Filesystem controls
    fsGroupChangePolicy: "Always"  # Change ownership of mounted volumes
    
  containers:
  - name: app
    image: myapp:latest
    securityContext:
      # Container-specific overrides
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop: ["ALL"]
        add: ["NET_BIND_SERVICE"]  # Only capability needed
```

#### What Each Security Setting Does

**runAsUser/runAsGroup:**
```bash
# Inside container without setting
$ whoami
root
$ id
uid=0(root) gid=0(root) groups=0(root)

# With runAsUser: 1000, runAsGroup: 3000
$ whoami  
app-user
$ id
uid=1000(app-user) gid=3000(app-group) groups=3000(app-group)
```

**readOnlyRootFilesystem:**
```yaml
securityContext:
  readOnlyRootFilesystem: true
# Result: Container can't write to / filesystem
# Need to mount writable volumes for temp files:
volumeMounts:
- name: tmp-volume
  mountPath: /tmp
- name: var-volume
  mountPath: /var
```

**Capabilities:**
```yaml
securityContext:
  capabilities:
    drop: ["ALL"]  # Remove all Linux capabilities
    add: ["NET_BIND_SERVICE"]  # Add back only what's needed

# NET_BIND_SERVICE allows binding to ports < 1024
# Without it, non-root users can't bind to port 80/443
```

#### Complete Secure Pod Example
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ultra-secure-app
  namespace: production
spec:
  securityContext:
    runAsUser: 1000
    runAsGroup: 3000
    runAsNonRoot: true
    fsGroup: 2000
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: app
    image: myapp:latest
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop: ["ALL"]
    ports:
    - containerPort: 8080  # Non-privileged port
    volumeMounts:
    - name: tmp-volume
      mountPath: /tmp
    - name: app-data
      mountPath: /data
    resources:
      requests:
        memory: "128Mi"
        cpu: "100m"
      limits:
        memory: "256Mi"
        cpu: "200m"
  volumes:
  - name: tmp-volume
    emptyDir: {}
  - name: app-data
    persistentVolumeClaim:
      claimName: app-data-pvc
  restartPolicy: Always
  automountServiceAccountToken: false  # Don't mount SA token unless needed
```

## Secrets Management Deep Dive

### What Kubernetes Secrets Actually Are

**Secrets are NOT encrypted in etcd by default** - They're only base64 encoded, which is NOT encryption!

**Secret vs ConfigMap:**
- **ConfigMap** - Non-sensitive configuration data, stored as plain text
- **Secret** - Sensitive data, slightly more secure handling, but still needs encryption at rest

### Secret Types

#### Opaque Secrets (Generic)
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: production
type: Opaque
data:
  # Base64 encoded values
  database-password: cGFzc3dvcmQxMjM=  # "password123"
  api-key: YWJjZGVmZ2hpams=            # "abcdefghijk"
stringData:
  # Plain text values (automatically base64 encoded)
  database-url: "postgresql://user:password@host:5432/db"
  ssl-cert: |
    -----BEGIN CERTIFICATE-----
    MIIDXTCCAkWgAwIBAgIJAKlwmMhJlJb...
    -----END CERTIFICATE-----
```

#### Docker Registry Secrets
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: docker-registry-secret
  namespace: production
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: ewogICJhdXRocyI6IHsKICAgICJyZWdpc3RyeS5jb21wYW55LmNvbSI6IHsKICAgICAgInVzZXJuYW1lIjogImRvY2tlci11c2VyIiwKICAgICAgInBhc3N3b3JkIjogInBhc3N3b3JkMTIzIiwKICAgICAgImF1dGgiOiJaRzlqYTJWeUxYVnpaWEk2Y0dGemMzZHZjbVF4TWpNPSIKICAgIH0KICB9Cn0=
```

**Creating Docker Registry Secret:**
```bash
kubectl create secret docker-registry docker-registry-secret \
  --docker-server=registry.company.com \
  --docker-username=docker-user \
  --docker-password=password123 \
  --docker-email=docker@company.com
```

#### TLS Secrets
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: tls-secret
  namespace: production
type: kubernetes.io/tls
data:
  tls.crt: LS0tLS1CRUdJTi... # Base64 encoded certificate
  tls.key: LS0tLS1CRUdJTi... # Base64 encoded private key
```

**Creating TLS Secret:**
```bash
kubectl create secret tls tls-secret \
  --cert=path/to/cert.pem \
  --key=path/to/key.pem
```

#### Service Account Token Secrets
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: build-robot-secret
  namespace: default
  annotations:
    kubernetes.io/service-account.name: build-robot
type: kubernetes.io/service-account-token
```

### Using Secrets in Pods

#### Environment Variable Injection
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-secrets
spec:
  containers:
  - name: app
    image: myapp:latest
    env:
    # Single secret value
    - name: DATABASE_PASSWORD
      valueFrom:
        secretKeyRef:
          name: app-secrets
          key: database-password
    # All secret values as env vars
    envFrom:
    - secretRef:
        name: app-secrets
    # Result: DATABASE_PASSWORD=password123, API_KEY=abcdefghijk, etc.
```

#### Volume Mounting (More Secure)
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-secret-files
spec:
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: secret-volume
      mountPath: /etc/secrets
      readOnly: true
  volumes:
  - name: secret-volume
    secret:
      secretName: app-secrets
      defaultMode: 0400  # Read-only for owner
      items:
      - key: database-password
        path: db-password
        mode: 0400
      - key: ssl-cert
        path: ssl/cert.pem
        mode: 0444
```

**Result in container:**
```bash
$ ls -la /etc/secrets/
total 8
drwxrwxrwt 3 root root  100 Jan  1 12:00 .
drwxr-xr-x 1 root root 4096 Jan  1 12:00 ..
-r-------- 1 root root   11 Jan  1 12:00 db-password
drwxr-xr-x 2 root root   60 Jan  1 12:00 ssl
-r--r--r-- 1 root root 1234 Jan  1 12:00 ssl/cert.pem

$ cat /etc/secrets/db-password
password123
```

### Secret Security Best Practices

#### Encryption at Rest
```yaml
# /etc/kubernetes/encryption-config.yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
- resources:
  - secrets
  providers:
  - aescbc:
      keys:
      - name: key1
        secret: c2VjcmV0IGlzIHNlY3VyZQ==  # Base64 encoded encryption key
  - identity: {}  # Fallback to unencrypted
```

**API Server Configuration:**
```bash
kube-apiserver \
  --encryption-provider-config=/etc/kubernetes/encryption-config.yaml \
  # ... other flags
```

#### External Secret Management

**Using External Secrets Operator:**
```yaml
# Install external-secrets-operator first
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets-manager
  namespace: production
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-west-2
      auth:
        secretRef:
          accessKeyID:
            name: aws-credentials
            key: access-key-id
          secretAccessKey:
            name: aws-credentials
            key: secret-access-key
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-secret
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: database-credentials
    creationPolicy: Owner
  data:
  - secretKey: password
    remoteRef:
      key: production/database
      property: password
  - secretKey: username
    remoteRef:
      key: production/database
      property: username
```

#### Secret Rotation Example
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: rotate-database-password
  namespace: production
spec:
  schedule: "0 2 * * 0"  # Weekly at 2 AM Sunday
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: secret-rotator
          containers:
          - name: rotator
            image: secret-rotator:latest
            command:
            - sh
            - -c
            - |
              # Generate new password
              NEW_PASSWORD=$(openssl rand -base64 32)
              
              # Update database
              mysql -h database -u root -p${OLD_PASSWORD} -e "ALTER USER 'app'@'%' IDENTIFIED BY '${NEW_PASSWORD}';"
              
              # Update Kubernetes secret
              kubectl patch secret database-credentials -p='{"data":{"password":"'$(echo -n $NEW_PASSWORD | base64)'"}}'
              
              # Restart pods to pick up new secret
              kubectl rollout restart deployment/app
            env:
            - name: OLD_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: database-credentials
                  key: password
          restartPolicy: OnFailure
```

## Admission Controllers Deep Dive

### What Admission Controllers Do

**Admission controllers** are plugins that intercept requests to the Kubernetes API server **after** authentication and authorization, but **before** the object is stored in etcd. They can:

**Validate** - Check if the request meets certain criteria
**Mutate** - Modify the request before storing it
**Reject** - Block dangerous or invalid requests

**Request Flow:**
```
Client → Authentication → Authorization → Admission Controllers → etcd
                                            ↓
                                    [Validation & Mutation]
```

### Built-in Admission Controllers

#### NamespaceLifecycle
**What it does:** Prevents operations on namespaces being deleted, ensures default namespace always exists

```yaml
# This will be REJECTED if namespace is being deleted
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
  namespace: being-deleted-namespace  # ❌ Rejected
```

#### ResourceQuota
**What it does:** Enforces resource quotas in namespaces

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-quota
  namespace: production
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    persistentvolumeclaims: "10"
---
# This pod will be REJECTED if it exceeds quota
apiVersion: v1
kind: Pod
metadata:
  name: resource-heavy-pod
  namespace: production
spec:
  containers:
  - name: app
    image: myapp:latest
    resources:
      requests:
        cpu: "5"      # ❌ Exceeds quota of 4 CPU
        memory: 10Gi  # ❌ Exceeds quota of 8Gi memory
```

#### LimitRanger
**What it does:** Enforces resource limits and provides defaults

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: production-limits
  namespace: production
spec:
  limits:
  # Pod limits
  - type: Pod
    max:
      cpu: "2"
      memory: 4Gi
    min:
      cpu: 100m
      memory: 128Mi
  # Container limits
  - type: Container
    default:
      cpu: 200m      # Default CPU limit
      memory: 256Mi   # Default memory limit
    defaultRequest:
      cpu: 100m      # Default CPU request
      memory: 128Mi   # Default memory request
    max:
      cpu: "1"       # Max CPU per container
      memory: 2Gi     # Max memory per container
    min:
      cpu: 50m       # Min CPU per container
      memory: 64Mi    # Min memory per container
```

#### ServiceAccount
**What it does:** Automatically adds service account to pods without one

```yaml
# Pod without serviceAccountName
apiVersion: v1
kind: Pod
metadata:
  name: my-pod
spec:
  containers:
  - name: app
    image: myapp:latest

# After ServiceAccount admission controller:
# serviceAccountName: default (automatically added)
# automountServiceAccountToken: true (automatically added)
```

#### DefaultStorageClass
**What it does:** Adds default storage class to PVCs without one

```yaml
# PVC without storageClassName
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-pvc
spec:
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 10Gi

# After DefaultStorageClass admission controller:
# storageClassName: gp2 (default storage class automatically added)
```

### ValidatingAdmissionWebhooks

**How Webhook Validation Works:**
1. **API server receives request** → Validates against webhook
2. **Webhook called** → External service validates request
3. **Webhook responds** → Allow or deny with reason
4. **Request processed** → Continues or gets rejected

#### Custom Validation Webhook Example
```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionWebhook
metadata:
  name: security-policy-validator
webhooks:
- name: pod-security.company.com
  clientConfig:
    service:
      name: security-webhook
      namespace: kube-system
      path: /validate-pods
  rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
  admissionReviewVersions: ["v1", "v1beta1"]
  sideEffects: None
  failurePolicy: Fail  # Reject if webhook is unavailable
```

**Webhook Service Implementation:**
```python
# Python webhook example
from flask import Flask, request, jsonify
import base64
import json

app = Flask(__name__)

@app.route('/validate-pods', methods=['POST'])
def validate_pod():
    admission_review = request.get_json()
    
    # Extract pod spec
    pod = admission_review['request']['object']
    
    # Validation logic
    allowed = True
    message = ""
    
    # Check 1: No privileged containers
    for container in pod['spec'].get('containers', []):
        security_context = container.get('securityContext', {})
        if security_context.get('privileged', False):
            allowed = False
            message = f"Container {container['name']} cannot be privileged"
            break
    
    # Check 2: Must have resource limits
    if allowed:
        for container in pod['spec'].get('containers', []):
            resources = container.get('resources', {})
            if 'limits' not in resources:
                allowed = False
                message = f"Container {container['name']} must have resource limits"
                break
    
    # Response
    response = {
        "apiVersion": "admission.k8s.io/v1",
        "kind": "AdmissionReview",
        "response": {
            "uid": admission_review['request']['uid'],
            "allowed": allowed
        }
    }
    
    if not allowed:
        response['response']['status'] = {
            "code": 403,
            "message": message
        }
    
    return jsonify(response)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8443, ssl_context='adhoc')
```

### MutatingAdmissionWebhooks

**How Webhook Mutation Works:**
1. **API server receives request** → Calls mutating webhooks first
2. **Webhook modifies request** → Returns JSON patch with changes  
3. **Request updated** → API server applies the patches
4. **Validation happens** → Then validating webhooks run

#### Sidecar Injection Example (Like Istio)
```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingAdmissionWebhook
metadata:
  name: sidecar-injector
webhooks:
- name: sidecar-injector.company.com
  clientConfig:
    service:
      name: sidecar-injector
      namespace: kube-system
      path: /mutate
  rules:
  - operations: ["CREATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
  admissionReviewVersions: ["v1"]
  sideEffects: None
```

**Mutation Webhook Response:**
```json
{
  "apiVersion": "admission.k8s.io/v1",
  "kind": "AdmissionReview",
  "response": {
    "uid": "request-uid",
    "allowed": true,
    "patchType": "JSONPatch",
    "patch": "W3sib3AiOiJhZGQiLCJwYXRoIjoiL3NwZWMvY29udGFpbmVycyIsInZhbHVlIjpbeyJuYW1lIjoic2lkZWNhciIsImltYWdlIjoicHJveHk6bGF0ZXN0In1dfV0="
  }
}
```

**Decoded patch (base64 decoded):**
```json
[{
  "op": "add",
  "path": "/spec/containers/-",
  "value": {
    "name": "sidecar",
    "image": "proxy:latest",
    "ports": [{"containerPort": 15001}]
  }
}]
```

#### Security Enhancement Webhook
```yaml
# Webhook that automatically adds security contexts
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingAdmissionWebhook
metadata:
  name: security-enhancer
webhooks:
- name: security.company.com
  clientConfig:
    service:
      name: security-webhook
      namespace: kube-system
      path: /mutate-security
  rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
  admissionReviewVersions: ["v1"]
```

**Security Enhancement Logic:**
```python
def enhance_security(pod):
    patches = []
    
    # Add security context if missing
    if 'securityContext' not in pod['spec']:
        patches.append({
            "op": "add",
            "path": "/spec/securityContext",
            "value": {
                "runAsNonRoot": True,
                "runAsUser": 1000,
                "fsGroup": 2000
            }
        })
    
    # Add security context to containers without one
    for i, container in enumerate(pod['spec']['containers']):
        if 'securityContext' not in container:
            patches.append({
                "op": "add",
                "path": f"/spec/containers/{i}/securityContext",
                "value": {
                    "allowPrivilegeEscalation": False,
                    "readOnlyRootFilesystem": True,
                    "capabilities": {"drop": ["ALL"]}
                }
            })
    
    return patches
```

## Key Concepts Summary
- **Authentication** - Proving identity using certificates, tokens, or external providers
- **Authorization (RBAC)** - Defining what authenticated users can do with Roles and RoleBindings
- **Service Accounts** - Kubernetes identities for pods and system components with automatic token mounting
- **Pod Security Standards** - Three levels (Privileged, Baseline, Restricted) replacing Pod Security Policies
- **Security Contexts** - Pod and container-level security settings for users, capabilities, and filesystem access
- **Secrets Management** - Storing sensitive data with base64 encoding, requiring encryption at rest for true security
- **Admission Controllers** - Plugins that validate and mutate requests before storing in etcd
- **Webhooks** - Custom validation and mutation logic for enforcing organizational policies
- **Defense in Depth** - Multiple security layers working together rather than relying on single controls

## Best Practices / Tips

1. **Principle of Least Privilege** - Grant minimum permissions necessary for each user/service
2. **Use Service Accounts** - Create specific service accounts for each application, don't use default
3. **Enable Encryption at Rest** - Encrypt secrets in etcd using EncryptionConfiguration
4. **Implement Pod Security Standards** - Use restricted level for production workloads
5. **Regular RBAC Audits** - Review and remove unnecessary permissions periodically
6. **External Secret Management** - Use HashiCorp Vault, AWS Secrets Manager, or similar for sensitive data
7. **Network Policies** - Implement zero-trust networking with default deny policies
8. **Admission Controllers** - Use ValidatingAdmissionWebhooks to enforce organizational policies
9. **Security Scanning** - Scan container images for vulnerabilities before deployment
10. **Monitor Security Events** - Set up alerting for privilege escalations and suspicious activities

## Common Issues / Troubleshooting

### Problem 1: RBAC Permission Denied
- **Symptom:** "User cannot get/list/create resource X" errors
- **Cause:** Missing RBAC permissions or incorrect role bindings
- **Solution:** Check user's roles and verify required permissions exist

```bash
# Check user's permissions
kubectl auth can-i get pods --as=jane.doe
kubectl auth can-i create deployments --as=jane.doe --namespace=production

# Check role bindings for user
kubectl get rolebindings,clusterrolebindings -o wide | grep jane.doe

# Check what permissions a role has
kubectl describe role developer
kubectl describe clusterrole cluster-admin
```

### Problem 2: Service Account Token Not Working
- **Symptom:** Pods can't access Kubernetes API despite having service account
- **Cause:** Service account token not mounted or RBAC not configured
- **Solution:** Verify token mounting and service account permissions

```bash
# Check if token is mounted
kubectl exec -it pod-name -- ls /var/run/secrets/kubernetes.io/serviceaccount/

# Check service account
kubectl get serviceaccount my-sa -o yaml

# Check service account permissions
kubectl auth can-i get pods --as=system:serviceaccount:namespace:my-sa
```

### Problem 3: Pod Security Standard Violations
- **Symptom:** Pods rejected with security policy violations
- **Cause:** Pod configuration violates namespace security standards
- **Solution:** Adjust pod security context or namespace security level

```bash
# Check namespace security labels
kubectl get namespace production --show-labels

# Test pod against security standard
kubectl --dry-run=server create -f pod.yaml

# Check what's wrong with pod
kubectl describe pod failing-pod
```

### Problem 4: Admission Webhook Failures
- **Symptom:** All pod creation fails with webhook timeout errors
- **Cause:** Admission webhook service unavailable or misconfigured
- **Solution:** Check webhook service status and configuration

```bash
# Check webhook configuration
kubectl get validatingadmissionwebhooks
kubectl get mutatingadmissionwebhooks

# Check webhook service
kubectl get svc -n kube-system webhook-service

# Check webhook pods
kubectl get pods -n kube-system | grep webhook
```

### Problem 5: Secret Not Accessible
- **Symptom:** Pods can't read mounted secrets or environment variables empty
- **Cause:** Secret doesn't exist, wrong namespace, or incorrect mounting
- **Solution:** Verify secret existence and mounting configuration

```bash
# Check if secret exists
kubectl get secret my-secret -o yaml

# Check secret content (base64 encoded)
kubectl get secret my-secret -o jsonpath='{.data}'

# Check pod's volume mounts
kubectl describe pod my-pod

# Test secret access inside pod
kubectl exec -it my-pod -- ls -la /etc/secrets/
```

## References / Further Reading
- [Kubernetes Security Documentation](https://kubernetes.io/docs/concepts/security/)
- [RBAC Authorization Guide](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [Admission Controllers Guide](https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/)
- [Secrets Management](https://kubernetes.io/docs/concepts/configuration/secret/)
- [Kubernetes Security Best Practices](https://kubernetes.io/docs/concepts/security/security-checklist/)
- [External Secrets Operator](https://external-secrets.io/)
- [OPA Gatekeeper](https://open-policy-agent.github.io/gatekeeper/)
- [Falco Runtime Security](https://falco.org/)