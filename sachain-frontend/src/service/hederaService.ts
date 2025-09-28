// hederaService.ts
import { Client, ScheduleInfoQuery } from '@hashgraph/sdk';

const OPERATOR_ID = process.env.NEXT_PUBLIC_HEDERA_OPERATOR_ID || '';
const PRIVATEKEY = process.env.NEXT_PUBLIC_HEDERA_OPERATOR_KEY || '';

// Hedera Client setup
const operatorId = OPERATOR_ID; 
const operatorKey = PRIVATEKEY;

const client = Client.forTestnet();
client.setOperator(operatorId, operatorKey);

export async function getScheduleInfo(scheduleIdStr: string) {
  
  const cleanedScheduleId = scheduleIdStr.trim();
  console.log('Querying Schedule ID:', cleanedScheduleId);

  try {
    const query = new ScheduleInfoQuery().setScheduleId(cleanedScheduleId);
    return await query.execute(client);
  } catch (error: any) {
  
    console.error('Error fetching Schedule Info:', error);
    throw error;
  }
}
