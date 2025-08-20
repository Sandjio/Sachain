# Sachain Infrastructure Stacks

This directory contains the modular CDK stacks that make up the Sachain infrastructure.

## CoreStack

The CoreStack provides foundational resources for the Sachain platform:

- **DynamoDB Table**: Single table design for KYC and user data
- **S3 Bucket**: Encrypted document storage with lifecycle policies
- **KMS Key**: Encryption key for S3 bucket with automatic rotation

### Usage

```typescript
import { CoreStack } from "./core-stack";

const coreStack = new CoreStack(app, "SachainCoreStack", {
  environment: "dev",
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

// Access resources for cross-stack references
const tableName = coreStack.table.tableName;
const bucketName = coreStack.documentBucket.bucketName;
const kmsKeyArn = coreStack.encryptionKey.keyArn;
```

### Exports

The CoreStack exports the following values for cross-stack references:

- `TableName`: DynamoDB table name
- `TableArn`: DynamoDB table ARN
- `BucketName`: S3 bucket name
- `BucketArn`: S3 bucket ARN
- `KmsKeyArn`: KMS key ARN
- `KmsKeyId`: KMS key ID

### Dependencies

The CoreStack has no dependencies and can be deployed independently.

### Resources Created

1. **DynamoDB Table**

   - Single table design with partition key (PK) and sort key (SK)
   - Two Global Secondary Indexes (GSI1, GSI2)
   - Point-in-time recovery enabled
   - DynamoDB Streams enabled
   - Pay-per-request billing

2. **S3 Bucket**

   - KMS encryption with customer-managed key
   - Versioning enabled
   - Public access blocked
   - Lifecycle policies for cost optimization
   - CORS configuration for web uploads

3. **KMS Key**
   - Automatic key rotation enabled
   - Proper key policy for Lambda access
   - Environment-specific retention policy
