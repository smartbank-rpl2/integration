import AppShell from "@/components/AppShell";
import RolePage from "@/components/RolePage";
import TellerDashboard from "@/components/dashboards/TellerDashboard";

export default function TellerCustomerPage() {
  return <AppShell><RolePage allowed={["TELLER"]}><TellerDashboard /></RolePage></AppShell>;
}
