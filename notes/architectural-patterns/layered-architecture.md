# Layered Architecture
category: Architecture
tags: layered, mvc, java, design-patterns, kubernetes
## Main Topic 1
**Layered Architecture** (also known as n-tier) divides the system into layers with well-defined responsibilities, such as presentation, business, and data access layers.

### Subtopic A: What It Is
- **Vertical separation of concerns**
- Common layers: UI, Business Logic, Persistence
- Components communicate only with adjacent layers

### Subtopic B: Why Use It
- **Modularity** – Separation makes code easier to understand and maintain
- **Reusability** – Each layer can evolve independently
- **Testability** – Unit testing becomes easier

### Subtopic C: When To Use It
- Traditional enterprise applications
- Systems with clearly separated concerns
- Long-term maintainability needed

## Main Topic 2
### Code Example (Java Spring Boot)
```java
// Service layer
@Service
public class UserService {
    @Autowired
    private UserRepository repository;

    public User getUser(Long id) {
        return repository.findById(id).orElse(null);
    }
}
```

### Infra Example (Kubernetes)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
spec:
  replicas: 1
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
    spec:
      containers:
      - name: user-service
        image: myregistry/user-service:latest
```

## Key Concepts Summary
- Logical layers for structure
- Encourages best practices in OOP and separation of concerns
- Can be deployed as a monolith or microservices

## Best Practices / Tips
1. Avoid business logic in the controller layer
2. Use DTOs to pass data between layers
3. Follow SOLID principles

## Common Issues / Troubleshooting
### Problem 1: Tight coupling between layers
- **Cause:** Poor abstraction
- **Solution:** Use interfaces and clean boundaries

### Problem 2: Inefficiency in data mapping
- **Cause:** Overuse of models between layers
- **Solution:** Use data transfer objects (DTOs)

## References / Further Reading
- https://en.wikipedia.org/wiki/Multitier_architecture
- https://spring.io/guides/gs/accessing-data-jpa/
