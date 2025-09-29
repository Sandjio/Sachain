

import { useEffect, useState } from 'react';
import { Client, TopicMessageQuery } from '@hashgraph/sdk';

export function useHcsSubscription() {
  const [messages, setMessages] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const operatorId = process.env.NEXT_PUBLIC_HEDERA_OPERATOR_ID || '';
    const operatorKey = process.env.NEXT_PUBLIC_HEDERA_OPERATOR_KEY || '';
    const topicIdStr = process.env.NEXT_PUBLIC_HCS_TOPIC_ID || '';

    if (!operatorId || !operatorKey || !topicIdStr) {
      setError('Missing keys  variables');
      return;
    }

    const client = Client.forTestnet();
    client.setOperator(operatorId, operatorKey);

let subscription: { unsubscribe: () => void } | null = null;

try {
  subscription = new TopicMessageQuery()
    .setTopicId(topicIdStr)
    .subscribe(
      client,
      null,
      (message) => {
        
        const messageText = new TextDecoder("utf-8").decode(message.contents);
        console.log(`Received message at ${message.consensusTimestamp.toDate()}: ${messageText}`);
        
      }
    );
} catch (err: any) {
  console.error('Error subscribing to topic:', err);
  setError('Topic subscription error: ' + (err?.message || String(err)));
}


    return () => {
      if (subscription) {
        subscription.unsubscribe();
        console.log('Unsubscribed on Hedera topic');
      }
    };
  }, []);

  return { messages, error };
}
