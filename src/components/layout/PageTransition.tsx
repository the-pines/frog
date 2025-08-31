'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  const depth = segments.length;

  const prevDepthRef = React.useRef<number>(depth);
  const direction = depth >= prevDepthRef.current ? 1 : -1;
  React.useEffect(() => {
    prevDepthRef.current = depth;
  }, [depth]);

  return (
    <AnimatePresence initial={false} mode="wait" custom={direction}>
      <motion.div
        key={pathname}
        custom={direction}
        initial={{ x: direction > 0 ? 80 : -80, opacity: 0.6 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'tween', ease: 'easeOut', duration: 0.16 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
