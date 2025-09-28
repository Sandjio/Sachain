import { Client, TopicMessageSubmitTransaction } from '@hashgraph/sdk';


const OPERATOR_ID = process.env.NEXT_PUBLIC_HEDERA_OPERATOR_ID || '';
const OPERATOR_KEY = process.env.NEXT_PUBLIC_HEDERA_OPERATOR_KEY || '';


const client = Client.forTestnet();
client.setOperator(OPERATOR_ID, OPERATOR_KEY);

/**
 * Publish a message to a Hedera Consensus Service (HCS) topic
 * @param topicIdStr - The topic ID as string
 * @param message - The message string
 * @returns The transaction status string ('SUCCESS')
 */
export async function publishNotificationMessage(topicIdStr: string, message: string): Promise<string> {
  try {
    const transaction = new TopicMessageSubmitTransaction()
      .setTopicId(topicIdStr)  
      .setMessage(message); 

    
    const response = await transaction.execute(client);

    
    const receipt = await response.getReceipt(client);

    console.log(`Published message to topic ${topicIdStr}, status: ${receipt.status.toString()}`);

    return receipt.status.toString();
  } catch (error: any) {
    console.error('Failed to publish HCS message:', error);
    throw error;
  }
}
