// Project validation utilities
// Implements validation functions for project creation data

import {
  CreateProjectInput,
  CreateStockNFTInput,
  ProjectValidationResult,
  StockValidationResult,
  PROJECT_CATEGORIES,
  PROJECT_VALIDATION_RULES,
  ProjectCategory,
} from "../models/project";

/**
 * Validates project name according to requirements
 * - Between 3-100 characters
 * - Contains only alphanumeric characters, spaces, and basic punctuation
 */
export function validateProjectName(name: string): {
  isValid: boolean;
  error?: string;
} {
  if (!name || typeof name !== "string") {
    return { isValid: false, error: "Project name is required" };
  }

  const trimmedName = name.trim();

  if (trimmedName.length < PROJECT_VALIDATION_RULES.NAME_MIN_LENGTH) {
    return {
      isValid: false,
      error: `Project name must be at least ${PROJECT_VALIDATION_RULES.NAME_MIN_LENGTH} characters long`,
    };
  }

  if (trimmedName.length > PROJECT_VALIDATION_RULES.NAME_MAX_LENGTH) {
    return {
      isValid: false,
      error: `Project name must not exceed ${PROJECT_VALIDATION_RULES.NAME_MAX_LENGTH} characters`,
    };
  }

  // Allow alphanumeric characters, spaces, and basic punctuation (.,!?-_&)
  const validNamePattern = /^[a-zA-Z0-9\s.,!?\-_&]+$/;
  if (!validNamePattern.test(trimmedName)) {
    return {
      isValid: false,
      error:
        "Project name can only contain letters, numbers, spaces, and basic punctuation (.,!?-_&)",
    };
  }

  return { isValid: true };
}

/**
 * Validates project description according to requirements
 * - Between 50-2000 characters
 */
export function validateProjectDescription(description: string): {
  isValid: boolean;
  error?: string;
} {
  if (!description || typeof description !== "string") {
    return { isValid: false, error: "Project description is required" };
  }

  const trimmedDescription = description.trim();

  if (
    trimmedDescription.length < PROJECT_VALIDATION_RULES.DESCRIPTION_MIN_LENGTH
  ) {
    return {
      isValid: false,
      error: `Project description must be at least ${PROJECT_VALIDATION_RULES.DESCRIPTION_MIN_LENGTH} characters long`,
    };
  }

  if (
    trimmedDescription.length > PROJECT_VALIDATION_RULES.DESCRIPTION_MAX_LENGTH
  ) {
    return {
      isValid: false,
      error: `Project description must not exceed ${PROJECT_VALIDATION_RULES.DESCRIPTION_MAX_LENGTH} characters`,
    };
  }

  return { isValid: true };
}

/**
 * Validates project category against predefined list
 */
export function validateProjectCategory(category: string): {
  isValid: boolean;
  error?: string;
} {
  if (!category || typeof category !== "string") {
    return { isValid: false, error: "Project category is required" };
  }

  const normalizedCategory = category.toLowerCase().trim();

  if (!PROJECT_CATEGORIES.includes(normalizedCategory as ProjectCategory)) {
    return {
      isValid: false,
      error: `Invalid category. Must be one of: ${PROJECT_CATEGORIES.join(
        ", "
      )}`,
    };
  }

  return { isValid: true };
}

/**
 * Validates stock supply according to requirements
 * - Positive integer between 1 and 1,000,000
 */
export function validateStockSupply(stockSupply: number): {
  isValid: boolean;
  error?: string;
} {
  if (typeof stockSupply !== "number" || isNaN(stockSupply)) {
    return { isValid: false, error: "Stock supply must be a valid number" };
  }

  if (!Number.isInteger(stockSupply)) {
    return { isValid: false, error: "Stock supply must be a whole number" };
  }

  if (stockSupply < PROJECT_VALIDATION_RULES.MIN_STOCK_SUPPLY) {
    return {
      isValid: false,
      error: `Stock supply must be at least ${PROJECT_VALIDATION_RULES.MIN_STOCK_SUPPLY}`,
    };
  }

  if (stockSupply > PROJECT_VALIDATION_RULES.MAX_STOCK_SUPPLY) {
    return {
      isValid: false,
      error: `Stock supply must not exceed ${PROJECT_VALIDATION_RULES.MAX_STOCK_SUPPLY}`,
    };
  }

  return { isValid: true };
}

/**
 * Validates target funding goal (optional field)
 * - Positive number with maximum 2 decimal places
 */
