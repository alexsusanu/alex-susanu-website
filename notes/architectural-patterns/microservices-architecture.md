# Microservices Architecture
category: Architecture
tags: microservices, java, kubernetes, spring-boot, scalability
## Main Topic 1
A **Microservices Architecture** is a design where an application is composed of small, independent services that communicate over well-defined APIs.

### Subtopic A: What It Is
- **Each service is independently deployable**
- **Loosely coupled components**
- **Polyglot-friendly** – different services can use different tech stacks

### Subtopic B: Why Use It
- **Scalability** – Scale services independently based on demand
- **Team autonomy** – Teams can work on different services
- **Resilience** – Failure in one service doesn't bring down the whole system

### Subtopic C: When To Use It
- Complex domains with multiple teams
- Need for independent scaling
- Continuous delivery and agility are required

## Main Topic 2
### Code Example (Spring Boot Service)
```java
@RestController
public class OrderController {
    @GetMapping("/orders")
    public List<String> getOrders() {
        return List.of("Order1", "Order2");
    }
}
```

### Infra Example (Kubernetes)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
    spec:
      containers:
      - name: order-service
        image: myregistry/order-service:latest
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: order-service
spec:
  selector:
    app: order-service
  ports:
  - port: 80
    targetPort: 8080
```

## Key Concepts Summary
- Decoupled services, each responsible for a specific business function
- Independent deployability and scalability
- Requires API contracts and inter-service communication strategies

## Best Practices / Tips
1. Use a service mesh for observability and traffic control
2. Implement circuit breakers and retries
3. Maintain backward-compatible APIs

## Common Issues / Troubleshooting
### Problem 1: Too much complexity too early
- **Cause:** Overengineering small systems
- **Solution:** Consider modular monolith as a stepping stone

### Problem 2: Communication failure between services
- **Cause:** Network or service discovery issues
- **Solution:** Use Kubernetes Services or a service mesh

## References / Further Reading
- https://martinfowler.com/articles/microservices.html
- https://kubernetes.io/docs/concepts/services-networking/service/
