import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FieldError } from './field-error';

describe('FieldError', () => {
  it('hides the words it keeps for folding, and draws the line anew when the error comes back', () => {
    const { rerender } = render(
      <FieldError id="e" message="Este campo es requerido." />,
    );
    const first = screen.getByText('Este campo es requerido.');
    expect(first).not.toHaveAttribute('aria-hidden');

    rerender(<FieldError id="e" message={undefined} />);
    // The words stay on screen while the line folds, hidden from readers.
    expect(screen.getByText('Este campo es requerido.')).toHaveAttribute(
      'aria-hidden',
      'true',
    );

    rerender(<FieldError id="e" message="Este campo es requerido." />);
    const again = screen.getByText('Este campo es requerido.');
    expect(again).not.toHaveAttribute('aria-hidden');
    // A new node inside the live region: read aloud again.
    expect(again).not.toBe(first);
  });
});
