# CKAD Essential kubectl Commands Study Guide
category: Kubernetes
tags: CKAD, kubectl, Kubernetes, DevOps

## Core Pod Management & Configuration
The foundation of CKAD exam success lies in mastering pod creation, configuration management, and basic troubleshooting. These commands form the building blocks for more complex scenarios.

### Pod Operations & YAML Generation
- **kubectl run** - Primary command for pod creation and YAML generation
- **kubectl get pods** - Essential for viewing pod status and details
- **kubectl describe pod** - Critical for troubleshooting and understanding pod configuration
- **kubectl delete pod** - Clean up resources

### Configuration Management
- **ConfigMaps** - Externalize application configuration
- **Secrets** - Manage sensitive data securely
- **Environment Variables** - Inject configuration into containers

### Commands with Detailed Explanations
```bash
# YAML Generation (MOST IMPORTANT for exam)
kubectl run nginx --image=nginx --dry-run=client -o yaml > pod.yaml
# kubectl run nginx = create pod named "nginx"
# --image=nginx = use nginx container image
# --dry-run=client = simulate creation, don't actually create (client-side validation)
# -o yaml = output in YAML format instead of creating
# > pod.yaml = save output to file named pod.yaml

kubectl create deployment app --image=nginx --dry-run=client -o yaml > deploy.yaml
# create deployment app = make deployment named "app"
# --image=nginx = container image to use
# --dry-run=client = simulate without creating
# -o yaml = show YAML instead of creating
# > deploy.yaml = save to file

# Basic Pod Management
kubectl run nginx --image=nginx --port=80 --restart=Never
# run nginx = create pod named nginx
# --image=nginx = use nginx image
# --port=80 = expose port 80 (adds to YAML, doesn't create service)
# --restart=Never = create Pod (not Deployment)

kubectl get pods -o wide --show-labels
# get pods = list all pods
# -o wide = show extra columns (IP, node, age, etc.)
# --show-labels = display all labels assigned to pods

kubectl describe pod nginx | grep -A5 Events
# describe pod nginx = show detailed info about nginx pod
# | = pipe output to next command
# grep -A5 Events = find "Events" line and show 5 lines after it

kubectl delete pod nginx --force --grace-period=0
# delete pod nginx = remove the nginx pod
# --force = don't wait for graceful shutdown
# --grace-period=0 = kill immediately (0 seconds wait time)

# ConfigMap Creation
kubectl create configmap app-config --from-literal=key1=value1 --from-literal=key2=value2
# create configmap app-config = make ConfigMap named "app-config"
# --from-literal=key1=value1 = add key-value pair directly in command
# --from-literal=key2=value2 = add another key-value pair

kubectl create configmap app-config --from-file=config.properties
# --from-file=config.properties = read entire file as one key-value
# filename becomes key, file content becomes value

kubectl create configmap app-config --from-env-file=config.env
# --from-env-file=config.env = read file with KEY=VALUE lines
# each line becomes separate key-value pair in ConfigMap

# Secret Management
kubectl create secret generic db-secret --from-literal=username=admin --from-literal=password=secret
# create secret generic = make generic secret (vs tls/docker types)
# db-secret = name of the secret
# --from-literal works same as configmap but values get base64 encoded

kubectl create secret tls tls-secret --cert=path/to/cert --key=path/to/key
# create secret tls = make TLS certificate secret
# --cert=path/to/cert = certificate file location
# --key=path/to/key = private key file location

kubectl get secret db-secret -o jsonpath='{.data.password}' | base64 -d
# get secret db-secret = retrieve the secret
# -o jsonpath='{.data.password}' = extract only password field
# | base64 -d = decode from base64 to readable text
```

## Deployments, Services & Networking
Deployments handle application lifecycle while Services provide network access. These are heavily tested areas requiring fast command execution.

### Deployment Lifecycle Management
- **kubectl create deployment** - Initial deployment creation
- **kubectl scale** - Horizontal scaling of applications
- **kubectl rollout** - Manage deployment updates and rollbacks
- **kubectl set image** - Update container images in deployments

