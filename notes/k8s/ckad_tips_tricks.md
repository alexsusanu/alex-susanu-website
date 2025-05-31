# CKAD Exam Tips & Tricks
category: Kubernetes Certification
tags: ckad, kubernetes, exam, kubectl, certification

## Essential kubectl run Variations

### Resource Type Control
```bash
# Create POD directly (most common for CKAD)
kubectl run nginx --image=nginx --restart=Never
# USE WHEN: Question asks for "pod", "container", or single instance

# Create DEPLOYMENT (default behavior)
kubectl run nginx --image=nginx --restart=Always
# USE WHEN: Question asks for "deployment", "scale", or multiple replicas

# Create JOB (run once, exit)
kubectl run pi --image=perl --restart=OnFailure -- perl -Mbignum=bpi -wle 'print bpi(2000)'
# USE WHEN: Question asks for "job", "batch processing", or "run once"

# Create CRONJOB
kubectl create cronjob busybox --image=busybox --schedule="*/1 * * * *" -- /bin/sh -c 'echo hello'
# USE WHEN: Question asks for "scheduled", "cron", or "periodic"
```

### YAML Generation (CRITICAL for Speed)
```bash
# Generate YAML without creating resource
kubectl run nginx --image=nginx --restart=Never --dry-run=client -o yaml > pod.yaml
# USE WHEN: Need to modify YAML before creating (add volumes, env vars, etc.)

# Create and save YAML simultaneously  
kubectl run nginx --image=nginx --restart=Never -o yaml | tee pod.yaml | kubectl apply -f -
# USE WHEN: Want both the resource created AND YAML saved

# Quick YAML inspection
kubectl run nginx --image=nginx --restart=Never --dry-run=client -o yaml
# USE WHEN: Just want to see what YAML would be generated
```

## Time-Saving kubectl Shortcuts

### Resource Creation Shortcuts
```bash
# Expose pod with service in one command
kubectl run nginx --image=nginx --restart=Never --port=80 --expose
# Creates pod AND ClusterIP service simultaneously
# USE WHEN: Question asks to "expose a pod"

# Create with resource limits
kubectl run nginx --image=nginx --restart=Never --requests=cpu=100m,memory=128Mi --limits=cpu=200m,memory=256Mi
# USE WHEN: Question specifies resource requirements

# Create with environment variables
kubectl run nginx --image=nginx --restart=Never --env="VAR1=value1" --env="VAR2=value2"
# USE WHEN: Question asks for environment variables

# Create with labels
kubectl run nginx --image=nginx --restart=Never --labels="app=web,tier=frontend"
# USE WHEN: Question asks for specific labels
```

### Quick Resource Management
```bash
# Scale deployments quickly
kubectl scale deployment nginx --replicas=3
# USE WHEN: Question asks to scale up/down

# Quick resource deletion
kubectl delete pod nginx --force --grace-period=0
# USE WHEN: Pod is stuck terminating (saves time in exam)

# Delete multiple resources
kubectl delete pods --all
kubectl delete pods -l app=nginx
# USE WHEN: Need to clean up quickly
```

## Essential YAML Patterns

### Multi-Container Pod Template
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-container
spec:
  containers:
  - name: main-app
    image: nginx
  - name: sidecar
    image: busybox
    command: ["/bin/sh"]
    args: ["-c", "while true; do echo hello; sleep 10; done"]
```
**USE WHEN:** Question asks for sidecar, logging, or monitoring containers

### ConfigMap Consumption Patterns
```bash
# Create ConfigMap from literal values
kubectl create configmap app-config --from-literal=key1=value1 --from-literal=key2=value2

# Create ConfigMap from file
kubectl create configmap app-config --from-file=config.properties

# Use in pod as environment variables
envFrom:
- configMapRef:
    name: app-config

# Use in pod as volume mount
volumes:
- name: config-volume
  configMap:
    name: app-config
volumeMounts:
- name: config-volume
  mountPath: /etc/config
```
**USE WHEN:** Question involves configuration data, properties files, or environment variables

### Secret Patterns
```bash
# Create secret from literal
kubectl create secret generic db-secret --from-literal=username=admin --from-literal=password=secret123

# Use secret as environment variables
envFrom:
- secretRef:
    name: db-secret

# Use secret as volume (recommended for sensitive data)
volumes:
- name: secret-volume
  secret:
    secretName: db-secret
volumeMounts:
- name: secret-volume
  mountPath: /etc/secrets
  readOnly: true
```
**USE WHEN:** Question involves passwords, API keys, certificates, or sensitive data

## Debugging & Troubleshooting Commands

### Quick Debugging
```bash
# Get pod details with events
kubectl describe pod nginx
# USE WHEN: Pod not starting, crashlooping, or behaving unexpectedly

# Check logs
kubectl logs nginx
kubectl logs nginx -c container-name  # For multi-container pods
kubectl logs nginx --previous         # Previous container instance
# USE WHEN: Need to see application output or errors

# Execute commands in running pods
kubectl exec nginx -- ls /etc
kubectl exec -it nginx -- /bin/bash
# USE WHEN: Need to inspect pod filesystem or run commands

