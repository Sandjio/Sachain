// import { Button } from "./ui/button";
// import { Input } from "./ui/input";
// import { Twitter, Linkedin, Github, Mail, Phone, MapPin } from "lucide-react";

// export function Footer() {
//   return (
//     <footer className="bg-gray-900 text-white">
//       {/* Main Footer */}
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
//           {/* Company Info */}
//           <div className="lg:col-span-1">
//             <div className="flex items-center space-x-2 mb-6">
//               <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
//                 <span className="text-white font-bold">S</span>
//               </div>
//               <span className="text-xl font-bold">sachain</span>
//             </div>
//             <p className="text-gray-400 mb-6 leading-relaxed">
//               Empowering African innovation through blockchain-powered crowdfunding.
//               Connecting entrepreneurs with global investors via Hedera network.
//             </p>
//             <div className="flex space-x-4">
//               <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-purple-600 transition-colors">
//                 <Twitter className="w-5 h-5" />
//               </a>
//               <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-purple-600 transition-colors">
//                 <Linkedin className="w-5 h-5" />
//               </a>
//               <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-purple-600 transition-colors">
//                 <Github className="w-5 h-5" />
//               </a>
//             </div>
//           </div>

//           {/* Platform */}
//           <div>
//             <h3 className="font-semibold mb-6">Platform</h3>
//             <ul className="space-y-4">
//               <li><a href="#" className="text-gray-400 hover:text-white transition-colors">How it Works</a></li>
//               <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Browse Projects</a></li>
//               <li><a href="#" className="text-gray-400 hover:text-white transition-colors">For Investors</a></li>
//               <li><a href="#" className="text-gray-400 hover:text-white transition-colors">For Startups</a></li>
//               <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Success Stories</a></li>
//             </ul>
//           </div>

//           {/* Resources */}
//           <div>
//             <h3 className="font-semibold mb-6">Resources</h3>
//             <ul className="space-y-4">
//               <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Documentation</a></li>
//               <li><a href="#" className="text-gray-400 hover:text-white transition-colors">API Reference</a></li>
//               <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Hedera Network</a></li>
//               <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Security</a></li>
//               <li><a href="#" className="text-gray-400 hover:text-white transition-colors">FAQ</a></li>
//             </ul>
//           </div>

//           {/* Newsletter */}
//           <div>
//             <h3 className="font-semibold mb-6">Stay Updated</h3>
//             <p className="text-gray-400 mb-4">
//               Get the latest updates on new projects and platform features.
//             </p>
//             <div className="space-y-3">
//               <Input
//                 type="email"
//                 placeholder="Enter your email"
//                 className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-purple-500"
//               />
//               <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
//                 Subscribe
//               </Button>
//             </div>
//           </div>
//         </div>

//         {/* Contact Info */}
//         <div className="mt-12 pt-8 border-t border-gray-800">
//           <div className="grid md:grid-cols-3 gap-6">
//             <div className="flex items-center space-x-3">
//               <Mail className="w-5 h-5 text-purple-400" />
//               <span className="text-gray-400">contact@sachain.africa</span>
//             </div>
//             <div className="flex items-center space-x-3">
//               <Phone className="w-5 h-5 text-purple-400" />
//               <span className="text-gray-400">+237 620 36 13 40</span>
//             </div>
//             <div className="flex items-center space-x-3">
//               <MapPin className="w-5 h-5 text-purple-400" />
//               <span className="text-gray-400">Douala, Cameroon</span>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Bottom Footer */}
//       <div className="border-t border-gray-800">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
//           <div className="flex flex-col md:flex-row justify-between items-center">
//             <div className="text-gray-400 text-sm mb-4 md:mb-0">
//               © 2025 sachain. All rights reserved. Built for a new era of Funding with Hedera.
//             </div>
//             <div className="flex space-x-6 text-sm">
//               <a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a>
//               <a href="#" className="text-gray-400 hover:text-white transition-colors">Terms of Service</a>
//               <a href="#" className="text-gray-400 hover:text-white transition-colors">Cookie Policy</a>
//             </div>
//           </div>
//         </div>
//       </div>
//     </footer>
//   );
// }

import { Section } from './ui/section';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import {
  Phone,
  Mail,
  MapPin,
  ArrowUp,
  Linkedin,
  Facebook,
  Twitter,
} from 'lucide-react';
import svgPaths from '@/utils/svg-tzs4efenma';
import Image from 'next/image';
import imgPngHackathonHederaAfrica2025SachainOdc2374 from '../../public/images/logo.png';

