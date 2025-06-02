# CKA Study Guide: Provisioning Infrastructure for Kubernetes

## **The Foundation Layer: Why Infrastructure Matters**

Kubernetes doesn't exist in a vacuum - it's a sophisticated orchestration platform that makes specific assumptions about the underlying infrastructure. Poor infrastructure decisions made early can create performance bottlenecks, security vulnerabilities, and operational nightmares that are expensive to fix later.

### The Infrastructure-Kubernetes Dependency Chain

Every Kubernetes operation ultimately depends on infrastructure:
- **Pod scheduling** requires CPU and memory resources from nodes
- **Persistent storage** needs block devices, filesystems, and network protocols
- **Service networking** relies on IP routing, load balancing, and DNS resolution
- **etcd performance** is directly tied to disk I/O and network latency
- **Container images** require registry connectivity and local storage
- **Security** depends on network isolation, certificate management, and access controls

Understanding these dependencies helps you design infrastructure that supports, rather than constrains, your Kubernetes workloads.

### The Cost of Getting Infrastructure Wrong

**Performance Issues**:
- Slow disk I/O causes etcd to timeout, making the entire cluster unresponsive
- Insufficient network bandwidth creates bottlenecks for pod-to-pod communication
- Undersized nodes force resource contention and poor application performance

**Security Vulnerabilities**:
- Overly permissive network configurations expose internal services
- Shared storage without proper isolation allows cross-tenant data access
- Missing encryption in transit exposes sensitive application data

**Operational Complexity**:
- Manual provisioning processes create inconsistent environments
- Lack of automation makes scaling and recovery slow and error-prone
- Poor monitoring infrastructure obscures root causes during incidents

---

## **Understanding Kubernetes Infrastructure Requirements**

### Compute Resources: Beyond CPU and Memory

**CPU Architecture Considerations**:
```bash
# Check CPU architecture and features
lscpu | grep -E "(Architecture|CPU op-mode|Virtualization|L1d cache|L2 cache|L3 cache)"

# Verify required CPU features for containers
grep -E "(vmx|svm)" /proc/cpuinfo  # Hardware virtualization support
cat /proc/cpuinfo | grep flags | grep sse4_2  # SSE 4.2 for performance
```

**Why CPU Architecture Matters**:
- **x86_64 vs ARM**: Container images must match architecture (multi-arch builds needed)
- **Virtualization extensions**: Required for nested virtualization scenarios
- **Cache hierarchy**: Affects performance of CPU-intensive workloads
- **NUMA topology**: Important for high-performance computing workloads

**Memory Hierarchy and Management**:
```bash
# Check memory configuration
free -h
cat /proc/meminfo | grep -E "(MemTotal|MemAvailable|SwapTotal|HugePages)"

# Verify NUMA configuration
numactl --hardware
cat /proc/sys/vm/zone_reclaim_mode  # Should be 0 for Kubernetes
```

**Memory Design Principles**:
- **No swap**: Kubernetes requires swap to be disabled for predictable performance
- **Memory overcommit**: Understand how kernel manages memory allocation vs usage
- **Page cache**: Affects container startup times and I/O performance
- **Huge pages**: Can improve performance for memory-intensive applications

### Storage: The Performance Foundation

**Disk I/O Characteristics**:
```bash
# Test disk performance (critical for etcd)
fio --name=seq-write --ioengine=libaio --iodepth=1 --rw=write --bs=4k --direct=1 --size=1G --numjobs=1 --runtime=60 --group_reporting

# Expected results for etcd:
# - Sequential write: >50 MB/s
# - 99th percentile latency: <10ms
# - fsync latency: <10ms

# Test fsync performance specifically
fio --name=fsync-test --ioengine=sync --rw=write --bs=4k --direct=1 --size=100M --fsync=1
```

**Why Storage Performance Matters**:
- **etcd durability**: Every write must be committed to disk before acknowledgment
- **Container image pulls**: Slow disk affects pod startup times
- **Log aggregation**: High I/O from container logs can saturate storage
- **Persistent volumes**: Application performance directly tied to storage speed

**Storage Types and Use Cases**:

| Storage Type | Use Case | Performance | Cost |
|--------------|----------|-------------|------|
| NVMe SSD | etcd, high-IOPS databases | Excellent | High |
| SATA SSD | General workloads, container images | Good | Medium |
| NVMe over Fabric | Shared high-performance storage | Excellent | Very High |
| Network-attached | Shared storage for stateful apps | Variable | Medium |
| Object storage | Backup, archival, static content | Low latency | Low |

### Network Architecture: The Connectivity Layer

**Physical Network Design**:
```bash
# Check network interface capabilities
ethtool eth0 | grep -E "(Speed|Duplex|Auto-negotiation)"

# Verify network performance between nodes
iperf3 -s  # on server
iperf3 -c server-ip -t 60  # on client

# Expected results:
# - 1Gbps minimum for small clusters
# - 10Gbps recommended for production
# - <1ms latency between nodes in same datacenter
```

**Network Topology Considerations**:

**Flat L2 Network (Simple)**:
```
┌─────────┐    ┌─────────┐    ┌─────────┐
│  Node1  │    │  Node2  │    │  Node3  │
│10.0.1.10│    │10.0.1.11│    │10.0.1.12│
└────┬────┘    └────┬────┘    └────┬────┘
     │              │              │
     └──────────────┼──────────────┘
                    │
              ┌─────┴─────┐
              │  Switch   │
              │10.0.1.0/24│
              └───────────┘
```

