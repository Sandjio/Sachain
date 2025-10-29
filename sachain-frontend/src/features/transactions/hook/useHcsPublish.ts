// import { useState, useCallback } from 'react';
// import { Client, TopicMessageSubmitTransaction } from '@hashgraph/sdk';

// export function useHcsPublish() {
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [success, setSuccess] = useState<boolean>(false);

//   const publishMessage = useCallback(async (message: string) => {
//     setLoading(true);
//     setError(null);
//     setSuccess(false);

//     try {
//       const operatorId = process.env.NEXT_PUBLIC_HEDERA_OPERATOR_ID || '';
//       const operatorKey = process.env.NEXT_PUBLIC_HEDERA_OPERATOR_KEY || '';
//       const topicId = process.env.NEXT_PUBLIC_HCS_TOPIC_ID || '';

//       if (!operatorId || !operatorKey || !topicId) {
//         throw new Error('Missing Hedera environment variables');
//       }

//       const client = Client.forTestnet();
//       client.setOperator(operatorId, operatorKey);

//       const transaction = new TopicMessageSubmitTransaction()
//         .setTopicId(topicId)
//         .setMessage(message);

//       const response = await transaction.execute(client);
//       const receipt = await response.getReceipt(client);

//       if (receipt.status.toString() === 'SUCCESS') {
//         setSuccess(true);
//       } else {
//         throw new Error(
//           `Failed to publish message: ${receipt.status.toString()}`
//         );
//       }
//     } catch (e: any) {
//       setError(e.message);
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   return { publishMessage, loading, error, success };
// }



import { useState, useCallback } from 'react';
import { Client, TopicMessageSubmitTransaction, PrivateKey } from '@hashgraph/sdk';

export function useHcsPublish() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const publishMessage = useCallback(async (message: string) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const operatorId = process.env.NEXT_PUBLIC_HEDERA_OPERATOR_ID || '';
      const operatorKeyString = process.env.NEXT_PUBLIC_HEDERA_OPERATOR_KEY || '';
      const topicId = process.env.NEXT_PUBLIC_HCS_TOPIC_ID || '';

      if (!operatorId || !operatorKeyString || !topicId) {
        throw new Error('Missing Hedera environment variables');
      }

      // FIX 1: Convert string to PrivateKey object
      const operatorKey = PrivateKey.fromStringDer(operatorKeyString);

      const client = Client.forTestnet();
      
      // FIX 2: Pass PrivateKey object instead of string
      client.setOperator(operatorId, operatorKey);

      const transaction = new TopicMessageSubmitTransaction()
        .setTopicId(topicId)
        .setMessage(message);

      const response = await transaction.execute(client);
      const receipt = await response.getReceipt(client);

      if (receipt.status.toString() === 'SUCCESS') {
        setSuccess(true);
      } else {
        throw new Error(
          `Failed to publish message: ${receipt.status.toString()}`
        );
      }

      // FIX 3: Close the client to clean up resources
      client.close();

    } catch (e: any) {
      console.error('HCS Publish Error:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { publishMessage, loading, error, success };
}