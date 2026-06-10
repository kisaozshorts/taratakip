import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Logger } from '@/utils/logger'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  const path = request.nextUrl.pathname

  // Statik dosyaları ve API rotalarını filtreleyelim ve middleware kapsamından çıkaralım
  const isStatic =
    path.startsWith('/_next') ||
    path.startsWith('/api/') ||
    path.includes('.') ||
    path === '/favicon.ico'

  if (isStatic) {
    return supabaseResponse
  }

  Logger.info(`Proxy isteği yakalandı. Rota: ${path}`)

  // Oturumu doğrula
  const {
    data: { user },
  } = await supabase.auth.getUser()

  Logger.info(`Oturum kontrol sonucu: ${user ? `Aktif Oturum var (${user.email})` : 'Oturum yok'}`)

  // Giriş yapmamış kullanıcıyı korumalı sayfalardan login'e yönlendir
  if (!user) {
    if (path !== '/login' && path !== '/register') {
      Logger.warn(`Yetkisiz erişim engellendi. Rota: ${path} -> Giriş sayfasına yönlendiriliyor.`)
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // Giriş yapmış kullanıcıyı /login veya /register sayfalarından yönlendir
  if (user && (path === '/login' || path === '/register')) {
    Logger.info(`Giriş yapmış kullanıcı auth sayfasından ana sayfaya yönlendiriliyor. Rota: ${path} -> /`)
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