**Pros**: Simple configuration, easy troubleshooting
**Cons**: Broadcast domain size, limited scalability

**Routed L3 Network (Scalable)**:
```
┌─────────┐    ┌─────────┐    ┌─────────┐
│  Node1  │    │  Node2  │    │  Node3  │
│10.1.1.10│    │10.1.2.10│    │10.1.3.10│
└────┬────┘    └────┬────┘    └────┬────┘
     │              │              │
┌────┴────┐    ┌────┴────┐    ┌────┴────┐
│ Switch1 │    │ Switch2 │    │ Switch3 │
│10.1.1/24│    │10.1.2/24│    │10.1.3/24│
└────┬────┘    └────┬────┘    └────┬────┘
     │              │              │
     └──────────────┼──────────────┘
                    │
              ┌─────┴─────┐
              │  Router   │
              │           │
              └───────────┘
```

**Pros**: Better isolation, scalable, supports network policies
**Cons**: More complex routing, requires BGP or similar

### IP Address Planning

**Address Space Allocation**:
```bash
# Plan non-overlapping CIDR blocks:

# Node network (where VMs/bare metal live)
NODE_CIDR="10.0.0.0/16"        # 65,534 possible nodes

# Pod network (assigned by CNI)  
POD_CIDR="10.244.0.0/16"       # 65,534 possible pods

# Service network (cluster services)
SERVICE_CIDR="10.96.0.0/12"    # 1,048,574 possible services

# Example IP allocation:
# Nodes: 10.0.1.0/24 (254 nodes)
# Load balancers: 10.0.2.0/24
# Storage: 10.0.3.0/24
```

**Why IP Planning Matters**:
- **No overlap**: Overlapping CIDRs cause routing conflicts
- **Growth planning**: Account for cluster expansion over time
- **CNI compatibility**: Different CNI plugins have different requirements
- **Cloud integration**: Must not conflict with cloud provider networks

---

## **Cloud Provider Infrastructure Patterns**

### AWS Infrastructure for Kubernetes

**VPC Design for Kubernetes**:
```bash
# Create VPC with proper CIDR
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=k8s-vpc}]'

# Create subnets across AZs
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.1.0/24 --availability-zone us-west-2a
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.2.0/24 --availability-zone us-west-2b
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.3.0/24 --availability-zone us-west-2c

# Create private subnets for nodes
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.10.0/24 --availability-zone us-west-2a
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.11.0/24 --availability-zone us-west-2b
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.12.0/24 --availability-zone us-west-2c
```

**Security Groups for Kubernetes**:
```bash
# Control plane security group
aws ec2 create-security-group --group-name k8s-control-plane --description "Kubernetes control plane"

# Add rules for control plane
aws ec2 authorize-security-group-ingress --group-id sg-xxx --protocol tcp --port 6443 --source-group sg-xxx  # API server
aws ec2 authorize-security-group-ingress --group-id sg-xxx --protocol tcp --port 2379-2380 --source-group sg-xxx  # etcd
aws ec2 authorize-security-group-ingress --group-id sg-xxx --protocol tcp --port 10250 --source-group sg-xxx  # kubelet

# Worker node security group  
aws ec2 create-security-group --group-name k8s-workers --description "Kubernetes worker nodes"
aws ec2 authorize-security-group-ingress --group-id sg-yyy --protocol tcp --port 10250 --source-group sg-xxx  # kubelet from control plane
aws ec2 authorize-security-group-ingress --group-id sg-yyy --protocol tcp --port 30000-32767 --cidr 0.0.0.0/0  # NodePort services
```

**Instance Selection Strategy**:
```bash
# Control plane nodes: CPU and memory optimized
# m5.large (2 vCPU, 8GB) - minimum
# m5.xlarge (4 vCPU, 16GB) - recommended
# c5.xlarge (4 vCPU, 8GB) - CPU intensive

# Worker nodes: Depends on workload
# t3.medium (2 vCPU, 4GB) - development
# m5.large (2 vCPU, 8GB) - general purpose
# c5.xlarge (4 vCPU, 8GB) - CPU intensive workloads  
# r5.xlarge (4 vCPU, 32GB) - memory intensive workloads

# Check available instance types
aws ec2 describe-instance-types --query 'InstanceTypes[?VCpuInfo.DefaultVCpus>=`2`].[InstanceType,VCpuInfo.DefaultVCpus,MemoryInfo.SizeInMiB]' --output table
```

### Google Cloud Platform Infrastructure

**Network Design with Custom VPC**:
```bash
# Create custom VPC
gcloud compute networks create k8s-network --subnet-mode custom

# Create regional subnets
gcloud compute networks subnets create k8s-nodes \
  --network k8s-network \
  --range 10.0.0.0/16 \
  --region us-west1 \
  --secondary-range pods=10.244.0.0/16,services=10.96.0.0/12

# Create firewall rules
gcloud compute firewall-rules create k8s-internal \
  --network k8s-network \
  --allow tcp,udp,icmp \
  --source-ranges 10.0.0.0/16,10.244.0.0/16,10.96.0.0/12

gcloud compute firewall-rules create k8s-api-server \
  --network k8s-network \
  --allow tcp:6443 \
  --source-ranges 0.0.0.0/0
```

