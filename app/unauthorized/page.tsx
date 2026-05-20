'use client';

import { Container } from "@/components/Container";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase/client";

export default function UnauthorizedPage() {
  const { user } = useAuth();
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-[#050505] text-[#f0f0f0]">
      <Navbar />
      
      <main className="flex-1 flex items-center justify-center py-20 px-4 relative">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_60%_at_50%_40%,rgba(220,38,38,0.1),rgba(255,255,255,0))]"></div>
        
        <Container className="max-w-xl text-center">
          <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-8 relative">
            <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full" />
            <ShieldAlert size={36} className="text-red-500 relative z-10" />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">
            Access Restricted
          </h1>
          
          <p className="text-lg text-zinc-400 mb-2">
            You are logged in as <span className="text-white font-medium">{user?.email}</span>
          </p>
          
          <p className="text-lg text-zinc-400 mb-10 leading-relaxed max-w-md mx-auto">
            You are not an allowed user for PPT generation. Please contact the administrator to request access.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/">
              <Button size="lg" variant="outline" className="h-14 px-8 border-white/10 text-white hover:bg-white/5 bg-transparent rounded-xl w-full sm:w-auto font-bold tracking-wide">
                <ArrowLeft className="mr-2 h-5 w-5" /> Back to Home
              </Button>
            </Link>
            
            <Button size="lg" onClick={handleLogout} className="h-14 px-8 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl w-full sm:w-auto font-bold tracking-wide shadow-lg">
              Sign out
            </Button>
          </div>
        </Container>
      </main>
    </div>
  );
}
