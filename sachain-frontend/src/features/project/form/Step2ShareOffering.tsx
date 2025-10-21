// import React, { useState } from "react";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import { Label } from "@/components/ui/label";

// interface Step2Props {
//   data: {
//     stockSupply: number;
//     pricePerStock: number;
//     targetFundingGoal: number;
//   };
//   onChange: (fields: Partial<Step2Props["data"]>) => void;
//   onNext: () => void;
//   onPrev: () => void;
// }

// export function Step2ShareOffering({ data, onChange, onNext, onPrev }: Step2Props) {
//   const [errors, setErrors] = useState<Record<string, string>>({});

//   const validate = () => {
//     const newErrors: Record<string, string> = {};
//     if (!data.stockSupply || data.stockSupply <= 0)
//       newErrors.stockSupply = "Stock supply must be greater than 0";
//     else if (data.stockSupply > 10)
//       newErrors.stockSupply = "Stock supply must not be greater than 10";
//     if (!data.pricePerStock || data.pricePerStock <= 0)
//       newErrors.pricePerStock = "Price per stock must be greater than 0";
//     if (!data.targetFundingGoal || data.targetFundingGoal <= 0)
//       newErrors.targetFundingGoal = "Target funding goal must be greater than 0";
//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const handleNext = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (validate()) {
//       onNext();
//     }
//   };

//   const handleChange =
//     (field: keyof Step2Props["data"]) =>
//     (e: React.ChangeEvent<HTMLInputElement>) => {
//       const value = Number(e.target.value);
//       onChange({ [field]: isNaN(value) ? 0 : value });
//     };

//   return (
//     <form onSubmit={handleNext} className="space-y-6">
//       <div>
//         <Label htmlFor="stockSupply">Stock Supply</Label>
//         <Input
//           id="stockSupply"
//           type="number"
//           min={1}
//           max={10}
//           value={data.stockSupply}
//           onChange={handleChange("stockSupply")}
//           className={errors.stockSupply ? "border-red-600" : ""}
//         />
//         {errors.stockSupply && <p className="mt-1 text-sm text-red-600">{errors.stockSupply}</p>}
//       </div>

//       <div>
//         <Label htmlFor="pricePerStock">Price Per Stock</Label>
//         <Input
//           id="pricePerStock"
//           type="number"
//           min={1}
//           step={0.01}
//           value={data.pricePerStock}
//           onChange={handleChange("pricePerStock")}
//           className={errors.pricePerStock ? "border-red-600" : ""}
//         />
//         {errors.pricePerStock && <p className="mt-1 text-sm text-red-600">{errors.pricePerStock}</p>}
//       </div>

//       <div>
//         <Label htmlFor="targetFundingGoal">Target Funding Goal</Label>
//         <Input
//           id="targetFundingGoal"
//           type="number"
//           min={1}
//           step={0.01}
//           value={data.targetFundingGoal}
//           onChange={handleChange("targetFundingGoal")}
//           className={errors.targetFundingGoal ? "border-red-600" : ""}
//         />
//         {errors.targetFundingGoal && (
//           <p className="mt-1 text-sm text-red-600">{errors.targetFundingGoal}</p>
//         )}
//       </div>

//       <div className="flex justify-between">
//         <Button type="button" variant="outline" onClick={onPrev}>
//           Previous
//         </Button>
//         <Button type="submit">Next</Button>
//       </div>
//     </form>
//   );
// }



// import React, { useState } from "react";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import { Label } from "@/components/ui/label";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { Separator } from "@/components/ui/separator";
// import {
//   TrendingUp,
//   DollarSign,
//   Target,
//   Share,
//   ArrowRight,
//   ArrowLeft,
//   AlertCircle,
//   CheckCircle2,
//   Info,
//   Calculator,
//   PieChart,
// } from "lucide-react";

// interface Step2Props {
//   data: {
//     stockSupply: number;
//     pricePerStock: number;
//     targetFundingGoal: number;
//   };
//   onChange: (fields: Partial<Step2Props["data"]>) => void;
//   onNext: () => void;
//   onPrev: () => void;
// }

// export function Step2ShareOffering({ data, onChange, onNext, onPrev }: Step2Props) {
//   const [errors, setErrors] = useState<Record<string, string>>({});

