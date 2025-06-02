# kubectl Commands - Comprehensive Study Guide

## WHY kubectl Matters (Conceptual Foundation)

### The Control Plane Interface
kubectl is your **primary interface** to the Kubernetes API server. Understanding this conceptually is crucial:

- **kubectl is NOT Kubernetes** - it's a client that sends HTTP requests to the API server
- **Everything is an API call** - every kubectl command translates to REST API calls
- **Declarative vs Imperative** - kubectl supports both paradigms, critical for exam efficiency
- **State reconciliation** - kubectl commands trigger the control plane's reconciliation loops

### Exam Context: Why kubectl Mastery is Critical
- **60% of exam tasks** require kubectl proficiency
- **Time pressure** - knowing the right flags saves precious minutes
- **No autocomplete** - you must memorize syntax
- **Debugging skills** - kubectl is your primary troubleshooting tool

---

## Core Architectural Understanding

### How kubectl Works
```bash
kubectl get pods
# Translates to: GET /api/v1/namespaces/default/pods
# Flow: kubectl → kube-apiserver → etcd → response back
```

**Key Concept**: kubectl doesn't "do" anything - it's a sophisticated HTTP client that formats API requests.

### Command Structure Pattern
```bash
kubectl [COMMAND] [TYPE] [NAME] [FLAGS]
#       ↓       ↓     ↓      ↓
#    action  resource name  options
```

---

## Essential Command Categories

### 1. Resource Management (CRUD Operations)

#### Creating Resources
```bash
# Imperative creation (exam-friendly for speed)
kubectl create deployment nginx --image=nginx
kubectl create service clusterip my-svc --tcp=80:80
kubectl create configmap app-config --from-literal=key1=value1

# Declarative creation (production-friendly)
kubectl apply -f deployment.yaml
kubectl apply -f . # Apply all YAML files in directory
kubectl apply -k . # Kustomize application
```

**Gotcha**: `create` fails if resource exists, `apply` updates it. Use `apply` for idempotency.

#### Reading Resources
```bash
# Basic listing
kubectl get pods
kubectl get pods -o wide # More details
kubectl get pods -o yaml # Full YAML output
kubectl get pods -o json | jq '.items[0].metadata.name' # JSON with parsing

# Filtering and selection
kubectl get pods --selector=app=nginx
kubectl get pods -l app=nginx,version=v1
kubectl get pods --field-selector=status.phase=Running
kubectl get pods --show-labels

# Cross-namespace operations
kubectl get pods --all-namespaces
kubectl get pods -A # Shorthand for all namespaces
```

**Pro Tip**: Learn output formats (-o): `wide`, `yaml`, `json`, `jsonpath`, `custom-columns`

#### Updating Resources
```bash
# Direct edits (opens default editor)
kubectl edit deployment nginx

# Patch operations
kubectl patch deployment nginx -p '{"spec":{"replicas":3}}'
kubectl patch pod nginx --type='json' -p='[{"op": "replace", "path": "/spec/containers/0/image", "value":"nginx:1.20"}]'

# Scaling
kubectl scale deployment nginx --replicas=5
kubectl scale --replicas=3 -f deployment.yaml
```

#### Deleting Resources
```bash
# Single resource
kubectl delete pod nginx
kubectl delete deployment nginx --cascade=foreground # Wait for dependent resources

# Multiple resources
kubectl delete pods,services -l app=nginx
kubectl delete -f deployment.yaml
kubectl delete all -l app=nginx # Deletes most resource types

# Force deletion (use carefully)
kubectl delete pod nginx --force --grace-period=0
```

**Gotcha**: `--cascade=orphan` leaves dependent resources running (useful for Pod disruption testing).

### 2. Inspection and Debugging

#### Detailed Resource Information
```bash
# Describe (human-readable, includes events)
kubectl describe pod nginx
kubectl describe node worker-1

# Logs
kubectl logs nginx
kubectl logs nginx -c container-name # Multi-container pods
kubectl logs nginx --previous # Previous container instance
kubectl logs -f nginx # Follow logs real-time
kubectl logs nginx --since=1h # Time-based filtering
```

#### Interactive Debugging
```bash
# Execute commands in pods
kubectl exec nginx -- ls /usr/share/nginx/html
kubectl exec -it nginx -- /bin/bash

# Port forwarding for local access
kubectl port-forward pod/nginx 8080:80
kubectl port-forward service/nginx 8080:80

# File operations
kubectl cp nginx:/etc/nginx/nginx.conf ./nginx.conf
kubectl cp ./app.jar nginx:/app/
```

### 3. Cluster Information and Context

#### Context Management
```bash
# View contexts
kubectl config get-contexts
kubectl config current-context

# Switch contexts
kubectl config use-context production-cluster

# Namespace operations
kubectl config set-context --current --namespace=kube-system
kubectl get pods # Now defaults to kube-system namespace
```

#### Cluster inspection
```bash
# Cluster information
kubectl cluster-info
kubectl cluster-info dump # Comprehensive cluster state

# API resources
kubectl api-resources # List all available resource types
kubectl api-versions # List API versions
kubectl explain pod.spec.containers # API documentation
```

