import { useLocation } from "wouter";

export default function NotFound() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 text-center px-4">
      <span className="font-serif text-7xl font-bold text-amber-500/30">404</span>
      <h1 className="font-serif text-2xl font-bold">Page not found</h1>
      <p className="text-muted-foreground text-sm">This page doesn't exist.</p>
      <button
        onClick={() => navigate("/")}
        className="mt-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-background font-semibold rounded-lg text-sm transition-colors"
      >
        Go home
      </button>
    </div>
  );
}
