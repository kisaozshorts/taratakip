'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Logger } from '@/utils/logger'

export async function login(prevState: any, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  Logger.info(`Giriş denemesi başlatıldı. E-posta: ${email}`)

  if (!email || !password) {
    Logger.warn('Giriş denemesi başarısız: E-posta veya şifre eksik.')
    return { error: 'Lütfen e-posta ve şifrenizi girin.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    Logger.error(`Giriş denemesi başarısız (${email}):`, error.message)
    return { error: 'Giriş başarısız: E-posta veya şifre hatalı.' }
  }

  Logger.info(`Giriş başarılı. Oturum açıldı: ${email}`)
  redirect('/')
}

export async function signup(prevState: any, formData: FormData) {
  const email = formData.get('email') as string
  const username = formData.get('username') as string
  const password = formData.get('password') as string

  Logger.info(`Yeni kullanıcı kayıt denemesi. E-posta: ${email}, Kullanıcı Adı: @${username}`)

  if (!email || !username || !password) {
    Logger.warn('Kayıt denemesi başarısız: Eksik alanlar var.')
    return { error: 'Lütfen tüm alanları doldurun.' }
  }

  if (username.trim().length < 3) {
    Logger.warn(`Kayıt denemesi başarısız: Kullanıcı adı çok kısa (${username.trim()})`)
    return { error: 'Kullanıcı adı en az 3 karakter olmalıdır.' }
  }

  const supabase = await createClient()
  
  // Önce kullanıcı adının veritabanında benzersiz olup olmadığını kontrol edelim
  Logger.info(`Kullanıcı adı benzersizliği kontrol ediliyor: @${username.trim()}`)
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', username.trim())
    .maybeSingle()

  if (existingProfile) {
    Logger.warn(`Kayıt denemesi başarısız: Kullanıcı adı zaten alınmış: @${username.trim()}`)
    return { error: 'Bu kullanıcı adı zaten alınmış.' }
  }

  Logger.info(`Supabase Auth signup tetikleniyor: ${email}`)
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: username.trim(),
      },
    },
  })

  if (error) {
    Logger.error(`Kayıt başarısız oldu (${email}):`, error.message)
    return { error: 'Kayıt başarısız: ' + error.message }
  }

  Logger.info(`Kayıt başarılı. Kullanıcı oluşturuldu: ${email} / @${username.trim()}`)
  redirect('/')
}

export async function logout() {
  Logger.info('Çıkış işlemi tetiklendi. Oturum sonlandırılıyor...')
  const supabase = await createClient()
  await supabase.auth.signOut()
  Logger.info('Çıkış yapıldı. Kullanıcı /login sayfasına yönlendiriliyor.')
  redirect('/login')
}
