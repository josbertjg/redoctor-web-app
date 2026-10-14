import {
  useCallback,
  useEffect,
  useId,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react';

/*
 * A text box with a list under it (WAI-ARIA's combobox): the arrows move
 * along the list, Enter takes the option in hand — or, with none, lets the
 * form search what was typed —, Escape and Tab close it, and a tap outside
 * closes it too. The list's options are identified by position, so the
 * box can say which one is in hand (`aria-activedescendant`) without
 * moving the focus out of the input.
 */

type UseComboboxOptions = {
  /** How many options the list shows right now. */
  count: number;
  /** The option taken: by Enter, or by a click the list reports. */
  onPick: (index: number) => void;
  /** The box and its list: a tap outside closes it. */
  root: RefObject<HTMLElement | null>;
};

export function useCombobox({ count, onPick, root }: UseComboboxOptions) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listboxId = useId();
  const optionId = useCallback(
    (index: number) => `${listboxId}-${String(index)}`,
    [listboxId],
  );

  // The list changed under the hand: nothing is in hand past its end.
  const activeIndex = active < count ? active : -1;

  const close = useCallback(() => {
    setOpen(false);
    setActive(-1);
  }, []);

  const show = useCallback(() => {
    setOpen(true);
  }, []);

  const pick = useCallback(
    (index: number) => {
      onPick(index);
      close();
    },
    [onPick, close],
  );

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const inside =
        event.target instanceof Node && root.current?.contains(event.target);
      if (!inside) close();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open, close, root]);

  // The option in hand stays in view when the list is longer than its box.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    document
      .getElementById(optionId(activeIndex))
      ?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex, optionId]);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setOpen(true);
        if (count > 0) setActive((activeIndex + 1) % count);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setOpen(true);
        if (count > 0) setActive((activeIndex - 1 + count) % count);
        break;
      case 'Enter':
        if (open && activeIndex >= 0) {
          event.preventDefault();
          pick(activeIndex);
        } else {
          close();
        }
        break;
      case 'Escape':
        if (open) {
          event.preventDefault();
          close();
        }
        break;
      case 'Tab':
        close();
        break;
      default:
        break;
    }
  };

  return {
    open,
    show,
    close,
    activeIndex,
    setActive,
    pick,
    listboxId,
    optionId,
    inputProps: {
      role: 'combobox' as const,
      'aria-expanded': open,
      'aria-controls': listboxId,
      'aria-autocomplete': 'list' as const,
      'aria-activedescendant':
        open && activeIndex >= 0 ? optionId(activeIndex) : undefined,
      autoComplete: 'off' as const,
      onKeyDown,
    },
  };
}
