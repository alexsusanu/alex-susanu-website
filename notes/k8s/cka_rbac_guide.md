# CKA Study Guide: RBAC (Role-Based Access Control)

## **The Fundamental Problem RBAC Solves**

Kubernetes is essentially a distributed state management system where the API server is the single source of truth. Every action in Kubernetes is an API call - whether you're creating a pod, checking logs, or scaling a deployment. Without access control, this creates massive security and operational risks.

### Why Traditional File Permissions Don't Work Here

In a traditional Unix system, you protect files with owner/group/other permissions. But Kubernetes resources aren't files - they're dynamic objects with complex relationships. A single "create pod" operation might need permissions to:
- Read the namespace to validate it exists
- Check resource quotas and limits
- Validate the ServiceAccount exists
- Pull secrets for image registry authentication
- Update the scheduler's view of resource allocation

RBAC provides a way to model these complex permission requirements in a declarative, auditable way.

### Why RBAC is Critical in Production
- **Zero-trust security model**: Every request must be authenticated and authorized
- **Regulatory compliance**: Required for SOX, HIPAA, PCI-DSS, and other standards
- **Incident prevention**: Prevents accidental deletion of critical resources
- **Multi-tenant isolation**: Enables safe resource sharing between teams/applications
- **Audit trails**: Provides clear accountability for who did what

---

## **Understanding the RBAC Mental Model**

### The Core Question: Who Can Do What Where?

Every API request to Kubernetes gets evaluated through this lens:
- **Who** is making the request? (Authentication - users, groups, service accounts)
- **What** are they trying to do? (Verbs - get, create, update, delete, etc.)
- **Where** are they trying to do it? (Resources and namespaces)

### The Four Building Blocks

1. **Subjects** (WHO) - Users, Groups, ServiceAccounts
2. **Resources** (WHAT) - Pods, Services, Deployments, etc.
3. **Verbs** (ACTIONS) - get, list, create, update, delete, etc.
4. **Bindings** (CONNECTIONS) - Connect subjects to permissions

### Why Four Separate Object Types?

**Roles vs ClusterRoles**: This separation exists because Kubernetes has two scopes of resources:
- **Namespaced resources** (pods, services, deployments) - contained within a namespace
- **Cluster-scoped resources** (nodes, persistent volumes, namespaces themselves) - exist at cluster level

You can't grant namespace-level permissions to cluster-scoped resources - it doesn't make conceptual sense. You can't say "give this user access to nodes in the 'production' namespace" because nodes aren't in any namespace.

**Roles/ClusterRoles vs RoleBindings/ClusterRoleBindings**: This separation follows the principle of separation of concerns:
- **Roles define capabilities** - "what actions are possible"
- **Bindings define assignments** - "who gets these capabilities"

This lets you create reusable permission templates (roles) and assign them flexibly without duplication.

### The RBAC API Objects

| Object | Scope | Purpose |
|--------|-------|---------|
| `Role` | Namespace | Defines permissions within a namespace |
| `ClusterRole` | Cluster-wide | Defines permissions across entire cluster |
| `RoleBinding` | Namespace | Binds Role to subjects in a namespace |
| `ClusterRoleBinding` | Cluster-wide | Binds ClusterRole to subjects cluster-wide |

### The Binding Matrix Logic

| Role Type | Binding Type | Result |
|-----------|--------------|---------|
| Role | RoleBinding | Namespace-scoped permissions in binding's namespace |
| ClusterRole | RoleBinding | Namespace-scoped permissions (subset of ClusterRole) in binding's namespace |
| ClusterRole | ClusterRoleBinding | Cluster-wide permissions |
| Role | ClusterRoleBinding | **Invalid** - Cannot bind namespace role cluster-wide |

The second row is crucial and often misunderstood: You can use a ClusterRole in a RoleBinding to grant only namespace-scoped permissions. This is powerful for creating reusable permission templates.

---

## **Deep Dive: How API Server Evaluates Permissions**

### The Request Flow
1. **Authentication**: Who are you? (certificates, tokens, etc.)
2. **Authorization**: What can you do? (RBAC evaluation happens here)
3. **Admission Control**: Should this specific request be allowed? (resource quotas, security policies)

### RBAC Evaluation Algorithm
When you make a request, the API server:

1. **Identifies all roles bound to your identity** (direct user bindings + group memberships + ServiceAccount bindings)
2. **Collects all rules from those roles**
3. **Checks if ANY rule permits the requested action** (permissive union - if any rule allows it, it's allowed)
4. **No explicit deny** - RBAC is "default deny" but only has allow rules

This means:
- You need at least one allow rule for the action
- There's no way to explicitly deny something (you remove permissions, not add denies)
- More roles = more permissions (they're additive)

### Why This Design Matters

**Composability**: You can layer roles to build complex permissions incrementally. A user might have:
- Base "developer" role (basic pod/service access)
- Team-specific role (access to team's secrets)
- Project-specific role (deployment permissions for specific apps)

**Auditability**: Every permission is explicitly granted through a traceable binding. No hidden inheritance or implicit permissions.

**Scalability**: Roles can be reused across many bindings without duplication.

---

## **Understanding API Groups and Resources**

### Why API Groups Exist

Kubernetes started with a monolithic API, but as it grew, they needed to:
- Version APIs independently
- Allow extension without breaking core APIs
- Organize related resources logically

The core group (empty string `""`) contains fundamental resources that were in the original API. Everything else got organized into logical groups:
- `apps`: Deployments, DaemonSets, StatefulSets
- `batch`: Jobs, CronJobs
- `networking.k8s.io`: NetworkPolicies, Ingress
- `rbac.authorization.k8s.io`: RBAC resources themselves

### Resource Hierarchy and Subresources

Some resources have subresources that require separate permissions:
- `pods/log` - reading pod logs
- `pods/exec` - executing commands in pods
- `pods/portforward` - port forwarding to pods
- `deployments/scale` - scaling deployments

**Why separate permissions?** Because these are different levels of access:
- Reading pod specs vs reading application logs (potentially sensitive data)
- Creating pods vs executing arbitrary commands inside them (massive privilege escalation)

This granular control lets you give developers access to view logs without giving them shell access.

---

## **Practical Examples and Patterns**

### Example 1: Developer Access to Development Namespace

**Scenario**: Give developer "john" read/write access to pods and services in "dev" namespace.

```yaml
# 1. Create the Role
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: dev
  name: developer-role
rules:
- apiGroups: [""]  # Core API group
  resources: ["pods", "services"]
  verbs: ["get", "list", "create", "update", "patch", "delete"]
- apiGroups: [""]
  resources: ["pods/log", "pods/exec"]  # Access logs and exec
  verbs: ["get", "create"]

---
# 2. Create the RoleBinding
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: developer-binding
  namespace: dev
subjects:
- kind: User
  name: john
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: developer-role
  apiGroup: rbac.authorization.k8s.io
```

**Key Points:**
- `apiGroups: [""]` refers to the core API group (pods, services, etc.)
- `pods/log` and `pods/exec` are subresources that need explicit permission
- Role is namespace-scoped, so it only works in "dev" namespace

### Example 2: Read-Only Cluster Viewer

**Scenario**: Create a cluster-wide read-only role for monitoring tools.

```yaml
# ClusterRole for read-only access
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cluster-reader
rules:
- apiGroups: [""]
  resources: ["*"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps", "extensions"]
  resources: ["*"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["batch"]
  resources: ["*"]
  verbs: ["get", "list", "watch"]

---
# Bind to a ServiceAccount for monitoring
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: monitoring-reader-binding
subjects:
- kind: ServiceAccount
  name: monitoring-sa
  namespace: monitoring
roleRef:
  kind: ClusterRole
  name: cluster-reader
  apiGroup: rbac.authorization.k8s.io
```

---

## **ServiceAccounts: The Identity Crisis Solution**

### Why ServiceAccounts Exist

Applications running in pods need to talk to the Kubernetes API (for service discovery, configuration updates, etc.), but they can't use human user accounts. ServiceAccounts solve this by providing:
- **Pod-scoped identity**: Each pod runs as a specific ServiceAccount
- **Automatic token management**: Kubernetes handles token lifecycle
- **Namespace isolation**: ServiceAccounts are namespaced, containing blast radius

### The Token Mechanism

Every ServiceAccount gets a JWT token that contains:
- Identity information (namespace, ServiceAccount name)
- Expiration time
- Cryptographic signature (verified by API server)

The token is automatically mounted at `/var/run/secrets/kubernetes.io/serviceaccount/token` unless explicitly disabled.

### Example 3: ServiceAccount for Application Pods

**Scenario**: Application needs to list pods in its own namespace.

```yaml
# 1. Create ServiceAccount
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-service-account
  namespace: production

---
# 2. Create Role
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: production
  name: pod-reader
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]

---
# 3. Bind ServiceAccount to Role
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: app-pod-reader-binding
  namespace: production
subjects:
- kind: ServiceAccount
  name: app-service-account
  namespace: production
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io

---
# 4. Use ServiceAccount in Pod
apiVersion: v1
kind: Pod
metadata:
  name: my-app
  namespace: production
spec:
  serviceAccountName: app-service-account
  containers:
  - name: app
    image: my-app:latest
```

**Why ServiceAccounts Matter:**
- Pods run with a ServiceAccount identity (default: "default" SA)
- Applications use ServiceAccount tokens to authenticate with API server
- More secure than using user credentials in applications

### Default ServiceAccount Behavior

Every namespace gets a "default" ServiceAccount with minimal permissions. This exists because:
- Pods must run as some identity (no anonymous pods)
- Zero-config should work for basic scenarios
- Security by default (minimal permissions)

But in production, you should create specific ServiceAccounts because:
- Principle of least privilege
- Auditability (know which app did what)
- Credential rotation and management

---

## **Advanced RBAC Patterns**

### Resource-Specific Permissions

```yaml
# Allow access to specific resources by name
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: production
  name: specific-resource-access
rules:
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames: ["app-config", "db-credentials"]  # Only these secrets
  verbs: ["get"]
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list"]  # All configmaps in namespace
```

**Why Resource-Specific Permissions Matter**: You can limit access to specific named resources, not just resource types. This enables:
- **Sensitive secret access**: Only specific secrets, not all secrets
- **Application-specific configs**: Only configs for your app
- **Shared resource management**: Multiple teams sharing a namespace safely

### Aggregated ClusterRoles

```yaml
# Base ClusterRole with aggregation labels
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: admin-base
  labels:
    rbac.example.com/aggregate-to-admin: "true"
aggregationRule:
  clusterRoleSelectors:
  - matchLabels:
      rbac.example.com/aggregate-to-admin: "true"
rules: []  # Rules are automatically aggregated

---
# Additional permissions that get automatically included
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: custom-resources-admin
  labels:
    rbac.example.com/aggregate-to-admin: "true"
rules:
- apiGroups: ["custom.example.com"]
  resources: ["customresources"]
  verbs: ["*"]
```

**Why Aggregated ClusterRoles Exist**: This pattern solves the "extensibility problem." As Kubernetes evolves and you add custom resources, you want to extend existing roles without modifying them directly.

**The Problem**: You have a "developer" ClusterRole, and you add a custom resource. You want developers to access it, but you don't want to edit the original role definition (might be managed by a different team/tool).

**The Solution**: Aggregation rules that automatically collect permissions from multiple ClusterRoles based on labels.

### Cross-Namespace Access Pattern

```yaml
# ClusterRole that can access specific namespaces
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: multi-namespace-reader
rules:
- apiGroups: [""]
  resources: ["pods", "services"]
  verbs: ["get", "list"]

---
# Bind to specific namespaces via multiple RoleBindings
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: cross-ns-binding-dev
  namespace: dev
subjects:
- kind: User
  name: platform-team
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole  # Note: ClusterRole, not Role
  name: multi-namespace-reader
  apiGroup: rbac.authorization.k8s.io

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: cross-ns-binding-staging
  namespace: staging
subjects:
- kind: User
  name: platform-team
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: multi-namespace-reader
  apiGroup: rbac.authorization.k8s.io
```

**Why This Pattern**: ClusterRole + multiple RoleBindings gives you multi-namespace access but not cluster-wide access.

**Real Scenario**: A monitoring system needs to read pods in "production" and "staging" namespaces, but not "development" or "admin" namespaces. A ClusterRoleBinding would give access to ALL namespaces.

---

## **Essential kubectl Commands**

### Checking Permissions
```bash
# Check if current user can perform an action
kubectl auth can-i create pods
kubectl auth can-i create pods --namespace=dev
kubectl auth can-i create pods --as=john
kubectl auth can-i create pods --as=system:serviceaccount:dev:my-sa

# Check all permissions for a user
kubectl auth can-i --list
kubectl auth can-i --list --as=john
kubectl auth can-i --list --as=system:serviceaccount:dev:my-sa --namespace=dev

# Describe current context and user
kubectl config current-context
kubectl config view --minify
```

### Managing RBAC Resources
```bash
# Create resources
kubectl create role developer --verb=get,list,create --resource=pods,services
kubectl create rolebinding dev-binding --role=developer --user=john
kubectl create clusterrole cluster-admin --verb=* --resource=*
kubectl create clusterrolebinding admin-binding --clusterrole=cluster-admin --user=admin

# Get RBAC resources
kubectl get roles,rolebindings
kubectl get clusterroles,clusterrolebindings
kubectl describe role developer
kubectl describe rolebinding dev-binding

# Debug RBAC issues
kubectl get events --sort-by=.metadata.creationTimestamp
kubectl logs -n kube-system kube-apiserver-master-node
```

---

## **Common Gotchas and Troubleshooting**

### 1. Case Sensitivity Issues
```yaml
# WRONG - case matters!
subjects:
- kind: user  # Should be "User"
  name: John   # Should match exact username "john"

# CORRECT
subjects:
- kind: User
  name: john
```

**Why This Happens**: Kubernetes is strict about API object schemas. The `kind` field must match exact values, and usernames are case-sensitive because they often come from external identity systems.

### 2. API Group Confusion
```yaml
# WRONG - missing apiGroup for core resources
rules:
- apiGroups: ["apps"]  # Wrong group for pods
  resources: ["pods"]
  verbs: ["get"]

# CORRECT - core resources use empty string
rules:
- apiGroups: [""]  # Core API group
  resources: ["pods"]
  verbs: ["get"]
- apiGroups: ["apps"]  # Apps group for deployments
  resources: ["deployments"]
  verbs: ["get"]
```

**The Historical Reason**: The core API group predates the concept of API groups. When groups were introduced, they kept the core resources in an "empty" group for backward compatibility.

### 3. Namespace Scope Confusion
```yaml
# WRONG - Role in wrong namespace
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: default  # Role is here
  name: dev-role
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  namespace: dev  # But binding is here - won't work!
  name: dev-binding
```

**Why This Fails**: A RoleBinding can only reference a Role in the same namespace. The binding looks for "dev-role" in the "dev" namespace, but the role is in "default".

### 4. ServiceAccount Token Issues
```bash
# Check if SA token is mounted correctly
kubectl exec -it pod-name -- ls /var/run/secrets/kubernetes.io/serviceaccount/
# Should see: ca.crt, namespace, token

# Check token permissions
kubectl exec -it pod-name -- cat /var/run/secrets/kubernetes.io/serviceaccount/token
# Then decode the JWT to see claims
```

**Common Token Problems**:
- Token not mounted (automountServiceAccountToken: false)
- Wrong ServiceAccount referenced in pod spec
- ServiceAccount doesn't exist
- Token expired (shouldn't happen with auto-rotation)

### 5. Subresource Permissions
```yaml
# WRONG - Missing subresource permissions
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "create"]  # Can't exec or get logs!

# CORRECT - Include subresources
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "create"]
- apiGroups: [""]
  resources: ["pods/exec", "pods/log", "pods/portforward"]
  verbs: ["get", "create"]
```

**Why Subresources Are Separate**: These operations access different types of data and have different security implications. Reading pod metadata is different from reading application logs or executing commands.

---

## **Real-World Troubleshooting Scenarios**

### Scenario 1: "Forbidden" Errors
**Problem**: User gets "forbidden" when trying to access resources

**Debugging Steps:**
```bash
# 1. Check current user context
kubectl config current-context
kubectl config view --minify

# 2. Test permissions
kubectl auth can-i get pods
kubectl auth can-i get pods --namespace=target-namespace

# 3. Check existing bindings
kubectl get rolebindings,clusterrolebindings -o wide | grep username
kubectl describe rolebinding binding-name

# 4. Look for typos in subjects
kubectl get rolebinding binding-name -o yaml
```

**Common Causes:**
- Typo in username/serviceaccount name
- Wrong namespace for RoleBinding
- Missing apiGroup specification
- Case sensitivity issues

### Scenario 2: ServiceAccount Permissions Not Working
**Problem**: Pod with custom ServiceAccount can't access API

**Debugging Steps:**
```bash
# 1. Check if SA exists
kubectl get serviceaccount sa-name -n namespace

# 2. Check if SA is bound to any roles
kubectl get rolebindings,clusterrolebindings -o wide | grep sa-name

# 3. Check if pod is using correct SA
kubectl describe pod pod-name | grep "Service Account"

# 4. Check token mount
kubectl exec pod-name -- ls /var/run/secrets/kubernetes.io/serviceaccount/
```

**Root Cause Analysis**: The most common issue is the pod not actually using the intended ServiceAccount. Check the pod spec and compare with what's running.

---

## **Security Implications and Design Decisions**

### Why Default Deny is Safer

RBAC uses "default deny" - if no rule explicitly allows something, it's forbidden. This is safer than "default allow" because:
- New features are secure by default
- Misconfiguration fails safely
- Explicit permissions are easier to audit
- Compliance requirements often mandate this approach

### The ServiceAccount Auto-Mount Decision

By default, ServiceAccount tokens are automatically mounted in pods. This is convenient but potentially risky because:
- **Attack surface**: Compromised pod can use token to access API
- **Lateral movement**: Token permissions might allow broader access
- **Data exfiltration**: Could read secrets or other sensitive data

Best practice: Disable auto-mount by default, enable only where needed.

```yaml
# Disable auto-mount by default
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-specific-sa
  namespace: production
automountServiceAccountToken: false

---
# Enable only when needed in pod spec
apiVersion: v1
kind: Pod
spec:
  serviceAccountName: app-specific-sa
  automountServiceAccountToken: true  # Explicit enable
```

### Why No Explicit Deny Rules

Other systems (AWS IAM, for example) have both allow and deny rules. Kubernetes RBAC only has allow rules because:
- **Simpler mental model**: Fewer edge cases and conflicts
- **Composability**: Multiple roles always add permissions, never subtract
- **Predictability**: Easy to reason about what permissions someone has

If you need to "remove" permissions, you modify or remove the role/binding that granted them.

---

## **Common Anti-Patterns and Why They're Problematic**

### Using cluster-admin for Everything

**Why it's tempting**: Works immediately, no permission debugging
**Why it's dangerous**: 
- Single compromise = cluster compromise
- No audit trail of actual permissions needed
- Violates principle of least privilege
- Makes compliance audits fail

### Overly Broad Wildcards

```yaml
# Dangerous: allows any action on any resource
rules:
- apiGroups: ["*"]
  resources: ["*"]
  verbs: ["*"]
```

**Why it's problematic**:
- Future resources automatically included
- No granular audit trail
- Can't revoke specific permissions
- Makes security review impossible

### Sharing ServiceAccounts Across Applications

**Why it seems efficient**: Fewer ServiceAccounts to manage
**Why it's risky**:
- Blast radius expansion (one app compromise affects others)
- Cannot revoke access for single app
- Audit trails are unclear
- Violates security isolation principles

---

## **Security Best Practices**

### 1. Principle of Least Privilege
- Start with minimal permissions and add as needed
- Use specific resource names when possible
- Avoid wildcard permissions (`*`) in production
- Regular audit of permissions

### 2. ServiceAccount Hygiene
- Don't use default ServiceAccount for applications
- Disable auto-mount unless needed
- One ServiceAccount per application/component
- Regular token rotation (handled automatically by Kubernetes)

### 3. Namespace Isolation
- Use RBAC alongside NetworkPolicies for defense in depth
- Separate sensitive workloads into dedicated namespaces
- Limit cross-namespace access patterns

### 4. Regular Auditing
```bash
# Find overprivileged bindings
kubectl get clusterrolebindings -o json | jq '.items[] | select(.roleRef.name=="cluster-admin")'

# Check for wildcards
kubectl get roles,clusterroles -o json | jq '.items[].rules[] | select(.resources[]=="*" or .verbs[]=="*")'

# Unused ServiceAccounts
kubectl get serviceaccounts --all-namespaces
kubectl get pods --all-namespaces -o jsonpath='{range .items[*]}{.metadata.namespace}{"\t"}{.spec.serviceAccountName}{"\n"}{end}' | sort | uniq
```

---

## **Exam Tips for CKA**

### Command-Line Efficiency
```bash
# Quick role creation
kubectl create role NAME --verb=VERB --resource=RESOURCE --dry-run=client -o yaml > role.yaml

# Quick binding creation  
kubectl create rolebinding NAME --role=ROLE --user=USER --dry-run=client -o yaml > binding.yaml

# Fast permission checking
alias kauth='kubectl auth can-i'
kauth get pods --as=user
```

### Common Exam Scenarios
1. **Create RBAC for user access** - Practice Role + RoleBinding patterns
2. **ServiceAccount setup** - Know the full workflow: SA → Role → Binding → Pod
3. **Permission troubleshooting** - Master `kubectl auth can-i` and describe commands
4. **Cross-namespace access** - ClusterRole with multiple namespace RoleBindings

### Time-Saving Tips
- Use `--dry-run=client -o yaml` to generate templates quickly
- Know the short forms: `kubectl get roles,rolebindings` 
- Practice typing roleRef and subjects sections from memory
- Remember that ClusterRole can be used in RoleBinding for namespace-scoped permissions