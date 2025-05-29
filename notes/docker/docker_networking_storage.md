# Docker Networking & Storage
category: DevOps
tags: docker, networking, volumes, storage, ports, bind-mounts

## Docker Networks

**What it is:** Docker's networking system that allows containers to communicate with each other and the outside world through various network drivers and configurations.

**Why it matters:** Proper networking is essential for container communication, security isolation, and connecting containerized applications to external services. Understanding Docker networking helps you design secure, scalable container architectures.

**Default networks:**
- **bridge** - Default network for containers on single host
- **host** - Container uses host's network stack directly
- **none** - Container has no network access

**Network types:**
- **Bridge networks** - Isolated networks on single Docker host
- **Overlay networks** - Multi-host networking for Docker Swarm
- **Macvlan networks** - Assign MAC addresses to containers
- **Host networks** - Direct access to host networking
- **None networks** - Completely isolated containers

**Common commands:**
```bash
# Network management
docker network ls                                   # List all networks
docker network inspect <network-name>              # Detailed network info
docker network create <network-name>               # Create custom network
docker network rm <network-name>                   # Remove network
docker network prune                               # Remove unused networks

# Container network operations
docker run --network=<network-name> nginx          # Connect to specific network
docker network connect <network-name> <container>  # Connect running container
docker network disconnect <network-name> <container> # Disconnect container

# Network troubleshooting
docker exec <container> ping <target>              # Test connectivity
docker exec <container> netstat -tlnp              # Check listening ports
docker exec <container> nslookup <hostname>        # DNS resolution test
```

### **Bridge Networks (Default)**

**What it is:** Software-defined network that allows containers on the same Docker host to communicate with each other.

**How it works:**
- **Virtual bridge** - Docker creates virtual network interface (docker0)
- **Container interfaces** - Each container gets virtual ethernet interface
- **IP allocation** - Containers get IP addresses from bridge subnet
- **NAT translation** - Outbound traffic is NAT'd through host IP

**Default bridge limitations:**
- **No automatic DNS** - Containers can't resolve each other by name
- **All containers connected** - No network isolation between containers
- **Legacy networking** - Older, less flexible approach

**Custom bridge networks:**
```bash
# Create custom bridge network
docker network create my-network

# Run containers on custom network
docker run -d --name web --network my-network nginx
docker run -d --name db --network my-network postgres

# Containers can communicate by name
docker exec web ping db  # This works with custom networks
```

**Example bridge network configuration:**
```bash
# Create network with custom subnet
docker network create \
  --driver bridge \
  --subnet=172.20.0.0/16 \
  --ip-range=172.20.240.0/20 \
  --gateway=172.20.0.1 \
  my-custom-network

# Run container with static IP
docker run -d \
  --name web-server \
  --network my-custom-network \
  --ip 172.20.240.10 \
  nginx
```

### **Host Networks**

**What it is:** Container uses the host's network stack directly, without network isolation.

**When to use:**
- **High performance** - No network virtualization overhead
- **Direct port access** - Container services accessible on host ports
- **Network tools** - Containers needing raw network access
- **Legacy applications** - Apps expecting specific network behavior

**Limitations:**
- **No isolation** - Container has full network access
- **Port conflicts** - Multiple containers can't use same ports
- **Security concerns** - Less isolation between containers and host

**Example:**
```bash
# Run container with host networking
docker run -d --network host nginx

# Container binds directly to host port 80
curl localhost:80  # Accesses nginx directly
```

### **Overlay Networks**

**What it is:** Multi-host network that allows containers on different Docker hosts to communicate securely.

**Use cases:**
- **Docker Swarm** - Multi-node cluster networking
- **Microservices** - Services across multiple hosts
- **Load balancing** - Distribute containers across nodes

**Features:**
- **Encryption** - Traffic encrypted between hosts
- **Service discovery** - Built-in DNS for service names
- **Load balancing** - Automatic load balancing for services

**Example (Docker Swarm):**
```bash
# Create overlay network
docker network create --driver overlay my-overlay

# Deploy service across multiple nodes
docker service create \
  --name web-service \
  --network my-overlay \
  --replicas 3 \
  nginx
```

## Port Mapping

