import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '@/components/Logo';

const KEY = 'altitude.splashed';
const MIN_MS = 150;

/* Branded first-load curtain. Shows once per session, waits for the window
   load event (or MIN_MS, whichever is later), then slides away smoothly. */
export default function SplashScreen() {
  const [show, setShow] = useState(() => {
    try {
      return !sessionStorage.getItem(KEY);
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!show) return undefined;
    document.body.style.overflow = 'hidden';
    const started = Date.now();
    let timer;
    const finish = () => {
      const left = Math.max(0, MIN_MS - (Date.now() - started));
      timer = setTimeout(() => {
        try {
          sessionStorage.setItem(KEY, '1');
        } catch {}
        setShow(false);
        document.body.style.overflow = '';
      }, left);
    };
    if (document.readyState === 'complete') finish();
    else window.addEventListener('load', finish, { once: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener('load', finish);
      document.body.style.overflow = '';
    };
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="splash"
          role="status"
          aria-label="Loading Altitude"
          data-testid="splash-screen"
          className="noise fixed inset-0 z-[200] flex flex-col items-center justify-center bg-ink text-paper"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25, ease: 'easeOut' } }}
        >
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-6"
          >
            <Logo />
            <div className="h-px w-40 overflow-hidden bg-paper/15">
              <motion.div
                className="h-full bg-accent"
                initial={{ x: '-100%' }}
                animate={{ x: '0%' }}
                transition={{ duration: MIN_MS / 1000, ease: [0.65, 0, 0.35, 1] }}
              />
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-paper/45">
              Reaching altitude
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
