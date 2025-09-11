#!/bin/bash

# Environment Setup Script
# This script sets up environment-specific configuration and secrets

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=${1:-dev}
REGION=${2:-us-east-1}
PROFILE=${3:-default}

echo -e "${BLUE}⚙️ Setting up Sachain Environment Configuration${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}Region: ${REGION}${NC}"
echo ""

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    echo -e "${RED}❌ Invalid environment: $ENVIRONMENT${NC}"
    echo -e "${YELLOW}Valid environments: dev, staging, prod${NC}"
    exit 1
fi

# Set AWS profile
export AWS_PROFILE=$PROFILE
export AWS_REGION=$REGION

# Check if config directory exists
CONFIG_DIR="../config"
if [ ! -d "$CONFIG_DIR" ]; then
    echo -e "${YELLOW}📁 Creating config directory...${NC}"
    mkdir -p "$CONFIG_DIR"
fi

# Create environment-specific configuration
echo -e "${YELLOW}📝 Creating environment configuration...${NC}"

# Generate environments.json if it doesn't exist
ENVIRONMENTS_FILE="$CONFIG_DIR/environments.json"
if [ ! -f "$ENVIRONMENTS_FILE" ]; then
    echo -e "${YELLOW}📄 Creating environments.json...${NC}"
    cat > "$ENVIRONMENTS_FILE" << EOF
{
  "dev": {
    "region": "us-east-1",
    "domainName": "dev.sachain.com",
    "enableXRayTracing": true,
    "logRetentionDays": 7,
    "enableDetailedMonitoring": false,
    "kmsKeyAlias": "alias/sachain-dev-key",
    "cognitoPasswordPolicy": {
      "minimumLength": 8,
      "requireUppercase": true,
      "requireLowercase": true,
      "requireNumbers": true,
      "requireSymbols": false
    },
    "lambdaConfig": {
      "timeout": 30,
      "memorySize": 256,
      "reservedConcurrency": 10
    },
    "s3Config": {
      "maxFileSize": 10485760,
      "allowedFileTypes": ["image/jpeg", "image/png", "application/pdf"],
      "lifecycleRules": {
        "transitionToIA": 30,
        "transitionToGlacier": 90,
        "expiration": 2555
      }
    },
    "dynamoDbConfig": {
      "billingMode": "PAY_PER_REQUEST",
      "pointInTimeRecovery": true,
      "encryption": "AWS_MANAGED"
    },
    "monitoringConfig": {
      "errorRateThreshold": 0.05,
      "latencyThreshold": 5000,
      "enableDashboard": true
    }
  },
  "staging": {
    "region": "us-east-1",
    "domainName": "staging.sachain.com",
    "enableXRayTracing": true,
    "logRetentionDays": 30,
    "enableDetailedMonitoring": true,
    "kmsKeyAlias": "alias/sachain-staging-key",
    "cognitoPasswordPolicy": {
      "minimumLength": 10,
      "requireUppercase": true,
      "requireLowercase": true,
      "requireNumbers": true,
      "requireSymbols": true
    },
    "lambdaConfig": {
      "timeout": 30,
      "memorySize": 512,
      "reservedConcurrency": 50
    },
    "s3Config": {
      "maxFileSize": 10485760,
      "allowedFileTypes": ["image/jpeg", "image/png", "application/pdf"],
      "lifecycleRules": {
        "transitionToIA": 30,
        "transitionToGlacier": 90,
        "expiration": 2555
      }
    },
    "dynamoDbConfig": {
      "billingMode": "PAY_PER_REQUEST",
      "pointInTimeRecovery": true,
      "encryption": "CUSTOMER_MANAGED"
    },
    "monitoringConfig": {
      "errorRateThreshold": 0.02,
      "latencyThreshold": 3000,
      "enableDashboard": true
    }
  },
  "prod": {
    "region": "us-east-1",
    "domainName": "sachain.com",
    "enableXRayTracing": true,
    "logRetentionDays": 90,
    "enableDetailedMonitoring": true,
    "kmsKeyAlias": "alias/sachain-prod-key",
    "cognitoPasswordPolicy": {
      "minimumLength": 12,
      "requireUppercase": true,
      "requireLowercase": true,
      "requireNumbers": true,
      "requireSymbols": true
    },
    "lambdaConfig": {
      "timeout": 30,
      "memorySize": 1024,
      "reservedConcurrency": 100
    },
    "s3Config": {
      "maxFileSize": 10485760,
      "allowedFileTypes": ["image/jpeg", "image/png", "application/pdf"],
      "lifecycleRules": {
        "transitionToIA": 30,
        "transitionToGlacier": 90,
        "expiration": 2555
      }
    },
    "dynamoDbConfig": {
      "billingMode": "PAY_PER_REQUEST",
      "pointInTimeRecovery": true,
      "encryption": "CUSTOMER_MANAGED"
    },
    "monitoringConfig": {
      "errorRateThreshold": 0.01,
      "latencyThreshold": 2000,
      "enableDashboard": true
    }
  }
}
EOF
    echo -e "${GREEN}✅ Created environments.json${NC}"
