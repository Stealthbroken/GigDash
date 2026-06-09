import { useSearch } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VenueNav from "@/components/venue/VenueNav";
import VenueOverviewPanel from "@/components/venue/panels/VenueOverviewPanel";
import VenueEventsPanel from "@/components/venue/panels/VenueEventsPanel";
import VenueSpacePanel from "@/components/venue/panels/VenueSpacePanel";
import VenueArtistsPanel from "@/components/venue/panels/VenueArtistsPanel";
import ChatPage from "@/pages/ChatPage";
import { useVenueMe } from "@/hooks/use-venue-me";
import { parseVenueTab, useAppNavigation, type VenueTab } from "@/lib/navigation";

export default function VenueDashboard() {
  const search = useSearch();
  const { navigate, goToVenueTab } = useAppNavigation();
  const urlParams = new URLSearchParams(search);
  const tab = parseVenueTab(urlParams.get("tab"));
  const chatIdParam = urlParams.get("chat");
  const conversationId = chatIdParam ? parseInt(chatIdParam, 10) : null;
  const isMessagesTab = tab === "messages";
  const { data: venue, isLoading, error } = useVenueMe();

  function handleTabChange(next: string) {
    goToVenueTab(next as VenueTab);
  }

  return (
    <div className="venue-dashboard flex flex-col min-h-[100dvh] overflow-hidden bg-background text-foreground">
      <VenueNav />

      <main className="venue-dashboard__main flex-1 min-h-0 flex flex-col overflow-hidden">
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
          <div className={`venue-dashboard__inner flex-1 min-h-0 flex flex-col ${isMessagesTab ? "venue-dashboard__inner--chat" : "venue-dashboard__inner--scroll"}`}>
            <Tabs
              value={tab}
              onValueChange={handleTabChange}
              className="venue-dashboard__tabs venue-dashboard__tabs--fill flex flex-col flex-1 min-h-0"
            >
              <TabsList className="venue-dashboard__tablist w-full sm:w-auto flex flex-wrap h-auto gap-1 p-1 bg-muted/80 shrink-0">
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
                <TabsTrigger value="messages" className="flex-1 sm:flex-none">
                  Messages
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="venue-dashboard__panel mt-6 flex-1 min-h-0 overflow-y-auto focus-visible:outline-none">
                <VenueOverviewPanel venue={venue} />
              </TabsContent>
              <TabsContent value="events" className="venue-dashboard__panel mt-6 flex-1 min-h-0 overflow-y-auto focus-visible:outline-none">
                <VenueEventsPanel />
              </TabsContent>
              <TabsContent value="space" className="venue-dashboard__panel mt-6 flex-1 min-h-0 overflow-y-auto focus-visible:outline-none">
                <VenueSpacePanel venue={venue} />
              </TabsContent>
              <TabsContent value="artists" className="venue-dashboard__panel mt-6 flex-1 min-h-0 overflow-y-auto focus-visible:outline-none">
                <VenueArtistsPanel />
              </TabsContent>
              <TabsContent
                value="messages"
                className="venue-dashboard__messages mt-3 flex-1 min-h-0 flex flex-col overflow-hidden focus-visible:outline-none"
              >
                <ChatPage
                  role="venue"
                  homePath="/venue"
                  embedded
                  conversationId={conversationId}
                  onConversationChange={(id) => goToVenueTab("messages", { chatId: id })}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  );
}