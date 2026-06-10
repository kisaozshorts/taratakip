import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export const unstable_instant = false

export default async function RootPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role || 'pending'

  if (role === 'admin') {
    redirect('/admin')
  } else if (role === 'dealer') {
    redirect('/dealer')
  } else if (role === 'shipper') {
    redirect('/shipper')
  } else {
    redirect('/pending')
  }
}
