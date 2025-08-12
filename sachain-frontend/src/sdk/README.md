# Sachain Frontend SDK

TypeScript SDK for integrating with the Sachain platform APIs.

## Installation

```bash
npm install amazon-cognito-identity-js
```

## Usage

### Initialize SDK

```typescript
import { SachainSDK } from './sdk';

const sdk = new SachainSDK({
  apiBaseUrl: 'https://api.sachain.com',
  cognito: {
    userPoolId: 'us-east-1_xxxxxxxxx',
    clientId: 'your-client-id',
    region: 'us-east-1',
  },
});
```

### Authentication

```typescript
// Sign up
const signUpResult = await sdk.auth.signUp({
  email: 'user@example.com',
  password: 'SecurePassword123!',
  firstName: 'John',
  lastName: 'Doe',
  userType: 'investor',
});

// Sign in
const signInResult = await sdk.auth.signIn({
  email: 'user@example.com',
  password: 'SecurePassword123!',
});

// Get current session
const session = await sdk.auth.getCurrentSession();

// Sign out
sdk.auth.signOut();
```

### KYC Document Upload

```typescript
// Upload document with progress tracking
const uploadResult = await sdk.kyc.uploadDocument({
  file: selectedFile,
  documentType: 'national_id',
  onProgress: (progress) => {
    console.log(`Upload progress: ${progress}%`);
  },
});

// Get user documents
const documentsResult = await sdk.kyc.getDocuments();
```

### File Validation

```typescript
const validation = sdk.kyc.validateFile(file);
if (!validation.isValid) {
  console.error('File validation errors:', validation.errors);
}
```

## API Types

The SDK exports TypeScript interfaces for all API responses:

- `UserProfile` - User profile data
- `KYCDocument` - KYC document information
- `UploadRequest` - File upload request
- `UploadResponse` - File upload response
- `ApiResponse<T>` - Generic API response wrapper

## Testing

```bash
npm test
```

## Error Handling

All SDK methods return results with a consistent structure:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

Always check the `success` field before accessing `data`.