### Service Types & Networking
- **ClusterIP** - Internal cluster communication (default)
- **NodePort** - External access via node ports
- **LoadBalancer** - Cloud provider load balancer
- **kubectl expose** - Quick service creation from existing resources

### Commands with Detailed Explanations
```bash
# Deployment Management
kubectl create deployment nginx --image=nginx:1.16 --replicas=3
# create deployment nginx = make deployment named "nginx"
# --image=nginx:1.16 = use specific version of nginx
# --replicas=3 = start with 3 pod copies

kubectl scale deployment nginx --replicas=5
# scale deployment nginx = change pod count for nginx deployment
# --replicas=5 = change to 5 total pods

kubectl set image deployment/nginx nginx=nginx:1.17 --record
# set image = update container image
# deployment/nginx = target the nginx deployment
# nginx=nginx:1.17 = container_name=new_image_version
# --record = save this command in rollout history (for rollbacks)

kubectl rollout status deployment/nginx
# rollout status = check if deployment update is complete
# deployment/nginx = which deployment to monitor

kubectl rollout undo deployment/nginx --to-revision=2
# rollout undo = revert to previous version
# --to-revision=2 = go to specific revision number (optional)

kubectl rollout restart deployment/nginx
# rollout restart = kill all pods and recreate with same image
# forces fresh pods without changing image version

# Service Creation & Testing
kubectl expose deployment nginx --port=80 --target-port=80
# expose deployment nginx = create service pointing to nginx deployment
# --port=80 = service listens on port 80
# --target-port=80 = pods receive traffic on port 80

kubectl create service nodeport nginx --tcp=80:80 --dry-run=client -o yaml
# create service nodeport = make NodePort service (external access)
# --tcp=80:80 = service_port:target_port mapping
# --dry-run=client -o yaml = generate YAML, don't create

kubectl port-forward service/nginx 8080:80
# port-forward = create tunnel from your machine to cluster
# service/nginx = tunnel to nginx service
# 8080:80 = localhost:8080 maps to service:80

# Network Testing
kubectl run test --image=busybox --rm -it -- sh
# run test = create pod named "test"
# --image=busybox = use busybox image (has network tools)
# --rm = delete pod automatically when you exit
# -it = interactive terminal (i=interactive, t=tty)
# -- sh = run shell command inside container

kubectl get endpoints nginx
# get endpoints nginx = show which pods the nginx service points to
# endpoints = actual pod IPs that service routes to
```

## Storage & Multi-Container Pods
Storage management and multi-container patterns are complex CKAD topics requiring understanding of volumes, persistent storage, and container interaction patterns.

### Volume Types & Persistent Storage
- **emptyDir** - Temporary storage shared between containers
- **hostPath** - Node filesystem access
- **persistentVolumeClaim** - Persistent storage abstraction
- **configMap/secret** - Configuration and sensitive data as files

### Multi-Container Patterns
- **Sidecar** - Helper container alongside main application
- **Init Containers** - Initialization before main containers start
- **Adapter** - Modify data format or interface
- **Ambassador** - Proxy external services

### Commands with Detailed Explanations
```bash
# Volume & Storage Commands
kubectl get pv,pvc
# get pv,pvc = list PersistentVolumes and PersistentVolumeClaims
# pv = cluster-wide storage resources
# pvc = user requests for storage

kubectl describe pv volume-name
# describe pv = show detailed info about PersistentVolume
# includes capacity, access modes, reclaim policy

kubectl describe pvc claim-name
# describe pvc = show PersistentVolumeClaim details
# shows bound volume, requested size, access modes

# Multi-container Pod Creation (always via YAML editing)
kubectl run multi-pod --image=nginx --dry-run=client -o yaml > multi-pod.yaml
# Creates single-container YAML that you edit to add more containers
# Edit file to add sidecar containers, init containers, volumes

# Container Interaction
kubectl exec multi-pod -c container-name -- env
# exec multi-pod = run command in multi-pod
# -c container-name = specify which container (required for multi-container)
# -- env = command to run (show environment variables)

kubectl logs multi-pod -c sidecar-container
# logs multi-pod = get logs from multi-pod
# -c sidecar-container = specify which container's logs

kubectl exec -it multi-pod -c main-container -- /bin/bash
# -it = interactive terminal
# -c main-container = specify container
# -- /bin/bash = start bash shell
```

