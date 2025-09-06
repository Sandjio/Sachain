// src/pages/dashboards/startup.tsx
import RequireAuth from "@/components/auth/RequireAuth";
import {DashboardLayout} from "@/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StartupDashboard() {
  return (
    <RequireAuth roles={["startup", "admin"]}>
      <DashboardLayout role="startup">
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader><CardTitle>Campaign Status</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">Draft</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Funds Raised</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">0 HBAR</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>KYC Status</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">Pending</CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Project Overview</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">No project created yet.</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Investor Messages</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">No messages.</CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </RequireAuth>
  );
}
