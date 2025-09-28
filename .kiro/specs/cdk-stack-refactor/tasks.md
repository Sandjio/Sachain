# Implementation Plan

- [x] 1. Update interface definitions for consolidated stacks

  - Modify CoreStackOutputs interface to include AuthStackOutputs properties
  - Modify LambdaStackOutputs interface to include EventStackOutputs properties
  - Update StackDependencies interface to reflect new stack structure
  - Update EXPORT_NAMES to reference consolidated stacks
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 2. Create post-authentication lambda construct for CoreStack

  - Create PostAuthLambdaConstruct class with proper IAM role integration
  - Implement lambda function creation with environment variables and bundling
  - Add proper error handling and timeout configuration
  - Write unit tests for PostAuthLambdaConstruct
  - _Requirements: 3.1, 3.2_

- [x] 3. Enhance CoreStack to include authentication functionality

  - Add CognitoConstruct integration to CoreStack
  - Add PostAuthLambdaConstruct integration to CoreStack
  - Configure Cognito User Pool with post-auth lambda trigger
  - Update CoreStack outputs to include all auth-related properties
  - Add proper CloudFormation exports for auth resources
  - _Requirements: 1.1, 1.2, 3.1, 3.3_

- [x] 4. Enhance LambdaStack to include event functionality

  - Add EventBridgeConstruct integration to LambdaStack
  - Remove post-authentication lambda creation from LambdaStack
  - Update lambda environment variables to reference local event resources
  - Configure event rule targets to reference local lambda functions
  - Update LambdaStack outputs to include all event-related properties
  - _Requirements: 2.1, 2.2, 3.3_

- [x] 5. Update SecurityStack dependencies

  - Modify SecurityStack to accept auth resources from CoreStack
  - Update IAM role policies to reference consolidated stack resources
  - Remove dependencies on separate AuthStack and EventStack
  - Update cross-stack reference tracking
  - _Requirements: 1.3, 2.3_

- [x] 6. Update deployment orchestration

  - Modify main deployment script to only create consolidated stacks
  - Update stack dependency chain: core → security → lambda → monitoring
  - Remove AuthStack and EventStack instantiation
  - Update stack naming and tagging
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 7. Update cross-stack validation utilities

  - Modify CrossStackValidator to handle new dependency structure
  - Update ResourceReferenceTracker for consolidated stacks
  - Remove validation logic for deleted stacks
  - Add validation for new consolidated stack dependencies
  - _Requirements: 1.3, 2.3, 4.4_

- [x] 8. Update construct integration and dependencies

  - Modify LambdaConstruct to remove post-auth lambda creation
  - Update CognitoConstruct to accept lambda function for trigger configuration
  - Ensure EventBridgeConstruct works properly within LambdaStack context
  - Update construct property passing and configuration
  - _Requirements: 3.2, 3.4, 2.1_

- [x] 9. Update CloudFormation export references

  - Update all export names to reference consolidated stacks
  - Ensure backward compatibility for external references
  - Update import statements in dependent resources
  - Validate that all exports maintain consistent naming
  - _Requirements: 4.4, 1.3, 2.3_

- [x] 10. Update and consolidate test files

  - Remove auth-stack.test.ts and event-stack.test.ts files
  - Add auth functionality tests to core-stack.test.ts
  - Add event functionality tests to lambda-stack.test.ts
  - Update construct tests for new integration patterns
  - Update integration tests for new stack dependencies
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 11. Update monitoring stack dependencies

  - Modify MonitoringStack to reference post-auth lambda from CoreStack
  - Update lambda function references for consolidated structure
  - Ensure all monitoring targets are properly configured
  - Update monitoring stack outputs and exports
  - _Requirements: 5.2, 3.4_

- [x] 12. Clean up obsolete files and references
  - Delete AuthStack and EventStack class files
  - Remove obsolete import statements throughout codebase
  - Clean up unused interface definitions
  - Remove obsolete test files and update test imports
  - Update documentation and README files
  - _Requirements: 1.4, 2.4, 5.3_
