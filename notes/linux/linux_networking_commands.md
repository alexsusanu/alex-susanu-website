# Linux Networking Commands Guide

**Category:** Networking & System Administration  
**Tags:** linux, networking, tcp-ip, dns, routing, firewall, diagnostics

## Essential Networking Commands

**What this guide covers:** Comprehensive reference for Linux network configuration, diagnostics, monitoring, and troubleshooting commands used in daily network operations.

**Why master networking commands:** Network issues are among the most common problems in IT infrastructure. These commands help diagnose connectivity problems, configure network interfaces, monitor traffic, and secure network communications.

## Network Configuration Commands

### **ip command** - Modern network configuration tool

**What it does:** The `ip` command is a powerful networking tool that replaces several older commands (ifconfig, route, arp). It manages network interfaces, IP addresses, routing tables, and network namespaces.

**Why use it:** Modern Linux distributions prefer `ip` because it's more feature-complete, faster, and actively maintained. It supports advanced networking features like VLANs, bridges, and network namespaces.

**When to use:** Network configuration, troubleshooting connectivity issues, setting up routing, managing multiple IP addresses on interfaces.

```bash
# Display network interfaces and their status
ip addr show                                  # Shows all interfaces with IP addresses, MAC addresses, and status
ip a                                         # Short form - same as above
ip addr show eth0                            # Shows details for specific interface only
ip -4 addr show                              # Shows only IPv4 addresses (filters out IPv6)
ip -6 addr show                              # Shows only IPv6 addresses

# Why: You need to see what IP addresses are assigned, interface status (up/down), 
# and network configuration before troubleshooting connectivity issues

# Show physical network interface information
ip link show                                 # Shows physical interfaces, MAC addresses, MTU, state
ip -s link show eth0                         # Shows statistics: packets sent/received, errors, drops
ip link show up                              # Shows only interfaces that are currently active

# Why: Helps identify hardware issues, check if interface is physically connected,
# and monitor network performance through statistics
```

**Configure network interfaces:**
```bash
# Add and remove IP addresses
sudo ip addr add 192.168.1.100/24 dev eth0  # Assigns IP address with /24 subnet mask to eth0
sudo ip addr add 192.168.1.100/24 brd + dev eth0  # Same as above but calculates broadcast address automatically
sudo ip addr del 192.168.1.100/24 dev eth0  # Removes the specified IP address from interface

# Why: Temporary IP configuration for testing, setting up additional IPs on same interface,
# or fixing network configuration without editing config files

# Control interface state
sudo ip link set eth0 up                     # Activates the network interface (equivalent to "ifup")
sudo ip link set eth0 down                   # Deactivates the network interface (equivalent to "ifdown")
sudo ip link set eth0 mtu 1500               # Sets Maximum Transmission Unit (packet size limit)
sudo ip link set eth0 name wan0              # Renames interface from eth0 to wan0

# Why: Restart network interfaces without rebooting, optimize network performance with MTU,
# organize interfaces with meaningful names
```

**Routing management:**
```bash
# View and analyze routing
ip route show                                # Displays complete routing table showing how packets are forwarded
ip route show default                        # Shows only the default gateway (where unknown traffic goes)
ip route get 8.8.8.8                        # Shows exactly which route will be used to reach specific destination

# Why: Troubleshoot connectivity issues, verify traffic is being routed correctly,
# understand network path before making changes

# Modify routing table
sudo ip route add 192.168.2.0/24 via 192.168.1.1  # Adds static route: traffic to 192.168.2.x goes through 192.168.1.1
sudo ip route add default via 192.168.1.1   # Sets default gateway (where all unknown traffic goes)
sudo ip route del 192.168.2.0/24            # Removes specific route from routing table
sudo ip route flush cache                    # Clears cached routing decisions, forces recalculation

# Why: Fix routing problems, set up network segmentation, optimize traffic flow,
# troubleshoot "destination unreachable" errors
```

### **ifconfig** - Legacy network interface configuration

**What it does:** Traditional Unix command for configuring network interfaces. Shows and modifies network interface parameters like IP addresses, netmasks, and interface status.

**Why still important:** Many older systems, scripts, and documentation use ifconfig. Some network engineers prefer its simpler syntax for basic operations.

**When to use:** Quick interface checks, legacy system administration, when ip command is not available, simple network configuration tasks.

