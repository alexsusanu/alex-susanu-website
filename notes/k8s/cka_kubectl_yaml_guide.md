# CKA Guide: kubectl Commands & YAML Manifests - Practical Skills Mastery

## Fundamental Conceptual Understanding

### The kubectl Philosophy

**kubectl as the Universal API Client:**
```
Traditional Infrastructure Management:
├── Multiple specialized tools (AWS CLI, gcloud, Azure CLI, etc.)
├── Vendor-specific commands and syntax
├── Different authentication mechanisms
├── Inconsistent output formats
└── Tool sprawl and cognitive overhead

kubectl Universal Interface:
├── Single tool for all Kubernetes operations
├── Consistent command structure and patterns
├── Unified authentication and authorization
├── Standardized output formats (YAML, JSON, custom)
├── Extensible through plugins and custom resources
└── Infrastructure-agnostic abstraction layer
```

**The Declarative vs Imperative Paradigm:**
```
Imperative Commands (How to do it):
├── kubectl create deployment webapp --image=nginx
├── kubectl scale deployment webapp --replicas=3
├── kubectl expose deployment webapp --port=80
├── Direct manipulation of resources
└── Good for: Quick operations, debugging, experimentation

Declarative Manifests (What you want):
├── Define desired state in YAML files
├── Apply configurations idempotently
├── Version control and GitOps workflows
├── Reproducible infrastructure
└── Good for: Production systems, automation, compliance

Hybrid Approach:
├── Use imperative commands for rapid prototyping
├── Generate YAML templates with --dry-run=client -o yaml
├── Convert to declarative manifests for production
└── Maintain both skills for exam and real-world scenarios
```

### Command Structure and Patterns

**kubectl Command Anatomy:**
```
kubectl [command] [TYPE] [NAME] [flags]
   │        │       │      │       │
   │        │       │      │       └── Modifiers (--dry-run, -o yaml, etc.)
   │        │       │      └────────── Resource name (optional)
   │        │       └───────────────── Resource type (pod, service, etc.)
   │        └───────────────────────── Action (get, create, apply, etc.)
   └────────────────────────────────── Kubernetes CLI tool

Examples:
kubectl get pods webapp-123 --namespace=production -o yaml
kubectl create deployment webapp --image=nginx --replicas=3
kubectl apply -f webapp-deployment.yaml --validate=true
kubectl delete pod webapp-123 --grace-period=30
```

**Resource Naming Conventions:**
```
Kubernetes Resource Hierarchy:
├── Cluster-scoped resources (nodes, namespaces, clusterroles)
├── Namespace-scoped resources (pods, services, deployments)
├── Resource types (singular and plural forms)
└── Resource aliases (short names for efficiency)

Resource Type Examples:
Long Form              Short Form    Scope
────────────────────   ──────────    ─────────────
pods                   po            Namespaced
services               svc           Namespaced
deployments            deploy        Namespaced
replicasets            rs            Namespaced
persistentvolumes      pv            Cluster
persistentvolumeclaims pvc           Namespaced
nodes                  no            Cluster
namespaces             ns            Cluster
```

## Essential kubectl Commands Mastery

### Resource Management Commands

**Core CRUD Operations:**
```bash
# CREATE - Generate and create resources
kubectl create deployment webapp --image=nginx:1.21 --replicas=3
kubectl create service clusterip webapp --tcp=80:80
kubectl create secret generic db-secret --from-literal=password=secret123
kubectl create configmap app-config --from-file=config.properties
kubectl create namespace development
kubectl create serviceaccount webapp-sa

# GET - Retrieve and display resources
kubectl get pods                           # List pods in current namespace
kubectl get pods --all-namespaces         # List pods in all namespaces
kubectl get pods -o wide                  # Show additional columns (IP, node)
kubectl get pods --show-labels            # Show labels
kubectl get pods -l app=webapp            # Filter by labels
kubectl get pods --field-selector=status.phase=Running
kubectl get events --sort-by=.metadata.creationTimestamp

# DESCRIBE - Detailed resource information
kubectl describe pod webapp-123           # Detailed pod information
kubectl describe node worker-1            # Node details and allocated resources
kubectl describe service webapp           # Service configuration and endpoints
kubectl describe deployment webapp        # Deployment status and history

# APPLY - Declarative configuration management
kubectl apply -f webapp.yaml              # Apply single file
kubectl apply -f manifests/               # Apply directory of files
kubectl apply -k overlays/production/     # Apply Kustomize configuration
kubectl apply --dry-run=server -f webapp.yaml  # Validate without applying

# DELETE - Remove resources
kubectl delete pod webapp-123             # Delete specific pod
kubectl delete pods -l app=webapp         # Delete pods by label
kubectl delete deployment webapp          # Delete deployment (and its pods)
kubectl delete -f webapp.yaml             # Delete resources defined in file
kubectl delete all -l app=webapp          # Delete all resources with label
```

