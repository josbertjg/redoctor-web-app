import type { ReactNode } from 'react';

import { useMutation, useQuery } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/app/lib/api/errors';

import { Providers } from './providers';

const notice = 'No pudimos conectarnos.';

function FailingQuery({ id, kind }: { id: string; kind: ApiError['kind'] }) {
  const { status } = useQuery({
    queryKey: ['failing', id],
    queryFn: () =>
      Promise.reject(new ApiError({ kind, method: 'GET', path: '/x' })),
  });
  return <p>{`${id}: ${status}`}</p>;
}

function FailingMutation() {
  const { mutate, status } = useMutation({
    mutationFn: () =>
      Promise.reject(
        new ApiError({ kind: 'uncertain', method: 'POST', path: '/confirm' }),
      ),
  });
  return (
    <button
      type="button"
      onClick={() => {
        mutate();
      }}
    >
      {`confirm: ${status}`}
    </button>
  );
}

function renderProviders(children: ReactNode) {
  return render(
    <Providers
      toasterLabels={{ region: 'Notificaciones', close: 'Cerrar' }}
      networkNotice={notice}
    >
      {children}
    </Providers>,
  );
}

describe('Providers', () => {
  it('announces connectivity problems once for the whole page', async () => {
    renderProviders(
      <>
        <FailingQuery id="profile" kind="network" />
        <FailingQuery id="reviews" kind="timeout" />
      </>,
    );

    await screen.findByText('profile: error');
    await screen.findByText('reviews: error');
    expect(await screen.findAllByText(notice)).toHaveLength(1);
  });

  it('leaves business errors and lost answers to the flow', async () => {
    renderProviders(
      <>
        <FailingQuery id="profile" kind="http" />
        <FailingMutation />
      </>,
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'confirm: idle' }),
    );

    await screen.findByText('profile: error');
    await screen.findByRole('button', { name: 'confirm: error' });
    expect(screen.queryByText(notice)).not.toBeInTheDocument();
  });
});
