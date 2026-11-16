'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

/**
 * A result's place in the list. The pointer on it, or the focus inside it,
 * makes its pin stand out on the map: listened to on the element itself
 * (the card is not a control; its links are, and the pin follows them too).
 */
export function HoverSyncItem({
  id,
  onHover,
  children,
}: {
  id: string;
  onHover: (id: string | null) => void;
  children: ReactNode;
}) {
  const item = useRef<HTMLLIElement>(null);
  const latest = useRef(onHover);
  useEffect(() => {
    latest.current = onHover;
  });
  useEffect(() => {
    const node = item.current;
    if (!node) return;
    const enter = () => {
      latest.current(id);
    };
    const leave = () => {
      latest.current(null);
    };
    node.addEventListener('mouseenter', enter);
    node.addEventListener('mouseleave', leave);
    node.addEventListener('focusin', enter);
    node.addEventListener('focusout', leave);
    return () => {
      node.removeEventListener('mouseenter', enter);
      node.removeEventListener('mouseleave', leave);
      node.removeEventListener('focusin', enter);
      node.removeEventListener('focusout', leave);
    };
  }, [id]);
  return <li ref={item}>{children}</li>;
}
