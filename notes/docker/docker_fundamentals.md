# Docker Fundamentals
category: DevOps
tags: docker, containers, images, dockerfile, registry

## Container

**What it is:** A lightweight, standalone package that includes everything needed to run an application: code, runtime, system tools, libraries, and settings.

**Why it matters:** Containers solve the "it works on my machine" problem by providing consistent environments across development, testing, and production. They're the foundation of modern application deployment and microservices architecture.

**Key characteristics:**
- **Isolation** - Containers are isolated from each other and the host system
- **Portability** - Run anywhere Docker is installed, regardless of underlying OS
- **Efficiency** - Share the host OS kernel, much lighter than virtual machines
- **Immutable** - Containers don't change; new versions create new containers
- **Stateless** - Data should be stored outside the container for persistence

**Container vs Virtual Machine:**
- **Containers** - Share OS kernel, faster startup, less resource usage
- **VMs** - Full OS per instance, stronger isolation, more overhead
- **Use cases** - Containers for applications, VMs for different OS requirements

**Container lifecycle:**
- **Created** - Container exists but hasn't started
- **Running** - Container is executing
- **Paused** - Container processes are suspended
- **Stopped** - Container has finished executing
- **Deleted** - Container and its filesystem are removed

**Common commands:**
```bash
# Running containers
docker run nginx                              # Run nginx container
docker run -d nginx                           # Run in background (detached)
docker run -p 8080:80 nginx                  # Map host port 8080 to container port 80
docker run -it ubuntu bash                   # Interactive terminal
docker run --name my-nginx nginx             # Assign custom name
docker run -e ENV_VAR=value myapp            # Set environment variable

# Managing containers
docker ps                                    # List running containers
docker ps -a                                 # List all containers (including stopped)
docker stop <container-id>                   # Stop running container
docker start <container-id>                  # Start stopped container
docker restart <container-id>                # Restart container
docker rm <container-id>                     # Remove container
docker rm -f <container-id>                  # Force remove running container

# Interacting with containers
docker exec -it <container-id> bash          # Shell into running container
docker logs <container-id>                   # View container logs
docker logs -f <container-id>                # Follow logs in real-time
docker inspect <container-id>                # Detailed container information
docker stats                                 # Real-time resource usage
docker top <container-id>                    # Running processes in container
```

**Resource management:**
```bash
# Limit CPU and memory
docker run --cpus="1.5" --memory="512m" nginx

# Set restart policy
docker run --restart=always nginx            # Always restart
docker run --restart=unless-stopped nginx   # Restart unless manually stopped
docker run --restart=on-failure:3 nginx     # Restart up to 3 times on failure
```

**When you'll use it:** Every Docker workflow involves running and managing containers. Daily operations include starting, stopping, monitoring, and troubleshooting containers.

## Image

**What it is:** Read-only template used to create containers, containing application code, runtime, system tools, libraries, and configuration files.

**Why it matters:** Images are the blueprints for containers. They ensure consistency across environments, enable easy sharing and distribution of applications, and form the basis of container deployment strategies.

**Image structure:**
- **Layers** - Images are built in layers for efficiency and reusability
- **Base layer** - Starting point (often OS like Ubuntu, Alpine, or scratch)
- **Application layers** - Code, dependencies, configuration added on top
- **Metadata** - Information about the image (creation date, author, etc.)

**Image naming:**
- **Repository** - Name of the image (nginx, ubuntu, myapp)
- **Tag** - Version or variant (latest, v1.0, alpine)
- **Registry** - Where image is stored (docker.io, gcr.io, private registry)
- **Full name** - `registry/repository:tag` (docker.io/nginx:1.21)

**Image layers and caching:**
- **Layer sharing** - Multiple images can share common layers
- **Copy-on-write** - Containers share image layers until they write to them
- **Build cache** - Docker reuses layers when building similar images
- **Layer optimization** - Order Dockerfile commands to maximize cache hits

**Common commands:**
```bash
# Image management
docker images                                # List local images
docker images -a                             # List all images (including intermediate)
docker pull nginx:1.21                       # Download image from registry
docker push myapp:v1.0                      # Upload image to registry
docker rmi <image-id>                        # Remove image
docker rmi $(docker images -q)              # Remove all images

# Image information
docker inspect <image-id>                    # Detailed image information
docker history <image-id>                    # Show image layer history
docker image ls --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"  # Custom format

# Building images
docker build -t myapp:v1.0 .                # Build image from Dockerfile
docker build -t myapp:v1.0 -f Custom.dockerfile .  # Use custom Dockerfile
docker build --no-cache -t myapp:v1.0 .     # Build without cache
docker build --target production -t myapp:v1.0 .    # Multi-stage build target

# Image cleanup
docker image prune                           # Remove unused images
docker image prune -a                        # Remove all unused images
docker system prune                          # Remove unused containers, images, networks
```

**Image registry operations:**
```bash
# Docker Hub (default registry)
docker login                                 # Login to Docker Hub
docker logout                               # Logout
docker search nginx                          # Search for images
docker pull nginx:alpine                     # Pull specific tag

# Private registries
docker login registry.company.com           # Login to private registry
docker tag myapp:v1.0 registry.company.com/myapp:v1.0  # Tag for private registry
docker push registry.company.com/myapp:v1.0 # Push to private registry
```

**When you'll use it:** Images are central to Docker - you'll pull base images, build custom images, manage image versions, and distribute images for deployment.

## Dockerfile

