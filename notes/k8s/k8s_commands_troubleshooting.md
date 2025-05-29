# Kubernetes Commands & Troubleshooting
category: DevOps
tags: kubernetes, k8s, kubectl, troubleshooting, debugging, monitoring

## Essential kubectl Commands

**What kubectl is:** The command-line tool for interacting with Kubernetes clusters, providing a way to deploy applications, inspect and manage cluster resources, and view logs.

**Why it matters:** kubectl is your primary interface to Kubernetes. Mastering kubectl commands is essential for daily operations, troubleshooting, and cluster management.

### **Basic Resource Operations**

**Get resources:**
```bash
# List resources
kubectl get pods                                   # List pods in current namespace
kubectl get pods -A                               # List pods in all namespaces
kubectl get pods -o wide                          # Additional info (node, IP, etc.)
kubectl get pods --show-labels                    # Show pod labels
kubectl get pods -l app=nginx                     # Filter by labels
kubectl get pods --field-selector=status.phase=Running  # Filter by field

# Different output formats
kubectl get pods -o yaml                          # YAML output
kubectl get pods -o json                          # JSON output
kubectl get pods -o jsonpath='{.items[*].metadata.name}'  # Custom output
kubectl get pods -o custom-columns=NAME:.metadata.name,STATUS:.status.phase
```

**Describe resources:**
```bash
kubectl describe pod <pod-name>                   # Detailed pod information
kubectl describe node <node-name>                 # Node details
kubectl describe service <service-name>           # Service details
kubectl describe deployment <deployment-name>     # Deployment details
```

**Create and apply resources:**
```bash
kubectl create -f manifest.yaml                   # Create resources from file
kubectl apply -f manifest.yaml                    # Apply configuration (create or update)
kubectl apply -f directory/                       # Apply all YAML files in directory
kubectl apply -R -f manifests/                    # Recursively apply files

# Create resources imperatively
kubectl create deployment nginx --image=nginx:1.21
kubectl create service clusterip nginx --tcp=80:80
kubectl create configmap app-config --from-literal=key=value
kubectl create secret generic app-secret --from-literal=password=secret123
```

**Delete resources:**
```bash
kubectl delete pod <pod-name>                     # Delete specific pod
kubectl delete -f manifest.yaml                   # Delete resources defined in file
kubectl delete deployment,service nginx           # Delete multiple resource types
kubectl delete pods --all                         # Delete all pods in namespace
kubectl delete pods -l app=nginx                  # Delete pods matching label
kubectl delete namespace <namespace-name>         # Delete namespace and all resources
```

### **Advanced kubectl Operations**

**Edit resources:**
```bash
kubectl edit pod <pod-name>                       # Edit pod in default editor
kubectl edit deployment <deployment-name>         # Edit deployment
kubectl patch pod <pod-name> -p '{"spec":{"containers":[{"name":"app","image":"nginx:1.22"}]}}'
```

**Scale resources:**
```bash
kubectl scale deployment <deployment-name> --replicas=5
kubectl scale --replicas=3 -f deployment.yaml
kubectl autoscale deployment <deployment-name> --min=2 --max=10 --cpu-percent=80
```

**Resource usage:**
```bash
kubectl top nodes                                 # Node resource usage
kubectl top pods                                  # Pod resource usage
kubectl top pods --containers                     # Container resource usage
kubectl top pods -l app=nginx                     # Resource usage for labeled pods
```

### **Logs and Debugging**

**View logs:**
```bash
kubectl logs <pod-name>                           # Pod logs
kubectl logs <pod-name> -c <container-name>       # Specific container logs
kubectl logs -f <pod-name>                        # Follow logs (tail -f)
kubectl logs --previous <pod-name>                # Previous container instance logs
kubectl logs -l app=nginx                         # Logs from all pods with label
kubectl logs --since=1h <pod-name>                # Logs from last hour
kubectl logs --tail=100 <pod-name>                # Last 100 lines
```

