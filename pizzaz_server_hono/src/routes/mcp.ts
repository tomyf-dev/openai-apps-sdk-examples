import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type {
  CallToolRequest,
  ReadResourceRequest,
} from "@modelcontextprotocol/sdk/types.js";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { StreamableHTTPTransport } from "@hono/mcp";

import type { Env } from "../types";
import {
  createResourcePayload,
  createResourceTemplatePayload,
  createToolPayload,
  createWidgets,
  respondWithWidget,
  toolInputParser,
  composeWidgetHtml,
  ensureManifest,
  resolveComponentName,
} from "../lib/widgets";

export const handleMcpRequest = async (c: Context<{ Bindings: Env }>) => {
  const manifest = ensureManifest(c.env.__STATIC_CONTENT_MANIFEST);
  const origin = new URL(c.req.url).origin;
  const baseUrl = origin.replace(/^http:\/\//, "https://").replace(/\/$/, "");

  const widgetsData = createWidgets();

  const widgetComponentsById = new Map<string, string>();
  widgetsData.list.forEach((widget) => {
    const component = resolveComponentName(widget.id);
    widgetComponentsById.set(widget.id, component);
  });

  const server = new Server(
    { name: "pizzaz-hono", version: "0.1.0" },
    { capabilities: { resources: {}, tools: {} } }
  );

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: widgetsData.list.map((w) => createResourcePayload(w)),
    };
  });

  server.setRequestHandler(
    ReadResourceRequestSchema,
    async (req: ReadResourceRequest) => {
      const widget = widgetsData.lookup.byUri.get(req.params.uri);
      if (!widget) {
        throw new Error(`Unknown resource: ${req.params.uri}`);
      }

      const component = widgetComponentsById.get(widget.id);
      if (!component) {
        throw new Error(`Component not resolved for widget ${widget.id}`);
      }

      const htmlContent = composeWidgetHtml(component, baseUrl);

      return {
        contents: [
          {
            uri: widget.templateUri,
            mimeType: "text/html+skybridge",
            text: htmlContent,
          },
        ],
      };
    }
  );

  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
    return {
      resourceTemplates: widgetsData.list.map((w) =>
        createResourceTemplatePayload(w)
      ),
    };
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: widgetsData.list.map((w) => createToolPayload(w)),
    };
  });

  server.setRequestHandler(
    CallToolRequestSchema,
    async (req: CallToolRequest) => {
      const widget = widgetsData.lookup.byId.get(req.params.name);
      if (!widget) {
        throw new Error(`Unknown tool: ${req.params.name}`);
      }

      const validated = toolInputParser.parse(req.params.arguments);
      return respondWithWidget(widget, validated.pizzaTopping);
    }
  );

  const transport = new StreamableHTTPTransport();
  await server.connect(transport);

  try {
    const result = await transport.handleRequest(c);
    if (!result) {
      return c.text("", 202);
    }
    return result;
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: `${error}` });
  }
};
