import { Card, CardContent } from "./ui/card";
import { Shield, Zap, TrendingUp } from "lucide-react";
import { DefaultStats, StatItem } from "@/data/statsData";

interface StatsProps {
  stats?: StatItem[];
}

export function StatsSection({ stats = DefaultStats }: StatsProps) {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            The African Opportunity
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Africa&apos;s startup ecosystem is booming, but access to capital remains a challenge. 
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
              Purpose-built to unlock Africa&apos;s innovation potential through accessible, secure crowdfunding
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