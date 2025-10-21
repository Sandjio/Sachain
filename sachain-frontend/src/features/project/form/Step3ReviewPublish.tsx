// import React, { useState } from "react";
// import { Button } from "@/components/ui/button";
// import { Checkbox } from "@/components/ui/checkbox";

// interface Step3Props {
//   data: {
//     name: string;
//     description: string;
//     category: string;
//     coverImageUrl: string;
//     stockSupply: number;
//     pricePerStock: number;
//     targetFundingGoal: number;
//   };
//   onPrev: () => void;
//   onSubmit: () => void;
//   loading: boolean;
//   error: string | null;
// }

// export function Step3ReviewPublish({ data, onPrev, onSubmit, loading, error }: Step3Props) {
//   const [confirmed, setConfirmed] = useState(false);

//   const isSubmitDisabled = loading || !confirmed;

//   return (
//     <div className="space-y-6">
//       <h2 className="text-2xl font-bold">Review Your Project Details</h2>

//       <div className="bg-white rounded-lg p-6 border border-gray-200 space-y-4">
//         <div>
//           <h3 className="font-semibold">Project Name</h3>
//           <p>{data.name}</p>
//         </div>
//         <div>
//           <h3 className="font-semibold">Description</h3>
//           <p>{data.description}</p>
//         </div>
//         <div>
//           <h3 className="font-semibold">Category</h3>
//           <p>{data.category.replace("_", " ")}</p>
//         </div>
//         <div>
//           <h3 className="font-semibold">Cover Image URL</h3>
//           <p>{data.coverImageUrl}</p>
//         </div>
//         <div>
//           <h3 className="font-semibold">Stock Supply</h3>
//           <p>{data.stockSupply}</p>
//         </div>
//         <div>
//           <h3 className="font-semibold">Price Per Stock</h3>
//           <p>${data.pricePerStock.toFixed(2)}</p>
//         </div>
//         <div>
//           <h3 className="font-semibold">Target Funding Goal</h3>
//           <p>${data.targetFundingGoal.toFixed(2)}</p>
//         </div>
//       </div>

//       <div className="flex items-center space-x-3">
//         <Checkbox id="confirm" checked={confirmed} onCheckedChange={(checked) => setConfirmed(checked === true)} />
//         <label htmlFor="confirm" className="select-none">
//           I confirm that the information above is accurate and ready for submission.
//         </label>
//       </div>

//       {error && <p className="text-red-600">{error}</p>}

//       <div className="flex justify-between">
//         <Button variant="outline" onClick={onPrev} disabled={loading}>
//           Previous
//         </Button>
//         <Button onClick={onSubmit} disabled={isSubmitDisabled}>
//           {loading ? "Submitting..." : "Submit Project"}
//         </Button>
//       </div>
//     </div>
//   );
// }





// import React, { useState } from "react";
// import { Button } from "@/components/ui/button";
// import { Checkbox } from "@/components/ui/checkbox";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { Separator } from "@/components/ui/separator";
// import { Alert, AlertDescription } from "@/components/ui/alert";
// import {
//   CheckCircle,
//   FileText,
//   TrendingUp,
//   Image as ImageIcon,
//   ArrowLeft,
//   Send,
//   Loader2,
//   AlertCircle,
//   Eye,
//   Building2,
//   Tag,
//   DollarSign,
//   Target,
//   Share,
//   Calculator,
//   Laptop,
//   Heart,
//   GraduationCap,
//   ShoppingBag,
//   Factory,
//   Wheat,
//   Zap,
//   Leaf,
//   Home,
//   Film,
//   Truck,
//   UtensilsCrossed,
//   MoreHorizontal,
// } from "lucide-react";

// const categoryIcons = {
//   technology: Laptop,
//   healthcare: Heart,
//   finance: DollarSign,
//   education: GraduationCap,
//   retail: ShoppingBag,
//   manufacturing: Factory,
//   agriculture: Wheat,
//   energy: Zap,
//   cleantech: Leaf,
//   real_estate: Home,
//   entertainment: Film,
//   transportation: Truck,
//   food_beverage: UtensilsCrossed,
//   other: MoreHorizontal,
// } as const;

