"use client";

const themes = ["dark", "light"] as const;
export type Theme = (typeof themes)[number];

export function isTheme(value: string | null): value is Theme {
  return value === "dark" || value === "light";
}

export function ThemeSwitcher({
  theme,
  onChange,
}: {
  theme: Theme;
  onChange: (theme: Theme) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-base-content/70">
      <span>Color mode</span>
      <select
        className="select select-sm w-28"
        aria-label="Color mode"
        value={theme}
        onChange={(event) => onChange(event.target.value as Theme)}
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
