/**
 * Unit tests for error recovery and rollback mechanisms
 */

import {
  ProjectRecoveryManager,
  ProjectRollbackOperations,
  RollbackOperation,
  RecoveryContext,
  withRollback
} from '../error-recovery';
import { ProjectError, ProjectErrorCategory } from '../enhanced-error-handler';
import { ProjectRepository } from '../../repositories/project-repository';

// Mock the logger
jest.mock('../structured-logger', () => ({
  createProjectLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  })
}));

describe('ProjectRecoveryManager', () => {
  beforeEach(() => {
    // Clear any existing recovery contexts
    (ProjectRecoveryManager as any).recoveryContexts.clear();
  });

  describe('initializeRecovery', () => {
    it('should initialize recovery context correctly', () => {
      const requestId = 'test-request-id';
      const operation = 'test-operation';
      const projectId = 'test-project-id';
      const userId = 'test-user-id';

      const context = ProjectRecoveryManager.initializeRecovery(
        requestId,
        operation,
        projectId,
        userId
      );

      expect(context).toEqual({
        requestId,
        operation,
        projectId,
        userId,
        rollbackOperations: []
      });

      const retrievedContext = ProjectRecoveryManager.getRecoveryContext(requestId);
      expect(retrievedContext).toBe(context);
    });

    it('should initialize recovery context without optional parameters', () => {
      const requestId = 'test-request-id';
      const operation = 'test-operation';

      const context = ProjectRecoveryManager.initializeRecovery(requestId, operation);

      expect(context).toEqual({
        requestId,
        operation,
        projectId: undefined,
        userId: undefined,
        rollbackOperations: []
      });
    });
  });

  describe('addRollbackOperation', () => {
    it('should add rollback operation to existing context', () => {
      const requestId = 'test-request-id';
      const context = ProjectRecoveryManager.initializeRecovery(requestId, 'test-operation');

      const rollbackOp: RollbackOperation = {
        operation: 'test-rollback',
        description: 'Test rollback operation',
        execute: jest.fn().mockResolvedValue(undefined)
      };

      ProjectRecoveryManager.addRollbackOperation(requestId, rollbackOp);

      expect(context.rollbackOperations).toHaveLength(1);
      expect(context.rollbackOperations[0]).toBe(rollbackOp);
    });

    it('should handle adding rollback to non-existent context', () => {
      const rollbackOp: RollbackOperation = {
        operation: 'test-rollback',
        description: 'Test rollback operation',
        execute: jest.fn().mockResolvedValue(undefined)
      };

      // Should not throw error
      expect(() => {
        ProjectRecoveryManager.addRollbackOperation('non-existent', rollbackOp);
      }).not.toThrow();
    });

    it('should add multiple rollback operations in order', () => {
      const requestId = 'test-request-id';
      const context = ProjectRecoveryManager.initializeRecovery(requestId, 'test-operation');

      const rollbackOp1: RollbackOperation = {
        operation: 'rollback-1',
        description: 'First rollback',
        execute: jest.fn().mockResolvedValue(undefined)
      };

      const rollbackOp2: RollbackOperation = {
        operation: 'rollback-2',
        description: 'Second rollback',
        execute: jest.fn().mockResolvedValue(undefined)
      };

      ProjectRecoveryManager.addRollbackOperation(requestId, rollbackOp1);
      ProjectRecoveryManager.addRollbackOperation(requestId, rollbackOp2);

      expect(context.rollbackOperations).toHaveLength(2);
      expect(context.rollbackOperations[0]).toBe(rollbackOp1);
      expect(context.rollbackOperations[1]).toBe(rollbackOp2);
    });
  });

  describe('executeRollback', () => {
    it('should execute rollback operations in reverse order', async () => {
      const requestId = 'test-request-id';
      const context = ProjectRecoveryManager.initializeRecovery(requestId, 'test-operation');

      const executionOrder: string[] = [];

      const rollbackOp1: RollbackOperation = {
        operation: 'rollback-1',
        description: 'First rollback',
        execute: jest.fn().mockImplementation(async () => {
          executionOrder.push('rollback-1');
        })
      };

      const rollbackOp2: RollbackOperation = {
        operation: 'rollback-2',
        description: 'Second rollback',
        execute: jest.fn().mockImplementation(async () => {
          executionOrder.push('rollback-2');
        })
      };

      ProjectRecoveryManager.addRollbackOperation(requestId, rollbackOp1);
      ProjectRecoveryManager.addRollbackOperation(requestId, rollbackOp2);

      const mockError = new ProjectError({
        category: ProjectErrorCategory.SYSTEM,
        severity: 'high' as any,
        retryable: false,
        recoveryStrategy: 'rollback' as any,
        userMessage: 'Test error',
        technicalMessage: 'Test error',
        errorCode: 'TEST_ERROR',
        httpStatusCode: 500,
        context: {
          operation: 'test',
          timestamp: new Date().toISOString(),
          environment: 'test',
          service: 'test'
        }
      });

      await ProjectRecoveryManager.executeRollback(requestId, mockError);

      expect(executionOrder).toEqual(['rollback-2', 'rollback-1']);
      expect(rollbackOp1.execute).toHaveBeenCalledTimes(1);
      expect(rollbackOp2.execute).toHaveBeenCalledTimes(1);

      // Context should be cleaned up
      expect(ProjectRecoveryManager.getRecoveryContext(requestId)).toBeUndefined();
    });

    it('should handle rollback operation failures gracefully', async () => {
      const requestId = 'test-request-id';
      ProjectRecoveryManager.initializeRecovery(requestId, 'test-operation');

      const rollbackOp1: RollbackOperation = {
        operation: 'rollback-1',
        description: 'First rollback',
        execute: jest.fn().mockRejectedValue(new Error('Rollback failed'))
      };

      const rollbackOp2: RollbackOperation = {
        operation: 'rollback-2',
        description: 'Second rollback',
        execute: jest.fn().mockResolvedValue(undefined)
      };

      ProjectRecoveryManager.addRollbackOperation(requestId, rollbackOp1);
      ProjectRecoveryManager.addRollbackOperation(requestId, rollbackOp2);

      const mockError = new ProjectError({
        category: ProjectErrorCategory.SYSTEM,
        severity: 'high' as any,
        retryable: false,
        recoveryStrategy: 'rollback' as any,
        userMessage: 'Test error',
        technicalMessage: 'Test error',
        errorCode: 'TEST_ERROR',
        httpStatusCode: 500,
        context: {
          operation: 'test',
          timestamp: new Date().toISOString(),
          environment: 'test',
          service: 'test'
        }
      });

      // Should not throw error even if rollback operations fail
      await expect(
        ProjectRecoveryManager.executeRollback(requestId, mockError)
      ).resolves.not.toThrow();

      expect(rollbackOp1.execute).toHaveBeenCalledTimes(1);
      expect(rollbackOp2.execute).toHaveBeenCalledTimes(1);
    });

    it('should handle empty rollback operations', async () => {
      const requestId = 'test-request-id';
      ProjectRecoveryManager.initializeRecovery(requestId, 'test-operation');

      const mockError = new ProjectError({
        category: ProjectErrorCategory.SYSTEM,
        severity: 'high' as any,
        retryable: false,
        recoveryStrategy: 'rollback' as any,
        userMessage: 'Test error',
        technicalMessage: 'Test error',
        errorCode: 'TEST_ERROR',
        httpStatusCode: 500,
        context: {
          operation: 'test',
          timestamp: new Date().toISOString(),
          environment: 'test',
          service: 'test'
        }
      });

      // Should not throw error with empty rollback operations
      await expect(
        ProjectRecoveryManager.executeRollback(requestId, mockError)
      ).resolves.not.toThrow();
    });

    it('should handle non-existent recovery context', async () => {
      const mockError = new ProjectError({
        category: ProjectErrorCategory.SYSTEM,
        severity: 'high' as any,
        retryable: false,
        recoveryStrategy: 'rollback' as any,
        userMessage: 'Test error',
        technicalMessage: 'Test error',
        errorCode: 'TEST_ERROR',
        httpStatusCode: 500,
        context: {
          operation: 'test',
          timestamp: new Date().toISOString(),
          environment: 'test',
          service: 'test'
        }
      });

      // Should not throw error with non-existent context
      await expect(
        ProjectRecoveryManager.executeRollback('non-existent', mockError)
      ).resolves.not.toThrow();
    });
  });

  describe('cleanupRecovery', () => {
    it('should remove recovery context', () => {
      const requestId = 'test-request-id';
      ProjectRecoveryManager.initializeRecovery(requestId, 'test-operation');

      expect(ProjectRecoveryManager.getRecoveryContext(requestId)).toBeDefined();

      ProjectRecoveryManager.cleanupRecovery(requestId);

      expect(ProjectRecoveryManager.getRecoveryContext(requestId)).toBeUndefined();
    });

    it('should handle cleanup of non-existent context', () => {
      expect(() => {
        ProjectRecoveryManager.cleanupRecovery('non-existent');
      }).not.toThrow();
    });
  });
});

