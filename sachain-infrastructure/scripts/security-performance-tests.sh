#!/bin/bash

# Sachain KYC Security and Performance Testing Script
# Usage: ./scripts/security-performance-tests.sh [environment]

set -e

# Default values
ENVIRONMENT=${1:-dev}
VERBOSE=false
SKIP_SECURITY_TESTS=false
SKIP_PERFORMANCE_TESTS=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --verbose)
      VERBOSE=true
      shift
      ;;
    --skip-security)
      SKIP_SECURITY_TESTS=true
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
      echo "  --skip-security    Skip security tests"
      echo "  --skip-performance Skip performance tests"
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

# Test results
SECURITY_RESULTS=()
PERFORMANCE_RESULTS=()
FAILED_TESTS=()

# Add test result
add_test_result() {
  local category="$1"
  local test_name="$2"
  local status="$3"
  local message="$4"
  
  if [[ "$category" == "SECURITY" ]]; then
    SECURITY_RESULTS+=("$test_name:$status:$message")
  else
    PERFORMANCE_RESULTS+=("$test_name:$status:$message")
  fi
  
  if [[ "$status" == "FAIL" ]]; then
    FAILED_TESTS+=("$test_name")
  fi
}

# Get stack outputs
get_stack_outputs() {
  log_info "Retrieving stack outputs..."
  
  local outputs=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].Outputs' --output json 2>/dev/null || echo "[]")
  
  if [[ "$outputs" == "[]" ]]; then
    log_error "No stack outputs found"
    exit 1
  fi
  
  # Extract key outputs
  USER_POOL_ID=$(echo "$outputs" | jq -r '.[] | select(.OutputKey=="UserPoolId") | .OutputValue')
  S3_BUCKET_NAME=$(echo "$outputs" | jq -r '.[] | select(.OutputKey=="S3BucketName") | .OutputValue')
  API_URL=$(echo "$outputs" | jq -r '.[] | select(.OutputKey=="KYCUploadApiUrl") | .OutputValue')
  DYNAMODB_TABLE_NAME=$(echo "$outputs" | jq -r '.[] | select(.OutputKey=="DynamoDBTableName") | .OutputValue')
  
  log_success "Stack outputs retrieved successfully"
}

# Security Tests
run_security_tests() {
  if [[ "$SKIP_SECURITY_TESTS" == "true" ]]; then
    log_warning "Skipping security tests as requested"
    return
  fi
  
  log_info "🔒 Running security tests..."
  
  # Test 1: S3 Bucket Security
  test_s3_security
  
  # Test 2: API Gateway Security
  test_api_security
  
  # Test 3: IAM Roles and Policies
  test_iam_security
  
  # Test 4: Encryption at Rest
  test_encryption_at_rest
  
  # Test 5: Network Security
  test_network_security
  
  log_success "Security tests completed"
}

# Test S3 bucket security
test_s3_security() {
  log_info "Testing S3 bucket security..."
  
  if [[ "$S3_BUCKET_NAME" == "null" || -z "$S3_BUCKET_NAME" ]]; then
    add_test_result "SECURITY" "S3 Bucket Security" "FAIL" "Bucket name not found"
    return
  fi
  
  # Check public access block
  local public_access=$(aws s3api get-public-access-block --bucket "$S3_BUCKET_NAME" --query 'PublicAccessBlockConfiguration' --output json 2>/dev/null || echo "{}")
  
  local block_public_acls=$(echo "$public_access" | jq -r '.BlockPublicAcls // false')
  local block_public_policy=$(echo "$public_access" | jq -r '.BlockPublicPolicy // false')
  local ignore_public_acls=$(echo "$public_access" | jq -r '.IgnorePublicAcls // false')
  local restrict_public_buckets=$(echo "$public_access" | jq -r '.RestrictPublicBuckets // false')
  
  if [[ "$block_public_acls" == "true" && "$block_public_policy" == "true" && "$ignore_public_acls" == "true" && "$restrict_public_buckets" == "true" ]]; then
    add_test_result "SECURITY" "S3 Public Access Block" "PASS" "All public access blocked"
  else
    add_test_result "SECURITY" "S3 Public Access Block" "FAIL" "Public access not fully blocked"
  fi
  
  # Check bucket encryption
  local encryption=$(aws s3api get-bucket-encryption --bucket "$S3_BUCKET_NAME" --query 'ServerSideEncryptionConfiguration.Rules[0].ApplyServerSideEncryptionByDefault.SSEAlgorithm' --output text 2>/dev/null || echo "NONE")
  
  if [[ "$encryption" == "aws:kms" ]]; then
    add_test_result "SECURITY" "S3 Encryption" "PASS" "KMS encryption enabled"
  elif [[ "$encryption" == "AES256" ]]; then
    add_test_result "SECURITY" "S3 Encryption" "PASS" "AES256 encryption enabled"
  else
    add_test_result "SECURITY" "S3 Encryption" "FAIL" "No encryption configured"
  fi
  
  # Check bucket versioning
  local versioning=$(aws s3api get-bucket-versioning --bucket "$S3_BUCKET_NAME" --query 'Status' --output text 2>/dev/null || echo "Disabled")
  
  if [[ "$versioning" == "Enabled" ]]; then
    add_test_result "SECURITY" "S3 Versioning" "PASS" "Versioning enabled"
  else
    add_test_result "SECURITY" "S3 Versioning" "FAIL" "Versioning not enabled"
  fi
}

