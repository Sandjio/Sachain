// import { useState } from 'react';
// import { Client, AccountBalanceQuery } from '@hashgraph/sdk';

// interface UseManualWalletConnectReturn {
//   accountId: string;
//   setAccountId: (value: string) => void;
//   error: string | null;
//   loading: boolean;
//   startValidation: () => Promise<string | null>;
// }

// export function useManualWalletConnect(): UseManualWalletConnectReturn {
//   const [accountId, setAccountId] = useState('');
//   const [error, setError] = useState<string | null>(null);
//   const [loading, setLoading] = useState(false);

//   // Hedera client instance (testnet), operator should be configured carefully in env
//   const client = Client.forTestnet();
//   client.setOperator(
//     process.env.NEXT_PUBLIC_HEDERA_OPERATOR_ID!,
//     process.env.NEXT_PUBLIC_HEDERA_OPERATOR_KEY!
//   );

//   const startValidation = async (): Promise<string | null> => {
//     setError(null);

//     if (!accountId.trim()) {
//       setError('Please enter a valid Hedera Account ID (e.g., 0.0.1234)');
//       return null;
//     }

//     setLoading(true);
//     try {
//       const balanceResponse = await new AccountBalanceQuery()
//         .setAccountId(accountId.trim())
//         .execute(client);
//       setLoading(false);
//       return balanceResponse.hbars.toString();
//     } catch (err) {
//       setLoading(false);
//       setError(
//         'Unable to fetch balance. Check Account ID and network connection.'
//       );
//       return null;
//     }
//   };

//   return {
//     accountId,
//     setAccountId,
//     error,
//     loading,
//     startValidation,
//   };
// }



import { useState, useCallback } from 'react';
import { Client, AccountBalanceQuery, PrivateKey } from '@hashgraph/sdk';

interface UseManualWalletConnectReturn {
  accountId: string;
  setAccountId: (value: string) => void;
  error: string | null;
  loading: boolean;
  startValidation: () => Promise<string | null>;
}

export function useManualWalletConnect(): UseManualWalletConnectReturn {
  const [accountId, setAccountId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const startValidation = useCallback(async (): Promise<string | null> => {
    setError(null);

    if (!accountId.trim()) {
      setError('Please enter a valid Hedera Account ID (e.g., 0.0.1234)');
      return null;
    }

    setLoading(true);

    // Create client only when needed (inside the callback)
    let client: Client | null = null;

    try {
      const operatorId = process.env.NEXT_PUBLIC_HEDERA_OPERATOR_ID;
      const operatorKeyString = process.env.NEXT_PUBLIC_HEDERA_OPERATOR_KEY;

      if (!operatorId || !operatorKeyString) {
        throw new Error('Hedera credentials not configured');
      }

      // Parse private key properly
      const operatorKey = PrivateKey.fromStringDer(operatorKeyString);

      // Create client here, only when function is called
      client = Client.forTestnet();
      client.setOperator(operatorId, operatorKey);

      const balanceResponse = await new AccountBalanceQuery()
        .setAccountId(accountId.trim())
        .execute(client);

      setLoading(false);
      return balanceResponse.hbars.toString();
    } catch (err: any) {
      setLoading(false);
      setError(
        err.message || 'Unable to fetch balance. Check Account ID and network connection.'
      );
      return null;
    } finally {
      // Clean up client
      if (client) {
        client.close();
      }
    }
  }, [accountId]);

  return {
    accountId,
    setAccountId,
    error,
    loading,
    startValidation,
  };
}