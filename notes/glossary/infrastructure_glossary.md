# Infrastructure & Networking Glossary
category: DevOps
tags: glossary, infrastructure, networking, servers, cloud

## Server

**What it is:** A computer or software program that provides services, data, or resources to other computers (clients) over a network.

**Why it matters:** Servers are the backbone of the internet. They host websites, store data, process requests, and enable communication between applications and users.

**Types:**
- **Web Server** - Serves web pages (Apache, Nginx)
- **Database Server** - Manages databases (MySQL, PostgreSQL)
- **Application Server** - Runs business logic (Tomcat, Node.js)
- **File Server** - Stores and shares files
- **Mail Server** - Handles email (Exchange, Postfix)

**Physical vs Virtual:**
- **Physical Server** - Dedicated hardware machine
- **Virtual Server (VM)** - Software-based server running on physical hardware
- **Container** - Lightweight virtualization (Docker)

**When you'll encounter it:** Every web application needs servers. Understanding server architecture is crucial for deployment and scaling.

## Cloud Computing

**What it is:** Delivery of computing services (servers, storage, databases, networking) over the internet ("the cloud").

**Why it matters:** Cloud computing eliminates the need to buy and maintain physical hardware, provides scalability on demand, and enables global deployment with reduced costs and complexity.

**Service Models:**
- **IaaS** (Infrastructure as a Service) - Virtual machines, storage (AWS EC2, Azure VMs)
- **PaaS** (Platform as a Service) - Development platforms (Heroku, Google App Engine)
- **SaaS** (Software as a Service) - Ready-to-use applications (Gmail, Salesforce)

**Major Providers:**
- **AWS** - Amazon Web Services (market leader)
- **Azure** - Microsoft's cloud platform
- **GCP** - Google Cloud Platform
- **DigitalOcean** - Developer-friendly, simpler pricing

**Key Benefits:**
- **Scalability** - Scale up/down based on demand
- **Cost-effective** - Pay only for what you use
- **Global reach** - Deploy worldwide instantly
- **Reliability** - Built-in redundancy and backups

**When you'll use it:** Most modern applications use cloud services for hosting, storage, or additional functionality.

## Docker & Containers

**What it is:** Docker is a platform that packages applications and their dependencies into lightweight, portable containers.

**Why it matters:** Containers solve the "it works on my machine" problem by ensuring applications run consistently across different environments. They're faster than VMs and enable microservices architecture.

**Key Concepts:**
- **Container** - Running instance of an image
- **Image** - Template containing application code and dependencies
- **Dockerfile** - Instructions to build an image
- **Registry** - Storage for images (Docker Hub)

**Benefits:**
- **Consistency** - Same environment everywhere
- **Isolation** - Applications don't interfere with each other
- **Efficiency** - Lighter than virtual machines
- **Scalability** - Easy to replicate and scale

**Common Commands:**
```bash
docker build -t myapp .        # Build image
docker run -p 8080:80 myapp    # Run container
docker ps                      # List running containers
docker stop container_id       # Stop container
```

**When you'll use it:** Modern development workflows, microservices, CI/CD pipelines, and cloud deployments.

## Load Balancer

**What it is:** A device or software that distributes incoming network traffic across multiple servers.

**Why it matters:** Load balancers prevent any single server from becoming overwhelmed, improve application availability, and enable horizontal scaling.

**Types:**
- **Layer 4 (Transport)** - Routes based on IP and port
- **Layer 7 (Application)** - Routes based on content (HTTP headers, URLs)

**Algorithms:**
- **Round Robin** - Requests distributed sequentially
- **Least Connections** - Routes to server with fewest active connections
- **IP Hash** - Routes based on client IP
- **Weighted** - Different servers handle different loads

**Benefits:**
- **High Availability** - If one server fails, others continue
- **Scalability** - Add more servers to handle increased load
- **Performance** - Distribute load evenly
- **Flexibility** - Route traffic based on various criteria

