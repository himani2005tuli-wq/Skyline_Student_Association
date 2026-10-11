import { useEffect, useRef, useState } from 'react';

/* Image that shows a shimmer placeholder and fades in once loaded. */
export function SmartImage({
  src,
  alt,
  className = '',
  wrapperClassName = '',
  hoverZoom = false,
  ...rest
}) {
  const [loaded, setLoaded] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    setLoaded(false);
    if (ref.current?.complete && ref.current.naturalWidth > 0) setLoaded(true);
  }, [src]);

  return (
    <span
      className={`relative block overflow-hidden ${wrapperClassName}`}
      data-testid="smart-image"
      data-loaded={loaded}
    >
      <span
        className={`skeleton-shimmer absolute inset-0 bg-ink/5 transition-opacity duration-500 ${loaded ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
        aria-hidden="true"
      />
      <img
        ref={ref}
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={`${className} transition-[opacity,transform] duration-700 ease-out ${loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-[1.04]'} ${hoverZoom ? 'group-hover:scale-[1.05]' : ''}`}
        {...rest}
      />
    </span>
  );
}
