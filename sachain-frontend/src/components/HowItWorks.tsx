


// import { Card, CardContent } from "./ui/card";
// import { UserPlus, Search, CreditCard, TrendingUp, Building, Shield } from "lucide-react";

// const investorSteps = [
//   {
//     icon: UserPlus,
//     title: "Create Account",
//     description: "Sign up and verify your identity to start investing with HBAR"
//   },
//   {
//     icon: Search,
//     title: "Browse Projects",
//     description: "Discover vetted African startups and their innovative solutions"
//   },
//   {
//     icon: CreditCard,
//     title: "Invest with HBAR",
//     description: "Use secure Hedera network transactions to purchase shares"
//   },
//   {
//     icon: TrendingUp,
//     title: "Track Growth",
//     description: "Monitor your investments and receive returns"
//   }
// ];

// const startupSteps = [
//   {
//     icon: Building,
//     title: "Submit Project",
//     description: "Present your startup idea with detailed business plan"
//   },
//   {
//     icon: Shield,
//     title: "Get Verified",
//     description: "Our team reviews and verifies your project authenticity"
//   },
//   {
//     icon: TrendingUp,
//     title: "Raise Funds",
//     description: "Connect with investors and raise capital through HBAR"
//   },
//   {
//     icon: UserPlus,
//     title: "Grow Together",
//     description: "Scale your business with investor support and guidance"
//   }
// ];

// export function HowItWorks() {
//   return (
//     <section className="py-24 bg-white">
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//         <div className="text-center mb-16">
//           <h2 className="text-4xl font-bold text-gray-900 mb-4">
//             How sachain Works
//           </h2>
//           <p className="text-xl text-gray-600 max-w-3xl mx-auto">
//             Bridging the gap between African innovation and global capital. 
//             Simple, secure, and transparent blockchain-powered crowdfunding.
//           </p>
//         </div>

//         <div className="grid lg:grid-cols-2 gap-16">
//           {/* For Investors */}
//           <div>
//             <div className="text-center mb-8">
//               <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
//                 <TrendingUp className="w-8 h-8 text-purple-600" />
//               </div>
//               <h3 className="text-2xl font-bold text-gray-900 mb-2">For Investors</h3>
//               <p className="text-gray-600">Discover and invest in African innovation</p>
//             </div>
            
//             <div className="space-y-6">
//               {investorSteps.map((step, index) => (
//                 <Card key={index} className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
//                   <CardContent className="p-6">
//                     <div className="flex items-start space-x-4">
//                       <div className="flex-shrink-0">
//                         <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
//                           <step.icon className="w-6 h-6 text-purple-600" />
//                         </div>
//                       </div>
//                       <div>
//                         <div className="flex items-center space-x-2 mb-2">
//                           <span className="text-sm font-semibold text-purple-600 bg-purple-100 px-2 py-1 rounded">
//                             Step {index + 1}
//                           </span>
//                         </div>
//                         <h4 className="font-semibold text-gray-900 mb-2">{step.title}</h4>
//                         <p className="text-gray-600">{step.description}</p>
//                       </div>
//                     </div>
//                   </CardContent>
//                 </Card>
//               ))}
//             </div>
//           </div>

//           {/* For Startups */}
//           <div>
//             <div className="text-center mb-8">
//               <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
//                 <Building className="w-8 h-8 text-blue-600" />
//               </div>
//               <h3 className="text-2xl font-bold text-gray-900 mb-2">For Startups</h3>
//               <p className="text-gray-600">Access global capital to scale across Africa</p>
//             </div>
            
//             <div className="space-y-6">
//               {startupSteps.map((step, index) => (
//                 <Card key={index} className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
//                   <CardContent className="p-6">
//                     <div className="flex items-start space-x-4">
//                       <div className="flex-shrink-0">
//                         <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
//                           <step.icon className="w-6 h-6 text-blue-600" />
//                         </div>
//                       </div>
//                       <div>
//                         <div className="flex items-center space-x-2 mb-2">
//                           <span className="text-sm font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded">
//                             Step {index + 1}
//                           </span>
//                         </div>
//                         <h4 className="font-semibold text-gray-900 mb-2">{step.title}</h4>
//                         <p className="text-gray-600">{step.description}</p>
//                       </div>
//                     </div>
//                   </CardContent>
//                 </Card>
//               ))}
//             </div>
//           </div>
//         </div>
//       </div>
//     </section>
//   );
// }




