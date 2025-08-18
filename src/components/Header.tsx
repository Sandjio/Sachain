import Link from "next/link";
import LanguageSwitcher from "./LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { useTranslate } from "@/hooks/useTranslate";

export default function Header() {
  const translate = useTranslate();

  return (
    <header className="border-b bg-background">
      <div className="container-max flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="text-primary font-bold text-xl tracking-tight">
          SACHAIN
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-4">
          <LanguageSwitcher />

          <Link href="/login">
            <Button variant="outline" className="text-sm">
              {translate('header.login')}
            </Button>
          </Link>

          <Link href="/signup">
            <Button className="text-sm bg-accent hover:bg-accent/90 text-accent-foreground">
              {translate('header.signup')}
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
