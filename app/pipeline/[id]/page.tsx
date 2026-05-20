import { Container } from "@/components/Container";
import { Navbar } from "@/components/Navbar";
import { PipelineManager } from "@/components/PipelineManager";

export default async function PipelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="flex min-h-screen flex-col bg-[#050505]">
      <Navbar />
      <main className="flex-1 py-8">
        <Container>
          <div className="max-w-4xl mx-auto">
            <header className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Processing Pipeline</h1>
              <p className="text-sm text-zinc-500 uppercase tracking-widest font-bold">Watch your presentation being built</p>
            </header>
            <PipelineManager presentationId={id} />
          </div>
        </Container>
      </main>
    </div>
  );
}
