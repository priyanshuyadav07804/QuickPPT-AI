'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Loader2, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function AuthCallback() {
  const router = useRouter()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    // Wait for Supabase to process the URL fragment/code
    const handleAuth = async () => {
      try {
        const { error } = await supabase.auth.getSession()
        if (error) throw error
        
        // Ensure successful redirection
        router.replace('/dashboard')
      } catch (err: any) {
        console.error('Error during auth callback:', err)
        setErrorMsg(err.message || 'An error occurred during authentication.')
      }
    }
    
    handleAuth()
  }, [router])

  if (errorMsg) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50 p-6 text-slate-900 font-sans">
        <div className="max-w-md w-full bg-white border border-red-200 rounded-xl shadow-sm p-6 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Authentication Failed</h2>
          <p className="text-slate-600 text-sm">{errorMsg}</p>
          <Link href="/" className="inline-block mt-4 px-4 py-2 bg-zinc-900 text-white rounded-md text-sm font-medium hover:bg-zinc-800 transition-colors">
            Return to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen flex-col bg-[#050505]">
      <div className="text-center">
        <Loader2 className="animate-spin text-white mx-auto mb-4" size={40} />
        <p className="text-sm font-semibold uppercase tracking-widest text-zinc-500">Verifying Identity...</p>
      </div>
    </div>
  )
}
