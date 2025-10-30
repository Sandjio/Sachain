

import { Client, TopicCreateTransaction, PrivateKey } from '@hashgraph/sdk';

let client: Client | null = null;

function getClient(): Client {
  if (!client) {
    // Note: Using non-NEXT_PUBLIC vars (for server-side/scripts only)
    const operatorId = process.env.HEDERA_OPERATOR_ID || '';
    const operatorKeyString = process.env.HEDERA_OPERATOR_KEY || '';

    if (!operatorId || !operatorKeyString) {
      throw new Error('Missing Hedera operator credentials');
    }

    const operatorKey = PrivateKey.fromStringDer(operatorKeyString);

    client = Client.forTestnet();
    client.setOperator(operatorId, operatorKey);
  }

  return client;
}

export async function createConsensusTopic() {
  try {
    const hederaClient = getClient();

    const transaction = new TopicCreateTransaction().setTopicMemo(
      'Notifications for project share purchases'
    );

    const response = await transaction.execute(hederaClient);
    const receipt = await response.getReceipt(hederaClient);

    const topicId = receipt.topicId;
    if (topicId) {
      console.log('Created HCS Topic ID:', topicId.toString());
      return topicId.toString();
    } else {
      console.error('Failed to create topic: topicId is null');
      return null;
    }
  } catch (error) {
    console.error('Failed to create consensus topic:', error);
    throw error;
  }
}

export function closeClient() {
  if (client) {
    client.close();
    client = null;
  }
}

// ES module compatible way to run when executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createConsensusTopic()
    .then(() => closeClient())
    .catch((error) => {
      console.error(error);
      closeClient();
    });
}