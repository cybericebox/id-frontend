// Static-export-safe i18n wrapper.
// Build-time JSON import — no runtime locale provider, no locale switching.
// Copy messages/en.json to other apps following the DS sync procedure (see README).
import messages from "../../messages/en.json"

type MessageKey = keyof typeof messages

/**
 * Translate a message key to its English string.
 * Returns the key itself if no translation is found (safe fallback).
 */
export function t(key: MessageKey | string): string {
  return (messages as Record<string, string>)[key] ?? key
}
