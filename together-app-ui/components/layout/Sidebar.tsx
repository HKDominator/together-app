"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTasks } from "@/context/TasksContext";
import ActivityIndicator from "./ActivityIndicator";
import { useAuth } from "@/context/AuthContext";
import { usePresence } from "@/context/PresenceContext";

const NAV = [
  { href: "/", icon: "🏠", label: "Landing" },
  { href: "/tasks", icon: "✅", label: "Tasks" },
  { href: "/statistics", icon: "📊", label: "Statistics" },
  { href: "/pulse", icon: "⚡", label: "Pulse" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { users, currentUser } = useTasks();
  const { isAdmin, logout } = useAuth();
  const { onlineUserIds } = usePresence();

  return (
    <aside
      className="w-60 shrink-0 flex flex-col h-screen sticky top-0 bg-sl"
    >
      {/* Logo */}
      <div
        className="px-6 py-7 border-b flex items-center gap-3"
        style={{ borderColor: "rgba(255,255,255,0.08)" }}
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
          className="px-6 mb-2 text-xs font-semibold text-white/30"
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
                color: active ? "#fff" : "rgba(255,255,255,0.55)",
                background: active ? "rgba(192,57,43,0.15)" : "transparent",
                borderColor: active ? "var(--color-cr)" : "transparent",
              }}
            >
              <span className="text-base w-5 text-center">{icon}</span>
              {label}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <p className="px-6 mt-6 mb-2 text-xs font-semibold text-white/30">
              Administration
            </p>
            {[
              { href: "/admin/users",       icon: "🔐", label: "Users" },
              { href: "/admin/logs",        icon: "📋", label: "Admin Logs" },
              { href: "/admin/observation", icon: "🔍", label: "Anomaly Detection" },
            ].map(({ href, icon, label }) => {
              const active = pathname === href || pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 px-6 py-2.5 text-sm font-medium transition-all border-l-2"
                  style={{
                    color:       active ? "#fff" : "rgba(255,255,255,0.55)",
                    background:  active ? "rgba(192,57,43,0.15)" : "transparent",
                    borderColor: active ? "var(--color-cr)"      : "transparent",
                  }}
                >
                  <span className="text-base w-5 text-center">{icon}</span>
                  {label}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* Activity indicator (reads cookies, shows recent user activity) */}
      <ActivityIndicator />

      {/* Workspace users */}
      <div
        className="px-6 py-5 border-t"
        style={{ borderColor: "rgba(255,255,255,0.08)" }}
      >
        <p
          className="mb-3 text-xs font-semibold text-white/30"
        >
          Workspace
        </p>
        {users.map((u) => {
          // Self is always shown online — you know you're connected.
          // Partner dot reflects real presence state from the server.
          const isOnline = u.id === currentUser.id || onlineUserIds.has(u.id)
          return (
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
                  style={{ color: "rgba(255,255,255,0.85)" }}
                >
                  {u.name}
                </p>
                <p
                  className="text-xs capitalize"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                >
                  {u.role}
                </p>
              </div>
              {/* motion-safe: prefix means the pulse only runs when the user
                  has NOT enabled prefers-reduced-motion (DESIGN.md §5 — global,
                  no exceptions). Reduced-motion users see a solid color dot. */}
              <span
                role="img"
                aria-label={`${u.name} is ${isOnline ? 'online' : 'offline'}`}
                className={`w-2 h-2 rounded-full${isOnline ? ' motion-safe:animate-pulse' : ''}`}
                style={{ background: isOnline ? "#27AE60" : "#6B7280" }}
              />
            </div>
          )
        })}
      </div>

      {/* Account footer — current user + /account link + sign out */}
      <div
        className="px-4 py-4 border-t"
        style={{ borderColor: "rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: currentUser?.avatarColor }}
          >
            {currentUser?.initials}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-xs font-semibold truncate"
              style={{ color: "rgba(255,255,255,0.85)" }}
            >
              {currentUser?.name}
            </p>
          </div>
          <Link
            href="/account"
            aria-label="Account settings"
            className="p-1.5 rounded-md transition-colors"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            ⚙
          </Link>
          <button
            onClick={logout}
            aria-label="Sign out"
            className="p-1.5 rounded-md transition-colors"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            ⏻
          </button>
        </div>
      </div>
    </aside>
  );
}