```bash
# Display interface information
ifconfig                                     # Shows all active network interfaces with their configuration
ifconfig -a                                  # Shows ALL interfaces including inactive ones (down state)
ifconfig eth0                                # Shows configuration for specific interface only

# Why: Quick overview of network configuration, check if interfaces are up,
# see assigned IP addresses and network statistics

# Configure network interfaces
sudo ifconfig eth0 192.168.1.100 netmask 255.255.255.0  # Sets IP address and subnet mask
sudo ifconfig eth0 up                        # Brings interface online (starts network connectivity)
sudo ifconfig eth0 down                      # Takes interface offline (stops network connectivity)
sudo ifconfig eth0 hw ether 00:11:22:33:44:55  # Changes MAC address (useful for network testing)

# Why: Quick network configuration changes, temporarily assign IP addresses,
# troubleshoot by changing MAC addresses, prepare interfaces for configuration
```

## Network Diagnostics Commands

### **ping** - Test network connectivity

**What it does:** Sends ICMP echo request packets to test if a remote host is reachable and measures round-trip time. Most fundamental network troubleshooting tool.

**Why essential:** First step in network troubleshooting. Confirms basic connectivity, measures network latency, and can reveal packet loss issues that cause poor performance.

**When to use:** Test internet connectivity, verify network configuration changes, measure network performance, diagnose intermittent connectivity issues.

```bash
# Basic connectivity testing
ping google.com                              # Tests if google.com is reachable and measures response time
ping -c 4 192.168.1.1                       # Sends exactly 4 ping packets then stops (useful in scripts)
ping -i 2 192.168.1.1                       # Sends ping every 2 seconds instead of default 1 second
ping -s 1000 192.168.1.1                    # Sends larger packets (1000 bytes) to test MTU issues

# Why: Confirm basic connectivity before complex troubleshooting,
# test if network changes worked, identify intermittent connection problems

# Advanced testing
ping -W 1 192.168.1.1                       # Sets timeout to 1 second (faster failure detection)
ping -t 64 192.168.1.1                      # Sets TTL (Time To Live) - how many hops packet can make
ping6 ipv6.google.com                       # Tests IPv6 connectivity specifically
ping -f 192.168.1.1                         # Flood ping - sends packets as fast as possible (requires root)

# Why: Diagnose specific network problems like MTU issues, IPv6 problems,
# test network performance under load, troubleshoot routing loops
```

### **traceroute/tracepath** - Trace network path

**What it does:** Shows the complete path packets take through the network to reach a destination, including all intermediate routers and their response times.

**Why crucial:** Identifies exactly where network problems occur. If connectivity fails, traceroute shows whether the problem is with your router, ISP, or destination server.

**When to use:** Troubleshoot slow connections, identify network outages, verify routing changes, diagnose intermittent connectivity issues.

```bash
# Basic path tracing
traceroute google.com                        # Shows every router hop between you and google.com with response times
traceroute -n google.com                     # Uses IP addresses only (no DNS lookups) - faster and avoids DNS issues
traceroute -p 80 google.com                 # Uses port 80 instead of ICMP (useful when ICMP is blocked)

# Why: Identify which network segment is causing problems,
# verify traffic takes expected path, measure latency at each hop

# Alternative tools
tracepath google.com                         # Similar to traceroute but doesn't require root privileges
mtr google.com                               # Combines ping and traceroute with continuous monitoring and statistics

# Why: mtr provides ongoing monitoring to catch intermittent issues,
# tracepath works without special privileges
```

### **nslookup** - DNS lookup utility

**What it does:** Queries DNS servers to resolve domain names to IP addresses and vice versa. Can query specific record types like mail servers, name servers, and text records.

**Why important:** DNS problems are extremely common and cause websites to be unreachable even when the server is working fine. DNS troubleshooting is essential.

**When to use:** Website won't load, email delivery problems, verify DNS configuration changes, troubleshoot domain-related issues.

```bash
# Basic DNS queries
nslookup google.com                          # Converts domain name to IP address using default DNS server
nslookup google.com 8.8.8.8                 # Queries specific DNS server (useful to compare different DNS providers)
nslookup -type=MX gmail.com                 # Finds mail servers for domain (troubleshoot email delivery)
nslookup -type=NS google.com                # Finds authoritative name servers for domain
nslookup -type=TXT google.com               # Gets text records (SPF, DKIM, domain verification, etc.)

# Why: Verify DNS is working correctly, troubleshoot email problems,
# confirm DNS changes have propagated, check domain configuration

# Reverse DNS lookup
nslookup 8.8.8.8                            # Finds domain name associated with IP address
# Why: Identify unknown servers, verify reverse DNS setup, troubleshoot email delivery issues
```

