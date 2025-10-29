import React, { useState } from 'react';
import ScheduleInfoInput from '../components/ScheduleInput';
import ScheduleDetails from '../components/ScheduleDetails';
import ScheduleSign from '../components/ScheduleSign';
import { useScheduleInfo } from '../hook/useScheduleInfo';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  CalendarClock,
  Loader2,
  Info,
  Search,
  FileCheck,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export default function ScheduleDashboard() {
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const { scheduleInfo, loading, error, fetchScheduleInfo } = useScheduleInfo();

  const handleFetchSchedule = async (id: string) => {
    setScheduleId(null);
    await fetchScheduleInfo(id);
    setScheduleId(id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        {/* Light Header with Brand Colors */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-[#90A5FB] to-[#123962] shadow-lg">
              <CalendarClock className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl sm:text-3xl font-semibold bg-gradient-to-r from-[#123962] via-[#90A5FB] to-[#123962] bg-clip-text text-transparent">
              Schedule Dashboard
            </h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600 ml-14">
            Lookup, review, and sign scheduled transactions on Hedera
          </p>

          {scheduleInfo && !loading && (
            <div className="mt-4 ml-14">
              <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 px-3 py-1">
                <FileCheck className="h-3.5 w-3.5 mr-1.5" />
                Schedule Loaded
              </Badge>
            </div>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Search Input (Sticky) */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">
              <Card className="bg-white border border-gray-200 hover:border-[#90A5FB]/50 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-[#123962]/10 rounded-lg flex items-center justify-center">
                      <Search className="h-5 w-5 text-[#123962]" />
                    </div>
                    <h3 className="font-semibold text-gray-900">
                      Lookup Schedule
                    </h3>
                  </div>
                  <ScheduleInfoInput
                    onFetchSchedule={handleFetchSchedule}
                    loading={loading}
                    error={error}
                  />
                </CardContent>
              </Card>

              {/* Status Info Card */}
              {!loading && !error && !scheduleInfo && (
                <Card className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-100 rounded-xl shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-[#123962]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Info className="h-4 w-4 text-[#123962]" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="text-sm font-semibold text-gray-900">
                          How to use
                        </div>
                        <div className="text-xs text-gray-600 leading-relaxed">
                          Enter a schedule ID above to view transaction details
                          and manage signatures on the Hedera network.
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Right Columns - Details and Sign */}
          <div className="lg:col-span-2 space-y-6">
            {/* Loading State */}
            {loading && (
              <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="relative w-6 h-6">
                      <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-transparent border-t-[#90A5FB] border-r-[#123962] rounded-full animate-spin"></div>
                    </div>
                    <span className="font-semibold text-gray-900">
                      Loading schedule information...
                    </span>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-3/4 bg-gradient-to-r from-gray-100 to-gray-50 rounded-lg" />
                      <Skeleton className="h-4 w-1/2 bg-gradient-to-r from-gray-100 to-gray-50 rounded-lg" />
                    </div>
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-2/3 bg-gradient-to-r from-gray-100 to-gray-50 rounded-lg" />
                      <Skeleton className="h-4 w-3/4 bg-gradient-to-r from-gray-100 to-gray-50 rounded-lg" />
                    </div>
                    <Skeleton className="h-24 w-full bg-gradient-to-r from-gray-100 to-gray-50 rounded-xl" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error State */}
            {error && !loading && (
              <Alert
                variant="destructive"
                className="rounded-xl border-red-200 shadow-sm"
              >
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="ml-2">{error}</AlertDescription>
              </Alert>
            )}

            {/* Schedule Details */}
            {scheduleInfo && !loading && (
              <div className="space-y-6">
                <Card className="bg-white border border-gray-200 hover:border-[#90A5FB]/50 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#90A5FB]/10 to-[#123962]/10 rounded-lg flex items-center justify-center">
                        <FileCheck className="h-5 w-5 text-[#123962]" />
                      </div>
                      <h3 className="font-semibold text-gray-900">
                        Schedule Details
                      </h3>
                    </div>
                    <ScheduleDetails scheduleInfo={scheduleInfo} />
                  </CardContent>
                </Card>

                {/* Schedule Sign Section */}
                {scheduleId && (
                  <Card className="bg-white border border-gray-200 hover:border-emerald-300 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                        <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                          <Sparkles className="h-5 w-5 text-emerald-600" />
                        </div>
                        <h3 className="font-semibold text-gray-900">
                          Sign Transaction
                        </h3>
                      </div>
                      <ScheduleSign
                        scheduleId={scheduleId}
                        projectId={scheduleInfo.projectId}
                        investorWalletAddress={
                          scheduleInfo.investorWalletAddress
                        }
                        sharesApproved={scheduleInfo.sharesApproved}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Empty State */}
            {!scheduleInfo && !loading && !error && (
              <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
                <CardContent className="p-12">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-[#90A5FB]/10 to-[#123962]/10 rounded-2xl flex items-center justify-center mb-6">
                      <CalendarClock className="h-10 w-10 text-[#123962]" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">
                      No Schedule Selected
                    </h3>
                    <p className="text-gray-600 max-w-md mb-6 leading-relaxed">
                      Enter a schedule ID in the lookup panel to view
                      transaction details, review information, and manage
                      signatures.
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-2.5 rounded-lg border border-blue-100">
                      <Info className="h-4 w-4 text-[#123962]" />
                      <span>Hedera network transactions</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Bottom Info Banner */}
        {scheduleInfo && !loading && (
          <div className="mt-8 p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#123962]/10 rounded-lg flex items-center justify-center">
                  <Info className="h-6 w-6 text-[#123962]" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900 mb-1">
                    Active Schedule Session
                  </div>
                  <div className="text-xs text-gray-600">
                    Schedule ID:{' '}
                    <span className="font-mono font-medium text-[#123962]">
                      {scheduleId}
                    </span>{' '}
                    • All changes are recorded on Hedera blockchain
                  </div>
                </div>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 px-4 py-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse" />
                Connected
              </Badge>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
