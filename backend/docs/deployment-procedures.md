# Deployment Validation and Rollback Procedures

## Overview

This document provides comprehensive procedures for deploying, validating, and rolling back the Sachain project creation feature. It includes automated scripts, manual procedures, and troubleshooting guides.

## Table of Contents

1. [Deployment Process](#deployment-process)
2. [Health Check System](#health-check-system)
3. [Validation Scripts](#validation-scripts)
4. [Rollback Procedures](#rollback-procedures)
5. [Monitoring and Alerting](#monitoring-and-alerting)
6. [Troubleshooting](#troubleshooting)

## Deployment Process

### Automated Deployment

Use the automated deployment script for consistent, validated deployments:

```bash
# Development deployment
npm run deploy:dev

# Staging deployment with validation
npm run deploy:staging

# Production deployment with auto-rollback on failure
npm run deploy:prod
```

### Manual Deployment Steps

If manual deployment is required:

1. **Pre-deployment validation**

   ```bash
   npm run system-diagnostics
   npm run performance-check
   ```

2. **Build and test**

   ```bash
   npm run build
   npm test
   ```

3. **Deploy infrastructure**

   ```bash
   cd ../sachain-infrastructure
   cdk deploy --require-approval never
   ```

4. **Deploy Lambda functions**

   ```bash
   # Automated via deployment script
   ./scripts/deploy-with-validation.sh <stage>
   ```

5. **Post-deployment validation**
   ```bash
   npm run validate-deployment
   npm run health-check
   ```

### Deployment Checklist

- [ ] All tests passing
- [ ] Code review completed
- [ ] Environment variables configured
- [ ] AWS credentials valid
- [ ] CDK bootstrap completed
- [ ] Backup created (production only)
- [ ] Stakeholders notified
- [ ] Rollback plan prepared

## Health Check System

### Health Check Endpoints

The system provides comprehensive health monitoring:

- **API Endpoint**: `GET /health`
- **Lambda Function**: `sachain-{stage}-health-check`
- **CLI Command**: `npm run health-check`

### Health Check Components

1. **DynamoDB**: Table accessibility and performance
2. **S3**: Bucket accessibility for image storage
3. **EventBridge**: Event bus connectivity
4. **Hedera Network**: Blockchain network status
5. **IPFS**: Metadata storage connectivity

### Health Status Levels

| Status      | Description                  | Action Required  |
| ----------- | ---------------------------- | ---------------- |
| `healthy`   | All services operational     | None             |
| `degraded`  | Services slow but functional | Monitor closely  |
| `unhealthy` | Critical services down       | Immediate action |

### Example Health Check Response

```json
{
  "overall": "healthy",
  "services": [
    {
      "service": "DynamoDB",
      "status": "healthy",
      "message": "Table sachain-table accessible",
      "timestamp": "2024-01-01T00:00:00Z",
      "responseTime": 150
    }
  ],
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Validation Scripts

### Deployment Validation

Comprehensive validation of deployed services:

```bash
# Run full deployment validation
npm run validate-deployment

# Set environment for validation
export STAGE=dev
export API_BASE_URL=https://api.example.com/dev
npm run validate-deployment
```

**Validation Categories:**

- Infrastructure validation (DynamoDB, Lambda, API Gateway)
- Service health checks
- Smoke tests for critical functionality

### System Diagnostics

Detailed system analysis and troubleshooting:

```bash
# Run system diagnostics
npm run system-diagnostics

# Verbose output with details
npm run system-diagnostics -- --verbose
```

**Diagnostic Categories:**

- Lambda function configuration and performance
- DynamoDB table status and capacity
- CloudWatch metrics analysis
- Performance benchmarks

### Performance Monitoring

Performance analysis and optimization recommendations:

```bash
# Generate performance report
npm run performance-check
```

**Performance Metrics:**

- API Gateway latency and error rates
- Lambda function duration and concurrency
- DynamoDB throttling and capacity utilization
- External service response times

## Rollback Procedures

### Automated Rollback

For critical failures with automatic recovery:

```bash
# Emergency rollback to specific version
npm run rollback:emergency v1.2.3

# Automated rollback to last stable version
npm run rollback:auto
```

### Manual Rollback Steps

1. **Assess the situation**

   ```bash
   npm run system-diagnostics
   npm run health-check
   ```

2. **Identify rollback target**

   - Determine last known good version
   - Verify rollback target availability

3. **Execute rollback**

   ```bash
   npm run rollback emergency <target-version>
   ```

4. **Verify rollback success**

   ```bash
   npm run validate-deployment
   npm run health-check
   ```

5. **Notify stakeholders**
   - Update incident communication
   - Document rollback reason and resolution

### Rollback Components

The rollback process includes:

1. **Database backup creation**
2. **Lambda function version rollback**
3. **CloudFormation stack rollback**
4. **Verification and validation**
5. **Cleanup of temporary resources**

## Monitoring and Alerting

### CloudWatch Dashboards

Monitor system health through CloudWatch dashboards:

- **API Gateway Metrics**: Request count, latency, error rates
- **Lambda Metrics**: Duration, errors, throttling
- **DynamoDB Metrics**: Read/write capacity, throttling
- **Custom Metrics**: Business metrics and health scores

### Automated Alerts

Critical alerts configured for:

| Alert                 | Threshold              | Response Time |
| --------------------- | ---------------------- | ------------- |
| API Error Rate > 5%   | 5 minutes              | Immediate     |
| Lambda Duration > 30s | 3 occurrences          | 5 minutes     |
| DynamoDB Throttling   | Any occurrence         | 10 minutes    |
| Health Check Failure  | 2 consecutive failures | 15 minutes    |

### Alert Response Procedures

1. **Immediate Response** (0-5 minutes)

   - Acknowledge alert
   - Check system status
   - Assess impact scope

2. **Investigation** (5-15 minutes)

   - Run diagnostics
   - Check recent changes
   - Identify root cause

3. **Resolution** (15+ minutes)
   - Apply fix or rollback
   - Monitor recovery
   - Update stakeholders

## Troubleshooting

### Common Issues and Solutions

#### Deployment Failures

**Symptom**: CDK deployment fails

```bash
# Check AWS credentials and permissions
aws sts get-caller-identity

# Verify CDK bootstrap
cdk bootstrap

# Check for resource conflicts
cdk diff
```

**Symptom**: Lambda function deployment fails

```bash
# Check function size limits
ls -la dist/lambdas/*/

# Verify IAM permissions
aws iam get-role --role-name lambda-execution-role

# Check CloudWatch logs
aws logs tail /aws/lambda/function-name
```

#### Health Check Failures

**Symptom**: DynamoDB health check fails

```bash
# Check table status
aws dynamodb describe-table --table-name sachain-table

# Verify IAM permissions
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::account:role/lambda-role \
  --action-names dynamodb:DescribeTable \
  --resource-arns arn:aws:dynamodb:region:account:table/sachain-table
```

**Symptom**: External service connectivity issues

```bash
# Test Hedera network
curl -s https://testnet.mirrornode.hedera.com/api/v1/network/nodes

# Test IPFS gateway
curl -I https://ipfs.io/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG/readme
```

#### Performance Issues

**Symptom**: High API latency

```bash
# Check Lambda cold starts
npm run performance-check

# Analyze CloudWatch metrics
aws logs filter-log-events \
  --log-group-name /aws/lambda/function-name \
  --filter-pattern "REPORT"
```

**Symptom**: DynamoDB throttling

```bash
# Check consumed capacity
aws dynamodb describe-table --table-name sachain-table

# Enable auto-scaling
aws application-autoscaling register-scalable-target \
  --service-namespace dynamodb \
  --resource-id table/sachain-table \
  --scalable-dimension dynamodb:table:ReadCapacityUnits
```

### Emergency Contacts

- **On-call Engineer**: Available via PagerDuty
- **Engineering Manager**: engineering-manager@sachain.com
- **DevOps Team**: devops@sachain.com
- **AWS Support**: Via AWS Console (Enterprise Support)

### Escalation Matrix

| Severity      | Contact           | Response Time     |
| ------------- | ----------------- | ----------------- |
| P0 (Critical) | On-call + Manager | 15 minutes        |
| P1 (High)     | Team Lead         | 1 hour            |
| P2 (Medium)   | Assigned Engineer | 4 hours           |
| P3 (Low)      | Team              | Next business day |

## Best Practices

### Deployment Best Practices

1. **Always test in staging first**
2. **Deploy during low-traffic periods**
3. **Have rollback plan ready**
4. **Monitor closely post-deployment**
5. **Document all changes**

### Monitoring Best Practices

1. **Set up comprehensive alerting**
2. **Monitor business metrics, not just technical**
3. **Use distributed tracing for complex flows**
4. **Regular performance reviews**
5. **Proactive capacity planning**

### Rollback Best Practices

1. **Practice rollback procedures regularly**
2. **Automate rollback triggers where possible**
3. **Maintain rollback documentation**
4. **Test rollback procedures in staging**
5. **Have communication plan ready**

## Scripts Reference

| Script                      | Purpose                              | Usage                                         |
| --------------------------- | ------------------------------------ | --------------------------------------------- |
| `deploy-with-validation.sh` | Automated deployment with validation | `./scripts/deploy-with-validation.sh <stage>` |
| `deployment-validation.ts`  | Post-deployment validation           | `npm run validate-deployment`                 |
| `rollback-procedures.ts`    | Automated rollback procedures        | `npm run rollback emergency <version>`        |
| `system-diagnostics.ts`     | System health diagnostics            | `npm run system-diagnostics`                  |
| `performance-check.ts`      | Performance analysis                 | `npm run performance-check`                   |
| `health-check.ts`           | Simple health check                  | `npm run health-check`                        |

## Configuration

### Environment Variables

Required environment variables for deployment and validation:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_PROFILE=default

# Application Configuration
STAGE=dev|staging|prod
DYNAMODB_TABLE_NAME=sachain-table
S3_BUCKET_NAME=sachain-project-images
EVENT_BUS_NAME=sachain-events

# API Configuration
API_BASE_URL=https://api.sachain.com/dev

# External Services
IPFS_GATEWAY=https://ipfs.io
HEDERA_NETWORK=testnet

# Notifications (Optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
```

### Package.json Scripts

All deployment and validation scripts are available via npm:

```json
{
  "scripts": {
    "deploy": "scripts/deploy-with-validation.sh",
    "deploy:dev": "scripts/deploy-with-validation.sh dev",
    "deploy:staging": "scripts/deploy-with-validation.sh staging",
    "deploy:prod": "scripts/deploy-with-validation.sh prod --auto-rollback",
    "validate-deployment": "ts-node scripts/deployment-validation.ts",
    "rollback": "ts-node scripts/rollback-procedures.ts",
    "rollback:emergency": "ts-node scripts/rollback-procedures.ts emergency",
    "rollback:auto": "ts-node scripts/rollback-procedures.ts auto",
    "health-check": "ts-node scripts/health-check.ts",
    "system-diagnostics": "ts-node scripts/system-diagnostics.ts",
    "performance-check": "ts-node scripts/performance-check.ts"
  }
}
```

This comprehensive deployment validation and rollback system ensures reliable, monitored deployments with quick recovery capabilities for the Sachain project creation feature.
