# Linux System Administration Commands Guide

**Category:** System Administration & DevOps  
**Tags:** linux, system-admin, process-management, file-operations, user-management, monitoring

## Essential System Administration Commands

**What this guide covers:** Comprehensive reference for Linux system administration commands covering process management, file operations, user management, system monitoring, and maintenance tasks.

**Why master these commands:** System administrators need these commands for daily operations, troubleshooting, automation, and maintaining healthy Linux systems. These are the foundation tools for managing servers and workstations.

## Process Management Commands

### **ps** - Display running processes

**What it does:** Shows information about currently running processes including process IDs (PIDs), CPU usage, memory usage, and command details.

**Why essential:** Process management is fundamental to system administration. You need to identify running processes, find resource-heavy applications, and manage system performance.

**When to use:** Troubleshoot high CPU/memory usage, find specific processes, monitor system activity, identify processes before killing them.

```bash
# Basic process listing
ps                                           # Shows processes for current user in current terminal
ps aux                                       # Shows ALL processes with detailed information (most common)
ps -ef                                       # Alternative format showing all processes with full command lines
ps -u username                               # Shows processes for specific user only

# Why: Get overview of system activity, identify resource usage,
# find processes by user, see complete command arguments

# Advanced process filtering
ps aux | grep nginx                          # Find specific processes by name
ps aux --sort=-%cpu                          # Sort by CPU usage (highest first)
ps aux --sort=-%mem                          # Sort by memory usage (highest first)
ps -eo pid,ppid,cmd,%mem,%cpu --sort=-%cpu  # Custom columns sorted by CPU

# Why: Quickly find problematic processes, identify resource hogs,
# get specific information about processes of interest

# Process tree view
ps auxf                                      # Shows process hierarchy (parent-child relationships)
ps -ejH                                      # Alternative tree view format
pstree                                       # Dedicated command for process tree visualization
pstree -p                                    # Process tree with PIDs

# Why: Understand process relationships, identify parent processes,
# see which processes spawn others, troubleshoot process dependencies
```

### **top/htop** - Real-time process monitoring

**What it does:** Displays and continuously updates information about running processes, system load, CPU usage, and memory usage in real-time.

**Why crucial:** Essential for real-time system monitoring, identifying performance bottlenecks, and watching system behavior as it changes.

**When to use:** System performance issues, monitor resource usage over time, identify processes causing problems, system capacity planning.

```bash
# Basic top usage
top                                          # Real-time process monitor with system summary
htop                                         # Enhanced version with better interface and features
top -u username                              # Show processes for specific user only
top -p 1234,5678                            # Monitor specific processes by PID

# Why: Watch system performance in real-time, see immediate impact of changes,
# identify intermittent performance issues

# Top interactive commands (while top is running)
# Press 'q' to quit
# Press 'k' then PID to kill process
# Press 'r' then PID to renice (change priority)
# Press 'M' to sort by memory usage
# Press 'P' to sort by CPU usage
# Press '1' to show individual CPU cores

# Why: Interactive control allows immediate response to problems,
# sort by different criteria to find issues, kill problematic processes immediately

# Advanced monitoring
top -b -n 1                                  # Batch mode - single snapshot (useful in scripts)
top -d 2                                     # Update every 2 seconds instead of default
watch -n 1 'ps aux --sort=-%cpu | head -10' # Alternative: watch top CPU processes

# Why: Automate monitoring in scripts, adjust update frequency for different needs,
# create custom monitoring views
```

### **kill/killall** - Terminate processes

**What it does:** Sends signals to processes to terminate them, restart them, or modify their behavior. Different signals provide different ways to stop processes.

**Why essential:** Sometimes processes hang, consume too many resources, or need to be restarted. Proper process termination is crucial for system stability.

**When to use:** Unresponsive applications, runaway processes consuming resources, scheduled process restarts, emergency system recovery.

```bash
# Basic process termination
kill 1234                                    # Sends TERM signal to process ID 1234 (polite shutdown)
kill -9 1234                                 # Sends KILL signal (force termination - last resort)
kill -15 1234                               # Sends TERM signal explicitly (same as kill 1234)
killall nginx                               # Kills all processes named "nginx"

# Why: TERM signal allows graceful shutdown (process can clean up),
# KILL signal forces immediate termination, killall affects multiple processes at once

# Different signal types
kill -HUP 1234                              # Hangup signal (often causes process to reload config)
kill -USR1 1234                             # User-defined signal 1 (application-specific behavior)
kill -STOP 1234                             # Stops process (can be resumed)
kill -CONT 1234                             # Continues stopped process

# Why: Different signals provide different process control options,
# HUP often reloads configuration without full restart,
# STOP/CONT allows pausing processes temporarily

# Find and kill processes
pkill nginx                                  # Kills processes by name (more flexible than killall)
pkill -u username                            # Kills all processes owned by user
pkill -f "python script.py"                 # Kills processes matching command line pattern
pgrep nginx                                  # Finds process IDs by name (doesn't kill)

# Why: More flexible process identification, kill by user or command pattern,
# pgrep helps verify what will be killed before actually killing
```

### **jobs/bg/fg** - Job control

**What it does:** Manages processes started from the current shell, allowing you to run processes in background, bring them to foreground, and control job execution.

**Why useful:** Allows multitasking in terminal, run long processes in background while continuing to work, manage multiple tasks efficiently.

**When to use:** Running long-running tasks, managing multiple terminal processes, continuing work while processes run in background.

```bash
# Job control basics
command &                                    # Runs command in background immediately
jobs                                         # Lists all jobs running from current shell
fg                                          # Brings most recent background job to foreground
fg %1                                       # Brings specific job number to foreground
bg                                          # Resumes most recent stopped job in background

# Why: Continue working while long processes run, manage multiple tasks,
# switch between different running processes

# Practical job control
./long-script.sh &                          # Start script in background
# Press Ctrl+Z to stop current foreground process
bg                                          # Resume stopped process in background
nohup ./script.sh &                         # Run process that survives shell logout
disown %1                                   # Detach job from shell (survives shell exit)

# Why: Keep processes running after logout, handle accidental stops,
# manage processes independently of shell session
```