### **dig** - Advanced DNS lookup tool

**What it does:** More powerful and flexible DNS query tool than nslookup. Provides detailed information about DNS queries and responses, with better scripting support.

**Why preferred:** More reliable than nslookup, better output format, supports advanced DNS features, preferred by network professionals.

**When to use:** Detailed DNS troubleshooting, DNS server testing, scripting DNS queries, investigating DNS security issues.

```bash
# Basic queries with detailed output
dig google.com                               # Shows complete DNS query and response with timing information
dig @8.8.8.8 google.com                     # Queries specific DNS server to compare responses
dig google.com MX                            # Gets mail exchange records with priority information
dig google.com NS                            # Gets name server records showing DNS authority
dig google.com TXT                           # Gets text records including SPF, DKIM, domain verification

# Why: Get detailed DNS information, compare responses from different DNS servers,
# troubleshoot complex DNS issues with full query details

# Advanced DNS troubleshooting
dig +short google.com                        # Shows only the final answer (useful in scripts)
dig +trace google.com                        # Shows complete DNS resolution path from root servers
dig -x 8.8.8.8                              # Reverse DNS lookup (IP to domain name)
dig google.com AAAA                          # Gets IPv6 address records

# Why: Understand complete DNS resolution process, troubleshoot DNS delegation issues,
# verify IPv6 DNS configuration, create automated DNS monitoring
```

### **host** - Simple DNS lookup

**What it does:** Simplified DNS lookup tool that provides quick domain name to IP address resolution with clean output.

**Why useful:** Faster and simpler than dig for basic queries, good for scripts, clean output format.

**When to use:** Quick DNS checks, simple scripts, when you need clean output without extra information.

```bash
host google.com                              # Simple domain to IP conversion
host -t MX gmail.com                         # Gets mail server records
host -a google.com                           # Shows all DNS record types for domain
host 8.8.8.8                                 # Reverse lookup (IP to domain name)

# Why: Quick DNS verification, simple scripting needs,
# clean output for parsing in automation
```

## Network Monitoring Commands

### **netstat** - Network connections and statistics

**What it does:** Displays network connections, routing tables, interface statistics, and network protocol information. Shows what network services are running and how they're being used.

**Why essential:** Identify what services are listening on which ports, find unauthorized network connections, troubleshoot service connectivity issues.

**When to use:** Security auditing, troubleshoot service connectivity, identify port conflicts, monitor network usage.

```bash
# Show network connections and listening services
netstat -tuln                                # Shows TCP/UDP listening ports in numeric format
netstat -tupln                              # Same as above but includes process names and PIDs
netstat -i                                   # Shows network interface statistics (packets, errors, drops)
netstat -r                                   # Displays routing table (same as route command)

# Why: Identify which services are running and accessible,
# troubleshoot service startup issues, verify security configuration

# Detailed connection analysis
netstat -an                                  # Shows all connections with numeric addresses (no DNS lookups)
netstat -at                                  # Shows only TCP connections with their states
netstat -au                                  # Shows only UDP connections
netstat -c                                   # Continuously updates display for real-time monitoring

# Why: Monitor ongoing connections, identify connection problems,
# watch for suspicious network activity, troubleshoot application connectivity
```

### **ss** - Modern socket statistics

**What it does:** Modern replacement for netstat that's faster and provides more detailed information about network sockets and connections.

**Why better than netstat:** Significantly faster, more detailed output, better filtering capabilities, actively maintained and improved.

**When to use:** Preferred over netstat for new systems, detailed network analysis, performance monitoring, advanced filtering needs.

```bash
# Basic socket information
ss -tuln                                     # Shows TCP/UDP listening sockets (faster than netstat)
ss -tupln                                    # Includes process information for each socket
ss -s                                        # Shows socket statistics summary (very useful overview)
ss -i                                        # Shows internal TCP information like congestion control

# Why: Get faster results than netstat, see detailed TCP performance information,
# quickly identify listening services

# Advanced filtering and monitoring
ss 'state connected'                         # Shows only established connections
ss 'sport = :22'                             # Shows connections on specific source port (SSH)
ss 'dst 192.168.1.1'                        # Shows connections to specific destination
ss -o                                        # Shows timer information for connections

# Why: Filter connections by state or address, monitor specific services,
# troubleshoot connection timing issues
```

