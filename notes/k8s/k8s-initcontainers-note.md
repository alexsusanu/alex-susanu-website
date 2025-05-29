# Understanding `initContainers` in Kubernetes
category: DevOps
tags: kubernetes, initcontainers, pods, orchestration, containers

## Main Topic 1
`initContainers` are a native Kubernetes feature that allow you to run one or more containers **before** your main application containers start. They are defined within the pod specification and serve to prepare the environment or perform prerequisite tasks.

### Subtopic A: What are `initContainers`?
- **Built-in Kubernetes keyword** – Part of the PodSpec (`spec.initContainers`)
- **Sequential execution** – Each init container runs to completion before the next one starts
- **Blocking behavior** – If any init container fails, the pod restarts and retries the init process
  - The main app containers do not start until all init containers succeed

### Subtopic B: Why Use `initContainers`?
- **Service readiness checks** – Ensure services like databases are available before boot
- **Database migrations** – Apply DB schema changes before app starts
- **Configuration preparation** – Download files or clone git repos
- **Volume preparation** – Copy assets into shared volumes
- **Fail-fast checks** – Validate environment, fail early if needed

## Main Topic 2
### Example Overview
The following pod spec shows practical uses of init containers:
- **`wait-for-db`** – Checks if PostgreSQL is reachable
- **`db-migration`** – Applies database migrations
- **`config-downloader`** – Clones config repo into a shared volume

These run **before** the main app container `web-app` starts.

### Code Example
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-app-with-migration
spec:
  initContainers:
    - name: wait-for-db
      image: busybox:1.35
      command: ["sh", "-c", "until nc -z postgres-service 5432; do echo 'Waiting...'; sleep 2; done"]

    - name: db-migration
      image: my-company/my-app:v1.2.3
      command: ["/app/migrate", "--database-url=postgresql://user:pass@postgres-service:5432/mydb", "--migrations-path=/app/migrations"]

    - name: config-downloader
      image: alpine/git:latest
      command: ["git", "clone", "https://github.com/my-company/app-config.git", "/shared-config"]
      volumeMounts:
        - name: config-volume
          mountPath: /shared-config

  containers:
    - name: web-app
      image: my-company/my-app:v1.2.3
      ports:
        - containerPort: 8080
      volumeMounts:
        - name: config-volume
          mountPath: /app/config
      env:
        - name: CONFIG_PATH
          value: /app/config

  volumes:
    - name: config-volume
      emptyDir: {}
```

## Key Concepts Summary
- **initContainers** – Prep containers that run before app containers
- **Sequential and blocking** – Must succeed for pod to proceed
- **Use cases** – Service checks, DB migrations, config downloads

## Best Practices / Tips
1. **Keep init containers simple** – Smaller images, minimal logic
2. **Fail fast** – Make init containers fail if critical checks don't pass
3. **Use shared volumes** – Use `emptyDir` or PVCs to pass data to main containers

## Common Issues / Troubleshooting
### Problem 1: Pod stuck in `Init` state
- **Symptom:** Pod never reaches `Running` state
- **Cause:** One or more init containers failing or retrying
- **Solution:** Use `kubectl describe pod` to check init container logs and exit codes

### Problem 2: Volume not shared properly
- **Symptom:** Main container can't see downloaded files
- **Cause:** Missing or mismatched volumeMounts
- **Solution:** Ensure init and main containers mount the same named volume

## References / Further Reading
- https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-init-containers/
