# CQRS (Command Query Responsibility Segregation)
category: Architecture
tags: cqrs, java, axon, eventsourcing, kubernetes
## Main Topic 1
**CQRS** separates the responsibility for reading and writing data into different models, enhancing scalability and performance for complex systems.

### Subtopic A: What It Is
- **Command model** handles updates (create/update/delete)
- **Query model** handles reads
- Often combined with **Event Sourcing**

### Subtopic B: Why Use It
- Optimized read/write performance
- Better separation of concerns
- Enables eventual consistency and complex audit trails

### Subtopic C: When To Use It
- High-traffic applications with different read/write loads
- Event-driven systems
- Systems requiring auditability or history tracking

## Main Topic 2
### Code Example (Java + Axon)
```java
@Aggregate
public class Account {
    @CommandHandler
    public Account(CreateAccountCommand cmd) {
        AggregateLifecycle.apply(new AccountCreatedEvent(cmd.getId()));
    }

    @EventSourcingHandler
    public void on(AccountCreatedEvent evt) {
        // handle event
    }
}
```

### Infra Example (Kubernetes)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cqrs-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cqrs-app
  template:
    metadata:
      labels:
        app: cqrs-app
    spec:
      containers:
      - name: cqrs-container
        image: myregistry/cqrs-app:latest
```

## Key Concepts Summary
- Separate read/write models
- Often used with Event Sourcing
- Enables eventual consistency

## Best Practices / Tips
1. Keep command and query models independent
2. Use messaging/event systems for syncing models
3. Monitor latency for eventual consistency

## Common Issues / Troubleshooting
### Problem 1: Increased complexity
- **Cause:** Two data models and sync logic
- **Solution:** Only use CQRS where justified

### Problem 2: Stale reads
- **Cause:** Eventual consistency delay
- **Solution:** Use polling or notifications to update UI

## References / Further Reading
- https://martinfowler.com/bliki/CQRS.html
- https://docs.axoniq.io/
