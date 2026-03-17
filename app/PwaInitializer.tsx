"use client";

import { useEffect } from "react";

export default function PwaInitializer() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Patch performance.measure to avoid noisy dev-time errors like
    // "NotFound cannot have a negative time stamp" coming from framework tooling.
    try {
      const perf = window.performance as Performance & {
        __patchedMeasure?: boolean;
      };
      if (perf && !perf.__patchedMeasure) {
        const originalMeasure = perf.measure?.bind(perf);
        if (originalMeasure) {
          perf.measure = ((...args: Parameters<Performance["measure"]>): ReturnType<Performance["measure"]> => {
            try {
              return originalMeasure(...args);
            } catch {
              // Swallow framework timing errors; they don't affect app behavior.
              return undefined as unknown as ReturnType<Performance["measure"]>;
            }
          }) as Performance["measure"];
          perf.__patchedMeasure = true;
        }
      }
    } catch {
      // ignore patch errors
    }

    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch {
        // ignore registration errors – app still works without offline cache
      }
    };

    register();
  }, []);

  return null;
}

