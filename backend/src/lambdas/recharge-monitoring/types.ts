export interface MonitoringConfig {
  alertThresholds: {
    rechargeFailureRatePercent: number;
    averageProcessingTimeMs: number;
    treasuryBalanceWarningHBAR: number;
    treasuryBalanceCriticalHBAR: number;
    exchangeRateStaleMinutes: number;
    orangeMoneyErrorRatePercent: number;
    hederaErrorRatePercent: number;
    apiResponseTimeMs: number;
  };
  alertConfig: {
    snsTopicArn: string;
    adminEmails: string[];
    slackWebhookUrl?: string;
    enabledAlerts: {
      rechargeFailures: boolean;
      performanceIssues: boolean;
      treasuryBalance: boolean;
      exchangeRateStale: boolean;
      systemErrors: boolean;
    };
  };
}

export interface MonitoringResult {
  timestamp: string;
  requestId: string;
  checksPerformed: string[];
  alertsTriggered: number;
  status: "success" | "partial_failure" | "failure";
  errors?: string[];
}

export interface TreasuryBalanceInfo {
  accountId: string;
  currentBalance: number;
  lastChecked: Date;
  balanceHistory: {
    timestamp: Date;
    balance: number;
  }[];
}

export interface ExchangeRateInfo {
  source: string;
  rate: number;
  lastUpdated: Date;
  confidence: "high" | "medium" | "low";
  staleness: number; // in minutes
}

export interface SystemHealthMetrics {
  rechargeSuccessRate: number;
  averageProcessingTime: number;
  orangeMoneyErrorRate: number;
  hederaErrorRate: number;
  treasuryBalance: number;
  exchangeRateStaleness: number;
  lastUpdated: Date;
}
