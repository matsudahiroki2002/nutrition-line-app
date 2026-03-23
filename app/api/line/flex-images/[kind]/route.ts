import React from "react";
import { NextResponse } from "next/server";
import { ImageResponse } from "next/og";
import { getLineFlexSourceImageUrl, isLineFlexImageKind } from "@/src/services/line/lineFlexMessage";

const FLEX_IMAGE_SIZE = 1024;

type RouteContext = {
  params: Promise<{
    kind: string;
  }>;
};

async function fetchImageAsDataUrl(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch flex source image: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "image/png";
  const buffer = Buffer.from(await response.arrayBuffer());
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { kind } = await context.params;

    if (!isLineFlexImageKind(kind)) {
      return NextResponse.json({ ok: false, message: "invalid flex image kind" }, { status: 404 });
    }

    const sourceImageDataUrl = await fetchImageAsDataUrl(getLineFlexSourceImageUrl(kind));
    const response = new ImageResponse(
      React.createElement(
        "div",
        {
          style: {
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#ffffff"
          }
        },
        React.createElement("img", {
          src: sourceImageDataUrl,
          alt: "",
          width: FLEX_IMAGE_SIZE,
          height: FLEX_IMAGE_SIZE,
          style: {
            width: "100%",
            height: "100%",
            objectFit: "cover"
          }
        })
      ),
      {
        width: FLEX_IMAGE_SIZE,
        height: FLEX_IMAGE_SIZE
      }
    );

    response.headers.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "server error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
