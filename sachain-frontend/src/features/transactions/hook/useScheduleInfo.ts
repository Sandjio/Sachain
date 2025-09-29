import { useState, useCallback } from 'react';
import { getScheduleInfo } from '@/service/hederaService';

export function useScheduleInfo() {
  const [scheduleInfo, setScheduleInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchScheduleInfo = useCallback(async (scheduleId: string) => {
    setLoading(true);
    setError(null);
    setScheduleInfo(null);

    const trimmedId = scheduleId.trim();
    console.log('Fetching info for Schedule ID:', trimmedId);

    try {
      const info = await getScheduleInfo(trimmedId);
      setScheduleInfo(info);
    } catch (e: any) {
      setError(e.message || 'Error fetching schedule info');
      console.error('Schedule Query Error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  return { scheduleInfo, loading, error, fetchScheduleInfo };
}
