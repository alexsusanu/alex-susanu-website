# Kubernetes Workloads
category: DevOps
tags: kubernetes, k8s, deployment, replicaset, daemonset, job, cronjob

## Deployment

**What it is:** A Kubernetes resource that manages a set of identical pods, providing declarative updates and rollback capabilities for stateless applications.

**Why it matters:** Deployments are the primary way to run applications in Kubernetes. They provide high availability, scaling, rolling updates, and rollback capabilities, making them essential for production workloads.

**Key features:**
- **Declarative updates** - Describe desired state, Kubernetes makes it happen
- **Rolling updates** - Zero-downtime deployments by gradually replacing pods
- **Rollback capability** - Easy revert to previous versions
- **Scaling** - Horizontal scaling by adjusting replica count
- **Self-healing** - Automatically replaces failed pods

**Deployment vs ReplicaSet:**
- **Deployment** - Higher-level abstraction that manages ReplicaSets
- **ReplicaSet** - Lower-level resource that maintains pod replicas
- **Relationship** - Deployment creates and manages ReplicaSets for you

**Deployment strategies:**
- **RollingUpdate** (default) - Gradually replace old pods with new ones
- **Recreate** - Kill all old pods before creating new ones (downtime)

**Common commands:**
```bash
# Creating deployments
kubectl create deployment nginx --image=nginx:1.21    # Create simple deployment
kubectl apply -f deployment.yaml                      # Create from YAML file

# Managing deployments
kubectl get deployments                               # List all deployments
kubectl describe deployment <name>                    # Detailed deployment info
kubectl delete deployment <name>                      # Delete deployment

# Scaling
kubectl scale deployment <name> --replicas=5          # Scale to 5 replicas
kubectl autoscale deployment <name> --min=2 --max=10 --cpu-percent=80  # Auto-scaling

# Updates and rollouts
kubectl set image deployment/<name> container=nginx:1.22  # Update image
kubectl rollout status deployment/<name>              # Check rollout status
kubectl rollout history deployment/<name>             # View rollout history
kubectl rollout undo deployment/<name>                # Rollback to previous version
kubectl rollout undo deployment/<name> --to-revision=2  # Rollback to specific revision

# Editing deployments
kubectl edit deployment <name>                        # Edit deployment live
kubectl patch deployment <name> -p '{"spec":{"replicas":3}}'  # Patch specific field
```

**Example Deployment YAML:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  labels:
    app: web-app
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1          # Max pods above desired replica count
      maxUnavailable: 1    # Max pods that can be unavailable during update
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: web-container
        image: nginx:1.21
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "64Mi"
            cpu: "250m"
          limits:
            memory: "128Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
```

**Rolling update process:**
1. **New ReplicaSet created** - For the new version
2. **Gradual scaling** - New pods added, old pods removed
3. **Health checks** - Ensure new pods are ready before removing old ones
4. **Completion** - All replicas running new version

**When you'll use it:** Every stateless application in Kubernetes should use Deployments. Web servers, APIs, microservices, and most applications benefit from Deployment features.

## ReplicaSet

**What it is:** A Kubernetes resource that ensures a specified number of pod replicas are running at any given time.

**Why it matters:** ReplicaSets provide the foundation for high availability and scaling in Kubernetes. While you typically don't create them directly (Deployments do), understanding them helps with troubleshooting and understanding Kubernetes architecture.

**Key responsibilities:**
- **Maintain replica count** - Ensure desired number of pods are running
- **Pod creation** - Create new pods when needed
- **Pod deletion** - Remove excess pods when scaling down
- **Label matching** - Use selectors to identify which pods to manage

**ReplicaSet vs ReplicationController:**
- **ReplicaSet** - Newer, supports set-based label selectors
- **ReplicationController** - Older, only equality-based selectors
- **Recommendation** - Use Deployments, which create ReplicaSets

**How ReplicaSets work:**
1. **Selector matching** - Find pods matching label selector
2. **Count comparison** - Compare actual vs desired replica count
3. **Reconciliation** - Create or delete pods to match desired state
4. **Continuous monitoring** - Constantly watch for changes

**Common commands:**
```bash
# ReplicaSet operations (usually managed by Deployments)
kubectl get replicasets                               # List all ReplicaSets
kubectl get rs                                       # Short form
kubectl describe replicaset <name>                    # Detailed ReplicaSet info
kubectl delete replicaset <name>                      # Delete ReplicaSet (and its pods)

# Scaling ReplicaSet directly (not recommended)
kubectl scale replicaset <name> --replicas=5         # Scale ReplicaSet

# Troubleshooting
kubectl get rs -o wide                               # ReplicaSets with additional info
kubectl get pods --show-labels                       # See pod labels
```

**Example ReplicaSet YAML:**
```yaml
apiVersion: apps/v1
kind: ReplicaSet
metadata:
  name: web-replicaset
  labels:
    app: web
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
      version: v1
  template:
    metadata:
      labels:
        app: web
        version: v1
    spec:
      containers:
      - name: web-container
        image: nginx:1.21
        ports:
        - containerPort: 80
