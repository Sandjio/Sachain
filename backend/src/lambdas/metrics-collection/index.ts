/**
 * Scheduled Lambda function for collecting daily business metrics
 * Runs daily to aggregate and publish business KPIs to CloudWatch
 */

import { ScheduledHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

import { createProjectLogger } from "../../utils/structured-logger";
import { ProjectRepository } from "../../repositories/project-repository";
import { projectMetrics } from "../../utils/project-metrics";

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.TABLE_NAME!;
const AWS_REGION = process.env.AWS_REGION || "us-east-1";

const logger = createProjectLogger();

const projectRepository = new ProjectRepository({
  tableName: TABLE_NAME,
  region: AWS_REGION,
});

export const handler: ScheduledHandler = async (event) => {
  const startTime = Date.now();
  const executionDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

  logger.info("Metrics collection Lambda triggered", {
    operation: "MetricsCollection",
    executionDate,
    eventSource: event.source,
  });

  try {
    // Collect daily project creation metrics
    await collectProjectCreationMetrics(executionDate);

    // Collect daily stock minting metrics
    await collectStockMintingMetrics(executionDate);

    // Collect project status distribution metrics
    await collectProjectStatusMetrics();

    // Collect project category distribution metrics
    await collectProjectCategoryMetrics();

    // Collect performance metrics
    await collectPerformanceMetrics();

    const duration = Date.now() - startTime;
    logger.info("Metrics collection completed successfully", {
      operation: "MetricsCollection",
      executionDate,
      duration,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Metrics collection completed successfully",
        executionDate,
        duration,
      }),
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error("Metrics collection failed", {
      operation: "MetricsCollection",
      executionDate,
      duration,
    }, error as Error);

    throw error;
  }
};

/**
 * Collect daily project creation metrics
 */
async function collectProjectCreationMetrics(date: string): Promise<void> {
  const startTime = Date.now();
  
  logger.info("Collecting project creation metrics", {
    operation: "ProjectCreationMetrics",
    date,
  });

  try {
    // Get projects created today
    const startOfDay = new Date(date + 'T00:00:00.000Z').toISOString();
    const endOfDay = new Date(date + 'T23:59:59.999Z').toISOString();

    // Query projects by creation date (this would need GSI implementation)
    // For now, we'll get all projects and filter (not optimal for production)
    const allProjects = await projectRepository.getAllProjects({ limit: 1000 });
    
    const projectsCreatedToday = allProjects.items.filter(project => 
      project.createdAt >= startOfDay && project.createdAt <= endOfDay
    );

    // Record daily metrics
    await projectMetrics.recordDailyProjectsCreated(projectsCreatedToday.length, date);

    // Record metrics by category
    const categoryCount: Record<string, number> = {};
    projectsCreatedToday.forEach(project => {
      categoryCount[project.category] = (categoryCount[project.category] || 0) + 1;
    });

    for (const [category, count] of Object.entries(categoryCount)) {
      await projectMetrics.recordProjectsByCategory(category, count);
    }

    const duration = Date.now() - startTime;
    logger.info("Project creation metrics collected", {
      operation: "ProjectCreationMetrics",
      date,
      projectsCreated: projectsCreatedToday.length,
      categories: Object.keys(categoryCount).length,
      duration,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error("Failed to collect project creation metrics", {
      operation: "ProjectCreationMetrics",
      date,
      duration,
    }, error as Error);
    
    throw error;
  }
}

/**
 * Collect daily stock minting metrics
 */
async function collectStockMintingMetrics(date: string): Promise<void> {
  const startTime = Date.now();
  
  logger.info("Collecting stock minting metrics", {
    operation: "StockMintingMetrics",
    date,
  });

  try {
    // Get all projects to calculate total stocks minted
    const allProjects = await projectRepository.getAllProjects({ limit: 1000 });
    
    // Filter projects that were minted today (status changed to active today)
    const startOfDay = new Date(date + 'T00:00:00.000Z').toISOString();
    const endOfDay = new Date(date + 'T23:59:59.999Z').toISOString();
    
    const projectsMintedToday = allProjects.items.filter(project => 
      project.status === 'active' && 
      project.updatedAt >= startOfDay && 
      project.updatedAt <= endOfDay
    );

    const totalStocksMinted = projectsMintedToday.reduce(
      (total, project) => total + project.stockSupply, 
      0
    );

    // Record daily stock minting metrics
    await projectMetrics.recordDailyStocksMinted(totalStocksMinted, date);

    const duration = Date.now() - startTime;
    logger.info("Stock minting metrics collected", {
      operation: "StockMintingMetrics",
      date,
      projectsMinted: projectsMintedToday.length,
      totalStocksMinted,
      duration,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error("Failed to collect stock minting metrics", {
      operation: "StockMintingMetrics",
      date,
      duration,
    }, error as Error);
    
    throw error;
  }
}

/**
 * Collect project status distribution metrics
 */
async function collectProjectStatusMetrics(): Promise<void> {
  const startTime = Date.now();
  
  logger.info("Collecting project status metrics", {
    operation: "ProjectStatusMetrics",
  });

  try {
    // Get all projects
    const allProjects = await projectRepository.getAllProjects({ limit: 1000 });
    
    // Count projects by status
    const statusCount: Record<string, number> = {};
    allProjects.items.forEach(project => {
      statusCount[project.status] = (statusCount[project.status] || 0) + 1;
    });

    // Record status distribution metrics
    for (const [status, count] of Object.entries(statusCount)) {
      await projectMetrics.recordProjectsByStatus(status, count);
    }

    const duration = Date.now() - startTime;
    logger.info("Project status metrics collected", {
      operation: "ProjectStatusMetrics",
      statusDistribution: statusCount,
      totalProjects: allProjects.items.length,
      duration,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error("Failed to collect project status metrics", {
      operation: "ProjectStatusMetrics",
      duration,
    }, error as Error);
    
    throw error;
  }
}

/**
 * Collect project category distribution metrics
 */
async function collectProjectCategoryMetrics(): Promise<void> {
  const startTime = Date.now();
  
  logger.info("Collecting project category metrics", {
    operation: "ProjectCategoryMetrics",
  });

  try {
    // Get all projects
    const allProjects = await projectRepository.getAllProjects({ limit: 1000 });
    
    // Count projects by category
    const categoryCount: Record<string, number> = {};
    allProjects.items.forEach(project => {
      categoryCount[project.category] = (categoryCount[project.category] || 0) + 1;
    });

    // Record category distribution metrics
    for (const [category, count] of Object.entries(categoryCount)) {
      await projectMetrics.recordProjectsByCategory(category, count);
    }

    const duration = Date.now() - startTime;
    logger.info("Project category metrics collected", {
      operation: "ProjectCategoryMetrics",
      categoryDistribution: categoryCount,
      totalProjects: allProjects.items.length,
      duration,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error("Failed to collect project category metrics", {
      operation: "ProjectCategoryMetrics",
      duration,
    }, error as Error);
    
    throw error;
  }
}

/**
 * Collect performance metrics and system health
 */
async function collectPerformanceMetrics(): Promise<void> {
  const startTime = Date.now();
  
  logger.info("Collecting performance metrics", {
    operation: "PerformanceMetrics",
  });

  try {
    // Test database performance
    const dbStartTime = Date.now();
    await projectRepository.getAllProjects({ limit: 1 });
    const dbDuration = Date.now() - dbStartTime;
    
    await projectMetrics.recordDatabaseLatency("read", "project", dbDuration);

    // Record batch metrics for system health
    await projectMetrics.recordBatchMetrics({
      projectCreations: { success: 1, failures: 0 }, // Health check success
    });

    const duration = Date.now() - startTime;
    logger.info("Performance metrics collected", {
      operation: "PerformanceMetrics",
      databaseLatency: dbDuration,
      duration,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Record system health failure
    await projectMetrics.recordBatchMetrics({
      projectCreations: { success: 0, failures: 1 },
    });
    
    logger.error("Failed to collect performance metrics", {
      operation: "PerformanceMetrics",
      duration,
    }, error as Error);
    
    throw error;
  }
}