### **lsof** - List open files and network connections

**What it does:** Shows all open files and network connections by processes. Since "everything is a file" in Linux, this includes network sockets, making it excellent for network troubleshooting.

**Why powerful:** Connects network activity to specific processes, helps identify which application is using which port, essential for security analysis.

**When to use:** Identify process using specific port, troubleshoot "port already in use" errors, security investigation, resource usage analysis.

```bash
# Network-specific usage
lsof -i                                      # Shows all network connections with associated processes
lsof -i :80                                  # Shows what process is using port 80 (helps with port conflicts)
lsof -i TCP:22                               # Shows TCP connections on port 22 (SSH connections)
lsof -i UDP                                  # Shows all UDP connections
lsof -i @192.168.1.1                        # Shows connections to specific IP address

# Why: Identify which application is causing network issues,
# resolve port conflicts, monitor application network usage

# Process and file analysis
lsof -u username                             # Shows all files opened by specific user
lsof +D /var/log                             # Shows what processes have files open in directory
lsof -p 1234                                 # Shows all files opened by specific process ID

# Why: Troubleshoot file locking issues, identify resource usage by user or process,
# understand application behavior
```

### **tcpdump** - Packet capture and analysis

**What it does:** Captures and analyzes network packets at the lowest level. Shows exactly what data is being sent and received on network interfaces.

**Why crucial:** Only way to see actual network traffic content, essential for deep troubleshooting, can identify problems that other tools miss.

**When to use:** Complex network problems, security analysis, application debugging, protocol-level troubleshooting, performance analysis.

```bash
# Basic packet capture
sudo tcpdump -i eth0                         # Captures all traffic on eth0 interface
sudo tcpdump -i any                          # Captures traffic on all network interfaces
sudo tcpdump host 192.168.1.1               # Captures only traffic to/from specific host
sudo tcpdump port 80                         # Captures only HTTP traffic (port 80)
sudo tcpdump -n port 53                      # Captures DNS traffic without resolving hostnames

# Why: See actual network traffic, identify unexpected connections,
# troubleshoot application network communication

# Advanced filtering and analysis
sudo tcpdump -i eth0 'tcp port 22'          # Captures only SSH traffic with TCP filter
sudo tcpdump -i eth0 'src 192.168.1.1'      # Captures traffic from specific source IP
sudo tcpdump -i eth0 'dst port 443'         # Captures HTTPS traffic to any destination
sudo tcpdump -w capture.pcap                # Saves captured packets to file for later analysis
sudo tcpdump -r capture.pcap                # Reads and displays previously captured packets

# Why: Focus on specific traffic types, save evidence for analysis,
# share packet captures with other team members

# Detailed packet inspection
sudo tcpdump -v                              # Verbose output with more packet details
sudo tcpdump -vv                             # Very verbose output with maximum details
sudo tcpdump -X                              # Shows packet contents in both hex and ASCII
sudo tcpdump -A                              # Shows packet contents in ASCII only

# Why: Understand exact packet contents, debug application protocols,
# identify data corruption or protocol violations
```

## Network Security Commands

### **iptables** - Linux firewall management

**What it does:** Controls the Linux kernel firewall by managing rules that filter network traffic. Can block or allow traffic based on source, destination, port, protocol, and other criteria.

**Why critical:** Primary security tool for Linux servers, controls network access, prevents unauthorized connections, essential for system security.

**When to use:** Secure servers, control network access, block malicious traffic, implement network policies, troubleshoot connectivity issues.

```bash
# View firewall configuration
sudo iptables -L                             # Lists all firewall rules in human-readable format
sudo iptables -L -n                          # Lists rules with numeric output (no DNS resolution)
sudo iptables -L -v                          # Verbose output showing packet and byte counters
sudo iptables -S                             # Shows rules in command format (useful for backup/restore)

# Why: Understand current security configuration, verify rules are working,
# troubleshoot blocked connections

# Basic firewall rules
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT     # Allows SSH connections (port 22)
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT     # Allows HTTP connections (port 80)
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT    # Allows HTTPS connections (port 443)
sudo iptables -A INPUT -j DROP               # Drops all other incoming traffic (default deny)

# Why: Secure server by allowing only necessary services,
# block unauthorized access attempts, implement security policies

# Advanced filtering
sudo iptables -A INPUT -s 192.168.1.0/24 -j ACCEPT    # Allows traffic from specific network
sudo iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT  # Allows return traffic
sudo iptables -A INPUT -i lo -j ACCEPT       # Allows local loopback traffic
sudo iptables -D INPUT 1                     # Deletes first rule in INPUT chain

# Why: Implement complex security policies, allow return traffic for outbound connections,
# maintain necessary system communication
```

