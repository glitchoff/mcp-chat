"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { AppBridge, PostMessageTransport } from "@modelcontextprotocol/ext-apps/app-bridge";
import { MaximizeIcon, MinimizeIcon } from "lucide-react";

interface ResourceMeta {
  csp?: Record<string, unknown>;
  permissions?: Record<string, unknown>;
  prefersBorder?: boolean;
  domain?: string;
}

interface MCPAppFrameProps {
  html: string;
  toolName: string;
  toolArgs?: Record<string, unknown>;
  toolResult?: unknown;
  serverUrl?: string;
  serverToken?: string;
  resourceMeta?: ResourceMeta | null;
  theme?: "light" | "dark";
}

export function MCPAppFrame({
  html,
  toolName,
  toolArgs,
  toolResult,
  serverUrl,
  serverToken,
  resourceMeta,
  theme = "dark",
}: MCPAppFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const bridgeRef = useRef<AppBridge | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeHeight, setIframeHeight] = useState(400);

  const bridgeProxy = useCallback(
    async (method: string, params?: Record<string, unknown>) => {
      if (!serverUrl) return null;
      const res = await fetch("/api/mcp/apps/bridge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: serverUrl, token: serverToken, method, params }),
      });
      return res.json();
    },
    [serverUrl, serverToken],
  );

  const setup = useCallback(async () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    const bridge = new AppBridge(
      null,
      { name: "mcp-chat", version: "1.0.0" },
      { openLinks: {}, serverTools: {}, logging: {} },
    );

    bridgeRef.current = bridge;

    bridge.oninitialized = () => {
      bridge.sendToolInput({ arguments: toolArgs ?? {} });
      if (toolResult) {
        bridge.sendToolResult(toolResult as any);
      }
    };

    bridge.onsizechange = ({ height: h }) => {
      if (h != null) {
        setIframeHeight(Math.max(200, h));
      }
    };

    bridge.onopenlink = async ({ url }) => {
      window.open(url, "_blank", "noopener,noreferrer");
      return {};
    };

    bridge.onmessage = async () => {
      return {};
    };

    bridge.ondownloadfile = async ({ contents }) => {
      for (const item of contents) {
        if ("text" in item && typeof item.text === "string") {
          const blob = new Blob([item.text], { type: "text/plain" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = (item as any).filename ?? "download.txt";
          a.click();
          URL.revokeObjectURL(url);
        }
      }
      return {};
    };

    bridge.onrequestdisplaymode = async ({ mode }) => {
      setIsFullscreen(mode === "fullscreen");
      return { mode };
    };

    bridge.oncalltool = async (params) => {
      const res = await bridgeProxy("tools/call", {
        name: params.name,
        arguments: params.arguments,
      });
      return (res as any)?.result ?? {};
    };

    bridge.onlistresources = async () => {
      const res = await bridgeProxy("resources/list");
      return (res as any)?.result ?? {};
    };

    bridge.onreadresource = async (params) => {
      const res = await bridgeProxy("resources/read", { uri: params.uri });
      return (res as any)?.result ?? {};
    };

    bridge.onlistresourcetemplates = async () => {
      const res = await bridgeProxy("resources/templates/list");
      return (res as any)?.result ?? [];
    };

    bridge.onlistprompts = async () => {
      const res = await bridgeProxy("prompts/list");
      return (res as any)?.result ?? [];
    };

    bridge.onupdatemodelcontext = async () => {
      return {};
    };

    const transport = new PostMessageTransport(
      iframe.contentWindow,
      iframe.contentWindow,
    );

    await bridge.connect(transport);
  }, [html, toolArgs, toolResult, bridgeProxy]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    iframe.srcdoc = html;
    iframe.onload = () => setup();

    return () => {
      bridgeRef.current?.close().catch(() => {});
    };
  }, [setup, html]);

  useEffect(() => {
    bridgeRef.current?.setHostContext({ theme });
  }, [theme]);

  useEffect(() => {
    if (!bridgeRef.current) return;
    bridgeRef.current.sendToolInput({ arguments: toolArgs ?? {} }).catch(() => {});
  }, [toolArgs]);

  useEffect(() => {
    if (!bridgeRef.current || !toolResult) return;
    bridgeRef.current.sendToolResult(toolResult as any).catch(() => {});
  }, [toolResult]);

  const permissionAllow = resourceMeta?.permissions
    ? Object.entries(resourceMeta.permissions)
        .map(([k, v]) => `${k} ${v}`)
        .join("; ")
    : undefined;

  return (
    <div className="group relative w-full overflow-hidden rounded-lg border border-border bg-card">
      <iframe
        ref={iframeRef}
        className="block w-full border-0"
        style={{
          height: isFullscreen ? "90vh" : `${iframeHeight}px`,
          minHeight: "200px",
          transition: "height 150ms",
        }}
        title={`MCP App: ${toolName}`}
        sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
        allow={permissionAllow ?? undefined}
      />
      <button
        type="button"
        onClick={() => setIsFullscreen(!isFullscreen)}
        className="absolute right-2 top-2 flex size-6 items-center justify-center rounded bg-background/80 text-muted-foreground opacity-0 transition-opacity hover:bg-background group-hover:opacity-100"
        aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
      >
        {isFullscreen ? <MinimizeIcon className="size-3.5" /> : <MaximizeIcon className="size-3.5" />}
      </button>
    </div>
  );
}
