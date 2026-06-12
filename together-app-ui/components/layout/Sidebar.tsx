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
      <div className="px-6 py-7 border-b border-white/8 flex items-center gap-3">
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
        <p className="px-6 mb-2 text-xs font-semibold text-white/45">
          Main
        </p>
        {NAV.map(({ href, icon, label }) => {
          const active =
            pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-6 py-2.5 text-sm font-medium transition-all border-l-2 ${
                active
                  ? "text-white bg-cr/15 border-cr"
                  : "text-white/55 bg-transparent border-transparent"
              }`}
            >
              <span className="text-base w-5 text-center">{icon}</span>
              {label}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <p className="px-6 mt-6 mb-2 text-xs font-semibold text-white/45">
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
                  className={`flex items-center gap-3 px-6 py-2.5 text-sm font-medium transition-all border-l-2 ${
                    active
                      ? "text-white bg-cr/15 border-cr"
                      : "text-white/55 bg-transparent border-transparent"
                  }`}
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
      <div className="px-6 py-5 border-t border-white/8">
        <p className="mb-3 text-xs font-semibold text-white/45">
          Together
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
                <p className="text-xs font-semibold truncate text-white/85">
                  {u.name}
                </p>
                <p className="text-xs capitalize text-white/35">
                  {u.role}
                </p>
              </div>
              {/* presence-dot-online uses the bespoke 2s ease-in-out presencePulse
                  keyframe defined in globals.css — correct curve per DESIGN.md §5.
                  The global reduced-motion block drops the animation to static. */}
              <span
                role="img"
                aria-label={`${u.name} is ${isOnline ? 'online' : 'offline'}`}
                className={`w-2 h-2 rounded-full ${isOnline ? 'bg-success presence-dot-online' : 'bg-gray-500'}`}
              />
            </div>
          )
        })}
      </div>

      {/* Account footer — current user + /account link + sign out */}
      <div className="px-4 py-4 border-t border-white/8">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: currentUser?.avatarColor }}
          >
            {currentUser?.initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate text-white/85">
              {currentUser?.name}
            </p>
          </div>
          <Link
            href="/account"
            aria-label="Account settings"
            className="p-1.5 rounded-md transition-colors text-white/40"
          >
            ⚙
          </Link>
          <button
            onClick={logout}
            aria-label="Sign out"
            className="p-1.5 rounded-md transition-colors text-white/40"
          >
            ⏻
          </button>
        </div>
      </div>
    </aside>
  );
}
