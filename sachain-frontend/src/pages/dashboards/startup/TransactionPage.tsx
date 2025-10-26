// src/features/transaction/TransactionsPage.tsx
import React from 'react';
import ScheduleDashboard from '@/features/transactions/components/ScheduleDashboard';

export default function TransactionsPage() {
  return (
    <div style={{ padding: '20px' }}>
      <ScheduleDashboard />
    </div>
  );
}