## File Operations Commands

### **ls** - List directory contents

**What it does:** Displays files and directories in specified locations with various formatting and filtering options.

**Why fundamental:** Basic file system navigation and information gathering. Essential for understanding directory structure and file properties.

**When to use:** Navigate file system, check file permissions, find files, verify file modifications, audit directory contents.

```bash
# Basic directory listing
ls                                           # Lists files in current directory
ls /path/to/directory                        # Lists files in specific directory
ls -l                                        # Long format with permissions, ownership, size, dates
ls -la                                       # Long format including hidden files (starting with .)
ls -lh                                       # Long format with human-readable file sizes (KB, MB, GB)

# Why: See what files exist, check file details, verify permissions,
# understand directory structure

# Advanced listing options
ls -lt                                       # Sort by modification time (newest first)
ls -lS                                       # Sort by file size (largest first)
ls -lR                                       # Recursive listing (shows subdirectories)
ls -d */                                     # List only directories
ls *.txt                                     # List files matching pattern

# Why: Find recently modified files, identify large files taking space,
# explore directory structure, filter by file type

# Detailed file information
ls -li                                       # Shows inode numbers (useful for hardlink identification)
ls --color=always                            # Force colored output even when piped
ls -F                                        # Add indicators (/ for directories, * for executables)
ls -1                                        # One file per line (useful for scripting)

# Why: Understand file system structure at low level, create readable output,
# identify different file types visually, format for script processing
```

### **find** - Search for files and directories

**What it does:** Recursively searches directory trees for files and directories matching specified criteria. Can execute commands on found files.

**Why powerful:** Most flexible file searching tool. Can find files by name, size, date, permissions, content, and many other criteria. Essential for system administration and maintenance.

**When to use:** Locate specific files, find large files consuming disk space, search for security issues, automate file management tasks, clean up old files.

```bash
# Basic file searching
find /path -name "filename"                  # Find files with exact name
find /path -name "*.txt"                     # Find files matching pattern
find /path -iname "*.TXT"                    # Case-insensitive name search
find . -name "config*"                       # Find files starting with "config" in current directory

# Why: Locate specific files quickly, find files by pattern across directory tree,
# handle case-insensitive searches

# Search by file properties
find /path -type f                           # Find regular files only
find /path -type d                           # Find directories only
find /path -size +100M                       # Find files larger than 100MB
find /path -size -1k                         # Find files smaller than 1KB
find /path -mtime -7                         # Find files modified in last 7 days
find /path -mtime +30                        # Find files modified more than 30 days ago

# Why: Clean up large files, find recently changed files for troubleshooting,
# identify old files for archival, locate specific file types

# Search by permissions and ownership
find /path -perm 777                         # Find files with exact permissions
find /path -perm -u+w                        # Find files writable by owner
find /path -user username                    # Find files owned by specific user
find /path -group groupname                  # Find files owned by specific group
find /path -perm /u+s                        # Find files with setuid bit

# Why: Security auditing, find files with dangerous permissions,
# locate files owned by specific users, identify security risks

# Execute commands on found files
find /path -name "*.log" -delete             # Delete all .log files
find /path -name "*.tmp" -exec rm {} \;      # Alternative deletion method
find /path -name "*.txt" -exec wc -l {} \;   # Count lines in all .txt files
find /path -type f -exec chmod 644 {} \;     # Set permissions on all files

# Why: Automate file management, perform bulk operations,
# maintain file permissions, clean up unwanted files
```

### **chmod/chown** - Change file permissions and ownership

**What it does:** chmod changes file permissions (read, write, execute for owner, group, others). chown changes file ownership (user and group).

**Why critical:** File permissions are fundamental to Linux security. Proper permissions prevent unauthorized access and ensure system security.

**When to use:** Set up new files/directories, fix permission problems, secure sensitive files, configure web server files, troubleshoot access issues.

```bash
# chmod - Change permissions using numeric mode
chmod 755 file.txt                           # rwxr-xr-x (owner: rwx, group: rx, others: rx)
chmod 644 file.txt                           # rw-r--r-- (owner: rw, group: r, others: r)
chmod 600 file.txt                           # rw------- (owner: rw, group: none, others: none)
chmod 777 file.txt                           # rwxrwxrwx (everyone: rwx - dangerous!)

# Why: Numeric mode is precise and commonly used in documentation,
# 755 is common for directories, 644 for files, 600 for private files

# chmod - Change permissions using symbolic mode
chmod u+x file.txt                           # Add execute permission for owner
chmod g-w file.txt                           # Remove write permission for group
chmod o+r file.txt                           # Add read permission for others
chmod a+x file.txt                           # Add execute permission for all (owner, group, others)
chmod u=rw,g=r,o= file.txt                   # Set exact permissions (owner: rw, group: r, others: none)

# Why: Symbolic mode is more intuitive, easier to modify specific permissions,
# clearer when making incremental changes

# Recursive permission changes
chmod -R 755 /path/to/directory              # Apply permissions to directory and all contents
chmod -R u+w /path/to/directory              # Add write permission recursively
find /path -type f -exec chmod 644 {} \;     # Set file permissions only (not directories)
find /path -type d -exec chmod 755 {} \;     # Set directory permissions only

# Why: Configure entire directory trees, separate file and directory permissions,
# fix permission problems in bulk

# chown - Change ownership
chown user file.txt                          # Change owner to 'user'
chown user:group file.txt                    # Change owner to 'user' and group to 'group'
chown :group file.txt                        # Change group only
chown -R user:group /path/to/directory       # Change ownership recursively

# Why: Transfer file ownership, set up proper ownership for services,
# fix ownership problems after file transfers
```

### **cp/mv/rm** - Copy, move, and remove files

**What it does:** Basic file operations - copying files/directories, moving/renaming them, and deleting them.

**Why essential:** Fundamental file management operations needed daily for organizing files, making backups, cleaning up systems.

**When to use:** File organization, creating backups, system maintenance, installing/configuring software, cleaning up disk space.

