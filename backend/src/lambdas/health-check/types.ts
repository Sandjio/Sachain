/**
 * Type definitions for health check Lambda
 */

export interface HealthCheckRequest {
  service?: string; // Optional: check specific service only
  detailed?: boolean; // Optional: include detailed metrics
}

export interface HealthCheckResponse {
  overall: "healthy" | "unhealthy" | "degraded";
  services: ServiceHealthResult[];
  timestamp: string;
  requestId?: string;
}

export interface ServiceHealthResult {
  service: string;
  status: "healthy" | "unhealthy" | "degraded";
  message: string;
  timestamp: string;
  responseTime?: number;
  details?: Record<string, any>;
}

export interface HealthMetrics {
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage?: number;
  activeConnections?: number;
}

export const HealthStatus = {
  HEALTHY: "healthy" as const,
  UNHEALTHY: "unhealthy" as const,
  DEGRADED: "degraded" as const,
};

export const ServiceNames = {
  DYNAMODB: "DynamoDB",
  S3: "S3",
  EVENTBRIDGE: "EventBridge",
  HEDERA: "Hedera",
  IPFS: "IPFS",
} as const;
