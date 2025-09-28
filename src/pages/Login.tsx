import { motion } from 'framer-motion'
import ThemeToggle from '../lib/ThemeToggle'
import { SignInForm } from '../SignInForm'
import { Link } from 'react-router-dom'

export default function Login() {
  return (
    <div className='min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 text-gray-900 dark:text-gray-100'>
      <motion.header
        className='sticky top-0 z-20 glass h-16 flex justify-between items-center border-b border-gray-200/30 dark:border-gray-800/30 shadow-sm px-4 md:px-8'
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className='flex items-center gap-2'>
          <div className='w-8 h-8 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold'>
            T
          </div>
          <h2 className='text-xl font-semibold tracking-tight'>
            Tomu<span className='gradient-text'>.sh</span>
          </h2>
        </div>
        <div className='flex items-center gap-3'>
          <ThemeToggle />
          <Link to='/' className='btn btn-secondary'>
            Home
          </Link>
        </div>
      </motion.header>
      <main className='flex-1 flex items-center justify-center p-4'>
        <motion.div
          className='card card-hover p-6 sm:p-8 max-w-md w-full'
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <SignInForm />
        </motion.div>
      </main>
    </div>
  )
}
