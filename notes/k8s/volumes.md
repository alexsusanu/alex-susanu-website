# Kubernetes Volumes: Mounting ConfigMaps and Secrets  
category: Kubernetes  
tags: volumes, configmap, secret, mount, pods

## Main Topic 1

Volumes in Kubernetes are used to mount external data (config files, secrets, storage) into pods. They're essential for injecting files at runtime.

### Subtopic A: Mount ConfigMap as File

```yaml
volumes:
  - name: config-volume
    configMap:
      name: backend-config
      items:
        - key: application.yml
          path: application.yml

volumeMounts:
  - name: config-volume
    mountPath: /config
    readOnly: true
```

### Subtopic B: Mount Secret as File

```yaml
volumes:
  - name: secret-volume
    secret:
      secretName: db-secret

volumeMounts:
  - name: secret-volume
    mountPath: /etc/secrets
    readOnly: true
```

## Main Topic 2

### Use Cases
- Applications that require config or secret files on disk
- Avoid passing sensitive data via env vars
- Reading `application.yml`, `.pem`, `.env`, `.crt` files

## Key Concepts Summary

- **Files, not env vars** - Some tools expect files, not variables
- **Read-only by default** - Best to enforce this explicitly
- **Fine-grained control** - `items:` allows selective mounting

## Best Practices / Tips

1. **Use only needed keys** - Don’t mount entire config if only one file is needed.
2. **Match paths carefully** - Apps must read from correct file paths.
3. **Enforce readOnly** - Avoid accidental overwrite or tampering.

## Common Issues / Troubleshooting

### Problem 1
- **Symptom:** App can’t find the file
- **Cause:** Wrong mount path or missing file key
- **Solution:** Ensure correct `items:` and `mountPath`

## References / Further Reading

- [K8s Volumes](https://kubernetes.io/docs/concepts/storage/volumes/)
- [ConfigMap Volume Docs](https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/)