# Test API Gateway security
test_api_security() {
  log_info "Testing API Gateway security..."
  
  if [[ "$API_URL" == "null" || -z "$API_URL" ]]; then
    add_test_result "SECURITY" "API Gateway Security" "FAIL" "API URL not found"
    return
  fi
  
  # Test HTTPS enforcement
  local http_url=$(echo "$API_URL" | sed 's/https:/http:/')
  local http_status=$(curl -s -o /dev/null -w "%{http_code}" "$http_url/health" 2>/dev/null || echo "000")
  
  if [[ "$http_status" == "000" || "$http_status" -ge 400 ]]; then
    add_test_result "SECURITY" "HTTPS Enforcement" "PASS" "HTTP requests blocked or redirected"
  else
    add_test_result "SECURITY" "HTTPS Enforcement" "FAIL" "HTTP requests allowed"
  fi
  
  # Test CORS headers
  local cors_headers=$(curl -s -I -X OPTIONS "$API_URL/health" | grep -i "access-control" | wc -l)
  
  if [[ "$cors_headers" -gt 0 ]]; then
    add_test_result "SECURITY" "CORS Configuration" "PASS" "CORS headers present"
  else
    add_test_result "SECURITY" "CORS Configuration" "FAIL" "CORS headers missing"
  fi
  
  # Test for security headers
  local security_headers=$(curl -s -I "$API_URL/health" | grep -E "(X-Frame-Options|X-Content-Type-Options|Strict-Transport-Security)" | wc -l)
  
  if [[ "$security_headers" -gt 0 ]]; then
    add_test_result "SECURITY" "Security Headers" "PASS" "Security headers present"
  else
    add_test_result "SECURITY" "Security Headers" "FAIL" "Security headers missing"
  fi
}

# Test IAM security
test_iam_security() {
  log_info "Testing IAM roles and policies..."
  
  # Get all roles for this stack
  local roles=$(aws iam list-roles --query "Roles[?contains(RoleName, 'SachainKYCStack-$ENVIRONMENT')].RoleName" --output text)
  
  if [[ -z "$roles" ]]; then
    add_test_result "SECURITY" "IAM Roles" "FAIL" "No IAM roles found for stack"
    return
  fi
  
  local role_count=0
  local secure_roles=0
  
  for role in $roles; do
    ((role_count++))
    
    # Check if role has inline policies (should be avoided)
    local inline_policies=$(aws iam list-role-policies --role-name "$role" --query 'PolicyNames' --output text)
    
    # Check attached managed policies
    local managed_policies=$(aws iam list-attached-role-policies --role-name "$role" --query 'AttachedPolicies[].PolicyName' --output text)
    
    if [[ -z "$inline_policies" && -n "$managed_policies" ]]; then
      ((secure_roles++))
    fi
  done
  
  if [[ $secure_roles -eq $role_count ]]; then
    add_test_result "SECURITY" "IAM Policy Management" "PASS" "All roles use managed policies"
  else
    add_test_result "SECURITY" "IAM Policy Management" "FAIL" "Some roles have inline policies"
  fi
  
  add_test_result "SECURITY" "IAM Roles Count" "PASS" "Found $role_count IAM roles"
}

