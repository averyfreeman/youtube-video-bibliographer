"use client";

import { useEffect, useState } from "react";

const themes = ["dark", "light"] as const;
type Theme = (typeof themes)[number];

function isTheme(value: string | null): value is Theme {
  return value === "dark" || value === "light";
}

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("bibliographer-theme");
    if (isTheme(storedTheme)) {
      document.documentElement.dataset.theme = storedTheme;
      window.setTimeout(() => setTheme(storedTheme), 0);
    }
  }, []);

  function changeTheme(nextTheme: Theme) {
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("bibliographer-theme", nextTheme);
  }

  return (
    <label className="flex items-center gap-2 text-sm text-base-content/70">
      <span>Color mode</span>
      <select
        className="select select-sm w-28"
        aria-label="Color mode"
        value={theme}
        onChange={(event) => changeTheme(event.target.value as Theme)}
      >
        {themes.map((option) => (
          <option key={option} value={option}>
            {option === "dark" ? "Dark" : "Light"}
          </option>
        ))}
      </select>
    </label>
  );
}
