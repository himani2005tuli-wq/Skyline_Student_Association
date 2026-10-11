import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

/* Slim accent bar at the very top that runs on every route change. */
export default function RouteProgress() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return undefined;
    }
    setWidth(0);
    setVisible(true);
    const t1 = setTimeout(() => setWidth(72), 30);
    const t2 = setTimeout(() => setWidth(100), 420);
    const t3 = setTimeout(() => setVisible(false), 760);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [pathname]);

  return (
    <div
      aria-hidden="true"
      data-testid="route-progress"
      data-active={visible}
      className={`pointer-events-none fixed inset-x-0 top-0 z-[120] h-[3px] transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <div
        className="h-full bg-accent shadow-[0_0_14px_rgba(255,77,28,0.85)] transition-[width] duration-300 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
