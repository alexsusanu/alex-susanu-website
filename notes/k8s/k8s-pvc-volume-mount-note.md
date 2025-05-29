# Understanding PersistentVolumeClaims (PVC) in Kubernetes
category: DevOps
tags: kubernetes, storage, pvc, persistent-volumes, containers

## Main Topic 1
PersistentVolumeClaims (PVCs) are how pods request and use persistent storage in Kubernetes. PVCs abstract the details of the underlying storage, enabling decoupled, dynamic provisioning.

### Subtopic A: Key Components
- **PersistentVolume (PV)** – A piece of storage in the cluster provisioned by an admin or dynamically.
- **PersistentVolumeClaim (PVC)** – A request for storage by a user/pod.
  - PVCs define how much storage is needed and the access mode.
  - Kubernetes matches the claim with a suitable PV.
- **Mounting the Volume** – Once claimed, the volume can be mounted into a container using `volumeMounts`.

### Subtopic B: Why Use PVCs?
- **Data Persistence** – Data survives pod restarts or rescheduling.
- **Separation of Concerns** – Devs request storage without needing to know where it comes from.
- **Managed Storage** – Cloud volumes, NFS, and other backends are supported via PVs.

## Main Topic 2
### In Context
You declare the volume in your pod spec like this:

```yaml
volumes:
  - name: my-volume
    persistentVolumeClaim:
      claimName: my-pvc
```

And then mount it like this:

```yaml
volumeMounts:
  - name: my-volume
    mountPath: /app/data
```

This means:
- Kubernetes will look for a **PersistentVolumeClaim named `my-pvc`**
- It will mount that volume inside the container at **`/app/data`**

### Code Example (if applicable)
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-pod
spec:
  containers:
    - name: my-container
      image: nginx
      volumeMounts:
        - name: my-volume
          mountPath: /app/data
  volumes:
    - name: my-volume
      persistentVolumeClaim:
        claimName: my-pvc
```

### Commands (if applicable)
```bash
# Create a PVC
kubectl apply -f my-pvc.yaml

# Check PVC status
kubectl get pvc

# Describe the bound volume
kubectl describe pvc my-pvc
```

## Key Concepts Summary
- **PV (Persistent Volume)** – Cluster-managed storage resource
- **PVC (Persistent Volume Claim)** – User request for PV
- **Volume Mount** – Path where the claimed volume is made available to the container

## Best Practices / Tips
1. **Use PVCs over hostPath** – Portability and safety in multi-node clusters
2. **Set storageClass in PVC** – For dynamic provisioning
3. **Monitor PVC status** – Ensure it's `Bound` before using it

## Common Issues / Troubleshooting
### Problem 1: PVC Stuck in Pending
- **Symptom:** PVC status remains `Pending`
- **Cause:** No available PV matches the request
- **Solution:** Create a PV manually or fix the `storageClass` and size

### Problem 2: Data Not Persisting After Pod Restart
- **Symptom:** Data is lost on pod restart
- **Cause:** `emptyDir` volume was used instead of PVC
- **Solution:** Ensure `persistentVolumeClaim` is specified in volume definition

## References / Further Reading
- https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- https://kubernetes.io/docs/tasks/configure-pod-container/configure-persistent-volume-storage/
- https://www.mirantis.com/blog/introduction-to-kubernetes-persistent-volumes/