// interface Step3Props {
//   data: {
//     name: string;
//     description: string;
//     category: string;
//     coverImageUrl: string;
//     stockSupply: number;
//     pricePerStock: number;
//     targetFundingGoal: number;
//   };
//   onPrev: () => void;
//   onSubmit: () => void;
//   loading: boolean;
//   error: string | null;
// }

// export function Step3ReviewPublish({ data, onPrev, onSubmit, loading, error }: Step3Props) {
//   const [confirmed, setConfirmed] = useState(false);

//   const isSubmitDisabled = loading || !confirmed;

//   const formatCurrency = (amount: number) => {
//     return new Intl.NumberFormat('en-US', {
//       style: 'currency',
//       currency: 'USD',
//       minimumFractionDigits: 2,
//     }).format(amount);
//   };

//   const getCategoryIcon = (category: string) => {
//     return categoryIcons[category as keyof typeof categoryIcons] || MoreHorizontal;
//   };

//   const getCategoryLabel = (category: string) => {
//     return category.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase());
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
//     // <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
//     //   {/* Header */}
//     //   <div className="mb-6 sm:mb-8">
//     //     <div className="flex items-center gap-3 mb-4">
//     //       <div className="p-2 bg-primary/10 rounded-lg">
//     //         <CheckCircle className="h-5 w-5 text-primary" />
//     //       </div>
//     //       <div>
//     //         <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
//     //           Review & Publish
//     //         </h1>
//     //         <p className="text-sm sm:text-base text-muted-foreground">
//     //           Step 3 of 3 - Final Review
//     //         </p>
//     //       </div>
//     //     </div>

//     //     {/* Completion Indicator */}
//     //     <div className="flex items-center gap-3 p-3 sm:p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
//     //       <CheckCircle className="h-5 w-5 text-emerald-600" />
//     //       <div className="flex-1">
//     //         <div className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
//     //           Project Setup Complete
//     //         </div>
//     //         <div className="text-xs text-emerald-600 dark:text-emerald-400">
//     //           Ready for submission
//     //         </div>
//     //       </div>
//     //       <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
//     //         100%
//     //       </Badge>
//     //     </div>
//     //   </div>

//     //   <div className="space-y-6">
//     //     {/* Project Information Review */}
//     //     <Card className="border border-border">
//     //       <CardHeader className="p-4 sm:p-6">
//     //         <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
//     //           <FileText className="h-4 w-4" />
//     //           Project Information
//     //         </CardTitle>
//     //       </CardHeader>
//     //       <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
//     //         {/* Project Name */}
//     //         <div className="space-y-2">
//     //           <div className="flex items-center gap-2">
//     //             <Building2 className="h-4 w-4 text-muted-foreground" />
//     //             <span className="text-sm font-medium text-muted-foreground">Project Name</span>
//     //           </div>
//     //           <div className="text-base text-foreground font-medium">
//     //             {data.name}
//     //           </div>
//     //         </div>

//     //         <Separator />

//     //         {/* Description */}
//     //         <div className="space-y-2">
//     //           <div className="flex items-center gap-2">
//     //             <FileText className="h-4 w-4 text-muted-foreground" />
//     //             <span className="text-sm font-medium text-muted-foreground">Description</span>
//     //           </div>
//     //           <div className="text-sm text-foreground leading-relaxed bg-muted/30 p-3 rounded-lg">
//     //             {data.description}
//     //           </div>
//     //         </div>

//     //         <Separator />

//     //         {/* Category */}
//     //         <div className="space-y-2">
//     //           <div className="flex items-center gap-2">
//     //             <Tag className="h-4 w-4 text-muted-foreground" />
//     //             <span className="text-sm font-medium text-muted-foreground">Category</span>
//     //           </div>
//     //           <div className="flex items-center gap-2">
//     //             {React.createElement(getCategoryIcon(data.category), { 
//     //               className: "h-4 w-4 text-primary" 
//     //             })}
//     //             <span className="text-base text-foreground font-medium">
//     //               {getCategoryLabel(data.category)}
//     //             </span>
//     //           </div>
//     //         </div>
//     //       </CardContent>
//     //     </Card>

