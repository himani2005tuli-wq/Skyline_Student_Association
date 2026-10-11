import { motion } from 'framer-motion';

export const EASE = [0.16, 1, 0.3, 1];

export function Reveal({ children, delay = 0, y = 26, className, once = true }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount: 0.15 }}
      transition={{ duration: 0.7, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* Masked line-by-line reveal — the signature on-load moment. */
export function MaskLines({ lines, className, delay = 0, inView = false, stagger = 0.12, testid }) {
  const anim = inView ? { whileInView: 'show' } : { animate: 'show' };
  return (
    <span className={className} data-testid={testid}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
          <motion.span
            className="block will-change-transform"
            initial={{ y: '112%' }}
            {...anim}
            variants={inView ? { show: { y: 0 } } : undefined}
            animate={inView ? undefined : { y: 0 }}
            whileInView={inView ? { y: 0 } : undefined}
            viewport={inView ? { once: true, amount: 0.4 } : undefined}
            transition={{ duration: 0.95, delay: delay + i * stagger, ease: EASE }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </span>
  );
}
