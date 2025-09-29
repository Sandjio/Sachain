#!/usr/bin/env ts-node

/**
 * Simple health check script
 */

import { HealthCheckService } from "../src/utils/health-check";

async function main() {
  console.log("🏥 Running health check...\n");

  try {
    const healthCheckService = new HealthCheckService();
    const result = await healthCheckService.performHealthCheck();

    // Display results
    console.log(`Overall Status: ${result.overall.toUpperCase()}`);
    console.log(`Timestamp: ${result.timestamp}\n`);

    console.log("Service Status:");
    for (const service of result.services) {
      const emoji =
        service.status === "healthy"
          ? "✅"
          : service.status === "degraded"
          ? "⚠️"
          : "❌";

      console.log(`  ${emoji} ${service.service}: ${service.message}`);

      if (service.responseTime) {
        console.log(`     Response time: ${service.responseTime}ms`);
      }
    }

    // Exit with appropriate code
    const exitCode =
      result.overall === "healthy" ? 0 : result.overall === "degraded" ? 0 : 1;

    console.log(
      `\n${
        result.overall === "healthy"
          ? "✅"
          : result.overall === "degraded"
          ? "⚠️"
          : "❌"
      } Health check ${
        result.overall === "healthy" ? "passed" : "completed with issues"
      }`
    );

    process.exit(exitCode);
  } catch (error) {
    console.error("❌ Health check failed:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
