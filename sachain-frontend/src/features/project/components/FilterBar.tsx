import React from "react";

export function FilterBar() {
  return (
    <div className="flex flex-wrap justify-between gap-6 mb-10 bg-white p-6 rounded-xl border border-border-color">
      <div className="flex flex-wrap gap-6 items-center">
        <FilterGroup label="Status">
          <select className="rounded-md border border-border-color bg-white px-4 py-2 text-sm cursor-pointer">
            <option>All Projects</option>
            <option>Live</option>
            <option>Draft</option>
            <option>Completed</option>
            <option>Paused</option>
          </select>
        </FilterGroup>
        <FilterGroup label="Category">
          <select className="rounded-md border border-border-color bg-white px-4 py-2 text-sm cursor-pointer">
            <option>All Categories</option>
            <option>Technology</option>
            <option>Healthcare</option>
            <option>Finance</option>
            <option>Environment</option>
          </select>
        </FilterGroup>
        <FilterGroup label="Sort by">
          <select className="rounded-md border border-border-color bg-white px-4 py-2 text-sm cursor-pointer">
            <option>Date Created</option>
            <option>Amount Raised</option>
            <option>Completion %</option>
            <option>Investors</option>
          </select>
        </FilterGroup>
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-medium-gray">🔍</span>
        <input
          type="text"
          placeholder="Search projects..."
          className="rounded-lg border border-border-color bg-white pl-10 pr-4 py-2 w-64 text-sm focus:outline-none focus:border-primary-black focus:ring-1 focus:ring-primary-black"
        />
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-semibold text-medium-gray">{label}:</span>
      {children}
    </div>
  );
}
