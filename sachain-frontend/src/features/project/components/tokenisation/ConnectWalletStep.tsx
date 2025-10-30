import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ConnectWalletDialog from '@/features/wallet/components/ConnectWalletDialog';
import { useWalletStore } from '@/features/wallet/store/walletStore';
import {
  Wallet,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Shield,
  Zap,
  Link as LinkIcon,
} from 'lucide-react';

interface ConnectWalletStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function ConnectWalletStep({ onNext, onBack }: ConnectWalletStepProps) {
  const walletAddress = useWalletStore((state) => state.walletAddress);
  const isConnected = useWalletStore((state) => state.isConnected);
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  const onWalletConfirmed = () => {
    setWalletModalOpen(false);
    onNext();
  };

  return (
    <div className="space-y-6">
      {!isConnected ? (
        <>
          {/* Wallet Connection Card */}
          <Card className="border-0 shadow-lg bg-white overflow-hidden">
            <div className="bg-gradient-to-r from-[#123962] to-[#90A5FB] p-6 text-white">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Wallet className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-xl">Connect Your Wallet</h3>
                  <p className="text-sm text-white/90 mt-1">
                    Secure your project on the Hedera network
                  </p>
                </div>
              </div>
            </div>

            <CardContent className="p-6 space-y-6">
              {/* Info Section */}
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed text-justify">
                  To proceed with tokenizing your project, you need to connect
                  your wallet. This ensures secure transactions on the Hedera
                  network.
                </p>

                {/* Benefits */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex items-start gap-3 p-3 bg-gradient-to-br from-[#90A5FB]/5 to-transparent rounded-lg border border-[#90A5FB]/10">
                    <div className="p-2 bg-[#90A5FB]/10 rounded-lg flex-shrink-0">
                      <Shield className="h-4 w-4 text-[#123962]" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-900">
                        Secure
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-gradient-to-br from-[#90A5FB]/5 to-transparent rounded-lg border border-[#90A5FB]/10">
                    <div className="p-2 bg-[#90A5FB]/10 rounded-lg flex-shrink-0">
                      <Zap className="h-4 w-4 text-[#123962]" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-900">
                        Fast
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-gradient-to-br from-[#90A5FB]/5 to-transparent rounded-lg border border-[#90A5FB]/10">
                    <div className="p-2 bg-[#90A5FB]/10 rounded-lg flex-shrink-0">
                      <LinkIcon className="h-4 w-4 text-[#123962]" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-900">
                        Easy
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Connect Button */}
              <div className="pt-2">
                <Button
                  onClick={() => setWalletModalOpen(true)}
                  className="w-full bg-gradient-to-r from-[#123962] to-[#90A5FB] hover:from-[#0d2640] hover:to-[#7088e8] text-white shadow-lg shadow-[#90A5FB]/30"
                  size="lg"
                >
                  <Wallet className="h-5 w-5 mr-2" />
                  Connect / Create Wallet
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </div>

              {/* Note */}
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-5 h-5 bg-blue-500/10 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-blue-900 font-medium">
                      First time here?
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Don't worry! You can create a new wallet in just a few
                      clicks. No prior experience needed.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Back Button */}
          <div className="flex justify-start">
            <Button
              variant="outline"
              onClick={onBack}
              className="border-gray-200 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <>
          {/* Connected State Card */}
          <Card className="border-0 shadow-lg bg-white overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-green-500 p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-xl">Wallet Connected</h3>
                  <p className="text-sm text-white/90 mt-1">
                    You're ready to proceed
                  </p>
                </div>
              </div>
            </div>

            <CardContent className="p-6 space-y-6">
              {/* Connected Wallet Info */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-gradient-to-br from-emerald-50 to-transparent border border-emerald-100 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">
                      Connected Wallet
                    </p>
                    <p className="font-mono text-sm font-medium text-gray-900 break-all">
                      {walletAddress}
                    </p>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 ml-3 flex-shrink-0">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                </div>

                {/* Network Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-600">Network</p>
                    <p className="font-medium text-gray-900 mt-1">
                      Hedera Testnet
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-600">Status</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      <p className="font-medium text-gray-900">Connected</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Continue Button */}
              <div className="pt-2">
                <Button
                  onClick={onNext}
                  className="w-full bg-gradient-to-r from-[#123962] to-[#90A5FB] hover:from-[#0d2640] hover:to-[#7088e8] text-white shadow-lg shadow-[#90A5FB]/30"
                  size="lg"
                >
                  Continue to Minting
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Back Button */}
          <div className="flex justify-start">
            <Button
              variant="outline"
              onClick={onBack}
              className="border-gray-200 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </>
      )}

      {/* Wallet Dialog */}
      <ConnectWalletDialog
        open={walletModalOpen}
        onOpenChange={setWalletModalOpen}
        onWalletConfirmed={onWalletConfirmed}
      />
    </div>
  );
}