**Advanced Resource Operations:**
```bash
# EDIT - Modify resources interactively
kubectl edit deployment webapp             # Edit deployment in default editor
kubectl edit pod webapp-123               # Edit pod (limited fields)
kubectl edit service webapp               # Edit service configuration

# PATCH - Programmatic resource updates
kubectl patch deployment webapp -p '{"spec":{"replicas":5}}'
kubectl patch pod webapp-123 -p '{"spec":{"activeDeadlineSeconds":30}}'
kubectl patch service webapp --type='merge' -p='{"spec":{"type":"NodePort"}}'

# REPLACE - Replace entire resource
kubectl replace -f webapp-updated.yaml    # Replace with new configuration
kubectl replace --force -f webapp.yaml    # Force replacement (delete and recreate)

# SCALE - Adjust replica count
kubectl scale deployment webapp --replicas=5
kubectl scale deployment webapp --current-replicas=3 --replicas=5  # Conditional
kubectl autoscale deployment webapp --min=2 --max=10 --cpu-percent=70

# ROLLOUT - Manage deployment history
kubectl rollout history deployment webapp
kubectl rollout undo deployment webapp
kubectl rollout undo deployment webapp --to-revision=2
kubectl rollout status deployment webapp
kubectl rollout restart deployment webapp
```

### Resource Inspection and Debugging

**Information Gathering Commands:**
```bash
# LOGS - Container output
kubectl logs webapp-123                   # Single container pod
kubectl logs webapp-123 -c init-container # Specific container in multi-container pod
kubectl logs webapp-123 --previous        # Previous container instance
kubectl logs webapp-123 -f                # Follow/stream logs
kubectl logs webapp-123 --since=1h        # Last hour of logs
kubectl logs webapp-123 --tail=100        # Last 100 lines
kubectl logs -l app=webapp               # Logs from all pods with label
kubectl logs deployment/webapp           # Logs from deployment pods

# EXEC - Execute commands in containers
kubectl exec webapp-123 -- ls -la         # Execute single command
kubectl exec -it webapp-123 -- /bin/bash  # Interactive shell
kubectl exec webapp-123 -c sidecar -- ps aux  # Execute in specific container

# PORT-FORWARD - Local access to pod/service ports
kubectl port-forward pod/webapp-123 8080:80
kubectl port-forward service/webapp 8080:80
kubectl port-forward deployment/webapp 8080:80
kubectl port-forward --address 0.0.0.0 pod/webapp-123 8080:80  # Bind to all interfaces

# TOP - Resource usage
kubectl top nodes                         # Node resource usage
kubectl top pods                          # Pod resource usage
kubectl top pods --sort-by=memory        # Sort by memory usage
kubectl top pods --containers            # Per-container usage

# CP - Copy files to/from containers
kubectl cp webapp-123:/app/config.json ./config.json
kubectl cp ./new-config.json webapp-123:/app/config.json
kubectl cp webapp-123:/var/log/ ./logs/ -c sidecar  # Specific container
```

**Context and Configuration Management:**
```bash
# CONTEXT - Cluster and namespace management
kubectl config get-contexts               # List available contexts
kubectl config current-context           # Show current context
kubectl config use-context production    # Switch context
kubectl config set-context --current --namespace=development
kubectl config set-context dev --cluster=dev-cluster --user=dev-user --namespace=dev

# CLUSTER-INFO - Cluster information
kubectl cluster-info                      # Cluster endpoints
kubectl cluster-info dump                # Detailed cluster state
kubectl version                          # Client and server versions
kubectl api-versions                     # Available API versions
kubectl api-resources                    # Available resource types

# AUTH - Authentication and authorization
kubectl auth can-i create pods           # Check permissions
kubectl auth can-i create pods --as=system:serviceaccount:default:webapp
kubectl auth can-i '*' '*'              # Check if cluster admin
kubectl auth can-i create pods --list    # List allowed actions
```

### Powerful Filtering and Output Options

**Label and Field Selectors:**
```bash
# LABEL SELECTORS - Filter by labels
kubectl get pods -l app=webapp                    # Equality
kubectl get pods -l app!=webapp                   # Inequality  
kubectl get pods -l 'app in (webapp,api)'         # Set inclusion
kubectl get pods -l 'app notin (webapp,api)'      # Set exclusion
kubectl get pods -l app=webapp,version=v1         # Multiple labels (AND)
kubectl get pods -l 'app=webapp,version!=v2'      # Mixed conditions

# FIELD SELECTORS - Filter by object fields
kubectl get pods --field-selector=status.phase=Running
kubectl get pods --field-selector=status.phase!=Pending
kubectl get pods --field-selector=spec.nodeName=worker-1
kubectl get events --field-selector=type=Warning
kubectl get pods --field-selector=metadata.namespace=default

# COMBINING SELECTORS
kubectl get pods -l app=webapp --field-selector=status.phase=Running
```

