# YAML Manifests - Comprehensive Study Guide
category: Kubernetes Certification
tags: cka, kubernetes, exam, kubectl, certification

## WHY YAML Manifests Matter (Conceptual Foundation)

### The Infrastructure as Code Paradigm
YAML manifests are **declarative infrastructure definitions** - the DNA of your Kubernetes applications:

- **Desired State Declaration** - You describe WHAT you want, not HOW to achieve it
- **API Object Blueprints** - Every manifest creates or modifies API objects in etcd
- **Reproducible Infrastructure** - Same manifest = same result across environments
- **Version Control Integration** - Infrastructure changes tracked like code
- **GitOps Foundation** - Manifests enable automated deployment pipelines

### Exam Context: Why YAML Mastery is Critical
- **70% of exam tasks** involve writing or modifying YAML
- **No syntax highlighting** - you must know structure by heart
- **Complex nested relationships** - understanding object hierarchy is crucial
- **Troubleshooting broken manifests** - rapid YAML debugging skills essential
- **Template generation** - converting kubectl commands to production-ready YAML

---

## Core Architectural Understanding

### Kubernetes API Object Model
Every YAML manifest represents a **desired state declaration** to the API server:

```yaml
# This is NOT just configuration - it's a state transition request
apiVersion: apps/v1  # Which API group handles this?
kind: Deployment     # What type of object?
metadata:           # How to identify this object?
  name: web-app
  namespace: production
spec:               # What is the desired state?
  replicas: 3
  # ... more spec details
status:             # What is the current state? (managed by controllers)
  # Never write this section - it's controller-managed
```

**Key Concept**: manifests define `spec` (desired), controllers reconcile to achieve it, and populate `status` (actual).

### YAML Syntax Foundation for Kubernetes
```yaml
# Indentation is CRITICAL (2 spaces standard)
apiVersion: v1
kind: Pod
metadata:
  name: example-pod
  labels:           # Key-value pairs
    app: web
    tier: frontend
  annotations:      # Extended metadata
    description: "Main web application pod"
spec:
  containers:       # Array of objects
  - name: web       # Array item starts with dash
    image: nginx:1.20
    ports:
    - containerPort: 80
      protocol: TCP
  - name: sidecar   # Second container
    image: busybox
    command: ["sleep", "3600"]
```

**Critical YAML Rules**:
- **Indentation = hierarchy** (spaces only, never tabs)
- **Hyphens (-) = array items**
- **Colons (:) = key-value pairs**
- **Quotes** preserve strings with special characters

---

## Essential Manifest Patterns

### 1. Pod Manifests (Building Block)

#### Basic Pod Structure
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: basic-pod
  namespace: default
  labels:
    app: myapp
    version: v1
spec:
  containers:
  - name: main-container
    image: nginx:1.20
    ports:
    - containerPort: 80
    env:
    - name: ENV_VAR
      value: "production"
    resources:
      requests:
        memory: "64Mi"
        cpu: "250m"
      limits:
        memory: "128Mi"
        cpu: "500m"
  restartPolicy: Always
  nodeSelector:
    disktype: ssd
```

#### Multi-Container Pod (Sidecar Pattern)
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sidecar-pod
spec:
  containers:
  - name: main-app
    image: nginx
    volumeMounts:
    - name: shared-logs
      mountPath: /var/log/nginx
  - name: log-shipper
    image: fluent/fluent-bit
    volumeMounts:
    - name: shared-logs
      mountPath: /var/log/nginx
      readOnly: true
  volumes:
  - name: shared-logs
    emptyDir: {}
```

**Conceptual Insight**: Multi-container pods share network, storage, and lifecycle - they're atomic deployment units.

### 2. Deployment Manifests (Production Workloads)

#### Complete Deployment Pattern
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-deployment
  labels:
    app: web
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  selector:
    matchLabels:        # MUST match template labels
      app: web
  template:            # Pod template
    metadata:
      labels:
        app: web        # Referenced by selector above
        version: v1
    spec:
      containers:
      - name: web
        image: nginx:1.20
        ports:
        - containerPort: 80
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
```

**Critical Gotcha**: `spec.selector.matchLabels` MUST match `spec.template.metadata.labels` exactly.

#### Advanced Deployment Strategies
```yaml
# Blue-Green Deployment Pattern
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-blue
spec:
  replicas: 3
  strategy:
    type: Recreate  # All pods replaced simultaneously
  selector:
    matchLabels:
      app: myapp
      version: blue
  template:
    metadata:
      labels:
        app: myapp
        version: blue
    spec:
      containers:
      - name: app
        image: myapp:v1.0
---
# Switch traffic by updating service selector
apiVersion: v1
kind: Service
metadata:
  name: app-service
spec:
  selector:
    app: myapp
    version: blue  # Change to 'green' for traffic switch
  ports:
  - port: 80
    targetPort: 8080
