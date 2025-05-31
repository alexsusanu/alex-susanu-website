# Kubernetes Configuration Management: Complete Deep Technical Guide
category: DevOps
tags: kubernetes, configmaps, secrets, environment-variables, helm, configuration, hot-reloading

## Introduction to Configuration Management

Configuration management in Kubernetes is about **separating application code from configuration data**. This separation enables the same application image to run in different environments (dev, staging, production) with different configurations, without rebuilding the container image.

### The Configuration Problem

**Without proper configuration management:**
```dockerfile
# Bad: Configuration baked into image
FROM node:16
COPY app.js /app/
COPY config-production.json /app/config.json  # ❌ Hard-coded for production
CMD ["node", "/app/app.js"]

# Problems:
# 1. Need different images for dev/staging/prod
# 2. Secrets visible in image layers
# 3. Can't change config without rebuilding image
# 4. No way to update config at runtime
```

**With Kubernetes configuration management:**
```dockerfile
# Good: Generic image, config injected at runtime
FROM node:16
COPY app.js /app/
CMD ["node", "/app/app.js"]
# Configuration comes from ConfigMaps, Secrets, and environment variables
```

### Configuration Injection Methods

**Environment Variables** - Simple key-value pairs injected into container environment
```yaml
env:
- name: DATABASE_HOST
  value: "postgres.database.svc.cluster.local"
```

**ConfigMaps** - Non-sensitive configuration data as files or environment variables
```yaml
volumeMounts:
- name: config-volume
  mountPath: /app/config
volumes:
- name: config-volume
  configMap:
    name: app-config
```

**Secrets** - Sensitive data with base64 encoding and additional security features
```yaml
env:
- name: DATABASE_PASSWORD
  valueFrom:
    secretKeyRef:
      name: db-secret
      key: password
```

## ConfigMaps Deep Dive

### What ConfigMaps Actually Are

**ConfigMaps** store non-sensitive configuration data as key-value pairs. They provide a way to decouple configuration from application code, making applications more portable and manageable.

