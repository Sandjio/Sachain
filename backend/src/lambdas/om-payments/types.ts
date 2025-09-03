/**
 *  TypeScript interfaces for Orange Money Payments Lambda
 */

export interface TokenResponse {
  access_token: string;
  scope?: string;
  token_type: string;
  expires_in: number;
}

export interface PayTokenResponse {
  message: string;
  data: {
    payToken: string;
  };
}

export interface CreatePaymentResponse {
  message: string;
  data: {
    id: number;
    createtime: string;
    subscriberMsisdn: string;
    amount: number;
    payToken: string;
    txnid: string | null;
    txnmode: string;
    inittxnmessage: string;
    inittxnstatus: string;
    confirmtxnstatus: string | null;
    confirmtxnmessage: string | null;
    status: string;
    notifUrl: string;
    description: string;
    channelUserMsisdn: string;
  };
}

export interface PaymentRequest {
  customerNumber: string;
  amount: string;
  description?: string;
  orderId?: string;
  pin: string;
  notifUrls?: string;
}
