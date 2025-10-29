// utils/downloadWalletDetails.ts
export function downloadWalletDetails(walletDetails: {
  accountId: string;
  publicKey?: string;
  privateKey?: string;
  balance: string;
}) {
  const fileContent = `Hedera Wallet Details
Created: ${new Date().toLocaleString()}

Account ID: ${walletDetails.accountId}
Public Key: ${walletDetails.publicKey}
Private Key: ${walletDetails.privateKey}
Balance: ${walletDetails.balance} HBAR

⚠️ KEEP THIS FILE SECURE AND PRIVATE ⚠️`;

  const file = new Blob([fileContent], { type: 'text/plain' });
  const element = document.createElement('a');
  element.href = URL.createObjectURL(file);
  element.download = `hedera-wallet-${walletDetails.accountId}.txt`;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}
