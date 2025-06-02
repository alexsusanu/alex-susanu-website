# CKA Study Guide: Manifest Management and Common Templating Tools

## **The Evolution from Simple YAML to Complex Application Management**

As Kubernetes adoption grows, organizations quickly discover that managing raw YAML manifests becomes unwieldy. What starts as a few simple deployments evolves into hundreds of interconnected resources across multiple environments, teams, and clusters.

### The Manifest Management Problem

**Traditional Approach Limitations**:
- **Copy-paste proliferation**: Duplicating YAML files for different environments
- **Configuration drift**: Manual changes leading to inconsistent environments  
- **Change tracking difficulty**: No clear audit trail of what changed when
- **Environment-specific variations**: Hard-coding values that should be configurable
- **Dependency management**: No clear way to manage related resources as units

**Scale-Related Challenges**:
- **Hundreds of YAML files**: Difficult to organize and maintain
- **Multi-team coordination**: Different teams modifying shared resources
- **Release coordination**: Managing dependencies between applications
- **Rollback complexity**: Reverting changes across multiple related resources
- **Secret management**: Handling sensitive data across environments

**The Cost of Poor Manifest Management**:
- **Deployment errors**: Manual processes are error-prone
- **Security vulnerabilities**: Inconsistent security configurations
- **Operational overhead**: Time spent on deployment mechanics vs business value
- **Reduced deployment frequency**: Fear of breaking production slows innovation

### Modern Manifest Management Philosophy

**Declarative Configuration Management**:
- **Infrastructure as Code**: All configuration versioned and auditable
- **Environment parity**: Consistent configuration across dev/staging/production
- **Separation of concerns**: Application logic separated from configuration
- **Composability**: Reusable components that can be combined

**GitOps Workflow**:
- **Git as source of truth**: All changes flow through version control
- **Automated deployment**: Changes automatically applied to clusters
- **Immutable deployments**: No manual cluster modifications
- **Complete audit trail**: Every change tracked and reversible

---

## **Raw Manifest Organization Strategies**

### Directory Structure Patterns

**Environment-Based Organization**:
```
manifests/
├── base/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── configmap.yaml
│   └── ingress.yaml
├── environments/
│   ├── development/
│   │   ├── kustomization.yaml
│   │   ├── configmap-patch.yaml
│   │   └── replica-patch.yaml
│   ├── staging/
│   │   ├── kustomization.yaml
│   │   ├── configmap-patch.yaml
│   │   └── ingress-patch.yaml
│   └── production/
│       ├── kustomization.yaml
│       ├── configmap-patch.yaml
│       ├── replica-patch.yaml
│       └── hpa.yaml
└── scripts/
    ├── deploy.sh
    └── validate.sh
```

**Application-Based Organization**:
```
applications/
├── frontend/
│   ├── manifests/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── ingress.yaml
│   ├── config/
│   │   ├── dev-config.yaml
│   │   ├── staging-config.yaml
│   │   └── prod-config.yaml
│   └── scripts/
│       └── deploy.sh
├── backend/
│   ├── manifests/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── statefulset.yaml
│   └── config/
│       ├── secrets.yaml
│       └── configmaps.yaml
└── shared/
    ├── ingress-controller/
    ├── monitoring/
    └── security/
```

### Multi-Document YAML Management

**Single File with Multiple Resources**:
```yaml
# app-stack.yaml
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
data:
  database.host: "prod-db.example.com"
  log.level: "INFO"

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
spec:
  replicas: 3
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
        image: web-app:v1.2.0
        envFrom:
        - configMapRef:
            name: app-config

---
apiVersion: v1
kind: Service
metadata:
  name: web-app-service
  namespace: production
spec:
  selector:
    app: web-app
  ports:
  - port: 80
    targetPort: 8080

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-app-ingress
  namespace: production
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - app.example.com
    secretName: app-tls
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-app-service
            port:
              number: 80
```