**Instance Template for Worker Nodes**:
```bash
# Create instance template
gcloud compute instance-templates create k8s-worker-template \
  --machine-type n1-standard-2 \
  --network-interface subnet=k8s-nodes,no-address \
  --boot-disk-size 100GB \
  --boot-disk-type pd-ssd \
  --image-family ubuntu-2004-lts \
  --image-project ubuntu-os-cloud \
  --scopes compute-rw,storage-ro,service-management,service-control,logging-write,monitoring \
  --metadata startup-script='#!/bin/bash
    apt-get update
    apt-get install -y docker.io kubelet kubeadm kubectl
    systemctl enable docker kubelet'
```

### Azure Infrastructure Patterns

**Resource Group and Virtual Network**:
```bash
# Create resource group
az group create --name k8s-rg --location westus2

# Create virtual network
az network vnet create \
  --resource-group k8s-rg \
  --name k8s-vnet \
  --address-prefix 10.0.0.0/16

# Create subnets
az network vnet subnet create \
  --resource-group k8s-rg \
  --vnet-name k8s-vnet \
  --name control-plane-subnet \
  --address-prefix 10.0.1.0/24

az network vnet subnet create \
  --resource-group k8s-rg \
  --vnet-name k8s-vnet \
  --name worker-subnet \
  --address-prefix 10.0.2.0/24
```

**Network Security Groups**:
```bash
# Create NSG for control plane
az network nsg create --resource-group k8s-rg --name k8s-control-plane-nsg

# Add rules
az network nsg rule create \
  --resource-group k8s-rg \
  --nsg-name k8s-control-plane-nsg \
  --name allow-api-server \
  --protocol Tcp \
  --priority 1001 \
  --destination-port-range 6443 \
  --access Allow

az network nsg rule create \
  --resource-group k8s-rg \
  --nsg-name k8s-control-plane-nsg \
  --name allow-etcd \
  --protocol Tcp \
  --priority 1002 \
  --destination-port-range 2379-2380 \
  --source-address-prefix 10.0.1.0/24 \
  --access Allow
```

---

## **On-Premises Infrastructure Considerations**

### Hardware Selection and Sizing

**Server Specifications for Different Roles**:

**Control Plane Nodes**:
```bash
# Minimum requirements:
# - CPU: 4 cores, 2.0+ GHz
# - Memory: 16GB RAM
# - Storage: 100GB SSD (for etcd and OS)
# - Network: 1Gbps NIC

# Production recommendations:
# - CPU: 8 cores, 2.5+ GHz (Intel Xeon or AMD EPYC)
# - Memory: 32GB RAM
# - Storage: 500GB NVMe SSD
# - Network: 10Gbps NIC with redundancy

# Hardware validation
dmidecode -t processor | grep -E "(Family|Model|Speed|Core Count)"
lshw -class memory | grep -E "(size|clock)"
lsblk -d -o NAME,SIZE,ROTA,TYPE | grep -v loop  # Check for SSDs (ROTA=0)
```

**Worker Nodes**:
```bash
# Variable based on workload, but typical starting point:
# - CPU: 8-16 cores
# - Memory: 32-64GB RAM  
# - Storage: 200GB+ SSD (OS + container images)
# - Network: 1-10Gbps based on workload

# Resource allocation planning:
# Reserve 20% CPU and memory for system overhead
# Plan for 80% average utilization to handle bursts
# Size storage for 6+ months of log retention
```

### Network Infrastructure Design

**Physical Network Architecture**:
```
                    ┌─────────────┐
                    │   Gateway   │
                    │   Router    │
                    └──────┬──────┘
                           │
                    ┌──────┴──────┐
                    │    Core     │
                    │   Switch    │
                    └─┬─────────┬─┘
                      │         │
            ┌─────────┴─┐   ┌───┴─────────┐
            │   ToR     │   │    ToR      │
            │ Switch 1  │   │  Switch 2   │
            └─┬─┬─┬─┬─┬─┘   └─┬─┬─┬─┬─┬─┘
              │ │ │ │ │       │ │ │ │ │
            ┌─┴┐│┌┴┐│┌┴┐   ┌─┴┐│┌┴┐│┌┴┐
            │N1││N2││N3│   │N4││N5││N6│
            └──┘└──┘└──┘   └──┘└──┘└──┘
```

**VLAN Segmentation Strategy**:
```bash
# Management VLAN (VLAN 100)
# - BMC/IPMI interfaces
# - Management switches
# - Monitoring systems

# Control Plane VLAN (VLAN 200)  
# - Kubernetes control plane nodes
# - etcd cluster communication
# - Administrative access

# Worker VLAN (VLAN 300)
# - Worker node management interfaces
# - Pod-to-pod communication
# - Service networking

# Storage VLAN (VLAN 400)
# - SAN/NAS communication
# - Backup traffic
# - High-bandwidth storage protocols
```

### Storage Infrastructure Patterns

**Shared Storage for Persistent Volumes**:

**iSCSI Configuration**:
```bash
# Install iSCSI initiator
apt-get install open-iscsi

# Configure iSCSI initiator
echo "InitiatorName=iqn.1993-08.org.debian:01:$(hostname)" > /etc/iscsi/initiatorname.iscsi

# Discover iSCSI targets
iscsiadm -m discovery -t sendtargets -p storage-server:3260

# Login to target
iscsiadm -m node -T iqn.2021-01.com.company:storage.lun1 -p storage-server:3260 --login

# Verify connection
lsblk | grep iscsi
```

