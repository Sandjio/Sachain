import { Button } from "@/components/ui/button";
import { useTranslate } from "@/hooks/useTranslate";

interface Step4SuccessProps {
  role: "startup" | "investor";
  onClose: () => void;
}

export default function Step4Success({ role, onClose }: Step4SuccessProps) {
  const translate = useTranslate("getStartedModal");

  return (
    <div className="flex flex-col items-center gap-4 text-center p-4">
      <h2 className="text-2xl font-bold">{translate("success.title")}</h2>
      <p>{translate("success.message", { role })}</p>
      <Button onClick={onClose} className="mt-4">
        {translate("actions.close")}
      </Button>
    </div>
  );
}
