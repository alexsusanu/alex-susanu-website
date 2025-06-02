# CKA Guide: Kubernetes Troubleshooting - Systematic Debugging and Problem Resolution

## Fundamental Conceptual Understanding

### The Philosophy of Systematic Troubleshooting

**The Scientific Method Applied to Debugging:**
```
Traditional Debugging (Chaotic):
├── Random changes based on hunches
├── Multiple simultaneous modifications
├── No hypothesis or prediction
├── Emotional decision making under pressure
└── No learning from failure patterns

Scientific Debugging (Systematic):
├── Observe symptoms and gather data
├── Form hypothesis about root cause
├── Design experiment to test hypothesis
├── Implement single change and measure result
├── Document findings and update mental models
└── Build knowledge base for future issues
```

**The Debugging Information Hierarchy:**
```
Level 4: Business Impact (Why it matters)
├── User experience degradation
├── Revenue/SLA impact
├── Customer satisfaction metrics
└── Business process disruption

Level 3: Application Behavior (What's wrong)
├── Error rates and response times
├── Feature functionality issues
├── Data consistency problems
└── Performance degradation

Level 2: System State (How it's failing)
├── Pod states and events
├── Resource utilization
├── Network connectivity
├── Storage accessibility
└── Service discovery issues

Level 1: Infrastructure Health (Root causes)
├── Node resource exhaustion
├── Control plane component health
├── Network infrastructure issues
├── Storage backend problems
└── Configuration inconsistencies
```

### Kubernetes Troubleshooting Mental Model

**The Dependency Stack:**
```
Application Layer:     Business logic, application configuration
├── Container Layer:   Image, runtime, resource limits, env vars
│   ├── Pod Layer:     Scheduling, networking, storage, lifecycle
│   │   ├── Node Layer: Kubelet, container runtime, OS, resources
│   │   │   ├── Cluster Layer: API server, etcd, scheduler, controllers
│   │   │   │   └── Infrastructure: Networking, storage, compute
│   │   │   │
│   │   │   └── Troubleshooting flows bottom-up:
│   │   │       "Is infrastructure healthy?"
│   │   │       "Are cluster components working?"
│   │   │       "Are nodes functioning properly?"
│   │   │       "Are pods scheduled and healthy?"
│   │   │       "Are containers running correctly?"
│   │   │       "Is application logic working?"
```

**The Five Whys Debugging Framework:**
```
Symptom: "Users can't access the web application"
Why 1: Why can't users access the app?
       → Service endpoints are empty

Why 2: Why are service endpoints empty?
       → Pods are not in Ready state

Why 3: Why are pods not ready?
       → Readiness probe is failing

Why 4: Why is readiness probe failing?
       → Database connection timeout

Why 5: Why is database timing out?
       → Database pod was killed due to OOMKilled

Root Cause: Insufficient memory limits for database workload
Solution: Increase memory limits and add resource monitoring
```

## Cluster and Node Logging

### Control Plane Component Logging

**API Server Diagnostics:**
```bash
# Check API server logs (methods vary by installation)
# kubeadm clusters
sudo journalctl -u kubelet -f
kubectl logs -n kube-system kube-apiserver-<master-node>

# Check API server health endpoints
kubectl get componentstatuses
curl -k https://<api-server>:6443/healthz
curl -k https://<api-server>:6443/version

# API server audit logs (if enabled)
sudo tail -f /var/log/audit.log

# Common API server issues:
# 1. Certificate expiration
sudo openssl x509 -in /etc/kubernetes/pki/apiserver.crt -text -noout | grep "Not After"

# 2. etcd connectivity
kubectl logs -n kube-system kube-apiserver-<node> | grep -i etcd

# 3. Resource exhaustion
kubectl top nodes
kubectl describe node <master-node> | grep -A 10 "Allocated resources"
```

**etcd Diagnostics:**
```bash
# Check etcd health
kubectl logs -n kube-system etcd-<master-node>

# etcd health check (if etcdctl available)
sudo ETCDCTL_API=3 etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
  --key=/etc/kubernetes/pki/etcd/healthcheck-client.key \
  endpoint health

# Check etcd member list
sudo ETCDCTL_API=3 etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
  --key=/etc/kubernetes/pki/etcd/healthcheck-client.key \
  member list

# etcd database size and performance
sudo ETCDCTL_API=3 etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
  --key=/etc/kubernetes/pki/etcd/healthcheck-client.key \
  endpoint status --write-out=table
```

**Scheduler and Controller Manager Diagnostics:**
```bash
# Check scheduler logs
kubectl logs -n kube-system kube-scheduler-<master-node>

# Check controller manager logs
kubectl logs -n kube-system kube-controller-manager-<master-node>

# Look for common issues:
# 1. Resource constraints
kubectl logs -n kube-system kube-scheduler-<node> | grep -i "insufficient"

# 2. Failed pod scheduling
kubectl get events --field-selector reason=FailedScheduling

# 3. Controller failures
kubectl get events | grep -i "error\|failed\|warning"

# Check leader election status
kubectl logs -n kube-system kube-controller-manager-<node> | grep -i "leader"
kubectl logs -n kube-system kube-scheduler-<node> | grep -i "leader"
```

### Node-Level Diagnostics

**Kubelet Troubleshooting:**
```bash
# Check kubelet status and logs
sudo systemctl status kubelet
sudo journalctl -u kubelet -f --since "1 hour ago"

# Kubelet configuration
sudo cat /etc/kubernetes/kubelet.conf
sudo cat /var/lib/kubelet/config.yaml

# Common kubelet issues:
# 1. Certificate problems
sudo journalctl -u kubelet | grep -i certificate

# 2. Resource pressure
kubectl describe node <node-name> | grep -i "pressure\|condition"

# 3. Container runtime issues
sudo journalctl -u kubelet | grep -i "runtime\|docker\|containerd"

# 4. Network plugin issues
sudo journalctl -u kubelet | grep -i "network\|cni"
```

