#!/bin/bash

# Sachain KYC Infrastructure Validation Script
# Usage: ./scripts/validate-deployment.sh [environment]

set -e

# Default values
ENVIRONMENT=${1:-dev}
VERBOSE=false
SKIP_PERFORMANCE_TESTS=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --verbose)
      VERBOSE=true
      shift
      ;;
    --skip-performance)
      SKIP_PERFORMANCE_TESTS=true
      shift
      ;;
    --help)
      echo "Usage: $0 [environment] [options]"
      echo ""
      echo "Arguments:"
      echo "  environment    Target environment (dev, staging, prod) [default: dev]"
      echo ""
      echo "Options:"
      echo "  --verbose      Enable verbose output"
      echo "  --skip-performance  Skip performance tests"
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

# Stack name
STACK_NAME="SachainKYCStack-$ENVIRONMENT"

# Validation results
VALIDATION_RESULTS=()
FAILED_VALIDATIONS=()

# Add validation result
add_validation_result() {
  local test_name="$1"
  local status="$2"
  local message="$3"
  
  VALIDATION_RESULTS+=("$test_name:$status:$message")
  
  if [[ "$status" == "FAIL" ]]; then
    FAILED_VALIDATIONS+=("$test_name")
  fi
}

# Check if AWS CLI is configured
check_aws_cli() {
  log_info "Checking AWS CLI configuration..."
  
  if ! command -v aws &> /dev/null; then
    add_validation_result "AWS CLI" "FAIL" "AWS CLI is not installed"
    return 1
  fi
  
  if ! aws sts get-caller-identity &> /dev/null; then
    add_validation_result "AWS CLI" "FAIL" "AWS credentials are not configured"
    return 1
  fi
  
  add_validation_result "AWS CLI" "PASS" "AWS CLI is properly configured"
  log_success "AWS CLI is properly configured"
}

# Validate CloudFormation stack
validate_stack() {
  log_info "Validating CloudFormation stack..."
  
  local stack_status=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "NOT_FOUND")
  
  if [[ "$stack_status" == "NOT_FOUND" ]]; then
    add_validation_result "CloudFormation Stack" "FAIL" "Stack $STACK_NAME not found"
    return 1
  fi
  
  if [[ ! "$stack_status" =~ ^(CREATE_COMPLETE|UPDATE_COMPLETE)$ ]]; then
    add_validation_result "CloudFormation Stack" "FAIL" "Stack is in $stack_status state"
    return 1
  fi
  
  add_validation_result "CloudFormation Stack" "PASS" "Stack is in $stack_status state"
  log_success "CloudFormation stack is healthy"
}

# Get stack outputs
get_stack_outputs() {
  log_info "Retrieving stack outputs..."
  
  local outputs=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].Outputs' --output json 2>/dev/null || echo "[]")
  
  if [[ "$outputs" == "[]" ]]; then
    add_validation_result "Stack Outputs" "FAIL" "No stack outputs found"
    return 1
  fi
  
  # Extract key outputs
  USER_POOL_ID=$(echo "$outputs" | jq -r '.[] | select(.OutputKey=="UserPoolId") | .OutputValue')
  USER_POOL_CLIENT_ID=$(echo "$outputs" | jq -r '.[] | select(.OutputKey=="UserPoolClientId") | .OutputValue')
  DYNAMODB_TABLE_NAME=$(echo "$outputs" | jq -r '.[] | select(.OutputKey=="DynamoDBTableName") | .OutputValue')
  S3_BUCKET_NAME=$(echo "$outputs" | jq -r '.[] | select(.OutputKey=="S3BucketName") | .OutputValue')
  EVENT_BUS_NAME=$(echo "$outputs" | jq -r '.[] | select(.OutputKey=="EventBusName") | .OutputValue')
  API_URL=$(echo "$outputs" | jq -r '.[] | select(.OutputKey=="KYCUploadApiUrl") | .OutputValue')
  
  add_validation_result "Stack Outputs" "PASS" "All required outputs found"
  log_success "Stack outputs retrieved successfully"
}

