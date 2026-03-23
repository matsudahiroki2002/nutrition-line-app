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

export type LineFlexMessage = {
  type: "flex";
  altText: string;
  contents: {
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
};

const flexSourceImageUrls: Record<LineFlexImageKind, string> = {
  pdf: "https://firebasestorage.googleapis.com/v0/b/nutrition-lineapp.firebasestorage.app/o/line%2Fimagemap%2Fpdf-base.png?alt=media&token=4b3d80ef-02ad-47c4-b1e4-607ec359aeaf",
  purchase:
    "https://firebasestorage.googleapis.com/v0/b/nutrition-lineapp.firebasestorage.app/o/line%2Fimagemap%2Fpurchase-base.png?alt=media&token=dc90a7d0-46b6-4520-989a-9d05dac53d50"
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
    aspectRatio: "1:1",
    aspectMode: "cover",
    action: {
      type: "uri",
      uri
    }
  };
}

function buildPdfFlexMessage(reportId: string): LineFlexMessage {
  const uri = buildTrackedLinkUrl(reportId, "pdf");

  return {
    type: "flex",
    altText: "診断結果PDFを開く",
    contents: {
      type: "bubble",
      size: "mega",
      hero: buildHero("pdf", uri),
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "22px",
        spacing: "md",
        contents: [
          {
            type: "box",
            layout: "baseline",
            contents: [
              {
                type: "text",
                text: "RESULT PDF",
                size: "xs",
                weight: "bold",
                color: "#2E6B53"
              }
            ]
          },
          {
            type: "text",
            text: "診断結果を確認する",
            size: "xl",
            weight: "bold",
            color: "#173728",
            wrap: true
          },
          {
            type: "text",
            text: "認証完了後すぐにPDFを開けます。タップして内容を確認してください。",
            size: "sm",
            color: "#5D6B63",
            wrap: true
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingTop: "0px",
        paddingBottom: "20px",
        paddingStart: "22px",
        paddingEnd: "22px",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#2E6B53",
            height: "md",
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
    }
  };
}

function buildPurchaseFlexMessage(reportId: string): LineFlexMessage {
  const uri = buildTrackedLinkUrl(reportId, "purchase");

  return {
    type: "flex",
    altText: "おすすめ商品を確認する",
    contents: {
      type: "bubble",
      size: "mega",
      hero: buildHero("purchase", uri),
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "22px",
        spacing: "md",
        contents: [
          {
            type: "box",
            layout: "baseline",
            contents: [
              {
                type: "text",
                text: "RECOMMEND",
                size: "xs",
                weight: "bold",
                color: "#8E4D2B"
              }
            ]
          },
          {
            type: "text",
            text: "おすすめ商品を確認する",
            size: "xl",
            weight: "bold",
            color: "#4D2A18",
            wrap: true
          },
          {
            type: "text",
            text: "診断結果に合わせた購入導線をすぐ開けます。気になる商品をそのままチェックできます。",
            size: "sm",
            color: "#706056",
            wrap: true
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingTop: "0px",
        paddingBottom: "20px",
        paddingStart: "22px",
        paddingEnd: "22px",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#C9703C",
            height: "md",
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
    }
  };
}

export function buildResultBundleFlexMessages(reportId: string): LineFlexMessage[] {
  return [buildPdfFlexMessage(reportId), buildPurchaseFlexMessage(reportId)];
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
