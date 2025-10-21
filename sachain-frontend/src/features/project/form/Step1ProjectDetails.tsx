// import React, { useState } from "react";
// import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Button } from "@/components/ui/button";
// import { Label } from "@/components/ui/label";

// const categories = [
//   "technology",
//   "healthcare",
//   "finance",
//   "education",
//   "retail",
//   "manufacturing",
//   "agriculture",
//   "energy",
//   "cleantech",
//   "real_estate",
//   "entertainment",
//   "transportation",
//   "food_beverage",
//   "other",
// ] as const;

// interface Step1Props {
//   data: {
//     name: string;
//     description: string;
//     category: string;
//     coverImageUrl: string;
//   };
//   onChange: (fields: Partial<Step1Props["data"]>) => void;
//   onNext: () => void;
// }

// export function Step1ProjectDetails({ data, onChange, onNext }: Step1Props) {
//   const [errors, setErrors] = useState<Record<string, string>>({});

//   const validate = () => {
//     const newErrors: Record<string, string> = {};
//     if (!data.name.trim()) newErrors.name = "Project name is required";
//     if (!data.description.trim() || data.description.length < 50)
//       newErrors.description = "Description must be at least 50 characters";
//     if (!categories.includes(data.category as typeof categories[number]))
//       newErrors.category = "Please select a valid category";
//     if (!data.coverImageUrl.trim()) newErrors.coverImageUrl = "Cover image URL is required";
//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const handleNext = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (validate()) {
//       onNext();
//     }
//   };

//   return (
//     <form onSubmit={handleNext} className="space-y-6">
//       <div>
//         <Label htmlFor="name">Project Name</Label>
//         <Input
//           id="name"
//           value={data.name}
//           onChange={(e) => onChange({ name: e.target.value })}
//           className={errors.name ? "border-red-600" : ""}
//         />
//         {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
//       </div>

//       <div>
//         <Label htmlFor="description">Description</Label>
//         <Textarea
//           id="description"
//           value={data.description}
//           onChange={(e) => onChange({ description: e.target.value })}
//           rows={4}
//           className={errors.description ? "border-red-600" : ""}
//           placeholder="At least 50 characters describing your project"
//         />
//         {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
//       </div>

//       <div>
//         <Label htmlFor="category">Category</Label>
//         <Select
//           value={data.category}
//           onValueChange={(value) => onChange({ category: value })}
//         >
//           <SelectTrigger className={errors.category ? "border-red-600" : ""}>
//             <SelectValue placeholder="Select a category" />
//           </SelectTrigger>
//           <SelectContent>
//             {categories.map((cat) => (
//               <SelectItem key={cat} value={cat}>
//                 {cat.replace("_", " ")}
//               </SelectItem>
//             ))}
//           </SelectContent>
//         </Select>
//         {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
//       </div>

//       <div>
//         <Label htmlFor="coverImageUrl">Cover Image URL</Label>
//         <Input
//           id="coverImageUrl"
//           type="url"
//           placeholder="https://example.com/image.jpg"
//           value={data.coverImageUrl}
//           onChange={(e) => onChange({ coverImageUrl: e.target.value })}
//           className={errors.coverImageUrl ? "border-red-600" : ""}
//         />
//         {errors.coverImageUrl && <p className="mt-1 text-sm text-red-600">{errors.coverImageUrl}</p>}
//       </div>

//       <div className="flex justify-end">
//         <Button type="submit">Next</Button>
//       </div>
//     </form>
//   );
// }





// import React, { useState } from "react";
// import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Button } from "@/components/ui/button";
// import { Label } from "@/components/ui/label";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { Separator } from "@/components/ui/separator";
// import {
//   Building2,
//   FileText,
//   Tag,
//   Image,
//   ArrowRight,
//   AlertCircle,
//   CheckCircle2,
//   Info,
//   Laptop,
//   Heart,
//   DollarSign,
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

// const categories = [
//   { value: "technology", label: "Technology", icon: Laptop },
//   { value: "healthcare", label: "Healthcare", icon: Heart },
//   { value: "finance", label: "Finance", icon: DollarSign },
//   { value: "education", label: "Education", icon: GraduationCap },
//   { value: "retail", label: "Retail", icon: ShoppingBag },
//   { value: "manufacturing", label: "Manufacturing", icon: Factory },
//   { value: "agriculture", label: "Agriculture", icon: Wheat },
//   { value: "energy", label: "Energy", icon: Zap },
//   { value: "cleantech", label: "Clean Tech", icon: Leaf },
//   { value: "real_estate", label: "Real Estate", icon: Home },
//   { value: "entertainment", label: "Entertainment", icon: Film },
//   { value: "transportation", label: "Transportation", icon: Truck },
//   { value: "food_beverage", label: "Food & Beverage", icon: UtensilsCrossed },
//   { value: "other", label: "Other", icon: MoreHorizontal },
// ] as const;

