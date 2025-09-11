import * as cdk from "aws-cdk-lib";
import { S3Stack } from "../../lib/stacks/s3-stack";
import { Template } from "aws-cdk-lib/assertions";
import { EnvironmentType } from "../../lib/types";

describe("S3Stack", () => {
  const synthesize = (environment: EnvironmentType) => {
    const app = new cdk.App();
    const stack = new S3Stack(app, `TestS3Stack-${environment}`, {
      environment,
    });
    return Template.fromStack(stack);
  };

  test("matches snapshot in dev", () => {
    const template = synthesize("dev");
    expect(template.toJSON()).toMatchSnapshot();
  });

  test("matches snapshot in prod", () => {
    const template = synthesize("prod");
    expect(template.toJSON()).toMatchSnapshot();
  });

  test("matches snapshot in staging", () => {
    const template = synthesize("staging");
    expect(template.toJSON()).toMatchSnapshot();
  });
});
