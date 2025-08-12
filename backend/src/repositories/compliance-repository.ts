import { BaseRepository, DynamoDBConfig } from "./base-repository";
import {
  DataProcessingConsent,
  DataDeletionRequest,
  DataRetentionPolicy,
  ComplianceEvent,
  CreateConsentInput,
  CreateDeletionRequestInput,
  CreateComplianceEventInput,
  QueryResult,
  PaginationOptions,
} from "../models";
import { v4 as uuidv4 } from "uuid";

export class ComplianceRepository extends BaseRepository {
  constructor(config: DynamoDBConfig) {
    super(config);
  }

  // Consent Management
  async createConsent(input: CreateConsentInput): Promise<DataProcessingConsent> {
    const timestamp = this.generateTimestamp();
    
    const consent: DataProcessingConsent = {
      PK: `USER#${input.userId}`,
      SK: `CONSENT#${input.consentType}`,
      userId: input.userId,
      consentType: input.consentType,
      granted: input.granted,
      grantedAt: input.granted ? timestamp : undefined,
      revokedAt: !input.granted ? timestamp : undefined,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      version: input.version,
      expiresAt: input.expiresAt,
      GSI1PK: `CONSENT#${input.consentType}`,
      GSI1SK: `${input.userId}#${timestamp}`,
    };

    await this.putItem(consent);
    return consent;
  }

  async getUserConsents(userId: string): Promise<DataProcessingConsent[]> {
    const result = await this.queryItems<DataProcessingConsent>(
      "#PK = :pk AND begins_with(#SK, :sk)",
      { "#PK": "PK", "#SK": "SK" },
      { ":pk": `USER#${userId}`, ":sk": "CONSENT#" }
    );
    return result.items;
  }

  async updateConsent(
    userId: string,
    consentType: string,
    granted: boolean,
    ipAddress?: string,
    userAgent?: string
  ): Promise<DataProcessingConsent> {
    const timestamp = this.generateTimestamp();
    
    const updateExpression = granted
      ? "SET granted = :granted, grantedAt = :timestamp, revokedAt = :null, ipAddress = :ip, userAgent = :ua"
      : "SET granted = :granted, revokedAt = :timestamp, ipAddress = :ip, userAgent = :ua";
    
    const expressionAttributeValues = {
      ":granted": granted,
      ":timestamp": timestamp,
      ":ip": ipAddress,
      ":ua": userAgent,
      ...(granted && { ":null": null }),
    };

    await this.updateItem(
      `USER#${userId}`,
      `CONSENT#${consentType}`,
      updateExpression,
      {},
      expressionAttributeValues
    );

    return await this.getItem<DataProcessingConsent>(
      `USER#${userId}`,
      `CONSENT#${consentType}`
    );
  }

  // Data Deletion Requests
  async createDeletionRequest(input: CreateDeletionRequestInput): Promise<DataDeletionRequest> {
    const requestId = uuidv4();
    const timestamp = this.generateTimestamp();
    
    const deletionRequest: DataDeletionRequest = {
      PK: `USER#${input.userId}`,
      SK: `DELETION_REQUEST#${requestId}`,
      requestId,
      userId: input.userId,
      requestedAt: timestamp,
      requestedBy: input.requestedBy,
      status: 'pending',
      reason: input.reason,
      scheduledFor: input.scheduledFor,
      dataTypes: input.dataTypes,
      GSI1PK: 'DELETION#pending',
      GSI1SK: timestamp,
    };

    await this.putItem(deletionRequest);
    return deletionRequest;
  }

  async getDeletionRequest(userId: string, requestId: string): Promise<DataDeletionRequest | null> {
    return await this.getItem<DataDeletionRequest>(
      `USER#${userId}`,
      `DELETION_REQUEST#${requestId}`
    );
  }