## Jobs, Observability & Troubleshooting
Batch workloads and application monitoring are essential skills, especially for debugging scenarios common in the CKAD exam.

### Job Management
- **kubectl create job** - One-time task execution
- **kubectl create cronjob** - Scheduled task management

### Logging & Monitoring
- **kubectl logs** - Application log access
- **kubectl top** - Resource usage monitoring
- **kubectl describe** - Detailed resource information
- **kubectl get events** - Cluster-wide event monitoring

### Debugging Techniques
- **kubectl exec** - Direct container access
- **kubectl cp** - File transfer to/from containers

### Commands with Detailed Explanations
```bash
# Jobs & CronJobs
kubectl create job hello --image=busybox -- echo "Hello World"
# create job hello = make one-time job named "hello"
# --image=busybox = use busybox image
# -- echo "Hello World" = command to run in container

kubectl create cronjob backup --image=busybox --schedule="0 2 * * *" -- /backup.sh
# create cronjob backup = make scheduled job named "backup"
# --schedule="0 2 * * *" = cron format (daily at 2 AM)
# -- /backup.sh = script to run

kubectl create job manual-backup --from=cronjob/backup
# create job manual-backup = create one-time job
# --from=cronjob/backup = copy settings from existing cronjob

# Logging & Monitoring
kubectl logs nginx -f --tail=50 --since=1h
# logs nginx = show logs from nginx pod
# -f = follow mode (stream new logs as they appear)
# --tail=50 = show only last 50 lines
# --since=1h = only logs from last 1 hour

kubectl logs nginx -c container-name --previous
# -c container-name = specify container (multi-container pods)
# --previous = logs from previous container instance (if restarted)

kubectl logs -l app=nginx --all-containers=true
# -l app=nginx = logs from all pods with label app=nginx
# --all-containers=true = show logs from all containers in matching pods

kubectl top pods --containers --sort-by=memory
# top pods = show CPU/memory usage (requires metrics-server)
# --containers = show per-container usage (not just per-pod)
# --sort-by=memory = order by memory usage (highest first)

# Debugging & Troubleshooting
kubectl exec -it nginx -- /bin/bash
# exec -it nginx = run interactive command in nginx pod
# -it = interactive terminal (always use together)
# -- /bin/bash = start bash shell

kubectl cp nginx:/tmp/file.txt ./local-file.txt
# cp = copy files between container and local machine
# nginx:/tmp/file.txt = source (pod_name:/path/in/container)
# ./local-file.txt = destination on your local machine

kubectl run debug --image=busybox --rm -it -- sh
# run debug = create temporary pod named "debug"
# --rm = auto-delete pod when you exit
# -it = interactive terminal
# -- sh = run shell

kubectl describe pod nginx | tail -20
# describe pod nginx = show detailed pod information
# | tail -20 = show only last 20 lines (usually the important events)

kubectl get events --sort-by=.metadata.creationTimestamp --field-selector involvedObject.name=nginx
# get events = show cluster events (errors, warnings, info)
# --sort-by=.metadata.creationTimestamp = order by time (newest last)
# --field-selector involvedObject.name=nginx = only events about nginx pod
```

## RBAC & Security Management
Role-Based Access Control (RBAC) is heavily tested in CKAD. You need to understand roles, bindings, and permission verification for applications.

