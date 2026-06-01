import { useState } from "react";
import { useLocation } from "wouter";
import AuthModal from "@/components/AuthModal";
import Navbar from "@/components/Navbar";

const roles = [
  {
    id: "artist",
    label: "Artist",
    headline: "Find your next stage",
    description:
      "Discover venues looking for live talent, reach out directly, manage your schedule, and build your local following — all in one place.",
    color: "from-amber-500/20 to-amber-600/5",
    border: "border-amber-500/30",
    accent: "text-amber-400",
    badge: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
      </svg>
    ),
    features: ["Browse open gig slots", "Filter by genre & pay", "Direct venue messaging", "Block off unavailable dates"],
  },
  {
    id: "venue",
    label: "Venue",
    headline: "Book the right act",
    description:
      "Post upcoming gig slots, browse local artists by genre and style, and manage your event calendar without the back-and-forth.",
    color: "from-violet-500/20 to-violet-600/5",
    border: "border-violet-500/30",
    accent: "text-violet-400",
    badge: "bg-violet-500/10 text-violet-400 border border-violet-500/20",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
      </svg>
    ),
    features: ["Post gig opportunities", "Search artist profiles", "Manage event listings", "Rate past performers"],
  },
  {
    id: "fan",
    label: "Fan",
    headline: "Never miss a show",
    description:
      "Explore live music near you on an interactive map, follow your favourite artists, and discover new acts that match your taste.",
    color: "from-emerald-500/20 to-emerald-600/5",
    border: "border-emerald-500/30",
    accent: "text-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
    features: ["Map-based gig discovery", "Follow favourite artists", "Filter by genre & location", "Spotify / Apple Music sync"],
  },
];

export default function Home() {
  const [, navigate] = useLocation();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [authRole, setAuthRole] = useState<string>("artist");

  function openAuth(mode: "login" | "signup", role?: string) {
    setAuthMode(mode);
    if (role) setAuthRole(role);
    setAuthOpen(true);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar onLogin={() => openAuth("login")} onSignup={() => openAuth("signup")} />

      {/* Hero */}
      <section className="relative pt-28 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] rounded-full bg-amber-500/6 blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Connecting artists, venues &amp; fans
          </div>

          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
            The local gig<br />
            <span className="text-amber-400">ecosystem</span>, unified.
          </h1>

          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            GigDash brings together artists looking for stages, venues searching for talent,
            and fans who want to discover live music around them.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => openAuth("signup")}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-background font-semibold rounded-lg transition-colors text-sm"
            >
              Get started free
            </button>
            <button
              onClick={() => openAuth("login")}
              className="px-6 py-3 bg-card hover:bg-secondary border border-border text-foreground font-medium rounded-lg transition-colors text-sm"
            >
              Sign in
            </button>
          </div>
        </div>
      </section>

      {/* Role cards */}
      <section className="px-4 pb-24 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-muted-foreground text-sm uppercase tracking-widest font-medium mb-2">Three views, one platform</p>
          <h2 className="font-serif text-3xl font-bold">Who are you?</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {roles.map((role) => (
            <div
              key={role.id}
              className={`relative rounded-2xl border ${role.border} bg-gradient-to-b ${role.color} p-6 flex flex-col gap-5`}
            >
              <div className="flex items-start justify-between">
                <div className={`p-2.5 rounded-xl bg-card/80 ${role.accent}`}>
                  {role.icon}
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${role.badge}`}>
                  {role.label}
                </span>
              </div>

              <div>
                <h3 className="font-serif text-xl font-bold mb-2">{role.headline}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{role.description}</p>
              </div>

              <ul className="flex flex-col gap-2">
                {role.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-foreground/80">
                    <span className={`w-1 h-1 rounded-full ${role.accent.replace("text-", "bg-")}`} />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => openAuth("signup", role.id)}
                className={`mt-auto w-full py-2.5 rounded-lg border ${role.border} ${role.accent} font-medium text-sm hover:bg-white/5 transition-colors`}
              >
                Join as {role.label}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* How it works strip */}
      <section className="border-t border-border px-4 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-serif text-3xl font-bold">How GigDash works</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-8 text-center">
            {[
              { step: "01", title: "Create your profile", body: "Sign up as an artist, venue, or fan and set up your profile in minutes." },
              { step: "02", title: "Connect", body: "Artists find open gig slots, venues discover local talent, fans follow their favourite acts." },
              { step: "03", title: "Show up", body: "Bookings get confirmed, events get listed on the map, fans show up. Everyone wins." },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center gap-3">
                <span className="font-serif text-5xl font-bold text-amber-500/30">{item.step}</span>
                <h3 className="font-semibold text-lg">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20 border-t border-border">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="font-serif text-3xl font-bold mb-4">Ready to plug in?</h2>
          <p className="text-muted-foreground mb-8">Join the local music community that's growing every day.</p>
          <button
            onClick={() => openAuth("signup")}
            className="px-8 py-3 bg-amber-500 hover:bg-amber-400 text-background font-semibold rounded-lg transition-colors"
          >
            Create your account
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-8">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <span className="font-serif font-bold text-lg text-amber-400">GigDash</span>
          <p className="text-muted-foreground text-sm">© 2026 GigDash. All rights reserved.</p>
        </div>
      </footer>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        defaultMode={authMode}
        defaultRole={authRole}
      />
    </div>
  );
}