//     //     {/* Visual Assets Review */}
//     //     <Card className="border border-border">
//     //       <CardHeader className="p-4 sm:p-6">
//     //         <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
//     //           <ImageIcon className="h-4 w-4" />
//     //           Visual Assets
//     //         </CardTitle>
//     //       </CardHeader>
//     //       <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
//     //         <div className="space-y-2">
//     //           <div className="flex items-center gap-2">
//     //             <Eye className="h-4 w-4 text-muted-foreground" />
//     //             <span className="text-sm font-medium text-muted-foreground">Cover Image</span>
//     //           </div>
//     //           <div className="border border-border rounded-lg p-2 bg-muted/20">
//     //             <img
//     //               src={data.coverImageUrl}
//     //               alt="Project cover preview"
//     //               className="w-full h-32 sm:h-40 object-cover rounded-md"
//     //               onError={(e) => {
//     //                 const target = e.target as HTMLImageElement;
//     //                 target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Crect width='400' height='200' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='14' fill='%236b7280' text-anchor='middle' dy='0.35em'%3EImage not available%3C/text%3E%3C/svg%3E";
//     //               }}
//     //             />
//     //           </div>
//     //           <div className="text-xs text-muted-foreground">
//     //             {data.coverImageUrl}
//     //           </div>
//     //         </div>
//     //       </CardContent>
//     //     </Card>

//     //     {/* Financial Structure Review */}
//     //     <Card className="border border-border">
//     //       <CardHeader className="p-4 sm:p-6">
//     //         <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
//     //           <TrendingUp className="h-4 w-4" />
//     //           Financial Structure
//     //         </CardTitle>
//     //       </CardHeader>
//     //       <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
//     //         {/* Share Details */}
//     //         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//     //           <div className="space-y-2">
//     //             <div className="flex items-center gap-2">
//     //               <Share className="h-4 w-4 text-muted-foreground" />
//     //               <span className="text-sm font-medium text-muted-foreground">Share Supply</span>
//     //             </div>
//     //             <div className="text-lg font-semibold text-foreground">
//     //               {data.stockSupply.toLocaleString()} shares
//     //             </div>
//     //           </div>

//     //           <div className="space-y-2">
//     //             <div className="flex items-center gap-2">
//     //               <DollarSign className="h-4 w-4 text-muted-foreground" />
//     //               <span className="text-sm font-medium text-muted-foreground">Price per Share</span>
//     //             </div>
//     //             <div className="text-lg font-semibold text-foreground">
//     //               {formatCurrency(data.pricePerStock)}
//     //             </div>
//     //           </div>
//     //         </div>

//     //         <Separator />

//     //         {/* Funding Goals */}
//     //         <div className="space-y-4">
//     //           <div className="space-y-2">
//     //             <div className="flex items-center gap-2">
//     //               <Target className="h-4 w-4 text-muted-foreground" />
//     //               <span className="text-sm font-medium text-muted-foreground">Funding Goal</span>
//     //             </div>
//     //             <div className="text-xl font-semibold text-foreground">
//     //               {formatCurrency(data.targetFundingGoal)}
//     //             </div>
//     //           </div>

//     //           {/* Financial Summary */}
//     //           <div className="bg-muted/30 p-4 rounded-lg space-y-3">
//     //             <div className="flex items-center gap-2 text-sm font-medium text-foreground">
//     //               <Calculator className="h-4 w-4" />
//     //               Financial Summary
//     //             </div>
                
//     //             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
//     //               <div>
//     //                 <span className="text-muted-foreground">Maximum Raise:</span>
//     //                 <div className="font-semibold text-foreground">
//     //                   {formatCurrency(calculateMaxRaise())}
//     //                 </div>
//     //               </div>
//     //               <div>
//     //                 <span className="text-muted-foreground">Goal Achievement:</span>
//     //                 <div className="font-semibold text-foreground">
//     //                   {getFundingProgress().toFixed(1)}% of max
//     //                 </div>
//     //               </div>
//     //             </div>

//     //             <div className="space-y-2">
//     //               <div className="w-full bg-muted rounded-full h-2">
//     //                 <div 
//     //                   className="bg-primary h-2 rounded-full transition-all duration-300"
//     //                   style={{ width: `${getFundingProgress()}%` }}
//     //                 />
//     //               </div>
//     //             </div>
//     //           </div>
//     //         </div>
//     //       </CardContent>
//     //     </Card>

