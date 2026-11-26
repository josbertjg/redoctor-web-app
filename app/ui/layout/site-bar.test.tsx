import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { saveActiveSearch } from '@/app/lib/search/active-search';

import { SearchBar } from '@/app/ui/search/search-bar';
import type { SearchCatalog } from '@/app/ui/search/search-bar-types';
import { useSearchBarWords } from '@/app/ui/search/search-bar-words';
import { renderWithIntl } from '@/tests/render';

import { SiteBar } from './site-bar';

const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: navigation.push, replace: vi.fn() }),
  usePathname: () => '/s/a0af9566-a53d-4887-8d16-1dfc589c2f3d',
  useSearchParams: () => new URLSearchParams(),
}));

const catalog: SearchCatalog = [
  { id: 'a0000000-0000-4000-8000-000000000001', name: 'Medicina' },
  { id: 'a0000000-0000-4000-8000-000000000002', name: 'Cardiología' },
];

function Bar() {
  const words = useSearchBarWords();
  return (
    <SiteBar
      homeLabel="Redoctor, ir al inicio"
      search={
        <SearchBar
          variant="bar"
          label="Buscar especialistas"
          words={words}
          catalog={catalog}
          topSpecialties={catalog}
          className="max-w-2xl min-w-0 flex-1"
        />
      }
    />
  );
}

beforeEach(() => {
  window.localStorage.clear();
  navigation.push.mockClear();
});

describe('SiteBar', () => {
  it('replaces the landing links and hamburger menu with the specialist search bar and keeps sign-in visible at all widths', async () => {
    const { container } = renderWithIntl(
      <QueryClientProvider client={new QueryClient()}>
        <Bar />
      </QueryClientProvider>,
    );

    expect(
      screen.getByRole('link', { name: 'Redoctor, ir al inicio' }),
    ).toHaveAttribute('href', '/');
    expect(
      screen.getByRole('search', { name: 'Buscar especialistas' }),
    ).toBeInTheDocument();

    // No landing section navigation or mobile hamburger button in SiteBar.
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /menú/i }),
    ).not.toBeInTheDocument();

    // Sign-in stays visible even on phone widths since the hamburger menu is gone.
    const signIn = screen.getByRole('link', { name: 'Entrar' });
    expect(signIn).not.toHaveClass('hidden');
    // Decorative leading stethoscope icon hides on phones so 360px/390px viewports leave ample room for the search query text.
    const searchForm = screen.getByRole('search', {
      name: 'Buscar especialistas',
    });
    expect(searchForm.querySelector('svg')).toHaveClass('max-sm:hidden');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows the user’s active search inside the navigation bar and lets them search again', async () => {
    const user = userEvent.setup();
    saveActiveSearch({ kind: 'text', text: 'Medicina' });

    renderWithIntl(
      <QueryClientProvider client={new QueryClient()}>
        <Bar />
      </QueryClientProvider>,
    );

    const input = screen.getByRole('combobox', {
      name: 'Especialidad o nombre del especialista',
    });
    expect(input).toHaveValue('Medicina');

    await user.clear(input);
    await user.type(input, 'Cardiología{Enter}');
    await waitFor(() => {
      expect(navigation.push).toHaveBeenCalledWith(
        '/search?q=Cardiolog%C3%ADa',
      );
    });
  });
});