**Output Formatting Mastery:**
```bash
# JSON OUTPUT - Structured data
kubectl get pod webapp-123 -o json
kubectl get pods -o json | jq '.items[].metadata.name'
kubectl get pods -o json | jq '.items[] | select(.status.phase=="Running")'

# YAML OUTPUT - Human-readable structured data
kubectl get pod webapp-123 -o yaml
kubectl get deployment webapp -o yaml > webapp-backup.yaml

# CUSTOM COLUMNS - Tailored output
kubectl get pods -o custom-columns=NAME:.metadata.name,STATUS:.status.phase,IP:.status.podIP
kubectl get nodes -o custom-columns=NAME:.metadata.name,CPU:.status.capacity.cpu,MEMORY:.status.capacity.memory

# JSONPATH - Extract specific fields
kubectl get pods -o jsonpath='{.items[*].metadata.name}'
kubectl get pods -o jsonpath='{.items[*].status.podIP}'
kubectl get pods -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.phase}{"\n"}{end}'

# GO TEMPLATE - Advanced formatting
kubectl get pods -o go-template='{{range .items}}{{.metadata.name}}{{"\n"}}{{end}}'
kubectl get pods -o go-template-file=pod-template.tmpl

# WIDE OUTPUT - Additional columns
kubectl get pods -o wide                  # Shows IP, node, nominated node, readiness gates
kubectl get services -o wide              # Shows endpoints, age
kubectl get nodes -o wide                 # Shows OS, kernel version, container runtime
```

### Resource Generation and Templating

**Dry-run for YAML Generation:**
```bash
# DEPLOYMENT generation
kubectl create deployment webapp --image=nginx:1.21 --replicas=3 --dry-run=client -o yaml

# SERVICE generation
kubectl create service clusterip webapp --tcp=80:80 --dry-run=client -o yaml
kubectl create service nodeport webapp --tcp=80:80 --node-port=30080 --dry-run=client -o yaml
kubectl create service loadbalancer webapp --tcp=80:80 --dry-run=client -o yaml

# CONFIGMAP generation
kubectl create configmap app-config --from-literal=key1=value1 --from-literal=key2=value2 --dry-run=client -o yaml
kubectl create configmap app-config --from-file=config.properties --dry-run=client -o yaml

# SECRET generation
kubectl create secret generic db-secret --from-literal=username=admin --from-literal=password=secret --dry-run=client -o yaml
kubectl create secret docker-registry registry-secret --docker-server=registry.com --docker-username=user --docker-password=pass --dry-run=client -o yaml

# JOB generation
kubectl create job backup --image=backup:latest --dry-run=client -o yaml

# CRONJOB generation
kubectl create cronjob backup --image=backup:latest --schedule="0 2 * * *" --dry-run=client -o yaml
```

**Quick Resource Creation Patterns:**
```bash
# POD creation (exam shortcut)
kubectl run webapp --image=nginx:1.21 --dry-run=client -o yaml > webapp-pod.yaml
kubectl run webapp --image=nginx:1.21 --labels=app=webapp,version=v1
kubectl run webapp --image=nginx:1.21 --env=APP_ENV=production
kubectl run webapp --image=nginx:1.21 --requests=cpu=100m,memory=128Mi
kubectl run webapp --image=nginx:1.21 --limits=cpu=500m,memory=512Mi
kubectl run webapp --image=nginx:1.21 --restart=Never  # Creates Pod, not Deployment

# TEMPORARY pods for debugging
kubectl run debug --image=busybox --rm -it -- /bin/sh
kubectl run netshoot --image=nicolaka/netshoot --rm -it -- bash
kubectl run ubuntu --image=ubuntu --rm -it -- bash

# EXPOSE shortcut
kubectl expose pod webapp --port=80 --target-port=80 --name=webapp-service
kubectl expose deployment webapp --port=80 --type=NodePort
kubectl expose deployment webapp --port=80 --type=LoadBalancer
```

## YAML Manifests Deep Dive

### YAML Structure and Best Practices

**Kubernetes YAML Anatomy:**
```yaml
# Standard Kubernetes resource structure
apiVersion: apps/v1              # API version for the resource type
kind: Deployment                 # Resource type
metadata:                        # Resource metadata
  name: webapp                   # Resource name (DNS-1123 compliant)
  namespace: production          # Namespace (optional, defaults to 'default')
  labels:                        # Labels for organization and selection
    app: webapp
    version: v1.0.0
    environment: production
    owner: platform-team
  annotations:                   # Annotations for additional metadata
    description: "Main web application"
    maintainer: "platform-team@company.com"
    deployment.kubernetes.io/revision: "1"
spec:                           # Resource specification (desired state)
  # ... resource-specific configuration
status:                         # Resource status (actual state) - managed by Kubernetes
  # ... current resource state (read-only)
```

