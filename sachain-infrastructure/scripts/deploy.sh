#!/bin/bash

# Sachain KYC Infrastructure Deployment Script
# Usage: ./scripts/deploy.sh [environment] [options]

set -e

# Default values
ENVIRONMENT=${1:-dev}
DRY_RUN=false
SKIP_TESTS=false
VERBOSE=false
FORCE_DEPLOY=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --skip-tests)
      SKIP_TESTS=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --force)
      FORCE_DEPLOY=true
      shift
      ;;
    --help)
      echo "Usage: $0 [environment] [options]"
      echo ""
      echo "Arguments:"
      echo "  environment    Target environment (dev, staging, prod) [default: dev]"
      echo ""
      echo "Options:"
      echo "  --dry-run      Show what would be deployed without making changes"
      echo "  --skip-tests   Skip running tests before deployment"
      echo "  --verbose      Enable verbose output"
      echo "  --force        Force deployment without confirmation"
      echo "  --help         Show this help message"
      exit 0
      ;;
    *)
      if [[ -z "$ENVIRONMENT" ]]; then
        ENVIRONMENT=$1
      fi
      shift
      ;;
  esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
  echo "❌ Error: Invalid environment '$ENVIRONMENT'. Must be one of: dev, staging, prod"
  exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
  echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
  log_info "Checking prerequisites..."
  
  # Check if AWS CLI is installed and configured
  if ! command -v aws &> /dev/null; then
    log_error "AWS CLI is not installed. Please install it first."
    exit 1
  fi
  
  # Check if CDK is installed
  if ! command -v cdk &> /dev/null; then
    log_error "AWS CDK is not installed. Please install it first."
    exit 1
  fi
  
  # Check if Node.js and npm are installed
  if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
    log_error "Node.js and npm are required. Please install them first."
    exit 1
  fi
  
  # Check AWS credentials
  if ! aws sts get-caller-identity &> /dev/null; then
    log_error "AWS credentials are not configured or invalid."
    exit 1
  fi
  
  log_success "Prerequisites check passed"
}

# Install dependencies
install_dependencies() {
  log_info "Installing dependencies..."
  npm ci
  log_success "Dependencies installed"
}

# Run tests
run_tests() {
  if [[ "$SKIP_TESTS" == "true" ]]; then
    log_warning "Skipping tests as requested"
    return
  fi
  
  log_info "Running tests..."
  npm test
  log_success "All tests passed"
}

# Build the project
build_project() {
  log_info "Building project..."
  npm run build
  log_success "Project built successfully"
}

# Validate CDK app
validate_cdk() {
  log_info "Validating CDK application..."
  
  if [[ "$VERBOSE" == "true" ]]; then
    cdk synth --context environment="$ENVIRONMENT" --verbose
  else
    cdk synth --context environment="$ENVIRONMENT" > /dev/null
  fi
  
  log_success "CDK validation passed"
}

# Show deployment diff
show_diff() {
  log_info "Showing deployment diff for $ENVIRONMENT environment..."
  cdk diff --context environment="$ENVIRONMENT"
}

# Deploy infrastructure
deploy_infrastructure() {
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "DRY RUN: Would deploy to $ENVIRONMENT environment"
    show_diff
    return
  fi
  
  log_info "Deploying to $ENVIRONMENT environment..."
  
  # Confirmation for production
  if [[ "$ENVIRONMENT" == "prod" && "$FORCE_DEPLOY" != "true" ]]; then
    echo ""
    log_warning "You are about to deploy to PRODUCTION environment!"
    read -p "Are you sure you want to continue? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
      log_info "Deployment cancelled"
      exit 0
    fi
  fi
  
  # Deploy all consolidated stacks with appropriate options
  local deploy_cmd="cdk deploy --all --context environment=$ENVIRONMENT"
  
  if [[ "$FORCE_DEPLOY" == "true" ]]; then
    deploy_cmd="$deploy_cmd --require-approval never"
  fi
  
  if [[ "$VERBOSE" == "true" ]]; then
    deploy_cmd="$deploy_cmd --verbose"
  fi
  
  eval $deploy_cmd
  
  log_success "Deployment to $ENVIRONMENT completed successfully"
}

