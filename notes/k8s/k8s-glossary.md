
# Kubernetes Glossary – In-Depth Explanations for CKAD & CKA

---

## 1. Pod
**What:**  
A pod is the smallest deployable unit in Kubernetes. It wraps one or more containers that share:
- Network (same IP)
- Storage (volumes)
- Lifecycle

You don’t run containers directly in Kubernetes — you run **pods**.

**Why:**  
- Every workload runs in a pod.
- Even a single-container app must be in a pod.
- Critical for understanding how deployments, jobs, and services work.

**Example:**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: demo
spec:
  containers:
  - name: web
    image: nginx
```

**Gotchas:**  
- Pods are **ephemeral**. If a pod dies, it's gone unless managed by a controller.
- Logs and filesystem are gone unless externalized (volumes or log collection).

---

## 2. ReplicaSet
**What:**  
ReplicaSet ensures that **N number of identical pods** are running at all times. It will add or remove pods to match the desired count.

**Why:**  
- Ensures **high availability** and **auto-recovery**.
- Underpins Deployments.
- CKA exam expects you to understand its role, even if you rarely define one directly.

**Gotchas:**  
- Don't use it directly; use Deployments.
- Selector mismatch = ReplicaSet won’t manage pods → no scaling.

---

## 3. Deployment
**What:**  
A controller that manages ReplicaSets. Provides features like:
- Rolling updates
- Rollbacks
- Declarative updates of app versions

**Why:**  
- Primary way to deploy applications in Kubernetes.
- Simplifies version control, scaling, and upgrades.

**Gotchas:**  
- `kubectl rollout undo` reverts changes.
- Don't confuse `Deployment` strategy (`rollingUpdate` or `recreate`) with `Pod` restarts.

---

## 4. StatefulSet
**What:**  
A controller for stateful applications. Unlike Deployments:
- Each pod gets a **persistent identity** (name, volume, network)
- Pods are created **in order**, terminated in reverse

**Why:**  
- Needed for databases, queues, apps that can't be scaled blindly.
- Real-world apps like PostgreSQL, Kafka, Zookeeper rely on it.

**Gotchas:**  
- Needs a `Headless Service` (`clusterIP: None`)
- Slower to scale; pods must start one-by-one

---

## 5. DaemonSet
**What:**  
Ensures that **one pod runs on every (or selected) node**. Useful for background agents like:
- Log collectors (e.g., Fluentd)
- Monitoring tools (e.g., Node Exporter)

**Why:**  
- Critical for cluster-wide side tools.
- CKAD/CKA will test it in system-level scenarios.

**Gotchas:**  
- Doesn’t respect pod anti-affinity; you must configure it yourself.
- Deleting a node = pod disappears too.

---

## 6. Job
**What:**  
Runs a pod to **completion** (e.g., for batch jobs, scripts, one-off tasks). It will re-run the pod if it fails until it completes successfully (or reaches a failure threshold).

**Why:**  
- Required for database migrations, cleanup tasks, report generation.
- CKA often includes this in troubleshooting questions.

**Gotchas:**  
- Will not restart if the container exits 0 unless it hasn’t reached `completions`.

---

## 7. CronJob
**What:**  
A Job scheduled at regular intervals using cron syntax.

**Why:**  
- Replaces external crontabs with native K8s job scheduling.
- Supports history, retries, concurrency policy.

**Gotchas:**  
- Check `concurrencyPolicy: Forbid/Allow/Replace` if overlapping jobs matter.
- Pods may remain if history is not cleaned (`successfulJobsHistoryLimit`).

---

## 8. Namespace
**What:**  
Virtual cluster partitioning inside a real cluster. Isolates workloads by:
- Resource quota
- Access permissions
- Network policies (sometimes)

**Why:**  
- Needed for multi-team environments.
- Every resource (except nodes/persistent volumes) is namespaced.

**Gotchas:**  
- Namespace deletion is slow if it contains finalizers.
- Don’t assume network isolation unless policies exist.

---

## 9. Node
**What:**  
A worker machine (VM or physical) in the cluster. It runs:
- kubelet
- container runtime (e.g., containerd)
- kube-proxy

**Why:**  
- Fundamental for understanding scheduling, affinity, failure domains.

**Gotchas:**  
- Taints on nodes prevent pods from scheduling.
- Master nodes are schedulable only if `NoSchedule` taint is removed.

---

## 10. Service
**What:**  
A stable endpoint that abstracts access to a set of pods. It:
- Load-balances traffic to healthy pods
- Gets a virtual IP (ClusterIP)
- Can be exposed via NodePort, LoadBalancer, or ExternalName

**Why:**  
- The only sane way to access pods (whose IPs change).
- Required for communication between apps.

**Gotchas:**  
- No built-in health checks — relies on endpoints.
- Only forwards to ready pods.

---

## 11. ConfigMap
**What:**  
Used to inject **non-sensitive** configuration data into pods.

**Why:**  
- Keeps code and config separate
- Lets you update config without rebuilding containers

**Gotchas:**  
- Changing a ConfigMap won’t update the pod unless it’s reloaded/restarted.
- Use volume mount for live reloading only if the app supports it.

---

## 12. Secret
**What:**  
Stores sensitive data like passwords and tokens in base64 format.

**Why:**  
- Prevents secrets from being hardcoded.
- Can be mounted as volumes or environment variables.

**Gotchas:**  
- Base64 ≠ secure encryption. Use encryption at rest and limit RBAC access.

---

## 13. Init Container
**What:**  
A special type of container that runs **before** the main application containers in a pod. It completes its task and exits before the main containers start.

**Why:**  
- Used for initialization logic (e.g., downloading files, waiting for service readiness)
- Allows separation of setup logic from app logic

**Gotchas:**  
- If an init container fails, the pod stays in the `Init` phase.
- Does not share process namespace with main containers.

---

## 14. Sidecar Container
**What:**  
A container in the same pod as the main app, providing supporting functionality like logging, proxying, or syncing data.

**Why:**  
- Useful for separating concerns
- Common in service meshes (e.g., Envoy in Istio)

**Gotchas:**  
- Poor coordination between sidecar and main container can cause lifecycle issues.
- They share the pod’s resources and lifecycle.

---

## 15. ServiceAccount
**What:**  
An identity for processes running in a pod to interact with the Kubernetes API.

**Why:**  
- Used by pods, controllers, and tools to authenticate securely to the cluster.

**Gotchas:**  
- Every pod gets the default service account unless you specify another.
- Unused tokens may be mounted unless explicitly disabled.

---

## 16. Role / ClusterRole
**What:**  
Defines a set of permissions (verbs on resources).  
- `Role` applies to a **namespace**.  
- `ClusterRole` applies **cluster-wide** or can be bound to namespaces.

**Why:**  
- Core of RBAC (Role-Based Access Control)

**Gotchas:**  
- Must match with appropriate `RoleBinding` or `ClusterRoleBinding`.

---

## 17. RoleBinding / ClusterRoleBinding
**What:**  
Assigns a Role or ClusterRole to a user/group/service account.

**Why:**  
- Grants actual permission to use a role.
- Required for access control and secure multi-tenant setups.

**Gotchas:**  
- Binding a ClusterRole to a namespace still scopes access to that namespace.

---

## 18. SecurityContext
**What:**  
Defines privilege and access control settings for containers, including:
- User IDs
- Capabilities
- Filesystem permissions

**Why:**  
- Critical for security posture (least privilege, rootless containers)

**Gotchas:**  
- Some settings only work if supported by the container runtime and image.

---

## 19. Liveness Probe
**What:**  
Checks if the app is still running. If it fails, Kubernetes restarts the container.

**Why:**  
- Prevents deadlocks, stuck apps from hanging indefinitely.

**Gotchas:**  
- If misconfigured, it can cause endless restarts.

---

## 20. Readiness Probe
**What:**  
Checks if the app is **ready to serve traffic**. If it fails, the pod is **removed from Service endpoints**, but not restarted.

**Why:**  
- Prevents traffic from hitting an unready app.

**Gotchas:**  
- Unlike liveness, it won’t restart the pod — just removes it from load balancing.

---

## 21. Startup Probe
**What:**  
Used to **delay** the liveness and readiness probes until the app is fully started. Avoids false failures for slow-starting apps.

**Why:**  
- Helps prevent premature restarts of large or complex apps.

**Gotchas:**  
- Only one-time use at pod startup; not repeated like the other probes.

---

## 22. Taints and Tolerations
**What:**  
- **Taint** on a node says “don’t schedule pods here unless they tolerate it.”
- **Toleration** on a pod says “I can go on tainted nodes.”

**Why:**  
- Used for dedicating nodes to certain workloads (e.g., GPU, high-memory)

**Gotchas:**  
- No toleration = pod won't be scheduled on tainted node.

---

## 23. Affinity / Anti-Affinity
**What:**  
- Controls **where** pods are scheduled relative to other pods.
- Affinity: “prefer pods with X label”
- Anti-affinity: “don’t schedule near pods with X label”

**Why:**  
- Used for spreading or grouping apps across zones/nodes for HA or compliance.

**Gotchas:**  
- Must be carefully defined, otherwise pods might not get scheduled at all.

---

## 24. HorizontalPodAutoscaler (HPA)
**What:**  
Automatically adjusts the number of pod replicas based on CPU/memory usage or custom metrics.

**Why:**  
- Saves resources, improves resilience under load.

**Gotchas:**  
- Needs `metrics-server` to function.
- Doesn’t scale **to 0** — use Knative or KEDA for that.

---

## 25. Volume / PersistentVolume / PVC
**What:**  
- `Volume`: Temporary storage for containers.
- `PersistentVolume (PV)`: A piece of persistent storage provisioned in the cluster.
- `PersistentVolumeClaim (PVC)`: A request for storage by a pod.

**Why:**  
- Needed for data persistence across restarts.

**Gotchas:**  
- PVC and Pod must be in the same namespace.
- Reclaim policy of PV determines what happens when PVC is deleted.


---

## 26. ClusterIP / NodePort / LoadBalancer / ExternalName

**ClusterIP (default):**  
Creates a virtual IP accessible only inside the cluster. Used for internal service communication.

**NodePort:**  
Exposes the service on each Node’s IP at a specific port. Allows access from outside the cluster via `NodeIP:NodePort`.

**LoadBalancer:**  
Provisions an external load balancer via cloud provider. Best for public-facing apps.

**ExternalName:**  
Maps a service to an external DNS name. No proxying, just DNS aliasing.

**Why:**  
- These are the core Service types.
- Critical for application connectivity and external exposure.

**Gotchas:**  
- NodePort uses a static port (30000–32767); avoid hardcoding.
- LoadBalancer won’t work without cloud integration.

---

## 27. NetworkPolicy
**What:**  
Defines ingress and egress rules for pod traffic. Acts like a firewall at the pod level.

**Why:**  
- Enforces zero-trust networking in the cluster.
- Required in production-grade secure environments.

**Gotchas:**  
- No default deny unless you explicitly define it.
- Depends on CNI plugin support (e.g., Calico supports it, Flannel does not).

---

## 28. CNI (Container Network Interface)
**What:**  
Plugin system that Kubernetes uses to provide networking capabilities.

**Why:**  
- Defines how pods get IPs, how routing works
- Enables features like NetworkPolicy, multi-networking

**Gotchas:**  
- K8s doesn't do networking itself—it delegates to CNI.
- Not all CNIs support advanced features like NetworkPolicy or IP masquerading.

---

## 29. Ingress / Ingress Controller
**Ingress:**  
Defines rules for routing external HTTP/HTTPS traffic to services in the cluster.

**Ingress Controller:**  
Implements the ingress rules. Common options: NGINX, Traefik, Istio.

**Why:**  
- Offers path-based and host-based routing.
- Enables TLS termination, authentication, rewrites, rate limits.

**Gotchas:**  
- Ingress rules do nothing unless an Ingress Controller is installed.
- Each controller has its own annotations and behaviors.

---

## 30. DNS Resolution
**What:**  
Pods and Services automatically get internal DNS records via CoreDNS.

**Why:**  
- Enables service discovery inside the cluster.
- Pods can refer to services by name like `myservice.namespace.svc.cluster.local`.

**Gotchas:**  
- DNS cache can cause delays in detecting service updates.
- Long hostnames can be truncated/misinterpreted in older clients.

---

## 31. StorageClass
**What:**  
Defines the type of storage (e.g., SSD, HDD, NFS) and its provisioning method (manual, dynamic).

**Why:**  
- Allows dynamic provisioning of PersistentVolumes when PVC is created.

**Gotchas:**  
- Only one default StorageClass allowed per cluster unless explicitly defined.
- ReclaimPolicy affects how volumes are handled after PVC deletion.

---

## 32. VolumeMount
**What:**  
Mounts a Kubernetes Volume into a specific path in a container.

**Why:**  
- Required for sharing config files, data, or logs with the app.

**Gotchas:**  
- If the mount path exists, it will **overwrite** any existing files.

---

## 33. ReadWriteOnce / ReadWriteMany / ReadOnlyMany
**What:**  
Defines volume access modes:
- RWO: Mounted by one node for read/write
- RWX: Mounted by multiple nodes (e.g., NFS)
- ROX: Mounted read-only by many nodes

**Why:**  
- Defines how multiple pods share data safely.

**Gotchas:**  
- Not all volume plugins support RWX (e.g., AWS EBS doesn’t).

---

## 34. Termination Grace Period
**What:**  
How long Kubernetes waits before forcefully killing a pod during shutdown.

**Why:**  
- Gives the app time to shut down cleanly (close DB connections, flush logs)

**Gotchas:**  
- If PreStop hook or SIGTERM handling is slow, pod can be force-killed.

---

## 35. Lifecycle Hooks
**What:**  
Run specific commands at certain points in a container’s lifecycle:
- `PostStart`: after container starts
- `PreStop`: before container stops

**Why:**  
- Used for setup, cleanup, draining connections

**Gotchas:**  
- Must be quick — long-running PreStop can delay pod deletion.

---

## 36. Controller Manager
**What:**  
Component that runs all built-in controllers (Deployment, Node, Job, etc.)

**Why:**  
- Keeps the actual vs desired state in sync

**Gotchas:**  
- If it goes down, nothing is enforced (but existing apps still run).

---

## 37. Scheduler
**What:**  
Assigns pods to nodes based on resource availability, affinity rules, taints/tolerations.

**Why:**  
- Ensures optimal use of cluster resources

**Gotchas:**  
- If scheduling fails (e.g., no memory, taint mismatch), pods stay pending.

---

## 38. kubelet
**What:**  
Agent that runs on each node and ensures the containers are running as expected.

**Why:**  
- Core component for node management

**Gotchas:**  
- Doesn’t communicate directly with etcd, only with kube-apiserver.

---

## 39. kube-proxy
**What:**  
Maintains network rules on nodes to allow communication to/from services.

**Why:**  
- Enables service IP routing via iptables/ipvs

**Gotchas:**  
- Only manages **Service** networking — not full pod-to-pod mesh.

---

## 40. etcd
**What:**  
The **key-value store** backing Kubernetes state (like a database for the cluster).

**Why:**  
- Stores all objects, configurations, secrets, status, etc.

**Gotchas:**  
- If etcd is lost and not backed up, your cluster is gone.
- Should be backed up regularly and secured.


---

## 41. Admission Controllers
**What:**  
Plugins that intercept requests to the Kubernetes API **after authentication/authorization**, and either **mutate** or **validate** them.

**Why:**  
- Add extra enforcement or transformation
- Used for security, policy, and defaults

**Gotchas:**  
- Some are enabled by default (e.g., NamespaceLifecycle, LimitRanger)
- Others like OPA Gatekeeper or PodSecurityPolicy must be explicitly configured

---

## 42. PodSecurityPolicy (Deprecated)
**What:**  
Legacy method to enforce pod-level security controls (e.g., no root, restricted volumes).

**Why:**  
- Deprecated in Kubernetes 1.21+ in favor of PodSecurity Admission

**Gotchas:**  
- Deprecated and removed in 1.25 — don’t use for new deployments.

---

## 43. PodSecurity Admission
**What:**  
Replacement for PodSecurityPolicy. Applies security profiles (`restricted`, `baseline`, `privileged`) using labels.

**Why:**  
- Much easier to use than PSP
- Enforces consistent security policies

**Gotchas:**  
- Must label namespaces for it to take effect.
- Does not mutate pods — only validates.

---

## 44. Audit Logs
**What:**  
Records of who did what in the Kubernetes API server.

**Why:**  
- Essential for compliance, forensics, and debugging

**Gotchas:**  
- Needs to be explicitly configured via audit policy file
- Logs can be large — offload to log aggregator

---

## 45. Metrics Server
**What:**  
Collects resource usage metrics like CPU and memory from kubelets.

**Why:**  
- Required for HPA (HorizontalPodAutoscaler)
- Enables real-time monitoring of pod and node resource usage

**Gotchas:**  
- Not installed by default
- Doesn’t persist metrics (for that, use Prometheus)

---

## 46. Debug (Ephemeral Containers)
**What:**  
Temporary container injected into a running pod for debugging (without restarting it).

**Why:**  
- Lets you debug broken containers that don’t have a shell or CLI tools

**Gotchas:**  
- Must enable the `EphemeralContainers` feature gate in older clusters
- Doesn’t support networking outside the pod

---

## 47. exec
**What:**  
Runs a command inside a running container.

**Why:**  
- Crucial for debugging, health checks, quick fixes

**Gotchas:**  
- Needs shell access in the container
- Doesn’t persist; only for interactive use

---

## 48. Port-forward
**What:**  
Forwards a port from your local machine to a pod in the cluster.

**Why:**  
- Lets you access services/pods without exposing them publicly

**Gotchas:**  
- Only lasts while the command is active
- Useful for debugging, not production use

---

## 49. Describe
**What:**  
Displays detailed state of a Kubernetes resource, including status, events, configuration.

**Why:**  
- Primary tool for debugging stuck, crashing, or pending pods

**Gotchas:**  
- Verbose output — search with grep or less

---

## 50. Logs
**What:**  
Shows stdout/stderr logs of a container in a pod.

**Why:**  
- First place to look when troubleshooting a crashing or misbehaving container

**Gotchas:**  
- Only works for currently or recently running containers
- Doesn’t capture app-level logging unless redirected to stdout

---

## 51. Recreate Strategy
**What:**  
Deployment strategy that **kills all old pods** before starting new ones.

**Why:**  
- Use when old and new versions can't coexist (e.g., DB schema changes)

**Gotchas:**  
- Downtime during rollout

---

## 52. RollingUpdate Strategy
**What:**  
Default strategy that updates pods **gradually** to avoid downtime.

**Why:**  
- Smooth deployments without service interruption

**Gotchas:**  
- Misconfigured probes can delay rollout

---

## 53. VerticalPodAutoscaler (VPA)
**What:**  
Adjusts resource requests (CPU/mem) for pods automatically based on usage.

**Why:**  
- Avoids over/under-provisioning
- Complements or replaces manual tuning

**Gotchas:**  
- Doesn’t work with HPA on same deployment
- Restarts pods when applying changes

---

## 54. Deployment Revision History
**What:**  
Tracks version history of deployment changes for rollback.

**Why:**  
- Enables `kubectl rollout undo`

**Gotchas:**  
- Limited by `revisionHistoryLimit`

---

## 55. Canary Deployment
**What:**  
Releases a new version to a **subset of users or pods** for testing.

**Why:**  
- Safer releases, early detection of bugs

**Gotchas:**  
- Needs proper monitoring and rollback plan

---

## 56. Blue-Green Deployment
**What:**  
Runs **two parallel environments** (blue = old, green = new). Switch traffic only when ready.

**Why:**  
- Instant switch between versions
- Easy rollback

**Gotchas:**  
- Expensive (double resources)
- More complex to orchestrate in Kubernetes without tooling

---

## 57. Helm
**What:**  
Kubernetes package manager. Uses **charts** (templated YAML files) to deploy and manage apps.

**Why:**  
- Simplifies deployment of complex apps
- Supports versioning, upgrades, config overrides

**Gotchas:**  
- Requires understanding templating and `values.yaml`
- Can abstract too much, hiding important details

---

## 58. kubeadm
**What:**  
Tool to bootstrap Kubernetes clusters. Handles control plane init, node join, certificates.

**Why:**  
- Fastest way to set up a K8s cluster manually

**Gotchas:**  
- Doesn’t install CNI plugin
- Requires extra setup for production hardening

---

## 59. Custom Resource Definitions (CRD)
**What:**  
Extends the Kubernetes API to allow custom resources like `KafkaCluster`, `RedisOperator`, etc.

**Why:**  
- Powers tools like Prometheus, Cert-Manager, ArgoCD

**Gotchas:**  
- Must define schema properly
- Not validated unless OpenAPI schema is included

---

## 60. Operator
**What:**  
Custom controller that manages an app using CRDs. Encodes operational knowledge (like backup, failover).

**Why:**  
- Automates management of complex, stateful apps

**Gotchas:**  
- Writing your own is complex
- Existing operators can be buggy if not well maintained


---

## 78. Resource Requests vs Limits (continued)
**What:**  
- Request: minimum guaranteed resources for scheduling
- Limit: maximum resources a container can use

**Why:**  
- Ensures fair sharing and prevents resource exhaustion

**Gotchas:**  
- Over-requesting wastes resources, under-requesting causes evictions

---

## 79. Eviction
**What:**  
When the kubelet removes a pod from a node due to resource pressure (CPU, memory, disk).

**Why:**  
- Protects node stability

**Gotchas:**  
- Not the same as graceful deletion — can be sudden and disrupt services

---

## 80. Event
**What:**  
System-generated record for state changes (e.g., pod created, image pull failed).

**Why:**  
- Critical for debugging and visibility

**Gotchas:**  
- Events are ephemeral; use log collectors to persist

---

## 81. Label
**What:**  
Key-value pair attached to objects for identification.

**Why:**  
- Enables selectors, groupings, filters

**Gotchas:**  
- Labels must be unique per key; overuse can make selection inefficient

---

## 82. Annotation
**What:**  
Key-value metadata for attaching non-identifying information to resources.

**Why:**  
- Used for tooling, debugging, versioning, etc.

**Gotchas:**  
- Not used in selectors — for humans and systems, not filters

---

## 83. Selector
**What:**  
Mechanism for targeting Kubernetes resources via label match.

**Why:**  
- Used by ReplicaSets, Services, NetworkPolicies, etc.

**Gotchas:**  
- MatchLabels and MatchExpressions must match actual pod labels

---

## 84. Field Selector
**What:**  
Targets resources based on resource field values (e.g., metadata.name).

**Why:**  
- Enables precise filtering for imperative commands

**Gotchas:**  
- Limited to built-in fields

---

## 85. taint-based Eviction
**What:**  
Evicts pods from nodes when taints are dynamically applied due to resource pressure.

**Why:**  
- Used in node lifecycle and autoscaling

**Gotchas:**  
- Needs tolerations to avoid unwanted eviction

---

## 86. Static Pod
**What:**  
Pod defined directly in kubelet via a manifest file on the node.

**Why:**  
- Used for core components (e.g., etcd, kube-apiserver)

**Gotchas:**  
- Not managed by Kubernetes API — shows up as mirror pod

---

## 87. Mirror Pod
**What:**  
Read-only representation in API server of a static pod on a node.

**Why:**  
- Provides visibility into static pod state

**Gotchas:**  
- Cannot be deleted from API — delete the static pod file

---

## 88. Job BackoffLimit
**What:**  
Maximum number of retries for failed Jobs before being marked failed.

**Why:**  
- Controls job failure policy

**Gotchas:**  
- Set too low = premature failure, too high = retry loops

---

## 89. CronJob ConcurrencyPolicy
**What:**  
Specifies how to handle multiple CronJob runs:
- `Allow`: run in parallel
- `Forbid`: skip if previous is running
- `Replace`: stop previous, run new

**Why:**  
- Prevents overlapping jobs where unsafe

**Gotchas:**  
- Default is `Allow` — can cause conflict

---

## 90. Terminating Pod
**What:**  
A pod in the process of shutting down (due to delete or node eviction).

**Why:**  
- Allows graceful cleanup, PreStop hooks, draining

**Gotchas:**  
- Stuck in Terminating often means volume or finalizer issues

---

## 91. CrashLoopBackOff
**What:**  
State when a container fails and Kubernetes waits exponentially longer to restart it.

**Why:**  
- Indicates app bug, misconfig, or readiness probe failure

**Gotchas:**  
- Often confused with LivenessProbe killing the pod — check logs

---

## 92. InitContainers Completed / Pending
**What:**  
Pods don’t run main containers until all initContainers finish.

**Why:**  
- Useful for dependency checks (e.g., DB readiness)

**Gotchas:**  
- If one fails, pod will hang forever in Init state


