// import React from 'react';

interface ScheduleDetailsProps {
  scheduleInfo: any; // Define more specific types as needed
}

// Helper to render Hedera IDs (AccountId/ScheduleId objects)
function renderId(idObj: any) {
  if (!idObj || typeof idObj !== 'object') return 'N/A';
  if ('shard' in idObj && 'realm' in idObj && 'num' in idObj) {
    return `${idObj.shard}.${idObj.realm}.${idObj.num}`;
  }
  // fallback to string if possible
  if (typeof idObj.toString === 'function') return idObj.toString();
  return 'N/A';
}

export default function ScheduleDetails({ scheduleInfo }: ScheduleDetailsProps) {
  if (!scheduleInfo) {
    return <p>No schedule data available.</p>;
  }

  const {
    scheduleId,
    creatorAccountId,
    expirationTime,
    signatories,
    executionTime,
    scheduledTransactionBody,
  } = scheduleInfo;

  // Format date nicely
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp || !timestamp.seconds) return 'N/A';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleString();
  };

  // Get token transfer or HBAR transfer details from scheduledTransactionBody
  const getTransactionSummary = () => {
    if (!scheduledTransactionBody) return 'N/A';

    // Token transfer transactions
    if (scheduledTransactionBody.tokenTransfer) {
      return scheduledTransactionBody.tokenTransfer.transfers
        .map((transfer: any) =>
          `Account ${renderId(transfer.accountID)} → Amount: ${transfer.amount}`
        )
        .join(', ');
    }

    // Crypto transfer transactions
    if (scheduledTransactionBody.cryptoTransfer?.transfers) {
      return scheduledTransactionBody.cryptoTransfer.transfers
        .map((transfer: any) =>
          `Account ${renderId(transfer.accountID)} → Amount: ${transfer.amount}`
        )
        .join(', ');
    }

    // NFT transfers (example structure from your explorer data)
    if (
      scheduledTransactionBody.cryptoTransfer?.tokenTransfers &&
      scheduledTransactionBody.cryptoTransfer.tokenTransfers[0]?.nftTransfers
    ) {
      return scheduledTransactionBody.cryptoTransfer.tokenTransfers[0].nftTransfers
        .map((nft: any) =>
          `NFT #${nft.serialNumber.low} from ${renderId(nft.senderAccountID)} to ${renderId(nft.receiverAccountID)}`
        )
        .join('; ');
    }

    return 'Unknown transaction type';
  };

  return (
    <div style={{ marginTop: 20 }}>
      <h3>Schedule Details</h3>
      <p>
        <strong>Schedule ID:</strong> {renderId(scheduleId)}
      </p>
      <p>
        <strong>Creator Account:</strong> {renderId(creatorAccountId)}
      </p>
      <p>
        <strong>Expiration Time:</strong> {formatTimestamp(expirationTime)}
      </p>
      <p>
        <strong>Execution Time:</strong> {formatTimestamp(executionTime) || 'Not yet executed'}
      </p>
      <p>
        <strong>Signatories:</strong>{' '}
        {Array.isArray(signatories) && signatories.length > 0
          ? signatories.join(', ')
          : 'None yet'}
      </p>
      <p>
        <strong>Transaction Summary:</strong> {getTransactionSummary()}
      </p>
    </div>
  );
}
