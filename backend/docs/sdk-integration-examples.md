# Sachain SDK Integration Examples

This document provides comprehensive examples for integrating the Sachain SDK into various applications and frameworks.

## Table of Contents

- [SDK Installation](#sdk-installation)
- [Basic Setup](#basic-setup)
- [React Integration](#react-integration)
- [Vue.js Integration](#vuejs-integration)
- [Node.js Backend Integration](#nodejs-backend-integration)
- [Mobile Integration](#mobile-integration)
- [Advanced Usage](#advanced-usage)

## SDK Installation

### NPM Installation

```bash
npm install @sachain/sdk
```

### Yarn Installation

```bash
yarn add @sachain/sdk
```

### CDN Usage

```html
<script src="https://unpkg.com/@sachain/sdk@latest/dist/sachain-sdk.min.js"></script>
```

## Basic Setup

### TypeScript Configuration

```typescript
import { SachainSDK, SachainConfig } from '@sachain/sdk';

const config: SachainConfig = {
  baseUrl: 'https://api.sachain.com/v1',
  cognitoConfig: {
    userPoolId: 'us-east-1_xxxxxxxxx',
    clientId: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
    region: 'us-east-1'
  },
  environment: 'production' // 'development' | 'staging' | 'production'
};

const sdk = new SachainSDK(config);
```

### JavaScript Configuration

```javascript
const { SachainSDK } = require('@sachain/sdk');

const sdk = new SachainSDK({
  baseUrl: 'https://api.sachain.com/v1',
  cognitoConfig: {
    userPoolId: 'us-east-1_xxxxxxxxx',
    clientId: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
    region: 'us-east-1'
  }
});
```

### Environment Configuration

```typescript
// config/sachain.ts
export const sachainConfig = {
  development: {
    baseUrl: 'http://localhost:3000/v1',
    cognitoConfig: {
      userPoolId: 'us-east-1_dev_pool',
      clientId: 'dev_client_id',
      region: 'us-east-1'
    }
  },
  staging: {
    baseUrl: 'https://staging-api.sachain.com/v1',
    cognitoConfig: {
      userPoolId: 'us-east-1_staging_pool',
      clientId: 'staging_client_id',
      region: 'us-east-1'
    }
  },
  production: {
    baseUrl: 'https://api.sachain.com/v1',
    cognitoConfig: {
      userPoolId: 'us-east-1_prod_pool',
      clientId: 'prod_client_id',
      region: 'us-east-1'
    }
  }
};

const environment = process.env.NODE_ENV || 'development';
export const config = sachainConfig[environment];
```

## React Integration

### Context Provider Setup

```typescript
// contexts/SachainContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { SachainSDK, User } from '@sachain/sdk';
import { config } from '../config/sachain';

interface SachainContextType {
  sdk: SachainSDK;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, attributes?: any) => Promise<void>;
}

const SachainContext = createContext<SachainContextType | undefined>(undefined);

export function SachainProvider({ children }: { children: React.ReactNode }) {
  const [sdk] = useState(() => new SachainSDK(config));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        const currentUser = await sdk.auth.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.log('No existing session');
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [sdk]);

  const signIn = async (email: string, password: string) => {
    const user = await sdk.auth.signIn(email, password);
    setUser(user);
  };

  const signOut = async () => {
    await sdk.auth.signOut();
    setUser(null);
  };

  const signUp = async (email: string, password: string, attributes?: any) => {
    await sdk.auth.signUp(email, password, attributes);
  };

  return (
    <SachainContext.Provider value={{
      sdk,
      user,
      loading,
      signIn,
      signOut,
      signUp
    }}>
      {children}
    </SachainContext.Provider>
  );
}

export function useSachain() {
  const context = useContext(SachainContext);
  if (!context) {
    throw new Error('useSachain must be used within SachainProvider');
  }
  return context;
}
```

### Custom Hooks

```typescript
// hooks/useProjects.ts
import { useState, useEffect } from 'react';
import { useSachain } from '../contexts/SachainContext';
import { Project } from '@sachain/sdk';

export function useProjects() {
  const { sdk } = useSachain();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async (filters?: any) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await sdk.projects.list(filters);
      setProjects(result.projects);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (projectData: any) => {
    setError(null);
    
    try {
      const project = await sdk.projects.create(projectData);
      setProjects(prev => [project, ...prev]);
      return project;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      throw err;
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return {
    projects,
    loading,
    error,
    fetchProjects,
    createProject
  };
}

// hooks/useStockMinting.ts
import { useState } from 'react';
import { useSachain } from '../contexts/SachainContext';

export function useStockMinting() {
  const { sdk } = useSachain();
  const [minting, setMinting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mintStocks = async (projectId: string, walletAddress: string) => {
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
      
      setProgress(100);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Minting failed');
      throw err;
    } finally {
      setMinting(false);
    }
  };

  return {
    mintStocks,
    minting,
    progress,
    error
  };
}
```

### React Components

```typescript
// components/ProjectCreationForm.tsx
import React, { useState } from 'react';
import { useProjects } from '../hooks/useProjects';

export function ProjectCreationForm() {
  const { createProject } = useProjects();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    stockSupply: 1000,
    targetFundingGoal: 0,
    pricePerStock: 0
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await createProject(formData);
      alert('Project created successfully!');
      // Reset form or redirect
    } catch (error) {
      alert('Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name">Project Name</label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
          minLength={3}
          maxLength={100}
        />
      </div>

      <div>
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          required
          minLength={50}
          maxLength={2000}
          rows={4}
        />
      </div>

      <div>
        <label htmlFor="category">Category</label>
        <select
          id="category"
          value={formData.category}
          onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
          required
        >
          <option value="">Select Category</option>
          <option value="Technology">Technology</option>
          <option value="Healthcare">Healthcare</option>
          <option value="CleanTech">CleanTech</option>
          {/* Add more categories */}
        </select>
      </div>

      <div>
        <label htmlFor="stockSupply">Stock Supply</label>
        <input
          id="stockSupply"
          type="number"
          value={formData.stockSupply}
          onChange={(e) => setFormData(prev => ({ ...prev, stockSupply: parseInt(e.target.value) }))}
          required
          min={1}
          max={1000000}
        />
      </div>

      <button type="submit" disabled={submitting}>
        {submitting ? 'Creating...' : 'Create Project'}
      </button>
    </form>
  );
}

// components/StockMintingComponent.tsx
import React, { useState } from 'react';
import { useStockMinting } from '../hooks/useStockMinting';

interface Props {
  projectId: string;
}

export function StockMintingComponent({ projectId }: Props) {
  const { mintStocks, minting, progress, error } = useStockMinting();
  const [walletAddress, setWalletAddress] = useState('');

  const handleMint = async () => {
    if (!walletAddress) {
      alert('Please enter wallet address');
      return;
    }

    try {
      await mintStocks(projectId, walletAddress);
      alert('Stocks minted successfully!');
    } catch (error) {
      console.error('Minting failed:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="wallet">Hedera Wallet Address</label>
        <input
          id="wallet"
          type="text"
          placeholder="0.0.123456"
          value={walletAddress}
          onChange={(e) => setWalletAddress(e.target.value)}
          pattern="^0\.0\.[0-9]+$"
        />
      </div>

      {minting && (
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          />
          <span>{progress}% Complete</span>
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <button 
        onClick={handleMint} 
        disabled={minting || !walletAddress}
      >
        {minting ? 'Minting...' : 'Mint Stocks'}
      </button>
    </div>
  );
}
```

## Vue.js Integration

### Vue 3 Composition API

```typescript
// composables/useSachain.ts
import { ref, reactive, onMounted } from 'vue';
import { SachainSDK } from '@sachain/sdk';
import { config } from '../config/sachain';

const sdk = new SachainSDK(config);
const user = ref(null);
const loading = ref(true);

export function useSachain() {
  const signIn = async (email: string, password: string) => {
    const result = await sdk.auth.signIn(email, password);
    user.value = result;
    return result;
  };

  const signOut = async () => {
    await sdk.auth.signOut();
    user.value = null;
  };

  const checkSession = async () => {
    try {
      const currentUser = await sdk.auth.getCurrentUser();
      user.value = currentUser;
    } catch (error) {
      console.log('No existing session');
    } finally {
      loading.value = false;
    }
  };

  onMounted(() => {
    checkSession();
  });

  return {
    sdk,
    user: readonly(user),
    loading: readonly(loading),
    signIn,
    signOut
  };
}

// composables/useProjects.ts
import { ref, reactive } from 'vue';
import { useSachain } from './useSachain';

export function useProjects() {
  const { sdk } = useSachain();
  const projects = ref([]);
  const loading = ref(false);
  const error = ref(null);

  const fetchProjects = async (filters = {}) => {
    loading.value = true;
    error.value = null;

    try {
      const result = await sdk.projects.list(filters);
      projects.value = result.projects;
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  const createProject = async (projectData) => {
    try {
      const project = await sdk.projects.create(projectData);
      projects.value.unshift(project);
      return project;
    } catch (err) {
      error.value = err.message;
      throw err;
    }
  };

  return {
    projects: readonly(projects),
    loading: readonly(loading),
    error: readonly(error),
    fetchProjects,
    createProject
  };
}
```

### Vue Component Example

```vue
<!-- components/ProjectForm.vue -->
<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <div>
      <label for="name">Project Name</label>
      <input
        id="name"
        v-model="form.name"
        type="text"
        required
        :minlength="3"
        :maxlength="100"
      />
    </div>

    <div>
      <label for="description">Description</label>
      <textarea
        id="description"
        v-model="form.description"
        required
        :minlength="50"
        :maxlength="2000"
        rows="4"
      />
    </div>

    <div>
      <label for="category">Category</label>
      <select id="category" v-model="form.category" required>
        <option value="">Select Category</option>
        <option value="Technology">Technology</option>
        <option value="Healthcare">Healthcare</option>
        <option value="CleanTech">CleanTech</option>
      </select>
    </div>

    <div>
      <label for="stockSupply">Stock Supply</label>
      <input
        id="stockSupply"
        v-model.number="form.stockSupply"
        type="number"
        required
        :min="1"
        :max="1000000"
      />
    </div>

    <button type="submit" :disabled="submitting">
      {{ submitting ? 'Creating...' : 'Create Project' }}
    </button>
  </form>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useProjects } from '../composables/useProjects';

const { createProject } = useProjects();

const submitting = ref(false);
const form = reactive({
  name: '',
  description: '',
  category: '',
  stockSupply: 1000,
  targetFundingGoal: 0,
  pricePerStock: 0
});

const handleSubmit = async () => {
  submitting.value = true;

  try {
    await createProject(form);
    alert('Project created successfully!');
    // Reset form
    Object.assign(form, {
      name: '',
      description: '',
      category: '',
      stockSupply: 1000,
      targetFundingGoal: 0,
      pricePerStock: 0
    });
  } catch (error) {
    alert('Failed to create project');
  } finally {
    submitting.value = false;
  }
};
</script>
```

## Node.js Backend Integration

### Express.js Middleware

```typescript
// middleware/sachain.ts
import { SachainSDK } from '@sachain/sdk';
import { Request, Response, NextFunction } from 'express';

const sdk = new SachainSDK({
  baseUrl: process.env.SACHAIN_API_URL,
  cognitoConfig: {
    userPoolId: process.env.COGNITO_USER_POOL_ID,
    clientId: process.env.COGNITO_CLIENT_ID,
    region: process.env.AWS_REGION
  }
});

export interface AuthenticatedRequest extends Request {
  user?: any;
  sdk: SachainSDK;
}

export async function authenticateUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token with Cognito
    const user = await sdk.auth.verifyToken(token);
    req.user = user;
    req.sdk = sdk;
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

### API Routes

```typescript
// routes/projects.ts
import { Router } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/sachain';

const router = Router();

// Get user's projects
router.get('/', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const projects = await req.sdk.projects.list({
      entrepreneurId: req.user.id
    });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new project
router.post('/', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const project = await req.sdk.projects.create(req.body);
    res.status(201).json(project);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Mint stocks
router.post('/:id/mint', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const { walletAddress } = req.body;
    const result = await req.sdk.projects.mintStocks(req.params.id, {
      walletAddress
    });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
```

### Background Jobs

```typescript
// jobs/stockMinting.ts
import { SachainSDK } from '@sachain/sdk';
import { Queue, Worker } from 'bullmq';

const sdk = new SachainSDK(config);

interface MintingJob {
  projectId: string;
  walletAddress: string;
  userId: string;
}

export const mintingQueue = new Queue<MintingJob>('stock-minting');

export const mintingWorker = new Worker<MintingJob>(
  'stock-minting',
  async (job) => {
    const { projectId, walletAddress, userId } = job.data;
    
    try {
      // Update job progress
      await job.updateProgress(0);
      
      const result = await sdk.projects.mintStocks(projectId, {
        walletAddress,
        onProgress: async (progress) => {
          await job.updateProgress(progress.percentage);
        }
      });
      
      // Notify user of completion
      await notifyUser(userId, 'Stocks minted successfully', result);
      
      return result;
    } catch (error) {
      // Notify user of failure
      await notifyUser(userId, 'Stock minting failed', { error: error.message });
      throw error;
    }
  }
);

async function notifyUser(userId: string, message: string, data: any) {
  // Implementation depends on your notification system
  console.log(`Notify ${userId}: ${message}`, data);
}
```

## Mobile Integration

### React Native Example

```typescript
// services/SachainService.ts
import { SachainSDK } from '@sachain/sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';

class SachainService {
  private sdk: SachainSDK;

  constructor() {
    this.sdk = new SachainSDK({
      baseUrl: 'https://api.sachain.com/v1',
      cognitoConfig: {
        userPoolId: 'us-east-1_xxxxxxxxx',
        clientId: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
        region: 'us-east-1'
      },
      storage: AsyncStorage // Use AsyncStorage for React Native
    });
  }

  async signIn(email: string, password: string) {
    const user = await this.sdk.auth.signIn(email, password);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    return user;
  }

  async signOut() {
    await this.sdk.auth.signOut();
    await AsyncStorage.removeItem('user');
  }

  async getCurrentUser() {
    try {
      const userJson = await AsyncStorage.getItem('user');
      return userJson ? JSON.parse(userJson) : null;
    } catch {
      return null;
    }
  }

  getSDK() {
    return this.sdk;
  }
}

export const sachainService = new SachainService();
```

### React Native Hook

```typescript
// hooks/useSachain.ts
import { useState, useEffect } from 'react';
import { sachainService } from '../services/SachainService';

export function useSachain() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const currentUser = await sachainService.getCurrentUser();
      setUser(currentUser);
      setLoading(false);
    };

    checkUser();
  }, []);

  const signIn = async (email: string, password: string) => {
    const user = await sachainService.signIn(email, password);
    setUser(user);
    return user;
  };

  const signOut = async () => {
    await sachainService.signOut();
    setUser(null);
  };

  return {
    user,
    loading,
    signIn,
    signOut,
    sdk: sachainService.getSDK()
  };
}
```

## Advanced Usage

### Custom Error Handling

```typescript
// utils/errorHandler.ts
import { SachainError, ErrorCode } from '@sachain/sdk';

export class CustomErrorHandler {
  static handle(error: any): string {
    if (error instanceof SachainError) {
      switch (error.code) {
        case ErrorCode.KYC_NOT_VERIFIED:
          return 'Please complete KYC verification first.';
        case ErrorCode.INSUFFICIENT_BALANCE:
          return 'Insufficient wallet balance for this operation.';
        case ErrorCode.PROJECT_NOT_FOUND:
          return 'Project not found or access denied.';
        default:
          return error.message;
      }
    }
    
    return 'An unexpected error occurred.';
  }

  static shouldRetry(error: any): boolean {
    if (error instanceof SachainError) {
      return [
        ErrorCode.NETWORK_ERROR,
        ErrorCode.RATE_LIMIT_EXCEEDED,
        ErrorCode.SERVICE_UNAVAILABLE
      ].includes(error.code);
    }
    
    return false;
  }
}
```

### Caching Strategy

```typescript
// utils/cache.ts
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class SDKCache {
  private cache = new Map<string, CacheItem<any>>();

  set<T>(key: string, data: T, ttl: number = 300000): void { // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }
}

// Enhanced SDK with caching
export class CachedSachainSDK extends SachainSDK {
  private cache = new SDKCache();

  async getProjectsCached(filters?: any): Promise<any> {
    const cacheKey = `projects_${JSON.stringify(filters || {})}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    const result = await this.projects.list(filters);
    this.cache.set(cacheKey, result, 60000); // 1 minute cache
    
    return result;
  }
}
```

### Batch Operations

```typescript
// utils/batchOperations.ts
export class BatchOperations {
  constructor(private sdk: SachainSDK) {}

  async batchCreateProjects(projects: any[]): Promise<any[]> {
    const results = [];
    const batchSize = 5; // Process 5 at a time

    for (let i = 0; i < projects.length; i += batchSize) {
      const batch = projects.slice(i, i + batchSize);
      
      const batchPromises = batch.map(project => 
        this.sdk.projects.create(project).catch(error => ({ error, project }))
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Add delay between batches to avoid rate limiting
      if (i + batchSize < projects.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}
```

This comprehensive SDK integration guide provides examples for various frameworks and use cases. The SDK is designed to be flexible and can be adapted to different application architectures and requirements.