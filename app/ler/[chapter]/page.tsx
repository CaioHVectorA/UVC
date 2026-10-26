import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getChapters } from "@/lib/chapters";
import { Reader } from "@/components/reader";
import book from "@/books/red-right-hand/book.json";
export function generateStaticParams() {
  return book.capitulos.map((c) => ({ chapter: String(c.numero) }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ chapter: string }>;
}) {
  const { chapter } = await params;
  return {
    title: `${book.capitulos.find((c) => String(c.numero) === chapter)?.titulo || "Leitura"} — Red Right Hand`,
  };
}
export default async function ReadingPage({
  params,
}: {
  params: Promise<{ chapter: string }>;
}) {
  const { chapter } = await params;
  if (!book.capitulos.some((c) => String(c.numero) === chapter)) notFound();
  const chapters = await getChapters();
  return (
    <>
      <Link href="/historias/red-right-hand" className="breadcrumb mt-8">
        <ArrowLeft size={15} aria-hidden />
        Red Right Hand · Ato I: Primeiros Passos
      </Link>
      <Reader
        key={chapter}
        chapters={chapters.map((c) => ({
          ...c,
          text: c.numero === Number(chapter) ? c.text : "",
        }))}
        initialChapter={Number(chapter)}
      />
    </>
  );
}
