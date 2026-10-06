"use client"

import React, { useState, useEffect, useRef, useMemo } from "react"
import { useForm, type SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FormError, reportFormError } from "@/components/ui/form-error"
import { Checkbox } from "@/components/ui/checkbox"
import { Check, LinkIcon } from "lucide-react"
import { PasswordInput } from "@/components/ui/password-input"
import { PasswordStrength } from "@/components/ui/password-strength"
import { usePasswordPolicy } from "@/lib/passwordPolicy"
import { LoadingArea } from "@/components/ui/spinner"
import { ErrorScreen } from "@/components/ErrorScreen"
import { AuthLayout } from "./AuthLayout"
import { useOneShotParam } from "@/lib/useOneShotParam"
import { useUrlParams } from "@/lib/useUrlParams"
import { mainOrigin } from "@/lib/origins"
import { AuthHeading, AuthPane, AuthSwitch, GoogleIcon, inlineLinkClass } from "./parts"
import { t } from "@/i18n/t"
import { apiPost, apiUrl } from "@/api/client"
import { setupDraftKey } from "@/lib/storageKeys"
import { buildSetupSchema, type SetupValues } from "./setupSchema"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TOS_VERSION = 1

// ---------------------------------------------------------------------------
// Setup info returned by GET /api/auth/setup?token=<token>
// ---------------------------------------------------------------------------
interface SetupInfo {
  Email: string
  FirstName: string
  LastName: string
  HasProvider: boolean
}

// ---------------------------------------------------------------------------
// Draft persistence (sessionStorage) — survives the Google-link full redirect.
// Only non-secret fields; passwords are never written to web storage.
// ---------------------------------------------------------------------------
interface SetupDraft {
  FirstName?: string
  LastName?: string
  AcceptTos?: boolean
}

function readDraft(key: string): SetupDraft | null {
  if (!key || typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as SetupDraft) : null
  } catch {
    return null
  }
}

function writeDraft(key: string, draft: SetupDraft) {
  if (!key || typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(key, JSON.stringify(draft))
  } catch {
    // storage full / disabled — non-fatal, drafting is best-effort
  }
}

