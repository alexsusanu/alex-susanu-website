# Multi-Container Pods: Complete Deep Technical Guide
category: DevOps
tags: kubernetes, pods, multi-container, sidecar, init-containers, shared-volumes, networking

## Introduction to Multi-Container Pods

A **multi-container pod** is a single Kubernetes pod that contains more than one container. All containers in the same pod share the same network namespace, storage volumes, and lifecycle - they're like roommates sharing an apartment.

### What "Same Pod" Actually Means
When containers are in the same pod, they share fundamental resources:

**Shared Network Namespace:**
- All containers share the same IP address
- Containers can communicate via `localhost`
- Port conflicts must be avoided (only one container can bind to port 8080)
- Network interfaces are identical across all containers

**Shared Storage:**
- Volumes are mounted and accessible by all containers
- File system changes in shared volumes are visible to all containers
- Each container still has its own root filesystem
- Shared volumes enable data exchange between containers

**Shared Lifecycle:**
- All containers start and stop together
- If one container crashes, it doesn't affect others (unless you configure it to)
- Pod is only "Ready" when all containers are ready
- Pod terminates when all containers terminate

### Why Multi-Container Pods Exist
**The Problem:** Sometimes you need helper functionality alongside your main application:
- Log processing while your app runs
- SSL termination proxy in front of your app
- Data synchronization alongside your database
- Monitoring agents collecting metrics from your app

**The Solution:** Instead of cramming all functionality into one bloated container image, you can run specialized containers together in one pod that work as a team.

## Pod Networking Deep Dive

### How Shared Networking Actually Works
When Kubernetes creates a pod, it first creates a **pause container** (also called infrastructure container) that establishes the network namespace. Then all your application containers join this same network namespace.

**Technical Implementation:**
```
1. Kubernetes creates pause container with network namespace
2. Pause container gets assigned pod IP (e.g., 192.168.1.100)
3. Container A joins this network namespace → shares IP 192.168.1.100
4. Container B joins this network namespace → shares IP 192.168.1.100
5. Both containers can now communicate via localhost
```

**What This Means Practically:**
```
Container A binds to: 0.0.0.0:8080 (main app)
Container B binds to: 0.0.0.0:9090 (metrics)
Container C binds to: 0.0.0.0:3000 (admin interface)

External access:
- Main app: http://pod-ip:8080
- Metrics: http://pod-ip:9090  
- Admin: http://pod-ip:3000

Internal communication:
- Container A → Container B: http://localhost:9090
- Container B → Container C: http://localhost:3000
```

### Port Conflicts and Management
Since all containers share the same IP address, **port conflicts are real**:
```yaml
# THIS WILL FAIL - both containers trying to use port 8080
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: app1
    image: nginx  # nginx defaults to port 80, but configured for 8080
    ports:
    - containerPort: 8080
  - name: app2  
    image: httpd  # apache configured for port 8080
    ports:
    - containerPort: 8080  # CONFLICT! Only one can bind to 8080
```

**Solution - Use Different Ports:**
```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: app
    image: myapp:latest
    ports:
    - containerPort: 8080  # Main application
  - name: metrics
    image: prometheus/node-exporter
    ports:
    - containerPort: 9100  # Metrics endpoint
  - name: admin
    image: admin-ui:latest
    ports:
    - containerPort: 3000  # Admin interface
```

## Sidecar Pattern Deep Explanation

### What is a Sidecar Container
A **sidecar container** is a helper container that runs alongside your main application container to provide supporting functionality. Think of it like a motorcycle sidecar - it's attached to the main vehicle (your app) and provides additional capabilities without changing the main vehicle itself.

**Sidecar Characteristics:**
- **Secondary role** - Supports the main application, doesn't replace it
- **Shared resources** - Uses the same network, storage, and lifecycle as main app
- **Specialized function** - Handles one specific concern (logging, monitoring, proxying)
- **Loosely coupled** - Can be developed, tested, and updated independently

### Why Sidecars Instead of Single Container
**Without Sidecar (Monolithic Container):**
```dockerfile
FROM node:16
# Install main app
COPY app/ /app
# Install log shipper
RUN apt-get install filebeat
# Install metrics exporter  
RUN apt-get install prometheus-exporter
# Install SSL proxy
RUN apt-get install nginx
# Configure everything together
COPY complex-startup-script.sh /start.sh
CMD ["/start.sh"]
```

**Problems with monolithic approach:**
- **Huge images** - One container doing everything
- **Complex updates** - Updating log shipper requires rebuilding entire app
- **Mixed concerns** - Application code mixed with infrastructure code
- **Hard to test** - Can't test logging separately from the app
- **Resource waste** - All functionality loaded even when not needed

