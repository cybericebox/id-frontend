import { cn } from "@/utils/cn"

/**
 * Visual «*» for a required field. Hidden from assistive tech: the control itself
 * carries `required` (and `aria-required`), so a screen reader announces "required"
 * once, not a stray "star".
 */
export function RequiredMark({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("ml-0.5 text-danger", className)}>
      *
    </span>
  )
}
