# Service Mesh / Sidecar Pattern
category: Architecture
tags: service-mesh, istio, envoy, sidecar, kubernetes
## Main Topic 1
A **Service Mesh** is a dedicated infrastructure layer for managing service-to-service communication in microservices. It uses the **Sidecar pattern** to inject proxies alongside app containers.

### Subtopic A: What It Is
- **Sidecar proxies** handle traffic (e.g. Envoy)
- **Control plane** (e.g. Istio) configures behavior
- Manages routing, security, retries, metrics

### Subtopic B: Why Use It
- Offloads non-business concerns from app code
- Uniform policy enforcement
- Improved observability and traffic control

### Subtopic C: When To Use It
- Microservices at scale
- Need for zero-trust networking, retries, traffic shifting
- Managing canary deployments or A/B testing

## Main Topic 2
### Infra Example (Istio Sidecar Injection)
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: mesh-enabled
  labels:
    istio-injection: enabled
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payments
  namespace: mesh-enabled
spec:
  replicas: 2
  selector:
    matchLabels:
      app: payments
  template:
    metadata:
      labels:
        app: payments
    spec:
      containers:
      - name: payments
        image: myregistry/payments:v1
```

## Key Concepts Summary
- Sidecars intercept all inbound/outbound traffic
- Control plane manages policy and telemetry
- Enables advanced traffic routing and security

## Best Practices / Tips
1. Use mTLS for secure service-to-service communication
2. Monitor proxy performance impact
3. Start with small namespaces before full rollout

## Common Issues / Troubleshooting
### Problem 1: Latency increase
- **Cause:** Proxy overhead
- **Solution:** Benchmark before and after injection

### Problem 2: Misconfiguration of routing
- **Cause:** Incorrect VirtualService or DestinationRule
- **Solution:** Use `istioctl analyze` and telemetry

## References / Further Reading
- https://istio.io/latest/docs/concepts/what-is-istio/
- https://learn.linkerd.io/