export function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-brand-surface/40 border-t border-border">
      <Section size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-12">
          {/* Logo and Description */}
          <div className="lg:col-span-1 space-y-6">
            <Image
              src="/images/logo.png"
              alt="Sachain - African Blockchain Crowdfunding Platform"
              width={140}
              height={60}
              className="lg:h-10"
            />
            <p className="text-muted-foreground leading-relaxed">
              Empowering African innovation through blockchain-powered
              crowdfunding. Connecting entrepreneurs with global investors via
              Hedera network.
            </p>
          </div>

          {/* Platform Links */}
          <div className="space-y-4">
            <h3 className="font-bold text-primary">Platform</h3>
            <nav className="space-y-3">
              <a
                href="#how-it-works"
                className="block text-muted-foreground hover:text-primary transition-colors"
              >
                How it works
              </a>
              <a
                href="#projects"
                className="block text-muted-foreground hover:text-primary transition-colors"
              >
                Browse projects
              </a>
              <a
                href="#investors"
                className="block text-muted-foreground hover:text-primary transition-colors"
              >
                For investors
              </a>
              <a
                href="#startups"
                className="block text-muted-foreground hover:text-primary transition-colors"
              >
                For startups
              </a>
              <a
                href="#success"
                className="block text-muted-foreground hover:text-primary transition-colors"
              >
                Success stories
              </a>
            </nav>
          </div>

          {/* Resources Links */}
          <div className="space-y-4">
            <h3 className="font-bold text-primary">Resources</h3>
            <nav className="space-y-3">
              <a
                href="#docs"
                className="block text-muted-foreground hover:text-primary transition-colors"
              >
                Documentation
              </a>
              <a
                href="#api"
                className="block text-muted-foreground hover:text-primary transition-colors"
              >
                API reference
              </a>
              <a
                href="#hedera"
                className="block text-muted-foreground hover:text-primary transition-colors"
              >
                Hedera network
              </a>
              <a
                href="#security"
                className="block text-muted-foreground hover:text-primary transition-colors"
              >
                Security
              </a>
              <a
                href="#faq"
                className="block text-muted-foreground hover:text-primary transition-colors"
              >
                FAQ
              </a>
            </nav>
          </div>

          {/* Newsletter */}
          <div className="space-y-4">
            <h3 className="font-bold text-primary">Stay Updated</h3>
            <p className="text-sm text-muted-foreground">
              Get the latest updates on new projects and platform features.
            </p>

            <div className="space-y-3">
              <Input
                type="email"
                placeholder="Enter your email"
                className="bg-background/50 border-border"
              />
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                Subscribe
              </Button>
            </div>
          </div>
        </div>

        <Separator className="mb-8" />

        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div className="flex items-center gap-4">
            <Phone className="w-6 h-6 text-primary flex-shrink-0" />
            <div className="text-sm">
              <p className="text-foreground">(+237) 699 999 999</p>
              <p className="text-foreground">699 999 999</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Mail className="w-6 h-6 text-primary flex-shrink-0" />
            <div className="text-sm">
              <p className="text-foreground">contact@sachain.com</p>
              <p className="text-foreground">infos@sachain.com</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <MapPin className="w-6 h-6 text-secondary flex-shrink-0" />
            <div className="text-sm">
              <p className="text-foreground">Cameroun, Douala</p>
              <p className="text-foreground">Akwa, Soudanaise</p>
            </div>
          </div>
        </div>

        <Separator className="mb-6" />

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-sm text-muted-foreground">
            © 2025 Sachain. All rights reserved.
          </p>

          {/* Social Media Icons */}
          <div className="flex items-center gap-3">
            <button
              className="w-8 h-8 bg-primary rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors"
              aria-label="LinkedIn"
            >
              <Linkedin className="w-4 h-4 text-primary-foreground" />
            </button>
            <button
              className="w-8 h-8 bg-primary rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors"
              aria-label="Facebook"
            >
              <Facebook className="w-4 h-4 text-primary-foreground" />
            </button>
            <button
              className="w-8 h-8 bg-primary rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors"
              aria-label="Twitter"
            >
              <Twitter className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>

          {/* Legal Links */}
          <div className="flex items-center gap-4 text-sm">
            <a
              href="#privacy"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Privacy policy
            </a>
            <Separator orientation="vertical" className="h-4" />
            <a
              href="#terms"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Terms of service
            </a>
          </div>
        </div>
      </Section>

      {/* Back to Top Button */}
      <Button
        onClick={scrollToTop}
        size="icon"
        className="fixed bottom-6 right-6 bg-primary/50 hover:bg-primary/70 backdrop-blur-sm rounded-full shadow-lg z-50"
        aria-label="Back to top"
      >
        <ArrowUp className="w-4 h-4" />
      </Button>
    </footer>
  );
}
