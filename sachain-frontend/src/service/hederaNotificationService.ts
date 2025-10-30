

import { Client, TopicMessageSubmitTransaction, PrivateKey } from '@hashgraph/sdk';

// Don't create client at module level!
let client: Client | null = null;

function getClient(): Client {
  if (!client) {
    const operatorId = process.env.NEXT_PUBLIC_HEDERA_OPERATOR_ID || '';
    const operatorKeyString = process.env.NEXT_PUBLIC_HEDERA_OPERATOR_KEY || '';

    if (!operatorId || !operatorKeyString) {
      throw new Error('Missing Hedera operator credentials');
    }

    // Parse the private key properly
    const operatorKey = PrivateKey.fromStringDer(operatorKeyString);

    client = Client.forTestnet();
    client.setOperator(operatorId, operatorKey);
  }

  return client;
}

/**
 * Publish a message to a Hedera Consensus Service (HCS) topic
 * @param topicIdStr - The topic ID as string
 * @param message - The message string
 * @returns The transaction status string ('SUCCESS')
 */
export async function publishNotificationMessage(
  topicIdStr: string,
  message: string
): Promise<string> {
  try {
    // Get client lazily when function is called
    const hederaClient = getClient();

    const transaction = new TopicMessageSubmitTransaction()
      .setTopicId(topicIdStr)
      .setMessage(message);

    const response = await transaction.execute(hederaClient);
    const receipt = await response.getReceipt(hederaClient);

    console.log(
      `Published message to topic ${topicIdStr}, status: ${receipt.status.toString()}`
    );

    return receipt.status.toString();
  } catch (error: any) {
    console.error('Failed to publish HCS message:', error);
    throw error;
  }
}

// Optional: Add cleanup function
export function closeNotificationClient() {
  if (client) {
    client.close();
    client = null;
  }
}