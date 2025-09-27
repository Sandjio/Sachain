// src/features/transaction/TransactionsPage.tsx
import React from 'react';
import ScheduleDashboard from '@/features/transactions/components/ScheduleDashboard'; // Adjust import path as needed

export default function TransactionsPage() {
  return (
    <div style={{ padding: '20px' }}>
      <h2>My Transactions</h2>
      <ScheduleDashboard />
    </div>
  );
}