  async getPendingDeletionRequests(options?: PaginationOptions): Promise<QueryResult<DataDeletionRequest>> {
    return await this.queryItemsByGSI<DataDeletionRequest>(
      "GSI1",
      "#GSI1PK = :pk",
      { "#GSI1PK": "GSI1PK" },
      { ":pk": "DELETION#pending" },
      undefined,
      options
    );
  }

  async updateDeletionRequestStatus(
    userId: string,
    requestId: string,
    status: 'processing' | 'completed' | 'failed',
    failureReason?: string
  ): Promise<void> {
    const timestamp = this.generateTimestamp();
    
    let updateExpression = "SET #status = :status, GSI1PK = :gsi1pk";
    const expressionAttributeValues: any = {
      ":status": status,
      ":gsi1pk": `DELETION#${status}`,
    };

    if (status === 'completed') {
      updateExpression += ", completedAt = :completedAt";
      expressionAttributeValues[":completedAt"] = timestamp;
    }

    if (status === 'failed' && failureReason) {
      updateExpression += ", failureReason = :failureReason";
      expressionAttributeValues[":failureReason"] = failureReason;
    }

    await this.updateItem(
      `USER#${userId}`,
      `DELETION_REQUEST#${requestId}`,
      updateExpression,
      { "#status": "status" },
      expressionAttributeValues
    );
  }

  // Data Retention Policies
  async createRetentionPolicy(
    dataType: string,
    retentionPeriodDays: number,
    description: string,
    legalBasis: string,
    autoDeleteEnabled: boolean,
    updatedBy: string
  ): Promise<DataRetentionPolicy> {
    const timestamp = this.generateTimestamp();
    
    const policy: DataRetentionPolicy = {
      PK: "POLICY#DATA_RETENTION",
      SK: dataType,
      dataType,
      retentionPeriodDays,
      description,
      legalBasis,
      autoDeleteEnabled,
      lastUpdated: timestamp,
      updatedBy,
    };

    await this.putItem(policy);
    return policy;
  }

  async getRetentionPolicy(dataType: string): Promise<DataRetentionPolicy | null> {
    return await this.getItem<DataRetentionPolicy>("POLICY#DATA_RETENTION", dataType);
  }

  async getAllRetentionPolicies(): Promise<DataRetentionPolicy[]> {
    const result = await this.queryItems<DataRetentionPolicy>(
      "#PK = :pk",
      { "#PK": "PK" },
      { ":pk": "POLICY#DATA_RETENTION" }
    );
    return result.items;
  }

  // Compliance Events
  async createComplianceEvent(input: CreateComplianceEventInput): Promise<ComplianceEvent> {
    const timestamp = this.generateTimestamp();
    const date = timestamp.split("T")[0];
    
    const event: ComplianceEvent = {
      PK: `COMPLIANCE#${date}`,
      SK: `${timestamp}#${input.eventType}#${input.userId}`,
      eventType: input.eventType,
      userId: input.userId,
      timestamp,
      details: input.details,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      legalBasis: input.legalBasis,
    };

    await this.putItem(event);
    return event;
  }

  async getComplianceEventsByDate(
    date: string,
    options?: PaginationOptions
  ): Promise<QueryResult<ComplianceEvent>> {
    return await this.queryItems<ComplianceEvent>(
      "#PK = :pk",
      { "#PK": "PK" },
      { ":pk": `COMPLIANCE#${date}` },
      undefined,
      options
    );
  }

  async getComplianceEventsByUser(
    userId: string,
    options?: PaginationOptions
  ): Promise<QueryResult<ComplianceEvent>> {
    return await this.scanItems<ComplianceEvent>(
      "#userId = :userId",
      { "#userId": "userId" },
      { ":userId": userId },
      options
    );
  }