```

**Label selector types:**
```yaml
# Equality-based selector
selector:
  matchLabels:
    app: web
    env: prod

# Set-based selector
selector:
  matchExpressions:
  - key: app
    operator: In
    values: [web, api]
  - key: env
    operator: NotIn
    values: [dev]
```

**When you'll use it:** You typically won't create ReplicaSets directly. Deployments manage them for you. Understanding ReplicaSets helps with troubleshooting pod creation issues and understanding Kubernetes internals.

## DaemonSet

**What it is:** A Kubernetes resource that ensures all (or some) nodes run a copy of a specific pod, typically used for node-level services.

**Why it matters:** DaemonSets are essential for cluster-wide services that need to run on every node, such as logging agents, monitoring collectors, and network plugins. They provide node-level functionality that regular Deployments can't.

**Common use cases:**
- **Logging agents** - Fluentd, Filebeat collecting logs from each node
- **Monitoring agents** - Node exporter, Datadog agent monitoring node metrics
- **Network plugins** - CNI components, kube-proxy
- **Storage daemons** - Ceph, GlusterFS storage components
- **Security agents** - Vulnerability scanners, compliance checkers

**DaemonSet behavior:**
- **Node coverage** - Automatically schedules pods on new nodes
- **Node removal** - Removes pods when nodes are deleted
- **Node selection** - Can target specific nodes using node selectors
- **Rolling updates** - Supports updating pods across nodes

**DaemonSet vs Deployment:**
- **DaemonSet** - One pod per node, follows node lifecycle
- **Deployment** - Specified replica count, scheduler places pods anywhere

**Common commands:**
```bash
# DaemonSet operations
kubectl get daemonsets                               # List all DaemonSets
kubectl get ds                                      # Short form
kubectl describe daemonset <name>                    # Detailed DaemonSet info
kubectl delete daemonset <name>                      # Delete DaemonSet

# DaemonSet status
kubectl get ds -o wide                              # DaemonSets with node info
kubectl rollout status daemonset/<name>             # Check rollout status
kubectl rollout history daemonset/<name>            # View rollout history

# Troubleshooting
kubectl get pods -l app=<daemonset-label> -o wide   # See DaemonSet pods on nodes
kubectl describe node <node-name>                   # Check node for DaemonSet pods
```

**Example DaemonSet YAML (Log collector):**
```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: log-collector
  labels:
    app: log-collector
spec:
  selector:
    matchLabels:
      app: log-collector
  template:
    metadata:
      labels:
        app: log-collector
    spec:
      containers:
      - name: log-collector
        image: fluentd:v1.14
        resources:
          limits:
            memory: 200Mi
            cpu: 100m
          requests:
            memory: 100Mi
            cpu: 50m
        volumeMounts:
        - name: varlog
          mountPath: /var/log
          readOnly: true
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
      tolerations:
      - key: node-role.kubernetes.io/master
        effect: NoSchedule
```

**Node selection:**
```yaml
# Run on specific nodes only
spec:
  template:
    spec:
      nodeSelector:
        disktype: ssd
      # or
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: kubernetes.io/arch
                operator: In
                values: [amd64]
```

**When you'll use it:** DaemonSets are used for cluster infrastructure components. You'll encounter them when setting up logging, monitoring, networking, or any service that needs to run on every node.

## Job

**What it is:** A Kubernetes resource that runs pods to completion, ensuring that a specified number of pods successfully terminate, typically used for batch processing and one-time tasks.

**Why it matters:** Jobs handle batch workloads, data processing, backups, and other tasks that need to run once or periodically. Unlike Deployments that keep pods running, Jobs ensure tasks complete successfully.

**Job types:**
- **Single job** - Run one pod to completion
- **Parallel jobs with fixed completion count** - Run N pods to completion
- **Parallel jobs with work queue** - Multiple pods process items from queue

**Job completion patterns:**
- **completions** - Number of successful pod completions needed
- **parallelism** - Number of pods running simultaneously
- **backoffLimit** - Number of retries before marking job as failed

**Job behavior:**
- **Pod creation** - Creates pods based on template
- **Failure handling** - Restarts failed pods (up to backoffLimit)
- **Completion tracking** - Tracks successful completions
- **Cleanup** - Keeps completed pods for log inspection (by default)

**Common commands:**
```bash
# Job operations
kubectl create job hello --image=busybox -- echo "Hello World"  # Create simple job
kubectl get jobs                                    # List all jobs
kubectl describe job <name>                         # Detailed job info
kubectl delete job <name>                           # Delete job

# Job monitoring
kubectl logs job/<name>                             # View job logs
kubectl get pods --selector=job-name=<name>         # Get job's pods
kubectl wait --for=condition=complete job/<name>    # Wait for job completion

