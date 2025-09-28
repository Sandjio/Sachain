/**
 * Unit tests for Metrics Collection Lambda
 */

import { handler } from "../index";
import { ProjectRepository } from "../../../repositories/project-repository";
import { projectMetrics } from "../../../utils/project-metrics";

// Mock dependencies
jest.mock("../../../repositories/project-repository");
jest.mock("../../../utils/project-metrics");
jest.mock("../../../utils/structured-logger", () => ({
  createProjectLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
  })),
}));

const mockProjectRepository = ProjectRepository as jest.MockedClass<typeof ProjectRepository>;
const mockProjectMetrics = projectMetrics as jest.Mocked<typeof projectMetrics>;

describe("Metrics Collection Lambda", () => {
  const mockEvent = {
    source: "aws.events",
    "detail-type": "Scheduled Event",
    detail: {},
    id: "test-event-id",
    account: "123456789012",
    time: "2024-01-15T12:00:00Z",
    region: "us-east-1",
    resources: ["arn:aws:events:us-east-1:123456789012:rule/test-rule"],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock environment variables
    process.env.TABLE_NAME = "test-table";
    process.env.AWS_REGION = "us-east-1";
    
    // Setup default mocks
    mockProjectRepository.prototype.getAllProjects = jest.fn();
    mockProjectMetrics.recordDailyProjectsCreated = jest.fn().mockResolvedValue(undefined);
    mockProjectMetrics.recordDailyStocksMinted = jest.fn().mockResolvedValue(undefined);
    mockProjectMetrics.recordProjectsByCategory = jest.fn().mockResolvedValue(undefined);
    mockProjectMetrics.recordProjectsByStatus = jest.fn().mockResolvedValue(undefined);
    mockProjectMetrics.recordDatabaseLatency = jest.fn().mockResolvedValue(undefined);
    mockProjectMetrics.recordBatchMetrics = jest.fn().mockResolvedValue(undefined);
  });

  describe("successful execution", () => {
    it("should collect all metrics successfully", async () => {
      const mockProjects = [
        {
          projectId: "proj-1",
          name: "Project 1",
          category: "Technology",
          status: "active",
          stockSupply: 1000,
          createdAt: "2024-01-15T10:00:00.000Z",
          updatedAt: "2024-01-15T11:00:00.000Z",
        },
        {
          projectId: "proj-2",
          name: "Project 2",
          category: "Healthcare",
          status: "draft",
          stockSupply: 500,
          createdAt: "2024-01-15T14:00:00.000Z",
          updatedAt: "2024-01-15T14:00:00.000Z",
        },
        {
          projectId: "proj-3",
          name: "Project 3",
          category: "Technology",
          status: "active",
          stockSupply: 2000,
          createdAt: "2024-01-14T10:00:00.000Z",
          updatedAt: "2024-01-15T15:00:00.000Z",
        },
      ];

      mockProjectRepository.prototype.getAllProjects.mockResolvedValue({
        items: mockProjects,
        count: mockProjects.length,
        lastEvaluatedKey: undefined,
      });

      const result = await handler(mockEvent, {} as any, {} as any);

      expect(result).toEqual({
        statusCode: 200,
        body: expect.stringContaining("Metrics collection completed successfully"),
      });

      // Verify daily project creation metrics
      expect(mockProjectMetrics.recordDailyProjectsCreated).toHaveBeenCalledWith(
        2, // Projects created on 2024-01-15
        "2024-01-15"
      );

      // Verify category metrics
      expect(mockProjectMetrics.recordProjectsByCategory).toHaveBeenCalledWith("Technology", 1);
      expect(mockProjectMetrics.recordProjectsByCategory).toHaveBeenCalledWith("Healthcare", 1);

      // Verify daily stock minting metrics
      expect(mockProjectMetrics.recordDailyStocksMinted).toHaveBeenCalledWith(
        2000, // Only proj-3 was minted today (status active + updated today)
        "2024-01-15"
      );

      // Verify status distribution metrics
      expect(mockProjectMetrics.recordProjectsByStatus).toHaveBeenCalledWith("active", 2);
      expect(mockProjectMetrics.recordProjectsByStatus).toHaveBeenCalledWith("draft", 1);

      // Verify performance metrics
      expect(mockProjectMetrics.recordDatabaseLatency).toHaveBeenCalledWith(
        "read",
        "project",
        expect.any(Number)
      );

      expect(mockProjectMetrics.recordBatchMetrics).toHaveBeenCalledWith({
        projectCreations: { success: 1, failures: 0 },
      });
    });

    it("should handle empty project list", async () => {
      mockProjectRepository.prototype.getAllProjects.mockResolvedValue({
        items: [],
        count: 0,
        lastEvaluatedKey: undefined,
      });

      const result = await handler(mockEvent, {} as any, {} as any);

      expect(result).toEqual({
        statusCode: 200,
        body: expect.stringContaining("Metrics collection completed successfully"),
      });

      // Should record zero metrics
      expect(mockProjectMetrics.recordDailyProjectsCreated).toHaveBeenCalledWith(0, "2024-01-15");
      expect(mockProjectMetrics.recordDailyStocksMinted).toHaveBeenCalledWith(0, "2024-01-15");
    });

    it("should correctly filter projects by date", async () => {
      const mockProjects = [
        {
          projectId: "proj-1",
          name: "Project 1",
          category: "Technology",
          status: "active",
          stockSupply: 1000,
          createdAt: "2024-01-15T10:00:00.000Z", // Created today
          updatedAt: "2024-01-15T10:00:00.000Z",
        },
        {
          projectId: "proj-2",
          name: "Project 2",
          category: "Healthcare",
          status: "active",
          stockSupply: 500,
          createdAt: "2024-01-14T10:00:00.000Z", // Created yesterday
          updatedAt: "2024-01-15T11:00:00.000Z", // Updated today
        },
        {
          projectId: "proj-3",
          name: "Project 3",
          category: "Finance",
          status: "draft",
          stockSupply: 750,
          createdAt: "2024-01-13T10:00:00.000Z", // Created day before yesterday
          updatedAt: "2024-01-14T10:00:00.000Z", // Updated yesterday
        },
      ];

      mockProjectRepository.prototype.getAllProjects.mockResolvedValue({
        items: mockProjects,
        count: mockProjects.length,
        lastEvaluatedKey: undefined,
      });

      await handler(mockEvent, {} as any, {} as any);

      // Only proj-1 was created today
      expect(mockProjectMetrics.recordDailyProjectsCreated).toHaveBeenCalledWith(1, "2024-01-15");

      // Only proj-2 was minted today (active status + updated today)
      expect(mockProjectMetrics.recordDailyStocksMinted).toHaveBeenCalledWith(500, "2024-01-15");
    });
  });

  describe("error handling", () => {
    it("should handle repository errors gracefully", async () => {
      const repositoryError = new Error("Database connection failed");
      mockProjectRepository.prototype.getAllProjects.mockRejectedValue(repositoryError);

      await expect(handler(mockEvent, {} as any, {} as any)).rejects.toThrow(
        "Database connection failed"
      );

      // Should record failure metrics
      expect(mockProjectMetrics.recordBatchMetrics).toHaveBeenCalledWith({
        projectCreations: { success: 0, failures: 1 },
      });
    });

    it("should handle metrics recording errors", async () => {
      mockProjectRepository.prototype.getAllProjects.mockResolvedValue({
        items: [],
        count: 0,
        lastEvaluatedKey: undefined,
      });

      const metricsError = new Error("CloudWatch API error");
      mockProjectMetrics.recordDailyProjectsCreated.mockRejectedValue(metricsError);

      await expect(handler(mockEvent, {} as any, {} as any)).rejects.toThrow(
        "CloudWatch API error"
      );
    });

    it("should handle partial failures in metrics collection", async () => {
      mockProjectRepository.prototype.getAllProjects
        .mockResolvedValueOnce({
          items: [
            {
              projectId: "proj-1",
              name: "Project 1",
              category: "Technology",
              status: "active",
              stockSupply: 1000,
              createdAt: "2024-01-15T10:00:00.000Z",
              updatedAt: "2024-01-15T10:00:00.000Z",
            },
          ],
          count: 1,
          lastEvaluatedKey: undefined,
        })
        .mockRejectedValueOnce(new Error("Second call failed"));

      await expect(handler(mockEvent, {} as any, {} as any)).rejects.toThrow(
        "Second call failed"
      );

      // First metrics collection should have succeeded
      expect(mockProjectMetrics.recordDailyProjectsCreated).toHaveBeenCalledWith(1, "2024-01-15");
    });
  });

  describe("date handling", () => {
    it("should use current date for metrics collection", async () => {
      const mockDate = new Date("2024-01-15T12:00:00.000Z");
      jest.spyOn(global, "Date").mockImplementation(() => mockDate as any);

      mockProjectRepository.prototype.getAllProjects.mockResolvedValue({
        items: [],
        count: 0,
        lastEvaluatedKey: undefined,
      });

      await handler(mockEvent, {} as any, {} as any);

      expect(mockProjectMetrics.recordDailyProjectsCreated).toHaveBeenCalledWith(0, "2024-01-15");
      expect(mockProjectMetrics.recordDailyStocksMinted).toHaveBeenCalledWith(0, "2024-01-15");

      jest.restoreAllMocks();
    });

    it("should correctly calculate start and end of day", async () => {
      const mockProjects = [
        {
          projectId: "proj-1",
          name: "Project 1",
          category: "Technology",
          status: "active",
          stockSupply: 1000,
          createdAt: "2024-01-15T00:00:00.000Z", // Start of day
          updatedAt: "2024-01-15T00:00:00.000Z",
        },
        {
          projectId: "proj-2",
          name: "Project 2",
          category: "Healthcare",
          status: "active",
          stockSupply: 500,
          createdAt: "2024-01-15T23:59:59.999Z", // End of day
          updatedAt: "2024-01-15T23:59:59.999Z",
        },
        {
          projectId: "proj-3",
          name: "Project 3",
          category: "Finance",
          status: "active",
          stockSupply: 750,
          createdAt: "2024-01-16T00:00:00.000Z", // Next day
          updatedAt: "2024-01-16T00:00:00.000Z",
        },
      ];

      mockProjectRepository.prototype.getAllProjects.mockResolvedValue({
        items: mockProjects,
        count: mockProjects.length,
        lastEvaluatedKey: undefined,
      });

      await handler(mockEvent, {} as any, {} as any);

      // Should include projects 1 and 2, but not 3
      expect(mockProjectMetrics.recordDailyProjectsCreated).toHaveBeenCalledWith(2, "2024-01-15");
    });
  });

  describe("category and status aggregation", () => {
    it("should correctly aggregate projects by category", async () => {
      const mockProjects = [
        {
          projectId: "proj-1",
          name: "Project 1",
          category: "Technology",
          status: "active",
          stockSupply: 1000,
          createdAt: "2024-01-15T10:00:00.000Z",
          updatedAt: "2024-01-15T10:00:00.000Z",
        },
        {
          projectId: "proj-2",
          name: "Project 2",
          category: "Technology",
          status: "draft",
          stockSupply: 500,
          createdAt: "2024-01-15T11:00:00.000Z",
          updatedAt: "2024-01-15T11:00:00.000Z",
        },
        {
          projectId: "proj-3",
          name: "Project 3",
          category: "Healthcare",
          status: "active",
          stockSupply: 750,
          createdAt: "2024-01-15T12:00:00.000Z",
          updatedAt: "2024-01-15T12:00:00.000Z",
        },
      ];

      mockProjectRepository.prototype.getAllProjects.mockResolvedValue({
        items: mockProjects,
        count: mockProjects.length,
        lastEvaluatedKey: undefined,
      });

      await handler(mockEvent, {} as any, {} as any);

      // Should record category metrics for projects created today
      expect(mockProjectMetrics.recordProjectsByCategory).toHaveBeenCalledWith("Technology", 2);
      expect(mockProjectMetrics.recordProjectsByCategory).toHaveBeenCalledWith("Healthcare", 1);

      // Should also record overall category distribution
      expect(mockProjectMetrics.recordProjectsByCategory).toHaveBeenCalledTimes(4); // 2 for daily + 2 for overall
    });

    it("should correctly aggregate projects by status", async () => {
      const mockProjects = [
        {
          projectId: "proj-1",
          name: "Project 1",
          category: "Technology",
          status: "active",
          stockSupply: 1000,
          createdAt: "2024-01-15T10:00:00.000Z",
          updatedAt: "2024-01-15T10:00:00.000Z",
        },
        {
          projectId: "proj-2",
          name: "Project 2",
          category: "Healthcare",
          status: "active",
          stockSupply: 500,
          createdAt: "2024-01-15T11:00:00.000Z",
          updatedAt: "2024-01-15T11:00:00.000Z",
        },
        {
          projectId: "proj-3",
          name: "Project 3",
          category: "Finance",
          status: "draft",
          stockSupply: 750,
          createdAt: "2024-01-15T12:00:00.000Z",
          updatedAt: "2024-01-15T12:00:00.000Z",
        },
        {
          projectId: "proj-4",
          name: "Project 4",
          category: "Technology",
          status: "paused",
          stockSupply: 250,
          createdAt: "2024-01-15T13:00:00.000Z",
          updatedAt: "2024-01-15T13:00:00.000Z",
        },
      ];

      mockProjectRepository.prototype.getAllProjects.mockResolvedValue({
        items: mockProjects,
        count: mockProjects.length,
        lastEvaluatedKey: undefined,
      });

      await handler(mockEvent, {} as any, {} as any);

      expect(mockProjectMetrics.recordProjectsByStatus).toHaveBeenCalledWith("active", 2);
      expect(mockProjectMetrics.recordProjectsByStatus).toHaveBeenCalledWith("draft", 1);
      expect(mockProjectMetrics.recordProjectsByStatus).toHaveBeenCalledWith("paused", 1);
    });
  });
});