
import { useTranslate } from "@/hooks/useTranslate";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import GetStartedModal from "@/features/auth/components/GetStartedModal";

export default function CTASection() {
  const translate = useTranslate("cta");
  const [open, setOpen] = useState(false);

  return (
    <section className="container-max md:py-10 text-center">
      {/* One single CTA */}
      <Button
        onClick={() => setOpen(true)}
        className="px-8 py-4 text-lg"
      >
        {translate("getStarted")}
      </Button>

      {/* Modal with role selection */}
      <GetStartedModal open={open} onOpenChange={setOpen} />
    </section>
  );
}