**Benefits and Drawbacks**:
```bash
# Benefits:
# - Single file deployment: kubectl apply -f app-stack.yaml
# - Atomic operations: All resources created/updated together
# - Clear resource relationships
# - Version control simplicity

# Drawbacks:
# - Difficult to manage individual resources
# - No environment-specific variations
# - Large files become unwieldy
# - Sharing components between applications difficult
```

### Environment-Specific Configuration

**Configuration Substitution Pattern**:
```bash
#!/bin/bash
# deploy.sh

ENVIRONMENT="$1"
NAMESPACE="$ENVIRONMENT"

if [ -z "$ENVIRONMENT" ]; then
    echo "Usage: $0 <environment>"
    exit 1
fi

# Load environment-specific variables
source "config/${ENVIRONMENT}.env"

# Substitute variables in templates
envsubst < templates/deployment.yaml | kubectl apply -n "$NAMESPACE" -f -
envsubst < templates/service.yaml | kubectl apply -n "$NAMESPACE" -f -
envsubst < templates/configmap.yaml | kubectl apply -n "$NAMESPACE" -f -
```

**Template Example**:
```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${APP_NAME}
  namespace: ${NAMESPACE}
spec:
  replicas: ${REPLICA_COUNT}
  selector:
    matchLabels:
      app: ${APP_NAME}
  template:
    metadata:
      labels:
        app: ${APP_NAME}
    spec:
      containers:
      - name: web
        image: ${IMAGE_NAME}:${IMAGE_TAG}
        resources:
          requests:
            memory: "${MEMORY_REQUEST}"
            cpu: "${CPU_REQUEST}"
          limits:
            memory: "${MEMORY_LIMIT}"
            cpu: "${CPU_LIMIT}"
        env:
        - name: DATABASE_URL
          value: "${DATABASE_URL}"
        - name: LOG_LEVEL
          value: "${LOG_LEVEL}"
```

**Environment Configuration Files**:
```bash
# config/development.env
APP_NAME=web-app
NAMESPACE=development
REPLICA_COUNT=1
IMAGE_NAME=web-app
IMAGE_TAG=latest
MEMORY_REQUEST=128Mi
CPU_REQUEST=100m
MEMORY_LIMIT=256Mi
CPU_LIMIT=200m
DATABASE_URL=postgres://dev-db:5432/app
LOG_LEVEL=DEBUG

# config/production.env
APP_NAME=web-app
NAMESPACE=production
REPLICA_COUNT=5
IMAGE_NAME=web-app
IMAGE_TAG=v1.2.0
MEMORY_REQUEST=256Mi
CPU_REQUEST=200m
MEMORY_LIMIT=512Mi
CPU_LIMIT=500m
DATABASE_URL=postgres://prod-db:5432/app
LOG_LEVEL=INFO
```

---

## **Kustomize: Native Kubernetes Configuration Management**

### Understanding Kustomize Philosophy

**Kustomize Principles**:
- **No templating**: Works with valid YAML, no placeholders
- **Patch-based**: Modify existing resources rather than generate new ones
- **Composition over inheritance**: Build complex configurations from simple pieces
- **Environment specificity**: Override base configurations for different environments

**Why Kustomize Over Raw Manifests**:
```bash
# Traditional approach
cp base/deployment.yaml environments/production/
# Edit production-specific values manually
# Result: Duplicated files, drift potential

# Kustomize approach
# Keep base files unchanged
# Apply patches for environment-specific changes
# Result: DRY principle, clear change tracking
```

### Basic Kustomize Structure

**Base Configuration**:
```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

metadata:
  name: web-app-base

resources:
- deployment.yaml
- service.yaml
- configmap.yaml

commonLabels:
  app: web-app
  version: v1.2.0

commonAnnotations:
  managed-by: kustomize
```

```yaml
# base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 1
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
        image: web-app:latest
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
```

```yaml
# base/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: web-app-service
spec:
  selector:
    app: web-app
  ports:
  - port: 80
    targetPort: 8080
```

### Environment Overlays

