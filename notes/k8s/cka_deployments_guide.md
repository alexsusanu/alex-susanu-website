# CKA Guide: Deployments, Rolling Updates & Rollbacks
category: Kubernetes Certification
tags: cka, kubernetes, exam, kubectl, certification

## Fundamental Conceptual Understanding

### The Philosophy Behind Deployments

**Declarative vs Imperative Paradigm:**
At its core, Kubernetes embraces a **declarative model** where you describe the desired end state, not the steps to get there. Deployments embody this philosophy perfectly:

```
Traditional Imperative Thinking:
"Start 3 servers, configure load balancer, update server 1, then server 2..."

Kubernetes Declarative Thinking:
"I want 3 replicas of nginx:1.21 running and healthy at all times"
```

**The Control Loop Mental Model:**
Every Kubernetes controller (including Deployment controller) follows this pattern:
1. **Observe** current state
2. **Compare** with desired state  
3. **Act** to reconcile differences
4. **Repeat** continuously

This creates **self-healing systems** - if a pod dies, the controller notices the discrepancy and creates a new one.

### Abstraction Layers and Separation of Concerns

**Why Three Layers? (Deployment → ReplicaSet → Pod)**

This isn't accidental complexity - each layer has a specific responsibility:

```
Deployment Layer:    "Application Lifecycle Management"
                    ├── Rolling updates
                    ├── Rollbacks  
                    ├── Update strategies
                    └── History tracking

ReplicaSet Layer:    "Replica Management"
                    ├── Ensuring desired count
                    ├── Pod selection via labels
                    ├── Pod template management
                    └── Replacement logic

Pod Layer:           "Runtime Environment"
                    ├── Container orchestration
                    ├── Shared networking/storage
                    ├── Lifecycle hooks
                    └── Resource isolation
```

**The Single Responsibility Principle:**
- **Deployment** focuses on "how to change"
- **ReplicaSet** focuses on "how many to run"  
- **Pod** focuses on "what to run"

### Distributed Systems Concepts in Practice

**CAP Theorem Applied:**
Deployments make trade-offs based on CAP theorem:
- **Consistency**: All users see the same version (during rollout, this is temporarily relaxed)
- **Availability**: Service remains available during updates (rolling updates preserve this)
- **Partition Tolerance**: System works despite network issues (pods can be on different nodes)

During rolling updates, Kubernetes temporarily sacrifices perfect consistency for availability.

**Eventual Consistency Model:**
The deployment update process demonstrates eventual consistency:
```
Time 0:  [v1, v1, v1] ← All pods old version
Time 1:  [v1, v1, v2] ← Mixed state (eventually consistent)
Time 2:  [v1, v2, v2] ← Still mixed
Time 3:  [v2, v2, v2] ← Eventually consistent
```

## Core Concept: What are Deployments?

**Why Deployments Matter:**
- Deployments are the primary way to manage stateless applications in Kubernetes
- They provide declarative updates for Pods and ReplicaSets
- Enable zero-downtime deployments through rolling updates
- Provide rollback capabilities for quick recovery
- Handle scaling automatically
- **Exam relevance:** ~15-20% of Workloads questions involve deployments

## Deployment Architecture & Design Patterns

### The Hierarchical Design Pattern

```
Deployment (Strategy & History)
    ├── ReplicaSet (current) [hash: abc123]
    │   ├── Pod 1 [nginx:1.21]
    │   ├── Pod 2 [nginx:1.21] 
    │   └── Pod 3 [nginx:1.21]
    └── ReplicaSet (old) [hash: def456] - kept for rollback
        ├── Pod 1 (terminated) [nginx:1.20]
        └── Pod 2 (terminated) [nginx:1.20]
```

**Conceptual Understanding - Why This Hierarchy?**

**1. Immutable Infrastructure Pattern:**
- ReplicaSets are **immutable** - you can't change their pod template
- To update, create a **new** ReplicaSet with new template
- This prevents configuration drift and enables reliable rollbacks

