import { motion } from 'framer-motion'

export function BackgroundMintLovable() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <motion.div
        className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-gradient-to-br from-primary-200 via-primary-300 to-accent-200 blur-3xl opacity-70"
        animate={{ y: [0, 20, 0], x: [0, 10, 0] }}
        transition={{ duration: 10, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-[-15%] right-[-10%] w-[35vw] h-[35vw] rounded-full bg-gradient-to-br from-accent-200 via-primary-200 to-primary-300 blur-3xl opacity-60"
        animate={{ y: [0, -15, 0], x: [0, -10, 0] }}
        transition={{ duration: 12, repeat: Infinity }}
      />
      <motion.div
        className="absolute top-[20%] right-[10%] w-[20vw] h-[20vw] rounded-full bg-gradient-to-br from-white/60 to-primary-100 blur-2xl opacity-70"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
    </div>
  )
}
