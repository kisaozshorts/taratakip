'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function login(prevState: any, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Lütfen e-posta ve şifrenizi girin.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: 'Giriş başarısız: E-posta veya şifre hatalı.' }
  }

  redirect('/')
}

export async function signup(prevState: any, formData: FormData) {
  const email = formData.get('email') as string
  const username = formData.get('username') as string
  const password = formData.get('password') as string

  if (!email || !username || !password) {
    return { error: 'Lütfen tüm alanları doldurun.' }
  }

  if (username.trim().length < 3) {
    return { error: 'Kullanıcı adı en az 3 karakter olmalıdır.' }
  }

  const supabase = await createClient()
  
  // Önce kullanıcı adının veritabanında benzersiz olup olmadığını kontrol edelim
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', username.trim())
    .maybeSingle()

  if (existingProfile) {
    return { error: 'Bu kullanıcı adı zaten alınmış.' }
  }

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
    return { error: 'Kayıt başarısız: ' + error.message }
  }

  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
