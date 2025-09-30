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

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-4">
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
              <FileText className="h-4 w-4" />
              Project Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-6">
            {/* Project Name */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="name" className="text-sm font-medium">
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
                className={`h-10 ${errors.name ? "border-destructive focus-visible:ring-destructive" : ""}`}
                placeholder="Enter your project name"
              />
              {errors.name && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {errors.name}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description" className="text-sm font-medium">
                  Project Description *
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
                rows={4}
                className={`resize-none ${errors.description ? "border-destructive focus-visible:ring-destructive" : ""}`}
                placeholder="Describe your project in detail. What problem does it solve? What makes it unique? (At least 50 characters)"
              />
              {errors.description && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {errors.description}
                </div>
              )}
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>
                  Provide a comprehensive description that potential investors can easily understand. 
                  Include your value proposition and target market.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Tag className="h-4 w-4" />
              Classification
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-6">
            {/* Category */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="category" className="text-sm font-medium">
                  Industry Category *
                </Label>
                {isFieldValid('category') && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                )}
              </div>
              <Select
                value={data.category}
                onValueChange={(value) => onChange({ category: value })}
              >
                <SelectTrigger className={`h-10 ${errors.category ? "border-destructive focus-visible:ring-destructive" : ""}`}>
                  <SelectValue placeholder="Select your industry category">
                    {getSelectedCategory() && (
                      <div className="flex items-center gap-2">
                        {(() => {
                          const Icon = getSelectedCategory()!.icon;
                          return <Icon className="h-4 w-4" />;
                        })()}
                        <span>{getSelectedCategory()?.label}</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div className="flex items-center gap-2">
                        <cat.icon className="h-4 w-4" />
                        <span>{cat.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {errors.category}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Image className="h-4 w-4" />
              Visual Assets
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-6">
            {/* Cover Image */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="coverImageUrl" className="text-sm font-medium">
                  Cover Image URL *
                </Label>
                {isFieldValid('coverImageUrl') && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                )}
              </div>
              <Input
                id="coverImageUrl"
                type="url"
                placeholder="https://example.com/image.jpg"
                value={data.coverImageUrl}
                onChange={(e) => onChange({ coverImageUrl: e.target.value })}
                className={`h-10 ${errors.coverImageUrl ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              {errors.coverImageUrl && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {errors.coverImageUrl}
                </div>
              )}
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>
                  Use a high-quality image that represents your project. 
                  Recommended size: 1200x630px for optimal display.
                </span>
              </div>

              {/* Image Preview */}
              {data.coverImageUrl && (
                <div className="mt-3">
                  <div className="text-sm font-medium mb-2">Preview:</div>
                  <div className="border border-border rounded-lg p-2 bg-muted/20">
                    <img
                      src={data.coverImageUrl}
                      alt="Cover preview"
                      className="w-full h-32 sm:h-40 object-cover rounded-md"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Crect width='400' height='200' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='14' fill='%236b7280' text-anchor='middle' dy='0.35em'%3EImage not found%3C/text%3E%3C/svg%3E";
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto h-10"
            disabled
          >
            Previous
          </Button>
          <Button
            type="submit"
            className="w-full sm:w-auto h-10"
          >
            Continue to Step 2
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </form>
    </div>
  );
}