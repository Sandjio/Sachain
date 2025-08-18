// src/components/CTASection.tsx
import { useTranslate } from "@/hooks/useTranslate";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/router";

export default function CTASection() {
  const translate = useTranslate("cta");
  const router = useRouter();

  const roles = [
    { key: "startup", label: translate("roles.startup"), path: "/signup?role=startup" },
    { key: "investor", label: translate("roles.investor"), path: "/signup?role=investor" },
  ];

  return (
    <section className="container-max md:py-10 text-center">
      <h2 className="text-4xl font-bold mb-4">{translate("title")}</h2>
      <p className="text-lg text-secondary mb-8">{translate("subtitle")}</p>
      <div className="flex flex-col sm:flex-row justify-center gap-6">
        {roles.map((role) => (
          <Button
            key={role.key}
            onClick={() => router.push(role.path)}
            className="px-8 py-4 text-lg"
          >
            {role.label}
          </Button>
        ))}
      </div>
    </section>
  );
}
