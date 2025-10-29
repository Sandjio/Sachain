// src/components/PlatformBenefits.tsx
import { useTranslate } from '@/hooks/useTranslate';
import { Card, CardContent } from '@/components/ui/card';
import { Zap, ShieldCheck, Wallet } from 'lucide-react';

export default function PlatformBenefits() {
  const translate = useTranslate('benefits');

  const items = [
    {
      icon: <Wallet className="w-10 h-10 text-primary" />,
      title: translate('items.lowFees.title'),
      description: translate('items.lowFees.description'),
    },
    {
      icon: <ShieldCheck className="w-10 h-10 text-primary" />,
      title: translate('items.transparency.title'),
      description: translate('items.transparency.description'),
    },
    {
      icon: <Zap className="w-10 h-10 text-primary" />,
      title: translate('items.speed.title'),
      description: translate('items.speed.description'),
    },
  ];

  return (
    <section className="container-max py-20 md:py-28 text-center">
      <h2 className="text-4xl font-bold mb-12">{translate('title')}</h2>
      <div className="grid gap-8 md:grid-cols-3">
        {items.map((item, i) => (
          <Card
            key={i}
            className="shadow-lg border rounded-2xl hover:shadow-xl transition"
          >
            <CardContent className="flex flex-col items-center p-8">
              {item.icon}
              <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-secondary text-sm max-w-sm">
                {item.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
