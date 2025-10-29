import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ApprovalTimeoutProps {
  waitingTime: number;
  calculation: { finalTotal: number } | null;
  formatCurrency: (amount: number) => string;
  onTryAgain: () => void;
  onClose: () => void;
  formatWaitingTime: (seconds: number) => string;
}

export default function ApprovalTimeout({
  waitingTime,
  calculation,
  formatCurrency,
  onTryAgain,
  onClose,
  formatWaitingTime,
}: ApprovalTimeoutProps) {
  return (
    <div className="text-center space-y-6">
      <AlertTriangle className="mx-auto h-16 w-16 text-orange-600" />
      <h3 className="text-xl font-semibold text-orange-600">
        Waiting for Approval
      </h3>
      <p>
        Your investment request is still pending approval. This might take some
        time.
      </p>

      <Card>
        <CardContent>
          <div className="flex justify-between">
            <span>Status:</span>
            <Badge variant="outline" className="text-orange-600">
              Pending Approval
            </Badge>
          </div>
          <div className="flex justify-between">
            <span>Waiting time:</span>
            <span>{formatWaitingTime(waitingTime)}</span>
          </div>
          <div className="flex justify-between">
            <span>Amount:</span>
            <span>
              {calculation ? formatCurrency(calculation.finalTotal) : 'N/A'}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onTryAgain} className="flex-1">
          Continue Waiting
        </Button>
        <Button onClick={onClose} className="flex-1">
          Close & Check Later
        </Button>
      </div>
    </div>
  );
}