---

## Advanced kubectl Patterns

### 1. JSONPath and Custom Columns
```bash
# Extract specific fields
kubectl get pods -o jsonpath='{.items[*].metadata.name}'
kubectl get pods -o jsonpath='{.items[*].status.podIP}'

# Custom columns (table format)
kubectl get pods -o custom-columns=NAME:.metadata.name,STATUS:.status.phase,IP:.status.podIP

# Sorting
kubectl get pods --sort-by=.metadata.creationTimestamp
kubectl get pods --sort-by=.status.startTime
```

### 2. Resource Generators (Exam Gold)
```bash
# Generate YAML without creating
kubectl create deployment nginx --image=nginx --dry-run=client -o yaml > deployment.yaml

# Create and save simultaneously
kubectl create service clusterip my-svc --tcp=80:80 --dry-run=client -o yaml | kubectl apply -f -

# Complex resource generation
kubectl create cronjob hello --image=busybox --schedule="*/1 * * * *" -- echo hello
```

### 3. Bulk Operations
```bash
# Apply labels to multiple resources
kubectl label pods -l app=nginx version=v1

# Remove labels
kubectl label pods nginx version-

# Annotations
kubectl annotate pods nginx description="Web server pod"
```

---

## Critical Exam Strategies

### 1. Time-Saving Aliases and Shortcuts
```bash
# Essential aliases to memorize
alias k=kubectl
alias kaf='kubectl apply -f'
alias kdel='kubectl delete'
alias kdes='kubectl describe'
alias kex='kubectl exec -it'
alias klog='kubectl logs'

# Use -o yaml --dry-run=client religiously
k create deploy nginx --image=nginx -o yaml --dry-run=client
```

### 2. Imperative vs Declarative Decision Matrix

**Use Imperative when**:
- Creating simple resources quickly
- Generating YAML templates
- One-off debugging tasks
- Time pressure in exam

**Use Declarative when**:
- Complex multi-resource applications
- Need version control
- Production environments
- Updating existing resources

### 3. Common Exam Gotchas

#### Namespace Awareness
```bash
# Always specify namespace or set context
kubectl get pods -n kube-system
kubectl config set-context --current --namespace=target-ns
```

#### Resource Naming Conventions
```bash
# Use consistent, predictable naming
kubectl create deployment web-app --image=nginx
kubectl expose deployment web-app --port=80 --target-port=8080
```

#### Validation and Testing
```bash
# Always validate your work
kubectl get all -l app=your-app
kubectl describe pod pod-name # Check events section
kubectl logs pod-name # Verify application startup
```

---

## Troubleshooting Patterns

### 1. Pod Issues
```bash
# Pod won't start
kubectl describe pod problem-pod # Check events
kubectl logs problem-pod --previous # Previous instance logs

# Resource constraints
kubectl top pods # Requires metrics-server
kubectl describe node # Check allocatable resources
```

### 2. Service Discovery
```bash
# Test service connectivity
kubectl run test-pod --image=busybox -it --rm -- nslookup service-name
kubectl run test-pod --image=nginx:alpine -it --rm -- wget -qO- service-name
```

### 3. Network Debugging
```bash
# Pod-to-pod communication
kubectl exec pod1 -- ping pod2-ip
kubectl exec pod1 -- nc -zv service-name port

# DNS resolution
kubectl exec pod1 -- nslookup kubernetes.default.svc.cluster.local
```

---

## Performance and Efficiency

### 1. Resource Queries
```bash
# Efficient filtering
kubectl get pods --field-selector=status.phase!=Running
kubectl get events --sort-by='.lastTimestamp'

# Resource usage
kubectl top pods --sort-by=cpu
kubectl top pods --sort-by=memory
```

### 2. Batch Operations
```bash
# Process multiple files
kubectl apply -f ./manifests/
kubectl delete -f ./manifests/ --ignore-not-found=true

# Label-based operations
kubectl delete pods -l app=old-version
kubectl rollout restart deployment -l tier=frontend
```

---

## Security Considerations

### 1. RBAC Awareness
```bash
# Check permissions
kubectl auth can-i create pods
kubectl auth can-i create pods --as=system:serviceaccount:default:my-sa

# Impersonation for testing
kubectl get pods --as=user1
kubectl get pods --as=system:serviceaccount:namespace:sa-name
```

### 2. Secure Practices
```bash
# Use specific namespaces
kubectl apply -f deployment.yaml -n production

# Avoid --force unless necessary
kubectl delete pod stuck-pod --force --grace-period=0 # Last resort only
```

---

## Conceptual Mastery Checklist

✅ **Understand kubectl as an API client, not the cluster itself**
✅ **Know when to use imperative vs declarative approaches**
✅ **Master resource lifecycle: create → apply → patch → delete**
✅ **Internalize JSONPath for complex data extraction**
✅ **Practice troubleshooting workflows with describe/logs/exec**
✅ **Memorize time-saving flags and output formats**
✅ **Understand kubectl's role in the broader Kubernetes ecosystem**

---

*This depth of kubectl mastery provides the foundation for all other Kubernetes operations. Every advanced topic builds upon these fundamental command patterns.*