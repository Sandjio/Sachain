// import { cn } from "@/lib/utils"; 

// interface WalletOptionProps {
//   icon: React.ReactNode;
//   name: string;
//   description: string;
//   status: "available" | "unavailable" | "detected";
//   recommended?: boolean;
//   onClick: () => void;
// }

// export default function WalletOption({ icon, name, description, status, recommended = false, onClick }: WalletOptionProps) {
//   const statusColors = {
//     available: "bg-green-400",
//     unavailable: "bg-red-400",
//     detected: "bg-green-600",
//   };

//   const textColors = {
//     available: "primary-500",
//     unavailable: "text-red-500",
//     detected: "primary font-semibold",
//   };

//   return (
//     <button
//       onClick={onClick}
//       className={cn(
//         "flex items-center gap-5 p-5 border-2 rounded-lg relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1",
//         recommended ? "border-green-400 bg-green-50" : "border-gray-200"
//       )}
//     >
//       <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-black text-white text-2xl flex-shrink-0">
//         {icon}
//       </div>
//       <div className="flex-1 text-left">
//         <h3 className="font-bold text-lg">{name}</h3>
//         <p className="text-gray-500 text-sm">{description}</p>
//         <div className="flex items-center gap-2 mt-1">
//           <span className={`w-2 h-2 rounded-full ${statusColors[status]}`}></span>
//           <span className={`${textColors[status]} text-xs font-semibold`}>
//             {status === "detected" ? "Detected" : status === "available" ? "Available" : "Not Installed"}
//           </span>
//         </div>
//       </div>
//       {recommended && (
//         <span className="absolute top-2 right-4 text-green-500 text-xs font-bold">RECOMMENDED</span>
//       )}
//     </button>
//   );
// }



//refactor 


import { cn } from "@/lib/utils"; 

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
    available: "bg-emerald-500",
    unavailable: "bg-red-500",
    detected: "bg-emerald-600",
  };

  const textColors = {
    available: "text-emerald-700",
    unavailable: "text-red-600",
    detected: "text-emerald-700",
  };

  const statusBgColors = {
    available: "bg-emerald-50",
    unavailable: "bg-red-50",
    detected: "bg-emerald-50",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "group w-full flex items-center gap-5 p-6 rounded-2xl relative overflow-hidden transition-all duration-300",
        "border-2 hover:shadow-xl hover:-translate-y-1",
        recommended 
          ? "border-[#90A5FB] bg-gradient-to-br from-[#90A5FB]/5 via-white to-[#123962]/5 shadow-lg shadow-[#90A5FB]/20" 
          : "border-gray-200 bg-white hover:border-[#90A5FB]/50 hover:shadow-[#90A5FB]/10"
      )}
    >
      {/* Decorative gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#90A5FB]/0 to-[#123962]/0 group-hover:from-[#90A5FB]/5 group-hover:to-[#123962]/5 transition-all duration-300" />
      
      {/* Icon */}
      <div className={cn(
        "relative z-10 w-14 h-14 flex items-center justify-center rounded-xl text-2xl flex-shrink-0 transition-all duration-300",
        "bg-gradient-to-br from-[#123962] to-[#90A5FB] text-white shadow-lg group-hover:shadow-xl group-hover:scale-110"
      )}>
        {icon}
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 text-left">
        <h3 className="font-bold text-lg text-gray-900 mb-1">{name}</h3>
        <p className="text-gray-600 text-sm mb-2">{description}</p>
        
        {/* Status Badge */}
        <div className={cn(
          "inline-flex items-center gap-2 px-3 py-1 rounded-full",
          statusBgColors[status]
        )}>
          <span className={cn(
            "w-2 h-2 rounded-full animate-pulse",
            statusColors[status]
          )}></span>
          <span className={cn(
            "text-xs font-semibold",
            textColors[status]
          )}>
            {status === "detected" ? "Detected" : status === "available" ? "Available" : "Not Installed"}
          </span>
        </div>
      </div>

      {/* Recommended Badge */}
      {recommended && (
        <div className="absolute top-3 right-3 z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#90A5FB] to-[#123962] text-white text-xs font-bold rounded-full shadow-lg">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            RECOMMENDED
          </span>
        </div>
      )}

      {/* Arrow indicator on hover */}
      <div className="relative z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <svg className="w-6 h-6 text-[#123962]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}