```bash
# cp - Copy files and directories
cp file1.txt file2.txt                       # Copy file1 to file2 (creates new file)
cp file1.txt /path/to/destination/           # Copy file to different directory
cp -r directory1 directory2                  # Copy directory recursively
cp -p file1.txt file2.txt                    # Preserve permissions, timestamps, ownership
cp -u source/* destination/                  # Copy only if source is newer than destination

# Why: Create backups, duplicate files for modification,
# preserve file attributes when needed, efficient incremental copying

# Advanced copy options
cp -a source destination                     # Archive mode (preserves everything, recursive)
cp -i file1.txt file2.txt                    # Interactive mode (prompts before overwriting)
cp -v file1.txt file2.txt                    # Verbose mode (shows what's being copied)
cp --backup=numbered file1.txt file2.txt     # Create numbered backups of existing files

# Why: Complete file preservation, prevent accidental overwrites,
# see progress of copy operations, maintain backup versions

# mv - Move and rename files
mv oldname.txt newname.txt                   # Rename file
mv file.txt /path/to/destination/            # Move file to different directory
mv directory1 directory2                     # Rename directory
mv *.txt /path/to/destination/               # Move all .txt files

# Why: Organize files, rename for clarity, move files between locations,
# batch operations with wildcards

# rm - Remove files and directories
rm file.txt                                  # Delete file
rm -i file.txt                               # Interactive deletion (prompts for confirmation)
rm -f file.txt                               # Force deletion (no prompts, ignore non-existent files)
rm -r directory                              # Delete directory and contents recursively
rm -rf directory                             # Force recursive deletion (dangerous!)

# Why: Clean up unwanted files, remove old backups, free disk space,
# interactive mode prevents accidents

# Safe deletion practices
rm -i *.txt                                  # Confirm each deletion
ls -la before_deleting/                      # Always check contents before rm -rf
mv unwanted_directory /tmp/                  # Move to /tmp instead of immediate deletion
find /path -name "*.tmp" -mtime +7 -delete  # Safer automated cleanup

# Why: Prevent accidental data loss, provide opportunity to recover,
# automate cleanup safely with specific criteria
```

## User Management Commands

### **useradd/usermod/userdel** - User account management

**What it does:** Creates, modifies, and deletes user accounts on the system. Manages user properties like home directories, groups, shells, and account expiration.

**Why essential:** User management is fundamental to system security and administration. Proper user accounts ensure access control and system organization.

**When to use:** Setting up new users, modifying user properties, removing departed users, managing user access, configuring service accounts.

```bash
# useradd - Create new users
sudo useradd username                        # Create user with default settings
sudo useradd -m username                     # Create user with home directory
sudo useradd -m -s /bin/bash username       # Create user with specific shell
sudo useradd -m -G sudo,www-data username   # Create user and add to groups
sudo useradd -m -c "Full Name" username     # Create user with comment/description

# Why: Default settings may not be appropriate, home directories needed for user files,
# specific shells required for functionality, group membership for permissions

# Advanced user creation
sudo useradd -m -d /custom/home/path username     # Custom home directory location
sudo useradd -m -e 2024-12-31 username           # Account expires on specific date
sudo useradd -m -u 1500 username                 # Specify user ID
sudo useradd -r -s /bin/false serviceaccount     # Create system account (no login)

# Why: Custom home locations for specific setups, temporary accounts with expiration,
# specific UIDs for consistency, service accounts for applications

# usermod - Modify existing users
sudo usermod -aG sudo username               # Add user to additional group (append)
sudo usermod -G sudo,www-data username      # Set user's groups (replaces existing)
sudo usermod -s /bin/zsh username           # Change user's shell
sudo usermod -d /new/home username          # Change home directory
sudo usermod -l newname oldname             # Change username

# Why: Grant additional permissions through groups, change user preferences,
# relocate user data, rename accounts for clarity

# userdel - Delete users
sudo userdel username                        # Delete user account (keeps home directory)
sudo userdel -r username                     # Delete user and home directory
sudo userdel -f username                     # Force deletion even if user is logged in

# Why: Remove access for departed users, clean up unused accounts,
# force removal in emergency situations

# Verify user operations
id username                                  # Show user ID, group memberships
getent passwd username                       # Show user account details
groups username                              # Show user's group memberships
finger username                              # Show detailed user information

# Why: Verify changes were applied correctly, troubleshoot permission issues,
# audit user configuration
```

### **passwd/chage** - Password and account aging management

**What it does:** passwd changes user passwords. chage manages password aging policies including expiration dates, minimum age, and warning periods.

**Why important:** Password security is crucial for system protection. Password aging policies enforce regular password changes and account security.

**When to use:** New user setup, password resets, implementing security policies, managing account lockouts, configuring service accounts.

```bash
# passwd - Password management
passwd                                       # Change current user's password
sudo passwd username                         # Change another user's password (as root)
sudo passwd -l username                      # Lock user account (disable password login)
sudo passwd -u username                      # Unlock user account
sudo passwd -d username                      # Delete password (passwordless login - dangerous!)

# Why: Regular password changes for security, administrative password resets,
# temporarily disable accounts, emergency access configuration

# Advanced password options
sudo passwd -n 7 username                    # Set minimum password age (7 days)
sudo passwd -x 90 username                   # Set maximum password age (90 days)
sudo passwd -w 7 username                    # Set warning period (7 days before expiration)
sudo passwd -e username                      # Force password change on next login

# Why: Implement security policies, force password updates,
# provide advance warning of expiration, ensure regular password changes

# chage - Account aging management
chage -l username                            # Display password aging information
sudo chage -d 0 username                     # Force password change on next login
sudo chage -M 90 username                    # Set password to expire in 90 days
sudo chage -m 7 username                     # Set minimum password age to 7 days
sudo chage -W 14 username                    # Set warning period to 14 days

# Why: View current password policies, implement consistent aging policies,
# force password updates for security, provide user warnings

# Account expiration
sudo chage -E 2024-12-31 username           # Set account to expire on specific date
sudo chage -E -1 username                   # Remove account expiration
sudo chage -I 30 username                   # Set account inactive period after password expires

# Why: Temporary accounts with automatic expiration, remove expiration for permanent accounts,
# grace period for password updates
```