//     //     {/* Confirmation */}
//     //     <Card className="border border-border">
//     //       <CardContent className="p-4 sm:p-6">
//     //         <div className="flex items-start gap-3">
//     //           <Checkbox 
//     //             id="confirm" 
//     //             checked={confirmed} 
//     //             onCheckedChange={(checked) => setConfirmed(checked === true)}
//     //             className="mt-0.5"
//     //           />
//     //           <div className="space-y-1">
//     //             <label 
//     //               htmlFor="confirm" 
//     //               className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
//     //             >
//     //               I confirm that all information is accurate and ready for submission
//     //             </label>
//     //             <p className="text-xs text-muted-foreground">
//     //               By checking this box, you acknowledge that the project details and financial structure have been reviewed and are correct.
//     //             </p>
//     //           </div>
//     //         </div>
//     //       </CardContent>
//     //     </Card>

//     //     {/* Error Display */}
//     //     {error && (
//     //       <Alert variant="destructive">
//     //         <AlertCircle className="h-4 w-4" />
//     //         <AlertDescription>
//     //           {error}
//     //         </AlertDescription>
//     //       </Alert>
//     //     )}

//     //     <Separator />

//     //     {/* Actions */}
//     //     <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-between">
//     //       <Button
//     //         type="button"
//     //         variant="outline"
//     //         onClick={onPrev}
//     //         disabled={loading}
//     //         className="w-full sm:w-auto h-10"
//     //       >
//     //         <ArrowLeft className="h-4 w-4 mr-2" />
//     //         Previous
//     //       </Button>
          
//     //       <Button
//     //         onClick={onSubmit}
//     //         disabled={isSubmitDisabled}
//     //         className="w-full sm:w-auto h-10"
//     //       >
//     //         {loading ? (
//     //           <>
//     //             <Loader2 className="h-4 w-4 mr-2 animate-spin" />
//     //             Publishing...
//     //           </>
//     //         ) : (
//     //           <>
//     //             <Send className="h-4 w-4 mr-2" />
//     //             Publish Project
//     //           </>
//     //         )}
//     //       </Button>
//     //     </div>

//     //     {/* Success Message Preview */}
//     //     {!loading && confirmed && (
//     //       <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
//     //         <div className="flex items-start gap-3">
//     //           <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
//     //           <div className="space-y-1">
//     //             <div className="text-sm font-medium text-foreground">
//     //               Ready to Publish
//     //             </div>
//     //             <div className="text-xs text-muted-foreground">
//     //               Your project "{data.name}" is ready to be submitted. Click "Publish Project" to proceed.
//     //             </div>
//     //           </div>
//     //         </div>
//     //       </div>
//     //     )}
//     //   </div>
//     // </div>

   
//   <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">

//     {/* Header & Completion Status */}
//     <div>
//       <div className="flex items-center gap-3 mb-4">
//         <div className="p-2 bg-primary/10 rounded-lg">
//           <CheckCircle className="h-5 w-5 text-primary" />
//         </div>
//         <div>
//           <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
//             Review & Publish
//           </h1>
//           <p className="text-sm sm:text-base text-muted-foreground">
//             Step 3 of 3 - Final Review
//           </p>
//         </div>
//       </div>
//       <div className="flex items-center gap-3 p-3 sm:p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
//         <CheckCircle className="h-5 w-5 text-emerald-600" />
//         <div className="flex-1">
//           <div className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
//             Project Setup Complete
//           </div>
//           <div className="text-xs text-emerald-600 dark:text-emerald-400">
//             Ready for submission
//           </div>
//         </div>
//         <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
//           100%
//         </Badge>
//       </div>
//     </div>

