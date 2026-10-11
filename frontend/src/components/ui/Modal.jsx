import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function Modal({ open, isOpen, onClose, title, children, wide = false, testid = 'modal' }) {
  const panelRef = useRef(null);
  const isVisible = Boolean(open ?? isOpen);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const prevVisibleRef = useRef(false);

  useEffect(() => {
    if (!isVisible) {
      prevVisibleRef.current = false;
      return undefined;
    }

    const wasOpen = prevVisibleRef.current;
    prevVisibleRef.current = true;

    const onKey = (e) => {
      if (e.key === 'Escape') {
        onCloseRef.current?.();
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Only focus modal panel once upon opening, never stealing focus from child inputs
    if (!wasOpen) {
      if (panelRef.current && !panelRef.current.contains(document.activeElement)) {
        panelRef.current.focus();
      }
    }

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-testid={testid}
        >
          <div
            className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className={`relative max-h-[88vh] w-full overflow-y-auto rounded-t-3xl bg-paper-card p-6 shadow-lift sm:rounded-3xl sm:p-8 ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <h3 className="font-display text-2xl font-semibold text-ink">{title}</h3>
              <button
                onClick={onClose}
                aria-label="Close dialog"
                data-testid={`${testid}-close`}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/10 text-ink/60 transition hover:bg-ink hover:text-paper"
              >
                <X size={16} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
