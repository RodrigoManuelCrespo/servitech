import { requireSession } from "@/lib/session";
import { Nav } from "@/components/nav";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const session = await requireSession();

  return (
    <div className="flex min-h-screen">
      <Nav nombre={session.user.name ?? ""} rol={session.user.rol} />
      <main className="flex-1 overflow-x-auto p-8">{children}</main>
    </div>
  );
}