**NFS for Shared ReadWriteMany Volumes**:
```bash
# Install NFS client
apt-get install nfs-common

# Test NFS mount
mount -t nfs storage-server:/exports/shared /mnt/test
df -h /mnt/test
umount /mnt/test

# Configure NFS client optimizations
echo "storage-server:/exports/shared /mnt/nfs nfs rsize=1048576,wsize=1048576,hard,timeo=600 0 0" >> /etc/fstab
```

**Local Storage Performance Testing**:
```bash
# Test local disk performance for dynamic local volumes
fio --name=random-write --ioengine=libaio --iodepth=32 --rw=randwrite --bs=4k --direct=1 --size=4G --numjobs=4 --runtime=60 --group_reporting

# Expected results for production workloads:
# Random write IOPS: 1000+ (SSD), 100+ (HDD)
# Sequential write: 100+ MB/s (SSD), 50+ MB/s (HDD)
# Latency 99th percentile: <20ms (SSD), <100ms (HDD)
```

---

## **Infrastructure as Code and Automation**

### Terraform for Infrastructure Provisioning

**AWS Infrastructure Module**:
```hcl
# infrastructure/aws/main.tf
variable "cluster_name" {
  description = "Name of the Kubernetes cluster"
  type        = string
}

variable "node_count" {
  description = "Number of worker nodes"
  type        = number
  default     = 3
}

# VPC and networking
resource "aws_vpc" "k8s_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.cluster_name}-vpc"
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
  }
}

resource "aws_internet_gateway" "k8s_igw" {
  vpc_id = aws_vpc.k8s_vpc.id

  tags = {
    Name = "${var.cluster_name}-igw"
  }
}

# Public subnets for load balancers
resource "aws_subnet" "k8s_public" {
  count                   = 3
  vpc_id                  = aws_vpc.k8s_vpc.id
  cidr_block              = "10.0.${count.index + 1}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.cluster_name}-public-${count.index + 1}"
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
    "kubernetes.io/role/elb" = "1"
  }
}

# Private subnets for nodes
resource "aws_subnet" "k8s_private" {
  count         = 3
  vpc_id        = aws_vpc.k8s_vpc.id
  cidr_block    = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "${var.cluster_name}-private-${count.index + 1}"
    "kubernetes.io/cluster/${var.cluster_name}" = "owned"
    "kubernetes.io/role/internal-elb" = "1"
  }
}

# Control plane nodes
resource "aws_instance" "control_plane" {
  count                  = 3
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = "m5.large"
  key_name              = aws_key_pair.k8s_key.key_name
  vpc_security_group_ids = [aws_security_group.control_plane.id]
  subnet_id             = aws_subnet.k8s_private[count.index].id

  root_block_device {
    volume_type = "gp3"
    volume_size = 100
    encrypted   = true
  }

  user_data = base64encode(templatefile("${path.module}/userdata/control-plane.sh", {
    cluster_name = var.cluster_name
  }))

  tags = {
    Name = "${var.cluster_name}-control-plane-${count.index + 1}"
    "kubernetes.io/cluster/${var.cluster_name}" = "owned"
  }
}

# Worker nodes
resource "aws_instance" "workers" {
  count                  = var.node_count
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = "m5.xlarge"
  key_name              = aws_key_pair.k8s_key.key_name
  vpc_security_group_ids = [aws_security_group.workers.id]
  subnet_id             = aws_subnet.k8s_private[count.index % 3].id

  root_block_device {
    volume_type = "gp3"
    volume_size = 200
    encrypted   = true
  }

  user_data = base64encode(file("${path.module}/userdata/worker.sh"))

  tags = {
    Name = "${var.cluster_name}-worker-${count.index + 1}"
    "kubernetes.io/cluster/${var.cluster_name}" = "owned"
  }
}
```

**User Data Scripts for Automation**:
```bash
# userdata/control-plane.sh
#!/bin/bash

# Update system
apt-get update
apt-get upgrade -y

# Install container runtime
apt-get install -y containerd
mkdir -p /etc/containerd
containerd config default | tee /etc/containerd/config.toml
sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
systemctl restart containerd
systemctl enable containerd

# Install Kubernetes components
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.28/deb/Release.key | gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.28/deb/ /' | tee /etc/apt/sources.list.d/kubernetes.list

apt-get update
apt-get install -y kubelet kubeadm kubectl
apt-mark hold kubelet kubeadm kubectl

# Configure system
swapoff -a
sed -i '/ swap / s/^\(.*\)$/#\1/g' /etc/fstab

# Load kernel modules
cat <<EOF | tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF

modprobe overlay
modprobe br_netfilter

# Configure sysctl
cat <<EOF | tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF

sysctl --system

systemctl enable kubelet
```

### Ansible for Configuration Management

