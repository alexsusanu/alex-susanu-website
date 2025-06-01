# Common Kubernetes Errors

## Pod Errors
```
ImagePullBackOff
# Pod cannot pull the specified container image from registry
# WHY: Image doesn't exist, wrong registry URL, authentication issues, or network problems
# WHERE TO LOOK: Registry settings, image tags, pull secrets, network connectivity

ErrImagePull
# Initial failure to pull container image
# WHY: Same as ImagePullBackOff but first attempt failure
# WHERE TO LOOK: Registry credentials, image name/tag, network policies

CrashLoopBackOff
# Pod keeps crashing and restarting repeatedly
# WHY: Application fails to start, exits immediately, or has fatal errors
# WHERE TO LOOK: Application logs, container startup commands, resource limits

CreateContainerConfigError
# Pod cannot create container due to configuration issues
# WHY: Invalid ConfigMap/Secret references, malformed environment variables
# WHERE TO LOOK: ConfigMaps, Secrets, environment variable definitions

InvalidImageName
# Container image name format is invalid
# WHY: Image name contains illegal characters or wrong format
# WHERE TO LOOK: Pod spec image field, naming conventions

CreateContainerError
# Failed to create container due to runtime issues
# WHY: Container runtime problems, insufficient permissions, or resource constraints
# WHERE TO LOOK: Container runtime logs, node resources, security contexts

RunContainerError
# Container failed to start or run properly
# WHY: Command/entrypoint issues, missing dependencies, permission problems
# WHERE TO LOOK: Container command/args, file permissions, security policies

KillContainerError
# Failed to terminate container gracefully
# WHY: Process not responding to signals, zombie processes
# WHERE TO LOOK: Application signal handling, process management

VerifyNonRootError
# Container trying to run as root when security policy forbids it
# WHY: Security context conflicts with pod security policies
# WHERE TO LOOK: Security contexts, pod security policies, runAsUser settings

PostStartHookError
# Container's postStart lifecycle hook failed
# WHY: PostStart command failed or timed out
# WHERE TO LOOK: Lifecycle hook definitions, command execution logs

PreStopHookError
# Container's preStop lifecycle hook failed
# WHY: PreStop command failed or timed out
# WHERE TO LOOK: Lifecycle hook definitions, graceful shutdown logic
```

## Resource Errors
```
Insufficient cpu
# Node doesn't have enough CPU resources to schedule pod
# WHY: Pod CPU requests exceed available CPU on all nodes
# WHERE TO LOOK: Resource requests/limits, node capacity, cluster autoscaling

Insufficient memory
# Node doesn't have enough memory resources to schedule pod
# WHY: Pod memory requests exceed available memory on all nodes
# WHERE TO LOOK: Memory requests/limits, node capacity, memory usage patterns

Insufficient pods
# Node has reached maximum pod limit
# WHY: Node's maximum pod capacity reached (default ~110 pods per node)
# WHERE TO LOOK: Node configuration, kubelet settings, cluster scaling

PodExceedsFreeCPU
# Pod's CPU request exceeds available CPU on node
# WHY: CPU request too high for remaining node capacity
# WHERE TO LOOK: CPU resource requests, node CPU allocation

PodExceedsFreeMemory
# Pod's memory request exceeds available memory on node
# WHY: Memory request too high for remaining node capacity
# WHERE TO LOOK: Memory resource requests, node memory allocation

FailedScheduling
# Scheduler cannot find suitable node for pod placement
# WHY: No nodes meet pod's requirements (resources, affinity, taints)
# WHERE TO LOOK: Node selectors, affinity rules, taints/tolerations, resource requests

NodeNotReady
# Target node is not in ready state for scheduling
# WHY: Node has issues with kubelet, network, or system resources
# WHERE TO LOOK: Node status, kubelet logs, system health

Unschedulable
# Pod cannot be scheduled due to constraints or resource limits
# WHY: Pod requirements don't match any available nodes
# WHERE TO LOOK: Scheduling constraints, node labels, resource availability
```

