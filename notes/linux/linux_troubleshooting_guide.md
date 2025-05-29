# Linux Troubleshooting Guide

**Category:** System Administration & Troubleshooting  
**Tags:** linux, troubleshooting, debugging, system-recovery, performance, diagnostics

## Essential Troubleshooting Methodology

**What this guide covers:** Comprehensive troubleshooting scenarios for common Linux system problems with step-by-step diagnostic procedures, root cause analysis, and resolution strategies.

**Why systematic troubleshooting matters:** Random fixes waste time and can make problems worse. A methodical approach identifies root causes quickly and prevents recurring issues.

**General Troubleshooting Process:**
1. **Define the problem** - What exactly is broken?
2. **Gather information** - When did it start? What changed?
3. **Identify possible causes** - What could cause this symptom?
4. **Test hypotheses** - Systematically eliminate causes
5. **Implement solution** - Fix the root cause
6. **Verify fix** - Confirm problem is resolved
7. **Prevent recurrence** - Monitor and improve

## System Performance Issues

### **Scenario 1: "System is extremely slow"**

**Problem Description:** System responds slowly to commands, applications take forever to load, general sluggish performance.

**What causes slow performance:** High CPU usage, memory exhaustion, disk I/O bottlenecks, network issues, or system resource contention.

**Why this happens:** Resource-intensive processes, memory leaks, failing hardware, insufficient system resources, or poorly configured services.

**Step-by-step diagnosis:**

```bash
# Step 1: Quick system health check
uptime                                       # Check load averages
# Normal: load < number of CPU cores
# Problem: load consistently > (CPU cores × 2)
# Example: 4-core system should have load < 8

free -h                                      # Check memory usage
# Look for: low available memory, high swap usage
# Problem indicators: <100MB available, swap usage >50%

df -h                                        # Check disk space
# Problem indicators: any filesystem >90% full
# Root filesystem >95% can cause severe slowdowns

# Step 2: Identify resource-intensive processes
top -o %CPU                                  # Sort by CPU usage
# Look for: processes using >50% CPU consistently
# Note: PID, user, and command of high-CPU processes

ps aux --sort=-%mem | head -10               # Top memory consumers
# Look for: processes using >20% memory
# Check for: obvious memory leaks (increasing memory over time)

# Step 3: Check I/O performance
iostat -x 1 5                               # Monitor disk I/O for 5 seconds
# Problem indicators:
# %util consistently >80% (disk bottleneck)
# await >100ms (slow disk response)
# High r/s or w/s with low rkB/s, wkB/s (many small operations)

sudo iotop -o                                # Show processes doing I/O
# Identify: which processes are causing disk activity
# Look for: unexpectedly high I/O from specific applications

# Step 4: Network performance check
ping -c 5 8.8.8.8                           # Test external connectivity
# Problem indicators: >100ms latency, packet loss
# If network-dependent apps are slow

ss -tuln | wc -l                             # Count network connections
# High connection count might indicate network service issues
```

**Root cause analysis and solutions:**

```bash
# High CPU usage solutions:
# 1. Kill runaway processes
sudo kill -15 [PID]                         # Graceful termination
sudo kill -9 [PID]                          # Force kill if unresponsive

# 2. Lower process priority
sudo renice +10 [PID]                       # Lower priority (higher nice value)
sudo ionice -c 3 -p [PID]                   # Lower I/O priority

# 3. Check for CPU-intensive services
systemctl list-units --type=service --state=running
# Disable unnecessary services:
sudo systemctl stop [service-name]
sudo systemctl disable [service-name]

# Memory exhaustion solutions:
# 1. Clear caches (safe operation)
sudo sync                                   # Flush file system buffers
echo 3 | sudo tee /proc/sys/vm/drop_caches  # Clear page cache, dentries, inodes

# 2. Identify and kill memory-hungry processes
# Check process memory growth over time:
while true; do ps aux --sort=-%mem | head -5; sleep 10; done

# 3. Add swap space (temporary solution)
sudo fallocate -l 2G /swapfile              # Create 2GB swap file
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Disk I/O bottleneck solutions:
# 1. Identify I/O-heavy processes
sudo iotop -a                                # Accumulated I/O stats
# Kill or throttle I/O-intensive processes

# 2. Check for failing disk
sudo smartctl -a /dev/sda                    # Check disk health
dmesg | grep -i error                        # Check for disk errors

# 3. Optimize disk usage
# Move large files to different disk
# Clean up unnecessary files
sudo find /var/log -name "*.log" -size +100M -mtime +7
```

**Prevention and monitoring:**

```bash
# Set up monitoring alerts
# Add to crontab:
# */5 * * * * uptime | awk '{if($10>4.0) print "High load: " $0}' | mail -s "Load Alert" admin@domain.com

# Monitor disk space:
# 0 6 * * * df -h | awk '$5>80 {print "Disk usage alert: " $0}' | mail -s "Disk Alert" admin@domain.com

# Log performance data:
# */5 * * * * iostat -x 1 1 >> /var/log/iostat.log
```

### **Scenario 2: "High memory usage and system freezing"**

**Problem Description:** System becomes unresponsive, applications crash with out-of-memory errors, frequent freezing.

**What causes memory issues:** Memory leaks, insufficient RAM, swap exhaustion, runaway processes, or memory-intensive applications.

**Step-by-step diagnosis:**

```bash
# Step 1: Memory status assessment
free -h                                      # Current memory usage
cat /proc/meminfo | grep -E "(MemTotal|MemFree|MemAvailable|SwapTotal|SwapFree)"
# Calculate: Memory utilization = (MemTotal - MemAvailable) / MemTotal * 100
# Problem: >90% memory utilization

# Step 2: Identify memory consumption patterns
ps aux --sort=-%mem | head -20               # Top memory consumers
# Look for: processes with unusually high memory usage
# Note: RSS (Resident Set Size) values in MB

# Check for memory leaks (run multiple times):
for i in {1..5}; do ps aux --sort=-%mem | head -5; sleep 60; done
# Look for: steadily increasing memory usage in specific processes

# Step 3: System memory analysis
cat /proc/buddyinfo                          # Memory fragmentation info
# High fragmentation can cause allocation failures

slabtop                                      # Kernel memory usage
# Look for: excessive kernel memory usage

# Step 4: Swap analysis
cat /proc/swaps                              # Active swap spaces
swapon -s                                    # Swap usage summary
# Problem: swap usage >50% of total swap

vmstat 5 5                                   # Monitor memory and swap activity
# Look for: high 'si' (swap in) and 'so' (swap out) values
# Continuous swapping indicates memory pressure
```