**What it is:** Text file containing instructions to build a Docker image automatically, defining the environment and steps needed to create a container image.

**Why it matters:** Dockerfiles provide reproducible, version-controlled way to build images. They document exactly how an application environment is constructed and enable automated image builds in CI/CD pipelines.

**Common Dockerfile instructions:**
- **FROM** - Specify base image
- **RUN** - Execute commands during build
- **COPY/ADD** - Copy files from host to image
- **WORKDIR** - Set working directory
- **EXPOSE** - Document which ports the container listens on
- **ENV** - Set environment variables
- **CMD** - Default command when container starts
- **ENTRYPOINT** - Configures container to run as executable

**Dockerfile best practices:**
- **Use specific base image tags** - Avoid 'latest' for predictability
- **Minimize layers** - Combine RUN commands with &&
- **Order instructions by change frequency** - Least changing first
- **Use .dockerignore** - Exclude unnecessary files from build context
- **Don't run as root** - Create and use non-root user
- **Multi-stage builds** - Reduce final image size

**Example Dockerfile (Node.js app):**
```dockerfile
# Use specific Node.js version
FROM node:16-alpine

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy application code
COPY . .

# Change ownership to non-root user
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Default command
CMD ["npm", "start"]
```

**Multi-stage Dockerfile example:**
```dockerfile
# Build stage
FROM node:16-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:16-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY --from=builder /app/dist ./dist
USER node
CMD ["npm", "start"]
```

**Common commands:**
```bash
# Building images
docker build -t myapp:v1.0 .                # Build from Dockerfile in current directory
docker build -t myapp:v1.0 -f prod.dockerfile .  # Use specific Dockerfile
docker build --build-arg VERSION=1.0 -t myapp .  # Pass build arguments
docker build --target builder -t myapp:build .    # Build specific stage

# Build with context
docker build -t myapp https://github.com/user/repo.git  # Build from Git repo
docker build -t myapp - < Dockerfile         # Build from stdin

# Debugging builds
docker build --no-cache -t myapp .          # Build without cache
docker build --progress=plain -t myapp .    # Show build output
```

**Dockerfile optimization tips:**
- **Layer caching** - Structure commands to maximize cache reuse
- **Minimize image size** - Use Alpine base images, remove unnecessary packages
- **Security** - Don't include secrets, use non-root users, scan for vulnerabilities
- **Build context** - Use .dockerignore to exclude unnecessary files

**When you'll use it:** Every custom Docker image needs a Dockerfile. You'll write Dockerfiles for applications, modify existing ones, and optimize them for build speed and image size.

## Registry

**What it is:** Centralized storage and distribution system for Docker images, allowing teams to share, version, and deploy container images.

**Why it matters:** Registries enable image sharing across teams and environments, provide version control for container images, and integrate with CI/CD pipelines for automated deployment.

**Types of registries:**
- **Public registries** - Docker Hub, Quay.io, GitHub Container Registry
- **Private cloud registries** - AWS ECR, Google GCR, Azure ACR
- **Self-hosted registries** - Harbor, GitLab Container Registry, Sonatype Nexus
- **Local registries** - For development and testing

**Docker Hub (default registry):**
- **Official images** - Maintained by Docker (nginx, ubuntu, postgres)
- **Verified publishers** - Images from trusted organizations
- **Community images** - User-contributed images
- **Automated builds** - Build images from GitHub/Bitbucket repositories
- **Webhooks** - Trigger actions when images are pushed

**Registry concepts:**
- **Repository** - Collection of related images (nginx repository contains various nginx versions)
- **Tag** - Version or variant identifier (latest, v1.0, alpine)
- **Manifest** - Metadata about image layers and configuration
- **Digest** - Immutable identifier for specific image version (sha256:abc123...)

**Common commands:**
```bash
# Registry authentication
docker login                                 # Login to Docker Hub
docker login registry.company.com           # Login to private registry
docker logout                              # Logout from registry

# Image operations
docker pull nginx:1.21                      # Pull specific image version
docker pull nginx                           # Pull latest version
docker push myapp:v1.0                      # Push image to registry
docker search nginx                         # Search Docker Hub

# Image naming and tagging
docker tag myapp:v1.0 myregistry.com/myapp:v1.0     # Tag for different registry
docker tag myapp:v1.0 myapp:latest          # Add additional tag

# Registry inspection
docker inspect nginx:1.21                   # View image details
docker manifest inspect nginx:1.21          # View manifest (if supported)
```

**Private registry setup (simple):**
```bash
# Run local registry
docker run -d -p 5000:5000 --name registry registry:2

# Tag and push to local registry
docker tag myapp:v1.0 localhost:5000/myapp:v1.0
docker push localhost:5000/myapp:v1.0

# Pull from local registry
docker pull localhost:5000/myapp:v1.0
```

**Registry security:**
- **Authentication** - Username/password, tokens, certificates
- **Authorization** - Role-based access control (RBAC)
- **Image scanning** - Vulnerability detection in images
- **Content trust** - Digital signing of images
- **Network security** - TLS encryption, private networks

**CI/CD integration:**
- **Automated builds** - Trigger builds on code changes
- **Image promotion** - Move images through environments (dev → staging → prod)
- **Deployment triggers** - Automatically deploy when new images are pushed
- **Security scanning** - Scan images before deployment

**When you'll use it:** Every Docker workflow involves registries - pulling base images, pushing custom images, managing image versions, and distributing images for deployment across environments.