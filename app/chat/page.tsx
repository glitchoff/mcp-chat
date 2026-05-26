"use client";

import { useState, Fragment, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { RefreshCcwIcon, CopyIcon } from "lucide-react";
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { ThemeSwitcher } from "@/components/theming/themecontroller";
import { MCPManager, type MCPServer } from "@/components/mcp-manager";

export default function Home() {
  const [input, setInput] = useState("");
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);

  const { messages, sendMessage, status, regenerate } = useChat();

  // Patch fetch to include mcpServers with every request
  useEffect(() => {
    const originalFetch = window.fetch;
    (window as any).fetch = async (
      resource: string | Request,
      config?: RequestInit
    ) => {
      // Only patch our /api/chat endpoint
      if (
        (typeof resource === "string" && resource.includes("/api/chat")) ||
        (resource instanceof Request && resource.url.includes("/api/chat"))
      ) {
        const body = config?.body
          ? typeof config.body === "string"
            ? JSON.parse(config.body)
            : config.body
          : {};

        config = {
          ...config,
          body: JSON.stringify({ ...body, mcpServers }),
        };
      }
      return originalFetch(resource, config);
    };

    return () => {
      (window as any).fetch = originalFetch;
    };
  }, [mcpServers]);

  const handleSubmit = (message: PromptInputMessage) => {
    if (message.text.trim()) {
      sendMessage({ text: message.text });
      setInput("");
    }
  };

  return (
    <div className="flex flex-col h-screen w-full max-w-3xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <MCPManager onChange={setMcpServers} />
        <ThemeSwitcher />
      </div>
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.map((message, messageIndex) => (
            <Fragment key={message.id}>
              {message.parts.map((part, i) => {
                if (part.type !== "text") return null;
                const isLast = messageIndex === messages.length - 1;

                return (
                  <Fragment key={`${message.id}-${i}`}>
                    <Message from={message.role}>
                      <MessageContent>
                        <MessageResponse>{part.text}</MessageResponse>
                      </MessageContent>
                    </Message>
                    {message.role === "assistant" && isLast && (
                      <MessageActions>
                        <MessageAction onClick={() => regenerate()} label="Retry">
                          <RefreshCcwIcon className="size-3" />
                        </MessageAction>
                        <MessageAction
                          onClick={() => navigator.clipboard.writeText(part.text)}
                          label="Copy"
                        >
                          <CopyIcon className="size-3" />
                        </MessageAction>
                      </MessageActions>
                    )}
                  </Fragment>
                );
              })}
            </Fragment>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <PromptInput
        onSubmit={handleSubmit}
        className="mt-4 w-full relative"
      >
        <PromptInputTextarea
          value={input}
          placeholder="Type your message..."
          onChange={(e) => setInput(e.currentTarget.value)}
          className="pr-12"
        />
        <PromptInputSubmit
          status={status === "streaming" ? "streaming" : "ready"}
          disabled={!input.trim()}
          className="absolute bottom-1 right-1"
        />
      </PromptInput>
    </div>
  );
}