#!/bin/bash

# Deployment script with validation and rollback capabilities
# Usage: ./deploy-with-validation.sh <stage> [--skip-validation] [--auto-rollback]

set -e

STAGE=${1:-dev}
SKIP_VALIDATION=${2:-false}
AUTO_ROLLBACK=${3:-false}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Cleanup function
cleanup() {
    if [ -f "/tmp/deployment.lock" ]; then
        rm -f /tmp/deployment.lock
    fi
}

# Set trap for cleanup
trap cleanup EXIT

# Check if deployment is already in progress
if [ -f "/tmp/deployment.lock" ]; then
    log_error "Deployment already in progress. If this is incorrect, remove /tmp/deployment.lock"
    exit 1
fi

# Create deployment lock
touch /tmp/deployment.lock

log_info "Starting deployment to $STAGE environment..."

# Step 1: Pre-deployment validation
log_info "Step 1: Pre-deployment validation"

# Check if required environment variables are set
if [ -z "$AWS_REGION" ]; then
    log_error "AWS_REGION environment variable not set"
    exit 1
fi

# Validate AWS credentials
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    log_error "AWS credentials not configured or invalid"
    exit 1
fi

# Check if CDK is available
if ! command -v cdk &> /dev/null; then
    log_error "AWS CDK not installed. Please install with: npm install -g aws-cdk"
    exit 1
fi

log_success "Pre-deployment validation passed"

# Step 2: Build and test
log_info "Step 2: Building and testing application"

cd "$PROJECT_ROOT"

# Install dependencies
log_info "Installing dependencies..."
npm ci

# Run tests
log_info "Running tests..."
npm test

# Build TypeScript
log_info "Building TypeScript..."
npm run build

log_success "Build and test completed"

# Step 3: Deploy infrastructure
log_info "Step 3: Deploying infrastructure"

cd "$PROJECT_ROOT/../sachain-infrastructure"

# Bootstrap CDK if needed
log_info "Checking CDK bootstrap..."
if ! cdk bootstrap --profile default 2>/dev/null; then
    log_warning "CDK bootstrap may be required"
fi

# Deploy with CDK
log_info "Deploying CDK stack..."
if ! cdk deploy --require-approval never --context stage="$STAGE"; then
    log_error "CDK deployment failed"
    exit 1
fi

log_success "Infrastructure deployment completed"

# Step 4: Deploy Lambda functions
log_info "Step 4: Deploying Lambda functions"

cd "$PROJECT_ROOT"

# Package and deploy each Lambda function
LAMBDA_FUNCTIONS=("project-creation" "project-query" "project-management" "stock-minting" "health-check")

for func in "${LAMBDA_FUNCTIONS[@]}"; do
    log_info "Deploying $func Lambda function..."
    
    # Create deployment package
    zip_file="/tmp/${func}-deployment.zip"
    
    # Create zip with built code
    cd dist/lambdas/$func
    zip -r "$zip_file" . > /dev/null
    cd "$PROJECT_ROOT"
    
    # Update Lambda function
    aws lambda update-function-code \
        --function-name "sachain-${STAGE}-${func}" \
        --zip-file "fileb://${zip_file}" \
        --publish > /dev/null
    
    # Clean up zip file
    rm -f "$zip_file"
    
    log_success "$func Lambda function deployed"
done

# Step 5: Post-deployment validation
if [ "$SKIP_VALIDATION" != "--skip-validation" ]; then
    log_info "Step 5: Post-deployment validation"
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 30
    
    # Run deployment validation
    export STAGE="$STAGE"
    export API_BASE_URL="https://$(aws apigateway get-rest-apis --query "items[?name=='sachain-${STAGE}'].id" --output text).execute-api.${AWS_REGION}.amazonaws.com/${STAGE}"
    
    cd "$PROJECT_ROOT"
    
    if ! npx ts-node scripts/deployment-validation.ts; then
        log_error "Post-deployment validation failed"
        
        if [ "$AUTO_ROLLBACK" == "--auto-rollback" ]; then
            log_warning "Auto-rollback enabled, initiating rollback..."
            npx ts-node scripts/rollback-procedures.ts auto
            exit 1
        else
            log_error "Deployment validation failed. Consider manual rollback."
            exit 1
        fi
    fi
    
    log_success "Post-deployment validation passed"
else
    log_warning "Skipping post-deployment validation"
fi

# Step 6: Update deployment metadata
log_info "Step 6: Updating deployment metadata"

DEPLOYMENT_ID="deploy-$(date +%Y%m%d-%H%M%S)"
COMMIT_HASH=$(git rev-parse HEAD 2>/dev/null || echo "unknown")

# Store deployment information
cat > "/tmp/deployment-${STAGE}.json" << EOF
{
    "deploymentId": "$DEPLOYMENT_ID",
    "stage": "$STAGE",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "commitHash": "$COMMIT_HASH",
    "deployer": "$(whoami)",
    "status": "completed"
}
EOF

# Upload deployment metadata to S3 (if bucket exists)
if aws s3 ls "s3://sachain-deployments-${STAGE}" > /dev/null 2>&1; then
    aws s3 cp "/tmp/deployment-${STAGE}.json" "s3://sachain-deployments-${STAGE}/deployments/${DEPLOYMENT_ID}.json"
    log_info "Deployment metadata uploaded to S3"
fi

log_success "Deployment completed successfully!"
log_info "Deployment ID: $DEPLOYMENT_ID"
log_info "Stage: $STAGE"
log_info "API URL: ${API_BASE_URL:-'Not available'}"

# Step 7: Post-deployment notifications
log_info "Step 7: Sending notifications"

# Send Slack notification (if webhook configured)
if [ -n "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"✅ Sachain deployment to $STAGE completed successfully\\nDeployment ID: $DEPLOYMENT_ID\\nCommit: $COMMIT_HASH\"}" \
        "$SLACK_WEBHOOK_URL" > /dev/null 2>&1 || log_warning "Failed to send Slack notification"
fi

log_success "Deployment process completed!"

# Cleanup
cleanup