**Production Overlay**:
```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: production

resources:
- ../../base

# Strategic merge patches
patchesStrategicMerge:
- deployment-patch.yaml
- service-patch.yaml

# JSON6902 patches for precise modifications
patchesJson6902:
- target:
    version: v1
    kind: Deployment
    name: web-app
  path: replica-patch.yaml

# Configure image tags
images:
- name: web-app
  newTag: v1.2.0

# Add production-specific resources
resources:
- hpa.yaml
- ingress.yaml

# Generate ConfigMaps from files
configMapGenerator:
- name: app-config
  files:
  - config.properties
  - app.conf

# Add production labels
commonLabels:
  environment: production
  tier: web
```

```yaml
# overlays/production/deployment-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 5
  template:
    spec:
      containers:
      - name: web
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        env:
        - name: LOG_LEVEL
          value: "INFO"
        - name: DATABASE_URL
          value: "postgres://prod-db:5432/app"
```

```yaml
# overlays/production/replica-patch.yaml
- op: replace
  path: /spec/replicas
  value: 5
- op: add
  path: /spec/template/spec/containers/0/env/-
  value:
    name: ENVIRONMENT
    value: production
```

### Advanced Kustomize Features

**ConfigMap and Secret Generation**:
```yaml
# kustomization.yaml
configMapGenerator:
- name: app-config
  literals:
  - database.host=prod-db.example.com
  - log.level=INFO
  files:
  - app.properties
  - nginx.conf

secretGenerator:
- name: app-secrets
  literals:
  - username=admin
  - password=secret123
  files:
  - tls.crt
  - tls.key
  type: kubernetes.io/tls

# Adds hash suffix to ensure rolling updates
# app-config-m2t4kd6g8h
# app-secrets-k8s7h9f2d4
```

**Component Composition**:
```yaml
# components/monitoring/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1alpha1
kind: Component

resources:
- servicemonitor.yaml
- prometheusrule.yaml

# Main kustomization.yaml
components:
- components/monitoring
- components/security
```

**Multiple Base Inheritance**:
```yaml
# overlays/staging/kustomization.yaml
resources:
- ../../base
- ../../components/database
- additional-services.yaml

patchesStrategicMerge:
- staging-patches.yaml
```

### Kustomize Commands and Workflow

**Building and Applying Configurations**:
```bash
# Preview generated configuration
kustomize build overlays/production

# Apply directly with kubectl
kubectl apply -k overlays/production

# Save generated output
kustomize build overlays/production > production-manifest.yaml

# Validate before applying
kustomize build overlays/production | kubectl apply --dry-run=client -f -

# Compare environments
diff <(kustomize build overlays/staging) <(kustomize build overlays/production)
```

**Development Workflow**:
```bash
# Edit base configuration
vim base/deployment.yaml

# Test changes in development
kubectl apply -k overlays/development

# Validate in staging
kubectl apply -k overlays/staging

# Deploy to production
kubectl apply -k overlays/production

# Monitor deployment
kubectl rollout status deployment/web-app -n production
```

---

## **Helm: The Kubernetes Package Manager**

### Understanding Helm Architecture

**Helm Components**:
- **Helm CLI**: Client tool for managing charts and releases
- **Charts**: Packages of pre-configured Kubernetes resources
- **Values**: Configuration parameters for customizing charts
- **Releases**: Installed instances of charts in clusters
- **Repositories**: Collections of charts for sharing and distribution

**Helm vs Kustomize Comparison**:

| Aspect | Helm | Kustomize |
|--------|------|-----------|
| Approach | Templating with Go templates | Patching valid YAML |
| Learning Curve | Moderate (template syntax) | Lower (YAML knowledge) |
| Flexibility | High (full programming constructs) | Moderate (patch-based) |
| Ecosystem | Large chart repository | Growing but smaller |
| Native Support | Third-party tool | Built into kubectl |
| Use Cases | Complex applications, reusable packages | Environment management, simple customization |

### Helm Chart Structure

**Basic Chart Layout**:
```
my-app-chart/
├── Chart.yaml          # Chart metadata
├── values.yaml         # Default configuration values
├── charts/             # Chart dependencies
├── templates/          # Kubernetes manifest templates
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   ├── _helpers.tpl    # Template helpers
│   └── NOTES.txt       # Post-install instructions
└── .helmignore         # Files to ignore when packaging
```

