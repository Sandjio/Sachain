export interface ConsentUpdateRequest {
  consentType: 'data_processing' | 'marketing' | 'analytics' | 'third_party_sharing';
  granted: boolean;
  version?: string;
}

export interface DataExportRequest {
  userId: string;
}

export interface DataDeletionRequest {
  dataTypes: string[];
  reason?: 'user_request' | 'account_closure' | 'gdpr_compliance' | 'data_retention';
  scheduledFor?: string;
}

export interface ComplianceResponse {
  message: string;
  requestId?: string;
  data?: any;
}