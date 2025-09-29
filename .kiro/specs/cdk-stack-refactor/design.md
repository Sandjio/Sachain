# Design Document

## Overview

This design outlines the refactoring of the AWS CDK infrastructure to consolidate stacks and reduce complexity. The refactoring will merge auth-stack into core-stack, merge event-stack into lambda-stack, and relocate the post-authentication lambda creation to the consolidated auth functionality within core-stack.

The refactoring aims to:

- Reduce the number of stacks from 6 to 4 (core, security, lambda, monitoring)
- Improve logical grouping of related resources
- Simplify cross-stack dependencies
- Maintain all existing functionality and interfaces

## Architecture

### Current Stack Structure

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Core Stack  │    │ Auth Stack  │    │Event Stack  │
│ - DynamoDB  │    │ - Cognito   │    │ - EventBridge│
│ - S3        │    │ - UserPool  │    │ - SNS Topics │
│ - KMS       │    │ - Client    │    │ - Rules     │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                    ┌─────────────┐
                    │Security     │
                    │Stack        │
                    │ - IAM Roles │
                    └─────────────┘
                           │
                    ┌─────────────┐    ┌─────────────┐
                    │Lambda Stack │    │Monitoring   │
                    │ - Functions │    │Stack        │
                    │ - API GW    │    │ - CloudWatch│
                    └─────────────┘    └─────────────┘
```

### New Stack Structure

```
┌─────────────────────────┐    ┌─────────────┐
│ Core Stack              │    │Security     │
│ - DynamoDB              │    │Stack        │
│ - S3                    │    │ - IAM Roles │
│ - KMS                   │    └─────────────┘
│ - Cognito (from Auth)   │           │
│ - UserPool              │           │
│ - Post-Auth Lambda      │           │
└─────────────────────────┘           │
           │                          │
           └──────────────────────────┘
                          │
           ┌──────────────────────────┐    ┌─────────────┐
           │ Lambda Stack             │    │Monitoring   │
           │ - Functions (except      │    │Stack        │
           │   post-auth)             │    │ - CloudWatch│
           │ - API Gateway            │    └─────────────┘
           │ - EventBridge (from      │
           │   Event)                 │
           │ - SNS Topics             │
           │ - Event Rules            │
           └──────────────────────────┘
```

## Components and Interfaces

### Core Stack Enhancements

The CoreStack will be enhanced to include authentication resources:

**New Components:**

- CognitoConstruct (moved from AuthStack)
- Post-Authentication Lambda (moved from LambdaStack)
- Auth-related IAM permissions

**Updated Interface:**

```typescript
export interface CoreStackOutputs extends AuthStackOutputs {
  // Existing core outputs
  table: dynamodb.Table;
  documentBucket: s3.Bucket;
  encryptionKey: kms.Key;

  // New auth outputs (from AuthStackOutputs)
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
  userPoolId: string;
  userPoolArn: string;
  userPoolClientId: string;
  userPoolDomain: string;

  // New post-auth lambda output
  postAuthLambda: lambda.Function;
  postAuthLambdaArn: string;
}
```

### Lambda Stack Enhancements

The LambdaStack will be enhanced to include event-driven resources:

**New Components:**

- EventBridgeConstruct (moved from EventStack)
- SNS Topics and subscriptions
- Event rules and targets

**Updated Interface:**

```typescript
export interface LambdaStackOutputs extends EventStackOutputs {
  // Existing lambda outputs (minus post-auth)
  kycUploadLambda: lambda.Function;
  adminReviewLambda: lambda.Function;
  userNotificationLambda: lambda.Function;
  kycProcessingLambda: lambda.Function;
  api: apigateway.RestApi;

  // New event outputs (from EventStackOutputs)
  eventBus: events.EventBus;
  notificationTopic: sns.Topic;
  userNotificationTopic: sns.Topic;
  kycStatusChangeRule: events.Rule;
  kycDocumentUploadedRule: events.Rule;
  kycReviewCompletedRule: events.Rule;
}
```

### Dependency Updates

**New Dependency Chain:**

1. CoreStack (independent) - includes auth resources
2. SecurityStack (depends on CoreStack) - updated to reference auth from core
3. LambdaStack (depends on CoreStack + SecurityStack) - includes event resources
4. MonitoringStack (depends on LambdaStack) - unchanged

## Data Models

### Stack Configuration Updates

**Updated StackDependencies:**

```typescript
export interface StackDependencies {
  core: {
    // No dependencies - now includes auth
  };

