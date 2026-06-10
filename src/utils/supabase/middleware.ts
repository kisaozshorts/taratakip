import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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

  // Kullanıcı oturumunu güvenli bir şekilde doğrula
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Statik dosyaları ve API rotalarını middleware kapsamından çıkaralım
  if (
    path.startsWith('/_next') ||
    path.startsWith('/api/') ||
    path.includes('.') ||
    path === '/favicon.ico'
  ) {
    return supabaseResponse
  }

  // Giriş yapmamış kullanıcıyı korumalı sayfalardan login'e yönlendir
  if (!user) {
    if (path !== '/login' && path !== '/register') {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // Giriş yapmış kullanıcının profil rolünü veritabanından sorgula
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role || 'pending'

  // Giriş yapmış kullanıcıyı /login veya /register sayfalarından ana sayfaya yönlendir
  if (path === '/login' || path === '/register') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Ana sayfaya gelen kullanıcıyı rolüne göre ilgili alt sayfaya yönlendir
  if (path === '/') {
    const url = request.nextUrl.clone()
    if (role === 'admin') {
      url.pathname = '/admin'
    } else if (role === 'dealer') {
      url.pathname = '/dealer'
    } else if (role === 'shipper') {
      url.pathname = '/shipper'
    } else {
      url.pathname = '/pending'
    }
    return NextResponse.redirect(url)
  }

  // Sayfa bazlı rol doğrulamaları (Yetkisiz erişimleri ana sayfaya yönlendir, oradan doğru role dağıtılacak)
  if (path.startsWith('/admin') && role !== 'admin') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }
  if (path.startsWith('/dealer') && role !== 'dealer') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }
  if (path.startsWith('/shipper') && role !== 'shipper') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }
  if (path.startsWith('/pending') && role !== 'pending') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
