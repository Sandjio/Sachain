# Operational Runbooks - Project Creation Feature

## Overview

This document provides operational procedures and troubleshooting guides for the Sachain project creation and stock minting feature. It covers common issues, diagnostic procedures, and resolution steps.

## Table of Contents

1. [Health Check Procedures](#health-check-procedures)
2. [Common Issues and Resolutions](#common-issues-and-resolutions)
3. [Emergency Procedures](#emergency-procedures)
4. [Monitoring and Alerting](#monitoring-and-alerting)
5. [Performance Troubleshooting](#performance-troubleshooting)
6. [Data Recovery Procedures](#data-recovery-procedures)

## Health Check Procedures

### Manual Health Check

```bash
# Run comprehensive health check
npm run health-check

# Check specific service
curl -X GET https://api.sachain.com/health
```

### Automated Health Monitoring

Health checks run automatically every 5 minutes. Check CloudWatch dashboard for:

- Overall system health status
- Individual service health metrics
- Response time trends
- Error rate patterns

### Health Check Interpretation

| Status    | Description                       | Action Required           |
| --------- | --------------------------------- | ------------------------- |
| Healthy   | All services operational          | None                      |
| Degraded  | Some services slow but functional | Monitor closely           |
| Unhealthy | Critical services down            | Immediate action required |

## Common Issues and Resolutions

### 1. Project Creation Failures

#### Symptom: Users cannot create projects

**Diagnostic Steps:**

1. Check Lambda function logs: `aws logs tail /aws/lambda/sachain-dev-project-creation`
2. Verify DynamoDB table status: `aws dynamodb describe-table --table-name sachain-table`
3. Check API Gateway metrics in CloudWatch

**Common Causes & Solutions:**

| Cause                    | Solution                                       |
| ------------------------ | ---------------------------------------------- |
| DynamoDB throttling      | Increase table capacity or enable auto-scaling |
| Lambda timeout           | Increase timeout or optimize function code     |
| KYC service unavailable  | Check KYC service status and retry logic       |
| Invalid input validation | Review validation rules and error messages     |

#### Resolution Script:

```bash
# Check project creation health
./scripts/diagnose-project-creation.sh

# Restart services if needed
./scripts/restart-project-services.sh
```

### 2. Stock Minting Issues

#### Symptom: NFT minting fails or times out

**Diagnostic Steps:**

1. Check Hedera network status: https://status.hedera.com
2. Review minting Lambda logs: `aws logs tail /aws/lambda/sachain-dev-stock-minting`
3. Verify IPFS connectivity and metadata uploads

**Common Causes & Solutions:**

| Cause                      | Solution                                 |
| -------------------------- | ---------------------------------------- |
| Hedera network congestion  | Implement retry with exponential backoff |
| Insufficient HBAR balance  | Top up treasury account                  |
| IPFS upload failures       | Check IPFS gateway status, retry uploads |
| Metadata validation errors | Review metadata schema and validation    |

#### Resolution Commands:

```bash
# Check Hedera connectivity
curl -s https://testnet.mirrornode.hedera.com/api/v1/network/nodes

# Verify IPFS gateway
curl -I https://ipfs.io/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG/readme

# Check treasury balance
node scripts/check-hedera-balance.js
```

### 3. Database Performance Issues

#### Symptom: Slow query responses or timeouts

**Diagnostic Steps:**

1. Check DynamoDB metrics in CloudWatch
2. Review GSI utilization and hot partitions
3. Analyze query patterns and access patterns

**Common Causes & Solutions:**

| Cause                            | Solution                                 |
| -------------------------------- | ---------------------------------------- |
| Hot partition keys               | Redesign partition key strategy          |
| Insufficient read/write capacity | Enable auto-scaling or increase capacity |
| Inefficient query patterns       | Optimize GSI usage and query structure   |
| Large item sizes                 | Implement pagination and data archiving  |

### 4. API Gateway Issues

#### Symptom: API requests failing or timing out

**Diagnostic Steps:**

1. Check API Gateway logs and metrics
2. Verify Lambda integration configuration
3. Review CORS and authentication settings

**Resolution Steps:**

```bash
# Check API Gateway status
aws apigateway get-rest-apis

# Test API endpoints
curl -X GET https://api.sachain.com/projects \
  -H "Authorization: Bearer $TEST_TOKEN"

# Check Lambda integration
aws apigateway get-integration \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method GET
```

## Emergency Procedures

### 1. Complete System Outage

**Immediate Actions (0-5 minutes):**

1. Confirm outage scope using monitoring dashboard
2. Check AWS service health: https://status.aws.amazon.com
3. Notify stakeholders via incident communication channel
4. Activate incident response team

**Investigation (5-15 minutes):**

1. Review recent deployments and changes
2. Check CloudWatch alarms and logs
3. Verify external service dependencies (Hedera, IPFS)
4. Run automated diagnostics: `npm run emergency-diagnostics`

**Resolution (15+ minutes):**

1. If recent deployment caused issue: `npm run rollback emergency <previous-version>`
2. If infrastructure issue: Follow AWS support escalation
3. If external dependency: Implement fallback procedures
4. Monitor recovery and validate functionality

### 2. Data Corruption Detection

**Immediate Actions:**

1. Stop all write operations: `npm run maintenance-mode enable`
2. Create point-in-time backup: `npm run backup create emergency`
3. Assess corruption scope using data validation scripts
4. Notify data protection officer if user data affected

**Recovery Steps:**

1. Identify last known good backup point
2. Restore from backup: `npm run restore --backup-id <backup-id>`
3. Replay transactions from backup point to current time
4. Validate data integrity: `npm run validate-data`
5. Resume normal operations: `npm run maintenance-mode disable`

### 3. Security Incident

**Immediate Response:**

1. Isolate affected systems: `npm run security-lockdown`
2. Preserve evidence and logs
3. Notify security team and compliance officer
4. Change all API keys and secrets: `npm run rotate-secrets`

**Investigation:**

1. Analyze access logs and audit trails
2. Identify attack vectors and compromised data
3. Assess impact on user accounts and projects
4. Document findings for post-incident review

## Monitoring and Alerting

### Critical Alerts

| Alert                             | Threshold      | Response Time | Action                        |
| --------------------------------- | -------------- | ------------- | ----------------------------- |
| API Error Rate > 5%               | 5 minutes      | Immediate     | Check logs, consider rollback |
| Lambda Duration > 30s             | 3 occurrences  | 5 minutes     | Optimize or scale function    |
| DynamoDB Throttling               | Any occurrence | 10 minutes    | Increase capacity             |
| Hedera Transaction Failures > 10% | 5 minutes      | 15 minutes    | Check network status          |

### Monitoring Dashboard URLs

- **CloudWatch Dashboard**: https://console.aws.amazon.com/cloudwatch/home#dashboards:name=Sachain-Production
- **API Gateway Metrics**: https://console.aws.amazon.com/apigateway/home#/apis
- **Lambda Metrics**: https://console.aws.amazon.com/lambda/home#/functions
- **DynamoDB Metrics**: https://console.aws.amazon.com/dynamodb/home#tables

### Log Locations

```bash
# Lambda function logs
/aws/lambda/sachain-dev-project-creation
/aws/lambda/sachain-dev-project-query
/aws/lambda/sachain-dev-project-management
/aws/lambda/sachain-dev-stock-minting

# API Gateway logs
/aws/apigateway/sachain-dev

# Application logs
/aws/lambda/sachain-dev-health-check
```

## Performance Troubleshooting

### High Latency Issues

**Investigation Steps:**

1. Identify bottleneck using X-Ray traces
2. Check database query performance
3. Review external API call durations
4. Analyze Lambda cold start frequency

**Optimization Actions:**

```bash
# Enable X-Ray tracing
aws lambda update-function-configuration \
  --function-name sachain-dev-project-creation \
  --tracing-config Mode=Active

# Analyze performance metrics
npm run performance-analysis

# Optimize database queries
npm run optimize-queries --table sachain-table
```

### Memory and CPU Issues

**Monitoring Commands:**

```bash
# Check Lambda memory utilization
aws logs filter-log-events \
  --log-group-name /aws/lambda/sachain-dev-project-creation \
  --filter-pattern "REPORT"

# Monitor DynamoDB consumed capacity
aws dynamodb describe-table \
  --table-name sachain-table \
  --query 'Table.BillingModeSummary'
```

## Data Recovery Procedures

### Point-in-Time Recovery

**Prerequisites:**

- Point-in-time recovery enabled on DynamoDB table
- Backup retention period configured (35 days)
- Recovery target time identified

**Recovery Steps:**

```bash
# List available recovery points
aws dynamodb describe-continuous-backups \
  --table-name sachain-table

# Restore to specific point in time
aws dynamodb restore-table-to-point-in-time \
  --source-table-name sachain-table \
  --target-table-name sachain-table-recovery \
  --restore-date-time 2024-01-15T10:30:00Z

# Validate recovered data
npm run validate-recovery --table sachain-table-recovery

# Switch to recovered table (if validation passes)
npm run switch-table --from sachain-table --to sachain-table-recovery
```

### Backup and Restore Procedures

**Manual Backup:**

```bash
# Create on-demand backup
aws dynamodb create-backup \
  --table-name sachain-table \
  --backup-name "manual-backup-$(date +%Y%m%d-%H%M%S)"

# Export to S3 for long-term storage
aws dynamodb export-table-to-point-in-time \
  --table-arn arn:aws:dynamodb:region:account:table/sachain-table \
  --s3-bucket sachain-backups \
  --s3-prefix exports/$(date +%Y/%m/%d)/
```

**Restore from Backup:**

```bash
# List available backups
aws dynamodb list-backups --table-name sachain-table

# Restore from backup
aws dynamodb restore-table-from-backup \
  --target-table-name sachain-table-restored \
  --backup-arn arn:aws:dynamodb:region:account:table/sachain-table/backup/backup-id
```

## Contact Information

### Escalation Matrix

| Severity      | Contact                                | Response Time     |
| ------------- | -------------------------------------- | ----------------- |
| P0 (Critical) | On-call engineer + Engineering Manager | 15 minutes        |
| P1 (High)     | Engineering team lead                  | 1 hour            |
| P2 (Medium)   | Assigned engineer                      | 4 hours           |
| P3 (Low)      | Engineering team                       | Next business day |

### Key Contacts

- **On-call Engineer**: +1-XXX-XXX-XXXX (PagerDuty)
- **Engineering Manager**: engineering-manager@sachain.com
- **DevOps Team**: devops@sachain.com
- **Security Team**: security@sachain.com
- **Compliance Officer**: compliance@sachain.com

### External Support

- **AWS Support**: Case creation via AWS Console
- **Hedera Support**: support@hedera.com
- **IPFS Support**: Community forums and documentation

## Appendix

### Useful Commands Reference

```bash
# Health and diagnostics
npm run health-check
npm run system-diagnostics
npm run performance-check

# Deployment and rollback
npm run deploy --stage production
npm run rollback emergency v1.2.3
npm run rollback auto

# Maintenance operations
npm run maintenance-mode enable
npm run maintenance-mode disable
npm run rotate-secrets
npm run cleanup-logs

# Data operations
npm run backup create
npm run restore --backup-id <id>
npm run validate-data
npm run migrate-data --version <version>
```

### Log Analysis Queries

```bash
# Find errors in project creation
aws logs filter-log-events \
  --log-group-name /aws/lambda/sachain-dev-project-creation \
  --filter-pattern "ERROR" \
  --start-time $(date -d '1 hour ago' +%s)000

# Monitor API response times
aws logs filter-log-events \
  --log-group-name /aws/apigateway/sachain-dev \
  --filter-pattern "[timestamp, request_id, ip, user, timestamp, method, resource, protocol, status, error, bytes, duration > 5000]"

# Check DynamoDB throttling
aws logs filter-log-events \
  --log-group-name /aws/lambda/sachain-dev-project-creation \
  --filter-pattern "ProvisionedThroughputExceededException"
```
