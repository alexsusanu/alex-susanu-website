# Serverless Architecture
category: Architecture
tags: serverless, faas, cloud, kubernetes, java
## Main Topic 1
**Serverless Architecture** delegates infrastructure management to the cloud, allowing you to write functions that execute on demand without managing servers.

### Subtopic A: What It Is
- **Functions as a Service (FaaS)** – Deploy functions, not services
- **Auto-scaling and pay-per-use**
- Typically stateless and event-triggered

### Subtopic B: Why Use It
- **Operational simplicity**
- **Cost efficiency** – Pay only for time used
- **Rapid prototyping**

### Subtopic C: When To Use It
- Lightweight tasks (e.g., webhooks, image processing)
- Event-driven pipelines
- Unpredictable or bursty traffic

## Main Topic 2
### Code Example (Java Function)
```java
public class HelloHandler implements RequestHandler<Map<String, String>, String> {
    public String handleRequest(Map<String, String> input, Context context) {
        return "Hello, " + input.get("name");
    }
}
```

### Infra Example (Knative on Kubernetes)
```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: hello-service
spec:
  template:
    spec:
      containers:
      - image: myregistry/hello-fn:latest
```

## Key Concepts Summary
- Function-based execution
- Scales to zero
- Stateless and reactive design

## Best Practices / Tips
1. Keep functions lightweight and fast
2. Use managed secrets and env vars for config
3. Externalize state (e.g., use cloud storage or DB)

## Common Issues / Troubleshooting
### Problem 1: Cold start latency
- **Cause:** Function container spin-up delay
- **Solution:** Use provisioned concurrency if supported

### Problem 2: Tight vendor lock-in
- **Cause:** Proprietary cloud interfaces
- **Solution:** Use open standards like Knative

## References / Further Reading
- https://martinfowler.com/articles/serverless.html
- https://knative.dev/docs/
