import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Clock, Loader2, ArrowLeft, CheckCircle } from 'lucide-react'
import useAuth from '../../hooks/useAuth'

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
})

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema)
  })

  const onSubmit = async (data) => {
    setError('')
    setSuccess(false)
    try {
      await resetPassword(data.email)
      setSuccess(true)
    } catch (e) {
      console.error(e)
      if (e.code === 'auth/user-not-found') {
        setError('No account found with this email address.')
      } else {
        setError('Failed to send password reset email. Please try again.')
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
              Reset your password
            </h2>
            <p className="mt-1.5 text-xs text-text-sub">
              We will send you a link to reset your password and regain access to your account.
            </p>
          </div>

          {success ? (
            <div className="space-y-4 text-center">
              <div className="flex justify-center text-primary">
                <CheckCircle size={44} className="animate-bounce" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-semibold text-text-main">Check your email</h3>
                <p className="text-xs text-text-sub">
                  If an account exists, a secure password reset link has been dispatched to your inbox.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-primary hover:underline"
                >
                  <ArrowLeft size={14} />
                  Return to sign in
                </Link>
              </div>
            </div>
          ) : (
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

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-primary hover:bg-opacity-90 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 transition duration-150 cursor-pointer items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Sending reset link...
                    </>
                  ) : (
                    'Send reset link'
                  )}
                </button>
              </div>

              <div className="flex justify-center border-t border-border-main pt-4">
                <Link
                  to="/login"
                  className="flex items-center gap-2 text-xs font-semibold text-text-sub hover:text-text-main"
                >
                  <ArrowLeft size={14} />
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
