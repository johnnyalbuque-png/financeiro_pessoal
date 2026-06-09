import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TrendingUp, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import clsx from 'clsx'

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
})

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
})

type LoginFormData = z.infer<typeof loginSchema>
type RegisterFormData = z.infer<typeof registerSchema>

const Login = () => {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { login, register } = useAuth()

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const handleLogin = async (data: LoginFormData) => {
    setError(null)
    try {
      await login(data.email, data.password)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      setError(e?.response?.data?.message || 'Erro ao fazer login. Verifique suas credenciais.')
    }
  }

  const handleRegister = async (data: RegisterFormData) => {
    setError(null)
    try {
      await register(data.name, data.email, data.password)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      setError(e?.response?.data?.message || 'Erro ao criar conta. Tente novamente.')
    }
  }

  const switchTab = (newTab: 'login' | 'register') => {
    setTab(newTab)
    setError(null)
    loginForm.reset()
    registerForm.reset()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-violet-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center shadow-lg mb-4">
            <TrendingUp className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Financeiro Pessoal</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie suas finanças com facilidade</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => switchTab('login')}
              className={clsx(
                'flex-1 py-4 text-sm font-semibold transition-colors',
                tab === 'login'
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/50'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              Entrar
            </button>
            <button
              onClick={() => switchTab('register')}
              className={clsx(
                'flex-1 py-4 text-sm font-semibold transition-colors',
                tab === 'register'
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/50'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              Criar Conta
            </button>
          </div>

          <div className="p-6">
            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Login Form */}
            {tab === 'login' && (
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <div>
                  <label className="label">E-mail</label>
                  <input
                    type="email"
                    placeholder="seu@email.com"
                    className={clsx(
                      'input-field',
                      loginForm.formState.errors.email && 'border-red-300 focus:ring-red-500',
                    )}
                    {...loginForm.register('email')}
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-red-500 text-xs mt-1">
                      {loginForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="label">Senha</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className={clsx(
                        'input-field pr-10',
                        loginForm.formState.errors.password && 'border-red-300 focus:ring-red-500',
                      )}
                      {...loginForm.register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-red-500 text-xs mt-1">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loginForm.formState.isSubmitting}
                  className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
                >
                  {loginForm.formState.isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </button>
              </form>
            )}

            {/* Register Form */}
            {tab === 'register' && (
              <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                <div>
                  <label className="label">Nome Completo</label>
                  <input
                    type="text"
                    placeholder="Seu nome"
                    className={clsx(
                      'input-field',
                      registerForm.formState.errors.name && 'border-red-300 focus:ring-red-500',
                    )}
                    {...registerForm.register('name')}
                  />
                  {registerForm.formState.errors.name && (
                    <p className="text-red-500 text-xs mt-1">
                      {registerForm.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="label">E-mail</label>
                  <input
                    type="email"
                    placeholder="seu@email.com"
                    className={clsx(
                      'input-field',
                      registerForm.formState.errors.email && 'border-red-300 focus:ring-red-500',
                    )}
                    {...registerForm.register('email')}
                  />
                  {registerForm.formState.errors.email && (
                    <p className="text-red-500 text-xs mt-1">
                      {registerForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="label">Senha</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      className={clsx(
                        'input-field pr-10',
                        registerForm.formState.errors.password &&
                          'border-red-300 focus:ring-red-500',
                      )}
                      {...registerForm.register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {registerForm.formState.errors.password && (
                    <p className="text-red-500 text-xs mt-1">
                      {registerForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="label">Confirmar Senha</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Repita a senha"
                      className={clsx(
                        'input-field pr-10',
                        registerForm.formState.errors.confirmPassword &&
                          'border-red-300 focus:ring-red-500',
                      )}
                      {...registerForm.register('confirmPassword')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {registerForm.formState.errors.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1">
                      {registerForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={registerForm.formState.isSubmitting}
                  className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
                >
                  {registerForm.formState.isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    'Criar Conta'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Seus dados são armazenados com segurança
        </p>
      </div>
    </div>
  )
}

export default Login