//   const validate = () => {
//     const newErrors: Record<string, string> = {};
//     if (!data.stockSupply || data.stockSupply <= 0)
//       newErrors.stockSupply = "Stock supply must be greater than 0";
//     else if (data.stockSupply > 10)
//       newErrors.stockSupply = "Stock supply must not be greater than 10";
//     if (!data.pricePerStock || data.pricePerStock <= 0)
//       newErrors.pricePerStock = "Price per stock must be greater than 0";
//     if (!data.targetFundingGoal || data.targetFundingGoal <= 0)
//       newErrors.targetFundingGoal = "Target funding goal must be greater than 0";
    
//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const handleNext = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (validate()) {
//       onNext();
//     }
//   };

//   const handleChange =
//     (field: keyof Step2Props["data"]) =>
//     (e: React.ChangeEvent<HTMLInputElement>) => {
//       const value = Number(e.target.value);
//       onChange({ [field]: isNaN(value) ? 0 : value });
//     };

//   const isFieldValid = (field: string) => {
//     switch (field) {
//       case 'stockSupply':
//         return data.stockSupply > 0 && data.stockSupply <= 10;
//       case 'pricePerStock':
//         return data.pricePerStock > 0;
//       case 'targetFundingGoal':
//         return data.targetFundingGoal > 0;
//       default:
//         return false;
//     }
//   };

//   const getCompletionPercentage = () => {
//     const fields = ['stockSupply', 'pricePerStock', 'targetFundingGoal'];
//     const validFields = fields.filter(field => isFieldValid(field)).length;
//     return Math.round((validFields / fields.length) * 100);
//   };

//   const formatCurrency = (amount: number) => {
//     return new Intl.NumberFormat('en-US', {
//       style: 'currency',
//       currency: 'USD',
//       minimumFractionDigits: 2,
//     }).format(amount);
//   };

//   const calculateMaxRaise = () => {
//     return data.stockSupply * data.pricePerStock;
//   };

//   const getFundingProgress = () => {
//     const maxRaise = calculateMaxRaise();
//     if (maxRaise === 0 || data.targetFundingGoal === 0) return 0;
//     return Math.min((data.targetFundingGoal / maxRaise) * 100, 100);
//   };

//   return (
//     <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
//       {/* Header */}
//       <div className="mb-6 sm:mb-8">
//         <div className="flex items-center gap-3 mb-4">
//           <div className="p-2 bg-primary/10 rounded-lg">
//             <TrendingUp className="h-5 w-5 text-primary" />
//           </div>
//           <div>
//             <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
//               Share Offering
//             </h1>
//             <p className="text-sm sm:text-base text-muted-foreground">
//               Step 2 of 3 - Financial Structure
//             </p>
//           </div>
//         </div>

//         {/* Progress Indicator */}
//         <div className="flex items-center gap-3 p-3 sm:p-4 bg-muted/50 rounded-lg">
//           <div className="flex-1">
//             <div className="flex justify-between items-center mb-2">
//               <span className="text-sm font-medium text-foreground">
//                 Form Completion
//               </span>
//               <Badge variant="secondary" className="text-xs">
//                 {getCompletionPercentage()}%
//               </Badge>
//             </div>
//             <div className="w-full bg-muted rounded-full h-2">
//               <div 
//                 className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
//                 style={{ width: `${getCompletionPercentage()}%` }}
//               />
//             </div>
//           </div>
//         </div>
//       </div>

    


//       <form onSubmit={handleNext} className="space-y-6">
//   {/* Grid container for the three inputs */}
//   <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
//     {/* Stock Supply */}
//     <div>
//       <div className="flex items-center justify-between mb-1">
//         <Label htmlFor="stockSupply" className="text-sm font-medium">
//           Stock Supply *
//         </Label>
//         {isFieldValid('stockSupply') && (
//           <CheckCircle2 className="h-4 w-4 text-emerald-600" />
//         )}
//       </div>
//       <Input
//         id="stockSupply"
//         type="number"
//         min={1}
//         max={10}
//         value={data.stockSupply || ''}
//         onChange={handleChange("stockSupply")}
//         className={`h-10 ${errors.stockSupply ? "border-destructive focus-visible:ring-destructive" : ""}`}
//         placeholder="Number of shares to offer"
//       />
//       {errors.stockSupply && (
//         <p className="mt-1 text-sm text-destructive flex items-center gap-1">
//           <AlertCircle className="h-4 w-4" />
//           {errors.stockSupply}
//         </p>
//       )}
//       <p className="mt-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg flex items-start gap-1">
//         <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
//         Total number of shares available (max 10).
//       </p>
//     </div>