**Chart.yaml Metadata**:
```yaml
# Chart.yaml
apiVersion: v2
name: my-web-app
description: A web application Helm chart
type: application
version: 1.2.0        # Chart version
appVersion: "2.1.0"   # Application version
keywords:
  - web
  - application
  - frontend
home: https://github.com/company/my-web-app
sources:
  - https://github.com/company/my-web-app
maintainers:
  - name: Platform Team
    email: platform@company.com
dependencies:
  - name: postgresql
    version: "11.9.13"
    repository: "https://charts.bitnami.com/bitnami"
    condition: postgresql.enabled
```

### Helm Templating

**Basic Template Example**:
```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "my-app.fullname" . }}
  labels:
    {{- include "my-app.labels" . | nindent 4 }}
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "my-app.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      annotations:
        checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
      labels:
        {{- include "my-app.selectorLabels" . | nindent 8 }}
    spec:
      {{- with .Values.imagePullSecrets }}
      imagePullSecrets:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - name: http
              containerPort: 8080
              protocol: TCP
          {{- if .Values.healthCheck.enabled }}
          livenessProbe:
            httpGet:
              path: {{ .Values.healthCheck.path }}
              port: http
            initialDelaySeconds: {{ .Values.healthCheck.initialDelaySeconds }}
          readinessProbe:
            httpGet:
              path: {{ .Values.healthCheck.path }}
              port: http
            initialDelaySeconds: {{ .Values.healthCheck.initialDelaySeconds }}
          {{- end }}
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
          {{- if .Values.env }}
          env:
            {{- range $key, $value := .Values.env }}
            - name: {{ $key }}
              value: {{ $value | quote }}
            {{- end }}
          {{- end }}
```

**Values.yaml Configuration**:
```yaml
# values.yaml
replicaCount: 1

image:
  repository: my-web-app
  pullPolicy: IfNotPresent
  tag: ""

imagePullSecrets: []

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: false
  className: ""
  annotations: {}
  hosts:
    - host: chart-example.local
      paths:
        - path: /
          pathType: ImplementationSpecific
  tls: []

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 128Mi

autoscaling:
  enabled: false
  minReplicas: 1
  maxReplicas: 100
  targetCPUUtilizationPercentage: 80

healthCheck:
  enabled: true
  path: /health
  initialDelaySeconds: 30

env:
  LOG_LEVEL: "INFO"
  DATABASE_HOST: "postgresql"

postgresql:
  enabled: true
  auth:
    postgresPassword: "password123"
    database: "myapp"
```

**Template Helpers**:
```yaml
# templates/_helpers.tpl
{{/*
Expand the name of the chart.
*/}}
{{- define "my-app.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "my-app.fullname" -}}
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
{{- define "my-app.labels" -}}
helm.sh/chart: {{ include "my-app.chart" . }}
{{ include "my-app.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "my-app.selectorLabels" -}}
app.kubernetes.io/name: {{ include "my-app.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
```

### Helm Release Management

**Installing and Upgrading**:
```bash
# Install chart from repository
helm install my-release bitnami/nginx

# Install from local chart
helm install my-web-app ./my-app-chart

# Install with custom values
helm install my-web-app ./my-app-chart \
  --values production-values.yaml \
  --set image.tag=v1.2.0 \
  --set replicaCount=5

# Upgrade existing release
helm upgrade my-web-app ./my-app-chart \
  --values production-values.yaml \
  --set image.tag=v1.3.0

# Upgrade with rollback on failure
helm upgrade my-web-app ./my-app-chart --atomic --timeout 5m

# Rollback to previous version
helm rollback my-web-app 1
```

**Environment-Specific Values**:
```yaml
# values-production.yaml
replicaCount: 5

image:
  tag: "v1.2.0"
  pullPolicy: Always

resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 500m
    memory: 512Mi

ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
  hosts:
    - host: app.example.com
      paths:
        - path: /
          pathType: ImplementationSpecific
  tls:
    - secretName: app-tls
      hosts:
        - app.example.com

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 20
  targetCPUUtilizationPercentage: 70

env:
  LOG_LEVEL: "WARN"
  DATABASE_HOST: "prod-postgresql"

postgresql:
  enabled: false  # Use external database in production
```