**Container Runtime Diagnostics:**
```bash
# Docker runtime (if used)
sudo docker ps -a
sudo docker logs <container-id>
sudo systemctl status docker
sudo journalctl -u docker

# containerd runtime
sudo crictl ps -a
sudo crictl logs <container-id>
sudo systemctl status containerd
sudo journalctl -u containerd

# Container runtime configuration
sudo cat /etc/docker/daemon.json        # Docker
sudo cat /etc/containerd/config.toml    # containerd

# Check container runtime connectivity
sudo crictl version
sudo crictl info
```

**Node Resource Monitoring:**
```bash
# System resource utilization
top
htop
iostat -x 1
free -h
df -h

# Kubernetes resource monitoring
kubectl top nodes
kubectl describe node <node-name>

# Process-level monitoring
sudo ps aux | grep kube
sudo ss -tulpn | grep kube

# File descriptor and connection limits
sudo lsof | wc -l
sudo cat /proc/sys/fs/file-max
sudo ulimit -n

# Disk space issues (common cause of failures)
sudo du -sh /var/lib/kubelet/*
sudo du -sh /var/lib/docker/*         # If using Docker
sudo du -sh /var/lib/containerd/*     # If using containerd
```

### Log Aggregation and Analysis

**Centralized Logging Architecture:**
```yaml
# Fluentd DaemonSet for log collection
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd
  namespace: kube-system
spec:
  selector:
    matchLabels:
      name: fluentd
  template:
    metadata:
      labels:
        name: fluentd
    spec:
      serviceAccount: fluentd
      tolerations:
      - key: node-role.kubernetes.io/master
        effect: NoSchedule
      containers:
      - name: fluentd
        image: fluent/fluentd-kubernetes-daemonset:v1-debian-elasticsearch
        env:
        - name: FLUENT_ELASTICSEARCH_HOST
          value: "elasticsearch.logging.svc.cluster.local"
        - name: FLUENT_ELASTICSEARCH_PORT
          value: "9200"
        resources:
          limits:
            memory: 200Mi
          requests:
            cpu: 100m
            memory: 200Mi
        volumeMounts:
        - name: varlog
          mountPath: /var/log
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
        - name: fluentd-config
          mountPath: /fluentd/etc
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
      - name: fluentd-config
        configMap:
          name: fluentd-config

---
# Fluentd configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
  namespace: kube-system
data:
  fluent.conf: |
    <source>
      @type tail
      @id in_tail_container_logs
      path /var/log/containers/*.log
      pos_file /var/log/fluentd-containers.log.pos
      tag kubernetes.*
      read_from_head true
      <parse>
        @type json
        time_format %Y-%m-%dT%H:%M:%S.%NZ
      </parse>
    </source>
    
    <filter kubernetes.**>
      @type kubernetes_metadata
    </filter>
    
    <match kubernetes.**>
      @type elasticsearch
      host elasticsearch.logging.svc.cluster.local
      port 9200
      logstash_format true
      logstash_prefix kubernetes
      <buffer>
        timekey 1h
        timekey_use_utc true
        timekey_wait 10m
      </buffer>
    </match>
```

## Application Monitoring

### Application Performance Monitoring

**Kubernetes Native Monitoring Stack:**
```yaml
# Prometheus configuration for application monitoring
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s
    
    rule_files:
      - "/etc/prometheus/rules/*.yml"
    
    scrape_configs:
    # Kubernetes API server
    - job_name: 'kubernetes-apiservers'
      kubernetes_sd_configs:
      - role: endpoints
      scheme: https
      tls_config:
        ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
      bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
      relabel_configs:
      - source_labels: [__meta_kubernetes_namespace, __meta_kubernetes_service_name, __meta_kubernetes_endpoint_port_name]
        action: keep
        regex: default;kubernetes;https
    
    # Kubernetes nodes
    - job_name: 'kubernetes-nodes'
      kubernetes_sd_configs:
      - role: node
      scheme: https
      tls_config:
        ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
      bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
      relabel_configs:
      - action: labelmap
        regex: __meta_kubernetes_node_label_(.+)
    
    # Kubernetes pods
    - job_name: 'kubernetes-pods'
      kubernetes_sd_configs:
      - role: pod
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__
      - action: labelmap
        regex: __meta_kubernetes_pod_label_(.+)
      - source_labels: [__meta_kubernetes_namespace]
        action: replace
        target_label: kubernetes_namespace
      - source_labels: [__meta_kubernetes_pod_name]
        action: replace
        target_label: kubernetes_pod_name

---
# Application with Prometheus metrics
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp-monitored
spec:
  replicas: 3
  selector:
    matchLabels:
      app: webapp
  template:
    metadata:
      labels:
        app: webapp
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: webapp
        image: webapp:latest
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 9090
          name: metrics
        env:
        - name: ENABLE_METRICS
          value: "true"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
```