**What it is:** Mechanism to expose container ports to the host system or external networks, allowing external access to containerized applications.

**Why it matters:** Containers run in isolated networks by default. Port mapping creates pathways for external traffic to reach container services, enabling web servers, APIs, and other services to be accessible.

**Port mapping syntax:**
- **-p host_port:container_port** - Map specific host port to container port
- **-p container_port** - Map container port to random host port
- **-P** - Publish all exposed ports to random host ports

**Common commands:**
```bash
# Port mapping examples
docker run -p 8080:80 nginx                        # Host port 8080 → container port 80
docker run -p 80:80 -p 443:443 nginx              # Multiple port mappings
docker run -p 127.0.0.1:8080:80 nginx             # Bind to specific host interface
docker run -P nginx                                # Publish all exposed ports randomly

# Port inspection
docker port <container-name>                       # Show port mappings
docker ps                                         # Shows port mappings in output
netstat -tlnp | grep docker                       # Host ports used by Docker
```

**Advanced port mapping:**
```bash
# Bind to specific interface
docker run -p 192.168.1.100:8080:80 nginx

# UDP port mapping
docker run -p 53:53/udp my-dns-server

# Range of ports
docker run -p 8000-8010:8000-8010 my-app

# Random port assignment
docker run -p 80 nginx  # Docker assigns random host port
```

**Port mapping in Docker Compose:**
```yaml
version: '3.8'
services:
  web:
    image: nginx
    ports:
      - "8080:80"        # host:container
      - "443:443"
      - "80"             # random host port
    expose:
      - "9000"           # Internal port (not mapped to host)
```

**Security considerations:**
- **Bind to localhost** - Use 127.0.0.1:port for local-only access
- **Firewall rules** - Configure host firewall appropriately
- **Least privilege** - Only expose necessary ports
- **Non-root ports** - Use ports > 1024 when possible

## Volumes

**What it is:** Docker's mechanism for persisting data generated by and used by containers, providing persistent storage that survives container lifecycle.

**Why it matters:** Containers are ephemeral - when they're removed, all data inside is lost. Volumes provide data persistence, enable data sharing between containers, and allow data to outlive container lifecycles.

**Volume types:**
- **Named volumes** - Managed by Docker, stored in Docker area
- **Bind mounts** - Mount host directory into container
- **tmpfs mounts** - Temporary storage in memory (Linux only)
- **Volume plugins** - Third-party storage drivers

**Volume vs Bind Mount vs tmpfs:**
- **Volumes** - Docker managed, portable, better performance
- **Bind mounts** - Direct host path access, less portable
- **tmpfs** - Memory storage, fast but temporary

**Common commands:**
```bash
# Volume management
docker volume ls                                    # List all volumes
docker volume create <volume-name>                 # Create named volume
docker volume inspect <volume-name>                # Volume details
docker volume rm <volume-name>                     # Remove volume
docker volume prune                                # Remove unused volumes

# Using volumes with containers
docker run -v <volume-name>:/path/in/container nginx    # Named volume
docker run -v /host/path:/container/path nginx          # Bind mount
docker run --tmpfs /tmp nginx                           # tmpfs mount

# Volume inspection
docker exec <container> df -h                      # Check mounted filesystems
docker exec <container> ls -la /path/to/volume     # List volume contents
```

### **Named Volumes**

**What they are:** Docker-managed volumes stored in Docker's storage area, providing the best way to persist data.

**Advantages:**
- **Docker managed** - Docker handles storage location and management
- **Portable** - Work across different host systems
- **Performance** - Optimized for container I/O
- **Backup friendly** - Easy to backup and restore
- **Permission handling** - Docker manages permissions automatically

**Examples:**
```bash
# Create and use named volume
docker volume create my-data
docker run -d -v my-data:/var/lib/mysql mysql:8.0

# Volume with specific driver options
docker volume create \
  --driver local \
  --opt type=nfs \
  --opt o=addr=192.168.1.100,rw \
  --opt device=:/path/to/dir \
  nfs-volume
```

### **Bind Mounts**

**What they are:** Direct mounting of host filesystem paths into containers.

**Use cases:**
- **Development** - Share source code with container
- **Configuration** - Mount config files from host
- **Logs** - Direct access to container logs
- **Shared data** - Multiple containers accessing same host data