### Security Commands & Authentication
- **kubectl create role** - Namespace-level permissions
- **kubectl create clusterrole** - Cluster-wide permissions
- **kubectl create rolebinding** - Bind roles to users/groups/serviceaccounts
- **kubectl create clusterrolebinding** - Bind cluster roles
- **kubectl auth can-i** - Test permissions
- **kubectl create serviceaccount** - Create service accounts for applications

### Commands with Detailed Explanations
```bash
# RBAC Role Creation
kubectl create role pod-reader --verb=get,list,watch --resource=pods
# create role pod-reader = make role named "pod-reader"
# --verb=get,list,watch = allowed actions (what you can do)
# --resource=pods = what resources the actions apply to

kubectl create clusterrole pod-reader --verb=get,list,watch --resource=pods
# create clusterrole = cluster-wide role (all namespaces)
# same verbs and resources as role, but applies everywhere

# RBAC Binding Creation
kubectl create rolebinding read-pods --role=pod-reader --user=jane --group=mygroup
# create rolebinding read-pods = bind role to users/groups in current namespace
# --role=pod-reader = which role to bind
# --user=jane = give permission to user "jane"
# --group=mygroup = give permission to group "mygroup"

kubectl create rolebinding read-pods --clusterrole=pod-reader --serviceaccount=default:my-sa
# --clusterrole=pod-reader = bind a clusterrole (but only for current namespace)
# --serviceaccount=default:my-sa = give permission to service account

kubectl create clusterrolebinding read-pods --clusterrole=pod-reader --user=jane
# create clusterrolebinding = bind clusterrole across ALL namespaces
# gives jane pod-reader permissions in every namespace

# Permission Testing
kubectl auth can-i create pods
# auth can-i = check if I have permission
# create pods = test if I can create pods in current namespace

kubectl auth can-i create pods --as=jane
# --as=jane = test permissions as different user
# useful for testing RBAC configurations

kubectl auth can-i create pods --as=system:serviceaccount:default:my-sa
# --as=system:serviceaccount:default:my-sa = test as service account
# format: system:serviceaccount:namespace:serviceaccount_name

# Service Account Management
kubectl create serviceaccount my-service-account
# create serviceaccount = make new service account for pods to use
# service accounts are for applications, not humans

kubectl describe serviceaccount my-service-account
# describe serviceaccount = show details including secrets and tokens
```

## Ingress & Advanced Networking
Ingress controllers route external traffic to services. Critical for exposing applications outside the cluster.

### Ingress Management
- **kubectl create ingress** - Create ingress rules for external access
- **kubectl get ingress** - List ingress resources
- **kubectl describe ingress** - Debug ingress configuration

### Commands with Detailed Explanations
```bash
# Basic Ingress Creation
kubectl create ingress my-ingress --rule="example.com/app=my-service:80"
# create ingress my-ingress = make ingress named "my-ingress"
# --rule="example.com/app=my-service:80" = route rule
# example.com/app = incoming request path
# my-service:80 = target service and port

# Multiple Path Ingress
kubectl create ingress multi-path --rule="example.com/app=app-service:80" --rule="example.com/api=api-service:8080"
# --rule can be repeated for multiple paths
# different paths can route to different services

# TLS Enabled Ingress
kubectl create ingress secure-ingress --rule="example.com/app=my-service:80,tls=my-tls-secret"
# ,tls=my-tls-secret = use TLS certificate from secret
# secret must contain tls.crt and tls.key

# Default Backend Ingress
kubectl create ingress default-backend --default-backend=default-service:80 --rule="example.com/=main-service:80"
# --default-backend = fallback service for unmatched requests
# useful for catch-all scenarios

# Get and Describe Ingress
kubectl get ingress -o wide
# -o wide = show additional columns like hosts, addresses
kubectl describe ingress my-ingress
# shows events, rules, and backend configuration
```

## Resource Management & Editing
Essential commands for modifying resources and managing changes during the exam.

