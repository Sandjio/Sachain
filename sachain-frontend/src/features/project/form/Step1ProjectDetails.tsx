import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const categories = [
  "technology",
  "healthcare",
  "finance",
  "education",
  "retail",
  "manufacturing",
  "agriculture",
  "energy",
  "cleantech",
  "real_estate",
  "entertainment",
  "transportation",
  "food_beverage",
  "other",
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
    if (!categories.includes(data.category as typeof categories[number]))
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

  return (
    <form onSubmit={handleNext} className="space-y-6">
      <div>
        <Label htmlFor="name">Project Name</Label>
        <Input
          id="name"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className={errors.name ? "border-red-600" : ""}
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={4}
          className={errors.description ? "border-red-600" : ""}
          placeholder="At least 50 characters describing your project"
        />
        {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
      </div>

      <div>
        <Label htmlFor="category">Category</Label>
        <Select
          value={data.category}
          onValueChange={(value) => onChange({ category: value })}
        >
          <SelectTrigger className={errors.category ? "border-red-600" : ""}>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
      </div>

      <div>
        <Label htmlFor="coverImageUrl">Cover Image URL</Label>
        <Input
          id="coverImageUrl"
          type="url"
          placeholder="https://example.com/image.jpg"
          value={data.coverImageUrl}
          onChange={(e) => onChange({ coverImageUrl: e.target.value })}
          className={errors.coverImageUrl ? "border-red-600" : ""}
        />
        {errors.coverImageUrl && <p className="mt-1 text-sm text-red-600">{errors.coverImageUrl}</p>}
      </div>

      <div className="flex justify-end">
        <Button type="submit">Next</Button>
      </div>
    </form>
  );
}
