'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, Loader2 } from 'lucide-react'

export function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    setIsLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <button 
      onClick={handleLogout}
      disabled={isLoading}
      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-zinc-300 hover:bg-white/10 hover:text-white h-8 px-3"
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 md:mr-2 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4 md:mr-2" />
      )}
      <span className="hidden md:inline">Sign out</span>
    </button>
  )
}
