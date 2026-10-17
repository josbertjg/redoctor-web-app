import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useSkeletonHold } from './skeleton-hold';

function Reader({ pending }: { pending: boolean }) {
  const holding = useSkeletonHold(pending);
  return <p>{pending || holding ? 'Cargando…' : 'Tus citas'}</p>;
}

describe('useSkeletonHold', () => {
  it('shows the content once its data arrives, one render after', async () => {
    const { rerender } = render(<Reader pending />);
    expect(screen.getByText('Cargando…')).toBeInTheDocument();

    rerender(<Reader pending={false} />);

    expect(await screen.findByText('Tus citas')).toBeInTheDocument();
  });

  it('holds nothing when the data was already there', () => {
    render(<Reader pending={false} />);

    expect(screen.getByText('Tus citas')).toBeInTheDocument();
  });

  it('shows the skeleton at once when the data goes again', () => {
    const { rerender } = render(<Reader pending={false} />);

    rerender(<Reader pending />);

    expect(screen.getByText('Cargando…')).toBeInTheDocument();
  });
});