**With Sidecar Pattern:**
```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: main-app
    image: myapp:1.0.0          # Just the application
  - name: log-shipper
    image: fluent/fluent-bit:latest    # Just log handling
  - name: metrics-exporter  
    image: prom/node-exporter:latest   # Just metrics
  - name: ssl-proxy
    image: nginx:alpine                # Just SSL termination
```

**Benefits of sidecar approach:**
- **Small, focused images** - Each container has one responsibility
- **Independent updates** - Update log shipper without touching app
- **Separation of concerns** - App developers focus on app, ops team handles sidecars
- **Reusability** - Same sidecar can work with different apps
- **Easier testing** - Test each component independently

### Common Sidecar Patterns

#### Log Collection Sidecar
**What it does:** Collects, processes, and ships application logs to external systems
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-logging
spec:
  containers:
  # Main application
  - name: web-app
    image: myapp:latest
    volumeMounts:
    - name: app-logs
      mountPath: /var/log/app
  # Log collection sidecar
  - name: log-collector
    image: fluent/fluent-bit:latest
    volumeMounts:
    - name: app-logs
      mountPath: /var/log/app
      readOnly: true
    env:
    - name: ELASTICSEARCH_HOST
      value: "elasticsearch.logging.svc.cluster.local"
  volumes:
  - name: app-logs
    emptyDir: {}
```

**How it works:**
1. Main app writes logs to `/var/log/app/app.log`
2. Shared volume makes logs accessible to both containers
3. Fluent Bit reads logs from shared volume
4. Fluent Bit processes, formats, and ships logs to Elasticsearch
5. Main app doesn't know or care about log shipping

#### Service Mesh Proxy Sidecar (Istio Envoy)
**What it does:** Handles all network traffic in/out of the pod for security, routing, and observability
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-service-mesh
  annotations:
    sidecar.istio.io/inject: "true"  # Istio automatically injects sidecar
spec:
  containers:
  # Main application (unchanged)
  - name: business-app
    image: myapp:latest
    ports:
    - containerPort: 8080
  # Istio automatically adds this sidecar:
  # - name: istio-proxy
  #   image: docker.io/istio/proxyv2:1.17.0
  #   ports:
  #   - containerPort: 15090  # Envoy admin
  #   - containerPort: 15001  # Envoy outbound
  #   - containerPort: 15006  # Envoy inbound
```

**Traffic Flow:**
```
External Request → Istio Proxy (sidecar) → Main App
Main App → Istio Proxy (sidecar) → External Service
```

**What the proxy sidecar provides:**
- **Mutual TLS** - Automatic encryption between services
- **Traffic routing** - Advanced load balancing and routing rules
- **Observability** - Metrics, tracing, and logging for all requests
- **Security policies** - Authentication and authorization
- **Circuit breaking** - Automatic failure handling

#### Monitoring Sidecar
**What it does:** Collects application metrics and exposes them for monitoring systems
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-monitoring
spec:
  containers:
  # Main application
  - name: api-server
    image: myapi:latest
    ports:
    - containerPort: 8080
    volumeMounts:
    - name: metrics-data
      mountPath: /tmp/metrics
  # Monitoring sidecar
  - name: metrics-exporter
    image: prom/node-exporter:latest
    ports:
    - containerPort: 9100
    volumeMounts:
    - name: metrics-data
      mountPath: /tmp/metrics
      readOnly: true
  volumes:
  - name: metrics-data
    emptyDir: {}
```

#### Database Backup Sidecar
**What it does:** Handles database backups while main database serves traffic
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: database-with-backup
spec:
  containers:
  # Main database
  - name: postgres
    image: postgres:14
    env:
    - name: POSTGRES_DB
      value: myapp
    volumeMounts:
    - name: db-data
      mountPath: /var/lib/postgresql/data
  # Backup sidecar
  - name: backup-agent
    image: postgres:14
    command: ["/bin/sh"]
    args: ["-c", "while true; do pg_dump -h localhost -U postgres myapp > /backup/dump-$(date +%Y%m%d-%H%M%S).sql; sleep 3600; done"]
    volumeMounts:
    - name: db-data
      mountPath: /var/lib/postgresql/data
      readOnly: true
    - name: backup-storage
      mountPath: /backup
  volumes:
  - name: db-data
    persistentVolumeClaim:
      claimName: postgres-pvc
  - name: backup-storage
    persistentVolumeClaim:
      claimName: backup-pvc
```

## Init Containers Deep Explanation

### What are Init Containers
**Init containers** are specialized containers that run and complete **before** your main application containers start. They're like setup crew that prepares everything before the main event begins.

**Key Characteristics:**
- **Run to completion** - Must finish successfully before main containers start
- **Sequential execution** - If you have multiple init containers, they run one after another, not simultaneously
- **Failure handling** - If any init container fails, the entire pod restarts
- **Shared resources** - Have access to the same volumes as main containers
- **Different image** - Can use completely different container images than main app

