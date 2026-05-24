/**
 * Helpers for animating cross-route navigation with the View Transitions API.
 *
 * The "set morph" pattern: a tapped SetPlate / SetCard image and name visually
 * grow into the detail-page hero on the next route. Only the clicked card gets
 * a `view-transition-name` assigned (a fixed sentinel: `active-set-image` /
 * `active-set-name`) — assigning the same name to every card on the page at
 * once would make the browser reject the transition for duplicate names.
 *
 * Browsers without the View Transitions API or with `prefers-reduced-motion`
 * fall through to a plain navigation.
 */

export const SET_IMAGE_VT_NAME = 'active-set-image';
export const SET_NAME_VT_NAME = 'active-set-name';

/**
 * Triggers a navigation wrapped in a View Transition, after dynamically
 * assigning a `view-transition-name` to the descendants of `root` marked
 * with `data-vt-image` and `data-vt-name`. The destination page renders
 * those same names statically, so the browser interpolates between snapshots.
 *
 * @param root      The root element of the card being navigated from (the
 *                  `<a>` returned by next/link). Used as the query scope so
 *                  only this card's image + name get the morph name.
 * @param navigate  Caller-supplied callback that performs the actual route
 *                  change (e.g., `() => router.push(href)`).
 */
export function navigateWithSetMorph(root: HTMLElement, navigate: () => void): void {
  // The View Transitions API is feature-detected at runtime; older browsers
  // (and any user that has `prefers-reduced-motion: reduce`) fall through to
  // a plain navigation with no morph.
  const supportsViewTransitions = 'startViewTransition' in document;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!supportsViewTransitions || prefersReducedMotion) {
    navigate();
    return;
  }

  // Defensive pre-sweep: clear any leftover sentinel names from a previous
  // morph. Next.js's client cache can restore a grid's DOM (with the
  // previously-clicked card's inline styles intact) when the user goes
  // back. Without this sweep the next click assigns the same name to a
  // different card, the browser sees duplicates, and refuses the transition.
  document
    .querySelectorAll<HTMLElement>('[style*="view-transition-name"]')
    .forEach((el) => {
      const current = el.style.viewTransitionName;
      if (current === SET_IMAGE_VT_NAME || current === SET_NAME_VT_NAME) {
        el.style.viewTransitionName = '';
      }
    });

  const image = root.querySelector<HTMLElement>('[data-vt-image]');
  const name = root.querySelector<HTMLElement>('[data-vt-name]');

  if (image) image.style.viewTransitionName = SET_IMAGE_VT_NAME;
  if (name) name.style.viewTransitionName = SET_NAME_VT_NAME;

  const transition = document.startViewTransition(() => {
    navigate();
  });

  // Post-transition cleanup mirrors the `vt.finished.finally(...)` pattern
  // in add-set/page.tsx. Clears the sentinel names we just set so they
  // don't persist on this source element if it survives the navigation
  // (e.g. cached grid DOM on back-nav).
  transition.finished.finally(() => {
    if (image && image.style.viewTransitionName === SET_IMAGE_VT_NAME) {
      image.style.viewTransitionName = '';
    }
    if (name && name.style.viewTransitionName === SET_NAME_VT_NAME) {
      name.style.viewTransitionName = '';
    }
  });
}
