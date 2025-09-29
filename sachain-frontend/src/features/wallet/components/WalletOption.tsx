import { cn } from "@/lib/utils"; // Utility for conditional classes (adjust import if needed)

interface WalletOptionProps {
  icon: React.ReactNode;
  name: string;
  description: string;
  status: "available" | "unavailable" | "detected";
  recommended?: boolean;
  onClick: () => void;
}

export default function WalletOption({ icon, name, description, status, recommended = false, onClick }: WalletOptionProps) {
  const statusColors = {
    available: "bg-green-400",
    unavailable: "bg-red-400",
    detected: "bg-green-600",
  };

  const textColors = {
    available: "text-green-500",
    unavailable: "text-red-500",
    detected: "text-green-700 font-semibold",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-5 p-5 border-2 rounded-lg relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1",
        recommended ? "border-green-400 bg-green-50" : "border-gray-200"
      )}
    >
      <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-black text-white text-2xl flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 text-left">
        <h3 className="font-bold text-lg">{name}</h3>
        <p className="text-gray-500 text-sm">{description}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`w-2 h-2 rounded-full ${statusColors[status]}`}></span>
          <span className={`${textColors[status]} text-xs font-semibold`}>
            {status === "detected" ? "Detected" : status === "available" ? "Available" : "Not Installed"}
          </span>
        </div>
      </div>
      {recommended && (
        <span className="absolute top-2 right-4 text-green-500 text-xs font-bold">RECOMMENDED</span>
      )}
    </button>
  );
}
