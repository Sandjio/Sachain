#!/bin/bash

# Deployment Validation Script
# This script validates that all infrastructure components are working correctly

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

echo -e "${BLUE}🔍 Validating Sachain Infrastructure Deployment${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}Region: ${REGION}${NC}"
echo ""

# Set AWS profile
export AWS_PROFILE=$PROFILE
export AWS_REGION=$REGION

# Validation functions
validate_stack_exists() {
    local stack_name=$1
    echo -e "${YELLOW}📋 Checking if stack $stack_name exists...${NC}"
    
    if aws cloudformation describe-stacks --stack-name "$stack_name" > /dev/null 2>&1; then
        local status=$(aws cloudformation describe-stacks --stack-name "$stack_name" --query 'Stacks[0].StackStatus' --output text)
        if [ "$status" = "CREATE_COMPLETE" ] || [ "$status" = "UPDATE_COMPLETE" ]; then
            echo -e "${GREEN}✅ Stack $stack_name exists and is in good state ($status)${NC}"
            return 0
        else
            echo -e "${RED}❌ Stack $stack_name exists but is in bad state: $status${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Stack $stack_name does not exist${NC}"
        return 1
    fi
}

validate_dynamodb_table() {
    local table_name=$1
    echo -e "${YELLOW}🗄️ Checking DynamoDB table $table_name...${NC}"
    
    if aws dynamodb describe-table --table-name "$table_name" > /dev/null 2>&1; then
        local status=$(aws dynamodb describe-table --table-name "$table_name" --query 'Table.TableStatus' --output text)
        if [ "$status" = "ACTIVE" ]; then
            echo -e "${GREEN}✅ DynamoDB table $table_name is active${NC}"
            
            # Check GSI indexes
            local gsi_count=$(aws dynamodb describe-table --table-name "$table_name" --query 'length(Table.GlobalSecondaryIndexes)' --output text)
            echo -e "${GREEN}  📊 GSI indexes: $gsi_count${NC}"
            return 0
        else
            echo -e "${RED}❌ DynamoDB table $table_name is not active: $status${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ DynamoDB table $table_name does not exist${NC}"
        return 1
    fi
}

validate_s3_bucket() {
    local bucket_name=$1
    local bucket_type=$2
    echo -e "${YELLOW}🪣 Checking S3 bucket $bucket_name ($bucket_type)...${NC}"
    
    if aws s3api head-bucket --bucket "$bucket_name" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ S3 bucket $bucket_name exists and is accessible${NC}"
        
        # Check encryption
        if aws s3api get-bucket-encryption --bucket "$bucket_name" > /dev/null 2>&1; then
            echo -e "${GREEN}  🔒 Encryption is enabled${NC}"
        else
            echo -e "${YELLOW}  ⚠️ Encryption status unknown${NC}"
        fi
        
        # Check versioning for document bucket
        if [ "$bucket_type" = "documents" ]; then
            local versioning=$(aws s3api get-bucket-versioning --bucket "$bucket_name" --query 'Status' --output text 2>/dev/null || echo "Disabled")
            echo -e "${GREEN}  📝 Versioning: $versioning${NC}"
        fi
        
        return 0
    else
        echo -e "${RED}❌ S3 bucket $bucket_name does not exist or is not accessible${NC}"
        return 1
    fi
}

validate_lambda_function() {
    local function_name=$1
    echo -e "${YELLOW}⚡ Checking Lambda function $function_name...${NC}"
    
    if aws lambda get-function --function-name "$function_name" > /dev/null 2>&1; then
        local state=$(aws lambda get-function --function-name "$function_name" --query 'Configuration.State' --output text)
        if [ "$state" = "Active" ]; then
            echo -e "${GREEN}✅ Lambda function $function_name is active${NC}"
            
            # Check last update status
            local last_update=$(aws lambda get-function --function-name "$function_name" --query 'Configuration.LastUpdateStatus' --output text)
            echo -e "${GREEN}  🔄 Last update status: $last_update${NC}"
            return 0
        else
            echo -e "${RED}❌ Lambda function $function_name is not active: $state${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Lambda function $function_name does not exist${NC}"
        return 1
    fi
}

validate_api_gateway() {
    local api_name=$1
    echo -e "${YELLOW}🌐 Checking API Gateway $api_name...${NC}"
    
    local api_id=$(aws apigateway get-rest-apis --query "items[?name=='$api_name'].id" --output text)
    if [ ! -z "$api_id" ] && [ "$api_id" != "None" ]; then
        echo -e "${GREEN}✅ API Gateway $api_name exists (ID: $api_id)${NC}"
        
        # Check deployment
        local deployments=$(aws apigateway get-deployments --rest-api-id "$api_id" --query 'length(items)' --output text)
        echo -e "${GREEN}  🚀 Deployments: $deployments${NC}"
        return 0
    else
        echo -e "${RED}❌ API Gateway $api_name does not exist${NC}"
        return 1
    fi
}

