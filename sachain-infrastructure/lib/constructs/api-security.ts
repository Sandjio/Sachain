/**
 * API Security Construct for comprehensive API Gateway security
 * Implements WAF, rate limiting, and security headers
 */

import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as wafv2 from "aws-cdk-lib/aws-wafv2";
import * as logs from "aws-cdk-lib/aws-logs";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export interface APISecurityConstructProps {
  environment: string;
  apiGateway: apigateway.RestApi;
  allowedOrigins: string[];
  rateLimitPerMinute?: number;
}

export class APISecurityConstruct extends Construct {
  public readonly webAcl: wafv2.CfnWebACL;
  public readonly logGroup: logs.LogGroup;

  constructor(scope: Construct, id: string, props: APISecurityConstructProps) {
    super(scope, id);

    // Create CloudWatch log group for WAF logs
    this.logGroup = new logs.LogGroup(this, "WAFLogGroup", {
      logGroupName: `/aws/wafv2/sachain-api-${props.environment}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create WAF Web ACL
    this.webAcl = this.createWebACL(props);

    // Associate WAF with API Gateway
    this.associateWAFWithAPI(props.apiGateway);

    // Add security response headers
    this.addSecurityHeaders(props.apiGateway);
  }

  private createWebACL(props: APISecurityConstructProps): wafv2.CfnWebACL {
    const rules: wafv2.CfnWebACL.RuleProperty[] = [
      // Rate limiting rule
      {
        name: "RateLimitRule",
        priority: 1,
        statement: {
          rateBasedStatement: {
            limit: props.rateLimitPerMinute || 2000,
            aggregateKeyType: "IP",
          },
        },
        action: {
          block: {},
        },
        visibilityConfig: {
          sampledRequestsEnabled: true,
          cloudWatchMetricsEnabled: true,
          metricName: "RateLimitRule",
        },
      },

      // AWS Managed Rules - Core Rule Set
      {
        name: "AWSManagedRulesCommonRuleSet",
        priority: 2,
        overrideAction: {
          none: {},
        },
        statement: {
          managedRuleGroupStatement: {
            vendorName: "AWS",
            name: "AWSManagedRulesCommonRuleSet",
            excludedRules: [
              // Exclude rules that might be too restrictive for API usage
              { name: "SizeRestrictions_BODY" },
              { name: "GenericRFI_BODY" },
            ],
          },
        },
        visibilityConfig: {
          sampledRequestsEnabled: true,
          cloudWatchMetricsEnabled: true,
          metricName: "CommonRuleSetMetric",
        },
      },

      // AWS Managed Rules - Known Bad Inputs
      {
        name: "AWSManagedRulesKnownBadInputsRuleSet",
        priority: 3,
        overrideAction: {
          none: {},
        },
        statement: {
          managedRuleGroupStatement: {
            vendorName: "AWS",
            name: "AWSManagedRulesKnownBadInputsRuleSet",
          },
        },
        visibilityConfig: {
          sampledRequestsEnabled: true,
          cloudWatchMetricsEnabled: true,
          metricName: "KnownBadInputsMetric",
        },
      },

      // SQL Injection Protection
      {
        name: "AWSManagedRulesSQLiRuleSet",
        priority: 4,
        overrideAction: {
          none: {},
        },
        statement: {
          managedRuleGroupStatement: {
            vendorName: "AWS",
            name: "AWSManagedRulesSQLiRuleSet",
          },
        },
        visibilityConfig: {
          sampledRequestsEnabled: true,
          cloudWatchMetricsEnabled: true,
          metricName: "SQLiRuleSetMetric",
        },
      },

      // Geographic restriction (optional - can be customized)
      {
        name: "GeoBlockRule",
        priority: 5,
        statement: {
          geoMatchStatement: {
            // Block requests from high-risk countries
            countryCodes: ["CN", "RU", "KP", "IR"],
          },
        },
        action: {
          block: {},
        },
        visibilityConfig: {
          sampledRequestsEnabled: true,
          cloudWatchMetricsEnabled: true,
          metricName: "GeoBlockMetric",
        },
      },

      // Custom rule for suspicious user agents
      {
        name: "BlockSuspiciousUserAgents",
        priority: 6,
        statement: {
          byteMatchStatement: {
            searchString: "bot",
            fieldToMatch: {
              singleHeader: {
                name: "user-agent",
              },
            },
            textTransformations: [
              {
                priority: 0,
                type: "LOWERCASE",
              },
            ],
            positionalConstraint: "CONTAINS",
          },
        },
        action: {
          block: {},
        },
        visibilityConfig: {
          sampledRequestsEnabled: true,
          cloudWatchMetricsEnabled: true,
          metricName: "SuspiciousUserAgentMetric",
        },
      },

      // Allow legitimate traffic
      {
        name: "AllowLegitimateTraffic",
        priority: 100,
        statement: {
          byteMatchStatement: {
            searchString: "/",
            fieldToMatch: {
              uriPath: {},
            },
            textTransformations: [
              {
                priority: 0,
                type: "NONE",
              },
            ],
            positionalConstraint: "STARTS_WITH",
          },
        },
        action: {
          allow: {},
        },
        visibilityConfig: {
          sampledRequestsEnabled: true,
          cloudWatchMetricsEnabled: true,
          metricName: "AllowLegitimateTrafficMetric",
        },
      },
    ];

    return new wafv2.CfnWebACL(this, "WebACL", {
      scope: "REGIONAL",
      defaultAction: {
        allow: {},
      },
      rules,
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: `SachainAPIWebACL-${props.environment}`,
      },
      name: `sachain-api-waf-${props.environment}`,
      description: `WAF for Sachain API Gateway - ${props.environment}`,
    });
  }

  private associateWAFWithAPI(api: apigateway.RestApi): void {
    // Get the API Gateway ARN
    const apiArn = `arn:aws:apigateway:${cdk.Aws.REGION}::/restapis/${api.restApiId}/stages/*`;

    new wafv2.CfnWebACLAssociation(this, "WebACLAssociation", {
      resourceArn: apiArn,
      webAclArn: this.webAcl.attrArn,
    });
  }

  private addSecurityHeaders(api: apigateway.RestApi): void {
    // Add gateway responses with security headers
    const securityHeaders = {
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Content-Security-Policy": "default-src 'self'",
      "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    };

    // Add security headers to all gateway responses
    const responseTypes = [
      apigateway.ResponseType.DEFAULT_4XX,
      apigateway.ResponseType.DEFAULT_5XX,
      apigateway.ResponseType.ACCESS_DENIED,
      apigateway.ResponseType.UNAUTHORIZED,
      apigateway.ResponseType.THROTTLED,
    ];

    responseTypes.forEach((responseType) => {
      api.addGatewayResponse(`SecurityHeaders${responseType}`, {
        type: responseType,
        responseHeaders: securityHeaders,
      });
    });
  }

  /**
   * Create request validator for input validation
   */
  public createRequestValidator(api: apigateway.RestApi): apigateway.RequestValidator {
    return new apigateway.RequestValidator(this, "RequestValidator", {
      restApi: api,
      requestValidatorName: `sachain-request-validator`,
      validateRequestBody: true,
      validateRequestParameters: true,
    });
  }

  /**
   * Create API key for additional security
   */
  public createAPIKey(api: apigateway.RestApi): apigateway.ApiKey {
    const apiKey = new apigateway.ApiKey(this, "APIKey", {
      apiKeyName: `sachain-api-key-${cdk.Aws.ACCOUNT_ID}`,
      description: "API Key for Sachain API access",
    });

    // Create usage plan
    const usagePlan = new apigateway.UsagePlan(this, "UsagePlan", {
      name: `sachain-usage-plan`,
      description: "Usage plan for Sachain API",
      throttle: {
        rateLimit: 1000, // requests per second
        burstLimit: 2000, // burst capacity
      },
      quota: {
        limit: 100000, // requests per month
        period: apigateway.Period.MONTH,
      },
    });

    usagePlan.addApiKey(apiKey);
    usagePlan.addApiStage({
      api,
      stage: api.deploymentStage,
    });

    return apiKey;
  }

  /**
   * Get security compliance report
   */
  public getSecurityReport(): any {
    return {
      waf: {
        enabled: true,
        rules: [
          "Rate Limiting",
          "AWS Managed Common Rules",
          "Known Bad Inputs Protection",
          "SQL Injection Protection",
          "Geographic Blocking",
          "Suspicious User Agent Blocking",
        ],
      },
      headers: {
        "Strict-Transport-Security": "Enabled",
        "X-Content-Type-Options": "Enabled",
        "X-Frame-Options": "Enabled",
        "X-XSS-Protection": "Enabled",
        "Content-Security-Policy": "Enabled",
      },
      monitoring: {
        cloudWatchLogs: "Enabled",
        metricsCollection: "Enabled",
        sampledRequests: "Enabled",
      },
    };
  }
}