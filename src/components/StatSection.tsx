import { Card, CardContent } from "./ui/card";
import { TrendingUp, Users, DollarSign, Building, Globe, Lightbulb, Shield, Zap } from "lucide-react";

const stats = [
  {
    icon: Building,
    value: "500K+",
    label: "African Startups",
    description: "Seeking funding opportunities",
    color: "text-blue-600",
    bgColor: "bg-blue-100"
  },
  {
    icon: DollarSign,
    value: "$2.3B",
    label: "Funding Gap",
    description: "Unmet capital needs in Africa",
    color: "text-green-600",
    bgColor: "bg-green-100"
  },
  {
    icon: Users,
    value: "200M+",
    label: "Potential Investors",
    description: "African diaspora worldwide",
    color: "text-purple-600",
    bgColor: "bg-purple-100"
  },
  {
    icon: TrendingUp,
    value: "25%",
    label: "Annual Growth",
    description: "African startup ecosystem",
    color: "text-orange-600",
    bgColor: "bg-orange-100"
  },
  {
    icon: Globe,
    value: "54",
    label: "African Countries",
    description: "Ready for digital investment",
    color: "text-indigo-600",
    bgColor: "bg-indigo-100"
  },
  {
    icon: Lightbulb,
    value: "1M+",
    label: "Ideas Waiting",
    description: "For funding and support",
    color: "text-yellow-600",
    bgColor: "bg-yellow-100"
  }
];

export function StatsSection() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            The African Opportunity
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Africa's startup ecosystem is booming, but access to capital remains a challenge. 
            sachain bridges this gap with blockchain-powered crowdfunding.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {stats.map((stat, index) => (
            <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-0 shadow-md">
              <CardContent className="p-8 text-center">
                <div className={`inline-flex items-center justify-center w-16 h-16 ${stat.bgColor} rounded-full mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                </div>
                
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {stat.value}
                </div>
                
                <h3 className="font-semibold text-gray-900 mb-2">
                  {stat.label}
                </h3>
                
                <p className="text-gray-600 text-sm">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust Indicators */}
        <div className="mt-16 bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-8">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Why sachain for Africa?
            </h3>
            <p className="text-gray-600">
              Purpose-built to unlock Africa's innovation potential through accessible, secure crowdfunding
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-4">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Diaspora Connection</h4>
              <p className="text-gray-600 text-sm">
                Connecting African diaspora investors with homeland innovations
              </p>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Local Impact</h4>
              <p className="text-gray-600 text-sm">
                Every investment creates jobs and drives economic growth across Africa
              </p>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Cultural Understanding</h4>
              <p className="text-gray-600 text-sm">
                Built by Africans for Africans with deep market understanding
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}