describe('ProjectRollbackOperations', () => {
  let mockProjectRepository: jest.Mocked<ProjectRepository>;
  let rollbackOperations: ProjectRollbackOperations;

  beforeEach(() => {
    mockProjectRepository = {
      updateProject: jest.fn().mockResolvedValue(undefined),
      deleteProject: jest.fn().mockResolvedValue(undefined),
      updateHederaTransaction: jest.fn().mockResolvedValue(undefined),
      deleteStockNFT: jest.fn().mockResolvedValue(undefined),
      updateProjectStats: jest.fn().mockResolvedValue(undefined)
    } as any;

    rollbackOperations = new ProjectRollbackOperations(mockProjectRepository);
  });

  describe('createProjectStatusRollback', () => {
    it('should create and execute project status rollback', async () => {
      const projectId = 'test-project-id';
      const originalStatus = 'draft';
      const requestId = 'test-request-id';

      const rollbackOp = rollbackOperations.createProjectStatusRollback(
        projectId,
        originalStatus,
        requestId
      );

      expect(rollbackOp.operation).toBe('rollback_project_status');
      expect(rollbackOp.description).toContain(projectId);
      expect(rollbackOp.description).toContain(originalStatus);

      await rollbackOp.execute();

      expect(mockProjectRepository.updateProject).toHaveBeenCalledWith({
        projectId,
        status: originalStatus
      });
    });
  });

  describe('createProjectDeletionRollback', () => {
    it('should create and execute project deletion rollback', async () => {
      const projectId = 'test-project-id';
      const requestId = 'test-request-id';

      const rollbackOp = rollbackOperations.createProjectDeletionRollback(
        projectId,
        requestId
      );

      expect(rollbackOp.operation).toBe('rollback_project_deletion');
      expect(rollbackOp.description).toContain(projectId);

      await rollbackOp.execute();

      expect(mockProjectRepository.deleteProject).toHaveBeenCalledWith(projectId);
    });
  });

  describe('createHederaTransactionRollback', () => {
    it('should create and execute Hedera transaction rollback', async () => {
      const projectId = 'test-project-id';
      const transactionId = 'test-transaction-id';
      const requestId = 'test-request-id';

      const rollbackOp = rollbackOperations.createHederaTransactionRollback(
        projectId,
        transactionId,
        requestId
      );

      expect(rollbackOp.operation).toBe('rollback_hedera_transaction');
      expect(rollbackOp.description).toContain(transactionId);

      await rollbackOp.execute();

      expect(mockProjectRepository.updateHederaTransaction).toHaveBeenCalledWith({
        projectId,
        transactionId,
        status: 'failed',
        errorMessage: 'Transaction rolled back due to operation failure'
      });
    });
  });

  describe('createStockNFTCleanupRollback', () => {
    it('should create and execute stock NFT cleanup rollback', async () => {
      const projectId = 'test-project-id';
      const stockNumbers = [1, 2, 3];
      const requestId = 'test-request-id';

      const rollbackOp = rollbackOperations.createStockNFTCleanupRollback(
        projectId,
        stockNumbers,
        requestId
      );

      expect(rollbackOp.operation).toBe('rollback_stock_nft_cleanup');
      expect(rollbackOp.description).toContain(projectId);

      await rollbackOp.execute();

      expect(mockProjectRepository.deleteStockNFT).toHaveBeenCalledTimes(3);
      expect(mockProjectRepository.deleteStockNFT).toHaveBeenCalledWith(projectId, 1);
      expect(mockProjectRepository.deleteStockNFT).toHaveBeenCalledWith(projectId, 2);
      expect(mockProjectRepository.deleteStockNFT).toHaveBeenCalledWith(projectId, 3);
    });

    it('should handle individual stock NFT deletion failures', async () => {
      const projectId = 'test-project-id';
      const stockNumbers = [1, 2, 3];
      const requestId = 'test-request-id';

      // Mock one deletion to fail
      mockProjectRepository.deleteStockNFT
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Deletion failed'))
        .mockResolvedValueOnce(undefined);

      const rollbackOp = rollbackOperations.createStockNFTCleanupRollback(
        projectId,
        stockNumbers,
        requestId
      );

      // Should not throw error even if some deletions fail
      await expect(rollbackOp.execute()).resolves.not.toThrow();

      expect(mockProjectRepository.deleteStockNFT).toHaveBeenCalledTimes(3);
    });
  });

  describe('createProjectStatsResetRollback', () => {
    it('should create and execute project stats reset rollback', async () => {
      const projectId = 'test-project-id';
      const requestId = 'test-request-id';

      const rollbackOp = rollbackOperations.createProjectStatsResetRollback(
        projectId,
        requestId
      );

      expect(rollbackOp.operation).toBe('rollback_project_stats_reset');
      expect(rollbackOp.description).toContain(projectId);

      await rollbackOp.execute();

      expect(mockProjectRepository.updateProjectStats).toHaveBeenCalledWith(
        expect.objectContaining({
          PK: `PROJECT#${projectId}`,
          SK: 'STATS',
          projectId,
          totalStocks: 0,
          mintedStocks: 0,
          availableStocks: 0,
          soldStocks: 0,
          totalRaised: 0
        })
      );
    });
  });
});

