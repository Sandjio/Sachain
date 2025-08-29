# Sachain Infrastructure Deployment Guide

This guide provides comprehensive instructions for deploying the Sachain infrastructure using AWS CDK.

## 🏗️ Architecture Overview

The Sachain infrastructure consists of four main stacks deployed in a specific order:

1. **CoreStack** - Foundational resources (DynamoDB, S3, Cognito, Post-Auth Lambda)
2. **SecurityStack** - IAM roles and policies with least-privilege access
3. **LambdaStack** - Lambda functions, API Gateway, EventBridge, and SNS
4. **MonitoringStack** - CloudWatch dashboards, alarms, and monitoring

## 📋 Prerequisites

### Required Software
- Node.js 18+ and npm
- AWS CLI v2
- AWS CDK v2
- jq (for JSON processing in scripts)

### AWS Setup
- AWS account with appropriate permissions
- AWS CLI configured with credentials
- CDK bootstrapped in target region

### Required Permissions
Your AWS user/role needs permissions for:
- CloudFormation (full access)
- IAM (create/manage roles and policies)
- Lambda (create/manage functions)
- DynamoDB (create/manage tables)
- S3 (create/manage buckets)
- API Gateway (create/manage APIs)
- Cognito (create/manage user pools)
- EventBridge (create/manage event buses)
- SNS (create/manage topics)
- CloudWatch (create/manage dashboards and alarms)
- KMS (create/manage keys)

## 🚀 Quick Start

### 1. Environment Setup
```bash
# Navigate to infrastructure directory
cd sachain-infrastructure

# Install dependencies
npm install

# Set up environment configuration
npm run setup:env:dev

# Configure AWS credentials
aws configure --profile sachain-dev
```

### 2. Deploy Infrastructure
```bash
# Deploy all stacks for development
npm run deploy:all:dev

# Or use the script directly
./scripts/deploy-all.sh dev us-east-1 sachain-dev
```

### 3. Validate Deployment
```bash
# Validate all resources are working
npm run validate:deployment:dev
```

## 📁 Project Structure

```
sachain-infrastructure/
├── bin/                          # CDK app entry point
├── lib/                          # CDK constructs and stacks
│   ├── constructs/              # Reusable constructs
│   ├── stacks/                  # Stack definitions
│   ├── interfaces/              # TypeScript interfaces
│   └── utils/                   # Utility functions
├── config/                      # Environment configurations
├── scripts/                     # Deployment and utility scripts
├── test/                        # Infrastructure tests
└── cdk.json                     # CDK configuration
```

## 🔧 Configuration

### Environment Configuration
Environment-specific settings are stored in `config/environments.json`:

```json
{
  "dev": {
    "region": "us-east-1",
    "domainName": "dev.sachain.com",
    "enableXRayTracing": true,
    "logRetentionDays": 7,
    "enableDetailedMonitoring": false,
    // ... more configuration
  }
}
```

### Secrets Management
Sensitive configuration is managed through environment variables and AWS Secrets Manager:

```bash
# Set environment variables
export HEDERA_ACCOUNT_ID_DEV="0.0.123456"
export HEDERA_PRIVATE_KEY_DEV="your-private-key"
export IPFS_API_KEY_DEV="your-ipfs-key"
```

## 🚀 Deployment Commands

### Setup Commands
```bash
# Set up environment configuration
npm run setup:env:dev          # Development
npm run setup:env:staging      # Staging
npm run setup:env:prod         # Production
```

### Deployment Commands
```bash
# Deploy all stacks
npm run deploy:all:dev          # Development
npm run deploy:all:staging      # Staging
npm run deploy:all:prod         # Production

# Deploy individual stacks
npm run deploy:dev              # All stacks via CDK
npm run synth:dev               # Generate CloudFormation templates
npm run diff:dev                # Show changes before deployment
```

### Validation Commands
```bash
# Validate deployment
npm run validate:deployment:dev
npm run validate:deployment:staging
npm run validate:deployment:prod

# Run security tests
npm run test:security:dev
npm run test:e2e:dev
```

### Rollback Commands
```bash
# Rollback options
npm run rollback:dev            # Interactive rollback
./scripts/rollback.sh dev us-east-1 default stack    # Stack rollback
./scripts/rollback.sh dev us-east-1 default lambda   # Lambda rollback
./scripts/rollback.sh dev us-east-1 default full     # Full rollback
```

## 🌍 Multi-Environment Deployment

### Development Environment
```bash
# Setup
npm run setup:env:dev
aws configure --profile sachain-dev

# Deploy
npm run deploy:all:dev

# Validate
npm run validate:deployment:dev
```

### Staging Environment
```bash
# Setup
npm run setup:env:staging
aws configure --profile sachain-staging

# Deploy
npm run deploy:all:staging

# Validate
npm run validate:deployment:staging
```