# Validate Cognito User Pool
validate_cognito() {
  log_info "Validating Cognito User Pool..."
  
  if [[ "$USER_POOL_ID" == "null" || -z "$USER_POOL_ID" ]]; then
    add_validation_result "Cognito User Pool" "FAIL" "User Pool ID not found"
    return 1
  fi
  
  local user_pool_status=$(aws cognito-idp describe-user-pool --user-pool-id "$USER_POOL_ID" --query 'UserPool.Status' --output text 2>/dev/null || echo "ERROR")
  
  if [[ "$user_pool_status" == "ERROR" ]]; then
    add_validation_result "Cognito User Pool" "FAIL" "Cannot access User Pool"
    return 1
  fi
  
  # Validate User Pool Client
  if [[ "$USER_POOL_CLIENT_ID" == "null" || -z "$USER_POOL_CLIENT_ID" ]]; then
    add_validation_result "Cognito User Pool Client" "FAIL" "User Pool Client ID not found"
    return 1
  fi
  
  local client_status=$(aws cognito-idp describe-user-pool-client --user-pool-id "$USER_POOL_ID" --client-id "$USER_POOL_CLIENT_ID" --query 'UserPoolClient.ClientId' --output text 2>/dev/null || echo "ERROR")
  
  if [[ "$client_status" == "ERROR" ]]; then
    add_validation_result "Cognito User Pool Client" "FAIL" "Cannot access User Pool Client"
    return 1
  fi
  
  add_validation_result "Cognito User Pool" "PASS" "User Pool and Client are accessible"
  log_success "Cognito User Pool validation passed"
}

# Validate DynamoDB table
validate_dynamodb() {
  log_info "Validating DynamoDB table..."
  
  if [[ "$DYNAMODB_TABLE_NAME" == "null" || -z "$DYNAMODB_TABLE_NAME" ]]; then
    add_validation_result "DynamoDB Table" "FAIL" "Table name not found"
    return 1
  fi
  
  local table_status=$(aws dynamodb describe-table --table-name "$DYNAMODB_TABLE_NAME" --query 'Table.TableStatus' --output text 2>/dev/null || echo "ERROR")
  
  if [[ "$table_status" == "ERROR" ]]; then
    add_validation_result "DynamoDB Table" "FAIL" "Cannot access table"
    return 1
  fi
  
  if [[ "$table_status" != "ACTIVE" ]]; then
    add_validation_result "DynamoDB Table" "FAIL" "Table is in $table_status state"
    return 1
  fi
  
  # Check for GSIs
  local gsi_count=$(aws dynamodb describe-table --table-name "$DYNAMODB_TABLE_NAME" --query 'length(Table.GlobalSecondaryIndexes)' --output text 2>/dev/null || echo "0")
  
  if [[ "$gsi_count" -lt 2 ]]; then
    add_validation_result "DynamoDB GSIs" "FAIL" "Expected at least 2 GSIs, found $gsi_count"
  else
    add_validation_result "DynamoDB GSIs" "PASS" "Found $gsi_count GSIs"
  fi
  
  add_validation_result "DynamoDB Table" "PASS" "Table is active and accessible"
  log_success "DynamoDB table validation passed"
}

# Validate S3 bucket
validate_s3() {
  log_info "Validating S3 bucket..."
  
  if [[ "$S3_BUCKET_NAME" == "null" || -z "$S3_BUCKET_NAME" ]]; then
    add_validation_result "S3 Bucket" "FAIL" "Bucket name not found"
    return 1
  fi
  
  if ! aws s3api head-bucket --bucket "$S3_BUCKET_NAME" 2>/dev/null; then
    add_validation_result "S3 Bucket" "FAIL" "Cannot access bucket"
    return 1
  fi
  
  # Check encryption
  local encryption_status=$(aws s3api get-bucket-encryption --bucket "$S3_BUCKET_NAME" --query 'ServerSideEncryptionConfiguration.Rules[0].ApplyServerSideEncryptionByDefault.SSEAlgorithm' --output text 2>/dev/null || echo "NONE")
  
  if [[ "$encryption_status" == "NONE" ]]; then
    add_validation_result "S3 Encryption" "FAIL" "Bucket encryption not configured"
  else
    add_validation_result "S3 Encryption" "PASS" "Bucket encrypted with $encryption_status"
  fi
  
  add_validation_result "S3 Bucket" "PASS" "Bucket is accessible"
  log_success "S3 bucket validation passed"
}

