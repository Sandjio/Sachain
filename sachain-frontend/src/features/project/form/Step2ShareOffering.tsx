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



import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
      const value = Number(e.target.value);
      onChange({ [field]: isNaN(value) ? 0 : value });
    };

  const isFieldValid = (field: string) => {
    switch (field) {
      case 'stockSupply':
        return data.stockSupply > 0 && data.stockSupply <= 10;
      case 'pricePerStock':
        return data.pricePerStock > 0;
      case 'targetFundingGoal':
        return data.targetFundingGoal > 0;
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

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-4">
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

        {/* Progress Indicator */}
        <div className="flex items-center gap-3 p-3 sm:p-4 bg-muted/50 rounded-lg">
          <div className="flex-1">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-foreground">
                Form Completion
              </span>
              <Badge variant="secondary" className="text-xs">
                {getCompletionPercentage()}%
              </Badge>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${getCompletionPercentage()}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleNext} className="space-y-6">
        <Card className="border border-border">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Share className="h-4 w-4" />
              Share Structure
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-6">
           
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="stockSupply" className="text-sm font-medium">
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
                className={`h-10 ${errors.stockSupply ? "border-destructive focus-visible:ring-destructive" : ""}`}
                placeholder="Number of shares to offer"
              />
              {errors.stockSupply && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {errors.stockSupply}
                </div>
              )}
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>
                  Total number of shares available for purchase. Limited to 10 shares maximum for this offering.
                </span>
              </div>
            </div>

            {/* Price Per Stock */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="pricePerStock" className="text-sm font-medium">
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
                  className={`h-10 pl-10 ${errors.pricePerStock ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  placeholder="0.00"
                />
              </div>
              {errors.pricePerStock && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {errors.pricePerStock}
                </div>
              )}
              {data.pricePerStock > 0 && (
                <div className="text-sm text-muted-foreground">
                  Share price: <span className="font-medium">{formatCurrency(data.pricePerStock)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Target className="h-4 w-4" />
              Funding Goals
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-6">
            {/* Target Funding Goal */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="targetFundingGoal" className="text-sm font-medium">
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
                  className={`h-10 pl-10 ${errors.targetFundingGoal ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  placeholder="0.00"
                />
              </div>
              {errors.targetFundingGoal && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {errors.targetFundingGoal}
                </div>
              )}
              {data.targetFundingGoal > 0 && (
                <div className="text-sm text-muted-foreground">
                  Goal: <span className="font-medium">{formatCurrency(data.targetFundingGoal)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        {data.stockSupply > 0 && data.pricePerStock > 0 && (
          <Card className="border border-border bg-muted/20">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Calculator className="h-4 w-4" />
                Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <PieChart className="h-4 w-4" />
                    Maximum Raise
                  </div>
                  <div className="text-lg font-semibold text-foreground">
                    {formatCurrency(calculateMaxRaise())}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {data.stockSupply} shares × {formatCurrency(data.pricePerStock)}
                  </div>
                </div>

                {data.targetFundingGoal > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Target className="h-4 w-4" />
                      Goal Achievement
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">
                          {getFundingProgress().toFixed(1)}%
                        </span>
                        <span className="text-xs text-muted-foreground">
                          of max raise
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${getFundingProgress()}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {data.targetFundingGoal > calculateMaxRaise() && (
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-start gap-2 text-sm text-yellow-800 dark:text-yellow-200">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>
                      Your funding goal exceeds the maximum possible raise. Consider increasing your share count or price per share.
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onPrev}
            className="w-full sm:w-auto h-10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <Button
            type="submit"
            className="w-full sm:w-auto h-10"
          >
            Continue to Step 3
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </form>
    </div>
  );
}