**Application Health Check Patterns:**
```yaml
# Comprehensive health check implementation
apiVersion: v1
kind: Pod
metadata:
  name: robust-webapp
spec:
  containers:
  - name: webapp
    image: webapp:latest
    ports:
    - containerPort: 8080
      name: http
    
    # Startup probe for slow-starting applications
    startupProbe:
      httpGet:
        path: /startup
        port: 8080
      initialDelaySeconds: 10
      periodSeconds: 5
      timeoutSeconds: 3
      successThreshold: 1
      failureThreshold: 30      # 30 * 5s = 150s max startup time
    
    # Readiness probe for traffic management
    readinessProbe:
      httpGet:
        path: /ready
        port: 8080
        httpHeaders:
        - name: X-Health-Check
          value: readiness
      initialDelaySeconds: 5
      periodSeconds: 10
      timeoutSeconds: 5
      successThreshold: 1
      failureThreshold: 3
    
    # Liveness probe for restart decisions
    livenessProbe:
      httpGet:
        path: /health
        port: 8080
        httpHeaders:
        - name: X-Health-Check
          value: liveness
      initialDelaySeconds: 30
      periodSeconds: 20
      timeoutSeconds: 10
      successThreshold: 1
      failureThreshold: 3
    
    # Resource constraints for predictable behavior
    resources:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        cpu: 1000m
        memory: 512Mi
    
    # Environment for health check configuration
    env:
    - name: HEALTH_CHECK_TIMEOUT
      value: "5s"
    - name: DATABASE_URL
      valueFrom:
        secretKeyRef:
          name: app-secrets
          key: database-url
```

### Custom Metrics and Alerting

**Prometheus Alert Rules:**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-rules
  namespace: monitoring
data:
  app-alerts.yml: |
    groups:
    - name: application-alerts
      rules:
      # High error rate
      - alert: HighErrorRate
        expr: |
          (
            rate(http_requests_total{status=~"5.."}[5m]) /
            rate(http_requests_total[5m])
          ) * 100 > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }}% for {{ $labels.job }}"
      
      # High response time
      - alert: HighLatency
        expr: |
          histogram_quantile(0.95, 
            rate(http_request_duration_seconds_bucket[5m])
          ) * 1000 > 500
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High latency detected"
          description: "95th percentile latency is {{ $value }}ms"
      
      # Pod not ready
      - alert: PodNotReady
        expr: |
          kube_pod_status_ready{condition="false"} == 1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Pod not ready"
          description: "Pod {{ $labels.pod }} in namespace {{ $labels.namespace }} not ready"
      
      # High memory usage
      - alert: HighMemoryUsage
        expr: |
          (
            container_memory_usage_bytes{container!="POD",container!=""} /
            container_spec_memory_limit_bytes > 0.9
          ) * 100
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Container {{ $labels.container }} using {{ $value }}% of memory limit"
      
      # Persistent volume filling up
      - alert: PVFillingUp
        expr: |
          (
            kubelet_volume_stats_used_bytes /
            kubelet_volume_stats_capacity_bytes
          ) * 100 > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Persistent volume filling up"
          description: "PV {{ $labels.persistentvolumeclaim }} is {{ $value }}% full"
```

## Container Logs Management

### Container Log Collection Strategies

**stdout/stderr Log Management:**
```bash
# Basic container log viewing
kubectl logs <pod-name>
kubectl logs <pod-name> -c <container-name>    # Multi-container pod
kubectl logs <pod-name> --previous             # Previous container instance
kubectl logs <pod-name> -f                     # Follow logs
kubectl logs <pod-name> --since=1h             # Last hour
kubectl logs <pod-name> --tail=100             # Last 100 lines

# Logs from multiple pods
kubectl logs -l app=webapp                     # All pods with label
kubectl logs -l app=webapp --prefix=true       # Show pod name prefix

# Logs from deployments/replicasets
kubectl logs deployment/webapp
kubectl logs replicaset/webapp-abc123

# Save logs to file
kubectl logs <pod-name> > app.log

# Stream logs with timestamps
kubectl logs <pod-name> -f --timestamps=true
```

**Log Rotation and Retention:**
```yaml
# Kubelet log rotation configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubelet-config
  namespace: kube-system
data:
  config.yaml: |
    apiVersion: kubelet.config.k8s.io/v1beta1
    kind: KubeletConfiguration
    # Log rotation settings
    containerLogMaxSize: "10Mi"         # Max size per log file
    containerLogMaxFiles: 5             # Max number of rotated files
    
    # Log driver settings
    logging:
      format: json                      # json or text
      verbosity: 2                      # 0-10, higher = more verbose
      
    # Node-level log collection
    clusterDNS:
    - 10.96.0.10
    clusterDomain: cluster.local
```

**Structured Logging Best Practices:**
```yaml
# Application with structured logging
apiVersion: v1
kind: Pod
metadata:
  name: structured-logger
spec:
  containers:
  - name: app
    image: app:latest
    env:
    - name: LOG_LEVEL
      value: "info"
    - name: LOG_FORMAT
      value: "json"                     # Enable JSON logging
    - name: LOG_CORRELATION_ID
      value: "true"                     # Add correlation IDs
    command:
    - /app/server
    - --log-level=$(LOG_LEVEL)
    - --log-format=$(LOG_FORMAT)
    
    # Example structured log output:
    # {
    #   "timestamp": "2023-10-15T14:30:45.123Z",
    #   "level": "info",
    #   "message": "User login successful",
    #   "user_id": "12345",
    #   "correlation_id": "abc-def-ghi",
    #   "request_id": "req-789",
    #   "duration_ms": 245,
    #   "source": "auth-service"
    # }
```

### Log Analysis and Debugging

**Log Analysis Techniques:**
```bash
# Search for specific patterns
kubectl logs <pod-name> | grep -i error
kubectl logs <pod-name> | grep -E "(error|warn|fatal)"

# Count error occurrences
kubectl logs <pod-name> | grep -c "ERROR"

# Extract timestamps and analyze timing
kubectl logs <pod-name> --timestamps | grep "slow query"

# Analyze log patterns with awk
kubectl logs <pod-name> | awk '/ERROR/ {print $0}'

# Monitor logs in real-time with filtering
kubectl logs <pod-name> -f | grep --line-buffered "user_id.*12345"