### How Init Containers Work
```
Pod Creation → Init Container 1 → Init Container 2 → Main Containers Start
     ↓              ↓                    ↓                    ↓
  Pod Pending   Init Running        Init Running         Pod Running
```

**Detailed Execution Flow:**
1. **Pod scheduled** - Kubernetes schedules pod to a node
2. **Init container 1 starts** - First init container begins execution
3. **Init container 1 completes** - Must exit with status code 0 (success)
4. **Init container 2 starts** - Second init container begins (if exists)
5. **All init containers complete** - All must finish successfully
6. **Main containers start** - Application containers finally start
7. **Pod becomes Ready** - Once main containers pass readiness checks

### Why Use Init Containers Instead of Main Container Setup

**Without Init Containers (Setup in Main Container):**
```dockerfile
FROM myapp:latest
COPY setup-script.sh /setup.sh
CMD ["/setup.sh && /start-app.sh"]
```

**Problems:**
- **Complex startup logic** - Main container handles both setup and application
- **Failure recovery** - Hard to distinguish between setup failures and app failures
- **Resource waste** - Setup tools remain in production container
- **Slow restarts** - Setup runs every time container restarts

**With Init Containers:**
```yaml
apiVersion: v1
kind: Pod
spec:
  initContainers:
  - name: setup
    image: setup-tools:latest
    command: ["/setup.sh"]
  containers:
  - name: app
    image: myapp:latest
    command: ["/start-app.sh"]
```

**Benefits:**
- **Separation of concerns** - Setup and app logic completely separate
- **Faster restarts** - Setup only runs once, app restarts don't re-run setup
- **Smaller production images** - Main app image doesn't need setup tools
- **Clear failure points** - Easy to see if setup failed vs app failed

### Common Init Container Use Cases

#### Database Migration Init Container
**What it does:** Runs database schema migrations before the application starts
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: webapp-with-migration
spec:
  initContainers:
  # Database migration init container
  - name: db-migration
    image: myapp/migrations:latest
    command: ["migrate"]
    args: ["up"]
    env:
    - name: DATABASE_URL
      value: "postgresql://user:pass@postgres:5432/myapp"
  containers:
  # Main application (starts only after migration completes)
  - name: webapp
    image: myapp/web:latest
    env:
    - name: DATABASE_URL
      value: "postgresql://user:pass@postgres:5432/myapp"
```

**Why this works:**
- Migration runs once before app starts
- If migration fails, app never starts (prevents broken state)
- App always starts with correct database schema
- Multiple app replicas can use same init container (only one runs migration)

#### Configuration Download Init Container
**What it does:** Downloads configuration files from external sources before app starts
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-config-download
spec:
  initContainers:
  - name: config-downloader
    image: alpine/curl:latest
    command: ["sh", "-c"]
    args:
    - |
      curl -o /shared/app-config.json http://config-server/api/config
      curl -o /shared/ssl-cert.pem http://cert-server/api/cert
      echo "Configuration downloaded successfully"
    volumeMounts:
    - name: config-volume
      mountPath: /shared
  containers:
  - name: main-app
    image: myapp:latest
    volumeMounts:
    - name: config-volume
      mountPath: /app/config
  volumes:
  - name: config-volume
    emptyDir: {}
```

#### Service Dependency Wait Init Container
**What it does:** Waits for required services to be available before starting main app
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-dependency-wait
spec:
  initContainers:
  - name: wait-for-database
    image: busybox:1.35
    command: ['sh', '-c']
    args:
    - |
      echo "Waiting for database to be ready..."
      until nc -z postgres.database.svc.cluster.local 5432; do
        echo "Database not ready, waiting..."
        sleep 2
      done
      echo "Database is ready!"
  - name: wait-for-redis
    image: busybox:1.35
    command: ['sh', '-c']
    args:
    - |
      echo "Waiting for Redis to be ready..."
      until nc -z redis.cache.svc.cluster.local 6379; do
        echo "Redis not ready, waiting..."
        sleep 2
      done
      echo "Redis is ready!"
  containers:
  - name: web-app
    image: myapp:latest
    # App starts only after both database and Redis are available
```

#### File System Setup Init Container
**What it does:** Prepares file system, sets permissions, creates directories
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-fs-setup
spec:
  initContainers:
  - name: fs-setup
    image: busybox:1.35
    command: ["sh", "-c"]
    args:
    - |
      # Create required directories
      mkdir -p /data/uploads /data/cache /data/logs
      # Set correct permissions
      chmod 755 /data/uploads
      chmod 777 /data/cache
      chmod 644 /data/logs
      # Create initial files
      echo "App started at $(date)" > /data/logs/startup.log
      echo "Setup completed successfully"
    volumeMounts:
    - name: app-data
      mountPath: /data
    securityContext:
      runAsUser: 0  # Run as root for permission setup
  containers:
  - name: application
    image: myapp:latest
    volumeMounts:
    - name: app-data
      mountPath: /app/data
    securityContext:
      runAsUser: 1000  # Run as non-root user
  volumes:
  - name: app-data
    persistentVolumeClaim:
      claimName: app-data-pvc
```