**Solutions for memory problems:**

```bash
# Immediate memory relief:
# 1. Kill memory-intensive processes
sudo pkill -f [process-name]                # Kill by process name
# Or use system monitor to identify and kill processes

# 2. Clear system caches
sudo sync && echo 3 | sudo tee /proc/sys/vm/drop_caches

# 3. Emergency process termination
# Enable SysRq keys for emergency:
echo 1 | sudo tee /proc/sys/kernel/sysrq
# Then use Alt+SysRq+F to kill memory-hungry processes

# Long-term solutions:
# 1. Add more swap space
sudo fallocate -l 4G /swapfile2
sudo chmod 600 /swapfile2
sudo mkswap /swapfile2
sudo swapon /swapfile2
# Make permanent by adding to /etc/fstab:
echo '/swapfile2 none swap sw 0 0' | sudo tee -a /etc/fstab

# 2. Optimize swap usage
# Reduce swappiness (default is 60):
echo 10 | sudo tee /proc/sys/vm/swappiness   # Temporary
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf  # Permanent

# 3. Find and fix memory leaks
# Monitor specific process memory over time:
watch -n 30 'ps aux | grep [process-name]'
# If memory continuously grows, process has memory leak
# Solutions: restart process, update software, report bug
```

**Memory monitoring and prevention:**

```bash
# Set up memory monitoring:
# Create monitoring script:
cat > /usr/local/bin/memory-monitor.sh << 'EOF'
#!/bin/bash
THRESHOLD=90
MEM_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ $MEM_USAGE -gt $THRESHOLD ]; then
    echo "Memory usage is $MEM_USAGE%" | mail -s "Memory Alert" admin@domain.com
    ps aux --sort=-%mem | head -10 >> /var/log/memory-alert.log
fi
EOF
chmod +x /usr/local/bin/memory-monitor.sh

# Add to crontab:
# */10 * * * * /usr/local/bin/memory-monitor.sh
```

## Disk Space and Storage Issues

### **Scenario 3: "No space left on device" errors**

**Problem Description:** Applications fail with "No space left on device", system becomes unstable, cannot create new files.

**What causes disk space issues:** Log file growth, temporary file accumulation, large file downloads, database growth, or filesystem corruption.

**Step-by-step diagnosis:**

```bash
# Step 1: Identify full filesystems
df -h                                        # Human-readable disk usage
df -i                                        # Check inode usage (can be full even with disk space)
# Problem indicators: 
# >95% disk usage on any filesystem
# >90% inode usage

# Step 2: Locate space consumers
du -h / 2>/dev/null | sort -hr | head -20   # Top 20 largest directories
# Focus on: /var, /tmp, /home, /opt

# Check common problem areas:
du -sh /var/log/* | sort -hr | head -10     # Large log files
du -sh /tmp/* 2>/dev/null | sort -hr | head -10  # Temporary files
du -sh /home/* | sort -hr | head -10        # User directories

# Step 3: Find large files
find / -type f -size +100M 2>/dev/null | head -20  # Files >100MB
find /var/log -name "*.log" -size +50M       # Large log files
find /tmp -type f -mtime +7                  # Old temporary files

# Step 4: Check for hidden space usage
lsof +L1                                     # Find deleted files still held open
# Deleted files held by processes still consume space
# Shows files with link count 0 but still open

# Step 5: Analyze specific directories
ncdu /var                                    # Interactive disk usage analyzer
# If ncdu not available:
du -ah /var | sort -hr | head -50            # Alternative analysis
```

**Solutions for disk space problems:**

```bash
# Immediate space recovery:
# 1. Clean log files (SAFE - logs can be regenerated)
sudo find /var/log -name "*.log" -mtime +30 -size +10M -exec gzip {} \;
sudo find /var/log -name "*.gz" -mtime +90 -delete
sudo journalctl --vacuum-size=100M           # Limit systemd journal size

# 2. Clean temporary files
sudo find /tmp -type f -mtime +7 -delete     # Files older than 7 days  
sudo find /var/tmp -type f -mtime +30 -delete  # Older temporary files

# 3. Package manager cleanup
sudo apt autoremove                          # Remove unused packages
sudo apt autoclean                           # Clean package cache
# For yum/dnf:
sudo yum clean all                           # Clean package cache

# 4. Clear user caches
# For each user:
rm -rf /home/user/.cache/*                   # Browser and application caches
rm -rf /home/user/.thumbnails/*              # Image thumbnails

# 5. Handle deleted files still open
lsof +L1 | awk '{print $2}' | tail -n +2 | sort -u | xargs -r sudo kill -HUP
# Send HUP signal to processes holding deleted files
# This forces them to close file handles

# Advanced space recovery:
# 1. Find and remove duplicate files
fdupes -r /home                              # Find duplicates (install: apt install fdupes)
# Manually review and remove duplicates

# 2. Compress old files
find /var/log -name "*.log" -mtime +7 -exec gzip {} \;
find /home -name "*.txt" -size +10M -mtime +90 -exec gzip {} \;

# 3. Move large files to different filesystem
mv /large/file /other/filesystem/location
ln -s /other/filesystem/location/large/file /original/location/large/file
```

**Long-term disk space management:**

```bash
# Set up automated cleanup:
# Create cleanup script:
cat > /usr/local/bin/disk-cleanup.sh << 'EOF'
#!/bin/bash
# Clean old log files
find /var/log -name "*.log" -mtime +30 -size +10M -exec gzip {} \;
find /var/log -name "*.gz" -mtime +90 -delete

# Clean temporary files
find /tmp -type f -mtime +7 -delete
find /var/tmp -type f -mtime +30 -delete

# Clean package caches
apt autoremove -y
apt autoclean

# Vacuum journal logs
journalctl --vacuum-time=30d
journalctl --vacuum-size=100M

# Log cleanup activity
echo "Disk cleanup completed at $(date)" >> /var/log/disk-cleanup.log
EOF
chmod +x /usr/local/bin/disk-cleanup.sh

# Schedule weekly cleanup:
# Add to crontab:
# 0 2 * * 0 /usr/local/bin/disk-cleanup.sh

# Set up disk space monitoring:
cat > /usr/local/bin/disk-monitor.sh << 'EOF'
#!/bin/bash
THRESHOLD=85
df -h | awk 'NR>1 {gsub(/%/,"",$5); if($5>THRESHOLD) print $0}' THRESHOLD=$THRESHOLD > /tmp/disk-alert
if [ -s /tmp/disk-alert ]; then
    mail -s "Disk Space Alert" admin@domain.com < /tmp/disk-alert
fi
EOF
chmod +x /usr/local/bin/disk-monitor.sh

# Monitor every hour:
# 0 * * * * /usr/local/bin/disk-monitor.sh
```