// interface Step1Props {
//   data: {
//     name: string;
//     description: string;
//     category: string;
//     coverImageUrl: string;
//   };
//   onChange: (fields: Partial<Step1Props["data"]>) => void;
//   onNext: () => void;
// }

// export function Step1ProjectDetails({ data, onChange, onNext }: Step1Props) {
//   const [errors, setErrors] = useState<Record<string, string>>({});

//   const validate = () => {
//     const newErrors: Record<string, string> = {};
//     if (!data.name.trim()) newErrors.name = "Project name is required";
//     if (!data.description.trim() || data.description.length < 50)
//       newErrors.description = "Description must be at least 50 characters";
//     if (!categories.find(cat => cat.value === data.category))
//       newErrors.category = "Please select a valid category";
//     if (!data.coverImageUrl.trim()) newErrors.coverImageUrl = "Cover image URL is required";
    
//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const handleNext = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (validate()) {
//       onNext();
//     }
//   };

//   const getSelectedCategory = () => {
//     return categories.find(cat => cat.value === data.category);
//   };

//   const isFieldValid = (field: string) => {
//     switch (field) {
//       case 'name':
//         return data.name.trim().length > 0;
//       case 'description':
//         return data.description.trim().length >= 50;
//       case 'category':
//         return categories.some(cat => cat.value === data.category);
//       case 'coverImageUrl':
//         return data.coverImageUrl.trim().length > 0;
//       default:
//         return false;
//     }
//   };

//   const getCompletionPercentage = () => {
//     const fields = ['name', 'description', 'category', 'coverImageUrl'];
//     const validFields = fields.filter(field => isFieldValid(field)).length;
//     return Math.round((validFields / fields.length) * 100);
//   };

//   return (
//     <div className="max-w-2xl  mx-auto px-2 sm:px-3 py-3 sm:py-4">
//       {/* Header */}
//       <div className="mb-6 sm:mb-8">
//         <div className="flex items-center gap-3 mb-4">
//           <div className="p-2 bg-primary/10 rounded-lg">
//             <Building2 className="h-5 w-5 text-primary" />
//           </div>
//           <div>
//             <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
//               Project Details
//             </h1>
//             <p className="text-sm sm:text-base text-muted-foreground">
//               Step 1 of 3 - Basic Information
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
//   <div className="flex flex-wrap gap-6">
//     {/* Project Name */}
//     <div className="flex-1 min-w-[220px]">
//       <Label htmlFor="name">Project Name *</Label>
//       <Input
//         id="name"
//         value={data.name}
//         onChange={(e) => onChange({ name: e.target.value })}
//         className={errors.name ? "border-red-600" : ""}
//         placeholder="Enter your project name"
//       />
//       {errors.name && (
//         <p className="mt-1 text-sm text-red-600">{errors.name}</p>
//       )}
//     </div>

//     {/* Description */}
//     <div className="flex-1 min-w-[300px]">
//       <Label htmlFor="description">Description *</Label>
//       <Textarea
//         id="description"
//         value={data.description}
//         onChange={(e) => onChange({ description: e.target.value })}
//         rows={4}
//         className={errors.description ? "border-red-600" : ""}
//         placeholder="At least 50 characters describing your project"
//       />
//       {errors.description && (
//         <p className="mt-1 text-sm text-red-600">{errors.description}</p>
//       )}
//     </div>

//     {/* Category */}
//     <div className="flex-1 min-w-[220px]">
//       <Label htmlFor="category">Category *</Label>
//       <Select
//         value={data.category}
//         onValueChange={(value) => onChange({ category: value })}
//       >
//         <SelectTrigger className={errors.category ? "border-red-600" : ""}>
//           <SelectValue placeholder="Select a category" />
//         </SelectTrigger>
//         <SelectContent>
//           {categories.map((cat) => (
//             <SelectItem key={cat.value} value={cat.value}>
//               {cat.label}
//             </SelectItem>
//           ))}
//         </SelectContent>
//       </Select>
//       {errors.category && (
//         <p className="mt-1 text-sm text-red-600">{errors.category}</p>
//       )}
//     </div>

