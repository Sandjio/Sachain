import * as iam from "aws-cdk-lib/aws-iam";

export interface PolicyValidationResult {
  isValid: boolean;
  violations: PolicyViolation[];
  recommendations: string[];
  complianceScore: number;
}

export interface PolicyViolation {
  severity: "HIGH" | "MEDIUM" | "LOW";
  type: string;
  description: string;
  statement?: any;
  recommendation: string;
}

export class IAMPolicyValidator {
  private static readonly DANGEROUS_ACTIONS = [
    "iam:*",
    "*:*",
    "iam:CreateRole",
    "iam:AttachRolePolicy",
    "iam:PutRolePolicy",
    "sts:AssumeRole",
    "dynamodb:DeleteTable",
    "s3:DeleteBucket",
    "kms:ScheduleKeyDeletion",
  ];

  private static readonly REQUIRED_CONDITIONS = {
    "s3:PutObject": ["s3:x-amz-server-side-encryption"],
    "kms:Encrypt": ["kms:ViaService"],
    "kms:Decrypt": ["kms:ViaService"],
    "cloudwatch:PutMetricData": ["cloudwatch:namespace"],
    "events:PutEvents": ["events:source"],
  };

  /**
   * Validate an IAM policy document for security best practices
   */
  public static validatePolicy(
    policyDocument: iam.PolicyDocument
  ): PolicyValidationResult {
    const violations: PolicyViolation[] = [];
    const recommendations: string[] = [];

    // Validate each statement
    const statements = (policyDocument as any).statements || [];
    statements.forEach((statement: any, index: number) => {
      violations.push(...this.validateStatement(statement, index));
    });

    // Check for missing security controls
    violations.push(...this.checkMissingSecurityControls(policyDocument));

    // Generate recommendations
    recommendations.push(...this.generateRecommendations(violations));

    // Calculate compliance score
    const complianceScore = this.calculateComplianceScore(violations);

    return {
      isValid: violations.filter((v) => v.severity === "HIGH").length === 0,
      violations,
      recommendations,
      complianceScore,
    };
  }

  /**
   * Validate an individual policy statement
   */
  private static validateStatement(
    statement: iam.PolicyStatement,
    index: number
  ): PolicyViolation[] {
    const violations: PolicyViolation[] = [];

    // Check for overly broad permissions
    violations.push(...this.checkBroadPermissions(statement, index));

    // Check for missing conditions
    violations.push(...this.checkMissingConditions(statement, index));

    // Check for resource restrictions
    violations.push(...this.checkResourceRestrictions(statement, index));

    // Check for time-based restrictions
    violations.push(...this.checkTimeBasedRestrictions(statement, index));

    return violations;
  }

  /**
   * Check for overly broad permissions
   */
  private static checkBroadPermissions(
    statement: iam.PolicyStatement,
    index: number
  ): PolicyViolation[] {
    const violations: PolicyViolation[] = [];

    // Get actions from the statement
    const actions = this.getActionsFromStatement(statement);

    actions.forEach((action) => {
      if (this.DANGEROUS_ACTIONS.includes(action)) {
        violations.push({
          severity: "HIGH",
          type: "OVERLY_BROAD_PERMISSIONS",
          description: `Statement ${index} contains dangerous action: ${action}`,
          statement,
          recommendation: `Replace ${action} with specific, least-privilege actions`,
        });
      }

      if (action.endsWith(":*") && !action.startsWith("xray:")) {
        violations.push({
          severity: "MEDIUM",
          type: "WILDCARD_ACTIONS",
          description: `Statement ${index} uses wildcard action: ${action}`,
          statement,
          recommendation: `Replace ${action} with specific actions`,
        });
      }
    });

    return violations;
  }

