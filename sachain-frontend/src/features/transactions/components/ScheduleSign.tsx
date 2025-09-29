import React, { useState } from 'react';
import { useScheduleSign } from '../hook/useScheduleSign';
import { useHcsPublish } from '../hook/useHcsPublish';

interface ScheduleSignProps {
  scheduleId: string;
  projectId: string;
  investorWalletAddress: string;
  sharesApproved: number;
}

export default function ScheduleSign({
  scheduleId,
  projectId,
  investorWalletAddress,
  sharesApproved,
}: ScheduleSignProps) {
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const {
    loading: signingLoading,
    error: signingError,
    successMessage,
    signSchedule,
  } = useScheduleSign(scheduleId);
  const {
    publishMessage,
    loading: publishLoading,
    error: publishError,
    success: publishSuccess,
  } = useHcsPublish();

  const handleSignClick = async () => {
    const signed = await signSchedule(privateKeyInput);
    if (signed) {
      // Prepare the notification payload
      const messagePayload = JSON.stringify({
        type: 'purchase_approved',
        projectId,
        investorWalletAddress,
        sharesApproved,
        timestamp: new Date().toISOString(),
      });

      // Publish the approval notification
      await publishMessage(messagePayload);
      setPrivateKeyInput('');
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
      <button
        onClick={handleSignClick}
        disabled={signingLoading || publishLoading || !privateKeyInput.trim()}
      >
        {signingLoading || publishLoading ? 'Processing...' : 'Sign Schedule'}
      </button>

      {signingError && (
        <p style={{ color: 'red' }}>Signing Error: {signingError}</p>
      )}
      {publishError && (
        <p style={{ color: 'red' }}>Notification Error: {publishError}</p>
      )}
      {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
      {publishSuccess && (
        <p style={{ color: 'green' }}>
          Approval notification sent successfully!
        </p>
      )}
    </div>
  );
}