### **su/sudo** - Switch user and execute commands as other users

**What it does:** su switches to another user account. sudo executes commands as another user (typically root) with proper authentication and logging.

**Why crucial:** Administrative tasks require elevated privileges. These commands provide secure ways to gain necessary permissions while maintaining accountability.

**When to use:** Administrative tasks, troubleshooting user issues, running services as specific users, emergency system recovery.

```bash
# su - Switch user
su                                           # Switch to root user (requires root password)
su -                                         # Switch to root with full environment
su username                                  # Switch to specific user
su - username                                # Switch to user with their environment
exit                                         # Return to original user

# Why: Full user environment provides proper settings, specific user context for testing,
# root access for administrative tasks

# sudo - Execute commands as other users
sudo command                                 # Execute command as root
sudo -u username command                     # Execute command as specific user
sudo -i                                      # Start interactive root shell
sudo -s                                      # Start shell as root (keeps environment)
sudo -l                                      # List allowed sudo commands for current user

# Why: Temporary privilege elevation, maintain audit trail,
# granular permission control, safer than full root access

# Advanced sudo usage
sudo -k                                      # Clear sudo timestamp (require password again)
sudo -v                                      # Validate sudo credentials (extend timeout)
sudo !!                                      # Execute previous command with sudo
EDITOR=nano sudo visudo                      # Edit sudo configuration safely

# Why: Force re-authentication for security, extend session for multiple commands,
# quickly retry commands with elevated privileges, safely modify sudo settings

# Check user privileges
sudo -l -U username                          # Check what sudo privileges user has
groups                                       # Show current user's groups
id                                          # Show current user ID and group memberships
whoami                                      # Show current effective username

# Why: Audit user permissions, troubleshoot access issues,
# verify current user context, understand permission inheritance
```

## System Monitoring Commands

### **df/du** - Disk space monitoring

**What it does:** df shows filesystem disk space usage. du shows directory space usage. Essential for monitoring disk space and identifying what's consuming storage.

**Why critical:** Running out of disk space can crash systems, prevent logging, and stop services. Regular monitoring prevents storage-related outages.

**When to use:** System maintenance, troubleshooting disk space issues, capacity planning, identifying large files/directories for cleanup.

```bash
# df - Filesystem space usage
df -h                                        # Human-readable format (GB, MB, KB)
df -i                                        # Show inode usage instead of disk space
df -T                                        # Show filesystem type
df /path/to/directory                        # Show usage for specific filesystem
df --total                                   # Show total usage summary

# Why: Quick overview of all filesystem usage, identify full filesystems,
# monitor inode exhaustion, understand filesystem types

# Advanced df usage
df -h --exclude-type=tmpfs                   # Exclude temporary filesystems
df -h | grep -v snap                         # Exclude snap packages from output
watch -n 5 'df -h'                          # Monitor filesystem usage in real-time
df -h | awk '$5 > 80 {print $0}'            # Show filesystems over 80% full

# Why: Focus on persistent storage only, continuous monitoring for changes,
# automated alerting for high usage, filter relevant information

# du - Directory space usage
du -h /path/to/directory                     # Human-readable sizes for directory tree
du -sh /path/to/directory                    # Summary total for directory only
du -ah /path/to/directory                    # All files (not just directories)
du -h --max-depth=1 /path                    # Show only one level deep

# Why: Identify which directories consume most space, find large files,
# limit output depth for large directory trees

# Finding large files and directories
du -h /home | sort -hr | head -10            # Top 10 largest directories in /home
find /path -size +100M -exec ls -lh {} \;    # Find files larger than 100MB
find /path -type f -exec du -h {} \; | sort -hr | head -20  # Top 20 largest files
ncdu /path                                   # Interactive disk usage analyzer

# Why: Quickly identify space consumers, locate files for cleanup,
# interactive exploration of disk usage, prioritize cleanup efforts
```

### **free/vmstat** - Memory and system performance monitoring

**What it does:** free shows memory usage (RAM and swap). vmstat shows system performance statistics including memory, CPU, and I/O.

**Why essential:** Memory problems cause performance issues and system crashes. These tools help identify memory bottlenecks and system performance problems.

**When to use:** Performance troubleshooting, capacity planning, monitoring system health, identifying memory leaks.

```bash
# free - Memory usage
free -h                                      # Human-readable memory usage
free -m                                      # Memory usage in megabytes
free -s 5                                    # Update every 5 seconds
free -t                                      # Show total memory + swap

# Why: Quick memory overview, monitor memory usage over time,
# see total available memory, identify memory pressure

# Understanding free output
# total: Total physical RAM
# used: Used memory (buffers/cache + applications)
# free: Completely unused memory
# available: Memory available for new applications (includes reclaimable cache)
# buff/cache: Memory used for buffers and caching (can be reclaimed)

# vmstat - System performance statistics
vmstat                                       # Single snapshot of system stats
vmstat 5                                     # Update every 5 seconds
vmstat 5 10                                  # Update every 5 seconds, 10 times then exit
vmstat -S M                                  # Display values in megabytes

# Why: Monitor system performance trends, identify I/O bottlenecks,
# watch CPU and memory usage patterns, troubleshoot performance issues

# Key vmstat fields:
# procs: r=running processes, b=blocked processes
# memory: swpd=swap used, free=free memory, buff=buffers, cache=cache
# swap: si=swap in, so=swap out (should be near 0)
# io: bi=blocks in, bo=blocks out
# system: in=interrupts, cs=context switches
# cpu: us=user time, sy=system time, id=idle time, wa=wait time

# Advanced memory monitoring
cat /proc/meminfo                            # Detailed memory information
slabtop                                      # Kernel slab allocator information
sar -r 5 10                                  # Memory utilization over time
watch -n 1 'free -h && echo && ps aux --sort=-%mem | head -10'  # Memory usage with top processes

# Why: Deep memory analysis, kernel memory usage, historical memory data,
# combine memory overview with process details
```

