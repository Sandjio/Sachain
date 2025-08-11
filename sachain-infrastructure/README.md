# Sachain KYC Authentication Infrastructure

This CDK project sets up the serverless infrastructure for the Sachain KYC (Know Your Customer) authentication system.

## Architecture Overview

The infrastructure includes:

- **DynamoDB**: Single table design for user data and KYC documents
- **S3**: Encrypted bucket for secure document storage
- **Lambda Functions**: Post-authentication, KYC upload, and admin review functions
- **Cognito**: User pool for authentication and authorization
- **EventBridge**: Event-driven architecture for KYC status changes
- **SNS**: Notifications for admin review and user updates
- **CloudWatch**: Monitoring, logging, and alerting

## Environment Configuration

The infrastructure supports multiple environments (dev, staging, prod) with environment-specific configurations.

### Available Commands

```bash
# Build the project
npm run build

# Deploy to development environment
npm run deploy:dev

# Deploy to staging environment
npm run deploy:staging

# Deploy to production environment
npm run deploy:prod

# Synthesize CloudFormation template for dev
npm run synth:dev

# View differences for dev environment
npm run diff:dev
```

### Environment Variables

The following environment variables can be configured:

- `ENVIRONMENT`: Target environment (dev, staging, prod)
- `AWS_ACCOUNT_ID`: AWS account ID for deployment
- `AWS_REGION`: AWS region for deployment

## Project Structure

```
sachain-infrastructure/
├── lib/
│   ├── constructs/          # Reusable CDK constructs
│   │   ├── cognito.ts       # Cognito User Pool construct
│   │   ├── dynamodb.ts      # DynamoDB table construct
│   │   ├── lambda.ts        # Lambda functions construct
│   │   ├── s3.ts           # S3 bucket construct
│   │   ├── eventbridge.ts   # EventBridge construct
│   │   ├── monitoring.ts    # CloudWatch monitoring construct
│   │   └── index.ts         # Construct exports
│   ├── config.ts           # Environment configuration
│   └── sachain-infrastructure-stack.ts  # Main stack
├── bin/
│   └── sachain-infrastructure.ts  # CDK app entry point
├── test/
│   └── sachain-infrastructure.test.ts  # Infrastructure tests
├── cdk.json                # CDK configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies and scripts
```

## Next Steps

This infrastructure setup provides the foundation for implementing the KYC authentication system. The next tasks will involve:

1. Implementing DynamoDB Single Table Design (Task 2)
2. Creating AWS Cognito User Pool infrastructure (Task 3)
3. Implementing Lambda functions (Tasks 4-7)
4. Setting up monitoring and testing (Tasks 9-10)

## Security Features

- All resources are tagged for proper cost allocation and management
- S3 buckets use KMS encryption for data at rest
- Lambda functions use least-privilege IAM roles
- DynamoDB tables have encryption enabled
- Environment-specific resource naming prevents conflicts