//     {/* Cover Image URL */}
//     <div className="flex-1 min-w-[220px]">
//       <Label htmlFor="coverImageUrl">Cover Image URL *</Label>
//       <Input
//         id="coverImageUrl"
//         type="url"
//         placeholder="https://example.com/image.jpg"
//         value={data.coverImageUrl}
//         onChange={(e) => onChange({ coverImageUrl: e.target.value })}
//         className={errors.coverImageUrl ? "border-red-600" : ""}
//       />
//       {errors.coverImageUrl && (
//         <p className="mt-1 text-sm text-red-600">{errors.coverImageUrl}</p>
//       )}
//     </div>
//   </div>

//   {/* Continue Button */}
//   <div className="flex justify-end mt-6">
//     <Button type="submit">Next</Button>
//   </div>
// </form>

//     </div>
//   );
// }




import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  FileText,
  Tag,
  Image,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Info,
  Laptop,
  Heart,
  DollarSign,
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
  Eye,
  Sparkles,
} from "lucide-react";

const categories = [
  { value: "technology", label: "Technology", icon: Laptop },
  { value: "healthcare", label: "Healthcare", icon: Heart },
  { value: "finance", label: "Finance", icon: DollarSign },
  { value: "education", label: "Education", icon: GraduationCap },
  { value: "retail", label: "Retail", icon: ShoppingBag },
  { value: "manufacturing", label: "Manufacturing", icon: Factory },
  { value: "agriculture", label: "Agriculture", icon: Wheat },
  { value: "energy", label: "Energy", icon: Zap },
  { value: "cleantech", label: "Clean Tech", icon: Leaf },
  { value: "real_estate", label: "Real Estate", icon: Home },
  { value: "entertainment", label: "Entertainment", icon: Film },
  { value: "transportation", label: "Transportation", icon: Truck },
  { value: "food_beverage", label: "Food & Beverage", icon: UtensilsCrossed },
  { value: "other", label: "Other", icon: MoreHorizontal },
] as const;

interface Step1Props {
  data: {
    name: string;
    description: string;
    category: string;
    coverImageUrl: string;
  };
  onChange: (fields: Partial<Step1Props["data"]>) => void;
  onNext: () => void;
}

