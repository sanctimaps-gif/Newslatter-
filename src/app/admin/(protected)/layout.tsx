import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { logout } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administration — Newsletter SanctiMaps" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <header className="topbar">
        <nav className="inner">
          <span className="brand">SANCTIMAPS NEWSLETTER</span>
          <Link href="/admin">Tableau de bord</Link>
          <Link href="/admin/newsletter">Newsletter</Link>
          <Link href="/admin/schedule">Programmation</Link>
          <Link href="/admin/subscribers">Abonnés</Link>
          <Link href="/admin/history">Historique</Link>
          <Link href="/admin/settings">Paramètres</Link>
          <form action={logout}>
            <button type="submit">Déconnexion</button>
          </form>
        </nav>
      </header>
      <main className="page">{children}</main>
    </>
  );
}