**2. Version Management Strategy:**
```bash
# Each ReplicaSet represents a "version" of your application
kubectl get rs -o wide
# NAME                     DESIRED   CURRENT   READY   AGE    CONTAINERS   IMAGES
# nginx-deployment-abc123  3         3         3       10m    nginx        nginx:1.21
# nginx-deployment-def456  0         0         0       1h     nginx        nginx:1.20
```

**3. The Controller Pattern:**
Each component implements the "reconciliation loop":

```
Deployment Controller:
┌─────────────────────────────────────┐
│ 1. Watch deployment spec changes    │
│ 2. Create/update ReplicaSets        │
│ 3. Manage rolling update process    │
│ 4. Handle rollback requests         │
└─────────────────────────────────────┘

ReplicaSet Controller:
┌─────────────────────────────────────┐
│ 1. Watch for pod failures          │
│ 2. Ensure replica count matches    │
│ 3. Create/delete pods as needed    │
│ 4. Use label selectors for pods    │
└─────────────────────────────────────┘
```

**Key Components:**
- **Deployment Controller**: Manages the desired state and orchestrates changes
- **ReplicaSet**: Ensures pod replicas are running and handles pod lifecycle
- **Pods**: The actual application instances with shared fate

## Creating Deployments

### Method 1: Imperative Commands
```bash
# Create deployment (exam-friendly)
kubectl create deployment nginx-deploy --image=nginx:1.20 --replicas=3

# Expose deployment
kubectl expose deployment nginx-deploy --port=80 --target-port=80 --type=ClusterIP

# Scale deployment
kubectl scale deployment nginx-deploy --replicas=5
```

### Method 2: Declarative YAML
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.20
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "64Mi"
            cpu: "250m"
          limits:
            memory: "128Mi"
            cpu: "500m"
```

## Rolling Updates Deep Dive

### Conceptual Foundation: Why Rolling Updates?

**The Zero-Downtime Problem:**
Traditional deployment approaches force a choice:
- **Blue-Green**: Fast but requires 2x resources
- **Big Bang**: Resource efficient but causes downtime
- **Rolling Update**: Balances both concerns

**The Trade-off Triangle:**
```
     Speed
      /\
     /  \
    /    \
   /      \
Resources ---- Availability

Rolling Updates optimize for Availability while balancing Speed and Resources
```

**State Machine Mental Model:**
Rolling updates follow a finite state machine:

```
[STABLE] → [PROGRESSING] → [STABLE]
    ↑                          ↓
    └── [FAILED] ←─────────────┘
           ↓
    [ROLLING_BACK] → [STABLE]
```

### Update Strategy Design Patterns

**Pattern 1: Conservative (High Availability)**
```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0      # Never lose capacity
      maxSurge: 1            # Add one at a time
```
*Use when: Service availability is critical, resources are constrained*

**Pattern 2: Aggressive (Fast Updates)**
```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 50%    # Half can be down
      maxSurge: 50%          # Double capacity temporarily
```
*Use when: Fast updates needed, ample resources available*

**Pattern 3: Balanced (Production Default)**
```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 25%    # Quarter can be unavailable
      maxSurge: 25%          # 25% extra capacity
```
*Use when: Balancing speed, resources, and availability*

### Default Rolling Update Strategy
```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 25%    # Can be absolute number or percentage
      maxSurge: 25%          # Extra pods during update
```

### Rolling Update Process
1. **Trigger Update**: Change image or other spec
2. **Create New ReplicaSet**: With updated pod template
3. **Scale Down Old**: Gradually reduce old pods
4. **Scale Up New**: Gradually increase new pods
5. **Complete**: Old ReplicaSet scaled to 0

### Performing Rolling Updates

```bash
# Update image (triggers rolling update)
kubectl set image deployment/nginx-deployment nginx=nginx:1.21

# Update with record (important for rollbacks)
kubectl set image deployment/nginx-deployment nginx=nginx:1.21 --record

# Check rollout status
kubectl rollout status deployment/nginx-deployment

