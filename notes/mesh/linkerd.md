# Linkerd - Service Mesh Overview

category: Kubernetes
tags: linkerd, service-mesh, kubernetes, microservices, security, observability

## Main Topic 1

Linkerd is a lightweight, open-source service mesh for Kubernetes that provides runtime debugging, observability, reliability, and security for microservices. Unlike Istio, Linkerd focuses on simplicity, performance, and low operational overhead.

### Subtopic A: What is a Service Mesh?

* **Definition** - A dedicated infrastructure layer that transparently handles service-to-service communication.
* **Purpose** - Manages reliability, telemetry, and security aspects outside of application logic.

### Subtopic B: Core Features of Linkerd

* **Automatic mTLS** - Transparent encryption for all pod-to-pod communication.
* **Traffic Metrics** - Built-in Prometheus integration with minimal configuration.
* **Latency-aware Load Balancing** - Sends traffic to the fastest available instance.
* **Lightweight Architecture** - Written in Rust and Go; minimal performance footprint.
* **No Custom CRDs** - Most configs use native Kubernetes resources.

## Main Topic 2

### Code Example (if applicable)

```bash
# Install Linkerd CLI
curl -sL https://run.linkerd.io/install | sh

# Validate your Kubernetes cluster
linkerd check --pre

# Install Linkerd into the cluster
linkerd install | kubectl apply -f -

# Verify installation
linkerd check

# Add Linkerd to a namespace
kubectl annotate namespace default linkerd.io/inject=enabled

# Deploy your services
kubectl apply -f your-service.yaml
```

### Commands (if applicable)

```bash
# View live traffic metrics
linkerd viz install | kubectl apply -f -
linkerd viz dashboard
```

## Key Concepts Summary

* **Proxy** - Lightweight sidecar proxy automatically injected into each pod.
* **Control Plane** - Manages certificates, proxy config, and metrics.
* **Viz** - Built-in observability dashboard.
* **mTLS by Default** - Secure connections between services out of the box.
* **Simplicity** - No custom resource definitions required.

## Best Practices / Tips

1. **Use Viz for observability** - Gain instant visibility into traffic.
2. **Leverage automatic mTLS** - No manual config needed for encryption.
3. **Apply injection namespace-wide** - Annotate namespaces instead of individual pods.
4. **Start with small workloads** - Validate performance before scaling up.
5. **Keep Linkerd updated** - Benefit from performance and security improvements.

