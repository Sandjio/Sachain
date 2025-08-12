// GDPR and compliance data models

export interface DataProcessingConsent {
  PK: string; // USER#${userId}
  SK: string; // CONSENT#${consentType}
  userId: string;
  consentType: 'data_processing' | 'marketing' | 'analytics' | 'third_party_sharing';
  granted: boolean;
  grantedAt?: string;
  revokedAt?: string;
  ipAddress?: string;
  userAgent?: string;
  version: string; // Privacy policy version
  expiresAt?: string;
  
  // GSI for consent queries
  GSI1PK: string; // CONSENT#${consentType}
  GSI1SK: string; // ${userId}#${grantedAt}
}

export interface DataDeletionRequest {
  PK: string; // USER#${userId}
  SK: string; // DELETION_REQUEST#${requestId}
  requestId: string;
  userId: string;
  requestedAt: string;
  requestedBy: string; // userId or 'system'
  status: 'pending' | 'processing' | 'completed' | 'failed';
  reason: 'user_request' | 'account_closure' | 'gdpr_compliance' | 'data_retention';
  scheduledFor?: string;
  completedAt?: string;
  failureReason?: string;
  dataTypes: string[]; // ['profile', 'kyc_documents', 'audit_logs', 'transactions']
  
  // GSI for status queries
  GSI1PK: string; // DELETION#${status}
  GSI1SK: string; // ${requestedAt}
}

export interface DataRetentionPolicy {
  PK: string; // POLICY#DATA_RETENTION
  SK: string; // ${dataType}
  dataType: string;
  retentionPeriodDays: number;
  description: string;
  legalBasis: string;
  autoDeleteEnabled: boolean;
  lastUpdated: string;
  updatedBy: string;
}

export interface ComplianceEvent {
  PK: string; // COMPLIANCE#${date}
  SK: string; // ${timestamp}#${eventType}#${userId}
  eventType: 'consent_granted' | 'consent_revoked' | 'data_accessed' | 'data_exported' | 'data_deleted' | 'retention_applied';
  userId: string;
  timestamp: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  legalBasis?: string;
}

// Input types for creating records
export interface CreateConsentInput {
  userId: string;
  consentType: 'data_processing' | 'marketing' | 'analytics' | 'third_party_sharing';
  granted: boolean;
  ipAddress?: string;
  userAgent?: string;
  version: string;
  expiresAt?: string;
}

export interface CreateDeletionRequestInput {
  userId: string;
  requestedBy: string;
  reason: 'user_request' | 'account_closure' | 'gdpr_compliance' | 'data_retention';
  scheduledFor?: string;
  dataTypes: string[];
}

export interface CreateComplianceEventInput {
  eventType: 'consent_granted' | 'consent_revoked' | 'data_accessed' | 'data_exported' | 'data_deleted' | 'retention_applied';
  userId: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  legalBasis?: string;
}