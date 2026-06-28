import { useSyncExternalStore } from "react"
import { getAuthReady, subscribeAuthReady, runSilentAuthOnce } from "@/lib/silentAuth"

// True once the one-shot silent check has finished (token planted or confirmed
// anon). Potentially-private queries gate on it: `enabled: useAuthReady()`.
// Reading it also kicks the bootstrap, so a private query alone is enough to start it.
export function useAuthReady(): boolean {
  void runSilentAuthOnce()
  return useSyncExternalStore(subscribeAuthReady, getAuthReady, () => false)
}
