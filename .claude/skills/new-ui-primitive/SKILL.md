---
name: new-ui-primitive
description: Create a shared UI primitive in app/ui (component + test + axe check) that follows the design tokens, the motion rules and the accessibility bar of AGENTS.md §7–§8.
---

# New UI primitive

Before writing anything, search: `grep -ri "<kind>" app/ui app/**/_components`.
If a piece fits, use it. If one almost fits, extend it with an optional prop
whose default reproduces the current look exactly. Only then create a new one.

## Where

- A primitive (button, input, sheet, chip…) goes straight to `app/ui/<name>.tsx`.
- A domain component used by two or more modules goes to `app/ui/<domain>/`.
- Module-only UI stays in the module's `_components/` and is promoted later
  with the `promote-component` skill.

## Files

1. `app/ui/<name>.tsx` — exports a PascalCase component. Variants with `cva`,
   classes merged with `cn` from `app/lib/utils`. Radix/shadcn primitives are
   restyled to our tokens, never used raw.
2. `app/ui/<name>.test.tsx` — Testing Library + `jest-axe`
   (`expect(await axe(container)).toHaveNoViolations()`), one test per variant
   that matters and one for the busy/loading state.
3. Copy, if any, through next-intl keys in `app/lib/i18n/messages/es.json`.

## Rules

- Tokens only: colors, radii, shadows, sizes and durations come from
  `app/ui/tokens.css` through Tailwind utilities. No `#hex`, no magic `px`,
  no inline `style`.
- Nothing appears or disappears abruptly: 200–300 ms, `ease-in-out`,
  `motion-reduce` variants, keep the element mounted and keep the last valid
  value while it animates out.
- Never disable a control to mean busy: keep it clickable, show the loading
  state inside it, guard inside the handler.
- Accessibility: semantic element, visible focus, `aria-*` where the role needs
  it, color never the only signal, touch target ≥ 44 px.
- Mobile first: design at 360–390 px, then widen.

Finish with `pnpm check` and a short Spanish summary.
