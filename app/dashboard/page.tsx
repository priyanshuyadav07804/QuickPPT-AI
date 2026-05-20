import { Navbar } from "@/components/Navbar";
import { Container } from "@/components/Container";
import { UploadDashboard } from "@/components/UploadDashboard";
import { PresentationHistory } from "@/components/PresentationHistory";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#050505]">
      <Navbar />
      <main className="flex-1">
        <section className="py-8 md:py-12 lg:py-16 border-b border-white/5 bg-zinc-950/30">
          <Container>
            <div className="w-full">
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                Create Presentation
              </h1>
              <p className="mt-4 text-base md:text-lg text-zinc-400 font-medium leading-relaxed max-w-3xl">
                Our ultra-fast AI engine handles extraction and formatting in real-time. Simply drop your file below.
              </p>
            </div>
          </Container>
        </section>
        <section className="py-8 md:py-12 lg:py-16">
          <Container>
            <div className="grid gap-8 lg:gap-12 lg:grid-cols-[1.2fr_1fr] xl:grid-cols-[1.4fr_1fr] 2xl:grid-cols-[1.6fr_1fr]">
              <div className="min-w-0">
                <UploadDashboard />
              </div>
              <div className="lg:border-l lg:border-white/5 lg:pl-10 min-w-0">
                <PresentationHistory />
              </div>
            </div>
          </Container>
        </section>
      </main>
    </div>
  );
}
