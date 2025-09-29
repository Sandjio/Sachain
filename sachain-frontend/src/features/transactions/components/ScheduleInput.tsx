import React, { useState } from 'react';

interface ScheduleInfoInputProps {
  onFetchSchedule: (scheduleId: string) => void;
  loading: boolean;
  error: string | null;
}

export default function ScheduleInfoInput({ onFetchSchedule, loading, error }: ScheduleInfoInputProps) {
  const [scheduleId, setScheduleId] = useState('');

  const onFetchClick = () => {
    if (scheduleId.trim()) {
      onFetchSchedule(scheduleId.trim());
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && scheduleId.trim()) {
      onFetchSchedule(scheduleId.trim());
    }
  };

  return (
    <div>
      <h2>Lookup Schedule Information</h2>
      <input
        type="text"
        value={scheduleId}
        onChange={(e) => setScheduleId(e.target.value.trimStart())}
        onKeyDown={onKeyDown}
        placeholder="e.g. 0.0.6908844"
        style={{ width: 300, marginRight: 10 }}
      />
      <button onClick={onFetchClick} disabled={!scheduleId.trim() || loading}>
        {loading ? 'Loading...' : 'Fetch Info'}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