**YAML Best Practices:**
```yaml
# 1. Use consistent indentation (2 spaces)
# 2. Quote strings that could be interpreted as numbers/booleans
# 3. Use meaningful names and labels
# 4. Include resource limits and requests
# 5. Add documentation through annotations

apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp-deployment          # Descriptive name
  namespace: production
  labels:
    app: webapp                    # Application identifier
    component: frontend            # Component role
    version: "1.2.3"              # Version (quoted to prevent interpretation)
    environment: production        # Environment designation
  annotations:
    description: "Frontend web application serving user traffic"
    contact: "frontend-team@company.com"
    documentation: "https://wiki.company.com/webapp"
spec:
  replicas: 3                      # Explicit replica count
  selector:
    matchLabels:
      app: webapp                  # Must match template labels exactly
      component: frontend
  template:
    metadata:
      labels:
        app: webapp                # Labels for pod selection
        component: frontend
        version: "1.2.3"
    spec:
      containers:
      - name: webapp               # Container name
        image: webapp:1.2.3        # Specific image version (avoid 'latest')
        imagePullPolicy: IfNotPresent
        ports:
        - name: http               # Named port for service reference
          containerPort: 8080
          protocol: TCP
        env:
        - name: APP_ENV
          value: "production"      # Quoted environment value
        - name: LOG_LEVEL
          value: "info"
        resources:                 # Always specify resources
          requests:
            cpu: "100m"            # Quoted CPU value
            memory: "128Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
        livenessProbe:             # Health checks
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: http
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Multi-Resource YAML Files

**Document Separation with ---:**
```yaml
# Complete application stack in single file
apiVersion: v1
kind: Namespace
metadata:
  name: webapp-system
  labels:
    name: webapp-system

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: webapp-config
  namespace: webapp-system
data:
  database_url: "postgresql://db-service:5432/webapp"
  cache_url: "redis://cache-service:6379"
  log_level: "info"
  app.properties: |
    server.port=8080
    management.endpoints.web.exposure.include=health,metrics
    logging.level.com.company.webapp=INFO

---
apiVersion: v1
kind: Secret
metadata:
  name: webapp-secrets
  namespace: webapp-system
type: Opaque
data:
  database-password: cGFzc3dvcmQxMjM=  # base64 encoded
  api-key: YWJjZGVmZ2hpams=             # base64 encoded

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
  namespace: webapp-system
spec:
  replicas: 3
  selector:
    matchLabels:
      app: webapp
  template:
    metadata:
      labels:
        app: webapp
    spec:
      containers:
      - name: webapp
        image: webapp:1.2.3
        ports:
        - containerPort: 8080
          name: http
        envFrom:
        - configMapRef:
            name: webapp-config
        - secretRef:
            name: webapp-secrets
        volumeMounts:
        - name: config-volume
          mountPath: /app/config
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
      volumes:
      - name: config-volume
        configMap:
          name: webapp-config
          items:
          - key: app.properties
            path: application.properties

---
apiVersion: v1
kind: Service
metadata:
  name: webapp-service
  namespace: webapp-system
spec:
  selector:
    app: webapp
  ports:
  - name: http
    port: 80
    targetPort: http
    protocol: TCP
  type: ClusterIP

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: webapp-ingress
  namespace: webapp-system
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: webapp.company.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: webapp-service
            port:
              number: 80
```

### Advanced YAML Patterns

**Environment-Specific Configurations:**
```yaml
# Base configuration (base/webapp.yaml)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
spec:
  replicas: 2                    # Base replica count
  selector:
    matchLabels:
      app: webapp
  template:
    metadata:
      labels:
        app: webapp
    spec:
      containers:
      - name: webapp
        image: webapp:latest      # Will be overridden per environment
        env:
        - name: LOG_LEVEL
          value: info            # Base log level
        resources:
          requests:
            cpu: 100m            # Base resource requests
            memory: 128Mi

---
# Development overlay (overlays/dev/webapp.yaml)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
spec:
  replicas: 1                    # Reduced replicas for dev
  template:
    spec:
      containers:
      - name: webapp
        image: webapp:dev-latest  # Development image
        env:
        - name: LOG_LEVEL
          value: debug           # Debug logging for dev
        - name: APP_ENV
          value: development

---
# Production overlay (overlays/prod/webapp.yaml)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
spec:
  replicas: 5                    # Higher replicas for production
  template:
    spec:
      containers:
      - name: webapp
        image: webapp:1.2.3      # Specific version for production
        env:
        - name: LOG_LEVEL
          value: warn            # Reduced logging for production
        - name: APP_ENV
          value: production
        resources:
          requests:
            cpu: 200m            # Higher resource requests
            memory: 256Mi
          limits:
            cpu: 1000m
            memory: 1Gi
```

**Resource Reference Patterns:**
```yaml
# Cross-resource references and dependencies
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: database-storage
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: fast-ssd

---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
spec:
  serviceName: database-headless
  replicas: 1
  selector:
    matchLabels:
      app: database
  template:
    metadata:
      labels:
        app: database
    spec:
      containers:
      - name: database
        image: postgres:13
        env:
        - name: POSTGRES_DB
          value: webapp
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: database-credentials    # Reference to secret
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: database-credentials    # Reference to secret
              key: password
        volumeMounts:
        - name: database-storage
          mountPath: /var/lib/postgresql/data
        ports:
        - containerPort: 5432
          name: postgres
      volumes:
      - name: database-storage
        persistentVolumeClaim:
          claimName: database-storage      # Reference to PVC