**Execute commands in containers:**
```bash
kubectl exec <pod-name> -- ls /                   # Execute single command
kubectl exec -it <pod-name> -- /bin/bash          # Interactive shell
kubectl exec -it <pod-name> -c <container> -- /bin/sh  # Specific container
kubectl exec <pod-name> -- env                    # View environment variables
```

**Port forwarding:**
```bash
kubectl port-forward pod/<pod-name> 8080:80       # Forward local port to pod
kubectl port-forward service/<service-name> 8080:80  # Forward to service
kubectl port-forward deployment/<deployment-name> 8080:80  # Forward to deployment
kubectl port-forward --address 0.0.0.0 pod/<pod-name> 8080:80  # Listen on all interfaces
```

**Copy files:**
```bash
kubectl cp <pod-name>:/path/to/file ./local-file  # Copy from pod to local
kubectl cp ./local-file <pod-name>:/path/to/file  # Copy from local to pod
kubectl cp <pod-name>:/path/to/directory ./local-directory -c <container-name>
```

## Troubleshooting Techniques

**What troubleshooting involves:** Systematic approach to identifying, diagnosing, and resolving issues in Kubernetes clusters and applications.

**Why it's important:** Kubernetes complexity means issues can occur at multiple layers - infrastructure, networking, storage, application, and configuration. Effective troubleshooting minimizes downtime and maintains reliability.

### **Pod Troubleshooting**

**Pod states and issues:**
```bash
# Check pod status
kubectl get pods                                  # Overall pod status
kubectl describe pod <pod-name>                   # Detailed status and events

# Common pod states
# Pending - Pod accepted but not scheduled
# Running - Pod is executing
# Succeeded - All containers terminated successfully  
# Failed - All containers terminated, at least one failed
# Unknown - Pod state cannot be determined
```

**ImagePullBackOff / ErrImagePull:**
```bash
# Check image name and tag
kubectl describe pod <pod-name> | grep -i image

# Verify image exists
docker pull <image-name>

# Check image pull secrets
kubectl get pods <pod-name> -o yaml | grep imagePullSecrets
kubectl describe secret <image-pull-secret>

# Fix common issues:
# - Incorrect image name/tag
# - Missing or incorrect registry credentials
# - Network connectivity to registry
# - Registry authentication issues
```

**CrashLoopBackOff:**
```bash
# Check container logs
kubectl logs <pod-name> --previous               # Previous container logs
kubectl logs <pod-name> -c <container-name>     # Specific container

# Check resource limits
kubectl describe pod <pod-name> | grep -A 5 Limits

# Common causes:
# - Application startup failures
# - Missing environment variables or secrets
# - Resource constraints (CPU/memory limits)
# - Health check failures
# - Dependency issues (database connectivity, etc.)
```

**Pending pods:**
```bash
# Check why pod is not scheduled
kubectl describe pod <pod-name> | grep Events -A 10

# Check node resources
kubectl top nodes
kubectl describe nodes

# Common issues:
# - Insufficient resources (CPU, memory)
# - Node selector constraints
# - Taints and tolerations
# - Affinity/anti-affinity rules
# - PVC binding issues
```

### **Service and Networking Troubleshooting**

**Service connectivity issues:**
```bash
# Check service endpoints
kubectl get endpoints <service-name>
kubectl describe service <service-name>

# Test service connectivity
kubectl run test-pod --image=busybox -it --rm -- nslookup <service-name>
kubectl run test-pod --image=busybox -it --rm -- wget -qO- <service-name>:<port>

# Check service selector matches pod labels  
kubectl get pods --show-labels
kubectl get service <service-name> -o yaml | grep selector -A 5
```

