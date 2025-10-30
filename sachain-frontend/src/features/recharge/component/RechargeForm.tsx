import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRecharge } from '../hook/useRecharge';
import {
  Smartphone,
  DollarSign,
  Coins,
  Info,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Zap,
  Loader2,
  Phone,
  Clock,
  CheckCheck,
} from 'lucide-react';

const MINT_FEE_HBAR = 5.0;

interface RechargeFormProps {
  walletAddress: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
}

export function RechargeForm({
  walletAddress,
  onSuccess = () => {},
  onError = () => {},
}: RechargeFormProps) {
  const {
    register,
    handleSubmit,
    onSubmit,
    errors,
    isSubmitting,
    error,
    response,
    hbarEquivalent,
    netHbar,
    isPaymentSuccessful,
  } = useRecharge(walletAddress, () => {
    onSuccess();
  });

  React.useEffect(() => {
    if (error) {
      onError(error);
    }
  }, [error, onError]);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-200 to-primary rounded-2xl flex items-center justify-center shadow-lg">
            <Smartphone className="h-8 w-8 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold bg-gradient-to-r from-[#123962] via-[#90A5FB] to-[#123962] bg-clip-text text-transparent mb-2">
          Recharge with Orange Money
        </h2>
        <p className="text-sm text-gray-600">
          Convert FCFA to HBAR instantly on Hedera network
        </p>
      </div>

      {/* Success Notification */}
      {isPaymentSuccessful && (
        <Card className="bg-gradient-to-br from-emerald-50/50 to-green-50/30 border-2 border-emerald-300 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2 duration-500">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg text-emerald-900">
                  Payment Request Sent!
                </CardTitle>
                <p className="text-xs text-emerald-700 mt-0.5">
                  {response?.result?.data?.inittxnmessage}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {/* Step 1: Check Phone */}
            <div className="flex items-start gap-3 p-3 bg-white/70 rounded-lg border border-emerald-200">
              <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Phone className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h5 className="text-sm font-semibold text-gray-900 mb-0.5">
                  Check Your Phone
                </h5>
                <p className="text-xs text-gray-700">
                  Open the Orange Money prompt on your device
                </p>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-xs">
                Step 1
              </Badge>
            </div>

            {/* Step 2: Enter PIN */}
            <div className="flex items-start gap-3 p-3 bg-white/70 rounded-lg border border-emerald-200">
              <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCheck className="h-4 w-4 text-amber-600" />
              </div>
              <div className="flex-1">
                <h5 className="text-sm font-semibold text-gray-900 mb-0.5">
                  Enter Your PIN
                </h5>
                <p className="text-xs text-gray-700">
                  Confirm the payment with your Orange Money PIN
                </p>
              </div>
              <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20 text-xs">
                Step 2
              </Badge>
            </div>

            {/* Processing Notice */}
            <div className="flex items-center gap-2 justify-center p-2 bg-blue-50/50 rounded-lg border border-blue-100">
              <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
              <p className="text-xs text-blue-700 font-medium">
                Proceeding to next step in 3 seconds...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Form Card */}
      <Card className="bg-white border border-gray-200 hover:border-[#90A5FB]/50 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Phone Number Input */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center">
                  <Smartphone className="h-4 w-4 text-orange-600" />
                </div>
                Orange Money Phone Number
              </Label>
              <div className="relative">
                <Input
                  type="tel"
                  {...register('customerNumber')}
                  placeholder="e.g., 695456849"
                  disabled={isSubmitting || isPaymentSuccessful}
                  className="w-full border-gray-200 focus:border-orange-400 focus:ring-orange-400/20 pl-10 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-600">
                  <Smartphone className="h-4 w-4" />
                </div>
              </div>
              {errors.customerNumber && (
                <div className="flex items-center gap-2 text-xs text-red-600 mt-2">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>{errors.customerNumber.message}</span>
                </div>
              )}
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 bg-[#90A5FB]/10 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-[#90A5FB]" />
                </div>
                Amount (FCFA)
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  {...register('amount')}
                  placeholder="e.g., 10000"
                  disabled={isSubmitting || isPaymentSuccessful}
                  className="w-full border-gray-200 focus:border-[#90A5FB] focus:ring-[#90A5FB]/20 pl-10 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#90A5FB] font-semibold">
                  <span className="text-sm">F</span>
                </div>
              </div>
              {errors.amount && (
                <div className="flex items-center gap-2 text-xs text-red-600 mt-2">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>{errors.amount.message}</span>
                </div>
              )}
            </div>

            {/* Conversion Summary */}
            <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-100 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-[#123962]/10 rounded-lg flex items-center justify-center">
                  <Info className="h-4 w-4 text-[#123962]" />
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  Conversion Summary
                </span>
              </div>

              <div className="space-y-2.5">
                {/* Equivalent HBAR */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 flex items-center gap-2">
                    <Coins className="h-4 w-4 text-[#90A5FB]" />
                    Equivalent HBAR
                  </span>
                  <Badge className="bg-[#123962]/10 text-[#123962] border-[#123962]/20 font-mono">
                    {hbarEquivalent.toFixed(6)} ℏ
                  </Badge>
                </div>

                {/* Mint Fee */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    Mint Fee (Deducted)
                  </span>
                  <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20 font-mono">
                    -{MINT_FEE_HBAR.toFixed(6)} ℏ
                  </Badge>
                </div>

                {/* Net HBAR Separator */}
                <div className="border-t border-blue-200 pt-2.5 mt-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Net HBAR Credited
                    </span>
                    <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white border-0 font-mono px-3 py-1">
                      {netHbar.toFixed(6)} ℏ
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={isSubmitting || isPaymentSuccessful}
                className="w-full bg-gradient-to-r from-primary-500 to-primary hover:to-primary text-white transition-all duration-300 shadow-lg hover:shadow-xl group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Processing Payment...
                  </>
                ) : isPaymentSuccessful ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Payment Initiated Successfully
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                    Initiate Recharge
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
              {!isPaymentSuccessful && (
                <p className="text-xs text-gray-500 text-center mt-3">
                  You will receive a prompt on your phone to complete the
                  transaction
                </p>
              )}
            </div>

            {/* Error Alert */}
            {error && (
              <Card className="bg-gradient-to-br from-primary-50/50 to-rose-50/30 border border-red-200 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h5 className="font-semibold text-red-900 text-sm mb-1">
                        Payment Failed
                      </h5>
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Info Card */}

      {/* Security Notice */}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
        <span>Secured by Hedera Hashgraph • Instant Settlement</span>
      </div>
    </div>
  );
}
