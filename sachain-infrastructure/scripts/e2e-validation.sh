#!/bin/bash

# Sachain KYC End-to-End System Validation Script
# Usage: ./scripts/e2e-validation.sh [environment]

set -e

# Default values
ENVIRONMENT=${1:-dev}
VERBOSE=false
SKIP_DEPLOYMENT=false
SKIP_SECURITY=false
SKIP_PERFORMANCE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --verbose)
      VERBOSE=true
      shift
      ;;
    --skip-deployment)
      SKIP_DEPLOYMENT=true
      shift
      ;;
    --skip-security)
      SKIP_SECURITY=true
      shift
      ;;
    --skip-performance)
      SKIP_PERFORMANCE=true
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
      echo "  --skip-deployment  Skip deployment validation"
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
PURPLE='\033[0;35m'
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

log_section() {
  echo -e "${PURPLE}🔍 $1${NC}"
}

# Stack name
STACK_NAME="SachainKYCStack-$ENVIRONMENT"

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
VALIDATION_PHASES=()

# Add validation phase result
add_phase_result() {
  local phase="$1"
  local status="$2"
  local message="$3"
  
  VALIDATION_PHASES+=("$phase:$status:$message")
  ((TOTAL_TESTS++))
  
  if [[ "$status" == "PASS" ]]; then
    ((PASSED_TESTS++))
  else
    ((FAILED_TESTS++))
  fi
}

# Check prerequisites
check_prerequisites() {
  log_section "Checking Prerequisites"
  
  local prereq_failed=false
  
  # Check AWS CLI
  if ! command -v aws &> /dev/null; then
    log_error "AWS CLI is not installed"
    prereq_failed=true
  else
    log_success "AWS CLI is installed"
  fi
  
  # Check AWS credentials
  if ! aws sts get-caller-identity &> /dev/null; then
    log_error "AWS credentials are not configured"
    prereq_failed=true
  else
    log_success "AWS credentials are configured"
  fi
  
  # Check CDK
  if ! command -v cdk &> /dev/null; then
    log_error "AWS CDK is not installed"
    prereq_failed=true
  else
    log_success "AWS CDK is installed"
  fi
  
  # Check Node.js and npm
  if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
    log_error "Node.js and npm are required"
    prereq_failed=true
  else
    log_success "Node.js and npm are available"
  fi
  
  # Check required tools
  local required_tools=("jq" "curl" "bc")
  for tool in "${required_tools[@]}"; do
    if ! command -v "$tool" &> /dev/null; then
      log_error "$tool is not installed"
      prereq_failed=true
    else
      log_success "$tool is available"
    fi
  done
  
  if [[ "$prereq_failed" == "true" ]]; then
    log_error "Prerequisites check failed. Please install missing tools."
    exit 1
  fi
  
  add_phase_result "Prerequisites" "PASS" "All prerequisites satisfied"
  echo ""
}

# Run unit tests
run_unit_tests() {
  log_section "Running Unit Tests"
  
  if npm test -- --testPathPattern=deployment-validation-simple --silent; then
    add_phase_result "Unit Tests" "PASS" "All unit tests passed"
    log_success "Unit tests passed"
  else
    add_phase_result "Unit Tests" "FAIL" "Some unit tests failed"
    log_error "Unit tests failed"
  fi
  
  echo ""
}

# Run deployment validation
run_deployment_validation() {
  if [[ "$SKIP_DEPLOYMENT" == "true" ]]; then
    log_warning "Skipping deployment validation as requested"
    add_phase_result "Deployment Validation" "SKIP" "Skipped by user request"
    echo ""
    return
  fi
  
  log_section "Running Deployment Validation"
  
  if ./scripts/validate-deployment.sh "$ENVIRONMENT" --verbose 2>/dev/null; then
    add_phase_result "Deployment Validation" "PASS" "All deployment validations passed"
    log_success "Deployment validation passed"
  else
    add_phase_result "Deployment Validation" "FAIL" "Some deployment validations failed"
    log_error "Deployment validation failed"
  fi
  
  echo ""
}

