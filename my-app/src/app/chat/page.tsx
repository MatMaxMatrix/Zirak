import ChatInterface from "@/components/chat/ChatInterface";

/**
 * /chat – The main AI workspace.
 *
 * Authentication is enforced by middleware.ts (requires a valid Supabase
 * session). WebSocketProvider is mounted in the root layout, so we don't
 * need it here.
 */
export default function ChatPage() {
  return <ChatInterface />;
}