**Kubernetes Cluster Playbook**:
```yaml
# playbooks/k8s-cluster.yml
---
- name: Configure Kubernetes cluster
  hosts: all
  become: yes
  vars:
    kubernetes_version: "1.28.0"
    pod_network_cidr: "10.244.0.0/16"
    service_cidr: "10.96.0.0/12"

  pre_tasks:
    - name: Update apt cache
      apt:
        update_cache: yes
        cache_valid_time: 3600

  roles:
    - common
    - container-runtime
    - kubernetes

- name: Initialize control plane
  hosts: control_plane[0]
  become: yes
  tasks:
    - name: Initialize kubeadm
      command: >
        kubeadm init
        --pod-network-cidr={{ pod_network_cidr }}
        --service-cidr={{ service_cidr }}
        --upload-certs
      register: kubeadm_init
      
    - name: Save join commands
      copy:
        content: "{{ kubeadm_init.stdout }}"
        dest: /tmp/kubeadm-join-commands.txt

- name: Join additional control plane nodes
  hosts: control_plane[1:]
  become: yes
  tasks:
    - name: Extract control plane join command
      shell: grep -A2 "control-plane" /tmp/kubeadm-join-commands.txt
      register: cp_join_command
      delegate_to: "{{ groups['control_plane'][0] }}"

    - name: Join control plane
      shell: "{{ cp_join_command.stdout }}"

- name: Join worker nodes
  hosts: workers
  become: yes
  tasks:
    - name: Extract worker join command
      shell: grep "kubeadm join" /tmp/kubeadm-join-commands.txt | head -1
      register: worker_join_command
      delegate_to: "{{ groups['control_plane'][0] }}"

    - name: Join worker nodes
      shell: "{{ worker_join_command.stdout }}"
```

**Inventory File**:
```ini
# inventory/production.ini
[control_plane]
k8s-master-1 ansible_host=10.0.10.10 node_role=master
k8s-master-2 ansible_host=10.0.10.11 node_role=master  
k8s-master-3 ansible_host=10.0.10.12 node_role=master

[workers]
k8s-worker-1 ansible_host=10.0.11.10 node_role=worker
k8s-worker-2 ansible_host=10.0.11.11 node_role=worker
k8s-worker-3 ansible_host=10.0.11.12 node_role=worker

[all:vars]
ansible_user=ubuntu
ansible_ssh_private_key_file=~/.ssh/k8s-cluster.pem
ansible_ssh_common_args='-o StrictHostKeyChecking=no'
```

---

## **Security and Compliance Infrastructure**

### Network Security Architecture

**Defense in Depth Strategy**:
```
┌─────────────────────────────────────────┐
│              Internet                   │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────┴───────────────────────┐
│         Perimeter Firewall              │
│    - DDoS protection                    │
│    - WAF rules                          │
│    - Rate limiting                      │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────┴───────────────────────┐
│         Load Balancer                   │
│    - TLS termination                    │
│    - Health checking                    │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────┴───────────────────────┐
│      DMZ Network (Public Subnets)      │
│    - Ingress controllers               │
│    - Jump hosts                        │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────┴───────────────────────┐
│    Application Network (Private)       │
│    - Kubernetes nodes                  │
│    - Internal services                 │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────┴───────────────────────┐
│      Data Network (Isolated)           │
│    - Databases                         │
│    - Storage systems                   │
│    - Backup infrastructure             │
└─────────────────────────────────────────┘
```

**Firewall Rule Examples**:
```bash
# iptables rules for Kubernetes nodes

# Allow loopback
iptables -A INPUT -i lo -j ACCEPT

# Allow established connections
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow SSH from management network
iptables -A INPUT -p tcp --dport 22 -s 10.0.100.0/24 -j ACCEPT

# Allow Kubernetes API server
iptables -A INPUT -p tcp --dport 6443 -s 10.0.0.0/16 -j ACCEPT

# Allow kubelet API
iptables -A INPUT -p tcp --dport 10250 -s 10.0.0.0/16 -j ACCEPT

# Allow etcd (control plane only)
iptables -A INPUT -p tcp --dport 2379:2380 -s 10.0.10.0/24 -j ACCEPT

# Allow NodePort services
iptables -A INPUT -p tcp --dport 30000:32767 -j ACCEPT

# Allow pod network traffic (adjust for your CNI)
iptables -A INPUT -s 10.244.0.0/16 -j ACCEPT

# Drop everything else
iptables -A INPUT -j DROP
```

### Certificate Management Infrastructure

**Certificate Authority Setup**:
```bash
# Create root CA for the cluster
mkdir -p /etc/ssl/k8s-ca
cd /etc/ssl/k8s-ca

# Generate root CA private key
openssl genrsa -out ca-key.pem 4096

# Create root CA certificate
openssl req -new -x509 -days 3650 -key ca-key.pem -out ca.pem -subj "/CN=Kubernetes-CA/O=Kubernetes"

# Create intermediate CA for different components
openssl genrsa -out etcd-ca-key.pem 2048
openssl req -new -key etcd-ca-key.pem -out etcd-ca.csr -subj "/CN=etcd-CA/O=Kubernetes"
openssl x509 -req -in etcd-ca.csr -CA ca.pem -CAkey ca-key.pem -out etcd-ca.pem -days 1825 -CAcreateserial

# Set proper permissions
chmod 600 *-key.pem
chmod 644 *.pem
```

**Automated Certificate Rotation**:
```bash
#!/bin/bash
# cert-rotation.sh

CERT_DIR="/etc/kubernetes/pki"
BACKUP_DIR="/backup/certs/$(date +%Y%m%d)"

# Create backup
mkdir -p $BACKUP_DIR
cp -r $CERT_DIR $BACKUP_DIR

# Check certificate expiration (warn if < 30 days)
for cert in $CERT_DIR/*.crt; do
    if [ -f "$cert" ]; then
        expiry=$(openssl x509 -in "$cert" -noout -enddate | cut -d= -f2)
        expiry_epoch=$(date -d "$expiry" +%s)
        current_epoch=$(date +%s)
        days_left=$(( (expiry_epoch - current_epoch) / 86400 ))
        
        if [ $days_left -lt 30 ]; then
            echo "WARNING: Certificate $cert expires in $days_left days"
            # Trigger renewal process
            kubeadm certs renew $(basename "$cert" .crt)
        fi
    fi
done

# Restart kubelet to pick up new certificates
systemctl restart kubelet
```