  /**
   * Check for missing required conditions
   */
  private static checkMissingConditions(
    statement: iam.PolicyStatement,
    index: number
  ): PolicyViolation[] {
    const violations: PolicyViolation[] = [];

    if (statement.effect === iam.Effect.ALLOW) {
      const actions = this.getActionsFromStatement(statement);
      const conditions = statement.conditions || {};

      actions.forEach((action) => {
        const requiredConditions = (this.REQUIRED_CONDITIONS as any)[action];
        if (requiredConditions) {
          requiredConditions.forEach((requiredCondition: string) => {
            if (!this.hasCondition(conditions, requiredCondition)) {
              violations.push({
                severity: "HIGH",
                type: "MISSING_REQUIRED_CONDITION",
                description: `Statement ${index} with action ${action} missing required condition: ${requiredCondition}`,
                statement,
                recommendation: `Add condition ${requiredCondition} to restrict ${action}`,
              });
            }
          });
        }
      });
    }

    return violations;
  }

  /**
   * Check for proper resource restrictions
   */
  private static checkResourceRestrictions(
    statement: iam.PolicyStatement,
    index: number
  ): PolicyViolation[] {
    const violations: PolicyViolation[] = [];

    const resources = this.getResourcesFromStatement(statement);

    if (resources.includes("*") && statement.effect === iam.Effect.ALLOW) {
      const actions = this.getActionsFromStatement(statement);
      const hasRestrictiveConditions =
        statement.conditions && Object.keys(statement.conditions).length > 0;

      if (!hasRestrictiveConditions) {
        violations.push({
          severity: "HIGH",
          type: "UNRESTRICTED_RESOURCE_ACCESS",
          description: `Statement ${index} allows access to all resources (*) without conditions`,
          statement,
          recommendation:
            "Restrict resources to specific ARNs or add restrictive conditions",
        });
      }
    }

    return violations;
  }

  /**
   * Check for time-based access restrictions
   */
  private static checkTimeBasedRestrictions(
    statement: iam.PolicyStatement,
    index: number
  ): PolicyViolation[] {
    const violations: PolicyViolation[] = [];

    const actions = this.getActionsFromStatement(statement);
    const hasDestructiveActions = actions.some(
      (action) => action.includes("Delete") || action.includes("Terminate")
    );

    if (hasDestructiveActions && statement.effect === iam.Effect.ALLOW) {
      const hasTimeRestriction =
        statement.conditions &&
        (statement.conditions["DateGreaterThan"] ||
          statement.conditions["DateLessThan"]);

      if (!hasTimeRestriction) {
        violations.push({
          severity: "MEDIUM",
          type: "MISSING_TIME_RESTRICTION",
          description: `Statement ${index} allows destructive actions without time restrictions`,
          statement,
          recommendation:
            "Consider adding time-based conditions for destructive operations",
        });
      }
    }

    return violations;
  }

  /**
   * Check for missing security controls
   */
  private static checkMissingSecurityControls(
    policyDocument: iam.PolicyDocument
  ): PolicyViolation[] {
    const violations: PolicyViolation[] = [];

    // Check for privilege escalation prevention
    const statements = (policyDocument as any).statements || [];
    const hasPrivilegeEscalationPrevention = statements.some(
      (statement: any) =>
        statement.effect === iam.Effect.DENY &&
        this.getActionsFromStatement(statement).some((action) =>
          action.startsWith("iam:")
        )
    );

    if (!hasPrivilegeEscalationPrevention) {
      violations.push({
        severity: "HIGH",
        type: "MISSING_PRIVILEGE_ESCALATION_PREVENTION",
        description: "Policy lacks privilege escalation prevention",
        recommendation:
          "Add explicit DENY statements for IAM privilege escalation",
      });
    }

    // Check for secure transport enforcement
    const hasSecureTransportEnforcement = statements.some(
      (statement: any) =>
        statement.effect === iam.Effect.DENY &&
        statement.conditions &&
        statement.conditions["Bool"] &&
        statement.conditions["Bool"]["aws:SecureTransport"] === "false"
    );

    if (!hasSecureTransportEnforcement) {
      violations.push({
        severity: "MEDIUM",
        type: "MISSING_SECURE_TRANSPORT",
        description: "Policy lacks secure transport enforcement",
        recommendation: "Add DENY statement for non-HTTPS requests",
      });
    }

    return violations;
  }

