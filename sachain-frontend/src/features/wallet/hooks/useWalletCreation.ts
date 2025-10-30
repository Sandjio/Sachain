// import { useState, useEffect } from 'react';
// import {
//   Client,
//   PrivateKey,
//   AccountCreateTransaction,
//   Hbar,
// } from '@hashgraph/sdk';

// const creationSteps = [
//   'Generating keys',
//   'Submitting transaction',
//   'Awaiting confirmation',
//   'Completing setup',
// ];

// export function useWalletCreation() {
//   const [publicKey, setPublicKey] = useState<string | null>(null);
//   const [privateKey, setPrivateKey] = useState<string | null>(null);
//   const [accountId, setAccountId] = useState<string | null>(null);
//   const [currentStep, setCurrentStep] = useState(0);
//   const [state, setState] = useState<'idle' | 'creating' | 'success' | 'error'>(
//     'idle'
//   );
//   const [error, setError] = useState<string | null>(null);

//   const client = Client.forTestnet();
//   client.setOperator(
//     process.env.NEXT_PUBLIC_HEDERA_OPERATOR_ID!,
//     process.env.NEXT_PUBLIC_HEDERA_OPERATOR_KEY!
//   );

//   useEffect(() => {
//     let timer: NodeJS.Timeout;
//     if (state === 'creating') {
//       if (currentStep < creationSteps.length) {
//         timer = setTimeout(() => setCurrentStep((s) => s + 1), 1000);
//       }
//     }
//     return () => clearTimeout(timer);
//   }, [currentStep, state]);

//   async function createWallet() {
//     setState('creating');
//     setError(null);
//     setCurrentStep(0);
//     setPublicKey(null);
//     setPrivateKey(null);
//     setAccountId(null);

//     try {
//       // Step 1: Key generation
//       const newPrivateKey = PrivateKey.generateED25519();
//       const newPublicKey = newPrivateKey.publicKey;
//       setPrivateKey(newPrivateKey.toStringRaw());
//       setPublicKey(newPublicKey.toStringRaw());

//       // Step 2: Send transaction
//       const tx = new AccountCreateTransaction()
//         .setKey(newPublicKey)
//         .setInitialBalance(new Hbar(0));

//       const txResponse = await tx.execute(client);
//       setCurrentStep(2); // quickly progress some steps manually

//       // Step 3: Await confirmation
//       const receipt = await txResponse.getReceipt(client);
//       const newAccountId = receipt.accountId?.toString();

//       if (!newAccountId) {
//         throw new Error('No Account ID returned in receipt');
//       }
//       setAccountId(newAccountId);

//       setCurrentStep(creationSteps.length); // complete steps
//       setState('success');
//     } catch (e: any) {
//       setError(e.message || 'Error creating wallet');
//       setState('error');
//     }
//   }

//   return {
//     publicKey,
//     privateKey,
//     accountId,
//     currentStep,
//     state,
//     error,
//     createWallet,
//     creationSteps,
//   };
// }

import { useState, useEffect, useCallback } from 'react';
import {
  Client,
  PrivateKey,
  AccountCreateTransaction,
  Hbar,
} from '@hashgraph/sdk';

const creationSteps = [
  'Generating keys',
  'Submitting transaction',
  'Awaiting confirmation',
  'Completing setup',
];

export function useWalletCreation() {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [state, setState] = useState<'idle' | 'creating' | 'success' | 'error'>(
    'idle'
  );
  const [error, setError] = useState<string | null>(null);

  // Don't create client here!

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (state === 'creating') {
      if (currentStep < creationSteps.length) {
        timer = setTimeout(() => setCurrentStep((s) => s + 1), 1000);
      }
    }
    return () => clearTimeout(timer);
  }, [currentStep, state]);

  const createWallet = useCallback(async () => {
    setState('creating');
    setError(null);
    setCurrentStep(0);
    setPublicKey(null);
    setPrivateKey(null);
    setAccountId(null);

    // Create client only when function is called
    let client: Client | null = null;

    try {
      const operatorId = process.env.NEXT_PUBLIC_HEDERA_OPERATOR_ID;
      const operatorKeyString = process.env.NEXT_PUBLIC_HEDERA_OPERATOR_KEY;

      if (!operatorId || !operatorKeyString) {
        throw new Error('Hedera credentials not configured');
      }

      // Parse operator key properly
      const operatorKey = PrivateKey.fromStringDer(operatorKeyString);

      // Create client here
      client = Client.forTestnet();
      client.setOperator(operatorId, operatorKey);

      // Step 1: Key generation
      const newPrivateKey = PrivateKey.generateED25519();
      const newPublicKey = newPrivateKey.publicKey;
      setPrivateKey(newPrivateKey.toStringRaw());
      setPublicKey(newPublicKey.toStringRaw());

      // Step 2: Send transaction
      const tx = new AccountCreateTransaction()
        .setKey(newPublicKey)
        .setInitialBalance(new Hbar(0));

      const txResponse = await tx.execute(client);
      setCurrentStep(2); // quickly progress some steps manually

      // Step 3: Await confirmation
      const receipt = await txResponse.getReceipt(client);
      const newAccountId = receipt.accountId?.toString();

      if (!newAccountId) {
        throw new Error('No Account ID returned in receipt');
      }
      setAccountId(newAccountId);

      setCurrentStep(creationSteps.length); // complete steps
      setState('success');
    } catch (e: any) {
      console.error('Wallet creation error:', e);
      setError(e.message || 'Error creating wallet');
      setState('error');
    } finally {
      // Always close client
      if (client) {
        client.close();
      }
    }
  }, []);

  return {
    publicKey,
    privateKey,
    accountId,
    currentStep,
    state,
    error,
    createWallet,
    creationSteps,
  };
}
