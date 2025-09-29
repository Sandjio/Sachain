import React from 'react';
import { Clock, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface WaitingApprovalProps {
  waitingTime: number;
  calculation: { tokensDesired: number; finalTotal: number } | null;
  formatCurrency: (amount: number) => string;
  formatWaitingTime: (seconds: number) => string;
  onClose: () => void;
  isConnected: boolean;
  notificationError: string | null;
}

export default function WaitingApproval({
  waitingTime,
  calculation,
  formatCurrency,
  formatWaitingTime,
  onClose,
  isConnected,
  notificationError,
}: WaitingApprovalProps) {
  return (
    <div className="text-center space-y-6">
      <Clock className="mx-auto h-16 w-16 text-blue-600 animate-spin" />
      <h3 className="text-xl font-semibold text-blue-600">Awaiting Startup Approval</h3>
      <p>Your investment request has been submitted. Waiting for approval.</p>

      {calculation && (
        <Card>
          <CardContent>
            <div className="flex justify-between">
              <span>Status:</span>
              <Badge variant="outline" className="text-blue-600">Pending</Badge>
            </div>
            <div className="flex justify-between">
              <span>Tokens requested:</span>
              <span>{calculation.tokensDesired}</span>
            </div>
            <div className="flex justify-between">
              <span>Total amount:</span>
              <span className="font-bold">{formatCurrency(calculation.finalTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Waiting time:</span>
              <span className="text-blue-600">{formatWaitingTime(waitingTime)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-center gap-2 text-sm">
        {isConnected ? (
          <>
            <Wifi className="h-4 w-4 text-green-600" />
            <span className="text-green-600">Connected to notification service</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 text-red-600" />
            <span className="text-red-600">
              {notificationError || 'Disconnected from notification service'}
            </span>
          </>
        )}
      </div>

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-blue-700 text-sm">
          The startup will review and approve your investment. You will be notified automatically.
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onClose} className="flex-1">Close & Wait</Button>
        <Button disabled className="flex-1 bg-[#123962] text-white">Complete (Waiting...)</Button>
      </div>
    </div>
  );
}
