import { useLocation } from "wouter";
import AuthModal from "@/components/AuthModal";

export default function Auth() {
  const [location, navigate] = useLocation();
  const mode = location.includes("signup") ? "signup" : "login";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <AuthModal
        open={true}
        onClose={() => navigate("/")}
        defaultMode={mode}
      />
    </div>
  );
}
