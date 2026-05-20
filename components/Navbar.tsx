'use client'

import Link from "next/link";
import { Container } from "./Container";
import { Presentation, ShieldCheck, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { LoginButton } from "./login-button";
import { LogoutButton } from "./logout-button";

export function Navbar() {
  const { user, loading } = useAuth()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-black/40 backdrop-blur-md">
      <Container>
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <div className="w-8 h-8 rounded bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center">
              <Presentation size={18} className="text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-white">
              QuickPPT <span className="text-indigo-400 font-normal">AI</span>
            </h1>
          </Link>
          <nav className="flex items-center gap-3 sm:gap-6">
            {!loading && user && (
              <>
                <Link href="/dashboard" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                  Dashboard
                </Link>
                <Link href="/history" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                  History
                </Link>
              </>
            )}
            {!loading && !user && (
              <>
                <Link href="#features" className="hidden sm:block text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                  Features
                </Link>
                <Link href="#faq" className="hidden sm:block text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                  FAQ
                </Link>
                <Link href="#about" className="hidden sm:block text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                  About
                </Link>
              </>
            )}
            
            {loading ? (
              <div className="h-8 w-24 bg-white/5 animate-pulse rounded-md" />
            ) : user ? (
              <div className="flex items-center gap-4">
                <div className="hidden min-[450px]:flex items-center gap-2 text-[10px] uppercase tracking-widest text-zinc-500 bg-zinc-900/80 px-3 py-1.5 rounded-full border border-zinc-800 font-semibold truncate">
                  <User size={12} className="text-indigo-400 shrink-0" />
                  <span className="truncate">{user.email?.split('@')[0]}</span>
                </div>
                <LogoutButton />
              </div>
            ) : (
              <LoginButton className="hidden min-[450px]:flex items-center justify-center h-8 text-xs px-3 py-1 bg-white text-black hover:bg-zinc-200 rounded-md font-medium gap-1.5 transition-colors" />
            )}
          </nav>
        </div>
      </Container>
    </header>
  );
}