# Test encryption at rest
test_encryption_at_rest() {
  log_info "Testing encryption at rest..."
  
  # Test DynamoDB encryption
  if [[ "$DYNAMODB_TABLE_NAME" != "null" && -n "$DYNAMODB_TABLE_NAME" ]]; then
    local dynamodb_encryption=$(aws dynamodb describe-table --table-name "$DYNAMODB_TABLE_NAME" --query 'Table.SSEDescription.Status' --output text 2>/dev/null || echo "DISABLED")
    
    if [[ "$dynamodb_encryption" == "ENABLED" ]]; then
      add_test_result "SECURITY" "DynamoDB Encryption" "PASS" "Encryption at rest enabled"
    else
      add_test_result "SECURITY" "DynamoDB Encryption" "FAIL" "Encryption at rest not enabled"
    fi
  fi
  
  # Test Lambda environment variable encryption
  local lambda_functions=$(aws lambda list-functions --query "Functions[?contains(FunctionName, 'sachain-$ENVIRONMENT')].FunctionName" --output text)
  
  local encrypted_functions=0
  local total_functions=0
  
  for func in $lambda_functions; do
    ((total_functions++))
    local kms_key=$(aws lambda get-function --function-name "$func" --query 'Configuration.KMSKeyArn' --output text 2>/dev/null || echo "null")
    
    if [[ "$kms_key" != "null" && -n "$kms_key" ]]; then
      ((encrypted_functions++))
    fi
  done
  
  if [[ $total_functions -gt 0 ]]; then
    if [[ $encrypted_functions -eq $total_functions ]]; then
      add_test_result "SECURITY" "Lambda Encryption" "PASS" "All Lambda functions use KMS encryption"
    else
      add_test_result "SECURITY" "Lambda Encryption" "FAIL" "Some Lambda functions don't use KMS encryption"
    fi
  fi
}

# Test network security
test_network_security() {
  log_info "Testing network security..."
  
  # Check if Lambda functions are in VPC (for production)
  if [[ "$ENVIRONMENT" == "prod" ]]; then
    local lambda_functions=$(aws lambda list-functions --query "Functions[?contains(FunctionName, 'sachain-$ENVIRONMENT')].FunctionName" --output text)
    
    local vpc_functions=0
    local total_functions=0
    
    for func in $lambda_functions; do
      ((total_functions++))
      local vpc_config=$(aws lambda get-function --function-name "$func" --query 'Configuration.VpcConfig.VpcId' --output text 2>/dev/null || echo "null")
      
      if [[ "$vpc_config" != "null" && -n "$vpc_config" ]]; then
        ((vpc_functions++))
      fi
    done
    
    if [[ $total_functions -gt 0 ]]; then
      if [[ $vpc_functions -eq $total_functions ]]; then
        add_test_result "SECURITY" "Lambda VPC Configuration" "PASS" "All Lambda functions in VPC"
      else
        add_test_result "SECURITY" "Lambda VPC Configuration" "FAIL" "Some Lambda functions not in VPC"
      fi
    fi
  else
    add_test_result "SECURITY" "Lambda VPC Configuration" "PASS" "VPC not required for $ENVIRONMENT"
  fi
}

# Performance Tests
run_performance_tests() {
  if [[ "$SKIP_PERFORMANCE_TESTS" == "true" ]]; then
    log_warning "Skipping performance tests as requested"
    return
  fi
  
  log_info "⚡ Running performance tests..."
  
  # Test 1: API Response Time
  test_api_performance
  
  # Test 2: Lambda Cold Start Performance
  test_lambda_performance
  
  # Test 3: DynamoDB Performance
  test_dynamodb_performance
  
  # Test 4: Load Testing
  test_load_performance
  
  log_success "Performance tests completed"
}

# Test API performance
test_api_performance() {
  log_info "Testing API performance..."
  
  if [[ "$API_URL" == "null" || -z "$API_URL" ]]; then
    add_test_result "PERFORMANCE" "API Performance" "FAIL" "API URL not found"
    return
  fi
  
  # Test response time
  local total_time=0
  local successful_requests=0
  local failed_requests=0
  
  for i in {1..10}; do
    local start_time=$(date +%s%N)
    local status_code=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" 2>/dev/null || echo "000")
    local end_time=$(date +%s%N)
    
    local response_time=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
    
    if [[ "$status_code" -ge 200 && "$status_code" -lt 400 ]]; then
      ((successful_requests++))
      total_time=$((total_time + response_time))
    else
      ((failed_requests++))
    fi
  done
  
  if [[ $successful_requests -gt 0 ]]; then
    local avg_response_time=$((total_time / successful_requests))
    
    # Set thresholds based on environment
    local threshold=5000 # 5 seconds default
    if [[ "$ENVIRONMENT" == "prod" ]]; then
      threshold=2000 # 2 seconds for production
    elif [[ "$ENVIRONMENT" == "staging" ]]; then
      threshold=3000 # 3 seconds for staging
    fi
    
    if [[ $avg_response_time -le $threshold ]]; then
      add_test_result "PERFORMANCE" "API Response Time" "PASS" "Average response time: ${avg_response_time}ms"
    else
      add_test_result "PERFORMANCE" "API Response Time" "FAIL" "Average response time: ${avg_response_time}ms exceeds ${threshold}ms"
    fi
    
    # Test success rate
    local success_rate=$((successful_requests * 100 / 10))
    if [[ $success_rate -ge 95 ]]; then
      add_test_result "PERFORMANCE" "API Success Rate" "PASS" "Success rate: ${success_rate}%"
    else
      add_test_result "PERFORMANCE" "API Success Rate" "FAIL" "Success rate: ${success_rate}% below 95%"
    fi
  else
    add_test_result "PERFORMANCE" "API Performance" "FAIL" "All requests failed"
  fi
}

