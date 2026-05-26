import { useState, useEffect } from "react";

interface ResourceMeta {
  csp?: Record<string, unknown>;
  permissions?: Record<string, unknown>;
  prefersBorder?: boolean;
  domain?: string;
}

export function useMCPAppHtml(
  uri: string | null,
  serverUrl: string | null,
  serverToken: string | null,
) {
  const [html, setHtml] = useState<string | null>(null);
  const [resourceMeta, setResourceMeta] = useState<ResourceMeta | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uri || !serverUrl) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/mcp-resource", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: serverUrl,
            token: serverToken || undefined,
            uri,
          }),
        });

        const data = await res.json();

        if (cancelled) return;

        if (res.ok && data.html) {
          setHtml(data.html);
          setResourceMeta(data.resourceMeta ?? null);
          setError(null);
        } else {
          setError(data.error ?? "Failed to fetch resource");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Request failed");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uri, serverUrl, serverToken]);

  return { html, resourceMeta, error };
}