  security: {
    coreOutputs: Pick<
      CoreStackOutputs,
      "table" | "documentBucket" | "encryptionKey" | "userPool"
    >;
  };

  lambda: {
    coreOutputs: Pick<
      CoreStackOutputs,
      | "table"
      | "documentBucket"
      | "encryptionKey"
      | "userPool"
      | "userPoolClient"
      | "postAuthLambda"
    >;
    securityOutputs: Pick<
      SecurityStackOutputs,
      | "kycUploadRole"
      | "adminReviewRole"
      | "userNotificationRole"
      | "kycProcessingRole"
    >;
  };

  monitoring: {
    lambdaOutputs: Pick<
      LambdaStackOutputs,
      | "kycUploadLambda"
      | "adminReviewLambda"
      | "userNotificationLambda"
      | "kycProcessingLambda"
    >;
    coreOutputs: Pick<CoreStackOutputs, "postAuthLambda">;
  };
}
```

### Export Name Updates

**Updated EXPORT_NAMES:**

- Auth-related exports will use core-stack prefix
- Event-related exports will use lambda-stack prefix
- Post-auth lambda export will use core-stack prefix

## Error Handling

### Migration Strategy

**Phase 1: Preparation**

- Update interfaces to support consolidated outputs
- Create backup of current stack definitions
- Update cross-stack reference utilities

**Phase 2: Core Stack Migration**

- Add CognitoConstruct to CoreStack
- Add post-auth lambda creation to CoreStack
- Update CoreStack outputs to include auth resources
- Maintain backward compatibility during transition

**Phase 3: Lambda Stack Migration**

- Add EventBridgeConstruct to LambdaStack
- Remove post-auth lambda from LambdaStack
- Update LambdaStack outputs to include event resources
- Update event rule targets to reference local lambdas

**Phase 4: Cleanup**

- Remove AuthStack and EventStack files
- Update deployment orchestration
- Remove obsolete cross-stack references
- Update test files

### Rollback Strategy

**Rollback Plan:**

1. Maintain original stack files during migration
2. Use feature flags to switch between old and new implementations
3. Implement validation checks to ensure resource parity
4. Create rollback scripts to restore original structure if needed

### Validation Checks

**Pre-deployment Validation:**

- Verify all cross-stack references are updated
- Ensure no circular dependencies exist
- Validate that all resources maintain same configurations
- Check that all exports are properly mapped

**Post-deployment Validation:**

- Verify all Lambda functions are properly deployed
- Test Cognito User Pool functionality
- Validate EventBridge rule targets are working
- Confirm API Gateway authorization is functional

## Testing Strategy

### Unit Tests

**Core Stack Tests:**

- Test CognitoConstruct integration
- Verify post-auth lambda creation and configuration
- Validate auth-related outputs and exports

**Lambda Stack Tests:**

- Test EventBridgeConstruct integration
- Verify event rule and target configurations
- Validate lambda function deployments (excluding post-auth)

### Integration Tests

**Cross-Stack Integration:**

- Test core-to-security dependencies
- Test core-to-lambda dependencies
- Test lambda-to-monitoring dependencies

**End-to-End Tests:**

- Test complete user authentication flow
- Test KYC document upload and processing workflow
- Test event-driven notification system

### Migration Tests

**Compatibility Tests:**

- Verify resource configurations match original stacks
- Test that all CloudFormation exports are maintained
- Validate that external references continue to work

**Performance Tests:**

- Ensure deployment times are not significantly impacted
- Verify that consolidated stacks don't exceed CloudFormation limits
- Test that resource creation order is optimized

### Test File Updates

**Files to Update:**

- `test/stacks/core-stack.test.ts` - Add auth functionality tests
- `test/stacks/lambda-stack.test.ts` - Add event functionality tests
- Remove `test/stacks/auth-stack.test.ts`
- Remove `test/stacks/event-stack.test.ts`
- Update `test/constructs/` files as needed

**New Test Scenarios:**

- Test post-auth lambda trigger configuration in CoreStack
- Test EventBridge integration in LambdaStack
- Test consolidated stack deployment order
- Test cross-stack reference resolution
