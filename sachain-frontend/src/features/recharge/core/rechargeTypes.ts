// types/rechargeTypes.ts

export interface RechargeRequest {
  customerNumber: string;
  amount: string;
  description: string;
  idempotencyKey: string; 
  walletAddress: string; 
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
  status: string;          
  notifUrl: string;       
  description: string;
  channelUserMsisdn: string;
}

export interface RechargeResponse {
  message: string;                    
  result: {
    message: string;
    data: RechargeResponseData;
  };
}