export function Step1ProjectDetails({ data, onChange, onNext }: Step1Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imageError, setImageError] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!data.name.trim()) newErrors.name = "Project name is required";
    if (!data.description.trim() || data.description.length < 50)
      newErrors.description = "Description must be at least 50 characters";
    if (!categories.find(cat => cat.value === data.category))
      newErrors.category = "Please select a valid category";
    if (!data.coverImageUrl.trim()) newErrors.coverImageUrl = "Cover image URL is required";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onNext();
    }
  };

  const getSelectedCategory = () => {
    return categories.find(cat => cat.value === data.category);
  };

  const isFieldValid = (field: string) => {
    switch (field) {
      case 'name':
        return data.name.trim().length > 0;
      case 'description':
        return data.description.trim().length >= 50;
      case 'category':
        return categories.some(cat => cat.value === data.category);
      case 'coverImageUrl':
        return data.coverImageUrl.trim().length > 0;
      default:
        return false;
    }
  };

  const getCompletionPercentage = () => {
    const fields = ['name', 'description', 'category', 'coverImageUrl'];
    const validFields = fields.filter(field => isFieldValid(field)).length;
    return Math.round((validFields / fields.length) * 100);
  };

  const allFieldsValid = () => {
    return isFieldValid('name') && isFieldValid('description') && isFieldValid('category') && isFieldValid('coverImageUrl');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
              Project Details
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Step 1 of 3 - Basic Information
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
          {/* Left Column - Form Fields (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border border-border">
              <CardHeader className="p-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  Project Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-6">
                {/* Project Name */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      Project Name *
                    </Label>
                    {isFieldValid('name') && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    )}
                  </div>
                  <Input
                    id="name"
                    value={data.name}
                    onChange={(e) => onChange({ name: e.target.value })}
                    className={`h-12 ${errors.name ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    placeholder="Enter your project name"
                  />
                  {errors.name && (
                    <p className="mt-2 text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.name}
                    </p>
                  )}
                  {!errors.name && data.name && (
                    <p className="mt-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">
                      Project name: <span className="font-semibold text-foreground">{data.name}</span>
                    </p>
                  )}
                </div>

                <Separator />

                {/* Description */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="description" className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Description *
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {data.description.length}/50 min
                      </span>
                      {isFieldValid('description') && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      )}
                    </div>
                  </div>
                  <Textarea
                    id="description"
                    value={data.description}
                    onChange={(e) => onChange({ description: e.target.value })}
                    rows={5}
                    className={`resize-none ${errors.description ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    placeholder="Describe your project in at least 50 characters. Include key features, goals, and what makes it unique..."
                  />
                  {errors.description && (
                    <p className="mt-2 text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.description}
                    </p>
                  )}
                  {!errors.description && data.description.length >= 50 && (
                    <p className="mt-2 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Description meets minimum requirements
                    </p>
                  )}
                </div>

                <Separator />

                {/* Category & Cover Image Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Category */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="category" className="text-sm font-medium flex items-center gap-2">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        Category *
                      </Label>
                      {isFieldValid('category') && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      )}
                    </div>
                    <Select
                      value={data.category}
                      onValueChange={(value) => onChange({ category: value })}
                    >
                      <SelectTrigger className={`h-12 ${errors.category ? "border-destructive focus-visible:ring-destructive" : ""}`}>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => {
                          const Icon = cat.icon;
                          return (
                            <SelectItem key={cat.value} value={cat.value}>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                <span>{cat.label}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {errors.category && (
                      <p className="mt-2 text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {errors.category}
                      </p>
                    )}
                    {!errors.category && getSelectedCategory() && (
                      <p className="mt-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg flex items-center gap-1">
                        {React.createElement(getSelectedCategory()!.icon, { className: "h-3 w-3" })}
                        <span>{getSelectedCategory()!.label}</span>
                      </p>
                    )}
                  </div>

                  {/* Cover Image URL */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="coverImageUrl" className="text-sm font-medium flex items-center gap-2">
                        <Image className="h-4 w-4 text-muted-foreground" />
                        Cover Image URL *
                      </Label>
                      {isFieldValid('coverImageUrl') && !imageError && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      )}
                    </div>
                    <Input
                      id="coverImageUrl"
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      value={data.coverImageUrl}
                      onChange={(e) => {
                        onChange({ coverImageUrl: e.target.value });
                        setImageError(false);
                      }}
                      className={`h-12 ${errors.coverImageUrl ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    />
                    {errors.coverImageUrl && (
                      <p className="mt-2 text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {errors.coverImageUrl}
                      </p>
                    )}
                    {!errors.coverImageUrl && data.coverImageUrl && !imageError && (
                      <p className="mt-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        Image URL provided
                      </p>
                    )}
                    {imageError && (
                      <p className="mt-2 text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Failed to load image. Please check the URL.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Live Preview (1/3 width) */}
          <div className="lg:col-span-1">
            <Card className="border border-border sticky top-6">
              <CardHeader className="p-4 bg-gradient-to-br from-primary/5 to-accent/5">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Eye className="h-4 w-4" />
                  Live Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {allFieldsValid() ? (
                  <>
                    {/* Cover Image Preview */}
                    <div className="relative overflow-hidden rounded-lg border border-border">
                      <img
                        src={data.coverImageUrl}
                        alt="Project cover preview"
                        className="w-full h-40 object-cover"
                        onError={() => setImageError(true)}
                      />
                      {getSelectedCategory() && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-primary/90 text-primary-foreground backdrop-blur-sm flex items-center gap-1">
                            {React.createElement(getSelectedCategory()!.icon, { className: "h-3 w-3" })}
                            <span className="text-xs">{getSelectedCategory()!.label}</span>
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Project Name */}
                    <div>
                      <h3 className="font-semibold text-foreground line-clamp-2">
                        {data.name}
                      </h3>
                    </div>

                    {/* Description Preview */}
                    <div className="text-xs text-muted-foreground line-clamp-4 leading-relaxed bg-muted/30 p-3 rounded-lg">
                      {data.description}
                    </div>

                    <Separator />

                    {/* Preview Stats */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Status</span>
                        <Badge variant="secondary" className="text-xs">Draft</Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Fields Complete</span>
                        <span className="font-semibold text-foreground">{getCompletionPercentage()}%</span>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-foreground">
                          <span className="font-medium"> Continue to add financial details.</span>
                          
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Eye className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Complete all fields to see preview
                    </p>
                    <div className="mt-4 space-y-2">
                      {['name', 'description', 'category', 'coverImageUrl'].map((field) => (
                        <div key={field} className="flex items-center gap-2 text-xs">
                          {isFieldValid(field) ? (
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <div className="h-3 w-3 border-2 border-muted-foreground/30 rounded-full" />
                          )}
                          <span className={isFieldValid(field) ? "text-foreground" : "text-muted-foreground"}>
                            {field === 'name' ? 'Project Name' : 
                             field === 'description' ? 'Description' :
                             field === 'category' ? 'Category' :
                             'Cover Image'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <Card className="border border-border bg-muted/20">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="h-3 w-3" />
              <span>All fields are required to continue</span>
            </div>

            <Button
              type="submit"
              disabled={!allFieldsValid()}
              className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
            >
              Continue to Share Offering
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
