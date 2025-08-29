import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { EventBridgeClient } from "@aws-sdk/client-eventbridge";
import { S3Client } from "@aws-sdk/client-s3";

// Global test setup for E2E tests
export const setupE2ETests = () => {
  // Mock AWS clients
  const dynamoMock = mockClient(DynamoDBClient);
  const eventBridgeMock = mockClient(EventBridgeClient);
  const s3Mock = mockClient(S3Client);

  // Setup default mock responses
  dynamoMock.resolves({});
  eventBridgeMock.resolves({});
  s3Mock.resolves({});

  // Setup environment variables
  process.env.AWS_REGION = "us-east-1";
  process.env.TABLE_NAME = "sachain-test-table";
  process.env.EVENT_BUS_NAME = "sachain-test-events";
  process.env.S3_BUCKET_NAME = "sachain-test-bucket";
  process.env.FRONTEND_URL = "https://test.sachain.io";
  process.env.HEDERA_NETWORK = "testnet";
  process.env.IPFS_GATEWAY_URL = "https://test-ipfs.sachain.io";

  return {
    dynamoMock,
    eventBridgeMock,
    s3Mock,
  };
};

export const createMockProject = (overrides: any = {}) => ({
  PK: `PROJECT#${overrides.projectId || "proj-123"}`,
  SK: "METADATA",
  projectId: overrides.projectId || "proj-123",
  entrepreneurId: overrides.entrepreneurId || "user-456",
  name: overrides.name || "Test Project",
  description: overrides.description || "A test project",
  category: overrides.category || "Technology",
  stockSupply: overrides.stockSupply || 100,
  status: overrides.status || "draft",
  createdAt: overrides.createdAt || "2024-01-15T10:00:00Z",
  updatedAt: overrides.updatedAt || "2024-01-15T10:00:00Z",
  GSI3PK: `PROJECT_STATUS#${overrides.status || "draft"}`,
  GSI3SK: overrides.createdAt || "2024-01-15T10:00:00Z",
  ...overrides,
});

export const createMockStock = (overrides: any = {}) => ({
  PK: `PROJECT#${overrides.projectId || "proj-123"}`,
  SK: `STOCK#${overrides.stockNumber || 1}`,
  projectId: overrides.projectId || "proj-123",
  stockNumber: overrides.stockNumber || 1,
  tokenId: overrides.tokenId || "0.0.123456",
  serialNumber: overrides.serialNumber || 1,
  ownerWalletAddress: overrides.ownerWalletAddress || "0.0.789012",
  mintedAt: overrides.mintedAt || "2024-01-15T12:00:00Z",
  metadataUri: overrides.metadataUri || "ipfs://QmTest123",
  status: overrides.status || "minted",
  GSI4PK: `OWNER#${overrides.ownerWalletAddress || "0.0.789012"}`,
  GSI4SK: overrides.mintedAt || "2024-01-15T12:00:00Z",
  ...overrides,
});

export const createMockHederaService = () => ({
  calculateGasFees: jest.fn().mockResolvedValue({
    totalEstimate: "10.0",
  }),
  validateWallet: jest.fn().mockResolvedValue({
    isValid: true,
    canAffordOperation: true,
    balance: "100.0",
    estimatedGasFee: "10.0",
  }),
  createToken: jest.fn().mockResolvedValue({
    tokenId: "0.0.123456",
    transactionId: "0.0.123456@1234567890.123456789",
    totalCost: "5.0",
  }),
  mintNFTs: jest.fn().mockResolvedValue({
    serialNumbers: Array.from({ length: 50 }, (_, i) => i + 1),
    transactionId: "0.0.123456@1234567891.123456789",
    totalCost: "2.5",
  }),
  getTokenInfo: jest.fn().mockResolvedValue({
    tokenId: "0.0.123456",
    name: "Test Project Token",
    symbol: "TPT",
    totalSupply: 100,
  }),
  getNFTInfo: jest.fn().mockResolvedValue({
    tokenId: "0.0.123456",
    serialNumber: 1,
    metadata: "ipfs://QmTest123",
    ownerAccountId: "0.0.789012",
  }),
});

