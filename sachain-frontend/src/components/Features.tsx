import { Card, CardContent, CardHeader } from "./ui/card";
import { Shield, Zap, Users, TrendingUp, Globe, CreditCard, BarChart3, UserCheck } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Blockchain Security",
    description: "Built on Hedera network with enterprise-grade security for all transactions and smart contracts.",
    color: "text-blue-600",
    bgColor: "bg-blue-100"
  },
  {
    icon: Zap,
    title: "Instant HBAR Transactions",
    description: "Lightning-fast payments and settlements using HBAR cryptocurrency with minimal fees.",
    color: "text-purple-600",
    bgColor: "bg-purple-100"
  },
  {
    icon: Users,
    title: "Community-Driven",
    description: "Connect with investors and entrepreneurs across Africa to build the future together.",
    color: "text-green-600",
    bgColor: "bg-green-100"
  },
  {
    icon: TrendingUp,
    title: "Smart Investment Tracking",
    description: "Real-time portfolio tracking with detailed analytics and performance insights.",
    color: "text-orange-600",
    bgColor: "bg-orange-100"
  },
  {
    icon: Globe,
    title: "Pan-African Focus",
    description: "Specifically designed to support and scale African startups and innovation.",
    color: "text-indigo-600",
    bgColor: "bg-indigo-100"
  },
  {
    icon: CreditCard,
    title: "Fractional Ownership",
    description: "Invest in startups with any amount through tokenized shares and smart contracts.",
    color: "text-pink-600",
    bgColor: "bg-pink-100"
  },
  {
    icon: BarChart3,
    title: "Transparent Reporting",
    description: "Complete transparency with real-time project updates and financial reporting.",
    color: "text-cyan-600",
    bgColor: "bg-cyan-100"
  },
  {
    icon: UserCheck,
    title: "KYC & Compliance",
    description: "Fully compliant with international regulations and comprehensive KYC verification.",
    color: "text-red-600",
    bgColor: "bg-red-100"
  }
];

export function Features() {
  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Platform Features
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            sachain combines cutting-edge blockchain technology with user-friendly design 
            to create the most powerful crowdfunding platform for African innovation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-md h-full">
              <CardHeader className="text-center pb-4">
                <div className={`inline-flex items-center justify-center w-16 h-16 ${feature.bgColor} rounded-xl mb-4 group-hover:scale-110 transition-transform duration-300 mx-auto`}>
                  <feature.icon className={`w-8 h-8 ${feature.color}`} />
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                  {feature.title}
                </h3>
              </CardHeader>
              
              <CardContent className="pt-0 text-center">
                <p className="text-gray-600 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Coming Soon Badge */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full">
            <span className="text-purple-600 font-medium">🚀 MVP Coming Soon - Built for Hedera Hackathon</span>
          </div>
        </div>
      </div>
    </section>
  );
}