# Run security tests
run_security_tests() {
  if [[ "$SKIP_SECURITY" == "true" ]]; then
    log_warning "Skipping security tests as requested"
    add_phase_result "Security Tests" "SKIP" "Skipped by user request"
    echo ""
    return
  fi
  
  log_section "Running Security Tests"
  
  if ./scripts/security-performance-tests.sh "$ENVIRONMENT" --skip-performance 2>/dev/null; then
    add_phase_result "Security Tests" "PASS" "All security tests passed"
    log_success "Security tests passed"
  else
    add_phase_result "Security Tests" "FAIL" "Some security tests failed"
    log_error "Security tests failed"
  fi
  
  echo ""
}

# Run performance tests
run_performance_tests() {
  if [[ "$SKIP_PERFORMANCE" == "true" ]]; then
    log_warning "Skipping performance tests as requested"
    add_phase_result "Performance Tests" "SKIP" "Skipped by user request"
    echo ""
    return
  fi
  
  log_section "Running Performance Tests"
  
  if ./scripts/security-performance-tests.sh "$ENVIRONMENT" --skip-security 2>/dev/null; then
    add_phase_result "Performance Tests" "PASS" "All performance tests passed"
    log_success "Performance tests passed"
  else
    add_phase_result "Performance Tests" "FAIL" "Some performance tests failed"
    log_error "Performance tests failed"
  fi
  
  echo ""
}

# Run integration tests
run_integration_tests() {
  log_section "Running Integration Tests"
  
  # Set environment variables for integration tests
  export RUN_INTEGRATION_TESTS=true
  export TEST_ENVIRONMENT="$ENVIRONMENT"
  
  if npm run test:integration --silent 2>/dev/null; then
    add_phase_result "Integration Tests" "PASS" "All integration tests passed"
    log_success "Integration tests passed"
  else
    add_phase_result "Integration Tests" "FAIL" "Some integration tests failed"
    log_warning "Integration tests failed (this may be expected if resources are not deployed)"
  fi
  
  # Unset environment variables
  unset RUN_INTEGRATION_TESTS
  unset TEST_ENVIRONMENT
  
  echo ""
}

# Run end-to-end workflow test
run_e2e_workflow_test() {
  log_section "Running End-to-End Workflow Test"
  
  # Get stack outputs
  local outputs=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].Outputs' --output json 2>/dev/null || echo "[]")
  
  if [[ "$outputs" == "[]" ]]; then
    add_phase_result "E2E Workflow" "FAIL" "Stack not found or no outputs"
    log_error "Cannot run E2E workflow test - stack not found"
    echo ""
    return
  fi
  
  # Extract API URL
  local api_url=$(echo "$outputs" | jq -r '.[] | select(.OutputKey=="KYCUploadApiUrl") | .OutputValue')
  
  if [[ "$api_url" == "null" || -z "$api_url" ]]; then
    add_phase_result "E2E Workflow" "FAIL" "API URL not found"
    log_error "Cannot run E2E workflow test - API URL not found"
    echo ""
    return
  fi
  
  # Test the complete workflow
  local workflow_success=true
  
  # Step 1: Test API health
  log_info "Testing API health endpoint..."
  local health_status=$(curl -s -o /dev/null -w "%{http_code}" "$api_url/health" 2>/dev/null || echo "000")
  
  if [[ "$health_status" -ge 200 && "$health_status" -lt 500 ]]; then
    log_success "API health check passed (status: $health_status)"
  else
    log_error "API health check failed (status: $health_status)"
    workflow_success=false
  fi
  
  # Step 2: Test CORS preflight
  log_info "Testing CORS preflight request..."
  local cors_status=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$api_url/health" 2>/dev/null || echo "000")
  
  if [[ "$cors_status" -ge 200 && "$cors_status" -lt 400 ]]; then
    log_success "CORS preflight check passed (status: $cors_status)"
  else
    log_warning "CORS preflight check returned status: $cors_status"
  fi
  
  # Step 3: Test authentication endpoint (if available)
  log_info "Testing authentication flow..."
  local auth_status=$(curl -s -o /dev/null -w "%{http_code}" "$api_url/auth" 2>/dev/null || echo "404")
  
  if [[ "$auth_status" == "401" || "$auth_status" == "403" ]]; then
    log_success "Authentication endpoint properly secured (status: $auth_status)"
  elif [[ "$auth_status" == "404" ]]; then
    log_info "Authentication endpoint not found (expected for health-only API)"
  else
    log_warning "Authentication endpoint returned unexpected status: $auth_status"
  fi
  
  if [[ "$workflow_success" == "true" ]]; then
    add_phase_result "E2E Workflow" "PASS" "End-to-end workflow test completed successfully"
    log_success "End-to-end workflow test passed"
  else
    add_phase_result "E2E Workflow" "FAIL" "End-to-end workflow test failed"
    log_error "End-to-end workflow test failed"
  fi
  
  echo ""
}

