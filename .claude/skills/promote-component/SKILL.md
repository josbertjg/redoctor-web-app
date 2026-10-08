---
name: promote-component
description: Move a component from a module's _components folder to app/ui/<domain> the day a second module needs it, rewriting imports and moving its test.
---

# Promote a component

Trigger: a second module needs a piece that lives in `app/(module)/_components/`.
Lint will refuse the cross-module import (`import/no-restricted-paths`), which
is the signal to promote.

## Steps

1. Pick the destination: `app/ui/<domain>/<name>.tsx` for domain pieces
   (`appointments`, `specialists`, `billing`, `reviews`, `app-bridge`,
   `auth`, `layout`), or `app/ui/<name>.tsx` for a primitive.
2. `git mv` the component and its colocated test (`<name>.test.tsx`).
3. Rewrite imports: `grep -rn "_components/<name>" app tests` and point every
   import at `@/app/ui/<domain>/<name>`.
4. Remove anything module-specific from the component: it must depend only on
   `app/lib` and `app/hooks`. Module-specific behavior stays in the module and
   arrives through props.
5. If the move changes any default, stop: that is a redesign, ask first.
6. Run `pnpm check`; summarize in Spanish what moved and which imports changed.
