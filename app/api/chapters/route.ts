import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const chapterNumber = searchParams.get("num") || "00";
  const fileName = `${chapterNumber.padStart(2, "0")}-a-reuniao.md`; // fallback pattern
  
  const capitulosDir = path.join(process.cwd(), "books", "red-right-hand", "capitulos");
  
  try {
    const files = fs.readdirSync(capitulosDir);
    const targetFile = files.find(f => f.startsWith(chapterNumber.padStart(2, "0")));
    if (targetFile) {
      const content = fs.readFileSync(path.join(capitulosDir, targetFile), "utf-8");
      return NextResponse.json({ chapter: targetFile, content }, {
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }
  } catch (err) {
    console.warn("Erro ao ler capítulo:", err);
  }

  return NextResponse.json({ error: "Capítulo não encontrado" }, {
    status: 404,
    headers: { "Access-Control-Allow-Origin": "*" }
  });
}

export async function POST(req: Request) {
  try {
    const { chapterNumber, content } = await req.json();
    const capitulosDir = path.join(process.cwd(), "books", "red-right-hand", "capitulos");
    
    if (fs.existsSync(capitulosDir)) {
      const files = fs.readdirSync(capitulosDir);
      const targetFile = files.find(f => f.startsWith(String(chapterNumber).padStart(2, "0")));
      if (targetFile) {
        fs.writeFileSync(path.join(capitulosDir, targetFile), content, "utf-8");
        return NextResponse.json({ success: true, saved: targetFile }, {
          headers: { "Access-Control-Allow-Origin": "*" }
        });
      }
    }
    return NextResponse.json({ success: true, status: "cached" }, {
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao salvar capítulo" }, { status: 500 });
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
