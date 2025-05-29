# Domain-Driven Design (DDD)
category: Architecture
tags: ddd, java, design, microservices, kubernetes
## Main Topic 1
**Domain-Driven Design (DDD)** is an approach to software development that focuses on modeling software based on the business domain, using rich, behavior-focused models.

### Subtopic A: What It Is
- Uses **bounded contexts** to divide complex systems
- Rich domain models with entities, value objects, and aggregates
- Collaboration between developers and domain experts

### Subtopic B: Why Use It
- Aligns code with real business logic
- Helps manage complexity
- Encourages strategic design decisions

### Subtopic C: When To Use It
- Complex business domains
- Multiple subdomains and teams
- Systems needing long-term evolution

## Main Topic 2
### Code Example (Java Domain Model)
```java
public class Invoice {
    private List<LineItem> items;

    public BigDecimal getTotal() {
        return items.stream().map(LineItem::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
```

### Infra Tip (Kubernetes)
Use namespaces or Helm charts to separate bounded contexts in microservices deployments.

## Key Concepts Summary
- Focus on business logic and models
- Uses Ubiquitous Language between tech and business
- Breaks systems into bounded contexts

## Best Practices / Tips
1. Work closely with domain experts
2. Use layered architecture within each bounded context
3. Combine with event-driven or microservices architecture

## Common Issues / Troubleshooting
### Problem 1: Overengineering
- **Cause:** DDD applied to simple domains
- **Solution:** Use tactical patterns only where needed

### Problem 2: Poor context boundaries
- **Cause:** Miscommunication or unclear scope
- **Solution:** Use Event Storming to clarify models

## References / Further Reading
- https://domainlanguage.com/ddd/
- https://www.dddcommunity.org/
