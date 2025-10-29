import { Client, TopicCreateTransaction } from '@hashgraph/sdk';

const OPERATOR_ID = process.env.HEDERA_OPERATOR_ID || '';
const OPERATOR_KEY = process.env.HEDERA_OPERATOR_KEY || '';

const client = Client.forTestnet();
client.setOperator(OPERATOR_ID, OPERATOR_KEY);

export async function createConsensusTopic() {
  const transaction = new TopicCreateTransaction().setTopicMemo(
    'Notifications for project share purchases'
  );

  const response = await transaction.execute(client);
  const receipt = await response.getReceipt(client);

  const topicId = receipt.topicId;
  if (topicId) {
    console.log('Created HCS Topic ID:', topicId.toString());
    return topicId.toString();
  } else {
    console.error('Failed to create topic: topicId is null');
    return null;
  }
}

// ES module compatible way to run when executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createConsensusTopic().catch(console.error);
}