## Shared Volumes Deep Explanation

### What are Shared Volumes
**Shared volumes** are storage that is mounted and accessible by multiple containers within the same pod. Think of it like a shared folder on a computer that multiple applications can read and write to.

**How Volume Sharing Works:**
1. **Pod defines volume** - Pod specification declares a volume
2. **Containers mount volume** - Each container specifies where to mount the volume
3. **File system sharing** - All containers see the same files in the shared location
4. **Changes visible to all** - When one container writes a file, others can read it immediately

### Volume Types for Multi-Container Pods

#### emptyDir - Temporary Shared Storage
**What it is:** A temporary directory that exists only as long as the pod is running on a node. When the pod is deleted, the emptyDir volume is deleted permanently.

**When to use:**
- Temporary file sharing between containers
- Cache storage that doesn't need to persist
- Communication through files between containers
- Temporary processing space

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: shared-temp-storage
spec:
  containers:
  - name: writer
    image: busybox
    command: ["sh", "-c"]
    args: ["while true; do echo $(date) > /shared/timestamp.txt; sleep 5; done"]
    volumeMounts:
    - name: shared-data
      mountPath: /shared
  - name: reader
    image: busybox  
    command: ["sh", "-c"]
    args: ["while true; do cat /shared/timestamp.txt; sleep 5; done"]
    volumeMounts:
    - name: shared-data
      mountPath: /shared
  volumes:
  - name: shared-data
    emptyDir: {}  # Temporary storage, deleted when pod dies
```

**emptyDir Technical Details:**
- **Storage location** - Created on node's local disk (or tmpfs in memory)
- **Lifecycle** - Exists only while pod runs on the node
- **Size limits** - Can be limited using `sizeLimit` field
- **Performance** - Fast local storage, but not persistent

#### Persistent Volume Claims - Durable Shared Storage
**What it is:** Persistent storage that survives pod restarts and can be shared between containers.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: shared-persistent-storage
spec:
  containers:
  - name: database
    image: postgres:14
    volumeMounts:
    - name: db-storage
      mountPath: /var/lib/postgresql/data
  - name: backup-agent
    image: postgres:14
    command: ["sh", "-c"]
    args: ["while true; do pg_dump -h localhost mydb > /backup/backup-$(date +%Y%m%d).sql; sleep 3600; done"]
    volumeMounts:
    - name: db-storage
      mountPath: /var/lib/postgresql/data
      readOnly: true  # Backup agent only reads database files
    - name: backup-storage
      mountPath: /backup
  volumes:
  - name: db-storage
    persistentVolumeClaim:
      claimName: postgres-pvc
  - name: backup-storage
    persistentVolumeClaim:
      claimName: backup-pvc
```

#### ConfigMap and Secret Volumes - Configuration Sharing
**What it is:** Kubernetes-managed configuration data shared between containers.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: shared-config
spec:
  containers:
  - name: web-server
    image: nginx
    volumeMounts:
    - name: nginx-config
      mountPath: /etc/nginx/conf.d
    - name: ssl-certs
      mountPath: /etc/ssl/certs
  - name: config-reloader
    image: config-reloader:latest
    command: ["sh", "-c"]
    args: ["while true; do if [ /config/nginx.conf -nt /etc/nginx/conf.d/nginx.conf ]; then cp /config/nginx.conf /etc/nginx/conf.d/ && nginx -s reload; fi; sleep 30; done"]
    volumeMounts:
    - name: nginx-config
      mountPath: /etc/nginx/conf.d
    - name: dynamic-config
      mountPath: /config
  volumes:
  - name: nginx-config
    configMap:
      name: nginx-config
  - name: ssl-certs
    secret:
      secretName: ssl-certificates
  - name: dynamic-config
    configMap:
      name: dynamic-nginx-config
```

### Volume Mount Options

#### Read-Only vs Read-Write Access
```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: writer
    image: myapp:latest
    volumeMounts:
    - name: shared-data
      mountPath: /data
      readOnly: false  # Can read and write (default)
  - name: reader
    image: log-processor:latest
    volumeMounts:
    - name: shared-data
      mountPath: /data
      readOnly: true   # Can only read, prevents accidental writes
  volumes:
  - name: shared-data
    emptyDir: {}
```

#### Sub-Path Mounting
**What it does:** Mount only a specific subdirectory of a volume, not the entire volume
```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: app-logs
    image: myapp:latest
    volumeMounts:
    - name: log-storage
      mountPath: /var/log/app
      subPath: application-logs  # Only mount this subdirectory
  - name: system-logs
    image: system-monitor:latest
    volumeMounts:
    - name: log-storage
      mountPath: /var/log/system
      subPath: system-logs      # Mount different subdirectory
  - name: log-aggregator
    image: fluent-bit:latest
    volumeMounts:
    - name: log-storage
      mountPath: /logs          # Mount entire volume to see all logs
  volumes:
  - name: log-storage
    persistentVolumeClaim:
      claimName: log-pvc