### **ufw** - Uncomplicated Firewall

**What it does:** Simplified interface for managing iptables rules. Provides easier syntax for common firewall tasks while using iptables underneath.

**Why useful:** Much easier to use than raw iptables, good for basic firewall needs, less error-prone for beginners.

**When to use:** Simple firewall configuration, when you need quick security setup, prefer simplified syntax over complex iptables rules.

```bash
# Basic ufw operations
sudo ufw status                              # Shows current firewall status and rules
sudo ufw enable                              # Enables the firewall
sudo ufw disable                             # Disables the firewall
sudo ufw reset                               # Resets firewall to default settings

# Simple rule management
sudo ufw allow 22                            # Allows SSH (port 22)
sudo ufw allow ssh                           # Same as above using service name
sudo ufw allow 80/tcp                        # Allows HTTP with specific protocol
sudo ufw deny 23                             # Blocks telnet (port 23)
sudo ufw delete allow 80                     # Removes previously created rule

# Why: Quick and safe firewall configuration, less chance of locking yourself out,
# easier to understand and maintain
```

## Practical Network Troubleshooting Scenarios

### **Scenario 1: "Website won't load"**

**Step-by-step troubleshooting approach:**

```bash
# 1. Test basic connectivity
ping google.com                              # Test if internet works at all
# If this fails: check network configuration, cables, ISP issues

# 2. Test specific website
ping example.com                             # Test if the specific website is reachable
# If this fails but google works: website server problem or DNS issue

# 3. Test DNS resolution
nslookup example.com                         # Verify domain name resolves to IP address
dig example.com                              # Get detailed DNS information
# If DNS fails: try different DNS server (8.8.8.8), check DNS configuration

# 4. Test specific service
telnet example.com 80                        # Test if web server is responding
curl -I http://example.com                   # Test HTTP response headers
# If connection fails: server down, firewall blocking, wrong port

# 5. Trace network path
traceroute example.com                       # Find where connection fails
# Shows exactly which network hop is causing problems
```

### **Scenario 2: "Server port conflict - service won't start"**

```bash
# 1. Identify what's using the port
lsof -i :80                                  # Find process using port 80
ss -tulpn | grep :80                         # Alternative method using ss
netstat -tulpn | grep :80                    # Alternative method using netstat

# 2. Investigate the conflicting process
ps aux | grep [process-name]                 # Get details about the process
systemctl status [service-name]             # Check service status

# 3. Resolve the conflict
sudo systemctl stop [conflicting-service]   # Stop the conflicting service
sudo kill -9 [process-id]                   # Force kill if necessary (last resort)
# Then start your desired service

# 4. Prevent future conflicts
sudo systemctl disable [unwanted-service]   # Prevent service from auto-starting
# Or configure services to use different ports
```

### **Scenario 3: "Slow network performance"**

```bash
# 1. Test basic connectivity and speed
ping -c 10 8.8.8.8                          # Check latency and packet loss
# Look for high response times or packet loss

# 2. Test bandwidth
wget -O /dev/null http://speedtest.tele2.net/100MB.zip  # Download speed test
curl -o /dev/null -s -w "%{speed_download}\n" http://example.com/largefile  # Measure download speed

# 3. Check interface statistics
ip -s link show eth0                         # Look for errors, drops, collisions
cat /proc/net/dev                            # Network interface statistics

# 4. Monitor real-time traffic
sudo tcpdump -i eth0 -c 100                 # Sample network traffic
iftop                                        # Real-time bandwidth usage by connection
nethogs                                      # Network usage by process

# 5. Check for network congestion
ss -i                                        # Check TCP connection details
# Look for retransmissions, congestion window issues
```

This networking guide provides comprehensive explanations for each command, helping you understand not just how to use them, but when and why to use them in real troubleshooting scenarios.