# Port forwarding for testing
kubectl port-forward pod/nginx 8080:80
# USE WHEN: Need to test pod connectivity locally
```

### Resource Inspection
```bash
# Wide output for more details
kubectl get pods -o wide
# Shows node placement, IP addresses

# Custom output columns
kubectl get pods -o custom-columns=NAME:.metadata.name,STATUS:.status.phase,NODE:.spec.nodeName
# USE WHEN: Need specific information formatted nicely

# JSON path for complex queries
kubectl get pods -o jsonpath='{.items[*].metadata.name}'
# USE WHEN: Need to extract specific values programmatically
```

## Persistent Storage Quick Patterns

### PVC Creation
```bash
# Quick PVC creation
kubectl create -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
EOF
```

### Volume Mount in Pod
```yaml
spec:
  containers:
  - name: app
    image: nginx
    volumeMounts:
    - name: data-volume
      mountPath: /data
  volumes:
  - name: data-volume
    persistentVolumeClaim:
      claimName: my-pvc
```
**USE WHEN:** Question asks for persistent storage, data volumes, or stateful applications

## Security Context Patterns

### Pod Security Context
```yaml
spec:
  securityContext:
    runAsUser: 1000
    runAsGroup: 1000
    fsGroup: 1000
  containers:
  - name: app
    image: nginx
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      runAsNonRoot: true
      capabilities:
        drop:
        - ALL
```
**USE WHEN:** Question mentions security, non-root users, or privilege restrictions

## Service Creation Patterns

### Expose Deployment/Pod
```bash
# ClusterIP (internal access only)
kubectl expose pod nginx --port=80 --target-port=80
kubectl expose deployment nginx --port=80 --target-port=80

# NodePort (external access via node IP)
kubectl expose pod nginx --port=80 --target-port=80 --type=NodePort

# LoadBalancer (cloud provider external LB)
kubectl expose deployment nginx --port=80 --target-port=80 --type=LoadBalancer
```
**USE WHEN:** Question asks to "expose" a pod/deployment or mentions service types

## Job and CronJob Patterns

### Job Template
```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: pi-calculation
spec:
  completions: 1
  parallelism: 1
  backoffLimit: 3
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: pi
        image: perl
        command: ["perl", "-Mbignum=bpi", "-wle", "print bpi(2000)"]
```

### CronJob Template
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: hello
spec:
  schedule: "*/1 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: hello
            image: busybox
            command: ["/bin/sh", "-c", "echo hello && date"]
```
**USE WHEN:** Question asks for batch processing, scheduled tasks, or periodic jobs

## Resource Limits and Requests

### Essential Pattern
```yaml
spec:
  containers:
  - name: app
    image: nginx
    resources:
      requests:
        memory: "64Mi"
        cpu: "250m"
      limits:
        memory: "128Mi"
        cpu: "500m"
```
**USE WHEN:** Question mentions resource management, quotas, or performance requirements

## Common CKAD Anti-Patterns (What NOT to do)

### Don't Use These in Exam
```bash
# DON'T: Edit live resources when you can recreate
kubectl edit pod nginx  # Use delete + recreate instead

# DON'T: Use long resource names  
kubectl get persistentvolumeclaims  # Use: kubectl get pvc

# DON'T: Forget --restart=Never for pods
kubectl run nginx --image=nginx  # Creates deployment, not pod!

# DON'T: Manually type long YAML
# DO: Use kubectl create/run with --dry-run=client -o yaml
```

## Time Management Tips

### Speed Techniques
1. **Set aliases immediately:**
   ```bash
   alias k=kubectl
   alias kgp='kubectl get pods'
   alias kgs='kubectl get svc'
   ```

2. **Use kubectl completion:**
   ```bash
   source <(kubectl completion bash)
   ```

3. **Master --dry-run + -o yaml workflow:**
   - Generate → Edit → Apply
   - Faster than writing YAML from scratch

4. **Use vim shortcuts for YAML editing:**
   ```vim
   :set number          " Show line numbers
   :set expandtab       " Use spaces instead of tabs
   :set shiftwidth=2    " 2-space indentation
   ```

5. **Learn to read error messages:**
   - API version mismatches
   - Indentation errors
   - Missing required fields

## Common Question Patterns

### Pod Questions
- "Create a pod" → `--restart=Never`
- "Create a deployment" → Default or `--restart=Always`
- "Scale" → Always deployment/replicaset
- "Expose" → Service creation

### Configuration Questions  
- "Environment variables" → ConfigMap or Secret
- "Configuration file" → ConfigMap as volume
- "Sensitive data" → Secret as volume
- "Command/args" → command/args in container spec

### Storage Questions
- "Persistent" → PVC + volume mount
- "Shared volume" → emptyDir between containers
- "Host directory" → hostPath volume

### Security Questions
- "Non-root user" → securityContext.runAsUser
- "Read-only filesystem" → securityContext.readOnlyRootFilesystem
- "Drop capabilities" → securityContext.capabilities.drop