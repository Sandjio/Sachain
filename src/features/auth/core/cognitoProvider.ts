

// src/lib/auth/cognitoProvider.ts
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const region = process.env.NEXT_PUBLIC_COGNITO_REGION!;
const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!;

if (!region || !clientId) {
  console.warn(
    "[Cognito] Missing NEXT_PUBLIC_COGNITO_REGION or NEXT_PUBLIC_COGNITO_CLIENT_ID"
  );
}

const client = new CognitoIdentityProviderClient({ region });

export type UserRole = "startup" | "investor";

export interface CognitoTokens {
  idToken: string;
  accessToken: string;
  refreshToken?: string;
}

// ---- SIGN UP ----------------------------------------------------
export async function cognitoSignUp({
  email,
  password,
  givenName,
  familyName,
  role,
}: {
  email: string;
  password: string;
  givenName: string;
  familyName: string;
  role: UserRole;
}) {
  return client.send(
    new SignUpCommand({
      ClientId: clientId,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "given_name", Value: givenName },
        { Name: "family_name", Value: familyName },
        { Name: "custom:userType", Value: role }, // ✅ required by backend
      ],
    })
  );
}

// ---- CONFIRM SIGN UP (code from email/SMS) ----------------------
export async function cognitoConfirmSignUp(params: {
  email: string;
  code: string;
}) {
  const { email, code } = params;

  await client.send(
    new ConfirmSignUpCommand({
      ClientId: clientId,
      Username: email,
      ConfirmationCode: code,
    })
  );

  return { ok: true };
}

// ---- SIGN IN (returns tokens) -----------------------------------
export async function cognitoSignIn(params: {
  email: string;
  password: string;
}): Promise<CognitoTokens> {
  const { email, password } = params;

  const res = await client.send(
    new InitiateAuthCommand({
      ClientId: clientId,
      AuthFlow: "USER_PASSWORD_AUTH",
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    })
  );

  const auth = res.AuthenticationResult;
  if (!auth?.IdToken || !auth?.AccessToken) {
    throw new Error("No tokens returned from Cognito");
  }

  return {
    idToken: auth.IdToken,
    accessToken: auth.AccessToken,
    refreshToken: auth.RefreshToken,
  };
}