### **Scenario 4: "Inode exhaustion - cannot create files despite free space"**

**Problem Description:** Error "No space left on device" but df shows available space. Cannot create new files or directories.

**What causes inode exhaustion:** Too many small files, mail queues, temporary files, or filesystem design limitations.

**Diagnosis and solution:**

```bash
# Step 1: Confirm inode exhaustion
df -i                                        # Show inode usage
# Look for: IUse% close to 100% on any filesystem

# Step 2: Find directories with many files
find / -xdev -type f | cut -d '/' -f 2 | sort | uniq -c | sort -nr | head -10
# Shows directories with most files

# Find directories with excessive small files:
find /var -type d -exec sh -c 'echo "$(ls -1A "{}" | wc -l) {}"' \; | sort -nr | head -20

# Step 3: Identify problem areas
find /var/spool -type f | wc -l              # Mail queue files
find /tmp -type f | wc -l                    # Temporary files
find /var/cache -type f | wc -l              # Cache files

# Step 4: Clean up small files
# Mail queue cleanup (if mail server):
sudo postqueue -f                            # Flush mail queue
sudo find /var/spool/postfix -type f -delete # Clear queue files

# Temporary file cleanup:
sudo find /tmp -type f -delete               # Clear all temporary files
sudo find /var/tmp -type f -mtime +1 -delete # Clear old var temp files

# Cache cleanup:
sudo find /var/cache -type f -mtime +30 -delete  # Old cache files

# Application-specific cleanup:
# PHP sessions:
sudo find /var/lib/php/sessions -type f -mtime +1 -delete
# Thumbnail cache:
find /home/*/.thumbnails -type f -mtime +30 -delete
```

## Network Connectivity Issues

### **Scenario 5: "Cannot connect to network/internet"**

**Problem Description:** No network connectivity, DNS resolution fails, services cannot connect to remote hosts.

**Step-by-step network diagnosis:**

```bash
# Step 1: Basic connectivity tests
ping -c 3 localhost                          # Test loopback
ping -c 3 127.0.0.1                         # Test local IP stack
ping -c 3 $(ip route | grep default | awk '{print $3}')  # Test gateway
ping -c 3 8.8.8.8                           # Test external connectivity
ping -c 3 google.com                        # Test DNS resolution

# Results interpretation:
# Localhost fails: IP stack problem
# Gateway fails: Local network problem  
# 8.8.8.8 fails: Internet connectivity problem
# google.com fails: DNS problem

# Step 2: Interface configuration check  
ip addr show                                 # Check interface status and IPs
ip route show                                # Check routing table
ip link show                                 # Check physical interface status

# Look for:
# Interfaces in DOWN state
# Missing IP addresses
# Missing default route
# Wrong subnet configuration

# Step 3: DNS configuration check
cat /etc/resolv.conf                         # Check DNS servers
nslookup google.com                          # Test DNS resolution
dig @8.8.8.8 google.com                     # Test with specific DNS server

# Step 4: Service status check
systemctl status NetworkManager              # Network management service
systemctl status systemd-networkd           # Alternative network service
systemctl status systemd-resolved           # DNS resolution service
```

**Network problem solutions:**

```bash
# Interface problems:
# 1. Restart network interface
sudo ip link set eth0 down
sudo ip link set eth0 up

# 2. Restart network services
sudo systemctl restart NetworkManager       # Most desktop systems
sudo systemctl restart systemd-networkd    # Server systems

# 3. Manual IP configuration (temporary)
sudo ip addr add 192.168.1.100/24 dev eth0 # Set IP address
sudo ip route add default via 192.168.1.1  # Set default gateway

# DNS problems:
# 1. Temporary DNS fix
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf
echo "nameserver 1.1.1.1" | sudo tee -a /etc/resolv.conf

# 2. Flush DNS cache
sudo systemctl restart systemd-resolved     # Systemd systems
sudo /etc/init.d/nscd restart               # Systems with nscd

# DHCP problems:
# 1. Release and renew DHCP lease
sudo dhclient -r eth0                       # Release lease
sudo dhclient eth0                          # Request new lease

# 2. Check DHCP service
systemctl status isc-dhcp-server            # If running DHCP server
journalctl -u NetworkManager                # Check for DHCP errors

# Firewall issues:
# 1. Check if firewall is blocking
sudo iptables -L                             # List firewall rules
sudo ufw status                              # Ubuntu firewall status

# 2. Temporarily disable firewall (DANGEROUS - for testing only)
sudo ufw disable                             # Ubuntu
sudo systemctl stop iptables                # CentOS/RHEL
```

## Permission and Access Issues

### **Scenario 6: "Permission denied" errors**

**Problem Description:** Cannot access files/directories, applications fail with permission errors, users cannot perform required operations.

**Step-by-step permission diagnosis:**

```bash
# Step 1: Identify the exact problem
ls -la /path/to/problem/file                # Check file permissions
ls -ld /path/to/problem/directory           # Check directory permissions
id                                          # Check current user and groups
groups                                      # Check group memberships

# Step 2: Understand permission structure
# Permission format: drwxrwxrwx
# d = directory, - = file
# First rwx: owner permissions
# Second rwx: group permissions  
# Third rwx: other permissions
# r=read(4), w=write(2), x=execute(1)

# Step 3: Check ownership
stat /path/to/file                          # Detailed file information
find /path -not -user $(whoami) -ls         # Files not owned by current user
find /path -not -group $(id -gn) -ls       # Files not in current user's group

# Step 4: Check special permissions
find / -perm -4000 -ls 2>/dev/null          # Files with setuid bit
find / -perm -2000 -ls 2>/dev/null          # Files with setgid bit
find / -perm -1000 -ls 2>/dev/null          # Directories with sticky bit
```

**Permission problem solutions:**

