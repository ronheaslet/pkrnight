import { Link } from 'react-router-dom'

export function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="text-7xl mb-4">🃏</div>
        <h1 className="font-display text-5xl text-gold mb-3">PKR Night</h1>
        <p className="text-white/60 text-lg max-w-sm mb-8">
          The ultimate poker league manager for home games, tournaments, and weekly sessions.
        </p>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link to="/register" className="btn btn-primary text-center text-lg py-3">
            Get Started
          </Link>
          <Link to="/login" className="btn btn-secondary text-center text-lg py-3">
            Sign In
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="px-6 pb-12 max-w-lg mx-auto w-full">
        <div className="grid grid-cols-2 gap-3">
          <FeatureCard icon="📅" title="Schedule Games" desc="RSVP tracking & reminders" />
          <FeatureCard icon="🏆" title="Track Standings" desc="Points, bounties & earnings" />
          <FeatureCard icon="⏱️" title="Live Timer" desc="Sync across all devices" />
          <FeatureCard icon="🏅" title="Season Trophies" desc="Crown your champions" />
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-6 text-white/30 text-sm">
        Built for poker nights everywhere
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="card text-center py-5">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-white font-medium text-sm">{title}</div>
      <div className="text-white/40 text-xs mt-0.5">{desc}</div>
    </div>
  )
}
