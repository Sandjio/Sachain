/**
 * Unit tests for IPFS metadata service
 * Tests metadata storage, retrieval, validation, and error handling
 */

import {
  IPFSService,
  IPFSServiceError,
  IPFSErrorCodes,
  ProjectMetadata,
  StockMetadata,
} from "../ipfs-service";

// Mock fetch for HTTP requests
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock structured logger
jest.mock("../structured-logger", () => ({
  StructuredLogger: {
    getInstance: jest.fn(() => ({
      logOperationStart: jest.fn(),
      logOperationSuccess: jest.fn(),
      logOperationError: jest.fn(),
    })),
  },
}));

describe("IPFSService", () => {
  let ipfsService: IPFSService;

  const validProjectMetadata: ProjectMetadata = {
    name: "Test Project",
    description: "A test project for unit testing",
    image: "https://example.com/image.jpg",
    external_url: "https://example.com/project",
    attributes: [
      { trait_type: "Category", value: "Technology" },
      { trait_type: "Funding Goal", value: 100000 },
    ],
  };

  const validStockMetadata: StockMetadata = {
    name: "Test Project Stock #1",
    description: "Stock #1 of Test Project",
    image: "https://example.com/stock-image.jpg",
    external_url: "https://example.com/project/stock/1",
    attributes: [
      { trait_type: "Stock Number", value: 1 },
      { trait_type: "Project ID", value: "proj_123" },
    ],
    project_id: "proj_123",
    stock_number: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    ipfsService = new IPFSService({
      url: "http://localhost:5001",
      timeout: 5000,
      maxRetries: 2,
    });
  });

  describe("storeProjectMetadata", () => {
    it("should successfully store valid project metadata", async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          Hash: "QmTestHash123",
          Size: "1024",
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await ipfsService.storeProjectMetadata(
        validProjectMetadata
      );

      expect(result).toEqual({
        hash: "QmTestHash123",
        uri: "ipfs://QmTestHash123",
        size: 1024,
      });
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5001/api/v0/add?pin=true&cid-version=1",
        expect.objectContaining({
          method: "POST",
          body: expect.any(FormData),
        })
      );
    });
    it("should validate project metadata before upload", async () => {
      const invalidMetadata = {
        ...validProjectMetadata,
        name: "", // Invalid empty name
      };

      await expect(
        ipfsService.storeProjectMetadata(invalidMetadata as ProjectMetadata)
      ).rejects.toThrow(IPFSServiceError);
    });

    it("should handle IPFS upload failures with retry", async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          Hash: "QmTestHash123",
          Size: "1024",
        }),
      };

      mockFetch
        .mockRejectedValueOnce(new Error("Network connection failed"))
        .mockRejectedValueOnce(new Error("Network connection failed"))
        .mockResolvedValue(mockResponse);

      const result = await ipfsService.storeProjectMetadata(
        validProjectMetadata
      );

      expect(result.hash).toBe("QmTestHash123");
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("should throw IPFSServiceError after max retries exceeded", async () => {
      const uploadError = new Error("Persistent network failure");
      mockFetch.mockRejectedValue(uploadError);

      await expect(
        ipfsService.storeProjectMetadata(validProjectMetadata)
      ).rejects.toThrow(IPFSServiceError);
    });

    it("should handle HTTP error responses", async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(
        ipfsService.storeProjectMetadata(validProjectMetadata)
      ).rejects.toThrow(IPFSServiceError);
    });
  });

  describe("storeStockMetadata", () => {
    it("should successfully store valid stock metadata", async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          Hash: "QmStockHash456",
          Size: "512",
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await ipfsService.storeStockMetadata(validStockMetadata);

      expect(result).toEqual({
        hash: "QmStockHash456",
        uri: "ipfs://QmStockHash456",
        size: 512,
      });
    });

    it("should validate stock metadata before upload", async () => {
      const invalidMetadata = {
        ...validStockMetadata,
        stock_number: -1, // Invalid negative stock number
      };

      await expect(
        ipfsService.storeStockMetadata(invalidMetadata as StockMetadata)
      ).rejects.toThrow(IPFSServiceError);
    });

    it("should validate required stock-specific fields", async () => {
      const invalidMetadata = {
        ...validStockMetadata,
        project_id: "", // Invalid empty project ID
      };

      await expect(
        ipfsService.storeStockMetadata(invalidMetadata as StockMetadata)
      ).rejects.toThrow(IPFSServiceError);
    });
  });

  describe("getMetadata", () => {
    it("should retrieve metadata from IPFS URI", async () => {
      const mockMetadata = { name: "Test", description: "Test description" };
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockMetadata)),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await ipfsService.getMetadata("ipfs://QmTestHash123");

      expect(result).toEqual(mockMetadata);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5001/api/v0/cat?arg=QmTestHash123",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    it("should handle different URI formats", async () => {
      const mockMetadata = { name: "Test" };
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockMetadata)),
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Test ipfs:// format
      await ipfsService.getMetadata("ipfs://QmTestHash123");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5001/api/v0/cat?arg=QmTestHash123",
        expect.any(Object)
      );

      // Test /ipfs/ format
      await ipfsService.getMetadata("/ipfs/QmTestHash456");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5001/api/v0/cat?arg=QmTestHash456",
        expect.any(Object)
      );

      // Test raw hash
      await ipfsService.getMetadata("QmTestHash789");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5001/api/v0/cat?arg=QmTestHash789",
        expect.any(Object)
      );
    });

    it("should handle retrieval failures", async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: "Not Found",
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(
        ipfsService.getMetadata("ipfs://QmInvalidHash")
      ).rejects.toThrow(IPFSServiceError);
    });

    it("should handle invalid JSON content", async () => {
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue("invalid json content"),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(
        ipfsService.getMetadata("ipfs://QmTestHash123")
      ).rejects.toThrow(IPFSServiceError);
    });
  });
  describe("pinContent", () => {
    it("should successfully pin content", async () => {
      const mockResponse = {
        ok: true,
      };
      mockFetch.mockResolvedValue(mockResponse);

      await ipfsService.pinContent("QmTestHash123");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5001/api/v0/pin/add?arg=QmTestHash123",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    it("should handle pinning failures with retry", async () => {
      const mockResponse = {
        ok: true,
      };

      mockFetch
        .mockRejectedValueOnce(new Error("Pinning service unavailable"))
        .mockResolvedValue(mockResponse);

      await ipfsService.pinContent("QmTestHash123");

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should throw error after max retries for pinning", async () => {
      const pinError = new Error("Persistent pinning failure");
      mockFetch.mockRejectedValue(pinError);

      await expect(ipfsService.pinContent("QmTestHash123")).rejects.toThrow(
        IPFSServiceError
      );
    });
  });

  describe("unpinContent", () => {
    it("should successfully unpin content", async () => {
      const mockResponse = {
        ok: true,
      };
      mockFetch.mockResolvedValue(mockResponse);

      await ipfsService.unpinContent("QmTestHash123");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5001/api/v0/pin/rm?arg=QmTestHash123",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    it("should handle unpinning failures", async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(ipfsService.unpinContent("QmTestHash123")).rejects.toThrow(
        IPFSServiceError
      );
    });
  });
  describe("metadata validation", () => {
    describe("project metadata validation", () => {
      it("should reject metadata with missing name", async () => {
        const invalidMetadata = { ...validProjectMetadata, name: "" };

        await expect(
          ipfsService.storeProjectMetadata(invalidMetadata as ProjectMetadata)
        ).rejects.toThrow("Project name is required");
      });

      it("should reject metadata with missing description", async () => {
        const invalidMetadata = { ...validProjectMetadata, description: "" };

        await expect(
          ipfsService.storeProjectMetadata(invalidMetadata as ProjectMetadata)
        ).rejects.toThrow("Project description is required");
      });

      it("should reject metadata with invalid attributes", async () => {
        const invalidMetadata = {
          ...validProjectMetadata,
          attributes: [{ trait_type: "", value: "test" }],
        };

        await expect(
          ipfsService.storeProjectMetadata(invalidMetadata as ProjectMetadata)
        ).rejects.toThrow("trait_type is required");
      });

      it("should reject metadata with missing attribute values", async () => {
        const invalidMetadata = {
          ...validProjectMetadata,
          attributes: [{ trait_type: "test", value: null }],
        };

        await expect(
          ipfsService.storeProjectMetadata(
            invalidMetadata as unknown as ProjectMetadata
          )
        ).rejects.toThrow("value is required");
      });
    });

    describe("stock metadata validation", () => {
      it("should reject metadata with invalid stock number", async () => {
        const invalidMetadata = { ...validStockMetadata, stock_number: 0 };

        await expect(
          ipfsService.storeStockMetadata(invalidMetadata as StockMetadata)
        ).rejects.toThrow(
          "Stock number is required and must be a positive integer"
        );
      });

      it("should reject metadata with missing project ID", async () => {
        const invalidMetadata = { ...validStockMetadata, project_id: "" };

        await expect(
          ipfsService.storeStockMetadata(invalidMetadata as StockMetadata)
        ).rejects.toThrow("Project ID is required");
      });

      it("should accept valid stock metadata with all required fields", async () => {
        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({
            Hash: "QmValidHash",
            Size: "256",
          }),
        };
        mockFetch.mockResolvedValue(mockResponse);

        const result = await ipfsService.storeStockMetadata(validStockMetadata);

        expect(result.hash).toBe("QmValidHash");
      });
    });
  });

  describe("error handling", () => {
    it("should handle timeout errors", async () => {
      const timeoutError = new Error("Request timeout");
      timeoutError.name = "TimeoutError";
      mockFetch.mockRejectedValue(timeoutError);

      await expect(
        ipfsService.storeProjectMetadata(validProjectMetadata)
      ).rejects.toMatchObject({
        code: IPFSErrorCodes.TIMEOUT_ERROR,
        statusCode: 408,
      });
    });

    it("should handle connection errors", async () => {
      const connectionError = new Error("Connection refused");
      mockFetch.mockRejectedValue(connectionError);

      await expect(
        ipfsService.storeProjectMetadata(validProjectMetadata)
      ).rejects.toMatchObject({
        code: IPFSErrorCodes.CONNECTION_ERROR,
        statusCode: 503,
      });
    });

    it("should preserve IPFSServiceError instances", async () => {
      // Mock validation to throw custom error
      const invalidMetadata = { ...validProjectMetadata, name: null };

      await expect(
        ipfsService.storeProjectMetadata(invalidMetadata as any)
      ).rejects.toBeInstanceOf(IPFSServiceError);
    });
  });

  describe("configuration", () => {
    it("should use default configuration when none provided", () => {
      const defaultService = new IPFSService();
      expect(defaultService).toBeInstanceOf(IPFSService);
    });

    it("should use custom configuration when provided", () => {
      const customConfig = {
        url: "https://custom-ipfs.example.com:5001",
        timeout: 60000,
        maxRetries: 5,
      };

      const customService = new IPFSService(customConfig);
      expect(customService).toBeInstanceOf(IPFSService);
    });

    it("should use environment variables for default URL", () => {
      const originalEnv = process.env.IPFS_URL;
      process.env.IPFS_URL = "https://env-ipfs.example.com:5001";

      const envService = new IPFSService();
      expect(envService).toBeInstanceOf(IPFSService);

      // Restore original environment
      if (originalEnv) {
        process.env.IPFS_URL = originalEnv;
      } else {
        delete process.env.IPFS_URL;
      }
    });
  });

  describe("integration scenarios", () => {
    it("should handle complete project metadata workflow", async () => {
      // Mock successful upload
      const uploadResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          Hash: "QmProjectHash",
          Size: "1024",
        }),
      };

      // Mock successful pinning
      const pinResponse = {
        ok: true,
      };

      mockFetch
        .mockResolvedValueOnce(uploadResponse)
        .mockResolvedValueOnce(pinResponse);

      // Store metadata
      const uploadResult = await ipfsService.storeProjectMetadata(
        validProjectMetadata
      );
      expect(uploadResult.hash).toBe("QmProjectHash");

      // Pin the content
      await ipfsService.pinContent(uploadResult.hash);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should handle complete stock metadata workflow", async () => {
      // Mock successful upload
      const uploadResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          Hash: "QmStockHash",
          Size: "512",
        }),
      };

      // Mock successful retrieval
      const retrieveResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(validStockMetadata)),
      };

      mockFetch
        .mockResolvedValueOnce(uploadResponse)
        .mockResolvedValueOnce(retrieveResponse);

      // Store metadata
      const uploadResult = await ipfsService.storeStockMetadata(
        validStockMetadata
      );
      expect(uploadResult.hash).toBe("QmStockHash");

      // Retrieve metadata
      const retrievedMetadata = await ipfsService.getMetadata(uploadResult.uri);
      expect(retrievedMetadata).toEqual(validStockMetadata);
    });
  });
});
