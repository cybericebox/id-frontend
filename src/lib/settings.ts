/**
 * Optional installation settings (README, Configuration → Installation settings).
 *
 * Every setting is optional and "no value = not shown". The value of each one is written into an attribute of <html>
 * (settingsAttrs, spread in the root layout); src/styles/cfg.css hides the optional blocks by those attributes, so no JavaScript
 * decides what is shown and nothing moves after load. In an image the attribute holds a placeholder (__NEXT_PUBLIC_X__) that the container
 * entrypoint replaces with the value or with an empty string; in a build with real values it holds the value itself.
 *
 * Each variable is read by its literal name (Next inlines it) and only assigned to an attribute: no comparison, no `||`, no `??`, nothing a
 * minifier could fold into a constant at build time (a comparison on the placeholder is what made NEXT_PUBLIC_SHOW_PARTNERS=false dead in images).
 * A variable that does not exist at all (local `next dev`) leaves the attribute out; an empty one gives data-cfg-x="". Both mean "empty".
 */
export const settingsAttrs = () => ({
  "data-cfg-main-site-url": process.env.NEXT_PUBLIC_MAIN_SITE_URL,
  "data-cfg-terms-url": process.env.NEXT_PUBLIC_TERMS_URL,
  "data-cfg-privacy-url": process.env.NEXT_PUBLIC_PRIVACY_URL,
  "data-cfg-cookies-url": process.env.NEXT_PUBLIC_COOKIES_URL,
  "data-cfg-ice-support": process.env.NEXT_PUBLIC_SHOW_ICE_DEPARTMENT_SUPPORT,
})

export type SettingName = "main-site-url" | "terms-url" | "privacy-url" | "cookies-url" | "ice-support"

export type LegalDocument = "terms" | "privacy"

/**
 * The legal documents the page shows (a document is shown when its URL setting has a value), in the order the backend lists them. This is what
 * the sign-up consent sends as AcceptedDocuments and what makes the checkbox required. Like cfg(): only in handlers and validation, never in render.
 */
export function shownDocuments(): LegalDocument[] {
  const documents: LegalDocument[] = []
  if (cfg("terms-url") !== "") documents.push("terms")
  if (cfg("privacy-url") !== "") documents.push("privacy")
  return documents
}

/**
 * The value of a setting, read from <html>. Only in event handlers, effects and validation, never while rendering (a render-time read
 * would differ between the server and the client). "" when the setting is empty or absent.
 */
export const cfg = (name: SettingName): string => document.documentElement.getAttribute(`data-cfg-${name}`) ?? ""