```bash
# File permission fixes:
# 1. Standard file permissions
sudo chmod 644 /path/to/file                # Read/write for owner, read for others
sudo chmod 755 /path/to/directory           # Full access for owner, read/execute for others
sudo chmod +x /path/to/script               # Add execute permission

# 2. Recursive permission fixes
sudo find /var/www -type f -exec chmod 644 {} \;  # Set file permissions
sudo find /var/www -type d -exec chmod 755 {} \;  # Set directory permissions

# 3. Ownership fixes
sudo chown user:group /path/to/file         # Change owner and group
sudo chown -R user:group /path/to/directory # Recursive ownership change

# Application-specific permission fixes:
# Web server files:
sudo chown -R www-data:www-data /var/www/html
sudo find /var/www/html -type f -exec chmod 644 {} \;
sudo find /var/www/html -type d -exec chmod 755 {} \;

# SSH key permissions:
chmod 700 ~/.ssh                            # SSH directory
chmod 600 ~/.ssh/id_rsa                     # Private key
chmod 644 ~/.ssh/id_rsa.pub                 # Public key
chmod 644 ~/.ssh/authorized_keys             # Authorized keys

# Log file permissions:
sudo chown syslog:adm /var/log/*.log        # Standard log ownership
sudo chmod 640 /var/log/*.log               # Log file permissions

# Advanced permission troubleshooting:
# 1. Check ACLs (Access Control Lists)
getfacl /path/to/file                       # Show ACL permissions
# If ACLs are set, use setfacl to modify:
sudo setfacl -m u:username:rw /path/to/file # Give user read/write access

# 2. SELinux context (if SELinux enabled)
ls -Z /path/to/file                         # Show SELinux context
sudo restorecon -R /path/to/directory       # Restore default SELinux contexts
```

## Boot and System Recovery Issues

### **Scenario 7: "System won't boot"**

**Problem Description:** System fails to start, gets stuck at boot, drops to emergency shell, or shows kernel panic.

**Boot problem diagnosis and recovery:**

```bash
# Boot process understanding:
# 1. BIOS/UEFI → 2. Bootloader (GRUB) → 3. Kernel → 4. Init system → 5. Services

# Recovery methods by boot stage:

# GRUB Recovery (bootloader problems):
# 1. Boot from rescue media/live USB
# 2. Mount root filesystem:
sudo mkdir /mnt/recovery
sudo mount /dev/sda1 /mnt/recovery          # Replace with actual root partition
sudo mount --bind /dev /mnt/recovery/dev
sudo mount --bind /proc /mnt/recovery/proc
sudo mount --bind /sys /mnt/recovery/sys

# 3. Chroot into system:
sudo chroot /mnt/recovery

# 4. Reinstall GRUB:
grub-install /dev/sda                       # Replace with actual disk
update-grub                                 # Regenerate GRUB configuration

# Kernel boot problems:
# 1. Boot with older kernel from GRUB menu
# 2. Check kernel logs:
dmesg | less                                # Kernel messages
journalctl -b                               # Boot logs

# 3. Common kernel boot fixes:
# Edit GRUB boot parameters (press 'e' in GRUB menu):
# Add: nomodeset                            # Disable graphics acceleration
# Add: single                               # Boot to single-user mode
# Add: init=/bin/bash                       # Boot to bash shell

# Filesystem corruption recovery:
# 1. Boot from rescue media
# 2. Check filesystem:
sudo fsck /dev/sda1                         # Check and repair filesystem
sudo fsck -f /dev/sda1                      # Force check
sudo fsck -y /dev/sda1                      # Auto-answer yes to fixes

# 3. Mount and check critical files:
sudo mount /dev/sda1 /mnt
ls -la /mnt/etc/fstab                       # Check fstab for errors
ls -la /mnt/boot                            # Check boot files exist
```

**System recovery procedures:**

```bash
# Single-user mode recovery:
# 1. Boot to single-user mode (add 'single' to kernel parameters)
# 2. Remount root filesystem as read-write:
mount -o remount,rw /

# 3. Common single-user fixes:
passwd root                                 # Reset root password
systemctl enable sshd                       # Enable SSH for remote access
vim /etc/fstab                              # Fix filesystem mount errors

# Emergency shell recovery:
# If system drops to emergency shell:
# 1. Check what caused the emergency:
systemctl --failed                          # Show failed services
journalctl -xb                              # Boot logs with explanations

# 2. Fix common issues:
systemctl reset-failed                      # Clear failed service states
systemctl daemon-reload                     # Reload systemd configuration
systemctl default                           # Try to boot to default target

# Rescue mode from installation media:
# 1. Boot from installation USB/DVD
# 2. Choose "Rescue" option
# 3. Mount existing installation
# 4. Common rescue operations:

# Fix broken packages:
apt --fix-broken install                    # Debian/Ubuntu
yum history undo last                       # CentOS/RHEL - undo last transaction

# Restore from backup:
# If you have backups in /backup:
rsync -av /backup/etc/ /etc/                # Restore configuration
rsync -av /backup/home/ /home/              # Restore user data

# Network boot recovery:
# 1. Configure network in rescue environment:
ip addr add 192.168.1.100/24 dev eth0
ip route add default via 192.168.1.1
echo "nameserver 8.8.8.8" > /etc/resolv.conf

# 2. Remote access for help:
systemctl start sshd
passwd root                                 # Set password for SSH access
```

### **Scenario 8: "Services failing to start at boot"**

**Problem Description:** System boots but essential services don't start, applications unavailable, missing functionality.

**Service startup troubleshooting:**

```bash
# Step 1: Identify failed services
systemctl --failed                          # List failed services
systemctl list-units --state=failed         # Alternative command

# Step 2: Analyze specific service failures
systemctl status service-name               # Detailed service status
journalctl -u service-name                  # Service-specific logs
journalctl -u service-name --since "today"  # Today's logs only

# Step 3: Check service dependencies
systemctl list-dependencies service-name    # Show service dependencies
systemctl show service-name                 # Show all service properties

# Step 4: Manual service testing
# Test service manually:
sudo /usr/bin/service-binary --test-config  # Test configuration
sudo -u service-user /usr/bin/service-binary --foreground  # Run in foreground

# Common service startup problems and fixes:

# Configuration file errors:
# 1. Check configuration syntax:
nginx -t                                    # Nginx configuration test
apache2ctl configtest                       # Apache configuration test
sshd -t                                     # SSH daemon configuration test

# 2. Fix configuration errors:
sudo vim /etc/service/config.conf           # Edit configuration
# Common issues: syntax errors, wrong file paths, invalid options

# Permission problems:
# 1. Check service file permissions:
ls -la /etc/systemd/system/service-name.service
ls -la /usr/lib/systemd/system/service-name.service

# 2. Fix systemd service file:
sudo systemctl daemon-reload                # Reload after editing service files
sudo systemctl enable service-name          # Ensure service is enabled

# Dependency problems:
# 1. Start dependencies manually:
sudo systemctl start dependency-service     # Start required services first
sudo systemctl enable dependency-service    # Enable for future boots

# 2. Fix dependency order:
# Edit service file to add:
# After=network.target
# Requires=postgresql.service

# Resource problems:
# 1. Check available resources:
free -h                                     # Memory availability
df -h                                       # Disk space
ulimit -a                                   # Resource limits

# 2. Adjust service resource limits:
# Edit service file:
# [Service]
# LimitNOFILE=65536
# MemoryLimit=1G

# User/group problems:
# 1. Check service user exists:
id service-user                             # Check if user exists
getent group service-group                  # Check if group exists

# 2. Create missing users:
sudo useradd -r -s /bin/false service-user # Create system user
sudo usermod -aG service-group service-user # Add to group
```