### Production Environment
```bash
# Setup
npm run setup:env:prod
aws configure --profile sachain-prod

# Deploy with extra caution
npm run synth:prod              # Review changes first
npm run deploy:all:prod         # Deploy to production

# Validate
npm run validate:deployment:prod
npm run test:e2e:prod
```

## 🔍 Monitoring and Validation

### Deployment Validation
The validation script checks:
- ✅ CloudFormation stacks exist and are healthy
- ✅ DynamoDB tables are active with correct GSI indexes
- ✅ S3 buckets exist with proper encryption and policies
- ✅ Lambda functions are active and deployable
- ✅ API Gateway is deployed and accessible
- ✅ Cognito User Pool is configured correctly

### Health Checks
```bash
# Quick health check
./scripts/validate-deployment.sh dev

# Detailed monitoring
aws cloudwatch get-dashboard --dashboard-name "Sachain-dev-Dashboard"
```

### Logs and Debugging
```bash
# View CloudFormation events
aws cloudformation describe-stack-events --stack-name SachainCoreStack-dev

# View Lambda logs
aws logs tail /aws/lambda/sachain-project-creation-dev --follow

# View API Gateway logs
aws logs tail API-Gateway-Execution-Logs_<api-id>/dev --follow
```

## 🔒 Security Considerations

### IAM Roles and Policies
- All Lambda functions use least-privilege IAM roles
- Cross-stack references use CloudFormation exports
- KMS encryption for sensitive data at rest
- SSL/TLS encryption for data in transit

### Secrets Management
- Use AWS Secrets Manager for production secrets
- Environment variables for development
- Never commit secrets to version control
- Rotate credentials regularly

### Network Security
- API Gateway with Cognito authorization
- S3 buckets with proper access policies
- VPC endpoints for private communication (future enhancement)

## 🚨 Troubleshooting

### Common Issues

#### 1. Stack Deployment Fails
```bash
# Check stack status
aws cloudformation describe-stacks --stack-name SachainCoreStack-dev

# View detailed events
aws cloudformation describe-stack-events --stack-name SachainCoreStack-dev

# Rollback if needed
npm run rollback:dev
```

#### 2. Lambda Function Errors
```bash
# Check function configuration
aws lambda get-function --function-name sachain-project-creation-dev

# View recent logs
aws logs tail /aws/lambda/sachain-project-creation-dev --since 1h

# Update function code
npm run deploy:dev
```

#### 3. API Gateway Issues
```bash
# Test API endpoint
curl -X GET https://your-api-id.execute-api.us-east-1.amazonaws.com/dev/projects

# Check API Gateway logs
aws logs tail API-Gateway-Execution-Logs_<api-id>/dev --since 1h
```

#### 4. DynamoDB Issues
```bash
# Check table status
aws dynamodb describe-table --table-name sachain-kyc-table-dev

# Check GSI status
aws dynamodb describe-table --table-name sachain-kyc-table-dev --query 'Table.GlobalSecondaryIndexes'
```

### Recovery Procedures

#### Partial Deployment Failure
1. Identify failed stack: `aws cloudformation list-stacks --stack-status-filter CREATE_FAILED UPDATE_FAILED`
2. Review error details: `aws cloudformation describe-stack-events --stack-name <stack-name>`
3. Fix configuration issues
4. Retry deployment: `npm run deploy:all:dev`

#### Complete Environment Recovery
1. Full rollback: `./scripts/rollback.sh dev us-east-1 default full`
2. Clean up any remaining resources manually
3. Redeploy from scratch: `npm run deploy:all:dev`

## 📊 Cost Optimization

### Development Environment
- Use PAY_PER_REQUEST billing for DynamoDB
- Smaller Lambda memory allocations
- Shorter log retention periods
- Auto-delete S3 objects on stack deletion

### Production Environment
- Consider provisioned capacity for DynamoDB if usage is predictable
- Optimize Lambda memory and timeout settings
- Implement S3 lifecycle policies
- Use CloudWatch cost monitoring

## 🔄 CI/CD Integration

### GitHub Actions Example
```yaml
name: Deploy Infrastructure
on:
  push:
    branches: [main]
    paths: ['sachain-infrastructure/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd sachain-infrastructure
          npm install
      
      - name: Deploy to staging
        run: |
          cd sachain-infrastructure
          npm run deploy:all:staging
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      
      - name: Validate deployment
        run: |
          cd sachain-infrastructure
          npm run validate:deployment:staging
```

## 📚 Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS CloudFormation Documentation](https://docs.aws.amazon.com/cloudformation/)
- [Sachain API Documentation](../backend/docs/README.md)
- [Frontend Integration Guide](../sachain-frontend/README.md)

## 🤝 Contributing

1. Create feature branch from `main`
2. Make infrastructure changes
3. Test in development environment
4. Update documentation
5. Create pull request
6. Deploy to staging for testing
7. Deploy to production after approval

## 📞 Support

For deployment issues:
1. Check this documentation
2. Review CloudFormation events
3. Check application logs
4. Contact the DevOps team
5. Create GitHub issue with detailed error information