```

### 3. Service Manifests (Network Abstraction)

#### ClusterIP Service (Internal)
```yaml
apiVersion: v1
kind: Service
metadata:
  name: internal-service
spec:
  type: ClusterIP  # Default type
  selector:
    app: web       # Matches pod labels
  ports:
  - name: http
    port: 80       # Service port
    targetPort: 8080  # Container port
    protocol: TCP
  sessionAffinity: ClientIP  # Optional: sticky sessions
```

#### NodePort Service (External Access)
```yaml
apiVersion: v1
kind: Service
metadata:
  name: nodeport-service
spec:
  type: NodePort
  selector:
    app: web
  ports:
  - port: 80
    targetPort: 8080
    nodePort: 30080  # Optional: specify port (30000-32767)
```

#### LoadBalancer Service (Cloud Provider)
```yaml
apiVersion: v1
kind: Service
metadata:
  name: loadbalancer-service
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
spec:
  type: LoadBalancer
  selector:
    app: web
  ports:
  - port: 80
    targetPort: 8080
  loadBalancerSourceRanges:  # Restrict access
  - "10.0.0.0/8"
```

#### Headless Service (StatefulSet Pattern)
```yaml
apiVersion: v1
kind: Service
metadata:
  name: headless-service
spec:
  clusterIP: None  # Headless - no cluster IP assigned
  selector:
    app: database
  ports:
  - port: 5432
    targetPort: 5432
```

**Conceptual Insight**: Services create stable network endpoints for ephemeral pods via label selection.

### 4. ConfigMap and Secret Patterns

#### ConfigMap Varieties
```yaml
# Literal values
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  database_url: "postgresql://db:5432/myapp"
  debug_mode: "false"
  config.yaml: |
    server:
      port: 8080
      host: "0.0.0.0"
    database:
      driver: postgres
      maxConnections: 10
---
# Using ConfigMap in Pod
apiVersion: v1
kind: Pod
metadata:
  name: config-pod
spec:
  containers:
  - name: app
    image: myapp
    env:
    - name: DATABASE_URL
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: database_url
    volumeMounts:
    - name: config-volume
      mountPath: /etc/config
  volumes:
  - name: config-volume
    configMap:
      name: app-config
```

#### Secret Patterns
```yaml
# Opaque Secret (base64 encoded)
apiVersion: v1
kind: Secret
metadata:
  name: db-secret
type: Opaque
data:
  username: YWRtaW4=  # admin (base64)
  password: cGFzc3dvcmQ=  # password (base64)
stringData:  # Plain text (automatically encoded)
  connection-string: "postgresql://admin:password@db:5432/myapp"
---
# TLS Secret
apiVersion: v1
kind: Secret
metadata:
  name: tls-secret
type: kubernetes.io/tls
data:
  tls.crt: LS0tLS1CRUdJTi... # Base64 certificate
  tls.key: LS0tLS1CRUdJTi... # Base64 private key
---
# Docker Registry Secret
apiVersion: v1
kind: Secret
metadata:
  name: registry-secret
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: eyJhdXRocyI6... # Base64 docker config
```

### 5. Volume and Storage Patterns

#### PersistentVolume and PersistentVolumeClaim
```yaml
# PersistentVolume (cluster-wide resource)
apiVersion: v1
kind: PersistentVolume
metadata:
  name: local-pv
spec:
  capacity:
    storage: 10Gi
  accessModes:
  - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: local-storage
  local:
    path: /mnt/disks/vol1
  nodeAffinity:
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: kubernetes.io/hostname
          operator: In
          values:
          - worker-node-1
---
# PersistentVolumeClaim (namespace resource)
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-pvc
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
  storageClassName: local-storage
---
# Using PVC in Pod
apiVersion: v1
kind: Pod
metadata:
  name: storage-pod
spec:
  containers:
  - name: app
    image: nginx
    volumeMounts:
    - name: storage
      mountPath: /data
  volumes:
  - name: storage
    persistentVolumeClaim:
      claimName: app-pvc
```

#### Volume Types Reference
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: volume-examples
spec:
  containers:
  - name: app
    image: busybox
    command: ["sleep", "3600"]
    volumeMounts:
    - name: empty-dir
      mountPath: /tmp/empty
    - name: host-path
      mountPath: /tmp/host
    - name: config-volume
      mountPath: /etc/config
    - name: secret-volume
      mountPath: /etc/secrets
  volumes:
  - name: empty-dir
    emptyDir:
      sizeLimit: 1Gi
  - name: host-path
    hostPath:
      path: /var/log
      type: Directory
  - name: config-volume
    configMap:
      name: app-config
  - name: secret-volume
    secret:
      secretName: app-secret
      defaultMode: 0400  # Read-only for owner
```

