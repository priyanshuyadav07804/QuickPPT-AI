import { PreviewView } from "@/components/PreviewView";

export default async function PreviewPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  return <PreviewView id={id} />;
}
