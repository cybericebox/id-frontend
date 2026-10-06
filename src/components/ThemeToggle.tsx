"use client"

import * as React from "react"
import { Monitor, Moon, Sun } from "lucide-react"

import { Tooltip } from "@/components/ui/tooltip"
import { t } from "@/i18n/t"
import {
  readThemeChoice,
  setThemeChoice,
  watchSystemTheme,
  type ThemeChoice,
} from "@/lib/theme"
import { cn } from "@/utils/cn"
import { nextTabIndex } from "@/lib/tablist"

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
    <div role="radiogroup" aria-label={t("theme.label")} className={cn("inline-flex items-center gap-0.5 rounded-md border p-0.5", onMass ? "border-brand-line" : "border-line", className)}>
      {OPTIONS.map(({ value, icon: Icon, label }, index) => {
        const active = choice === value
        return (
          <Tooltip key={value} content={t(label)}>
            <button
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={t(label)}
              // roving tabindex: the group is one tab stop, the arrows move the choice (WAI-ARIA radio group)
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(value)}
              onKeyDown={(event) => {
                const to = nextTabIndex(event, index, OPTIONS.length, "horizontal")
                if (to === null || event.key === "Home" || event.key === "End") return
                event.preventDefault()
                onChange(OPTIONS[to].value)
                const radios = event.currentTarget.closest<HTMLElement>('[role="radiogroup"]')?.querySelectorAll<HTMLElement>('[role="radio"]')
                radios?.[to]?.focus()
              }}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-1",
                onMass
                  ? active
                    ? "bg-brand-hover text-on-brand focus-visible:outline-on-brand"
                    : "text-on-brand-3 hover:bg-brand-hover hover:text-on-brand focus-visible:outline-on-brand"
                  : active
                    ? "bg-hero text-ink focus-visible:outline-action"
                    : "text-dim hover:bg-hover hover:text-ink focus-visible:outline-action"
              )}
            >
              <Icon size={16} />
            </button>
          </Tooltip>
        )
      })}
    </div>
  )
}
