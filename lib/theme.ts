"use client";

import { useSyncExternalStore } from "react";

export type Theme = "dark" | "light";
const serverTheme: Theme = "dark";

function isTheme(value: string | null | undefined): value is Theme {
  return value === "dark" || value === "light";
}

function readTheme(): Theme {
  if (typeof document === "undefined") {
    return "dark";
  }

  const theme = document.documentElement.dataset.theme;
  return isTheme(theme) ? theme : "dark";
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document, {
    attributes: true,
    attributeFilter: ["data-theme"],
    childList: true,
    subtree: true,
  });

  return () => observer.disconnect();
}

export function useAppTheme(): Theme {
  return useSyncExternalStore(subscribe, readTheme, () => serverTheme);
}

export function setAppTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem("bibliographer-theme", theme);
}
