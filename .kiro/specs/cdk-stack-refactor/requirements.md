# Requirements Document

## Introduction

This feature involves refactoring the AWS CDK infrastructure by consolidating stacks to reduce complexity and improve maintainability. The refactoring will merge the auth-stack into the core-stack, merge the event-stack into the lambda-stack, and relocate the post-authentication lambda creation from lambda-stack to the new consolidated auth functionality within core-stack.

## Requirements

### Requirement 1

**User Story:** As a DevOps engineer, I want to merge the auth-stack into the core-stack, so that authentication resources are co-located with other foundational infrastructure components.

#### Acceptance Criteria

1. WHEN the core-stack is deployed THEN it SHALL include all Cognito User Pool resources previously in auth-stack
2. WHEN the core-stack is deployed THEN it SHALL expose the same AuthStackOutputs interface properties as the original auth-stack
3. WHEN the auth-stack is removed THEN all cross-stack references to auth resources SHALL be updated to reference core-stack
4. WHEN the deployment completes THEN the auth-stack SHALL no longer exist as a separate CDK stack

### Requirement 2

**User Story:** As a DevOps engineer, I want to merge the event-stack into the lambda-stack, so that event-driven resources are co-located with the Lambda functions that consume them.

#### Acceptance Criteria

1. WHEN the lambda-stack is deployed THEN it SHALL include all EventBridge and SNS resources previously in event-stack
2. WHEN the lambda-stack is deployed THEN it SHALL expose the same EventStackOutputs interface properties as the original event-stack
3. WHEN the event-stack is removed THEN all cross-stack references to event resources SHALL be updated to reference lambda-stack
4. WHEN the deployment completes THEN the event-stack SHALL no longer exist as a separate CDK stack

### Requirement 3

**User Story:** As a DevOps engineer, I want the post-authentication lambda to be created within the core-stack's auth functionality, so that authentication components are properly grouped together.

#### Acceptance Criteria

1. WHEN the core-stack is deployed THEN it SHALL create the post-authentication lambda function
2. WHEN the post-authentication lambda is created THEN it SHALL be automatically configured as a Cognito User Pool trigger
3. WHEN the lambda-stack is deployed THEN it SHALL NOT create the post-authentication lambda function
4. WHEN cross-stack references are updated THEN the post-authentication lambda SHALL be accessible from core-stack outputs

### Requirement 4

**User Story:** As a DevOps engineer, I want all interface definitions and cross-stack references to be updated, so that the refactored stacks maintain type safety and proper dependencies.

#### Acceptance Criteria

1. WHEN interfaces are updated THEN CoreStackOutputs SHALL include all AuthStackOutputs properties
2. WHEN interfaces are updated THEN LambdaStackOutputs SHALL include all EventStackOutputs properties
3. WHEN dependency definitions are updated THEN StackDependencies SHALL reflect the new stack structure
4. WHEN export names are updated THEN EXPORT_NAMES SHALL reference the correct consolidated stacks

### Requirement 5

**User Story:** As a DevOps engineer, I want the main deployment orchestration to be updated, so that only the consolidated stacks are deployed in the correct order.

#### Acceptance Criteria

1. WHEN the deployment script runs THEN it SHALL only create core-stack, security-stack, lambda-stack, and monitoring-stack
2. WHEN stacks are deployed THEN the dependency order SHALL be: core-stack → security-stack → lambda-stack → monitoring-stack
3. WHEN the deployment completes THEN auth-stack and event-stack SHALL not be instantiated
4. WHEN stack dependencies are configured THEN they SHALL reflect the new consolidated structure

### Requirement 6

**User Story:** As a DevOps engineer, I want all test files to be updated, so that the test suite validates the new consolidated stack structure.

#### Acceptance Criteria

1. WHEN tests are updated THEN auth-stack and event-stack test files SHALL be removed or consolidated
2. WHEN tests are updated THEN core-stack tests SHALL validate auth functionality
3. WHEN tests are updated THEN lambda-stack tests SHALL validate event functionality
4. WHEN tests run THEN they SHALL pass with the new stack structure
