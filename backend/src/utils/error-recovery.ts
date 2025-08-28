/**
 * Error recovery and rollback mechanisms for project operations
 */

import { createProjectLogger } from './structured-logger';
import { ProjectRepository } from '../repositories/project-repository';
import { ProjectError, ProjectErrorCategory } from './enhanced-error-handler';

const logger = createProjectLogger();

export interface RollbackOperation {
  operation: string;
  execute: () => Promise<void>;
  description: string;
}

export interface RecoveryContext {
  requestId: string;
  operation: string;
  projectId?: string;
  userId?: string;
  rollbackOperations: RollbackOperation[];
}

export class ProjectRecoveryManager {
  private static recoveryContexts = new Map<string, RecoveryContext>();

  /**
   * Initialize recovery context for an operation
   */
  static initializeRecovery(
    requestId: string,
    operation: string,
    projectId?: string,
    userId?: string
  ): RecoveryContext {
    const context: RecoveryContext = {
      requestId,
      operation,
      projectId,
      userId,
      rollbackOperations: []
    };

    this.recoveryContexts.set(requestId, context);
    
    logger.info('Recovery context initialized', {
      operation: 'RecoveryInit',
      requestId,
      operationName: operation,
      projectId,
      userId
    });

    return context;
  }

  /**
   * Add rollback operation to recovery context
   */
  static addRollbackOperation(
    requestId: string,
    rollbackOp: RollbackOperation
  ): void {
    const context = this.recoveryContexts.get(requestId);
    if (context) {
      context.rollbackOperations.push(rollbackOp);
      
      logger.debug('Rollback operation added', {
        operation: 'RollbackAdd',
        requestId,
        rollbackOperation: rollbackOp.operation,
        description: rollbackOp.description,
        totalRollbacks: context.rollbackOperations.length
      });
    }
  }

  /**
   * Execute rollback operations in reverse order
   */
  static async executeRollback(
    requestId: string,
    error: ProjectError
  ): Promise<void> {
    const context = this.recoveryContexts.get(requestId);
    if (!context || context.rollbackOperations.length === 0) {
      logger.info('No rollback operations to execute', {
        operation: 'RollbackExecution',
        requestId
      });
      return;
    }

    logger.info('Starting rollback execution', {
      operation: 'RollbackExecution',
      requestId,
      totalOperations: context.rollbackOperations.length,
      originalError: error.errorCode
    });

    // Execute rollback operations in reverse order (LIFO)
    const rollbackOperations = [...context.rollbackOperations].reverse();
    const rollbackResults: Array<{ operation: string; success: boolean; error?: string }> = [];

    for (const rollbackOp of rollbackOperations) {
      try {
        logger.info('Executing rollback operation', {
          operation: 'RollbackExecution',
          requestId,
          rollbackOperation: rollbackOp.operation,
          description: rollbackOp.description
        });

        await rollbackOp.execute();
        
        rollbackResults.push({
          operation: rollbackOp.operation,
          success: true
        });

        logger.info('Rollback operation completed successfully', {
          operation: 'RollbackExecution',
          requestId,
          rollbackOperation: rollbackOp.operation
        });
      } catch (rollbackError) {
        const errorMessage = (rollbackError as Error).message;
        
        rollbackResults.push({
          operation: rollbackOp.operation,
          success: false,
          error: errorMessage
        });

        logger.error('Rollback operation failed', {
          operation: 'RollbackExecution',
          requestId,
          rollbackOperation: rollbackOp.operation,
          description: rollbackOp.description
        }, rollbackError as Error);

        // Continue with other rollback operations even if one fails
      }
    }

    // Clean up recovery context
    this.recoveryContexts.delete(requestId);

    const successfulRollbacks = rollbackResults.filter(r => r.success).length;
    const failedRollbacks = rollbackResults.filter(r => !r.success).length;

    logger.info('Rollback execution completed', {
      operation: 'RollbackExecution',
      requestId,
      totalOperations: rollbackOperations.length,
      successful: successfulRollbacks,
      failed: failedRollbacks,
      results: rollbackResults
    });

    if (failedRollbacks > 0) {
      logger.warn('Some rollback operations failed', {
        operation: 'RollbackExecution',
        requestId,
        failedOperations: rollbackResults.filter(r => !r.success)
      });
    }
  }

  /**
   * Clean up recovery context (call on successful completion)
   */
  static cleanupRecovery(requestId: string): void {
    const context = this.recoveryContexts.get(requestId);
    if (context) {
      this.recoveryContexts.delete(requestId);
      
      logger.debug('Recovery context cleaned up', {
        operation: 'RecoveryCleanup',
        requestId,
        operationName: context.operation
      });
    }
  }

  /**
   * Get recovery context for debugging
   */
  static getRecoveryContext(requestId: string): RecoveryContext | undefined {
    return this.recoveryContexts.get(requestId);
  }
}

/**
 * Project-specific rollback operations
 */
export class ProjectRollbackOperations {
  constructor(private projectRepository: ProjectRepository) {}

  /**
   * Create rollback operation for project status change
   */
  createProjectStatusRollback(
    projectId: string,
    originalStatus: string,
    requestId: string
  ): RollbackOperation {
    return {
      operation: 'rollback_project_status',
      description: `Rollback project ${projectId} status to ${originalStatus}`,
      execute: async () => {
        logger.info('Rolling back project status', {
          operation: 'ProjectStatusRollback',
          requestId,
          projectId,
          targetStatus: originalStatus
        });

        await this.projectRepository.updateProject({
          projectId,
          status: originalStatus as any
        });

        logger.info('Project status rollback completed', {
          operation: 'ProjectStatusRollback',
          requestId,
          projectId,
          restoredStatus: originalStatus
        });
      }
    };
  }

