// src/components/UserSections.tsx
import { useTranslate } from "@/hooks/useTranslate";
import { Card, CardContent } from "@/components/ui/card";
import { Rocket, Coins } from "lucide-react";

export default function UserSections() {
  const translate = useTranslate("users");

  const sections = [
    {
      icon: <Rocket className="w-12 h-12 text-primary" />,
      title: translate("startups.title"),
      description: translate("startups.description"),
    },
    {
      icon: <Coins className="w-12 h-12 text-primary" />,
      title: translate("investors.title"),
      description: translate("investors.description"),
    },
  ];

  return (
    <section className="container-max py-10 md:py-18 text-center">
      <h2 className="text-4xl font-bold mb-12">{translate("title")}</h2>
      <div className="grid gap-8 md:grid-cols-2">
        {sections.map((section, i) => (
          <Card
            key={i}
            className="shadow-lg border rounded-2xl hover:shadow-xl transition"
          >
            <CardContent className="flex flex-col items-center p-8">
              {section.icon}
              <h3 className="mt-4 text-xl font-semibold">{section.title}</h3>
              <p className="mt-2 text-secondary text-sm max-w-md">
                {section.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