### Resource Modification Commands
- **kubectl apply** - Declarative resource management
- **kubectl replace** - Imperative full resource replacement
- **kubectl patch** - Partial resource updates
- **kubectl edit** - Interactive resource editing

### Commands with Detailed Explanations
```bash
# Apply vs Create vs Replace
kubectl apply -f deployment.yaml
# apply = create if doesn't exist, update if exists
# declarative approach - tells Kubernetes desired state
# can be run multiple times safely

kubectl create -f deployment.yaml
# create = make new resource, fails if already exists
# imperative approach - tells Kubernetes exactly what to do

kubectl replace -f deployment.yaml
# replace = delete existing resource and create new one
# requires complete resource definition
# imperative approach, fails if resource doesn't exist

# Interactive Editing
kubectl edit pod nginx
# edit pod nginx = open pod definition in text editor (vi/nano)
# saves automatically when you exit editor
# some fields cannot be edited on running pods

kubectl edit deployment nginx
# edit deployment = modify deployment interactively
# most deployment fields can be edited live

# Patch Commands (Partial Updates)
kubectl patch pod nginx -p '{"spec":{"containers":[{"name":"nginx","image":"nginx:1.20"}]}}'
# patch pod nginx = partially update nginx pod
# -p = patch data in JSON format
# only changes specified fields, leaves others unchanged

kubectl patch deployment nginx -p '{"spec":{"replicas":5}}'
# patch deployment = update only replica count
# faster than editing full resource

kubectl patch pod nginx --type='json' -p='[{"op": "replace", "path": "/spec/containers/0/image", "value":"nginx:1.20"}]'
# --type='json' = JSON patch format (more precise)
# "op": "replace" = operation type (replace, add, remove)
# "path": "/spec/containers/0/image" = exact field to change

# Force Operations
kubectl replace --force -f pod.yaml
# --force = delete and recreate resource
# useful when normal update is not possible

kubectl apply -f pod.yaml --force
# --force with apply = force apply even if field ownership conflicts
```

## Node Management & Scheduling
Node operations are essential for understanding pod placement and cluster management.

### Node Operations
- **kubectl get nodes** - List cluster nodes
- **kubectl describe node** - Node details and capacity
- **kubectl label node** - Add labels for scheduling
- **kubectl taint node** - Add taints to control scheduling

### Commands with Detailed Explanations
```bash
# Node Information
kubectl get nodes -o wide --show-labels
# get nodes = list all cluster nodes
# -o wide = show additional info (IPs, OS, kernel version)
# --show-labels = display all node labels

kubectl describe node worker-1
# describe node = detailed node information
# shows capacity, allocatable resources, conditions, events
# useful for troubleshooting node issues

# Node Labeling (for scheduling)
kubectl label node worker-1 disktype=ssd
# label node worker-1 = add label to node
# disktype=ssd = key=value label
# used with nodeSelector in pod specs

kubectl label node worker-1 environment=production --overwrite
# --overwrite = replace existing label value
# without this, command fails if label already exists

kubectl label node worker-1 disktype-
# disktype- = remove label (note the minus sign)

# Node Taints (advanced scheduling)
kubectl taint node worker-1 key=value:NoSchedule
# taint node worker-1 = add taint to node
# key=value = taint key and value
# NoSchedule = taint effect (pods without toleration won't schedule)

kubectl taint node worker-1 key=value:NoExecute
# NoExecute = evict existing pods without toleration

kubectl taint node worker-1 key-
# key- = remove taint (note the minus sign)

# Drain and Cordon (maintenance)
kubectl drain worker-1 --ignore-daemonsets --delete-emptydir-data
# drain = safely evict all pods from node for maintenance
# --ignore-daemonsets = don't evict daemonset pods
# --delete-emptydir-data = delete pods with emptyDir volumes

kubectl cordon worker-1
# cordon = mark node as unschedulable (no new pods)
# existing pods continue running

kubectl uncordon worker-1
# uncordon = make node schedulable again
```

## Utility & Information Commands
Essential commands for getting information and debugging during the exam.

