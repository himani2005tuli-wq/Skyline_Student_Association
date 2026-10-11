import { forwardRef, useEffect, useRef, useState } from 'react';
import { Loader2, Check } from 'lucide-react';

const variants = {
  accent:
    'bg-accent text-white hover:bg-accent-dark shadow-[0_10px_24px_-10px_rgba(255,77,28,0.55)]',
  ink: 'bg-ink text-paper hover:bg-ink-700',
  outline: 'border border-ink/20 text-ink hover:border-ink hover:bg-ink hover:text-paper',
  ghost: 'text-ink hover:bg-ink/5',
  light: 'bg-paper text-ink hover:bg-white',
  ghostLight: 'border border-paper/25 text-paper hover:bg-paper/10',
  danger: 'bg-danger text-white hover:opacity-90',
};

const sizes = {
  sm: 'h-9 px-4 text-[13px]',
  md: 'h-11 px-6 text-sm',
  lg: 'h-13 px-8 text-[15px] py-3.5',
};

const SUCCESS_MS = 1400;

/* Action button. If `onClick` returns a promise the button manages its own
   busy state (spinner + loadingText) and flashes a success state when the
   promise resolves (resolve with `false` to skip the flash, e.g. on a
   handled error). Controlled `loading` still works for form submits. */
export const Button = forwardRef(function Button(
  {
    variant = 'accent',
    size = 'md',
    loading = false,
    loadingText = 'Processing…',
    successText,
    flash = true,
    icon: Icon,
    className = '',
    children,
    disabled,
    onClick,
    ...rest
  },
  ref,
) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const handleClick = (e) => {
    if (!onClick) return;
    const result = onClick(e);
    if (!result || typeof result.then !== 'function') return;
    setBusy(true);
    result
      .then((value) => {
        if (!mounted.current || !flash || value === false) return;
        setDone(true);
        setTimeout(() => mounted.current && setDone(false), SUCCESS_MS);
      })
      .catch((err) => console.error('[Button] action failed', err))
      .finally(() => mounted.current && setBusy(false));
  };

  const isLoading = loading || busy;
  const look = done
    ? 'bg-success text-white shadow-[0_10px_24px_-10px_rgba(23,138,80,0.6)]'
    : variants[variant];

  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      data-state={isLoading ? 'loading' : done ? 'success' : 'idle'}
      onClick={handleClick}
      className={`btn-press inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-tight transition-[background-color,color,border-color,box-shadow,opacity,transform] duration-200 disabled:cursor-not-allowed ${isLoading ? 'opacity-85' : 'disabled:opacity-50'} ${look} ${sizes[size]} ${className}`}
      {...rest}
    >
      {isLoading ? (
        <>
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          <span className="truncate" aria-live="polite">
            {loadingText}
          </span>
        </>
      ) : done ? (
        <>
          <Check size={17} strokeWidth={2.6} className="btn-pop" aria-hidden="true" />
          <span className="truncate">{successText || children}</span>
        </>
      ) : (
        <>
          {Icon && <Icon size={17} strokeWidth={2.2} aria-hidden="true" />}
          {children}
        </>
      )}
    </button>
  );
});
