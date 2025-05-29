# Event-Driven Architecture
category: Architecture
tags: event-driven, kafka, java, kubernetes, microservices
## Main Topic 1
**Event-Driven Architecture (EDA)** is a design paradigm where components communicate through events—emitted, consumed, and reacted upon—decoupling the services.

### Subtopic A: What It Is
- **Asynchronous communication** – Producers emit events, consumers listen and act
- **Loose coupling** – Services do not directly call each other
- **High scalability** – Suits high-throughput and reactive systems

### Subtopic B: Why Use It
- Enables real-time processing and responsiveness
- Decouples services for better fault tolerance
- Facilitates audit trails and logging through events

### Subtopic C: When To Use It
- Real-time systems (e.g. fraud detection, analytics)
- Microservices needing loose coupling
- Need for async workflows and horizontal scaling

## Main Topic 2
### Code Example (Java + Spring Kafka)
```java
@Component
public class OrderListener {
    @KafkaListener(topics = "orders")
    public void handleOrder(String orderJson) {
        // process order
    }
}
```

### Infra Example (Kubernetes + Kafka)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kafka-consumer
spec:
  replicas: 2
  selector:
    matchLabels:
      app: kafka-consumer
  template:
    metadata:
      labels:
        app: kafka-consumer
    spec:
      containers:
      - name: consumer
        image: myregistry/kafka-consumer:latest
        env:
        - name: KAFKA_BOOTSTRAP_SERVERS
          value: kafka:9092
```

## Key Concepts Summary
- Events decouple producers and consumers
- Supports async flows, retry patterns
- Event brokers like Kafka or RabbitMQ act as middleware

## Best Practices / Tips
1. Design events as immutable facts
2. Use schema validation (e.g., Avro)
3. Handle idempotency in consumers

## Common Issues / Troubleshooting
### Problem 1: Event loss or duplication
- **Cause:** Consumer restarts or network partition
- **Solution:** Use offset management and idempotent processing

### Problem 2: Hard to trace event flow
- **Cause:** No centralized logging or monitoring
- **Solution:** Use distributed tracing and observability tools

## References / Further Reading
- https://martinfowler.com/articles/201701-event-driven.html
- https://kafka.apache.org/documentation/
