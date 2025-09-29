# Requirements Document

## Introduction

This feature enables entrepreneurs to create projects on the Sachain platform and issue digital shares as NFTs using Hedera Token Service (HTS). Each project represents a startup or business idea, and each stock corresponds to a fractional ownership unit (NFT) that investors can purchase. The system will provide a secure, compliant way for entrepreneurs to tokenize their business shares and make them available for investment.

## Requirements

### Requirement 1

**User Story:** As an entrepreneur, I want to create a new project with essential business details, so that I can prepare my startup for tokenized fundraising.

#### Acceptance Criteria

1. WHEN an entrepreneur accesses the project creation form THEN the system SHALL display required fields for project name, description, and category/industry
2. WHEN an entrepreneur submits a project with valid data THEN the system SHALL generate a unique Project ID and store the project in the database
3. WHEN an entrepreneur provides a project name THEN the system SHALL validate that the name is between 3-100 characters and contains only alphanumeric characters, spaces, and basic punctuation
4. WHEN an entrepreneur provides a project description THEN the system SHALL validate that the description is between 50-2000 characters
5. WHEN an entrepreneur selects a category THEN the system SHALL validate that the category exists in the predefined list of industries
6. IF an entrepreneur provides a target funding goal THEN the system SHALL validate that it is a positive number with maximum 2 decimal places
7. WHEN a project is successfully created THEN the system SHALL return the unique Project ID to the entrepreneur

### Requirement 2

**User Story:** As an entrepreneur, I want to define the stock structure for my project, so that I can specify how many ownership units will be available for investment.

#### Acceptance Criteria

1. WHEN an entrepreneur creates a project THEN the system SHALL require them to specify the number of stock-NFTs to issue (minimum 1)
2. WHEN an entrepreneur enters the number of stocks THEN the system SHALL validate that it is a positive integer between 1 and 1,000,000
3. IF an entrepreneur provides a price per stock THEN the system SHALL validate that it is a positive number with maximum 8 decimal places
4. WHEN stock parameters are defined THEN the system SHALL store them as immutable project metadata
5. WHEN stock supply is set for a project THEN the system SHALL prevent any future modifications to the total supply

### Requirement 3

**User Story:** As an entrepreneur, I want to upload visual branding for my project, so that investors can easily identify and connect with my business idea.

#### Acceptance Criteria

1. WHEN an entrepreneur uploads a cover image THEN the system SHALL validate that the file is in PNG, JPG, or JPEG format
2. WHEN an entrepreneur uploads an image THEN the system SHALL validate that the file size is less than 5MB
3. WHEN an entrepreneur uploads an image THEN the system SHALL validate that the dimensions are at least 400x300 pixels
4. WHEN a valid image is uploaded THEN the system SHALL store it securely and associate it with the project
5. IF no image is provided THEN the system SHALL use a default placeholder image

### Requirement 4

**User Story:** As an entrepreneur, I want to mint stock-NFTs for my project using Hedera Token Service, so that I can create tradeable ownership units for investors.

#### Acceptance Criteria

1. WHEN an entrepreneur initiates stock minting THEN the system SHALL verify their identity and wallet connection
2. WHEN stock minting begins THEN the system SHALL create a new HTS token with project-specific metadata
3. WHEN each NFT is minted THEN the system SHALL include metadata containing project ID, stock number, issuance date, and initial owner wallet address
4. WHEN NFTs are minted THEN the system SHALL ensure each token is unique and traceable on the Hedera network
5. WHEN minting is complete THEN the system SHALL update the project status to "Active" and make stocks available for purchase
6. IF minting fails due to insufficient wallet balance THEN the system SHALL provide clear error messaging about gas fee requirements
7. WHEN minting is successful THEN the system SHALL log the transaction hash and update the project with minting details

### Requirement 5

**User Story:** As a system administrator, I want to ensure all project creation and stock issuance follows security and compliance standards, so that the platform maintains regulatory compliance and user trust.

#### Acceptance Criteria

1. WHEN an entrepreneur attempts to create a project THEN the system SHALL verify their KYC/AML verification status is complete
2. WHEN project data is submitted THEN the system SHALL sanitize all input fields to prevent injection attacks
3. WHEN sensitive project data is stored THEN the system SHALL encrypt it using industry-standard encryption
4. WHEN stock-NFTs are minted THEN the system SHALL follow HTS standards and best practices
5. WHEN any project operation occurs THEN the system SHALL log the action with timestamp, user ID, and operation details for audit purposes
6. IF an entrepreneur's verification status is incomplete THEN the system SHALL prevent project creation and redirect to KYC completion

### Requirement 6

**User Story:** As an entrepreneur, I want to receive clear feedback about the project creation process, so that I understand the status and can take appropriate next steps.

#### Acceptance Criteria

1. WHEN project creation is in progress THEN the system SHALL display real-time progress indicators
2. WHEN validation errors occur THEN the system SHALL display specific, actionable error messages next to the relevant fields
3. WHEN project creation is successful THEN the system SHALL display a confirmation message with the Project ID and next steps
4. WHEN stock minting is in progress THEN the system SHALL show progress updates and estimated completion time
5. WHEN any operation fails THEN the system SHALL provide clear error messages and suggested resolution steps
6. WHEN project creation is complete THEN the system SHALL send a confirmation email with project details and management links

### Requirement 7

**User Story:** As a system, I want to handle edge cases and error scenarios gracefully, so that users have a reliable experience even when issues occur.

#### Acceptance Criteria

1. WHEN duplicate project names are submitted THEN the system SHALL append a unique identifier to ensure uniqueness
2. WHEN network connectivity issues occur during minting THEN the system SHALL implement retry logic with exponential backoff
3. WHEN Hedera network is unavailable THEN the system SHALL queue minting requests and process them when connectivity is restored
4. WHEN insufficient wallet balance is detected THEN the system SHALL calculate and display the required gas fees before proceeding
5. WHEN database operations fail THEN the system SHALL rollback any partial changes and maintain data consistency
6. WHEN file upload fails THEN the system SHALL allow users to retry without losing other form data
7. WHEN session expires during project creation THEN the system SHALL save draft data and allow users to resume after re-authentication
