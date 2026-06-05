import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Auth from "@/pages/Auth";
import Onboarding from "@/pages/Onboarding";
import FanHome from "@/pages/FanHome";
import FanProfile from "@/pages/FanProfile";
import FanChat from "@/pages/FanChat";
import Settings from "@/pages/Settings";
import VenueDashboard from "@/pages/VenueDashboard";
import VenueCreateEvent from "@/pages/VenueCreateEvent";
import VenueProfile from "@/pages/VenueProfile";
import ArtistHome from "@/pages/ArtistHome";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component }: { component: () => JSX.Element }) {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [loading, user, navigate]);

  if (loading || !user) return null;

  return <Component />;
}

function VenueRoute({ component: Component }: { component: () => JSX.Element }) {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    } else if (!loading && user && user.role !== "venue") {
      navigate("/");
    }
  }, [loading, user, navigate]);

  if (loading || !user || user.role !== "venue") return null;

  return <Component />;
}

function ArtistRoute({ component: Component }: { component: () => JSX.Element }) {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    } else if (!loading && user && user.role !== "artist") {
      navigate("/");
    }
  }, [loading, user, navigate]);

  if (loading || !user || user.role !== "artist") return null;

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Auth} />
      <Route path="/signup" component={Auth} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/fan/profile">
        {() => <ProtectedRoute component={FanProfile} />}
      </Route>
      <Route path="/fan/chat/:artistId">
        {() => <ProtectedRoute component={FanChat} />}
      </Route>
      <Route path="/fan/chat">
        {() => <ProtectedRoute component={FanChat} />}
      </Route>
      <Route path="/fan">
        {() => <ProtectedRoute component={FanHome} />}
      </Route>
      <Route path="/artist">
        {() => <ArtistRoute component={ArtistHome} />}
      </Route>
      <Route path="/settings">
        {() => <ProtectedRoute component={Settings} />}
      </Route>
      <Route path="/venue">
        {() => <VenueRoute component={VenueDashboard} />}
      </Route>
      <Route path="/venue/create-event">
        {() => <VenueRoute component={VenueCreateEvent} />}
      </Route>
      <Route path="/venue/:id" component={VenueProfile} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