**Release Operations**:
```bash
# List releases
helm list
helm list --all-namespaces

# Get release information
helm get values my-web-app
helm get manifest my-web-app
helm get notes my-web-app

# Check release history
helm history my-web-app

# Test release without installing
helm install my-web-app ./my-app-chart --dry-run --debug

# Uninstall release
helm uninstall my-web-app

# Keep release history after uninstall
helm uninstall my-web-app --keep-history
```

---

## **Advanced Templating and Configuration Patterns**

### Template Functions and Logic

**Conditional Logic**:
```yaml
{{- if .Values.ingress.enabled -}}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ include "my-app.fullname" . }}
  {{- with .Values.ingress.annotations }}
  annotations:
    {{- toYaml . | nindent 4 }}
  {{- end }}
spec:
  {{- if .Values.ingress.className }}
  ingressClassName: {{ .Values.ingress.className }}
  {{- end }}
  rules:
    {{- range .Values.ingress.hosts }}
    - host: {{ .host | quote }}
      http:
        paths:
          {{- range .paths }}
          - path: {{ .path }}
            pathType: {{ .pathType }}
            backend:
              service:
                name: {{ include "my-app.fullname" $ }}
                port:
                  number: {{ $.Values.service.port }}
          {{- end }}
    {{- end }}
  {{- if .Values.ingress.tls }}
  tls:
    {{- range .Values.ingress.tls }}
    - hosts:
        {{- range .hosts }}
        - {{ . | quote }}
        {{- end }}
      secretName: {{ .secretName }}
    {{- end }}
  {{- end }}
{{- end }}
```

**String Manipulation and Formatting**:
```yaml
# String operations
name: {{ .Values.name | lower | replace " " "-" | trunc 63 | trimSuffix "-" }}

# Default values
image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"

# Numeric operations
replicas: {{ .Values.replicaCount | int | max 1 | min 100 }}

# Date and hash functions
timestamp: {{ now | date "2006-01-02T15:04:05Z" }}
checksum: {{ include "my-app.configmap" . | sha256sum }}

# Base64 encoding
secret-data: {{ .Values.secretData | b64enc | quote }}
```

**Complex Data Structures**:
```yaml
# Iterate over maps
{{- range $key, $value := .Values.env }}
- name: {{ $key }}
  value: {{ $value | quote }}
{{- end }}

# Iterate over arrays
{{- range .Values.volumes }}
- name: {{ .name }}
  {{- if .persistentVolumeClaim }}
  persistentVolumeClaim:
    claimName: {{ .persistentVolumeClaim.claimName }}
  {{- else if .configMap }}
  configMap:
    name: {{ .configMap.name }}
  {{- end }}
{{- end }}

# Nested templates
{{- include "my-app.labels" . | nindent 4 }}
```

### Configuration Validation

**Required Values Validation**:
```yaml
# templates/deployment.yaml
{{- if not .Values.image.repository }}
{{- fail "image.repository is required" }}
{{- end }}

{{- if and .Values.persistence.enabled (not .Values.persistence.storageClass) }}
{{- fail "persistence.storageClass is required when persistence is enabled" }}
{{- end }}

# Validate enum values
{{- if not (has .Values.service.type (list "ClusterIP" "NodePort" "LoadBalancer")) }}
{{- fail "service.type must be one of: ClusterIP, NodePort, LoadBalancer" }}
{{- end }}
```

**Resource Validation**:
```yaml
# Ensure resource requests don't exceed limits
{{- if .Values.resources.requests.cpu }}
{{- if .Values.resources.limits.cpu }}
{{- $requestCPU := .Values.resources.requests.cpu | toString | regexFind "[0-9.]+" | float64 }}
{{- $limitCPU := .Values.resources.limits.cpu | toString | regexFind "[0-9.]+" | float64 }}
{{- if gt $requestCPU $limitCPU }}
{{- fail "CPU requests cannot exceed limits" }}
{{- end }}
{{- end }}
{{- end }}
```

