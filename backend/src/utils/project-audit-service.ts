import { AuditLogRepository } from "../repositories/audit-log-repository";
import { ComplianceRepository } from "../repositories/compliance-repository";
import { StructuredLogger } from "./structured-logger";

export interface ProjectAuditContext {
  userId: string;
  projectId?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
}

export interface ProjectAuditResult {
  success: boolean;
  auditLogId?: string;
  complianceEventId?: string;
  error?: string;
}

export class ProjectAuditService {
  constructor(
    private auditRepo: AuditLogRepository,
    private complianceRepo: ComplianceRepository,
    private logger: StructuredLogger
  ) {}

  async logProjectCreation(
    context: ProjectAuditContext,
    projectData: {
      name: string;
      category: string;
      stockSupply: number;
      targetFundingGoal?: number;
    },
    result: "success" | "failure",
    errorMessage?: string
  ): Promise<ProjectAuditResult> {
    return this.logProjectAction(
      context,
      "project_creation",
      `project:${context.projectId}`,
      result,
      {
        projectName: projectData.name,
        category: projectData.category,
        stockSupply: projectData.stockSupply,
        targetFundingGoal: projectData.targetFundingGoal,
      },
      errorMessage
    );
  }

  async logStockMinting(
    context: ProjectAuditContext,
    mintingData: {
      tokenId: string;
      quantity: number;
      gasUsed?: number;
    },
    result: "success" | "failure",
    errorMessage?: string
  ): Promise<ProjectAuditResult> {
    return this.logProjectAction(
      context,
      "stock_minting",
      `project:${context.projectId}`,
      result,
      {
        tokenId: mintingData.tokenId,
        quantity: mintingData.quantity,
        gasUsed: mintingData.gasUsed,
      },
      errorMessage
    );
  }

  async logProjectUpdate(
    context: ProjectAuditContext,
    updatedFields: string[],
    result: "success" | "failure",
    errorMessage?: string
  ): Promise<ProjectAuditResult> {
    return this.logProjectAction(
      context,
      "project_update",
      `project:${context.projectId}`,
      result,
      { updatedFields },
      errorMessage
    );
  }

  async logProjectStatusChange(
    context: ProjectAuditContext,
    fromStatus: string,
    toStatus: string,
    result: "success" | "failure",
    errorMessage?: string
  ): Promise<ProjectAuditResult> {
    return this.logProjectAction(
      context,
      "project_status_change",
      `project:${context.projectId}`,
      result,
      { fromStatus, toStatus },
      errorMessage
    );
  }

  async logCoverImageUpload(
    context: ProjectAuditContext,
    imageData: {
      fileName: string;
      fileSize: number;
      s3Key: string;
    },
    result: "success" | "failure",
    errorMessage?: string
  ): Promise<ProjectAuditResult> {
    return this.logProjectAction(
      context,
      "cover_image_upload",
      `project:${context.projectId}`,
      result,
      {
        fileName: imageData.fileName,
        fileSize: imageData.fileSize,
        s3Key: imageData.s3Key,
      },
      errorMessage
    );
  }

  async logProjectDeletion(
    context: ProjectAuditContext,
    result: "success" | "failure",
    errorMessage?: string
  ): Promise<ProjectAuditResult> {
    return this.logProjectAction(
      context,
      "project_deletion",
      `project:${context.projectId}`,
      result,
      {},
      errorMessage
    );
  }

  private async logProjectAction(
    context: ProjectAuditContext,
    action: string,
    resource: string,
    result: "success" | "failure",
    details: Record<string, any>,
    errorMessage?: string
  ): Promise<ProjectAuditResult> {
    try {
      const auditLog = await this.auditRepo.createAuditLog({
        userId: context.userId,
        action,
        resource,
        result,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        errorMessage,
        details: {
          ...details,
          sessionId: context.sessionId,
          requestId: context.requestId,
          projectId: context.projectId,
        },
      });

      let complianceEventId: string | undefined;
      if (this.requiresComplianceTracking(action)) {
        const complianceEvent = await this.complianceRepo.createComplianceEvent({
          eventType: this.mapToComplianceEvent(action),
          userId: context.userId,
          details: {
            action,
            resource,
            result,
            projectId: context.projectId,
            ...details,
          },
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          legalBasis: "contract",
        });
        complianceEventId = complianceEvent.SK;
      }

      this.logger.info("Project audit log created", {
        operation: "ProjectAuditService",
        userId: context.userId,
        projectId: context.projectId,
        action,
        result,
        auditLogId: auditLog.SK,
        complianceEventId,
      });

      return {
        success: true,
        auditLogId: auditLog.SK,
        complianceEventId,
      };
    } catch (error) {
      this.logger.error("Failed to create project audit log", {
        operation: "ProjectAuditService",
        userId: context.userId,
        projectId: context.projectId,
        action,
      }, error as Error);

      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  private requiresComplianceTracking(action: string): boolean {
    const complianceActions = [
      "project_creation",
      "stock_minting",
      "project_deletion",
      "project_status_change",
    ];
    return complianceActions.includes(action);
  }

  private mapToComplianceEvent(action: string): any {
    const mapping: Record<string, any> = {
      "project_creation": "data_created",
      "stock_minting": "token_minted",
      "project_deletion": "data_deleted",
      "project_status_change": "status_changed",
    };
    return mapping[action] || "data_accessed";
  }
}