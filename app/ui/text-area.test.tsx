import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { TextArea } from './text-area';

describe('TextArea', () => {
  it('labels its field, counts what is typed and is accessible', async () => {
    const { container } = render(
      <TextArea
        label="Comentario (opcional)"
        name="comment"
        maxLength={1000}
        showCount
        placeholder="Cuenta cómo fue tu experiencia"
      />,
    );

    const field = screen.getByRole('textbox', {
      name: 'Comentario (opcional)',
    });
    expect(field.tagName).toBe('TEXTAREA');
    expect(screen.getByText('0/1000')).toBeInTheDocument();
    await userEvent.type(field, 'Muy puntual.');
    expect(field).toHaveValue('Muy puntual.');
    expect(screen.getByText('12/1000')).toBeInTheDocument();
    expect(field).toHaveAccessibleDescription('12/1000');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says what is wrong under the field and ties it to it', async () => {
    const { container } = render(
      <TextArea label="Comentario" error="Es demasiado largo." />,
    );

    const field = screen.getByRole('textbox', { name: 'Comentario' });
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription('Es demasiado largo.');
    expect(screen.queryByText(/\/\d+$/)).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
