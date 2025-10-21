import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslate } from '@/hooks/useTranslate';
import { useRouter } from 'next/router';
import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Users, Building2, TrendingUp, Shield } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface GetStartedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GetStartedModal({
  open,
  onOpenChange,
}: GetStartedModalProps) {
  const translate = useTranslate('getStartedModal');
  const router = useRouter();
  const setRole = useAuthStore((state) => state.setRole);

  const handleChooseRole = (role: 'startup' | 'investor') => {
  setRole(role);
  onOpenChange(false); // close modal
  router.push({
    pathname: '/auth/signup',
    query: { role, tab: 'signup' },
  });
};


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            Join Sachain
          </DialogTitle>
          <CardDescription className="text-center">
            Choose your role to get started
          </CardDescription>
        </DialogHeader>
        <div className="space-y-4 p-6">
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/20"
            onClick={() => handleChooseRole('investor')}
          >
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle className="text-2xl text-primary">Investor</CardTitle>
              <CardDescription>
                Discover and invest in promising African startups
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <Shield className="w-6 h-6 text-primary" />
                  <span className="text-sm">Secure HBAR investments</span>
                </li>
                <li className="flex items-center gap-2">
                  <Users className="w-6 h-6 text-primary" />
                  <span className="text-sm">
                    Diverse portfolio opportunities
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/20"
            onClick={() => handleChooseRole('startup')}
          >
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-3">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-2xl text-primary">Entrepreneur</CardTitle>
              <CardDescription>
                Raise capital for your innovative venture
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <Shield className="w-6 h-6 text-primary" />
                  <span className="text-sm">Hashgraph-powered funding</span>
                </li>
                <li className="flex items-center gap-2">
                  <Users className="w-6 h-6 text-primary" />
                  <span className="text-sm">African investor network</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}