---
apiVersion: v1
kind: Service
metadata:
  name: database-service
spec:
  selector:
    app: database                          # Reference to StatefulSet pods
  ports:
  - port: 5432
    targetPort: postgres                   # Reference to named port
    name: postgres
  type: ClusterIP
```

## Advanced kubectl Techniques

### Batch Operations and Scripting

**Mass Resource Operations:**
```bash
# BATCH deletions
kubectl delete pods --all                 # Delete all pods in namespace
kubectl delete pods -l app=webapp        # Delete pods by label
kubectl delete deployment,service -l app=webapp  # Multiple resource types
kubectl delete pods --field-selector=status.phase=Failed  # Delete failed pods

# BATCH updates
kubectl patch pods -l app=webapp -p '{"spec":{"activeDeadlineSeconds":30}}'
kubectl label pods -l app=webapp environment=production
kubectl annotate pods -l app=webapp description="Updated batch annotation"

# RESOURCE listing and processing
kubectl get pods -o name | xargs kubectl delete  # Delete using names
kubectl get pods -o jsonpath='{.items[*].metadata.name}' | tr ' ' '\n' | xargs kubectl delete pod

# NAMESPACE operations
kubectl get pods --all-namespaces -o jsonpath='{range .items[*]}{.metadata.namespace}{"\t"}{.metadata.name}{"\n"}{end}'
kubectl delete namespace old-project      # Deletes namespace and all resources
```

**Scripting with kubectl:**
```bash
#!/bin/bash
# kubectl automation script example

# Function to wait for deployment rollout
wait_for_deployment() {
    local deployment=$1
    local namespace=${2:-default}
    
    echo "Waiting for deployment $deployment in namespace $namespace..."
    kubectl rollout status deployment/$deployment -n $namespace --timeout=300s
    
    if [ $? -eq 0 ]; then
        echo "Deployment $deployment is ready"
        return 0
    else
        echo "Deployment $deployment failed or timed out"
        return 1
    fi
}

# Function to check pod health
check_pod_health() {
    local label_selector=$1
    local namespace=${2:-default}
    
    local ready_pods=$(kubectl get pods -l $label_selector -n $namespace -o jsonpath='{.items[?(@.status.conditions[?(@.type=="Ready")].status=="True")].metadata.name}' | wc -w)
    local total_pods=$(kubectl get pods -l $label_selector -n $namespace --no-headers | wc -l)
    
    echo "Ready pods: $ready_pods/$total_pods"
    
    if [ $ready_pods -eq $total_pods ] && [ $total_pods -gt 0 ]; then
        return 0
    else
        return 1
    fi
}

# Main deployment workflow
deploy_application() {
    local app_name=$1
    local namespace=$2
    local manifest_file=$3
    
    echo "Deploying $app_name to namespace $namespace..."
    
    # Create namespace if it doesn't exist
    kubectl create namespace $namespace --dry-run=client -o yaml | kubectl apply -f -
    
    # Apply manifests
    kubectl apply -f $manifest_file -n $namespace
    
    # Wait for deployment
    wait_for_deployment $app_name $namespace
    
    # Check pod health
    if check_pod_health "app=$app_name" $namespace; then
        echo "Application $app_name deployed successfully!"
    else
        echo "Application $app_name deployment failed!"
        kubectl get events -n $namespace --sort-by=.metadata.creationTimestamp | tail -10
        exit 1
    fi
}

# Usage example
deploy_application "webapp" "production" "webapp-manifests.yaml"
```

### Resource Monitoring and Watching

**Real-time Resource Monitoring:**
```bash
# WATCH resources for changes
kubectl get pods -w                       # Watch pod changes
kubectl get events -w                     # Watch events in real-time
kubectl get pods -w -o wide               # Watch with additional columns

# WATCH with filtering
kubectl get pods -w -l app=webapp         # Watch specific labeled pods
kubectl get events -w --field-selector=type=Warning  # Watch warning events

# CONTINUOUS monitoring scripts
watch -n 2 'kubectl get pods'             # Refresh every 2 seconds
watch -n 5 'kubectl top nodes'            # Monitor node resources

# CUSTOM monitoring commands
kubectl get pods -w -o custom-columns=NAME:.metadata.name,STATUS:.status.phase,RESTARTS:.status.containerStatuses[0].restartCount
```

**Resource Diff and Validation:**
```bash
# DIFF before applying changes
kubectl diff -f updated-webapp.yaml       # Show differences

# VALIDATE resources
kubectl apply --dry-run=server -f webapp.yaml  # Server-side validation
kubectl apply --dry-run=client -f webapp.yaml  # Client-side validation
kubectl apply --validate=true -f webapp.yaml   # Enable validation

# RESOURCE comparison
kubectl get deployment webapp -o yaml > current-webapp.yaml
diff current-webapp.yaml desired-webapp.yaml
```

### Plugin System and Extensions

**kubectl Plugin Architecture:**
```bash
# LIST available plugins
kubectl plugin list

