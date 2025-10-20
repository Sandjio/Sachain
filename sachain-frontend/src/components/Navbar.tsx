import { useState } from 'react';
import { Search, Menu, X, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/router';
import GetStartedModal from '@/features/auth/components/GetStartedModal';
import LanguageSwitcher from './LanguageSwitcher';
import Image from 'next/image';
import imgLogo from 'figma:asset/db4c8157713a03bff5c1f0b2b5a717810998a690.png';
import { Button } from './ui/button';

interface NavbarProps {
  showBackButton?: boolean;
  onBack?: () => void;
}

export function Navbar({ showBackButton = false, onBack }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showGetStarted, setShowGetStarted] = useState(false);
  const router = useRouter();

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border border-primary/20 shadow-lg rounded-xl mx-4 lg:mx-8 mt-4 lg:mt-8">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Left side: Back button (optional) and logo */}
            <div className="flex items-center space-x-4">
              {showBackButton && onBack && (
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onBack}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Home
                  </Button>
                  <div className="h-6 w-px bg-gray-300" />
                </div>
              )}

              <div
                className="flex-shrink-0 cursor-pointer"
                onClick={() => router.push('/')}
                aria-label="Sachain homepage"
              >
                <Image
                  src="/images/logo.png"
                  alt="Sachain - African Blockchain Crowdfunding Platform"
                  width={100}
                  height={40}
                  className="lg:h-10"
                />
              </div>
            </div>
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-8">
              {[
                { href: '#about', label: 'About' },
                { href: '#how-it-works', label: 'How it Works' },
                { href: '#projects', label: 'Projects' },
                { href: '#investors', label: 'Investors' },
              ].map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  className="text-sm font-medium text-foreground hover:text-primary transition-colors duration-200 px-3 py-2 rounded-md hover:bg-brand-light focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  {label}
                </a>
              ))}
            </nav>

            {/* Search Bar */}
            <div className="hidden md:block">
              <div className="relative w-40 lg:w-48">
                <input
                  type="text"
                  placeholder="Search"
                  className="w-full h-8 bg-muted border border-primary/20 rounded-md px-4 pr-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                  aria-label="Search projects"
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            {/* Auth Buttons - Desktop */}
            <div className="hidden lg:flex items-center space-x-3">
              <button
                onClick={() => router.push('/auth/login')}
                className="bg-transparent border border-primary rounded-md px-4 py-2 text-sm font-medium text-foreground hover:bg-primary hover:text-primary-foreground transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                Login
              </button>
              <button
                onClick={() => setShowGetStarted(true)}
                className="bg-chart-1 rounded-md px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-secondary/90 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
              >
                Register
              </button>
            </div>

            {/* Language Toggle */}
            <div className="hidden lg:block">
              <LanguageSwitcher />
            </div>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 rounded-md text-foreground hover:text-primary hover:bg-brand-light transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="lg:hidden border-t border-primary/20 pt-4 pb-6 space-y-4">
              {/* Mobile Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search"
                  className="w-full h-10 bg-muted border border-primary/20 rounded-md px-4 pr-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  aria-label="Search projects"
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>

              {/* Mobile Navigation */}
              <nav className="space-y-2">
                {[
                  { href: '#about', label: 'About' },
                  { href: '#how-it-works', label: 'How it Works' },
                  { href: '#projects', label: 'Projects' },
                  { href: '#investors', label: 'Investors' },
                ].map(({ href, label }) => (
                  <a
                    key={href}
                    href={href}
                    className="block text-base font-medium text-foreground hover:text-primary transition-colors duration-200 px-3 py-2 rounded-md hover:bg-brand-light"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {label}
                  </a>
                ))}
              </nav>

              {/* Mobile Auth Buttons */}
              <div className="space-y-3 pt-4 border-t border-primary/20">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    router.push('/auth/login');
                  }}
                  className="w-full bg-transparent border border-primary rounded-md px-4 py-3 text-base font-medium text-foreground hover:bg-primary hover:text-primary-foreground transition-colors duration-200"
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setShowGetStarted(true);
                  }}
                  className="w-full bg-secondary rounded-md px-4 py-3 text-base font-medium text-primary-foreground hover:bg-secondary/90 transition-colors duration-200"
                >
                  Register
                </button>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    /* Insert language toggle logic if needed */
                  }}
                  className="w-full bg-foreground rounded-md px-4 py-3 text-base font-medium text-background hover:bg-foreground/90 transition-colors duration-200"
                  aria-label="Switch language"
                >
                  Switch to French (FR)
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <GetStartedModal open={showGetStarted} onOpenChange={setShowGetStarted} />
    </>
  );
}
