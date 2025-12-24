import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl mb-4">🃏</div>
        <h1 className="font-display text-4xl md:text-5xl text-gold mb-4">
          PKR Night
        </h1>
        <p className="text-white/70 text-lg max-w-md mb-8">
          The ultimate poker league manager for home games. 
          Track standings, schedule games, and run tournaments with ease.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs">
          <Link 
            to="/register" 
            className="btn btn-primary text-center py-3"
          >
            Get Started
          </Link>
          <Link 
            to="/login" 
            className="btn btn-secondary text-center py-3"
          >
            Sign In
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="px-6 pb-12">
        <div className="max-w-lg mx-auto grid grid-cols-2 gap-4">
          <FeatureCard 
            icon="📅" 
            title="Schedule Games" 
            desc="RSVP tracking & reminders"
          />
          <FeatureCard 
            icon="🏆" 
            title="Track Standings" 
            desc="Points, bounties & earnings"
          />
          <FeatureCard 
            icon="⏱️" 
            title="Live Timer" 
            desc="Sync across all devices"
          />
          <FeatureCard 
            icon="🏅" 
            title="Season Trophies" 
            desc="Crown your champions"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-6 text-white/40 text-sm">
        Built for poker nights everywhere
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="card text-center py-4">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="font-semibold text-sm text-white">{title}</div>
      <div className="text-xs text-white/50">{desc}</div>
    </div>
  )
}