# Watch the rollout in real-time
kubectl get pods -w
```

### Advanced Rolling Update Configuration
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: advanced-deployment
spec:
  replicas: 10
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 2    # Never have more than 2 pods unavailable
      maxSurge: 3          # Can have up to 3 extra pods during update
  minReadySeconds: 10      # Wait 10 seconds before considering pod ready
  progressDeadlineSeconds: 600  # Fail after 10 minutes
  revisionHistoryLimit: 5  # Keep 5 old ReplicaSets for rollback
```

## Rollbacks

### Viewing Rollout History
```bash
# View rollout history
kubectl rollout history deployment/nginx-deployment

# View specific revision details
kubectl rollout history deployment/nginx-deployment --revision=2

# View current deployment details
kubectl describe deployment nginx-deployment
```

### Performing Rollbacks
```bash
# Rollback to previous version
kubectl rollout undo deployment/nginx-deployment

# Rollback to specific revision
kubectl rollout undo deployment/nginx-deployment --to-revision=2

# Check rollback status
kubectl rollout status deployment/nginx-deployment
```

## Scaling Operations & Distributed Systems Principles

### Conceptual Foundation: Horizontal vs Vertical Scaling

**Horizontal Scaling Philosophy:**
Kubernetes embraces **horizontal scaling** (more pods) over **vertical scaling** (bigger pods):

```
Vertical Scaling:     Horizontal Scaling:
     [HUGE POD]      [pod][pod][pod][pod]
        ↑                    ↑
   Single Point of      Distributed Load
      Failure           & Fault Tolerance
```

**Why Horizontal Scaling Wins:**
1. **Fault Tolerance**: One pod failure doesn't kill the service
2. **Resource Efficiency**: Better bin-packing across nodes
3. **Performance**: Linear scaling with load distribution
4. **Cost**: Can use smaller, cheaper instances

### Scaling State Machine Model

```
[STABLE_COUNT] ──scale_up──→ [SCALING_UP] ──complete──→ [STABLE_COUNT]
       ↑                                                       │
       │                                                       │
       └──complete──← [SCALING_DOWN] ←──scale_down──┘
```

**Load Distribution Concepts:**
When you scale from 3→6 pods, Kubernetes doesn't just create 3 pods:
```
Time T0: [pod1][pod2][pod3]                    ← 100% traffic
Time T1: [pod1][pod2][pod3][pod4]              ← traffic redistributes  
Time T2: [pod1][pod2][pod3][pod4][pod5]        ← further redistribution
Time T3: [pod1][pod2][pod3][pod4][pod5][pod6]  ← final equilibrium
```

Each new pod automatically receives ~1/N of traffic (assuming equal weighting).

### Manual Scaling
```bash
# Scale up/down
kubectl scale deployment nginx-deployment --replicas=5

# Conditional scaling (only if current replicas = 3)
kubectl scale deployment nginx-deployment --current-replicas=3 --replicas=5
```

### Autoscaling Setup
```bash
# Create Horizontal Pod Autoscaler
kubectl autoscale deployment nginx-deployment --min=3 --max=10 --cpu-percent=80

# Check HPA status
kubectl get hpa
```

## Troubleshooting Deployments - Mental Models & Failure Analysis

### Conceptual Framework: The Failure Taxonomy

**Deployment failures follow predictable patterns. Understanding these helps diagnose issues quickly:**

```
Deployment Failure Types:
├── Resource Constraints
│   ├── CPU/Memory limits
│   ├── Storage capacity  
│   └── Network bandwidth
├── Configuration Issues
│   ├── Invalid image references
│   ├── Incorrect environment variables
│   └── Malformed manifests
├── Infrastructure Problems
│   ├── Node failures
│   ├── Network partitions
│   └── Storage backend issues
└── Application-Level Failures
    ├── Health check failures
    ├── Startup dependencies
    └── Runtime crashes
```

### The Debugging Mental Model: Layer-by-Layer Analysis

**Think of troubleshooting as peeling an onion - start from the outside and work inward:**