**Examples:**
```bash
# Bind mount examples
docker run -v /host/source:/container/source node:16    # Source code mounting
docker run -v /host/config:/etc/app/config my-app      # Configuration mounting
docker run -v /var/log:/app/logs my-app                # Log directory mounting

# Read-only bind mount
docker run -v /host/data:/container/data:ro nginx

# Bind mount with specific options
docker run --mount type=bind,source=/host/path,target=/container/path,readonly nginx
```

**Bind mount considerations:**
- **Host dependency** - Relies on specific host paths
- **Permission issues** - Host/container user ID mismatches
- **Security** - Container has direct host filesystem access
- **Portability** - Less portable across different hosts

### **Volume Plugins**

**What they are:** Third-party storage drivers that extend Docker's storage capabilities.

**Popular plugins:**
- **NFS** - Network File System storage
- **GlusterFS** - Distributed file system
- **Ceph** - Distributed storage system
- **AWS EBS** - Amazon Elastic Block Store
- **Azure File** - Azure cloud storage

**Example NFS volume:**
```bash
# Install NFS plugin
docker plugin install store/sumologic/docker-volume-driver:1.0.0

# Create NFS volume
docker volume create \
  --driver sumologic/docker-volume-driver:1.0.0 \
  --opt server=nfs.example.com \
  --opt share=/exports/data \
  nfs-data
```

## Bind Mounts

**What they are:** Method of mounting files or directories from the host machine into containers, creating a direct link between host and container filesystems.

**Why use them:** Bind mounts provide direct access to host files, enable real-time development workflows, and allow containers to interact with existing host data without copying.

**Bind mount characteristics:**
- **Direct host access** - Container sees live host filesystem
- **Bidirectional** - Changes in container affect host and vice versa
- **Performance** - Direct filesystem access, no copy overhead
- **Host dependent** - Relies on specific host paths existing

**Bind mount syntax:**
```bash
# Basic bind mount
docker run -v /host/path:/container/path image

# Using --mount (preferred, more explicit)
docker run --mount type=bind,source=/host/path,target=/container/path image

# Read-only bind mount
docker run -v /host/path:/container/path:ro image
docker run --mount type=bind,source=/host/path,target=/container/path,readonly image
```

**Development workflow example:**
```bash
# Mount source code for live development
docker run -d \
  --name dev-container \
  -v $(pwd):/app \
  -w /app \
  -p 3000:3000 \
  node:16 \
  npm run dev

# Changes to host files immediately reflected in container
```

**Configuration management:**
```bash
# Mount configuration files
docker run -d \
  --name web-server \
  -v /host/nginx.conf:/etc/nginx/nginx.conf:ro \
  -v /host/ssl-certs:/etc/ssl/certs:ro \
  -p 80:80 -p 443:443 \
  nginx

# Mount environment-specific configs
docker run -d \
  -v /etc/myapp/prod.conf:/app/config.conf:ro \
  my-application
```

**Log file access:**
```bash
# Mount log directory for direct access
docker run -d \
  --name app-server \
  -v /var/log/myapp:/app/logs \
  my-application

# Host can directly access logs at /var/log/myapp
tail -f /var/log/myapp/application.log
```

**Bind mount best practices:**
- **Use absolute paths** - Avoid relative paths for consistency
- **Consider permissions** - Match user IDs between host and container
- **Use read-only** - Mount configs and static files as read-only
- **Security awareness** - Containers can modify host files
- **Documentation** - Document host path requirements clearly

**Permission handling:**
```bash
# Run container with specific user ID
docker run -u $(id -u):$(id -g) -v $(pwd):/app my-app

# Fix ownership issues
docker run -v /host/data:/data alpine chown -R 1000:1000 /data
```

**Troubleshooting bind mounts:**
```bash
# Check if path exists on host
ls -la /host/path

# Inspect container mounts
docker inspect <container> | grep -A 10 "Mounts"

# Test file permissions
docker exec <container> ls -la /mounted/path
docker exec <container> touch /mounted/path/test-file
```

**When you'll use them:** Development environments, configuration management, log file access, sharing data between host and containers, and any scenario requiring direct host filesystem access.