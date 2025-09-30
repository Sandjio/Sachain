
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, User, Clock, Users, FileText, Info } from 'lucide-react';

interface ScheduleDetailsProps {
  scheduleInfo: any; 
}

function renderId(idObj: any) {
  if (!idObj || typeof idObj !== 'object') return 'N/A';
  if ('shard' in idObj && 'realm' in idObj && 'num' in idObj) {
    return `${idObj.shard}.${idObj.realm}.${idObj.num}`;
  }
  
  if (typeof idObj.toString === 'function') return idObj.toString();
  return 'N/A';
}

export default function ScheduleDetails({ scheduleInfo }: ScheduleDetailsProps) {
  if (!scheduleInfo) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Info className="h-5 w-5" />
            <p>No schedule data available.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const {
    scheduleId,
    creatorAccountId,
    expirationTime,
    signatories,
    executionTime,
    scheduledTransactionBody,
  } = scheduleInfo;

  // Format date nicely
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp || !timestamp.seconds) return 'N/A';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleString();
  };

  const getTransactionSummary = () => {
    if (!scheduledTransactionBody) return 'N/A';

    if (scheduledTransactionBody.tokenTransfer) {
      return scheduledTransactionBody.tokenTransfer.transfers
        .map((transfer: any) =>
          `Account ${renderId(transfer.accountID)} → Amount: ${transfer.amount}`
        )
        .join(', ');
    }

    if (scheduledTransactionBody.cryptoTransfer?.transfers) {
      return scheduledTransactionBody.cryptoTransfer.transfers
        .map((transfer: any) =>
          `Account ${renderId(transfer.accountID)} → Amount: ${transfer.amount}`
        )
        .join(', ');
    }

    if (
      scheduledTransactionBody.cryptoTransfer?.tokenTransfers &&
      scheduledTransactionBody.cryptoTransfer.tokenTransfers[0]?.nftTransfers
    ) {
      return scheduledTransactionBody.cryptoTransfer.tokenTransfers[0].nftTransfers
        .map((nft: any) =>
          `NFT #${nft.serialNumber.low} from ${renderId(nft.senderAccountID)} to ${renderId(nft.receiverAccountID)}`
        )
        .join('; ');
    }

    return 'Unknown transaction type';
  };

  const InfoRow = ({ icon: Icon, label, value, valueClassName = "" }: { 
    icon: any, 
    label: string, 
    value: string, 
    valueClassName?: string 
  }) => (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
          <span className="text-muted-foreground min-w-fit">{label}:</span>
          <span className={`break-all ${valueClassName}`}>{value}</span>
        </div>
      </div>
    </div>
  );

  return (
    <Card className="w-full max-w-2xl shadow-lg border-border/40 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Schedule Details
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <InfoRow 
            icon={FileText} 
            label="Schedule ID" 
            value={renderId(scheduleId)}
            valueClassName="font-mono text-primary"
          />
          
          <InfoRow 
            icon={User} 
            label="Creator Account" 
            value={renderId(creatorAccountId)}
            valueClassName="font-mono"
          />
        </div>

        <Separator />

        <div className="space-y-1">
          <InfoRow 
            icon={Calendar} 
            label="Expiration Time" 
            value={formatTimestamp(expirationTime)}
          />
          
          <InfoRow 
            icon={Clock} 
            label="Execution Time" 
            value={formatTimestamp(executionTime) || 'Not found'}
          />
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-start gap-3 py-2">
            <Users className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex flex-col gap-2">
                <span className="text-muted-foreground">Signatories:</span>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(signatories) && signatories.length > 0 ? (
                    signatories.map((signatory, index) => (
                      <Badge key={index} variant="secondary" className="font-mono">
                        {signatory}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline">None yet</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 py-2">
            <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex flex-col gap-2">
                <span className="text-muted-foreground">Transaction Summary:</span>
                <div className="p-3 bg-muted/50 rounded-md border">
                  <p className="break-all">{getTransactionSummary()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}