validate_cognito_user_pool() {
    local pool_name=$1
    echo -e "${YELLOW}👥 Checking Cognito User Pool $pool_name...${NC}"
    
    local pool_id=$(aws cognito-idp list-user-pools --max-items 60 --query "UserPools[?Name=='$pool_name'].Id" --output text)
    if [ ! -z "$pool_id" ] && [ "$pool_id" != "None" ]; then
        echo -e "${GREEN}✅ Cognito User Pool $pool_name exists (ID: $pool_id)${NC}"
        
        # Check user pool status
        local status=$(aws cognito-idp describe-user-pool --user-pool-id "$pool_id" --query 'UserPool.Status' --output text 2>/dev/null || echo "Unknown")
        echo -e "${GREEN}  📊 Status: $status${NC}"
        return 0
    else
        echo -e "${RED}❌ Cognito User Pool $pool_name does not exist${NC}"
        return 1
    fi
}

# Get account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Define resource names
STACK_PREFIX="Sachain"
TABLE_NAME="sachain-kyc-table-$ENVIRONMENT"
DOC_BUCKET_NAME="sachain-kyc-documents-$ENVIRONMENT-$ACCOUNT_ID"
IMG_BUCKET_NAME="sachain-project-images-$ENVIRONMENT-$ACCOUNT_ID"
API_NAME="sachain-api-$ENVIRONMENT"
USER_POOL_NAME="sachain-$ENVIRONMENT"

# Lambda function names
LAMBDA_FUNCTIONS=(
    "sachain-kyc-upload-$ENVIRONMENT"
    "sachain-admin-review-$ENVIRONMENT"
    "sachain-user-notification-$ENVIRONMENT"
    "sachain-kyc-processing-$ENVIRONMENT"
    "sachain-project-creation-$ENVIRONMENT"
    "sachain-project-query-$ENVIRONMENT"
    "sachain-project-management-$ENVIRONMENT"
    "sachain-stock-minting-$ENVIRONMENT"
    "sachain-stock-minting-status-$ENVIRONMENT"
    "sachain-post-auth-$ENVIRONMENT"
)

# Stack names
STACKS=(
    "SachainCoreStack-$ENVIRONMENT"
    "SachainSecurityStack-$ENVIRONMENT"
    "SachainLambdaStack-$ENVIRONMENT"
    "SachainMonitoringStack-$ENVIRONMENT"
)

# Validation counters
TOTAL_CHECKS=0
PASSED_CHECKS=0

# Validate CloudFormation stacks
echo -e "${BLUE}🏗️ Validating CloudFormation Stacks${NC}"
for stack in "${STACKS[@]}"; do
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    if validate_stack_exists "$stack"; then
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    fi
done
echo ""

# Validate DynamoDB
echo -e "${BLUE}🗄️ Validating DynamoDB Resources${NC}"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if validate_dynamodb_table "$TABLE_NAME"; then
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
fi
echo ""

# Validate S3 buckets
echo -e "${BLUE}🪣 Validating S3 Resources${NC}"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if validate_s3_bucket "$DOC_BUCKET_NAME" "documents"; then
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
fi

TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if validate_s3_bucket "$IMG_BUCKET_NAME" "images"; then
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
fi
echo ""

# Validate Lambda functions
echo -e "${BLUE}⚡ Validating Lambda Functions${NC}"
for lambda_func in "${LAMBDA_FUNCTIONS[@]}"; do
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    if validate_lambda_function "$lambda_func"; then
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    fi
done
echo ""

# Validate API Gateway
echo -e "${BLUE}🌐 Validating API Gateway${NC}"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if validate_api_gateway "$API_NAME"; then
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
fi
echo ""

# Validate Cognito
echo -e "${BLUE}👥 Validating Cognito Resources${NC}"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if validate_cognito_user_pool "$USER_POOL_NAME"; then
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
fi
echo ""

# Summary
echo -e "${BLUE}📊 Validation Summary${NC}"
echo -e "${BLUE}Total checks: $TOTAL_CHECKS${NC}"
echo -e "${GREEN}Passed: $PASSED_CHECKS${NC}"
echo -e "${RED}Failed: $((TOTAL_CHECKS - PASSED_CHECKS))${NC}"

if [ $PASSED_CHECKS -eq $TOTAL_CHECKS ]; then
    echo ""
    echo -e "${GREEN}🎉 All validation checks passed!${NC}"
    echo -e "${GREEN}✨ Infrastructure is ready for use${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}❌ Some validation checks failed${NC}"
    echo -e "${YELLOW}💡 Please check the failed resources and redeploy if necessary${NC}"
    exit 1
fi