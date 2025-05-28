# Security Glossary
category: Security
tags: glossary, security, cybersecurity, authentication, encryption

## Authentication

**What it is:** Process of verifying the identity of a user, device, or system trying to access a resource.

**Why it matters:** Authentication is the first line of defense in security. Without proper authentication, anyone could access sensitive systems and data.

**Types:**
- **Something you know** - Passwords, PINs, security questions
- **Something you have** - Smart cards, tokens, mobile phones
- **Something you are** - Biometrics (fingerprints, face recognition)
- **Multi-Factor Authentication (MFA)** - Combines two or more types

**Common methods:**
- **Username/Password** - Traditional but weakest form
- **OAuth** - Third-party authentication (Login with Google/Facebook)
- **SAML** - Enterprise single sign-on standard
- **JWT (JSON Web Tokens)** - Stateless authentication tokens

**Best practices:**
- **Strong passwords** - Long, complex, unique
- **Password managers** - Generate and store secure passwords
- **MFA everywhere** - Add second factor whenever possible
- **Regular rotation** - Change passwords periodically

**When you'll use it:** Every application needs authentication. It's fundamental to security.

## Authorization

**What it is:** Process of determining what actions an authenticated user is allowed to perform.

**Why it matters:** Authentication tells you who someone is; authorization tells you what they can do. Both are essential for proper access control.

**Authorization models:**
- **Role-Based Access Control (RBAC)** - Permissions based on user roles
- **Attribute-Based Access Control (ABAC)** - Permissions based on attributes
- **Access Control Lists (ACL)** - Explicit permissions for each resource
- **Discretionary Access Control (DAC)** - Resource owners control access

**Common patterns:**
- **Principle of least privilege** - Give minimum necessary permissions
- **Separation of duties** - Require multiple people for sensitive operations
- **Time-based access** - Permissions expire after certain time
- **Location-based access** - Restrict access by geographic location

**When you'll use it:** Any system with multiple users or different permission levels.

## Encryption

**What it is:** Process of converting readable data into an unreadable format using algorithms and keys.

**Why it matters:** Encryption protects data confidentiality. Even if attackers gain access to encrypted data, they can't read it without the decryption key.

**Types:**
- **Symmetric encryption** - Same key for encryption and decryption (AES)
- **Asymmetric encryption** - Different keys (public/private key pairs like RSA)
- **Hashing** - One-way transformation, can't be reversed (SHA-256)

**Common use cases:**
- **Data at rest** - Encrypt stored files and databases
- **Data in transit** - Encrypt network communications (HTTPS, TLS)
- **Application-level** - Encrypt sensitive fields in applications
- **Full disk encryption** - Protect entire hard drives

**Key management:**
- **Key rotation** - Regularly change encryption keys
- **Key storage** - Secure key management systems (HSM, KMS)
- **Key escrow** - Backup keys for recovery scenarios

**When you'll use it:** Any time you handle sensitive data. Encryption should be default, not optional.

## SSL/TLS

**What it is:** Cryptographic protocols that provide secure communication over networks, most commonly seen in HTTPS.

**Why it matters:** SSL/TLS protects data transmission between clients and servers, preventing eavesdropping, tampering, and man-in-the-middle attacks.

**How it works:**
1. **Handshake** - Client and server negotiate encryption methods
2. **Certificate exchange** - Server proves its identity
3. **Key exchange** - Establish shared encryption keys
4. **Secure communication** - All data encrypted with agreed keys

**Certificate types:**
- **Domain Validation (DV)** - Basic validation, cheapest option
- **Organization Validation (OV)** - Validates organization identity
- **Extended Validation (EV)** - Highest validation, shows green bar
- **Wildcard** - Covers all subdomains (*.example.com)

**Best practices:**
- **Use TLS 1.2 or higher** - Older versions have vulnerabilities
- **Strong cipher suites** - Avoid weak encryption algorithms
- **Certificate monitoring** - Track expiration dates
- **HSTS (HTTP Strict Transport Security)** - Force HTTPS connections

