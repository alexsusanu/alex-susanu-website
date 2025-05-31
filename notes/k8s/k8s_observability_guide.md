# Kubernetes Observability & Monitoring: Complete Deep Technical Guide
category: DevOps
tags: kubernetes, observability, monitoring, logging, metrics, tracing, prometheus, grafana, jaeger

## Introduction to Kubernetes Observability

**Observability** is the ability to understand what's happening inside your Kubernetes cluster and applications by examining their external outputs. It's built on three pillars: **logs**, **metrics**, and **traces**.

### The Three Pillars of Observability

**Logs** - Detailed records of what happened
- Application logs, error messages, audit trails
- Useful for debugging specific issues and understanding application behavior

**Metrics** - Numerical measurements over time  
- CPU usage, memory consumption, request rates, error rates
- Useful for alerting, capacity planning, and performance monitoring

**Traces** - Request flows through distributed systems
- How a single request travels through multiple services
- Useful for understanding performance bottlenecks and service dependencies

### Why Kubernetes Observability is Complex

**Distributed by Nature:**
```
Single Request → API Gateway → Auth Service → Business Logic → Database
                     ↓              ↓              ↓              ↓
                 Container 1    Container 2    Container 3    External
                   Node A         Node B         Node C       Service
```

**Dynamic Environment:**
- Pods are created and destroyed constantly
- Services can scale up and down automatically
- Workloads move between nodes
- Network topology changes frequently

**Multiple Layers:**
- **Infrastructure** - Nodes, network, storage
- **Platform** - Kubernetes components (API server, kubelet, etcd)
- **Application** - Your microservices and workloads
- **User Experience** - End-to-end request performance

## Kubernetes Logging Architecture Deep Dive

### How Kubernetes Logging Works

**Container-Level Logging:**
Every container's stdout and stderr streams are automatically captured by the container runtime and stored as log files on the node.

**Log Storage Locations:**
```bash
# Container logs on node
/var/log/pods/<namespace>_<pod-name>_<pod-uid>/<container-name>/
├── 0.log     # Current log file
├── 0.log.1   # Rotated log file
└── 0.log.2   # Older rotated log file

# Symbolic links for easy access
/var/log/containers/
└── <pod-name>_<namespace>_<container-name>-<container-id>.log -> /var/log/pods/...
```

**Log Rotation:**
Container runtime automatically rotates logs to prevent disk space issues:
- Default: 10MB per file, keep 5 files
- Total: ~50MB per container maximum

### Application Logging Patterns

#### Structured Logging (JSON)
```go
// Go application with structured logging
package main

import (
    "log/slog"
    "os"
)

func main() {
    // Create structured logger
    logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
    
    // Log with structured data
    logger.Info("Application starting",
        "version", "1.2.3",
        "port", 8080,
        "environment", "production")
    
    logger.Error("Database connection failed",
        "error", "connection timeout",
        "host", "postgres.database.svc.cluster.local",
        "port", 5432,
        "retry_count", 3)
}
```

**Output:**
```json
{"time":"2024-01-15T10:30:00Z","level":"INFO","msg":"Application starting","version":"1.2.3","port":8080,"environment":"production"}
{"time":"2024-01-15T10:30:05Z","level":"ERROR","msg":"Database connection failed","error":"connection timeout","host":"postgres.database.svc.cluster.local","port":5432,"retry_count":3}
```

#### Multi-Line Log Handling
```yaml
# Java application with stack traces
apiVersion: v1
kind: Pod
metadata:
  name: java-app
  annotations:
    # Tell log collector to handle multi-line logs
    fluentbit.io/parser: java-multiline
spec:
  containers:
  - name: app
    image: java-app:latest
    # Java app logs stack traces across multiple lines
```

### Log Collection Strategies

#### Node-Level Log Collection with DaemonSet

**Fluent Bit DaemonSet:**
```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: fluent-bit
  template:
    metadata:
      labels:
        app: fluent-bit
    spec:
      serviceAccount: fluent-bit
      tolerations:
      - operator: Exists  # Run on all nodes including masters
      containers:
      - name: fluent-bit
        image: fluent/fluent-bit:2.0.8
        ports:
        - containerPort: 2020
          name: metrics
        volumeMounts:
        # Access to container logs
        - name: varlog
          mountPath: /var/log
          readOnly: true
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
        # Configuration
        - name: fluent-bit-config
          mountPath: /fluent-bit/etc
        env:
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
      volumes:
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

**Fluent Bit Configuration:**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: kube-system
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush         1
        Log_Level     info
        Daemon        off
        Parsers_File  parsers.conf
        HTTP_Server   On
        HTTP_Listen   0.0.0.0
        HTTP_Port     2020

    [INPUT]
        Name              tail
        Path              /var/log/containers/*.log
        Parser            cri
        Tag               kube.*
        Refresh_Interval  5
        Mem_Buf_Limit     50MB
        Skip_Long_Lines   On

    [FILTER]
        Name                kubernetes
        Match               kube.*
        Kube_URL            https://kubernetes.default.svc:443
        Kube_CA_File        /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        Kube_Token_File     /var/run/secrets/kubernetes.io/serviceaccount/token
        Merge_Log           On
        K8S-Logging.Parser  On
        K8S-Logging.Exclude Off

    [FILTER]
        Name                nest
        Match               kube.*
        Operation           lift
        Nested_under        kubernetes
        Add_prefix          kubernetes_

    [OUTPUT]
        Name                es
        Match               *
        Host                elasticsearch.logging.svc.cluster.local
        Port                9200
        Logstash_Format     On
        Logstash_Prefix     kubernetes
        Time_Key            @timestamp
        Time_Key_Format     %Y-%m-%dT%H:%M:%S.%L
        Include_Tag_Key     true
        Tag_Key             tag

  parsers.conf: |
    [PARSER]
        Name        cri
        Format      regex
        Regex       ^(?<time>[^ ]+) (?<stream>stdout|stderr) (?<logtag>[^ ]*) (?<message>.*)$
        Time_Key    time
        Time_Format %Y-%m-%dT%H:%M:%S.%L%z

    [PARSER]
        Name        json
        Format      json
        Time_Key    timestamp
        Time_Format %Y-%m-%dT%H:%M:%S.%L

    [PARSER]
        Name        java-multiline
        Format      regex
        Regex       /^(?<time>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}.\d{3})\s+(?<level>[^\s]+).*(?<message>.*)/
        Time_Key    time
        Time_Format %Y-%m-%d %H:%M:%S.%L
```

