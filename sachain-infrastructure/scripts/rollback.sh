#!/bin/bash

# Rollback Script
# This script provides rollback capabilities for failed deployments

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
ROLLBACK_TYPE=${4:-stack}  # stack, lambda, or full

echo -e "${BLUE}🔄 Sachain Infrastructure Rollback${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}Region: ${REGION}${NC}"
echo -e "${BLUE}Rollback Type: ${ROLLBACK_TYPE}${NC}"
echo ""

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    echo -e "${RED}❌ Invalid environment: $ENVIRONMENT${NC}"
    echo -e "${YELLOW}Valid environments: dev, staging, prod${NC}"
    exit 1
fi

# Validate rollback type
if [[ ! "$ROLLBACK_TYPE" =~ ^(stack|lambda|full)$ ]]; then
    echo -e "${RED}❌ Invalid rollback type: $ROLLBACK_TYPE${NC}"
    echo -e "${YELLOW}Valid types: stack, lambda, full${NC}"
    exit 1
fi

# Set AWS profile
export AWS_PROFILE=$PROFILE
export AWS_REGION=$REGION

# Check AWS credentials
echo -e "${YELLOW}🔐 Checking AWS credentials...${NC}"
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo -e "${RED}❌ AWS credentials not configured or invalid${NC}"
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}✅ AWS credentials valid for account: $ACCOUNT_ID${NC}"

# Stack names
STACKS=(
    "SachainMonitoringStack-$ENVIRONMENT"
    "SachainLambdaStack-$ENVIRONMENT"
    "SachainSecurityStack-$ENVIRONMENT"
)

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

# Function to check stack status
check_stack_status() {
    local stack_name=$1
    if aws cloudformation describe-stacks --stack-name "$stack_name" > /dev/null 2>&1; then
        aws cloudformation describe-stacks --stack-name "$stack_name" --query 'Stacks[0].StackStatus' --output text
    else
        echo "DOES_NOT_EXIST"
    fi
}

# Function to rollback a single stack
rollback_stack() {
    local stack_name=$1
    local status=$(check_stack_status "$stack_name")
    
    echo -e "${YELLOW}🔄 Checking stack $stack_name (Status: $status)...${NC}"
    
    case $status in
        "CREATE_FAILED"|"ROLLBACK_FAILED"|"UPDATE_FAILED"|"UPDATE_ROLLBACK_FAILED")
            echo -e "${YELLOW}🗑️ Deleting failed stack $stack_name...${NC}"
            aws cloudformation delete-stack --stack-name "$stack_name"
            
            echo -e "${YELLOW}⏳ Waiting for stack deletion to complete...${NC}"
            aws cloudformation wait stack-delete-complete --stack-name "$stack_name"
            echo -e "${GREEN}✅ Stack $stack_name deleted successfully${NC}"
            ;;
        "UPDATE_COMPLETE"|"CREATE_COMPLETE")
            echo -e "${YELLOW}🔄 Initiating rollback for stack $stack_name...${NC}"
            if aws cloudformation cancel-update-stack --stack-name "$stack_name" 2>/dev/null; then
                echo -e "${YELLOW}⏳ Waiting for rollback to complete...${NC}"
                aws cloudformation wait stack-update-complete --stack-name "$stack_name" || true
                echo -e "${GREEN}✅ Stack $stack_name rollback completed${NC}"
            else
                echo -e "${YELLOW}ℹ️ No active update to cancel for $stack_name${NC}"
            fi
            ;;
        "ROLLBACK_COMPLETE")
            echo -e "${YELLOW}ℹ️ Stack $stack_name is already in rollback state${NC}"
            ;;
        "DOES_NOT_EXIST")
            echo -e "${YELLOW}ℹ️ Stack $stack_name does not exist${NC}"
            ;;
        *)
            echo -e "${YELLOW}⚠️ Stack $stack_name is in state: $status${NC}"
            ;;
    esac
}

