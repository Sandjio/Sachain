# Implementation Plan

- [x] 1. Create new KYC Processing Lambda function structure

  - Create new directory `backend/src/lambdas/kyc-processing` with proper folder structure
  - Set up TypeScript configuration and dependencies for the new Lambda
  - Create types.ts file with EventBridge event interfaces and processing result types
  - _Requirements: 3.1, 3.2_

- [x] 2. Implement EventBridge event interfaces and utilities

  - [x] 2.1 Create EventBridge event type definitions

    - Define KYCDocumentUploadedEvent interface with proper event schema
    - Create event detail interfaces for upload completion events
    - Add event validation utilities to ensure event structure integrity
    - _Requirements: 2.1, 2.2, 2.5_

  - [x] 2.2 Implement EventBridge publishing utility
    - Create EventPublisher class for publishing KYC upload events
    - Add retry logic with exponential backoff for event publishing
    - Implement error handling for failed event publications
    - Write unit tests for event publishing functionality
    - _Requirements: 2.1, 2.3, 2.4_

- [x] 3. Implement KYC Processing Lambda function

  - [x] 3.1 Create main handler for EventBridge events

    - Implement EventBridge handler function that processes KYC upload events
    - Add event validation to ensure events come from trusted sources
    - Create structured logging for all processing operations
    - Write unit tests for event handler with mocked dependencies
    - _Requirements: 3.1, 3.2, 3.5_

  - [x] 3.2 Implement document status update logic

    - Create function to update document status from "uploaded" to "pending_review"
    - Use existing DynamoDB repository patterns for status updates
    - Add atomic update operations to prevent race conditions
    - Write unit tests for status update operations
    - _Requirements: 3.1, 4.6_

  - [x] 3.3 Implement admin notification functionality

    - Move SNS notification logic from upload Lambda to processing Lambda
    - Create admin notification service for sending review notifications
    - Include secure document access links in notifications
    - Write unit tests for notification functionality
    - _Requirements: 3.2, 3.3_

  - [x] 3.4 Add error handling and retry logic
    - Implement comprehensive error handling for processing operations
    - Add retry logic with exponential backoff for transient failures
    - Create dead letter queue handling for permanent failures
    - Write unit tests for error scenarios and retry mechanisms
    - _Requirements: 3.4, 3.6_

- [x] 4. Refactor existing KYC Upload Lambda function

  - [x] 4.1 Remove presigned URL functionality

    - Delete handlePresignedUrl function and related code
    - Remove PresignedUrlRequest interface and validation logic
    - Update route handling to only support direct upload endpoint
    - Clean up unused imports and dependencies
    - _Requirements: 4.1, 4.2, 4.3, 4.6_

  - [x] 4.2 Remove SNS notification from upload flow

    - Remove SNS notification logic from handleDirectUpload function
    - Delete sendAdminNotification function and related utilities
    - Remove SNS client initialization and configuration
    - Clean up notification-related imports and dependencies
    - _Requirements: 1.3, 4.4_

  - [x] 4.3 Remove upload processing endpoint

    - Delete handleUploadProcessing function completely
    - Remove UploadProcessingRequest interface and validation
    - Update main handler to only route to direct upload
    - Clean up processing-related code and imports
    - _Requirements: 4.3, 4.4_

  - [x] 4.4 Add EventBridge event publishing to upload flow
    - Integrate EventPublisher utility into upload Lambda
    - Add event publishing after successful S3 upload and database record creation
    - Implement error handling for event publishing failures
    - Ensure upload operation succeeds even if event publishing fails
    - _Requirements: 1.2, 2.1, 2.4_

- [x] 5. Update file validation and upload utilities

  - [x] 5.1 Simplify file validation logic

    - Consolidate file validation into single validateDirectUploadRequest function
    - Remove validation logic specific to presigned URLs
    - Enhance file content validation with proper header checking
    - Write comprehensive unit tests for validation logic
    - _Requirements: 1.6, 6.2_

  - [x] 5.2 Optimize S3 upload operations
    - Streamline S3 upload logic to focus only on direct uploads
    - Remove presigned URL generation utilities
    - Maintain existing encryption and security configurations
    - Write unit tests for S3 upload operations
    - _Requirements: 1.1, 6.1, 6.3_

