# Helm: ConfigMaps and Secrets in Charts  
category: Kubernetes  
tags: helm, configmap, templating, secrets, values

## Main Topic 1

Helm templates allow you to inject config and secrets using values files and inline templates. This is powerful for templated deployments and environment-specific setups.

### Subtopic A: ConfigMap in Helm

```yaml
# values.yaml
config:
  application.yml: |
    server:
      port: 8080
    spring:
      redis:
        host: redis-service
```

```yaml
# templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "mychart.fullname" . }}-config
data:
  application.yml: |-
{{ .Values.config."application.yml" | indent 4 }}
```

### Subtopic B: Secret in Helm

```yaml
# values.yaml
secrets:
  username: myapp_user
  password: password123
```

```yaml
# templates/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: {{ include "mychart.fullname" . }}-secret
type: Opaque
data:
  username: {{ .Values.secrets.username | b64enc | quote }}
  password: {{ .Values.secrets.password | b64enc | quote }}
```

## Main Topic 2

### Mounting the Config in Deployment

```yaml
volumes:
  - name: config-volume
    configMap:
      name: {{ include "mychart.fullname" . }}-config

volumeMounts:
  - name: config-volume
    mountPath: /config
```

### Set values at install time
```bash
helm install myapp ./mychart -f values-prod.yaml
```

## Key Concepts Summary

- **Templates drive resource files** - Use `.Values`, `b64enc`, `indent`, and helpers.
- **Helm values control logic** - Great for multi-env configs.
- **Secrets templated securely** - Still base64-encoded but separated per environment.

## Best Practices / Tips

1. **Don't hardcode secrets** - Pass them via CI/CD pipelines or sealed values.
2. **Use `quote` and `b64enc`** - For safety and compatibility.
3. **Use `include` helper** - For consistent naming in templates.

## Common Issues / Troubleshooting

### Problem 1
- **Symptom:** Secret not base64-encoded
- **Cause:** Missing `b64enc` in template
- **Solution:** Wrap secret values with `b64enc` in Helm

## References / Further Reading

- [Helm Docs](https://helm.sh/docs/)
- [Helm Templating](https://helm.sh/docs/chart_template_guide/)