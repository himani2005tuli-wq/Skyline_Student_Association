import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, Info, AlertCircle, CheckCircle2, X } from 'lucide-react';

const ConfirmContext = createContext(null);

let globalConfirmHandler = null;

/**
 * Imperative global confirm dialog fallback for non-React code.
 */
export function confirmDialog(options) {
  if (globalConfirmHandler) {
    return globalConfirmHandler.confirm(options);
  }
  // Fallback if provider is not mounted
  if (typeof window !== 'undefined') {
    const msg = typeof options === 'string' ? options : options?.message || options?.description || options?.title || 'Are you sure?';
    return Promise.resolve(window.confirm(msg));
  }
  return Promise.resolve(false);
}

/**
 * Imperative global alert dialog fallback for non-React code.
 */
export function alertDialog(options) {
  if (globalConfirmHandler) {
    return globalConfirmHandler.alert(options);
  }
  if (typeof window !== 'undefined') {
    const msg = typeof options === 'string' ? options : options?.message || options?.description || options?.title || '';
    window.alert(msg);
  }
  return Promise.resolve();
}

const TONE_CONFIG = {
  danger: {
    icon: Trash2,
    iconWrapperClass: 'bg-red-500/15 border-red-500/30 text-red-400',
    auraClass: 'from-red-500/15 via-red-500/5 to-transparent',
    confirmButtonClass:
      'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-[0_8px_24px_-6px_rgba(239,68,68,0.55)]',
    defaultConfirmText: 'Delete',
  },
  warning: {
    icon: AlertTriangle,
    iconWrapperClass: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
    auraClass: 'from-amber-500/15 via-amber-500/5 to-transparent',
    confirmButtonClass:
      'bg-amber-500 hover:bg-amber-600 text-black shadow-[0_8px_24px_-6px_rgba(245,158,11,0.5)]',
    defaultConfirmText: 'Proceed',
  },
  success: {
    icon: CheckCircle2,
    iconWrapperClass: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
    auraClass: 'from-emerald-500/15 via-emerald-500/5 to-transparent',
    confirmButtonClass:
      'bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_8px_24px_-6px_rgba(16,185,129,0.5)]',
    defaultConfirmText: 'Confirm',
  },
  info: {
    icon: Info,
    iconWrapperClass: 'bg-accent/15 border-accent/30 text-accent',
    auraClass: 'from-accent/20 via-accent/5 to-transparent',
    confirmButtonClass:
      'bg-accent hover:bg-accent-dark text-white shadow-[0_8px_24px_-6px_rgba(255,77,28,0.55)]',
    defaultConfirmText: 'Confirm',
  },
};

export function ConfirmProvider({ children }) {
  const [dialogState, setDialogState] = useState(null);
  const resolverRef = useRef(null);
  const confirmButtonRef = useRef(null);

  const closeDialog = useCallback((result) => {
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
    setDialogState(null);
  }, []);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      const opts = typeof options === 'string' ? { message: options } : (options || {});
      setDialogState({
        type: 'confirm',
        title: opts.title || 'Please Confirm',
        description: opts.description || opts.message || 'Are you sure you want to proceed?',
        highlight: opts.highlight || null,
        tone: opts.tone || 'danger',
        confirmText: opts.confirmText,
        cancelText: opts.cancelText || 'Cancel',
        icon: opts.icon,
      });
    });
  }, []);

  const alert = useCallback((options) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      const opts = typeof options === 'string' ? { message: options } : (options || {});
      setDialogState({
        type: 'alert',
        title: opts.title || 'Notice',
        description: opts.description || opts.message || '',
        highlight: opts.highlight || null,
        tone: opts.tone || 'info',
        confirmText: opts.confirmText || 'Got it',
        cancelText: null,
        icon: opts.icon,
      });
    });
  }, []);

  useEffect(() => {
    globalConfirmHandler = { confirm, alert };
    return () => {
      globalConfirmHandler = null;
    };
  }, [confirm, alert]);

  // Handle keyboard shortcuts (Escape and Enter)
  useEffect(() => {
    if (!dialogState) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeDialog(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        closeDialog(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    // Autofocus confirm button
    const t = setTimeout(() => confirmButtonRef.current?.focus(), 50);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(t);
    };
  }, [dialogState, closeDialog]);

  const tone = dialogState?.tone && TONE_CONFIG[dialogState.tone] ? dialogState.tone : 'danger';
  const toneCfg = TONE_CONFIG[tone];
  const IconComponent = dialogState?.icon && typeof dialogState.icon === 'object'
    ? dialogState.icon
    : toneCfg.icon;

  return (
    <ConfirmContext.Provider value={{ confirm, alert, messageBox: confirm }}>
      {children}

      <AnimatePresence>
        {dialogState && (
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="messagebox-title"
            aria-describedby="messagebox-desc"
          >
            {/* Backdrop Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => closeDialog(false)}
              className="absolute inset-0 bg-[#07090F]/75 backdrop-blur-md"
              aria-hidden="true"
            />

            {/* Modal Dialog Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: 'spring', damping: 26, stiffness: 360 }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0B0E17] p-6 text-[#F6F2E9] shadow-[0_25px_65px_-12px_rgba(0,0,0,0.8)] sm:p-7"
            >
              {/* Ambient radial glow header */}
              <div
                className={`pointer-events-none absolute -top-24 left-1/2 h-44 w-72 -translate-x-1/2 rounded-full bg-gradient-to-b ${toneCfg.auraClass} blur-2xl`}
                aria-hidden="true"
              />

              {/* Top Row: Icon + Close button */}
              <div className="flex items-start justify-between gap-4">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${toneCfg.iconWrapperClass}`}
                >
                  <IconComponent size={22} strokeWidth={2.2} />
                </div>

                <button
                  type="button"
                  onClick={() => closeDialog(false)}
                  className="rounded-full p-2 text-white/50 transition hover:bg-white/10 hover:text-white"
                  aria-label="Close dialog"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Title & Description */}
              <div className="mt-4">
                <h3
                  id="messagebox-title"
                  className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl"
                >
                  {dialogState.title}
                </h3>
                <p
                  id="messagebox-desc"
                  className="mt-2 text-sm leading-relaxed text-[#F6F2E9]/70"
                >
                  {dialogState.description}
                </p>

                {dialogState.highlight && (
                  <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs font-mono text-white/90">
                    {dialogState.highlight}
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="mt-6 flex flex-wrap items-center justify-end gap-3 pt-2">
                {dialogState.type === 'confirm' && (
                  <button
                    type="button"
                    onClick={() => closeDialog(false)}
                    className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white active:scale-[0.98]"
                  >
                    {dialogState.cancelText}
                  </button>
                )}

                <button
                  ref={confirmButtonRef}
                  type="button"
                  onClick={() => closeDialog(true)}
                  className={`rounded-full px-6 py-2.5 text-sm font-semibold tracking-tight transition active:scale-[0.98] ${toneCfg.confirmButtonClass}`}
                >
                  {dialogState.confirmText || toneCfg.defaultConfirmText}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a <ConfirmProvider>');
  }
  return context;
}

export function useMessageBox() {
  return useConfirm();
}
