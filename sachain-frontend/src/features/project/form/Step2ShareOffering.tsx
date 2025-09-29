import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

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

  return (
    <form onSubmit={handleNext} className="space-y-6">
      <div>
        <Label htmlFor="stockSupply">Stock Supply</Label>
        <Input
          id="stockSupply"
          type="number"
          min={1}
          max={10}
          value={data.stockSupply}
          onChange={handleChange("stockSupply")}
          className={errors.stockSupply ? "border-red-600" : ""}
        />
        {errors.stockSupply && <p className="mt-1 text-sm text-red-600">{errors.stockSupply}</p>}
      </div>

      <div>
        <Label htmlFor="pricePerStock">Price Per Stock</Label>
        <Input
          id="pricePerStock"
          type="number"
          min={1}
          step={0.01}
          value={data.pricePerStock}
          onChange={handleChange("pricePerStock")}
          className={errors.pricePerStock ? "border-red-600" : ""}
        />
        {errors.pricePerStock && <p className="mt-1 text-sm text-red-600">{errors.pricePerStock}</p>}
      </div>

      <div>
        <Label htmlFor="targetFundingGoal">Target Funding Goal</Label>
        <Input
          id="targetFundingGoal"
          type="number"
          min={1}
          step={0.01}
          value={data.targetFundingGoal}
          onChange={handleChange("targetFundingGoal")}
          className={errors.targetFundingGoal ? "border-red-600" : ""}
        />
        {errors.targetFundingGoal && (
          <p className="mt-1 text-sm text-red-600">{errors.targetFundingGoal}</p>
        )}
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onPrev}>
          Previous
        </Button>
        <Button type="submit">Next</Button>
      </div>
    </form>
  );
}
