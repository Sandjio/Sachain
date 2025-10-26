// import { useState } from 'react';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import ConnectWalletDialog from '@/features/wallet/components/ConnectWalletDialog';
// import {
//   Search,
//   Bell,
//   Mail,
//   Settings,
//   Menu,
//   Sun,
//   Moon,
//   Wallet,
// } from 'lucide-react';
// import { useAuthStore } from '@/store/authStore';
// import { useWalletStore } from '@/features/wallet/store/walletStore';

// interface HeaderProps {
//   onMobileMenuToggle?: () => void;
// }

// export function Header({ onMobileMenuToggle }: HeaderProps) {
//   const [isDark, setIsDark] = useState(false);
//   const user = useAuthStore((state) => state.user);

//   const toggleTheme = () => setIsDark(!isDark);

//   const walletAddress = useWalletStore((state) => state.walletAddress);
//   const isConnected = useWalletStore((state) => state.isConnected);
//   const disconnectWallet = useWalletStore((state) => state.disconnectWallet);

//   const userName = user
//     ? `${user.givenName || ''} ${user.familyName || ''}`.trim()
//     : 'Guest';

//   const userInitials =
//     user?.givenName?.[0]?.toUpperCase() ||
//     user?.email?.[0]?.toUpperCase() ||
//     'U';

//   const userRole = user?.role ?? ''; // empty if undefined

//   const [walletModalOpen, setWalletModalOpen] = useState(false);

//   return (
//     <>
//       <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
//         <div className="flex items-center justify-between">
//           {/* Left side - Mobile menu + Search */}
//           <div className="flex items-center gap-4 flex-1">
//             {/* Mobile Menu Button */}
//             <Button
//               variant="ghost"
//               size="sm"
//               onClick={onMobileMenuToggle}
//               className="lg:hidden text-gray-500 hover:text-gray-700"
//             >
//               <Menu className="h-5 w-5" />
//             </Button>

//             {/* Search */}
//             <div className="relative max-w-md flex-1">
//               <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
//               <Input
//                 placeholder="Rechercher..."
//                 className="pl-10 bg-gray-50 border-gray-200 focus:border-[#90A5FB] focus:ring-[#90A5FB]"
//               />
//             </div>
//           </div>

//           {/* Right side - Actions + User */}
//           <div className="flex items-center gap-2 sm:gap-4">
//             {/* Wallet Button Area */}
//             {isConnected && walletAddress ? (
//               <div className="flex items-center gap-2 m-1">
//                 <span className="font-mono text-sm text-gray-200 bg-[#123962] px-2 py-1 rounded">
//                   {walletAddress}
//                 </span>
//                 <Button
//                   className="bg-red-600 hover:bg-red-700 text-white"
//                   size="sm"
//                   onClick={disconnectWallet}
//                 >
//                   Disconnect
//                 </Button>
//               </div>
//             ) : (
//               <Button
//                 className="bg-[#123962] hover:bg-[#0f2f52] text-white flex items-center gap-2 m-1"
//                 size="sm"
//                 onClick={() => setWalletModalOpen(true)}
//               >
//                 <Wallet className="h-4 w-4" />
//                 <span className="hidden sm:inline">Connect Wallet</span>
//               </Button>
//             )}

//             {/* Theme Toggle */}
//             <Button
//               variant="ghost"
//               size="sm"
//               onClick={toggleTheme}
//               className="text-gray-500 hover:text-gray-700 hidden sm:flex"
//             >
//               {isDark ? (
//                 <Sun className="h-4 w-4" />
//               ) : (
//                 <Moon className="h-4 w-4" />
//               )}
//             </Button>

//             {/* Notifications */}
//             <Button
//               variant="ghost"
//               size="sm"
//               className="text-gray-500 hover:text-gray-700 relative"
//             >
//               <Bell className="h-4 w-4" />
//               <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
//             </Button>

//             {/* Messages */}
//             <Button
//               variant="ghost"
//               size="sm"
//               className="text-gray-500 hover:text-gray-700 hidden sm:flex"
//             >
//               <Mail className="h-4 w-4" />
//             </Button>

//             {/* Settings */}
//             <Button
//               variant="ghost"
//               size="sm"
//               className="text-gray-500 hover:text-gray-700 hidden sm:flex"
//             >
//               <Settings className="h-4 w-4" />
//             </Button>

//             {/* User Profile */}
//             <div className="flex items-center gap-3 pl-2 border-l border-gray-200">
//               <div className="w-8 h-8 bg-[#90A5FB] rounded-full flex items-center justify-center">
//                 <span className="text-white text-sm font-semibold">
//                   {userInitials}
//                 </span>
//               </div>
//               <div className="hidden md:block">
//                 <p className="text-sm font-medium text-gray-900">{userName}</p>
//                 {userRole && (
//                   <p className="text-xs text-gray-500 capitalize">{userRole}</p>
//                 )}
//               </div>
//             </div>
//           </div>
//         </div>
//       </header>
//       <ConnectWalletDialog
//         open={walletModalOpen}
//         onOpenChange={setWalletModalOpen}
//       />
//     </>
//   );
// }

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
  Copy,
  Check,
  LogOut,
  Plus,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useWalletStore } from '@/features/wallet/store/walletStore';
import { RechargeDialog } from '@/features/recharge/component/RechargeDialog';

