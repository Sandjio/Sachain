interface StatCardProps {
  icon: string;
  value: number | string;
  label: string;
}

export function StatCard({ icon, value, label }: StatCardProps) {
  return (
    <div className="bg-white p-6 rounded-xl border border-border-color text-center">
      <div className="mx-auto mb-4 flex items-center justify-center w-12 h-12 rounded-full bg-primary-black text-white text-xl">
        {icon}
      </div>
      <div className="text-3xl font-extrabold text-primary-black mb-1">
        {value}
      </div>
      <div className="text-xs text-medium-gray uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}