**DNS resolution issues:**
```bash
# Test DNS resolution
kubectl run test-pod --image=busybox -it --rm -- nslookup kubernetes.default
kubectl run test-pod --image=busybox -it --rm -- nslookup <service-name>.<namespace>.svc.cluster.local

# Check CoreDNS pods
kubectl get pods -n kube-system -l k8s-app=kube-dns
kubectl logs -n kube-system -l k8s-app=kube-dns

# Check DNS configuration in pods
kubectl exec <pod-name> -- cat /etc/resolv.conf
```

**NetworkPolicy troubleshooting:**
```bash
# Check if NetworkPolicies are applied
kubectl get networkpolicies
kubectl describe networkpolicy <policy-name>

# Test connectivity between pods
kubectl exec <source-pod> -- nc -zv <target-service> <port>
kubectl exec <source-pod> -- telnet <target-ip> <port>

# Check CNI plugin logs (varies by plugin)
kubectl logs -n kube-system -l k8s-app=calico-node  # Calico example
```

### **Storage Troubleshooting**

**PVC binding issues:**
```bash
# Check PVC status
kubectl get pvc
kubectl describe pvc <pvc-name>

# Check available PVs
kubectl get pv
kubectl describe pv <pv-name>

# Common issues:
# - No matching PV available
# - Storage class not found
# - Access mode mismatch
# - Size requirements not met
# - Node affinity constraints
```

**Volume mount failures:**
```bash
# Check pod events for mount errors
kubectl describe pod <pod-name> | grep Events -A 20

# Check volume mounts in pod spec
kubectl get pod <pod-name> -o yaml | grep -A 10 volumeMounts

# Verify file permissions
kubectl exec <pod-name> -- ls -la /mounted/path
kubectl exec <pod-name> -- df -h  # Check if volume is mounted
```

### **Application Troubleshooting**

**Container startup issues:**
```bash
# Check container logs
kubectl logs <pod-name> -c <container-name>
kubectl logs <pod-name> --previous  # Previous instance

# Check container resource usage
kubectl top pod <pod-name> --containers

# Check environment variables
kubectl exec <pod-name> -- env

# Check mounted secrets and configmaps
kubectl exec <pod-name> -- ls -la /etc/secrets
kubectl exec <pod-name> -- cat /etc/config/app.conf
```

**Health check failures:**
```bash
# Check liveness and readiness probes
kubectl describe pod <pod-name> | grep -A 5 Liveness
kubectl describe pod <pod-name> | grep -A 5 Readiness

# Test health endpoints manually
kubectl exec <pod-name> -- curl -f http://localhost:8080/health
kubectl port-forward <pod-name> 8080:8080
curl http://localhost:8080/health
```

**Resource constraints:**
```bash
# Check resource requests and limits
kubectl describe pod <pod-name> | grep -A 10 Limits
kubectl describe pod <pod-name> | grep -A 10 Requests

# Check if pod is being throttled or OOMKilled
kubectl describe pod <pod-name> | grep -i oom
kubectl describe pod <pod-name> | grep -i killed

# Check node resources
kubectl top nodes
kubectl describe node <node-name> | grep -A 5 "Allocated resources"
```

## Monitoring and Observability

**What monitoring involves:** Collecting, analyzing, and acting on metrics, logs, and traces from Kubernetes clusters and applications to ensure reliability and performance.

**Why it's essential:** Kubernetes complexity requires proactive monitoring to detect issues early, understand system behavior, optimize performance, and maintain reliability.

### **Cluster Monitoring**

**Cluster health checks:**
```bash
# Check cluster component status
kubectl get componentstatuses
kubectl cluster-info
kubectl get nodes
kubectl top nodes

# Check system pods
kubectl get pods -n kube-system
kubectl get pods -n kube-system -o wide

# Check cluster events
kubectl get events --sort-by=.metadata.creationTimestamp
kubectl get events --field-selector type=Warning
```

**Resource monitoring:**
```bash
# Resource usage across cluster
kubectl top nodes
kubectl top pods --all-namespaces
kubectl top pods --