"use client";

import { useEffect } from "react";

export default function PwaInitializer() {
  useEffect(() => {
    if (typeof window === "undefined") return;
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