## Application and Service Issues

### **Scenario 9: "Web server not responding"**

**Problem Description:** Web server returns errors, timeouts, or refuses connections. Website unavailable or performing poorly.

**Web server troubleshooting:**

```bash
# Step 1: Basic connectivity test
curl -I http://localhost                     # Test local HTTP connection
curl -I https://localhost                    # Test local HTTPS connection
telnet localhost 80                          # Test if port 80 is listening
telnet localhost 443                         # Test if port 443 is listening

# Step 2: Check web server status
systemctl status apache2                     # Apache status
systemctl status nginx                       # Nginx status
systemctl status httpd                       # Apache on CentOS/RHEL

# Step 3: Check web server processes
ps aux | grep apache2                        # Apache processes
ps aux | grep nginx                          # Nginx processes
lsof -i :80                                  # What's using port 80
lsof -i :443                                 # What's using port 443

# Step 4: Analyze web server logs
tail -f /var/log/apache2/error.log          # Apache error log
tail -f /var/log/nginx/error.log            # Nginx error log
tail -f /var/log/apache2/access.log         # Apache access log
journalctl -u apache2 -f                    # Systemd logs for Apache

# Common web server problems and solutions:

# Configuration errors:
# 1. Test configuration syntax:
sudo apache2ctl configtest                  # Apache configuration test
sudo nginx -t                               # Nginx configuration test

# 2. Common configuration issues:
# - Wrong document root path
# - Syntax errors in virtual host configuration
# - SSL certificate problems
# - Module loading issues

# Fix configuration errors:
sudo vim /etc/apache2/sites-available/000-default.conf  # Apache default site
sudo vim /etc/nginx/sites-available/default  # Nginx default site
sudo systemctl reload apache2                # Reload after config changes
sudo systemctl reload nginx                  # Reload Nginx config

# Permission problems:
# 1. Check web directory permissions:
ls -la /var/www/html                         # Web root permissions
# Should be: owner=www-data, group=www-data, permissions=755 for directories, 644 for files

# 2. Fix web permissions:
sudo chown -R www-data:www-data /var/www/html
sudo find /var/www/html -type d -exec chmod 755 {} \;
sudo find /var/www/html -type f -exec chmod 644 {} \;

# Resource exhaustion:
# 1. Check server resources:
free -h                                      # Memory usage
df -h                                        # Disk space
iostat -x 1 5                               # I/O performance

# 2. Check Apache/Nginx worker processes:
# Apache MPM status:
apache2ctl status                            # Shows current connections and workers
# If unavailable, enable mod_status

# Nginx status:
curl http://localhost/nginx_status           # If nginx status module enabled

# 3. Adjust worker configuration:
# Apache: Edit /etc/apache2/mods-available/mpm_prefork.conf
# Nginx: Edit /etc/nginx/nginx.conf worker_processes and worker_connections

# Port conflicts:
# 1. Check what's using web ports:
sudo lsof -i :80                             # HTTP port usage
sudo lsof -i :443                            # HTTPS port usage
sudo ss -tulpn | grep ":80\|:443"           # Alternative port check

# 2. Resolve conflicts:
sudo systemctl stop conflicting-service     # Stop conflicting service
# Or change port configuration in web server config

# SSL/TLS certificate issues:
# 1. Check certificate validity:
openssl x509 -in /path/to/certificate.crt -text -noout  # Certificate details
openssl x509 -in /path/to/certificate.crt -dates -noout # Expiration dates

# 2. Test SSL configuration:
openssl s_client -connect localhost:443     # Test SSL connection
curl -k https://localhost                    # Test ignoring certificate errors

# 3. Common SSL fixes:
# - Renew expired certificates
# - Fix certificate chain issues
# - Correct private key permissions (600)
# - Update cipher suites for security

# Database connectivity issues:
# 1. Test database connection:
mysql -u dbuser -p -h localhost              # Test MySQL connection
psql -U dbuser -h localhost dbname           # Test PostgreSQL connection

# 2. Check database service:
systemctl status mysql                       # MySQL service status
systemctl status postgresql                  # PostgreSQL service status

# 3. Web application database errors:
# Check application logs:
tail -f /var/log/apache2/error.log | grep -i database
# Common issues: wrong credentials, database server down, connection limits
```

### **Scenario 10: "Database performance issues"**

**Problem Description:** Database queries are slow, applications timeout, database locks, or connection errors.

**Database troubleshooting methodology:**