describe('withRollback decorator', () => {
  let mockProjectRepository: jest.Mocked<ProjectRepository>;

  beforeEach(() => {
    mockProjectRepository = {
      updateProject: jest.fn().mockResolvedValue(undefined)
    } as any;

    // Clear recovery contexts
    (ProjectRecoveryManager as any).recoveryContexts.clear();
  });

  it('should execute rollback on method failure', async () => {
    const rollbackOp: RollbackOperation = {
      operation: 'test-rollback',
      description: 'Test rollback',
      execute: jest.fn().mockResolvedValue(undefined)
    };

    class TestClass {
      @withRollback([rollbackOp])
      async testMethod(args: { requestId: string }): Promise<string> {
        throw new Error('Method failed');
      }
    }

    const instance = new TestClass();

    await expect(
      instance.testMethod({ requestId: 'test-request-id' })
    ).rejects.toThrow();

    expect(rollbackOp.execute).toHaveBeenCalledTimes(1);
  });

  it('should clean up recovery context on success', async () => {
    class TestClass {
      @withRollback()
      async testMethod(args: { requestId: string }): Promise<string> {
        return 'success';
      }
    }

    const instance = new TestClass();
    const result = await instance.testMethod({ requestId: 'test-request-id' });

    expect(result).toBe('success');
    expect(ProjectRecoveryManager.getRecoveryContext('test-request-id')).toBeUndefined();
  });

  it('should generate request ID if not provided', async () => {
    const rollbackOp: RollbackOperation = {
      operation: 'test-rollback',
      description: 'Test rollback',
      execute: jest.fn().mockResolvedValue(undefined)
    };

    class TestClass {
      @withRollback([rollbackOp])
      async testMethod(): Promise<string> {
        throw new Error('Method failed');
      }
    }

    const instance = new TestClass();

    await expect(instance.testMethod()).rejects.toThrow(ProjectError);
    expect(rollbackOp.execute).toHaveBeenCalledTimes(1);
  });

  it('should skip rollback when rollbackRequired is false', async () => {
    const rollbackOp: RollbackOperation = {
      operation: 'test-rollback',
      description: 'Test rollback',
      execute: jest.fn().mockResolvedValue(undefined)
    };

    class TestClass {
      @withRollback([rollbackOp])
      async testMethod(args: { requestId: string }): Promise<string> {
        const error = new ProjectError({
          category: ProjectErrorCategory.VALIDATION,
          severity: 'low' as any,
          retryable: false,
          recoveryStrategy: 'none' as any,
          userMessage: 'Validation error',
          technicalMessage: 'Validation error',
          errorCode: 'VALIDATION_ERROR',
          httpStatusCode: 400,
          context: {
            operation: 'test',
            timestamp: new Date().toISOString(),
            environment: 'test',
            service: 'test'
          },
          rollbackRequired: false
        });
        throw error;
      }
    }

    const instance = new TestClass();

    await expect(
      instance.testMethod({ requestId: 'test-request-id' })
    ).rejects.toThrow(ProjectError);

    expect(rollbackOp.execute).not.toHaveBeenCalled();
  });
});