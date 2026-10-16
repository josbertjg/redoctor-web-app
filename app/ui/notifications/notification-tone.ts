import Campaign from '@material-symbols/svg-400/rounded/campaign.svg?svgr';
import EventAvailable from '@material-symbols/svg-400/rounded/event_available.svg?svgr';
import Info from '@material-symbols/svg-400/rounded/info.svg?svgr';
import Schedule from '@material-symbols/svg-400/rounded/schedule.svg?svgr';
import Warning from '@material-symbols/svg-400/rounded/warning.svg?svgr';

import type { NotificationType } from '@/app/lib/schemas/notifications';

import type { IconComponent } from '@/app/ui/icons';

/*
 * How a notice looks by its family (the app's `AppNotificationUi`): the
 * icon in a tinted circle of the family's colour — appointments in the
 * brand blue, reminders in the brand green, alerts in the warning tone,
 * marketing in orange, the system's in grey. The circle is decoration: the
 * title and the words carry the meaning.
 */

export type NotificationTone = {
  icon: IconComponent;
  /** The circle's tint and the icon's colour. */
  className: string;
};

const tones: Record<NotificationType, NotificationTone> = {
  APPOINTMENT: { icon: EventAvailable, className: 'bg-blue-50 text-primary' },
  REMINDER: { icon: Schedule, className: 'bg-green-50 text-secondary' },
  // warning-700 and not the app's warning-500: the yellow vanishes on its tint.
  ALERT: { icon: Warning, className: 'bg-warning-50 text-warning-700' },
  MARKETING: { icon: Campaign, className: 'bg-orange-50 text-orange-600' },
  SYSTEM: { icon: Info, className: 'bg-grey-50 text-grey-600' },
};

export function notificationTone(type: NotificationType): NotificationTone {
  return tones[type];
}