**When you'll use it:** Any application expecting significant traffic or requiring high availability.

## CDN (Content Delivery Network)

**What it is:** A network of geographically distributed servers that deliver web content to users from the nearest location.

**Why it matters:** CDNs dramatically improve website performance by reducing latency, decrease server load, and provide better user experience globally.

**How it works:**
1. User requests a file (image, CSS, JavaScript)
2. CDN serves it from the nearest edge server
3. If not cached, CDN fetches from origin server
4. File is cached for future requests

**Popular CDNs:**
- **Cloudflare** - Free tier available, security features
- **AWS CloudFront** - Integrated with AWS services
- **Fastly** - Real-time analytics, edge computing
- **KeyCDN** - Simple, affordable

**Benefits:**
- **Faster loading** - Content served from nearby servers
- **Reduced bandwidth costs** - Less load on origin server
- **Global reach** - Consistent performance worldwide
- **DDoS protection** - Distributed traffic absorption

**When you'll use it:** Websites with global users, media-heavy sites, or any application prioritizing performance.

## DNS (Domain Name System)

**What it is:** The system that translates human-readable domain names (google.com) into IP addresses (142.250.80.14) that computers use.

**Why it matters:** DNS is fundamental to how the internet works. Without it, we'd have to remember IP addresses for every website.

**How it works:**
1. You type "google.com" in browser
2. Browser asks DNS resolver "What's the IP for google.com?"
3. DNS resolver queries authoritative servers
4. IP address returned and cached
5. Browser connects to the IP address

**DNS Record Types:**
- **A Record** - Maps domain to IPv4 address
- **AAAA Record** - Maps domain to IPv6 address
- **CNAME** - Maps domain to another domain
- **MX Record** - Mail server information
- **TXT Record** - Text information (verification, SPF)

**When you'll encounter it:** Setting up websites, configuring email, SSL certificates, and troubleshooting connectivity issues.

## Kubernetes

**What it is:** Open-source container orchestration platform that automates deployment, scaling, and management of containerized applications.

**Why it matters:** As applications become more complex and distributed, manually managing containers becomes impossible. Kubernetes provides automation, scaling, and resilience.

**Key concepts:**
- **Pod** - Smallest deployable unit (one or more containers)
- **Service** - Stable network endpoint for pods
- **Deployment** - Manages pod replicas and updates
- **Namespace** - Virtual cluster for resource isolation

**Benefits:**
- **Auto-scaling** - Automatically adjust resources based on demand
- **Self-healing** - Restart failed containers, replace unhealthy nodes
- **Service discovery** - Automatic networking between services
- **Rolling updates** - Deploy new versions without downtime

**When you'll use it:** Large-scale applications, microservices architectures, when you need container orchestration.

## Cache

**What it is:** Temporary storage that saves frequently accessed data for faster retrieval.

**Why it matters:** Caching dramatically improves performance by reducing database queries, API calls, and computation time. It's one of the most effective performance optimizations.

**Types of caching:**
- **Browser cache** - Stores files locally on user's device
- **CDN cache** - Content cached at edge servers globally
- **Application cache** - In-memory storage (Redis, Memcached)
- **Database cache** - Query results stored in memory

**Cache strategies:**
- **Cache-aside** - Application manages cache explicitly
- **Write-through** - Write to cache and database simultaneously
- **Write-behind** - Write to cache immediately, database later
- **Refresh-ahead** - Proactively refresh cache before expiration

**Cache invalidation:**
- **TTL (Time To Live)** - Automatic expiration after set time
- **Manual invalidation** - Explicitly remove outdated data
- **Event-based** - Invalidate when underlying data changes

**When you'll use it:** Almost every application benefits from caching. It's essential for performance optimization.

## Microservices

**What it is:** Architectural approach where applications are built as a collection of small, independent services that communicate over networks.

**Why it matters:** Microservices enable teams to develop, deploy, and scale parts of an application independently, leading to faster development and better resilience.

