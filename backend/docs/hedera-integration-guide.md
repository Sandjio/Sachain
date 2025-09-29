# Hedera Token Service Integration Guide

This guide provides comprehensive information about integrating with Hedera Token Service (HTS) through the Sachain platform for tokenizing project shares as NFTs.

## Table of Contents

- [Hedera Overview](#hedera-overview)
- [Token Creation Process](#token-creation-process)
- [NFT Minting](#nft-minting)
- [Wallet Integration](#wallet-integration)
- [Gas Fees and Costs](#gas-fees-and-costs)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Hedera Overview

### What is Hedera Token Service?

Hedera Token Service (HTS) is a native tokenization service on the Hedera network that enables:
- Creation of fungible and non-fungible tokens
- Built-in compliance and regulatory features
- Low, predictable fees
- High throughput and fast finality
- Enterprise-grade security

### Why Hedera for Sachain?

- **Low Fees**: Predictable, low-cost transactions (typically $0.0001 per transaction)
- **Fast Finality**: 3-5 second transaction finality
- **Regulatory Compliance**: Built-in KYC/AML features
- **Enterprise Ready**: Governed by leading global organizations
- **Environmental Sustainability**: Carbon-negative network

## Token Creation Process

### Project Token Structure

Each Sachain project creates a unique HTS token with the following properties:

```typescript
interface ProjectToken {
  tokenId: string;           // Hedera token ID (e.g., "0.0.123456")
  tokenName: string;         // Project name + " Shares"
  tokenSymbol: string;       // Derived from project name (e.g., "ECOTECH")
  totalSupply: number;       // Total number of stock NFTs
  treasuryAccount: string;   // Entrepreneur's Hedera account
  metadata: ProjectMetadata; // IPFS metadata URI
}
```

### Token Creation Flow

1. **Validation**: Verify project and wallet requirements
2. **Metadata Upload**: Store project metadata on IPFS
3. **Token Creation**: Create HTS token with project details
4. **NFT Minting**: Mint individual stock NFTs
5. **Status Update**: Update project status to "active"

### Example Token Creation

```typescript
// Token creation parameters
const tokenParams = {
  tokenName: "EcoTech Solutions Shares",
  tokenSymbol: "ECOTECH",
  totalSupply: 10000,
  treasuryAccount: "0.0.123456",
  metadata: {
    name: "EcoTech Solutions",
    description: "Revolutionary solar panel technology...",
    image: "https://s3.amazonaws.com/sachain-images/proj-789/cover.jpg",
    external_url: "https://sachain.com/projects/proj-789",
    attributes: [
      { trait_type: "Category", value: "CleanTech" },
      { trait_type: "Total Supply", value: 10000 },
      { trait_type: "Price Per Stock", value: 50 }
    ]
  }
};
```

## NFT Minting

### Stock NFT Structure

Each stock is represented as a unique NFT with:

```typescript
interface StockNFT {
  tokenId: string;        // Parent token ID
  serialNumber: number;   // Unique serial number (1-N)
  metadata: StockMetadata; // Individual stock metadata
  owner: string;          // Current owner's Hedera account
}

interface StockMetadata {
  name: string;           // "EcoTech Solutions Stock #42"
  description: string;    // Stock-specific description
  image: string;          // Project image URL
  external_url: string;   // Link to stock details
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  project_id: string;     // Sachain project ID
  stock_number: number;   // Stock number within project
}
```

### Batch Minting Process

Stocks are minted in batches for efficiency:

```typescript
const BATCH_SIZE = 50; // NFTs per batch
const totalBatches = Math.ceil(stockSupply / BATCH_SIZE);

for (let batch = 0; batch < totalBatches; batch++) {
  const batchStart = batch * BATCH_SIZE + 1;
  const batchEnd = Math.min((batch + 1) * BATCH_SIZE, stockSupply);
  const batchSize = batchEnd - batchStart + 1;
  
  // Create metadata for each NFT in batch
  const batchMetadata = [];
  for (let i = batchStart; i <= batchEnd; i++) {
    batchMetadata.push(createStockMetadata(projectId, i));
  }
  
  // Mint batch of NFTs
  const result = await hederaService.mintNFTs({
    tokenId,
    quantity: batchSize,
    metadata: batchMetadata
  });
  
  // Update progress
  const progress = Math.round((batchEnd / stockSupply) * 100);
  await updateMintingProgress(projectId, progress);
}
```

### Metadata Standards

Stock NFT metadata follows OpenSea standards:

```json
{
  "name": "EcoTech Solutions Stock #42",
  "description": "Share #42 of EcoTech Solutions representing fractional ownership in revolutionary solar panel technology.",
  "image": "https://s3.amazonaws.com/sachain-images/proj-789/cover.jpg",
  "external_url": "https://sachain.com/projects/proj-789/stocks/42",
  "attributes": [
    {
      "trait_type": "Project",
      "value": "EcoTech Solutions"
    },
    {
      "trait_type": "Category", 
      "value": "CleanTech"
    },
    {
      "trait_type": "Stock Number",
      "value": 42
    },
    {
      "trait_type": "Total Supply",
      "value": 10000
    },
    {
      "trait_type": "Mint Date",
      "value": "2024-01-15"
    }
  ],
  "project_id": "proj-789",
  "stock_number": 42
}
```

## Wallet Integration

### Supported Wallets

Sachain supports integration with popular Hedera wallets:

- **HashPack**: Browser extension and mobile wallet
- **Blade Wallet**: Multi-chain wallet with Hedera support
- **Yamgo**: Mobile-first Hedera wallet
- **Wallawallet**: Enterprise Hedera wallet

### Wallet Connection Flow

```typescript
// Example wallet connection
async function connectWallet(): Promise<string> {
  if (window.hashconnect) {
    // HashPack integration
    const hashconnect = new HashConnect();
    await hashconnect.init();
    
    const pairing = await hashconnect.connectToLocalWallet();
    return pairing.accountIds[0]; // Returns account ID like "0.0.123456"
  }
  
  throw new Error('No supported wallet found');
}

// Validate wallet format
function validateHederaAccount(accountId: string): boolean {
  const hederaAccountRegex = /^0\.0\.[0-9]+$/;
  return hederaAccountRegex.test(accountId);
}
```

### Account Requirements

For stock minting, the entrepreneur's Hedera account must:

1. **Have sufficient HBAR balance** for transaction fees
2. **Be associated with the token** (automatic during creation)
3. **Have proper permissions** for minting operations

### Balance Checking

```typescript
async function checkWalletBalance(accountId: string): Promise<number> {
  const response = await fetch(`https://mainnet-public.mirrornode.hedera.com/api/v1/accounts/${accountId}`);
  const data = await response.json();
  
  // Convert tinybars to HBAR (1 HBAR = 100,000,000 tinybars)
  return data.balance.balance / 100000000;
}

async function estimateGasFees(stockSupply: number): Promise<number> {
  // Token creation: ~$2
  const tokenCreationFee = 2;
  
  // NFT minting: ~$0.05 per NFT
  const mintingFees = stockSupply * 0.05;
  
  // Additional operations: ~$0.50
  const additionalFees = 0.5;
  
  return tokenCreationFee + mintingFees + additionalFees;
}
```

## Gas Fees and Costs

### Fee Structure

| Operation | Cost (USD) | Cost (HBAR) | Notes |
|-----------|------------|-------------|-------|
| Token Creation | ~$2.00 | ~20 HBAR | One-time fee per project |
| NFT Mint | ~$0.05 | ~0.5 HBAR | Per stock NFT |
| Token Association | ~$0.05 | ~0.5 HBAR | Per investor wallet |
| NFT Transfer | ~$0.001 | ~0.01 HBAR | Per transfer |

### Cost Calculation

```typescript
function calculateMintingCosts(stockSupply: number): {
  tokenCreation: number;
  nftMinting: number;
  total: number;
  totalHBAR: number;
} {
  const tokenCreation = 2.00; // USD
  const nftMinting = stockSupply * 0.05; // USD
  const total = tokenCreation + nftMinting;
  
  // Approximate HBAR conversion (1 HBAR ≈ $0.10)
  const totalHBAR = total / 0.10;
  
  return {
    tokenCreation,
    nftMinting,
    total,
    totalHBAR
  };
}

// Example for 10,000 stocks
const costs = calculateMintingCosts(10000);
console.log(`Total cost: $${costs.total} (${costs.totalHBAR} HBAR)`);
// Output: Total cost: $502 (5020 HBAR)
```

### Fee Optimization

To minimize costs:

1. **Batch Operations**: Mint NFTs in batches of 50
2. **Efficient Metadata**: Use IPFS for metadata storage
3. **Lazy Minting**: Consider minting on-demand for large supplies
4. **Treasury Management**: Use treasury account for initial ownership

## Error Handling

### Common Hedera Errors

```typescript
enum HederaErrorCodes {
  INSUFFICIENT_ACCOUNT_BALANCE = 'INSUFFICIENT_ACCOUNT_BALANCE',
  INVALID_ACCOUNT_ID = 'INVALID_ACCOUNT_ID',
  TOKEN_NOT_FOUND = 'TOKEN_NOT_FOUND',
  TRANSACTION_EXPIRED = 'TRANSACTION_EXPIRED',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE'
}

function handleHederaError(error: any): string {
  switch (error.status?.toString()) {
    case 'INSUFFICIENT_ACCOUNT_BALANCE':
      return 'Insufficient HBAR balance for transaction fees';
    
    case 'INVALID_ACCOUNT_ID':
      return 'Invalid Hedera account ID format';
    
    case 'TOKEN_NOT_FOUND':
      return 'Token does not exist on Hedera network';
    
    case 'TRANSACTION_EXPIRED':
      return 'Transaction expired. Please try again';
    
    case 'NETWORK_TIMEOUT':
      return 'Hedera network timeout. Please retry';
    
    default:
      return `Hedera error: ${error.message || 'Unknown error'}`;
  }
}
```

### Retry Strategy

```typescript
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on permanent errors
      if (error.status === 'INSUFFICIENT_ACCOUNT_BALANCE' ||
          error.status === 'INVALID_ACCOUNT_ID') {
        throw error;
      }
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Exponential backoff with jitter
      const delay = Math.min(
        1000 * Math.pow(2, attempt) + Math.random() * 1000,
        10000
      );
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}
```

## Best Practices

### 1. Account Management

```typescript
// Always validate account format
function validateAccount(accountId: string): void {
  if (!/^0\.0\.[0-9]+$/.test(accountId)) {
    throw new Error('Invalid Hedera account format');
  }
}

// Check account exists and is active
async function verifyAccount(accountId: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://mainnet-public.mirrornode.hedera.com/api/v1/accounts/${accountId}`
    );
    return response.ok;
  } catch {
    return false;
  }
}
```

### 2. Transaction Monitoring

```typescript
async function monitorTransaction(transactionId: string): Promise<any> {
  const maxAttempts = 30; // 30 seconds timeout
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(
        `https://mainnet-public.mirrornode.hedera.com/api/v1/transactions/${transactionId}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.transactions?.[0]?.result === 'SUCCESS') {
          return data.transactions[0];
        }
      }
    } catch (error) {
      console.warn('Transaction monitoring error:', error);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error('Transaction monitoring timeout');
}
```

### 3. Metadata Management

```typescript
// Ensure metadata is properly formatted
function validateMetadata(metadata: any): void {
  const required = ['name', 'description', 'image'];
  
  for (const field of required) {
    if (!metadata[field]) {
      throw new Error(`Missing required metadata field: ${field}`);
    }
  }
  
  // Validate image URL
  if (!isValidUrl(metadata.image)) {
    throw new Error('Invalid image URL in metadata');
  }
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
```

### 4. Batch Processing

```typescript
async function processBatches<T>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<void>,
  onProgress?: (completed: number, total: number) => void
): Promise<void> {
  const totalBatches = Math.ceil(items.length / batchSize);
  
  for (let i = 0; i < totalBatches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, items.length);
    const batch = items.slice(start, end);
    
    await processor(batch);
    
    if (onProgress) {
      onProgress(end, items.length);
    }
  }
}
```

## Troubleshooting

### Common Issues

#### Issue: "Insufficient Account Balance"
**Cause**: Not enough HBAR for transaction fees  
**Solution**: 
```typescript
// Check balance before operations
const balance = await checkWalletBalance(accountId);
const requiredFees = await estimateGasFees(stockSupply);

if (balance < requiredFees) {
  throw new Error(`Insufficient balance. Required: ${requiredFees} HBAR, Available: ${balance} HBAR`);
}
```

#### Issue: "Token Creation Failed"
**Cause**: Network issues or invalid parameters  
**Solution**:
```typescript
// Validate all parameters before creation
validateAccount(treasuryAccount);
validateMetadata(tokenMetadata);

// Use retry logic for network issues
const token = await executeWithRetry(() => 
  hederaService.createToken(tokenParams)
);
```

#### Issue: "NFT Minting Timeout"
**Cause**: Large batch sizes or network congestion  
**Solution**:
```typescript
// Reduce batch size for large supplies
const batchSize = stockSupply > 1000 ? 25 : 50;

// Add timeout handling
const mintingPromise = mintNFTBatch(batch);
const timeoutPromise = new Promise((_, reject) => 
  setTimeout(() => reject(new Error('Minting timeout')), 60000)
);

await Promise.race([mintingPromise, timeoutPromise]);
```

### Debug Information

When reporting Hedera-related issues, include:

1. **Transaction ID**: Hedera transaction identifier
2. **Account ID**: Entrepreneur's Hedera account
3. **Token ID**: Created token identifier (if applicable)
4. **Error Code**: Hedera-specific error code
5. **Network**: Mainnet or Testnet
6. **Timestamp**: When the error occurred

### Support Resources

- **Hedera Documentation**: https://docs.hedera.com/
- **Mirror Node API**: https://docs.hedera.com/hedera/sdks-and-apis/rest-api
- **Hedera Discord**: https://discord.com/invite/hedera
- **Sachain Support**: support@sachain.com

### Testing on Testnet

For development and testing:

```typescript
const TESTNET_CONFIG = {
  networkId: 'testnet',
  mirrorNodeUrl: 'https://testnet.mirrornode.hedera.com',
  consensusNodeUrl: 'https://testnet.hedera.com'
};

// Use testnet accounts for development
const testAccount = '0.0.34567890'; // Testnet account
```

This guide provides comprehensive information for integrating with Hedera Token Service through Sachain. For additional support, contact the development team or refer to the Hedera documentation.