import React, { useState } from 'react';
import {
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Shield,
  Eye,
  EyeOff,
  Lock,
  FileText,
  DollarSign,
  Coins,
  AlertTriangle,
  Info,
  Sparkles,
  ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import { LazyImage } from '../LazyImage';

interface Step3Props {
  calculation: {
    finalTotal: number;
    tokensDesired: number;
    pricePerToken: number;
  } | null;
  project: {
    name: string;
    category: string;
    stockSupply: number;
    pricePerStock: number;
    coverImageUrl?: string;
    description: string;
  };
  onNext: (privateKey: string) => void;
  onBack: () => void;
  formatCurrency: (amount: number) => string;
}

export default function Step3Payment({
  calculation,
  project,
  onNext,
  onBack,
  formatCurrency,
}: Step3Props) {
  const [infoConfirmed, setInfoConfirmed] = useState(false);
  const [privateKey, setPrivateKey] = useState('');
  const [privateKeyError, setPrivateKeyError] = useState<string | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  if (!calculation) return null;

  const handleProceedClick = () => {
    if (!privateKey.trim()) {
      setPrivateKeyError('Private key is required to proceed.');
      return;
    }
    setPrivateKeyError(null);
    onNext(privateKey.trim());
  };

  const handleCheckboxChange = (checked: boolean) => {
    setInfoConfirmed(checked);
    if (!checked) {
      setPrivateKey('');
      setPrivateKeyError(null);
    }
  };

  return (
    <div className="space-y-6" aria-live="polite">
      {/* Header Section */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-[#123962] to-[#90A5FB] rounded-2xl flex items-center justify-center shadow-lg">
            <CheckCircle className="h-8 w-8 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold bg-gradient-to-r from-[#123962] via-[#90A5FB] to-[#123962] bg-clip-text text-transparent mb-2">
          Confirm Your Investment Details
        </h2>
        <p className="text-gray-600">
          Please review the information below before proceeding.
        </p>
      </div>

      {/* Project Information Card */}
      <Card className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <CardHeader className="border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#123962]/10 rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-[#123962]" />
            </div>
            <CardTitle className="font-semibold text-gray-900">
              Project Details
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Project Image and Name */}
          <div className="text-center space-y-4">
            {project?.coverImageUrl ? (
              <div className="flex justify-center">
                <div className="relative">
                  <LazyImage
                    src={project.coverImageUrl}
                    alt={project.name}
                    className="h-20 w-full object-cover rounded-xl shadow-lg"
                  />
                  <Badge className="absolute top-2 right-2 bg-gradient-to-r from-[#123962] to-[#90A5FB] text-white shadow-md">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Featured
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="h-40 w-40 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
                  <ImageIcon className="h-16 w-16 text-gray-400" />
                </div>
              </div>
            )}

            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                {project?.name}
              </h3>
              <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20">
                {project?.category}
              </Badge>
            </div>

            <p className="text-gray-600 leading-relaxed max-w-2xl mx-auto">
              {project?.description}
            </p>
          </div>

          {/* Investment Breakdown */}
          <div className="space-y-3 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
              <h4 className="font-semibold text-gray-900">
                Investment Breakdown
              </h4>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-100 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-500/10 rounded flex items-center justify-center">
                    <Coins className="h-3 w-3 text-blue-600" />
                  </div>
                  <span className="text-sm text-gray-700">
                    Number of Tokens
                  </span>
                </div>
                <span className="font-semibold text-gray-900">
                  {calculation.tokensDesired}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gradient-to-br from-purple-50/50 to-violet-50/30 border border-purple-100 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-purple-500/10 rounded flex items-center justify-center">
                    <DollarSign className="h-3 w-3 text-purple-600" />
                  </div>
                  <span className="text-sm text-gray-700">Price per Token</span>
                </div>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(calculation.pricePerToken)}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50/50 to-green-50/30 border-2 border-emerald-200 rounded-lg mt-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span className="font-semibold text-gray-900">
                    Total Amount to Pay
                  </span>
                </div>
                <span className="text-xl font-semibold text-emerald-600">
                  {formatCurrency(calculation.finalTotal)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Checkbox */}
      <Card className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-200 rounded-xl shadow-sm">
        <CardContent className="p-3">
          <label className="flex items-start gap-3 cursor-pointer group">
            <Checkbox
              checked={infoConfirmed}
              onCheckedChange={handleCheckboxChange}
              className="mt-0.5 data-[state=checked]:bg-[#123962] data-[state=checked]:border-[#123962]"
            />
            <div className="flex-1">
              <p className="text-sm text-gray-900 font-medium group-hover:text-[#123962] transition-colors">
                I have reviewed and confirm that the above information is
                correct.
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Please verify all details before proceeding with payment.
              </p>
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Private Key Input Section */}
      {infoConfirmed && (
        <Card className="bg-white border border-gray-200 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <CardHeader className="border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <Lock className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <CardTitle className="font-semibold text-gray-900">
                  Security Verification
                </CardTitle>
                <p className="text-xs text-gray-600 mt-1">
                  Enter your private key to authorize this transaction
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {/* Security Warning */}
            <div className="p-4 bg-gradient-to-br from-amber-50/50 to-orange-50/30 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Shield className="h-4 w-4 text-amber-600" />
                </div>
                <div className="space-y-1">
                  <h5 className="font-semibold text-gray-900 text-sm">
                    Security Notice
                  </h5>
                  <p className="text-xs text-gray-700">
                    Your private key is encrypted and never stored on our
                    servers.It&apos;s only used to sign this transaction
                    securely.
                  </p>
                </div>
              </div>
            </div>

            {/* Private Key Input */}
            <div className="space-y-2">
              <Label
                htmlFor="privateKeyInput"
                className="text-sm font-medium text-gray-900"
              >
                Private Key *
              </Label>
              <div className="relative">
                <Input
                  id="privateKeyInput"
                  type={showPrivateKey ? 'text' : 'password'}
                  value={privateKey}
                  onChange={(e) => {
                    setPrivateKey(e.target.value);
                    if (privateKeyError) setPrivateKeyError(null);
                  }}
                  placeholder="Enter your private key"
                  className="pr-12 border-gray-200 focus:border-[#90A5FB] focus:ring-[#90A5FB]/20"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  aria-label={
                    showPrivateKey ? 'Hide private key' : 'Show private key'
                  }
                >
                  {showPrivateKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {privateKeyError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg animate-in fade-in slide-in-from-top-2 duration-200">
                  <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-700">{privateKeyError}</p>
                </div>
              )}

              <div className="flex items-center gap-2 p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                <Info className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <p className="text-xs text-gray-600">
                  Make sure you&apos;re entering the correct private key for
                  your wallet
                </p>
              </div>
            </div>

            {/* Proceed Button */}
            <Button
              type="submit"
              onClick={handleProceedClick}
              disabled={!privateKey.trim()}
              className="w-full bg-gradient-to-r from-[#123962] to-[#90A5FB] hover:from-[#123962]/90 hover:to-[#90A5FB]/90 text-white shadow-lg hover:shadow-xl transition-all duration-300 h-12"
            >
              <Lock className="h-4 w-4 mr-2" />
              Authorize & Complete Payment
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Back Button */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1 border-gray-200 hover:border-[#90A5FB] hover:bg-[#90A5FB]/5"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Balances
        </Button>
      </div>
    </div>
  );
}
