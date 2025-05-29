# Docker Orchestration
category: DevOps
tags: docker, compose, swarm, orchestration, multi-container

## Docker Compose

**What it is:** A tool for defining and running multi-container Docker applications using a YAML file to configure application services, networks, and volumes.

**Why it matters:** Docker Compose simplifies multi-container application management, enables reproducible development environments, and provides an easy way to orchestrate complex applications with multiple interconnected services.

**Key benefits:**
- **Single command deployment** - Start entire application stack with `docker-compose up`
- **Environment consistency** - Same configuration across dev/staging/prod
- **Service dependencies** - Define startup order and dependencies
- **Network isolation** - Automatic network creation for service communication
- **Volume management** - Persistent data across container restarts

**Docker Compose vs Docker run:**
- **Docker run** - Single container commands, complex for multi-container apps
- **Docker Compose** - Multi-container orchestration, infrastructure as code
- **Use Compose for** - Development, testing, single-host deployments
- **Use Kubernetes for** - Production, multi-host, advanced orchestration

**Common commands:**
```bash
# Basic Compose operations
docker-compose up                                  # Start all services
docker-compose up -d                               # Start in background (detached)
docker-compose up --build                          # Rebuild images before starting
docker-compose up service-name                     # Start specific service

docker-compose down                                # Stop and remove containers
docker-compose down -v                             # Also remove volumes
docker-compose down --rmi all                      # Also remove images

# Service management
docker-compose start                               # Start existing containers
docker-compose stop                                # Stop running containers
docker-compose restart                             # Restart services
docker-compose pause                               # Pause services
docker-compose unpause                             # Unpause services

# Scaling services
docker-compose up --scale web=3                    # Scale web service to 3 instances
docker-compose scale web=5 worker=2               # Scale multiple services

# Logs and monitoring
docker-compose logs                                # All service logs
docker-compose logs web                            # Specific service logs
docker-compose logs -f                             # Follow logs
docker-compose logs --tail=100                     # Last 100 lines

# Execute commands
docker-compose exec web bash                       # Shell into running service
docker-compose run web python manage.py migrate   # Run one-off command
docker-compose run --rm web pytest                # Run and remove container
```

**Example docker-compose.yml (Web application):**
```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "8000:8000"
    volumes:
      - .:/app
      - static_volume:/app/staticfiles
    environment:
      - DEBUG=1
      - DATABASE_URL=postgresql://user:pass@db:5432/myapp
    depends_on:
      - db
      - redis
    restart: unless-stopped
    networks:
      - app-network

  db:
    image: postgres:13
    volumes:
      - postgres_data:/var/lib/postgresql/data/
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    restart: unless-stopped
    networks:
      - app-network

  redis:
    image: redis:6-alpine  
    restart: unless-stopped
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - static_volume:/static:ro
      - ./ssl:/etc/ssl/certs:ro
    depends_on:
      - web
    restart: unless-stopped
    networks:
      - app-network

volumes:
  postgres_data:
  static_volume:

networks:
  app-network:
    driver: bridge
```

**Advanced Compose features:**

**Environment-specific configurations:**
```yaml
# docker-compose.yml (base)
version: '3.8'
services:
  web:
    image: myapp:latest
    environment:
      - NODE_ENV=production

# docker-compose.override.yml (development overrides)
version: '3.8'
services:
  web:
    build: .
    volumes:
      - .:/app
    environment:
      - NODE_ENV=development
      - DEBUG=1
```

**Multiple Compose files:**
```bash
# Use multiple compose files
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up

# Environment-specific deployment
docker-compose --env-file .env.prod up
```

**Health checks:**
```yaml
services:
  web:
    image: nginx
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
```

**Resource limits:**
```yaml
services:
  web:
    image: myapp
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

## Docker Swarm

**What it is:** Docker's native orchestration tool that turns a group of Docker hosts into a single, virtual Docker host for deploying and managing containerized applications across multiple nodes.

**Why it matters:** Docker Swarm provides production-ready container orchestration with built-in load balancing, service discovery, rolling updates, and high availability without the complexity of Kubernetes.

**Swarm vs Kubernetes:**
- **Swarm** - Simpler, Docker-native, easier to learn and deploy
- **Kubernetes** - More features, larger ecosystem, steeper learning curve
- **Swarm** - Good for smaller deployments, Docker-centric environments
- **Kubernetes** - Better for large scale, complex orchestration needs

**Swarm concepts:**
- **Node** - Individual Docker host in the swarm
- **Manager nodes** - Control the swarm and schedule services
- **Worker nodes** - Execute containerized services
- **Service** - Definition of containers to run on the swarm
- **Task** - Individual container instance of a service
- **Stack** - Group of related services deployed together

**Common commands:**

**Swarm initialization:**
```bash
# Initialize swarm (on manager node)
docker swarm init --advertise-addr <manager-ip>

# Join worker nodes
docker swarm join --token <worker-token> <manager-ip>:2377

# Join additional managers
docker swarm join --token <manager-token> <manager-ip>:2377

# Get join tokens
docker swarm join-token worker
docker swarm join-token manager

# Leave swarm
docker swarm leave
docker swarm leave --force  # For manager nodes
```

**Node management:**
```bash
# List nodes
docker node ls

# Inspect node
docker node inspect <node-name>

# Update node availability
docker node update --availability drain <node-name>
docker node update --availability active <node-name>

# Add labels to nodes
docker node update --label-add environment=production <node-name>
docker node update --label-add storage=ssd <node-name>

# Remove node from swarm
docker node rm <node-name>
```

**Service management:**
```bash
# Create service
docker service create --name web --replicas 3 --publish 80:80 nginx

# List services
docker service ls

