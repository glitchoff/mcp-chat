import { createMCPClient } from "@ai-sdk/mcp";
import { NextRequest, NextResponse } from "next/server";

function extractResourceMeta(resource: unknown, content: unknown) {
  const resourceMeta = (resource as any)?._meta;
  const contentMeta = (content as any)?._meta;
  const uiMeta = (contentMeta?.ui ?? resourceMeta?.ui ?? {}) as Record<string, unknown>;

  const csp = uiMeta.csp ?? contentMeta?.["ui/csp"] ?? resourceMeta?.["ui/csp"];
  const permissions = uiMeta.permissions ?? contentMeta?.["ui/permissions"] ?? resourceMeta?.["ui/permissions"];
  const prefersBorder = uiMeta.prefersBorder ?? contentMeta?.["ui/prefersBorder"] ?? resourceMeta?.["ui/prefersBorder"];
  const domain = uiMeta.domain ?? contentMeta?.["ui/domain"] ?? resourceMeta?.["ui/domain"];

  return {
    csp: csp && typeof csp === "object" ? csp : undefined,
    permissions: permissions && typeof permissions === "object" ? permissions : undefined,
    prefersBorder: typeof prefersBorder === "boolean" ? prefersBorder : undefined,
    domain: typeof domain === "string" ? domain : undefined,
  };
}

export async function POST(req: NextRequest) {
  const { url, token, uri } = await req.json();

  if (!url || !uri) {
    return NextResponse.json(
      { error: "Missing required fields: url, uri" },
      { status: 400 },
    );
  }

  if (!uri.startsWith("ui://")) {
    return NextResponse.json(
      { error: "Only ui:// resources are supported" },
      { status: 400 },
    );
  }

  try {
    const client = await createMCPClient({
      transport: {
        type: "http",
        url,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      },
    });

    try {
      const resource = await client.readResource({ uri });

      const htmlContent = resource.contents.find(
        (c) =>
          typeof (c as any).text === "string" &&
          typeof (c as any).mimeType === "string" &&
          (c as any).mimeType.includes("text/html"),
      ) as { text?: string; mimeType?: string; uri?: string } | undefined;

      if (!htmlContent?.text) {
        return NextResponse.json(
          { error: "Resource did not return HTML content" },
          { status: 500 },
        );
      }

      const resourceMeta = extractResourceMeta(resource, htmlContent);

      console.log("Fetched MCP resource", { uri, resourceMeta });
      return NextResponse.json({
        html: htmlContent.text,
        mimeType: htmlContent.mimeType,
        uri: htmlContent.uri ?? uri,
        resourceMeta,
      });
    } finally {
      await client.close();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch resource";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
