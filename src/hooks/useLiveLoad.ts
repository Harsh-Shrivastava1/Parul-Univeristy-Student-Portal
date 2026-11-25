import { useEffect, useRef, type DependencyList } from 'react';

/**
 * Keeps a page's data in step with the database, the way React Query keeps the
 * Internship Cell and Admin portals fresh.
 *
 * The page's `load` runs once on mount (and whenever `deps` change), then again
 * in the background:
 *   - when the student comes back to the tab or window,
 *   - right after any save this SPA makes (apiClient fires DATA_CHANGED),
 *   - every POLL_MS while the tab is visible, so changes made by the Internship
 *     Cell or the department show up without a reload.
 *
 * `background` is true for those refreshes: the page should update its data
 * quietly, without its loading skeleton or error toasts. Runs never overlap; a
 * refresh asked for mid-run is done once the current run ends.
 *
 * `enabled: false` pauses the background refreshes (a form being edited must
 * not be reset under the student's fingers). The first load still runs.
 */
export const DATA_CHANGED = 'pu:data-changed';
export const POLL_MS = 20_000;

export function notifyDataChanged(): void {
  window.dispatchEvent(new Event(DATA_CHANGED));
}

type Loader = (opts: { background: boolean }) => Promise<unknown> | unknown;

export function useLiveLoad(
  load: Loader,
  deps: DependencyList,
  { enabled = true, interval = POLL_MS }: { enabled?: boolean; interval?: number } = {},
): void {
  const loadRef = useRef(load);
  const enabledRef = useRef(enabled);
  useEffect(() => {
    loadRef.current = load;
    enabledRef.current = enabled;
  });

  useEffect(() => {
    let alive = true;
    let inFlight = false;
    let queued = false;

    const run = async (background: boolean) => {
      if (!alive) return;
      if (inFlight) {
        queued = true;
        return;
      }
      inFlight = true;
      try {
        await loadRef.current({ background });
      } catch {
        // The page shows its own error state for the first load; a failed
        // background refresh keeps the data already on screen.
      } finally {
        inFlight = false;
        if (queued && alive) {
          queued = false;
          void run(true);
        }
      }
    };

    const refresh = () => {
      if (enabledRef.current && document.visibilityState === 'visible') void run(true);
    };

    void run(false);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener(DATA_CHANGED, refresh);
    const timer = window.setInterval(refresh, interval);
    return () => {
      alive = false;
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener(DATA_CHANGED, refresh);
      window.clearInterval(timer);
    };
    // The caller's deps decide when a fresh first load is needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interval, ...deps]);
}