//     {/* Project Info & Visual Assets in a row */}
//     <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
//       {/* Project Information */}
//       <Card className="border border-border">
//         <CardHeader className="p-4 sm:p-6">
//           <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
//             <FileText className="h-4 w-4" />
//             Project Information
//           </CardTitle>
//         </CardHeader>
//         <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
//           <div>
//             <div className="flex items-center gap-2">
//               <Building2 className="h-4 w-4 text-muted-foreground" />
//               <span className="text-sm font-medium text-muted-foreground">Project Name</span>
//             </div>
//             <div className="text-base text-foreground font-medium">{data.name}</div>
//           </div>
//           <Separator />
//           <div>
//             <div className="flex items-center gap-2">
//               <FileText className="h-4 w-4 text-muted-foreground" />
//               <span className="text-sm font-medium text-muted-foreground">Description</span>
//             </div>
//             <div className="text-sm text-foreground leading-relaxed bg-muted/30 p-3 rounded-lg">{data.description}</div>
//           </div>
//           <Separator />
//           <div>
//             <div className="flex items-center gap-2">
//               <Tag className="h-4 w-4 text-muted-foreground" />
//               <span className="text-sm font-medium text-muted-foreground">Category</span>
//             </div>
//             <div className="flex items-center gap-2">
//               {React.createElement(getCategoryIcon(data.category), { className: "h-4 w-4 text-primary" })}
//               <span className="text-base text-foreground font-medium">{getCategoryLabel(data.category)}</span>
//             </div>
//           </div>
//         </CardContent>
//       </Card>

//       {/* Visual Assets */}
//       <Card className="border border-border">
//         <CardHeader className="p-4 sm:p-6">
//           <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
//             <ImageIcon className="h-4 w-4" />
//             Visual Assets
//           </CardTitle>
//         </CardHeader>
//         <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
//           <div>
//             <div className="flex items-center gap-2">
//               <Eye className="h-4 w-4 text-muted-foreground" />
//               <span className="text-sm font-medium text-muted-foreground">Cover Image</span>
//             </div>
//             <div className="border border-border rounded-lg p-2 bg-muted/20">
//               <img
//                 src={data.coverImageUrl}
//                 alt="Project cover preview"
//                 className="w-full h-32 sm:h-40 object-cover rounded-md"
//                 onError={(e) => ((e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Crect width='400' height='200' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='14' fill='%236b7280' text-anchor='middle' dy='0.35em'%3EImage not available%3C/text%3E%3C/svg%3E")} 
//               />
//             </div>
//             <div className="text-xs text-muted-foreground">{data.coverImageUrl}</div>
//           </div>
//         </CardContent>
//       </Card>
//     </div>

//     {/* Financial Structure Section */}
//     <Card className="border border-border">
//       <CardHeader className="p-4 sm:p-6">
//         <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
//           <TrendingUp className="h-4 w-4" />
//           Financial Structure
//         </CardTitle>
//       </CardHeader>
//       <CardContent className="p-4 sm:p-6 pt-0 space-y-6">
//         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//           <div>
//             <div className="flex items-center gap-2 text-sm text-muted-foreground">
//               <Share className="h-4 w-4" />
//               <span>Share Supply</span>
//             </div>
//             <div className="text-lg font-semibold text-foreground">
//               {data.stockSupply.toLocaleString()} shares
//             </div>
//           </div>

//           <div>
//             <div className="flex items-center gap-2 text-sm text-muted-foreground">
//               <DollarSign className="h-4 w-4" />
//               <span>Price per Share</span>
//             </div>
//             <div className="text-lg font-semibold text-foreground">
//               {formatCurrency(data.pricePerStock)}
//             </div>
//           </div>
//         </div>

//         <Separator />

//         <div className="space-y-4">
//           <div>
//             <div className="flex items-center gap-2 text-sm text-muted-foreground">
//               <Target className="h-4 w-4" />
//               <span>Funding Goal</span>
//             </div>
//             <div className="text-xl font-semibold text-foreground">
//               {formatCurrency(data.targetFundingGoal)}
//             </div>
//           </div>

//           <div className="bg-muted/30 p-4 rounded-lg space-y-3">
//             <div className="flex items-center gap-2 text-sm font-medium text-foreground">
//               <Calculator className="h-4 w-4" />
//               Financial Summary
//             </div>

//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
//               <div>
//                 <span className="text-muted-foreground">Maximum Raise:</span>
//                 <div className="font-semibold text-foreground">{formatCurrency(calculateMaxRaise())}</div>
//               </div>
//               <div>
//                 <span className="text-muted-foreground">Goal Achievement:</span>
//                 <div className="font-semibold text-foreground">{getFundingProgress().toFixed(1)}% of max</div>
//               </div>
//             </div>

