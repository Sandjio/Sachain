import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { SachainDynamoDBStack } from "../../lib/stacks/dynamodb-stack";

describe("SachainDynamoDBStack", () => {
  it("matches the snapshot", () => {
    const app = new cdk.App();
    const stack = new SachainDynamoDBStack(app, "TestSachainDynamoDBStack", {
      environment: "dev",
    });

    // Synthesize the stack
    const template = Template.fromStack(stack);

    // Snapshot test
    expect(template.toJSON()).toMatchSnapshot();
  });
});