export function validateTargetFundingGoal(goal?: number): {
  isValid: boolean;
  error?: string;
} {
  if (goal === undefined || goal === null) {
    return { isValid: true }; // Optional field
  }

  if (typeof goal !== "number" || isNaN(goal)) {
    return {
      isValid: false,
      error: "Target funding goal must be a valid number",
    };
  }

  if (goal <= 0) {
    return {
      isValid: false,
      error: "Target funding goal must be a positive number",
    };
  }

  // Check decimal places
  const decimalPlaces = (goal.toString().split(".")[1] || "").length;
  if (
    decimalPlaces > PROJECT_VALIDATION_RULES.MAX_FUNDING_GOAL_DECIMAL_PLACES
  ) {
    return {
      isValid: false,
      error: `Target funding goal can have at most ${PROJECT_VALIDATION_RULES.MAX_FUNDING_GOAL_DECIMAL_PLACES} decimal places`,
    };
  }

  return { isValid: true };
}

/**
 * Validates price per stock (optional field)
 * - Positive number with maximum 8 decimal places
 */
export function validatePricePerStock(price?: number): {
  isValid: boolean;
  error?: string;
} {
  if (price === undefined || price === null) {
    return { isValid: true }; // Optional field
  }

  if (typeof price !== "number" || isNaN(price)) {
    return { isValid: false, error: "Price per stock must be a valid number" };
  }

  if (price <= 0) {
    return {
      isValid: false,
      error: "Price per stock must be a positive number",
    };
  }

  // Check decimal places
  const decimalPlaces = (price.toString().split(".")[1] || "").length;
  if (decimalPlaces > PROJECT_VALIDATION_RULES.MAX_DECIMAL_PLACES) {
    return {
      isValid: false,
      error: `Price per stock can have at most ${PROJECT_VALIDATION_RULES.MAX_DECIMAL_PLACES} decimal places`,
    };
  }

  return { isValid: true };
}

/**
 * Validates entrepreneur ID
 */
export function validateEntrepreneurId(entrepreneurId: string): {
  isValid: boolean;
  error?: string;
} {
  if (!entrepreneurId || typeof entrepreneurId !== "string") {
    return { isValid: false, error: "Entrepreneur ID is required" };
  }

  const trimmedId = entrepreneurId.trim();
  if (trimmedId.length === 0) {
    return { isValid: false, error: "Entrepreneur ID cannot be empty" };
  }

  // Basic UUID format validation (assuming UUIDs are used)
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(trimmedId)) {
    return {
      isValid: false,
      error: "Entrepreneur ID must be a valid UUID format",
    };
  }

  return { isValid: true };
}

/**
 * Comprehensive validation for project creation input
 */
