import StarFill from '@material-symbols/svg-400/rounded/star-fill.svg?svgr';
import Star from '@material-symbols/svg-400/rounded/star.svg?svgr';
import StarHalf from '@material-symbols/svg-400/rounded/star_half-fill.svg?svgr';

import { cn } from '@/app/lib/utils';

import { Icon, type IconSize } from '@/app/ui/icons';

type StarsRatingProps = {
  /** From 0 to 5; drawn to the nearest half star. */
  value: number;
  /** What the stars say, e.g. «4,5 de 5 estrellas». */
  label: string;
  size?: IconSize;
  className?: string;
};

const positions = [1, 2, 3, 4, 5];

/*
 * Five stars for an average or a single review (the app's StarsRating).
 * Read as one image with its label, never as five icons.
 */
export function StarsRating({
  value,
  label,
  size = 16,
  className,
}: StarsRatingProps) {
  const rounded = Math.round(Math.min(Math.max(value, 0), 5) * 2) / 2;

  return (
    <span
      role="img"
      aria-label={label}
      className={cn('inline-flex items-center text-warning-500', className)}
    >
      {positions.map((position) => (
        <Icon
          key={position}
          icon={
            rounded >= position
              ? StarFill
              : rounded >= position - 0.5
                ? StarHalf
                : Star
          }
          size={size}
        />
      ))}
    </span>
  );
}
