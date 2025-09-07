/**
 * DynamoDB Stack for Sachain infrastructure.
 * Instantiates the DynamoDBConstruct with environment-specific settings.
 */

import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

import { DynamoDBConstruct } from "../constructs/dynamodb";
import { EnvironmentType } from "../types";

export interface DynamoDBStackProps extends StackProps {
  environment: EnvironmentType;
}

export class SachainDynamoDBStack extends Stack {
  public readonly table: dynamodb.TableV2;

  constructor(scope: Construct, id: string, props: DynamoDBStackProps) {
    super(scope, id, props);

    const dynamo = new DynamoDBConstruct(this, "DynamoDB", {
      environment: props.environment,
    });

    this.table = dynamo.table;
  }
}
