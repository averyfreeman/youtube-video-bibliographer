"use client";

import { setAppTheme, useAppTheme, type Theme } from "@/lib/theme";

const themes = ["dark", "light"] as const;

export function ThemeSwitcher() {
  const theme = useAppTheme();

  return (
    <label className="flex items-center gap-2 text-sm text-base-content/70">
      <span>Color mode</span>
      <select
        className="select select-sm w-28"
        aria-label="Color mode"
        value={theme}
        onChange={(event) => {
          const nextTheme = event.target.value;
          if (nextTheme === "dark" || nextTheme === "light") {
            setAppTheme(nextTheme as Theme);
          }
        }}
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