function clearDraft(key: string) {
  if (!key || typeof window === "undefined") return
  try {
    window.sessionStorage.removeItem(key)
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Error state card
// ---------------------------------------------------------------------------
function ErrorCard({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <AuthLayout reversed={true} variant="setup">
      <AuthPane>
        <LinkIcon size={32} className="text-danger" aria-hidden />
        <AuthHeading title={title} subtitle={description} />
        <AuthSwitch text={t("register.haveAccount")} href="/sign-in" action={t("common.signIn")} />
        <AuthSwitch href="/sign-up" action={t("setup.startOver")} />
      </AuthPane>
    </AuthLayout>
  )
}

// ---------------------------------------------------------------------------
// The invite token comes from the URL on the client (params is null until then): the layout is in the static HTML,
// the form block shows the crest loader while the token is read and the invite is fetched.
// ---------------------------------------------------------------------------
export function SetupScreen() {
  const params = useUrlParams()
  const token = params?.get("token") ?? ""
  const [linkError] = useOneShotParam("error", params)
  // Post-registration landing, carried from sign-up / Google (validated by the backend).
  const returnTo = params?.get("return_to") ?? ""

  // Terms of Service live on the apex (main) frontend, not the id subdomain.
  const termsUrl = `${mainOrigin}/terms`
  const privacyUrl = `${mainOrigin}/privacy`
  const legalLink = (href: string, label: string) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className={inlineLinkClass}>
      {label}
    </a>
  )
  // setup.tosAccept carries {terms} and {privacy}; each placeholder becomes a link.
  const tosLabel = t("setup.tosAccept")
    .split(/(\{terms\}|\{privacy\})/)
    .map((part) =>
      part === "{terms}" ? <React.Fragment key="terms">{legalLink(termsUrl, t("setup.tosLink"))}</React.Fragment>
      : part === "{privacy}" ? <React.Fragment key="privacy">{legalLink(privacyUrl, t("setup.privacyLink"))}</React.Fragment>
      : part,
    )

  // Draft persistence: linking Google does a full-page redirect that wipes the
  // form. Persist the non-secret fields to sessionStorage (per-tab, cleared on
  // close) keyed by token, so they're restored when the user returns. Passwords
  // are intentionally NOT persisted (avoid writing secrets to web storage).
  const draftKey = token ? setupDraftKey(token) : ""

  // Fetch state
  const [setupInfo, setSetupInfo] = useState<SetupInfo | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isFetching, setIsFetching] = useState(true)
  // Server/network failure while loading the invite (not an invalid link): full-page ErrorScreen with retry.
  const [loadFailure, setLoadFailure] = useState<{ error: unknown } | null>(null)
  const [attempt, setAttempt] = useState(0)

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Derived: whether Google is currently linked (may update after page reload post-link)
  const hasGoogle = setupInfo?.HasProvider ?? false

  // Keep a stable mutable ref for hasGoogle so the schema closure can always
  // read the current value without being rebuilt on every render.
  const hasGoogleRef = useRef(hasGoogle)
  useEffect(() => {
    hasGoogleRef.current = hasGoogle
  }, [hasGoogle])

  // Build schema once; its superRefine reads hasGoogleRef at validation time.
  const policy = usePasswordPolicy()
  const policyRef = useRef(policy)
  useEffect(() => {
    policyRef.current = policy
  }, [policy])

  // eslint-disable-next-line @eslint-react/exhaustive-deps
  const schema = useMemo(() => buildSetupSchema(hasGoogleRef, policyRef), [])

  const form = useForm<SetupValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      FirstName: "",
      LastName: "",
      Password: "",
      ConfirmPassword: "",
      AcceptTos: false,
    },
  })

  // The confirmation is required whenever a password is required or typed.
  const confirmRequired = !hasGoogle || Boolean(form.watch("Password"))

  // ---------------------------------------------------------------------------
  // Fetch setup info on mount (or when token changes)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (params === null) return
    if (!token) {
      setIsFetching(false)
      return
    }

    let cancelled = false

    async function fetchSetupInfo() {
      try {
        const res = await fetch(
          apiUrl(`/api/auth/setup?token=${encodeURIComponent(token)}`),
          {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          }
        )

        if (cancelled) return

        if (res.status >= 500) {
          setLoadFailure({ error: { status: res.status } })
          setIsFetching(false)
          return
        }

        if (!res.ok) {
          // 20406 = registration already completed → say so; anything else is an
          // invalid/expired link (generic, anti-enumeration).
          const env = await res.json().catch(() => null)
          const code = env?.Status?.Code
          setFetchError(code === 20406 ? t("setup.alreadyCompleteDescription") : t("setup.invalidTokenDescription"))
          setIsFetching(false)
          return
        }

        // Backend wraps the payload in { Status, Data }; unwrap it.
        const envelope = await res.json()
        const data: SetupInfo = (envelope?.Data ?? envelope) as SetupInfo

        if (!cancelled) {
          setSetupInfo(data)
          // Restore a saved draft (e.g. after the Google-link redirect); fall
          // back to the server's prefill. Passwords are never persisted.
          const draft = readDraft(draftKey)
          form.reset({
            FirstName: draft?.FirstName ?? data.FirstName ?? "",
            LastName: draft?.LastName ?? data.LastName ?? "",
            Password: "",
            ConfirmPassword: "",
            AcceptTos: draft?.AcceptTos ?? false,
          })
          setIsFetching(false)
        }
      } catch (err) {
        if (!cancelled) {
          setLoadFailure({ error: err })
          setIsFetching(false)
        }
      }
    }

    fetchSetupInfo()
    return () => {
      cancelled = true
    }
  }, [params, token, attempt]) // eslint-disable-line @eslint-react/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Persist non-secret fields to sessionStorage as they change, so the form
  // survives the full-page Google-link redirect.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!draftKey) return
    const sub = form.watch((values) => {
      writeDraft(draftKey, {
        FirstName: values.FirstName,
        LastName: values.LastName,
        AcceptTos: values.AcceptTos,
      })
    })
    return () => sub.unsubscribe()
  }, [draftKey, form])

  // ---------------------------------------------------------------------------
  // Submit handler
  // ---------------------------------------------------------------------------
  const onSubmit: SubmitHandler<SetupValues> = async (data) => {
    setFormError(null)
    setIsSubmitting(true)

    try {
      const body: Record<string, unknown> = {
        Token: token,
        FirstName: data.FirstName,
        LastName: data.LastName,
        Password: data.Password,
        TosVersion: data.AcceptTos ? TOS_VERSION : 0,
      }
      if (returnTo) body.Redirect = returnTo

      // The backend now returns 200 JSON { Status, Data: { RedirectURL } } instead
      // of a 307 redirect. apiPost unwraps the envelope and throws ApiError on 4xx
      // (with ApiError.message = envelope Status.Message, handled in the catch below).
      // Top-level navigation to RedirectURL is NOT CORS-restricted; the callback
      // plants the per-subdomain local token and redirects to the final page.
      // required:false — a 401 here (invalid/expired setup token) must surface
      // inline. Without it the client treats the 401 as "not signed in" and
      // redirects to sign-in, swallowing the error mid-registration.
      const { RedirectURL } = await apiPost<{ RedirectURL: string }>(
        "/api/auth/setup",
        body,
        undefined,
        { required: false }
      )

      clearDraft(draftKey) // registration complete — drop the saved draft
      if (RedirectURL) {
        window.location.assign(RedirectURL)
      } else {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Reload after setup so the new authentication state is read from storage.
        window.location.assign("/profile/")
      }
    } catch (err) {
      reportFormError(err, setFormError)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Guard: no token in URL
  // ---------------------------------------------------------------------------
  if (params !== null && !token) {
    return (
      <ErrorCard
        title={t("setup.missingToken")}
        description={t("setup.missingTokenDescription")}
      />
    )
  }

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  if (params === null || isFetching) {
    return (
      <AuthLayout reversed={true} variant="setup">
        <AuthPane>
          <LoadingArea className="min-h-64" />
        </AuthPane>
      </AuthLayout>
    )
  }

  if (loadFailure) {
    return <ErrorScreen error={loadFailure.error} onRetry={() => { setLoadFailure(null); setIsFetching(true); setAttempt((n) => n + 1) }} />
  }

  // ---------------------------------------------------------------------------
  // Fetch error state (invalid / expired / already-completed token)
  // ---------------------------------------------------------------------------
  if (fetchError || !setupInfo) {
    return (
      <ErrorCard
        title={t("setup.invalidToken")}
        description={fetchError ?? t("setup.invalidTokenDescription")}
      />
    )
  }

  // ---------------------------------------------------------------------------
  // Render form
  // ---------------------------------------------------------------------------
  return (
    <AuthLayout reversed={true} variant="setup">
      <AuthPane>
        <AuthHeading title={t("setup.title")} subtitle={t("setup.subtitle")} />

          {/* Link-Google error banner (returned after failed OAuth link attempt) */}
          {linkError === "link_failed" && (
            <Alert variant="destructive">
              <AlertDescription>{t("setup.linkFailed")}</AlertDescription>
            </Alert>
          )}

          {/* Submit error banner */}

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
              noValidate
            >
              {/* Email — read-only / locked */}
              <div className="space-y-2">
                <label htmlFor="setup-email" className="text-[13px] font-medium leading-[1.35] text-ink">
                  {t("setup.email")}
                </label>
                <Input
                  id="setup-email"
                  type="email"
                  value={setupInfo.Email}
                  readOnly
                  autoComplete="username"
                />
              </div>

              {/* First name */}
              <FormField
                control={form.control}
                name="FirstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>{t("setup.firstName")}</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        required
                        placeholder={t("setup.firstNamePlaceholder")}
                        autoComplete="given-name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Last name */}
              <FormField
                control={form.control}
                name="LastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>{t("setup.lastName")}</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        required
                        placeholder={t("setup.lastNamePlaceholder")}
                        autoComplete="family-name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Divider: Login methods */}
              <div className="space-y-3 border-t border-line pt-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-ink">
                    {t("setup.loginMethodsTitle")}
                  </p>
                  <p className="text-[13px] text-dim">
                    {t("setup.loginMethodsSubtitle")}
                  </p>
                </div>

                {/* Google section */}
                {hasGoogle ? (
                  <div className="flex h-10 items-center gap-2 rounded-md border border-line bg-surface px-3 text-sm text-ink">
                    <GoogleIcon />
                    <span className="flex-1">{t("setup.googleConnected")}</span>
                    <Check size={16} className="text-ok" aria-hidden />
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    type="button"
                    className="w-full"
                    onClick={() => {
                      // Must hit api.<domain> (the id origin has no /api routes).
                      window.location.href = apiUrl(`/api/auth/google/setup?token=${encodeURIComponent(token)}${returnTo ? `&return_to=${encodeURIComponent(returnTo)}` : ""}`)
                    }}
                  >
                    <GoogleIcon />
                    {t("setup.linkGoogle")}
                  </Button>
                )}

                {/* Password */}
                <FormField
                  control={form.control}
                  name="Password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required={!hasGoogle}>{t("setup.setPassword")}</FormLabel>
                      <FormControl>
                        <PasswordInput
                          required={!hasGoogle}
                          placeholder={t("setup.passwordPlaceholder")}
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      {/* with text typed, the strength line names what is missing */}
                  <PasswordStrength value={field.value} policy={policy} />
                  <FormMessage className={field.value ? "hidden" : undefined} />
                    </FormItem>
                  )}
                />

                {/* Confirm password — required whenever a password is (or must be) set */}
                <FormField
                    control={form.control}
                    name="ConfirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required={confirmRequired}>{t("setup.confirmPassword")}</FormLabel>
                        <FormControl>
                          <PasswordInput
                            required={confirmRequired}
                            placeholder={t("setup.confirmPasswordPlaceholder")}
                            autoComplete="new-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>

              {/* Terms of Service */}
              <FormField
                control={form.control}
                name="AcceptTos"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        required
                        label={<span>{tosLabel}</span>}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormError message={formError} />

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                busy={isSubmitting}
              >
                {t("setup.submit")}
              </Button>
            </form>
          </Form>

        <AuthSwitch text={t("register.haveAccount")} href="/sign-in" action={t("common.signIn")} />
      </AuthPane>
    </AuthLayout>
  )
}
