# Project Creation & Stock Minting API Examples

This document provides comprehensive examples for using the Sachain Project Creation and Stock Minting APIs.

## Table of Contents

- [Project Creation Examples](#project-creation-examples)
- [Stock Minting Examples](#stock-minting-examples)
- [Project Management Examples](#project-management-examples)
- [Stock Query Examples](#stock-query-examples)
- [Error Handling](#error-handling)
- [SDK Integration](#sdk-integration)

## Project Creation Examples

### Basic Project Creation

```typescript
async function createBasicProject() {
  const projectData = {
    name: "EcoTech Solutions",
    description: "Revolutionary solar panel technology that increases efficiency by 40% while reducing manufacturing costs. Our patented nano-coating process enables better light absorption and weather resistance.",
    category: "CleanTech",
    stockSupply: 10000,
    targetFundingGoal: 500000,
    pricePerStock: 50
  };

  const response = await fetch('/api/v1/projects', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cognitoJwtToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(projectData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Project creation failed: ${error.message}`);
  }

  const result = await response.json();
  console.log('Project created:', result.projectId);
  return result;
}
```

### Project Creation with Validation

```typescript
interface ProjectValidation {
  isValid: boolean;
  errors: string[];
}

function validateProjectData(data: any): ProjectValidation {
  const errors: string[] = [];

  // Name validation
  if (!data.name || data.name.length < 3 || data.name.length > 100) {
    errors.push('Project name must be between 3-100 characters');
  }

  // Description validation
  if (!data.description || data.description.length < 50 || data.description.length > 2000) {
    errors.push('Project description must be between 50-2000 characters');
  }

  // Category validation
  const validCategories = [
    'Technology', 'Healthcare', 'FinTech', 'CleanTech', 'Education',
    'E-commerce', 'Manufacturing', 'Agriculture', 'Real Estate',
    'Entertainment', 'Food & Beverage', 'Transportation', 'Other'
  ];
  if (!data.category || !validCategories.includes(data.category)) {
    errors.push('Invalid project category');
  }

  // Stock supply validation
  if (!data.stockSupply || data.stockSupply < 1 || data.stockSupply > 1000000) {
    errors.push('Stock supply must be between 1 and 1,000,000');
  }

  // Optional fields validation
  if (data.targetFundingGoal && (data.targetFundingGoal < 0 || data.targetFundingGoal > 99999999.99)) {
    errors.push('Target funding goal must be between 0 and 99,999,999.99');
  }

  if (data.pricePerStock && (data.pricePerStock < 0 || data.pricePerStock > 99999999.99999999)) {
    errors.push('Price per stock must be between 0 and 99,999,999.99999999');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

async function createValidatedProject(projectData: any) {
  const validation = validateProjectData(projectData);
  
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }

  return await createBasicProject();
}
```

### Project Creation with Cover Image

```typescript
async function createProjectWithImage(projectData: any, imageFile: File) {
  // First create the project
  const project = await createBasicProject();
  
  // Then upload the cover image
  const imageFormData = new FormData();
  imageFormData.append('image', imageFile);

  const imageResponse = await fetch(`/api/v1/projects/${project.projectId}/cover-image`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cognitoJwtToken}`
    },
    body: imageFormData
  });

  if (!imageResponse.ok) {
    console.warn('Image upload failed, but project was created successfully');
  }

  return project;
}
```

## Stock Minting Examples

### Basic Stock Minting

```typescript
async function mintProjectStocks(projectId: string, walletAddress: string) {
  const mintingData = {
    walletAddress: walletAddress // Format: "0.0.123456"
  };

  const response = await fetch(`/api/v1/projects/${projectId}/mint-stocks`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cognitoJwtToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(mintingData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Stock minting failed: ${error.message}`);
  }

  const result = await response.json();
  console.log('Minting completed:', result.tokenId);
  return result;
}
```

### Stock Minting with Progress Tracking

```typescript
async function mintStocksWithProgress(
  projectId: string, 
  walletAddress: string,
  onProgress?: (progress: any) => void
) {
  // Start minting
  const mintingResponse = await fetch(`/api/v1/projects/${projectId}/mint-stocks`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cognitoJwtToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ walletAddress })
  });

  if (!mintingResponse.ok) {
    const error = await mintingResponse.json();
    throw new Error(`Minting failed: ${error.message}`);
  }

  // Poll for progress updates
  let completed = false;
  while (!completed) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

    const statusResponse = await fetch(`/api/v1/projects/${projectId}/mint-stocks/status`, {
      headers: {
        'Authorization': `Bearer ${cognitoJwtToken}`
      }
    });

    if (statusResponse.ok) {
      const status = await statusResponse.json();
      
      if (onProgress) {
        onProgress(status.progress);
      }

      if (status.progress.status === 'completed') {
        completed = true;
        return status;
      } else if (status.progress.status === 'failed') {
        throw new Error('Minting failed');
      }
    }
  }
}
```

### Wallet Validation

```typescript
function validateHederaWallet(walletAddress: string): boolean {
  // Hedera wallet format: 0.0.accountId
  const hederaWalletRegex = /^0\.0\.[0-9]+$/;
  return hederaWalletRegex.test(walletAddress);
}