  /**
   * Generate recommendations based on violations
   */
  private static generateRecommendations(
    violations: PolicyViolation[]
  ): string[] {
    const recommendations: string[] = [];

    const highSeverityCount = violations.filter(
      (v) => v.severity === "HIGH"
    ).length;
    const mediumSeverityCount = violations.filter(
      (v) => v.severity === "MEDIUM"
    ).length;

    if (highSeverityCount > 0) {
      recommendations.push(
        `Address ${highSeverityCount} high-severity security violations immediately`
      );
    }

    if (mediumSeverityCount > 0) {
      recommendations.push(
        `Consider addressing ${mediumSeverityCount} medium-severity recommendations`
      );
    }

    // Add specific recommendations
    recommendations.push("Implement least-privilege access principles");
    recommendations.push("Use resource-specific ARNs instead of wildcards");
    recommendations.push("Add condition blocks to restrict access");
    recommendations.push(
      "Implement time-based restrictions for sensitive operations"
    );
    recommendations.push(
      "Add explicit DENY statements for privilege escalation"
    );

    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Calculate compliance score (0-100)
   */
  private static calculateComplianceScore(
    violations: PolicyViolation[]
  ): number {
    const highWeight = 20;
    const mediumWeight = 10;
    const lowWeight = 5;

    const totalDeductions =
      violations.filter((v) => v.severity === "HIGH").length * highWeight +
      violations.filter((v) => v.severity === "MEDIUM").length * mediumWeight +
      violations.filter((v) => v.severity === "LOW").length * lowWeight;

    return Math.max(0, 100 - totalDeductions);
  }

  /**
   * Helper method to extract actions from a statement
   */
  private static getActionsFromStatement(
    statement: iam.PolicyStatement
  ): string[] {
    // This is a simplified implementation
    // In a real scenario, you'd need to access the internal structure
    return [];
  }

  /**
   * Helper method to extract resources from a statement
   */
  private static getResourcesFromStatement(
    statement: iam.PolicyStatement
  ): string[] {
    // This is a simplified implementation
    // In a real scenario, you'd need to access the internal structure
    return [];
  }

  /**
   * Helper method to check if a condition exists
   */
  private static hasCondition(conditions: any, conditionKey: string): boolean {
    if (!conditions) return false;

    // Check in various condition operators
    const operators = ["StringEquals", "StringLike", "Bool", "IpAddress"];
    return operators.some(
      (op) =>
        conditions[op] &&
        Object.keys(conditions[op]).some((key) => key.includes(conditionKey))
    );
  }

  /**
   * Validate multiple policies and generate a comprehensive report
   */
  public static validateMultiplePolicies(
    policies: { name: string; policy: iam.PolicyDocument }[]
  ): {
    overallScore: number;
    results: { name: string; result: PolicyValidationResult }[];
    summary: {
      totalViolations: number;
      highSeverityViolations: number;
      mediumSeverityViolations: number;
      lowSeverityViolations: number;
    };
  } {
    const results = policies.map((p) => ({
      name: p.name,
      result: this.validatePolicy(p.policy),
    }));

    const allViolations = results.flatMap((r) => r.result.violations);
    const overallScore =
      results.reduce((sum, r) => sum + r.result.complianceScore, 0) /
      results.length;

    return {
      overallScore,
      results,
      summary: {
        totalViolations: allViolations.length,
        highSeverityViolations: allViolations.filter(
          (v) => v.severity === "HIGH"
        ).length,
        mediumSeverityViolations: allViolations.filter(
          (v) => v.severity === "MEDIUM"
        ).length,
        lowSeverityViolations: allViolations.filter((v) => v.severity === "LOW")
          .length,
      },
    };
  }
}
