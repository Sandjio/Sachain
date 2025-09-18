// import { Button } from "./ui/button";
// import { ArrowRight, Play, TrendingUp, Users, Shield } from "lucide-react";
// import { ImageWithFallback } from "@/components/figma/ImageWithFallback";

// export function HeroSection() {
//   return (
//     <section className="relative bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 overflow-hidden">
//       {/* Background Pattern */}
//       <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>

//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
//         <div className="grid lg:grid-cols-2 gap-12 items-center">
//           {/* Left Content */}
//           <div className="lg:pr-8">
//             <div className="inline-flex items-center px-4 py-2 bg-purple-100 rounded-full mb-6">
//               <Shield className="w-4 h-4 text-purple-600 mr-2" />
//               <span className="text-purple-600 text-sm font-medium">Powered by Hedera Network</span>
//             </div>

//             <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
//               Powering Africa&apos;s
//               <span className="block bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
//                 Innovation Future
//               </span>
//             </h1>

//             <p className="text-xl text-gray-600 mb-8 leading-relaxed">
//               Connect African entrepreneurs with global investors through blockchain-powered crowdfunding.
//               Secure, transparent, and built on the Hedera network with HBAR transactions.
//             </p>

//             <div className="flex flex-col sm:flex-row gap-4 mb-12">
//               <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-lg px-8 py-4">
//                 Start Investing
//                 <ArrowRight className="ml-2 w-5 h-5" />
//               </Button>
//               <Button size="lg" variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50 text-lg px-8 py-4">
//                 <Play className="mr-2 w-5 h-5" />
//                 Watch Demo
//               </Button>
//             </div>

//             {/* Stats */}
//             <div className="grid grid-cols-3 gap-8">
//               <div className="text-center">
//                 <div className="text-3xl font-bold text-gray-900 mb-1">54</div>
//                 <div className="text-gray-600">African Countries</div>
//               </div>
//               <div className="text-center">
//                 <div className="text-3xl font-bold text-gray-900 mb-1">500K+</div>
//                 <div className="text-gray-600">Startups Ready</div>
//               </div>
//               <div className="text-center">
//                 <div className="text-3xl font-bold text-gray-900 mb-1">200M+</div>
//                 <div className="text-gray-600">Diaspora Network</div>
//               </div>
//             </div>
//           </div>

//           {/* Right Content */}
//           <div className="relative">
//             <div className="relative z-10">
//               <ImageWithFallback
//                 src="https://images.unsplash.com/photo-1590097520752-3258327b7548?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGFydHVwJTIwdGVjaG5vbG9neSUyMGlubm92YXRpb258ZW58MXx8fHwxNzU2MzY3NzY5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
//                 alt="Startup Innovation"
//                 className="rounded-2xl shadow-2xl w-full h-[500px] object-cover"
//               />
//             </div>

//             {/* Floating Cards */}
//             <div className="absolute -top-6 -left-6 bg-white rounded-xl shadow-lg p-4 z-20">
//               <div className="flex items-center space-x-3">
//                 <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
//                   <TrendingUp className="w-6 h-6 text-green-600" />
//                 </div>
//                 <div>
//                   <div className="font-semibold text-gray-900">$2.3B Gap</div>
//                   <div className="text-sm text-gray-500">Funding Needed</div>
//                 </div>
//               </div>
//             </div>

//             <div className="absolute -bottom-6 -right-6 bg-white rounded-xl shadow-lg p-4 z-20">
//               <div className="flex items-center space-x-3">
//                 <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
//                   <Users className="w-6 h-6 text-blue-600" />
//                 </div>
//                 <div>
//                   <div className="font-semibold text-gray-900">1M+ Ideas</div>
//                   <div className="text-sm text-gray-500">Waiting for Funding</div>
//                 </div>
//               </div>
//             </div>

//             {/* Background Circles */}
//             <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-200 rounded-full opacity-50 blur-xl"></div>
//             <div className="absolute -bottom-20 -left-20 w-32 h-32 bg-blue-200 rounded-full opacity-50 blur-xl"></div>
//           </div>
//         </div>
//       </div>
//     </section>
//   );
// }