# Post-deployment validation
post_deployment_validation() {
  log_info "Running post-deployment validation..."
  
  # Get stack outputs from consolidated stacks
  local core_stack_name="SachainCoreStack-$ENVIRONMENT"
  local lambda_stack_name="SachainLambdaStack-$ENVIRONMENT"
  local core_outputs=$(aws cloudformation describe-stacks --stack-name "$core_stack_name" --query 'Stacks[0].Outputs' --output json 2>/dev/null || echo "[]")
  local lambda_outputs=$(aws cloudformation describe-stacks --stack-name "$lambda_stack_name" --query 'Stacks[0].Outputs' --output json 2>/dev/null || echo "[]")
  
  if [[ "$core_outputs" == "[]" && "$lambda_outputs" == "[]" ]]; then
    log_warning "Could not retrieve stack outputs for validation"
    return
  fi
  
  # Extract key outputs from consolidated stacks
  local user_pool_id=$(echo "$core_outputs" | jq -r '.[] | select(.OutputKey=="UserPoolId") | .OutputValue')
  local api_url=$(echo "$lambda_outputs" | jq -r '.[] | select(.OutputKey=="KYCUploadApiUrl") | .OutputValue')
  
  # Validate Cognito User Pool
  if [[ "$user_pool_id" != "null" && "$user_pool_id" != "" ]]; then
    if aws cognito-idp describe-user-pool --user-pool-id "$user_pool_id" &> /dev/null; then
      log_success "Cognito User Pool is accessible"
    else
      log_error "Cognito User Pool validation failed"
    fi
  fi
  
  # Validate API Gateway
  if [[ "$api_url" != "null" && "$api_url" != "" ]]; then
    if curl -s -o /dev/null -w "%{http_code}" "$api_url/health" | grep -q "200\|404"; then
      log_success "API Gateway is accessible"
    else
      log_warning "API Gateway health check returned unexpected status"
    fi
  fi
  
  log_success "Post-deployment validation completed"
}

# Generate deployment report
generate_report() {
  log_info "Generating deployment report..."
  
  local report_file="deployment-report-$ENVIRONMENT-$(date +%Y%m%d-%H%M%S).json"
  local stack_names=(
    "SachainCoreStack-$ENVIRONMENT"
    "SachainSecurityStack-$ENVIRONMENT" 
    "SachainLambdaStack-$ENVIRONMENT"
    "SachainMonitoringStack-$ENVIRONMENT"
  )
  
  # Get consolidated stack information
  echo "{\"stacks\": [" > "$report_file"
  local first=true
  for stack_name in "${stack_names[@]}"; do
    if [[ "$first" == "false" ]]; then
      echo "," >> "$report_file"
    fi
    aws cloudformation describe-stacks --stack-name "$stack_name" --output json 2>/dev/null | jq '.Stacks[0]' >> "$report_file" || {
      log_warning "Could not get information for stack: $stack_name"
      continue
    }
    first=false
  done
  echo "]}" >> "$report_file"
  
  log_success "Deployment report saved to $report_file"
}

# Main execution
main() {
  echo ""
  log_info "🚀 Starting Sachain KYC Infrastructure Deployment"
  log_info "Environment: $ENVIRONMENT"
  log_info "Dry Run: $DRY_RUN"
  echo ""
  
  check_prerequisites
  install_dependencies
  run_tests
  build_project
  validate_cdk
  
  if [[ "$DRY_RUN" != "true" ]]; then
    show_diff
    echo ""
  fi
  
  deploy_infrastructure
  
  if [[ "$DRY_RUN" != "true" ]]; then
    post_deployment_validation
    generate_report
  fi
  
  echo ""
  log_success "🎉 Deployment process completed successfully!"
  echo ""
}

# Run main function
main "$@"