### **iostat/iotop** - I/O performance monitoring

**What it does:** iostat shows input/output statistics for devices. iotop shows I/O usage by processes. Essential for diagnosing disk performance issues.

**Why important:** I/O bottlenecks are common performance problems. These tools help identify which processes or devices are causing I/O issues.

**When to use:** System slowness investigation, database performance issues, backup performance problems, storage troubleshooting.

```bash
# iostat - I/O statistics
iostat                                       # Basic I/O statistics snapshot
iostat -x                                    # Extended statistics with more details
iostat 5                                     # Update every 5 seconds
iostat -x 5 10                               # Extended stats, 5-second intervals, 10 reports

# Why: Identify I/O bottlenecks, monitor disk performance,
# track I/O patterns over time, troubleshoot storage issues

# Key iostat metrics:
# %util: Percentage of time device was busy (high = bottleneck)
# r/s, w/s: Read/write requests per second
# rkB/s, wkB/s: Read/write kilobytes per second
# await: Average wait time for I/O requests
# svctm: Average service time per I/O request

# iotop - I/O usage by process (requires root)
sudo iotop                                   # Real-time I/O usage by process
sudo iotop -o                                # Show only processes doing I/O
sudo iotop -a                                # Show accumulated I/O instead of current
sudo iotop -p PID                            # Monitor specific process

# Why: Identify which processes cause I/O load, troubleshoot specific applications,
# monitor I/O patterns by process, find I/O-heavy operations

# Alternative I/O monitoring
sudo iftop                                   # Network I/O by connection
dstat                                        # Combined system statistics
pidstat -d 5                                # Per-process I/O statistics
lsof +D /path                                # Show processes using specific directory

# Why: Network I/O analysis, comprehensive system view,
# detailed per-process I/O data, identify file usage conflicts
```

## Package Management Commands

### **apt/yum/dnf** - Package management

**What it does:** Package managers install, update, and remove software packages. Different distributions use different package managers.

**Why essential:** Software installation and updates are fundamental system administration tasks. Package managers handle dependencies and maintain system integrity.

**When to use:** Installing new software, applying security updates, removing unnecessary packages, maintaining system updates.

```bash
# APT (Debian/Ubuntu systems)
sudo apt update                              # Update package list from repositories
sudo apt upgrade                             # Upgrade all installed packages
sudo apt install package-name               # Install specific package
sudo apt remove package-name                # Remove package (keep configuration)
sudo apt purge package-name                 # Remove package and configuration files

# Why: Keep system secure with updates, install needed software,
# remove unused packages to save space, clean configuration when needed

# Advanced APT usage
apt search keyword                           # Search for packages
apt show package-name                        # Show package information
sudo apt autoremove                          # Remove orphaned dependencies
sudo apt autoclean                           # Clean package cache
apt list --installed                         # List installed packages
apt list --upgradable                        # Show packages with available updates

# Why: Find available software, understand package details,
# maintain clean system, monitor installed software

# YUM/DNF (RHEL/CentOS/Fedora systems)
sudo yum update                              # Update all packages (CentOS/RHEL 7)
sudo dnf update                              # Update all packages (CentOS/RHEL 8+, Fedora)
sudo yum install package-name                # Install package
sudo yum remove package-name                 # Remove package
yum search keyword                           # Search for packages

# Why: Different distributions require different package managers,
# same concepts with different syntax, maintain system across distributions

# Package information and maintenance
yum list installed                           # List installed packages
yum history                                  # Show package transaction history
sudo yum clean all                           # Clean package caches
yum provides /path/to/file                   # Find which package provides file

# Why: Audit installed software, track changes for troubleshooting,
# manage disk space usage, identify package sources
```

### **systemctl** - Service management

**What it does:** Controls systemd services - starting, stopping, enabling, disabling, and monitoring system services and processes.

**Why crucial:** Modern Linux systems use systemd for service management. Services like web servers, databases, and system processes need proper management.

**When to use:** Starting/stopping services, configuring automatic startup, troubleshooting service issues, monitoring service status.

```bash
# Basic service control
sudo systemctl start service-name           # Start service immediately
sudo systemctl stop service-name            # Stop service
sudo systemctl restart service-name         # Stop and start service
sudo systemctl reload service-name          # Reload configuration without stopping
sudo systemctl status service-name          # Show service status and recent logs

# Why: Control service availability, apply configuration changes,
# restart problematic services, check service health

# Service startup configuration
sudo systemctl enable service-name          # Enable service to start at boot
sudo systemctl disable service-name         # Disable service from starting at boot
sudo systemctl is-enabled service-name      # Check if service is enabled
sudo systemctl is-active service-name       # Check if service is currently running

# Why: Configure which services start automatically, manage startup time,
# verify service configuration, troubleshoot boot issues

# System-wide service management
systemctl list-units --type=service         # List all services
systemctl list-units --type=service --state=running  # List only running services
systemctl list-units --type=service --state=failed   # List failed services
systemctl --failed                          # Show failed services (shortcut)

# Why: Get overview of system services, identify problematic services,
# monitor system health, troubleshoot service dependencies

# Advanced service management
sudo systemctl mask service-name            # Prevent service from being started (stronger than disable)
sudo systemctl unmask service-name          # Remove mask from service
systemctl show service-name                 # Show detailed service properties
journalctl -u service-name                  # Show logs for specific service
journalctl -u service-name -f               # Follow logs for service in real-time

# Why: Completely prevent unwanted services, detailed service configuration,
# troubleshoot service issues with logs, monitor service behavior

# System control
sudo systemctl reboot                        # Reboot system
sudo systemctl poweroff                      # Shutdown system
sudo systemctl suspend                       # Suspend system
sudo systemctl hibernate                     # Hibernate system
systemctl get-default                        # Show default system target (runlevel)
sudo systemctl set-default multi-user.target # Set system to boot to command line

# Why: Controlled system shutdown/restart, power management,
# configure system boot behavior, server vs desktop configuration
```

## Log Management Commands

### **journalctl** - Systemd journal viewer

