#!/bin/bash

# Deploy All Stacks Script
# This script deploys all Sachain infrastructure stacks in the correct order

set -e  # Exit on any error

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

echo -e "${BLUE}🚀 Starting Sachain Infrastructure Deployment${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}Region: ${REGION}${NC}"
echo -e "${BLUE}Profile: ${PROFILE}${NC}"
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
export CDK_DEFAULT_REGION=$REGION

# Check AWS credentials
echo -e "${YELLOW}🔐 Checking AWS credentials...${NC}"
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo -e "${RED}❌ AWS credentials not configured or invalid${NC}"
    echo -e "${YELLOW}Please run: aws configure --profile $PROFILE${NC}"
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}✅ AWS credentials valid for account: $ACCOUNT_ID${NC}"

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install

# Build the project
echo -e "${YELLOW}🔨 Building project...${NC}"
npm run build

# Bootstrap CDK if needed
echo -e "${YELLOW}🏗️ Bootstrapping CDK...${NC}"
npx cdk bootstrap aws://$ACCOUNT_ID/$REGION --profile $PROFILE

# Deploy stacks in order
STACKS=(
    "SachainCoreStack-$ENVIRONMENT"
    "SachainSecurityStack-$ENVIRONMENT"
    "SachainLambdaStack-$ENVIRONMENT"
    "SachainMonitoringStack-$ENVIRONMENT"
)

echo -e "${YELLOW}📋 Deployment order:${NC}"
for i in "${!STACKS[@]}"; do
    echo -e "${BLUE}  $((i+1)). ${STACKS[$i]}${NC}"
done
echo ""

# Deploy each stack
for STACK in "${STACKS[@]}"; do
    echo -e "${YELLOW}🚀 Deploying $STACK...${NC}"
    
    if npx cdk deploy $STACK \
        --context environment=$ENVIRONMENT \
        --profile $PROFILE \
        --require-approval never \
        --outputs-file cdk-outputs-$ENVIRONMENT.json; then
        echo -e "${GREEN}✅ $STACK deployed successfully${NC}"
    else
        echo -e "${RED}❌ Failed to deploy $STACK${NC}"
        exit 1
    fi
    echo ""
done

# Generate deployment summary
echo -e "${GREEN}🎉 All stacks deployed successfully!${NC}"
echo ""
echo -e "${BLUE}📊 Deployment Summary:${NC}"
echo -e "${BLUE}Environment: $ENVIRONMENT${NC}"
echo -e "${BLUE}Region: $REGION${NC}"
echo -e "${BLUE}Account: $ACCOUNT_ID${NC}"
echo -e "${BLUE}Timestamp: $(date)${NC}"

# Display important outputs
if [ -f "cdk-outputs-$ENVIRONMENT.json" ]; then
    echo ""
    echo -e "${BLUE}🔗 Important Resources:${NC}"
    
    # Extract API URL
    API_URL=$(jq -r ".\"SachainLambdaStack-$ENVIRONMENT\".ApiUrl // empty" cdk-outputs-$ENVIRONMENT.json 2>/dev/null || echo "")
    if [ ! -z "$API_URL" ]; then
        echo -e "${GREEN}API Gateway URL: $API_URL${NC}"
    fi
    
    # Extract User Pool ID
    USER_POOL_ID=$(jq -r ".\"SachainCoreStack-$ENVIRONMENT\".UserPoolId // empty" cdk-outputs-$ENVIRONMENT.json 2>/dev/null || echo "")
    if [ ! -z "$USER_POOL_ID" ]; then
        echo -e "${GREEN}Cognito User Pool ID: $USER_POOL_ID${NC}"
    fi
    
    # Extract DynamoDB Table Name
    TABLE_NAME=$(jq -r ".\"SachainCoreStack-$ENVIRONMENT\".TableName // empty" cdk-outputs-$ENVIRONMENT.json 2>/dev/null || echo "")
    if [ ! -z "$TABLE_NAME" ]; then
        echo -e "${GREEN}DynamoDB Table: $TABLE_NAME${NC}"
    fi
fi

echo ""
echo -e "${GREEN}✨ Deployment completed successfully!${NC}"
echo -e "${YELLOW}💡 Next steps:${NC}"
echo -e "${YELLOW}  1. Update frontend configuration with new API URL${NC}"
echo -e "${YELLOW}  2. Test API endpoints${NC}"
echo -e "${YELLOW}  3. Verify monitoring dashboards${NC}"