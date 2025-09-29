#!/bin/bash

# HBAR Recharge Integration Test Runner
# Runs comprehensive integration tests for the HBAR recharge system

set -e

echo "🚀 Starting HBAR Recharge Integration Tests"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the backend directory"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_warning "node_modules not found. Installing dependencies..."
    npm install
fi

# Create test results directory
mkdir -p test-results/integration
mkdir -p coverage/integration

print_status "Setting up test environment..."

# Export test environment variables
export NODE_ENV=test
export AWS_REGION=us-east-1
export TABLE_NAME=sachain-test-table
export EVENT_BUS_NAME=sachain-test-events

print_status "Running integration tests..."

# Run different test suites
echo ""
echo "📋 Test Suite Overview:"
echo "1. End-to-End Flow Tests"
echo "2. Performance Tests"
echo "3. Error Scenario Tests"
echo "4. Orange Money Simulation Tests"
echo "5. Hedera Transfer Tests"
echo ""

# Function to run a specific test suite
run_test_suite() {
    local test_name=$1
    local test_pattern=$2
    
    print_status "Running $test_name..."
    
    if npx jest --config=src/__tests__/integration/jest.integration.config.js --testNamePattern="$test_pattern" --verbose; then
        print_success "$test_name completed successfully"
        return 0
    else
        print_error "$test_name failed"
        return 1
    fi
}

# Track test results
failed_tests=()
passed_tests=()

# Run individual test suites
echo "🔄 Running End-to-End Flow Tests..."
if run_test_suite "End-to-End Flow Tests" "E2E Integration Tests"; then
    passed_tests+=("E2E Flow")
else
    failed_tests+=("E2E Flow")
fi

echo ""
echo "⚡ Running Performance Tests..."
if run_test_suite "Performance Tests" "Performance Integration Tests"; then
    passed_tests+=("Performance")
else
    failed_tests+=("Performance")
fi

echo ""
echo "💥 Running Error Scenario Tests..."
if run_test_suite "Error Scenario Tests" "Error Scenarios Integration Tests"; then
    passed_tests+=("Error Scenarios")
else
    failed_tests+=("Error Scenarios")
fi

echo ""
echo "🍊 Running Orange Money Simulation Tests..."
if run_test_suite "Orange Money Tests" "Orange Money Payment Simulation"; then
    passed_tests+=("Orange Money")
else
    failed_tests+=("Orange Money")
fi

echo ""
echo "🌐 Running Hedera Transfer Tests..."
if run_test_suite "Hedera Transfer Tests" "Hedera Transfer Integration Tests"; then
    passed_tests+=("Hedera Transfers")
else
    failed_tests+=("Hedera Transfers")
fi

# Run all tests together for coverage
echo ""
print_status "Running complete test suite for coverage report..."
npx jest --config=src/__tests__/integration/jest.integration.config.js --coverage --coverageDirectory=coverage/integration

# Generate test summary
echo ""
echo "📊 Test Summary"
echo "==============="

if [ ${#passed_tests[@]} -gt 0 ]; then
    print_success "Passed test suites (${#passed_tests[@]}):"
    for test in "${passed_tests[@]}"; do
        echo "  ✅ $test"
    done
fi

if [ ${#failed_tests[@]} -gt 0 ]; then
    print_error "Failed test suites (${#failed_tests[@]}):"
    for test in "${failed_tests[@]}"; do
        echo "  ❌ $test"
    done
fi

echo ""
echo "📁 Test artifacts:"
echo "  - Test results: test-results/integration/"
echo "  - Coverage report: coverage/integration/"
echo "  - Logs: Available in test output above"

# Performance metrics
if [ -f "test-results/integration/performance-metrics.json" ]; then
    print_status "Performance metrics saved to test-results/integration/performance-metrics.json"
fi

# Exit with appropriate code
if [ ${#failed_tests[@]} -eq 0 ]; then
    print_success "All integration tests passed! 🎉"
    echo ""
    echo "🚀 HBAR Recharge system is ready for deployment"
    exit 0
else
    print_error "Some integration tests failed. Please review the results above."
    echo ""
    echo "🔧 Please fix the failing tests before deployment"
    exit 1
fi