**When you'll use it:** Any website or API handling sensitive data. HTTPS is now standard for all websites.

## Firewall

**What it is:** Network security device that monitors and controls incoming and outgoing network traffic based on predetermined security rules.

**Why it matters:** Firewalls act as a barrier between trusted internal networks and untrusted external networks, blocking malicious traffic while allowing legitimate communication.

**Types:**
- **Network firewalls** - Hardware devices protecting entire networks
- **Host-based firewalls** - Software running on individual computers
- **Application firewalls** - Inspect application-layer traffic (WAF)
- **Next-generation firewalls** - Combine traditional firewall with additional features

**Firewall rules:**
- **Allow rules** - Permit specific traffic
- **Deny rules** - Block specific traffic
- **Default policy** - What to do with unmatched traffic
- **Logging** - Record firewall decisions for analysis

**Common configurations:**
- **DMZ (Demilitarized Zone)** - Separate network for public-facing servers
- **Port blocking** - Close unused network ports
- **IP whitelisting** - Only allow traffic from approved sources
- **Geographic blocking** - Block traffic from specific countries

**When you'll use it:** Every network should have firewall protection. It's a fundamental security control.

## Vulnerability Assessment

**What it is:** Process of identifying, quantifying, and prioritizing security vulnerabilities in systems, applications, and networks.

**Why it matters:** You can't fix what you don't know is broken. Regular vulnerability assessments help identify security weaknesses before attackers exploit them.

**Types of assessments:**
- **Network scanning** - Identify open ports and services
- **Web application scanning** - Find common web vulnerabilities
- **Database scanning** - Check for database security issues
- **Wireless scanning** - Assess Wi-Fi security

**Common vulnerabilities:**
- **SQL injection** - Malicious database queries
- **Cross-site scripting (XSS)** - Malicious scripts in web pages
- **Buffer overflow** - Memory corruption attacks
- **Unpatched software** - Known vulnerabilities in outdated software

**Vulnerability management:**
- **Regular scanning** - Automated, frequent assessments
- **Risk prioritization** - Fix critical vulnerabilities first
- **Patch management** - Keep systems updated
- **Remediation tracking** - Ensure vulnerabilities are actually fixed

**When you'll use it:** Regular vulnerability assessments are essential for maintaining security posture.

## Penetration Testing

**What it is:** Authorized simulated cyber attack performed to evaluate system security by attempting to exploit vulnerabilities.

**Why it matters:** Penetration testing validates that security controls actually work in practice, not just in theory. It identifies real-world attack paths that automated tools might miss.

**Types of pen tests:**
- **Black box** - No prior knowledge of system (external attacker perspective)
- **White box** - Full knowledge of system (internal threat perspective)
- **Gray box** - Partial knowledge (compromise scenario)

**Testing phases:**
1. **Reconnaissance** - Gather information about target
2. **Scanning** - Identify live systems and services
3. **Enumeration** - Extract detailed information
4. **Exploitation** - Attempt to gain unauthorized access
5. **Post-exploitation** - Assess impact and persistence
6. **Reporting** - Document findings and recommendations

**Compliance requirements:**
- **PCI DSS** - Credit card industry requires annual pen tests
- **SOX** - Financial companies need security testing
- **HIPAA** - Healthcare organizations must assess security
- **ISO 27001** - Information security management standard

**When you'll use it:** Annual penetration testing is best practice for any organization handling sensitive data.

## Incident Response

**What it is:** Organized approach to addressing and managing the aftermath of a security breach or cyber attack.

**Why it matters:** Even with the best security measures, incidents will occur. Having a proper incident response plan minimizes damage and recovery time.

