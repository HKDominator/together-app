import Link from 'next/link'

const FEATURES = [
  { icon: '📅', title: 'Shared Events',       desc: 'Plan date nights, trips, and anniversaries together. Never miss what matters.' },
  { icon: '✅', title: 'Task Coordination',    desc: 'Assign tasks, track progress, and see each other\'s contribution.' },
  { icon: '🎯', title: 'Shared Goals',         desc: 'Set milestones toward the life you want and celebrate every achievement.' },
  { icon: '🔔', title: 'Smart Reminders',      desc: 'Timely notifications so nothing slips — sent to both partners.' },
  { icon: '📊', title: 'Contribution Stats',   desc: 'See who\'s been pulling their weight. Visual breakdowns keep things balanced.' },
  { icon: '🔒', title: 'Completely Private',   desc: 'Your workspace is yours alone. No ads, no public profiles.' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-cm-pale">

      {/* ── Hero ─────────────────────────────────────────── */}
      <section
        className="relative flex flex-col items-center justify-center min-h-screen px-6 py-24 overflow-hidden bg-sl"
      >
        <div className="absolute top-[-120px] right-[-160px] w-[520px] h-[520px] rounded-full border border-white/5 pointer-events-none" />
        <div className="absolute bottom-[-60px] left-[-80px] w-[300px] h-[300px] rounded-full pointer-events-none"
          style={{ border: '1px solid rgba(192,57,43,0.15)' }} />

        <div className="relative mb-8">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="38" fill="rgba(192,57,43,0.12)"
              stroke="rgba(192,57,43,0.3)" strokeWidth="1.5" />
            <path
              d="M40 58C40 58 16 48 16 30C16 21.2 23.2 14 32 14C36.4 14 40.4 15.9 43 19C45.6 15.9 49.6 14 54 14C62.8 14 70 21.2 70 30C70 48 40 62 40 62Z"
              fill="#C0392B"
            />
          </svg>
        </div>

        <h1 className="relative font-display text-white text-center font-bold leading-tight mb-5"
          style={{ fontSize: 'clamp(48px, 7vw, 82px)' }}>
          <em className="text-cm not-italic">Together</em>
        </h1>

        <p className="relative text-cm/70 text-lg font-light tracking-widest uppercase mb-12">
          Plan Together &nbsp;·&nbsp; Grow Together
        </p>

        <div className="relative flex flex-wrap gap-4 justify-center">
          <Link
            href="/tasks"
            className="px-9 py-3.5 rounded-full text-white font-semibold text-sm tracking-wide transition-all hover:-translate-y-0.5"
            style={{ background: '#C0392B', boxShadow: '0 4px 20px rgba(192,57,43,0.4)' }}
          >
            Open App →
          </Link>
          <Link
            href="/login"
            className="px-9 py-3.5 rounded-full font-medium text-sm text-cm transition-all"
            style={{ border: '1.5px solid rgba(255,255,255,0.35)' }}
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* ── Stats strip ──────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 py-20 flex flex-wrap items-center gap-10 justify-center">
        {[
          { num: '2',  label: 'People. One Workspace.' },
          { num: '∞',  label: 'Memories to Create' },
          { num: '4',  label: 'Core Modules' },
          { num: '0',  label: 'Missed Anniversaries' },
        ].map((s, i) => (
          <div key={i} className="text-center px-8">
            <div className="font-display text-5xl font-bold text-cr leading-none mb-2">{s.num}</div>
            <div className="text-sm text-gray-500 font-medium tracking-wide">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Features ─────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <p className="text-xs font-bold tracking-widest uppercase text-cr mb-3">What&apos;s Inside</p>
        <h2 className="font-display text-4xl font-bold text-gray-700 mb-16 leading-snug">
          Everything your<br />relationship needs, in one place
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-2xl p-9 border border-gray-700/5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md group relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-cr scale-x-0 origin-left transition-transform group-hover:scale-x-100" />
              <div className="w-13 h-13 rounded-lg bg-cr-pale flex items-center justify-center text-2xl mb-5"
                style={{ width: 52, height: 52 }}>
                {f.icon}
              </div>
              <h3 className="font-display text-lg font-semibold text-gray-700 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer
        className="px-16 py-12 flex items-center justify-between bg-sl"
      >
        <div>
          <div className="font-display text-xl font-bold text-cm">❤️ Together</div>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
            A private space for couples to plan, organize, and grow.
          </p>
        </div>
        <Link
          href="/login"
          className="px-8 py-3 rounded-full text-white font-semibold text-sm transition-all hover:-translate-y-0.5"
          style={{ background: '#C0392B', boxShadow: '0 4px 16px rgba(192,57,43,0.3)' }}
        >
          Get Started Free →
        </Link>
      </footer>
    </div>
  )
}