---

## **GitOps and CI/CD Integration**

### GitOps Workflow with ArgoCD

**Application Definition**:
```yaml
# argocd/web-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: web-app-production
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/company/k8s-manifests
    targetRevision: HEAD
    path: applications/web-app/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - CreateNamespace=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

**Multi-Environment GitOps**:
```yaml
# argocd/app-of-apps.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: web-app-environments
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/company/k8s-manifests
    targetRevision: HEAD
    path: argocd/applications
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated:
      prune: true
      selfHeal: true

# argocd/applications/development.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: web-app-development
spec:
  source:
    path: applications/web-app/overlays/development
  # ... other config

# argocd/applications/production.yaml  
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: web-app-production
spec:
  source:
    path: applications/web-app/overlays/production
  # ... other config
```

### CI/CD Pipeline Integration

**GitHub Actions with Kustomize**:
```yaml
# .github/workflows/deploy.yml
name: Deploy to Kubernetes
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Kustomize
      run: |
        curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
        sudo mv kustomize /usr/local/bin/
    
    - name: Validate Manifests
      run: |
        kustomize build overlays/development | kubeval
        kustomize build overlays/production | kubeval
    
    - name: Security Scan
      run: |
        kustomize build overlays/production | kubesec scan -

  deploy-staging:
    needs: validate
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Configure kubectl
      run: |
        echo "${{ secrets.KUBECONFIG }}" | base64 -d > kubeconfig
        export KUBECONFIG=kubeconfig
    
    - name: Deploy to Staging
      run: |
        kubectl apply -k overlays/staging
        kubectl rollout status deployment/web-app -n staging

  deploy-production:
    needs: validate
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to Production
      run: |
        kubectl apply -k overlays/production
        kubectl rollout status deployment/web-app -n production
```

**Helm in CI/CD**:
```yaml
# .github/workflows/helm-deploy.yml
name: Helm Deploy
on:
  push:
    tags: ['v*']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Install Helm
      uses: azure/setup-helm@v3
      with:
        version: '3.10.0'
    
    - name: Package Chart
      run: |
        helm package charts/my-app --version ${GITHUB_REF#refs/tags/}
    
    - name: Deploy with Helm
      run: |
        helm upgrade --install my-app ./my-app-${GITHUB_REF#refs/tags/}.tgz \
          --namespace production \
          --values values-production.yaml \
          --wait --timeout 5m
```

---

## **Security and Secret Management**

### Secure Configuration Patterns

**External Secret Management**:
```yaml
# Using External Secrets Operator with Helm
# templates/external-secret.yaml
{{- if .Values.externalSecrets.enabled }}
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: {{ include "my-app.fullname" . }}-secrets
spec:
  refreshInterval: {{ .Values.externalSecrets.refreshInterval | default "300s" }}
  secretStoreRef:
    name: {{ .Values.externalSecrets.secretStore }}
    kind: SecretStore
  target:
    name: {{ include "my-app.fullname" . }}-secrets
    creationPolicy: Owner
  data:
  {{- range .Values.externalSecrets.secrets }}
  - secretKey: {{ .secretKey }}
    remoteRef:
      key: {{ .remoteKey }}
      property: {{ .property | default .secretKey }}
  {{- end }}
{{- end }}
```

**Values Configuration**:
```yaml
# values-production.yaml
externalSecrets:
  enabled: true
  secretStore: vault-backend
  refreshInterval: "300s"
  secrets:
  - secretKey: database-password
    remoteKey: secret/production/database
    property: password
  - secretKey: api-key
    remoteKey: secret/production/api
    property: key
```

**Sealed Secrets Integration**:
```yaml
# Using Sealed Secrets with Kustomize
# base/sealed-secret.yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: app-secrets
spec:
  encryptedData:
    database-password: AgBy3i4OJSWK+PiTySYZZA9rO43cGDEQAx...
    api-key: AgAKAoiQm7VWHpFjV1BZJRe0HpAaGhJGGS...
  template:
    metadata:
      name: app-secrets
    type: Opaque
```

### Configuration Security Best Practices

**Principle of Least Privilege**:
```yaml
# RBAC for configuration management
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: config-manager
rules:
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list", "create", "update", "patch"]
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "list"]  # Read-only for secrets
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "patch"]
```

**Configuration Validation**:
```bash
#!/bin/bash
# validate-config.sh

