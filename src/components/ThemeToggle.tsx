"use client"

import * as React from "react"
import { Monitor, Moon, Sun } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip } from "@/components/ui/tooltip"
import { t } from "@/i18n/t"
import {
  readThemeChoice,
  setThemeChoice,
  watchSystemTheme,
  type ThemeChoice,
} from "@/lib/theme"
import { cn } from "@/utils/cn"

const OPTIONS: { value: ThemeChoice; icon: typeof Sun; label: string }[] = [
  { value: "light", icon: Sun, label: "theme.light" },
  { value: "dark", icon: Moon, label: "theme.dark" },
  { value: "system", icon: Monitor, label: "theme.system" },
]

function useThemeChoice() {
  const [choice, setChoice] = React.useState<ThemeChoice>("system")
  const choiceRef = React.useRef(choice)

  React.useEffect(() => {
    const c = readThemeChoice()
    choiceRef.current = c
    setChoice(c)
    return watchSystemTheme(() => choiceRef.current)
  }, [])

  const onChange = (value: string) => {
    const c = value as ThemeChoice
    choiceRef.current = c
    setChoice(c)
    setThemeChoice(c)
  }
  return [choice, onChange] as const
}

// Three icon buttons in a row (Світла / Темна / Системна), one click, no menu.
// `onMass` = placed on the brand mass (panel footer).
export function ThemeSwitch({ className, onMass = false }: { className?: string; onMass?: boolean }) {
  const [choice, onChange] = useThemeChoice()
  return (
    <div role="radiogroup" aria-label={t("theme.label")} className={cn("inline-flex gap-0.5", className)}>
      {OPTIONS.map(({ value, icon: Icon, label }) => {
        const active = choice === value
        return (
          <Tooltip key={value} content={t(label)}>
            <button
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={t(label)}
              onClick={() => onChange(value)}
              className={cn(
                "inline-flex h-7 w-7 items-center justify-center rounded-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-1",
                onMass
                  ? active
                    ? "bg-brand-hover text-on-brand focus-visible:outline-on-brand"
                    : "text-on-brand-3 hover:text-on-brand focus-visible:outline-on-brand"
                  : active
                    ? "bg-hover text-ink focus-visible:outline-action"
                    : "text-faint hover:text-ink focus-visible:outline-action"
              )}
            >
              <Icon size={14} />
            </button>
          </Tooltip>
        )
      })}
    </div>
  )
}

// Icon button + menu: Світла / Темна / Системна. The trigger shows the current choice.
export function ThemeToggle({ className }: { className?: string }) {
  const [choice, onChange] = useThemeChoice()

  const Current = OPTIONS.find((o) => o.value === choice)?.icon ?? Monitor

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("theme.label")}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-md text-dim hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action",
          className
        )}
      >
        <Current size={16} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuRadioGroup value={choice} onValueChange={onChange}>
          {OPTIONS.map(({ value, icon: Icon, label }) => (
            <DropdownMenuRadioItem key={value} value={value} className="gap-2">
              <Icon size={16} className="text-dim" />
              {t(label)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