# Test Lambda performance
test_lambda_performance() {
  log_info "Testing Lambda performance..."
  
  local lambda_functions=$(aws lambda list-functions --query "Functions[?contains(FunctionName, 'sachain-$ENVIRONMENT')].FunctionName" --output text)
  
  for func in $lambda_functions; do
    # Get function configuration
    local memory_size=$(aws lambda get-function --function-name "$func" --query 'Configuration.MemorySize' --output text 2>/dev/null || echo "0")
    local timeout=$(aws lambda get-function --function-name "$func" --query 'Configuration.Timeout' --output text 2>/dev/null || echo "0")
    
    # Check memory allocation
    local min_memory=256
    if [[ "$ENVIRONMENT" == "prod" ]]; then
      min_memory=512
    fi
    
    if [[ $memory_size -ge $min_memory ]]; then
      add_test_result "PERFORMANCE" "Lambda Memory ($func)" "PASS" "Memory: ${memory_size}MB"
    else
      add_test_result "PERFORMANCE" "Lambda Memory ($func)" "FAIL" "Memory: ${memory_size}MB below ${min_memory}MB"
    fi
    
    # Check timeout configuration
    if [[ $timeout -ge 30 && $timeout -le 300 ]]; then
      add_test_result "PERFORMANCE" "Lambda Timeout ($func)" "PASS" "Timeout: ${timeout}s"
    else
      add_test_result "PERFORMANCE" "Lambda Timeout ($func)" "FAIL" "Timeout: ${timeout}s not optimal"
    fi
  done
}

# Test DynamoDB performance
test_dynamodb_performance() {
  log_info "Testing DynamoDB performance..."
  
  if [[ "$DYNAMODB_TABLE_NAME" == "null" || -z "$DYNAMODB_TABLE_NAME" ]]; then
    add_test_result "PERFORMANCE" "DynamoDB Performance" "FAIL" "Table name not found"
    return
  fi
  
  # Check billing mode
  local billing_mode=$(aws dynamodb describe-table --table-name "$DYNAMODB_TABLE_NAME" --query 'Table.BillingModeSummary.BillingMode' --output text 2>/dev/null || echo "UNKNOWN")
  
  if [[ "$billing_mode" == "PAY_PER_REQUEST" ]]; then
    add_test_result "PERFORMANCE" "DynamoDB Billing Mode" "PASS" "On-demand billing enabled"
  else
    add_test_result "PERFORMANCE" "DynamoDB Billing Mode" "FAIL" "Provisioned billing may cause throttling"
  fi
  
  # Check table status
  local table_status=$(aws dynamodb describe-table --table-name "$DYNAMODB_TABLE_NAME" --query 'Table.TableStatus' --output text 2>/dev/null || echo "UNKNOWN")
  
  if [[ "$table_status" == "ACTIVE" ]]; then
    add_test_result "PERFORMANCE" "DynamoDB Status" "PASS" "Table is active"
  else
    add_test_result "PERFORMANCE" "DynamoDB Status" "FAIL" "Table status: $table_status"
  fi
}