# Validate Lambda functions
validate_lambda() {
  log_info "Validating Lambda functions..."
  
  local expected_functions=("PostAuth" "KYCUpload" "AdminReview" "UserNotification")
  local found_functions=0
  
  for func in "${expected_functions[@]}"; do
    local function_name="sachain-$ENVIRONMENT-$func"
    local function_status=$(aws lambda get-function --function-name "$function_name" --query 'Configuration.State' --output text 2>/dev/null || echo "ERROR")
    
    if [[ "$function_status" == "ERROR" ]]; then
      add_validation_result "Lambda $func" "FAIL" "Function not found or not accessible"
    elif [[ "$function_status" != "Active" ]]; then
      add_validation_result "Lambda $func" "FAIL" "Function is in $function_status state"
    else
      add_validation_result "Lambda $func" "PASS" "Function is active"
      ((found_functions++))
    fi
  done
  
  if [[ $found_functions -eq ${#expected_functions[@]} ]]; then
    log_success "All Lambda functions validation passed"
  else
    log_warning "Only $found_functions out of ${#expected_functions[@]} Lambda functions are healthy"
  fi
}

# Validate EventBridge
validate_eventbridge() {
  log_info "Validating EventBridge..."
  
  if [[ "$EVENT_BUS_NAME" == "null" || -z "$EVENT_BUS_NAME" ]]; then
    add_validation_result "EventBridge Bus" "FAIL" "Event bus name not found"
    return 1
  fi
  
  local bus_status=$(aws events describe-event-bus --name "$EVENT_BUS_NAME" --query 'State' --output text 2>/dev/null || echo "ERROR")
  
  if [[ "$bus_status" == "ERROR" ]]; then
    add_validation_result "EventBridge Bus" "FAIL" "Cannot access event bus"
    return 1
  fi
  
  # Check for rules
  local rules_count=$(aws events list-rules --event-bus-name "$EVENT_BUS_NAME" --query 'length(Rules)' --output text 2>/dev/null || echo "0")
  
  if [[ "$rules_count" -eq 0 ]]; then
    add_validation_result "EventBridge Rules" "FAIL" "No rules found"
  else
    add_validation_result "EventBridge Rules" "PASS" "Found $rules_count rules"
  fi
  
  add_validation_result "EventBridge Bus" "PASS" "Event bus is accessible"
  log_success "EventBridge validation passed"
}

# Validate API Gateway
validate_api_gateway() {
  log_info "Validating API Gateway..."
  
  if [[ "$API_URL" == "null" || -z "$API_URL" ]]; then
    add_validation_result "API Gateway" "FAIL" "API URL not found"
    return 1
  fi
  
  # Test API health endpoint
  local http_status=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" || echo "000")
  
  if [[ "$http_status" -ge 500 ]]; then
    add_validation_result "API Gateway" "FAIL" "API returned $http_status status"
    return 1
  elif [[ "$http_status" == "000" ]]; then
    add_validation_result "API Gateway" "FAIL" "Cannot reach API endpoint"
    return 1
  else
    add_validation_result "API Gateway" "PASS" "API returned $http_status status"
  fi
  
  log_success "API Gateway validation passed"
}

# Validate monitoring
validate_monitoring() {
  log_info "Validating monitoring setup..."
  
  # Check for CloudWatch alarms
  local alarms_count=$(aws cloudwatch describe-alarms --alarm-name-prefix "sachain-$ENVIRONMENT" --query 'length(MetricAlarms)' --output text 2>/dev/null || echo "0")
  
  if [[ "$alarms_count" -eq 0 ]]; then
    add_validation_result "CloudWatch Alarms" "FAIL" "No alarms found"
  else
    add_validation_result "CloudWatch Alarms" "PASS" "Found $alarms_count alarms"
  fi
  
  # Check for log groups
  local log_groups_count=$(aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/sachain-$ENVIRONMENT" --query 'length(logGroups)' --output text 2>/dev/null || echo "0")
  
  if [[ "$log_groups_count" -eq 0 ]]; then
    add_validation_result "CloudWatch Logs" "FAIL" "No log groups found"
  else
    add_validation_result "CloudWatch Logs" "PASS" "Found $log_groups_count log groups"
  fi
  
  log_success "Monitoring validation completed"
}

# Run performance tests
run_performance_tests() {
  if [[ "$SKIP_PERFORMANCE_TESTS" == "true" ]]; then
    log_warning "Skipping performance tests as requested"
    return
  fi
  
  log_info "Running performance tests..."
  
  # Test API response time
  if [[ "$API_URL" != "null" && -n "$API_URL" ]]; then
    local response_time=$(curl -s -o /dev/null -w "%{time_total}" "$API_URL/health" || echo "999")
    local response_time_ms=$(echo "$response_time * 1000" | bc -l | cut -d. -f1)
    
    if [[ "$response_time_ms" -gt 5000 ]]; then
      add_validation_result "API Response Time" "FAIL" "Response time ${response_time_ms}ms exceeds 5000ms"
    else
      add_validation_result "API Response Time" "PASS" "Response time ${response_time_ms}ms"
    fi
  fi
  
  log_success "Performance tests completed"
}

# Generate validation report
generate_report() {
  log_info "Generating validation report..."
  
  local report_file="validation-report-$ENVIRONMENT-$(date +%Y%m%d-%H%M%S).json"
  local total_tests=${#VALIDATION_RESULTS[@]}
  local failed_tests=${#FAILED_VALIDATIONS[@]}
  local passed_tests=$((total_tests - failed_tests))
  
  # Create JSON report
  cat > "$report_file" << EOF
{
  "environment": "$ENVIRONMENT",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "stack_name": "$STACK_NAME",
  "summary": {
    "total_tests": $total_tests,
    "passed_tests": $passed_tests,
    "failed_tests": $failed_tests,
    "success_rate": $(echo "scale=2; $passed_tests * 100 / $total_tests" | bc -l)
  },
  "results": [
EOF

  local first=true
  for result in "${VALIDATION_RESULTS[@]}"; do
    IFS=':' read -r test_name status message <<< "$result"
    
    if [[ "$first" == "true" ]]; then
      first=false
    else
      echo "," >> "$report_file"
    fi
    
    cat >> "$report_file" << EOF
    {
      "test": "$test_name",
      "status": "$status",
      "message": "$message"
    }
EOF
  done

  cat >> "$report_file" << EOF
  ]
}
EOF

  log_success "Validation report saved to $report_file"
}

# Print summary
print_summary() {
  echo ""
  log_info "🔍 Validation Summary for $ENVIRONMENT environment"
  echo ""
  
  local total_tests=${#VALIDATION_RESULTS[@]}
  local failed_tests=${#FAILED_VALIDATIONS[@]}
  local passed_tests=$((total_tests - failed_tests))
  
  echo "Total Tests: $total_tests"
  echo "Passed: $passed_tests"
  echo "Failed: $failed_tests"
  
  if [[ $failed_tests -eq 0 ]]; then
    echo ""
    log_success "🎉 All validations passed! System is healthy."
  else
    echo ""
    log_error "❌ $failed_tests validation(s) failed:"
    for failed_test in "${FAILED_VALIDATIONS[@]}"; do
      echo "  - $failed_test"
    done
    echo ""
    log_error "Please review the issues above before proceeding."
  fi
  
  echo ""
}

# Main execution
main() {
  echo ""
  log_info "🔍 Starting Sachain KYC Infrastructure Validation"
  log_info "Environment: $ENVIRONMENT"
  log_info "Stack: $STACK_NAME"
  echo ""
  
  # Run validations
  check_aws_cli
  validate_stack
  get_stack_outputs
  validate_cognito
  validate_dynamodb
  validate_s3
  validate_lambda
  validate_eventbridge
  validate_api_gateway
  validate_monitoring
  run_performance_tests
  
  # Generate report and summary
  generate_report
  print_summary
  
  # Exit with error code if any validations failed
  if [[ ${#FAILED_VALIDATIONS[@]} -gt 0 ]]; then
    exit 1
  fi
}

# Run main function
main "$@"