const fs = require("fs");
const path = require("path");

// Files to fix
const testFiles = [
  "backend/src/lambdas/hbar-recharge/__tests__/api-endpoints.test.ts",
  "backend/src/lambdas/hbar-recharge/__tests__/api-security.test.ts",
  "backend/src/__tests__/integration/hbar-recharge-api-integration.test.ts",
];

testFiles.forEach((filePath) => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, "utf8");

    // Fix JWT mock return values
    content = content.replace(
      /mockExtractUserIdFromToken\.mockReturnValue\(null\)/g,
      'mockExtractUserIdFromToken.mockReturnValue({ success: false, error: "Invalid token" })'
    );

    content = content.replace(
      /mockExtractUserIdFromToken\.mockReturnValue\("([^"]+)"\)/g,
      'mockExtractUserIdFromToken.mockReturnValue({ success: true, userId: "$1" })'
    );

    // Fix service method names
    content = content.replace(
      /mockService\.initiateRecharge/g,
      "mockService.initiateSecureRecharge"
    );
    content = content.replace(
      /mockService\.getTransactionStatus/g,
      "mockService.getSecureTransactionStatus"
    );

    // Fix service mock setup
    content = content.replace(
      /initiateRecharge: jest\.fn\(\)/g,
      "initiateSecureRecharge: jest.fn()"
    );
    content = content.replace(
      /getTransactionStatus: jest\.fn\(\)/g,
      "getSecureTransactionStatus: jest.fn()"
    );

    // Fix import for TokenExtractionResult
    if (!content.includes("import { TokenExtractionResult }")) {
      content = content.replace(
        /import { extractUserIdFromToken } from "\.\.\.\/\.\.\.\/utils\/jwt-utils";/,
        'import { extractUserIdFromToken, TokenExtractionResult } from "../../../utils/jwt-utils";'
      );
    }

    // Fix listUserTransactions return type
    content = content.replace(
      /mockService\.listUserTransactions\.mockResolvedValue\(\{\s*transactions: \[/g,
      "mockService.listUserTransactions.mockResolvedValue({ data: { transactions: ["
    );

    content = content.replace(/\],\s*pagination: \{/g, "], pagination: {");

    // Fix retryTransaction return type
    content = content.replace(
      /mockService\.retryTransaction\.mockResolvedValue\(\{\s*transactionId:/g,
      "mockService.retryTransaction.mockResolvedValue({ success: true, data: { transactionId:"
    );

    fs.writeFileSync(filePath, content);
    console.log(`Fixed ${filePath}`);
  }
});
