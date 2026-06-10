import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Aşağıdakiler dışındaki tüm istek yollarını yakalar:
     * - _next/static (statik dosyalar)
     * - _next/image (görsel optimizasyon dosyaları)
     * - favicon.ico (favicon dosyası)
     * - Tüm resim/medya uzantıları
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