echo "=== Configuration Security Validation ==="

# Check for hardcoded secrets in manifests
echo "Checking for hardcoded secrets..."
grep -r "password\|secret\|key" manifests/ && echo "WARNING: Potential secrets found in manifests"

# Validate resource limits are set
echo "Checking resource limits..."
kustomize build overlays/production | yq eval 'select(.kind == "Deployment") | .spec.template.spec.containers[].resources.limits' -

# Check for deprecated API versions
echo "Checking for deprecated APIs..."
kustomize build overlays/production | kubeval --ignore-missing-schemas

# Scan for security issues
echo "Security scanning..."
kustomize build overlays/production | kubesec scan -

echo "=== Validation completed ==="
```

---

## **Troubleshooting and Debugging**

### Common Manifest Issues

**Kustomize Troubleshooting**:
```bash
# Debug kustomize build process
kustomize build overlays/production --enable-alpha-plugins --load-restrictor=LoadRestrictionsNone

# Validate kustomization files
kustomize build overlays/production | kubectl apply --dry-run=client -f -

# Check for resource conflicts
kustomize build overlays/production | kubectl apply --server-dry-run -f -

# Debug specific patches
kustomize cfg tree overlays/production
```

**Helm Troubleshooting**:
```bash
# Debug template rendering
helm template my-app ./charts/my-app --debug --values values-production.yaml

# Validate chart syntax
helm lint ./charts/my-app

# Test installation without applying
helm install my-app ./charts/my-app --dry-run --debug

# Check release status
helm status my-app
helm get manifest my-app

# Debug failed upgrades
helm history my-app
helm get values my-app --revision 1
```

**Manifest Validation Tools**:
```bash
# kubeval - Kubernetes manifest validation
kubeval deployment.yaml

# kube-score - Best practices analysis
kube-score score deployment.yaml

# conftest - Policy testing with OPA
conftest test --policy security-policies/ deployment.yaml

# kubesec - Security analysis
kubesec scan deployment.yaml
```

### Configuration Drift Detection

**Drift Monitoring Script**:
```bash
#!/bin/bash
# detect-drift.sh

NAMESPACE="production"
APP_NAME="web-app"

echo "=== Configuration Drift Detection ==="

# Compare desired vs actual state
echo "Comparing desired configuration with cluster state..."

# Get desired state from git
DESIRED_CONFIG=$(kustomize build overlays/production)

# Get actual state from cluster
ACTUAL_CONFIG=$(kubectl get deployment,service,configmap -n $NAMESPACE -l app=$APP_NAME -o yaml)

# Compare configurations
diff <(echo "$DESIRED_CONFIG" | yq eval 'sort_keys(.)' -) \
     <(echo "$ACTUAL_CONFIG" | yq eval 'sort_keys(.)' -) \
     > drift-report.txt

if [ -s drift-report.txt ]; then
    echo "DRIFT DETECTED - see drift-report.txt"
    cat drift-report.txt
    exit 1
else
    echo "No configuration drift detected"
fi
```

**ArgoCD Drift Detection**:
```bash
# Check ArgoCD application sync status
argocd app list
argocd app get web-app-production

# View differences between git and cluster
argocd app diff web-app-production

# Sync application to resolve drift
argocd app sync web-app-production
```

---

## **Production Best Practices**

### Manifest Organization Standards

**Repository Structure Standards**:
```
k8s-manifests/
├── .github/
│   └── workflows/
│       ├── validate.yml
│       └── deploy.yml
├── applications/
│   ├── web-app/
│   ├── api-server/
│   └── database/
├── infrastructure/
│   ├── ingress-controller/
│   ├── monitoring/
│   └── security/
├── environments/
│   ├── development/
│   ├── staging/
│   └── production/
├── scripts/
│   ├── deploy.sh
│   ├── validate.sh
│   └── rollback.sh
├── docs/
│   ├── README.md
│   ├── deployment-guide.md
│   └── troubleshooting.md
└── policies/
    ├── security.rego
    └── governance.rego
