'use client'

import { motion } from 'framer-motion'

export const LoadingScreen = () => (
  <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="text-center"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="w-12 h-12 border-2 border-muted border-t-primary rounded-full mx-auto mb-4"
      />
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-lg font-medium text-muted-foreground"
      >
        Loading Oikion
      </motion.h2>
    </motion.div>
  </div>
)