//     {/* Price Per Stock */}
//     <div>
//       <div className="flex items-center justify-between mb-1">
//         <Label htmlFor="pricePerStock" className="text-sm font-medium">
//           Price Per Share *
//         </Label>
//         {isFieldValid('pricePerStock') && (
//           <CheckCircle2 className="h-4 w-4 text-emerald-600" />
//         )}
//       </div>
//       <div className="relative">
//         <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//         <Input
//           id="pricePerStock"
//           type="number"
//           min={1}
//           step={0.01}
//           value={data.pricePerStock || ''}
//           onChange={handleChange("pricePerStock")}
//           className={`h-10 pl-10 ${errors.pricePerStock ? "border-destructive focus-visible:ring-destructive" : ""}`}
//           placeholder="0.00"
//         />
//       </div>
//       {errors.pricePerStock && (
//         <p className="mt-1 text-sm text-destructive flex items-center gap-1">
//           <AlertCircle className="h-4 w-4" />
//           {errors.pricePerStock}
//         </p>
//       )}
//       {data.pricePerStock > 0 && (
//         <p className="mt-1 text-xs text-muted-foreground">
//           Share price: <span className="font-medium">{formatCurrency(data.pricePerStock)}</span>
//         </p>
//       )}
//     </div>

//     {/* Target Funding Goal */}
//     <div>
//       <div className="flex items-center justify-between mb-1">
//         <Label htmlFor="targetFundingGoal" className="text-sm font-medium">
//           Target Funding Goal *
//         </Label>
//         {isFieldValid('targetFundingGoal') && (
//           <CheckCircle2 className="h-4 w-4 text-emerald-600" />
//         )}
//       </div>
//       <div className="relative">
//         <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//         <Input
//           id="targetFundingGoal"
//           type="number"
//           min={1}
//           step={0.01}
//           value={data.targetFundingGoal || ''}
//           onChange={handleChange("targetFundingGoal")}
//           className={`h-10 pl-10 ${errors.targetFundingGoal ? "border-destructive focus-visible:ring-destructive" : ""}`}
//           placeholder="0.00"
//         />
//       </div>
//       {errors.targetFundingGoal && (
//         <p className="mt-1 text-sm text-destructive flex items-center gap-1">
//           <AlertCircle className="h-4 w-4" />
//           {errors.targetFundingGoal}
//         </p>
//       )}
//       {data.targetFundingGoal > 0 && (
//         <p className="mt-1 text-xs text-muted-foreground">
//           Goal: <span className="font-medium">{formatCurrency(data.targetFundingGoal)}</span>
//         </p>
//       )}
//     </div>
//   </div>

//   {/* Financial Summary and warnings remain outside of the row grid */}

//   {/* Actions */}
//   <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-between mt-6">
//     <Button
//       type="button"
//       variant="outline"
//       onClick={onPrev}
//       className="w-full sm:w-auto h-10"
//     >
//       <ArrowLeft className="h-4 w-4 mr-2" />
//       Previous
//     </Button>
//     <Button
//       type="submit"
//       className="w-full sm:w-auto h-10"
//     >
//       Continue to Step 3
//       <ArrowRight className="h-4 w-4 ml-2" />
//     </Button>
//   </div>
// </form>

//     </div>
//   );
// }



import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  TrendingUp,
  DollarSign,
  Target,
  Share,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Info,
  Calculator,
  PieChart,
  Percent,
  TrendingDown,
  Coins,
} from "lucide-react";

