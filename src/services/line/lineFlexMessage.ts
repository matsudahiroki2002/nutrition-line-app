import { env } from "@/src/lib/env";

export type LineResultLinkTarget = "pdf" | "purchase";
export type LineFlexImageKind = "pdf" | "purchase";

type LineFlexComponent =
  | {
      type: "box";
      layout: "vertical" | "horizontal" | "baseline";
      spacing?: string;
      margin?: string;
      flex?: number;
      contents: LineFlexComponent[];
      backgroundColor?: string;
      cornerRadius?: string;
      paddingAll?: string;
      paddingTop?: string;
      paddingBottom?: string;
      paddingStart?: string;
      paddingEnd?: string;
      justifyContent?: string;
      alignItems?: string;
    }
  | {
      type: "text";
      text: string;
      weight?: "regular" | "bold";
      size?: string;
      color?: string;
      wrap?: boolean;
      maxLines?: number;
      margin?: string;
      flex?: number;
    }
  | {
      type: "button";
      style?: "primary" | "secondary" | "link";
      color?: string;
      height?: "sm" | "md";
      margin?: string;
      action: {
        type: "uri";
        label: string;
        uri: string;
      };
    }
  | {
      type: "separator";
      margin?: string;
      color?: string;
    }
  | {
      type: "image";
      url: string;
      size?: string;
      aspectRatio?: string;
      aspectMode?: "cover" | "fit";
      animated?: boolean;
      action?: {
        type: "uri";
        uri: string;
      };
      gravity?: string;
    };

type LineFlexBubble = {
  type: "bubble";
  size?: "nano" | "micro" | "deca" | "hecto" | "kilo" | "mega" | "giga";
  hero?: Extract<LineFlexComponent, { type: "image" }>;
  body?: Extract<LineFlexComponent, { type: "box" }>;
  footer?: Extract<LineFlexComponent, { type: "box" }>;
  styles?: {
    hero?: { backgroundColor?: string };
    body?: { backgroundColor?: string };
    footer?: { backgroundColor?: string; separator?: boolean };
  };
};

export type LineFlexMessage = {
  type: "flex";
  altText: string;
  contents:
    | LineFlexBubble
    | {
        type: "carousel";
        contents: LineFlexBubble[];
      };
};

const flexSourceImageUrls: Record<LineFlexImageKind, string> = {
  pdf: "https://firebasestorage.googleapis.com/v0/b/nutrition-lineapp.firebasestorage.app/o/line%2Fimagemap%2FResult_btn2603.png?alt=media&token=2bd93900-c320-4823-b2db-dd3d1337e6b4",
  purchase:
    "https://firebasestorage.googleapis.com/v0/b/nutrition-lineapp.firebasestorage.app/o/line%2Fimagemap%2FBuy_btn2603_ver2.png?alt=media&token=f4173d84-c984-4235-9637-c46f4e7eff5f"
};

function normalizeAppBaseUrl(): string {
  const normalizedUrl = new URL(env.APP_BASE_URL.trim());

  if (normalizedUrl.protocol !== "https:") {
    throw new Error("APP_BASE_URL must be an HTTPS URL for LINE Flex message delivery.");
  }

  return normalizedUrl.toString().replace(/\/+$/, "");
}

function buildTrackedLinkUrl(reportId: string, target: LineResultLinkTarget): string {
  const normalizedReportId = reportId.trim();
  if (!normalizedReportId) {
    throw new Error("reportId is required to build LINE result links.");
  }

  return `${normalizeAppBaseUrl()}/api/line/reports/${encodeURIComponent(normalizedReportId)}/open/${target}`;
}

function buildFlexImageUrl(kind: LineFlexImageKind): string {
  return `${normalizeAppBaseUrl()}/api/line/flex-images/${kind}`;
}

function buildHero(kind: LineFlexImageKind, uri: string): Extract<LineFlexComponent, { type: "image" }> {
  return {
    type: "image",
    url: buildFlexImageUrl(kind),
    size: "full",
    aspectRatio: "20:20",
    aspectMode: "fit",
    action: {
      type: "uri",
      uri
    }
  };
}

function buildPdfBubble(reportId: string): LineFlexBubble {
  const uri = buildTrackedLinkUrl(reportId, "pdf");

  return {
    type: "bubble",
    size: "micro",
    hero: buildHero("pdf", uri),
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "12px",
      spacing: "xs",
      contents: [
        {
          type: "text",
          text: "RESULT PDF",
          size: "xxs",
          weight: "bold",
          color: "#2E6B53"
        },
        {
          type: "text",
          text: "診断結果を確認",
          size: "sm",
          weight: "bold",
          color: "#173728",
          wrap: true,
          maxLines: 1
        },
        {
          type: "text",
          text: "PDFで確認できます。",
          size: "xxs",
          color: "#5D6B63",
          wrap: true,
          maxLines: 1
        }
      ]
    },
    footer: {
      type: "box",
      layout: "vertical",
      paddingTop: "0px",
      paddingBottom: "12px",
      paddingStart: "12px",
      paddingEnd: "12px",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#2E6B53",
          height: "sm",
          action: {
            type: "uri",
            label: "PDFを見る",
            uri
          }
        }
      ]
    },
    styles: {
      body: { backgroundColor: "#F7FBF8" },
      footer: { backgroundColor: "#F7FBF8" }
    }
  };
}

function buildPurchaseBubble(reportId: string): LineFlexBubble {
  const uri = buildTrackedLinkUrl(reportId, "purchase");

  return {
    type: "bubble",
    size: "micro",
    hero: buildHero("purchase", uri),
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "12px",
      spacing: "xs",
      contents: [
        {
          type: "text",
          text: "RECOMMEND",
          size: "xxs",
          weight: "bold",
          color: "#8E4D2B"
        },
        {
          type: "text",
          text: "おすすめ商品を確認",
          size: "sm",
          weight: "bold",
          color: "#4D2A18",
          wrap: true,
          maxLines: 1
        },
        {
          type: "text",
          text: "商品を確認できます。",
          size: "xxs",
          color: "#706056",
          wrap: true,
          maxLines: 1
        }
      ]
    },
    footer: {
      type: "box",
      layout: "vertical",
      paddingTop: "0px",
      paddingBottom: "12px",
      paddingStart: "12px",
      paddingEnd: "12px",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#C9703C",
          height: "sm",
          action: {
            type: "uri",
            label: "商品を見る",
            uri
          }
        }
      ]
    },
    styles: {
      body: { backgroundColor: "#FFF8F3" },
      footer: { backgroundColor: "#FFF8F3" }
    }
  };
}

export function buildResultBundleFlexMessages(reportId: string): LineFlexMessage[] {
  return [
    {
      type: "flex",
      altText: "診断結果とおすすめ商品を確認する",
      contents: {
        type: "carousel",
        contents: [buildPdfBubble(reportId), buildPurchaseBubble(reportId)]
      }
    }
  ];
}

export function isLineResultLinkTarget(value: string): value is LineResultLinkTarget {
  return value === "pdf" || value === "purchase";
}

export function isLineFlexImageKind(value: string): value is LineFlexImageKind {
  return value === "pdf" || value === "purchase";
}

export function getLineFlexSourceImageUrl(kind: LineFlexImageKind): string {
  return flexSourceImageUrls[kind];
}