export function validateCreateProjectInput(
  input: CreateProjectInput
): ProjectValidationResult {
  const errors: string[] = [];

  // Validate entrepreneur ID
  const entrepreneurIdValidation = validateEntrepreneurId(input.entrepreneurId);
  if (!entrepreneurIdValidation.isValid) {
    errors.push(entrepreneurIdValidation.error!);
  }

  // Validate project name
  const nameValidation = validateProjectName(input.name);
  if (!nameValidation.isValid) {
    errors.push(nameValidation.error!);
  }

  // Validate project description
  const descriptionValidation = validateProjectDescription(input.description);
  if (!descriptionValidation.isValid) {
    errors.push(descriptionValidation.error!);
  }

  // Validate project category
  const categoryValidation = validateProjectCategory(input.category);
  if (!categoryValidation.isValid) {
    errors.push(categoryValidation.error!);
  }

  // Validate stock supply
  const stockSupplyValidation = validateStockSupply(input.stockSupply);
  if (!stockSupplyValidation.isValid) {
    errors.push(stockSupplyValidation.error!);
  }

  // Validate optional target funding goal
  const fundingGoalValidation = validateTargetFundingGoal(
    input.targetFundingGoal
  );
  if (!fundingGoalValidation.isValid) {
    errors.push(fundingGoalValidation.error!);
  }

  // Validate optional price per stock
  const priceValidation = validatePricePerStock(input.pricePerStock);
  if (!priceValidation.isValid) {
    errors.push(priceValidation.error!);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates stock NFT creation input
 */
export function validateCreateStockNFTInput(
  input: CreateStockNFTInput
): StockValidationResult {
  const errors: string[] = [];

  // Validate project ID
  if (
    !input.projectId ||
    typeof input.projectId !== "string" ||
    input.projectId.trim().length === 0
  ) {
    errors.push("Project ID is required");
  }

  // Validate stock number
  if (
    typeof input.stockNumber !== "number" ||
    !Number.isInteger(input.stockNumber) ||
    input.stockNumber < 1
  ) {
    errors.push("Stock number must be a positive integer");
  }

  // Validate token ID
  if (
    !input.tokenId ||
    typeof input.tokenId !== "string" ||
    input.tokenId.trim().length === 0
  ) {
    errors.push("Token ID is required");
  }

  // Validate serial number
  if (
    typeof input.serialNumber !== "number" ||
    !Number.isInteger(input.serialNumber) ||
    input.serialNumber < 1
  ) {
    errors.push("Serial number must be a positive integer");
  }

  // Validate owner wallet address
  if (
    !input.ownerWalletAddress ||
    typeof input.ownerWalletAddress !== "string" ||
    input.ownerWalletAddress.trim().length === 0
  ) {
    errors.push("Owner wallet address is required");
  }

  // Validate metadata URI
  if (
    !input.metadataUri ||
    typeof input.metadataUri !== "string" ||
    input.metadataUri.trim().length === 0
  ) {
    errors.push("Metadata URI is required");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitizes project input data by trimming strings and normalizing values
 */
export function sanitizeProjectInput(
  input: CreateProjectInput
): CreateProjectInput {
  return {
    entrepreneurId: input.entrepreneurId.trim(),
    name: input.name.trim(),
    description: input.description.trim(),
    category: input.category.toLowerCase().trim(),
    stockSupply: input.stockSupply,
    targetFundingGoal: input.targetFundingGoal,
    pricePerStock: input.pricePerStock,
    coverImageUrl: input.coverImageUrl?.trim(),
  };
}

/**
 * Transforms project input into DynamoDB entity format
 */
export function transformProjectInputToEntity(
  input: CreateProjectInput,
  projectId: string
): any {
  const now = new Date().toISOString();

  return {
    PK: `PROJECT#${projectId}`,
    SK: "METADATA",
    projectId,
    entrepreneurId: input.entrepreneurId,
    name: input.name,
    description: input.description,
    category: input.category,
    targetFundingGoal: input.targetFundingGoal,
    stockSupply: input.stockSupply,
    pricePerStock: input.pricePerStock,
    coverImageUrl: input.coverImageUrl,
    status: "draft" as const,
    createdAt: now,
    updatedAt: now,
    GSI3PK: "PROJECT_STATUS#draft",
    GSI3SK: now,
  };
}
/**
 * Comprehensive validation for project update input
 */
export function validateUpdateProjectInput(
  input: any
): ProjectValidationResult {
  const errors: string[] = [];

  // Validate project ID (required for updates)
  if (!input.projectId || typeof input.projectId !== "string") {
    errors.push("Project ID is required for updates");
  }

  // Validate entrepreneur ID (required for updates)
  if (input.entrepreneurId) {
    const entrepreneurIdValidation = validateEntrepreneurId(
      input.entrepreneurId
    );
    if (!entrepreneurIdValidation.isValid) {
      errors.push(entrepreneurIdValidation.error!);
    }
  }

  // Validate project name (if provided)
  if (input.name !== undefined) {
    const nameValidation = validateProjectName(input.name);
    if (!nameValidation.isValid) {
      errors.push(nameValidation.error!);
    }
  }

  // Validate project description (if provided)
  if (input.description !== undefined) {
    const descriptionValidation = validateProjectDescription(input.description);
    if (!descriptionValidation.isValid) {
      errors.push(descriptionValidation.error!);
    }
  }

  // Validate project category (if provided)
  if (input.category !== undefined) {
    const categoryValidation = validateProjectCategory(input.category);
    if (!categoryValidation.isValid) {
      errors.push(categoryValidation.error!);
    }
  }

  // Validate stock supply (if provided) - Note: stock supply should not be updatable after creation
  if (input.stockSupply !== undefined) {
    errors.push("Stock supply cannot be modified after project creation");
  }

  // Validate optional target funding goal (if provided)
  if (input.targetFundingGoal !== undefined) {
    const fundingGoalValidation = validateTargetFundingGoal(
      input.targetFundingGoal
    );
    if (!fundingGoalValidation.isValid) {
      errors.push(fundingGoalValidation.error!);
    }
  }

  // Validate optional price per stock (if provided)
  if (input.pricePerStock !== undefined) {
    const priceValidation = validatePricePerStock(input.pricePerStock);
    if (!priceValidation.isValid) {
      errors.push(priceValidation.error!);
    }
  }

  // Validate status (if provided)
  if (input.status !== undefined) {
    const validStatuses = ["draft", "minting", "active", "paused", "completed"];
    if (!validStatuses.includes(input.status)) {
      errors.push(
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
