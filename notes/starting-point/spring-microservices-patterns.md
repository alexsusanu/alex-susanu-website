# Java Spring Boot - Microservices Patterns
category: Programming
tags: spring boot, microservices, architecture, java

## Circuit Breaker Pattern

Prevents cascading failures in distributed systems

- **States:** Closed, Open, Half-Open
- **Implementation:** Use Hystrix or Resilience4j
- **Configuration:** Failure threshold, timeout, recovery time

```java
@Component
public class UserService {
    @CircuitBreaker(name = "userService", fallbackMethod = "fallbackUser")
    public User getUser(Long id) {
        return userRepository.findById(id);
    }
    
    public User fallbackUser(Long id, Exception ex) {
        return new User("Unknown User");
    }
}
```

## API Gateway Pattern

Single entry point for all clients

- **Responsibilities:** Authentication, routing, rate limiting, logging
- **Tools:** Spring Cloud Gateway, Zuul, Kong
- **Benefits:** Simplified client code, centralized concerns

## Service Discovery

### Client-side
- Netflix Eureka
- Consul

### Server-side
- AWS ELB
- Kubernetes services

### Health checks
- Regular service health monitoring

## Saga Pattern

Manages distributed transactions

- **Choreography:** Each service publishes events
- **Orchestration:** Central coordinator manages flow
- **Compensation:** Rollback mechanisms for failures