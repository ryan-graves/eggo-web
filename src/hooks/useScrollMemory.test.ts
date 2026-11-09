import { act, renderHook } from '@testing-library/react';
import { resetScrollPosition, useScrollMemory } from './useScrollMemory';
import { SCROLL_POSITION_PREFIX } from './useNavigation';

function scrollWindowTo(y: number): void {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
  window.dispatchEvent(new Event('scroll'));
}

describe('useScrollMemory', () => {
  let scrollTo: jest.SpyInstance;

  beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState(null, '', '/all');
    scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('saves the scroll position of the current view as the user scrolls', () => {
    renderHook(() => useScrollMemory('/all', { paused: false, ready: true }));

    act(() => scrollWindowTo(1200));

    expect(sessionStorage.getItem(`${SCROLL_POSITION_PREFIX}/all`)).toBe('1200');
  });

  it('ignores scroll events once the browser has moved to another path', () => {
    renderHook(() => useScrollMemory('/all', { paused: false, ready: true }));
    act(() => scrollWindowTo(1200));

    // Next pushes the new URL before its scroll-to-top for the destination.
    window.history.pushState(null, '', '/set/abc');
    act(() => scrollWindowTo(0));

    expect(sessionStorage.getItem(`${SCROLL_POSITION_PREFIX}/all`)).toBe('1200');
  });

  it('does not save while paused', () => {
    const { rerender } = renderHook(
      ({ paused }) => useScrollMemory('/all', { paused, ready: true }),
      { initialProps: { paused: false } }
    );
    act(() => scrollWindowTo(1200));

    // A transition skeleton shrinks the page and the browser clamps the scroll.
    rerender({ paused: true });
    act(() => scrollWindowTo(300));

    expect(sessionStorage.getItem(`${SCROLL_POSITION_PREFIX}/all`)).toBe('1200');
  });

  it('restores the saved position once the view is ready', () => {
    sessionStorage.setItem(`${SCROLL_POSITION_PREFIX}/all`, '2000');
    const { rerender } = renderHook(
      ({ ready }) => useScrollMemory('/all', { paused: false, ready }),
      { initialProps: { ready: false } }
    );
    expect(scrollTo).not.toHaveBeenCalled();

    rerender({ ready: true });

    expect(scrollTo).toHaveBeenCalledWith({ top: 2000, behavior: 'instant' });
  });

  it('restores only once per mount, not again when the path changes', () => {
    sessionStorage.setItem(`${SCROLL_POSITION_PREFIX}/all`, '2000');
    sessionStorage.setItem(`${SCROLL_POSITION_PREFIX}/home`, '900');
    const { rerender } = renderHook(
      ({ pathname }) => useScrollMemory(pathname, { paused: false, ready: true }),
      { initialProps: { pathname: '/all' } }
    );

    rerender({ pathname: '/home' });

    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ top: 2000, behavior: 'instant' });
  });

  it('takes over scroll restoration from the browser while mounted', () => {
    window.history.scrollRestoration = 'auto';

    renderHook(() => useScrollMemory('/all', { paused: false, ready: true }));

    expect(window.history.scrollRestoration).toBe('manual');
  });

  it('saves and restores under a custom key for pages that swap views in place', () => {
    window.history.replaceState(null, '', '/share/abc');
    sessionStorage.setItem(`${SCROLL_POSITION_PREFIX}/share/abc:all`, '640');
    const { rerender } = renderHook(
      ({ key }) => useScrollMemory('/share/abc', { paused: false, ready: true, key }),
      { initialProps: { key: '/share/abc:all' } }
    );
    expect(scrollTo).toHaveBeenCalledWith({ top: 640, behavior: 'instant' });

    rerender({ key: '/share/abc:home' });
    act(() => scrollWindowTo(150));

    expect(sessionStorage.getItem(`${SCROLL_POSITION_PREFIX}/share/abc:home`)).toBe('150');
    expect(sessionStorage.getItem(`${SCROLL_POSITION_PREFIX}/share/abc:all`)).toBe('640');
  });

  it('does nothing when there is no saved position', () => {
    renderHook(() => useScrollMemory('/all', { paused: false, ready: true }));

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('resetScrollPosition marks a view as starting at the top', () => {
    sessionStorage.setItem(`${SCROLL_POSITION_PREFIX}/home`, '900');

    resetScrollPosition('/home');

    expect(sessionStorage.getItem(`${SCROLL_POSITION_PREFIX}/home`)).toBe('0');
  });
});
