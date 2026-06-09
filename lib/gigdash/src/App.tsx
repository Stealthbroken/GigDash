import { useEffect, type ReactElement } from "react";
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

import Settings from "@/pages/Settings";
import VenueDashboard from "@/pages/VenueDashboard";
import VenueCreateEvent from "@/pages/VenueCreateEvent";
import VenueManageEvent from "@/pages/VenueManageEvent";
import VenueProfile from "@/pages/VenueProfile";
import ArtistHome from "@/pages/ArtistHome";
import ArtistGigs, { ArtistChatRedirect } from "@/pages/ArtistGigs";
import ArtistProfile from "@/pages/ArtistProfile";
import EventProfile from "@/pages/EventProfile";
import Redirect from "@/components/Redirect";
import { artistTabUrl, venueTabUrl } from "@/lib/navigation";
import VenueChatRedirect from "@/pages/VenueChatRedirect";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component }: { component: () => ReactElement }) {
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

function VenueRoute({ component: Component }: { component: () => ReactElement }) {
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

function ArtistRoute({ component: Component }: { component: () => ReactElement }) {
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
      <Route path="/fan">
        {() => <ProtectedRoute component={FanHome} />}
      </Route>
      <Route path="/event/:id">
        {() => <EventProfile />}
      </Route>
      <Route path="/artist/chat/:conversationId">
        {() => <ArtistRoute component={ArtistChatRedirect} />}
      </Route>
      <Route path="/artist/chat">
        {() => <Redirect to={artistTabUrl("messages")} />}
      </Route>
      <Route path="/artist/profile/:id">
        {() => <ArtistProfile />}
      </Route>
      <Route path="/artist/preview">
        {() => <Redirect to={artistTabUrl("preview")} />}
      </Route>
      <Route path="/artist/gigs">
        {() => <ArtistRoute component={ArtistGigs} />}
      </Route>
      <Route path="/artist">
        {() => <ArtistRoute component={ArtistHome} />}
      </Route>
      <Route path="/venue/chat/:conversationId">
        {() => <VenueRoute component={VenueChatRedirect} />}
      </Route>
      <Route path="/venue/chat">
        {() => <Redirect to={venueTabUrl("messages")} />}
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
      <Route path="/venue/event/:id/manage">
        {() => <VenueRoute component={VenueManageEvent} />}
      </Route>
      <Route path="/venue/:id">
        {() => <VenueProfile />}
      </Route>
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
