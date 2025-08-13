# Sachain KYC Infrastructure Deployment Guide

This document provides comprehensive instructions for deploying the Sachain KYC authentication infrastructure across different environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Deployment Methods](#deployment-methods)
- [Environment-Specific Deployments](#environment-specific-deployments)
- [CI/CD Pipeline](#cicd-pipeline)
- [Post-Deployment Validation](#post-deployment-validation)
- [Troubleshooting](#troubleshooting)
- [Rollback Procedures](#rollback-procedures)

## Prerequisites

### Required Tools

1. **AWS CLI** (v2.0+)

   ```bash
   aws --version
   aws configure
   ```

2. **AWS CDK** (v2.201.0+)

   ```bash
   npm install -g aws-cdk
   cdk --version
   ```

3. **Node.js** (v18+)

   ```bash
   node --version
   npm --version
   ```

4. **Git**
   ```bash
   git --version
   ```

### AWS Account Setup

1. **IAM Permissions**: Ensure your AWS credentials have the following permissions:

   - CloudFormation full access
   - IAM role creation and management
   - Lambda function management
   - DynamoDB table management
   - S3 bucket management
   - Cognito User Pool management
   - EventBridge management
   - CloudWatch Logs and Metrics
   - KMS key management

2. **CDK Bootstrap**: Bootstrap your AWS account for CDK deployments:
   ```bash
   cd sachain-infrastructure
   npm run bootstrap:dev      # For development
   npm run bootstrap:staging  # For staging
   npm run bootstrap:prod     # For production
   ```

## Environment Configuration

### Available Environments

- **dev**: Development environment with minimal resources and relaxed security
- **staging**: Pre-production environment with production-like configuration
- **prod**: Production environment with maximum security and monitoring

### Configuration Files

Environment-specific configurations are stored in:

- `config/environments.json`: Environment-specific settings
- `config/secrets.ts`: Secrets and parameter management
- `lib/config.ts`: Configuration loading and validation

### Environment Variables

Set the following environment variables for deployment:

```bash
# Required
export AWS_ACCOUNT_ID="123456789012"
export AWS_REGION="us-east-1"

# Optional
export ENVIRONMENT="dev"  # dev, staging, or prod
export CDK_DEFAULT_ACCOUNT="123456789012"
export CDK_DEFAULT_REGION="us-east-1"
```

## Deployment Methods

### Method 1: Automated Deployment Script (Recommended)

The deployment script provides comprehensive deployment with validation and error handling:

```bash
# Deploy to development
./scripts/deploy.sh dev

# Deploy to staging with verbose output
./scripts/deploy.sh staging --verbose

# Deploy to production (requires confirmation)
./scripts/deploy.sh prod

# Dry run to see what would be deployed
./scripts/deploy.sh staging --dry-run

# Force deployment without confirmation
./scripts/deploy.sh prod --force

# Skip tests during deployment
./scripts/deploy.sh dev --skip-tests
```

### Method 2: Direct CDK Commands

For quick deployments or debugging:

```bash
# Install dependencies
npm ci

# Build the project
npm run build

# Deploy to specific environment
npm run deploy:dev
npm run deploy:staging
npm run deploy:prod

# Show deployment diff
npm run diff:dev
npm run diff:staging
npm run diff:prod

# Synthesize CloudFormation template
npm run synth:dev
npm run synth:staging
npm run synth:prod
```

### Method 3: Manual Step-by-Step

For detailed control over the deployment process:

```bash
# 1. Install dependencies
npm ci

# 2. Run tests
npm test

# 3. Build project
npm run build

# 4. Validate CDK app
cdk synth --context environment=dev

# 5. Show deployment diff
cdk diff --context environment=dev

# 6. Deploy infrastructure
cdk deploy --context environment=dev

# 7. Run post-deployment validation
npm run test:integration
```

## Environment-Specific Deployments

### Development Environment

**Purpose**: Local development and testing

**Configuration**:

- Minimal resources and costs
- Relaxed security policies
- Short log retention (7 days)
- Basic monitoring

**Deployment**:

```bash
./scripts/deploy.sh dev
```

**Resources Created**:

- DynamoDB table with on-demand billing
- S3 bucket with AWS-managed encryption
- Lambda functions with 256MB memory
- Cognito User Pool with basic password policy
- CloudWatch logs with 7-day retention

### Staging Environment

**Purpose**: Pre-production testing and validation

**Configuration**:

- Production-like resources
- Enhanced security policies
- Medium log retention (30 days)
- Detailed monitoring enabled

**Deployment**:

```bash
./scripts/deploy.sh staging --verbose
```

**Resources Created**:

- DynamoDB table with customer-managed encryption
- S3 bucket with customer-managed KMS encryption
- Lambda functions with 512MB memory
- Cognito User Pool with strong password policy
- CloudWatch logs with 30-day retention
- Enhanced monitoring and alerting

### Production Environment

**Purpose**: Live production system

**Configuration**:

- Maximum security and compliance
- Strict password policies
- Long log retention (90 days)
- Comprehensive monitoring and alerting

**Deployment**:

```bash
# Requires manual confirmation
./scripts/deploy.sh prod

# Or force deployment (use with caution)
./scripts/deploy.sh prod --force
```

**Resources Created**:

- DynamoDB table with customer-managed encryption and backup
- S3 bucket with customer-managed KMS encryption and versioning
- Lambda functions with 1024MB memory and reserved concurrency
- Cognito User Pool with maximum security settings
- CloudWatch logs with 90-day retention
- Comprehensive monitoring, alerting, and dashboards

## CI/CD Pipeline

### GitHub Actions Workflow

The CI/CD pipeline is defined in `scripts/ci-cd-pipeline.yml` and includes:

1. **Code Quality Checks**

   - TypeScript compilation
   - Unit tests with coverage
   - Security scanning
   - Dependency auditing

2. **Infrastructure Validation**

   - CDK synthesis
   - Template validation
   - Security policy validation

3. **Deployment**

   - Environment-specific deployment
   - Post-deployment validation
   - Smoke tests

4. **Monitoring**
   - Deployment notifications
   - Rollback on failure (production)

### Pipeline Triggers

- **Push to main**: Deploys to production
- **Push to develop**: Deploys to staging
- **Pull requests**: Shows deployment diff
- **Manual trigger**: Deploy to any environment

### Required Secrets

Configure the following secrets in your GitHub repository:

```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
```

## Post-Deployment Validation

### Automated Validation

The deployment script automatically runs validation checks:

```bash
# Run deployment validation tests
npm run test:deployment

# Run integration tests against deployed resources
npm run test:integration
```

### Manual Validation

1. **Check Stack Status**:

   ```bash
   aws cloudformation describe-stacks --stack-name SachainKYCStack-dev
   ```

2. **Verify Cognito User Pool**:

   ```bash
   aws cognito-idp list-user-pools --max-results 10
   ```

3. **Test API Gateway**:

   ```bash
   curl -X GET https://your-api-id.execute-api.us-east-1.amazonaws.com/dev/health
   ```

4. **Check DynamoDB Table**:

   ```bash
   aws dynamodb describe-table --table-name sachain-kyc-dev
   ```

5. **Verify S3 Bucket**:
   ```bash
   aws s3 ls s3://sachain-kyc-documents-dev/
   ```

### Health Checks

The system includes built-in health checks:

- **API Gateway**: `/health` endpoint
- **Lambda Functions**: CloudWatch metrics
- **DynamoDB**: Connection and query tests
- **S3**: Bucket accessibility tests

## Troubleshooting

### Common Issues

1. **CDK Bootstrap Not Run**

   ```
   Error: Need to perform AWS CDK bootstrap
   Solution: Run `npm run bootstrap:dev`
   ```

2. **Insufficient IAM Permissions**

   ```
   Error: User is not authorized to perform action
   Solution: Check IAM permissions and policies
   ```

3. **Resource Limit Exceeded**

   ```
   Error: Cannot exceed quota for resource
   Solution: Request quota increase or clean up unused resources
   ```

4. **Stack Already Exists**
   ```
   Error: Stack already exists
   Solution: Use `cdk diff` to see changes, then `cdk deploy`
   ```

### Debug Commands

```bash
# Enable verbose CDK output
cdk deploy --verbose --context environment=dev

# Show detailed CloudFormation events
aws cloudformation describe-stack-events --stack-name SachainKYCStack-dev

# Check Lambda function logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/sachain"

# Validate CDK app without deploying
cdk synth --context environment=dev --validation
```

### Log Analysis

```bash
# View recent Lambda logs
aws logs filter-log-events --log-group-name "/aws/lambda/sachain-dev-PostAuth" --start-time $(date -d '1 hour ago' +%s)000

# Check CloudWatch alarms
aws cloudwatch describe-alarms --state-value ALARM

# View deployment metrics
aws cloudwatch get-metric-statistics --namespace AWS/CloudFormation --metric-name StackStatus --start-time $(date -d '1 day ago' --iso-8601) --end-time $(date --iso-8601) --period 3600 --statistics Sum
```

## Rollback Procedures

### Automatic Rollback

The CI/CD pipeline includes automatic rollback for production deployments on failure.

### Manual Rollback

1. **Identify Previous Version**:

   ```bash
   aws cloudformation describe-stack-events --stack-name SachainKYCStack-prod | grep "UPDATE_COMPLETE"
   ```

2. **Rollback Stack**:

   ```bash
   aws cloudformation cancel-update-stack --stack-name SachainKYCStack-prod
   ```

3. **Deploy Previous Version**:
   ```bash
   git checkout <previous-commit>
   ./scripts/deploy.sh prod --force
   ```

### Emergency Procedures

1. **Disable API Gateway**:

   ```bash
   aws apigateway update-stage --rest-api-id <api-id> --stage-name prod --patch-ops op=replace,path=/throttle/rateLimit,value=0
   ```

2. **Scale Down Lambda Concurrency**:

   ```bash
   aws lambda put-provisioned-concurrency-config --function-name sachain-prod-KYCUpload --provisioned-concurrency-config ProvisionedConcurrencyConfig=0
   ```

3. **Enable Maintenance Mode**:
   ```bash
   aws ssm put-parameter --name "/sachain/prod/maintenance-mode" --value "true" --overwrite
   ```

## Security Considerations

### Secrets Management

- All secrets are stored in AWS Secrets Manager
- Parameters are stored in AWS Systems Manager Parameter Store
- KMS encryption is used for all sensitive data

### Access Control

- Least privilege IAM policies
- Resource-based policies for fine-grained access
- Cross-account access controls where needed

### Compliance

- All actions are logged for audit purposes
- GDPR compliance features included
- Data retention policies enforced

## Monitoring and Alerting

### CloudWatch Dashboards

Each environment includes dashboards for:

- Lambda function metrics
- API Gateway performance
- DynamoDB operations
- Error rates and latency

### Alarms

Configured alarms for:

- High error rates (>1% for prod, >2% for staging, >5% for dev)
- High latency (>2s for prod, >3s for staging, >5s for dev)
- Lambda function failures
- DynamoDB throttling

### Notifications

- SNS topics for operational alerts
- Email notifications for critical issues
- Slack integration (if configured)

## Cost Optimization

### Resource Optimization

- On-demand billing for DynamoDB
- Right-sized Lambda functions
- S3 lifecycle policies for cost reduction
- CloudWatch log retention policies

### Monitoring

- AWS Cost Explorer integration
- Budget alerts for unexpected spending
- Regular cost optimization reviews

## Support and Maintenance

### Regular Tasks

1. **Weekly**: Review CloudWatch alarms and metrics
2. **Monthly**: Update dependencies and security patches
3. **Quarterly**: Review and optimize costs
4. **Annually**: Security audit and compliance review

### Contact Information

- **Development Team**: dev-team@sachain.com
- **DevOps Team**: devops@sachain.com
- **Security Team**: security@sachain.com

For urgent production issues, use the on-call escalation process defined in the incident response playbook.