async function mintWithValidation(projectId: string, walletAddress: string) {
  if (!validateHederaWallet(walletAddress)) {
    throw new Error('Invalid Hedera wallet address format. Expected: 0.0.accountId');
  }

  return await mintProjectStocks(projectId, walletAddress);
}
```

## Project Management Examples

### Update Project Details

```typescript
async function updateProject(projectId: string, updates: any) {
  const response = await fetch(`/api/v1/projects/${projectId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${cognitoJwtToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Project update failed: ${error.message}`);
  }

  return await response.json();
}

// Example usage
await updateProject('proj-123', {
  name: 'EcoTech Solutions v2',
  description: 'Updated description with new features',
  pricePerStock: 55
});
```

### Project Status Management

```typescript
async function updateProjectStatus(
  projectId: string, 
  newStatus: 'draft' | 'minting' | 'active' | 'paused' | 'completed',
  reason?: string
) {
  const response = await fetch(`/api/v1/projects/${projectId}/status`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${cognitoJwtToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      newStatus,
      reason
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Status update failed: ${error.message}`);
  }

  return await response.json();
}

// Example: Pause a project
await updateProjectStatus('proj-123', 'paused', 'Temporary maintenance');
```

### Delete Project

```typescript
async function deleteProject(projectId: string) {
  const response = await fetch(`/api/v1/projects/${projectId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${cognitoJwtToken}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Project deletion failed: ${error.message}`);
  }

  return await response.json();
}
```

## Stock Query Examples

### Get Project Stocks

```typescript
async function getProjectStocks(
  projectId: string,
  options: {
    status?: 'minted' | 'listed' | 'sold' | 'transferred';
    limit?: number;
    includeMetadata?: boolean;
  } = {}
) {
  const params = new URLSearchParams();
  
  if (options.status) params.append('status', options.status);
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.includeMetadata) params.append('includeMetadata', 'true');

  const response = await fetch(`/api/v1/projects/${projectId}/stocks?${params}`, {
    headers: {
      'Authorization': `Bearer ${cognitoJwtToken}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to fetch stocks: ${error.message}`);
  }

  return await response.json();
}
```

### Get Investor Portfolio

```typescript
async function getInvestorPortfolio(walletAddress: string) {
  const response = await fetch(`/api/v1/stocks/portfolio?walletAddress=${walletAddress}`, {
    headers: {
      'Authorization': `Bearer ${cognitoJwtToken}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to fetch portfolio: ${error.message}`);
  }

  return await response.json();
}
```

### Query Projects with Filters

```typescript
async function queryProjects(filters: {
  status?: string;
  category?: string;
  sortBy?: 'createdAt' | 'name' | 'status';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  includeStats?: boolean;
}) {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) {
      params.append(key, value.toString());
    }
  });

  const response = await fetch(`/api/v1/projects?${params}`, {
    headers: {
      'Authorization': `Bearer ${cognitoJwtToken}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to query projects: ${error.message}`);
  }

  return await response.json();
}

// Example: Get active CleanTech projects
const cleanTechProjects = await queryProjects({
  status: 'active',
  category: 'CleanTech',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  includeStats: true
});
```

## Error Handling

### Project-Specific Error Codes

```typescript
interface ProjectError {
  message: string;
  code: string;
  details?: any;
  requestId: string;
}

function handleProjectError(error: ProjectError) {
  switch (error.code) {
    case 'INVALID_PROJECT_DATA':
      return 'Please check your project information and try again.';
    
    case 'KYC_NOT_VERIFIED':
      return 'Please complete KYC verification before creating projects.';
    
    case 'PROJECT_NAME_EXISTS':
      return 'A project with this name already exists. Please choose a different name.';
    
    case 'INVALID_PROJECT_STATUS':
      return 'This operation is not allowed for the current project status.';
    
    case 'INSUFFICIENT_BALANCE':
      return `Insufficient wallet balance. Required: ${error.details?.requiredAmount} HBAR`;
    
    case 'TOKEN_CREATION_FAILED':
      return 'Failed to create token on Hedera network. Please try again.';
    
    case 'NFT_MINTING_FAILED':
      return 'Stock minting failed. Please check your wallet and try again.';
    
    default:
      return error.message || 'An unexpected error occurred.';
  }
}
```

### Retry Logic for Hedera Operations

```typescript
async function withHederaRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on client errors
      if (error instanceof Error && error.message.includes('INVALID_')) {
        throw error;
      }
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Exponential backoff for Hedera network issues
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}
```

## SDK Integration

### TypeScript SDK Usage

```typescript
import { SachainSDK } from '@sachain/sdk';

// Initialize SDK
const sdk = new SachainSDK({
  baseUrl: 'https://api.sachain.com/v1',
  cognitoConfig: {
    userPoolId: 'us-east-1_xxxxxxxxx',
    clientId: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
    region: 'us-east-1'
  }
});

// Authenticate
await sdk.auth.signIn('entrepreneur@example.com', 'password');

// Create project
const project = await sdk.projects.create({
  name: 'My Startup',
  description: 'Innovative solution for...',
  category: 'Technology',
  stockSupply: 5000,
  targetFundingGoal: 250000,
  pricePerStock: 50
});

// Mint stocks
const mintingResult = await sdk.projects.mintStocks(project.projectId, {
  walletAddress: '0.0.123456',
  onProgress: (progress) => {
    console.log(`Minting progress: ${progress.percentage}%`);
  }
});

// Query projects
const myProjects = await sdk.projects.list({
  status: 'active',
  includeStats: true
});
```

### React Hook Examples

```typescript
import { useState, useCallback } from 'react';
import { SachainSDK } from '@sachain/sdk';

export function useProjectCreation() {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProject = useCallback(async (projectData: any) => {
    setCreating(true);
    setError(null);

    try {
      const result = await sdk.projects.create(projectData);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Project creation failed';
      setError(errorMessage);
      throw err;
    } finally {
      setCreating(false);
    }
  }, []);

  return { createProject, creating, error };
}

export function useStockMinting() {
  const [minting, setMinting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mintStocks = useCallback(async (projectId: string, walletAddress: string) => {
    setMinting(true);
    setError(null);
    setProgress(0);

    try {
      const result = await sdk.projects.mintStocks(projectId, {
        walletAddress,
        onProgress: (progressData) => {
          setProgress(progressData.percentage);
        }
      });
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Stock minting failed';
      setError(errorMessage);
      throw err;
    } finally {
      setMinting(false);
    }
  }, []);

  return { mintStocks, minting, progress, error };
}
```

### Complete Project Workflow Example

```typescript
async function completeProjectWorkflow() {
  try {
    // 1. Create project
    console.log('Creating project...');
    const project = await sdk.projects.create({
      name: 'Green Energy Startup',
      description: 'Revolutionary battery technology for electric vehicles...',
      category: 'CleanTech',
      stockSupply: 10000,
      targetFundingGoal: 1000000,
      pricePerStock: 100
    });
    
    console.log('Project created:', project.projectId);

    // 2. Upload cover image (optional)
    if (coverImageFile) {
      console.log('Uploading cover image...');
      await sdk.projects.uploadCoverImage(project.projectId, coverImageFile);
    }

    // 3. Mint stocks
    console.log('Minting stocks...');
    const mintingResult = await sdk.projects.mintStocks(project.projectId, {
      walletAddress: '0.0.123456',
      onProgress: (progress) => {
        console.log(`Minting: ${progress.percentage}% complete`);
      }
    });

    console.log('Stocks minted successfully!');
    console.log('Token ID:', mintingResult.tokenId);
    console.log('Total minted:', mintingResult.totalMinted);

    // 4. Query the minted stocks
    const stocks = await sdk.projects.getStocks(project.projectId, {
      includeMetadata: true
    });

    console.log('Project workflow completed successfully!');
    return {
      project,
      mintingResult,
      stocks
    };

  } catch (error) {
    console.error('Project workflow failed:', error);
    throw error;
  }
}
```

This comprehensive guide provides practical examples for integrating with the Sachain Project Creation and Stock Minting APIs. For additional support, refer to the OpenAPI specification or contact the development team.