```

**Directory structure on the volume:**
```
/logs/
├── application-logs/  ← app-logs container sees this as /var/log/app
│   ├── app.log
│   └── error.log
├── system-logs/       ← system-logs container sees this as /var/log/system
│   ├── system.log
│   └── kernel.log
└── other-data/        ← Only log-aggregator can see this
```

## Container Communication Patterns

### Localhost Network Communication
Since all containers in a pod share the same network namespace, they can communicate using `localhost`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: frontend-backend-pod
spec:
  containers:
  - name: backend-api
    image: myapi:latest
    ports:
    - containerPort: 8080
  - name: frontend-web
    image: myweb:latest
    ports:
    - containerPort: 3000
    env:
    - name: API_URL
      value: "http://localhost:8080"  # Backend is on same pod
```

**Network communication flow:**
```
Frontend container makes request to: http://localhost:8080/api/users
↓
Request goes through shared network namespace (no external network)
↓
Backend container receives request on port 8080
↓
Backend processes and responds
↓
Response goes back through shared network namespace to frontend
```

### File-Based Communication
Containers can communicate by writing and reading files in shared volumes:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: file-communication
spec:
  containers:
  - name: data-producer
    image: producer:latest
    command: ["sh", "-c"]
    args:
    - |
      while true; do
        echo "{\"timestamp\": \"$(date)\", \"data\": \"$(uname -a)\"}" > /shared/data.json
        sleep 10
      done
    volumeMounts:
    - name: shared-data
      mountPath: /shared
  - name: data-consumer
    image: consumer:latest
    command: ["sh", "-c"]
    args:
    - |
      while true; do
        if [ -f /shared/data.json ]; then
          echo "Processing: $(cat /shared/data.json)"
          mv /shared/data.json /shared/processed-$(date +%s).json
        fi
        sleep 5
      done
    volumeMounts:
    - name: shared-data
      mountPath: /shared
  volumes:
  - name: shared-data
    emptyDir: {}
```

### Unix Socket Communication
For high-performance local communication, containers can use Unix domain sockets:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: unix-socket-communication
spec:
  containers:
  - name: socket-server
    image: socket-server:latest
    command: ["python3", "-c"]
    args:
    - |
      import socket, os
      sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
      sock.bind('/shared/app.sock')
      sock.listen(1)
      while True:
          conn, addr = sock.accept()
          data = conn.recv(1024)
          conn.send(b'Response: ' + data)
          conn.close()
    volumeMounts:
    - name: socket-dir
      mountPath: /shared
  - name: socket-client
    image: socket-client:latest
    command: ["python3", "-c"]
    args:
    - |
      import socket, time
      while True:
          try:
              sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
              sock.connect('/shared/app.sock')
              sock.send(b'Hello from client')
              response = sock.recv(1024)
              print(f'Received: {response}')
              sock.close()
          except:
              print('Server not ready yet')
          time.sleep(5)
    volumeMounts:
    - name: socket-dir
      mountPath: /shared
  volumes:
  - name: socket-dir
    emptyDir: {}
```

## Advanced Multi-Container Patterns

### Ambassador Pattern
**What it is:** A sidecar that acts as a proxy/gateway to external services, providing a consistent interface for the main application.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ambassador-pattern
spec:
  containers:
  - name: main-app
    image: myapp:latest
    env:
    - name: DATABASE_URL
      value: "http://localhost:3306"  # Always use localhost
  - name: database-ambassador
    image: ambassador-proxy:latest
    ports:
    - containerPort: 3306
    env:
    - name: UPSTREAM_HOST
      value: "database.production.amazonaws.com"  # Real database location
    - name: UPSTREAM_PORT
      value: "3306"
```

**Benefits:**
- Main app always connects to `localhost:3306`
- Ambassador handles connection to real database
- Easy to switch between different databases (dev/staging/prod)
- Ambassador can handle connection pooling, retries, circuit breaking

### Adapter Pattern
**What it is:** A sidecar that transforms or adapts the main application's interface to match external expectations.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: adapter-pattern
spec:
  containers:
  - name: legacy-app
    image: legacy-app:latest
    # App only outputs logs to files
    volumeMounts:
    - name: log-data
      mountPath: /var/log
  - name: log-adapter
    image: fluentd:latest
    # Adapter reads log files and converts to JSON for modern logging system
    volumeMounts:
    - name: log-data
      mountPath: /var/log
      readOnly: true
    env:
    - name: OUTPUT_FORMAT
      value: "json"
    - name: ELASTICSEARCH_HOST
      value: "elasticsearch.logging.svc.cluster.local"
  volumes:
  - name: log-data
    emptyDir: {}
```

