'use client'

import { Navbar } from "@/components/Navbar";
import { Container } from "@/components/Container";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import { 
  FileText, Wand2, Download, Zap, Sparkles, ArrowRight, Presentation, 
  CheckCircle2, Languages, Share2, Layers, Smartphone, LayoutTemplate,
  MessageSquare, Star, ArrowDown, ChevronDown
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { LoginButton } from "@/components/login-button";
import { useState } from "react";

export default function Home() {
  const { user, loading } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const features = [
    { icon: <FileText className="text-indigo-400" size={24} />, title: "Robust AI Extraction", desc: "Instantly extracts questions, options, and logic from messy documents safely." },
    { icon: <Languages className="text-purple-400" size={24} />, title: "Unified Bilingual Text", desc: "Maintains optimal alignment and typography for Hindi and English simultaneously." },
    { icon: <LayoutTemplate className="text-pink-400" size={24} />, title: "Exact Preview Parity", desc: "What you see is what you get. Your downloaded PPT identically mirrors the website preview." },
    { icon: <Layers className="text-red-400" size={24} />, title: "Solving Mode Layout", desc: "Generates empty slides or space-optimized formats specifically mapped out for live teaching." },
    { icon: <Download className="text-orange-400" size={24} />, title: "PPT & PDF Export", desc: "Download native editable .pptx slides with fixed spatial alignments and grids." },
    { icon: <Zap className="text-yellow-400" size={24} />, title: "Rapid Pipeline Processing", desc: "Convert a 50-question mock test into a structured presentation in under 30 seconds." }
  ];

  const faqs = [
    { q: "What file formats are supported?", a: "Currently, we support PDF files containing text and images. For best results, use digitally created PDFs rather than scanned documents." },
    { q: "Does it support Hindi questions?", a: "Yes! Our AI is specially trained to handle bilingual (English + Hindi) question papers commonly used in Indian competitive exams." },
    { q: "Can I download PPT and PDF?", a: "Absolutely. Once your presentation is generated, you can export it as a native, fully editable PowerPoint (.pptx) or a static PDF document." },
    { q: "Is login required?", a: "Yes, we require a quick Google Login to keep your uploaded files and generated presentations secure in your personal dashboard history." },
    { q: "What is the Solving mode layout?", a: "Solving mode generates a special layout optimized for live classroom teaching, leaving ample white space for teachers to solve the question using a pen tablet." },
    { q: "Is mobile supported?", a: "Yes, our dashboard and generator are fully responsive and work great on mobile, tablet, and desktop devices." }
  ];

  return (
    <div className="relative min-h-screen flex flex-col bg-[#050505] text-white selection:bg-indigo-500/30 overflow-x-hidden">
      <Navbar />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden pt-12 md:pt-20 pb-10">
          {/* Background Elements */}
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]"></div>
          <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
          
          <Container>
            <div className="flex flex-col items-center text-center">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-indigo-300"
              >
                <Sparkles size={14} />
                <span>The ultimate tool for educators</span>
              </motion.div>
              
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="w-full max-w-5xl text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight bg-gradient-to-br from-white via-white/90 to-white/30 bg-clip-text text-transparent leading-[1.1] pb-4"
              >
                Convert Question PDFs <br className="hidden md:block"/> into Beautiful PPTs
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-6 w-full max-w-2xl text-lg md:text-xl text-zinc-400 leading-relaxed font-medium"
              >
                AI-powered extraction and instant PowerPoint generation for coaching institutes, schools, and exam preparation formatting.
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full"
              >
                {loading ? (
                  <Button disabled size="lg" className="h-14 w-full sm:w-auto px-8 text-base font-bold bg-white/10 text-white/50 rounded-xl">
                    Loading...
                  </Button>
                ) : user ? (
                  <Link href="/dashboard" className="w-full sm:w-auto">
                    <Button size="lg" className="h-14 w-full sm:w-auto px-8 text-base font-bold bg-white text-black hover:bg-zinc-200 transition-colors shadow-[0_0_30px_rgba(255,255,255,0.15)] rounded-xl relative group overflow-hidden">
                      <span className="relative z-10 flex items-center">
                        Start Generating <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
                      </span>
                    </Button>
                  </Link>
                ) : (
                  <LoginButton className="inline-flex items-center justify-center h-14 w-full sm:w-auto px-8 text-base font-bold bg-white text-black hover:bg-zinc-200 rounded-xl transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] gap-2 group" />
                )}
                <Button variant="outline" size="lg" className="h-14 w-full sm:w-auto px-8 text-base border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-xl backdrop-blur-sm transition-all">
                  Watch Demo
                </Button>
              </motion.div>
            </div>
          </Container>
        </section>

        {/* SHOWCASE / MOCKUP SECTION */}
        <section className="pt-10 md:pt-16 pb-20 md:pb-32 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
          <Container>
            <div className="text-center mb-16">
               <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Built for the Modern Classroom</h2>
               <p className="text-lg text-zinc-400 max-w-3xl mx-auto">Stop copy-pasting into PowerPoint. Focus on teaching while our AI prepares your beautiful slides in seconds.</p>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative mx-auto max-w-5xl rounded-2xl border border-white/10 bg-zinc-900/50 backdrop-blur pb-8 overflow-hidden shadow-2xl shadow-indigo-500/10"
            >
              <div className="flex items-center gap-2 px-6 py-4 border-b border-white/5 bg-black/40">
                 <div className="w-3 h-3 rounded-full bg-red-500/80" />
                 <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                 <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="p-8 flex flex-col md:flex-row gap-8 items-center justify-center">
                 {/* Slide Mockup 1 */}
                 <div className="flex-1 w-full aspect-video bg-white rounded flex flex-col justify-between p-6 shadow-xl relative overflow-hidden transform md:-rotate-2 hover:rotate-0 transition-transform duration-500 cursor-default">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-full" />
                    <div>
                      <div className="text-xs font-bold text-blue-600 mb-2 uppercase tracking-widest">Question 1</div>
                      <div className="h-4 w-3/4 bg-zinc-200 rounded mb-2" />
                      <div className="h-4 w-full bg-zinc-200 rounded mb-2" />
                      <div className="h-4 w-5/6 bg-zinc-200 rounded" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-8">
                       <div className="h-10 border-2 border-zinc-100 rounded flex items-center px-4 text-xs font-medium text-zinc-400">A.</div>
                       <div className="h-10 border-2 border-zinc-100 rounded flex items-center px-4 text-xs font-medium text-zinc-400">B.</div>
                       <div className="h-10 border-2 border-zinc-100 rounded flex items-center px-4 text-xs font-medium text-zinc-400">C.</div>
                       <div className="h-10 border-2 border-zinc-100 rounded flex items-center px-4 text-xs font-medium text-zinc-400">D.</div>
                    </div>
                 </div>

                 {/* Arrow */}
                 <div className="hidden md:flex flex-col items-center justify-center text-indigo-400">
                    <Zap size={32} className="mb-2" />
                    <ArrowRight size={24} />
                 </div>

                 {/* Slide Mockup 2 (Solving Layout) */}
                 <div className="flex-1 w-full aspect-video bg-zinc-900 border border-white/20 rounded flex flex-col p-6 shadow-xl transform md:rotate-2 hover:rotate-0 transition-transform duration-500 cursor-default">
                    <div>
                      <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
                        <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest text-[10px]">Solving Space</div>
                        <div className="text-[10px] text-zinc-500">Q1</div>
                      </div>
                      <div className="h-2 w-full bg-white/10 rounded mb-2" />
                      <div className="h-2 w-5/6 bg-white/10 rounded" />
                    </div>
                    <div className="flex-1 border-2 border-dashed border-white/5 rounded-lg mt-4 flex items-center justify-center text-white/5">
                        <span className="font-mono text-xl opacity-20">Blank Area for solving</span>
                    </div>
                 </div>
              </div>
            </motion.div>
          </Container>
        </section>

        {/* HOW IT WORKS / WORKFLOW SECTION */}
        <section id="about" className="py-20 md:py-32 relative border-t border-white/5 bg-zinc-950/30">
          <Container>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold bg-gradient-to-br from-white to-white/50 bg-clip-text text-transparent mb-4">How QuickPPT AI Works</h2>
              <p className="text-lg text-zinc-400 max-w-2xl mx-auto">From messy paper to professional presentation in four simple steps.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
              <div className="hidden md:block absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent -translate-y-1/2" />
              
              {[
                { step: "01", title: "Upload PDF", desc: "Drag and drop your question paper PDF into our secure dashboard." },
                { step: "02", title: "AI Extraction", desc: "Our Gemini-powered engine reads and structures the questions." },
                { step: "03", title: "Format & Preview", desc: "Review slides, select Standard or Solving layouts instantly." },
                { step: "04", title: "Export", desc: "Download as an editable .pptx or .pdf ready for the classroom." }
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="relative z-10 p-6 rounded-3xl bg-zinc-900 border border-white/10 text-center flex flex-col items-center hover:bg-zinc-800/80 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-lg mb-4 border border-indigo-500/30">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </Container>
        </section>

        {/* FEATURES GRID */}
        <section id="features" className="py-20 md:py-32 relative border-t border-white/5">
          <Container>
            <div className="mb-16 md:mb-24 md:flex items-end justify-between">
              <div className="max-w-2xl">
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 text-white">Packed with features<br/>designed for educators.</h2>
                <p className="text-lg text-zinc-400 leading-relaxed">Everything you need to automate your presentation workflow, built directly into a seamless modern interface.</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group p-8 rounded-3xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/10 hover:border-indigo-500/40 transition-colors"
                >
                  <div className="mb-6 w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                  <p className="text-zinc-400 leading-relaxed text-sm">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </Container>
        </section>



        {/* WHY CHOOSE US / STATS */}
        <section className="py-20 md:py-32 border-t border-white/5 relative">
           <Container>
              <div className="grid md:grid-cols-2 gap-16 items-center">
                 <div>
                   <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white bg-clip-text text-transparent">Save hours of manual formatting work.</h2>
                   <div className="space-y-6 mt-8">
                     {[
                       "Zero manual copy-pasting required.",
                       "Perfect for dense mock test papers.",
                       "Reduces prep time from 2 hours to 2 minutes.",
                       "Output formats ready for interactive panels."
                     ].map((item, i) => (
                       <div key={i} className="flex items-center gap-4 text-zinc-300 bg-white/5 p-4 rounded-2xl border border-white/5">
                         <CheckCircle2 className="text-green-500 shrink-0" size={24} />
                         <span className="font-medium">{item}</span>
                       </div>
                     ))}
                   </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/10 p-8 rounded-3xl border border-indigo-500/20 text-center flex flex-col justify-center min-h-[200px]">
                       <div className="text-5xl font-black text-white mb-2">95%</div>
                       <div className="text-sm text-indigo-200 font-medium">Time Saved</div>
                    </div>
                    <div className="bg-gradient-to-br from-white/10 to-transparent p-8 rounded-3xl border border-white/10 text-center flex flex-col justify-center min-h-[200px]">
                       <div className="text-5xl font-black text-white mb-2">100+</div>
                       <div className="text-sm text-zinc-400 font-medium">Supported Formats</div>
                    </div>
                    <div className="bg-gradient-to-br from-white/10 to-transparent p-8 rounded-3xl border border-white/10 text-center flex flex-col justify-center min-h-[200px]">
                       <div className="text-5xl font-black text-white mb-2">∞</div>
                       <div className="text-sm text-zinc-400 font-medium">Generations</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/10 p-8 rounded-3xl border border-purple-500/20 text-center flex flex-col justify-center min-h-[200px]">
                       <div className="text-5xl font-black text-white mb-2"><Sparkles className="mx-auto" size={40} /></div>
                       <div className="text-sm text-purple-200 font-medium">AI Precision</div>
                    </div>
                 </div>
              </div>
           </Container>
        </section>

        {/* FAQ SECTION */}
        <section id="faq" className="py-20 md:py-32 relative border-t border-white/5 max-w-4xl mx-auto">
          <Container>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Frequently Asked Questions</h2>
            </div>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div key={i} className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden transition-colors hover:bg-white/10">
                  <button 
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left font-semibold text-lg text-white"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-180 text-indigo-400' : 'text-zinc-500'}`} />
                  </button>
                  <div 
                    className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${openFaq === i ? 'max-h-40 pb-6 opacity-100' : 'max-h-0 opacity-0'}`}
                  >
                    <p className="text-zinc-400 leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* BOTTOM CTA */}
        <section className="py-24 md:py-32 relative border-t border-white/5 overflow-hidden">
          <div className="absolute inset-0 bg-indigo-500/10"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-[300px] bg-indigo-500/30 blur-[120px] rounded-full pointer-events-none"></div>
          <Container className="relative z-10 text-center">
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-8">Ready to upgrade your teaching?</h2>
            {loading ? (
              <Button disabled size="lg" className="h-14 px-10 text-lg font-bold bg-white/10 text-white/50 rounded-xl">
                Loading...
              </Button>
            ) : user ? (
              <Link href="/dashboard">
                <Button size="lg" className="h-14 px-10 text-lg font-bold bg-white text-black hover:bg-zinc-200 transition-colors shadow-[0_0_40px_rgba(255,255,255,0.2)] rounded-xl">
                  Open Dashboard <ArrowRight className="ml-2" />
                </Button>
              </Link>
            ) : (
              <div className="flex justify-center">
                 <LoginButton className="inline-flex items-center justify-center h-14 px-10 text-lg font-bold bg-white text-black hover:bg-zinc-200 rounded-xl transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)] gap-2 group" />
              </div>
            )}
          </Container>
        </section>
      </main>
      
      {/* FOOTER */}
      <footer className="border-t border-white/10 bg-[#020202] pt-20 pb-10">
        <Container>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-16 lg:mb-24">
            <div className="col-span-2 lg:col-span-1">
               <Link href="/" className="flex items-center gap-3 mb-6 transition-opacity hover:opacity-80">
                  <div className="w-8 h-8 rounded bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center">
                     <Presentation size={18} className="text-white" />
                  </div>
                  <h1 className="text-xl font-bold tracking-tight text-white">
                     QuickPPT <span className="text-indigo-400 font-normal">AI</span>
                  </h1>
               </Link>
               <p className="text-zinc-500 text-sm leading-relaxed mb-6 pe-4">
                 Empowering educators and creators by automating the most tedious part of lesson preparation.
               </p>
               <div className="flex gap-4">
                 <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"><Share2 size={18} /></div>
                 <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"><MessageSquare size={18} /></div>
               </div>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-6">Product</h4>
              <ul className="space-y-4 text-sm text-zinc-500 font-medium">
                <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#about" className="hover:text-white transition-colors">How it works</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Changelog</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-6">Resources</h4>
              <ul className="space-y-4 text-sm text-zinc-500 font-medium">
                <li><Link href="#faq" className="hover:text-white transition-colors">FAQ</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Tutorials</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Blog</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-6">Legal</h4>
              <ul className="space-y-4 text-sm text-zinc-500 font-medium">
                <li><Link href="#" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Cookie Policy</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Contact Us</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/10 gap-4">
             <p className="text-sm font-medium text-zinc-600">
               © 2026 QuickPPT AI. All rights reserved.
             </p>
             <p className="text-xs font-semibold tracking-widest uppercase text-zinc-700 flex items-center gap-1">
               Powered by Google Gemini <Sparkles size={12} className="text-indigo-900" />
             </p>
          </div>
        </Container>
      </footer>
    </div>
  );
}

