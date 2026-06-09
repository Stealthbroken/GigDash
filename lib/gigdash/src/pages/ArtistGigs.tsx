import { useEffect } from "react";
import { useRoute } from "wouter";
import { artistTabUrl, useAppNavigation } from "@/lib/navigation";

/** Legacy route — redirects into the unified artist tab shell. */
export default function ArtistGigs() {
  const { navigate } = useAppNavigation();

  useEffect(() => {
    navigate(artistTabUrl("gigs"));
  }, [navigate]);

  return null;
}

/** Legacy /artist/chat/:id — opens messages tab with conversation selected. */
export function ArtistChatRedirect() {
  const [, params] = useRoute("/artist/chat/:conversationId");
  const { navigate } = useAppNavigation();
  const conversationId = params?.conversationId ? parseInt(params.conversationId, 10) : null;

  useEffect(() => {
    navigate(artistTabUrl("messages", { chatId: conversationId ?? undefined }));
  }, [navigate, conversationId]);

  return null;
}