**Characteristics:**
- **Small and focused** - Each service has single responsibility
- **Independently deployable** - Can update services separately
- **Technology agnostic** - Different services can use different technologies
- **Decentralized** - Services manage their own data

**Benefits:**
- **Scalability** - Scale individual services based on demand
- **Resilience** - Failure in one service doesn't crash entire system
- **Team autonomy** - Different teams can own different services
- **Technology diversity** - Use best tool for each job

**Challenges:**
- **Complexity** - More moving parts to manage
- **Network latency** - Services communicate over network
- **Data consistency** - Managing transactions across services
- **Monitoring** - Tracking requests across multiple services

**When you'll use it:** Large applications, teams that need to move independently, when different parts have different scaling requirements.

## API Gateway

**What it is:** Entry point that sits between clients and backend services, managing API requests and responses.

**Why it matters:** API gateways provide centralized management of cross-cutting concerns like authentication, rate limiting, and monitoring across multiple services.

**Key functions:**
- **Request routing** - Forward requests to appropriate backend service
- **Authentication** - Verify client credentials
- **Rate limiting** - Prevent abuse and ensure fair usage
- **Response transformation** - Modify responses before sending to client
- **Monitoring** - Log requests, track performance metrics

**Popular solutions:**
- **AWS API Gateway** - Managed service with AWS integration
- **Kong** - Open-source with enterprise features
- **Ambassador** - Kubernetes-native API gateway
- **Zuul** - Netflix's API gateway (now part of Spring Cloud)

**When you'll use it:** Microservices architectures, when you need centralized API management, mobile app backends.

## Reverse Proxy

**What it is:** Server that sits between clients and backend servers, forwarding client requests to backend servers and returning responses.

**Why it matters:** Reverse proxies provide load balancing, SSL termination, caching, and security benefits while hiding backend server details from clients.

**Functions:**
- **Load balancing** - Distribute requests across multiple servers
- **SSL termination** - Handle encryption/decryption
- **Caching** - Store frequently requested content
- **Compression** - Reduce bandwidth usage
- **Security** - Hide backend infrastructure, filter malicious requests

**Popular reverse proxies:**
- **Nginx** - High-performance web server and reverse proxy
- **HAProxy** - Focused on load balancing and high availability
- **Apache HTTP Server** - Traditional web server with proxy capabilities
- **Cloudflare** - Cloud-based reverse proxy with security features

**When you'll use it:** High-traffic websites, when you need SSL termination, load balancing, or want to add caching layer.

## Virtual Private Cloud (VPC)

**What it is:** Logically isolated section of cloud provider's infrastructure where you can launch resources in a virtual network you define.

**Why it matters:** VPCs provide network isolation, security, and control over your cloud resources, similar to having your own private data center.

**Key components:**
- **Subnets** - Segments of VPC IP address range
- **Route tables** - Rules for network traffic routing
- **Internet gateway** - Connection to internet
- **NAT gateway** - Outbound internet access for private subnets
- **Security groups** - Virtual firewalls for instances

**Benefits:**
- **Isolation** - Your resources are separated from other customers
- **Security** - Control network access with security groups and NACLs
- **Flexibility** - Design network topology to meet your needs
- **Scalability** - Easily add more resources within VPC

**When you'll use it:** Any serious cloud deployment requires proper network design with VPCs.

## CI/CD (Continuous Integration/Continuous Deployment)

**What it is:** Development practices where code changes are automatically built, tested, and deployed.

**Why it matters:** CI/CD reduces manual errors, catches bugs early, enables faster releases, and improves collaboration between development and operations teams.

**Continuous Integration:**
- **Automated builds** - Code is compiled automatically
- **Automated testing** - Tests run on every commit
- **Fast feedback** - Developers know immediately if they broke something
- **Integration issues** - Found early when they're easier to fix

