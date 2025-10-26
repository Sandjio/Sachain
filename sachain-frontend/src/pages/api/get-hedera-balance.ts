import type { NextApiRequest, NextApiResponse } from 'next';
import { Client, AccountBalanceQuery, AccountId } from '@hashgraph/sdk';

const client = Client.forTestnet();
client.setOperator(process.env.HEDERA_OPERATOR_ID!, process.env.HEDERA_OPERATOR_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const walletAddress = req.query.walletAddress as string;
  if (!walletAddress) return res.status(400).json({ error: 'Missing wallet address' });

  try {
    const accountId = AccountId.fromString(walletAddress);
    const balance = await new AccountBalanceQuery().setAccountId(accountId).execute(client);

    const hbarBalance = Number(balance.hbars.toTinybars()) / 1e8;

    res.status(200).json({ hbarBalance });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