```bash
# MySQL/MariaDB Performance Issues:

# Step 1: Check database service status
systemctl status mysql                       # Service status
systemctl status mariadb                     # MariaDB status
mysqladmin ping                              # Test database responsiveness
mysqladmin status                            # Basic database statistics

# Step 2: Check database connections
mysqladmin processlist                       # Show current connections and queries
# Look for: long-running queries, locked queries, too many connections

# Step 3: Monitor database performance
mysqladmin extended-status | grep -E "(Threads_connected|Threads_running|Slow_queries)"
# Threads_connected: current connections
# Threads_running: actively running queries  
# Slow_queries: queries taking longer than long_query_time

# Step 4: Check database logs
tail -f /var/log/mysql/error.log             # MySQL error log
tail -f /var/log/mysql/slow.log              # Slow query log (if enabled)
journalctl -u mysql -f                       # Systemd logs

# Database performance analysis:
# 1. Enable slow query log (temporarily):
mysql -u root -p -e "SET GLOBAL slow_query_log = 'ON';"
mysql -u root -p -e "SET GLOBAL long_query_time = 2;"  # Log queries >2 seconds

# 2. Analyze slow queries:
mysqldumpslow /var/log/mysql/slow.log        # Summarize slow query log
# Look for: frequently slow queries, queries without indexes

# 3. Check database engine status:
mysql -u root -p -e "SHOW ENGINE INNODB STATUS\G" | less
# Look for: deadlocks, lock waits, buffer pool efficiency

# Common database fixes:
# 1. Kill long-running queries:
mysql -u root -p -e "SHOW PROCESSLIST;"      # Get process IDs
mysql -u root -p -e "KILL [process_id];"     # Kill specific query

# 2. Optimize database configuration:
# Edit /etc/mysql/my.cnf or /etc/mysql/mysql.conf.d/mysqld.cnf
# Key parameters to adjust:
# innodb_buffer_pool_size = 70% of available RAM
# max_connections = adjust based on load
# query_cache_size = 32M (for read-heavy workloads)
# tmp_table_size = 32M
# max_heap_table_size = 32M

# 3. Database maintenance:
mysql -u root -p -e "ANALYZE TABLE database.table;"  # Update table statistics
mysql -u root -p -e "OPTIMIZE TABLE database.table;" # Defragment table
mysqlcheck -u root -p --auto-repair --all-databases  # Check and repair all tables

# PostgreSQL Performance Issues:

# Step 1: Check PostgreSQL status
systemctl status postgresql                  # Service status
pg_isready                                   # Test database readiness
psql -U postgres -c "SELECT version();"     # Test connection and version

# Step 2: Monitor active connections and queries:
psql -U postgres -c "SELECT * FROM pg_stat_activity;" # Current connections
# Look for: long-running queries (state != 'idle'), blocked queries

# Step 3: Check PostgreSQL logs:
tail -f /var/log/postgresql/postgresql-*-main.log  # Main log file
journalctl -u postgresql -f                 # Systemd logs

# Step 4: PostgreSQL performance analysis:
# 1. Check database statistics:
psql -U postgres -c "SELECT * FROM pg_stat_database;" # Database stats
psql -U postgres -c "SELECT * FROM pg_stat_user_tables;" # Table statistics

# 2. Find slow queries:
# Enable logging in /etc/postgresql/*/main/postgresql.conf:
# log_min_duration_statement = 1000          # Log queries >1 second
# log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '

# 3. Common PostgreSQL fixes:
# Kill long-running queries:
psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state != 'idle' AND query_start < NOW() - INTERVAL '5 minutes';"

# Vacuum and analyze tables:
psql -U postgres -d database -c "VACUUM ANALYZE;"  # Update statistics and clean up

# Monitor locks and blocks:
psql -U postgres -c "SELECT * FROM pg_locks WHERE NOT granted;" # Blocked queries
```

## System Security Issues

### **Scenario 11: "Suspected security breach or malware"**

**Problem Description:** Unusual system behavior, unexpected network connections, high resource usage, or suspected unauthorized access.

**Security incident response:**

```bash
# Step 1: Immediate assessment
# Check currently logged-in users:
who                                          # Current users
w                                            # Detailed user activity
last | head -20                              # Recent login history
lastb | head -10                             # Failed login attempts

# Check unusual processes:
ps aux --sort=-%cpu | head -20               # High CPU processes
ps aux --sort=-%mem | head -20               # High memory processes
ps aux | grep -E "(nc|netcat|ncat|socat|telnet|ssh|ftp)" # Network tools

# Check network connections:
ss -tupln                                    # All listening ports
ss -tuap                                     # All connections with process info
lsof -i                                      # Files/processes using network

# Step 2: Check for unauthorized changes
# File integrity checking:
find /etc -type f -mtime -1                 # Recently modified config files
find /bin /sbin /usr/bin /usr/sbin -type f -mtime -7  # Recently modified binaries
find / -name "*.sh" -type f -mtime -1 2>/dev/null     # Recent shell scripts

# Check for suspicious files:
find /tmp -type f -executable               # Executable files in /tmp
find /var/tmp -type f -executable           # Executable files in /var/tmp
find /dev/shm -type f 2>/dev/null           # Files in shared memory

# Step 3: Analyze system logs
# Authentication logs:
grep -i "failed\|invalid\|break-in" /var/log/auth.log | tail -50
grep -i "accepted\|session opened" /var/log/auth.log | tail -20

# System logs:
journalctl --since "24 hours ago" | grep -i -E "(fail|error|attack|intrusion)"
dmesg | grep -i -E "(kill|attack|exploit)"

# Web server logs (if applicable):
tail -1000 /var/log/apache2/access.log | grep -E "(POST|PUT|DELETE)" | grep -v "200"
tail -1000 /var/log/nginx/access.log | awk '$9 >= 400' # HTTP error codes

# Step 4: Network security analysis
# Check for suspicious connections:
netstat -an | grep ESTABLISHED | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | sort -nr
# Look for: unusual IP addresses, high connection counts

# Check DNS queries (if logging enabled):
tail -1000 /var/log/syslog | grep -i dns    # DNS queries
# Look for: suspicious domain names, DNS tunneling attempts

# Step 5: Malware detection
# Install and run security scanners:
sudo apt update && sudo apt install clamav clamav-daemon
sudo freshclam                               # Update virus definitions
sudo clamscan -r /home /tmp /var/tmp        # Scan common infection areas

# Rootkit detection:
sudo apt install rkhunter chkrootkit
sudo rkhunter --update
sudo rkhunter --check                        # Comprehensive rootkit scan
sudo chkrootkit                              # Alternative rootkit scanner
```

**Security hardening and recovery:**

```bash
# Immediate security measures:
# 1. Change all passwords:
sudo passwd root                             # Root password
passwd                                       # Current user password
# Force password change for all users:
sudo chage -d 0 username                     # Force password change on next login

# 2. Disable/remove suspicious users:
sudo usermod -L username                     # Lock user account
sudo userdel -r username                     # Remove user and home directory

# 3. Secure SSH access:
# Edit /etc/ssh/sshd_config:
# PermitRootLogin no
# PasswordAuthentication no
# PubkeyAuthentication yes
# Port 2222                                  # Change default port
sudo systemctl restart sshd

# 4. Configure firewall:
sudo ufw enable                              # Enable UFW firewall
sudo ufw default deny incoming               # Block all incoming by default
sudo ufw allow ssh                           # Allow SSH
sudo ufw allow 80/tcp                        # Allow HTTP if needed
sudo ufw allow 443/tcp                       # Allow HTTPS if needed

# 5. Install intrusion detection:
sudo apt install fail2ban                    # Install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Configure fail2ban (/etc/fail2ban/jail.local):
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
EOF
sudo systemctl restart fail2ban

# 6. System hardening:
# Disable unnecessary services:
systemctl list-units --type=service --state=running
sudo systemctl disable service-name         # Disable unused services

# Set proper file permissions:
sudo chmod 700 /root                         # Secure root home
sudo chmod 600 /etc/shadow                   # Secure password file
sudo chmod 644 /etc/passwd                   # User database

# Update system:
sudo apt update && sudo apt upgrade -y       # Update all packages
sudo apt autoremove                          # Remove unused packages

# 7. Monitoring and logging:
# Enable process accounting:
sudo apt install acct
sudo systemctl enable acct
sudo systemctl start acct

# Set up log monitoring:
sudo apt install logwatch
# Configure logwatch to email daily reports

# File integrity monitoring:
sudo apt install aide
sudo aideinit                                # Initialize database
sudo aide --check                            # Check for changes
```