else
    echo -e "${GREEN}✅ environments.json already exists${NC}"
fi

# Create secrets template
SECRETS_FILE="$CONFIG_DIR/secrets.ts"
if [ ! -f "$SECRETS_FILE" ]; then
    echo -e "${YELLOW}🔐 Creating secrets template...${NC}"
    cat > "$SECRETS_FILE" << EOF
// Secrets Configuration
// This file contains environment-specific secrets and sensitive configuration
// DO NOT commit this file to version control

export interface SecretsConfig {
  hederaAccountId?: string;
  hederaPrivateKey?: string;
  ipfsApiKey?: string;
  ipfsSecretKey?: string;
  adminEmails?: string[];
  smtpConfig?: {
    host: string;
    port: number;
    username: string;
    password: string;
  };
}

export const secrets: Record<string, SecretsConfig> = {
  dev: {
    hederaAccountId: process.env.HEDERA_ACCOUNT_ID_DEV,
    hederaPrivateKey: process.env.HEDERA_PRIVATE_KEY_DEV,
    ipfsApiKey: process.env.IPFS_API_KEY_DEV,
    ipfsSecretKey: process.env.IPFS_SECRET_KEY_DEV,
    adminEmails: ['admin@sachain-dev.com'],
    smtpConfig: {
      host: 'smtp.gmail.com',
      port: 587,
      username: process.env.SMTP_USERNAME_DEV || '',
      password: process.env.SMTP_PASSWORD_DEV || '',
    },
  },
  staging: {
    hederaAccountId: process.env.HEDERA_ACCOUNT_ID_STAGING,
    hederaPrivateKey: process.env.HEDERA_PRIVATE_KEY_STAGING,
    ipfsApiKey: process.env.IPFS_API_KEY_STAGING,
    ipfsSecretKey: process.env.IPFS_SECRET_KEY_STAGING,
    adminEmails: ['admin@sachain-staging.com'],
    smtpConfig: {
      host: 'smtp.gmail.com',
      port: 587,
      username: process.env.SMTP_USERNAME_STAGING || '',
      password: process.env.SMTP_PASSWORD_STAGING || '',
    },
  },
  prod: {
    hederaAccountId: process.env.HEDERA_ACCOUNT_ID_PROD,
    hederaPrivateKey: process.env.HEDERA_PRIVATE_KEY_PROD,
    ipfsApiKey: process.env.IPFS_API_KEY_PROD,
    ipfsSecretKey: process.env.IPFS_SECRET_KEY_PROD,
    adminEmails: ['admin@sachain.com'],
    smtpConfig: {
      host: 'smtp.gmail.com',
      port: 587,
      username: process.env.SMTP_USERNAME_PROD || '',
      password: process.env.SMTP_PASSWORD_PROD || '',
    },
  },
};

