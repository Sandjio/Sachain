# Hedera Configuration Setup

This document explains how to set up Hedera credentials for the Sachain platform.

## Problem

The stock minting Lambda function was failing with the error:

```
HederaServiceError: Missing required Hedera configuration
```

This happened because the Hedera service requires valid credentials to connect to the Hedera network for token creation and NFT minting operations.

## Solution

We've implemented a secure solution using AWS Secrets Manager to store Hedera credentials instead of environment variables.

## Setup Instructions

### 1. Get Hedera Testnet Credentials

For development/testing, you need to create a Hedera testnet account:

1. Go to [Hedera Portal](https://portal.hedera.com/)
2. Create a testnet account
3. Note down your:
   - Account ID (format: `0.0.123456`)
   - Private Key (format: `302e020100300506032b657004220420...`)

### 2. Set Up AWS Secrets Manager

Use the provided script to store your Hedera credentials securely:

```bash
# Navigate to infrastructure directory
cd sachain-infrastructure

# Install dependencies if not already done
npm install

# Set up credentials for development environment
node scripts/setup-hedera-secrets.js dev 0.0.YOUR_ACCOUNT_ID YOUR_PRIVATE_KEY

# Example:
node scripts/setup-hedera-secrets.js dev 0.0.123456 302e020100300506032b657004220420abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
```

### 3. Deploy Infrastructure

After setting up the secrets, deploy your infrastructure:

```bash
# Deploy the infrastructure stack
npm run cdk deploy

# Or deploy all stacks
npm run deploy
```

### 4. Verify Setup

Test the Lambda function to ensure it can access the Hedera credentials:

```bash
# Test the stock minting endpoint
curl -X POST https://your-api-gateway-url/dev/projects/test-project-id/mint-stocks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"walletAddress": "0.0.123456"}'
```

## Environment-Specific Configuration

### Development (`dev`)

- Network: `testnet`
- Use testnet credentials from Hedera Portal

### Staging (`staging`)

- Network: `testnet`
- Use dedicated staging testnet account

### Production (`prod`)

- Network: `mainnet`
- Use production mainnet credentials (requires real HBAR)

## Security Notes

1. **Never commit private keys** to version control
2. **Use AWS Secrets Manager** for all environments
3. **Rotate keys regularly** in production
4. **Use least privilege** IAM policies for Lambda functions
5. **Monitor usage** through CloudWatch logs

## Troubleshooting

### Lambda Still Failing?

1. **Check IAM permissions**: Ensure the Lambda execution role has `secretsmanager:GetSecretValue` permission
2. **Verify secret name**: Ensure the secret name matches the pattern `/sachain/{environment}/hedera/credentials`
3. **Check credentials format**: Ensure the secret contains valid JSON with `operatorId`, `operatorKey`, and `network` fields

### Invalid Credentials Error?

1. **Verify account ID format**: Should be `0.0.123456`
2. **Check private key format**: Should be a hex string starting with `302e020100300506032b657004220420`
3. **Ensure sufficient balance**: Testnet accounts need HBAR for transactions

### Network Connection Issues?

1. **Check network setting**: Should be `testnet` for dev/staging, `mainnet` for prod
2. **Verify firewall rules**: Ensure Lambda can reach Hedera network endpoints
3. **Check timeout settings**: Hedera operations may take time, ensure adequate Lambda timeout

## Cost Considerations

### Testnet

- Free to use
- Get free HBAR from [Hedera faucet](https://portal.hedera.com/faucet)

### Mainnet

- Requires real HBAR
- Token creation: ~20 HBAR
- NFT minting: ~0.1 HBAR per NFT
- Budget accordingly for production use

## Support

For issues with:

- **Hedera setup**: Check [Hedera documentation](https://docs.hedera.com/)
- **AWS Secrets Manager**: Check [AWS documentation](https://docs.aws.amazon.com/secretsmanager/)
- **Lambda configuration**: Check CloudWatch logs for detailed error messages
