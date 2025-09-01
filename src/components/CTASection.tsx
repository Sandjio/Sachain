
// import { useTranslate } from "@/hooks/useTranslate";
// import { Button } from "@/components/ui/button";
// import { useState } from "react";
// import GetStartedModal from "@/features/auth/components/GetStartedModal";

// export default function CTASection() {
//   const translate = useTranslate("cta");
//   const [open, setOpen] = useState(false);

//   return (
//     <section className="container-max md:py-10 text-center">
//       {/* One single CTA */}
//       <Button
//         onClick={() => setOpen(true)}
//         className="px-8 py-4 text-lg"
//       >
//         {translate("getStarted")}
//       </Button>

//       {/* Modal with role selection */}
//       <GetStartedModal open={open} onOpenChange={setOpen} />
//     </section>
//   );
// }


import { Button } from "./ui/button";
import { ArrowRight, Sparkles, TrendingUp } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-24 bg-gradient-to-r from-purple-600 to-blue-600 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
      
      {/* Background Shapes */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full mb-6">
          <Sparkles className="w-4 h-4 text-white mr-2" />
          <span className="text-white text-sm font-medium">Join the Future of Crowdfunding</span>
        </div>
        
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
          Ready to Start Your
          <span className="block">Investment Journey?</span>
        </h2>
        
        <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed">
          Whether you're an investor looking for African opportunities or a startup 
          ready to scale across the continent, sachain makes it simple, secure, and transparent.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button 
            size="lg" 
            className="bg-white text-purple-600 hover:bg-gray-100 text-lg px-8 py-4 shadow-lg"
          >
            <TrendingUp className="mr-2 w-5 h-5" />
            Start Investing
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          
          <Button 
            size="lg" 
            variant="outline" 
            className="border-white text-white hover:bg-white hover:text-purple-600 text-lg px-8 py-4"
          >
            Submit Your Startup
          </Button>
        </div>
        
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-white mb-1">2 min</div>
            <div className="text-white/80">Setup Time</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white mb-1">0%</div>
            <div className="text-white/80">Platform Fees*</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white mb-1">24/7</div>
            <div className="text-white/80">Support</div>
          </div>
        </div>
        
        <p className="text-white/60 text-sm mt-6">
          *MVP launching soon. Built for the Hedera Hackathon challenge.
        </p>
      </div>
    </section>
  );
}