# INSTALL plugins (example: krew plugin manager)
kubectl krew install access-matrix         # RBAC analysis
kubectl krew install tree                  # Resource hierarchy
kubectl krew install tail                  # Multi-pod log tailing
kubectl krew install ctx                   # Context switching
kubectl krew install ns                    # Namespace switching

# CUSTOM plugin creation (kubectl-<plugin-name>)
#!/bin/bash
# Save as kubectl-pod-shell in PATH
# Usage: kubectl pod-shell <pod-name>

POD_NAME=$1
if [ -z "$POD_NAME" ]; then
    echo "Usage: kubectl pod-shell <pod-name>"
    exit 1
fi

kubectl exec -it $POD_NAME -- /bin/bash 2>/dev/null || \
kubectl exec -it $POD_NAME -- /bin/sh 2>/dev/null || \
kubectl exec -it $POD_NAME -- sh
```

## Exam-Specific kubectl Mastery

### Time-Saving Techniques

**Shell Aliases and Functions:**
```bash
# Add to ~/.bashrc or ~/.zshrc
alias k='kubectl'
alias kg='kubectl get'
alias kd='kubectl describe'
alias kdel='kubectl delete'
alias kaf='kubectl apply -f'
alias kdry='kubectl --dry-run=client -o yaml'

# Advanced aliases
alias kgp='kubectl get pods'
alias kgs='kubectl get services'
alias kgd='kubectl get deployments'
alias kgn='kubectl get nodes'
alias kge='kubectl get events --sort-by=.metadata.creationTimestamp'

# Functions for common operations
kexec() {
    kubectl exec -it $1 -- ${2:-/bin/bash}
}

klogs() {
    kubectl logs $1 ${2:+-c $2} -f
}

kdebug() {
    kubectl run debug-$RANDOM --image=busybox --rm -it -- /bin/sh
}