### **Scenario 12: "System crashes and kernel panics"**

**Problem Description:** System randomly crashes, kernel panic messages, system freezes, or unexpected reboots.

**Crash analysis and troubleshooting:**

```bash
# Step 1: Gather crash information
# Check system logs for crash details:
journalctl -b -1                             # Previous boot logs
journalctl --since "24 hours ago" | grep -i -E "(panic|oops|bug|crash|segfault)"
dmesg | grep -i -E "(panic|oops|bug|crash)"  # Kernel messages

# Check crash dumps (if configured):
ls -la /var/crash/                           # Ubuntu crash dumps
ls -la /var/lib/systemd/coredump/            # Systemd core dumps

# Step 2: Hardware diagnostics
# Memory testing:
sudo memtester 1G 3                          # Test 1GB RAM, 3 passes
# Note: This requires free memory, may need to run from single-user mode

# Check hardware logs:
dmesg | grep -i -E "(hardware|temperature|thermal|mce|edac)"
# Look for: overheating, memory errors, hardware failures

# CPU and temperature monitoring:
sensors                                      # Hardware sensors (install lm-sensors)
# Look for: high temperatures, fan failures

# Hard drive health:
sudo smartctl -a /dev/sda                    # SMART data for /dev/sda
sudo smartctl -t short /dev/sda              # Run short self-test
# Look for: reallocated sectors, pending sectors, hardware errors

# Step 3: Software analysis
# Check for problematic drivers/modules:
lsmod                                        # Loaded kernel modules
dmesg | grep -i -E "(module|driver)" | tail -20

# Check recent software changes:
cat /var/log/dpkg.log | tail -50             # Recent package changes (Debian/Ubuntu)
cat /var/log/yum.log | tail -50              # Recent package changes (CentOS/RHEL)

# Step 4: System stability testing
# Stress testing (install stress-ng):
sudo apt install stress-ng
stress-ng --cpu 4 --timeout 300s            # CPU stress test for 5 minutes
stress-ng --vm 2 --vm-bytes 1G --timeout 300s  # Memory stress test

# Monitor during stress test:
watch -n 1 'dmesg | tail -10'               # Watch for kernel messages
watch -n 1 'sensors'                         # Monitor temperatures

# Common crash solutions:
# 1. Memory issues:
# Boot with reduced memory to test:
# Add to kernel parameters: mem=2G           # Limit to 2GB RAM
# Replace or remove faulty RAM modules

# 2. Overheating:
# Clean dust from fans and heat sinks
# Check thermal paste on CPU
# Improve case ventilation
# Reduce CPU frequency temporarily:
echo 'conservative' | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# 3. Driver issues:
# Boot with older kernel version
# Blacklist problematic modules:
echo 'blacklist module_name' | sudo tee -a /etc/modprobe.d/blacklist.conf

# 4. Filesystem corruption:
# Boot from rescue media and run:
sudo fsck -f /dev/sda1                       # Force filesystem check
sudo fsck -c /dev/sda1                       # Check for bad blocks

# 5. Power supply issues:
# Check power supply stability
# Monitor voltage levels with hardware tools
# Test with different power supply if available
```

## Recovery and Backup Procedures

### **Scenario 13: "Data recovery after accidental deletion"**

**Problem Description:** Important files or directories were accidentally deleted, need to recover data before it's permanently lost.

**Data recovery procedures:**

```bash
# IMPORTANT: Stop writing to the affected filesystem immediately!
# Every write operation reduces chances of successful recovery

# Step 1: Assess the situation
df -h                                        # Check available space on filesystems
mount | grep -E "(ext[234]|xfs|btrfs)"      # Identify filesystem types
lsof | grep deleted                          # Find processes with deleted files still open

# Step 2: Check for simple recovery options
# Look in trash/recycle bin:
ls -la ~/.local/share/Trash/files/          # User trash (GNOME/KDE)
ls -la ~/.trash/                            # Alternative trash location

# Check backup locations:
ls -la /home/.backup/                       # User backups
ls -la /var/backups/                        # System backups
ls -la /backup/                             # Common backup location

# Step 3: Recover from deleted but open files
# If process still has file open:
lsof | grep deleted | grep filename         # Find process with deleted file
# Copy from /proc filesystem:
sudo cp /proc/[PID]/fd/[FD] /path/to/recovery/location

# Step 4: Filesystem-specific recovery

# For ext2/ext3/ext4 filesystems:
sudo apt install extundelete                # Install recovery tool
# Unmount filesystem (if possible):
sudo umount /dev/sda1                       # Replace with actual partition

# Recover specific file:
sudo extundelete /dev/sda1 --restore-file path/to/deleted/file
# Recover all deleted files:
sudo extundelete /dev/sda1 --restore-all
# Recovered files go to ./RECOVERED_FILES/

# For more complex recovery:
sudo apt install testdisk photorec          # Advanced recovery tools
sudo photorec                               # Recover files by type
sudo testdisk                               # Recover partitions and boot sectors

# Step 5: Advanced recovery with ddrescue
# Create disk image first (safer):
sudo apt install gddrescue
sudo ddrescue /dev/sda1 /path/to/recovery.img /path/to/recovery.log
# Then work on the image instead of original disk

# Step 6: Alternative recovery methods
# Using grep to find file content in raw disk:
sudo grep -a -C 500 "unique string from file" /dev/sda1 > recovered_data.txt
# Search for text that was in the deleted file

# Using strings to extract readable text:
sudo strings /dev/sda1 | grep -A 10 -B 10 "known file content" > recovered.txt
```

**Backup strategy implementation:**