# Export logs for external analysis
kubectl logs <pod-name> --since=24h > app-logs-$(date +%Y%m%d).log
```

**Log Aggregation Queries:**
```bash
# Using tools like jq for JSON log analysis
kubectl logs <pod-name> | jq -r 'select(.level == "error") | .message'

# Extract specific fields from structured logs
kubectl logs <pod-name> | jq -r '.timestamp + " " + .level + " " + .message'

# Count log levels
kubectl logs <pod-name> | jq -r '.level' | sort | uniq -c

# Filter by time range (if timestamps in logs)
kubectl logs <pod-name> | jq -r 'select(.timestamp > "2023-10-15T14:00:00Z")'

# Correlation ID tracking
kubectl logs <pod-name> | jq -r 'select(.correlation_id == "abc-123")'
```

## Application Failure Troubleshooting

### Pod Lifecycle Troubleshooting

**Pod State Analysis:**
```bash
# Comprehensive pod status check
kubectl get pods -o wide
kubectl describe pod <pod-name>

# Check pod events (most important for troubleshooting)
kubectl get events --field-selector involvedObject.name=<pod-name>
kubectl get events --sort-by=.metadata.creationTimestamp

# Pod status phases and what they mean:
# Pending:     Pod accepted but not scheduled/started
# Running:     Pod bound to node, containers started
# Succeeded:   All containers terminated successfully
# Failed:      All containers terminated, at least one failed
# Unknown:     Pod state unknown (usually communication issues)
```

**Common Pod Failure Patterns:**

**ImagePullBackOff / ErrImagePull:**
```bash
# Diagnosis
kubectl describe pod <pod-name>
# Events:
#   Warning  Failed     pod/webapp  Failed to pull image "webapp:nonexistent": rpc error: code = NotFound

# Common causes and solutions:
# 1. Image doesn't exist
kubectl get pods <pod-name> -o jsonpath='{.spec.containers[*].image}'

# 2. Registry authentication issues
kubectl get secrets
kubectl describe secret <registry-secret>

# 3. Network issues reaching registry
kubectl exec -it <debug-pod> -- nslookup registry.example.com
kubectl exec -it <debug-pod> -- curl -I https://registry.example.com/v2/

# 4. Registry is down
kubectl describe pod <pod-name> | grep -A 5 Events:
```

**CrashLoopBackOff:**
```bash
# Diagnosis
kubectl logs <pod-name> --previous    # Previous container logs
kubectl describe pod <pod-name>

# Common causes:
# 1. Application startup failure
kubectl logs <pod-name> --previous | tail -50

# 2. Insufficient resources
kubectl describe pod <pod-name> | grep -A 10 "Limits\|Requests"
kubectl top pod <pod-name>

# 3. Configuration issues
kubectl get pod <pod-name> -o yaml | grep -A 20 env:
kubectl describe configmap <config-name>
kubectl describe secret <secret-name>

# 4. Health check failures
kubectl describe pod <pod-name> | grep -A 5 "Liveness\|Readiness"
```

**Pending State Troubleshooting:**
```bash
# Check scheduling issues
kubectl describe pod <pod-name> | grep -A 10 Events:

# Common pending causes:
# 1. Insufficient resources
kubectl describe nodes | grep -A 5 "Allocated resources"
kubectl top nodes

# 2. Node selector/affinity issues
kubectl get pod <pod-name> -o yaml | grep -A 10 nodeSelector
kubectl get nodes --show-labels

# 3. Taints and tolerations
kubectl describe nodes | grep -A 5 Taints:
kubectl get pod <pod-name> -o yaml | grep -A 10 tolerations:

# 4. PVC binding issues
kubectl get pvc
kubectl describe pvc <pvc-name>

# 5. Pod disruption budgets
kubectl get pdb
kubectl describe pdb <pdb-name>
```

### Application Configuration Debugging

**Environment Variable Issues:**
```bash
# Check environment variables in running pod
kubectl exec -it <pod-name> -- env | sort

# Check environment variable sources
kubectl get pod <pod-name> -o yaml | grep -A 20 env:

# Debug ConfigMap issues
kubectl get configmap <config-name> -o yaml
kubectl describe configmap <config-name>

# Debug Secret issues
kubectl get secret <secret-name> -o yaml
kubectl get secret <secret-name> -o jsonpath='{.data}' | base64 -d

# Test configuration inside pod
kubectl exec -it <pod-name> -- cat /etc/config/app.conf
kubectl exec -it <pod-name> -- ls -la /etc/secrets/
```

**Volume Mount Issues:**
```bash
# Check volume mounts
kubectl describe pod <pod-name> | grep -A 10 "Mounts:"

# Verify volumes are mounted correctly
kubectl exec -it <pod-name> -- mount | grep -v "proc\|sys\|dev"
kubectl exec -it <pod-name> -- df -h

# Check file permissions
kubectl exec -it <pod-name> -- ls -la /mounted/path/

# Test volume accessibility
kubectl exec -it <pod-name> -- touch /mounted/path/test-file
kubectl exec -it <pod-name> -- rm /mounted/path/test-file

# Check PVC status
kubectl get pvc
kubectl describe pvc <pvc-name>
```

### Performance Troubleshooting

**Resource Constraint Analysis:**
```bash
# CPU and memory usage
kubectl top pod <pod-name> --containers
kubectl top pod <pod-name> --sort-by=cpu
kubectl top pod <pod-name> --sort-by=memory

# Resource limits vs usage
kubectl describe pod <pod-name> | grep -A 10 "Limits\|Requests"

# Node resource pressure
kubectl describe node <node-name> | grep -A 5 "Conditions:"
kubectl describe node <node-name> | grep -A 10 "Allocated resources:"

