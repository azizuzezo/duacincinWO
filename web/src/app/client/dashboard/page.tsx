import { DashboardStub } from "@/components/DashboardStub";

export default function ClientDashboardPage() {
  return <DashboardStub expectedRole="client" loginPath="/client/login" />;
}