# Function to rollback Lambda functions to previous version
rollback_lambda_functions() {
    echo -e "${BLUE}⚡ Rolling back Lambda functions${NC}"
    
    for lambda_func in "${LAMBDA_FUNCTIONS[@]}"; do
        echo -e "${YELLOW}🔄 Checking Lambda function $lambda_func...${NC}"
        
        if aws lambda get-function --function-name "$lambda_func" > /dev/null 2>&1; then
            # Get current version
            local current_version=$(aws lambda get-function --function-name "$lambda_func" --query 'Configuration.Version' --output text)
            
            # List versions and get previous version
            local versions=$(aws lambda list-versions-by-function --function-name "$lambda_func" --query 'Versions[?Version!=`$LATEST`].Version' --output text)
            local version_array=($versions)
            
            if [ ${#version_array[@]} -gt 1 ]; then
                # Get second to last version (previous version)
                local previous_version=${version_array[-2]}
                
                echo -e "${YELLOW}🔄 Rolling back $lambda_func from version $current_version to $previous_version...${NC}"
                
                # Update alias to point to previous version
                if aws lambda get-alias --function-name "$lambda_func" --name "LIVE" > /dev/null 2>&1; then
                    aws lambda update-alias \
                        --function-name "$lambda_func" \
                        --name "LIVE" \
                        --function-version "$previous_version" > /dev/null
                    echo -e "${GREEN}✅ Rolled back $lambda_func to version $previous_version${NC}"
                else
                    echo -e "${YELLOW}ℹ️ No LIVE alias found for $lambda_func${NC}"
                fi
            else
                echo -e "${YELLOW}ℹ️ No previous version available for $lambda_func${NC}"
            fi
        else
            echo -e "${YELLOW}ℹ️ Lambda function $lambda_func does not exist${NC}"
        fi
    done
}

# Function to perform full rollback
full_rollback() {
    echo -e "${RED}🚨 Performing FULL ROLLBACK - This will delete all stacks!${NC}"
    echo -e "${YELLOW}⚠️ This action cannot be undone!${NC}"
    
    read -p "Are you sure you want to proceed? (type 'yes' to confirm): " confirmation
    if [ "$confirmation" != "yes" ]; then
        echo -e "${YELLOW}❌ Rollback cancelled${NC}"
        exit 0
    fi
    
    echo -e "${RED}🗑️ Deleting all stacks in reverse order...${NC}"
    
    for stack in "${STACKS[@]}"; do
        local status=$(check_stack_status "$stack")
        if [ "$status" != "DOES_NOT_EXIST" ]; then
            echo -e "${YELLOW}🗑️ Deleting stack $stack...${NC}"
            aws cloudformation delete-stack --stack-name "$stack"
        fi
    done
    
    # Wait for all deletions to complete
    for stack in "${STACKS[@]}"; do
        local status=$(check_stack_status "$stack")
        if [ "$status" != "DOES_NOT_EXIST" ]; then
            echo -e "${YELLOW}⏳ Waiting for $stack deletion to complete...${NC}"
            aws cloudformation wait stack-delete-complete --stack-name "$stack" || true
        fi
    done
    
    echo -e "${GREEN}✅ Full rollback completed${NC}"
}

# Main rollback logic
case $ROLLBACK_TYPE in
    "stack")
        echo -e "${BLUE}🔄 Performing stack rollback${NC}"
        
        # Ask which stack to rollback
        echo -e "${YELLOW}📋 Available stacks:${NC}"
        for i in "${!STACKS[@]}"; do
            echo -e "${BLUE}  $((i+1)). ${STACKS[$i]}${NC}"
        done
        echo -e "${BLUE}  $((${#STACKS[@]}+1)). All stacks${NC}"
        
        read -p "Select stack to rollback (1-$((${#STACKS[@]}+1))): " selection
        
        if [ "$selection" -eq "$((${#STACKS[@]}+1))" ]; then
            # Rollback all stacks in reverse order
            for stack in "${STACKS[@]}"; do
                rollback_stack "$stack"
            done
        elif [ "$selection" -ge 1 ] && [ "$selection" -le "${#STACKS[@]}" ]; then
            # Rollback selected stack
            rollback_stack "${STACKS[$((selection-1))]}"
        else
            echo -e "${RED}❌ Invalid selection${NC}"
            exit 1
        fi
        ;;
    "lambda")
        rollback_lambda_functions
        ;;
    "full")
        full_rollback
        ;;
esac

echo ""
echo -e "${GREEN}🎉 Rollback operation completed!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo -e "${YELLOW}1. Verify the rollback was successful${NC}"
echo -e "${YELLOW}2. Check application functionality${NC}"
echo -e "${YELLOW}3. Review logs for any issues${NC}"
echo -e "${YELLOW}4. Plan next deployment with fixes${NC}"