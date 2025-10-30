// import { useEffect, useState } from 'react';
// import { Client, TopicMessageQuery } from '@hashgraph/sdk';

// export function useHcsSubscription() {
//   const [messages, setMessages] = useState<any[]>([]);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     const operatorId = process.env.NEXT_PUBLIC_HEDERA_OPERATOR_ID || '';
//     const operatorKey = process.env.NEXT_PUBLIC_HEDERA_OPERATOR_KEY || '';
//     const topicIdStr = process.env.NEXT_PUBLIC_HCS_TOPIC_ID || '';

//     if (!operatorId || !operatorKey || !topicIdStr) {
//       setError('Missing keys  variables');
//       return;
//     }

//     const client = Client.forTestnet();
//     client.setOperator(operatorId, operatorKey);

//     let subscription: { unsubscribe: () => void } | null = null;

//     try {
//       subscription = new TopicMessageQuery()
//         .setTopicId(topicIdStr)
//         .subscribe(client, null, (message) => {
//           const messageText = new TextDecoder('utf-8').decode(message.contents);
//           console.log(
//             `Received message at ${message.consensusTimestamp.toDate()}: ${messageText}`
//           );
//         });
//     } catch (err: any) {
//       console.error('Error subscribing to topic:', err);
//       setError('Topic subscription error: ' + (err?.message || String(err)));
//     }

//     return () => {
//       if (subscription) {
//         subscription.unsubscribe();
//         console.log('Unsubscribed on Hedera topic');
//       }
//     };
//   }, []);

//   return { messages, error };
// }

import { useEffect, useState } from 'react';
import { Client, TopicMessageQuery, PrivateKey } from '@hashgraph/sdk';

export function useHcsSubscription() {
  const [messages, setMessages] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const operatorId = process.env.NEXT_PUBLIC_HEDERA_OPERATOR_ID || '';
    const operatorKeyString = process.env.NEXT_PUBLIC_HEDERA_OPERATOR_KEY || '';
    const topicIdStr = process.env.NEXT_PUBLIC_HCS_TOPIC_ID || '';

    if (!operatorId || !operatorKeyString || !topicIdStr) {
      setError('Missing Hedera environment variables');
      return;
    }

    let client: Client | null = null;
    let subscription: { unsubscribe: () => void } | null = null;

    try {
      // Parse private key properly
      const operatorKey = PrivateKey.fromStringDer(operatorKeyString);

      // Create client
      client = Client.forTestnet();
      client.setOperator(operatorId, operatorKey);

      subscription = new TopicMessageQuery()
        .setTopicId(topicIdStr)
        .subscribe(client, null, (message) => {
          const messageText = new TextDecoder('utf-8').decode(message.contents);
          const timestamp = message.consensusTimestamp.toDate();

          console.log(`Received message at ${timestamp}: ${messageText}`);

          // Add message to state
          setMessages((prev) => [
            ...prev,
            {
              text: messageText,
              timestamp,
              sequenceNumber: message.sequenceNumber,
            },
          ]);
        });
    } catch (err: any) {
      console.error('Error subscribing to topic:', err);
      setError('Topic subscription error: ' + (err?.message || String(err)));
    }

    // Cleanup function
    return () => {
      if (subscription) {
        subscription.unsubscribe();
        console.log('Unsubscribed from Hedera topic');
      }
      if (client) {
        client.close();
        console.log('Hedera client closed');
      }
    };
  }, []);

  return { messages, error };
}
