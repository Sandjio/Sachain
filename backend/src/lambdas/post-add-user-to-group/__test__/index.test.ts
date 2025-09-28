import { handler } from "../index";
import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
  AdminListGroupsForUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";

import { mockClient } from "aws-sdk-client-mock";

const cognitoMock = mockClient(CognitoIdentityProviderClient);

describe("PostConfirmation Lambda", () => {
  const baseEvent = {
    version: "1",
    triggerSource: "PostConfirmation_ConfirmSignUp",
    userPoolId: "us-east-1_abc123",
    userName: "testuser",
    request: {
      userAttributes: {
        email: "test@example.com",
        "custom:userType": "entrepreneur",
      },
    },
    response: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    cognitoMock.reset();
  });

  it("should add user to Entrepreneur group when not already in group", async () => {
    cognitoMock.on(AdminListGroupsForUserCommand).resolves({ Groups: [] });

    cognitoMock.on(AdminAddUserToGroupCommand).resolves({});

    const result = await handler(baseEvent as any, {} as any, () => {});

    expect(result).toEqual(baseEvent);
    expect(cognitoMock.commandCalls(AdminListGroupsForUserCommand).length).toBe(
      1
    );
    expect(cognitoMock.commandCalls(AdminAddUserToGroupCommand).length).toBe(1);
  });

  it("should not add user if already in target group", async () => {
    cognitoMock.on(AdminListGroupsForUserCommand).resolves({
      Groups: [{ GroupName: "Entrepreneur" }],
    });

    const result = await handler(baseEvent as any, {} as any, () => {});

    expect(result).toEqual(baseEvent);
    expect(cognitoMock.commandCalls(AdminAddUserToGroupCommand).length).toBe(0);
  });

  it("should fallback to default group if userType missing", async () => {
    const eventNoType = {
      ...baseEvent,
      request: { userAttributes: { email: "x@test.com" } },
    };

    process.env.DEFAULT_GROUP = "Entrepreneur";

    cognitoMock.on(AdminListGroupsForUserCommand).resolves({ Groups: [] });
    cognitoMock.on(AdminAddUserToGroupCommand).resolves({});

    const result = await handler(eventNoType as any, {} as any, () => {});

    expect(result).toEqual(eventNoType);
    const addCalls = cognitoMock.commandCalls(AdminAddUserToGroupCommand);
    expect(addCalls[0].args[0].input.GroupName).toBe("Entrepreneur");
  });

  it("should throw if AdminAddUserToGroup fails", async () => {
    cognitoMock.on(AdminListGroupsForUserCommand).resolves({ Groups: [] });
    cognitoMock
      .on(AdminAddUserToGroupCommand)
      .rejects(new Error("Cognito error"));

    await expect(
      handler(baseEvent as any, {} as any, () => {})
    ).rejects.toThrow("Cognito error");
  });
});