# Context and namespace switching
kctx() {
    if [ $# -eq 0 ]; then
        kubectl config get-contexts
    else
        kubectl config use-context $1
    fi
}

kns() {
    if [ $# -eq 0 ]; then
        kubectl get namespaces
    else
        kubectl config set-context --current --namespace=$1
    fi
}
```

**Quick Resource Templates:**
```bash
# Environment variables for faster command building
export POD_TEMPLATE='--dry-run=client -o yaml'
export SVC_TEMPLATE='--dry-run=client -o yaml'

# Quick deployment creation
quick_deploy() {
    local name=$1
    local image=$2
    local replicas=${3:-1}
    
    kubectl create deployment $name --image=$image --replicas=$replicas $POD_TEMPLATE
}

# Quick service creation
quick_svc() {
    local name=$1
    local port=$2
    local target_port=${3:-$port}
    local type=${4:-ClusterIP}
    
    kubectl create service $type $name --tcp=$port:$target_port $SVC_TEMPLATE
}

# Usage examples:
# quick_deploy webapp nginx:1.21 3 > webapp-deployment.yaml
# quick_svc webapp 80 8080 NodePort > webapp-service.yaml
```

### Exam Strategy Patterns

**Resource Generation Workflow:**
```bash
# 1. Generate base YAML
kubectl create deployment webapp --image=nginx:1.21 --dry-run=client -o yaml > webapp.yaml

# 2. Edit the file (add resources, labels, etc.)
vim webapp.yaml

# 3. Validate before applying
kubectl apply --dry-run=server -f webapp.yaml

# 4. Apply the configuration
kubectl apply -f webapp.yaml

# 5. Verify deployment
kubectl get deployment webapp
kubectl rollout status deployment webapp
```

**Troubleshooting Workflow:**
```bash
# Standard troubleshooting sequence
troubleshoot_pod() {
    local pod=$1
    
    echo "=== Pod Status ==="
    kubectl get pod $pod -o wide
    
    echo "=== Pod Description ==="
    kubectl describe pod $pod
    
    echo "=== Pod Events ==="
    kubectl get events --field-selector involvedObject.name=$pod
    
    echo "=== Pod Logs ==="
    kubectl logs $pod --previous 2>/dev/null || kubectl logs $pod
    
    echo "=== Container Processes ==="
    kubectl exec $pod -- ps aux 2>/dev/null || echo "Cannot access container"
}

# Usage: troubleshoot_pod webapp-123
```

**Multi-Resource Management:**
```bash
# Create complete application stack
create_app_stack() {
    local app_name=$1
    local image=$2
    local namespace=${3:-default}
    
    # Create namespace
    kubectl create namespace $namespace --dry-run=client -o yaml | kubectl apply -f -
    
    # Create deployment
    kubectl create deployment $app_name --image=$image -n $namespace
    
    # Create service
    kubectl expose deployment $app_name --port=80 --target-port=8080 -n $namespace
    
    # Create ingress
    kubectl create ingress $app_name --rule="$app_name.local/*=$app_name:80" -n $namespace
    
    echo "Application stack created for $app_name in namespace $namespace"
}
```

## YAML Validation and Testing

### Schema Validation

**Built-in Validation:**
```bash
# Client-side validation (basic)
kubectl apply --dry-run=client -f webapp.yaml

# Server-side validation (comprehensive)
kubectl apply --dry-run=server -f webapp.yaml

# Strict validation
kubectl apply --validate=strict -f webapp.yaml

# Validation with warnings
kubectl apply --warnings-as-errors -f webapp.yaml
```

**Custom Validation Tools:**
```bash
# kubeval - Kubernetes YAML validation
kubeval webapp.yaml
kubeval manifests/*.yaml

# kube-score - Best practices analysis
kube-score score webapp.yaml
kube-score score --output-format ci webapp.yaml

# conftest - Policy-based validation using OPA
conftest verify --policy policy/ webapp.yaml

# Example policy (policy/deployment.rego)
package main

deny[msg] {
    input.kind == "Deployment"
    not input.spec.template.spec.containers[_].resources.limits
    msg := "Containers must have resource limits"
}

deny[msg] {
    input.kind == "Deployment"
    input.spec.template.spec.containers[_].image
    contains(input.spec.template.spec.containers[_].image, ":latest")
    msg := "Containers should not use 'latest' tag"
}
```

### Testing and Verification

**Resource Testing Patterns:**
```bash
# Test resource creation
test_resource_creation() {
    local manifest=$1
    
    echo "Testing resource creation for $manifest..."
    
    # Validate YAML syntax
    if ! kubectl apply --dry-run=client -f $manifest > /dev/null 2>&1; then
        echo "YAML syntax validation failed"
        return 1
    fi
    
    # Validate against cluster
    if ! kubectl apply --dry-run=server -f $manifest > /dev/null 2>&1; then
        echo "Cluster validation failed"
        return 1
    fi
    
    echo "Resource validation passed"
    return 0
}

# Test application functionality
test_application() {
    local app_name=$1
    local namespace=${2:-default}
    
    echo "Testing application $app_name in namespace $namespace..."
    
    # Check if pods are running
    local running_pods=$(kubectl get pods -l app=$app_name -n $namespace -o jsonpath='{.items[?(@.status.phase=="Running")].metadata.name}' | wc -w)
    if [ $running_pods -eq 0 ]; then
        echo "No running pods found"
        return 1
    fi
    
    # Check if service is accessible
    local service_ip=$(kubectl get service $app_name -n $namespace -o jsonpath='{.spec.clusterIP}')
    if ! kubectl run test-$RANDOM --image=busybox --rm -it -- wget -q --timeout=5 -O - $service_ip > /dev/null 2>&1; then
        echo "Service not accessible"
        return 1
    fi
    
    echo "Application test passed"
    return 0
}
```

## Exam Tips & Quick Reference

### ⚡ Essential Command Shortcuts

```bash
# Resource shortcuts
k get po                          # kubectl get pods
k get svc                         # kubectl get services  
k get deploy                      # kubectl get deployments
k get no                          # kubectl get nodes

# Output shortcuts
k get po -o wide                  # Extended output
k get po -o yaml                  # YAML output
k get po -o json                  # JSON output
k get po --show-labels            # Show labels

# Quick operations
k run test --image=busybox --rm -it -- sh    # Temporary pod
k create deploy app --image=nginx --dry-run=client -o yaml
k expose deploy app --port=80 --target-port=8080
k scale deploy app --replicas=3

# Debugging shortcuts
k describe po <pod-name>          # Pod details
k logs <pod-name> -f              # Follow logs
k exec -it <pod-name> -- /bin/bash   # Shell access
k get events --sort-by=.metadata.creationTimestamp
```

### 🎯 Common Exam Patterns

**Pattern 1: Create Resource from Scratch**
```bash
# Generate YAML template
kubectl create deployment webapp --image=nginx:1.21 --dry-run=client -o yaml > webapp.yaml

# Edit file to add required specifications
vim webapp.yaml

# Apply and verify
kubectl apply -f webapp.yaml
kubectl get deployment webapp
```

**Pattern 2: Modify Existing Resource**
```bash
# Export current configuration
kubectl get deployment webapp -o yaml > webapp-current.yaml

# Edit configuration
vim webapp-current.yaml

# Apply changes
kubectl apply -f webapp-current.yaml

# Or use direct edit
kubectl edit deployment webapp
```

**Pattern 3: Troubleshoot Resource**
```bash
# Standard troubleshooting sequence
kubectl get pods
kubectl describe pod <pod-name>
kubectl logs <pod-name>
kubectl get events
```

### 🚨 Critical Gotchas

1. **YAML Indentation**: Must be consistent (2 spaces recommended)
2. **Quotes in YAML**: Quote strings that look like numbers ("80", "1.0")
3. **Label Selectors**: Deployment selector must match pod template labels exactly
4. **Resource Names**: Must be DNS-1123 compliant (lowercase, numbers, hyphens)
5. **Namespace Context**: Always verify current namespace context
6. **Dry-run Validation**: Use server-side dry-run for complete validation
7. **Resource Limits**: Always specify in production manifests

## WHY This Matters - The Deeper Philosophy

### The Command Line as Universal Interface

**The Unix Philosophy Applied:**
```
"Everything is a file" → "Everything is a resource"
├── Consistent interface patterns across all resource types
├── Composable commands for complex operations
├── Pipeable output for automation and scripting
├── Text-based configuration for version control
└── Human-readable formats for debugging and learning

kubectl embodies these principles:
├── Unified CRUD operations across all resources
├── Consistent output formatting options
├── Composable with standard Unix tools
├── Infrastructure as Code enablement
└── Learning through exploration and experimentation
```

**The Abstraction Ladder:**
```
Level 5: Business Logic (Applications, Services)
Level 4: Kubernetes Resources (Deployments, Services, Pods)
Level 3: kubectl Commands (Imperative operations)
Level 2: YAML Manifests (Declarative state)
Level 1: Kubernetes API (REST endpoints)
Level 0: etcd Storage (Distributed key-value store)

kubectl bridges levels 2-4, making complex distributed systems accessible
through simple, intuitive commands and readable configuration files.
```

### Configuration as Code Philosophy

**The Infrastructure as Code Evolution:**
```
Manual Operations → Scripts → Configuration Management → Infrastructure as Code → GitOps
       │              │              │                        │                │
   Snowflake       Runbooks      Ansible/Chef           Terraform/Helm      Kubernetes + Git
   Servers         Scripts       Playbooks              Templates           Manifests
```

**YAML as the Universal Configuration Language:**
```
YAML Design Principles:
├── Human-readable and writable
├── Machine-parseable and validatable
├── Hierarchical data representation
├── Comment support for documentation
├── Consistent syntax across tools
└── Version control friendly

Why YAML Won in Kubernetes:
├── Lower barrier to entry than JSON
├── More expressive than environment variables
├── Less verbose than XML
├── Better tooling ecosystem than TOML
└── Industry standardization momentum
```

### The Cognitive Load Reduction Model

**Command Complexity Management:**
```
Beginner: kubectl get pods
├── Single resource type
├── Default output format
├── Current namespace only
└── Minimal cognitive load

Intermediate: kubectl get pods -l app=webapp -o wide --sort-by=.metadata.creationTimestamp
├── Filtered resource selection
├── Custom output format
├── Sorted results
└── Moderate cognitive load

Expert: kubectl get pods -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.phase}{"\t"}{.spec.nodeName}{"\n"}{end}' | column -t
├── Custom data extraction
├── Formatted output processing
├── Pipeline composition
└── High cognitive load

The progression allows learning through increasing complexity
while maintaining the same fundamental command patterns.
```

### Production Engineering Impact

**The Operational Excellence Model:**
```
Reactive Operations:
├── Manual resource creation and modification
├── Imperative commands for problem resolution
├── Individual heroics during incidents
├── Tribal knowledge in people's heads
└── High operational overhead

Proactive Operations:
├── Declarative infrastructure definitions
├── Automated deployment and scaling
├── Standardized incident response procedures
├── Documented runbooks and procedures
└── Self-service capabilities for development teams

kubectl and YAML enable the transition from reactive to proactive
operations by making infrastructure programmable and reproducible.
```

**The Learning and Sharing Economy:**
```
Knowledge Transfer Efficiency:
├── YAML manifests capture operational knowledge
├── git repositories become operational documentation
├── Code reviews improve infrastructure quality
├── Pull requests enable collaborative operations
├── Version history provides audit trails
└── Reproducible environments reduce onboarding time

Career Development Acceleration:
├── Transferable skills across organizations
├── Industry-standard tooling and patterns
├── Open source contribution opportunities
├── Community learning and knowledge sharing
└── Vendor-neutral skill development
```

### Career Development Implications

**For the Exam:**
- **Command Fluency**: Master kubectl patterns for speed and accuracy
- **YAML Proficiency**: Write correct manifests quickly and confidently
- **Debugging Skills**: Use kubectl effectively for problem diagnosis
- **Pattern Recognition**: Identify common resource configurations and relationships

**For Production Systems:**
- **Automation**: Enable GitOps and Infrastructure as Code workflows
- **Reliability**: Create reproducible, testable infrastructure configurations
- **Collaboration**: Facilitate team knowledge sharing through code reviews
- **Standardization**: Establish consistent patterns across applications and teams

**For Your Career:**
- **Versatility**: kubectl skills transfer across any Kubernetes environment
- **Leadership**: Guide teams in adopting infrastructure as code practices
- **Innovation**: Design novel deployment patterns and operational workflows
- **Mentoring**: Teach others the principles behind effective kubectl usage

Understanding kubectl and YAML deeply teaches you how to **communicate effectively with distributed systems** through code. This knowledge is fundamental to the CKA exam and essential for anyone working with modern cloud-native infrastructure.

These tools represent the democratization of complex systems management - making powerful distributed systems accessible through simple, learnable interfaces. Master these skills, and you master the primary interface to the cloud-native world.