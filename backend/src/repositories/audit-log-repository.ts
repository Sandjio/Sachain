import { BaseRepository, DynamoDBConfig } from "./base-repository";
import {
  AuditLog,
  CreateAuditLogInput,
  QueryResult,
  PaginationOptions,
} from "../models";

export class AuditLogRepository extends BaseRepository {
  constructor(config: DynamoDBConfig) {
    super(config);
  }

  /**
   * Create a new audit log entry
   */
  async createAuditLog(input: CreateAuditLogInput): Promise<AuditLog> {
    const timestamp = this.generateTimestamp();
    const date = timestamp.split("T")[0]; // Extract date part (YYYY-MM-DD)

    const auditLog: AuditLog = {
      PK: `AUDIT#${date}`,
      SK: `${timestamp}#${input.userId}#${input.action}`,
      userId: input.userId,
      action: input.action,
      resource: input.resource,
      timestamp,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      result: input.result,
      errorMessage: input.errorMessage,
      details: input.details,
    };

    await this.putItem(auditLog);
    return auditLog;
  }

  /**
   * Get audit logs for a specific date
   */
  async getAuditLogsByDate(
    date: string, // Format: YYYY-MM-DD
    options?: PaginationOptions
  ): Promise<QueryResult<AuditLog>> {
    return await this.queryItems<AuditLog>(
      "#PK = :pk",
      {
        "#PK": "PK",
      },
      {
        ":pk": `AUDIT#${date}`,
      },
      undefined,
      options
    );
  }

  /**
   * Get audit logs for a date range
   */
  async getAuditLogsByDateRange(
    startDate: string, // Format: YYYY-MM-DD
    endDate: string, // Format: YYYY-MM-DD
    options?: PaginationOptions
  ): Promise<QueryResult<AuditLog>> {
    // For date range queries, we need to scan since we can't query across multiple partition keys
    return await this.scanItems<AuditLog>(
      "#PK BETWEEN :startPK AND :endPK",
      {
        "#PK": "PK",
      },
      {
        ":startPK": `AUDIT#${startDate}`,
        ":endPK": `AUDIT#${endDate}`,
      },
      options
    );
  }

  /**
   * Get audit logs for a specific user
   */
  async getAuditLogsByUser(
    userId: string,
    options?: PaginationOptions
  ): Promise<QueryResult<AuditLog>> {
    return await this.scanItems<AuditLog>(
      "#userId = :userId",
      {
        "#userId": "userId",
      },
      {
        ":userId": userId,
      },
      options
    );
  }

  /**
   * Get audit logs by action type
   */
  async getAuditLogsByAction(
    action: string,
    options?: PaginationOptions
  ): Promise<QueryResult<AuditLog>> {
    return await this.scanItems<AuditLog>(
      "#action = :action",
      {
        "#action": "action",
      },
      {
        ":action": action,
      },
      options
    );
  }

  /**
   * Get failed audit logs
   */
  async getFailedAuditLogs(
    options?: PaginationOptions
  ): Promise<QueryResult<AuditLog>> {
    return await this.scanItems<AuditLog>(
      "#result = :result",
      {
        "#result": "result",
      },
      {
        ":result": "failure",
      },
      options
    );
  }

  /**
   * Get audit logs for a specific resource
   */
  async getAuditLogsByResource(
    resource: string,
    options?: PaginationOptions
  ): Promise<QueryResult<AuditLog>> {
    return await this.scanItems<AuditLog>(
      "#resource = :resource",
      {
        "#resource": "resource",
      },
      {
        ":resource": resource,
      },
      options
    );
  }

  /**
   * Log user authentication event
   */
  async logAuthentication(
    userId: string,
    result: "success" | "failure",
    ipAddress?: string,
    userAgent?: string,
    errorMessage?: string
  ): Promise<AuditLog> {
    return await this.createAuditLog({
      userId,
      action: "authentication",
      resource: "user_session",
      result,
      ipAddress,
      userAgent,
      errorMessage,
    });
  }

  /**
   * Log KYC document upload event
   */
  async logKYCUpload(
    userId: string,
    documentId: string,
    result: "success" | "failure",
    ipAddress?: string,
    userAgent?: string,
    errorMessage?: string
  ): Promise<AuditLog> {
    return await this.createAuditLog({
      userId,
      action: "kyc_upload",
      resource: `kyc_document:${documentId}`,
      result,
      ipAddress,
      userAgent,
      errorMessage,
      details: { documentId },
    });
  }

  /**
   * Log KYC document review event
   */
  async logKYCReview(
    reviewerId: string,
    userId: string,
    documentId: string,
    action: "approve" | "reject",
    result: "success" | "failure",
    ipAddress?: string,
    userAgent?: string,
    errorMessage?: string
  ): Promise<AuditLog> {
    return await this.createAuditLog({
      userId: reviewerId,
      action: `kyc_${action}`,
      resource: `kyc_document:${documentId}`,
      result,
      ipAddress,
      userAgent,
      errorMessage,
      details: {
        documentId,
        targetUserId: userId,
        reviewAction: action,
      },
    });
  }

  /**
   * Log user profile update event
   */
  async logProfileUpdate(
    userId: string,
    updatedFields: string[],
    result: "success" | "failure",
    ipAddress?: string,
    userAgent?: string,
    errorMessage?: string
  ): Promise<AuditLog> {
    return await this.createAuditLog({
      userId,
      action: "profile_update",
      resource: "user_profile",
      result,
      ipAddress,
      userAgent,
      errorMessage,
      details: { updatedFields },
    });
  }

  /**
   * Get audit statistics for a date
   */
  async getAuditStats(date: string): Promise<{
    total: number;
    successful: number;
    failed: number;
    byAction: Record<string, number>;
  }> {
    const logs = await this.getAuditLogsByDate(date, { limit: 1000 });

    const stats = {
      total: logs.count,
      successful: 0,
      failed: 0,
      byAction: {} as Record<string, number>,
    };

    logs.items.forEach((log) => {
      if (log.result === "success") {
        stats.successful++;
      } else {
        stats.failed++;
      }

      stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
    });

    return stats;
  }

  /**
   * Clean up old audit logs (for data retention)
   */
  async cleanupOldLogs(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    const cutoffDateStr = cutoffDate.toISOString().split("T")[0];

    // This is a simplified implementation - in production, you'd want to use a more efficient approach
    const oldLogs = await this.scanItems<AuditLog>(
      "#PK < :cutoffPK",
      {
        "#PK": "PK",
      },
      {
        ":cutoffPK": `AUDIT#${cutoffDateStr}`,
      },
      { limit: 100 } // Process in batches
    );

    let deletedCount = 0;
    for (const log of oldLogs.items) {
      await this.deleteItem(log.PK, log.SK);
      deletedCount++;
    }

    return deletedCount;
  }
}
