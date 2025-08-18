// src/components/HowItWorks.tsx
import { useTranslate } from "@/hooks/useTranslate";
import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb, Wallet, TrendingUp } from "lucide-react";

export default function HowItWorks() {
  const translate = useTranslate("howItWorks");

  const steps = [
    {
      icon: <Lightbulb className="w-10 h-10 text-primary" />,
      title: translate("steps.discover.title"),
      description: translate("steps.discover.description"),
    },
    {
      icon: <Wallet className="w-10 h-10 text-primary" />,
      title: translate("steps.invest.title"),
      description: translate("steps.invest.description"),
    },
    {
      icon: <TrendingUp className="w-10 h-10 text-primary" />,
      title: translate("steps.grow.title"),
      description: translate("steps.grow.description"),
    },
  ];

  return (
    <section className="container-max py-10 md:py-18 text-center">
      <h2 className="text-4xl font-bold mb-12">{translate("title")}</h2>
      <div className="grid gap-8 md:grid-cols-3">
        {steps.map((step, i) => (
          <Card key={i} className="shadow-lg border rounded-2xl">
            <CardContent className="flex flex-col items-center p-6">
              {step.icon}
              <h3 className="mt-4 text-xl font-semibold">{step.title}</h3>
              <p className="mt-2 text-secondary text-sm">{step.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
