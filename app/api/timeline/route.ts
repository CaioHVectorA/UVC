import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import timelineData from "@/data/timeline.json";

// In-memory dynamic store fallback para Vercel Serverless
let dynamicTimeline = { ...timelineData };

export async function GET() {
  const filePath = path.join(process.cwd(), "data", "timeline.json");
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      dynamicTimeline = JSON.parse(content);
    }
  } catch (err) {
    console.warn("Lendo do cache em memória:", err);
  }

  return NextResponse.json(dynamicTimeline, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    dynamicTimeline = { ...dynamicTimeline, ...body };

    const filePath = path.join(process.cwd(), "data", "timeline.json");
    try {
      fs.writeFileSync(filePath, JSON.stringify(dynamicTimeline, null, 2), "utf-8");
    } catch (writeErr) {
      console.warn("Ambiente somente leitura (Vercel Serverless), persistido em memória:", writeErr);
    }

    return NextResponse.json({ success: true, data: dynamicTimeline }, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao atualizar timeline" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