### Helper/Utility Pattern
**What it is:** Sidecars that provide utility functions like monitoring, backups, or maintenance tasks.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: helper-pattern
spec:
  containers:
  - name: web-server
    image: nginx:latest
    ports:
    - containerPort: 80
    volumeMounts:
    - name: web-content
      mountPath: /usr/share/nginx/html
  - name: content-updater
    image: git:latest
    command: ["sh", "-c"]
    args:
    - |
      while true; do
        cd /content && git pull origin main
        sleep 300  # Update every 5 minutes
      done
    volumeMounts:
    - name: web-content
      mountPath: /content
  - name: ssl-cert-manager
    image: certbot:latest
    command: ["sh", "-c"]
    args:
    - |
      while true; do
        certbot renew --webroot -w /web-content
        sleep 86400  # Check daily
      done
    volumeMounts:
    - name: web-content
      mountPath: /web-content
    - name: ssl-certs
      mountPath: /etc/letsencrypt
  volumes:
  - name: web-content
    emptyDir: {}
  - name: ssl-certs
    persistentVolumeClaim:
      claimName: ssl-certs-pvc
```

## Multi-Container Pod Examples

### Web Application with Logging and Monitoring
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: full-stack-webapp
  labels:
    app: webapp
spec:
  initContainers:
  # Wait for database to be ready
  - name: wait-for-db
    image: busybox:1.35
    command: ['sh', '-c', 'until nc -z postgres.database.svc.cluster.local 5432; do sleep 2; done']
  
  containers:
  # Main web application
  - name: webapp
    image: mycompany/webapp:v1.2.3
    ports:
    - containerPort: 8080
      name: http
    env:
    - name: DATABASE_URL
      value: "postgresql://user:pass@postgres.database.svc.cluster.local:5432/myapp"
    - name: LOG_LEVEL
      value: "info"
    volumeMounts:
    - name: app-logs
      mountPath: /var/log/app
    - name: app-config
      mountPath: /etc/app
    resources:
      requests:
        memory: "256Mi"
        cpu: "250m"
      limits:
        memory: "512Mi"
        cpu: "500m"
  
  # Log shipping sidecar
  - name: log-shipper
    image: fluent/fluent-bit:2.0.8
    ports:
    - containerPort: 2020
      name: metrics
    volumeMounts:
    - name: app-logs
      mountPath: /var/log/app
      readOnly: true
    - name: fluent-bit-config
      mountPath: /fluent-bit/etc
    env:
    - name: ELASTICSEARCH_HOST
      value: "elasticsearch.logging.svc.cluster.local"
    - name: ELASTICSEARCH_PORT
      value: "9200"
    resources:
      requests:
        memory: "64Mi"
        cpu: "50m"
      limits:
        memory: "128Mi"
        cpu: "100m"
  
  # Metrics collection sidecar
  - name: metrics-exporter
    image: prom/node-exporter:v1.5.0
    ports:
    - containerPort: 9100
      name: metrics
    args:
    - '--path.rootfs=/host'
    - '--path.procfs=/host/proc'
    - '--path.sysfs=/host/sys'
    - '--collector.filesystem.ignored-mount-points=^/(sys|proc|dev|host|etc)($$|/)'
    volumeMounts:
    - name: proc
      mountPath: /host/proc
      readOnly: true
    - name: sys
      mountPath: /host/sys
      readOnly: true
    - name: rootfs
      mountPath: /host
      readOnly: true
    resources:
      requests:
        memory: "32Mi"
        cpu: "25m"
      limits:
        memory: "64Mi"
        cpu: "50m"

  # SSL termination proxy
  - name: ssl-proxy
    image: nginx:1.23-alpine
    ports:
    - containerPort: 443
      name: https
    - containerPort: 80
      name: http-redirect
    volumeMounts:
    - name: nginx-config
      mountPath: /etc/nginx/conf.d
    - name: ssl-certificates
      mountPath: /etc/ssl/certs
    resources:
      requests:
        memory: "32Mi"
        cpu: "25m"
      limits:
        memory: "64Mi"
        cpu: "50m"

  volumes:
  # Shared log directory
  - name: app-logs
    emptyDir: {}
  
  # Application configuration
  - name: app-config
    configMap:
      name: webapp-config
  
  # Fluent Bit configuration
  - name: fluent-bit-config
    configMap:
      name: fluent-bit-config
  
  # Nginx configuration
  - name: nginx-config
    configMap:
      name: nginx-ssl-config
  
  # SSL certificates
  - name: ssl-certificates
    secret:
      secretName: webapp-tls
  
  # Host filesystem mounts for metrics
  - name: proc
    hostPath:
      path: /proc
  - name: sys
    hostPath:
      path: /sys
  - name: rootfs
    hostPath:
      path: /

  # Pod-level configurations
  restartPolicy: Always
  serviceAccountName: webapp-service-account
  securityContext:
    fsGroup: 2000
  
  # Node selection
  nodeSelector:
    node-type: webapp-nodes
  
  # Resource scheduling
  tolerations:
  - key: "webapp-only"
    operator: "Equal"
    value: "true"
    effect: "NoSchedule"
```