```
Layer 1: Cluster Level
"Is the cluster healthy?"
├── Node status
├── Control plane health
└── Network connectivity

Layer 2: Deployment Level  
"Is the deployment configured correctly?"
├── Deployment status
├── Resource quotas
└── RBAC permissions

Layer 3: ReplicaSet Level
"Are replicas being created?"
├── ReplicaSet events
├── Pod template validation
└── Selector matching

Layer 4: Pod Level
"Why are pods failing?"
├── Pod events
├── Container status
└── Resource requests vs limits

Layer 5: Application Level
"Is the app working correctly?"
├── Application logs
├── Health checks
└── Dependencies
```

### Systems Thinking: Understanding Cascade Failures

**Failure Propagation Model:**
```
Node Pressure → Pod Eviction → ReplicaSet Creates New Pod → 
New Pod Can't Schedule → Deployment Stays Progressing → 
Service Degradation → Cascading Failures
```

Understanding this chain helps you identify root causes faster.

### Common Issues & Solutions

**1. Deployment Stuck in Progress**
```bash
# Check events
kubectl describe deployment nginx-deployment

# Check pod status
kubectl get pods -l app=nginx

# Check pod logs
kubectl logs -l app=nginx --previous
```

**2. Rolling Update Failures**
```bash
# Check rollout status
kubectl rollout status deployment/nginx-deployment

# View events
kubectl get events --sort-by=.metadata.creationTimestamp

# Force rollback if stuck
kubectl rollout undo deployment/nginx-deployment
```

**3. Resource Constraints**
```bash
# Check node resources
kubectl top nodes

# Check pod resource usage
kubectl top pods

# Describe nodes for resource allocation
kubectl describe nodes
```

## Exam Tips & Gotchas

### ⚡ Quick Commands for Exam
```bash
# Generate deployment YAML quickly
kubectl create deployment test --image=nginx --dry-run=client -o yaml > deployment.yaml

# Quick update with record
kubectl set image deploy/myapp container=nginx:1.21 --record

# Fast rollback
kubectl rollout undo deploy/myapp

# Check status quickly
kubectl get deploy,rs,pods
```

### 🎯 Common Exam Scenarios

**Scenario 1: Update Strategy Configuration**
```yaml
# Always specify strategy for predictable behavior
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
```

**Scenario 2: Resource Limits Impact**
```yaml
# Deployment won't progress if resources unavailable
spec:
  template:
    spec:
      containers:
      - name: app
        resources:
          requests:
            memory: "1Gi"  # Make sure cluster has capacity
            cpu: "500m"
```

### 🚨 Critical Gotchas

1. **Selector Immutability**: You cannot change `spec.selector` after creation
2. **--record Flag**: Essential for meaningful rollback history
3. **Resource Quotas**: Deployments fail silently if namespace quota exceeded
4. **Node Selectors**: Pods may stay pending if no nodes match constraints
5. **Image Pull Errors**: Always check image names and registry access

### 📝 Exam Commands Cheat Sheet
```bash
# Create and expose in one go
kubectl create deployment webapp --image=nginx
kubectl expose deployment webapp --port=80

# Update with different strategies
kubectl patch deployment webapp -p '{"spec":{"strategy":{"type":"Recreate"}}}'

# Scale with autoscaling
kubectl autoscale deployment webapp --min=2 --max=10 --cpu-percent=70

# Monitor rollout
kubectl rollout status deployment/webapp --timeout=600s

# Quick troubleshooting
kubectl describe deployment webapp | grep -A 10 "Conditions"
```

## Real-World Best Practices

### 1. Health Checks
```yaml
spec:
  template:
    spec:
      containers:
      - name: app
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

### 2. Resource Management
```yaml
spec:
  template:
    spec:
      containers:
      - name: app
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### 3. Update Strategy for High Availability
```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0    # Zero downtime
      maxSurge: 1          # One extra pod during update
  minReadySeconds: 30      # Wait before considering ready
```

## WHY This Matters - The Deeper Philosophy

### Software Engineering Principles Embodied

**1. Separation of Concerns:**
```
Business Logic     ←→  Deployment Strategy  ←→  Infrastructure
(Your App Code)        (Kubernetes)           (Nodes/Network)
```
Deployments let you change deployment behavior without touching application code.

