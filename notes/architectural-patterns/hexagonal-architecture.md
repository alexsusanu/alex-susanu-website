# Hexagonal Architecture (Ports & Adapters)
category: Architecture
tags: hexagonal, clean-architecture, java, ports-adapters, kubernetes
## Main Topic 1
**Hexagonal Architecture**, or **Ports and Adapters**, separates the core logic from the infrastructure, allowing independent evolution of business logic and external systems.

### Subtopic A: What It Is
- **Core business logic** in the center
- **Ports** define interfaces the core needs
- **Adapters** are implementations like REST, DB, etc.

### Subtopic B: Why Use It
- High testability and decoupling
- External tech changes don’t affect the core
- Suitable for systems under frequent infrastructure change

### Subtopic C: When To Use It
- Domain-driven systems
- Projects with high focus on maintainability and testing
- Complex integrations

## Main Topic 2
### Code Example (Java)
```java
// Port interface
public interface UserRepository {
    User findById(Long id);
}

// Adapter implementation
@Repository
public class JpaUserRepository implements UserRepository {
    // implementation using Spring Data JPA
}
```

### Infra Example (Kubernetes)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
spec:
  replicas: 2
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
        image: myregistry/hex-user-service:latest
```

## Key Concepts Summary
- Clean separation of business and tech
- Ports are interfaces; adapters are tech-specific code
- Encourages clean testing and modular design

## Best Practices / Tips
1. Put business rules in the center
2. Use dependency inversion — core should not depend on adapters
3. Avoid bloated adapter layers

## Common Issues / Troubleshooting
### Problem 1: Confusion between layers
- **Cause:** Misuse of ports vs adapters
- **Solution:** Strict interface contracts and layered package structure

### Problem 2: Over-architecture for small projects
- **Cause:** Too much separation for basic needs
- **Solution:** Use only where complexity demands it

## References / Further Reading
- https://alistair.cockburn.us/hexagonal-architecture/
- https://reflectoring.io/spring-hexagonal/
