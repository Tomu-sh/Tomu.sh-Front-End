import { motion } from 'framer-motion'
import ThemeToggle from '../lib/ThemeToggle'
// Wallet stats are hidden on landing per requirements
// import { WalletButton } from '../components/WalletButton'
// import { Authenticated, Unauthenticated } from 'convex/react'
import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className='min-h-screen flex flex-col noir text-white relative'>
      <div className='starfield twinkle' />
      <motion.header
        className='sticky top-0 z-20 h-16 flex justify-between items-center border-b silver-border/60 px-4 md:px-8 bg-black/60 backdrop-blur-md'
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <motion.div
          className='flex items-center gap-2'
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 400, damping: 10 }}
        >
          <div className='w-8 h-8 rounded-md bg-white/10 ring-1 ring-white/20 flex items-center justify-center font-bold'>
            ✦
          </div>
          <h2 className='text-xl font-semibold tracking-tight silver-text'>
            Tomu<span className='text-white/60'>.sh</span>
          </h2>
        </motion.div>
        {/* <div className='flex items-center gap-3'>
          <Link
            to='/studio'
            className='hidden md:inline text-sm silver-muted hover:text-white'
          >
            Studio
          </Link>
          <Link
            to='/history'
            className='hidden md:inline text-sm silver-muted hover:text-white'
          >
            History
          </Link>
          <Link
            to='/about'
            className='hidden md:inline text-sm silver-muted hover:text-white'
          >
            About
          </Link>
          <ThemeToggle />
        </div> */}
      </motion.header>
      <main className='flex-1 flex flex-col relative overflow-hidden'>
        <section className='relative flex-1 flex items-center'>
          <div className='container-custom py-16 md:py-24 relative z-10'>
            <div className='flex flex-col items-center text-center'>
              <motion.p
                className='text-sm tracking-widest uppercase silver-muted mb-4'
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                Tomu.sh
              </motion.p>
              <motion.h1
                className='text-5xl md:text-7xl font-extrabold leading-[1.05] mb-6'
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                Goodbye, Subscription Fees.
                <br className='hidden md:block' />
                Hello, <span className='text-white'>pay-as-you-go</span>
              </motion.h1>
              <motion.p
                className='text-lg md:text-xl silver-muted max-w-3xl'
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.35 }}
              >
                Never pay in full, forget subscriptions, pay only what you use.
              </motion.p>
              <motion.div
                className='mt-10 flex flex-wrap gap-4 justify-center'
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                <Link
                  to='/login'
                  className='btn px-6 py-3 text-lg bg-white text-black hover:bg-white/90'
                >
                  Start Saving ✦
                </Link>
                <Link
                  to='https://github.com/orgs/Tomu-sh/repositories'
                  className='btn px-6 py-3 text-lg bg-transparent border border-white/20 hover:bg-white/10'
                >
                  Github
                </Link>
              </motion.div>
            </div>
          </div>
          {/* silver glow */}
          <div
            className='pointer-events-none absolute -inset-x-40 top-[-30%] h-[120%] opacity-40'
            style={{
              background:
                'radial-gradient(60% 40% at 50% 40%, rgba(255,255,255,0.08), transparent 60%)',
            }}
          />
        </section>
      </main>
    </div>
  )
}
