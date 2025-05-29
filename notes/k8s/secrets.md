# Kubernetes Secrets: Usage and Best Practices  
category: Kubernetes  
tags: secrets, security, base64, config, env

## Main Topic 1

Kubernetes Secrets are used to securely store sensitive information like passwords, tokens, and keys, and expose them to containers at runtime.

### Subtopic A: Creating Secrets

- **Base64 encoding required** - Secrets must be base64-encoded in YAML.
- **Types** - Most common is `Opaque` (generic key-value).

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-secret
type: Opaque
data:
  username: bXlhcHBfdXNlcg==  # myapp_user
  password: cGFzc3dvcmQxMjM=  # password123
```

### Subtopic B: Using Secrets in Pods

- **As Environment Variables**
```yaml
env:
  - name: DB_USER
    valueFrom:
      secretKeyRef:
        name: db-secret
        key: username
  - name: DB_PASS
    valueFrom:
      secretKeyRef:
        name: db-secret
        key: password
```

- **As Mounted Files**
```yaml
volumes:
  - name: db-creds
    secret:
      secretName: db-secret

volumeMounts:
  - name: db-creds
    mountPath: /etc/db
    readOnly: true
```

## Key Concepts Summary

- **Base64 required** - All secret values must be base64-encoded.
- **Env vs Volume** - Use env vars for simple access, volume mounts for file-based tools.
- **Read-only volumes** - Mark secret mounts as read-only.

## Best Practices / Tips

1. **Avoid hardcoding secrets** - Never put real secrets in plain YAML.
2. **Use external secret managers in prod** - e.g., HashiCorp Vault, Sealed Secrets.
3. **Use RBAC wisely** - Restrict access to secrets via RBAC policies.

## Common Issues / Troubleshooting

### Problem 1
- **Symptom:** Secret value not available in container
- **Cause:** Typo in key or missing secret mount
- **Solution:** Verify secret exists and is correctly referenced

## References / Further Reading

- [K8s Secrets Docs](https://kubernetes.io/docs/concepts/configuration/secret/)