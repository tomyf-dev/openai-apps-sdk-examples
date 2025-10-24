import { z } from "zod";

export type AssetManifest = Record<string, string>;

export type PizzazWidget = {
  id: string;
  title: string;
  templateUri: string;
  invoking: string;
  invoked: string;
  responseText: string;
};

export type WidgetLookup = {
  byId: Map<string, PizzazWidget>;
  byUri: Map<string, PizzazWidget>;
};

const COMPONENT_NAME_BY_WIDGET_ID: Record<string, string> = {
  "pizza-map": "pizzaz",
  "pizza-carousel": "pizzaz-carousel",
  "pizza-albums": "pizzaz-albums",
  "pizza-list": "pizzaz-list",
};

export const toolInputSchema = {
  type: "object",
  properties: {
    pizzaTopping: {
      type: "string",
      description: "表示するウィジェット内で言及するトッピングの名前",
    },
  },
  required: ["pizzaTopping"],
  additionalProperties: false,
} as const;

export const toolInputParser = z.object({
  pizzaTopping: z.string(),
});

const widgetMeta = (widget: PizzazWidget) => ({
  "openai/outputTemplate": widget.templateUri,
  "openai/toolInvocation/invoking": widget.invoking,
  "openai/toolInvocation/invoked": widget.invoked,
  "openai/widgetAccessible": true,
  "openai/resultCanProduceWidget": true,
}) as const;

export const ensureManifest = (
  manifestRaw: string | undefined
): AssetManifest => {
  if (!manifestRaw || manifestRaw.length === 0) {
    return {} as AssetManifest;
  }

  try {
    return JSON.parse(manifestRaw) as AssetManifest;
  } catch (error) {
    throw new Error("Failed to parse __STATIC_CONTENT_MANIFEST", {
      cause: error,
    });
  }
};

const resolveHashedFallback = (
  manifest: AssetManifest,
  candidate: string
) => {
  const lastSlash = candidate.lastIndexOf("/");
  const directory = lastSlash >= 0 ? candidate.slice(0, lastSlash + 1) : "";
  const filename = lastSlash >= 0 ? candidate.slice(lastSlash + 1) : candidate;
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) {
    return undefined;
  }

  const basename = filename.slice(0, lastDot);
  const extension = filename.slice(lastDot);
  const prefix = `${directory}${basename}-`;
  const suffix = extension;

  const matches = Object.values(manifest)
    .filter((value) => value.startsWith(prefix) && value.endsWith(suffix))
    .sort();

  return matches[matches.length - 1];
};

export const resolveAssetPath = (
  manifest: AssetManifest,
  logicalPath: string
): string => {
  const normalized = logicalPath.replace(/^\/?/, "");

  const direct = manifest[normalized];
  if (direct) {
    return direct;
  }

  const hashedFallback = resolveHashedFallback(manifest, normalized);
  if (hashedFallback) {
    return hashedFallback;
  }

  return normalized;
};

export const resolveComponentName = (widgetId: string): string => {
  const component = COMPONENT_NAME_BY_WIDGET_ID[widgetId];
  if (!component) {
    throw new Error(`Unknown widget id: ${widgetId}`);
  }
  return component;
};

export const composeWidgetHtml = (component: string, baseUrl: string) => {
  const jsUrl = `${baseUrl}/assets/${component}.js`;
  const cssUrl = `${baseUrl}/assets/${component}.css`;
  return `<!doctype html>\n<html>\n<head>\n  <script type="module" src="${jsUrl}"></script>\n  <link rel="stylesheet" href="${cssUrl}">\n</head>\n<body>\n  <div id="${component}-root"></div>\n</body>\n</html>`;
};

export const createWidgets = () => {
  const widgets: PizzazWidget[] = [
    {
      id: "pizza-map",
      title: "Show Pizza Map",
      templateUri: "ui://widget/pizza-map.html",
      invoking: "Hand-tossing a map",
      invoked: "Served a fresh map",
      responseText: "Rendered a pizza map!",
    },
    {
      id: "pizza-carousel",
      title: "Show Pizza Carousel",
      templateUri: "ui://widget/pizza-carousel.html",
      invoking: "Carousel some spots",
      invoked: "Served a fresh carousel",
      responseText: "Rendered a pizza carousel!",
    },
    {
      id: "pizza-albums",
      title: "Show Pizza Album",
      templateUri: "ui://widget/pizza-albums.html",
      invoking: "Hand-tossing an album",
      invoked: "Served a fresh album",
      responseText: "Rendered a pizza album!",
    },
    {
      id: "pizza-list",
      title: "Show Pizza List",
      templateUri: "ui://widget/pizza-list.html",
      invoking: "Hand-tossing a list",
      invoked: "Served a fresh list",
      responseText: "Rendered a pizza list!",
    },
  ];

  const widgetsById = new Map<string, PizzazWidget>();
  const widgetsByUri = new Map<string, PizzazWidget>();

  widgets.forEach((widget) => {
    widgetsById.set(widget.id, widget);
    widgetsByUri.set(widget.templateUri, widget);
  });

  return {
    list: widgets,
    lookup: {
      byId: widgetsById,
      byUri: widgetsByUri,
    } satisfies WidgetLookup,
  } as const;
};

export const createResourcePayload = (widget: PizzazWidget) => ({
  uri: widget.templateUri,
  name: widget.title,
  description: `${widget.title} widget markup`,
  mimeType: "text/html+skybridge",
  _meta: widgetMeta(widget),
} as const);

export const createResourceTemplatePayload = (widget: PizzazWidget) => ({
  uriTemplate: widget.templateUri,
  name: widget.title,
  description: `${widget.title} widget markup`,
  mimeType: "text/html+skybridge",
  _meta: widgetMeta(widget),
} as const);

export const createToolPayload = (widget: PizzazWidget) => ({
  name: widget.id,
  description: widget.title,
  inputSchema: toolInputSchema,
  title: widget.title,
  _meta: widgetMeta(widget),
  annotations: {
    destructiveHint: false,
    openWorldHint: false,
    readOnlyHint: true,
  },
} as const);

export const respondWithWidget = (widget: PizzazWidget, topping: string) => ({
  content: [
    {
      type: "text" as const,
      text: widget.responseText,
    },
  ],
  structuredContent: {
    pizzaTopping: topping,
  },
  _meta: widgetMeta(widget),
});