## Storage Errors
```
FailedMount
# Volume failed to mount to pod
# WHY: Volume doesn't exist, permission issues, or mount path conflicts
# WHERE TO LOOK: Volume definitions, mount paths, file system permissions

VolumeFailedMount
# Persistent volume failed to attach to node
# WHY: Storage backend issues, node accessibility, or volume already in use
# WHERE TO LOOK: Storage class, PV status, node-volume compatibility

PersistentVolumeClaimNotFound
# Referenced PVC does not exist
# WHY: PVC name mismatch or PVC not created in correct namespace
# WHERE TO LOOK: PVC names, namespaces, volume claim references

VolumeMountFailed
# Volume mount operation failed during pod creation
# WHY: File system issues, incorrect mount options, or storage driver problems
# WHERE TO LOOK: Mount options, storage driver logs, file system status

FailedAttachVolume
# Volume failed to attach to node
# WHY: Node can't access storage, volume limits exceeded, or driver issues
# WHERE TO LOOK: Node-storage connectivity, volume attachment limits, CSI drivers

FailedDetachVolume
# Volume failed to detach from node
# WHY: Volume still in use, storage backend issues, or forced detachment needed
# WHERE TO LOOK: Pod termination status, volume usage, storage backend health

VolumeNotFound
# Referenced volume does not exist
# WHY: Volume deleted, wrong volume name, or storage backend unavailable
# WHERE TO LOOK: Volume names, storage backend status, PV definitions

StorageClassNotFound
# Specified storage class does not exist
# WHY: Storage class name mismatch or not installed in cluster
# WHERE TO LOOK: Storage class names, dynamic provisioning setup
```

## Network Errors
```
FailedCreatePodSandBox
# Failed to create network sandbox for pod
# WHY: CNI plugin issues, network configuration problems, or IP exhaustion
# WHERE TO LOOK: CNI plugin logs, network configuration, IP address pools

NetworkNotReady
# Cluster network is not ready or configured
# WHY: CNI not installed, network plugin misconfiguration, or node network issues
# WHERE TO LOOK: CNI installation, network plugin status, node connectivity

CNINetworkError
# Container Network Interface plugin error
# WHY: CNI plugin failures, network policy conflicts, or configuration errors
# WHERE TO LOOK: CNI plugin logs, network policies, plugin configuration

ServiceUnavailable
# Service endpoints are not available
# WHY: No healthy pods backing the service or selector mismatch
# WHERE TO LOOK: Pod readiness, service selectors, endpoint status

EndpointNotFound
# Service has no available endpoints
# WHY: No pods match service selector or all pods are unhealthy
# WHERE TO LOOK: Service selectors, pod labels, pod health checks

NetworkPolicyViolation
# Traffic blocked by network policy rules
# WHY: Network policies blocking required communication paths
# WHERE TO LOOK: Network policy rules, pod labels, traffic patterns

DNSResolutionFailed
# Pod cannot resolve DNS names
# WHY: DNS service issues, wrong DNS configuration, or network problems
# WHERE TO LOOK: DNS service status, resolv.conf, network connectivity

PortConflict
# Requested port is already in use
# WHY: Multiple services trying to use same port or host port conflicts
# WHERE TO LOOK: Service port definitions, host port usage, port allocation
```

## Authentication/Authorization Errors
```
Forbidden
# User/service account lacks required permissions
# WHY: RBAC rules don't grant necessary permissions for the operation
# WHERE TO LOOK: RBAC roles, role bindings, service account permissions

Unauthorized
# Authentication failed or credentials invalid
# WHY: Invalid credentials, expired tokens, or authentication provider issues
# WHERE TO LOOK: Authentication configuration, tokens, user credentials

TokenExpired
# Service account token has expired
# WHY: Token TTL exceeded or token rotation issues
# WHERE TO LOOK: Token expiration settings, service account configuration

RoleBindingNotFound
# Required role binding does not exist
# WHY: RBAC binding missing or wrong namespace/cluster scope
# WHERE TO LOOK: Role bindings, namespaces, RBAC configuration

ServiceAccountNotFound
# Referenced service account does not exist
# WHY: Service account name mismatch or not created in namespace
# WHERE TO LOOK: Service account names, namespace scope, account creation

ClusterRoleNotFound
# Referenced cluster role does not exist
# WHY: Cluster role name mismatch or not installed
# WHERE TO LOOK: Cluster role definitions, RBAC setup

InsufficientPermissions
# Current user lacks required RBAC permissions
# WHY: User's roles don't include necessary verbs for resources
# WHERE TO LOOK: User role assignments, required permissions, RBAC policies
```