# Check for OOMKilled containers
kubectl get events | grep OOMKilled
kubectl describe pod <pod-name> | grep -i oom
```

**Application Performance Debugging:**
```bash
# Check application metrics (if available)
kubectl port-forward <pod-name> 9090:9090
curl http://localhost:9090/metrics

# Database connection issues
kubectl exec -it <pod-name> -- netstat -an | grep :5432
kubectl exec -it <pod-name> -- nslookup database-service

# Network latency testing
kubectl exec -it <pod-name> -- ping <target-service>
kubectl exec -it <pod-name> -- curl -w "@curl-format.txt" -o /dev/null -s http://api-service/health

# File I/O performance
kubectl exec -it <pod-name> -- dd if=/dev/zero of=/tmp/test bs=1M count=100
kubectl exec -it <pod-name> -- sync
kubectl exec -it <pod-name> -- dd if=/tmp/test of=/dev/null bs=1M
```

## Cluster Component Failure Troubleshooting

### Control Plane Component Failures

**API Server Troubleshooting:**
```bash
# API Server health checks
kubectl cluster-info
kubectl get componentstatuses

# Direct API server health check
curl -k https://<api-server-ip>:6443/healthz
curl -k https://<api-server-ip>:6443/version

# API server logs analysis
sudo journalctl -u kubelet | grep apiserver
kubectl logs -n kube-system kube-apiserver-<master-node>

# Common API server issues:
# 1. Certificate expiration
sudo openssl x509 -in /etc/kubernetes/pki/apiserver.crt -text -noout | grep "Not After"
sudo openssl x509 -in /etc/kubernetes/pki/apiserver-kubelet-client.crt -text -noout | grep "Not After"

# 2. etcd connectivity issues
kubectl logs -n kube-system kube-apiserver-<master> | grep -i etcd

# 3. Port conflicts or binding issues
sudo netstat -tulpn | grep :6443
sudo ss -tulpn | grep :6443

# 4. Resource exhaustion
kubectl describe node <master-node> | grep -A 10 "Allocated resources"
free -h
df -h /var/lib/etcd
```

**etcd Troubleshooting:**
```bash
# etcd cluster health
sudo ETCDCTL_API=3 etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
  --key=/etc/kubernetes/pki/etcd/healthcheck-client.key \
  endpoint health

# etcd cluster status
sudo ETCDCTL_API=3 etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
  --key=/etc/kubernetes/pki/etcd/healthcheck-client.key \
  endpoint status --write-out=table

# etcd member list
sudo ETCDCTL_API=3 etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
  --key=/etc/kubernetes/pki/etcd/healthcheck-client.key \
  member list

# etcd database size (large DB can cause performance issues)
sudo ETCDCTL_API=3 etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
  --key=/etc/kubernetes/pki/etcd/healthcheck-client.key \
  endpoint status --write-out=json | jq '.[] | .Status.dbSize'

# etcd defragmentation (if database is fragmented)
sudo ETCDCTL_API=3 etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
  --key=/etc/kubernetes/pki/etcd/healthcheck-client.key \
  defrag
```

**Scheduler Troubleshooting:**
```bash
# Scheduler health and logs
kubectl logs -n kube-system kube-scheduler-<master-node>

# Check for scheduling failures
kubectl get events | grep FailedScheduling
kubectl get pods --all-namespaces | grep Pending

# Scheduler configuration
kubectl get configmap kube-scheduler-config -n kube-system -o yaml

# Common scheduler issues:
# 1. Resource constraints
kubectl describe node <node-name> | grep -A 10 "Allocated resources"

# 2. Affinity/anti-affinity conflicts
kubectl get pod <pending-pod> -o yaml | grep -A 20 affinity:

# 3. Taints preventing scheduling
kubectl describe nodes | grep -A 3 Taints:

# 4. PVC binding delays
kubectl get pvc | grep Pending
kubectl describe pvc <pvc-name>
```

### Worker Node Failures

**Node Status Analysis:**
```bash
# Check node status
kubectl get nodes
kubectl describe node <node-name>

# Node conditions analysis
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.conditions[?(@.type=="Ready")].status}{"\n"}{end}'

# Common node conditions:
# Ready: Node is healthy and ready to accept pods
# MemoryPressure: Node is running low on memory
# DiskPressure: Node is running low on disk space
# PIDPressure: Node is running low on process IDs
# NetworkUnavailable: Node network is not configured
```

**Kubelet Troubleshooting:**
```bash
# Kubelet service status
sudo systemctl status kubelet
sudo journalctl -u kubelet -f

# Kubelet configuration
sudo cat /var/lib/kubelet/config.yaml
sudo cat /etc/kubernetes/kubelet.conf

# Common kubelet issues:
# 1. Certificate expiration
sudo journalctl -u kubelet | grep -i certificate
sudo openssl x509 -in /var/lib/kubelet/pki/kubelet-client-current.pem -text -noout | grep "Not After"

