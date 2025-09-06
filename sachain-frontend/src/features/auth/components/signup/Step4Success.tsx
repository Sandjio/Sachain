
import { Button } from "@/components/ui/button";
import { CheckCircle, Sparkles } from "lucide-react";
import { defaultRoleConfig, RoleConfigMap } from "@/data/step4SuccessData";
import { useRouter } from "next/router";
import { useAuthStore } from "@/store/authStore";

interface Step4SuccessProps {
  onClose: () => void;
  roleConfig?: RoleConfigMap;
}

export default function Step4Success({ onClose, roleConfig = defaultRoleConfig }: Step4SuccessProps) {
  // Assume role is always defined if this component is shown
  const role = useAuthStore((state) => state.user?.role)!; 
  const config = roleConfig[role];
  const IconComponent = config.icon;

  const router = useRouter();

  const handleProceedToPlatform = () => {
    onClose();
    router.push("/dashboards");
  };

  return (
    <div className="text-center space-y-6">
      {/* Success Icon */}
      <div className="space-y-4">
        <div className="relative mx-auto w-20 h-20">
          <div className="absolute inset-0 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-blue-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold">{config.title}</h2>
          <p className="text-muted-foreground">{config.subtitle}</p>
        </div>
      </div>

      {/* Account status + description */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-center gap-2">
          <IconComponent className="w-5 h-5 text-primary" />
          <span className="font-medium">Account Status: Under Review</span>
        </div>

        <p className="text-sm text-muted-foreground">{config.description}</p>

        <div className="space-y-2">
          <p className="text-sm font-medium">What you can do next:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            {config.features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Next steps info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Next Steps:</strong> Our team will review your application
          within 24-48 hours. You'll receive an email notification once your
          account is fully verified and ready to use.
        </p>
      </div>

      {/* Action Button */}
      <Button onClick={handleProceedToPlatform} className="w-full" size="lg">
        Proceed to Platform
      </Button>

      <p className="text-xs text-muted-foreground">
        By proceeding, you agree to our Terms of Service and Privacy Policy
      </p>
    </div>
  );
}
