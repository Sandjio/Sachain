/**
 * S3Stack defines an AWS CDK stack that provisions an S3 bucket with specific configurations.
 * The bucket is designed for secure and efficient document storage, with lifecycle rules
 * to optimize costs by transitioning objects to different storage classes over time.
 *
 * Key Features:
 * - Server-side encryption using S3-managed keys (SSE-S3).
 * - Block all public access to ensure data privacy.
 * - Enforce SSL for all bucket interactions.
 * - Lifecycle rules to transition objects to Infrequent Access, Glacier, and Deep Archive.
 * - Environment-specific removal policies to retain data in production while allowing
 *   automatic cleanup in non-production environments.
 */

import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";

import { S3Construct } from "../constructs/s3";
import { EnvironmentType } from "../types";

export interface S3StackProps extends StackProps {
  environment: EnvironmentType;
}

export class S3Stack extends Stack {
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: S3StackProps) {
    super(scope, id, props);

    const s3Bucket = new S3Construct(this, "SachainBucket", {
      environment: props.environment,
    });
    this.bucket = s3Bucket.sachainBucket;
  }
}
