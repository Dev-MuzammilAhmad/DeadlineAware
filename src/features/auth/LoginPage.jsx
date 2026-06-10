import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Clock, Eye, EyeOff, Loader2 } from 'lucide-react'
import useAuth from '../../hooks/useAuth'

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
})

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(loginSchema)
  })

  const onSubmit = async (data) => {
    setError('')
    try {
      await login(data.email, data.password)
      navigate('/dashboard')
    } catch (e) {
      console.error(e)
      if (e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
        setError('Incorrect email or password.')
      } else {
        setError('Failed to sign in. Please check your credentials.')
      }
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setGoogleLoading(true)
    try {
      await loginWithGoogle()
      navigate('/dashboard')
    } catch (e) {
      console.error(e)
      if (e.code !== 'auth/popup-closed-by-user') {
        setError('Failed to sign in with Google. Please try again.')
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-base text-text-main flex flex-col items-center justify-center p-4 transition-colors duration-200">
      <div className="w-full max-w-[350px] space-y-4">
        {/* Logo */}
        <div className="flex items-center justify-center">
          <img 
            src="/DeadlineAware-logo.png" 
            alt="DeadlineAware" 
            className="h-14 w-14 object-contain -mr-1" 
            style={{ filter: 'contrast(1.6) brightness(0.85) drop-shadow(0px 0px 1px rgba(0,0,0,0.3))' }} 
          />
          <span className="font-extrabold text-2xl tracking-tight text-text-main">
            Deadline<span className="text-primary">Aware</span>
          </span>
        </div>

        <div className="w-full bg-bg-surface py-5 px-4 border border-border-main shadow-md rounded-2xl sm:py-6 sm:px-8">
          <div className="mb-5 text-center">
            <h2 className="text-xl font-bold tracking-tight text-text-main">
              Sign in to your account
            </h2>
            <p className="mt-1 text-xs text-text-sub">
              Or{' '}
              <Link to="/register" className="font-semibold text-primary hover:underline">
                create a new account for free
              </Link>
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="p-2.5 bg-danger-main/10 border border-danger-main/20 text-danger-main text-xs font-semibold rounded-xl">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-bold text-text-sub uppercase tracking-wider">
                Email address
              </label>
              <div className="mt-1.5">
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register('email')}
                  className={`w-full px-3 py-2 bg-bg-base border rounded-xl text-sm text-text-main placeholder-text-sub/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition ${
                    errors.email ? 'border-danger-main' : 'border-border-main'
                  }`}
                  placeholder="name@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-danger-main font-semibold">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-xs font-bold text-text-sub uppercase tracking-wider">
                  Password
                </label>
                <div className="text-xs">
                  <Link
                    to="/forgot-password"
                    className="font-semibold text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>
              <div className="mt-1.5 relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password')}
                  className={`w-full px-3 py-2 pr-10 bg-bg-base border rounded-xl text-sm text-text-main placeholder-text-sub/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition ${
                    errors.password ? 'border-danger-main' : 'border-border-main'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-sub hover:text-text-main cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                {errors.password && (
                  <p className="mt-1 text-xs text-danger-main font-semibold">{errors.password.message}</p>
                )}
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={isSubmitting || googleLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-primary hover:bg-opacity-90 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 transition duration-150 cursor-pointer items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>

          <div className="mt-5">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border-main" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                <span className="px-2 bg-bg-surface text-text-sub">Or continue with</span>
              </div>
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting || googleLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-border-main rounded-xl text-sm font-semibold text-text-main bg-bg-base hover:bg-bg-surface transition duration-150 cursor-pointer disabled:opacity-50"
              >
                {googleLoading ? (
                  <Loader2 size={18} className="animate-spin text-primary" />
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                )}
                <span>Google</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
