import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Step5Props {
  project: { name: string };
  calculation: { tokensDesired: number; finalTotal: number } | null;
  onClose: () => void;
  onSuccess?: () => void;
  formatCurrency: (amount: number) => string;
}

export default function Step5Success({
  project,
  calculation,
  onClose,
  onSuccess,
  formatCurrency,
}: Step5Props) {
  const [notificationReceived, setNotificationReceived] = useState(false);
  const [waitingTime, setWaitingTime] = useState(0);

  useEffect(() => {
    const approveTimeout = setTimeout(
      () => setNotificationReceived(true),
      60000
    ); // 60 seconds
    const timer = setInterval(() => setWaitingTime((t) => t + 1), 1000);
    return () => {
      clearTimeout(approveTimeout);
      clearInterval(timer);
    };
  }, []);

  const formatWaitingTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFinish = () => {
    onSuccess?.();
    onClose();
  };

  if (notificationReceived) {
    return (
      <div className="text-center space-y-6">
        <CheckCircle className="mx-auto h-16 w-16 text-green-600" />
        <h3 className="text-xl font-semibold text-green-600">
          Investment Approved!
        </h3>
        <p>Your investment has been approved and tokens transferred.</p>

        {calculation && (
          <Card>
            <CardContent>
              <div className="flex justify-between">
                <span>Tokens purchased:</span>
                <span className="font-bold text-green-600">
                  {calculation.tokensDesired}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total invested:</span>
                <span className="font-bold">
                  {formatCurrency(calculation.finalTotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Project:</span>
                <span>{project.name}</span>
              </div>
            </CardContent>
          </Card>
        )}

        <Button
          onClick={handleFinish}
          className="w-full bg-[#123962] hover:bg-[#90A5FB] text-white"
        >
          View Portfolio
        </Button>
      </div>
    );
  }

  // While waiting for "approval"
  return (
    <div className="text-center space-y-6">
      <Clock className="mx-auto h-16 w-16 text-blue-600 animate-spin" />
      <h3 className="text-xl font-semibold text-blue-600">
        Awaiting Startup Approval
      </h3>
      <p>Your investment request has been submitted. Waiting for approval.</p>

      {calculation && (
        <Card>
          <CardContent>
            <div className="flex justify-between">
              <span>Status:</span>
              <Badge variant="outline" className="text-blue-600">
                Pending
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Tokens requested:</span>
              <span>{calculation.tokensDesired}</span>
            </div>
            <div className="flex justify-between">
              <span>Total amount:</span>
              <span className="font-bold">
                {formatCurrency(calculation.finalTotal)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Waiting time:</span>
              <span className="text-blue-600">
                {formatWaitingTime(waitingTime)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-blue-700 text-sm">
          The startup will review and approve your investment. You will be
          notified automatically.
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Close & Wait
        </Button>
        <Button disabled className="flex-1 bg-[#123962] text-white">
          Waiting...
        </Button>
      </div>
    </div>
  );
}