  // Data Export for GDPR Subject Access Requests
  async exportUserData(userId: string): Promise<{
    profile: any;
    consents: DataProcessingConsent[];
    kycDocuments: any[];
    auditLogs: any[];
    complianceEvents: ComplianceEvent[];
  }> {
    // Get all user data for export
    const [profile, consents, kycDocuments, auditLogs, complianceEvents] = await Promise.all([
      this.getItem(`USER#${userId}`, "PROFILE"),
      this.getUserConsents(userId),
      this.queryItems(`#PK = :pk AND begins_with(#SK, :sk)`, 
        { "#PK": "PK", "#SK": "SK" },
        { ":pk": `USER#${userId}`, ":sk": "KYC#" }
      ),
      this.scanItems("#userId = :userId", 
        { "#userId": "userId" },
        { ":userId": userId }
      ),
      this.getComplianceEventsByUser(userId),
    ]);

    return {
      profile,
      consents,
      kycDocuments: kycDocuments.items,
      auditLogs: auditLogs.items,
      complianceEvents: complianceEvents.items,
    };
  }

  // Data Deletion Implementation
  async deleteUserData(userId: string, dataTypes: string[]): Promise<{
    deletedItems: number;
    errors: string[];
  }> {
    let deletedItems = 0;
    const errors: string[] = [];

    try {
      // Delete based on data types
      for (const dataType of dataTypes) {
        switch (dataType) {
          case 'profile':
            await this.deleteItem(`USER#${userId}`, "PROFILE");
            deletedItems++;
            break;
            
          case 'kyc_documents':
            const kycDocs = await this.queryItems(
              "#PK = :pk AND begins_with(#SK, :sk)",
              { "#PK": "PK", "#SK": "SK" },
              { ":pk": `USER#${userId}`, ":sk": "KYC#" }
            );
            for (const doc of kycDocs.items) {
              await this.deleteItem(doc.PK, doc.SK);
              deletedItems++;
            }
            break;
            
          case 'consents':
            const consents = await this.getUserConsents(userId);
            for (const consent of consents) {
              await this.deleteItem(consent.PK, consent.SK);
              deletedItems++;
            }
            break;
            
          case 'audit_logs':
            // Note: Audit logs might need special handling for legal compliance
            const auditLogs = await this.scanItems(
              "#userId = :userId",
              { "#userId": "userId" },
              { ":userId": userId },
              { limit: 100 }
            );
            for (const log of auditLogs.items) {
              await this.deleteItem(log.PK, log.SK);
              deletedItems++;
            }
            break;
        }
      }
    } catch (error) {
      errors.push(`Error deleting ${dataTypes}: ${(error as Error).message}`);
    }

    return { deletedItems, errors };
  }

  // Retention Policy Enforcement
  async applyRetentionPolicies(): Promise<{
    processedPolicies: number;
    deletedItems: number;
    errors: string[];
  }> {
    const policies = await this.getAllRetentionPolicies();
    let processedPolicies = 0;
    let deletedItems = 0;
    const errors: string[] = [];

    for (const policy of policies) {
      if (!policy.autoDeleteEnabled) continue;

      try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - policy.retentionPeriodDays);
        const cutoffTimestamp = cutoffDate.toISOString();

        // Apply retention based on data type
        switch (policy.dataType) {
          case 'audit_logs':
            const oldLogs = await this.scanItems(
              "#timestamp < :cutoff",
              { "#timestamp": "timestamp" },
              { ":cutoff": cutoffTimestamp },
              { limit: 100 }
            );
            
            for (const log of oldLogs.items) {
              await this.deleteItem(log.PK, log.SK);
              deletedItems++;
            }
            break;
            
          case 'compliance_events':
            const oldEvents = await this.scanItems(
              "#timestamp < :cutoff",
              { "#timestamp": "timestamp" },
              { ":cutoff": cutoffTimestamp },
              { limit: 100 }
            );
            
            for (const event of oldEvents.items) {
              await this.deleteItem(event.PK, event.SK);
              deletedItems++;
            }
            break;
        }
        
        processedPolicies++;
      } catch (error) {
        errors.push(`Error applying policy for ${policy.dataType}: ${(error as Error).message}`);
      }
    }

    return { processedPolicies, deletedItems, errors };
  }
}