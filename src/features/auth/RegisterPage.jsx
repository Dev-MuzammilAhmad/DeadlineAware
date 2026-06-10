import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Clock, Eye, EyeOff, Loader2 } from 'lucide-react'
import useAuth from '../../hooks/useAuth'

const registerSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number' }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
})

export default function RegisterPage() {
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(registerSchema)
  })

  const onSubmit = async (data) => {
    setError('')
    try {
      await registerUser(data.email, data.password)
      navigate('/dashboard')
    } catch (e) {
      console.error(e)
      if (e.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.')
      } else if (e.code === 'auth/invalid-email') {
        setError('Invalid email address.')
      } else {
        setError(e.message || 'Failed to create account. Please try again.')
      }
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
              Create a new account
            </h2>
            <p className="mt-1 text-xs text-text-sub">
              Or{' '}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                sign in to your existing account
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
              <label htmlFor="password" className="block text-xs font-bold text-text-sub uppercase tracking-wider">
                Password
              </label>
              <div className="mt-1.5 relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
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

            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-bold text-text-sub uppercase tracking-wider">
                Confirm Password
              </label>
              <div className="mt-1.5 relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  {...register('confirmPassword')}
                  className={`w-full px-3 py-2 pr-10 bg-bg-base border rounded-xl text-sm text-text-main placeholder-text-sub/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition ${
                    errors.confirmPassword ? 'border-danger-main' : 'border-border-main'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-sub hover:text-text-main cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-danger-main font-semibold">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-primary hover:bg-opacity-90 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 transition duration-150 cursor-pointer items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create account'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
