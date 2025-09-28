import { motion } from 'framer-motion'
import ThemeToggle from '../lib/ThemeToggle'
// Wallet stats are hidden on landing per requirements
// import { WalletButton } from '../components/WalletButton'
// import { Authenticated, Unauthenticated } from 'convex/react'
import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className='min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 text-gray-900 dark:text-gray-100'>
      <motion.header
        className='sticky top-0 z-20 glass h-16 flex justify-between items-center border-b border-gray-200/30 dark:border-gray-800/30 shadow-sm px-4 md:px-8'
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <motion.div
          className='flex items-center gap-2'
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 400, damping: 10 }}
        >
          <div className='w-8 h-8 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold'>
            T
          </div>
          <h2 className='text-xl font-semibold tracking-tight'>
            Tomu<span className='gradient-text'>.sh</span>
          </h2>
        </motion.div>
        <div className='flex items-center gap-3'>
          <ThemeToggle />
        </div>
      </motion.header>
      <main className='flex-1 flex flex-col'>
        <div className='bg-gradient-to-br from-gray-900 to-gray-950 dark:from-gray-900 dark:to-black text-white relative overflow-hidden'>
          <div className='container-custom py-6'>
            <div className='flex flex-col items-center relative z-10'>
              <motion.h1
                className='text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 text-center max-w-4xl'
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <span className='hero-gradient-text'>
                  AI Pay‑per‑Generation
                </span>
              </motion.h1>
              <motion.p
                className='text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto text-center'
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.35 }}
              >
                Generate stunning AI content with transparent, per-use pricing.
              </motion.p>
              <motion.div
                className='mt-8 flex flex-wrap gap-4 justify-center'
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                <Link to='/login' className='btn btn-primary px-6 py-3 text-lg'>
                  Get Started
                </Link>
                <Link
                  to='/dashboard'
                  className='btn btn-secondary px-6 py-3 text-lg'
                >
                  Go to Dashboard
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
