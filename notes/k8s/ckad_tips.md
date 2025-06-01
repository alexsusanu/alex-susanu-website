# CKAD Essential Tips & Commands

## What's Available in the Exam
```bash
# These are typically pre-configured in the exam environment:
alias k=kubectl
export do="--dry-run=client -o yaml"
export now="--force --grace-period 0"

# Check what's available when you start:
alias
env | grep -i kubectl
```

## Quick Setup (If Needed)
```bash
# Only set essential ones if not already there:
alias k=kubectl
export do="--dry-run=client -o yaml"
# Don't waste time on more - just use these two!
```

## Essential Must-Know Commands (Use 'k' instead of 'kubectl')
```bash
# Quick pod creation
k run nginx --image=nginx $do > pod.yaml

# Quick deployment creation
k create deploy nginx --image=nginx $do > deploy.yaml

# Quick service exposure
k expose pod nginx --port=80 --target-port=80 $do > svc.yaml

# Quick configmap creation
k create cm myconfig --from-literal=key=value $do > cm.yaml

# Quick secret creation
k create secret generic mysecret --from-literal=password=123 $do > secret.yaml

# Quick job creation
k create job myjob --image=busybox -- /bin/sh -c "sleep 30" $do > job.yaml

# Quick cronjob creation
k create cj mycron --image=busybox --schedule="*/1 * * * *" -- /bin/sh -c "date" $do > cj.yaml
```

## Exam Speed Tips

### 1. Always Use Dry-Run First
```bash
# Generate YAML then edit instead of writing from scratch
k run pod1 --image=nginx $do > pod.yaml
vim pod.yaml
k apply -f pod.yaml
```

### 2. Use Tab Completion
```bash
# The exam environment supports tab completion
k get po<TAB>    # Completes to 'pods'
k get pods nginx<TAB>  # Completes pod names
k -n kube-sys<TAB>     # Completes namespace names
```

### 3. Quick Resource Management
```bash
# Scale quickly
k scale deploy nginx --replicas=3

# Delete quickly  
k delete pod nginx $now

# Get all resources
k get all

# Wide output for more info
k get pods -o wide

# Immediate commands (no YAML needed)
k run test --image=nginx --rm -it --restart=Never -- /bin/sh
```

## Common Exam Scenarios

### Multi-Container Pods
```bash
# Remember: containers share network and storage
# Use localhost for inter-container communication
# Check container logs: k logs podname -c containername
```

### Resource Limits
```bash
# Always remember the format:
resources:
  requests:
    memory: "64Mi"
    cpu: "250m"
  limits:
    memory: "128Mi"
    cpu: "500m"
```

### Environment Variables
```bash
# From literal
env:
- name: ENV_VAR
  value: "myvalue"

# From ConfigMap
env:
- name: ENV_VAR
  valueFrom:
    configMapKeyRef:
      name: myconfigmap
      key: mykey

# From Secret
env:
- name: PASSWORD
  valueFrom:
    secretKeyRef:
      name: mysecret
      key: password
```

### Volume Mounts
```bash
# Remember the pattern:
volumeMounts:
- name: myvolume
  mountPath: /data
volumes:
- name: myvolume
  emptyDir: {}
# OR
- name: myvolume
  configMap:
    name: myconfigmap
```

## Troubleshooting Quick Checks
```bash
# Pod not starting? Check these in order:
k describe pod podname     # Check events
k logs podname            # Check application logs
k get events --sort-by=.metadata.creationTimestamp
k get pod podname -o yaml # Check full configuration
```

## Quick Reference Patterns

### Liveness/Readiness Probes
```bash
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
```

### Security Context
```bash
securityContext:
  runAsUser: 1000
  runAsGroup: 3000
  fsGroup: 2000
  capabilities:
    add: ["NET_ADMIN"]
    drop: ["ALL"]
```

### Service Types
```bash
# ClusterIP (default) - internal only
# NodePort - external via node port
# LoadBalancer - external via cloud LB
```

## Memory Tricks

### Port Numbers
- HTTP: 80
- HTTPS: 443
- SSH: 22
- Common app ports: 8080, 3000, 5000

### Resource Units
- CPU: 1000m = 1 core
- Memory: 1Gi = 1024Mi

### Restart Policies
- Always (default for Deployments)
- OnFailure (good for Jobs)
- Never (good for one-time tasks)

## Exam Day Strategy (CRITICAL!)
1. **First 2 minutes**: Check if `k` alias exists, if not: `alias k=kubectl`
2. **Set namespace immediately** if specified: `k config set-context --current --namespace=exam`
3. **Don't waste time on complex aliases** - just use `k` and muscle memory
4. Read question completely first
5. Use dry-run to generate YAML: `k run test --image=nginx $do > test.yaml`
6. Edit YAML file instead of writing from scratch
7. Test with `k apply -f file.yaml`
8. Verify with `k get` and `k describe`
9. Move to next question if stuck (mark and return)

## Time Management
- **2 hours for ~15-20 questions** = 6-8 minutes per question max
- Don't spend more than 5-7 minutes per question initially
- Mark difficult questions and return later  
- **Always verify your solution works before moving on**
- Use `k get all` to see what you created
- **Speed comes from muscle memory, not fancy aliases**

## What You MUST Memorize (No Time to Look Up)
```bash
# These commands must be automatic:
k run name --image=nginx $do > file.yaml
k create deploy name --image=nginx $do > file.yaml  
k expose pod name --port=80 $do > file.yaml
k create cm name --from-literal=key=value $do > file.yaml
k create secret generic name --from-literal=key=value $do > file.yaml
k create job name --image=busybox -- command $do > file.yaml
k create cj name --image=busybox --schedule="* * * * *" -- command $do > file.yaml

# Quick checks:
k get pods -o wide
k describe pod name
k logs name
k delete pod name --force --grace-period=0
```

## Reality Check for Exam

### What's Usually Pre-Configured
- `alias k=kubectl` (but verify!)
- Basic bash completion
- Standard Linux utilities

### What You Must Type/Remember
- `export do="--dry-run=client -o yaml"` (if not set)
- All kubectl commands and options
- YAML structure and indentation
- Resource field names and values

### Don't Waste Time On
- Complex aliases (you won't remember them under pressure)
- Bashrc modifications
- Multiple export variables

**Bottom Line**: Practice with just `k` alias and `$do` variable. That's all you realistically have time to set up.

## Quick Debugging (Memorize These Patterns)
```bash
# Pod stuck in Pending?
k describe pod podname | grep -i events

# Pod crashing?
k logs podname --previous

# Service not working?
k get endpoints servicename

# Can't schedule?
k get nodes
k describe node nodename

# Quick health check sequence:
k get pods                    # Overview
k describe pod podname        # Detailed events
k logs podname               # Application logs  
k get events --sort-by=.metadata.creationTimestamp  # Recent events
```