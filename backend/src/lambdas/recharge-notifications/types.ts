/**
 * Types for Recharge Notification Handler Lambda
 */

// Notification configuration
export interface NotificationConfig {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  retryAttempts: number;
  retryDelay: number;
}

// Notification templates
export interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  bodyTemplate: string;
  smsTemplate?: string;
  variables: string[];
}

// Notification request
export interface NotificationRequest {
  userId: string;
  type: NotificationType;
  channel: NotificationChannel[];
  template: string;
  data: Record<string, any>;
  priority: "high" | "normal" | "low";
}

// Notification types
export type NotificationType =
  | "recharge-success"
  | "recharge-failed"
  | "recharge-retry"
  | "recharge-complete"
  | "conversion-completed"
  | "conversion-failed";

// Notification channels
export type NotificationChannel = "email" | "sms" | "push";

// Notification result
export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: {
    code: string;
    message: string;
  };
}

// Batch notification request
export interface BatchNotificationRequest {
  notifications: NotificationRequest[];
  batchId: string;
  priority: "high" | "normal" | "low";
}

// Batch notification result
export interface BatchNotificationResult {
  batchId: string;
  totalRequests: number;
  successful: number;
  failed: number;
  results: Array<{
    userId: string;
    success: boolean;
    error?: string;
  }>;
}

// User notification preferences
export interface UserNotificationPreferences {
  userId: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  rechargeNotifications: boolean;
  failureNotifications: boolean;
  marketingNotifications: boolean;
  language: string;
  timezone: string;
}

// Notification delivery status
export interface NotificationDeliveryStatus {
  messageId: string;
  userId: string;
  channel: NotificationChannel;
  status: "sent" | "delivered" | "failed" | "bounced";
  timestamp: string;
  error?: string;
}

// Notification metrics
export interface NotificationMetrics {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  deliveryRate: number;
  averageDeliveryTime: number;
  channelBreakdown: Record<NotificationChannel, number>;
  typeBreakdown: Record<NotificationType, number>;
}

// Template rendering context
export interface TemplateContext {
  user: {
    id: string;
    name?: string;
    email?: string;
    phone?: string;
    language?: string;
  };
  transaction: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    timestamp: string;
  };
  system: {
    appName: string;
    supportEmail: string;
    supportPhone: string;
    baseUrl: string;
  };
}

// Notification queue item
export interface NotificationQueueItem {
  id: string;
  userId: string;
  type: NotificationType;
  channels: NotificationChannel[];
  data: Record<string, any>;
  priority: "high" | "normal" | "low";
  scheduledAt: string;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: string;
  status: "pending" | "processing" | "sent" | "failed";
}

// Notification service configuration
export interface NotificationServiceConfig {
  region?: string;
  emailService: {
    enabled: boolean;
    fromAddress: string;
    replyToAddress?: string;
    sesConfigurationSet?: string;
  };
  smsService: {
    enabled: boolean;
    defaultSenderId?: string;
    snsTopicArn?: string;
  };
  pushService: {
    enabled: boolean;
    fcmServerKey?: string;
    apnsKeyId?: string;
  };
  templates: {
    defaultLanguage: string;
    supportedLanguages: string[];
    templateBucket?: string;
  };
  retry: {
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
  };
}

// Event-driven notification context
export interface EventNotificationContext {
  eventId: string;
  eventType: string;
  source: string;
  timestamp: string;
  transactionId: string;
  userId: string;
}

// Admin notification types
export interface AdminNotification {
  type: "system-alert" | "failure-alert" | "threshold-alert";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  message: string;
  data: Record<string, any>;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

// Notification audit log
export interface NotificationAuditLog {
  id: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  status: "sent" | "delivered" | "failed";
  messageId?: string;
  error?: string;
  timestamp: string;
  metadata: Record<string, any>;
}

// Notification rate limiting
export interface NotificationRateLimit {
  userId: string;
  channel: NotificationChannel;
  count: number;
  windowStart: string;
  windowEnd: string;
  limitExceeded: boolean;
}

// Template validation result
export interface TemplateValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
  }>;
}

// Notification analytics
export interface NotificationAnalytics {
  period: string;
  totalNotifications: number;
  deliveryRate: number;
  openRate?: number;
  clickRate?: number;
  unsubscribeRate?: number;
  channelPerformance: Record<
    NotificationChannel,
    {
      sent: number;
      delivered: number;
      failed: number;
      deliveryRate: number;
    }
  >;
  typePerformance: Record<
    NotificationType,
    {
      sent: number;
      delivered: number;
      failed: number;
      deliveryRate: number;
    }
  >;
}
