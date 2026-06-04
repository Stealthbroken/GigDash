import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VenueNav from "@/components/venue/VenueNav";
import VenueOverviewPanel from "@/components/venue/panels/VenueOverviewPanel";
import VenueEventsPanel from "@/components/venue/panels/VenueEventsPanel";
import VenueSpacePanel from "@/components/venue/panels/VenueSpacePanel";
import VenueArtistsPanel from "@/components/venue/panels/VenueArtistsPanel";
import { useVenueMe } from "@/hooks/use-venue-me";

export default function VenueDashboard() {
  const [, navigate] = useLocation();
  const { data: venue, isLoading, error } = useVenueMe();

  return (
    <div className="venue-dashboard flex flex-col min-h-[100dvh] bg-background text-foreground">
      <VenueNav />

      <main className="venue-dashboard__main flex-1 min-h-0">
        {isLoading && (
          <div className="venue-dashboard__inner animate-pulse space-y-4">
            <div className="h-28 rounded-xl bg-muted" />
            <div className="h-10 rounded-lg bg-muted w-2/3 max-w-md" />
            <div className="h-64 rounded-xl bg-muted" />
          </div>
        )}

        {error && !isLoading && (
          <div className="venue-dashboard__inner text-center py-16">
            <p className="text-sm text-red-400/90 mb-4">{error.message}</p>
            <button
              type="button"
              onClick={() => navigate("/onboarding?role=venue")}
              className="px-5 py-2.5 bg-violet-500 hover:bg-violet-400 text-white font-semibold rounded-lg text-sm"
            >
              Complete venue setup
            </button>
          </div>
        )}

        {venue && !isLoading && (
          <div className="venue-dashboard__inner">
            <Tabs defaultValue="overview" className="venue-dashboard__tabs">
              <TabsList className="venue-dashboard__tablist w-full sm:w-auto flex flex-wrap h-auto gap-1 p-1 bg-muted/80">
                <TabsTrigger value="overview" className="flex-1 sm:flex-none">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="events" className="flex-1 sm:flex-none">
                  Events & gigs
                </TabsTrigger>
                <TabsTrigger value="space" className="flex-1 sm:flex-none">
                  Venue & space
                </TabsTrigger>
                <TabsTrigger value="artists" className="flex-1 sm:flex-none">
                  Find artists
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6 focus-visible:outline-none">
                <VenueOverviewPanel venue={venue} />
              </TabsContent>
              <TabsContent value="events" className="mt-6 focus-visible:outline-none">
                <VenueEventsPanel />
              </TabsContent>
              <TabsContent value="space" className="mt-6 focus-visible:outline-none">
                <VenueSpacePanel venue={venue} />
              </TabsContent>
              <TabsContent value="artists" className="mt-6 focus-visible:outline-none">
                <VenueArtistsPanel />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  );
}