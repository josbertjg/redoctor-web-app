import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './button';

describe('Button', () => {
  it('is a primary, large button of type button by default', async () => {
    const { container } = render(<Button>Confirmar mi cita</Button>);
    const button = screen.getByRole('button', { name: 'Confirmar mi cita' });

    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveAttribute('data-variant', 'primary');
    expect(button).toHaveAttribute('data-size', 'large');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('calls onClick when idle', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Guardar</Button>);

    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('stays enabled while loading, reports busy and drops the click', async () => {
    const onClick = vi.fn();
    const { container } = render(
      <Button loading onClick={onClick}>
        Guardar
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Guardar' });

    expect(button).toBeEnabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('applies the variant, size and block options', () => {
    render(
      <Button variant="white" size="small" block>
        Abrir en la app
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Abrir en la app' });

    expect(button).toHaveAttribute('data-variant', 'white');
    expect(button).toHaveAttribute('data-size', 'small');
    expect(button).toHaveClass('w-full');
  });

  it('renders its child element with asChild', () => {
    render(
      <Button asChild>
        <a href="/appointments">Ver mis citas</a>
      </Button>,
    );
    const link = screen.getByRole('link', { name: 'Ver mis citas' });

    expect(link).toHaveAttribute('href', '/appointments');
    expect(link).not.toHaveAttribute('type');
    expect(link).toHaveAttribute('data-slot', 'button');
  });
});
