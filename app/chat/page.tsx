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
import { MCPAppFrame } from "@/components/mcp-app-frame";
import { useMCPAppHtml } from "@/hooks/use-mcp-app-html";
import { isToolUIPart } from "ai";
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";

interface McpAppData {
  url: string;
  token: string;
  resourceUri: string;
  toolName: string;
}

function extractMcpAppData(output: unknown): McpAppData | null {
  if (!output || typeof output !== "object") return null;
  const sc = (output as Record<string, unknown>)
    ?.structuredContent as Record<string, unknown> | null;
  if (!sc || typeof sc !== "object") return null;
  const meta = sc.__mcp_app as McpAppData | null;
  if (meta?.resourceUri?.startsWith("ui://")) return meta;
  return null;
}

function ToolMCPAppOutput({
  toolName,
  toolArgs,
  output,
  appData,
  theme,
}: {
  toolName: string;
  toolArgs: unknown;
  output: unknown;
  appData: McpAppData;
  theme: "light" | "dark";
}) {
  const { html, resourceMeta, error } = useMCPAppHtml(appData.resourceUri, appData.url, appData.token);

  if (error) {
    return <ToolOutput output={output} errorText={error} />;
  }

  if (!html) {
    return <p className="text-xs text-muted-foreground">Loading MCP App...</p>;
  }

  return (
    <MCPAppFrame
      html={html}
      toolName={toolName}
      toolArgs={toolArgs as Record<string, unknown>}
      toolResult={output}
      serverUrl={appData.url}
      serverToken={appData.token}
      resourceMeta={resourceMeta}
      theme={theme}
    />
  );
}

export default function Home() {
  const [input, setInput] = useState("");
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  const { messages, sendMessage, status, regenerate } = useChat();

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    setTheme(saved === "light" ? "light" : "dark");
    const observer = new MutationObserver(() => {
      const t = document.documentElement.getAttribute("data-theme");
      setTheme(t === "light" ? "light" : "dark");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

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
                const isLast = messageIndex === messages.length - 1;

                if (part.type === "text") {
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
                }

                if (isToolUIPart(part)) {
                  const toolName = "toolName" in part ? part.toolName : "";
                  const appData =
                    part.state === "output-available"
                      ? extractMcpAppData(part.output)
                      : null;

                  return (
                    <Tool key={`${message.id}-${i}`} defaultOpen={true}>
                      {part.type === "dynamic-tool" ? (
                        <ToolHeader
                          type="dynamic-tool"
                          state={part.state}
                          toolName={toolName}
                        />
                      ) : (
                        <ToolHeader
                          type={part.type}
                          state={part.state}
                        />
                      )}
                      <ToolContent>
                        <ToolInput input={part.input} />
                        {appData ? (
                          <ToolMCPAppOutput
                            toolName={toolName}
                            toolArgs={part.input}
                            output={part.output}
                            appData={appData}
                            theme={theme}
                          />
                        ) : (
                          <ToolOutput
                            output={"output" in part ? part.output : undefined}
                            errorText={"errorText" in part ? part.errorText : undefined}
                          />
                        )}
                      </ToolContent>
                    </Tool>
                  );
                }

                return null;
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