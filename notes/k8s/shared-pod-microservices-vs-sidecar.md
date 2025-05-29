# Shared Pod Microservices vs Sidecar Pattern

category: Kubernetes
tags: sidecar, microservices, pod-design, kubernetes, containers, architecture

## Main Topic 1

This document explains the difference between running multiple microservices in a single pod (with shared volumes) and using the sidecar pattern. It uses a real YAML configuration as a case study.

### Subtopic A: Example - Shared Volume with Two Containers

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: shared-storage-example
spec:
  containers:
  # File processor
  - name: file-processor
    image: my-company/processor:latest
    volumeMounts:
    - name: shared-data
      mountPath: /data/input
    - name: shared-data
      mountPath: /data/output
      subPath: processed  # Write to subdirectory

  # File uploader
  - name: file-uploader
    image: my-company/uploader:latest
    volumeMounts:
    - name: shared-data
      mountPath: /upload
      subPath: processed  # Read from processed subdirectory
    env:
    - name: S3_BUCKET
      value: my-processed-files

  volumes:
  - name: shared-data
    emptyDir:
      sizeLimit: 1Gi  # Limit storage usage
```

### Subtopic B: How It Works

* **file-processor**: Reads files from `/data/input`, writes to `/data/output/processed`.
* **file-uploader**: Reads from `/upload` (which maps to `processed` subPath) and uploads to S3.
* Both use a shared `emptyDir` volume to exchange files.

## Main Topic 2

### Subtopic A: What This Pattern Is

* This setup is **two independent microservices** packaged into one pod.
* Each container does real, business-level work (processing vs uploading).
* Communication happens through a shared volume.

### Subtopic B: What a Sidecar Pattern Is

* Sidecar is a **supporting container**, not an independent service.
* It provides **cross-cutting functionality** like logging, proxying, or secret syncing.
* It does **not perform primary business logic**, and usually cannot run meaningfully on its own.

## Comparison Table

| Aspect             | Shared Pod Microservices            | Sidecar Pattern                                                    |
| ------------------ | ----------------------------------- | ------------------------------------------------------------------ |
| **Purpose**        | Two distinct business services      | Support for a main app                                             |
| **Responsibility** | Both containers do core logic       | Sidecar handles cross-cutting concerns                             |
| **Reusability**    | Each container could run separately | Sidecar usually depends on main container                          |
| **Lifecycle**      | Shared, but can be split            | Bound to the main app's lifecycle                                  |
| **Communication**  | Shared volume or loopback           | Shared volume or loopback                                          |
| **Examples**       | Data processor + uploader           | Fluent Bit for logging, Envoy for traffic, Vault Agent for secrets |

## Key Concepts Summary

* **Shared Pod Pattern**: Used for bundling microservices that need tight integration via shared filesystem.
* **Sidecar Pattern**: Used for extending functionality of a main service without changing its code.
* **emptyDir**: Ephemeral volume used for short-term storage and communication.
* **subPath**: Allows mounting subdirectories separately within a volume.

## Best Practices / Tips

1. Use shared pods for jobs that are **tightly coupled and short-lived**.
2. Prefer sidecars for **reusable support tasks** like log forwarding or TLS termination.
3. Don’t overload a pod with unrelated business logic — keep clear service boundaries.
4. Use `subPath` for clear file separation within shared volumes.
5. Monitor volume usage when using `emptyDir` with size limits.

