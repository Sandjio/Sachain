// src/components/Footer.tsx
import { useTranslate } from "@/hooks/useTranslate";
import Link from "next/link";

export default function Footer() {
  const translate = useTranslate("footer");

  return (
    <footer className="border-t bg-background py-6 mt-20">
      <div className="container-max flex flex-col sm:flex-row justify-between items-center gap-4 px-4">
        <span className="text-sm text-secondary">{translate("copyright")}</span>
        <div className="flex gap-4">
          <Link href="/privacy" className="text-sm text-primary hover:underline">
            {translate("links.privacy")}
          </Link>
          <Link href="/terms" className="text-sm text-primary hover:underline">
            {translate("links.terms")}
          </Link>
          <Link href="/contact" className="text-sm text-primary hover:underline">
            {translate("links.contact")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