### Compliance and Auditing

**System Auditing Configuration**:
```bash
# /etc/audit/audit.rules - auditd configuration for Kubernetes

# Monitor file access to sensitive directories
-w /etc/kubernetes/ -p wa -k kubernetes-config
-w /var/lib/etcd/ -p wa -k etcd-data
-w /etc/ssl/ -p wa -k ssl-certs

# Monitor process execution
-a always,exit -F arch=b64 -S execve -F path=/usr/bin/kubectl -k kubectl-usage
-a always,exit -F arch=b64 -S execve -F path=/usr/bin/kubeadm -k kubeadm-usage

# Monitor network connections
-a always,exit -F arch=b64 -S connect -F a1=16 -k network-connect

# Monitor privilege escalation
-w /bin/su -p x -k privilege-escalation
-w /usr/bin/sudo -p x -k privilege-escalation
```

**Kubernetes Audit Policy**:
```yaml
# /etc/kubernetes/audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
# Log all requests at metadata level
- level: Metadata
  omitStages:
  - RequestReceived

# Log secret access at request level
- level: Request
  resources:
  - group: ""
    resources: ["secrets"]

# Log authentication failures
- level: Metadata
  omitStages:
  - RequestReceived
  namespaces: ["kube-system"]
  verbs: ["create", "update", "patch", "delete"]

# Don't log read-only requests to certain resources
- level: None
  resources:
  - group: ""
    resources: ["events"]
  verbs: ["get", "list", "watch"]
```

---

## **Monitoring and Observability Infrastructure**

### Infrastructure Monitoring Stack

**Prometheus for Metrics Collection**:
```yaml
# prometheus-config.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "kubernetes-rules.yml"
  - "infrastructure-rules.yml"

scrape_configs:
# Kubernetes API server
- job_name: 'kubernetes-apiservers'
  kubernetes_sd_configs:
  - role: endpoints
  scheme: https
  tls_config:
    ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
  bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
  relabel_configs:
  - source_labels: [__meta_kubernetes_namespace, __meta_kubernetes_service_name, __meta_kubernetes_endpoint_port_name]
    action: keep
    regex: default;kubernetes;https

# Node metrics
- job_name: 'node-exporter'
  kubernetes_sd_configs:
  - role: node
  relabel_configs:
  - action: labelmap
    regex: __meta_kubernetes_node_label_(.+)

# etcd metrics
- job_name: 'etcd'
  static_configs:
  - targets: ['10.0.10.10:2381', '10.0.10.11:2381', '10.0.10.12:2381']
  scheme: https
  tls_config:
    ca_file: /etc/kubernetes/pki/etcd/ca.crt
    cert_file: /etc/kubernetes/pki/etcd/healthcheck-client.crt
    key_file: /etc/kubernetes/pki/etcd/healthcheck-client.key
```

**Key Infrastructure Metrics**:
```bash
# Node-level metrics to monitor:
# - node_cpu_seconds_total (CPU usage)
# - node_memory_MemAvailable_bytes (Available memory)
# - node_disk_io_time_seconds_total (Disk I/O)
# - node_network_receive_bytes_total (Network I/O)
# - node_filesystem_avail_bytes (Disk space)

# etcd metrics:
# - etcd_server_is_leader (Leader status)
# - etcd_disk_wal_fsync_duration_seconds (Disk performance)
# - etcd_network_peer_round_trip_time_seconds (Network latency)
# - etcd_server_proposals_failed_total (Consensus failures)

# Query examples:
# CPU utilization by node
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory utilization by node  
100 - ((node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100)

# Disk I/O utilization
rate(node_disk_io_time_seconds_total[5m]) * 100
```

### Logging Infrastructure

**Centralized Logging with Fluent Bit**:
```yaml
# fluent-bit-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: logging
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush         1
        Log_Level     info
        Daemon        off
        Parsers_File  parsers.conf

    [INPUT]
        Name              tail
        Path              /var/log/containers/*.log
        Parser            docker
        Tag               kube.*
        Refresh_Interval  5
        Mem_Buf_Limit     50MB
        Skip_Long_Lines   On

    [INPUT]
        Name              systemd
        Tag               systemd.*
        Systemd_Filter    _SYSTEMD_UNIT=kubelet.service
        Systemd_Filter    _SYSTEMD_UNIT=containerd.service

    [FILTER]
        Name                kubernetes
        Match               kube.*
        Kube_URL            https://kubernetes.default.svc:443
        Kube_CA_File        /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        Kube_Token_File     /var/run/secrets/kubernetes.io/serviceaccount/token
        Merge_Log           On
        K8S-Logging.Parser  On
        K8S-Logging.Exclude Off

    [OUTPUT]
        Name  es
        Match *
        Host  elasticsearch.logging.svc.cluster.local
        Port  9200
        Index kubernetes
        Type  _doc
```

**Log Retention and Management**:
```bash
# Configure log rotation for container logs
cat > /etc/logrotate.d/kubernetes <<EOF
/var/log/containers/*.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
    maxage 7
    copytruncate
}
EOF

# Configure journal limits
mkdir -p /etc/systemd/journald.conf.d
cat > /etc/systemd/journald.conf.d/kubernetes.conf <<EOF
[Journal]
SystemMaxUse=1G
SystemMaxFileSize=100M
MaxRetentionSec=1week
EOF

systemctl restart systemd-journald
```

