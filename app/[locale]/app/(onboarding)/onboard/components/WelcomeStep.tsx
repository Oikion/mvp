"use client";

import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Building2 } from "lucide-react";

interface WelcomeStepProps {
  userName: string;
  dict: {
    greeting: string;
    personalGreeting: string;
    tagline: string;
    description: string;
    getStarted: string;
  };
  onContinue: () => void;
}

export function WelcomeStep({ userName, dict, onContinue }: WelcomeStepProps) {
  const greeting = userName
    ? dict.personalGreeting.replace("{name}", userName.split(" ")[0])
    : dict.greeting;

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] text-center px-4">
      {/* Animated Logo/Icon */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 15,
          delay: 0.2,
        }}
        className="mb-8"
      >
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Building2 className="w-12 h-12 text-primary" />
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.6, type: "spring" }}
            className="absolute -top-2 -right-2"
          >
            <Sparkles className="w-6 h-6 text-warning" />
          </motion.div>
        </div>
      </motion.div>

      {/* Animated Greeting */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="text-4xl md:text-5xl font-bold tracking-tight mb-3"
      >
        {greeting}
      </motion.h1>

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="text-xl text-primary font-medium mb-4"
      >
        {dict.tagline}
      </motion.p>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="text-muted-foreground max-w-md mb-10"
      >
        {dict.description}
      </motion.p>

      {/* CTA Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.5 }}
      >
        <Button
          size="lg"
          onClick={onContinue}
          className="gap-2 text-lg px-8 py-6"
        >
          {dict.getStarted}
          <ArrowRight className="w-5 h-5" />
        </Button>
      </motion.div>

      {/* Decorative elements */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 1.2, duration: 1 }}
        className="absolute inset-0 -z-10 overflow-hidden pointer-events-none"
      >
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </motion.div>
    </div>
  );
}