**What it does:** Views and analyzes systemd journal logs, which contain system and service messages. Modern replacement for traditional syslog viewing.

**Why essential:** Logs are crucial for troubleshooting system issues, security analysis, and understanding system behavior. journalctl provides powerful log analysis capabilities.

**When to use:** Troubleshooting service failures, security investigations, system performance analysis, monitoring system events.

```bash
# Basic log viewing
journalctl                                   # Show all journal entries (oldest first)
journalctl -r                                # Show entries in reverse order (newest first)
journalctl -f                                # Follow journal in real-time (like tail -f)
journalctl -n 50                             # Show last 50 entries
journalctl --no-pager                        # Don't use pager (show all output at once)

# Why: Get overview of system activity, monitor real-time events,
# focus on recent events, handle large log volumes

# Filter by service and unit
journalctl -u ssh                            # Show logs for SSH service
journalctl -u nginx.service                  # Show logs for nginx service
journalctl -u ssh -f                         # Follow SSH service logs in real-time
journalctl _PID=1234                         # Show logs for specific process ID

# Why: Focus on specific service issues, monitor critical services,
# troubleshoot service-specific problems, track process behavior

# Time-based filtering
journalctl --since "2023-01-01"             # Logs since specific date
journalctl --since "1 hour ago"             # Logs from last hour
journalctl --since yesterday                 # Logs since yesterday
journalctl --until "30 min ago"             # Logs until 30 minutes ago
journalctl --since "09:00" --until "17:00"  # Logs between specific times

# Why: Focus on relevant time periods, investigate specific incidents,
# analyze system behavior during known events

# Priority and severity filtering
journalctl -p err                            # Show only error messages and above
journalctl -p warning                        # Show warning messages and above
journalctl -p debug                          # Show all messages including debug
journalctl -p crit                           # Show only critical messages

# Why: Focus on serious issues, filter noise from logs,
# identify critical system problems, adjust detail level

# Advanced filtering and analysis
journalctl -k                                # Show kernel messages only
journalctl -b                                # Show logs from current boot
journalctl -b -1                             # Show logs from previous boot
journalctl --list-boots                      # List all boots with timestamps
journalctl -o json                           # Output in JSON format
journalctl --disk-usage                      # Show journal disk usage

# Why: Focus on kernel issues, compare current vs previous boot,
# analyze boot problems, structured data processing, manage log storage

# System maintenance
sudo journalctl --vacuum-size=100M           # Keep only 100MB of logs
sudo journalctl --vacuum-time=30d            # Keep only last 30 days of logs
sudo journalctl --verify                     # Verify journal integrity
sudo journalctl --rotate                     # Rotate journal files

# Why: Manage disk space usage, comply with retention policies,
# ensure log integrity, organize log files
```

### **tail/head/grep** - Log file analysis

**What it does:** tail shows end of files, head shows beginning, grep searches for patterns. Essential for analyzing traditional log files.

**Why important:** Many applications still use traditional log files. These tools provide powerful log analysis capabilities for troubleshooting and monitoring.

**When to use:** Analyzing application logs, monitoring log files in real-time, searching for specific events, extracting relevant information.

```bash
# tail - View end of files
tail /var/log/syslog                         # Show last 10 lines of syslog
tail -n 50 /var/log/apache2/error.log        # Show last 50 lines
tail -f /var/log/nginx/access.log            # Follow log file in real-time
tail -F /var/log/app.log                     # Follow file even if it's rotated

# Why: See recent events quickly, monitor ongoing activity,
# handle log rotation gracefully, focus on current issues

# head - View beginning of files
head /var/log/syslog                         # Show first 10 lines
head -n 100 /var/log/boot.log               # Show first 100 lines
head -c 1024 /var/log/large.log             # Show first 1024 characters

# Why: See how logs start, check log format, sample large log files,
# understand log structure before analysis

# grep - Search for patterns
grep "ERROR" /var/log/application.log        # Find lines containing "ERROR"
grep -i "error" /var/log/application.log     # Case-insensitive search
grep -n "404" /var/log/nginx/access.log     # Show line numbers with matches
grep -A 5 -B 5 "CRITICAL" /var/log/app.log  # Show 5 lines before and after matches

# Why: Find specific events quickly, case-insensitive searches,
# locate problems in logs, see context around issues

# Advanced log analysis
grep -E "(ERROR|WARN|CRITICAL)" /var/log/app.log  # Multiple patterns with regex
grep -v "INFO" /var/log/app.log | head -20   # Exclude INFO messages, show first 20
tail -f /var/log/nginx/access.log | grep "404"  # Real-time monitoring for 404 errors
zgrep "ERROR" /var/log/app.log.gz            # Search compressed log files

# Why: Complex pattern matching, filter unwanted messages,
# real-time filtered monitoring, search archived logs

# Combining commands for powerful analysis
tail -1000 /var/log/auth.log | grep "Failed password" | wc -l  # Count recent failed logins
grep "$(date +%Y-%m-%d)" /var/log/syslog | grep ERROR  # Today's errors only
find /var/log -name "*.log" -exec grep -l "OutOfMemory" {} \;  # Find logs containing memory errors

# Why: Quantify security events, time-based analysis,
# search across multiple log files, identify system-wide issues
```

## Performance Monitoring Commands

### **uptime/w/who** - System load and user activity

**What it does:** uptime shows system load averages and uptime. w shows logged-in users and their activity. who shows who is logged in.

**Why useful:** System load indicates performance health. User activity monitoring is important for security and resource management.

**When to use:** Quick system health check, identify high load periods, monitor user access, security auditing.