## Configuration Errors
```
InvalidConfiguration
# Resource configuration is malformed or invalid
# WHY: YAML syntax errors, wrong API version, or invalid field combinations
# WHERE TO LOOK: YAML syntax, API documentation, field validation

MissingRequiredField
# Required field is missing from resource definition
# WHY: Mandatory fields not specified in resource manifest
# WHERE TO LOOK: API reference, required fields, resource schema

InvalidFieldValue
# Field contains invalid or unsupported value
# WHY: Value doesn't match expected format, range, or enum options
# WHERE TO LOOK: Field constraints, valid values, API specification

ConfigMapNotFound
# Referenced ConfigMap does not exist
# WHY: ConfigMap name mismatch or not created in correct namespace
# WHERE TO LOOK: ConfigMap names, namespaces, volume/env references

SecretNotFound
# Referenced Secret does not exist
# WHY: Secret name mismatch or not created in correct namespace
# WHERE TO LOOK: Secret names, namespaces, volume/env references

InvalidResourceName
# Resource name doesn't follow naming conventions
# WHY: Name contains invalid characters or exceeds length limits
# WHERE TO LOOK: Naming conventions, character restrictions, length limits

NamespaceNotFound
# Referenced namespace does not exist
# WHY: Namespace name mismatch or namespace not created
# WHERE TO LOOK: Namespace names, namespace creation, resource scope

ValidationError
# Resource failed Kubernetes validation rules
# WHY: Resource doesn't meet API server validation requirements
# WHERE TO LOOK: Validation rules, admission controllers, resource constraints
```

## API Errors
```
NotFound
# Requested resource does not exist
# WHY: Resource deleted, wrong name/namespace, or never created
# WHERE TO LOOK: Resource names, namespaces, resource existence

AlreadyExists
# Resource with same name already exists
# WHY: Duplicate resource creation in same namespace
# WHERE TO LOOK: Existing resources, naming conflicts, namespace scope

Conflict
# Resource update conflicts with current state
# WHY: Resource modified between read and update operations
# WHERE TO LOOK: Resource version, concurrent modifications, update timing

BadRequest
# Request format or content is invalid
# WHY: Malformed request, invalid parameters, or wrong API usage
# WHERE TO LOOK: Request format, API documentation, parameter validation

InternalError
# Kubernetes API server internal error
# WHY: API server bugs, database issues, or system problems
# WHERE TO LOOK: API server logs, cluster health, system resources

Timeout
# Request exceeded configured timeout
# WHY: Operation took too long, slow backend, or resource contention
# WHERE TO LOOK: Timeout settings, operation complexity, system performance

TooManyRequests
# Rate limit exceeded for API requests
# WHY: Too many requests in short time period
# WHERE TO LOOK: Request rate, client behavior, rate limiting configuration

ServerUnavailable
# Kubernetes API server is unavailable
# WHY: API server down, network issues, or cluster problems
# WHERE TO LOOK: API server status, cluster connectivity, control plane health
```

## Node Errors
```
NodeNotFound
# Referenced node does not exist in cluster
# WHY: Node removed from cluster, name mismatch, or node registration issues
# WHERE TO LOOK: Node names, cluster membership, node registration

NodeUnreachable
# Node is not responding to cluster communication
# WHY: Network issues, node shutdown, or kubelet problems
# WHERE TO LOOK: Network connectivity, kubelet status, node health

NodeOutOfDisk
# Node has insufficient disk space
# WHY: Disk space exhausted by pods, logs, or system processes
# WHERE TO LOOK: Disk usage, log rotation, storage cleanup

NodeMemoryPressure
# Node is under memory pressure
# WHY: High memory usage by pods or system processes
# WHERE TO LOOK: Memory usage, pod resource limits, system processes

NodeDiskPressure
# Node is under disk pressure
# WHY: Disk space or inodes running low
# WHERE TO LOOK: Disk space, inode usage, storage allocation

NodePIDPressure
# Node is under process ID pressure
# WHY: Too many processes running on node
# WHERE TO LOOK: Process count, PID limits, resource management

NodeNetworkUnavailable
# Node's network is not properly configured
# WHY: Network plugin issues, CNI problems, or network configuration errors
# WHERE TO LOOK: Network configuration, CNI setup, network plugin status
```