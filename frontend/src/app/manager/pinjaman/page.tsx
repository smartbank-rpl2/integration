import AppShell from "@/components/AppShell";
import RolePage from "@/components/RolePage";
import ManagerDashboard from "@/components/dashboards/ManagerDashboard";

export default function ManagerLoanPage() {
  return <AppShell><RolePage allowed={["MANAGER"]}><ManagerDashboard /></RolePage></AppShell>;
}