**2. Composition Over Inheritance:**
Instead of monolithic deployment tools, Kubernetes composes simple primitives:
- **Labels + Selectors** = Dynamic grouping
- **Controllers + Resources** = Declarative management  
- **Immutable ReplicaSets + Mutable Deployments** = Safe updates

**3. The Open/Closed Principle:**
Deployments are:
- **Open for extension**: Custom controllers, operators, strategies
- **Closed for modification**: Core deployment logic remains stable

### Distributed Systems Design Patterns

**1. The Reconciliation Pattern:**
```bash
# Every 30 seconds, each controller asks:
while true; do
  current_state = observe_reality()
  desired_state = read_spec()
  if current_state != desired_state; then
    take_corrective_action()
  fi
  sleep 30
done
```

**2. The Circuit Breaker Pattern:**
Deployments implement circuit breaking through:
- **progressDeadlineSeconds**: Stop trying after X seconds
- **Rollback capabilities**: Quick recovery from failures
- **Health checks**: Fast failure detection

**3. The Bulkhead Pattern:**
- **Resource limits**: Isolate workloads from each other
- **Node affinity**: Distribute across failure domains
- **Multiple replicas**: No single point of failure

### Systems Architecture Mental Models

**Event-Driven Architecture:**
```
Image Change → Deployment Event → ReplicaSet Creation → 
Pod Events → Container Events → Health Check Events → 
Service Discovery Updates → Load Balancer Updates
```

**Eventual Consistency in Practice:**
- **DNS**: Takes time to propagate new pod IPs
- **Load Balancers**: Gradual backend updates
- **Service Mesh**: Sidecar proxy updates
- **Monitoring**: Metrics collection lag

Understanding these delays helps set realistic expectations for deployment speed.

### The Cognitive Load Principle

**Why Declarative > Imperative:**
```
Imperative (High Cognitive Load):
"To update nginx, first check current version, then pull new image, 
then stop pod 1, wait for traffic drain, start new pod 1 with new image,
wait for health checks, then repeat for pod 2..."

Declarative (Low Cognitive Load):
"I want nginx:1.21 running"
```

Deployments reduce cognitive load by handling the "how" so you focus on the "what."

### Production Engineering Insights

**Reliability Engineering:**
- **MTTR (Mean Time To Recovery)**: Rollbacks provide instant recovery
- **MTBF (Mean Time Between Failures)**: Rolling updates reduce deployment risk
- **SLA Preservation**: Zero-downtime updates maintain service levels

**Operational Excellence:**
- **Observability**: Built-in status reporting and events
- **Automation**: Self-healing through controllers
- **Standardization**: Consistent deployment patterns across teams

For Production:**
- **Zero Downtime**: Rolling updates ensure continuous service availability
- **Quick Recovery**: Rollbacks provide instant recovery from bad deployments
- **Scalability**: Handle traffic spikes with autoscaling
- **Resource Efficiency**: Proper resource limits prevent node starvation
- **Operational Simplicity**: Declarative model reduces human error
- **System Reliability**: Fault tolerance through redundancy and self-healing

**For the Exam:**
- **Core Concept**: Fundamental to Kubernetes application management
- **Practical Skills**: You'll create, update, and troubleshoot deployments
- **Time Efficiency**: Knowing imperative commands saves precious exam time
- **Troubleshooting**: Understanding failure modes helps with debugging questions
- **Systems Thinking**: Demonstrates understanding of distributed systems principles

**For Your Career:**
- **Design Patterns**: Learn industry-standard deployment patterns
- **Problem-Solving**: Develop systematic debugging approaches  
- **Architecture**: Understand how pieces fit together in complex systems
- **Leadership**: Explain technical concepts to stakeholders effectively

Understanding deployments thoroughly gives you the foundation for managing all stateless applications in Kubernetes, which is exactly what the CKA exam tests. More importantly, it teaches you how to think about distributed systems, fault tolerance, and operational excellence - skills that transfer to any infrastructure role.