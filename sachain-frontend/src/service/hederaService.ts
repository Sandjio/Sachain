// hederaService.ts
import { Client, ScheduleInfoQuery, PrivateKey } from '@hashgraph/sdk';

let client: Client | null = null;

function getClient(): Client {
  if (!client) {
    const operatorId = process.env.NEXT_PUBLIC_HEDERA_OPERATOR_ID || '';
    const operatorKeyString = process.env.NEXT_PUBLIC_HEDERA_OPERATOR_KEY || '';

    if (!operatorId || !operatorKeyString) {
      throw new Error(
        'Missing Hedera operator credentials in environment variables'
      );
    }

    const operatorKey = PrivateKey.fromStringDer(operatorKeyString);

    client = Client.forTestnet();
    client.setOperator(operatorId, operatorKey);
  }

  return client;
}

export async function getScheduleInfo(scheduleIdStr: string) {
  const cleanedScheduleId = scheduleIdStr.trim();
  console.log('Querying Schedule ID:', cleanedScheduleId);

  try {
    const hederaClient = getClient();
    const query = new ScheduleInfoQuery().setScheduleId(cleanedScheduleId);
    return await query.execute(hederaClient);
  } catch (error: any) {
    console.error('Error fetching Schedule Info:', error);
    throw error;
  }
}

export function closeClient() {
  if (client) {
    client.close();
    client = null;
  }
}
