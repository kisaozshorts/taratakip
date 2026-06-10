import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { Logger } from '@/utils/logger'

export const unstable_instant = false

export default async function RootPage() {
  Logger.info('Ana sayfa (/) yükleniyor, yönlendirme kararı alınıyor...')
  
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    Logger.warn('Oturum bulunamadı, kullanıcı /login sayfasına yönlendiriliyor.')
    redirect('/login')
  }

  Logger.info(`Kullanıcı authenticated (${user.email}). Veritabanından rol bilgisi sorgulanıyor...`)

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error) {
    Logger.error('Profil rolü sorgulanırken hata oluştu veya profil bulunamadı:', error)
  }

  const role = profile?.role || 'pending'
  Logger.info(`Profil sorgusu tamamlandı. Kullanıcı Rolü: "${role}"`)

  if (role === 'admin') {
    Logger.info('Rol: admin -> /admin sayfasına yönlendiriliyor.')
    redirect('/admin')
  } else if (role === 'dealer') {
    Logger.info('Rol: dealer -> /dealer sayfasına yönlendiriliyor.')
    redirect('/dealer')
  } else if (role === 'shipper') {
    Logger.info('Rol: shipper -> /shipper sayfasına yönlendiriliyor.')
    redirect('/shipper')
  } else {
    Logger.warn(`Rol: ${role} (onay bekliyor veya tanımsız) -> /pending sayfasına yönlendiriliyor.`)
    redirect('/pending')
  }
}