//             <div className="w-full bg-muted rounded-full h-2">
//               <div 
//                 className="bg-primary h-2 rounded-full transition-all duration-300"
//                 style={{ width: `${getFundingProgress()}%` }}
//               />
//             </div>
//           </div>
//         </div>
//       </CardContent>
//     </Card>
   

//     {/* Confirmation */}
//     <Card className="border border-border">
//       <CardContent className="p-4 sm:p-6">
//         <div className="flex items-start gap-3">
//           <Checkbox 
//             id="confirm" 
//             checked={confirmed} 
//             onCheckedChange={(checked) => setConfirmed(checked === true)}
//             className="mt-0.5"
//           />
//           <div className="space-y-1">
//             <label 
//               htmlFor="confirm" 
//               className="text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
//             >
//               I confirm that all information is accurate and ready for submission
//             </label>
//             <p className="text-xs text-muted-foreground">
//               By checking this box, you acknowledge that the project details and financial structure have been reviewed and are correct.
//             </p>
//           </div>
//         </div>
//       </CardContent>
//     </Card>

//     {/* Error Alert */}
//     {error && (
//       <Alert variant="destructive">
//         <AlertCircle className="h-4 w-4" />
//         <AlertDescription>{error}</AlertDescription>
//       </Alert>
//     )}

//     <Separator />

//     {/* Actions */}
//     <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-between">
//       <Button
//         type="button"
//         variant="outline"
//         onClick={onPrev}
//         disabled={loading}
//         className="w-full sm:w-auto h-10"
//       >
//         <ArrowLeft className="h-4 w-4 mr-2" />
//         Previous
//       </Button>

//       <Button
//         onClick={onSubmit}
//         disabled={loading || !confirmed}
//         className="w-full sm:w-auto h-10"
//       >
//         {loading ? (
//           <>
//             <Loader2 className="h-4 w-4 mr-2 animate-spin" />
//             Publishing...
//           </>
//         ) : (
//           <>
//             <Send className="h-4 w-4 mr-2" />
//             Publish Project
//           </>
//         )}
//       </Button>
//     </div>

//     {/* Success Message Preview */}
//     {!loading && confirmed && (
//       <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
//         <div className="flex items-start gap-3">
//           <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
//           <div className="space-y-1">
//             <div className="text-sm font-medium text-foreground">
//               Ready to Publish
//             </div>
//             <div className="text-xs text-muted-foreground">
//               Your project "{data.name}" is ready to be submitted. Click "Publish Project" to proceed.
//             </div>
//           </div>
//         </div>
//       </div>
//     )}
//   </div>
// );

// }





import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  FileText,
  TrendingUp,
  Image as ImageIcon,
  ArrowLeft,
  Send,
  Loader2,
  AlertCircle,
  Eye,
  Building2,
  Tag,
  DollarSign,
  Target,
  Share,
  Calculator,
  Laptop,
  Heart,
  GraduationCap,
  ShoppingBag,
  Factory,
  Wheat,
  Zap,
  Leaf,
  Home,
  Film,
  Truck,
  UtensilsCrossed,
  MoreHorizontal,
} from "lucide-react";

const categoryIcons = {
  technology: Laptop,
  healthcare: Heart,
  finance: DollarSign,
  education: GraduationCap,
  retail: ShoppingBag,
  manufacturing: Factory,
  agriculture: Wheat,
  energy: Zap,
  cleantech: Leaf,
  real_estate: Home,
  entertainment: Film,
  transportation: Truck,
  food_beverage: UtensilsCrossed,
  other: MoreHorizontal,
} as const;

interface Step3Props {
  data: {
    name: string;
    description: string;
    category: string;
    coverImageUrl: string;
    stockSupply: number;
    pricePerStock: number;
    targetFundingGoal: number;
  };
  onPrev: () => void;
  onSubmit: () => void;
  loading: boolean;
  error: string | null;
}

