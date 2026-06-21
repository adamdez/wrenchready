"use client";

import { motion, useReducedMotion } from "framer-motion";

type AnimatedHeadingProps = {
  text: string;
  className?: string;
  gradient?: boolean;
  delay?: number;
};

export function AnimatedHeading({
  text,
  className = "",
  gradient = false,
  delay = 0,
}: AnimatedHeadingProps) {
  const reduceMotion = useReducedMotion();
  const words = text.split(" ");

  if (reduceMotion) {
    return <h1 className={`${gradient ? "gradient-text" : ""} ${className}`}>{text}</h1>;
  }

  return (
    <motion.h1
      className={`${gradient ? "gradient-text" : ""} ${className}`}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      transition={{ staggerChildren: 0.04, delayChildren: delay }}
    >
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          className="inline-block"
          variants={{
            hidden: { opacity: 0, y: 20, filter: "blur(8px)" },
            visible: {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
            },
          }}
        >
          {word}
          {i < words.length - 1 ? "\u00A0" : ""}
        </motion.span>
      ))}
    </motion.h1>
  );
}

type CountUpProps = {
  target: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number;
};

export function CountUp({
  target,
  prefix = "",
  suffix = "",
  className,
}: CountUpProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <span className={className}>{prefix}{target}{suffix}</span>;
  }

  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
    >
      <motion.span
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        {prefix}
        <motion.span>
          {target}
        </motion.span>
        {suffix}
      </motion.span>
    </motion.span>
  );
}