interface Step2Props {
  data: {
    stockSupply: number;
    pricePerStock: number;
    targetFundingGoal: number;
  };
  onChange: (fields: Partial<Step2Props["data"]>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function Step2ShareOffering({ data, onChange, onNext, onPrev }: Step2Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!data.stockSupply || data.stockSupply <= 0)
      newErrors.stockSupply = "Stock supply must be greater than 0";
    else if (data.stockSupply > 10)
      newErrors.stockSupply = "Stock supply must not be greater than 10";
    if (!data.pricePerStock || data.pricePerStock <= 0)
      newErrors.pricePerStock = "Price per stock must be greater than 0";
    if (!data.targetFundingGoal || data.targetFundingGoal <= 0)
      newErrors.targetFundingGoal = "Target funding goal must be greater than 0";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onNext();
    }
  };

  const handleChange =
  (field: keyof Step2Props["data"]) =>
  (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Keep empty string as empty, don't convert to 0
    onChange({ [field]: value === '' ? '' : Number(value) });
  };

 const isFieldValid = (field: string) => {
  switch (field) {
    case 'stockSupply':
      return typeof data.stockSupply === 'number' && data.stockSupply > 0 && data.stockSupply <= 10;
    case 'pricePerStock':
      return typeof data.pricePerStock === 'number' && data.pricePerStock > 0;
    case 'targetFundingGoal':
      return typeof data.targetFundingGoal === 'number' && data.targetFundingGoal > 0;
    default:
      return false;
  }
};

  const getCompletionPercentage = () => {
    const fields = ['stockSupply', 'pricePerStock', 'targetFundingGoal'];
    const validFields = fields.filter(field => isFieldValid(field)).length;
    return Math.round((validFields / fields.length) * 100);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const calculateMaxRaise = () => {
    return data.stockSupply * data.pricePerStock;
  };

  const getFundingProgress = () => {
    const maxRaise = calculateMaxRaise();
    if (maxRaise === 0 || data.targetFundingGoal === 0) return 0;
    return Math.min((data.targetFundingGoal / maxRaise) * 100, 100);
  };

  const isGoalRealistic = () => {
    const maxRaise = calculateMaxRaise();
    return data.targetFundingGoal <= maxRaise;
  };

  const allFieldsValid = () => {
    return isFieldValid('stockSupply') && isFieldValid('pricePerStock') && isFieldValid('targetFundingGoal');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
              Share Offering
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Step 2 of 3 - Financial Structure
            </p>
          </div>
        </div>

        {/* Completion Badge */}
        <Badge 
          variant="secondary" 
          className={`px-4 py-2 ${
            getCompletionPercentage() === 100 
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' 
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {getCompletionPercentage() === 100 && <CheckCircle2 className="h-4 w-4 mr-2" />}
          {getCompletionPercentage()}% Complete
        </Badge>
      </div>

      <form onSubmit={handleNext} className="space-y-6">
        {/* Main Content Grid - 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Input Fields */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border border-border">
              <CardHeader className="p-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Share className="h-4 w-4" />
                  Share Offering Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-6">
                {/* Stock Supply */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="stockSupply" className="text-sm font-medium flex items-center gap-2">
                      <Coins className="h-4 w-4 text-muted-foreground" />
                      Stock Supply *
                    </Label>
                    {isFieldValid('stockSupply') && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    )}
                  </div>
                  <Input
                    id="stockSupply"
                    type="number"
                    min={1}
                    max={10}
                    value={data.stockSupply || ''}
                    onChange={handleChange("stockSupply")}
                    className={`h-12 ${errors.stockSupply ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    placeholder="Enter number of shares (max 10)"
                  />
                  {errors.stockSupply && (
                    <p className="mt-2 text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.stockSupply}
                    </p>
                  )}
                  {!errors.stockSupply && data.stockSupply > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg flex items-start gap-2">
                      <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>You will offer <span className="font-semibold text-foreground">{data.stockSupply.toLocaleString()}</span> shares to investors</span>
                    </p>
                  )}
                </div>

                <Separator />

                {/* Price Per Stock */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="pricePerStock" className="text-sm font-medium flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      Price Per Share *
                    </Label>
                    {isFieldValid('pricePerStock') && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    )}
                  </div>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="pricePerStock"
                      type="number"
                      min={1}
                      step={0.01}
                      value={data.pricePerStock || ''}
                      onChange={handleChange("pricePerStock")}
                      className={`h-12 pl-10 ${errors.pricePerStock ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      placeholder="0.00"
                    />
                  </div>
                  {errors.pricePerStock && (
                    <p className="mt-2 text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.pricePerStock}
                    </p>
                  )}
                  {!errors.pricePerStock && data.pricePerStock > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">
                      Each share will cost: <span className="font-semibold text-foreground">{formatCurrency(data.pricePerStock)}</span>
                    </p>
                  )}
                </div>

                <Separator />

                {/* Target Funding Goal */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="targetFundingGoal" className="text-sm font-medium flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      Target Funding Goal *
                    </Label>
                    {isFieldValid('targetFundingGoal') && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    )}
                  </div>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="targetFundingGoal"
                      type="number"
                      min={1}
                      step={0.01}
                      value={data.targetFundingGoal || ''}
                      onChange={handleChange("targetFundingGoal")}
                      className={`h-12 pl-10 ${errors.targetFundingGoal ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      placeholder="0.00"
                    />
                  </div>
                  {errors.targetFundingGoal && (
                    <p className="mt-2 text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.targetFundingGoal}
                    </p>
                  )}
                  {!errors.targetFundingGoal && data.targetFundingGoal > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">
                      Funding goal: <span className="font-semibold text-foreground">{formatCurrency(data.targetFundingGoal)}</span>
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Financial Summary */}
          <div className="lg:col-span-1">
            <Card className="border border-border sticky top-6">
              <CardHeader className="p-4 bg-gradient-to-br from-primary/5 to-accent/5">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calculator className="h-4 w-4" />
                  Financial Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {allFieldsValid() ? (
                  <>
                    {/* Max Raise Calculation */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <PieChart className="h-3 w-3" />
                        <span>Maximum Raise</span>
                      </div>
                      <div className="text-2xl font-bold text-foreground">
                        {formatCurrency(calculateMaxRaise())}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {data.stockSupply.toLocaleString()} shares × {formatCurrency(data.pricePerStock)}
                      </p>
                    </div>

                    <Separator />

                    {/* Funding Goal vs Max */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Target className="h-3 w-3" />
                        <span>Goal Achievement</span>
                      </div>
                      <div className="text-xl font-semibold text-foreground">
                        {getFundingProgress().toFixed(1)}%
                      </div>
                      <div className="w-full bg-muted rounded-full h-2.5">
                        <div 
                          className={`h-2.5 rounded-full transition-all duration-300 ${
                            isGoalRealistic() 
                              ? 'bg-gradient-to-r from-primary to-accent' 
                              : 'bg-destructive'
                          }`}
                          style={{ width: `${Math.min(getFundingProgress(), 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(data.targetFundingGoal)} of {formatCurrency(calculateMaxRaise())}
                      </p>
                    </div>

                    <Separator />

                    {/* Key Metrics */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Total Shares</span>
                        <span className="font-semibold text-foreground">{data.stockSupply.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Price/Share</span>
                        <span className="font-semibold text-foreground">{formatCurrency(data.pricePerStock)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Target Goal</span>
                        <span className="font-semibold text-foreground">{formatCurrency(data.targetFundingGoal)}</span>
                      </div>
                    </div>

                    {/* Goal Validation Alert */}
                    {!isGoalRealistic() && (
                      <Alert variant="destructive" className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          Your funding goal exceeds the maximum possible raise. Reduce your goal or increase shares/price.
                        </AlertDescription>
                      </Alert>
                    )}

                    {isGoalRealistic() && getFundingProgress() < 50 && (
                      <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <div className="text-xs text-foreground">
                            <span className="font-medium">Conservative Goal</span>
                            <p className="text-muted-foreground mt-1">
                              Your goal is {getFundingProgress().toFixed(0)}% of maximum capacity, leaving room for growth.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Calculator className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Complete all fields to see financial summary
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <Card className="border border-border bg-muted/20">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={onPrev}
              className="w-full sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous Step
            </Button>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="h-3 w-3" />
              <span>All fields are required</span>
            </div>

            <Button
              type="submit"
              disabled={!allFieldsValid()||!isGoalRealistic()}
              className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
            >
              Continue to Review
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
