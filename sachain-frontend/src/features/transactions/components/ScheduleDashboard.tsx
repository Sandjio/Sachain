import React, { useState } from 'react';
import ScheduleInfoInput from '../components/ScheduleInput';
import ScheduleDetails from '../components/ScheduleDetails';
import ScheduleSign from '../components/ScheduleSign';
import { useScheduleInfo } from '../hook/useScheduleInfo';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarClock, Loader2, Info } from 'lucide-react';

export default function ScheduleDashboard() {
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const { scheduleInfo, loading, error, fetchScheduleInfo } = useScheduleInfo();

  const handleFetchSchedule = async (id: string) => {
    setScheduleId(null);      
    await fetchScheduleInfo(id);
    setScheduleId(id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <CalendarClock className="h-8 w-8 text-primary" />
            <h1 className="text-3xl text-foreground">Schedule Dashboard</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Lookup, review, and sign scheduled transactions on the Hedera network
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
          {/* Search Section */}
          <div className="lg:col-span-1">
            <ScheduleInfoInput
              onFetchSchedule={handleFetchSchedule}
              loading={loading}
              error={error}
            />
          </div>

          {/* Loading State */}
          {loading && (
            <div className="lg:col-span-1 xl:col-span-2">
              <Card className="shadow-lg border-border/40 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-muted-foreground">Loading schedule info...</span>
                  </div>
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="lg:col-span-1 xl:col-span-2">
              <Alert variant="destructive" className="shadow-lg">
                <Info className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          )}

          {/* Schedule Details Section */}
          {scheduleInfo && !loading && (
            <div className="lg:col-span-1 xl:col-span-1">
              <ScheduleDetails scheduleInfo={scheduleInfo} />
            </div>
          )}

          {/* Schedule Sign Section */}
          {scheduleInfo && scheduleId && !loading && (
            <div className="lg:col-span-1 xl:col-span-1">
              <ScheduleSign
                scheduleId={scheduleId}
                projectId={scheduleInfo.projectId}
                investorWalletAddress={scheduleInfo.investorWalletAddress}
                sharesApproved={scheduleInfo.sharesApproved}
              />
            </div>
          )}
        </div>

        {/* Empty State */}
        {!scheduleInfo && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-24 h-24 bg-muted/50 rounded-full flex items-center justify-center mb-4">
              <CalendarClock className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg text-muted-foreground mb-2">No Schedule Selected</h3>
            <p className="text-muted-foreground max-w-md">
              Enter a schedule ID above to view details and manage signatures
            </p>
          </div>
        )}
      </div>
    </div>
  );
}