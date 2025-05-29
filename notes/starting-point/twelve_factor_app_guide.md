# 12-Factor App Methodology Compliance
category: Architecture
tags: cloud-native, microservices, deployment, scalability

## Introduction to 12-Factor Methodology
The Twelve-Factor App methodology is a set of best practices for building software-as-a-service applications that are portable, scalable, and maintainable. Created by developers at Heroku, these principles help ensure applications can be deployed across various cloud platforms and scale effectively in modern cloud environments.

### Core Philosophy
- **Declarative formats** for setup automation
- **Clean contracts** with the underlying operating system
- **Suitable for deployment** on modern cloud platforms
- **Minimize divergence** between development and production
- **Scale up** without significant changes to tooling, architecture, or development practices

## The 12 Factors Explained

### Factor 1: Codebase
- **One codebase tracked in revision control, many deploys**
- Use version control systems like Git
- Single codebase serves multiple environments (dev, staging, production)
  - Different versions may be deployed to different environments
  - Same codebase across all deploys

### Factor 2: Dependencies
- **Explicitly declare and isolate dependencies**
- Never rely on implicit existence of system-wide packages
- Use dependency declaration manifests (package.json, requirements.txt, Gemfile)
  - Isolate dependencies using virtual environments or containers
  - Ensure no dependencies "leak in" from the surrounding system

### Factor 3: Config
- **Store config in environment variables**
- Configuration varies between deploys, code does not
- Never store config as constants in code
  - Use environment variables for database URLs, credentials, per-deploy values
  - Config should be easily changed without code changes

### Factor 4: Backing Services
- **Treat backing services as attached resources**
- Database, message queues, SMTP services, caching systems are backing services
- No distinction between local and third-party services
  - Access via URL and credentials stored in config
  - Resources can be attached/detached without code changes

### Factor 5: Build, Release, Run
- **Strictly separate build and run stages**
- Transform code repo into executable bundle (build)
- Combine build with config to create release
- Execute release in execution environment (run)
  - Releases should be immutable and have unique IDs
  - Every release should be stored for rollback capability

### Factor 6: Processes
- **Execute app as one or more stateless processes**
- Processes are stateless and share-nothing
- Persistent data stored in stateful backing service (database)
  - Memory/filesystem only used as brief, single-transaction cache
  - Never assume cached data will be available for future requests

## Advanced Factors

### Factor 7: Port Binding
- **Export services via port binding**
- App is completely self-contained
- Web app exports HTTP as service by binding to port
  - No injection into runtime webserver
  - One app can become backing service for another

### Factor 8: Concurrency
- **Scale out via the process model**
- Processes are first-class citizens
- Scale by running more processes, not making processes larger
  - Different process types for different workloads (web, worker, scheduler)
  - Processes should never daemonize or write PID files

### Factor 9: Disposability
- **Maximize robustness with fast startup and graceful shutdown**
- Processes can be started/stopped at moment's notice
- Fast startup time enables rapid scaling and deployment
  - Graceful shutdown on SIGTERM signal
  - Robust against sudden process death

### Factor 10: Dev/Prod Parity
- **Keep development, staging, and production as similar as possible**
- Minimize gaps in time, personnel, and tools
- Use same backing services across environments
  - Developers deploy their own code
  - Hours between code written and deployed
  - Same tools and services in all environments

### Factor 11: Logs
- **Treat logs as event streams**
- App never concerns itself with routing/storage of output stream
- Write all logs to stdout as stream of events
  - Execution environment handles log routing and storage
  - Use structured logging formats (JSON) when possible

### Factor 12: Admin Processes
- **Run admin/management tasks as one-off processes**
- Database migrations, console sessions, one-time scripts
- Run in identical environment as regular processes
  - Use same codebase and config
  - Admin code ships with application code

## Implementation Examples

### Environment Configuration
```bash
# Environment variables for configuration
export DATABASE_URL="postgres://user:pass@host:5432/dbname"
export REDIS_URL="redis://localhost:6379"
export SECRET_KEY="your-secret-key"
export DEBUG=false
```

### Process Management
```yaml
# Procfile for process types
web: gunicorn app:application --port $PORT
worker: celery worker -A app.celery
scheduler: celery beat -A app.celery
```

### Docker Implementation
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: myapp
        image: myapp:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
```

## Key Concepts Summary
- **Codebase** - Single source of truth in version control
- **Dependencies** - Explicit declaration and isolation
- **Config** - Environment-based configuration management
- **Backing Services** - Treat external resources as attached services
- **Stateless Processes** - No shared state between process instances
- **Port Binding** - Self-contained service export
- **Horizontal Scaling** - Scale by adding more processes
- **Disposability** - Fast startup and graceful shutdown
- **Environment Parity** - Consistent across all stages
- **Log Streaming** - Treat logs as continuous event streams

## Best Practices / Tips
1. **Use Container Orchestration** - Kubernetes, Docker Swarm, or similar platforms naturally support 12-factor principles
2. **Implement Health Checks** - Enable orchestrators to manage process lifecycle effectively
3. **Use Feature Flags** - Instead of branching, use configuration to enable/disable features
4. **Automate Everything** - Build, test, and deployment pipelines should be fully automated
5. **Monitor Process Metrics** - Track startup times, memory usage, and request handling
6. **Implement Circuit Breakers** - Gracefully handle backing service failures
7. **Use Structured Logging** - JSON logs are easier to parse and analyze
8. **Version Your APIs** - Maintain backward compatibility during deployments

## Common Issues / Troubleshooting

### Problem 1: Configuration Management
- **Symptom:** Hard-coded configuration values causing deployment issues
- **Cause:** Config stored in code instead of environment
- **Solution:** Extract all environment-specific values to environment variables and use config management tools

### Problem 2: State Management
- **Symptom:** Application fails when scaled horizontally or processes restart
- **Cause:** Application storing state in memory or local filesystem
- **Solution:** Move all persistent state to backing services (databases, caches)

### Problem 3: Dependency Issues
- **Symptom:** "Works on my machine" but fails in production
- **Cause:** Implicit dependencies or version mismatches
- **Solution:** Use explicit dependency files, lock versions, and containerization

### Problem 4: Log Management
- **Symptom:** Logs scattered across files, difficult to aggregate and analyze
- **Cause:** Application managing log files instead of streaming to stdout
- **Solution:** Configure application to log to stdout and use log aggregation tools

### Problem 5: Service Discovery
- **Symptom:** Hard-coded service URLs causing connection failures
- **Cause:** Not treating backing services as attached resources
- **Solution:** Use service discovery mechanisms and environment-based service configuration

## References / Further Reading
- Official 12-Factor App documentation: https://12factor.net/
- Cloud Native Computing Foundation guidelines
- Heroku's original blog posts on 12-factor methodology
- "Building Microservices" by Sam Newman
- Docker and Kubernetes best practices documentation
- Martin Fowler's articles on continuous delivery and microservices