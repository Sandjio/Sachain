import React from "react";
import { 
  CheckCircle,
  Clipboard, 
  Download, 
  Shield, 
  Wallet,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  Sparkles
} from "lucide-react"; 
import { Button } from "@/components/ui/button"; 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { downloadWalletDetails } from "@/utils/downloadWalletDetails";

interface SuccessStateProps {
  walletName: string;
  walletDetails: {
    accountId: string;
    balance: string;
    publicKey?: string;
    privateKey?: string;
  };
  onContinue: () => void;
  showCreatedWalletDetails?: boolean;
}

export default function SuccessState({
  walletName,
  walletDetails,
  onContinue,
  showCreatedWalletDetails = false,
}: SuccessStateProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (
    showCreatedWalletDetails &&
    walletDetails.publicKey &&
    walletDetails.privateKey
  ) {
    // Concise view for newly created wallets
    return (
      <div className="space-y-6">
        {/* Success header */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
          </div>
          <h3 className="text-2xl font-semibold bg-gradient-to-r from-[#123962] via-[#90A5FB] to-[#123962] bg-clip-text text-transparent mb-2">
            Wallet Created Successfully!
          </h3>
          <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
            <DollarSign className="h-3 w-3 mr-1" />
            {walletDetails.balance} HBAR Funded
          </Badge>
        </div>

        {/* Essential Details Card */}
        <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <CardHeader className="border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#123962]/10 rounded-lg flex items-center justify-center">
                <Wallet className="h-5 w-5 text-[#123962]" />
              </div>
              <CardTitle className="font-semibold text-gray-900">
                Wallet Credentials
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {/* Account ID */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Account ID</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-100 rounded-lg text-sm font-mono text-gray-900">
                  {walletDetails.accountId}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0 hover:bg-blue-50 hover:text-blue-600"
                  onClick={() => copyToClipboard(walletDetails.accountId)}
                  aria-label="Copy Account ID"
                >
                  <Clipboard className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Private Key */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-red-700">Private Key</label>
                <Badge className="bg-red-500/10 text-red-700 border-red-500/20 text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  Keep Secret
                </Badge>
              </div>
              <div className="flex items-start gap-2">
                <textarea
                  readOnly
                  className="flex-1 p-3 bg-gradient-to-br from-red-50/50 to-orange-50/30 border border-red-200 rounded-lg font-mono text-xs resize-none text-gray-900 leading-relaxed focus:outline-none"
                  rows={2}
                  value={walletDetails.privateKey}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0 hover:bg-red-50 hover:text-red-600"
                  onClick={() => copyToClipboard(walletDetails.privateKey || "")}
                  aria-label="Copy Private Key"
                >
                  <Clipboard className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Warning - Concise */}
        <Card className="bg-gradient-to-br from-amber-50/50 to-orange-50/30 border border-amber-200 rounded-xl shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-gray-900 text-sm mb-1">Security Notice</h5>
                <p className="text-xs text-gray-700 leading-relaxed">
                  Your private key is the <strong>only way</strong> to access your wallet. 
                  Download and store it securely. Never share it with anyone.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="border-gray-200 hover:border-[#90A5FB] hover:bg-[#90A5FB]/5"
            onClick={() => downloadWalletDetails(walletDetails)}
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button 
            className="bg-gradient-to-r from-[#123962] to-[#90A5FB] hover:from-[#123962]/90 hover:to-[#90A5FB]/90 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            onClick={onContinue}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // Standard success view for regular wallet connections
  return (
    <div className="space-y-6">
      {/* Success header */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
            <CheckCircle className="h-8 w-8 text-white" />
          </div>
        </div>
        <h3 className="text-2xl font-semibold bg-gradient-to-r from-[#123962] via-[#90A5FB] to-[#123962] bg-clip-text text-transparent mb-2">
          Successfully Connected!
        </h3>
        <p className="text-gray-600">
          <span className="font-semibold text-[#123962]">{walletName}</span> wallet is now connected
        </p>
      </div>

      {/* Wallet Info Card */}
      <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <CardContent className="p-6 space-y-3">
          {/* Account ID */}
          <div className="p-4 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-100 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-600 mb-1">Account ID</p>
                <code className="text-sm font-mono font-semibold text-gray-900 break-all">
                  {walletDetails.accountId}
                </code>
              </div>
            </div>
          </div>

          {/* Balance */}
          <div className="p-4 bg-gradient-to-br from-emerald-50/50 to-green-50/30 border border-emerald-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-600 mb-1">Balance</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-semibold text-emerald-600">
                    {walletDetails.balance}
                  </span>
                  <span className="text-sm text-gray-600">HBAR</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Continue Button */}
      <Button 
        className="w-full bg-gradient-to-r from-[#123962] to-[#90A5FB] hover:from-[#123962]/90 hover:to-[#90A5FB]/90 text-white shadow-lg hover:shadow-xl transition-all duration-300 h-12"
        onClick={onContinue}
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Continue
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}