interface HeaderProps {
  onMobileMenuToggle?: () => void;
}

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const [isDark, setIsDark] = useState(false);
  const [copied, setCopied] = useState(false);
  const user = useAuthStore((state) => state.user);
  const [rechargeModalOpen, setRechargeModalOpen] = useState(false);

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

  const handleCopyWallet = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const truncateAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Left side - Mobile menu + Search */}
            <div className="flex items-center gap-4 flex-1 max-w-2xl">
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onMobileMenuToggle}
                className="lg:hidden text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
              >
                <Menu className="h-5 w-5" />
              </Button>

              {/* Enhanced Search */}
              <div className="relative flex-1 group">
                <Search className="h-4 w-4 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-[#123962] transition-colors" />
                <Input
                  placeholder="Search projects, investors..."
                  className="pl-11 pr-4 py-2.5 bg-gradient-to-br from-gray-50 to-white border-gray-200 rounded-xl focus:border-[#90A5FB] focus:ring-2 focus:ring-[#90A5FB]/20 transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Right side - Actions + Wallet + User */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Wallet Button Area */}
              {isConnected && walletAddress ? (
                <div className="flex items-center gap-2">
                  {/* Connected Wallet Display */}
                  <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-xl shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                      <span className="font-mono text-sm text-gray-700">
                        {truncateAddress(walletAddress)}
                      </span>
                    </div>
                    <button
                      onClick={handleCopyWallet}
                      className="p-1.5 hover:bg-emerald-100 rounded-lg transition-colors"
                      title="Copy wallet address"
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-gray-500" />
                      )}
                    </button>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRechargeModalOpen(true)}
                    className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-0 shadow-md hover:shadow-lg rounded-xl transition-all duration-300 hover:scale-105"
                    title="Recharge wallet via Orange Money"
                  >
                    <div className="flex items-center gap-2">
                      {/* Orange Money Logo - Two Arrows */}
                      <div className="w-6 h-6 bg-foreground rounded-full flex items-center justify-center flex-shrink-0 p-1">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          className="w-full h-full"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          {/* Circular arrows representing Orange Money transfer/recharge */}
                          <path
                            d="M12 4V2L9 5l3 3V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8z"
                            fill="#FF6600"
                          />
                          <path
                            d="M12 18c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v2l3-3-3-3v2z"
                            fill="#FF6600"
                          />
                        </svg>
                      </div>
                      <span className="hidden sm:inline font-medium">
                        OM Recharge
                      </span>
                     
                    </div>
                  </Button>

                  {/* Disconnect Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={disconnectWallet}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all"
                    title="Disconnect wallet"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden lg:inline ml-2">Disconnect</span>
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setWalletModalOpen(true)}
                  className="bg-gradient-to-r from-[#123962] to-[#90A5FB] hover:from-[#0d2640] hover:to-[#7088e8] text-white shadow-lg shadow-[#90A5FB]/30 hover:shadow-xl hover:shadow-[#90A5FB]/40 rounded-xl transition-all duration-300 px-4 py-2"
                >
                  <Wallet className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">Connect Wallet</span>
                </Button>
              )}

              {/* Divider */}
              <div className="hidden sm:block w-px h-8 bg-gray-200"></div>

              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="hidden sm:flex text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all p-2"
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>

              {/* Notifications with badge */}
              <Button
                variant="ghost"
                size="sm"
                className="relative text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all p-2"
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white animate-pulse"></span>
              </Button>

              {/* Messages */}
              <Button
                variant="ghost"
                size="sm"
                className="hidden md:flex text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all p-2"
                title="Messages"
              >
                <Mail className="h-4 w-4" />
              </Button>

              {/* Settings */}
              <Button
                variant="ghost"
                size="sm"
                className="hidden lg:flex text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all p-2"
                title="Settings"
              >
                <Settings className="h-4 w-4" />
              </Button>

              {/* User Profile - Enhanced */}
              <div className="flex items-center gap-3 pl-3 sm:pl-4 ml-2 sm:ml-3 border-l border-gray-200">
                <div className="relative group cursor-pointer">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#123962] to-[#90A5FB] rounded-full flex items-center justify-center shadow-lg shadow-[#90A5FB]/20 transition-all duration-300 group-hover:shadow-xl group-hover:shadow-[#90A5FB]/40 group-hover:scale-105">
                    <span className="text-white font-semibold">
                      {userInitials}
                    </span>
                  </div>
                  {/* Online indicator */}
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-sm"></div>
                </div>

                <div className="hidden md:block">
                  <p className="text-sm font-semibold text-gray-900">
                    {userName}
                  </p>
                  {userRole && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-1.5 h-1.5 bg-[#90A5FB] rounded-full"></div>
                      <p className="text-xs text-gray-500 capitalize">
                        {userRole}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Wallet Display - Shows when connected on mobile */}
        {isConnected && walletAddress && (
          <div className="sm:hidden px-4 pb-3">
            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-xl shadow-sm">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse flex-shrink-0"></div>
                <span className="font-mono text-xs text-gray-700 truncate">
                  {walletAddress}
                </span>
              </div>
              <button
                onClick={handleCopyWallet}
                className="p-1.5 hover:bg-emerald-100 rounded-lg transition-colors flex-shrink-0"
                title="Copy wallet address"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-gray-500" />
                )}
              </button>
            </div>
          </div>
        )}
      </header>
      <ConnectWalletDialog
        open={walletModalOpen}
        onOpenChange={setWalletModalOpen}
      />
      <RechargeDialog
        open={rechargeModalOpen}
        onOpenChange={setRechargeModalOpen}
      />{' '}
      {/* NEW DIALOG */}
    </>
  );
}
