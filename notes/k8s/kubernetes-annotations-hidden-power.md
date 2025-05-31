# Kubernetes Annotations – Hidden Power in Metadata

category: Kubernetes
tags: annotations, kubernetes, observability, tooling, DevOps, metadata

## Main Topic 1

Annotations in Kubernetes are key-value pairs that attach arbitrary, non-identifying metadata to objects. Unlike labels, which are used for selection and grouping, **annotations are meant for machine-readable instructions, tool hints, documentation, and integration logic**.

### Subtopic A – What Exactly Are Annotations?

* Annotations are stored under `metadata.annotations`
* Syntax: flat key-value pairs (both strings)
* Can be added to almost any Kubernetes object (Pods, Deployments, Services, Namespaces, etc.)
* Keys should be namespaced using domain-style notation (e.g. `tool.example.com/config`)
* There is **no schema validation** — values can be freeform text, URLs, JSON, or base64 blobs

### Subtopic B – Functional vs. Informational Annotations

Annotations fall into two broad categories:

* **Functional Annotations**: These are parsed and acted upon by Kubernetes components or external tools. They control behaviors like Prometheus scraping, Istio sidecar injection, GitOps sync, etc.
* **Informational Annotations**: These serve as structured documentation for humans and ops teams, e.g., links to runbooks, ticket IDs, contact info.

## Main Topic 2 – Do Annotations Affect Runtime?

### Core Kubernetes Behavior

* Kubernetes core itself **ignores most annotations**, except for a few internal ones like:

  * `kubernetes.io/change-cause`
  * `kubectl.kubernetes.io/last-applied-configuration`
  * `deployment.kubernetes.io/revision`

These are used by `kubectl`, rollouts, and other built-in commands.

### Tool-Specific Reactions

Annotations **do have runtime impact** when tools explicitly parse them. That includes:

* Monitoring (Prometheus)
* Ingress controllers (NGINX, Traefik)
* Service meshes (Istio, Linkerd)
* GitOps (ArgoCD, Flux)
* Auto-scalers (KEDA, HPA extensions)
* CI/CD or policy enforcement (OPA Gatekeeper, Kyverno)

If the tool you're using watches the annotation, it can **trigger behaviors**, inject containers, block resources, or start scraping metrics.

## Main Topic 3 – Annotations vs Labels

| Feature            | Labels                          | Annotations                              |
| ------------------ | ------------------------------- | ---------------------------------------- |
| Purpose            | Selection, grouping             | Metadata, integration, tool hints        |
| Size Limit         | Small (used for indexing)       | Larger values allowed                    |
| Used By Selectors? | ✅ Yes                           | ❌ No                                     |
| Use in queries     | `kubectl get ... -l`            | Not queryable                            |
| Typical use cases  | app grouping, service targeting | Prometheus config, runbooks, oncall info |

## Code Example: Annotated Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  annotations:
    kubernetes.io/change-cause: "Applied CVE-2023-1234 patch"
    documentation.company.com/runbook: "https://wiki.company.com/db-maintenance"
    contact.company.com/oncall: "database-team@example.com"
    prometheus.io/scrape: "true"
    prometheus.io/port: "9090"
    prometheus.io/path: "/metrics"
    terraform.io/resource-id: "aws_instance.db_primary"
    terraform.io/state-version: "v4.2.1"
```

### Commands (Useful with Annotations)

```bash
# View annotations on an object
kubectl get pod mypod -o jsonpath='{.metadata.annotations}'

# Add or update an annotation
kubectl annotate deployment payment-service \
  kubernetes.io/change-cause="Security patch v2.1.5"

# Remove an annotation (note the trailing dash '-')
kubectl annotate pod mypod key-to-remove-
# This removes the annotation with key 'key-to-remove' from the pod

# Patch annotations programmatically
kubectl patch deployment myapp \
  -p '{"metadata":{"annotations":{"custom.example.com/info":"value"}}}'
```

## Key Concepts Summary

* **Annotations** are powerful for tool integrations and automation hints
* They are **not used** for filtering or selection like labels
* Tools like Prometheus, Istio, Linkerd, ArgoCD, and NGINX rely heavily on annotations
* Annotations can be critical to debugging and auditability in CI/CD
* **If no controller/tool reads it, it’s just stored data**

## Best Practices / Tips

1. **Namespace your annotation keys** using domain notation (e.g. `team.mycompany.com/purpose`)
2. **Keep critical behavior-related annotations consistent and documented**
3. Avoid stuffing large blobs unless needed — prefer links (e.g., runbook URLs)
4. Don’t use annotations for selection or querying — that’s what labels are for
5. Use annotations to improve observability, on-call traceability, and GitOps automation

---

## Curated List of Functional Annotations by Tool

### 🔧 Kubernetes Native

| Annotation                                         | Purpose                       |
| -------------------------------------------------- | ----------------------------- |
| `kubernetes.io/change-cause`                       | Track rollout history changes |
| `deployment.kubernetes.io/revision`                | Internal revision tracking    |
| `kubectl.kubernetes.io/last-applied-configuration` | Stores `kubectl apply` state  |

### 🔭 Prometheus

| Annotation             | Purpose                 |
| ---------------------- | ----------------------- |
| `prometheus.io/scrape` | Enable metrics scraping |
| `prometheus.io/port`   | Port to scrape          |
| `prometheus.io/path`   | Metrics endpoint path   |

### 🌐 Ingress Controllers (NGINX / Traefik)

| Annotation                                         | Purpose                                |
| -------------------------------------------------- | -------------------------------------- |
| `nginx.ingress.kubernetes.io/rewrite-target`       | Rewrites incoming request path         |
| `nginx.ingress.kubernetes.io/ssl-redirect`         | Forces HTTPS redirect                  |
| `nginx.ingress.kubernetes.io/proxy-body-size`      | Controls max request size              |
| `traefik.ingress.kubernetes.io/router.entrypoints` | Assign to specific Traefik entrypoints |

### 🧐 ArgoCD / GitOps

| Annotation                           | Purpose                             |
| ------------------------------------ | ----------------------------------- |
| `argocd.argoproj.io/instance`        | Ties resource to ArgoCD application |
| `argocd.argoproj.io/sync-options`    | Customize sync behavior             |
| `argocd.argoproj.io/compare-options` | Skip diffing on fields              |

### 🛡️ Istio / Linkerd (Service Mesh)

| Annotation                                         | Purpose                          |
| -------------------------------------------------- | -------------------------------- |
| `sidecar.istio.io/inject`                          | Controls Istio sidecar injection |
| `traffic.sidecar.istio.io/includeOutboundIPRanges` | Restrict egress traffic          |
| `linkerd.io/inject`                                | Enable Linkerd proxy injection   |

### 📊 KEDA (Kubernetes Event-Driven Autoscaling)

| Annotation               | Purpose                        |
| ------------------------ | ------------------------------ |
| `keda.sh/scaleTargetRef` | Define the target to autoscale |

### ⚙️ Terraform

| Annotation                   | Purpose                         |
| ---------------------------- | ------------------------------- |
| `terraform.io/resource-id`   | Maps resource back to Terraform |
| `terraform.io/state-version` | Track Terraform version         |

---

