# Kubernetes Configuration & Security
category: DevOps
tags: kubernetes, k8s, configuration, configmap, secret, serviceaccount, rbac

## ConfigMap

**What it is:** A Kubernetes object that stores non-confidential configuration data in key-value pairs, allowing you to decouple configuration from application code.

**Why it matters:** ConfigMaps enable configuration portability across environments, make applications more flexible, and allow configuration changes without rebuilding container images. They're essential for managing environment-specific settings.

**ConfigMap use cases:**
- **Application configuration** - Database URLs, API endpoints, feature flags
- **Configuration files** - nginx.conf, application.properties, config.yaml
- **Environment variables** - Runtime settings for applications
- **Command-line arguments** - Parameters for container commands

**Ways to consume ConfigMaps:**
- **Environment variables** - Inject config as env vars
- **Volume mounts** - Mount config as files in containers
- **Command arguments** - Use config values in container commands

**Common commands:**
```bash
# ConfigMap creation
kubectl create configmap app-config --from-literal=database_url=postgres://localhost:5432/mydb
kubectl create configmap app-config --from-file=config.properties
kubectl create configmap app-config --from-file=config-dir/
kubectl create configmap app-config --from-env-file=.env

# ConfigMap operations
kubectl get configmaps                              # List all ConfigMaps
kubectl get cm                                     # Short form
kubectl describe configmap <cm-name>               # Detailed ConfigMap info
kubectl delete configmap <cm-name>                # Delete ConfigMap

# View ConfigMap data
kubectl get configmap <cm-name> -o yaml           # YAML output
kubectl get configmap <cm-name> -o json           # JSON output
```