# Job cleanup
kubectl delete job <name> --cascade=false          # Delete job but keep pods
ttlSecondsAfterFinished: 100  # Auto-cleanup in job spec
```

**Example Job YAML (Simple batch job):**
```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-processor
spec:
  completions: 1          # Number of successful completions needed
  parallelism: 1          # Number of pods running in parallel
  backoffLimit: 3         # Number of retries before giving up
  ttlSecondsAfterFinished: 3600  # Cleanup job after 1 hour
  template:
    spec:
      restartPolicy: Never  # Jobs must use Never or OnFailure
      containers:
      - name: processor
        image: busybox
        command: ["sh", "-c"]
        args:
        - |
          echo "Starting data processing..."
          sleep 30
          echo "Processing complete"
          # Simulate work and exit
          exit 0
        resources:
          requests:
            memory: "64Mi"
            cpu: "250m"
          limits:
            memory: "128Mi"
            cpu: "500m"
```

**Parallel job example:**
```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: parallel-processor
spec:
  completions: 10         # Need 10 successful completions
  parallelism: 3          # Run 3 pods at a time
  backoffLimit: 6         # Allow some failures
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: worker
        image: busybox
        command: ["sh", "-c", "echo Processing item $RANDOM && sleep 10"]
```

**When you'll use it:** Jobs are perfect for batch processing, database migrations, backups, data imports/exports, and any task that needs to run to completion rather than continuously.

## CronJob

**What it is:** A Kubernetes resource that creates Jobs on a recurring schedule, similar to Unix cron, for running periodic tasks.

**Why it matters:** CronJobs enable scheduled automation in Kubernetes - backups, reports, cleanup tasks, and maintenance operations. They're essential for operational tasks that need to run regularly.

**CronJob features:**
- **Cron syntax** - Standard cron expressions for scheduling
- **Job template** - Defines what to run (creates Jobs)
- **Concurrency control** - Handle overlapping executions
- **History limits** - Control how many completed/failed jobs to keep
- **Timezone support** - Schedule in specific timezones

**Cron expression format:**
```
# ┌───────────── minute (0 - 59)
# │ ┌───────────── hour (0 - 23)
# │ │ ┌───────────── day of month (1 - 31)
# │ │ │ ┌───────────── month (1 - 12)
# │ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
# │ │ │ │ │
# * * * * *
```

**Common cron patterns:**
- `0 2 * * *` - Daily at 2 AM
- `0 2 * * 0` - Weekly on Sunday at 2 AM
- `0 0 1 * *` - Monthly on 1st at midnight
- `*/15 * * * *` - Every 15 minutes
- `0 9-17 * * 1-5` - Every hour from 9 AM to 5 PM, Monday to Friday

**Common commands:**
```bash
# CronJob operations
kubectl create cronjob backup --image=busybox --schedule="0 2 * * *" -- /bin/sh -c "echo Backup started"
kubectl get cronjobs                                # List all CronJobs
kubectl get cj                                     # Short form
kubectl describe cronjob <name>                    # Detailed CronJob info
kubectl delete cronjob <name>                      # Delete CronJob

# CronJob management
kubectl get jobs --selector=cronjob=<name>         # Get jobs created by CronJob
kubectl create job --from=cronjob/<name> manual-run  # Manually trigger CronJob
kubectl patch cronjob <name> -p '{"spec":{"suspend":true}}'  # Suspend CronJob
kubectl patch cronjob <name> -p '{"spec":{"suspend":false}}' # Resume CronJob
```

**Example CronJob YAML (Database backup):**
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: database-backup
spec:
  schedule: "0 2 * * *"                    # Daily at 2 AM
  timeZone: "America/New_York"             # Optional: specify timezone
  concurrencyPolicy: Forbid                # Don't allow overlapping jobs
  successfulJobsHistoryLimit: 3            # Keep 3 successful jobs
  failedJobsHistoryLimit: 1                # Keep 1 failed job
  startingDeadlineSeconds: 3600            # Start within 1 hour of scheduled time
  jobTemplate:
    spec:
      completions: 1
      backoffLimit: 2
      ttlSecondsAfterFinished: 86400       # Cleanup after 24 hours
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: backup
            image: postgres:13
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: password
            command: ["/bin/bash"]
            args:
            - -c
            - |
              echo "Starting backup at $(date)"
              pg_dump -h postgres-service -U myuser mydb > /backup/backup-$(date +%Y%m%d-%H%M%S).sql
              echo "Backup completed at $(date)"
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-pvc
```

**Concurrency policies:**
- **Allow** (default) - Allow concurrent jobs
- **Forbid** - Skip new job if previous still running
- **Replace** - Cancel running job and start new one

**CronJob monitoring:**
```bash
# Check CronJob status
kubectl get cronjob <name> -o wide

# View recent jobs created by CronJob
kubectl get jobs -l cronjob=<name> --sort-by=.metadata.creationTimestamp

# Check logs of latest job
kubectl logs job/<cronjob-name>-<timestamp>
```

**When you'll use it:** CronJobs are essential for operational automation - database backups, log rotation, report generation, system maintenance, cleanup tasks, and any scheduled operations in your cluster.