import AccountCircle from '@material-symbols/svg-400/rounded/account_circle.svg?svgr';
import Bookmark from '@material-symbols/svg-400/rounded/bookmark.svg?svgr';
import CalendarAddOn from '@material-symbols/svg-400/rounded/calendar_add_on.svg?svgr';
import CalendarToday from '@material-symbols/svg-400/rounded/calendar_today.svg?svgr';
import CallReceived from '@material-symbols/svg-400/rounded/call_received.svg?svgr';
import Cardiology from '@material-symbols/svg-400/rounded/cardiology.svg?svgr';
import Dentistry from '@material-symbols/svg-400/rounded/dentistry.svg?svgr';
import Dermatology from '@material-symbols/svg-400/rounded/dermatology.svg?svgr';
import Download from '@material-symbols/svg-400/rounded/download.svg?svgr';
import Gynecology from '@material-symbols/svg-400/rounded/gynecology.svg?svgr';
import HowToReg from '@material-symbols/svg-400/rounded/how_to_reg.svg?svgr';
import KidStar from '@material-symbols/svg-400/rounded/kid_star.svg?svgr';
import LocationCity from '@material-symbols/svg-400/rounded/location_city.svg?svgr';
import Nutrition from '@material-symbols/svg-400/rounded/nutrition.svg?svgr';
import Orthopedics from '@material-symbols/svg-400/rounded/orthopedics.svg?svgr';
import Pediatrics from '@material-symbols/svg-400/rounded/pediatrics.svg?svgr';
import Psychology from '@material-symbols/svg-400/rounded/psychology.svg?svgr';
import Search from '@material-symbols/svg-400/rounded/search.svg?svgr';
import Stethoscope from '@material-symbols/svg-400/rounded/stethoscope.svg?svgr';
import TvOptionsEditChannels from '@material-symbols/svg-400/rounded/tv_options_edit_channels.svg?svgr';
import Verified from '@material-symbols/svg-400/rounded/verified.svg?svgr';
import Visibility from '@material-symbols/svg-400/rounded/visibility.svg?svgr';

import type { IconComponent } from '@/app/ui/icons';

/*
 * What each section of the landing lists, with its icon or illustration
 * (Figma «LANDING PAGE», middle mockup). The copy lives in es.json under
 * `landing.*`; the keys here point at it. Specialties, plans and contacts
 * are sample data for the visual stage: the logic step reads the catalog
 * from the API and the rest from configuration.
 */

/** In-page anchors the header and the footer link to. */
export const landingSections = {
  howItWorks: 'como-funciona',
  trust: 'verificacion',
  roadmap: 'novedades',
  pricing: 'planes',
  faq: 'preguntas',
} as const;

/** Tinted circles behind the icons (background and icon color). */
export type IconTone = 'blue' | 'green' | 'orange' | 'warning';

/** Sample of the catalog (`GET /specialties/tree` in the logic step). */
export const specialtyChips: { name: string; icon: IconComponent }[] = [
  { name: 'Medicina General', icon: Stethoscope },
  { name: 'Odontología', icon: Dentistry },
  { name: 'Oftalmología', icon: Visibility },
  { name: 'Psicología', icon: Psychology },
  { name: 'Cardiología', icon: Cardiology },
  { name: 'Dermatología', icon: Dermatology },
  { name: 'Pediatría', icon: Pediatrics },
  { name: 'Nutrición', icon: Nutrition },
  { name: 'Ginecología', icon: Gynecology },
  { name: 'Traumatología', icon: Orthopedics },
];

type Step<Key extends string> = {
  key: Key;
  icon: IconComponent;
  tone: IconTone;
};

export const specialistSteps: Step<
  'profile' | 'verify' | 'schedule' | 'attend'
>[] = [
  { key: 'profile', icon: AccountCircle, tone: 'orange' },
  { key: 'verify', icon: Verified, tone: 'green' },
  { key: 'schedule', icon: CalendarToday, tone: 'blue' },
  { key: 'attend', icon: TvOptionsEditChannels, tone: 'green' },
];

export const patientSteps: Step<'receive' | 'save' | 'confirm' | 'rate'>[] = [
  { key: 'receive', icon: CallReceived, tone: 'orange' },
  { key: 'save', icon: Bookmark, tone: 'blue' },
  { key: 'confirm', icon: HowToReg, tone: 'green' },
  { key: 'rate', icon: KidStar, tone: 'warning' },
];

/**
 * The four verification steps and the illustration each card shows. The
 * placement is inside the card's picture area, under the words: the short
 * ones peek out of the bottom edge, the tall ones start at the top and are
 * cut by it.
 */
export const trustSteps = [
  {
    key: 'identity',
    illustration: 'trust-id-card',
    width: 172,
    height: 109,
    placement: 'w-[59%] bottom-[-3%]',
  },
  {
    key: 'specialty',
    illustration: 'trust-shield',
    width: 104,
    height: 111,
    placement: 'w-[36%] bottom-[-3%]',
  },
  {
    key: 'approved',
    illustration: 'trust-phone',
    width: 103,
    height: 206,
    placement: 'w-[35%] top-[6%]',
  },
  {
    key: 'published',
    illustration: 'trust-doctor',
    width: 156,
    height: 166,
    placement: 'w-[53%] top-[8%]',
  },
] as const;

export type Audience = 'patient' | 'specialist';

export const roadmapItems: {
  key: 'favorites' | 'search' | 'book' | 'app' | 'cities';
  icon: IconComponent;
  tone: IconTone;
  audience: Audience;
  swirl: 'card-1' | 'card-2' | 'card-3' | 'card-4';
}[] = [
  {
    key: 'favorites',
    icon: Bookmark,
    tone: 'blue',
    audience: 'patient',
    swirl: 'card-1',
  },
  {
    key: 'search',
    icon: Search,
    tone: 'green',
    audience: 'patient',
    swirl: 'card-2',
  },
  {
    key: 'book',
    icon: CalendarAddOn,
    tone: 'blue',
    audience: 'patient',
    swirl: 'card-3',
  },
  {
    key: 'app',
    icon: Download,
    tone: 'green',
    audience: 'patient',
    swirl: 'card-4',
  },
  {
    key: 'cities',
    icon: LocationCity,
    tone: 'blue',
    audience: 'specialist',
    swirl: 'card-1',
  },
];

/** Sample plans (prices in USD per month, as the Figma mockup shows them). */
export const plans: {
  key: 'essential' | 'professional' | 'corporate';
  price: number;
  featured: boolean;
}[] = [
  { key: 'essential', price: 19.99, featured: false },
  { key: 'professional', price: 36.99, featured: true },
  { key: 'corporate', price: 76.99, featured: false },
];

export const planFeatures = ['search', 'offices', 'reports'] as const;

export const faqItems = [
  'app',
  'cost',
  'confirm',
  'reschedule',
  'family',
  'missing',
] as const;

/** Placeholders from the mockup; the real channels come with REDOC-357. */
export const footerContacts = {
  email: 'redoctor@gmail.com',
  phone: '0212-1234567',
  instagram: 'redoctorvzla',
};