# Inspect service
docker service inspect web
docker service inspect --pretty web

# List service tasks
docker service ps web

# Scale service
docker service scale web=5
docker service update --replicas 10 web

# Update service
docker service update --image nginx:1.21 web
docker service update --env-add NEW_ENV=value web

# Remove service
docker service rm web
```

**Example Docker Stack (docker-compose for Swarm):**
```yaml
version: '3.8'

services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
    networks:
      - webnet
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      placement:
        constraints:
          - node.role == worker
          - node.labels.environment == production

  api:
    image: myapi:latest
    networks:
      - webnet
      - backend
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/myapp
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
    depends_on:
      - db

  db:
    image: postgres:13
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD_FILE=/run/secrets/db_password
    volumes:
      - db_data:/var/lib/postgresql/data
    networks:
      - backend
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.labels.storage == ssd
    secrets:
      - db_password

volumes:
  db_data:
    driver: local

networks:
  webnet:
    driver: overlay
  backend:
    driver: overlay
    internal: true

secrets:
  db_password:
    external: true
```

**Stack deployment:**
```bash
# Deploy stack
docker stack deploy -c docker-compose.yml myapp

# List stacks
docker stack ls

# List stack services
docker stack services myapp

# List stack tasks
docker stack ps myapp

# Remove stack
docker stack rm myapp
```

**Swarm networking:**
```bash
# Create overlay network
docker network create --driver overlay --attachable mynetwork

# List networks
docker network ls

# Connect service to network
docker service update --network-add mynetwork web
```

**Secrets management:**
```bash
# Create secret
echo "mysecretpassword" | docker secret create db_password -
docker secret create ssl_cert ./server.crt

# List secrets
docker secret ls

# Remove secret
docker secret rm db_password
```

**Rolling updates:**
```bash
# Update service with rolling update
docker service update \
  --image myapp:v2.0 \
  --update-parallelism 2 \
  --update-delay 10s \
  --update-failure-action rollback \
  myapp

# Rollback service
docker service rollback myapp
```

## Multi-Container Applications

**What they are:** Applications composed of multiple interconnected containers, each serving a specific purpose (web server, database, cache, etc.), working together as a cohesive system.

**Why they matter:** Multi-container architecture enables microservices patterns, separation of concerns, independent scaling, and technology diversity within a single application.

**Common patterns:**
- **Web + Database** - Frontend/backend with persistent storage
- **Microservices** - Multiple specialized services
- **Data pipeline** - ETL processes with multiple stages  
- **Monitoring stack** - Application + metrics + logs + dashboards

**Design principles:**
- **Single responsibility** - Each container serves one purpose
- **Loose coupling** - Services communicate through APIs
- **Stateless services** - Data stored externally or in dedicated containers
- **Service discovery** - Services find each other dynamically
- **Health checks** - Each service reports its health status

### **Example: Complete Web Application Stack**

**Application architecture:**
- **Frontend** - React application (nginx)
- **Backend API** - Node.js application
- **Database** - PostgreSQL
- **Cache** - Redis
- **Background jobs** - Worker processes
- **Reverse proxy** - Nginx load balancer

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  # Frontend - React app served by nginx
  frontend:
    build: 
      context: ./frontend
      dockerfile: Dockerfile.prod
    ports:
      - "3000:80"
    volumes:
      - ./frontend/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - api
    networks:
      - frontend-network
    restart: unless-stopped

  # Backend API - Node.js
  api:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/myapp
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET_FILE=/run/secrets/jwt_secret
    depends_on:
      - db
      - redis
    networks:
      - frontend-network
      - backend-network
    secrets:
      - jwt_secret
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  # Background worker
  worker:
    build: ./backend
    command: npm run worker
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/myapp
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    networks:
      - backend-network
    restart: unless-stopped

  # PostgreSQL database
  db:
    image: postgres:13
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    networks:
      - backend-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 30s
      timeout: 10s
      retries: 5
    restart: unless-stopped

  # Redis cache
  redis:
    image: redis:6-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - backend-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  # Nginx reverse proxy/load balancer
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/ssl/certs:ro
    depends_on:
      - frontend
      - api
    networks:
      - frontend-network
    restart: unless-stopped

  # Monitoring - Prometheus
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
    networks:
      - monitoring-network
      - backend-network
    restart: unless-stopped

  # Monitoring - Grafana
  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards:ro
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources:ro
    depends_on:
      - prometheus
    networks:
      - monitoring-network
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  prometheus_data:
  grafana_data:

networks:
  frontend-network:
    driver: bridge
  backend-network:
    driver: bridge
    internal: true  # No direct internet access
  monitoring-network:
    driver: bridge

secrets:
  jwt_secret:
    file: ./secrets/jwt_secret.txt
```

**Environment-specific overrides:**

**docker-compose.override.yml (development):**
```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    volumes:
      - ./frontend/src:/app/src
    environment:
      - REACT_APP_API_URL=http://localhost:5000

  api:
    volumes:
      - ./backend:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - DEBUG=1
    command: npm run dev

  worker:
    volumes:
      - ./backend:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
    command: npm run worker:dev
```

**docker-compose.prod.yml (production):**
```yaml
version: '3.8'

services:
  api:
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M

  worker:
    deploy:
      replicas: 2

  db:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

**Deployment commands:**
```bash
# Development
docker-compose up -d

# Production  
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Scaling specific services
docker-compose up -d --scale api=3 --scale worker=2

# View service status
docker-compose ps
docker-compose logs -f api
docker-compose top
```

**When you'll use them:** Docker Compose is essential for development environments and single-host deployments. Docker Swarm provides production orchestration for multi-host deployments without Kubernetes complexity. Multi-container patterns are fundamental for modern application architecture.