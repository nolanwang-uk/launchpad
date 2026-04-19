import { notFound } from "next/navigation";
import { loadAllDocs, loadDoc } from "@/lib/docs";
import { renderMarkdown } from "@/lib/markdown";
import { Prose } from "@/components/Prose";

export function generateStaticParams() {
  return loadAllDocs().map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = loadDoc(slug);
  if (!doc) return { title: "Not found · launchpad" };
  return {
    title: `${doc.title} · launchpad docs`,
    description: doc.summary,
  };
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = loadDoc(slug);
  if (!doc) notFound();

  const html = await renderMarkdown(doc.body);

  return (
    <article>
      <Prose html={html} />
    </article>
  );
}
