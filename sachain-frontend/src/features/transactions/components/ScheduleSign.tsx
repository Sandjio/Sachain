
import React, { useState } from 'react';
import { useScheduleSign } from '../hook/useScheduleSign';
import { useHcsPublish } from '../hook/useHcsPublish';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PenTool, Loader2, Shield, Key, CheckCircle, AlertCircle } from 'lucide-react';

interface ScheduleSignProps {
  scheduleId: string;
  projectId: string;
  investorWalletAddress: string;
  sharesApproved: number;
}

export default function ScheduleSign({
  scheduleId,
  projectId,
  investorWalletAddress,
  sharesApproved,
}: ScheduleSignProps) {
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const {
    loading: signingLoading,
    error: signingError,
    successMessage,
    signSchedule,
  } = useScheduleSign(scheduleId);
  const {
    publishMessage,
    loading: publishLoading,
    error: publishError,
    success: publishSuccess,
  } = useHcsPublish();

  const handleSignClick = async () => {
    const signed = await signSchedule(privateKeyInput);
    if (signed) {
      
      const messagePayload = JSON.stringify({
        type: 'purchase_approved',
        projectId,
        investorWalletAddress,
        sharesApproved,
        timestamp: new Date().toISOString(),
      });

      await publishMessage(messagePayload);
      setPrivateKeyInput('');
    }
  };

  const isLoading = signingLoading || publishLoading;

  return (
    <Card className="w-full max-w-lg shadow-lg border-border/40 backdrop-blur-sm">
      <CardHeader className="space-y-3">
        <CardTitle className="flex items-center gap-2">
          <PenTool className="h-5 w-5 text-primary" />
          Sign Schedule Transaction
        </CardTitle>
        
        {/* Schedule ID Display */}
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md border">
          <Shield className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
            <span className="text-muted-foreground">Schedule ID:</span>
            <Badge variant="secondary" className="font-mono break-all">
              {scheduleId}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Private Key Input */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Private Key</span>
          </div>
          <Input
            type="password"
            placeholder="Enter your private key"
            value={privateKeyInput}
            onChange={(e) => setPrivateKeyInput(e.target.value)}
            className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
            autoComplete="off"
            disabled={isLoading}
          />
        </div>

        <Separator />

        {/* Sign Button */}
        <Button
          onClick={handleSignClick}
          disabled={isLoading || !privateKeyInput.trim()}
          className="w-full transition-all duration-200 hover:shadow-md"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <PenTool className="mr-2 h-4 w-4" />
              Sign Schedule
            </>
          )}
        </Button>

        {/* Error Messages */}
        {signingError && (
          <Alert variant="destructive" className="animate-in fade-in duration-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Signing Error:</strong> {signingError}
            </AlertDescription>
          </Alert>
        )}

        {publishError && (
          <Alert variant="destructive" className="animate-in fade-in duration-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Notification Error:</strong> {publishError}
            </AlertDescription>
          </Alert>
        )}

        {/* Success Messages */}
        {successMessage && (
          <Alert className="animate-in fade-in duration-200 border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        {publishSuccess && (
          <Alert className="animate-in fade-in duration-200 border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Approval notification sent successfully!
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}