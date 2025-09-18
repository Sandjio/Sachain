// types/rechargeTypes.ts

export interface RechargeRequest {
  customerNumber: string;   // Orange Money phone number
  amount: string;           // Amount in FCFA, as string
  description: string;      // Transaction description
  idempotencyKey: string;  // Unique key to avoid duplicate processing
  walletAddress: string;    // Hedera wallet address to credit on success
}

export interface RechargeResponseData {
  id: number;
  createtime: string;
  subscriberMsisdn: string;
  amount: number;
  payToken: string;
  txnid: string;
  txnmode: string;
  inittxnmessage: string;
  inittxnstatus: string;
  confirmtxnstatus: string | null;
  confirmtxnmessage: string | null;
  status: string;          // e.g. "PENDING"
  notifUrl: string;        // Backend callback URL
  description: string;
  channelUserMsisdn: string;
}

export interface RechargeResponse {
  message: string;                    // High-level status message
  result: {
    message: string;
    data: RechargeResponseData;
  };
}
