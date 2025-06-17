# CloudWatch vs CloudTrail - AWS Services Comparison
category: Security
tags: aws, monitoring, logging, pentesting, cloud-security

## General Overview & Core Differences

**CloudWatch** and **CloudTrail** are two completely separate AWS services that serve different purposes but can integrate together.

**CloudWatch = Performance & Monitoring**
- Real-time monitoring and observability
- "How is my infrastructure performing?"
- Metrics, logs, dashboards, and alerts
- Operational health and performance data

**CloudTrail = Audit & Security Logging**
- API call logging and auditing
- "Who did what, when, and from where?"
- Compliance and security forensics
- User activity and resource change tracking

### Key Philosophical Difference
- **CloudWatch:** Reactive monitoring - "Something is wrong, fix it"
- **CloudTrail:** Proactive auditing - "Someone did something, track it"

## Detailed Service Breakdown

### CloudWatch Capabilities
- **Metrics Collection**
  - CPU, memory, disk, network utilization
  - Custom application metrics
  - Real-time and historical data
  - Automatic scaling triggers

- **Log Management**
  - Application logs aggregation
  - System logs from EC2, Lambda, etc.
  - Log insights and searching
  - Log retention policies

- **Alerting & Notifications**
  - Threshold-based alarms
  - SNS integration for notifications
  - Auto-scaling triggers
  - Dashboard visualizations

### CloudTrail Capabilities
- **API Call Logging**
  - Every AWS API call recorded
  - User identity and source IP
  - Request parameters and responses
  - Timestamp and service information

- **Audit Trail Features**
  - Management events (control plane)
  - Data events (S3 object access, Lambda execution)
  - Insight events (unusual activity patterns)
  - Multi-region trail support

- **Compliance & Forensics**
  - Immutable log records
  - Log file integrity validation
  - Integration with AWS Config
  - Long-term retention options

## Service Architecture Differences

### CloudWatch Data Flow
```
AWS Resources → CloudWatch Agent → CloudWatch Service → Dashboards/Alarms
Application Logs → CloudWatch Logs → Log Groups → Insights/Filters
```

### CloudTrail Data Flow
```
AWS API Calls → CloudTrail Service → S3 Bucket → Analysis Tools
Management Console → API Gateway → CloudTrail Logs → Compliance Reports
```

### Storage & Retention
- **CloudWatch:**
  - Metrics: 1 second to 15 months retention
  - Logs: Configurable retention (1 day to indefinite)
  - Real-time streaming available

- **CloudTrail:**
  - Events: 90 days in CloudTrail console (free)
  - S3 storage: Indefinite retention (configurable)
  - Log file delivery within 15 minutes

## Integration Points

### How They Work Together
- **CloudTrail → CloudWatch Logs:** Send audit logs to CloudWatch for alerting
- **CloudWatch Alarms:** Trigger on specific CloudTrail events
- **Cross-service visibility:** Monitor who changed monitoring configurations

### Example Integration
```json
{
  "AlarmName": "RootAccountUsage",
  "MetricName": "RootAccountUsageCount",
  "Namespace": "CloudTrailMetrics",
  "Statistic": "Sum",
  "Threshold": 1,
  "ComparisonOperator": "GreaterThanOrEqualToThreshold"
}
```

## Pentesting Applications

### CloudWatch for Offensive Security

#### Information Gathering
- **Target Reconnaissance**
  - Identify running services via metrics
  - Spot high-value targets (high CPU/memory usage)
  - Find applications with frequent errors
  - Map resource relationships through dashboards

- **Persistence Indicators**
  - Monitor if your access is detected
  - Watch for investigation activities
  - Identify backup and monitoring schedules

#### Common Misconfigurations
```bash
# Check for public CloudWatch dashboards
aws cloudwatch list-dashboards
aws cloudwatch get-dashboard --dashboard-name <name>

# Look for overly permissive log groups
aws logs describe-log-groups
aws logs describe-metric-filters
```

### CloudTrail for Offensive Security

#### OPSEC & Evasion
- **Audit Trail Analysis**
  - Understand what gets logged
  - Identify logging gaps and blind spots
  - Time attacks during high-activity periods
  - Use legitimate-looking API calls

- **Privilege Escalation Intelligence**
  - Map user permissions through logged API calls
  - Identify service roles with interesting permissions
  - Find misconfigured cross-account access

#### Attack Techniques
```bash
# Check if CloudTrail is enabled
aws cloudtrail describe-trails
aws cloudtrail get-trail-status --name <trail-name>

# Look for logging misconfigurations
aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=StopLogging

# Find data events configuration (often disabled)
aws cloudtrail get-event-selectors --trail-name <trail-name>
```

### Common Pentesting Scenarios

#### Scenario 1: CloudTrail Disabled
- **Opportunity:** Complete blind spot for defenders
- **Action:** Aggressive enumeration and lateral movement
- **Risk:** None from audit perspective

#### Scenario 2: CloudWatch Without Alerting
- **Opportunity:** Systems monitored but no one watching
- **Action:** Resource abuse, cryptocurrency mining
- **Risk:** Eventually discovered through manual review

#### Scenario 3: Misconfigured Log Storage
```bash
# Check S3 bucket permissions for CloudTrail logs
aws s3api get-bucket-acl --bucket <cloudtrail-bucket>
aws s3api get-bucket-policy --bucket <cloudtrail-bucket>

# Look for world-readable CloudTrail logs
aws s3 ls s3://<bucket>/AWSLogs/ --recursive
```

## Key Concepts Summary

- **CloudWatch** - Performance monitoring, real-time metrics, operational health
- **CloudTrail** - Security auditing, API logging, compliance tracking
- **Separate Services** - Different purposes, can work independently
- **Integration Possible** - CloudTrail events can trigger CloudWatch alarms
- **Pentesting Value** - CloudWatch for recon, CloudTrail for OPSEC

## Common Misconfigurations for Exploitation

### CloudWatch Misconfigurations
1. **Public Dashboards** - Sensitive infrastructure exposed
2. **Overprivileged Metrics** - Cross-account metric sharing
3. **Log Group Permissions** - World-readable application logs
4. **No Alerting** - Monitoring without action

### CloudTrail Misconfigurations
1. **Disabled Logging** - Complete audit blind spot
2. **Single Region** - Multi-region attacks undetected
3. **No Data Events** - S3/Lambda activity unlogged
4. **Public S3 Buckets** - Historical logs exposed

## Best Practices for Defense

1. **Enable Both Services** - Complementary coverage
2. **Multi-Region CloudTrail** - Global activity visibility
3. **Data Events Logging** - S3 and Lambda activity
4. **CloudWatch Alarms** - Automated threat detection
5. **Log Integrity** - CloudTrail log file validation
6. **Least Privilege** - Restrict access to logging services

## References / Further Reading

- AWS CloudWatch Documentation
- AWS CloudTrail User Guide
- AWS Well-Architected Security Pillar
- NIST Cybersecurity Framework - Logging Guidelines
- SANS Cloud Security Controls