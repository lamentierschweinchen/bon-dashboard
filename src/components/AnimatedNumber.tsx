"use client";

import { useEffect, useRef } from "react";
import { useMotionValue, useSpring, useTransform, motion } from "framer-motion";

type Props = {
  value: number;
  percentage?: boolean;
  className?: string;
};

export function AnimatedNumber({ value, percentage, className }: Props) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { duration: 800, bounce: 0 });
  const display = useTransform(spring, (v) => {
    if (percentage) return `${v.toFixed(1)}%`;
    return Math.round(v).toLocaleString();
  });
  const prevValue = useRef(0);

  useEffect(() => {
    if (value !== prevValue.current) {
      motionValue.set(value);
      prevValue.current = value;
    }
  }, [value, motionValue]);

  return <motion.span className={className}>{display}</motion.span>;
}