**Continuous Deployment:**
- **Automated deployment** - Successful builds automatically deploy
- **Environment consistency** - Same deployment process for all environments
- **Rollback capability** - Quick recovery from failed deployments
- **Feature flags** - Deploy code but control feature activation

**Popular tools:**
- **Jenkins** - Open-source automation server
- **GitHub Actions** - Integrated with GitHub repositories
- **GitLab CI/CD** - Built into GitLab platform
- **Azure DevOps** - Microsoft's complete DevOps solution

**When you'll use it:** Professional development teams use CI/CD as standard practice.

## Monitoring and Observability

**What it is:** Practice of collecting, analyzing, and acting on data about system performance and behavior.

**Why it matters:** You can't improve what you don't measure. Monitoring helps prevent outages, optimize performance, and understand user experience.

**Three pillars of observability:**
- **Metrics** - Numerical data (response time, error rate, CPU usage)
- **Logs** - Detailed records of events and errors
- **Traces** - Request flow through distributed systems

**Key metrics to monitor:**
- **Availability** - Is the system up and responding?
- **Performance** - How fast are requests processed?
- **Error rates** - What percentage of requests fail?
- **Resource usage** - CPU, memory, disk, network utilization

**Popular tools:**
- **Prometheus** - Open-source metrics collection
- **Grafana** - Visualization and dashboards
- **ELK Stack** - Elasticsearch, Logstash, Kibana for logs
- **New Relic** - Application performance monitoring
- **Datadog** - Comprehensive monitoring platform

**When you'll use it:** Essential for any production system. Start monitoring from day one.

## Infrastructure as Code (IaC)

**What it is:** Practice of managing and provisioning infrastructure through machine-readable definition files rather than manual processes.

**Why it matters:** IaC enables version control for infrastructure, ensures consistency across environments, and makes infrastructure changes reproducible and auditable.

**Benefits:**
- **Version control** - Track infrastructure changes like code
- **Consistency** - Same infrastructure across environments
- **Automation** - Reduce manual configuration errors
- **Documentation** - Infrastructure is self-documenting
- **Disaster recovery** - Quickly rebuild infrastructure

**Popular tools:**
- **Terraform** - Cloud-agnostic infrastructure provisioning
- **AWS CloudFormation** - AWS-specific templates
- **Ansible** - Configuration management and automation
- **Pulumi** - Infrastructure as code using programming languages

**When you'll use it:** Any serious cloud deployment should use IaC for maintainability and reliability. - Serves web pages (Apache, Nginx)
- **Database Server** - Manages databases (MySQL, PostgreSQL)
- **Application Server** - Runs business logic (Tomcat, Node.js)
- **File Server** - Stores and shares files
- **Mail Server** - Handles email (Exchange, Postfix)

**Physical vs Virtual:**
- **Physical Server** - Dedicated hardware machine
- **Virtual Server (VM)** - Software-based server running on physical hardware
- **Container** - Lightweight virtualization (Docker)

**When you'll encounter it:** Every web application needs servers. Understanding server architecture is crucial for deployment and scaling.

## Cloud Computing

**What it is:** Delivery of computing services (servers, storage, databases, networking) over the internet ("the cloud").

**Why it matters:** Cloud computing eliminates the need to buy and maintain physical hardware, provides scalability on demand, and enables global deployment with reduced costs and complexity.

**Service Models:**
- **IaaS** (Infrastructure as a Service) - Virtual machines, storage (AWS EC2, Azure VMs)
- **PaaS** (Platform as a Service) - Development platforms (Heroku, Google App Engine)
- **SaaS** (Software as a Service) - Ready-to-use applications (Gmail, Salesforce)

**Major Providers:**
- **AWS** - Amazon Web Services (market leader)
- **Azure** - Microsoft's cloud platform
- **GCP** - Google Cloud Platform
- **DigitalOcean** - Developer-friendly, simpler pricing