---

## **Performance Optimization and Tuning**

### System-Level Performance Tuning

**Kernel Parameter Optimization**:
```bash
# /etc/sysctl.d/kubernetes.conf
# Network performance
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_max_syn_backlog = 4096
net.ipv4.ip_local_port_range = 1024 65535

# Memory management
vm.swappiness = 0
vm.max_map_count = 262144
vm.overcommit_memory = 1

# File system
fs.file-max = 2097152
fs.inotify.max_user_instances = 8192
fs.inotify.max_user_watches = 524288

# Apply settings
sysctl --system
```

**I/O Scheduler Optimization**:
```bash
# Check current I/O scheduler
cat /sys/block/sda/queue/scheduler

# Set optimal scheduler for SSDs (deadline or noop)
echo deadline > /sys/block/sda/queue/scheduler

# Make permanent
echo 'ACTION=="add|change", KERNEL=="sd[a-z]", ATTR{queue/rotational}=="0", ATTR{queue/scheduler}="deadline"' > /etc/udev/rules.d/60-ssd-scheduler.rules

# For NVMe drives, use none or mq-deadline
echo 'ACTION=="add|change", KERNEL=="nvme[0-9]*", ATTR{queue/scheduler}="none"' >> /etc/udev/rules.d/60-ssd-scheduler.rules
```

### Container Runtime Optimization

**containerd Performance Tuning**:
```toml
# /etc/containerd/config.toml
version = 2

[plugins."io.containerd.grpc.v1.cri"]
  # Increase concurrent image pulls
  max_concurrent_downloads = 10
  
  # Configure registry mirrors for faster pulls
  [plugins."io.containerd.grpc.v1.cri".registry]
    [plugins."io.containerd.grpc.v1.cri".registry.mirrors]
      [plugins."io.containerd.grpc.v1.cri".registry.mirrors."docker.io"]
        endpoint = ["https://registry-mirror.company.com", "https://registry-1.docker.io"]

[plugins."io.containerd.runtime.v2.task"]
  # Optimize for container startup time
  platforms = ["linux/amd64"]

[plugins."io.containerd.snapshotter.v1.overlayfs"]
  # Use native diff for better performance
  upperdir_label = false
```

**kubelet Performance Configuration**:
```yaml
# /var/lib/kubelet/config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration

# Resource management
maxPods: 250
podsPerCore: 10

# Image management
imageMinimumGCAge: 2m
imageGCHighThresholdPercent: 85
imageGCLowThresholdPercent: 80

# Garbage collection
containerLogMaxSize: 50Mi
containerLogMaxFiles: 5

# Performance tuning
cpuManagerPolicy: static
reservedSystemCPUs: "0,1"
kubeReserved:
  cpu: "1000m"
  memory: "2Gi"
  ephemeral-storage: "10Gi"
systemReserved:
  cpu: "500m"
  memory: "1Gi"
  ephemeral-storage: "10Gi"

# Monitoring and health
healthzBindAddress: 0.0.0.0
healthzPort: 10248
```

---

## **Disaster Recovery and Business Continuity**

### Infrastructure Backup Strategies

**Full Infrastructure Backup Plan**:
```bash
#!/bin/bash
# infrastructure-backup.sh

BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_ROOT="/backup/infrastructure"
BACKUP_DIR="$BACKUP_ROOT/$BACKUP_DATE"

mkdir -p "$BACKUP_DIR"

# 1. Backup etcd data
echo "Backing up etcd..."
ETCDCTL_API=3 etcdctl snapshot save "$BACKUP_DIR/etcd-snapshot.db" \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
  --key=/etc/kubernetes/pki/etcd/healthcheck-client.key

# 2. Backup certificates and configurations
echo "Backing up certificates and configs..."
tar -czf "$BACKUP_DIR/kubernetes-config.tar.gz" \
  /etc/kubernetes/ \
  /var/lib/kubelet/ \
  /etc/containerd/

# 3. Backup persistent volume data
echo "Backing up persistent volumes..."
for pv in $(kubectl get pv -o jsonpath='{.items[*].metadata.name}'); do
    pv_path=$(kubectl get pv $pv -o jsonpath='{.spec.hostPath.path}')
    if [ ! -z "$pv_path" ]; then
        tar -czf "$BACKUP_DIR/pv-$pv.tar.gz" -C $(dirname $pv_path) $(basename $pv_path)
    fi
done

# 4. Export cluster resources
echo "Exporting cluster resources..."
kubectl get all --all-namespaces -o yaml > "$BACKUP_DIR/all-resources.yaml"
kubectl get pv,pvc,storageclass -o yaml > "$BACKUP_DIR/storage-resources.yaml"
kubectl get secrets --all-namespaces -o yaml > "$BACKUP_DIR/secrets.yaml"
kubectl get configmaps --all-namespaces -o yaml > "$BACKUP_DIR/configmaps.yaml"

# 5. Cleanup old backups (keep last 30 days)
find "$BACKUP_ROOT" -type d -mtime +30 -exec rm -rf {} \;

echo "Backup completed: $BACKUP_DIR"
```

### Multi-Region Disaster Recovery