### Database with Backup and Monitoring
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: database-cluster-node
  labels:
    app: postgres
    role: primary
spec:
  initContainers:
  # Initialize database if needed
  - name: db-init
    image: postgres:14
    command: ['sh', '-c']
    args:
    - |
      if [ ! -f /var/lib/postgresql/data/PG_VERSION ]; then
        echo "Initializing new database..."
        initdb -D /var/lib/postgresql/data
      else
        echo "Database already exists"
      fi
    env:
    - name: POSTGRES_USER
      value: "postgres"
    - name: POSTGRES_PASSWORD
      valueFrom:
        secretKeyRef:
          name: postgres-secret
          key: password
    volumeMounts:
    - name: db-data
      mountPath: /var/lib/postgresql/data
  
  containers:
  # Main PostgreSQL database
  - name: postgres
    image: postgres:14
    ports:
    - containerPort: 5432
      name: postgres
    env:
    - name: POSTGRES_DB
      value: "myapp"
    - name: POSTGRES_USER
      value: "postgres"
    - name: POSTGRES_PASSWORD
      valueFrom:
        secretKeyRef:
          name: postgres-secret
          key: password
    - name: PGDATA
      value: "/var/lib/postgresql/data/pgdata"
    volumeMounts:
    - name: db-data
      mountPath: /var/lib/postgresql/data
    - name: postgres-config
      mountPath: /etc/postgresql
    resources:
      requests:
        memory: "1Gi"
        cpu: "500m"
      limits:
        memory: "2Gi"
        cpu: "1000m"
    readinessProbe:
      exec:
        command:
        - pg_isready
        - -U
        - postgres
      initialDelaySeconds: 15
      periodSeconds: 5
    livenessProbe:
      exec:
        command:
        - pg_isready
        - -U
        - postgres
      initialDelaySeconds: 30
      periodSeconds: 10
  
  # Backup sidecar
  - name: backup-agent
    image: postgres:14
    command: ['sh', '-c']
    args:
    - |
      while true; do
        echo "Starting backup at $(date)"
        pg_dump -h localhost -U postgres -d myapp | gzip > /backup/backup-$(date +%Y%m%d-%H%M%S).sql.gz
        
        # Clean up old backups (keep last 7 days)
        find /backup -name "backup-*.sql.gz" -mtime +7 -delete
        
        echo "Backup completed at $(date)"
        sleep 21600  # Backup every 6 hours
      done
    env:
    - name: PGPASSWORD
      valueFrom:
        secretKeyRef:
          name: postgres-secret
          key: password
    volumeMounts:
    - name: backup-storage
      mountPath: /backup
    resources:
      requests:
        memory: "256Mi"
        cpu: "100m"
      limits:
        memory: "512Mi"
        cpu: "200m"
  
  # PostgreSQL metrics exporter
  - name: postgres-exporter
    image: prometheuscommunity/postgres-exporter:v0.11.1
    ports:
    - containerPort: 9187
      name: metrics
    env:
    - name: DATA_SOURCE_NAME
      value: "postgresql://postgres:$(POSTGRES_PASSWORD)@localhost:5432/myapp?sslmode=disable"
    - name: POSTGRES_PASSWORD
      valueFrom:
        secretKeyRef:
          name: postgres-secret
          key: password
    resources:
      requests:
        memory: "64Mi"
        cpu: "50m"
      limits:
        memory: "128Mi"
        cpu: "100m"
  
  # Connection pooler sidecar
  - name: pgbouncer
    image: pgbouncer/pgbouncer:1.17.0
    ports:
    - containerPort: 6432
      name: pgbouncer
    env:
    - name: POOL_MODE
      value: "transaction"
    - name: SERVER_RESET_QUERY
      value: "DISCARD ALL"
    - name: MAX_CLIENT_CONN
      value: "100"
    - name: DEFAULT_POOL_SIZE
      value: "20"
    - name: DATABASE_URL
      value: "postgresql://postgres:$(POSTGRES_PASSWORD)@localhost:5432/myapp"
    - name: POSTGRES_PASSWORD
      valueFrom:
        secretKeyRef:
          name: postgres-secret
          key: password
    volumeMounts:
    - name: pgbouncer-config
      mountPath: /etc/pgbouncer
    resources:
      requests:
        memory: "64Mi"
        cpu: "50m"
      limits:
        memory: "128Mi"
        cpu: "100m"

  volumes:
  # Persistent database storage
  - name: db-data
    persistentVolumeClaim:
      claimName: postgres-data-pvc
  
  # Backup storage
  - name: backup-storage
    persistentVolumeClaim:
      claimName: postgres-backup-pvc
  
  # PostgreSQL configuration
  - name: postgres-config
    configMap:
      name: postgres-config
  
  # PgBouncer configuration
  - name: pgbouncer-config
    configMap:
      name: pgbouncer-config

  # Pod-level settings
  restartPolicy: Always
  serviceAccountName: postgres-service-account
  securityContext:
    runAsUser: 999
    runAsGroup: 999
    fsGroup: 999
