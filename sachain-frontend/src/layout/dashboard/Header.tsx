import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ConnectWalletDialog from '@/features/wallet/components/ConnectWalletDialog';
import {
  Search,
  Bell,
  Mail,
  Settings,
  Menu,
  Sun,
  Moon,
  Wallet,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useWalletStore } from '@/features/wallet/store/walletStore';

interface HeaderProps {
  onMobileMenuToggle?: () => void;
}

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const [isDark, setIsDark] = useState(false);
  const user = useAuthStore((state) => state.user);

  const toggleTheme = () => setIsDark(!isDark);

  const walletAddress = useWalletStore((state) => state.walletAddress);
  const isConnected = useWalletStore((state) => state.isConnected);
  const disconnectWallet = useWalletStore((state) => state.disconnectWallet);

  const userName = user
    ? `${user.givenName || ''} ${user.familyName || ''}`.trim()
    : 'Guest';

  const userInitials =
    user?.givenName?.[0]?.toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    'U';

  const userRole = user?.role ?? ''; // empty if undefined

  const [walletModalOpen, setWalletModalOpen] = useState(false);

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Mobile menu + Search */}
          <div className="flex items-center gap-4 flex-1">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onMobileMenuToggle}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Search */}
            <div className="relative max-w-md flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Rechercher..."
                className="pl-10 bg-gray-50 border-gray-200 focus:border-[#90A5FB] focus:ring-[#90A5FB]"
              />
            </div>
          </div>

          {/* Right side - Actions + User */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Wallet Button Area */}
            {isConnected && walletAddress ? (
              <div className="flex items-center gap-2 m-1">
                <span className="font-mono text-sm text-gray-200 bg-[#123962] px-2 py-1 rounded">
                  {walletAddress}
                </span>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  size="sm"
                  onClick={disconnectWallet}
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button
                className="bg-[#123962] hover:bg-[#0f2f52] text-white flex items-center gap-2 m-1"
                size="sm"
                onClick={() => setWalletModalOpen(true)}
              >
                <Wallet className="h-4 w-4" />
                <span className="hidden sm:inline">Connect Wallet</span>
              </Button>
            )}

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="text-gray-500 hover:text-gray-700 hidden sm:flex"
            >
              {isDark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            {/* Notifications */}
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-700 relative"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </Button>

            {/* Messages */}
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-700 hidden sm:flex"
            >
              <Mail className="h-4 w-4" />
            </Button>

            {/* Settings */}
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-700 hidden sm:flex"
            >
              <Settings className="h-4 w-4" />
            </Button>

            {/* User Profile */}
            <div className="flex items-center gap-3 pl-2 border-l border-gray-200">
              <div className="w-8 h-8 bg-[#90A5FB] rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-semibold">
                  {userInitials}
                </span>
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-900">{userName}</p>
                {userRole && (
                  <p className="text-xs text-gray-500 capitalize">{userRole}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
      <ConnectWalletDialog
        open={walletModalOpen}
        onOpenChange={setWalletModalOpen}
      />
    </>
  );
}
