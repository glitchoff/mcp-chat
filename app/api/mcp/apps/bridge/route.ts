import { createMCPClient } from "@ai-sdk/mcp";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_METHODS = [
  "tools/call",
  "resources/list",
  "resources/read",
  "resources/templates/list",
  "prompts/list",
] as const;

type BridgeMethod = (typeof ALLOWED_METHODS)[number];

export async function POST(req: NextRequest) {
  try {
    const { url, token, method, params } = await req.json();

    if (!url || !method) {
      return NextResponse.json(
        { error: "Missing required fields: url, method" },
        { status: 400 },
      );
    }

    if (!ALLOWED_METHODS.includes(method as BridgeMethod)) {
      return NextResponse.json(
        { error: `Unsupported method: ${method}` },
        { status: 400 },
      );
    }

    const client = await createMCPClient({
      transport: {
        type: "http",
        url,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      },
    });

    try {
      const p = (params ?? {}) as Record<string, unknown>;

      if (method === "tools/call") {
        const toolName = typeof p.name === "string" ? p.name : "";
        const toolArgs =
          p.arguments && typeof p.arguments === "object"
            ? (p.arguments as Record<string, unknown>)
            : {};

        if (!toolName) {
          return NextResponse.json(
            { error: "Tool name is required" },
            { status: 400 },
          );
        }

        const toolSet = await client.tools();
        const tool = (toolSet as any)[toolName];
        if (!tool?.execute) {
          return NextResponse.json(
            { error: `Tool not found: ${toolName}` },
            { status: 404 },
          );
        }

        const result = await tool.execute(toolArgs, {});
        return NextResponse.json({ ok: true, result });
      }

      if (method === "resources/list") {
        const result = await client.listResources();
        return NextResponse.json({ ok: true, result });
      }

      if (method === "resources/read") {
        const resourceUri = typeof p.uri === "string" ? p.uri : "";
        if (!resourceUri) {
          return NextResponse.json(
            { error: "Resource URI is required" },
            { status: 400 },
          );
        }
        const result = await client.readResource({ uri: resourceUri });
        return NextResponse.json({ ok: true, result });
      }

      if (method === "resources/templates/list") {
        const result = await client.listResourceTemplates();
        return NextResponse.json({ ok: true, result });
      }

      const result = await (client as any).experimental_listPrompts();
      return NextResponse.json({ ok: true, result });
    } finally {
      await client.close();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bridge request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