### Information & Debugging Commands
- **kubectl api-resources** - List available resource types
- **kubectl api-versions** - List API versions
- **kubectl explain** - Field documentation
- **kubectl version** - Cluster version information

### Commands with Detailed Explanations
```bash
# API Information
kubectl api-resources
# api-resources = list all available resource types
# shows shortnames, API groups, namespaced status
# useful when you forget resource names

kubectl api-resources --namespaced=true
# --namespaced=true = only show namespaced resources
# --namespaced=false = only show cluster-wide resources

kubectl api-versions
# api-versions = list all available API versions
# shows apps/v1, v1, networking.k8s.io/v1, etc.

# Field Documentation (CRITICAL for exam)
kubectl explain pod.spec.containers
# explain = show field documentation and structure
# pod.spec.containers = navigate object hierarchy
# better than memorizing YAML structure

kubectl explain deployment.spec.template.spec.containers.resources
# can go deep into nested fields
# shows required fields, types, descriptions

kubectl explain pod --recursive
# --recursive = show all fields in hierarchical structure
# useful for seeing complete object structure

# Version and Cluster Info
kubectl version --short
# version = show client and server versions
# --short = condensed output

kubectl cluster-info
# cluster-info = show cluster endpoint information
# displays master and service URLs

# Resource Usage and Quotas
kubectl top nodes
# top nodes = show CPU and memory usage per node
# requires metrics-server to be installed

kubectl top pods --all-namespaces --containers
# top pods = show resource usage per pod
# --all-namespaces = across all namespaces
# --containers = show per-container usage

kubectl describe quota -n my-namespace
# describe quota = show resource quota limits and usage
# quotas limit CPU, memory, pod count, etc.

# Event Monitoring
kubectl get events --all-namespaces --sort-by=.metadata.creationTimestamp
# get events = show cluster events (warnings, errors, info)
# --all-namespaces = events from all namespaces
# --sort-by=.metadata.creationTimestamp = order by time

kubectl get events --field-selector type=Warning
# --field-selector type=Warning = only show warning events
# can filter by reason, involvedObject, etc.
```

## Key Concepts Summary
- **YAML Generation** - Use `--dry-run=client -o yaml` for all resource creation
- **Label Selectors** - Critical for service discovery and resource management
- **Context Switching** - Essential for multi-cluster exam environment
- **Resource Limits** - Memory and CPU constraints for containers
- **Health Checks** - Liveness, readiness, and startup probes
- **Security Contexts** - User permissions and security constraints

## Best Practices / Tips
1. **Master YAML Generation** - Never write YAML from scratch during the exam
   ```bash
   kubectl run nginx --image=nginx --dry-run=client -o yaml > pod.yaml
   # Always use this pattern, then edit the generated file
   kubectl create deployment app --image=nginx --dry-run=client -o yaml > deploy.yaml
   kubectl create ingress web --rule="example.com/=service:80" --dry-run=client -o yaml > ingress.yaml
   ```

2. **Set Up Time-Saving Aliases** - Configure before exam starts
   ```bash
   alias k=kubectl
   alias kgp='kubectl get pods'
   alias kgs='kubectl get svc'
   alias kgd='kubectl get deployments'
   alias kgi='kubectl get ingress'
   alias kaf='kubectl apply -f'
   ```

3. **Use kubectl explain** - Built-in documentation for any field
   ```bash
   kubectl explain pod.spec.containers
   # Shows all fields and their descriptions
   kubectl explain deployment.spec.template.spec.containers.resources
   # Navigate object hierarchy for field references
   kubectl explain ingress.spec.rules --recursive
   # See complete structure with --recursive
   ```

4. **Master Context Switching** - Exam uses multiple clusters and namespaces
   ```bash
   kubectl config get-contexts
   # List all available contexts (clusters)
   kubectl config use-context cluster-name
   # Switch to different cluster
   kubectl config set-context --current --namespace=dev
   # Change default namespace for current context
   ```

