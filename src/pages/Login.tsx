import { motion } from 'framer-motion'
import ThemeToggle from '../lib/ThemeToggle'
import { SignInForm } from '../SignInForm'
import { Link } from 'react-router-dom'

export default function Login() {
  return (
    <div className='min-h-screen flex flex-col noir text-white relative'>
      <div className='starfield twinkle' />
      <motion.header
        className='sticky top-0 z-20 h-16 flex justify-between items-center border-b silver-border/60 px-4 md:px-8 bg-black/60 backdrop-blur-md'
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className='flex items-center gap-2'>
          <div className='w-8 h-8 rounded-md bg-white/10 ring-1 ring-white/20 flex items-center justify-center font-bold'>
            ✦
          </div>
          <h2 className='text-xl font-semibold tracking-tight silver-text'>
            Tomu<span className='text-white/60'>.sh</span>
          </h2>
        </div>
        <div className='flex items-center gap-3'>
          <ThemeToggle />
          <Link
            to='/'
            className='btn px-3 py-2 bg-transparent border border-white/20 hover:bg-white/10'
          >
            Home
          </Link>
        </div>
      </motion.header>
      <main className='flex-1 flex items-center justify-center p-4 relative z-10'>
        <motion.div
          className='card-noir p-6 sm:p-8 max-w-md w-full'
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
