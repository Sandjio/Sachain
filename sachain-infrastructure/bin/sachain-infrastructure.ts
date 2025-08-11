#!/usr/bin/env node
/// <reference types="node" />
import * as cdk from "aws-cdk-lib";
import { SachainInfrastructureStack } from "../lib/sachain-infrastructure-stack";

const app = new cdk.App();

// Get environment from context or environment variable, default to 'dev'
const environment =
  app.node.tryGetContext("environment") || process.env.ENVIRONMENT || "dev";

// Get AWS account and region from environment variables or CDK defaults
const account = process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID;
const region =
  process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || "us-east-1";

// Create stack with environment-specific naming
const stackName = `SachainKYCStack-${environment}`;

new SachainInfrastructureStack(app, stackName, {
  environment,
  env: {
    account,
    region,
  },
  description: `Sachain KYC Authentication infrastructure for ${environment} environment`,
  tags: {
    Environment: environment,
    Project: "Sachain",
    Component: "KYC-Authentication",
    ManagedBy: "CDK",
  },
});
