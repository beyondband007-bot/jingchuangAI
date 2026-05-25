import React from "react";
import { ChatbotUI } from "./components/ChatbotUI";
import "./chat.css";

export function ChatGenerationView() {
  return (
    <section className="chat-view-root chat-migrated-view">
      <ChatbotUI />
    </section>
  );
}
