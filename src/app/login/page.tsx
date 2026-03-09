import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LoginForm from './LoginForm'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { message?: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Penstok</h1>
          <p className="mt-2 text-sm text-gray-600">アカウントにサインイン</p>
        </div>

        {searchParams.message && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm text-center">
            {searchParams.message}
          </div>
        )}

        <LoginForm />
      </div>
    </div>
  )
}
