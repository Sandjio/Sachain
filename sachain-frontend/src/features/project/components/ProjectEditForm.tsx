import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Project } from "@/features/project/core/types"; // Adjust import as necessary
import { updateProject, getProjectById } from "@/features/project/core/api";

interface ProjectEditFormProps {
  projectId: string;
  onCancel: () => void;
  onSaveSuccess: () => void;
}

export function ProjectEditForm({ projectId, onCancel, onSaveSuccess }: ProjectEditFormProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [targetFundingGoal, setTargetFundingGoal] = useState<number>(0);
  const [pricePerStock, setPricePerStock] = useState<number>(0);
  const [stockSupply, setStockSupply] = useState<number>(0);

  useEffect(() => {
  async function fetchProject() {
    setLoading(true);
    try {
      const data = await getProjectById(projectId);
      setProject(data.project || data);  // unwrap if needed
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load project");
    } finally {
      setLoading(false);
    }
  }
  fetchProject();
}, [projectId]);

useEffect(() => {
  if (project) {
    setName(project.name);
    setCategory(project.category);
    setDescription(project.description);
    setTargetFundingGoal(project.targetFundingGoal);
    setPricePerStock(project.pricePerStock);
    setStockSupply(project.stockSupply);
  }
}, [project]);


  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateProject(projectId, {
        name,
        category,
        description,
        targetFundingGoal,
        pricePerStock,
        stockSupply,
      });
      onSaveSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to save project");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p>Loading project data...</p>;
if (error) return <p className="text-red-600">{error}</p>;
if (!project) return <p>No project data found.</p>;

  if (error)
    return (
      <div>
        <p className="text-red-600">{error}</p>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
      className="max-w-4xl mx-auto space-y-6"
    >
      <div>
        <label className="block font-medium text-gray-700 mb-1">Name</label>
        <input
          className="w-full border rounded px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block font-medium text-gray-700 mb-1">Category</label>
        <input
          className="w-full border rounded px-3 py-2"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block font-medium text-gray-700 mb-1">Description</label>
        <textarea
          className="w-full border rounded px-3 py-2"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          required
        />
      </div>

      <div>
        <label className="block font-medium text-gray-700 mb-1">
          Target Funding Goal
        </label>
        <input
          type="number"
          className="w-full border rounded px-3 py-2"
          value={targetFundingGoal}
          onChange={(e) => setTargetFundingGoal(Number(e.target.value))}
          min={0}
          required
        />
      </div>

      <div>
        <label className="block font-medium text-gray-700 mb-1">
          Price Per Stock
        </label>
        <input
          type="number"
          className="w-full border rounded px-3 py-2"
          value={pricePerStock}
          onChange={(e) => setPricePerStock(Number(e.target.value))}
          min={0}
          step="0.01"
          required
        />
      </div>

      <div>
        <label className="block font-medium text-gray-700 mb-1">Stock Supply</label>
        <input
          type="number"
          className="w-full border rounded px-3 py-2"
          value={stockSupply}
          onChange={(e) => setStockSupply(Number(e.target.value))}
          min={0}
          required
        />
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
