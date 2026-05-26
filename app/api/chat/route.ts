
import { createMCPClient } from "@ai-sdk/mcp";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  convertToModelMessages,
  stepCountIs,
} from "ai";
import { siora_openai_oss } from "./models";

export async function POST(req: Request) {
  const { messages, mcpServers } = await req.json();

  // Use mcpServers from request body, or default to empty array
  const servers = mcpServers ?? [];

  // connect to all MCP servers in parallel
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

  // fetch tools from all clients and merge
  const toolSets = await Promise.all(clients.map((c) => c.tools()));
  const tools = Object.assign({}, ...toolSets);

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
      // cleanup all clients
      await Promise.all(clients.map((c) => c.close()));
    },
  });

  return createUIMessageStreamResponse({ stream });
}