export const createMockIPFSService = () => ({
  storeProjectMetadata: jest.fn().mockResolvedValue({
    hash: "QmProjectTest123",
    uri: "ipfs://QmProjectTest123",
  }),
  storeStockMetadata: jest.fn().mockResolvedValue({
    hash: "QmStockTest123",
    uri: "ipfs://QmStockTest123",
  }),
  getMetadata: jest.fn().mockResolvedValue({
    name: "Test Metadata",
    description: "Test metadata description",
    image: "ipfs://QmImageTest123",
  }),
});

export const createMockRepositories = () => {
  const mockProjectRepo = {
    getProject: jest.fn(),
    createProject: jest.fn(),
    updateProject: jest.fn(),
    deleteProject: jest.fn(),
    listProjects: jest.fn(),
    createHederaTransaction: jest.fn(),
    updateHederaTransaction: jest.fn(),
    getHederaTransactions: jest.fn(),
    updateProjectStats: jest.fn(),
    getProjectStats: jest.fn(),
    createStockNFT: jest.fn(),
  };

  const mockStockRepo = {
    getStock: jest.fn(),
    listStocks: jest.fn(),
    updateStock: jest.fn(),
    getStocksByOwner: jest.fn(),
    getStocksByProject: jest.fn(),
  };

  return {
    mockProjectRepo,
    mockStockRepo,
  };
};

export const createMockEventPublisher = () => ({
  publishEvent: jest.fn().mockResolvedValue(undefined),
  publishProjectCreatedEvent: jest.fn().mockResolvedValue(undefined),
  publishProjectUpdatedEvent: jest.fn().mockResolvedValue(undefined),
  publishProjectStatusChangedEvent: jest.fn().mockResolvedValue(undefined),
  publishStockMintingStartedEvent: jest.fn().mockResolvedValue(undefined),
  publishStockMintingProgressEvent: jest.fn().mockResolvedValue(undefined),
  publishStockMintingCompletedEvent: jest.fn().mockResolvedValue(undefined),
  publishStockMintingFailedEvent: jest.fn().mockResolvedValue(undefined),
});

// Performance measurement utilities
export const measurePerformance = async <T>(
  operation: () => Promise<T>,
  label: string
): Promise<{ result: T; duration: number; memoryUsage: NodeJS.MemoryUsage }> => {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();
  
  const result = await operation();
  
  const endTime = Date.now();
  const endMemory = process.memoryUsage();
  const duration = endTime - startTime;
  
  const memoryUsage = {
    rss: endMemory.rss - startMemory.rss,
    heapTotal: endMemory.heapTotal - startMemory.heapTotal,
    heapUsed: endMemory.heapUsed - startMemory.heapUsed,
    external: endMemory.external - startMemory.external,
    arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers,
  };

  console.log(`${label}: ${duration}ms, Memory: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`);
  
  return { result, duration, memoryUsage };
};

// Batch operation utilities
export const executeBatch = async <T>(
  operations: (() => Promise<T>)[],
  batchSize: number = 10,
  delayBetweenBatches: number = 100
): Promise<T[]> => {
  const results: T[] = [];
  
  for (let i = 0; i < operations.length; i += batchSize) {
    const batch = operations.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(op => op()));
    results.push(...batchResults);
    
    if (i + batchSize < operations.length && delayBetweenBatches > 0) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }
  
  return results;
};

// Test data generators
export const generateTestProjects = (count: number) => {
  return Array.from({ length: count }, (_, index) => ({
    name: `Test Project ${index + 1}`,
    description: `Description for test project ${index + 1}`,
    category: ["Technology", "Healthcare", "Finance", "Education"][index % 4],
    stockSupply: 100 + (index * 10),
    targetFundingGoal: 10000 + (index * 5000),
    pricePerStock: 100 + (index * 25),
  }));
};

export const generateTestUsers = (count: number) => {
  return Array.from({ length: count }, (_, index) => ({
    userId: `user-${index + 1}`,
    email: `user${index + 1}@test.com`,
    walletAddress: `0.0.${123456 + index}`,
  }));
};