# Test load performance
test_load_performance() {
  log_info "Testing load performance..."
  
  if [[ "$API_URL" == "null" || -z "$API_URL" ]]; then
    add_test_result "PERFORMANCE" "Load Performance" "FAIL" "API URL not found"
    return
  fi
  
  # Simple concurrent request test
  local concurrent_requests=5
  local pids=()
  local results_file="/tmp/load_test_results_$$"
  
  # Start concurrent requests
  for i in $(seq 1 $concurrent_requests); do
    (
      local start_time=$(date +%s%N)
      local status_code=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" 2>/dev/null || echo "000")
      local end_time=$(date +%s%N)
      local response_time=$(( (end_time - start_time) / 1000000 ))
      echo "$status_code:$response_time" >> "$results_file"
    ) &
    pids+=($!)
  done
  
  # Wait for all requests to complete
  for pid in "${pids[@]}"; do
    wait $pid
  done
  
  # Analyze results
  if [[ -f "$results_file" ]]; then
    local successful_concurrent=0
    local total_concurrent_time=0
    
    while IFS=':' read -r status_code response_time; do
      if [[ "$status_code" -ge 200 && "$status_code" -lt 400 ]]; then
        ((successful_concurrent++))
        total_concurrent_time=$((total_concurrent_time + response_time))
      fi
    done < "$results_file"
    
    if [[ $successful_concurrent -eq $concurrent_requests ]]; then
      local avg_concurrent_time=$((total_concurrent_time / successful_concurrent))
      add_test_result "PERFORMANCE" "Concurrent Requests" "PASS" "All $concurrent_requests requests succeeded, avg: ${avg_concurrent_time}ms"
    else
      add_test_result "PERFORMANCE" "Concurrent Requests" "FAIL" "Only $successful_concurrent out of $concurrent_requests requests succeeded"
    fi
    
    rm -f "$results_file"
  else
    add_test_result "PERFORMANCE" "Concurrent Requests" "FAIL" "Could not run concurrent requests test"
  fi
}

# Generate comprehensive report
generate_report() {
  log_info "Generating comprehensive test report..."
  
  local report_file="security-performance-report-$ENVIRONMENT-$(date +%Y%m%d-%H%M%S).json"
  local total_security_tests=${#SECURITY_RESULTS[@]}
  local total_performance_tests=${#PERFORMANCE_RESULTS[@]}
  local total_tests=$((total_security_tests + total_performance_tests))
  local failed_tests=${#FAILED_TESTS[@]}
  local passed_tests=$((total_tests - failed_tests))
  
  # Create JSON report
  cat > "$report_file" << EOF
{
  "environment": "$ENVIRONMENT",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "stack_name": "$STACK_NAME",
  "summary": {
    "total_tests": $total_tests,
    "security_tests": $total_security_tests,
    "performance_tests": $total_performance_tests,
    "passed_tests": $passed_tests,
    "failed_tests": $failed_tests,
    "success_rate": $(echo "scale=2; $passed_tests * 100 / $total_tests" | bc -l)
  },
  "security_results": [
EOF

  # Add security results
  local first=true
  for result in "${SECURITY_RESULTS[@]}"; do
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
  ],
  "performance_results": [
EOF

  # Add performance results
  first=true
  for result in "${PERFORMANCE_RESULTS[@]}"; do
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

  log_success "Comprehensive test report saved to $report_file"
}

# Print summary
print_summary() {
  echo ""
  log_info "🔍 Security and Performance Test Summary for $ENVIRONMENT environment"
  echo ""
  
  local total_security_tests=${#SECURITY_RESULTS[@]}
  local total_performance_tests=${#PERFORMANCE_RESULTS[@]}
  local total_tests=$((total_security_tests + total_performance_tests))
  local failed_tests=${#FAILED_TESTS[@]}
  local passed_tests=$((total_tests - failed_tests))
  
  echo "Security Tests: $total_security_tests"
  echo "Performance Tests: $total_performance_tests"
  echo "Total Tests: $total_tests"
  echo "Passed: $passed_tests"
  echo "Failed: $failed_tests"
  
  if [[ $failed_tests -eq 0 ]]; then
    echo ""
    log_success "🎉 All security and performance tests passed!"
  else
    echo ""
    log_error "❌ $failed_tests test(s) failed:"
    for failed_test in "${FAILED_TESTS[@]}"; do
      echo "  - $failed_test"
    done
    echo ""
    log_error "Please review the issues above."
  fi
  
  echo ""
}

# Main execution
main() {
  echo ""
  log_info "🔒⚡ Starting Sachain KYC Security and Performance Tests"
  log_info "Environment: $ENVIRONMENT"
  log_info "Stack: $STACK_NAME"
  echo ""
  
  # Get stack outputs
  get_stack_outputs
  
  # Run tests
  run_security_tests
  run_performance_tests
  
  # Generate report and summary
  generate_report
  print_summary
  
  # Exit with error code if any tests failed
  if [[ ${#FAILED_TESTS[@]} -gt 0 ]]; then
    exit 1
  fi
}

# Run main function
main "$@"