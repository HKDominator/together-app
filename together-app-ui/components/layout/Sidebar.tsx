"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTasks } from "@/context/TasksContext";
import ActivityIndicator from "./ActivityIndicator";
import { useAuth } from "@/context/AuthContext";

const NAV = [
  { href: "/", icon: "🏠", label: "Landing" },
  { href: "/tasks", icon: "✅", label: "Tasks" },
  { href: "/statistics", icon: "📊", label: "Statistics" },
  { href: "/pulse", icon: "⚡", label: "Pulse" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { users, currentUser } = useTasks();
  const { isAdmin } = useAuth();

  return (
    <aside
      className="w-60 shrink-0 flex flex-col h-screen sticky top-0"
      style={{ background: "#2C3E50" }}
    >
      {/* Logo */}
      <div
        className="px-6 py-7 border-b flex items-center gap-3"
        style={{ borderColor: "rgba(232,213,183,0.08)" }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 21C12 21 3 14.5 3 8.5C3 5.42 5.42 3 8.5 3C10.24 3 11.91 3.81 13 5.08C14.09 3.81 15.76 3 17.5 3C20.58 3 23 5.42 23 8.5C23 14.5 12 21 12 21Z"
            fill="#C0392B"
          />
        </svg>
        <span className="font-display text-xl font-bold text-white">
          <em className="text-cm not-italic">Together</em>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-5">
        <p
          className="px-6 mb-2 text-xs font-semibold uppercase tracking-widest"
          style={{ color: "rgba(232,213,183,0.3)" }}
        >
          Main
        </p>
        {NAV.map(({ href, icon, label }) => {
          const active =
            pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-6 py-2.5 text-sm font-medium transition-all border-l-2"
              style={{
                color: active ? "#fff" : "rgba(232,213,183,0.55)",
                background: active ? "rgba(192,57,43,0.15)" : "transparent",
                borderColor: active ? "#C0392B" : "transparent",
              }}
            >
              <span className="text-base w-5 text-center">{icon}</span>
              {label}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <p
              className="px-6 mt-6 mb-2 text-xs font-semibold uppercase tracking-widest"
              style={{ color: "rgba(232,213,183,0.3)" }}
            >
              Administration
            </p>
            <Link
              href="/admin/users"
              className="flex items-center gap-3 px-6 py-2.5 text-sm font-medium transition-all border-l-2"
              style={{
                color: pathname.startsWith("/admin")
                  ? "#fff"
                  : "rgba(232,213,183,0.55)",
                background: pathname.startsWith("/admin")
                  ? "rgba(192,57,43,0.15)"
                  : "transparent",
                borderColor: pathname.startsWith("/admin")
                  ? "#C0392B"
                  : "transparent",
              }}
            >
              <Link href="/admin/logs">Admin Logs</Link>
              <Link href="/admin/observation">Anomaly Detection</Link>
              <span className="text-base w-5 text-center">🔐</span>
              Users
            </Link>
          </>
        )}
      </nav>

      {/* Activity indicator (reads cookies, shows recent user activity) */}
      <ActivityIndicator />

      {/* Workspace users */}
      <div
        className="px-6 py-5 border-t"
        style={{ borderColor: "rgba(232,213,183,0.08)" }}
      >
        <p
          className="mb-3 text-xs uppercase tracking-widest font-semibold"
          style={{ color: "rgba(232,213,183,0.3)" }}
        >
          Workspace
        </p>
        {users.map((u) => (
          <div key={u.id} className="flex items-center gap-2.5 mb-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ background: u.avatarColor }}
            >
              {u.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-xs font-semibold truncate"
                style={{ color: "rgba(232,213,183,0.85)" }}
              >
                {u.name}
              </p>
              <p
                className="text-xs capitalize"
                style={{ color: "rgba(232,213,183,0.35)" }}
              >
                {u.role}
              </p>
            </div>
            <span
              className="w-2 h-2 rounded-full"
              style={{
                background: u.id === currentUser.id ? "#27AE60" : "#6B7280",
              }}
            />
          </div>
        ))}
      </div>
    </aside>
  );
}
