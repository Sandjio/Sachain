// src/pages/dashboards/investor.tsx
//import RequireAuth from "@/components/auth/RequireAuth";
import {DashboardLayout} from "@/layout/DashboardLayout";
import RequireAuth from "@/components/auth/RequireAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InvestorDashboard() {
  return (
    <RequireAuth roles={["investor", "admin"]}>
      <DashboardLayout>
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader><CardTitle>Total Invested</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">— HBAR</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Current Value</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">— HBAR</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Active Investments</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">0</CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">No recent activity.</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Watchlist</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">No items yet.</CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </RequireAuth>
  );
}
