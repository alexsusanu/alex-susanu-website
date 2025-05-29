# Docker Commands & Troubleshooting

**Category:** DevOps  
**Tags:** docker, commands, troubleshooting, debugging, best-practices

## Essential Docker Commands
**What Docker CLI provides:** The primary interface for managing Docker containers, images, networks, and volumes, enabling complete container lifecycle management from a single command-line tool.

**Why mastering Docker commands matters:** Efficient Docker usage requires knowing the right commands for different situations - from basic container operations to advanced debugging and optimization tasks.

### **Container Management Commands**

**Running containers:**
```bash
# Basic container operations
docker run hello-world                             # Run simple container
docker run -it ubuntu bash                        # Interactive container with terminal
docker run -d nginx                               # Run in background (detached)
docker run --name my-nginx nginx                  # Assign custom name
docker run -p 8080:80 nginx                      # Port mapping
docker run -v /host/path:/container/path nginx    # Volume mounting
docker run -e ENV_VAR=value nginx                # Environment variables

# Advanced run options
docker run --rm nginx                             # Automatically remove when stopped
docker run --restart=always nginx                # Restart policy
docker run --memory=512m --cpus=1.5 nginx       # Resource limits
docker run --network=host nginx                  # Use host networking
docker run --user 1000:1000 nginx               # Run as specific user
docker run --read-only nginx                     # Read-only filesystem
docker run --tmpfs /tmp nginx                    # Temporary filesystem
```

**Container lifecycle:**
```bash
# List containers
docker ps                                         # Running containers
docker ps -a                                     # All containers (including stopped)
docker ps -q                                     # Only container IDs
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"  # Custom format

# Start/stop containers
docker start <container-id>                      # Start stopped container
docker stop <container-id>                       # Graceful stop
docker kill <container-id>                       # Force stop
docker restart <container-id>                    # Restart container
docker pause <container-id>                      # Pause container
docker unpause <container-id>                    # Unpause container

# Remove containers
docker rm <container-id>                         # Remove stopped container
docker rm -f <container-id>                      # Force remove running container
docker rm $(docker ps -aq)                       # Remove all containers
docker container prune                           # Remove all stopped containers
```

**Container interaction:**
```bash
# Execute commands in running containers
docker exec <container-id> ls /                  # Run single command
docker exec -it <container-id> bash              # Interactive shell
docker exec -u root <container-id> bash          # Execute as different user
docker exec -w /app <container-id> ls            # Change working directory

# Copy files between host and container
docker cp file.txt <container-id>:/path/file.txt # Copy to container
docker cp <container-id>:/path/file.txt ./       # Copy from container
docker cp <container-id>:/app/logs ./logs        # Copy directory

# View container information
docker inspect <container-id>                    # Detailed container info
docker logs <container-id>                       # Container logs
docker logs -f <container-id>                    # Follow logs
docker logs --tail 100 <container-id>            # Last 100 lines
docker logs --since 2h <container-id>            # Logs from last 2 hours
docker stats <container-id>                      # Resource usage stats
docker top <container-id>                        # Running processes
docker diff <container-id>                       # Filesystem changes
docker port <container-id>                       # Port mappings
```

### **Image Management Commands**

**Working with images:**
```bash
# List and search images
docker images                                     # List local images
docker images -a                                 # Include intermediate images
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"  # Custom format
docker search nginx                              # Search Docker Hub

# Pull and push images
docker pull nginx:latest                         # Pull image from registry
docker pull nginx:1.21                          # Pull specific tag
docker push myusername/myapp:v1.0               # Push to registry
docker tag nginx:latest myregistry.com/nginx    # Tag image

# Build images
docker build .                                   # Build from current directory
docker build -t myapp:v1.0 .                   # Build with tag
docker build -f Dockerfile.prod .              # Use specific Dockerfile
docker build --no-cache .                      # Build without cache
docker build --build-arg VERSION=1.0 .         # Pass build arguments
docker build --target production .             # Multi-stage build target

# Remove images
docker rmi <image-id>                           # Remove image
docker rmi -f <image-id>                        # Force remove
docker image prune                              # Remove unused images
docker image prune -a                          # Remove all unused images
docker system prune -a                         # Remove everything unused
```

**Image inspection:**
```bash
docker inspect <image-id>                       # Detailed image info
docker history <image-id>                      # Image layer history
docker manifest inspect <image>                # Image manifest
```

### **Network Management Commands**

**Docker networking:**
```bash
# List and inspect networks
docker network ls                               # List networks
docker network inspect bridge                  # Inspect network details

# Create and manage networks
docker network create mynetwork                # Create bridge network
docker network create --driver host mynet      # Create host network
docker network create --subnet=172.20.0.0/16 mynet  # Custom subnet
docker network create --attachable mynet       # Allow manual attachment

# Connect containers to networks
docker network connect mynetwork <container>   # Connect running container
docker run --network=mynetwork nginx          # Connect at startup
docker network disconnect mynetwork <container> # Disconnect container

# Remove networks
docker network rm mynetwork                    # Remove network
docker network prune                          # Remove unused networks
```

### **Volume Management Commands**

**Data persistence:**
```bash
# List and inspect volumes
docker volume ls                               # List volumes
docker volume inspect myvolume                # Volume details

# Create and manage volumes
docker volume create myvolume                 # Create named volume
docker volume create --driver local myvolume  # Specify driver
docker run -v myvolume:/data nginx           # Use named volume
docker run -v /host/path:/container/path nginx # Bind mount

# Remove volumes
docker volume rm myvolume                     # Remove volume
docker volume prune                          # Remove unused volumes
```

