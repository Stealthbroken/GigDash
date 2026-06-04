interface NavbarProps {
  onLogin: () => void;
  onSignup: () => void;
}

export default function Navbar({ onLogin, onSignup }: NavbarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <span className="font-serif font-bold text-xl text-amber-400 tracking-tight">GigDash</span>
        <nav className="flex items-center gap-2">
          <button
            onClick={onLogin}
            className="px-4 py-1.5 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors rounded-lg hover:bg-secondary"
          >
            Sign in
          </button>
          <button
            onClick={onSignup}
            className="px-4 py-1.5 text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-background rounded-lg transition-colors"
          >
            Sign up
          </button>
        </nav>
      </div>
    </header>
  );
}