---

## Advanced Manifest Patterns

### 1. StatefulSet for Stateful Applications
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
spec:
  serviceName: "database-headless"
  replicas: 3
  selector:
    matchLabels:
      app: database
  template:
    metadata:
      labels:
        app: database
    spec:
      containers:
      - name: postgres
        image: postgres:13
        env:
        - name: POSTGRES_DB
          value: myapp
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: username
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:  # Unique PVC per pod
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

**Key Concept**: StatefulSets provide stable network identity and persistent storage per replica.

### 2. DaemonSet for Node-level Services
```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: node-exporter
  template:
    metadata:
      labels:
        app: node-exporter
    spec:
      hostNetwork: true  # Use host networking
      hostPID: true      # Access host process namespace
      containers:
      - name: node-exporter
        image: prom/node-exporter:latest
        args:
        - '--path.rootfs=/host'
        ports:
        - containerPort: 9100
          hostPort: 9100  # Expose on host
        volumeMounts:
        - name: rootfs
          mountPath: /host
          readOnly: true
      volumes:
      - name: rootfs
        hostPath:
          path: /
      tolerations:  # Run on all nodes, including masters
      - operator: Exists
```

### 3. Job and CronJob Patterns
```yaml
# One-time Job
apiVersion: batch/v1
kind: Job
metadata:
  name: data-migration
spec:
  completions: 1
  parallelism: 1
  backoffLimit: 3
  template:
    spec:
      containers:
      - name: migrator
        image: migrate/migrate
        command: ["migrate", "-path", "/migrations", "-database", "$(DATABASE_URL)", "up"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: connection-string
      restartPolicy: Never
---
# Scheduled CronJob
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup-job
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  concurrencyPolicy: Forbid  # Don't run concurrent jobs
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:13
            command: ["/bin/bash"]
            args:
            - -c
            - "pg_dump $DATABASE_URL > /backup/backup-$(date +%Y%m%d-%H%M%S).sql"
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-pvc
          restartPolicy: OnFailure
```

### 4. Ingress for HTTP Routing
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - app.example.com
    secretName: app-tls
  rules:
  - host: app.example.com
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

---

## YAML Generation and Templating

### 1. kubectl Generators (Exam Essential)
```bash
# Generate deployment YAML
kubectl create deployment web --image=nginx --dry-run=client -o yaml > deployment.yaml

# Generate service YAML
kubectl expose deployment web --port=80 --target-port=8080 --dry-run=client -o yaml > service.yaml

# Generate configmap YAML
kubectl create configmap app-config --from-literal=key1=value1 --dry-run=client -o yaml > configmap.yaml

# Generate secret YAML
kubectl create secret generic app-secret --from-literal=password=secret123 --dry-run=client -o yaml > secret.yaml

# Generate job YAML
kubectl create job data-job --image=busybox --dry-run=client -o yaml -- echo "hello world" > job.yaml
```

### 2. Common Modifications Patterns
```yaml
# Start with generated base
apiVersion: apps/v1
kind: Deployment
metadata:
  creationTimestamp: null  # Remove this line
  labels:
    app: web
  name: web
spec:
  replicas: 1  # Change to desired count
  selector:
    matchLabels:
      app: web
  strategy: {}  # Replace with specific strategy
  template:
    metadata:
      creationTimestamp: null  # Remove this line
      labels:
        app: web
    spec:
      containers:
      - image: nginx
        name: nginx
        resources: {}  # Add actual resource limits
status: {}  # Remove entire status section
```

**Exam Tip**: Always remove `creationTimestamp: null`, `resources: {}`, `strategy: {}`, and entire `status: {}` sections.

---

## Validation and Troubleshooting

### 1. YAML Syntax Validation
```bash
# Validate without applying
kubectl apply --dry-run=client -f manifest.yaml

# Validate against cluster
kubectl apply --dry-run=server -f manifest.yaml

# Explain API structure
kubectl explain deployment.spec.template.spec.containers
kubectl explain pod.spec --recursive
```

### 2. Common YAML Errors and Fixes

#### Indentation Errors
```yaml
# WRONG - inconsistent indentation
apiVersion: v1
kind: Pod
metadata:
 name: bad-pod
spec:
   containers:
 - name: nginx
    image: nginx

# CORRECT - consistent 2-space indentation
apiVersion: v1
kind: Pod
metadata:
  name: good-pod
spec:
  containers:
  - name: nginx
    image: nginx
```

#### Label Selector Mismatches
```yaml
# WRONG - selector doesn't match template labels
spec:
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: frontend  # Mismatch!

# CORRECT - labels match exactly
spec:
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web       # Match!
```