```

**Change Management Process**:
```bash
#!/bin/bash
# change-management.sh

# 1. Create feature branch
git checkout -b feature/update-app-version

# 2. Make changes with validation
vim overlays/production/kustomization.yaml
kustomize build overlays/production | kubectl apply --dry-run=client -f -

# 3. Run security and policy checks
kustomize build overlays/production | conftest test --policy policies/ -
kustomize build overlays/production | kubesec scan -

# 4. Create pull request with automated testing
git add . && git commit -m "Update app version to v1.3.0"
git push origin feature/update-app-version

# 5. After review and merge, automated deployment triggers
# 6. Monitor deployment success
kubectl rollout status deployment/web-app -n production
```

### Release Management

**Versioning Strategy**:
```yaml
# Chart.yaml versioning
version: 1.2.3        # Chart version (semantic versioning)
appVersion: "2.1.0"   # Application version

# Git tagging strategy
git tag -a v1.2.3 -m "Release version 1.2.3"
git push origin v1.2.3

# Container image tagging
image:
  repository: my-app
  tag: "v2.1.0"       # Explicit version, not "latest"
```

**Rollback Procedures**:
```bash
#!/bin/bash
# rollback.sh

ENVIRONMENT="$1"
TARGET_VERSION="$2"

if [ -z "$ENVIRONMENT" ] || [ -z "$TARGET_VERSION" ]; then
    echo "Usage: $0 <environment> <target-version>"
    exit 1
fi

echo "Rolling back $ENVIRONMENT to version $TARGET_VERSION"

case "$ENVIRONMENT" in
    "helm")
        helm rollback my-app $TARGET_VERSION
        ;;
    "kustomize")
        git checkout $TARGET_VERSION
        kubectl apply -k overlays/production
        ;;
    "argocd")
        argocd app sync web-app-production --revision $TARGET_VERSION
        ;;
esac

# Verify rollback success
kubectl rollout status deployment/web-app -n production
kubectl get pods -n production -l app=web-app
```

---

## **Exam Tips**

### Essential Commands to Master
```bash
# Kustomize
kustomize build overlays/production
kubectl apply -k overlays/production
kustomize create --autodetect

# Helm
helm install release-name chart-name
helm upgrade release-name chart-name --values values.yaml
helm template release-name chart-name --debug
helm rollback release-name revision-number

# Manifest management
kubectl apply -f manifest.yaml
kubectl delete -f manifest.yaml
kubectl diff -f manifest.yaml
```

### Key Concepts for Exam
- **Kustomize uses patches to modify base configurations**
- **Helm uses templating to generate manifests from values**
- **Both tools help manage environment-specific configurations**
- **GitOps workflows use git as source of truth for cluster state**
- **Manifest validation prevents deployment of invalid configurations**

### Common Exam Scenarios
1. **Create Kustomize overlays for different environments**
2. **Write Helm templates with conditional logic**
3. **Troubleshoot failed manifest applications**
4. **Debug templating issues in Helm charts**
5. **Organize manifests for multi-application deployments**
6. **Validate manifest syntax and security**

### Time-Saving Shortcuts
```bash
# Quick Kustomize validation
kubectl apply -k . --dry-run=client

# Fast Helm template debugging
helm template . --debug | head -50

# Rapid manifest validation
kubectl apply -f manifest.yaml --dry-run=client -o yaml

# Quick diff checking
kubectl diff -f manifest.yaml
```

### Critical Details to Remember
- Kustomize is built into kubectl (use `kubectl apply -k`)
- Helm charts should have Chart.yaml and values.yaml at minimum
- Template validation with `--dry-run=client` before applying
- Use semantic versioning for charts and applications
- Keep base configurations environment-agnostic
- Always validate manifests before deployment
- GitOps requires automated sync policies for effective management
- Secret management should use external secret stores, not hardcoded values