```bash
# uptime - System load and uptime
uptime                                       # Show uptime and load averages
# Output: up 15 days, 2:30, 3 users, load average: 0.15, 0.10, 0.05

# Understanding load averages:
# First number: 1-minute average
# Second number: 5-minute average  
# Third number: 15-minute average
# Values represent number of processes waiting for CPU
# On single-core system: 1.0 = fully loaded, >1.0 = overloaded
# On multi-core system: multiply by number of cores

# Why: Quick performance overview, identify system stress,
# understand load trends over time, capacity planning

# w - Show logged-in users and their activity
w                                            # Show all logged-in users with activity
w username                                   # Show specific user's activity

# Output columns:
# USER: Username
# TTY: Terminal type
# FROM: Source IP/hostname
# LOGIN@: Login time
# IDLE: Idle time
# JCPU: Total CPU time for all processes
# PCPU: CPU time for current process
# WHAT: Current command

# Why: Monitor user access, identify suspicious activity,
# see what users are doing, troubleshoot user issues

# who - Show who is logged in
who                                          # Show logged-in users
who -a                                       # Show all information
who -b                                       # Show last system boot time
who -r                                       # Show current runlevel

# Why: Simple user presence check, verify system boot time,
# check system state, security monitoring

# User session monitoring
last                                         # Show login history
last username                                # Show specific user's login history
last -n 10                                   # Show last 10 login sessions
lastb                                        # Show failed login attempts
lastlog                                      # Show last login for all users

# Why: Security auditing, track user access patterns,
# identify unauthorized access attempts, compliance reporting
```

### **sar** - System Activity Reporter

**What it does:** Collects and reports system activity information including CPU, memory, I/O, and network statistics over time.

**Why powerful:** Provides historical system performance data, essential for identifying trends and performance patterns that momentary snapshots miss.

**When to use:** Performance trend analysis, capacity planning, identifying recurring performance issues, system optimization.

```bash
# CPU monitoring
sar                                          # Show CPU usage for current day
sar -u 5 10                                  # CPU usage every 5 seconds, 10 reports
sar -u -f /var/log/sysstat/saXX             # CPU usage from specific date file

# Why: Historical CPU usage patterns, identify peak usage times,
# track CPU performance trends, compare different time periods

# Memory monitoring
sar -r 5 10                                  # Memory utilization every 5 seconds
sar -S 5 10                                  # Swap utilization monitoring
sar -W 5 10                                  # Swapping statistics

# Why: Memory usage trends, identify memory leaks,
# monitor swap usage patterns, capacity planning

# I/O monitoring
sar -d 5 10                                  # Disk I/O statistics
sar -b 5 10                                  # I/O transfer rate statistics
sar -p 5 10                                  # Block device statistics

# Why: Identify I/O bottlenecks, track storage performance,
# monitor disk utilization trends, optimize storage configuration

# Network monitoring
sar -n DEV 5 10                              # Network device statistics
sar -n EDEV 5 10                             # Network error statistics
sar -n TCP 5 10                              # TCP connection statistics

# Why: Network performance analysis, identify network bottlenecks,
# monitor network errors, track connection patterns

# Generate reports
sar -A                                       # All available statistics for today
sar -A -f /var/log/sysstat/sa01             # All statistics for specific date
sadf -d /var/log/sysstat/sa01               # Database format output
sadf -j /var/log/sysstat/sa01               # JSON format output

# Why: Comprehensive system analysis, historical data analysis,
# data export for external analysis, automated reporting
```

## System Maintenance Commands

### **crontab** - Task scheduling

**What it does:** Schedules tasks to run automatically at specified times and intervals. Essential for system maintenance, backups, and automated operations.

**Why essential:** Automation is crucial for system administration. Regular maintenance tasks, monitoring, and backups need to run without manual intervention.

**When to use:** Schedule backups, automate system maintenance, regular monitoring tasks, log rotation, system updates.

```bash
# Crontab management
crontab -l                                   # List current user's cron jobs
crontab -e                                   # Edit current user's cron jobs
sudo crontab -l -u username                  # List another user's cron jobs
sudo crontab -e -u username                  # Edit another user's cron jobs
crontab -r                                   # Remove all cron jobs (dangerous!)

# Why: View existing scheduled tasks, create new automation,
# manage tasks for different users, clean up unwanted jobs

# Cron time format: minute hour day month weekday command
# Examples:
# 0 2 * * * /path/to/backup.sh              # Daily at 2:00 AM
# 30 14 * * 1 /path/to/weekly.sh            # Weekly on Monday at 2:30 PM
# 0 */6 * * * /path/to/check.sh             # Every 6 hours
# */15 * * * * /path/to/monitor.sh          # Every 15 minutes
# 0 0 1 * * /path/to/monthly.sh             # Monthly on 1st day at midnight

# Common maintenance tasks
# 0 2 * * * /usr/bin/apt update && /usr/bin/apt upgrade -y  # Daily updates
# 0 3 * * 0 /home/user/backup.sh            # Weekly backup on Sunday
# */10 * * * * /usr/bin/df -h | mail -s "Disk Usage" admin@example.com  # Disk monitoring
# 0 1 * * * /usr/sbin/logrotate /etc/logrotate.conf  # Daily log rotation

# Why: Automate routine maintenance, ensure regular backups,
# proactive monitoring, consistent system updates

# System-wide cron
sudo ls -la /etc/cron.d/                     # System cron jobs directory
sudo ls -la /etc/cron.daily/                 # Daily cron scripts
sudo ls -la /etc/cron.weekly/                # Weekly cron scripts
sudo ls -la /etc/cron.monthly/               # Monthly cron scripts

# Why: System-wide automation, organize scripts by frequency,
# standard maintenance tasks, package-installed automation
```

### **tar/gzip** - File compression and archiving

**What it does:** tar creates archives of files and directories. gzip compresses files. Combined, they provide powerful backup and file management capabilities.

**Why important:** Backups, file transfers, and space management require archiving and compression. These tools are standards for file packaging.

**When to use:** Creating backups, preparing files for transfer, archiving old data, reducing storage usage, distributing software.

