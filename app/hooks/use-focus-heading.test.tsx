import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useFocusHeading } from './use-focus-heading';

function Flow({ step }: { step: string }) {
  const container = useFocusHeading(step);
  return (
    <div ref={container}>
      <h1>{step}</h1>
      <button type="button">Seguir</button>
    </div>
  );
}

describe('useFocusHeading', () => {
  it('leaves the focus alone on arrival, then follows each new view', () => {
    const { rerender } = render(<Flow step="Paso 1" />);
    expect(document.body).toHaveFocus();

    rerender(<Flow step="Paso 2" />);
    expect(screen.getByRole('heading', { name: 'Paso 2' })).toHaveFocus();
  });
});
