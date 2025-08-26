// Unit tests for project validation utilities

import {
  validateProjectName,
  validateProjectDescription,
  validateProjectCategory,
  validateStockSupply,
  validateTargetFundingGoal,
  validatePricePerStock,
  validateEntrepreneurId,
  validateCreateProjectInput,
  validateCreateStockNFTInput,
  sanitizeProjectInput,
  transformProjectInputToEntity,
} from "../project-validation";
import { CreateProjectInput, CreateStockNFTInput } from "../../models/project";

describe("Project Validation", () => {
  describe("validateProjectName", () => {
    it("should accept valid project names", () => {
      const validNames = [
        "My Startup",
        "Tech Company 2024",
        "Green Energy Solutions!",
        "AI-Powered Platform",
        "Food & Beverage Co.",
        "Simple Name",
      ];

      validNames.forEach((name) => {
        const result = validateProjectName(name);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it("should reject names that are too short", () => {
      const result = validateProjectName("AB");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("at least 3 characters");
    });

    it("should reject names that are too long", () => {
      const longName = "A".repeat(101);
      const result = validateProjectName(longName);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("must not exceed 100 characters");
    });

    it("should reject names with invalid characters", () => {
      const invalidNames = [
        "Project@Name",
        "Name#With#Hash",
        "Name$With$Dollar",
        "Name%With%Percent",
        "Name*With*Asterisk",
      ];

      invalidNames.forEach((name) => {
        const result = validateProjectName(name);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain(
          "can only contain letters, numbers, spaces, and basic punctuation"
        );
      });
    });

    it("should reject empty or null names", () => {
      expect(validateProjectName("").isValid).toBe(false);
      expect(validateProjectName("   ").isValid).toBe(false);
      expect(validateProjectName(null as any).isValid).toBe(false);
      expect(validateProjectName(undefined as any).isValid).toBe(false);
    });
  });

  describe("validateProjectDescription", () => {
    it("should accept valid descriptions", () => {
      const validDescription =
        "This is a comprehensive description of our innovative startup that aims to revolutionize the industry with cutting-edge technology and sustainable practices.";
      const result = validateProjectDescription(validDescription);
      expect(result.isValid).toBe(true);
    });

    it("should reject descriptions that are too short", () => {
      const shortDescription = "Too short";
      const result = validateProjectDescription(shortDescription);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("at least 50 characters");
    });

    it("should reject descriptions that are too long", () => {
      const longDescription = "A".repeat(2001);
      const result = validateProjectDescription(longDescription);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("must not exceed 2000 characters");
    });

    it("should reject empty descriptions", () => {
      expect(validateProjectDescription("").isValid).toBe(false);
      expect(validateProjectDescription("   ").isValid).toBe(false);
      expect(validateProjectDescription(null as any).isValid).toBe(false);
    });
  });

  describe("validateProjectCategory", () => {
    it("should accept valid categories", () => {
      const validCategories = [
        "technology",
        "healthcare",
        "finance",
        "education",
        "retail",
        "manufacturing",
        "agriculture",
        "energy",
        "real_estate",
        "entertainment",
        "transportation",
        "food_beverage",
        "other",
      ];

      validCategories.forEach((category) => {
        const result = validateProjectCategory(category);
        expect(result.isValid).toBe(true);
      });
    });

    it("should accept categories with different casing", () => {
      const result = validateProjectCategory("TECHNOLOGY");
      expect(result.isValid).toBe(true);
    });

    it("should reject invalid categories", () => {
      const result = validateProjectCategory("invalid_category");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Invalid category");
    });

    it("should reject empty categories", () => {
      expect(validateProjectCategory("").isValid).toBe(false);
      expect(validateProjectCategory(null as any).isValid).toBe(false);
    });
  });

  describe("validateStockSupply", () => {
    it("should accept valid stock supplies", () => {
      const validSupplies = [1, 100, 1000, 50000, 1000000];

      validSupplies.forEach((supply) => {
        const result = validateStockSupply(supply);
        expect(result.isValid).toBe(true);
      });
    });

    it("should reject non-integer values", () => {
      const result = validateStockSupply(100.5);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("whole number");
    });

    it("should reject values below minimum", () => {
      const result = validateStockSupply(0);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("at least 1");
    });

    it("should reject values above maximum", () => {
      const result = validateStockSupply(1000001);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("must not exceed 1000000");
    });

    it("should reject invalid number types", () => {
      expect(validateStockSupply(NaN).isValid).toBe(false);
      expect(validateStockSupply("100" as any).isValid).toBe(false);
    });
  });

  describe("validateTargetFundingGoal", () => {
    it("should accept valid funding goals", () => {
      const validGoals = [1000, 50000.5, 1000000.99];

      validGoals.forEach((goal) => {
        const result = validateTargetFundingGoal(goal);
        expect(result.isValid).toBe(true);
      });
    });

    it("should accept undefined (optional field)", () => {
      const result = validateTargetFundingGoal(undefined);
      expect(result.isValid).toBe(true);
    });

    it("should reject negative values", () => {
      const result = validateTargetFundingGoal(-1000);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("positive number");
    });

    it("should reject values with too many decimal places", () => {
      const result = validateTargetFundingGoal(1000.123);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("at most 2 decimal places");
    });
  });

  describe("validatePricePerStock", () => {
    it("should accept valid prices", () => {
      const validPrices = [0.01, 10.5, 1000.12345678];

      validPrices.forEach((price) => {
        const result = validatePricePerStock(price);
        expect(result.isValid).toBe(true);
      });
    });

    it("should accept undefined (optional field)", () => {
      const result = validatePricePerStock(undefined);
      expect(result.isValid).toBe(true);
    });

    it("should reject negative values", () => {
      const result = validatePricePerStock(-10);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("positive number");
    });

    it("should reject values with too many decimal places", () => {
      const result = validatePricePerStock(10.123456789);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("at most 8 decimal places");
    });
  });

  describe("validateEntrepreneurId", () => {
    it("should accept valid UUID format", () => {
      const validUuid = "123e4567-e89b-12d3-a456-426614174000";
      const result = validateEntrepreneurId(validUuid);
      expect(result.isValid).toBe(true);
    });

    it("should reject invalid UUID formats", () => {
      const invalidIds = [
        "not-a-uuid",
        "123-456-789",
        "123e4567-e89b-12d3-a456",
        "g23e4567-e89b-12d3-a456-426614174000",
      ];

      invalidIds.forEach((id) => {
        const result = validateEntrepreneurId(id);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain("valid UUID format");
      });
    });

    it("should reject empty values", () => {
      expect(validateEntrepreneurId("").isValid).toBe(false);
      expect(validateEntrepreneurId("   ").isValid).toBe(false);
      expect(validateEntrepreneurId(null as any).isValid).toBe(false);
    });
  });

  describe("validateCreateProjectInput", () => {
    const validInput: CreateProjectInput = {
      entrepreneurId: "123e4567-e89b-12d3-a456-426614174000",
      name: "My Startup Project",
      description:
        "This is a comprehensive description of our innovative startup that aims to revolutionize the industry with cutting-edge technology and sustainable practices.",
      category: "technology",
      stockSupply: 1000,
      targetFundingGoal: 50000.0,
      pricePerStock: 50.0,
    };

    it("should validate a complete valid input", () => {
      const result = validateCreateProjectInput(validInput);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate input with only required fields", () => {
      const minimalInput: CreateProjectInput = {
        entrepreneurId: "123e4567-e89b-12d3-a456-426614174000",
        name: "My Startup",
        description:
          "This is a comprehensive description of our innovative startup that aims to revolutionize the industry.",
        category: "technology",
        stockSupply: 100,
      };

      const result = validateCreateProjectInput(minimalInput);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should collect multiple validation errors", () => {
      const invalidInput: CreateProjectInput = {
        entrepreneurId: "invalid-id",
        name: "AB", // too short
        description: "Short", // too short
        category: "invalid_category",
        stockSupply: -1, // invalid
        targetFundingGoal: -1000, // negative
        pricePerStock: 10.123456789, // too many decimals
      };

      const result = validateCreateProjectInput(invalidInput);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(5);
    });
  });

  describe("validateCreateStockNFTInput", () => {
    const validInput: CreateStockNFTInput = {
      projectId: "project-123",
      stockNumber: 1,
      tokenId: "token-456",
      serialNumber: 1,
      ownerWalletAddress: "0x1234567890abcdef",
      metadataUri: "ipfs://QmHash123",
    };

    it("should validate valid stock NFT input", () => {
      const result = validateCreateStockNFTInput(validInput);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject invalid stock NFT input", () => {
      const invalidInput: CreateStockNFTInput = {
        projectId: "",
        stockNumber: -1,
        tokenId: "",
        serialNumber: 0,
        ownerWalletAddress: "",
        metadataUri: "",
      };

      const result = validateCreateStockNFTInput(invalidInput);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(5);
    });
  });

  describe("sanitizeProjectInput", () => {
    it("should trim whitespace and normalize category", () => {
      const input: CreateProjectInput = {
        entrepreneurId: "  123e4567-e89b-12d3-a456-426614174000  ",
        name: "  My Startup  ",
        description: "  This is a description  ",
        category: "  TECHNOLOGY  ",
        stockSupply: 1000,
        coverImageUrl: "  https://example.com/image.jpg  ",
      };

      const sanitized = sanitizeProjectInput(input);

      expect(sanitized.entrepreneurId).toBe(
        "123e4567-e89b-12d3-a456-426614174000"
      );
      expect(sanitized.name).toBe("My Startup");
      expect(sanitized.description).toBe("This is a description");
      expect(sanitized.category).toBe("technology");
      expect(sanitized.coverImageUrl).toBe("https://example.com/image.jpg");
    });
  });

  describe("transformProjectInputToEntity", () => {
    it("should transform input to DynamoDB entity format", () => {
      const input: CreateProjectInput = {
        entrepreneurId: "123e4567-e89b-12d3-a456-426614174000",
        name: "My Startup",
        description:
          "This is a comprehensive description of our innovative startup.",
        category: "technology",
        stockSupply: 1000,
        targetFundingGoal: 50000,
        pricePerStock: 50,
      };

      const projectId = "proj-123";
      const entity = transformProjectInputToEntity(input, projectId);

      expect(entity.PK).toBe("PROJECT#proj-123");
      expect(entity.SK).toBe("METADATA");
      expect(entity.projectId).toBe(projectId);
      expect(entity.entrepreneurId).toBe(input.entrepreneurId);
      expect(entity.name).toBe(input.name);
      expect(entity.description).toBe(input.description);
      expect(entity.category).toBe(input.category);
      expect(entity.stockSupply).toBe(input.stockSupply);
      expect(entity.targetFundingGoal).toBe(input.targetFundingGoal);
      expect(entity.pricePerStock).toBe(input.pricePerStock);
      expect(entity.status).toBe("draft");
      expect(entity.GSI3PK).toBe("PROJECT_STATUS#draft");
      expect(entity.createdAt).toBeDefined();
      expect(entity.updatedAt).toBeDefined();
      expect(entity.GSI3SK).toBeDefined();
    });

    it("should handle optional fields correctly", () => {
      const input: CreateProjectInput = {
        entrepreneurId: "123e4567-e89b-12d3-a456-426614174000",
        name: "My Startup",
        description:
          "This is a comprehensive description of our innovative startup.",
        category: "technology",
        stockSupply: 1000,
      };

      const projectId = "proj-123";
      const entity = transformProjectInputToEntity(input, projectId);

      expect(entity.targetFundingGoal).toBeUndefined();
      expect(entity.pricePerStock).toBeUndefined();
      expect(entity.coverImageUrl).toBeUndefined();
    });
  });
});
