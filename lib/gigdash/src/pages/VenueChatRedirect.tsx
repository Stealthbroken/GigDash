import { useEffect } from "react";
import { useRoute } from "wouter";
import { venueTabUrl, useAppNavigation } from "@/lib/navigation";

/** Legacy /venue/chat/:id — opens messages tab with conversation selected. */
export default function VenueChatRedirect() {
  const [, params] = useRoute("/venue/chat/:conversationId");
  const { navigate } = useAppNavigation();
  const conversationId = params?.conversationId ? parseInt(params.conversationId, 10) : null;

  useEffect(() => {
    navigate(venueTabUrl("messages", { chatId: conversationId ?? undefined }));
  }, [navigate, conversationId]);

  return null;
}