- [ ] 6. Update monitoring and metrics

  - [ ] 6.1 Add metrics for upload Lambda

    - Implement CloudWatch metrics for upload success/failure rates
    - Add metrics for file size distribution and upload duration
    - Create metrics for EventBridge event publishing success/failure
    - Write unit tests for metrics publishing functionality
    - _Requirements: 5.1, 5.2_

  - [ ] 6.2 Add metrics for processing Lambda

    - Implement CloudWatch metrics for processing success/failure rates
    - Add metrics for processing duration and notification success
    - Create metrics for EventBridge event processing latency
    - Write unit tests for processing metrics
    - _Requirements: 5.1, 5.2, 5.4_

  - [ ] 6.3 Update structured logging
    - Enhance logging in upload Lambda to focus on upload operations
    - Add comprehensive logging in processing Lambda for all operations
    - Ensure log correlation between upload and processing operations
    - Write unit tests for logging functionality
    - _Requirements: 5.3, 5.1_

- [ ] 7. Update infrastructure configuration

  - [ ] 7.1 Create CDK construct for processing Lambda

    - Add new Lambda function construct for KYC processing
    - Configure IAM permissions for DynamoDB and SNS access
    - Set up environment variables and resource limits
    - Write unit tests for CDK construct configuration
    - _Requirements: 3.1, 6.4_

  - [ ] 7.2 Configure EventBridge integration

    - Create EventBridge custom bus for KYC events
    - Set up event rules to route upload events to processing Lambda
    - Configure retry policies and dead letter queues
    - Write unit tests for EventBridge configuration
    - _Requirements: 2.1, 2.3, 3.4_

  - [ ] 7.3 Update upload Lambda IAM permissions
    - Add EventBridge publishing permissions to upload Lambda role
    - Remove SNS permissions from upload Lambda role
    - Ensure minimal required permissions following least privilege principle
    - Write tests to validate IAM permission configurations
    - _Requirements: 1.2, 6.4_

- [ ] 8. Create comprehensive test suite

  - [ ] 8.1 Write unit tests for refactored upload Lambda

    - Test direct upload functionality with various file types and sizes
    - Test file validation with valid and invalid inputs
    - Test EventBridge event publishing with success and failure scenarios
    - Test error handling and response formatting
    - _Requirements: 7.1, 7.4_

  - [ ] 8.2 Write unit tests for processing Lambda

    - Test EventBridge event handling with valid and invalid events
    - Test document status update operations
    - Test admin notification functionality
    - Test error handling and retry logic
    - _Requirements: 7.1, 7.4_

  - [ ] 8.3 Create integration tests for end-to-end flow
    - Test complete upload-to-processing workflow
    - Test EventBridge event routing and processing
    - Test error scenarios and recovery mechanisms
    - Test monitoring and alerting functionality
    - _Requirements: 7.3, 7.4_

- [ ] 9. Update API documentation and client interfaces

  - [ ] 9.1 Update OpenAPI specification

    - Remove presigned URL endpoints from API documentation
    - Update upload endpoint documentation to reflect simplified interface
    - Add error response documentation for new error scenarios
    - Create examples for direct upload requests and responses
    - _Requirements: 4.2, 4.3_

  - [ ] 9.2 Update frontend SDK interfaces
    - Remove presigned URL methods from KYC upload utilities
    - Update direct upload methods to match new Lambda interface
    - Add error handling for new error response formats
    - Write unit tests for updated SDK functionality
    - _Requirements: 4.1, 4.2_

- [ ] 10. Implement deployment and migration strategy

  - [ ] 10.1 Deploy processing Lambda and EventBridge infrastructure

    - Deploy new KYC processing Lambda function
    - Set up EventBridge custom bus and routing rules
    - Configure monitoring and alerting for new components
    - Test processing Lambda with synthetic events
    - _Requirements: 3.1, 3.2, 5.1_

  - [ ] 10.2 Deploy refactored upload Lambda with feature flag

    - Deploy refactored upload Lambda alongside existing version
    - Implement feature flag to control traffic routing
    - Monitor upload success rates and error rates
    - Gradually increase traffic to refactored version
    - _Requirements: 1.1, 1.2, 5.2_

  - [ ] 10.3 Complete migration and cleanup
    - Remove legacy code from upload Lambda after successful migration
    - Clean up unused dependencies and imports
    - Update deployment scripts and documentation
    - Verify all functionality works correctly in production
    - _Requirements: 4.4, 4.6, 7.5_
