import { motion, HTMLMotionProps } from 'framer-motion'
import { ReactNode } from 'react'

// Fade in animation
export const FadeIn = ({
  children,
  delay = 0,
  duration = 0.5,
  ...props
}: HTMLMotionProps<'div'> & {
  children: ReactNode
  delay?: number
  duration?: number
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration, delay }}
    {...props}
  >
    {children}
  </motion.div>
)

// Slide up animation
export const SlideUp = ({
  children,
  delay = 0,
  duration = 0.5,
  distance = 20,
  ...props
}: HTMLMotionProps<'div'> & {
  children: ReactNode
  delay?: number
  duration?: number
  distance?: number
}) => (
  <motion.div
    initial={{ opacity: 0, y: distance }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: distance }}
    transition={{ duration, delay }}
    {...props}
  >
    {children}
  </motion.div>
)

// Scale animation
export const ScaleIn = ({
  children,
  delay = 0,
  duration = 0.5,
  ...props
}: HTMLMotionProps<'div'> & {
  children: ReactNode
  delay?: number
  duration?: number
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    transition={{ duration, delay }}
    {...props}
  >
    {children}
  </motion.div>
)

// Stagger children animation
export const Stagger = ({
  children,
  staggerDelay = 0.1,
  ...props
}: HTMLMotionProps<'div'> & {
  children: ReactNode
  staggerDelay?: number
}) => {
  return (
    <motion.div
      initial='hidden'
      animate='show'
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// Stagger item (to be used within Stagger)
export const StaggerItem = ({
  children,
  duration = 0.5,
  ...props
}: HTMLMotionProps<'div'> & {
  children: ReactNode
  duration?: number
}) => {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        show: {
          opacity: 1,
          y: 0,
          transition: {
            duration,
          },
        },
      }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// Hover animation for cards and buttons
export const HoverCard = ({
  children,
  scale = 1.02,
  ...props
}: HTMLMotionProps<'div'> & {
  children: ReactNode
  scale?: number
}) => (
  <motion.div
    whileHover={{
      scale,
      y: -5,
      boxShadow:
        '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    }}
    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    {...props}
  >
    {children}
  </motion.div>
)

// Button tap animation
export const TapButton = ({
  children,
  ...props
}: HTMLMotionProps<'button'> & {
  children: ReactNode
}) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    {...props}
  >
    {children}
  </motion.button>
)

// Gradient hover effect
export const GradientHover = ({
  children,
  from = 'rgba(99, 102, 241, 0.8)',
  to = 'rgba(139, 92, 246, 0.8)',
  ...props
}: HTMLMotionProps<'div'> & {
  children: ReactNode
  from?: string
  to?: string
}) => (
  <motion.div
    initial={{
      background: `linear-gradient(120deg, ${from} 0%, ${to} 100%)`,
      backgroundSize: '200% 200%',
      backgroundPosition: '0% 50%',
    }}
    whileHover={{
      backgroundPosition: '100% 50%',
    }}
    transition={{ duration: 0.8, ease: 'easeInOut' }}
    {...props}
  >
    {children}
  </motion.div>
)