  /**
   * Create rollback operation for project deletion
   */
  createProjectDeletionRollback(
    projectId: string,
    requestId: string
  ): RollbackOperation {
    return {
      operation: 'rollback_project_deletion',
      description: `Delete project ${projectId} due to failed operation`,
      execute: async () => {
        logger.info('Rolling back by deleting project', {
          operation: 'ProjectDeletionRollback',
          requestId,
          projectId
        });

        // Note: This would delete the project if it was created but the operation failed
        // Implementation depends on specific requirements
        await this.projectRepository.deleteProject(projectId);

        logger.info('Project deletion rollback completed', {
          operation: 'ProjectDeletionRollback',
          requestId,
          projectId
        });
      }
    };
  }

  /**
   * Create rollback operation for Hedera transaction failure
   */
  createHederaTransactionRollback(
    projectId: string,
    transactionId: string,
    requestId: string
  ): RollbackOperation {
    return {
      operation: 'rollback_hedera_transaction',
      description: `Mark Hedera transaction ${transactionId} as failed`,
      execute: async () => {
        logger.info('Rolling back Hedera transaction', {
          operation: 'HederaTransactionRollback',
          requestId,
          projectId,
          transactionId
        });

        await this.projectRepository.updateHederaTransaction({
          projectId,
          transactionId,
          status: 'failed',
          errorMessage: 'Transaction rolled back due to operation failure'
        });

        logger.info('Hedera transaction rollback completed', {
          operation: 'HederaTransactionRollback',
          requestId,
          projectId,
          transactionId
        });
      }
    };
  }

  /**
   * Create rollback operation for stock NFT cleanup
   */
  createStockNFTCleanupRollback(
    projectId: string,
    stockNumbers: number[],
    requestId: string
  ): RollbackOperation {
    return {
      operation: 'rollback_stock_nft_cleanup',
      description: `Clean up stock NFT records for project ${projectId}`,
      execute: async () => {
        logger.info('Rolling back stock NFT records', {
          operation: 'StockNFTCleanupRollback',
          requestId,
          projectId,
          stockCount: stockNumbers.length
        });

        // Delete stock NFT records that were created
        for (const stockNumber of stockNumbers) {
          try {
            await this.projectRepository.deleteStockNFT(projectId, stockNumber);
          } catch (error) {
            logger.warn('Failed to delete stock NFT record during rollback', {
              operation: 'StockNFTCleanupRollback',
              requestId,
              projectId,
              stockNumber
            }, error as Error);
          }
        }

        logger.info('Stock NFT cleanup rollback completed', {
          operation: 'StockNFTCleanupRollback',
          requestId,
          projectId,
          cleanedStocks: stockNumbers.length
        });
      }
    };
  }

  /**
   * Create rollback operation for project statistics reset
   */
  createProjectStatsResetRollback(
    projectId: string,
    requestId: string
  ): RollbackOperation {
    return {
      operation: 'rollback_project_stats_reset',
      description: `Reset project statistics for ${projectId}`,
      execute: async () => {
        logger.info('Rolling back project statistics', {
          operation: 'ProjectStatsResetRollback',
          requestId,
          projectId
        });

        // Reset project statistics to initial state
        const resetStats = {
          PK: `PROJECT#${projectId}`,
          SK: 'STATS',
          projectId,
          totalStocks: 0,
          mintedStocks: 0,
          availableStocks: 0,
          soldStocks: 0,
          totalRaised: 0,
          lastUpdated: new Date().toISOString()
        };

        await this.projectRepository.updateProjectStats(resetStats);

        logger.info('Project statistics reset rollback completed', {
          operation: 'ProjectStatsResetRollback',
          requestId,
          projectId
        });
      }
    };
  }
}

/**
 * Decorator for automatic rollback on operation failure
 */
export function withRollback(rollbackOperations?: RollbackOperation[]) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const requestId = args[0]?.requestId || `${Date.now()}-${Math.random()}`;
      
      // Initialize recovery context
      const context = ProjectRecoveryManager.initializeRecovery(
        requestId,
        `${target.constructor.name}.${propertyName}`
      );

      // Add predefined rollback operations
      if (rollbackOperations) {
        rollbackOperations.forEach(op => {
          ProjectRecoveryManager.addRollbackOperation(requestId, op);
        });
      }

      try {
        const result = await originalMethod.apply(this, args);
        
        // Clean up recovery context on success
        ProjectRecoveryManager.cleanupRecovery(requestId);
        
        return result;
      } catch (error) {
        const projectError = error instanceof ProjectError ? 
          error : 
          new ProjectError({
            category: ProjectErrorCategory.SYSTEM,
            severity: 'high' as any,
            retryable: false,
            recoveryStrategy: 'rollback' as any,
            userMessage: 'Operation failed',
            technicalMessage: (error as Error).message,
            errorCode: 'OPERATION_FAILED',
            httpStatusCode: 500,
            context: {
              operation: `${target.constructor.name}.${propertyName}`,
              requestId,
              timestamp: new Date().toISOString(),
              environment: process.env.ENVIRONMENT || 'development',
              service: 'ProjectService'
            }
          }, error as Error);

        // Execute rollback if required
        if (projectError.rollbackRequired !== false) {
          await ProjectRecoveryManager.executeRollback(requestId, projectError);
        } else {
          ProjectRecoveryManager.cleanupRecovery(requestId);
        }

        throw projectError;
      }
    };

    return descriptor;
  };
}