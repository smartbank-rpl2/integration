import AppShell from "@/components/AppShell";
import RolePage from "@/components/RolePage";
import AdminDashboard from "@/components/dashboards/AdminDashboard";

export default function AdminReversalPage() {
  return <AppShell><RolePage allowed={["ADMIN", "CENTRAL_BANK_ADMIN"]}><AdminDashboard /></RolePage></AppShell>;
}