# 2. Disk pressure
df -h
sudo du -sh /var/lib/kubelet/*
sudo du -sh /var/lib/docker/*     # If using Docker
sudo du -sh /var/lib/containerd/* # If using containerd

# 3. Memory pressure
free -h
cat /proc/meminfo

# 4. Container runtime issues
sudo systemctl status docker      # If using Docker
sudo systemctl status containerd  # If using containerd
sudo crictl version
sudo crictl info
```

**Container Runtime Troubleshooting:**
```bash
# Container runtime connectivity
sudo crictl version
sudo crictl info

# Running containers
sudo crictl ps
sudo crictl ps -a                 # Include stopped containers

# Container logs
sudo crictl logs <container-id>

# Container inspect
sudo crictl inspect <container-id>

# Image management
sudo crictl images
sudo crictl rmi <image-id>

# Pod sandbox management
sudo crictl pods
sudo crictl inspectp <pod-id>

# Runtime configuration issues
sudo cat /etc/containerd/config.toml
sudo systemctl status containerd
sudo journalctl -u containerd
```

## Network Troubleshooting

### Pod-to-Pod Communication Issues

**Network Connectivity Debugging:**
```bash
# Basic connectivity test
kubectl run test-pod --image=busybox --rm -it -- /bin/sh
# Inside pod:
ping <target-pod-ip>
nslookup <service-name>
wget -qO- http://<service-name>:<port>/health

# DNS resolution testing
kubectl run dns-test --image=busybox --rm -it -- nslookup kubernetes.default
kubectl run dns-test --image=busybox --rm -it -- nslookup <service-name>.<namespace>.svc.cluster.local

# Network troubleshooting toolkit
kubectl run netshoot --image=nicolaka/netshoot --rm -it -- bash
# Tools available: ping, nslookup, dig, curl, netstat, ss, tcpdump, etc.
```

**CNI Plugin Troubleshooting:**
```bash
# Check CNI plugin status
kubectl get pods -n kube-system | grep -E "(flannel|calico|weave|cilium)"
kubectl logs -n kube-system <cni-pod-name>

# CNI configuration
ls -la /etc/cni/net.d/
cat /etc/cni/net.d/*.conf

# Network interface inspection
ip addr show
ip route show
brctl show                         # If using bridge networking

# Container network namespace debugging
sudo crictl exec -it <container-id> ip addr show
sudo crictl exec -it <container-id> ip route show
```

**Service Discovery Issues:**
```bash
# Check service configuration
kubectl get svc
kubectl describe svc <service-name>

# Check endpoints
kubectl get endpoints <service-name>
kubectl describe endpoints <service-name>

# Service without endpoints troubleshooting:
# 1. Check pod labels match service selector
kubectl get pods --show-labels
kubectl get svc <service-name> -o yaml | grep selector: -A 3

# 2. Check pod readiness
kubectl get pods
kubectl describe pod <pod-name> | grep -A 5 "Readiness:"

# 3. Check port configuration
kubectl get svc <service-name> -o yaml | grep -A 5 ports:
kubectl get pods <pod-name> -o yaml | grep -A 5 ports:
```

### kube-proxy and Load Balancing Issues

**kube-proxy Troubleshooting:**
```bash
# Check kube-proxy status
kubectl get pods -n kube-system | grep kube-proxy
kubectl logs -n kube-system <kube-proxy-pod>

# kube-proxy configuration
kubectl get configmap kube-proxy -n kube-system -o yaml

# Check iptables rules (iptables mode)
sudo iptables -t nat -L KUBE-SERVICES
sudo iptables -t nat -L KUBE-NODEPORTS
sudo iptables -t nat -L | grep <service-name>

# Check IPVS rules (IPVS mode)
sudo ipvsadm -L -n
sudo ipvsadm -L -n -t <service-cluster-ip>:<port>

# Network policies blocking traffic
kubectl get networkpolicies
kubectl describe networkpolicy <policy-name>
```

**Ingress Troubleshooting:**
```bash
# Check ingress controller
kubectl get pods -n ingress-nginx
kubectl logs -n ingress-nginx <ingress-controller-pod>

# Check ingress resources
kubectl get ingress
kubectl describe ingress <ingress-name>

# Test ingress connectivity
curl -H "Host: <hostname>" http://<ingress-ip>/path

# Check TLS certificates
openssl s_client -connect <hostname>:443 -servername <hostname>
kubectl get secret <tls-secret-name> -o yaml

# Ingress class issues
kubectl get ingressclass
kubectl describe ingressclass <class-name>
```

### DNS Troubleshooting

**CoreDNS Issues:**
```bash
# Check CoreDNS pods
kubectl get pods -n kube-system -l k8s-app=kube-dns
kubectl logs -n kube-system -l k8s-app=kube-dns

# CoreDNS configuration
kubectl get configmap coredns -n kube-system -o yaml

# DNS resolution testing
kubectl run dns-debug --image=busybox --rm -it -- nslookup kubernetes.default

# Check DNS service
kubectl get svc -n kube-system kube-dns
kubectl describe svc -n kube-system kube-dns

# Pod DNS configuration
kubectl exec -it <pod-name> -- cat /etc/resolv.conf

# DNS performance testing
kubectl run dns-perf --image=busybox --rm -it -- \
  sh -c 'for i in $(seq 1 10); do time nslookup kubernetes.default; done'
```

**Network Policy Debugging:**
```bash
# Check network policies
kubectl get networkpolicies
kubectl describe networkpolicy <policy-name>

# Test connectivity with and without policies
kubectl apply -f deny-all-policy.yaml
kubectl run test-pod --image=busybox --rm -it -- ping <target-pod-ip>

# Network policy troubleshooting
kubectl get pods --show-labels
kubectl get networkpolicy <policy-name> -o yaml

# CNI-specific network policy logs
kubectl logs -n kube-system <calico-node-pod> | grep -i policy
kubectl logs -n kube-system <cilium-pod> | grep -i policy
```

## Advanced Troubleshooting Techniques

### Resource Exhaustion Scenarios

**Memory Pressure Debugging:**
```bash
# System memory analysis
free -h
cat /proc/meminfo | grep -E "(MemTotal|MemAvailable|MemFree)"

# Process memory usage
ps aux --sort=-%mem | head -20
top -o %MEM

# Container memory usage
kubectl top pods --sort-by=memory
kubectl top nodes

# Memory cgroup analysis
cat /sys/fs/cgroup/memory/memory.usage_in_bytes
cat /sys/fs/cgroup/memory/memory.limit_in_bytes

# OOMKilled investigation
sudo journalctl -k | grep -i "killed process"
kubectl get events | grep OOMKilled
dmesg | grep -i "out of memory"
```

**CPU Throttling Analysis:**
```bash
# CPU usage patterns
top -1                             # Show per-CPU usage
htop                              # Interactive process viewer
iostat -c 1                       # CPU utilization over time

# CPU throttling detection
cat /sys/fs/cgroup/cpu/cpu.stat | grep throttled

# Container CPU metrics
kubectl top pods --sort-by=cpu
kubectl top nodes

# Process CPU analysis
ps aux --sort=-%cpu | head -20
pidstat -u 1                      # Per-process CPU usage
```

**Disk Space Issues:**
```bash
# Disk usage analysis
df -h
du -sh /* | sort -hr | head -20

# Kubernetes-specific disk usage
sudo du -sh /var/lib/kubelet/*
sudo du -sh /var/lib/docker/*     # Docker
sudo du -sh /var/lib/containerd/* # containerd
sudo du -sh /var/log/*

# Clean up strategies
# 1. Remove unused container images
sudo crictl rmi --prune

# 2. Clean up logs
sudo journalctl --vacuum-time=7d
sudo find /var/log -name "*.log" -mtime +7 -delete

# 3. Clean up temporary files
sudo find /tmp -type f -mtime +7 -delete
```

### Debugging Tools and Techniques

**Network Debugging Toolkit:**
```yaml
# Advanced network debugging pod
apiVersion: v1
kind: Pod
metadata:
  name: network-debug
spec:
  hostNetwork: true               # Access host networking
  containers:
  - name: network-tools
    image: nicolaka/netshoot
    command: ["sleep", "3600"]
    securityContext:
      capabilities:
        add:
        - NET_ADMIN               # Network administration
        - SYS_ADMIN              # System administration
    volumeMounts:
    - name: proc
      mountPath: /host/proc
      readOnly: true
    - name: sys
      mountPath: /host/sys
      readOnly: true
  volumes:
  - name: proc
    hostPath:
      path: /proc
  - name: sys
    hostPath:
      path: /sys
  tolerations:
  - operator: Exists              # Schedule on any node

# Usage examples:
# kubectl exec -it network-debug -- tcpdump -i any host <pod-ip>
# kubectl exec -it network-debug -- ss -tuln
# kubectl exec -it network-debug -- iptables-save | grep <service-name>
```

**System Debugging Pod:**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: system-debug
spec:
  hostPID: true                   # Access host processes
  hostNetwork: true               # Access host networking
  containers:
  - name: debug
    image: busybox
    command: ["sleep", "3600"]
    securityContext:
      privileged: true            # Full system access
    volumeMounts:
    - name: host-root
      mountPath: /host
      readOnly: true
    - name: host-var-log
      mountPath: /host/var/log
      readOnly: true
  volumes:
  - name: host-root
    hostPath:
      path: /
  - name: host-var-log
    hostPath:
      path: /var/log
  tolerations:
  - operator: Exists

# Usage examples:
# kubectl exec -it system-debug -- chroot /host /bin/bash
# kubectl exec -it system-debug -- cat /host/var/log/messages
# kubectl exec -it system-debug -- ps aux
```

## Exam Tips & Quick Reference

### ⚡ Essential Troubleshooting Commands

```bash
# Quick cluster health check
kubectl cluster-info
kubectl get nodes
kubectl get pods --all-namespaces
kubectl get events --sort-by=.metadata.creationTimestamp

# Pod troubleshooting
kubectl describe pod <pod-name>
kubectl logs <pod-name> --previous
kubectl get events --field-selector involvedObject.name=<pod-name>

# Network debugging
kubectl run test --image=busybox --rm -it -- nslookup kubernetes.default
kubectl exec -it <pod> -- ping <target-ip>

# Resource checking
kubectl top nodes
kubectl top pods
kubectl describe node <node-name>
```

### 🎯 Common Exam Scenarios

**Scenario 1: Pod Won't Start**
```bash
# Systematic debugging approach
kubectl get pods                              # Check status
kubectl describe pod <pod-name>               # Check events
kubectl logs <pod-name>                       # Check logs
kubectl get events | grep <pod-name>          # Check events

# Check common issues
kubectl get pvc                               # Storage issues
kubectl get nodes                            # Node issues
kubectl describe node <node-name>            # Resource issues
```

**Scenario 2: Service Not Accessible**
```bash
# Service troubleshooting chain
kubectl get svc <service-name>                # Service exists?
kubectl get endpoints <service-name>          # Endpoints populated?
kubectl get pods -l <selector>                # Pods match selector?
kubectl describe pod <pod-name>               # Pods ready?
```

### 🚨 Critical Gotchas

1. **Always check events first**: `kubectl get events` reveals most issues
2. **Previous container logs**: Use `--previous` flag for crashed containers
3. **Resource constraints**: Check both requests/limits and actual usage
4. **DNS resolution**: Many issues are DNS-related, test with nslookup
5. **Network policies**: Can silently block traffic, check if applied
6. **Node conditions**: MemoryPressure/DiskPressure affect scheduling
7. **Time synchronization**: Clock skew causes certificate issues

## WHY This Matters - The Deeper Philosophy

### The Art and Science of Troubleshooting

**Systems Thinking in Practice:**
```
Emergent Behavior Understanding:
├── Complex systems fail in unexpected ways
├── Root causes often distant from symptoms
├── Multiple failures can cascade and amplify
├── Human factors influence technical failures
└── Documentation and communication are part of the solution

Mental Model Development:
├── Build accurate internal representations of system behavior
├── Continuously update models based on new evidence
├── Question assumptions when predictions fail
├── Develop intuition through pattern recognition
└── Share mental models with team members
```

**The Economics of Downtime:**
```
Cost Structure of System Failures:
├── Direct costs: Lost revenue, SLA penalties
├── Indirect costs: Customer trust, team morale
├── Opportunity costs: Features not delivered, innovation stalled
├── Recovery costs: Incident response, post-mortem, improvements
└── Insurance costs: Redundancy, monitoring, prevention

MTTR vs MTBF Investment Strategy:
├── Traditional: Invest heavily in preventing failures (high MTBF)
├── Modern: Accept failures, optimize for fast recovery (low MTTR)
├── Kubernetes philosophy: Design for failure, automate recovery
└── Career impact: MTTR skills more valuable than MTBF knowledge
```

### Information Theory and Signal Processing

**Signal vs Noise in System Observability:**
```
High-Signal Information:
├── Correlated metrics showing system stress
├── Error patterns indicating specific failure modes
├── Resource trends predicting future problems
├── User experience impact measurements
└── Actionable alerts that require human intervention

Low-Signal Information (Noise):
├── Normal operational variance in metrics
├── Transient errors that self-resolve
├── Verbose logs without filtering
├── Alerts that fire frequently without action
└── Vanity metrics that don't drive decisions

Signal Enhancement Techniques:
├── Correlation analysis across metrics
├── Anomaly detection using baselines
├── Context-aware alerting rules
├── Structured logging with searchable fields
└── Distributed tracing for request flows
```

**The Observer Effect in System Monitoring:**
```
Heisenberg Principle Applied:
"The act of observing a system changes the system"

Monitoring Overhead:
├── CPU cycles for metrics collection
├── Network bandwidth for telemetry
├── Storage for logs and metrics
├── Latency from instrumentation
└── Cognitive load from information overload

Optimization Strategies:
├── Sampling for high-volume metrics
├── Intelligent aggregation at source
├── Adaptive monitoring based on system state
├── Graceful degradation when monitoring fails
└── Cost-aware observability strategies
```

### Cognitive Science and Decision Making

**The Troubleshooting Cognitive Load Model:**
```
System 1 Thinking (Fast, Intuitive):
├── Pattern recognition from experience
├── Quick hypothesis formation
├── Emotional responses to familiar failures
├── Muscle memory for common commands
└── Bias toward recently encountered solutions

System 2 Thinking (Slow, Analytical):
├── Systematic hypothesis testing
├── Evidence-based reasoning
├── Root cause analysis frameworks
├── Documentation and knowledge sharing
└── Learning from failure patterns

Optimal Troubleshooting:
├── Use System 1 for initial assessment
├── Switch to System 2 for complex issues
├── Document System 2 insights for future System 1 use
├── Train teams to recognize when to switch modes
└── Build tools that augment both thinking systems
```

**The Expertise Paradox:**
```
Expert Blind Spots:
├── Overconfidence in pattern recognition
├── Anchoring on familiar solutions
├── Confirmation bias in hypothesis testing
├── Knowledge curse (can't see beginner perspective)
└── Solution bias (prefer known tools)

Beginner Advantages:
├── Fresh perspective on problems
├── Willingness to question assumptions
├── Systematic approach due to uncertainty
├── Less emotional attachment to solutions
└── Open to learning from documentation

Balanced Approach:
├── Pair experts with beginners for troubleshooting
├── Encourage diverse perspectives in incident response
├── Regularly challenge expert assumptions
├── Maintain curiosity despite growing expertise
└── Document reasoning, not just solutions
```

### Production Engineering Philosophy

**The Blame-Free Post-Mortem Culture:**
```
Traditional Incident Response:
├── Find the person responsible
├── Assign blame and punishment
├── Focus on immediate fix
├── Shame-driven learning avoidance
└── Cover-up of failure details

Site Reliability Engineering Approach:
├── Assume good intentions of all participants
├── Focus on systemic factors that enabled failure
├── Document everything for learning
├── Celebrate learning opportunities
├── Improve systems to prevent similar failures
└── Share knowledge across teams and organizations
```

**The Blameless Timeline Reconstruction:**
```
Incident Analysis Framework:
1. What happened? (Timeline of events)
2. Why did it happen? (Contributing factors)
3. How do we prevent it? (System improvements)
4. How do we detect it faster? (Monitoring improvements)
5. How do we recover faster? (Process improvements)

Key Principles:
├── No single point of failure caused the incident
├── Multiple small failures combined to create impact
├── Human error is a symptom, not a cause
├── System design enabled the human error
└── Focus on process and tooling improvements
```

### Career Development Implications

**For the Exam:**
- **Systematic Approach**: Demonstrate methodical troubleshooting process
- **Tool Proficiency**: Show comfort with kubectl, logs, events, describe
- **Problem Solving**: Break complex issues into manageable components
- **Communication**: Clearly document findings and reasoning

**For Production Systems:**
- **Incident Response**: Lead effective troubleshooting during outages
- **Reliability**: Design systems that are easier to debug and repair
- **Monitoring**: Implement observability that enables fast problem identification
- **Documentation**: Create runbooks and knowledge bases for common issues

**For Your Career:**
- **Leadership**: Guide teams through complex technical problem-solving
- **Systems Thinking**: Understand how complex systems fail and recover
- **Communication**: Translate technical issues for business stakeholders
- **Continuous Learning**: Develop expertise while maintaining beginner's mind

Understanding troubleshooting deeply teaches you how to **diagnose, debug, and resolve** complex system failures under pressure. This knowledge is fundamental to the CKA exam and essential for building reliable production systems.

Troubleshooting is where theory meets reality - it's where you prove your understanding of how systems actually work when they're not working. Master these skills, and you master the most valuable capability in production engineering: making broken things work again.