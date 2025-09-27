import React, { useState, useMemo } from 'react';
import { Client, ScheduleSignTransaction, PrivateKey, ScheduleId } from '@hashgraph/sdk';

interface ScheduleSignProps {
  scheduleId: string;
}

export default function ScheduleSign({ scheduleId }: ScheduleSignProps) {
  const [privateKeyInput, setPrivateKeyInput] = useState('');
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


  const handleSignSchedule = async () => {
  setLoading(true);
  setError(null);
  setSuccessMessage(null);

  try {
    if (!scheduleId.trim()) throw new Error('Schedule ID is required');
    if (!privateKeyInput.trim()) throw new Error('Private key is required');

    const startupPrivateKey = PrivateKey.fromString(privateKeyInput.trim());
    const scheduleIdObj = ScheduleId.fromString(scheduleId.trim());

    // Await freezing so transactionId is properly set
    const scheduleSignTx = await new ScheduleSignTransaction()
      .setScheduleId(scheduleIdObj)
      .freezeWith(client);

    const signedTx = await scheduleSignTx.sign(startupPrivateKey);
    const response = await signedTx.execute(client);
    const receipt = await response.getReceipt(client);

    if (receipt.status.toString() === 'SUCCESS') {
      setSuccessMessage('Schedule transaction signed and executed successfully!');
      setPrivateKeyInput('');
    } else {
      setError(`Transaction failed with status: ${receipt.status.toString()}`);
    }
  } catch (error: any) {
    setError(error.message || 'An error occurred while signing');
  } finally {
    setLoading(false);
  }
};

  return (
    <div style={{ marginTop: 20 }}>
      <h3>Sign Schedule Transaction</h3>
      <p>
        Schedule ID: <strong>{scheduleId}</strong>
      </p>
      <input
        type="password"
        placeholder="Enter your private key"
        value={privateKeyInput}
        onChange={(e) => setPrivateKeyInput(e.target.value)}
        style={{ width: 400, marginRight: 10 }}
        autoComplete="off"
      />
      <button onClick={handleSignSchedule} disabled={loading || !privateKeyInput.trim()}>
        {loading ? 'Signing...' : 'Sign Schedule'}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
    </div>
  );
}