#### Resource Reference Errors
```yaml
# WRONG - referencing non-existent resources
env:
- name: CONFIG_VALUE
  valueFrom:
    configMapKeyRef:
      name: missing-config  # ConfigMap doesn't exist
      key: missing-key      # Key doesn't exist

# CORRECT - verify resources exist first
kubectl get configmap app-config
kubectl describe configmap app-config
```

### 3. Debugging Workflow
```bash
# 1. Validate YAML syntax
kubectl apply --dry-run=client -f manifest.yaml

# 2. Check resource creation
kubectl apply -f manifest.yaml
kubectl get all -l app=myapp

# 3. Investigate issues
kubectl describe deployment myapp
kubectl describe pod <pod-name>
kubectl logs <pod-name>

# 4. Check events
kubectl get events --sort-by='.lastTimestamp'
```

---

## Best Practices and Patterns

### 1. Production-Ready Manifest Structure
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: production-app
  labels:
    app: production-app
    version: v1.2.3
    tier: frontend
  annotations:
    deployment.kubernetes.io/revision: "1"
    description: "Production web application"
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  selector:
    matchLabels:
      app: production-app
  template:
    metadata:
      labels:
        app: production-app
        version: v1.2.3
        tier: frontend
    spec:
      containers:
      - name: web
        image: myapp:v1.2.3
        ports:
        - containerPort: 8080
          name: http
        env:
        - name: ENVIRONMENT
          value: "production"
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        volumeMounts:
        - name: config
          mountPath: /etc/config
          readOnly: true
        - name: secrets
          mountPath: /etc/secrets
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: app-config
      - name: secrets
        secret:
          secretName: app-secrets
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 2000
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - production-app
              topologyKey: kubernetes.io/hostname
```

### 2. Multi-Resource Manifest Organization
```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: myapp
  labels:
    name: myapp
---
# configmap.yaml in same file (using ---)
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: myapp
data:
  app.properties: |
    server.port=8080
    database.url=jdbc:postgresql://db:5432/myapp
---
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: myapp
type: Opaque
stringData:
  database-password: "supersecret"
---
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: myapp
# ... rest of deployment spec
```

### 3. Resource Naming Conventions
```yaml
# Follow consistent naming patterns
metadata:
  name: myapp-frontend-deployment    # app-component-type
  labels:
    app.kubernetes.io/name: myapp
    app.kubernetes.io/component: frontend
    app.kubernetes.io/version: "1.2.3"
    app.kubernetes.io/managed-by: kubectl
```

---

## Exam-Specific Strategies

### 1. Speed Optimization Techniques
```bash
# Use generators + modifications instead of writing from scratch
kubectl create deployment web --image=nginx -o yaml --dry-run=client > base.yaml

# Edit efficiently:
# 1. Remove unnecessary fields (creationTimestamp, status, etc.)
# 2. Add required specifications (resources, probes, etc.)
# 3. Validate quickly with --dry-run=client
```

### 2. Common Exam Patterns
```yaml
# Multi-container pod with shared volume
apiVersion: v1
kind: Pod
metadata:
  name: multi-container
spec:
  containers:
  - name: producer
    image: busybox
    command: ["/bin/sh"]
    args: ["-c", "while true; do echo $(date) >> /shared/output.log; sleep 5; done"]
    volumeMounts:
    - name: shared
      mountPath: /shared
  - name: consumer
    image: busybox
    command: ["/bin/sh"]
    args: ["-c", "tail -f /shared/output.log"]
    volumeMounts:
    - name: shared
      mountPath: /shared
  volumes:
  - name: shared
    emptyDir: {}
```

### 3. Critical Validation Checklist
✅ **YAML syntax is valid** (proper indentation, no tabs)
✅ **apiVersion matches the resource type**
✅ **Required fields are present** (name, image, etc.)
✅ **Label selectors match template labels**
✅ **Resource references exist** (ConfigMaps, Secrets, PVCs)
✅ **Namespace consistency** across related resources
✅ **Security contexts are appropriate**
✅ **Resource limits are specified**

---

## Conceptual Mastery Framework

### Understanding the API Object Lifecycle
1. **Declaration**: YAML defines desired state
2. **Submission**: kubectl sends to API server
3. **Validation**: API server validates syntax and permissions
4. **Storage**: etcd stores the object definition
5. **Reconciliation**: Controllers work to achieve desired state
6. **Status Updates**: Controllers update status fields
7. **Monitoring**: You observe actual vs desired state

### YAML as Infrastructure Language
- **Declarative**: Describe the end state, not the steps
- **Idempotent**: Same input = same result
- **Composable**: Complex systems built from simple primitives
- **Version-controlled**: Infrastructure changes tracked over time
- **Portable**: Same manifests work across clusters

---

*Mastering YAML manifests means understanding Kubernetes as a declarative system where you define desired state and controllers work to achieve it. Every manifest is a conversation with the API server about how you want your infrastructure to look.*