**ConfigMap Structure:**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
data:
  # Simple key-value pairs
  database.host: "postgres.database.svc.cluster.local"
  database.port: "5432"
  log.level: "info"
  
  # Configuration files as values
  app.properties: |
    database.host=postgres.database.svc.cluster.local
    database.port=5432
    database.name=myapp
    cache.enabled=true
    cache.ttl=3600
  
  nginx.conf: |
    server {
        listen 80;
        server_name _;
        
        location / {
            proxy_pass http://backend:8080;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
        
        location /health {
            access_log off;
            return 200 "healthy\n";
        }
    }
```

### Creating ConfigMaps

#### From Literal Values
```bash
# Create ConfigMap from command line
kubectl create configmap app-config \
  --from-literal=database.host=postgres.example.com \
  --from-literal=database.port=5432 \
  --from-literal=log.level=debug
```

#### From Files
```bash
# Create ConfigMap from files
kubectl create configmap app-config \
  --from-file=app.properties \
  --from-file=nginx.conf \
  --from-file=config-dir/

# With custom key names
kubectl create configmap app-config \
  --from-file=application-config=app.properties \
  --from-file=nginx-config=nginx.conf
```

#### From Environment File
```bash
# Create from .env file
cat > app.env << EOF
DATABASE_HOST=postgres.example.com
DATABASE_PORT=5432
LOG_LEVEL=info
CACHE_ENABLED=true
EOF

kubectl create configmap app-config --from-env-file=app.env
```

### Using ConfigMaps as Environment Variables

#### Single Environment Variable
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-pod
spec:
  containers:
  - name: app
    image: myapp:latest
    env:
    # Single value from ConfigMap
    - name: DATABASE_HOST
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: database.host
    # Static environment variable
    - name: APP_NAME
      value: "MyApplication"
```

#### All ConfigMap Keys as Environment Variables
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-pod
spec:
  containers:
  - name: app
    image: myapp:latest
    envFrom:
    # Import all keys from ConfigMap as env vars
    - configMapRef:
        name: app-config
    # Keys become: DATABASE_HOST, DATABASE_PORT, LOG_LEVEL, etc.
```

#### Multiple ConfigMaps
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-pod
spec:
  containers:
  - name: app
    image: myapp:latest
    envFrom:
    # Import from multiple ConfigMaps
    - configMapRef:
        name: app-config
    - configMapRef:
        name: database-config
    - configMapRef:
        name: cache-config
    env:
    # Override specific values
    - name: LOG_LEVEL
      value: "debug"  # Overrides value from ConfigMap
```

### Using ConfigMaps as Volume Mounts

#### Basic Volume Mount
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-pod
spec:
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: config-volume
      mountPath: /app/config
      readOnly: true
  volumes:
  - name: config-volume
    configMap:
      name: app-config
```

**Result in container:**
```bash
/app/config/
├── database.host          # Contains: postgres.database.svc.cluster.local
├── database.port          # Contains: 5432
├── log.level             # Contains: info
├── app.properties        # Contains: entire properties file
└── nginx.conf            # Contains: entire nginx config
```

#### Selective Key Mounting
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-pod
spec:
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: config-volume
      mountPath: /app/config
  volumes:
  - name: config-volume
    configMap:
      name: app-config
      items:
      # Only mount specific keys
      - key: app.properties
        path: application.properties  # Custom filename
      - key: nginx.conf
        path: nginx/nginx.conf        # Custom subdirectory
        mode: 0644                    # Custom permissions
```

**Result in container:**
```bash
/app/config/
├── application.properties
└── nginx/
    └── nginx.conf
```

#### SubPath Mounting
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
spec:
  containers:
  - name: nginx
    image: nginx:latest
    volumeMounts:
    # Mount specific file to specific location
    - name: nginx-config
      mountPath: /etc/nginx/nginx.conf
      subPath: nginx.conf  # Mount only this file, not entire ConfigMap
  volumes:
  - name: nginx-config
    configMap:
      name: nginx-configmap
```

### Advanced ConfigMap Patterns

#### Multi-Environment Configuration
```yaml
# Development ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: development
data:
  environment: "development"
  database.host: "postgres.dev.internal"
  database.name: "myapp_dev"
  log.level: "debug"
  cache.enabled: "false"
  api.rate.limit: "1000"
---
# Production ConfigMap  
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
data:
  environment: "production"
  database.host: "postgres.prod.internal"
  database.name: "myapp_prod"
  log.level: "warn"
  cache.enabled: "true"
  api.rate.limit: "100"
```

#### Layered Configuration
```yaml
# Base configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: base-config
data:
  app.name: "MyApplication"
  app.version: "1.0.0"
  log.format: "json"
  metrics.enabled: "true"
---
# Environment-specific overrides
apiVersion: v1
kind: ConfigMap
metadata:
  name: env-config
data:
  log.level: "info"
  database.pool.size: "10"
---
# Feature-specific configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: feature-config
data:
  feature.new_ui: "true"
  feature.analytics: "false"
---
# Pod using layered config
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: app
    image: myapp:latest
    envFrom:
    - configMapRef:
        name: base-config
    - configMapRef:
        name: env-config
    - configMapRef:
        name: feature-config
```

#### ConfigMap with Binary Data
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: binary-config
data:
  # Text configuration
  app.properties: |
    server.port=8080
    server.name=myapp
binaryData:
  # Binary files (base64 encoded)
  logo.png: iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==
  certificate.p12: MIIKPAIBAzCCCfwGCSqGSIb3DQEHAaCCCe0Eggn...
```

## Secrets Deep Dive

### Understanding Secret Types

Kubernetes provides several built-in secret types, each optimized for specific use cases:

#### Opaque Secrets (Generic)
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: production
type: Opaque
data:
  # Base64 encoded values
  database-password: cGFzc3dvcmQxMjM=
  api-key: YWJjZGVmZ2hpams=
  encryption-key: bXlzdXBlcnNlY3JldGtleQ==
stringData:
  # Plain text values (automatically base64 encoded)
  database-url: "postgresql://user:password@host:5432/db"
  jwt-secret: "my-super-secret-jwt-key"
```

#### Docker Registry Secrets
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: registry-secret
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: ewogICJhdXRocyI6IHsKICAgICJyZWdpc3RyeS5jb21wYW55LmNvbSI6IHsKICAgICAgInVzZXJuYW1lIjogImRvY2tlcnVzZXIiLAogICAgICAicGFzc3dvcmQiOiAicGFzc3dvcmQxMjMiLAogICAgICAiYXV0aCI6ICJaRzlqYTJWeVkzVnpaWEk2Y0dGemMzZHZjbVF4TWpNPSIKICAgIH0KICB9Cn0=
```

**Creating Docker Registry Secret:**
```bash
kubectl create secret docker-registry registry-secret \
  --docker-server=registry.company.com \
  --docker-username=dockeruser \
  --docker-password=password123 \
  --docker-email=docker@company.com \
  --namespace=production
```

#### TLS Secrets
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: tls-secret
  namespace: production
type: kubernetes.io/tls
data:
  tls.crt: LS0tLS1CRUdJTi... # Base64 encoded certificate
  tls.key: LS0tLS1CRUdJTi... # Base64 encoded private key
```

**Creating TLS Secret:**
```bash
kubectl create secret tls tls-secret \
  --cert=path/to/cert.pem \
  --key=path/to/key.pem \
  --namespace=production
```

#### SSH Auth Secrets
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ssh-secret
type: kubernetes.io/ssh-auth
data:
  ssh-privatekey: LS0tLS1CRUdJTi... # Base64 encoded SSH private key
```

#### Basic Auth Secrets
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: basic-auth-secret
type: kubernetes.io/basic-auth
data:
  username: YWRtaW4=     # base64 encoded "admin"
  password: cGFzc3dvcmQ= # base64 encoded "password"
```

### Using Secrets in Pods

#### Environment Variable Injection
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-secrets
spec:
  containers:
  - name: app
    image: myapp:latest
    env:
    # Single secret value
    - name: DATABASE_PASSWORD
      valueFrom:
        secretKeyRef:
          name: app-secrets
          key: database-password
    # Multiple individual secret values
    - name: API_KEY
      valueFrom:
        secretKeyRef:
          name: app-secrets
          key: api-key
    - name: JWT_SECRET
      valueFrom:
        secretKeyRef:
          name: app-secrets
          key: jwt-secret
    # Mix with ConfigMap values
    - name: DATABASE_HOST
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: database.host
```

#### All Secret Keys as Environment Variables
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-all-secrets
spec:
  containers:
  - name: app
    image: myapp:latest
    envFrom:
    # Import all secret keys as environment variables
    - secretRef:
        name: app-secrets
    # Also import ConfigMap
    - configMapRef:
        name: app-config
```

#### Volume Mounting (More Secure)
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-secret-files
spec:
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: secret-volume
      mountPath: /etc/secrets
      readOnly: true
    # Application reads secrets from files:
    # /etc/secrets/database-password
    # /etc/secrets/api-key
    # /etc/secrets/jwt-secret
  volumes:
  - name: secret-volume
    secret:
      secretName: app-secrets
      defaultMode: 0400  # Read-only for owner
```

#### Selective Secret Mounting
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-specific-secrets
spec:
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: db-credentials
      mountPath: /etc/database
      readOnly: true
    - name: tls-certs
      mountPath: /etc/ssl/certs
      readOnly: true
  volumes:
  - name: db-credentials
    secret:
      secretName: app-secrets
      items:
      - key: database-password
        path: password
        mode: 0400
      - key: database-url
        path: connection-string
        mode: 0400
  - name: tls-certs
    secret:
      secretName: tls-secret
      items:
      - key: tls.crt
        path: server.crt
        mode: 0444
      - key: tls.key
        path: server.key
        mode: 0400
```

### Secret Security Best Practices

#### Encryption at Rest
```yaml
# /etc/kubernetes/encryption-config.yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
- resources:
  - secrets
  providers:
  - aescbc:
      keys:
      - name: key1
        secret: c2VjcmV0IGlzIHNlY3VyZQ==
  - identity: {}
```

**Enable in API Server:**
```bash
# Add to kube-apiserver flags
--encryption-provider-config=/etc/kubernetes/encryption-config.yaml
```

#### Secret Rotation Strategy
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: secret-rotator
spec:
  schedule: "0 2 * * 0"  # Weekly
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: secret-rotator
          containers:
          - name: rotator
            image: secret-rotator:latest
            command:
            - sh
            - -c
            - |
              # Generate new password
              NEW_PASSWORD=$(openssl rand -base64 32)
              
              # Update external system (database, API, etc.)
              curl -X POST https://api.example.com/rotate-password \
                -H "Authorization: Bearer $API_TOKEN" \
                -d '{"new_password": "'$NEW_PASSWORD'"}'
              
              # Update Kubernetes secret
              kubectl patch secret app-secrets -p='{"data":{"database-password":"'$(echo -n $NEW_PASSWORD | base64)'"}}'
              
              # Restart applications to pick up new secret
              kubectl rollout restart deployment/myapp
            env:
            - name: API_TOKEN
              valueFrom:
                secretKeyRef:
                  name: rotation-credentials
                  key: api-token
          restartPolicy: OnFailure
```

#### External Secret Management
```yaml
# Using External Secrets Operator with AWS Secrets Manager
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets-manager
  namespace: production
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-west-2
      auth:
        secretRef:
          accessKeyID:
            name: aws-credentials
            key: access-key-id
          secretAccessKey:
            name: aws-credentials
            key: secret-access-key
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-secret
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: database-credentials
    creationPolicy: Owner
  data:
  - secretKey: password
    remoteRef:
      key: production/database
      property: password
  - secretKey: username
    remoteRef:
      key: production/database
      property: username
```

## Environment Variables Deep Dive

### Direct Environment Variables
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-env-vars
spec:
  containers:
  - name: app
    image: myapp:latest
    env:
    # Static values
    - name: APP_NAME
      value: "MyApplication"
    - name: APP_VERSION
      value: "1.2.3"
    - name: NODE_ENV
      value: "production"
    
    # From ConfigMap
    - name: DATABASE_HOST
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: database.host
    
    # From Secret
    - name: DATABASE_PASSWORD
      valueFrom:
        secretKeyRef:
          name: app-secrets
          key: database-password
    
    # From pod metadata
    - name: POD_NAME
      valueFrom:
        fieldRef:
          fieldPath: metadata.name
    - name: POD_NAMESPACE
      valueFrom:
        fieldRef:
          fieldPath: metadata.namespace
    - name: POD_IP
      valueFrom:
        fieldRef:
          fieldPath: status.podIP
    
    # From resource limits/requests
    - name: CPU_REQUEST
      valueFrom:
        resourceFieldRef:
          resource: requests.cpu
    - name: MEMORY_LIMIT
      valueFrom:
        resourceFieldRef:
          resource: limits.memory
```

### Environment Variable Sources Comparison

#### Static vs Dynamic Sources
```yaml
env:
# Static - set at pod creation, never changes
- name: APP_VERSION
  value: "1.2.3"

# Dynamic - can change when ConfigMap/Secret changes
- name: LOG_LEVEL
  valueFrom:
    configMapKeyRef:
      name: app-config
      key: log.level

# Metadata - reflects current pod state
- name: NODE_NAME
  valueFrom:
    fieldRef:
      fieldPath: spec.nodeName
```

#### Precedence Rules
```yaml
# Environment variables have precedence order:
envFrom:
- configMapRef:
    name: base-config     # Lowest precedence
- configMapRef:
    name: env-config      # Medium precedence
env:
- name: LOG_LEVEL
  value: "debug"          # Highest precedence - overrides ConfigMap values
```

### Complex Environment Configuration
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: multi-tier-app
spec:
  template:
    spec:
      containers:
      - name: app
        image: myapp:latest
        envFrom:
        # Base configuration for all environments
        - configMapRef:
            name: app-base-config
        # Environment-specific configuration
        - configMapRef:
            name: app-production-config
        # Shared secrets
        - secretRef:
            name: app-shared-secrets
        env:
        # Override specific values
        - name: LOG_LEVEL
          value: "info"
        # Computed values
        - name: DATABASE_URL
          value: "postgresql://$(DATABASE_USER):$(DATABASE_PASSWORD)@$(DATABASE_HOST):$(DATABASE_PORT)/$(DATABASE_NAME)"
        # Pod-specific information
        - name: INSTANCE_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.uid
        - name: HOST_IP
          valueFrom:
            fieldRef:
              fieldPath: status.hostIP
        # Resource information
        - name: CPU_LIMIT
          valueFrom:
            resourceFieldRef:
              resource: limits.cpu
        - name: MEMORY_REQUEST
          valueFrom:
            resourceFieldRef:
              resource: requests.memory
        
        # Additional variables from other sources
        - name: DATABASE_USER
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: username
        - name: DATABASE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: password
        - name: DATABASE_HOST
          valueFrom:
            configMapKeyRef:
              name: database-config
              key: host
        - name: DATABASE_PORT
          valueFrom:
            configMapKeyRef:
              name: database-config
              key: port
        - name: DATABASE_NAME
          valueFrom:
            configMapKeyRef:
              name: database-config
              key: name
```

## Configuration Hot-Reloading

### What is Hot-Reloading?

**Hot-reloading** allows applications to detect and apply configuration changes without restarting. This enables zero-downtime configuration updates.

### File-Based Hot-Reloading

#### Application Implementation
```go
// Go example of file-based config watching
package main

import (
    "fmt"
    "log"
    "time"
    "github.com/fsnotify/fsnotify"
    "gopkg.in/yaml.v2"
    "io/ioutil"
)

type Config struct {
    LogLevel string `yaml:"log_level"`
    DatabaseHost string `yaml:"database_host"`
    CacheEnabled bool `yaml:"cache_enabled"`
}

func watchConfig(configFile string, config *Config) {
    watcher, err := fsnotify.NewWatcher()
    if err != nil {
        log.Fatal(err)
    }
    defer watcher.Close()

    go func() {
        for {
            select {
            case event, ok := <-watcher.Events:
                if !ok {
                    return
                }
                if event.Op&fsnotify.Write == fsnotify.Write {
                    fmt.Println("Config file modified:", event.Name)
                    loadConfig(configFile, config)
                }
            case err, ok := <-watcher.Errors:
                if !ok {
                    return
                }
                log.Println("Config watcher error:", err)
            }
        }
    }()

    err = watcher.Add(configFile)
    if err != nil {
        log.Fatal(err)
    }
}

func loadConfig(configFile string, config *Config) {
    data, err := ioutil.ReadFile(configFile)
    if err != nil {
        log.Printf("Error reading config file: %v", err)
        return
    }
    
    err = yaml.Unmarshal(data, config)
    if err != nil {
        log.Printf("Error parsing config file: %v", err)
        return
    }
    
    fmt.Printf("Config reloaded: %+v\n", config)
}
```

#### Kubernetes Configuration for Hot-Reloading
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  config.yaml: |
    log_level: info
    database_host: postgres.database.svc.cluster.local
    cache_enabled: true
    api_rate_limit: 1000
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hot-reload-app
spec:
  template:
    spec:
      containers:
      - name: app
        image: hot-reload-app:latest
        volumeMounts:
        - name: config-volume
          mountPath: /app/config
          readOnly: true
        env:
        - name: CONFIG_FILE
          value: "/app/config/config.yaml"
        # Application watches CONFIG_FILE for changes
      volumes:
      - name: config-volume
        configMap:
          name: app-config
```

### Signal-Based Reloading

#### NGINX Configuration Reload
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-config
data:
  nginx.conf: |
    events {
        worker_connections 1024;
    }
    http {
        upstream backend {
            server backend1:8080;
            server backend2:8080;
        }
        server {
            listen 80;
            location / {
                proxy_pass http://backend;
            }
        }
    }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-with-reload
spec:
  template:
    spec:
      containers:
      - name: nginx
        image: nginx:latest
        volumeMounts:
        - name: nginx-config
          mountPath: /etc/nginx/nginx.conf
          subPath: nginx.conf
        lifecycle:
          preStop:
            exec:
              command: ["/usr/sbin/nginx", "-s", "quit"]
      - name: config-reloader
        image: config-reloader:latest
        command:
        - sh
        - -c
        - |
          # Watch for config changes and reload nginx
          inotifywait -m -e modify /etc/nginx/nginx.conf |
          while read path action file; do
            echo "Config changed, reloading nginx..."
            nginx -t && nginx -s reload
          done
        volumeMounts:
        - name: nginx-config
          mountPath: /etc/nginx/nginx.conf
          subPath: nginx.conf
      volumes:
      - name: nginx-config
        configMap:
          name: nginx-config
```

### Webhook-Based Configuration Updates

#### Configuration Webhook Server
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-with-webhook-reload
spec:
  template:
    spec:
      containers:
      - name: app
        image: myapp:latest
        ports:
        - name: http
          containerPort: 8080
        - name: webhook
          containerPort: 9090
        env:
        - name: CONFIG_WEBHOOK_PORT
          value: "9090"
        volumeMounts:
        - name: config-volume
          mountPath: /app/config
      volumes:
      - name: config-volume
        configMap:
          name: app-config
---
apiVersion: v1
kind: Service
metadata:
  name: app-webhook-service
spec:
  selector:
    app: myapp
  ports:
  - name: webhook
    port: 9090
    targetPort: 9090
```

#### Configuration Update Script
```bash
#!/bin/bash
# Script to update config and trigger reload

# Update ConfigMap
kubectl patch configmap app-config -p='{"data":{"log_level":"debug","cache_enabled":"false"}}'

# Trigger reload via webhook
kubectl get pods -l app=myapp -o jsonpath='{.items[*].status.podIP}' | \
xargs -I {} curl -X POST http://{}:9090/reload-config
```

### Reloader Controller Pattern

#### Using Stakater Reloader
```yaml
# Install Stakater Reloader
apiVersion: apps/v1
kind: Deployment
metadata:
  name: reloader
  namespace: kube-system
spec:
  template:
    spec:
      containers:
      - name: reloader
        image: stakater/reloader:latest
        # Reloader watches for ConfigMap/Secret changes
        # and automatically restarts pods with annotations
---
# Deployment with reloader annotations
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auto-reload-app
  annotations:
    # Restart when these ConfigMaps change
    reloader.stakater.com/configmap: "app-config,database-config"
    # Restart when these Secrets change
    reloader.stakater.com/secret: "app-secrets"
spec:
  template:
    spec:
      containers:
      - name: app
        image: myapp:latest
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets
```

#### Custom Reloader Implementation
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: config-sync
spec:
  schedule: "*/5 * * * *"  # Every 5 minutes
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: config-syncer
          containers:
          - name: sync
            image: kubectl:latest
            command:
            - sh
            - -c
            - |
              # Check if ConfigMap has changed
              CURRENT_HASH=$(kubectl get configmap app-config -o jsonpath='{.metadata.resourceVersion}')
              LAST_HASH=$(kubectl get deployment myapp -o jsonpath='{.metadata.annotations.config-hash}')
              
              if [ "$CURRENT_HASH" != "$LAST_HASH" ]; then
                echo "ConfigMap changed, updating deployment..."
                
                # Update deployment annotation with new hash
                kubectl annotate deployment myapp config-hash=$CURRENT_HASH --overwrite
                
                # Restart deployment
                kubectl rollout restart deployment myapp
                
                echo "Deployment restarted due to config change"
              else
                echo "No config changes detected"
              fi
          restartPolicy: OnFailure
```

## Helm Templating Advanced

### Helm Template Functions

#### Built-in Functions
```yaml
# values.yaml
app:
  name: myapp
  version: 1.2.3
environment: production
replicas: 3
resources:
  cpu: 500m
  memory: 1Gi

# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Values.app.name }}
  labels:
    app: {{ .Values.app.name }}
    version: {{ .Values.app.version | quote }}
    environment: {{ .Values.environment }}
    # String manipulation
    app-upper: {{ .Values.app.name | upper }}
    app-title: {{ .Values.app.name | title }}
spec:
  replicas: {{ .Values.replicas }}
  selector:
    matchLabels:
      app: {{ .Values.app.name }}
  template:
    metadata:
      labels:
        app: {{ .Values.app.name }}
        # Default values with fallback
        version: {{ .Values.app.version | default "latest" }}
    spec:
      containers:
      - name: {{ .Values.app.name }}
        image: {{ .Values.app.name }}:{{ .Values.app.version }}
        resources:
          requests:
            # Type conversion
            cpu: {{ .Values.resources.cpu | quote }}
            memory: {{ .Values.resources.memory | quote }}
          limits:
            cpu: {{ .Values.resources.cpu | quote }}
            memory: {{ .Values.resources.memory | quote }}
```

#### Conditional Logic
```yaml
# templates/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: {{ .Values.app.name }}
  {{- if .Values.service.annotations }}
  annotations:
    {{- toYaml .Values.service.annotations | nindent 4 }}
  {{- end }}
spec:
  type: {{ .Values.service.type | default "ClusterIP" }}
  {{- if eq .Values.service.type "LoadBalancer" }}
  {{- if .Values.service.loadBalancerIP }}
  loadBalancerIP: {{ .Values.service.loadBalancerIP }}
  {{- end }}
  {{- if .Values.service.loadBalancerSourceRanges }}
  loadBalancerSourceRanges:
    {{- toYaml .Values.service.loadBalancerSourceRanges | nindent 4 }}
  {{- end }}
  {{- end }}
  {{- if and (eq .Values.service.type "NodePort") .Values.service.nodePort }}
  nodePort: {{ .Values.service.nodePort }}
  {{- end }}
  ports:
  - port: {{ .Values.service.port }}
    targetPort: {{ .Values.service.targetPort | default .Values.service.port }}
    protocol: TCP
    name: http
  selector:
    app: {{ .Values.app.name }}
```

#### Loops and Iteration
```yaml
# values.yaml
services:
  - name: web
    port: 80
    targetPort: 8080
  - name: api
    port: 8080
    targetPort: 3000
  - name: metrics
    port: 9090
    targetPort: 9090

configMaps:
  app-config:
    database.host: postgres.example.com
    database.port: "5432"
  cache-config:
    redis.host: redis.example.com
    redis.port: "6379"

# templates/services.yaml
{{- range .Values.services }}
---
apiVersion: v1
kind: Service
metadata:
  name: {{ $.Values.app.name }}-{{ .name }}
spec:
  selector:
    app: {{ $.Values.app.name }}
  ports:
  - port: {{ .port }}
    targetPort: {{ .targetPort }}
    name: {{ .name }}
{{- end }}

# templates/configmaps.yaml
{{- range $name, $data := .Values.configMaps }}
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ $name }}
data:
  {{- range $key, $value := $data }}
  {{ $key }}: {{ $value | quote }}
  {{- end }}
{{- end }}
```

### Advanced Helm Patterns

#### Helper Templates (_helpers.tpl)
```yaml
# templates/_helpers.tpl
{{/*
Expand the name of the chart.
*/}}
{{- define "myapp.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "myapp.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "myapp.labels" -}}
helm.sh/chart: {{ include "myapp.chart" . }}
{{ include "myapp.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "myapp.selectorLabels" -}}
app.kubernetes.io/name: {{ include "myapp.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Database URL builder
*/}}
{{- define "myapp.databaseUrl" -}}
{{- if .Values.database.existingSecret }}
{{- printf "postgresql://$(DATABASE_USER):$(DATABASE_PASSWORD)@%s:%d/%s" .Values.database.host (.Values.database.port | int) .Values.database.name }}
{{- else }}
{{- printf "postgresql://%s:%s@%s:%d/%s" .Values.database.user .Values.database.password .Values.database.host (.Values.database.port | int) .Values.database.name }}
{{- end }}
{{- end }}

# templates/deployment.yaml using helpers
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "myapp.fullname" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
spec:
  selector:
    matchLabels:
      {{- include "myapp.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "myapp.selectorLabels" . | nindent 8 }}
    spec:
      containers:
      - name: {{ .Chart.Name }}
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
        env:
        - name: DATABASE_URL
          value: {{ include "myapp.databaseUrl" . | quote }}
```

#### Multi-Environment Values Structure
```yaml
# values.yaml (default/development)
global:
  imageRegistry: ""
  imagePullSecrets: []

app:
  name: myapp
  version: latest

environment: development

database:
  host: postgres.dev.internal
  port: 5432
  name: myapp_dev
  user: dev_user
  password: dev_password

resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 200m
    memory: 256Mi

# values-production.yaml
environment: production

database:
  host: postgres.prod.internal
  name: myapp_prod
  existingSecret: database-credentials

resources:
  requests:
    cpu: 500m
    memory: 1Gi
  limits:
    cpu: 1000m
    memory: 2Gi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 20
  targetCPUUtilizationPercentage: 70

# values-staging.yaml
environment: staging

database:
  host: postgres.staging.internal
  name: myapp_staging

resources:
  requests:
    cpu: 200m
    memory: 512Mi
  limits:
    cpu: 500m
    memory: 1Gi
```

#### Conditional Resource Creation
```yaml
# templates/hpa.yaml
{{- if .Values.autoscaling.enabled }}
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ include "myapp.fullname" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{ include "myapp.fullname" . }}
  minReplicas: {{ .Values.autoscaling.minReplicas }}
  maxReplicas: {{ .Values.autoscaling.maxReplicas }}
  metrics:
    {{- if .Values.autoscaling.targetCPUUtilizationPercentage }}
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: {{ .Values.autoscaling.targetCPUUtilizationPercentage }}
    {{- end }}
    {{- if .Values.autoscaling.targetMemoryUtilizationPercentage }}
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: {{ .Values.autoscaling.targetMemoryUtilizationPercentage }}
    {{- end }}
{{- end }}

# templates/pdb.yaml
{{- if .Values.podDisruptionBudget.enabled }}
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: {{ include "myapp.fullname" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
spec:
  {{- if .Values.podDisruptionBudget.minAvailable }}
  minAvailable: {{ .Values.podDisruptionBudget.minAvailable }}
  {{- end }}
  {{- if .Values.podDisruptionBudget.maxUnavailable }}
  maxUnavailable: {{ .Values.podDisruptionBudget.maxUnavailable }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "myapp.selectorLabels" . | nindent 6 }}
{{- end }}
```

#### Complex Configuration Templating
```yaml
# templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "myapp.fullname" . }}-config
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
data:
  app.properties: |
    # Application configuration
    app.name={{ .Values.app.name }}
    app.version={{ .Values.app.version }}
    app.environment={{ .Values.environment }}
    
    # Database configuration
    {{- if .Values.database.existingSecret }}
    database.url=${DATABASE_URL}
    {{- else }}
    database.host={{ .Values.database.host }}
    database.port={{ .Values.database.port }}
    database.name={{ .Values.database.name }}
    database.user={{ .Values.database.user }}
    database.password={{ .Values.database.password }}
    {{- end }}
    
    # Feature flags
    {{- range $key, $value := .Values.features }}
    feature.{{ $key }}={{ $value }}
    {{- end }}
    
    # Environment-specific settings
    {{- if eq .Values.environment "production" }}
    log.level=warn
    cache.enabled=true
    metrics.enabled=true
    {{- else if eq .Values.environment "staging" }}
    log.level=info
    cache.enabled=true
    metrics.enabled=true
    {{- else }}
    log.level=debug
    cache.enabled=false
    metrics.enabled=false
    {{- end }}
  
  {{- if .Values.customConfig }}
  custom.properties: |
    {{- .Values.customConfig | nindent 4 }}
  {{- end }}
```

### Helm Hooks

#### Pre-Install Database Migration
```yaml
# templates/pre-install-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ include "myapp.fullname" . }}-migration
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
  annotations:
    "helm.sh/hook": pre-install,pre-upgrade
    "helm.sh/hook-weight": "-5"
    "helm.sh/hook-delete-policy": hook-succeeded
spec:
  template:
    metadata:
      name: {{ include "myapp.fullname" . }}-migration
    spec:
      restartPolicy: Never
      containers:
      - name: migration
        image: {{ .Values.migration.image.repository }}:{{ .Values.migration.image.tag }}
        command: ["./migrate", "up"]
        env:
        - name: DATABASE_URL
          value: {{ include "myapp.databaseUrl" . | quote }}
```

#### Post-Install Testing
```yaml
# templates/post-install-test.yaml
apiVersion: v1
kind: Pod
metadata:
  name: {{ include "myapp.fullname" . }}-test
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
  annotations:
    "helm.sh/hook": post-install,post-upgrade
    "helm.sh/hook-weight": "1"
    "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded
spec:
  restartPolicy: Never
  containers:
  - name: test
    image: curlimages/curl:latest
    command:
    - sh
    - -c
    - |
      # Wait for service to be ready
      until curl -f http://{{ include "myapp.fullname" . }}:{{ .Values.service.port }}/health; do
        echo "Waiting for service to be ready..."
        sleep 5
      done
      echo "Service is ready!"
      
      # Run additional tests
      curl -f http://{{ include "myapp.fullname" . }}:{{ .Values.service.port }}/api/status
      echo "All tests passed!"
```

## Key Concepts Summary
- **ConfigMaps** - Non-sensitive configuration data stored as key-value pairs or files
- **Secrets** - Sensitive data with base64 encoding and additional security features
- **Environment Variables** - Direct injection from static values, ConfigMaps, Secrets, or pod metadata
- **Volume Mounting** - Mounting configuration as files with selective key mounting and custom paths
- **Hot-Reloading** - Applications detecting and applying configuration changes without restarts
- **Helm Templates** - Dynamic YAML generation with conditionals, loops, and helper functions
- **Multi-Environment** - Different configurations for development, staging, and production
- **External Secrets** - Integration with external secret management systems
- **Configuration Layering** - Combining multiple ConfigMaps and Secrets with precedence rules

## Best Practices / Tips

1. **Separate sensitive from non-sensitive data** - Use ConfigMaps for config, Secrets for credentials
2. **Use volume mounts for large configs** - Better than environment variables for files
3. **Implement configuration validation** - Validate config format and values at startup
4. **Use external secret management** - HashiCorp Vault, AWS Secrets Manager for production
5. **Enable encryption at rest** - Encrypt secrets in etcd using EncryptionConfiguration
6. **Implement secret rotation** - Regularly rotate credentials and API keys
7. **Use Helm for multi-environment** - Template-based configuration management
8. **Design for hot-reloading** - Build applications that can reload config without restart
9. **Document configuration** - Maintain clear documentation of all configuration options
10. **Monitor configuration changes** - Track and audit configuration modifications

## Common Issues / Troubleshooting

### Problem 1: ConfigMap/Secret Not Updating in Pod
- **Symptom:** Pod environment variables don't reflect ConfigMap/Secret changes
- **Cause:** Environment variables are set at pod creation time, not updated dynamically
- **Solution:** Use volume mounts or restart pods to get updated configuration

```bash
# Check ConfigMap content
kubectl get configmap app-config -o yaml

# Restart deployment to pick up changes
kubectl rollout restart deployment/myapp

# Use volume mounts for dynamic updates
```

### Problem 2: Secret Data Not Base64 Encoded Properly
- **Symptom:** Secret values appear garbled or cause application errors
- **Cause:** Incorrect base64 encoding or using data instead of stringData
- **Solution:** Use stringData for plain text or verify base64 encoding

```bash
# Check secret content
kubectl get secret app-secret -o jsonpath='{.data.password}' | base64 -d

# Create secret with proper encoding
kubectl create secret generic app-secret --from-literal=password=mypassword
```

### Problem 3: Helm Template Rendering Errors
- **Symptom:** Helm install/upgrade fails with template errors
- **Cause:** Syntax errors, missing values, or incorrect logic in templates
- **Solution:** Use helm template command to debug and validate values

```bash
# Debug template rendering
helm template myapp ./chart -f values-production.yaml

# Validate with dry-run
helm install myapp ./chart --dry-run --debug

# Check specific template
helm template myapp ./chart -s templates/deployment.yaml
```

### Problem 4: Configuration Hot-Reload Not Working
- **Symptom:** Application doesn't pick up configuration changes
- **Cause:** Application not watching for file changes or incorrect file paths
- **Solution:** Verify file watching implementation and mount paths

```bash
# Check if files are being updated
kubectl exec -it pod-name -- ls -la /app/config

# Test file watching
kubectl exec -it pod-name -- inotifywait -m /app/config
```

### Problem 5: Environment Variable Precedence Issues
- **Symptom:** Wrong configuration values being used
- **Cause:** Environment variable precedence not understood
- **Solution:** Check variable precedence and explicit overrides

```bash
# Check environment variables in pod
kubectl exec -it pod-name -- env | sort

# Check pod configuration
kubectl describe pod pod-name
```

## References / Further Reading
- [Kubernetes ConfigMaps Documentation](https://kubernetes.io/docs/concepts/configuration/configmap/)
- [Kubernetes Secrets Documentation](https://kubernetes.io/docs/concepts/configuration/secret/)
- [Helm Templating Guide](https://helm.sh/docs/chart_template_guide/)
- [External Secrets Operator](https://external-secrets.io/)
- [Stakater Reloader](https://github.com/stakater/Reloader)
- [Kubernetes Configuration Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)
- [Helm Values Files](https://helm.sh/docs/chart_template_guide/values_files/)
- [Configuration Hot Reloading Patterns](https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/)