**Example ConfigMap YAML:**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
data:
  # Key-value pairs
  database_host: "postgres-service"
  database_port: "5432"
  log_level: "INFO"
  enable_debug: "false"
  
  # File-like keys
  application.properties: |
    server.port=8080
    spring.datasource.url=jdbc:postgresql://postgres-service:5432/mydb
    spring.datasource.username=appuser
    logging.level.com.mycompany=INFO
    
  nginx.conf: |
    server {
        listen 80;
        server_name localhost;
        location / {
            proxy_pass http://backend-service:8080;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
```

**Using ConfigMap as environment variables:**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-pod
spec:
  containers:
  - name: app-container
    image: myapp:v1.0
    env:
    # Single environment variable from ConfigMap
    - name: DATABASE_HOST
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: database_host
    # All keys from ConfigMap as environment variables
    envFrom:
    - configMapRef:
        name: app-config
```

**Using ConfigMap as volume mount:**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
spec:
  containers:
  - name: nginx
    image: nginx:1.21
    volumeMounts:
    - name: config-volume
      mountPath: /etc/nginx/nginx.conf
      subPath: nginx.conf
    - name: app-config-volume
      mountPath: /etc/config
  volumes:
  - name: config-volume
    configMap:
      name: app-config
      items:
      - key: nginx.conf
        path: nginx.conf
  - name: app-config-volume
    configMap:
      name: app-config
```

**ConfigMap from files example:**
```bash
# Create config files
echo "database_url=postgres://localhost:5432/mydb" > database.conf
echo "redis_url=redis://localhost:6379" > cache.conf

# Create ConfigMap from files
kubectl create configmap file-config \
  --from-file=database.conf \
  --from-file=cache.conf

# Create ConfigMap from directory
kubectl create configmap dir-config --from-file=config-dir/
```

**ConfigMap best practices:**
- **Separate by environment** - Different ConfigMaps for dev/staging/prod
- **Version your configs** - Use labels or annotations for versioning
- **Limit size** - ConfigMaps have 1MB size limit
- **Use meaningful names** - Clear naming for keys and ConfigMaps
- **Don't store secrets** - Use Secrets for sensitive data

## Secret

**What it is:** A Kubernetes object that stores sensitive information such as passwords, OAuth tokens, SSH keys, and TLS certificates in base64 encoded format.

**Why it matters:** Secrets provide secure storage and distribution of sensitive data, keeping credentials out of container images and pod specifications. They're essential for security best practices in Kubernetes.

**Secret types:**
- **Opaque** - Arbitrary user-defined data (default)
- **kubernetes.io/service-account-token** - Service account tokens
- **kubernetes.io/dockercfg** - Docker registry authentication
- **kubernetes.io/dockerconfigjson** - Docker registry authentication (new format)
- **kubernetes.io/basic-auth** - Basic authentication credentials
- **kubernetes.io/ssh-auth** - SSH authentication credentials
- **kubernetes.io/tls** - TLS certificates and keys

**Security features:**
- **Base64 encoding** - Not encryption, just encoding
- **etcd encryption** - Can be encrypted at rest in etcd
- **In-memory storage** - Secrets mounted as tmpfs in containers
- **Access control** - RBAC controls who can access secrets

**Common commands:**
```bash
# Secret creation
kubectl create secret generic db-secret --from-literal=username=admin --from-literal=password=secretpassword
kubectl create secret generic db-secret --from-file=username.txt --from-file=password.txt
kubectl create secret tls tls-secret --cert=tls.crt --key=tls.key
kubectl create secret docker-registry regcred --docker-server=myregistry.com --docker-username=user --docker-password=pass

# Secret operations
kubectl get secrets                                # List all secrets
kubectl describe secret <secret-name>             # Detailed secret info (values hidden)
kubectl delete secret <secret-name>               # Delete secret

# View secret data (base64 decoded)
kubectl get secret <secret-name> -o jsonpath='{.data.username}' | base64 -d
kubectl get secret <secret-name> -o yaml          # YAML output (base64 encoded)
```

**Example Secret YAML:**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: database-secret
  namespace: production
type: Opaque
data:
  username: YWRtaW4=              # admin (base64 encoded)
  password: cGFzc3dvcmQxMjM=      # password123 (base64 encoded)
  database-url: cG9zdGdyZXM6Ly9hZG1pbjpwYXNzd29yZDEyM0BkYi5leGFtcGxlLmNvbTo1NDMyL215ZGI=
```

**Using Secrets as environment variables:**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-pod
spec:
  containers:
  - name: app-container
    image: myapp:v1.0
    env:
    # Single environment variable from Secret
    - name: DB_USERNAME
      valueFrom:
        secretKeyRef:
          name: database-secret
          key: username
    - name: DB_PASSWORD
      valueFrom:
        secretKeyRef:
          name: database-secret
          key: password
    # All keys from Secret as environment variables
    envFrom:
    - secretRef:
        name: database-secret
```

**Using Secrets as volume mounts:**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-secrets
spec:
  containers:
  - name: app
    image: myapp:v1.0
    volumeMounts:
    - name: secret-volume
      mountPath: /etc/secrets
      readOnly: true
  volumes:
  - name: secret-volume
    secret:
      secretName: database-secret
      defaultMode: 0400  # Read-only for owner only
      items:
      - key: username
        path: db-username
      - key: password
        path: db-password
```

**TLS Secret example:**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: tls-secret
type: kubernetes.io/tls
data:
  tls.crt: LS0tLS1CRUdJTi... # base64 encoded certificate
  tls.key: LS0tLS1CRUdJTi... # base64 encoded private key
```

**Docker registry Secret:**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: regcred
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: eyJhdXRocyI6eyJteS1yZWdpc3RyeS5jb20iOnsidXNlcm5hbWUiOiJ1c2VyIiwicGFzc3dvcmQiOiJwYXNzIiwiYXV0aCI6ImRYTmxjam
```

**Using registry Secret in Pod:**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: private-reg-pod
spec:
  containers:
  - name: app
    image: my-private-registry.com/myapp:v1.0
  imagePullSecrets:
  - name: regcred
```

**Secret best practices:**
- **Principle of least privilege** - Only give access to secrets that are needed
- **Use RBAC** - Control who can read/write secrets
- **Enable encryption at rest** - Encrypt etcd data
- **Rotate secrets regularly** - Update passwords and certificates
- **Avoid logging secrets** - Don't log secret values in applications
- **Use external secret management** - Consider tools like Vault, AWS Secrets Manager

## ServiceAccount

**What it is:** A Kubernetes resource that provides an identity for processes running in pods, enabling authentication and authorization for API access.

**Why it matters:** ServiceAccounts enable secure pod-to-API communication, implement least privilege access, and provide audit trails for API operations. They're essential for pods that need to interact with the Kubernetes API.

**ServiceAccount components:**
- **Identity** - Unique identity for pods
- **Token** - JWT token for API authentication
- **Secrets** - Automatically created secret with token
- **RBAC bindings** - Permissions granted through roles

**Default behavior:**
- **Default ServiceAccount** - Every namespace has a default ServiceAccount
- **Automatic mounting** - Tokens automatically mounted in pods at `/var/run/secrets/kubernetes.io/serviceaccount/`
- **Limited permissions** - Default ServiceAccount has minimal permissions

**Common commands:**
```bash
# ServiceAccount operations
kubectl get serviceaccounts                        # List all service accounts
kubectl get sa                                    # Short form
kubectl describe serviceaccount <sa-name>         # Detailed SA info
kubectl delete serviceaccount <sa-name>           # Delete service account

# ServiceAccount tokens
kubectl get secret                                # List secrets (includes SA tokens)
kubectl describe secret <sa-token-secret>         # View token details
```

**Example ServiceAccount:**
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: pod-reader
  namespace: production
automountServiceAccountToken: true
imagePullSecrets:
- name: private-registry-secret
secrets:
- name: pod-reader-token
```

**Using ServiceAccount in Pod:**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: api-client-pod
spec:
  serviceAccountName: pod-reader
  containers:
  - name: api-client
    image: kubectl:latest
    command: ['sh', '-c']
    args:
    - |
      # Token is automatically mounted
      TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)
      NAMESPACE=$(cat /var/run/secrets/kubernetes.io/serviceaccount/namespace)
      
      # Use token to authenticate API calls
      curl -H "Authorization: Bearer $TOKEN" \
           -H "Accept: application/json" \
           --cacert /var/run/secrets/kubernetes.io/serviceaccount/ca.crt \
           https://kubernetes.default.svc/api/v1/namespaces/$NAMESPACE/pods
```

**Disable automatic token mounting:**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: no-token-pod
spec:
  serviceAccountName: pod-reader
  automountServiceAccountToken: false  # Disable token mounting
  containers:
  - name: app
    image: myapp:v1.0
```

**ServiceAccount with ImagePullSecrets:**
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: builder-sa
imagePullSecrets:
- name: docker-hub-secret
- name: private-registry-secret
```

## RBAC (Role-Based Access Control)

**What it is:** Kubernetes authorization mechanism that regulates access to resources based on the roles assigned to users, groups, or service accounts.

**Why it matters:** RBAC implements security principle of least privilege, provides fine-grained access control, enables compliance with security policies, and allows secure multi-tenancy in Kubernetes clusters.

**RBAC components:**
- **Role/ClusterRole** - Defines permissions (what can be done)
- **RoleBinding/ClusterRoleBinding** - Grants permissions to subjects (who can do it)
- **Subjects** - Users, groups, or service accounts that receive permissions

**Scope differences:**
- **Role/RoleBinding** - Namespace-scoped permissions
- **ClusterRole/ClusterRoleBinding** - Cluster-wide permissions

**Common commands:**
```bash
# Role operations
kubectl get roles                                  # List roles in current namespace
kubectl get roles --all-namespaces               # List roles in all namespaces
kubectl describe role <role-name>                 # Detailed role info
kubectl delete role <role-name>                   # Delete role

# ClusterRole operations
kubectl get clusterroles                          # List all cluster roles
kubectl describe clusterrole <clusterrole-name>   # Detailed cluster role info

# RoleBinding operations
kubectl get rolebindings                          # List role bindings
kubectl describe rolebinding <binding-name>       # Detailed binding info

# ClusterRoleBinding operations
kubectl get clusterrolebindings                   # List cluster role bindings
kubectl describe clusterrolebinding <binding-name> # Detailed cluster binding info

# Check permissions
kubectl auth can-i get pods                       # Check if you can get pods
kubectl auth can-i get pods --as=system:serviceaccount:default:pod-reader  # Check as specific SA
kubectl auth can-i '*' '*'                        # Check if you have all permissions
```

**Example Role (namespace-scoped):**
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: production
  name: pod-reader
rules:
- apiGroups: [""]           # Core API group
  resources: ["pods"]
  verbs: ["get", "watch", "list"]
- apiGroups: [""]
  resources: ["pods/log"]
  verbs: ["get"]
- apiGroups: ["apps"]       # Apps API group
  resources: ["deployments"]
  verbs: ["get", "list"]
```

**Example ClusterRole (cluster-wide):**
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: node-reader
rules:
- apiGroups: [""]
  resources: ["nodes"]
  verbs: ["get", "watch", "list"]
- apiGroups: ["metrics.k8s.io"]
  resources: ["nodes", "pods"]
  verbs: ["get", "list"]
```

**Example RoleBinding:**
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: production
subjects:
- kind: User
  name: jane.doe
  apiGroup: rbac.authorization.k8s.io
- kind: ServiceAccount
  name: pod-reader
  namespace: production
- kind: Group
  name: developers
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

**Example ClusterRoleBinding:**
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cluster-admin-binding
subjects:
- kind: User
  name: admin@company.com
  apiGroup: rbac.authorization.k8s.io
- kind: ServiceAccount
  name: cluster-admin-sa
  namespace: kube-system  
roleRef:
  kind: ClusterRole
  name: cluster-admin
  apiGroup: rbac.authorization.k8s.io
```

**Common RBAC patterns:**

**Read-only access to specific resources:**
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: viewer
rules:
- apiGroups: ["", "apps", "extensions"]
  resources: ["*"]
  verbs: ["get", "list", "watch"]
```

**Developer access (no secrets):**
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: developer
rules:
- apiGroups: ["", "apps", "extensions"]
  resources: ["*"]
  verbs: ["*"]
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "list"]  # Read-only access to secrets
```

**CI/CD ServiceAccount:**
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: ci-cd-role
rules:
- apiGroups: ["", "apps", "extensions"]
  resources: ["deployments", "services", "configmaps"]
  verbs: ["get", "list", "create", "update", "patch", "delete"]
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "list", "create", "update"]
```

**RBAC best practices:**
- **Principle of least privilege** - Grant minimum necessary permissions
- **Use Groups** - Assign roles to groups rather than individual users
- **Regular audits** - Review and clean up unused permissions
- **Separate environments** - Different RBAC rules for dev/staging/prod
- **Document permissions** - Clear documentation of who has what access
- **Monitor access** - Use audit logs to track API access

**Built-in ClusterRoles:**
- **cluster-admin** - Full access to everything
- **admin** - Full access within namespace
- **edit** - Read/write access within namespace
- **view** - Read-only access within namespace
- **system:node** - Access for kubelets
- **system:discovery** - Access for discovery information

**When you'll use them:** ConfigMaps and Secrets are used in almost every Kubernetes application for configuration management. ServiceAccounts and RBAC are essential for any production environment requiring proper security and access control.