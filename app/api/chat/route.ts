import { createMCPClient } from "@ai-sdk/mcp";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  convertToModelMessages,
  stepCountIs,
} from "ai";
import { siora_openai_oss } from "./models";

function getToolUiResourceUri(tool: unknown): string | null {
  const meta = (tool as any)?._meta;
  if (!meta || typeof meta !== "object") return null;
  const candidates = [
    meta?.["ui/resourceUri"],
    meta?.["ui.resourceUri"],
    meta?.ui?.resourceUri,
  ] as const;
  for (const value of candidates) {
    if (typeof value === "string" && value.startsWith("ui://")) return value;
  }
  return null;
}

export async function POST(req: Request) {
  const { messages, mcpServers } = await req.json();

  const servers = mcpServers ?? [];

  const clients = await Promise.all(
    servers.map((server: { url: string; token?: string }) =>
      createMCPClient({
        transport: {
          type: "http",
          url: server.url,
          headers: server.token
            ? { Authorization: `Bearer ${server.token}` }
            : undefined,
        },
      })
    )
  );

  const toolSets = await Promise.all(clients.map((c) => c.tools()));

  const serverTools = await Promise.all(
    servers.map(async (server: { url: string; token?: string }, i: number) => {
      const toolSet = toolSets[i];
      const wrapped: Record<string, unknown> = {};
      for (const [name, tool] of Object.entries(toolSet)) {
        const resourceUri = getToolUiResourceUri(tool);
        if (resourceUri) {
          const originalExecute = (tool as any).execute.bind(tool);
          wrapped[name] = {
            ...(tool as any),
            execute: async (...args: any[]) => {
              const result = await originalExecute(...args);
              if (result && typeof result === "object") {
                return {
                  ...result,
                  structuredContent: {
                    ...((result as any).structuredContent ?? {}),
                    __mcp_app: {
                      url: server.url,
                      token: server.token ?? "",
                      resourceUri,
                      toolName: name,
                    },
                  },
                };
              }
              return result;
            },
          };
        } else {
          wrapped[name] = tool;
        }
      }
      return wrapped;
    })
  );

  const tools = Object.assign({}, ...serverTools);

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const result = streamText({
        model: siora_openai_oss,
        messages: await convertToModelMessages(messages),
        tools: Object.keys(tools).length > 0 ? tools : undefined,
        stopWhen: stepCountIs(20),
      });

      writer.merge(result.toUIMessageStream());
    },
    onFinish: async () => {
      await Promise.all(clients.map((c) => c.close()));
    },
  });

  return createUIMessageStreamResponse({ stream });
}
