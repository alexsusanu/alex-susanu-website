# ConfigMap: Inline vs File-Based Configuration  
category: Kubernetes  
tags: configmap, yaml, volumes, kubectl

## Main Topic 1

Understanding the difference between defining Kubernetes ConfigMaps inline vs from external files is important for managing application configurations cleanly and declaratively.

### Subtopic A: Inline ConfigMap (`application.yml: |`)
- **Config embedded directly** - File content (like `application.yml`) is included directly in the YAML manifest using multiline string syntax (`|`).
- **All-in-one manifest** - Easy to version control and deploy as part of GitOps or CI/CD pipelines.
  - Use this when configs are small and you want to manage everything in one place.
  - Ideal for templated environments or tools like Helm.

### Subtopic B: File-Based ConfigMap (`--from-file`)
- **Reads file from disk** - You create a ConfigMap from a real file using `kubectl create configmap --from-file=...`
- **No manual copying** - The file is uploaded to the Kubernetes API server; no need to copy it to the node or container.
- **Cleaner for large configs** - Better separation of concerns when you already have config files.

## Main Topic 2

### Code Example (if applicable)
```yaml
# Inline
apiVersion: v1
kind: ConfigMap
metadata:
  name: backend-config
data:
  application.yml: |
    server:
      port: 8080
```

```bash
# File-based
kubectl create configmap backend-config --from-file=application.yml
```

### Commands (if applicable)
```bash
kubectl apply -f configmap-inline.yml
kubectl create configmap backend-config --from-file=application.yml
```

## Key Concepts Summary

- **Inline config** - Embed file contents directly into the ConfigMap YAML.
- **File-based config** - Reference external files and upload them using the CLI.
- **K8s stores config** - Kubernetes stores the ConfigMap in the API server, not on nodes.
- **File gets mounted** - The config file is injected into the container as a real file at runtime.

## Best Practices / Tips

1. **Use inline for small or templated configs** - Great for GitOps and human-readability.
2. **Use file-based for larger files** - Keeps your manifests clean and leverages existing config files.
3. **Mount ConfigMaps as files** - When the app expects a file (e.g., Spring Boot's `application.yml`), mount the config as a volume.

## Common Issues / Troubleshooting

### Problem 1
- **Symptom:** Spring Boot app fails to find `application.yml`
- **Cause:** ConfigMap wasn't mounted correctly or wrong path used  
- **Solution:** Mount the file into `/config` and set `--spring.config.location=file:/config/application.yml`

### Problem 2
- **Symptom:** ConfigMap value is too large or unmanageable in YAML
- **Solution:** Use `--from-file` method to externalize the content cleanly

## References / Further Reading

- [Kubernetes ConfigMap Docs](https://kubernetes.io/docs/concepts/configuration/configmap/)
- [Spring Boot External Config](https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.external-config)
- [kubectl create configmap](https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#create-configmap)

