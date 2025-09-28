'use client'
import { useAuthActions } from '@convex-dev/auth/react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { motion, AnimatePresence } from 'framer-motion'
import { TapButton } from './components/ui/motion'

export function SignInForm() {
  const { signIn } = useAuthActions()
  const [flow, setFlow] = useState<'signIn' | 'signUp'>('signIn')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  return (
    <div className='w-full'>
      <motion.form
        className='flex flex-col gap-4'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        onSubmit={(e) => {
          e.preventDefault()
          setSubmitting(true)
          const formData = new FormData(e.target as HTMLFormElement)
          formData.set('flow', flow)
          void signIn('password', formData)
            .then(() => {
              setSubmitting(false)
              navigate('/dashboard')
            })
            .catch((error) => {
              let toastTitle = ''
              if (error.message.includes('Invalid password')) {
                toastTitle = 'Invalid password. Please try again.'
              } else {
                toastTitle =
                  flow === 'signIn'
                    ? 'Could not sign in, did you mean to sign up?'
                    : 'Could not sign up, did you mean to sign in?'
              }
              toast.error(toastTitle)
              setSubmitting(false)
            })
        }}
      >
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <motion.h2
            className='text-2xl font-bold mb-6 text-center'
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          >
            {flow === 'signIn' ? 'Welcome Back' : 'Create Account'}
          </motion.h2>
        </motion.div>

        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className='relative'>
            <motion.input
              className='auth-input-field'
              type='email'
              name='email'
              placeholder='Email'
              required
              whileFocus={{ scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            />
            <motion.div
              className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <svg
                xmlns='http://www.w3.org/2000/svg'
                className='h-5 w-5'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={1.5}
                  d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
                />
              </svg>
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className='relative'>
            <motion.input
              className='auth-input-field'
              type='password'
              name='password'
              placeholder='Password'
              required
              whileFocus={{ scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            />
            <motion.div
              className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <svg
                xmlns='http://www.w3.org/2000/svg'
                className='h-5 w-5'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={1.5}
                  d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
                />
              </svg>
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <TapButton
            className='auth-button'
            type='submit'
            disabled={submitting}
          >
            {submitting ? (
              <div className='flex items-center justify-center'>
                <motion.div
                  className='relative w-5 h-5 mr-2'
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <div className='absolute w-full h-full rounded-full border-2 border-white/30'></div>
                  <div className='absolute w-full h-full rounded-full border-t-2 border-white'></div>
                </motion.div>
                <span>Processing...</span>
              </div>
            ) : flow === 'signIn' ? (
              'Sign in'
            ) : (
              'Sign up'
            )}
          </TapButton>
        </motion.div>

        <motion.div
          className='text-center text-sm text-secondary dark:text-gray-400 mt-2'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <span>
            {flow === 'signIn'
              ? "Don't have an account? "
              : 'Already have an account? '}
          </span>
          <motion.button
            type='button'
            className='text-indigo-600 dark:text-violet-400 hover:text-indigo-500 dark:hover:text-violet-300 font-medium cursor-pointer'
            onClick={() => setFlow(flow === 'signIn' ? 'signUp' : 'signIn')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {flow === 'signIn' ? 'Sign up instead' : 'Sign in instead'}
          </motion.button>
        </motion.div>
      </motion.form>

      <motion.div
        className='flex items-center justify-center my-5'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <hr className='grow border-gray-200 dark:border-gray-800' />
        <span className='mx-4 text-secondary dark:text-gray-400'>or</span>
        <hr className='grow border-gray-200 dark:border-gray-800' />
      </motion.div>

      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <TapButton
          className='auth-button bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600'
          onClick={() =>
            void signIn('anonymous').then(() => navigate('/dashboard'))
          }
        >
          <div className='flex items-center justify-center'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='h-5 w-5 mr-2'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
              />
            </svg>
            Continue as guest
          </div>
        </TapButton>
      </motion.div>
    </div>
  )
}