```bash
# tar - Create and extract archives
tar -cvf archive.tar /path/to/directory      # Create archive (c=create, v=verbose, f=file)
tar -czvf archive.tar.gz /path/to/directory  # Create compressed archive with gzip
tar -cjvf archive.tar.bz2 /path/to/directory # Create compressed archive with bzip2
tar -xvf archive.tar                         # Extract archive (x=extract)
tar -xzvf archive.tar.gz                     # Extract gzip compressed archive

# Why: Bundle multiple files, compress for space savings,
# different compression algorithms for different needs, preserve directory structure

# Advanced tar usage
tar -tvf archive.tar                         # List contents without extracting (t=list)
tar -xvf archive.tar -C /destination/path    # Extract to specific directory
tar --exclude='*.log' -czvf backup.tar.gz /home  # Exclude files matching pattern
tar -czvf backup-$(date +%Y%m%d).tar.gz /important/data  # Date-stamped backups

# Why: Verify archive contents, organize extractions,
# selective backups, automated backup naming

# gzip/gunzip - File compression
gzip file.txt                                # Compress file (creates file.txt.gz, removes original)
gzip -k file.txt                             # Keep original file after compression
gunzip file.txt.gz                          # Decompress file
zcat file.txt.gz                             # View compressed file without decompressing

# Why: Reduce file sizes, preserve originals when needed,
# quick access to compressed content, space management

# Practical backup examples
tar -czvf backup-$(date +%Y%m%d).tar.gz /home /etc /var/log  # System backup
tar -czvf website-backup.tar.gz /var/www/html  # Website backup
find /home -name "*.log" -mtime +30 -exec gzip {} \;  # Compress old log files
tar -czvf - /important/data | ssh user@backup-server 'cat > backup.tar.gz'  # Remote backup

# Why: Regular system backups, application-specific backups,
# automated log management, secure remote backups
```

## Security Commands

### **chmod/chown (Advanced Security Applications)**

```bash
# Advanced permission scenarios
find /var/www -type f -exec chmod 644 {} \;  # Set all files to read-write for owner, read for others
find /var/www -type d -exec chmod 755 {} \;  # Set all directories to allow traversal
chmod u+s /usr/bin/program                   # Set setuid bit (program runs as file owner)
chmod g+s /shared/directory                   # Set setgid bit (files inherit group ownership)
chmod +t /tmp                                # Set sticky bit (only owner can delete files)

# Why: Web server security, special permission bits for functionality,
# shared directory management, temporary directory protection

# Security auditing
find / -perm -4000 -type f 2>/dev/null       # Find all setuid files (potential security risk)
find / -perm -2000 -type f 2>/dev/null       # Find all setgid files
find / -perm -1000 -type d 2>/dev/null       # Find directories with sticky bit
find /home -perm 777 -type f 2>/dev/null     # Find world-writable files (security risk)

# Why: Security auditing, identify potential vulnerabilities,
# compliance checking, maintain security standards
```

### **fail2ban/iptables (Security Monitoring)**

```bash
# fail2ban - Intrusion prevention
sudo fail2ban-client status                 # Show fail2ban status
sudo fail2ban-client status sshd            # Show SSH jail status
sudo fail2ban-client set sshd unbanip IP    # Unban specific IP address
sudo fail2ban-client get sshd banned        # List banned IP addresses

# Why: Automated protection against brute force attacks,
# monitor attack attempts, manage blocked addresses

# Security log monitoring
grep "Failed password" /var/log/auth.log | tail -20  # Recent failed login attempts
grep "Invalid user" /var/log/auth.log       # Login attempts with invalid usernames
awk '/Failed password/ {print $11}' /var/log/auth.log | sort | uniq -c | sort -nr  # Count failed attempts by IP

# Why: Identify attack patterns, monitor unauthorized access attempts,
# analyze security threats, improve security measures
```

## Practical System Administration Scenarios

### **Scenario 1: "System is running slow"**

**Step-by-step investigation:**

```bash
# 1. Check system load
uptime                                       # Quick load overview
top                                          # Real-time process monitoring
# Look for high load averages, high CPU processes

# 2. Check memory usage
free -h                                      # Memory overview
ps aux --sort=-%mem | head -10              # Top memory-consuming processes
# Look for high memory usage, excessive swap usage

# 3. Check disk I/O
iostat -x 5 3                               # I/O statistics
sudo iotop -o                               # Processes doing I/O
# Look for high %util, high await times

# 4. Check disk space
df -h                                        # Filesystem usage
du -sh /var/log /tmp /home                  # Check common space consumers
# Look for full filesystems that might cause slowdowns

# 5. Check system resources over time
sar -u 5 12                                 # CPU usage pattern
sar -r 5 12                                 # Memory usage pattern
# Identify patterns and peak usage times
```

### **Scenario 2: "Service won't start"**

```bash
# 1. Check service status
systemctl status service-name               # Detailed service status
journalctl -u service-name --since "1 hour ago"  # Recent service logs

# 2. Check for port conflicts
sudo lsof -i :80                            # Check if port is in use
sudo ss -tulpn | grep :80                   # Alternative port check

# 3. Check file permissions
ls -la /etc/service-name/                   # Configuration file permissions
ls -la /var/log/service-name/               # Log directory permissions

# 4. Check dependencies
systemctl list-dependencies service-name    # Service dependencies
systemctl status dependency-service         # Check dependent services

# 5. Manual testing
sudo -u service-user /usr/bin/service-binary --test-config  # Test configuration
# Run service manually to see detailed error messages
```

### **Scenario 3: "Disk space full"**

```bash
# 1. Identify full filesystems
df -h                                        # Find full filesystems

# 2. Find large directories
du -h /var | sort -hr | head -20            # Largest directories in /var
du -h /home | sort -hr | head -20           # Largest directories in /home

# 3. Find large files
find /var/log -type f -size +100M -exec ls -lh {} \;  # Large log files
find /tmp -type f -size +50M -mtime +7 -exec rm {} \;  # Clean old large temp files

# 4. Clean up common space consumers
sudo journalctl --vacuum-size=100M          # Limit journal size
sudo apt autoremove                         # Remove unused packages
sudo apt autoclean                          # Clean package cache

# 5. Set up monitoring
# Add to crontab:
# 0 6 * * * df -h | awk '$5 > 80 {print}' | mail -s "Disk Usage Alert" admin@example.com
```

This comprehensive system administration guide provides the essential commands and real-world scenarios that system administrators encounter daily, with detailed explanations of what each command does, why it's important, and when to use it.