export function getSecretsConfig(environment: string): SecretsConfig {
  const config = secrets[environment];
  if (!config) {
    throw new Error(\`Unknown environment: \${environment}\`);
  }
  return config;
}
EOF
    echo -e "${GREEN}✅ Created secrets template${NC}"
else
    echo -e "${GREEN}✅ secrets.ts already exists${NC}"
fi

# Create environment variables template
ENV_FILE="$CONFIG_DIR/.env.$ENVIRONMENT"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}🌍 Creating environment variables template...${NC}"
    cat > "$ENV_FILE" << EOF
# Environment Variables for $ENVIRONMENT
# Copy this file and fill in the actual values
# DO NOT commit this file with real values to version control

# AWS Configuration
AWS_REGION=$REGION
AWS_ACCOUNT_ID=

# Hedera Configuration
HEDERA_NETWORK=testnet
HEDERA_ACCOUNT_ID_${ENVIRONMENT^^}=
HEDERA_PRIVATE_KEY_${ENVIRONMENT^^}=

# IPFS Configuration
IPFS_API_KEY_${ENVIRONMENT^^}=
IPFS_SECRET_KEY_${ENVIRONMENT^^}=
IPFS_GATEWAY_URL=https://gateway.pinata.cloud

# Email Configuration
SMTP_USERNAME_${ENVIRONMENT^^}=
SMTP_PASSWORD_${ENVIRONMENT^^}=
FROM_EMAIL=no-reply@sachain.com

# Frontend Configuration
FRONTEND_URL_${ENVIRONMENT^^}=https://app.sachain-$ENVIRONMENT.com
ADMIN_PORTAL_URL_${ENVIRONMENT^^}=https://admin.sachain-$ENVIRONMENT.com

# Monitoring Configuration
ENABLE_DETAILED_MONITORING=true
LOG_LEVEL=info
EOF
    echo -e "${GREEN}✅ Created environment variables template${NC}"
else
    echo -e "${GREEN}✅ Environment variables file already exists${NC}"
fi

# Create deployment configuration
DEPLOY_CONFIG="$CONFIG_DIR/deploy-$ENVIRONMENT.json"
if [ ! -f "$DEPLOY_CONFIG" ]; then
    echo -e "${YELLOW}🚀 Creating deployment configuration...${NC}"
    cat > "$DEPLOY_CONFIG" << EOF
{
  "environment": "$ENVIRONMENT",
  "region": "$REGION",
  "profile": "$PROFILE",
  "stackNames": [
    "SachainSecurityStack-$ENVIRONMENT",
    "SachainLambdaStack-$ENVIRONMENT",
    "SachainMonitoringStack-$ENVIRONMENT"
  ],
  "deploymentOrder": [
    "SachainSecurityStack-$ENVIRONMENT",
    "SachainLambdaStack-$ENVIRONMENT",
    "SachainMonitoringStack-$ENVIRONMENT"
  ],
  "requireApproval": false,
  "rollbackOnFailure": true,
  "notificationEmails": [
    "admin@sachain.com"
  ],
  "tags": {
    "Environment": "$ENVIRONMENT",
    "Project": "Sachain",
    "ManagedBy": "CDK",
    "Owner": "DevOps"
  }
}
EOF
    echo -e "${GREEN}✅ Created deployment configuration${NC}"
else
    echo -e "${GREEN}✅ Deployment configuration already exists${NC}"
fi

# Update .gitignore to exclude sensitive files
GITIGNORE_FILE="../.gitignore"
echo -e "${YELLOW}🔒 Updating .gitignore for security...${NC}"

# Add entries to .gitignore if they don't exist
GITIGNORE_ENTRIES=(
    "# Environment-specific secrets"
    "config/.env.*"
    "config/secrets.ts"
    "config/secrets.js"
    "cdk-outputs-*.json"
    "*.pem"
    "*.key"
    "# CDK outputs"
    "cdk.out/"
    "cdk.context.json"
)

for entry in "${GITIGNORE_ENTRIES[@]}"; do
    if ! grep -Fxq "$entry" "$GITIGNORE_FILE" 2>/dev/null; then
        echo "$entry" >> "$GITIGNORE_FILE"
    fi
done

echo -e "${GREEN}✅ Updated .gitignore${NC}"

# Create README for configuration
README_FILE="$CONFIG_DIR/README.md"
if [ ! -f "$README_FILE" ]; then
    echo -e "${YELLOW}📚 Creating configuration README...${NC}"
    cat > "$README_FILE" << EOF
# Sachain Infrastructure Configuration

This directory contains environment-specific configuration files for the Sachain infrastructure.

## Files

### \`environments.json\`
Contains environment-specific configuration for infrastructure resources like DynamoDB, Lambda, S3, etc.

### \`secrets.ts\`
Template for environment-specific secrets and sensitive configuration. **DO NOT commit with real values.**

### \`.env.<environment>\`
Environment variables template for each environment. **DO NOT commit with real values.**

### \`deploy-<environment>.json\`
Deployment configuration for each environment including stack names, deployment order, and tags.

## Setup Instructions

1. Copy the environment variables template:
   \`\`\`bash
   cp .env.$ENVIRONMENT .env.$ENVIRONMENT.local
   \`\`\`

2. Fill in the actual values in the \`.local\` file

3. Set up your AWS credentials:
   \`\`\`bash
   aws configure --profile $PROFILE
   \`\`\`

4. Deploy the infrastructure:
   \`\`\`bash
   ../scripts/deploy-all.sh $ENVIRONMENT $REGION $PROFILE
   \`\`\`

## Security Notes

- Never commit files containing real secrets or credentials
- Use AWS Secrets Manager or Parameter Store for production secrets
- Rotate credentials regularly
- Use least-privilege IAM policies

## Environment Variables

### Required for Deployment
- \`AWS_ACCOUNT_ID\`: Your AWS account ID
- \`AWS_REGION\`: AWS region for deployment

### Required for Runtime
- \`HEDERA_ACCOUNT_ID_<ENV>\`: Hedera account ID for the environment
- \`HEDERA_PRIVATE_KEY_<ENV>\`: Hedera private key for the environment
- \`IPFS_API_KEY_<ENV>\`: IPFS API key for metadata storage
- \`SMTP_USERNAME_<ENV>\`: SMTP username for email notifications
- \`SMTP_PASSWORD_<ENV>\`: SMTP password for email notifications

## Troubleshooting

If deployment fails:
1. Check AWS credentials and permissions
2. Verify environment variables are set correctly
3. Run validation script: \`../scripts/validate-deployment.sh $ENVIRONMENT\`
4. Check CloudFormation console for detailed error messages
EOF
    echo -e "${GREEN}✅ Created configuration README${NC}"
else
    echo -e "${GREEN}✅ Configuration README already exists${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Environment setup completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo -e "${YELLOW}1. Fill in the environment variables in: config/.env.$ENVIRONMENT${NC}"
echo -e "${YELLOW}2. Update secrets configuration in: config/secrets.ts${NC}"
echo -e "${YELLOW}3. Set up AWS credentials: aws configure --profile $PROFILE${NC}"
echo -e "${YELLOW}4. Deploy infrastructure: ./scripts/deploy-all.sh $ENVIRONMENT $REGION $PROFILE${NC}"
echo ""
echo -e "${BLUE}📁 Created Files:${NC}"
echo -e "${GREEN}  ✅ $ENVIRONMENTS_FILE${NC}"
echo -e "${GREEN}  ✅ $SECRETS_FILE${NC}"
echo -e "${GREEN}  ✅ $ENV_FILE${NC}"
echo -e "${GREEN}  ✅ $DEPLOY_CONFIG${NC}"
echo -e "${GREEN}  ✅ $README_FILE${NC}"