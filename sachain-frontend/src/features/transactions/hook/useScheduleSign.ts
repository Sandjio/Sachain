import { useState, useMemo, useCallback } from 'react';
import { Client, ScheduleSignTransaction, PrivateKey, ScheduleId } from '@hashgraph/sdk';

export function useScheduleSign(scheduleId: string) {
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const client = useMemo(() => {
    const c = Client.forTestnet();
    c.setOperator(
      process.env.NEXT_PUBLIC_HEDERA_OPERATOR_ID || '',
      process.env.NEXT_PUBLIC_HEDERA_OPERATOR_KEY || ''
    );
    return c;
  }, []);

  const signSchedule = useCallback(
    async (privateKeyInput: string) => {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      try {
        if (!scheduleId.trim()) throw new Error('Schedule ID is required');
        if (!privateKeyInput.trim()) throw new Error('Private key is required');

        const startupPrivateKey = PrivateKey.fromString(privateKeyInput.trim());
        const scheduleIdObj = ScheduleId.fromString(scheduleId.trim());

        // Create and sign transaction
        const scheduleSignTx = await new ScheduleSignTransaction()
          .setScheduleId(scheduleIdObj)
          .freezeWith(client);

        const signedTx = await scheduleSignTx.sign(startupPrivateKey);
        const response = await signedTx.execute(client);
        const receipt = await response.getReceipt(client);

        if (receipt.status.toString() === 'SUCCESS') {
          setSuccessMessage('Schedule transaction signed and executed successfully!');
          return true;
        } else {
          throw new Error(`Transaction failed with status: ${receipt.status.toString()}`);
        }
      } catch (e: any) {
        setError(e.message || 'An error occurred while signing');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [client, scheduleId]
  );

  return { loading, error, successMessage, signSchedule };
}
