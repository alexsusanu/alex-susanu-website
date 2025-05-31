# Kubernetes Workload Controllers: Complete Deep Technical Guide
category: DevOps
tags: kubernetes, deployments, statefulsets, daemonsets, jobs, cronjobs, hpa, controllers

## Introduction to Workload Controllers

Kubernetes **workload controllers** are the "managers" that ensure your applications run correctly. Instead of creating pods directly, you create controllers that manage pods for you, ensuring they stay healthy, scale appropriately, and recover from failures.

### Why Controllers Exist

**The Problem with Raw Pods:**
```yaml
# Creating a pod directly
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  containers:
  - name: app
    image: myapp:latest

# Problems:
# 1. Pod dies → Gone forever (no restart)
# 2. Node fails → Pod lost permanently  
# 3. Need multiple replicas → Create each pod manually
# 4. Updates → Delete and recreate manually
# 5. No rollback capability
```

**The Controller Solution:**
```yaml
# Creating a Deployment (controller)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
      - name: app
        image: myapp:latest

# Benefits:
# 1. Pod dies → Automatically replaced
# 2. Node fails → Pods rescheduled to healthy nodes
# 3. Want more replicas → Change replicas field
# 4. Updates → Rolling update automatically
# 5. Rollback → Built-in revision history
```

### Controller Pattern

**How Controllers Work:**
```
Desired State (in spec) → Controller watches → Current State → Actions to reconcile
                           ↓
                   Compare desired vs actual
                           ↓
                   Take corrective actions
```

**Controller Loop (Reconciliation):**
1. **Read desired state** - What you want (from spec)
2. **Read current state** - What actually exists (from cluster)
3. **Compare states** - Are they the same?
4. **Take actions** - Create, update, or delete resources to match desired state
5. **Repeat** - Continuously monitor and adjust

### Types of Workload Controllers

**Stateless Applications:**
- **Deployment** - Standard stateless applications (web servers, APIs)
- **ReplicaSet** - Lower-level replica management (usually managed by Deployment)

**Stateful Applications:**
- **StatefulSet** - Applications needing stable identity (databases, clustered apps)

**Node-Level Services:**
- **DaemonSet** - One pod per node (monitoring agents, log collectors)

**Batch Processing:**
- **Job** - Run-to-completion tasks (data processing, backups)
- **CronJob** - Scheduled tasks (periodic backups, reports)

**Auto-scaling:**
- **HorizontalPodAutoscaler (HPA)** - Scale pods based on metrics
- **VerticalPodAutoscaler (VPA)** - Adjust pod resource requests/limits

## Deployments Deep Dive

### What Deployments Actually Do

A **Deployment** manages ReplicaSets, which in turn manage Pods. This creates a hierarchy that enables powerful features like rolling updates and rollbacks.

**Deployment Hierarchy:**
```
Deployment
└── ReplicaSet (current version)
    ├── Pod 1
    ├── Pod 2
    └── Pod 3
└── ReplicaSet (old version, scaled to 0)
    └── (no pods, kept for rollback)
```

**Why the Extra Layer (ReplicaSet)?**
- **Rolling Updates** - Create new ReplicaSet with new version, gradually scale down old one
- **Rollback Capability** - Keep old ReplicaSets around for quick rollbacks
- **Update Strategies** - Control how updates happen (rolling, recreate)

### Deployment Strategies

#### Rolling Update Strategy (Default)
**How Rolling Updates Work:**
1. **Create new ReplicaSet** with updated pod template
2. **Scale up new ReplicaSet** gradually (add new pods)
3. **Scale down old ReplicaSet** gradually (remove old pods)
4. **Repeat** until all pods are new version

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 6
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 25%    # Max 25% of pods can be unavailable (1-2 pods)
      maxSurge: 25%          # Max 25% extra pods during update (1-2 extra pods)
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: web
        image: nginx:1.20
        ports:
        - containerPort: 80
```

**Rolling Update Process with 6 replicas:**
```
Step 1: 6 old pods running
Step 2: Create 1 new pod (maxSurge=25% = 1.5, rounded down to 1)
        → 6 old + 1 new = 7 total pods
Step 3: Delete 1 old pod (maxUnavailable=25% = 1.5, rounded down to 1)
        → 5 old + 1 new = 6 total pods
Step 4: Create 1 new pod
        → 5 old + 2 new = 7 total pods
Step 5: Delete 1 old pod
        → 4 old + 2 new = 6 total pods
...continue until all pods are new version
```

#### Recreate Strategy
**How Recreate Works:**
1. **Scale down old ReplicaSet** to 0 (delete all old pods)
2. **Wait** for all old pods to terminate
3. **Scale up new ReplicaSet** to desired replicas

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: database-app
spec:
  replicas: 1
  strategy:
    type: Recreate  # All-or-nothing update
  selector:
    matchLabels:
      app: database
  template:
    metadata:
      labels:
        app: database
    spec:
      containers:
      - name: db
        image: postgres:13
        # Database can't have multiple versions running simultaneously
```

**When to use Recreate:**
- Applications that can't run multiple versions simultaneously
- Applications using ReadWriteOnce volumes (only one pod can mount)
- Applications with complex state that needs clean shutdown

### Advanced Deployment Configuration

#### Complete Production Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: production-web-app
  namespace: production
  labels:
    app: web-app
    version: v2.1.0
    environment: production