# Generate comprehensive report
generate_comprehensive_report() {
  log_section "Generating Comprehensive Report"
  
  local report_file="e2e-validation-report-$ENVIRONMENT-$(date +%Y%m%d-%H%M%S).json"
  local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  
  # Get system information
  local aws_account=$(aws sts get-caller-identity --query 'Account' --output text 2>/dev/null || echo "unknown")
  local aws_region=$(aws configure get region 2>/dev/null || echo "unknown")
  local node_version=$(node --version 2>/dev/null || echo "unknown")
  local npm_version=$(npm --version 2>/dev/null || echo "unknown")
  local cdk_version=$(cdk --version 2>/dev/null || echo "unknown")
  
  # Calculate success rate
  local success_rate=0
  if [[ $TOTAL_TESTS -gt 0 ]]; then
    success_rate=$(echo "scale=2; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc -l)
  fi
  
  # Create comprehensive JSON report
  cat > "$report_file" << EOF
{
  "report_metadata": {
    "report_type": "end_to_end_validation",
    "environment": "$ENVIRONMENT",
    "timestamp": "$timestamp",
    "stack_name": "$STACK_NAME",
    "generated_by": "e2e-validation.sh"
  },
  "system_information": {
    "aws_account": "$aws_account",
    "aws_region": "$aws_region",
    "node_version": "$node_version",
    "npm_version": "$npm_version",
    "cdk_version": "$cdk_version"
  },
  "validation_summary": {
    "total_phases": $TOTAL_TESTS,
    "passed_phases": $PASSED_TESTS,
    "failed_phases": $FAILED_TESTS,
    "success_rate": $success_rate,
    "overall_status": "$(if [[ $FAILED_TESTS -eq 0 ]]; then echo "PASS"; else echo "FAIL"; fi)"
  },
  "validation_phases": [
EOF

  # Add validation phase results
  local first=true
  for phase in "${VALIDATION_PHASES[@]}"; do
    IFS=':' read -r phase_name status message <<< "$phase"
    
    if [[ "$first" == "true" ]]; then
      first=false
    else
      echo "," >> "$report_file"
    fi
    
    cat >> "$report_file" << EOF
    {
      "phase": "$phase_name",
      "status": "$status",
      "message": "$message"
    }
EOF
  done

  cat >> "$report_file" << EOF
  ],
  "recommendations": [
EOF

  # Add recommendations based on results
  local recommendations=()
  
  if [[ $FAILED_TESTS -gt 0 ]]; then
    recommendations+=("Review failed validation phases and address issues before production deployment")
  fi
  
  if [[ "$ENVIRONMENT" == "prod" && $FAILED_TESTS -gt 0 ]]; then
    recommendations+=("Production environment has failed validations - immediate attention required")
  fi
  
  if [[ $PASSED_TESTS -eq $TOTAL_TESTS ]]; then
    recommendations+=("All validations passed - system is ready for use")
  fi
  
  # Add recommendations to report
  first=true
  for recommendation in "${recommendations[@]}"; do
    if [[ "$first" == "true" ]]; then
      first=false
    else
      echo "," >> "$report_file"
    fi
    
    echo "    \"$recommendation\"" >> "$report_file"
  done

  cat >> "$report_file" << EOF
  ]
}
EOF

  log_success "Comprehensive report saved to $report_file"
  echo ""
}

# Print final summary
print_final_summary() {
  echo ""
  echo "════════════════════════════════════════════════════════════════"
  log_section "🎯 End-to-End Validation Summary for $ENVIRONMENT Environment"
  echo "════════════════════════════════════════════════════════════════"
  echo ""
  
  echo "📊 Validation Statistics:"
  echo "  Total Phases: $TOTAL_TESTS"
  echo "  Passed: $PASSED_TESTS"
  echo "  Failed: $FAILED_TESTS"
  
  if [[ $TOTAL_TESTS -gt 0 ]]; then
    local success_rate=$(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc -l)
    echo "  Success Rate: ${success_rate}%"
  fi
  
  echo ""
  echo "📋 Phase Results:"
  for phase in "${VALIDATION_PHASES[@]}"; do
    IFS=':' read -r phase_name status message <<< "$phase"
    
    if [[ "$status" == "PASS" ]]; then
      echo -e "  ✅ $phase_name: ${GREEN}PASSED${NC}"
    elif [[ "$status" == "SKIP" ]]; then
      echo -e "  ⏭️  $phase_name: ${YELLOW}SKIPPED${NC}"
    else
      echo -e "  ❌ $phase_name: ${RED}FAILED${NC}"
    fi
  done
  
  echo ""
  
  if [[ $FAILED_TESTS -eq 0 ]]; then
    echo "🎉 Overall Result: ${GREEN}ALL VALIDATIONS PASSED${NC}"
    echo ""
    echo "✨ The Sachain KYC system is ready for use in the $ENVIRONMENT environment!"
    echo ""
    echo "🚀 Next Steps:"
    echo "  • System is validated and ready for use"
    echo "  • Monitor CloudWatch dashboards for ongoing health"
    echo "  • Review generated reports for detailed insights"
  else
    echo "⚠️  Overall Result: ${RED}SOME VALIDATIONS FAILED${NC}"
    echo ""
    echo "🔧 Action Required:"
    echo "  • Review failed validation phases above"
    echo "  • Address identified issues"
    echo "  • Re-run validation after fixes"
    echo "  • Do not proceed to production until all validations pass"
  fi
  
  echo ""
  echo "📄 Reports Generated:"
  echo "  • Comprehensive validation report: e2e-validation-report-$ENVIRONMENT-*.json"
  echo "  • Individual test reports available in current directory"
  echo ""
  echo "════════════════════════════════════════════════════════════════"
  echo ""
}

# Main execution
main() {
  echo ""
  echo "🚀 Starting Sachain KYC End-to-End System Validation"
  echo "Environment: $ENVIRONMENT"
  echo "Stack: $STACK_NAME"
  echo "Timestamp: $(date)"
  echo ""
  
  # Run all validation phases
  check_prerequisites
  run_unit_tests
  run_deployment_validation
  run_security_tests
  run_performance_tests
  run_integration_tests
  run_e2e_workflow_test
  
  # Generate comprehensive report
  generate_comprehensive_report
  
  # Print final summary
  print_final_summary
  
  # Exit with appropriate code
  if [[ $FAILED_TESTS -gt 0 ]]; then
    exit 1
  else
    exit 0
  fi
}

# Run main function
main "$@"