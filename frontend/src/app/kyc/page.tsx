import AppShell from "@/components/AppShell";
import RolePage from "@/components/RolePage";
import RetailDashboard from "@/components/dashboards/RetailDashboard";

export default function KycPage() {
  return <AppShell><RolePage allowed={["WALLET_USER", "RETAIL", "RETAIL_CUSTOMER"]}><RetailDashboard mode="kyc" /></RolePage></AppShell>;
}
