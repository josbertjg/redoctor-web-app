import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

import {
  notificationResponseSchema,
  toNotification,
} from '@/app/lib/schemas/notifications';

import { buildNotificationResponse } from '@/tests/factories/notifications';

import {
  NotificationBanner,
  showNotificationBanner,
} from './notification-banner';
import { Toaster } from '../toast';

const notification = toNotification(
  notificationResponseSchema.parse(buildNotificationResponse()),
);

describe('NotificationBanner', () => {
  it('is one button with the title and the words, accessible', async () => {
    const onOpen = vi.fn();
    const { container } = render(
      <NotificationBanner notification={notification} onOpen={onOpen} />,
    );

    const button = screen.getByRole('button', { name: /Cita cancelada/ });
    expect(button).toHaveTextContent(
      'Ana Pérez canceló la cita del jueves 15 de octubre a las 3:00 p. m.',
    );
    await userEvent.click(button);
    expect(onOpen).toHaveBeenCalledOnce();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('showNotificationBanner', () => {
  it('rides on the toaster, and a tap opens the notice and dismisses it', async () => {
    render(<Toaster regionLabel="Avisos" closeLabel="Cerrar" />);
    const onOpen = vi.fn();

    act(() => {
      showNotificationBanner(notification, onOpen);
    });

    const button = await screen.findByRole('button', {
      name: /Cita cancelada/,
    });
    await userEvent.click(button);

    expect(onOpen).toHaveBeenCalledWith(notification);
  });
});