**Cross-Region Infrastructure Replication**:
```yaml
# terraform/multi-region/main.tf
variable "regions" {
  description = "List of regions for multi-region deployment"
  type        = list(string)
  default     = ["us-west-2", "us-east-1"]
}

# Create infrastructure in each region
module "kubernetes_cluster" {
  for_each = toset(var.regions)
  source   = "./modules/kubernetes-cluster"
  
  region           = each.value
  cluster_name     = "${var.cluster_name}-${each.value}"
  backup_bucket    = aws_s3_bucket.backup_bucket.bucket
  monitoring_topic = aws_sns_topic.alerts.arn
}

# Cross-region backup replication
resource "aws_s3_bucket_replication_configuration" "backup_replication" {
  role   = aws_iam_role.replication.arn
  bucket = aws_s3_bucket.backup_bucket.id

  rule {
    id     = "backup-replication"
    status = "Enabled"

    destination {
      bucket = aws_s3_bucket.backup_bucket_replica.arn
      storage_class = "STANDARD_IA"
    }
  }
}
```

---

## **Cost Optimization Strategies**

### Resource Right-Sizing

**Automated Resource Analysis**:
```bash
#!/bin/bash
# resource-analysis.sh

echo "=== Node Resource Utilization ==="
kubectl top nodes

echo -e "\n=== Pod Resource Requests vs Usage ==="
kubectl get pods --all-namespaces -o json | jq -r '
.items[] | 
select(.status.phase == "Running") |
{
  namespace: .metadata.namespace,
  name: .metadata.name,
  requests: (.spec.containers[0].resources.requests // {}),
  usage: (.status | select(.containerStatuses != null) | .containerStatuses[0])
} |
"\(.namespace)/\(.name): CPU Req=\(.requests.cpu // "none"), Mem Req=\(.requests.memory // "none")"'

echo -e "\n=== Unused Resources ==="
# Find nodes with low utilization
kubectl top nodes --sort-by=cpu | awk 'NR>1 && $3+0 < 20 {print "Low CPU node: " $1 " (" $3 ")"}'
kubectl top nodes --sort-by=memory | awk 'NR>1 && $5+0 < 20 {print "Low memory node: " $1 " (" $5 ")"}'

# Find pods without resource requests
kubectl get pods --all-namespaces -o json | jq -r '
.items[] |
select(.spec.containers[0].resources.requests == null) |
"\(.metadata.namespace)/\(.metadata.name): No resource requests set"'
```

### Infrastructure Cost Optimization

**Spot Instance Strategy for Development**:
```hcl
# terraform/cost-optimized/workers.tf
resource "aws_launch_template" "worker_spot" {
  name_prefix   = "${var.cluster_name}-worker-spot-"
  image_id      = data.aws_ami.ubuntu.id
  instance_type = "m5.large"
  
  vpc_security_group_ids = [aws_security_group.workers.id]
  
  # Request spot instances
  instance_market_options {
    market_type = "spot"
    spot_options {
      max_price = "0.10"  # Set maximum price
    }
  }
  
  user_data = base64encode(file("${path.module}/userdata/worker.sh"))
  
  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "${var.cluster_name}-worker-spot"
      "kubernetes.io/cluster/${var.cluster_name}" = "owned"
    }
  }
}

# Auto Scaling Group with mixed instance types
resource "aws_autoscaling_group" "workers" {
  name                = "${var.cluster_name}-workers"
  vpc_zone_identifier = aws_subnet.k8s_private[*].id
  target_group_arns   = []
  health_check_type   = "EC2"
  
  min_size         = 1
  max_size         = 10
  desired_capacity = 3
  
  mixed_instances_policy {
    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.worker_spot.id
        version           = "$Latest"
      }
      
      override {
        instance_type = "m5.large"
      }
      override {
        instance_type = "m5.xlarge"
      }
      override {
        instance_type = "m4.large"
      }
    }
    
    instances_distribution {
      on_demand_base_capacity                  = 1
      on_demand_percentage_above_base_capacity = 25
      spot_allocation_strategy                 = "diversified"
    }
  }
  
  tag {
    key                 = "kubernetes.io/cluster/${var.cluster_name}"
    value               = "owned"
    propagate_at_launch = true
  }
}
```

---

## **Exam Tips**

### Infrastructure Planning Skills
- **Understand the full stack**: Know how each layer (hardware, OS, network, storage) affects Kubernetes
- **Size appropriately**: Practice calculating resource requirements for different cluster sizes
- **Network design**: Understand CIDR planning and how it affects CNI choice
- **Storage performance**: Know the difference between throughput and IOPS requirements

### Practical Scenarios
1. **Design infrastructure for 100-node cluster**: Calculate networking, storage, and compute requirements
2. **Troubleshoot infrastructure issues**: Network connectivity, disk performance, resource constraints
3. **Plan disaster recovery**: Design backup and restore procedures for entire clusters
4. **Optimize costs**: Right-size infrastructure and choose appropriate instance types

### Key Commands to Master
```bash
# Infrastructure validation
lscpu && free -h && lsblk
ip route show && ss -tulpn
systemctl status containerd kubelet

# Performance testing
fio --name=test --ioengine=libaio --rw=write --bs=4k --size=1G
iperf3 -c target-host
stress-ng --cpu 4 --timeout 60s

# Resource monitoring
kubectl top nodes && kubectl top pods -A
df -h && iostat 1 5
```

### Critical Concepts
- Infrastructure choices directly impact Kubernetes performance and reliability
- Network design affects CNI options and security policies
- Storage performance is critical for etcd and stateful workloads
- Automation and IaC are essential for repeatable, consistent deployments
- Cost optimization requires understanding workload patterns and cloud pricing models