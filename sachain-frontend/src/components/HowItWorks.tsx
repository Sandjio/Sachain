// // src/components/HowItWorks.tsx
// import { useTranslate } from "@/hooks/useTranslate";
// import { Card, CardContent } from "@/components/ui/card";
// import { Lightbulb, Wallet, TrendingUp } from "lucide-react";

// export default function HowItWorks() {
//   const translate = useTranslate("howItWorks");

//   const steps = [
//     {
//       icon: <Lightbulb className="w-10 h-10 text-primary" />,
//       title: translate("steps.discover.title"),
//       description: translate("steps.discover.description"),
//     },
//     {
//       icon: <Wallet className="w-10 h-10 text-primary" />,
//       title: translate("steps.invest.title"),
//       description: translate("steps.invest.description"),
//     },
//     {
//       icon: <TrendingUp className="w-10 h-10 text-primary" />,
//       title: translate("steps.grow.title"),
//       description: translate("steps.grow.description"),
//     },
//   ];

//   return (
//     <section className="container-max py-10 md:py-18 text-center">
//       <h2 className="text-4xl font-bold mb-12">{translate("title")}</h2>
//       <div className="grid gap-8 md:grid-cols-3">
//         {steps.map((step, i) => (
//           <Card key={i} className="shadow-lg border rounded-2xl">
//             <CardContent className="flex flex-col items-center p-6">
//               {step.icon}
//               <h3 className="mt-4 text-xl font-semibold">{step.title}</h3>
//               <p className="mt-2 text-secondary text-sm">{step.description}</p>
//             </CardContent>
//           </Card>
//         ))}
//       </div>
//     </section>
//   );
// }


import { Card, CardContent } from "./ui/card";
import { UserPlus, Search, CreditCard, TrendingUp, Building, Shield } from "lucide-react";

const investorSteps = [
  {
    icon: UserPlus,
    title: "Create Account",
    description: "Sign up and verify your identity to start investing with HBAR"
  },
  {
    icon: Search,
    title: "Browse Projects",
    description: "Discover vetted African startups and their innovative solutions"
  },
  {
    icon: CreditCard,
    title: "Invest with HBAR",
    description: "Use secure Hedera network transactions to purchase shares"
  },
  {
    icon: TrendingUp,
    title: "Track Growth",
    description: "Monitor your investments and receive returns"
  }
];

const startupSteps = [
  {
    icon: Building,
    title: "Submit Project",
    description: "Present your startup idea with detailed business plan"
  },
  {
    icon: Shield,
    title: "Get Verified",
    description: "Our team reviews and verifies your project authenticity"
  },
  {
    icon: TrendingUp,
    title: "Raise Funds",
    description: "Connect with investors and raise capital through HBAR"
  },
  {
    icon: UserPlus,
    title: "Grow Together",
    description: "Scale your business with investor support and guidance"
  }
];

export function HowItWorks() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            How sachain Works
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Bridging the gap between African innovation and global capital. 
            Simple, secure, and transparent blockchain-powered crowdfunding.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16">
          {/* For Investors */}
          <div>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">For Investors</h3>
              <p className="text-gray-600">Discover and invest in African innovation</p>
            </div>
            
            <div className="space-y-6">
              {investorSteps.map((step, index) => (
                <Card key={index} className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                          <step.icon className="w-6 h-6 text-purple-600" />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-sm font-semibold text-purple-600 bg-purple-100 px-2 py-1 rounded">
                            Step {index + 1}
                          </span>
                        </div>
                        <h4 className="font-semibold text-gray-900 mb-2">{step.title}</h4>
                        <p className="text-gray-600">{step.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* For Startups */}
          <div>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <Building className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">For Startups</h3>
              <p className="text-gray-600">Access global capital to scale across Africa</p>
            </div>
            
            <div className="space-y-6">
              {startupSteps.map((step, index) => (
                <Card key={index} className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <step.icon className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-sm font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded">
                            Step {index + 1}
                          </span>
                        </div>
                        <h4 className="font-semibold text-gray-900 mb-2">{step.title}</h4>
                        <p className="text-gray-600">{step.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}