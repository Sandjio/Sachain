import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

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

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Review Your Project Details</h2>

      <div className="bg-white rounded-lg p-6 border border-gray-200 space-y-4">
        <div>
          <h3 className="font-semibold">Project Name</h3>
          <p>{data.name}</p>
        </div>
        <div>
          <h3 className="font-semibold">Description</h3>
          <p>{data.description}</p>
        </div>
        <div>
          <h3 className="font-semibold">Category</h3>
          <p>{data.category.replace("_", " ")}</p>
        </div>
        <div>
          <h3 className="font-semibold">Cover Image URL</h3>
          <p>{data.coverImageUrl}</p>
        </div>
        <div>
          <h3 className="font-semibold">Stock Supply</h3>
          <p>{data.stockSupply}</p>
        </div>
        <div>
          <h3 className="font-semibold">Price Per Stock</h3>
          <p>${data.pricePerStock.toFixed(2)}</p>
        </div>
        <div>
          <h3 className="font-semibold">Target Funding Goal</h3>
          <p>${data.targetFundingGoal.toFixed(2)}</p>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <Checkbox id="confirm" checked={confirmed} onCheckedChange={(checked) => setConfirmed(checked === true)} />
        <label htmlFor="confirm" className="select-none">
          I confirm that the information above is accurate and ready for submission.
        </label>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev} disabled={loading}>
          Previous
        </Button>
        <Button onClick={onSubmit} disabled={isSubmitDisabled}>
          {loading ? "Submitting..." : "Submit Project"}
        </Button>
      </div>
    </div>
  );
}
