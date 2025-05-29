# Monolithic Architecture
category: Architecture
tags: monolith, java, kubernetes, devops
## Main Topic 1
A **Monolithic Architecture** is a single-tiered application structure where all functions—UI, business logic, and data access—are tightly coupled and run as one unit.

### Subtopic A: What It Is
- **Single deployment unit** – All code runs in a single application process.
- **Shared memory** – Components directly invoke one another.
- **Common in early-stage applications** – Faster to develop and deploy initially.

### Subtopic B: Why Use It
- **Simplicity** – Easier to develop, test, and deploy initially.
- **Speed** – Fewer moving parts, less orchestration needed.
- **Tools** – Ideal for small teams or MVPs.

### Subtopic C: When To Use It
- Small team or startup phase
- Limited domain complexity
- Fast prototyping required

## Main Topic 2
### Code Example (Java Spring Boot)
```java
@RestController
public class GreetingController {
    @GetMapping("/greet")
    public String greet() {
        return "Hello from Monolith!";
    }
}
```

### Infra Example (Kubernetes)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: monolith-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: monolith
  template:
    metadata:
      labels:
        app: monolith
    spec:
      containers:
      - name: monolith-container
        image: myregistry/monolith-app:latest
        ports:
        - containerPort: 8080
```

## Key Concepts Summary
- All components packaged into one
- Easy to build, hard to scale and maintain over time
- No network overhead between components

## Best Practices / Tips
1. Keep modules logically separated inside the monolith
2. Use clear package structures to isolate business domains
3. Containerize early to enable smooth migration later

## Common Issues / Troubleshooting
### Problem 1: Hard to scale specific functions
- **Cause:** Everything is one process
- **Solution:** Consider breaking into microservices

### Problem 2: Deployment downtime
- **Cause:** One failure can bring down entire app
- **Solution:** Use rolling updates with health checks in K8s

## References / Further Reading
- https://martinfowler.com/bliki/Monolith.html
- https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