### **System Management Commands**

**Docker system operations:**
```bash
# System information
docker version                                # Docker version info
docker info                                  # System-wide information
docker system df                             # Disk usage
docker system events                         # Real-time events

# Cleanup operations
docker system prune                          # Remove unused data
docker system prune -a                       # Remove all unused data
docker system prune --volumes               # Include volumes
docker system prune --filter "until=24h"    # Prune older than 24h
```

## Advanced Docker Commands

### **Docker Compose Integration**
```bash
# Multi-container applications
docker-compose up                            # Start services
docker-compose up -d                         # Start in background
docker-compose down                          # Stop and remove
docker-compose logs                          # View logs
docker-compose ps                            # List services
docker-compose exec web bash                # Execute in service
docker-compose build                         # Build services
docker-compose pull                          # Pull service images
```

### **Registry Operations**
```bash
# Working with registries
docker login                                 # Login to Docker Hub
docker login myregistry.com                 # Login to private registry
docker logout                               # Logout
docker save -o myimage.tar myimage:tag      # Export image to tar
docker load -i myimage.tar                  # Import image from tar
docker export <container> > backup.tar      # Export container filesystem
docker import backup.tar myimage:imported   # Import filesystem as image
```

## Troubleshooting & Debugging

### **Common Issues and Solutions**

**Container won't start:**
```bash
# Debug startup issues
docker logs <container-id>                   # Check logs for errors
docker inspect <container-id>               # Check configuration
docker run --rm -it <image> sh              # Test image interactively
docker run --entrypoint="" -it <image> sh   # Override entrypoint
```

**Port binding issues:**
```bash
# Check port conflicts
netstat -tlnp | grep :8080                  # Check if port is in use
docker port <container-id>                  # Show port mappings
docker run -P nginx                         # Auto-assign ports
lsof -i :8080                              # Find process using port
```

**Resource problems:**
```bash
# Monitor resource usage
docker stats                                # Real-time resource usage
docker system df -v                        # Detailed disk usage
docker logs --details <container-id>        # Detailed logs
free -h                                     # Check host memory
df -h                                       # Check host disk space
```

**Network connectivity:**
```bash
# Debug networking
docker network ls                           # List networks
docker exec <container> ping google.com     # Test external connectivity
docker exec <container> nslookup service    # DNS resolution
docker exec <container> netstat -tlnp       # Port listening
docker run --rm nicolaka/netshoot          # Network debugging tools
```

**Permission issues:**
```bash
# Fix permission problems
docker exec -u root <container> chown -R user:group /path  # Fix ownership
docker run --user $(id -u):$(id -g) <image>  # Run as current user
docker run -v /etc/passwd:/etc/passwd:ro <image>  # Share user info
```

**Image and container cleanup:**
```bash
# Clean up space
docker system prune -a --volumes            # Nuclear cleanup
docker images | grep "<none>" | awk '{print $3}' | xargs docker rmi  # Remove dangling images
docker ps -a | grep Exited | awk '{print $1}' | xargs docker rm      # Remove exited containers
```

## Best Practices

### **Security Considerations**
```bash
# Run containers securely
docker run --read-only --tmpfs /tmp <image>  # Read-only filesystem
docker run --security-opt no-new-privileges <image>  # Prevent privilege escalation
docker run --cap-drop=ALL --cap-add=NET_BIND_SERVICE <image>  # Minimal capabilities
docker run --user 1000:1000 <image>         # Non-root user
```

### **Performance Optimization**
```bash
# Optimize resource usage
docker run --memory=512m --memory-swap=512m <image>  # Limit memory
docker run --cpus=1.5 <image>               # Limit CPU
docker run --pids-limit=100 <image>         # Limit processes
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"  # Monitor performance
```

### **Health Checks**
```bash
# Container health monitoring
docker run --health-cmd="curl -f http://localhost/ || exit 1" \
           --health-interval=30s \
           --health-timeout=10s \
           --health-retries=3 \
           nginx

# Check container health
docker inspect --format='{{.State.Health.Status}}' <container>
```

### **Logging Best Practices**
```bash
# Configure logging
docker run --log-driver=json-file --log-opt max-size=10m --log-opt max-file=3 <image>
docker run --log-driver=syslog --log-opt syslog-address=tcp://192.168.1.3:514 <image>
docker run --log-driver=none <image>        # Disable logging
```

## Quick Reference Commands

### **Emergency Debugging**
```bash
# When everything goes wrong
docker ps -a                                # What's running/stopped?
docker logs <container-id>                  # What went wrong?
docker inspect <container-id>               # How is it configured?
docker exec -it <container-id> bash         # Get inside to investigate
docker stats                                # Resource usage issues?
docker system df                            # Out of space?
docker system prune -a                      # Clean everything
```

### **Daily Operations**
```bash
# Common daily commands
docker ps                                   # Check running containers
docker images                              # Check available images
docker logs -f <container>                  # Follow logs
docker exec -it <container> bash           # Access container
docker-compose up -d                        # Start application stack
docker system prune                        # Regular cleanup
```

### **Useful Aliases**
```bash
# Add to ~/.bashrc or ~/.zshrc
alias dps='docker ps'
alias dpsa='docker ps -a'
alias di='docker images'
alias dlog='docker logs'
alias dexec='docker exec -it'
alias dclean='docker system prune -a'
alias dcu='docker-compose up -d'
alias dcd='docker-compose down'
```