**Incident response phases:**
1. **Preparation** - Develop plans, train team, set up tools
2. **Identification** - Detect and analyze potential incidents
3. **Containment** - Limit the scope and impact of incident
4. **Eradication** - Remove the threat from environment
5. **Recovery** - Restore systems to normal operation
6. **Lessons learned** - Analyze incident and improve processes

**Key roles:**
- **Incident commander** - Coordinates overall response
- **Technical analysts** - Investigate and contain threats
- **Communications lead** - Manage internal/external communications
- **Legal counsel** - Handle regulatory and legal requirements

**Documentation requirements:**
- **Incident timeline** - Chronological record of events
- **Actions taken** - What was done to respond
- **Evidence preservation** - Maintain chain of custody
- **Impact assessment** - Quantify damage and costs

**When you'll use it:** Every organization should have an incident response plan before they need it.

## Zero Trust

**What it is:** Security model that requires verification for every person and device trying to access resources, regardless of their location.

**Why it matters:** Traditional security assumed internal networks were safe, but modern threats often come from inside. Zero Trust assumes breach and verifies everything.

**Core principles:**
- **Never trust, always verify** - Don't assume anything is safe
- **Least privilege access** - Give minimum necessary permissions
- **Assume breach** - Design for compromise scenarios
- **Verify explicitly** - Use all available data points for decisions

**Key components:**
- **Identity verification** - Strong authentication for all users
- **Device compliance** - Ensure devices meet security standards
- **Network segmentation** - Limit lateral movement
- **Data protection** - Encrypt and classify sensitive information

**Implementation approaches:**
- **Microsegmentation** - Create small, isolated network zones
- **Software-defined perimeter** - Dynamic, encrypted connections
- **Privileged access management** - Control admin access
- **Continuous monitoring** - Real-time security assessment

**When you'll use it:** Zero Trust is becoming the standard security model for modern organizations.

## SIEM (Security Information and Event Management)

**What it is:** Technology that aggregates and analyzes security data from across an organization to detect threats and ensure compliance.

**Why it matters:** SIEM provides centralized visibility into security events, enabling faster threat detection and response across complex IT environments.

**Key functions:**
- **Log aggregation** - Collect data from multiple sources
- **Event correlation** - Identify patterns that indicate threats
- **Real-time monitoring** - Continuous security surveillance
- **Compliance reporting** - Generate audit reports
- **Incident response** - Coordinate response to security events

**Data sources:**
- **Network devices** - Firewalls, routers, switches
- **Security tools** - Antivirus, intrusion detection systems
- **Applications** - Web servers, databases, custom apps
- **Operating systems** - Windows, Linux, macOS logs

**Popular SIEM solutions:**
- **Splunk** - Market leader with powerful analytics
- **IBM QRadar** - Enterprise-focused with AI capabilities
- **ArcSight** - HP's enterprise SIEM platform
- **Elastic Security** - Open-source option built on Elasticsearch

**When you'll use it:** Medium to large organizations typically implement SIEM for centralized security monitoring.

## Threat Intelligence

**What it is:** Evidence-based knowledge about existing or emerging threats that can inform security decisions.

**Why it matters:** Understanding the threat landscape helps organizations prioritize security investments and prepare for likely attack scenarios.

**Types of threat intelligence:**
- **Strategic** - High-level trends and risks for executive decision-making
- **Tactical** - Attack techniques and procedures for security teams
- **Operational** - Specific campaigns and threat actor activities
- **Technical** - Indicators of compromise (IoCs) and signatures

**Intelligence sources:**
- **Open source** - Public information and research
- **Commercial** - Paid threat intelligence feeds
- **Government** - Law enforcement and intelligence agencies
- **Industry sharing** - Sector-specific threat information

**Use cases:**
- **Preventive controls** - Block known bad IP addresses and domains
- **Detection rules** - Create signatures for known attack patterns
- **Risk assessment** - Understand threats relevant to your industry
- **Incident attribution** - Identify likely threat actors

**When you'll use it:** Organizations facing advanced threats benefit from threat intelligence to stay ahead of attackers.