#### Sidecar Log Collection Pattern

**Application with Log Sidecar:**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-log-sidecar
spec:
  containers:
  # Main application
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: app-logs
      mountPath: /var/log/app
    # App writes logs to files in /var/log/app
  
  # Log collection sidecar
  - name: log-collector
    image: fluent/fluent-bit:latest
    volumeMounts:
    - name: app-logs
      mountPath: /var/log/app
      readOnly: true
    - name: sidecar-config
      mountPath: /fluent-bit/etc
    env:
    - name: POD_NAME
      valueFrom:
        fieldRef:
          fieldPath: metadata.name
    - name: NAMESPACE
      valueFrom:
        fieldRef:
          fieldPath: metadata.namespace
    resources:
      requests:
        cpu: 50m
        memory: 64Mi
      limits:
        cpu: 100m
        memory: 128Mi
  
  volumes:
  - name: app-logs
    emptyDir: {}
  - name: sidecar-config
    configMap:
      name: sidecar-fluent-bit-config
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: sidecar-fluent-bit-config
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush         1
        Log_Level     info
        Daemon        off

    [INPUT]
        Name              tail
        Path              /var/log/app/*.log
        Parser            json
        Tag               app.${POD_NAME}
        Refresh_Interval  5

    [FILTER]
        Name    modify
        Match   *
        Add     pod_name ${POD_NAME}
        Add     namespace ${NAMESPACE}

    [OUTPUT]
        Name    forward
        Match   *
        Host    log-aggregator.logging.svc.cluster.local
        Port    24224
```

### Centralized Logging with EFK Stack

#### Elasticsearch Cluster
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch
  namespace: logging
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
          storage: 100Gi
      storageClassName: fast-ssd
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
          value: "kubernetes-logs"
        - name: node.name
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: discovery.seed_hosts
          value: "elasticsearch-0.elasticsearch,elasticsearch-1.elasticsearch,elasticsearch-2.elasticsearch"
        - name: cluster.initial_master_nodes
          value: "elasticsearch-0,elasticsearch-1,elasticsearch-2"
        - name: ES_JAVA_OPTS
          value: "-Xms2g -Xmx2g"
        - name: xpack.security.enabled
          value: "false"
        
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
            memory: 4Gi
            cpu: 1000m
          limits:
            memory: 4Gi
            cpu: 2000m
```

#### Kibana Dashboard
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kibana
  namespace: logging
spec:
  replicas: 1
  selector:
    matchLabels:
      app: kibana
  template:
    metadata:
      labels:
        app: kibana
    spec:
      containers:
      - name: kibana
        image: kibana:8.5.0
        env:
        - name: ELASTICSEARCH_HOSTS
          value: "http://elasticsearch:9200"
        - name: SERVER_NAME
          value: "kibana"
        - name: SERVER_BASEPATH
          value: ""
        
        ports:
        - containerPort: 5601
          name: http
        
        resources:
          requests:
            memory: 1Gi
            cpu: 500m
          limits:
            memory: 2Gi
            cpu: 1000m
        
        readinessProbe:
          httpGet:
            path: /api/status
            port: 5601
          initialDelaySeconds: 30
          periodSeconds: 10
        
        livenessProbe:
          httpGet:
            path: /api/status
            port: 5601
          initialDelaySeconds: 60
          periodSeconds: 30
```

### Log Analysis and Alerting

#### Log-Based Alerting with ElastAlert
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: elastalert-config
  namespace: logging
data:
  config.yaml: |
    rules_folder: /opt/elastalert/rules
    run_every:
      minutes: 1
    buffer_time:
      minutes: 15
    es_host: elasticsearch.logging.svc.cluster.local
    es_port: 9200
    writeback_index: elastalert_status
    alert_time_limit:
      days: 2

  error_rate_rule.yaml: |
    name: High Error Rate
    type: frequency
    index: kubernetes-*
    num_events: 50
    timeframe:
      minutes: 5
    filter:
    - term:
        level: "ERROR"
    alert:
    - "slack"
    slack:
      slack_webhook_url: "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
      slack_channel_override: "#alerts"
      slack_title: "High Error Rate Detected"
      slack_title_link: "http://kibana.example.com"

  application_down_rule.yaml: |
    name: Application Down
    type: flatline
    index: kubernetes-*
    threshold: 0
    timeframe:
      minutes: 10
    filter:
    - term:
        kubernetes_labels_app: "critical-app"
    alert:
    - "email"
    email:
    - "oncall@company.com"
    smtp_host: "smtp.company.com"
    smtp_port: 587
    from_addr: "alerts@company.com"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: elastalert
  namespace: logging
spec:
  replicas: 1
  selector:
    matchLabels:
      app: elastalert
  template:
    metadata:
      labels:
        app: elastalert
    spec:
      containers:
      - name: elastalert
        image: jertel/elastalert2:latest
        volumeMounts:
        - name: elastalert-config
          mountPath: /opt/elastalert/config.yaml
          subPath: config.yaml
        - name: elastalert-config
          mountPath: /opt/elastalert/rules/error_rate_rule.yaml
          subPath: error_rate_rule.yaml
        - name: elastalert-config
          mountPath: /opt/elastalert/rules/application_down_rule.yaml
          subPath: application_down_rule.yaml
        resources:
          requests:
            memory: 256Mi
            cpu: 100m
      volumes:
      - name: elastalert-config
        configMap:
          name: elastalert-config
```

## Metrics Collection Deep Dive

### Prometheus Architecture

**How Prometheus Works:**
1. **Scraping** - Prometheus pulls metrics from targets at regular intervals
2. **Storage** - Time-series data stored in local TSDB (Time Series Database)
3. **Querying** - PromQL (Prometheus Query Language) for analysis
4. **Alerting** - Rules evaluate metrics and trigger alerts

**Prometheus Components:**
- **Prometheus Server** - Core server that scrapes and stores metrics
- **Pushgateway** - For batch jobs that can't be scraped
- **Alertmanager** - Handles alerts from Prometheus server
- **Exporters** - Applications that expose metrics for Prometheus

### Kubernetes Metrics Sources

#### Node-Level Metrics (Node Exporter)
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
      hostNetwork: true
      hostPID: true
      containers:
      - name: node-exporter
        image: prom/node-exporter:v1.5.0
        args:
        - '--path.rootfs=/host'
        - '--path.procfs=/host/proc'
        - '--path.sysfs=/host/sys'
        - '--collector.filesystem.ignored-mount-points=^/(sys|proc|dev|host|etc|rootfs/var/lib/docker/containers|rootfs/var/lib/docker/overlay2|rootfs/run/docker/netns|rootfs/var/lib/docker/aufs)($$|/)'
        - '--collector.systemd'
        - '--collector.processes'
        
        ports:
        - containerPort: 9100
          hostPort: 9100
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
            memory: 64Mi
            cpu: 50m
          limits:
            memory: 128Mi
            cpu: 100m
      
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

#### Kubernetes Component Metrics (kube-state-metrics)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kube-state-metrics
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: kube-state-metrics
  template:
    metadata:
      labels:
        app: kube-state-metrics
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
    spec:
      serviceAccountName: kube-state-metrics
      containers:
      - name: kube-state-metrics
        image: k8s.gcr.io/kube-state-metrics/kube-state-metrics:v2.7.0
        args:
        - --port=8080
        - --resources=pods,deployments,services,nodes,configmaps,secrets,persistentvolumes,persistentvolumeclaims,namespaces,endpoints,statefulsets,daemonsets,replicasets,jobs,cronjobs
        - --metric-labels-allowlist=pods=[*],deployments=[*],services=[*]
        
        ports:
        - containerPort: 8080
          name: http-metrics
        - containerPort: 8081
          name: telemetry
        
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 5
          timeoutSeconds: 5
        
        readinessProbe:
          httpGet:
            path: /
            port: 8081
          initialDelaySeconds: 5
          timeoutSeconds: 5
        
        resources:
          requests:
            memory: 128Mi
            cpu: 100m
          limits:
            memory: 256Mi
            cpu: 200m
```

#### Application Metrics Integration

**Go Application with Prometheus Metrics:**
```go
package main

import (
    "net/http"
    "time"
    
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
    // Counter - monotonically increasing value
    httpRequestsTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total number of HTTP requests",
        },
        []string{"method", "endpoint", "status_code"},
    )
    
    // Histogram - distribution of values
    httpRequestDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "http_request_duration_seconds",
            Help:    "Duration of HTTP requests in seconds",
            Buckets: prometheus.DefBuckets,
        },
        []string{"method", "endpoint"},
    )
    
    // Gauge - value that can go up and down
    activeConnections = prometheus.NewGauge(
        prometheus.GaugeOpts{
            Name: "active_connections",
            Help: "Number of active connections",
        },
    )
    
    // Summary - like histogram but with quantiles
    responseSize = prometheus.NewSummaryVec(
        prometheus.SummaryOpts{
            Name: "response_size_bytes",
            Help: "Response size in bytes",
            Objectives: map[float64]float64{0.5: 0.05, 0.9: 0.01, 0.99: 0.001},
        },
        []string{"endpoint"},
    )
)

func init() {
    // Register metrics with Prometheus
    prometheus.MustRegister(httpRequestsTotal)
    prometheus.MustRegister(httpRequestDuration)
    prometheus.MustRegister(activeConnections)
    prometheus.MustRegister(responseSize)
}

func metricsMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        
        // Track active connections
        activeConnections.Inc()
        defer activeConnections.Dec()
        
        // Wrap response writer to capture status code and size
        wrapped := &responseWriter{ResponseWriter: w, statusCode: 200}
        
        next.ServeHTTP(wrapped, r)
        
        // Record metrics
        duration := time.Since(start).Seconds()
        httpRequestDuration.WithLabelValues(r.Method, r.URL.Path).Observe(duration)
        httpRequestsTotal.WithLabelValues(r.Method, r.URL.Path, fmt.Sprintf("%d", wrapped.statusCode)).Inc()
        responseSize.WithLabelValues(r.URL.Path).Observe(float64(wrapped.size))
    })
}

func main() {
    // Expose metrics endpoint
    http.Handle("/metrics", promhttp.Handler())
    
    // Application endpoints
    mux := http.NewServeMux()
    mux.HandleFunc("/api/users", handleUsers)
    mux.HandleFunc("/api/health", handleHealth)
    
    // Wrap with metrics middleware
    http.Handle("/", metricsMiddleware(mux))
    
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

**Kubernetes Deployment with Metrics:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: metrics-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: metrics-app
  template:
    metadata:
      labels:
        app: metrics-app
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: app
        image: metrics-app:latest
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 9090
          name: metrics
        env:
        - name: METRICS_PORT
          value: "9090"
        resources:
          requests:
            memory: 256Mi
            cpu: 200m
          limits:
            memory: 512Mi
            cpu: 500m
```

### Prometheus Configuration

#### Complete Prometheus Setup
```yaml
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
      external_labels:
        cluster: 'kubernetes-cluster'
        region: 'us-west-2'

    rule_files:
    - "/etc/prometheus/rules/*.yml"

    alerting:
      alertmanagers:
      - static_configs:
        - targets:
          - alertmanager:9093

    scrape_configs:
    # Prometheus itself
    - job_name: 'prometheus'
      static_configs:
      - targets: ['localhost:9090']

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
      - target_label: __address__
        replacement: kubernetes.default.svc:443
      - source_labels: [__meta_kubernetes_node_name]
        regex: (.+)
        target_label: __metrics_path__
        replacement: /api/v1/nodes/${1}/proxy/metrics

    # Node Exporter
    - job_name: 'node-exporter'
      kubernetes_sd_configs:
      - role: endpoints
      relabel_configs:
      - source_labels: [__meta_kubernetes_service_name]
        action: keep
        regex: node-exporter
      - source_labels: [__meta_kubernetes_endpoint_port_name]
        action: keep
        regex: metrics

    # kube-state-metrics
    - job_name: 'kube-state-metrics'
      kubernetes_sd_configs:
      - role: endpoints
      relabel_configs:
      - source_labels: [__meta_kubernetes_service_name]
        action: keep
        regex: kube-state-metrics

    # Application pods with prometheus annotations
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

  alerts.yml: |
    groups:
    - name: kubernetes-apps
      rules:
      - alert: KubernetesPodCrashLooping
        expr: rate(kube_pod_container_status_restarts_total[15m]) > 0
        for: 0m
        labels:
          severity: warning
        annotations:
          summary: "Kubernetes pod crash looping (instance {{ $labels.instance }})"
          description: "Pod {{ $labels.pod }} is crash looping\n  VALUE = {{ $value }}\n  LABELS = {{ $labels }}"

      - alert: KubernetesPodNotReady
        expr: kube_pod_status_phase{phase="Pending"} == 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Kubernetes Pod not ready (instance {{ $labels.instance }})"
          description: "Pod {{ $labels.pod }} has been in a non-ready state for longer than 5 minutes.\n  VALUE = {{ $value }}\n  LABELS = {{ $labels }}"

    - name: kubernetes-resources
      rules:
      - alert: KubernetesNodeOutOfDisk
        expr: kube_node_status_condition{condition="OutOfDisk",status="true"} == 1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Kubernetes Node out of disk (instance {{ $labels.instance }})"
          description: "{{ $labels.node }} has OutOfDisk condition\n  VALUE = {{ $value }}\n  LABELS = {{ $labels }}"

      - alert: KubernetesMemoryPressure
        expr: kube_node_status_condition{condition="MemoryPressure",status="true"} == 1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Kubernetes memory pressure (instance {{ $labels.instance }})"
          description: "{{ $labels.node }} has MemoryPressure condition\n  VALUE = {{ $value }}\n  LABELS = {{ $labels }}"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
    spec:
      serviceAccountName: prometheus
      containers:
      - name: prometheus
        image: prom/prometheus:v2.40.0
        args:
        - '--storage.tsdb.retention.time=30d'
        - '--storage.tsdb.path=/prometheus'
        - '--config.file=/etc/prometheus/prometheus.yml'
        - '--web.console.libraries=/etc/prometheus/console_libraries'
        - '--web.console.templates=/etc/prometheus/consoles'
        - '--web.enable-lifecycle'
        - '--web.enable-admin-api'
        
        ports:
        - containerPort: 9090
          name: http
        
        volumeMounts:
        - name: prometheus-config
          mountPath: /etc/prometheus
        - name: prometheus-storage
          mountPath: /prometheus
        
        resources:
          requests:
            memory: 2Gi
            cpu: 1000m
          limits:
            memory: 4Gi
            cpu: 2000m
      
      volumes:
      - name: prometheus-config
        configMap:
          name: prometheus-config
      - name: prometheus-storage
        persistentVolumeClaim:
          claimName: prometheus-storage
```

### Grafana Dashboards

#### Grafana Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      containers:
      - name: grafana
        image: grafana/grafana:9.3.0
        env:
        - name: GF_SECURITY_ADMIN_PASSWORD
          valueFrom:
            secretKeyRef:
              name: grafana-credentials
              key: admin-password
        - name: GF_INSTALL_PLUGINS
          value: "grafana-kubernetes-app,grafana-piechart-panel"
        - name: GF_SERVER_ROOT_URL
          value: "https://grafana.example.com"
        
        ports:
        - containerPort: 3000
          name: http
        
        volumeMounts:
        - name: grafana-storage
          mountPath: /var/lib/grafana
        - name: grafana-provisioning
          mountPath: /etc/grafana/provisioning
        
        resources:
          requests:
            memory: 512Mi
            cpu: 200m
          limits:
            memory: 1Gi
            cpu: 500m
        
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10
        
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 30
      
      volumes:
      - name: grafana-storage
        persistentVolumeClaim:
          claimName: grafana-storage
      - name: grafana-provisioning
        configMap:
          name: grafana-provisioning
```

#### Grafana Provisioning Configuration
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-provisioning
  namespace: monitoring
data:
  datasources.yaml: |
    apiVersion: 1
    datasources:
    - name: Prometheus
      type: prometheus
      access: proxy
      url: http://prometheus:9090
      isDefault: true
      editable: true

  dashboards.yaml: |
    apiVersion: 1
    providers:
    - name: 'default'
      orgId: 1
      folder: ''
      type: file
      disableDeletion: false
      updateIntervalSeconds: 10
      allowUiUpdates: true
      options:
        path: /var/lib/grafana/dashboards

  kubernetes-cluster-dashboard.json: |
    {
      "dashboard": {
        "id": null,
        "title": "Kubernetes Cluster Monitoring",
        "description": "Comprehensive Kubernetes cluster monitoring dashboard",
        "panels": [
          {
            "title": "Cluster CPU Usage",
            "type": "stat",
            "targets": [
              {
                "expr": "100 - (avg(rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
                "legendFormat": "CPU Usage %"
              }
            ]
          },
          {
            "title": "Cluster Memory Usage",
            "type": "stat",
            "targets": [
              {
                "expr": "(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100",
                "legendFormat": "Memory Usage %"
              }
            ]
          },
          {
            "title": "Pod Status",
            "type": "piechart",
            "targets": [
              {
                "expr": "kube_pod_status_phase",
                "legendFormat": "{{ phase }}"
              }
            ]
          },
          {
            "title": "HTTP Request Rate",
            "type": "graph",
            "targets": [
              {
                "expr": "sum(rate(http_requests_total[5m])) by (service)",
                "legendFormat": "{{ service }}"
              }
            ]
          }
        ]
      }
    }
```

## Health Checks & Probes Deep Dive

### Understanding Kubernetes Probes

Kubernetes provides three types of health checks to monitor container and application health:

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
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
  successThreshold: 1
```

**What happens when liveness probe fails:**
1. **Failure detected** - Probe fails `failureThreshold` times
2. **Container killed** - kubelet kills the container
3. **Restart policy applied** - Container restarted based on restart policy
4. **Pod events logged** - Failure recorded in pod events

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
  failureThreshold: 2
  successThreshold: 1
```

**What happens when readiness probe fails:**
1. **Pod marked not ready** - Pod status shows not ready
2. **Removed from service** - Pod IP removed from service endpoints
3. **No traffic received** - Load balancer stops sending traffic
4. **Container not restarted** - Container continues running

#### Startup Probes
**Purpose:** Handle slow-starting containers
```yaml
startupProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 30  # Allow 150 seconds for startup
```

**Startup probe behavior:**
- **Runs first** - Before liveness and readiness probes
- **One-time check** - Stops running after first success
- **Protects slow starts** - Prevents liveness probe from killing slow-starting containers

### Probe Implementation Patterns

#### HTTP Health Endpoints
```go
// Go application health endpoint
package main

import (
    "encoding/json"
    "net/http"
    "time"
)

type HealthStatus struct {
    Status      string            `json:"status"`
    Timestamp   time.Time         `json:"timestamp"`
    Checks      map[string]string `json:"checks"`
    Version     string            `json:"version"`
    Uptime      string            `json:"uptime"`
}

var startTime = time.Now()

func healthHandler(w http.ResponseWriter, r *http.Request) {
    health := HealthStatus{
        Status:    "ok",
        Timestamp: time.Now(),
        Checks:    make(map[string]string),
        Version:   "1.2.3",
        Uptime:    time.Since(startTime).String(),
    }
    
    // Check database connection
    if err := checkDatabase(); err != nil {
        health.Status = "unhealthy"
        health.Checks["database"] = "failed: " + err.Error()
        w.WriteHeader(http.StatusServiceUnavailable)
    } else {
        health.Checks["database"] = "ok"
    }
    
    // Check external dependencies
    if err := checkExternalAPI(); err != nil {
        health.Checks["external_api"] = "failed: " + err.Error()
        // Don't mark as unhealthy for external dependencies
    } else {
        health.Checks["external_api"] = "ok"
    }
    
    // Check internal components
    health.Checks["memory"] = checkMemoryUsage()
    health.Checks["disk"] = checkDiskSpace()
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(health)
}

func readinessHandler(w http.ResponseWriter, r *http.Request) {
    // Readiness check - only essential dependencies
    if err := checkDatabase(); err != nil {
        w.WriteHeader(http.StatusServiceUnavailable)
        w.Write([]byte("Database not ready"))
        return
    }
    
    if !isApplicationReady() {
        w.WriteHeader(http.StatusServiceUnavailable)
        w.Write([]byte("Application not ready"))
        return
    }
    
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("Ready"))
}

func main() {
    http.HandleFunc("/health", healthHandler)
    http.HandleFunc("/ready", readinessHandler)
    http.HandleFunc("/", applicationHandler)
    
    http.ListenAndServe(":8080", nil)
}
```

#### TCP and Command Probes
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: probe-examples
spec:
  containers:
  - name: app
    image: myapp:latest
    
    # HTTP probe (most common)
    livenessProbe:
      httpGet:
        path: /health
        port: 8080
        scheme: HTTP
      initialDelaySeconds: 30
      periodSeconds: 10
    
    # TCP probe (for non-HTTP services)
    readinessProbe:
      tcpSocket:
        port: 5432
      initialDelaySeconds: 5
      periodSeconds: 5
    
    # Command probe (custom check)
    startupProbe:
      exec:
        command:
        - /bin/sh
        - -c
        - "test -f /tmp/ready && curl -f http://localhost:8080/health"
      initialDelaySeconds: 10
      periodSeconds: 5
      failureThreshold: 30
```

### Advanced Health Check Patterns

#### Multi-Service Health Aggregation
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: microservice-with-dependencies
spec:
  containers:
  - name: main-service
    image: main-service:latest
    env:
    - name: HEALTH_CHECK_DEPENDENCIES
      value: "database,cache,messaging"
    - name: DATABASE_URL
      value: "postgres://user:pass@db:5432/myapp"
    - name: REDIS_URL
      value: "redis://cache:6379"
    - name: MESSAGING_URL
      value: "amqp://guest:guest@rabbitmq:5672/"
    
    livenessProbe:
      httpGet:
        path: /health/liveness
        port: 8080
      initialDelaySeconds: 60
      periodSeconds: 30
      timeoutSeconds: 10
      failureThreshold: 3
    
    readinessProbe:
      httpGet:
        path: /health/readiness
        port: 8080
      initialDelaySeconds: 10
      periodSeconds: 5
      timeoutSeconds: 5
      failureThreshold: 2
    
    startupProbe:
      httpGet:
        path: /health/startup
        port: 8080
      initialDelaySeconds: 30
      periodSeconds: 10
      timeoutSeconds: 5
      failureThreshold: 12  # 2 minutes for startup
```

#### Graceful Shutdown Integration
```go
// Go application with graceful shutdown
package main

import (
    "context"
    "net/http"
    "os"
    "os/signal"
    "sync/atomic"
    "syscall"
    "time"
)

var (
    healthy int32 = 1
    ready   int32 = 1
)

func healthHandler(w http.ResponseWriter, r *http.Request) {
    if atomic.LoadInt32(&healthy) == 1 {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte("Healthy"))
    } else {
        w.WriteHeader(http.StatusServiceUnavailable)
        w.Write([]byte("Unhealthy"))
    }
}

func readinessHandler(w http.ResponseWriter, r *http.Request) {
    if atomic.LoadInt32(&ready) == 1 {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte("Ready"))
    } else {
        w.WriteHeader(http.StatusServiceUnavailable)
        w.Write([]byte("Not Ready"))
    }
}

func main() {
    // Setup HTTP server
    mux := http.NewServeMux()
    mux.HandleFunc("/health", healthHandler)
    mux.HandleFunc("/ready", readinessHandler)
    mux.HandleFunc("/", applicationHandler)
    
    server := &http.Server{
        Addr:    ":8080",
        Handler: mux,
    }
    
    // Start server
    go func() {
        if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            log.Fatal("Server failed:", err)
        }
    }()
    
    // Wait for shutdown signal
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit
    
    log.Println("Shutting down server...")
    
    // Mark as not ready (stop receiving new traffic)
    atomic.StoreInt32(&ready, 0)
    
    // Wait for existing connections to drain
    time.Sleep(10 * time.Second)
    
    // Mark as unhealthy
    atomic.StoreInt32(&healthy, 0)
    
    // Graceful shutdown with timeout
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()
    
    if err := server.Shutdown(ctx); err != nil {
        log.Fatal("Server forced to shutdown:", err)
    }
    
    log.Println("Server exiting")
}
```

## Distributed Tracing Deep Dive

### What is Distributed Tracing?

**Distributed tracing** tracks requests as they flow through multiple services in a microservices architecture. Each request gets a unique **trace ID**, and each service operation gets a **span ID**.

**Trace Structure:**
```
Trace ID: abc123 (entire request journey)
├── Span: API Gateway (50ms)
│   └── Span: Auth Service (20ms)
│       └── Span: Database Query (15ms)
├── Span: Business Logic Service (100ms)
│   ├── Span: Cache Lookup (5ms)
│   └── Span: Database Query (30ms)
└── Span: Notification Service (25ms)
    └── Span: External API Call (20ms)
```

### OpenTelemetry Integration

#### OpenTelemetry Collector
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: observability
data:
  config.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318
      jaeger:
        protocols:
          grpc:
            endpoint: 0.0.0.0:14250
          thrift_http:
            endpoint: 0.0.0.0:14268
      zipkin:
        endpoint: 0.0.0.0:9411

    processors:
      batch:
        timeout: 1s
        send_batch_size: 1024
      memory_limiter:
        limit_mib: 512

    exporters:
      jaeger:
        endpoint: jaeger-collector:14250
        tls:
          insecure: true
      zipkin:
        endpoint: http://zipkin:9411/api/v2/spans
      prometheus:
        endpoint: "0.0.0.0:8889"

    service:
      pipelines:
        traces:
          receivers: [otlp, jaeger, zipkin]
          processors: [memory_limiter, batch]
          exporters: [jaeger]
        metrics:
          receivers: [otlp]
          processors: [memory_limiter, batch]
          exporters: [prometheus]
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: observability
spec:
  replicas: 1
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
    spec:
      containers:
      - name: otel-collector
        image: otel/opentelemetry-collector:latest
        command: ["otelcol", "--config=/etc/config/config.yaml"]
        volumeMounts:
        - name: config
          mountPath: /etc/config
        ports:
        - containerPort: 4317
          name: otlp-grpc
        - containerPort: 4318
          name: otlp-http
        - containerPort: 14250
          name: jaeger-grpc
        - containerPort: 14268
          name: jaeger-http
        - containerPort: 9411
          name: zipkin
        - containerPort: 8889
          name: metrics
        resources:
          requests:
            memory: 256Mi
            cpu: 100m
          limits:
            memory: 512Mi
            cpu: 200m
      volumes:
      - name: config
        configMap:
          name: otel-collector-config
```

#### Application Instrumentation Example
```go
// Go application with OpenTelemetry tracing
package main

import (
    "context"
    "fmt"
    "log"
    "net/http"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/propagation"
    "go.opentelemetry.io/otel/sdk/resource"
    "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.17.0"
    "go.opentelemetry.io/otel/trace"
)

var tracer trace.Tracer

func initTracer() {
    ctx := context.Background()
    
    // Create OTLP exporter
    exporter, err := otlptracegrpc.New(ctx,
        otlptracegrpc.WithEndpoint("otel-collector:4317"),
        otlptracegrpc.WithInsecure(),
    )
    if err != nil {
        log.Fatal("Failed to create exporter:", err)
    }
    
    // Create resource
    res, err := resource.New(ctx,
        resource.WithAttributes(
            semconv.ServiceName("user-service"),
            semconv.ServiceVersion("1.2.3"),
            semconv.DeploymentEnvironment("production"),
        ),
    )
    if err != nil {
        log.Fatal("Failed to create resource:", err)
    }
    
    // Create trace provider
    tp := trace.NewTracerProvider(
        trace.WithBatcher(exporter),
        trace.WithResource(res),
        trace.WithSampler(trace.AlwaysSample()),
    )
    
    otel.SetTracerProvider(tp)
    otel.SetTextMapPropagator(propagation.TraceContext{})
    
    tracer = otel.Tracer("user-service")
}

func userHandler(w http.ResponseWriter, r *http.Request) {
    // Extract trace context from incoming request
    ctx := otel.GetTextMapPropagator().Extract(r.Context(), propagation.HeaderCarrier(r.Header))
    
    // Start new span
    ctx, span := tracer.Start(ctx, "handle_user_request",
        trace.WithAttributes(
            attribute.String("http.method", r.Method),
            attribute.String("http.url", r.URL.String()),
            attribute.String("user.id", r.URL.Query().Get("id")),
        ),
    )
    defer span.End()
    
    userID := r.URL.Query().Get("id")
    
    // Call database (creates child span)
    user, err := getUserFromDB(ctx, userID)
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    
    // Call external service (creates child span)
    profile, err := getProfileFromService(ctx, userID)
    if err != nil {
        span.RecordError(err)
        // Don't fail the request for profile errors
        log.Printf("Failed to get profile: %v", err)
    }
    
    // Combine data and respond
    response := combineUserData(user, profile)
    
    span.SetAttributes(
        attribute.Bool("cache.hit", false),
        attribute.Int("response.size", len(response)),
    )
    
    w.Header().Set("Content-Type", "application/json")
    w.Write([]byte(response))
}

func getUserFromDB(ctx context.Context, userID string) (string, error) {
    ctx, span := tracer.Start(ctx, "database_query",
        trace.WithAttributes(
            attribute.String("db.system", "postgresql"),
            attribute.String("db.operation", "SELECT"),
            attribute.String("db.table", "users"),
            attribute.String("user.id", userID),
        ),
    )
    defer span.End()
    
    // Simulate database query
    time.Sleep(50 * time.Millisecond)
    
    if userID == "invalid" {
        err := fmt.Errorf("user not found")
        span.RecordError(err)
        return "", err
    }
    
    span.SetAttributes(attribute.Int("db.rows_affected", 1))
    return fmt.Sprintf(`{"id": "%s", "name": "John Doe"}`, userID), nil
}

func getProfileFromService(ctx context.Context, userID string) (string, error) {
    ctx, span := tracer.Start(ctx, "external_service_call",
        trace.WithAttributes(
            attribute.String("service.name", "profile-service"),
            attribute.String("http.method", "GET"),
            attribute.String("user.id", userID),
        ),
    )
    defer span.End()
    
    // Create HTTP request with trace context
    req, _ := http.NewRequestWithContext(ctx, "GET", 
        fmt.Sprintf("http://profile-service/users/%s", userID), nil)
    
    // Inject trace context into request headers
    otel.GetTextMapPropagator().Inject(ctx, propagation.HeaderCarrier(req.Header))
    
    // Make request
    client := &http.Client{Timeout: 5 * time.Second}
    resp, err := client.Do(req)
    if err != nil {
        span.RecordError(err)
        return "", err
    }
    defer resp.Body.Close()
    
    span.SetAttributes(
        attribute.Int("http.status_code", resp.StatusCode),
        attribute.String("http.response.size", resp.Header.Get("Content-Length")),
    )
    
    if resp.StatusCode != 200 {
        err := fmt.Errorf("profile service returned %d", resp.StatusCode)
        span.RecordError(err)
        return "", err
    }
    
    return `{"preferences": {"theme": "dark"}}`, nil
}

func main() {
    initTracer()
    
    http.HandleFunc("/users", userHandler)
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

#### Kubernetes Deployment with Tracing
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
      annotations:
        sidecar.opentelemetry.io/inject: "true"
    spec:
      containers:
      - name: user-service
        image: user-service:latest
        env:
        - name: OTEL_EXPORTER_OTLP_ENDPOINT
          value: "http://otel-collector:4318"
        - name: OTEL_SERVICE_NAME
          value: "user-service"
        - name: OTEL_SERVICE_VERSION
          value: "1.2.3"
        - name: OTEL_RESOURCE_ATTRIBUTES
          value: "environment=production,team=backend"
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: 256Mi
            cpu: 200m
          limits:
            memory: 512Mi
            cpu: 500m
```

### Jaeger Deployment

#### Jaeger All-in-One (Development)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jaeger
  namespace: observability
spec:
  replicas: 1
  selector:
    matchLabels:
      app: jaeger
  template:
    metadata:
      labels:
        app: jaeger
    spec:
      containers:
      - name: jaeger
        image: jaegertracing/all-in-one:1.40
        env:
        - name: COLLECTOR_OTLP_ENABLED
          value: "true"
        ports:
        - containerPort: 16686
          name: ui
        - containerPort: 14250
          name: grpc
        - containerPort: 14268
          name: http
        - containerPort: 4317
          name: otlp-grpc
        - containerPort: 4318
          name: otlp-http
        resources:
          requests:
            memory: 512Mi
            cpu: 200m
          limits:
            memory: 1Gi
            cpu: 500m
---
apiVersion: v1
kind: Service
metadata:
  name: jaeger
  namespace: observability
spec:
  selector:
    app: jaeger
  ports:
  - name: ui
    port: 16686
    targetPort: 16686
  - name: grpc
    port: 14250
    targetPort: 14250
  - name: http
    port: 14268
    targetPort: 14268
  - name: otlp-grpc
    port: 4317
    targetPort: 4317
  - name: otlp-http
    port: 4318
    targetPort: 4318
```

## Key Concepts Summary
- **Logging Architecture** - Container logs collected by runtime, aggregated by DaemonSets like Fluent Bit
- **Metrics Collection** - Prometheus pull-based model with exporters for different components
- **Health Probes** - Liveness (restart), readiness (traffic), and startup (slow start) checks
- **Distributed Tracing** - Request flow tracking through microservices with trace and span IDs
- **OpenTelemetry** - Unified observability framework for metrics, logs, and traces
- **Grafana Dashboards** - Visualization and alerting based on Prometheus metrics
- **Jaeger** - Distributed tracing backend for storing and analyzing traces
- **Log Aggregation** - Centralized logging with EFK/ELK stack for search and analysis
- **Custom Metrics** - Application-specific metrics exposed in Prometheus format
- **Alert Management** - Rule-based alerting with Prometheus and Alertmanager

## Best Practices / Tips

1. **Structure your logs** - Use JSON logging for better parsing and filtering
2. **Implement proper health checks** - Different endpoints for liveness, readiness, and startup
3. **Monitor the four golden signals** - Latency, traffic, errors, and saturation
4. **Use distributed tracing** - Essential for debugging microservices interactions
5. **Set up alerting** - Proactive monitoring with appropriate alert thresholds
6. **Monitor resource utilization** - Track CPU, memory, disk, and network usage
7. **Implement graceful shutdown** - Proper handling of termination signals
8. **Use sampling for traces** - Avoid overwhelming trace storage with 100% sampling
9. **Monitor business metrics** - Not just technical metrics but business KPIs
10. **Document your observability** - Clear runbooks for common issues and metrics

## Common Issues / Troubleshooting

### Problem 1: High Cardinality Metrics
- **Symptom:** Prometheus consuming excessive memory and storage
- **Cause:** Metrics with too many unique label combinations
- **Solution:** Reduce label cardinality and use recording rules

```bash
# Check high cardinality metrics
curl http://prometheus:9090/api/v1/label/__name__/values | jq '.data | length'

# Find series with high cardinality
curl http://prometheus:9090/api/v1/query?query=count%20by%20(__name__)(%7B__name__%3D~%22.%2B%22%7D)
```

### Problem 2: Health Probes Failing
- **Symptom:** Pods restarting frequently or not receiving traffic
- **Cause:** Incorrectly configured probes or application issues
- **Solution:** Check probe configuration and application health endpoints

```bash
# Check pod events for probe failures
kubectl describe pod pod-name

# Test health endpoint manually
kubectl exec -it pod-name -- curl http://localhost:8080/health

# Check probe configuration
kubectl get pod pod-name -o yaml | grep -A 10 -B 5 probe
```

### Problem 3: Missing Traces
- **Symptom:** Distributed traces not appearing in Jaeger
- **Cause:** Instrumentation issues or collector problems
- **Solution:** Verify OpenTelemetry configuration and collector status

```bash
# Check OpenTelemetry collector logs
kubectl logs -l app=otel-collector -n observability

# Verify trace export configuration
kubectl describe configmap otel-collector-config

# Test direct trace submission
curl -X POST http://otel-collector:4318/v1/traces -H "Content-Type: application/json" -d '{...}'
```

### Problem 4: Log Collection Issues
- **Symptom:** Application logs not appearing in centralized logging
- **Cause:** Log collector configuration or permissions issues
- **Solution:** Check DaemonSet status and log paths

```bash
# Check Fluent Bit DaemonSet status
kubectl get daemonset fluent-bit -n kube-system

# Check Fluent Bit logs
kubectl logs -l app=fluent-bit -n kube-system

# Verify log file permissions
kubectl exec -it fluent-bit-pod -- ls -la /var/log/containers/
```

### Problem 5: Prometheus Scraping Failures
- **Symptom:** Metrics not being collected from certain targets
- **Cause:** Service discovery issues or network connectivity problems
- **Solution:** Check Prometheus targets and service discovery

```bash
# Check Prometheus targets
curl http://prometheus:9090/api/v1/targets

# Check service discovery
curl http://prometheus:9090/api/v1/discovery

# Verify pod annotations
kubectl get pods -o yaml | grep prometheus.io
```

## References / Further Reading
- [Kubernetes Monitoring Architecture](https://kubernetes.io/docs/concepts/cluster-administration/monitoring/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [Fluent Bit Documentation](https://docs.fluentbit.io/)
- [Kubernetes Health Checks](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Elastic Stack Documentation](https://www.elastic.co/guide/index.html)
- [Four Golden Signals](https://sre.google/sre-book/monitoring-distributed-systems/)