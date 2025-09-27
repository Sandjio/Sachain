import React, { useState } from 'react';
import ScheduleInfoInput from '../components/ScheduleInput';
import ScheduleDetails from '../components/ScheduleDetails';
import ScheduleSign from '../components/ScheduleSign';
import { useScheduleInfo } from '../hook/useScheduleInfo';

export default function ScheduleDashboard() {
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const { scheduleInfo, loading, error, fetchScheduleInfo } = useScheduleInfo();

  // Trigger fetch and set scheduleId
  const handleFetchSchedule = async (id: string) => {
    setScheduleId(null);          // Clear old data while loading
    await fetchScheduleInfo(id);
    setScheduleId(id);
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <h1>Schedule Transaction Dashboard</h1>
      
      {/* Schedule ID input with fetch callback */}
      <ScheduleInfoInput
        onFetchSchedule={handleFetchSchedule}
        loading={loading}
        error={error}
      />

      {/* Show loading or error if relevant */}
      {loading && <p>Loading schedule info...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* Show schedule details */}
      {scheduleInfo && <ScheduleDetails scheduleInfo={scheduleInfo} />}

      {/* Show sign UI only if schedule info loaded */}
      {scheduleInfo && scheduleId && (
        <ScheduleSign scheduleId={scheduleId} />
      )}
    </div>
  );
}