```bash
# Implement comprehensive backup strategy:

# 1. Daily incremental backups:
cat > /usr/local/bin/daily-backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backup/daily"
SOURCE_DIRS="/home /etc /var/www"
DATE=$(date +%Y%m%d)

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create incremental backup
rsync -av --link-dest="$BACKUP_DIR/latest" $SOURCE_DIRS "$BACKUP_DIR/$DATE/"

# Update latest symlink
rm -f "$BACKUP_DIR/latest"
ln -s "$DATE" "$BACKUP_DIR/latest"

# Clean old backups (keep 30 days)
find "$BACKUP_DIR" -maxdepth 1 -type d -mtime +30 -exec rm -rf {} \;

# Log backup completion
echo "Backup completed at $(date)" >> /var/log/backup.log
EOF
chmod +x /usr/local/bin/daily-backup.sh

# Schedule daily backup:
echo "0 2 * * * /usr/local/bin/daily-backup.sh" | crontab -

# 2. Database backups:
cat > /usr/local/bin/db-backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backup/databases"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# MySQL backup:
mysqldump --all-databases --single-transaction --routines --triggers > "$BACKUP_DIR/mysql_$DATE.sql"
gzip "$BACKUP_DIR/mysql_$DATE.sql"

# PostgreSQL backup:
sudo -u postgres pg_dumpall > "$BACKUP_DIR/postgresql_$DATE.sql"
gzip "$BACKUP_DIR/postgresql_$DATE.sql"

# Clean old database backups (keep 14 days)
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +14 -delete

echo "Database backup completed at $(date)" >> /var/log/backup.log
EOF
chmod +x /usr/local/bin/db-backup.sh

# 3. System configuration backup:
cat > /usr/local/bin/config-backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backup/config"
DATE=$(date +%Y%m%d)

mkdir -p "$BACKUP_DIR"

# Backup system configuration
tar -czf "$BACKUP_DIR/etc_$DATE.tar.gz" /etc/
tar -czf "$BACKUP_DIR/boot_$DATE.tar.gz" /boot/

# Backup package lists:
dpkg --get-selections > "$BACKUP_DIR/package_list_$DATE.txt"
apt-mark showmanual > "$BACKUP_DIR/manual_packages_$DATE.txt"

# Clean old config backups (keep 60 days)
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +60 -delete
find "$BACKUP_DIR" -name "*.txt" -mtime +60 -delete

echo "Configuration backup completed at $(date)" >> /var/log/backup.log
EOF
chmod +x /usr/local/bin/config-backup.sh

# 4. Remote backup synchronization:
cat > /usr/local/bin/remote-sync.sh << 'EOF'
#!/bin/bash
REMOTE_HOST="backup-server.example.com"
REMOTE_USER="backup"
LOCAL_BACKUP="/backup"
REMOTE_BACKUP="/remote-backup/$(hostname)"

# Sync to remote server
rsync -av --delete-after "$LOCAL_BACKUP/" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_BACKUP/"

# Log sync completion
if [ $? -eq 0 ]; then
    echo "Remote sync completed successfully at $(date)" >> /var/log/backup.log
else
    echo "Remote sync failed at $(date)" >> /var/log/backup.log
fi
EOF
chmod +x /usr/local/bin/remote-sync.sh

# 5. Backup verification:
cat > /usr/local/bin/verify-backups.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backup"

# Check if backup directories exist and contain recent files
if [ ! -d "$BACKUP_DIR/daily/latest" ]; then
    echo "ERROR: Daily backup missing" | mail -s "Backup Alert" admin@domain.com
fi

# Check backup age
LATEST_BACKUP=$(find "$BACKUP_DIR" -type f -name "*.tar.gz" -o -name "*.sql.gz" | head -1)
if [ -n "$LATEST_BACKUP" ]; then
    BACKUP_AGE=$(find "$LATEST_BACKUP" -mtime +2)
    if [ -n "$BACKUP_AGE" ]; then
        echo "WARNING: Backup is older than 2 days" | mail -s "Backup Alert" admin@domain.com
    fi
fi

# Test backup integrity
find "$BACKUP_DIR" -name "*.tar.gz" -exec tar -tzf {} \; > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "ERROR: Backup integrity check failed" | mail -s "Backup Alert" admin@domain.com
fi
EOF
chmod +x /usr/local/bin/verify-backups.sh

# Schedule all backup scripts:
# 0 2 * * * /usr/local/bin/daily-backup.sh       # Daily at 2 AM
# 0 3 * * * /usr/local/bin/db-backup.sh          # Daily at 3 AM  
# 0 4 * * 0 /usr/local/bin/config-backup.sh      # Weekly at 4 AM on Sunday
# 0 5 * * * /usr/local/bin/remote-sync.sh        # Daily at 5 AM
# 0 6 * * * /usr/local/bin/verify-backups.sh     # Daily at 6 AM
```

## Emergency Procedures and System Recovery

### **Final Emergency Recovery Checklist**

**When all else fails - Emergency System Recovery:**

```bash
# 1. Boot Recovery Environment:
# - Boot from USB/DVD installer
# - Choose "Rescue Mode" or "Try Ubuntu/Live Mode"
# - Open terminal

# 2. Mount and Access System:
sudo fdisk -l                               # Identify system partitions
sudo mkdir /mnt/system
sudo mount /dev/sda1 /mnt/system            # Mount root partition
sudo mount /dev/sda2 /mnt/system/boot       # Mount boot partition (if separate)
sudo mount --bind /dev /mnt/system/dev
sudo mount --bind /proc /mnt/system/proc
sudo mount --bind /sys /mnt/system/sys
sudo chroot /mnt/system                      # Enter system environment

# 3. Critical System Repairs:
# Fix boot loader:
grub-install /dev/sda
update-grub

# Fix filesystem corruption:
fsck -f /dev/sda1                           # Force filesystem check
fsck -y /dev/sda1                           # Auto-repair filesystem

# Reset root password:
passwd root

# Fix SSH access:
systemctl enable ssh
systemctl start ssh

# 4. Data Rescue Priority:
# Copy critical data first:
cp -r /home/user/important /backup/location
cp -r /etc /backup/location
cp -r /var/www /backup/location

# 5. System Restoration:
# Restore from backups:
rsync -av /backup/location/ /restored/location/

# Reinstall system packages:
apt update
apt install ubuntu-desktop                   # Or appropriate package group

# 6. Preventive Measures Post-Recovery:
# Implement monitoring:
apt install htop iotop nethogs
# Set up automated backups
# Configure system monitoring
# Document what went wrong and how it was fixed
```

This comprehensive troubleshooting guide provides systematic approaches to diagnosing and resolving the most common Linux system problems. Each scenario includes step-by-step procedures, command explanations, and prevention strategies to help maintain system stability and recover from various failure modes.