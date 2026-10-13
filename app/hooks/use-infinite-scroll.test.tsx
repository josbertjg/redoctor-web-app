import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  enterAll,
  stubIntersectionObserver,
  watching,
} from '@/tests/intersection-observer';

import { useInfiniteScroll } from './use-infinite-scroll';

function List({
  enabled,
  loaded,
  onLoadMore,
}: {
  enabled: boolean;
  loaded: number;
  onLoadMore: () => void;
}) {
  const foot = useInfiniteScroll({ enabled, loaded, onLoadMore });
  return <div ref={foot} data-testid="foot" />;
}

beforeEach(() => {
  stubIntersectionObserver();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useInfiniteScroll', () => {
  it('asks for more once when the foot comes into view, then waits', () => {
    const onLoadMore = vi.fn();
    render(<List enabled loaded={20} onLoadMore={onLoadMore} />);

    expect(watching()).toBe(1);
    enterAll();
    enterAll();
    expect(onLoadMore).toHaveBeenCalledTimes(1);
    // The next ask waits for the page to land.
    expect(watching()).toBe(0);
  });

  it('looks at the foot again once more has landed', () => {
    const onLoadMore = vi.fn();
    const { rerender } = render(
      <List enabled loaded={20} onLoadMore={onLoadMore} />,
    );
    enterAll();
    rerender(<List enabled loaded={40} onLoadMore={onLoadMore} />);

    expect(watching()).toBe(1);
    enterAll();
    expect(onLoadMore).toHaveBeenCalledTimes(2);
  });

  it('asks nothing while disabled: a page on its way, a failure, the end', () => {
    const onLoadMore = vi.fn();
    render(<List enabled={false} loaded={20} onLoadMore={onLoadMore} />);

    expect(watching()).toBe(0);
    enterAll();
    expect(onLoadMore).not.toHaveBeenCalled();
  });
});