5. **Practice Fast Troubleshooting** - Standard debugging workflow
   ```bash
   kubectl get pods                    # Check status
   kubectl describe pod problem-pod    # Check events
   kubectl logs problem-pod           # Check logs
   kubectl exec -it problem-pod -- sh # Access container
   ```

6. **RBAC Quick Patterns** - Common permission scenarios
   ```bash
   # Test permissions before creating resources
   kubectl auth can-i create pods
   kubectl auth can-i create pods --as=system:serviceaccount:default:my-sa
   
   # Quick role creation pattern
   kubectl create role pod-reader --verb=get,list,watch --resource=pods --dry-run=client -o yaml
   ```

7. **Resource Modification Strategy** - Choose the right command
   ```bash
   # For small changes - use patch
   kubectl patch deployment nginx -p '{"spec":{"replicas":3}}'
   
   # For interactive editing - use edit
   kubectl edit deployment nginx
   
   # For complete replacement - use replace
   kubectl replace -f deployment.yaml
   
   # For declarative management - use apply
   kubectl apply -f deployment.yaml
   ```

## Common Issues / Troubleshooting
### Pod Not Starting
- **Symptom:** Pod stuck in Pending, CrashLoopBackOff, or ImagePullBackOff
- **Cause:** Resource constraints, image issues, or configuration errors
- **Solution:** Check events and logs
  ```bash
  kubectl describe pod problem-pod | grep -A10 Events
  kubectl logs problem-pod --previous
  ```

### Service Not Accessible
- **Symptom:** Cannot reach application through service
- **Cause:** Incorrect labels, wrong ports, or network policies
- **Solution:** Verify endpoints and selectors
  ```bash
  kubectl get endpoints service-name
  kubectl describe service service-name
  kubectl get pods --show-labels
  ```

### Ingress Not Working
- **Symptom:** External traffic not reaching application
- **Cause:** Incorrect ingress rules, missing TLS secrets, or ingress controller issues
- **Solution:** Check ingress configuration and controller
  ```bash
  kubectl describe ingress my-ingress
  kubectl get ingress -o wide
  kubectl logs -n ingress-nginx deployment/nginx-ingress-controller
  ```

### RBAC Permission Denied
- **Symptom:** "Forbidden" errors when accessing resources
- **Cause:** Missing roles, bindings, or incorrect service account permissions
- **Solution:** Test permissions and verify RBAC configuration
  ```bash
  kubectl auth can-i create pods --as=user-name
  kubectl describe role role-name
  kubectl describe rolebinding binding-name
  kubectl get serviceaccount my-sa -o yaml
  ```

### Configuration Not Loading
- **Symptom:** Application using defaults instead of ConfigMap/Secret
- **Cause:** Incorrect volume mounts or environment variable references
- **Solution:** Check container configuration
  ```bash
  kubectl describe pod app-pod | grep -A5 Mounts
  kubectl exec app-pod -- env | grep CONFIG
  ```

### Resource Limits Exceeded
- **Symptom:** Pod evicted or OOMKilled
- **Cause:** Insufficient memory or CPU limits
- **Solution:** Check resource usage
  ```bash
  kubectl top pods --containers
  kubectl describe pod app-pod | grep -A5 Limits
  ```

### Node Scheduling Issues
- **Symptom:** Pods stuck in Pending with scheduling errors
- **Cause:** Node taints, resource constraints, or affinity rules
- **Solution:** Check node status and scheduling constraints
  ```bash
  kubectl describe node worker-1 | grep -A5 Taints
  kubectl get events --field-selector reason=FailedScheduling
  kubectl describe pod pending-pod | grep -A5 Events
  ```

## References / Further Reading
- [Official CKAD Curriculum](https://github.com/cncf/curriculum)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [Practice Exercises](https://github.com/dgkanatsios/CKAD-exercises)
- [CKAD Exam Tips](https://kubernetes.io/docs/reference/kubectl/conventions/)