import { ArrowRight, Play } from 'lucide-react';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';


export function HeroSection() {
  return (
    <section className="relative py-12 lg:py-20 px-4 lg:px-8 overflow-hidden bg-hero-svg">
      {/* Background Pattern */}

      <div className="absolute inset-0 -z-10">
        <ImageWithFallback
          src="/images/background.png"
          alt="Background image"
          className="object-cover object-center opacity-30"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-brand-light/30 to-transparent pointer-events-none" />

      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="space-y-8 lg:space-y-12">
            {/* Powered by Hedera badge */}
            <div className="inline-flex items-center gap-3 bg-brand-light rounded-lg shadow-sm px-4 py-3 border border-primary/10">
              {/* Replace with your svg or icon */}
              <div className="flex-shrink-0">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 18 20"
                  aria-hidden="true"
                >
                  <path
                    fill="currentColor"
                    className="text-primary"
                    d="M10 1L5 16H17L10 1Z"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-primary">
                Powered by <span className="font-bold">HEDERA NETWORK</span>
              </p>
            </div>

            {/* Headings */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight">
                Powering Africa’s
              </h1>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight">
                <span className="text-primary">Innovation</span>{' '}
                <span className="text-secondary">Future</span>
              </h1>
            </div>

            {/* Description */}
            <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-2xl">
              Connect African entrepreneurs with global investors through
              blockchain-powered crowdfunding. Secure, transparent, and built on
              the HEDERA network with HBAR transactions.
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 lg:gap-6">
              <button className="group bg-secondary hover:bg-secondary/90 text-primary-foreground rounded-lg px-8 py-4 font-medium transition duration-200 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 flex items-center justify-center gap-2">
                Start Investing
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="group bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-8 py-4 font-medium transition duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 flex items-center justify-center gap-2">
                <Play className="w-4 h-4" />
                Watch Demo
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 pt-12 border-t border-border max-w-4xl mx-auto">
              <div className="text-center space-y-2">
                <div className="text-3xl lg:text-4xl font-black text-primary">
                  54
                </div>
                <div className="text-sm lg:text-base text-muted-foreground">
                  African countries
                </div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-3xl lg:text-4xl font-black text-primary">
                  500K+
                </div>
                <div className="text-sm lg:text-base text-muted-foreground">
                  Startups ready
                </div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-3xl lg:text-4xl font-black text-primary">
                  200M+
                </div>
                <div className="text-sm lg:text-base text-muted-foreground">
                  Diaspora network
                </div>
              </div>
            </div>
          </div>

          {/* Right Content */}
          <div className="relative">
            <div className="relative overflow-hidden rounded-2xl border border-border shadow-2xl">
              <ImageWithFallback
                src="/images/image_1.png"
                alt="Startup Innovation"
                className="rounded-2xl shadow-2xl w-full h-[500px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
            </div>

            {/* Floating Cards */}
            <div className="absolute -left-4 lg:-left-8 top-16 transform -rotate-3">
              <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-border shadow-lg p-4 w-48">
                <div className="flex items-center gap-3">
                  <div className="bg-brand-light rounded-lg w-12 h-12 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-primary"
                      fill="none"
                      viewBox="0 0 50 50"
                    >
                      <path d="M0 0h50v50H0z" fill="currentColor" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">
                      $2.3B Gap
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Funding needed
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -right-4 lg:-right-8 bottom-16 transform rotate-2">
              <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-border shadow-lg p-4 w-48">
                <div className="flex items-center gap-3">
                  <div className="bg-secondary rounded-lg w-12 h-12 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-primary-foreground"
                      fill="none"
                      viewBox="0 0 50 50"
                    >
                      <path d="M0 0h50v50H0z" fill="currentColor" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">
                      1M+ Ideas
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Waiting for funding
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
      </div>
    </section>
  );
}
