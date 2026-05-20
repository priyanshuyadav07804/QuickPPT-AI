import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const protectedPaths = ['/app', '/history', '/dashboard', '/preview', '/upload', '/presentation']
  const isProtectedPath = protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path))
  const isApiPath = request.nextUrl.pathname.startsWith('/api/') && request.nextUrl.pathname !== '/api/auth'

  if (!isProtectedPath && !isApiPath) {
    return supabaseResponse
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('Middleware: Supabase URL/Key missing')
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (isProtectedPath) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/'
      return NextResponse.redirect(redirectUrl)
    }

    if (user && user.email) {
      const { data: allowedUser } = await supabase.from('allowed_users').select('email').eq('email', user.email).single()
      if (!allowedUser) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/unauthorized'
        return NextResponse.redirect(redirectUrl)
      }
    }
  }

  if (isApiPath) {
     if (!user) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
     }
     if (user && user.email) {
       const { data: allowedUser } = await supabase.from('allowed_users').select('email').eq('email', user.email).single()
       if (!allowedUser) {
         return NextResponse.json({ error: 'Access denied: You are not an allowed user.' }, { status: 403 })
       }
     }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