export function Step3ReviewPublish({ data, onPrev, onSubmit, loading, error }: Step3Props) {
  const [confirmed, setConfirmed] = useState(false);

  const isSubmitDisabled = loading || !confirmed;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getCategoryIcon = (category: string) => {
    return categoryIcons[category as keyof typeof categoryIcons] || MoreHorizontal;
  };

  const getCategoryLabel = (category: string) => {
    return category.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase());
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <CheckCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
              Review & Publish
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Step 3 of 3 - Final Review
            </p>
          </div>
        </div>

        {/* Completion Badge */}
        <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 px-4 py-2">
          <CheckCircle className="h-4 w-4 mr-2" />
          Ready to Publish
        </Badge>
      </div>

      {/* Main Content Grid - 3 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Project Information */}
        <Card className="border border-border">
          <CardHeader className="p-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Project Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Project Name</span>
              </div>
              <div className="text-base text-foreground font-medium">{data.name}</div>
            </div>

            <Separator />

            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Description</span>
              </div>
              <div className="text-sm text-foreground leading-relaxed bg-muted/30 p-3 rounded-lg line-clamp-4">
                {data.description}
              </div>
            </div>

            <Separator />

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Category</span>
              </div>
              <div className="flex items-center gap-2">
                {React.createElement(getCategoryIcon(data.category), { className: "h-4 w-4 text-primary" })}
                <span className="text-base text-foreground font-medium">{getCategoryLabel(data.category)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Column 2: Visual Assets */}
        <Card className="border border-border">
          <CardHeader className="p-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <ImageIcon className="h-4 w-4" />
              Visual Assets
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Cover Image</span>
              </div>
              <div className="border border-border rounded-lg p-2 bg-muted/20">
                <img
                  src={data.coverImageUrl}
                  alt="Project cover preview"
                  className="w-full h-48 object-cover rounded-md"
                  onError={(e) => ((e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Crect width='400' height='200' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='14' fill='%236b7280' text-anchor='middle' dy='0.35em'%3EImage not available%3C/text%3E%3C/svg%3E")} 
                />
              </div>
              <div className="text-xs text-muted-foreground mt-2 truncate">{data.coverImageUrl}</div>
            </div>
          </CardContent>
        </Card>

        {/* Column 3: Financial Overview */}
        <Card className="border border-border">
          <CardHeader className="p-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Financial Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Share className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Share Supply</span>
                </div>
                <div className="text-lg font-semibold text-foreground">
                  {data.stockSupply.toLocaleString()}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Price per Share</span>
                </div>
                <div className="text-lg font-semibold text-foreground">
                  {formatCurrency(data.pricePerStock)}
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Funding Goal</span>
                </div>
                <div className="text-xl font-semibold text-foreground">
                  {formatCurrency(data.targetFundingGoal)}
                </div>
              </div>

              <div className="bg-muted/30 p-3 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                  <Calculator className="h-3 w-3" />
                  Summary
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Raise:</span>
                    <span className="font-semibold text-foreground">{formatCurrency(calculateMaxRaise())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Achievement:</span>
                    <span className="font-semibold text-foreground">{getFundingProgress().toFixed(1)}%</span>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getFundingProgress()}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation & Actions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Confirmation */}
        <Card className="border border-border">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <Checkbox 
                id="confirm" 
                checked={confirmed} 
                onCheckedChange={(checked) => setConfirmed(checked === true)}
                className="mt-0.5"
              />
              <div className="space-y-1">
                <label 
                  htmlFor="confirm" 
                  className="text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I confirm that all information is accurate and ready for submission
                </label>
                <p className="text-xs text-muted-foreground">
                  By checking this box, you acknowledge that the project details and financial structure have been reviewed and are correct.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions Card */}
        <Card className="border border-border bg-muted/20">
          <CardContent className="p-4 sm:p-6 flex items-center justify-between gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={onPrev}
              disabled={loading}
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <Button
              onClick={onSubmit}
              disabled={loading || !confirmed}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Publish Project
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Message Preview */}
      {!loading && confirmed && (
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
            <div className="space-y-1">
              <div className="text-sm font-medium text-foreground">
                Ready to Publish
              </div>
              <div className="text-xs text-muted-foreground">
                Your project "{data.name}" is ready to be submitted. Click "Publish Project" to proceed.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