**Key Benefits:**
- **Scalability** - Scale up/down based on demand
- **Cost-effective** - Pay only for what you use
- **Global reach** - Deploy worldwide instantly
- **Reliability** - Built-in redundancy and backups

**When you'll use it:** Most modern applications use cloud services for hosting, storage, or additional functionality.

## Docker & Containers

**What it is:** Docker is a platform that packages applications and their dependencies into lightweight, portable containers.

**Why it matters:** Containers solve the "it works on my machine" problem by ensuring applications run consistently across different environments. They're faster than VMs and enable microservices architecture.

**Key Concepts:**
- **Container** - Running instance of an image
- **Image** - Template containing application code and dependencies
- **Dockerfile** - Instructions to build an image
- **Registry** - Storage for images (Docker Hub)

**Benefits:**
- **Consistency** - Same environment everywhere
- **Isolation** - Applications don't interfere with each other
- **Efficiency** - Lighter than virtual machines
- **Scalability** - Easy to replicate and scale

**Common Commands:**
```bash
docker build -t myapp .        # Build image
docker run -p 8080:80 myapp    # Run container
docker ps                      # List running containers
docker stop container_id       # Stop container
```

**When you'll use it:** Modern development workflows, microservices, CI/CD pipelines, and cloud deployments.

## Load Balancer

**What it is:** A device or software that distributes incoming network traffic across multiple servers.

**Why it matters:** Load balancers prevent any single server from becoming overwhelmed, improve application availability, and enable horizontal scaling.

**Types:**
- **Layer 4 (Transport)** - Routes based on IP and port
- **Layer 7 (Application)** - Routes based on content (HTTP headers, URLs)

**Algorithms:**
- **Round Robin** - Requests distributed sequentially
- **Least Connections** - Routes to server with fewest active connections
- **IP Hash** - Routes based on client IP
- **Weighted** - Different servers handle different loads

**Benefits:**
- **High Availability** - If one server fails, others continue
- **Scalability** - Add more servers to handle increased load
- **Performance** - Distribute load evenly
- **Flexibility** - Route traffic based on various criteria

**When you'll use it:** Any application expecting significant traffic or requiring high availability.

## CDN (Content Delivery Network)

**What it is:** A network of geographically distributed servers that deliver web content to users from the nearest location.

**Why it matters:** CDNs dramatically improve website performance by reducing latency, decrease server load, and provide better user experience globally.

**How it works:**
1. User requests a file (image, CSS, JavaScript)
2. CDN serves it from the nearest edge server
3. If not cached, CDN fetches from origin server
4. File is cached for future requests

**Popular CDNs:**
- **Cloudflare** - Free tier available, security features
- **AWS CloudFront** - Integrated with AWS services
- **Fastly** - Real-time analytics, edge computing
- **KeyCDN** - Simple, affordable

**Benefits:**
- **Faster loading** - Content served from nearby servers
- **Reduced bandwidth costs** - Less load on origin server
- **Global reach** - Consistent performance worldwide
- **DDoS protection** - Distributed traffic absorption

**When you'll use it:** Websites with global users, media-heavy sites, or any application prioritizing performance.

## DNS (Domain Name System)

**What it is:** The system that translates human-readable domain names (google.com) into IP addresses (142.250.80.14) that computers use.

**Why it matters:** DNS is fundamental to how the internet works. Without it, we'd have to remember IP addresses for every website.

**How it works:**
1. You type "google.com" in browser
2. Browser asks DNS resolver "What's the IP for google.com?"
3. DNS resolver queries authoritative servers
4. IP address returned and cached
5. Browser connects to the IP address

**DNS Record Types:**
- **A Record** - Maps domain to IPv4 address
- **AAAA Record** - Maps domain to IPv6 address
- **CNAME** - Maps domain to another domain
- **MX Record** - Mail server information
- **TXT Record** - Text information (verification, SPF)

**When you'll encounter it:** Setting up websites, configuring email, SSL certificates, and troubleshooting connectivity issues.