import { Section, SectionHeader } from "./ui/section";
import { Card, CardContent } from "./ui/card";
import { Users, Lightbulb } from "lucide-react";

interface StepCardProps {
  stepNumber: string;
  title: string;
  description: string;
  isHighlighted?: boolean;
}

function StepCard({ stepNumber, title, description, isHighlighted = false }: StepCardProps) {
  return (
    <div className="space-y-4">
      {/* Step Badge */}
      <div className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium ${
        isHighlighted
          ? 'bg-brand-light border border-primary text-primary'
          : 'bg-brand-light border border-secondary/50 text-foreground'
      }`}>
        {stepNumber}
      </div>
      {/* Content Card */}
      <Card className={`p-6 ${isHighlighted ? 'ring-2 ring-primary/20' : ''}`}>
        <CardContent className="p-0 space-y-3">
          <h3 className="text-xl font-bold text-foreground">{title}</h3>
          <p className="text-muted-foreground leading-relaxed">{description}</p>
        </CardContent>
      </Card>
    </div>
  );
}

export function HowItWorks() {
  const investorSteps = [
    {
      stepNumber: "Step 1",
      title: "Create Account",
      description: "Sign up and verify your identity to start investing with HBAR.",
      isHighlighted: true,
    },
    {
      stepNumber: "Step 2",
      title: "Browse Projects",
      description: "Discover vetted African startups and their innovative solutions.",
    },
    {
      stepNumber: "Step 3",
      title: "Invest with HBAR",
      description: "Use secure Hedera network transactions to purchase equity shares.",
    },
    {
      stepNumber: "Step 4",
      title: "Track Growth",
      description: "Monitor your investments and receive returns transparently.",
    },
  ];

  const startupSteps = [
    {
      stepNumber: "Step 1",
      title: "Submit Project",
      description: "Present your startup idea with a detailed business plan.",
    },
    {
      stepNumber: "Step 2",
      title: "Get Verified",
      description: "Our team reviews and verifies your project authenticity.",
    },
    {
      stepNumber: "Step 3",
      title: "Raise Funds",
      description: "Connect with investors and raise capital through HBAR.",
    },
    {
      stepNumber: "Step 4",
      title: "Scale Together",
      description: "Grow your business with investor support and guidance.",
    },
  ];

  return (
    <Section background="muted">
      <SectionHeader 
        title="How Sachain Works"
        subtitle="Bridging the gap between African innovation and global capital. Simple, secure, and transparent blockchain-powered crowdfunding."
      />
      {/* Target Audience Cards */}
      <div className="grid md:grid-cols-2 gap-8 lg:gap-16 mb-16 lg:mb-24">
        {/* For Investors */}
        <Card className="relative p-8 text-center group hover:shadow-lg transition-shadow">
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
            <div className="bg-secondary rounded-xl w-16 h-16 flex items-center justify-center shadow-lg">
              <Users className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <CardContent className="pt-8 pb-0 space-y-3">
            <h3 className="text-2xl font-bold text-foreground">For Investors</h3>
            <p className="text-muted-foreground">Discover and invest in African innovation</p>
          </CardContent>
        </Card>
        {/* For Startups */}
        <Card className="relative p-8 text-center group hover:shadow-lg transition-shadow">
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
            <div className="bg-secondary rounded-xl w-16 h-16 flex items-center justify-center shadow-lg">
              <Lightbulb className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <CardContent className="pt-8 pb-0 space-y-3">
            <h3 className="text-2xl font-bold text-foreground">For Entrepreneurs</h3>
            <p className="text-muted-foreground">Access global capital to scale across Africa</p>
          </CardContent>
        </Card>
      </div>
      {/* Process Steps */}
      <div className="relative">
        {/* Central Divider - Hidden on mobile */}
        <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-border transform -translate-x-1/2" />
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16">
          {/* Investor Steps */}
          <div className="space-y-8">
            <h3 className="text-xl font-bold text-primary text-center lg:text-left mb-8">
              Investor Journey
            </h3>
            {investorSteps.map((step, index) => (
              <StepCard key={index} {...step} />
            ))}
          </div>
          {/* Startup Steps */}
          <div className="space-y-8">
            <h3 className="text-xl font-bold text-primary text-center lg:text-left mb-8">
              Entrepreneur Journey
            </h3>
            {startupSteps.map((step, index) => (
              <StepCard key={index} {...step} />
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
