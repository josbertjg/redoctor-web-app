import { useEffect, useState } from 'react';

const isEmpty = (value: unknown) =>
  value === '' || value === null || value === undefined;

/**
 * A value that follows another after it stops changing for `delay` ms:
 * what a search box types becomes a request only after a pause (the
 * app's 400 ms). An empty value follows on the next tick, so clearing the
 * box clears what it asked for without waiting.
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(
      () => {
        setSettled(value);
      },
      isEmpty(value) ? 0 : delay,
    );
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return settled;
}