```

## Key Concepts Summary
- **Multi-container pods** - Multiple containers sharing network, storage, and lifecycle in a single pod
- **Sidecar pattern** - Helper containers providing supporting functionality to main application
- **Init containers** - Setup containers that run and complete before main containers start
- **Shared volumes** - Storage accessible by all containers in the pod for data exchange
- **Network sharing** - All containers share same IP address and can communicate via localhost
- **Ambassador pattern** - Proxy sidecars providing consistent interface to external services
- **Adapter pattern** - Sidecars that transform application output to match external expectations
- **Volume types** - emptyDir for temporary sharing, PVC for persistent sharing, ConfigMaps/Secrets for configuration

## Best Practices / Tips

1. **Keep sidecars focused** - Each sidecar should have one specific responsibility
2. **Use init containers for setup** - Don't mix setup logic with application logic
3. **Resource limits** - Set appropriate resource limits for each container
4. **Avoid port conflicts** - Ensure each container uses different ports
5. **Shared volume organization** - Use subdirectories or subPath to organize shared data
6. **Security contexts** - Set appropriate user permissions for each container
7. **Health checks** - Configure readiness and liveness probes for main containers
8. **Logging strategy** - Use sidecars for log collection rather than including logging in main app
9. **Configuration management** - Use ConfigMaps and Secrets for shared configuration
10. **Monitor resource usage** - Multi-container pods can consume more resources than single containers

## Common Issues / Troubleshooting

### Problem 1: Port Conflicts
- **Symptom:** Container fails to start with "address already in use" error
- **Cause:** Multiple containers trying to bind to the same port
- **Solution:** Ensure each container uses unique ports

```bash
# Check which ports are in use
kubectl exec -it pod-name -c container-name -- netstat -tulpn

# Check pod events for port conflicts
kubectl describe pod pod-name
```

### Problem 2: Init Container Stuck
- **Symptom:** Pod stuck in "Init:0/1" status
- **Cause:** Init container not completing successfully
- **Solution:** Check init container logs and ensure it exits with status 0

```bash
# Check init container logs
kubectl logs pod-name -c init-container-name

# Check init container status
kubectl describe pod pod-name
```

### Problem 3: Shared Volume Permission Issues
- **Symptom:** Containers can't read/write to shared volumes
- **Cause:** File permission mismatches between containers
- **Solution:** Use securityContext to set consistent user/group IDs

```yaml
apiVersion: v1
kind: Pod
spec:
  securityContext:
    fsGroup: 2000  # All containers use this group for shared volumes
  containers:
  - name: container1
    securityContext:
      runAsUser: 1000
      runAsGroup: 2000
  - name: container2
    securityContext:
      runAsUser: 1001
      runAsGroup: 2000
```

### Problem 4: Container Communication Failures
- **Symptom:** Containers can't communicate via localhost
- **Cause:** Containers not properly sharing network namespace
- **Solution:** Verify containers are in same pod and using correct localhost addresses

```bash
# Test network connectivity between containers
kubectl exec -it pod-name -c container1 -- curl http://localhost:8080
kubectl exec -it pod-name -c container1 -- nc -zv localhost 8080
```

### Problem 5: Resource Contention
- **Symptom:** Pod performance issues or containers being killed
- **Cause:** Containers competing for CPU/memory resources
- **Solution:** Set appropriate resource requests and limits for each container

```yaml
containers:
- name: main-app
  resources:
    requests:
      memory: "512Mi"
      cpu: "250m"
    limits:
      memory: "1Gi"
      cpu: "500m"
- name: sidecar
  resources:
    requests:
      memory: "64Mi"
      cpu: "50m"
    limits:
      memory: "128Mi"
      cpu: "100m"
```

## References / Further Reading
- [Kubernetes Multi-Container Pods](https://kubernetes.io/docs/concepts/workloads/pods/#using-pods)
- [Init Containers Documentation](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/)
- [Pod Volumes Documentation](https://kubernetes.io/docs/concepts/storage/volumes/)
- [Container Design Patterns](https://kubernetes.io/blog/2015/06/the-distributed-system-toolkit-patterns/)
- [Sidecar Pattern Examples](https://kubernetes.io/docs/concepts/cluster-administration/logging/#sidecar-container-with-logging-agent)
- [Pod Security Context](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/)
- [Resource Management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)