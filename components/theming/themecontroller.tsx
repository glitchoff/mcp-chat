"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const themes = [
  {
    id: "light",
    label: "Light",
    icon: <Sun className="size-3.5" />,
    preview: "oklch(0.99 0.005 286)",
  },
  {
    id: "t3chat",
    label: "Dark",
    icon: <Moon className="size-3.5" />,
    preview: "oklch(0.23 0.03 307)",
  },
];

export function ThemeSwitcher() {
  const [theme, setTheme] = useState("t3chat");

  useEffect(() => {
    const saved = localStorage.getItem("theme") ?? "t3chat";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  const applyTheme = (id: string) => {
    setTheme(id);
    localStorage.setItem("theme", id);
    document.documentElement.setAttribute("data-theme", id);
  };

  const current = themes.find((t) => t.id === theme);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          {current?.icon}
          <span className="text-xs">{current?.label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-36 p-1.5" align="end">
        <div className="flex flex-col gap-0.5">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => applyTheme(t.id)}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-accent",
                theme === t.id && "bg-accent"
              )}
            >
              <span
                className="size-3 rounded-full border border-border"
                style={{ background: t.preview }}
              />
              {t.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}