spec:
  replicas: 10
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 2      # Absolute number instead of percentage
      maxSurge: 3           # Can temporarily have 13 pods during update
  selector:
    matchLabels:
      app: web-app
      environment: production
  template:
    metadata:
      labels:
        app: web-app
        version: v2.1.0
        environment: production
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
        prometheus.io/path: "/metrics"
    spec:
      # Pod-level configuration
      restartPolicy: Always
      serviceAccountName: web-app-sa
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 2000
      
      # Init containers for setup
      initContainers:
      - name: migration
        image: myapp/migrator:v2.1.0
        command: ["./migrate", "up"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: url
      
      containers:
      - name: web-app
        image: myapp/web:v2.1.0
        imagePullPolicy: IfNotPresent
        
        ports:
        - name: http
          containerPort: 8080
          protocol: TCP
        - name: metrics
          containerPort: 9090
          protocol: TCP
        
        env:
        - name: NODE_ENV
          value: "production"
        - name: LOG_LEVEL
          value: "info"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: url
        
        envFrom:
        - configMapRef:
            name: web-app-config
        
        # Resource management
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        
        # Health checks
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
          failureThreshold: 2
        
        startupProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 30  # Allow 150 seconds for startup
        
        # Volume mounts
        volumeMounts:
        - name: app-logs
          mountPath: /var/log/app
        - name: tmp-volume
          mountPath: /tmp
        
        # Security context
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop: ["ALL"]
      
      # Volumes
      volumes:
      - name: app-logs
        emptyDir: {}
      - name: tmp-volume
        emptyDir: {}
      
      # Scheduling preferences
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app: web-app
              topologyKey: kubernetes.io/hostname
      
      # Tolerations for node taints
      tolerations:
      - key: "dedicated"
        operator: "Equal"
        value: "web-servers"
        effect: "NoSchedule"
      
      # Node selection
      nodeSelector:
        node-type: "web-servers"
      
      # Graceful shutdown
      terminationGracePeriodSeconds: 60
      
      # Image pull secrets
      imagePullSecrets:
      - name: docker-registry-secret
```

### Deployment Updates and Rollbacks

#### Triggering Updates
```bash
# Update image version
kubectl set image deployment/web-app web=nginx:1.21

# Update environment variable
kubectl patch deployment web-app -p='{"spec":{"template":{"spec":{"containers":[{"name":"web","env":[{"name":"VERSION","value":"v2.0"}]}]}}}}'

# Edit deployment directly
kubectl edit deployment web-app

# Apply updated YAML
kubectl apply -f deployment.yaml
```

#### Monitoring Update Progress
```bash
# Watch rollout status
kubectl rollout status deployment/web-app

# Get deployment status
kubectl get deployment web-app

# See rollout history
kubectl rollout history deployment/web-app

# See specific revision details
kubectl rollout history deployment/web-app --revision=3
```

#### Rollback Operations
```bash
# Rollback to previous version
kubectl rollout undo deployment/web-app

# Rollback to specific revision
kubectl rollout undo deployment/web-app --to-revision=2

# Pause rollout (stop in middle of update)
kubectl rollout pause deployment/web-app

# Resume paused rollout
kubectl rollout resume deployment/web-app
```

#### Revision History Management
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  revisionHistoryLimit: 5  # Keep 5 old ReplicaSets for rollback
  # Default is 10, set lower to save resources
```

### Health Checks Deep Dive

#### Liveness Probes
**Purpose:** Detect when container is stuck and needs restart
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
    httpHeaders:
    - name: Custom-Header
      value: liveness-check
  initialDelaySeconds: 30    # Wait 30s after container starts
  periodSeconds: 10          # Check every 10 seconds
  timeoutSeconds: 5          # 5 second timeout per check
  failureThreshold: 3        # Restart after 3 failed checks
  successThreshold: 1        # Consider healthy after 1 success
```

**Liveness Probe Types:**
```yaml
# HTTP probe
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
    scheme: HTTPS

# TCP probe  
livenessProbe:
  tcpSocket:
    port: 5432

# Command probe
livenessProbe:
  exec:
    command:
    - cat
    - /tmp/healthy
```

#### Readiness Probes
**Purpose:** Detect when container is ready to receive traffic
```yaml
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 2        # Remove from service after 2 failures
  successThreshold: 1        # Add to service after 1 success
```

**Readiness vs Liveness:**
- **Liveness failure** → Container restarts
- **Readiness failure** → Pod removed from service endpoints (no traffic)

#### Startup Probes
**Purpose:** Handle slow-starting containers that need more time than normal health checks
```yaml
startupProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 30       # Allow 150 seconds for startup (30 * 5s)
# After startup probe succeeds, liveness/readiness probes take over
```

**Why Startup Probes Matter:**
```yaml
# Without startup probe - problematic for slow apps
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 60    # Have to guess how long startup takes
  periodSeconds: 10
  failureThreshold: 3
# If app takes 90 seconds to start, it gets killed at 60+30=90s

# With startup probe - handles variable startup times
startupProbe:
  httpGet:
    path: /health
    port: 8080
  periodSeconds: 5
  failureThreshold: 60       # Allow up to 300 seconds for startup
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  periodSeconds: 10          # Normal health checks after startup
  failureThreshold: 3
```

## StatefulSets Deep Dive

### What Makes StatefulSets Different

**StatefulSets** provide guarantees that Deployments cannot:
- **Stable network identity** - Predictable DNS names
- **Stable storage identity** - Persistent volumes that follow the pod
- **Ordered deployment and scaling** - Pods start and stop in sequence
- **Ordered rolling updates** - Updates happen one pod at a time

### StatefulSet Identity

#### Predictable Pod Names
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: web-cluster
spec:
  serviceName: web-cluster
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: web
        image: nginx:latest

# Creates pods with predictable names:
# web-cluster-0, web-cluster-1, web-cluster-2
```

#### Stable DNS Names
```yaml
# Headless service for StatefulSet
apiVersion: v1
kind: Service
metadata:
  name: web-cluster
spec:
  clusterIP: None  # Headless service
  selector:
    app: web
  ports:
  - port: 80
    targetPort: 80

# Each pod gets stable DNS name:
# web-cluster-0.web-cluster.namespace.svc.cluster.local
# web-cluster-1.web-cluster.namespace.svc.cluster.local
# web-cluster-2.web-cluster.namespace.svc.cluster.local
```

### StatefulSet Storage

#### Persistent Volume Claims per Pod
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database-cluster
spec:
  serviceName: database-cluster
  replicas: 3
  volumeClaimTemplates:
  - metadata:
      name: data-volume
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
      storageClassName: fast-ssd
  template:
    spec:
      containers:
      - name: database
        image: postgres:14
        volumeMounts:
        - name: data-volume
          mountPath: /var/lib/postgresql/data

# Creates separate PVCs:
# data-volume-database-cluster-0
# data-volume-database-cluster-1  
# data-volume-database-cluster-2
```

#### Storage Persistence Across Pod Restarts
```bash
# If database-cluster-1 pod is deleted
kubectl delete pod database-cluster-1

# New database-cluster-1 pod is created
# It automatically gets the SAME PVC: data-volume-database-cluster-1
# All data is preserved!
```

### Ordered Operations

#### Sequential Startup
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: ordered-app
spec:
  serviceName: ordered-app
  replicas: 5
  podManagementPolicy: OrderedReady  # Default behavior
  template:
    spec:
      containers:
      - name: app
        image: myapp:latest

# Startup sequence:
# 1. ordered-app-0 starts and becomes Ready
# 2. ordered-app-1 starts and becomes Ready  
# 3. ordered-app-2 starts and becomes Ready
# 4. ordered-app-3 starts and becomes Ready
# 5. ordered-app-4 starts and becomes Ready
```

#### Parallel Startup (Alternative)
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: parallel-app
spec:
  serviceName: parallel-app
  replicas: 5
  podManagementPolicy: Parallel  # All pods start simultaneously
  template:
    spec:
      containers:
      - name: app
        image: myapp:latest

# All pods start at the same time, but still get stable names
```

### Real-World StatefulSet Examples

#### PostgreSQL Primary-Replica Cluster
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-cluster
  namespace: database
spec:
  serviceName: postgres-cluster
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  volumeClaimTemplates:
  - metadata:
      name: postgres-data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 200Gi
      storageClassName: high-iops-ssd
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:14
        env:
        - name: POSTGRES_DB
          value: myapp
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        
        # Configuration based on pod ordinal
        command:
        - bash
        - -c
        - |
          set -e
          
          # postgres-cluster-0 is always the primary
          if [[ $POD_NAME == *"-0" ]]; then
            echo "Starting as PRIMARY"
            exec postgres \
              -c wal_level=replica \
              -c max_wal_senders=3 \
              -c max_replication_slots=3 \
              -c hot_standby=on
          else
            echo "Starting as REPLICA"
            
            # Wait for primary to be ready
            until pg_isready -h postgres-cluster-0.postgres-cluster; do
              echo "Waiting for primary..."
              sleep 2
            done
            
            # Create replica from primary if data directory is empty
            if [ ! -f "$PGDATA/PG_VERSION" ]; then
              echo "Creating replica from primary"
              pg_basebackup \
                -h postgres-cluster-0.postgres-cluster \
                -D "$PGDATA" \
                -U postgres \
                -v -P -W
              
              # Configure as standby
              echo "standby_mode = 'on'" >> "$PGDATA/recovery.conf"
              echo "primary_conninfo = 'host=postgres-cluster-0.postgres-cluster port=5432 user=postgres'" >> "$PGDATA/recovery.conf"
            fi
            
            exec postgres -c hot_standby=on
          fi
        
        ports:
        - containerPort: 5432
          name: postgres
        
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
        
        livenessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - postgres
          initialDelaySeconds: 30
          periodSeconds: 10
        
        readinessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - postgres
          initialDelaySeconds: 5
          periodSeconds: 5
        
        resources:
          requests:
            memory: 2Gi
            cpu: 1000m
          limits:
            memory: 4Gi
            cpu: 2000m
```

#### Elasticsearch Cluster
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch
  namespace: search
spec:
  serviceName: elasticsearch
  replicas: 3
  selector:
    matchLabels:
      app: elasticsearch
  volumeClaimTemplates:
  - metadata:
      name: elasticsearch-data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 500Gi
      storageClassName: nvme-ssd
  template:
    metadata:
      labels:
        app: elasticsearch
    spec:
      initContainers:
      - name: init-sysctl
        image: busybox:1.35
        command:
        - sh
        - -c
        - |
          sysctl -w vm.max_map_count=262144
          echo 'vm.max_map_count=262144' >> /etc/sysctl.conf
        securityContext:
          privileged: true
      
      containers:
      - name: elasticsearch
        image: elasticsearch:8.5.0
        env:
        - name: cluster.name
          value: "elasticsearch-cluster"
        - name: node.name
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: discovery.seed_hosts
          value: "elasticsearch-0.elasticsearch,elasticsearch-1.elasticsearch,elasticsearch-2.elasticsearch"
        - name: cluster.initial_master_nodes
          value: "elasticsearch-0,elasticsearch-1,elasticsearch-2"
        - name: ES_JAVA_OPTS
          value: "-Xms4g -Xmx4g"
        - name: xpack.security.enabled
          value: "false"
        - name: xpack.monitoring.collection.enabled
          value: "true"
        
        ports:
        - containerPort: 9200
          name: http
        - containerPort: 9300
          name: transport
        
        volumeMounts:
        - name: elasticsearch-data
          mountPath: /usr/share/elasticsearch/data
        
        resources:
          requests:
            memory: 8Gi
            cpu: 2000m
          limits:
            memory: 8Gi
            cpu: 4000m
        
        readinessProbe:
          httpGet:
            path: /_cluster/health?local=true
            port: 9200
          initialDelaySeconds: 30
          periodSeconds: 10
        
        livenessProbe:
          httpGet:
            path: /_cluster/health?local=true
            port: 9200
          initialDelaySeconds: 90
          periodSeconds: 30
```

### StatefulSet Scaling

#### Scaling Up
```bash
# Scale from 3 to 5 replicas
kubectl scale statefulset elasticsearch --replicas=5

# Scaling process:
# 1. elasticsearch-3 created and waits to become Ready
# 2. elasticsearch-4 created and waits to become Ready
# 3. New pods join cluster automatically via discovery.seed_hosts
```

#### Scaling Down
```bash
# Scale from 5 to 3 replicas
kubectl scale statefulset elasticsearch --replicas=3

# Scaling process:
# 1. elasticsearch-4 deleted (highest ordinal first)
# 2. Wait for elasticsearch-4 to terminate completely
# 3. elasticsearch-3 deleted
# 4. PVCs remain (data preserved for potential scale-up)
```

**Important:** StatefulSets scale down in reverse order (highest ordinal first) to maintain consistency.

## DaemonSets Deep Dive

### What DaemonSets Do

**DaemonSets** ensure that exactly one pod runs on every (or selected) node in the cluster. As nodes are added or removed, DaemonSet pods are automatically created or cleaned up.

**Use Cases:**
- **Node monitoring agents** - Prometheus node exporter, Datadog agent
- **Log collection** - Fluentd, Fluent Bit, Filebeat
- **Network plugins** - CNI plugins, kube-proxy
- **Storage daemons** - Ceph, GlusterFS agents
- **Security scanning** - Vulnerability scanners, compliance checkers

### DaemonSet Behavior

#### Automatic Pod Placement
```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: monitoring-agent
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: monitoring-agent
  template:
    metadata:
      labels:
        app: monitoring-agent
    spec:
      containers:
      - name: agent
        image: monitoring-agent:latest

# Result: One pod per node
# Node1 → monitoring-agent-abc123
# Node2 → monitoring-agent-def456  
# Node3 → monitoring-agent-ghi789
```

#### Node Addition/Removal
```bash
# When new node joins cluster:
# 1. DaemonSet controller detects new node
# 2. Creates new pod on that node automatically

# When node is removed:
# 1. Pod on that node is deleted
# 2. No replacement created (node doesn't exist)
```

### Node Selection

#### NodeSelector
```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: gpu-monitoring
spec:
  selector:
    matchLabels:
      app: gpu-monitoring
  template:
    metadata:
      labels:
        app: gpu-monitoring
    spec:
      nodeSelector:
        hardware: gpu-nodes  # Only run on nodes with this label
      containers:
      - name: gpu-monitor
        image: gpu-monitor:latest
```

#### Node Affinity (More Advanced)
```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: log-collector
spec:
  selector:
    matchLabels:
      app: log-collector
  template:
    metadata:
      labels:
        app: log-collector
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: kubernetes.io/os
                operator: In
                values:
                - linux
              - key: node-type
                operator: NotIn
                values:
                - windows-nodes
      containers:
      - name: log-collector
        image: fluent-bit:latest
```

#### Tolerations for Tainted Nodes
```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-problem-detector
spec:
  selector:
    matchLabels:
      app: node-problem-detector
  template:
    metadata:
      labels:
        app: node-problem-detector
    spec:
      tolerations:
      # Run on master nodes despite taints
      - key: node-role.kubernetes.io/master
        effect: NoSchedule
        operator: Exists
      # Run on nodes with custom taints
      - key: dedicated
        operator: Equal
        value: monitoring
        effect: NoSchedule
      containers:
      - name: node-problem-detector
        image: k8s.gcr.io/node-problem-detector:v0.8.10
```

### Real-World DaemonSet Examples

#### Log Collection with Fluent Bit
```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit
  namespace: kube-system
  labels:
    app: fluent-bit
spec:
  selector:
    matchLabels:
      app: fluent-bit
  template:
    metadata:
      labels:
        app: fluent-bit
    spec:
      serviceAccountName: fluent-bit
      hostNetwork: true  # Use host networking for log collection
      dnsPolicy: ClusterFirstWithHostNet
      
      tolerations:
      # Run on all nodes including masters
      - operator: Exists
        effect: NoSchedule
      
      containers:
      - name: fluent-bit
        image: fluent/fluent-bit:2.0.8
        ports:
        - containerPort: 2020
          name: metrics
        
        env:
        - name: FLUENT_ELASTICSEARCH_HOST
          value: "elasticsearch.logging.svc.cluster.local"
        - name: FLUENT_ELASTICSEARCH_PORT
          value: "9200"
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        
        volumeMounts:
        # Access node's log files
        - name: varlog
          mountPath: /var/log
          readOnly: true
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
        - name: fluent-bit-config
          mountPath: /fluent-bit/etc
        
        resources:
          requests:
            memory: 64Mi
            cpu: 50m
          limits:
            memory: 128Mi
            cpu: 100m
      
      volumes:
      # Host paths for log access
      - name: varlog
        hostPath:
          path: /var/log
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
      - name: fluent-bit-config
        configMap:
          name: fluent-bit-config
```

#### Node Monitoring with Prometheus Node Exporter
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
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9100"
        prometheus.io/path: "/metrics"
    spec:
      hostNetwork: true   # Use host networking
      hostPID: true      # Access host process information
      
      securityContext:
        runAsNonRoot: true
        runAsUser: 65534  # nobody user
      
      containers:
      - name: node-exporter
        image: prom/node-exporter:v1.5.0
        args:
        - '--path.rootfs=/host'
        - '--path.procfs=/host/proc'
        - '--path.sysfs=/host/sys'
        - '--collector.filesystem.ignored-mount-points=^/(sys|proc|dev|host|etc|rootfs/var/lib/docker/containers|rootfs/var/lib/docker/overlay2|rootfs/run/docker/netns|rootfs/var/lib/docker/aufs)($$|/)'
        
        ports:
        - containerPort: 9100
          hostPort: 9100  # Expose on host port
          name: metrics
        
        volumeMounts:
        - name: proc
          mountPath: /host/proc
          readOnly: true
        - name: sys
          mountPath: /host/sys
          readOnly: true
        - name: root
          mountPath: /host
          readOnly: true
        
        resources:
          requests:
            memory: 32Mi
            cpu: 25m
          limits:
            memory: 64Mi
            cpu: 50m
      
      volumes:
      - name: proc
        hostPath:
          path: /proc
      - name: sys
        hostPath:
          path: /sys
      - name: root
        hostPath:
          path: /
      
      tolerations:
      - operator: Exists
        effect: NoSchedule
```

#### Network Plugin DaemonSet
```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: calico-node
  namespace: kube-system
spec:
  selector:
    matchLabels:
      k8s-app: calico-node
  template:
    metadata:
      labels:
        k8s-app: calico-node
    spec:
      hostNetwork: true
      serviceAccountName: calico-node
      
      tolerations:
      # Run on all nodes including masters and tainted nodes
      - operator: Exists
        effect: NoSchedule
      - operator: Exists
        effect: NoExecute
      
      initContainers:
      # Install CNI binaries
      - name: install-cni
        image: calico/cni:v3.24.0
        command: ["/install-cni.sh"]
        env:
        - name: CNI_CONF_NAME
          value: "10-calico.conflist"
        - name: CNI_NETWORK_CONFIG
          valueFrom:
            configMapKeyRef:
              name: calico-config
              key: cni_network_config
        volumeMounts:
        - mountPath: /host/opt/cni/bin
          name: cni-bin-dir
        - mountPath: /host/etc/cni/net.d
          name: cni-net-dir
      
      containers:
      - name: calico-node
        image: calico/node:v3.24.0
        env:
        - name: DATASTORE_TYPE
          value: "kubernetes"
        - name: FELIX_DEFAULTENDPOINTTOHOSTACTION
          value: "ACCEPT"
        - name: CALICO_NETWORKING_BACKEND
          value: "bird"
        - name: CLUSTER_TYPE
          value: "k8s,bgp"
        - name: CALICO_DISABLE_FILE_LOGGING
          value: "true"
        - name: FELIX_LOGSEVERITYSCREEN
          value: "info"
        - name: NODENAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        
        securityContext:
          privileged: true
        
        volumeMounts:
        - mountPath: /lib/modules
          name: lib-modules
          readOnly: true
        - mountPath: /run/xtables.lock
          name: xtables-lock
        - mountPath: /var/run/calico
          name: var-run-calico
        - mountPath: /var/lib/calico
          name: var-lib-calico
        
        livenessProbe:
          exec:
            command:
            - /bin/calico-node
            - -felix-live
          periodSeconds: 10
          initialDelaySeconds: 10
          failureThreshold: 6
        
        readinessProbe:
          exec:
            command:
            - /bin/calico-node
            - -felix-ready
          periodSeconds: 10
      
      volumes:
      - name: lib-modules
        hostPath:
          path: /lib/modules
      - name: var-run-calico
        hostPath:
          path: /var/run/calico
      - name: var-lib-calico
        hostPath:
          path: /var/lib/calico
      - name: xtables-lock
        hostPath:
          path: /run/xtables.lock
          type: FileOrCreate
      - name: cni-bin-dir
        hostPath:
          path: /opt/cni/bin
      - name: cni-net-dir
        hostPath:
          path: /etc/cni/net.d
```

### DaemonSet Updates

#### Rolling Update Strategy
```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: monitoring-agent
spec:
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1  # Update one node at a time
  selector:
    matchLabels:
      app: monitoring-agent
  template:
    metadata:
      labels:
        app: monitoring-agent
    spec:
      containers:
      - name: agent
        image: monitoring-agent:v2.0.0  # New version
```

**Rolling Update Process:**
1. **Select node** - Choose node for update based on maxUnavailable
2. **Delete old pod** - Remove existing pod from node
3. **Create new pod** - Start new version on same node
4. **Wait for ready** - Ensure new pod passes health checks
5. **Repeat** - Move to next node

#### OnDelete Strategy
```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: critical-agent
spec:
  updateStrategy:
    type: OnDelete  # Manual control over updates
  template:
    spec:
      containers:
      - name: agent
        image: critical-agent:v2.0.0
```

**OnDelete Process:**
```bash
# Updates only happen when you manually delete pods
kubectl delete pod critical-agent-abc123  # Pod on node1
# New pod created with updated image

kubectl delete pod critical-agent-def456  # Pod on node2  
# New pod created with updated image

# Gives you complete control over update timing
```

## Jobs and CronJobs Deep Dive

### Jobs - Run-to-Completion Tasks

**Jobs** run pods to completion and ensure they succeed. Unlike Deployments that keep pods running, Jobs run pods until they finish successfully.

#### Basic Job
```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-processing
spec:
  completions: 1           # How many pods must complete successfully
  parallelism: 1          # How many pods run simultaneously
  backoffLimit: 3         # Max retries on failure
  activeDeadlineSeconds: 600  # Job timeout (10 minutes)
  
  template:
    metadata:
      labels:
        app: data-processor
    spec:
      restartPolicy: Never  # Jobs must use Never or OnFailure
      containers:
      - name: processor
        image: data-processor:latest
        command: ["python", "process_data.py"]
        env:
        - name: INPUT_FILE
          value: "/data/input.csv"
        - name: OUTPUT_FILE
          value: "/data/output.json"
        volumeMounts:
        - name: data-volume
          mountPath: /data
      volumes:
      - name: data-volume
        persistentVolumeClaim:
          claimName: data-pvc
```

#### Parallel Processing Job
```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: batch-image-resize
spec:
  completions: 100        # Process 100 images total
  parallelism: 10         # Process 10 images at a time
  backoffLimit: 5
  
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: image-resizer
        image: image-processor:latest
        command: ["./resize-image.sh"]
        env:
        - name: JOB_COMPLETION_INDEX
          valueFrom:
            fieldRef:
              fieldPath: metadata.annotations['batch.kubernetes.io/job-completion-index']
        # Script uses JOB_COMPLETION_INDEX to determine which image to process
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 1000m
            memory: 2Gi
```

#### Database Migration Job
```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: database-migration-v2-1-0
  namespace: production
spec:
  completions: 1
  parallelism: 1
  backoffLimit: 2  # Only retry twice for database migrations
  activeDeadlineSeconds: 1800  # 30 minute timeout
  
  template:
    metadata:
      labels:
        app: database-migration
        version: v2.1.0
    spec:
      restartPolicy: Never
      serviceAccountName: migration-sa
      
      initContainers:
      # Wait for database to be ready
      - name: wait-for-db
        image: postgres:14
        command:
        - sh
        - -c
        - |
          until pg_isready -h postgres.database.svc.cluster.local -p 5432; do
            echo "Waiting for database..."
            sleep 2
          done
          echo "Database is ready!"
      
      containers:
      - name: migrate
        image: myapp/migrator:v2.1.0
        command: ["./migrate"]
        args: ["up", "--target=20240101120000"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: url
        - name: MIGRATION_TIMEOUT
          value: "1200"  # 20 minutes
        
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
```

### CronJobs - Scheduled Tasks

**CronJobs** create Jobs on a schedule, like cron in Unix systems.

#### Basic CronJob
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup-job
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM UTC
  timezone: "America/New_York"  # Convert to specific timezone
  concurrencyPolicy: Forbid      # Don't run if previous job still running
  failedJobsHistoryLimit: 3      # Keep 3 failed jobs for debugging
  successfulJobsHistoryLimit: 1  # Keep 1 successful job
  suspend: false                 # Set to true to pause cron job
  
  jobTemplate:
    spec:
      completions: 1
      backoffLimit: 2
      activeDeadlineSeconds: 3600  # 1 hour timeout
      
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: backup
            image: backup-tool:latest
            command: ["./backup.sh"]
            env:
            - name: BACKUP_TARGET
              value: "s3://my-backup-bucket/daily/"
            - name: SOURCE_PATH
              value: "/data"
            volumeMounts:
            - name: data-to-backup
              mountPath: /data
              readOnly: true
          volumes:
          - name: data-to-backup
            persistentVolumeClaim:
              claimName: application-data
```

#### Advanced CronJob with Multiple Schedules
```yaml
# Daily database backup
apiVersion: batch/v1
kind: CronJob
metadata:
  name: database-backup-daily
spec:
  schedule: "0 2 * * *"  # 2 AM daily
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 7   # Keep a week of backups
  failedJobsHistoryLimit: 3
  
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          serviceAccountName: backup-sa
          containers:
          - name: pg-dump
            image: postgres:14
            command:
            - sh
            - -c
            - |
              TIMESTAMP=$(date +%Y%m%d_%H%M%S)
              BACKUP_FILE="/backup/daily_backup_${TIMESTAMP}.sql"
              
              echo "Starting backup at $(date)"
              pg_dump -h postgres.database.svc.cluster.local \
                      -U postgres \
                      -d myapp \
                      --no-password \
                      --compress=9 \
                      --file=${BACKUP_FILE}
              
              echo "Backup completed: ${BACKUP_FILE}"
              
              # Upload to S3
              aws s3 cp ${BACKUP_FILE} s3://my-backup-bucket/database/daily/
              
              # Clean up local file
              rm ${BACKUP_FILE}
              
              echo "Backup uploaded and cleaned up at $(date)"
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: password
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: aws-credentials
                  key: access-key-id
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: aws-credentials
                  key: secret-access-key
            volumeMounts:
            - name: backup-temp
              mountPath: /backup
          volumes:
          - name: backup-temp
            emptyDir:
              sizeLimit: 10Gi
---
# Weekly full backup with retention cleanup
apiVersion: batch/v1
kind: CronJob
metadata:
  name: database-backup-weekly
spec:
  schedule: "0 1 * * 0"  # 1 AM every Sunday
  concurrencyPolicy: Forbid
  
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          serviceAccountName: backup-sa
          containers:
          - name: full-backup-with-cleanup
            image: postgres:14
            command:
            - sh
            - -c
            - |
              TIMESTAMP=$(date +%Y%m%d_%H%M%S)
              BACKUP_FILE="/backup/weekly_backup_${TIMESTAMP}.sql"
              
              echo "Starting weekly backup at $(date)"
              
              # Full backup with all data and schema
              pg_dump -h postgres.database.svc.cluster.local \
                      -U postgres \
                      -d myapp \
                      --no-password \
                      --compress=9 \
                      --clean \
                      --if-exists \
                      --file=${BACKUP_FILE}
              
              # Upload to S3
              aws s3 cp ${BACKUP_FILE} s3://my-backup-bucket/database/weekly/
              
              # Clean up old backups (keep last 4 weeks)
              aws s3 ls s3://my-backup-bucket/database/weekly/ | \
                sort | \
                head -n -4 | \
                awk '{print $4}' | \
                xargs -I {} aws s3 rm s3://my-backup-bucket/database/weekly/{}
              
              rm ${BACKUP_FILE}
              echo "Weekly backup and cleanup completed at $(date)"
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: password
            volumeMounts:
            - name: backup-temp
              mountPath: /backup
          volumes:
          - name: backup-temp
            emptyDir:
              sizeLimit: 20Gi
```

#### Log Cleanup CronJob
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: log-cleanup
  namespace: kube-system
spec:
  schedule: "0 3 * * *"  # 3 AM daily
  concurrencyPolicy: Allow  # Can run multiple cleanup jobs
  
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          hostNetwork: true  # Access host filesystem
          
          tolerations:
          - operator: Exists  # Run on all nodes
            effect: NoSchedule
          
          containers:
          - name: log-cleaner
            image: busybox:1.35
            command:
            - sh
            - -c
            - |
              echo "Starting log cleanup on node: $(hostname)"
              
              # Clean up old container logs (older than 7 days)
              find /var/log/containers/ -name "*.log" -mtime +7 -delete
              
              # Clean up old pod logs
              find /var/log/pods/ -name "*.log" -mtime +7 -delete
              
              # Clean up old audit logs
              find /var/log/audit/ -name "*.log" -mtime +30 -delete
              
              # Report disk usage
              echo "Disk usage after cleanup:"
              df -h /var/log/
              
              echo "Log cleanup completed on $(hostname)"
            
            volumeMounts:
            - name: var-log
              mountPath: /var/log
            - name: var-log-containers
              mountPath: /var/log/containers
            - name: var-log-pods
              mountPath: /var/log/pods
          
          volumes:
          - name: var-log
            hostPath:
              path: /var/log
          - name: var-log-containers
            hostPath:
              path: /var/log/containers
          - name: var-log-pods
            hostPath:
              path: /var/log/pods
```

### Job Patterns and Best Practices

#### Job with Initialization
```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-import-with-setup
spec:
  template:
    spec:
      restartPolicy: Never
      
      initContainers:
      # Download data files
      - name: download-data
        image: alpine/curl:latest
        command:
        - sh
        - -c
        - |
          curl -o /shared/data1.csv https://example.com/data1.csv
          curl -o /shared/data2.csv https://example.com/data2.csv
          curl -o /shared/schema.sql https://example.com/schema.sql
        volumeMounts:
        - name: shared-data
          mountPath: /shared
      
      # Setup database schema
      - name: setup-schema
        image: postgres:14
        command:
        - sh
        - -c
        - |
          psql -h postgres.database.svc.cluster.local \
               -U postgres \
               -d myapp \
               -f /shared/schema.sql
        env:
        - name: PGPASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: password
        volumeMounts:
        - name: shared-data
          mountPath: /shared
      
      containers:
      # Main processing job
      - name: import-data
        image: data-importer:latest
        command: ["python", "import_data.py"]
        args: ["--input-dir", "/shared", "--batch-size", "1000"]
        volumeMounts:
        - name: shared-data
          mountPath: /shared
        resources:
          requests:
            cpu: 1000m
            memory: 2Gi
          limits:
            cpu: 2000m
            memory: 4Gi
      
      volumes:
      - name: shared-data
        emptyDir:
          sizeLimit: 5Gi
```

## HorizontalPodAutoscaler (HPA) Deep Dive

### What HPA Does

**HorizontalPodAutoscaler** automatically scales the number of pods in a deployment, replica set, or stateful set based on observed CPU utilization, memory usage, or custom metrics.

**Scaling Logic:**
```
Target Metric Value = (Current Metric Value / Desired Metric Value) × Current Replicas
```

### CPU-Based Scaling
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-app-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  minReplicas: 3              # Minimum pods
  maxReplicas: 20             # Maximum pods
  targetCPUUtilizationPercentage: 70  # Target 70% CPU usage
  
  behavior:                   # Advanced scaling behavior
    scaleDown:
      stabilizationWindowSeconds: 300  # Wait 5 minutes before scaling down
      policies:
      - type: Percent
        value: 10             # Scale down max 10% of pods at once
        periodSeconds: 60     # Every minute
    scaleUp:
      stabilizationWindowSeconds: 60   # Wait 1 minute before scaling up
      policies:
      - type: Percent
        value: 50             # Scale up max 50% of pods at once
        periodSeconds: 60
      - type: Pods
        value: 2              # Or add max 2 pods at once
        periodSeconds: 60
```

**CPU Scaling Process:**
```bash
# Example scenario:
# Current: 5 pods averaging 85% CPU
# Target: 70% CPU
# Calculation: (85% / 70%) × 5 = 6.07 → Scale up to 6 pods

# Next check:
# Current: 6 pods averaging 60% CPU  
# Target: 70% CPU
# Calculation: (60% / 70%) × 6 = 5.14 → Scale down to 5 pods
```

### Memory-Based Scaling
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: memory-intensive-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: memory-app
  minReplicas: 2
  maxReplicas: 15
  metrics:
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80  # Target 80% memory usage
```

### Multi-Metric Scaling
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: complex-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 5
  maxReplicas: 50
  metrics:
  # CPU metric
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  # Memory metric  
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  # Custom metric from Prometheus
  - type: External
    external:
      metric:
        name: http_requests_per_second
        selector:
          matchLabels:
            service: api-server
      target:
        type: Value
        value: "100"  # Scale when > 100 requests/second per pod
```

### Custom Metrics Scaling

#### Prometheus Adapter Setup
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: adapter-config
  namespace: monitoring
data:
  config.yaml: |
    rules:
    - seriesQuery: 'http_requests{namespace!="",pod!=""}'
      resources:
        overrides:
          namespace: {resource: "namespace"}
          pod: {resource: "pod"}
      name:
        matches: "^(.*)_total"
        as: "${1}_per_second"
      metricsQuery: 'rate(<<.Series>>{<<.LabelMatchers>>}[2m])'
    - seriesQuery: 'queue_length{namespace!="",pod!=""}'
      resources:
        overrides:
          namespace: {resource: "namespace"}
          pod: {resource: "pod"}
      name:
        as: "queue_length"
      metricsQuery: '<<.Series>>{<<.LabelMatchers>>}'
```

#### Queue Length Based Scaling
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: queue-processor-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: queue-processor
  minReplicas: 1
  maxReplicas: 20
  metrics:
  - type: Pods
    pods:
      metric:
        name: queue_length
      target:
        type: AverageValue
        averageValue: "5"  # Target 5 queue items per pod
```

### HPA Requirements

#### Resource Requests Must Be Set
```yaml
# HPA requires resource requests to calculate utilization
apiVersion: apps/v1
kind: Deployment
metadata:
  name: scalable-app
spec:
  template:
    spec:
      containers:
      - name: app
        image: myapp:latest
        resources:
          requests:
            cpu: 200m      # REQUIRED for CPU-based HPA
            memory: 256Mi  # REQUIRED for memory-based HPA
          limits:
            cpu: 500m
            memory: 512Mi
```

#### Metrics Server Required
```bash
# Check if metrics server is installed
kubectl get deployment metrics-server -n kube-system

# Install metrics server if missing
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### HPA Status and Debugging
```bash
# Check HPA status
kubectl get hpa

# Detailed HPA information
kubectl describe hpa web-app-hpa

# Check current metrics
kubectl top pods

# HPA events
kubectl get events --field-selector involvedObject.name=web-app-hpa
```

**Example HPA Status:**
```bash
$ kubectl get hpa
NAME          REFERENCE               TARGETS    MINPODS   MAXPODS   REPLICAS   AGE
web-app-hpa   Deployment/web-app      65%/70%    3         20        8          5m

# TARGETS shows: current_cpu/target_cpu
# 65%/70% means current CPU is 65%, target is 70%
# Currently running 8 replicas (within 3-20 range)
```

## Key Concepts Summary
- **Controllers** - Manage pods to maintain desired state through continuous reconciliation loops
- **Deployments** - Stateless applications with rolling updates, rollbacks, and replica management
- **ReplicaSets** - Lower-level replica management, usually controlled by Deployments
- **StatefulSets** - Stateful applications with stable identity, ordered operations, and persistent storage
- **DaemonSets** - One pod per node for system-level services like monitoring and logging
- **Jobs** - Run-to-completion tasks with configurable parallelism and retry logic
- **CronJobs** - Scheduled tasks using cron syntax with job history management
- **HPA** - Automatic horizontal scaling based on CPU, memory, or custom metrics
- **Health Probes** - Liveness, readiness, and startup probes for container health monitoring
- **Update Strategies** - Rolling updates vs recreate for different application requirements

## Best Practices / Tips

1. **Use Deployments for stateless apps** - Don't create ReplicaSets directly
2. **Set resource requests/limits** - Required for HPA and proper scheduling
3. **Configure health probes** - Essential for reliable rolling updates and load balancing
4. **Use StatefulSets for databases** - Provides stable identity and ordered operations
5. **DaemonSets for node services** - Monitoring, logging, and network plugins
6. **Jobs for batch processing** - Use appropriate parallelism and retry settings
7. **CronJob scheduling** - Consider timezone and concurrency policies
8. **HPA scaling policies** - Configure appropriate min/max replicas and scaling behavior
9. **Update strategies** - Use rolling updates for zero-downtime deployments
10. **Monitor controller events** - Watch for scheduling and scaling issues

## Common Issues / Troubleshooting

### Problem 1: Deployment Stuck in Rolling Update
- **Symptom:** New pods create but old pods don't terminate, or update hangs
- **Cause:** Readiness probe failures, insufficient resources, or pod disruption budgets
- **Solution:** Check pod events, readiness probes, and available resources

```bash
# Check rollout status
kubectl rollout status deployment/myapp

# Check pod events
kubectl describe pod new-pod-name

# Check resource availability
kubectl describe node node-name

# Force restart if needed
kubectl rollout restart deployment/myapp
```

### Problem 2: StatefulSet Pod Stuck in Pending
- **Symptom:** StatefulSet pod won't start, stays in Pending state
- **Cause:** PVC provisioning failure, node affinity, or resource constraints
- **Solution:** Check PVC status, storage class, and node capacity

```bash
# Check PVC status
kubectl get pvc

# Check storage class
kubectl describe storageclass fast-ssd

# Check pod scheduling
kubectl describe pod statefulset-pod-0
```

### Problem 3: DaemonSet Pod Not on All Nodes
- **Symptom:** DaemonSet missing from some nodes
- **Cause:** Node taints, node selectors, or resource constraints
- **Solution:** Check node taints, tolerations, and resource availability

```bash
# Check node taints
kubectl describe node node-name | grep Taints

# Check DaemonSet tolerations
kubectl describe daemonset monitoring-agent

# Check if nodes match selectors
kubectl get nodes --show-labels
```

### Problem 4: Job Never Completes
- **Symptom:** Job pods keep restarting or failing
- **Cause:** Application errors, resource limits, or incorrect restart policy
- **Solution:** Check pod logs, resource usage, and job configuration

```bash
# Check job status
kubectl describe job batch-processing

# Check pod logs
kubectl logs job-pod-name

# Check completed/failed pods
kubectl get pods --show-all
```

### Problem 5: HPA Not Scaling
- **Symptom:** HPA shows metrics but doesn't scale pods
- **Cause:** Missing resource requests, metrics server issues, or scaling policies
- **Solution:** Verify resource requests, metrics server, and HPA configuration

```bash
# Check HPA status
kubectl describe hpa myapp-hpa

# Check metrics server
kubectl top pods

# Check resource requests in deployment
kubectl describe deployment myapp
```

## References / Further Reading
- [Kubernetes Workloads Documentation](https://kubernetes.io/docs/concepts/workloads/)
- [Deployments Guide](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [StatefulSets Documentation](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)
- [DaemonSets Guide](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)
- [Jobs Documentation](https://kubernetes.io/docs/concepts/workloads/controllers/job/)
- [CronJobs Guide](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/)
- [HPA Documentation](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [Pod Lifecycle Guide](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Resource Management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)