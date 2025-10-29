import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Search } from 'lucide-react';
import React, { useState } from 'react';

interface ScheduleInfoInputProps {
  onFetchSchedule: (scheduleId: string) => void;
  loading: boolean;
  error: string | null;
}

export default function ScheduleInfoInput({
  onFetchSchedule,
  loading,
  error,
}: ScheduleInfoInputProps) {
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
      <Card className="w-full max-w-md shadow-lg border-border/40 backdrop-blur-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Schedule Lookup
          </CardTitle>
          <p className="text-muted-foreground">
            Enter a schedule ID to fetch information
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              type="text"
              value={scheduleId}
              onChange={(e) => setScheduleId(e.target.value.trimStart())}
              onKeyDown={onKeyDown}
              placeholder="e.g. 0.0.6908844"
              className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
              disabled={loading}
            />
          </div>

          <Button
            onClick={onFetchClick}
            disabled={!scheduleId.trim() || loading}
            className="w-full transition-all duration-200 hover:shadow-md"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Fetch Info
              </>
            )}
          </Button>

          {error && (
            <Alert
              variant="destructive"
              className="animate-in fade-in duration-200"
            >
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
