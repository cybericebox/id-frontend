"use client"

import React, { Suspense, useState, useEffect, useRef, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { useForm, type SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Logo } from "@/components/brand/Logo"
import { Spinner } from "@/components/ui/spinner"
import { AuthLayout } from "./AuthLayout"
import { t } from "@/i18n/t"
import { apiPost, apiUrl } from "@/api/client"
import { localizedError } from "@/i18n/apiError"

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
// Zod schema — client-side validation
// Password and ConfirmPassword are always strings (empty = no password chosen).
//
// The ≥1-method rule depends on whether Google is already linked. We inject
// this as a mutable ref so the stable schema closure can always read the
// latest value without needing to be rebuilt on every render.
// ---------------------------------------------------------------------------
const BaseSetupSchema = z.object({
  FirstName: z
    .string()
    .min(1, { message: t("validation.required") })
    .max(255),
  LastName: z
    .string()
    .min(1, { message: t("validation.required") })
    .max(255),
  Password: z.string().max(255),
  ConfirmPassword: z.string().max(255),
  AcceptTos: z.boolean(),
})

type SetupValues = z.infer<typeof BaseSetupSchema>

/**
 * Returns a schema whose superRefine reads hasGoogle from the supplied ref.
 * Call this ONCE (e.g. with React.useMemo / outside re-renders) and update
 * the ref whenever hasGoogle changes.
 */
function buildSchema(hasGoogleRef: React.MutableRefObject<boolean>) {
  return BaseSetupSchema.superRefine((data, ctx) => {
    // Password confirmation must match if a password is entered
    if (data.Password && data.Password !== data.ConfirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: t("validation.passwordsNoMatch"),
        path: ["ConfirmPassword"],
      })
    }

    // At least one method: password or Google
    const hasPassword = Boolean(data.Password && data.Password.length > 0)
    if (!hasPassword && !hasGoogleRef.current) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: t("validation.methodRequired"),
        path: ["Password"],
      })
    }

    // ToS must be accepted
    if (!data.AcceptTos) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: t("validation.tosRequired"),
        path: ["AcceptTos"],
      })
    }
  })
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
      <div className="flex w-full max-w-md flex-col">
        <div className="mb-6 flex justify-center">
          <Logo size={88} />
        </div>
        <Card className="frost-panel frost-in w-full">
          <CardHeader>
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">CyberICEBox</span>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardFooter className="flex-col gap-2 text-sm text-muted-foreground">
            <Link href="/sign-in" className="text-primary hover:underline">
              {t("common.signIn")}
            </Link>
            <Link href="/sign-up" className="text-primary hover:underline">
              {t("register.title")}
            </Link>
          </CardFooter>
        </Card>
      </div>
    </AuthLayout>
  )
}

// ---------------------------------------------------------------------------
// Inner component (uses useSearchParams — must be inside <Suspense>)
// ---------------------------------------------------------------------------
function SetupForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""
  const linkError = searchParams.get("error") ?? ""

  // Terms of Service live on the apex (main) frontend, not the id subdomain.
  const domain = process.env.NEXT_PUBLIC_DOMAIN ?? ""
  const termsUrl = domain ? `https://${domain}/terms` : "/terms"

  // Draft persistence: linking Google does a full-page redirect that wipes the
  // form. Persist the non-secret fields to sessionStorage (per-tab, cleared on
  // close) keyed by token, so they're restored when the user returns. Passwords
  // are intentionally NOT persisted (avoid writing secrets to web storage).
  const draftKey = token ? `setup-draft:${token}` : ""

  // Fetch state
  const [setupInfo, setSetupInfo] = useState<SetupInfo | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isFetching, setIsFetching] = useState(true)

  // Submit state
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Derived: whether Google is currently linked (may update after page reload post-link)
  const hasGoogle = setupInfo?.HasProvider ?? false

  // Keep a stable mutable ref for hasGoogle so the schema closure can always
  // read the current value without being rebuilt on every render.
  const hasGoogleRef = useRef(hasGoogle)
  useEffect(() => {
    hasGoogleRef.current = hasGoogle
  }, [hasGoogle])

  // Build schema once; its superRefine reads hasGoogleRef at validation time.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const schema = useMemo(() => buildSchema(hasGoogleRef), [])

  const form = useForm<SetupValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {
      FirstName: "",
      LastName: "",
      Password: "",
      ConfirmPassword: "",
      AcceptTos: false,
    },
  })

  // ---------------------------------------------------------------------------
  // Fetch setup info on mount (or when token changes)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!token) {
      setIsFetching(false)
      return
    }

    // Preview short-circuit (design-sync): render the real form with demo data
    // instead of hitting a server that isn't there.
    if (token === "preview-token-DEMO1234") {
      setSetupInfo({
        Email: "hacker@cybericebox.com",
        FirstName: "Ігор",
        LastName: "Морозенко",
        HasProvider: false,
      })
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

        if (!res.ok) {
          setFetchError(t("setup.invalidToken"))
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
      } catch {
        if (!cancelled) {
          setFetchError(t("error.generic"))
          setIsFetching(false)
        }
      }
    }

    fetchSetupInfo()
    return () => {
      cancelled = true
    }
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

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
    setSubmitError(null)
    setIsSubmitting(true)

    try {
      const body = {
        Token: token,
        FirstName: data.FirstName,
        LastName: data.LastName,
        Password: data.Password,
        TosVersion: data.AcceptTos ? TOS_VERSION : 0,
      }

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
        window.location.assign("/profile")
      }
    } catch (err) {
      setSubmitError(localizedError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Guard: no token in URL
  // ---------------------------------------------------------------------------
  if (!token) {
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
  if (isFetching) {
    return (
      <AuthLayout reversed={true} variant="setup">
        <div className="flex w-full max-w-md flex-col">
          <div className="mb-6 flex justify-center">
            <Logo size={88} />
          </div>
          <Card className="frost-panel frost-in w-full">
            <CardContent className="flex justify-center py-8">
              <Spinner size="md" className="text-primary" />
            </CardContent>
          </Card>
        </div>
      </AuthLayout>
    )
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
      <div className="flex w-full max-w-md flex-col">
        <div className="mb-6 flex justify-center">
          <Logo size={88} />
        </div>
        <Card className="frost-panel frost-in w-full">
          <CardHeader>
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">CyberICEBox</span>
            <CardTitle>{t("setup.title")}</CardTitle>
            <CardDescription>{t("setup.subtitle")}</CardDescription>
          </CardHeader>

        <CardContent className="space-y-4">
          {/* Link-Google error banner (returned after failed OAuth link attempt) */}
          {linkError === "link_failed" && (
            <Alert variant="destructive">
              <AlertDescription>{t("setup.linkFailed")}</AlertDescription>
            </Alert>
          )}

          {/* Submit error banner */}
          {submitError && (
            <Alert variant="destructive">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
              noValidate
            >
              {/* Email — read-only / locked */}
              <div className="space-y-1">
                <label className="text-sm font-medium leading-none">
                  {t("setup.email")}
                </label>
                <Input
                  type="email"
                  value={setupInfo.Email}
                  readOnly
                  disabled
                  className="cursor-not-allowed opacity-60"
                  autoComplete="email"
                />
              </div>

              {/* First name */}
              <FormField
                control={form.control}
                name="FirstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("setup.firstName")}</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
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
                    <FormLabel>{t("setup.lastName")}</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
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
              <div className="space-y-2 pt-2">
                <p className="text-sm font-medium">
                  {t("setup.loginMethodsTitle")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("setup.loginMethodsSubtitle")}
                </p>

                {/* Google section */}
                {hasGoogle ? (
                  <div className="flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm text-muted-foreground">
                    <span className="flex-1">{t("setup.googleConnected")}</span>
                    <span aria-hidden="true">&#10003;</span>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    type="button"
                    className="w-full"
                    onClick={() => {
                      window.location.href = `/api/auth/google/setup?token=${encodeURIComponent(token)}`
                    }}
                  >
                    {t("setup.linkGoogle")}
                  </Button>
                )}

                {/* Password */}
                <FormField
                  control={form.control}
                  name="Password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("setup.setPassword")}</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder={t("setup.passwordPlaceholder")}
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Confirm password — only show when a password has been entered */}
                {form.watch("Password") && (
                  <FormField
                    control={form.control}
                    name="ConfirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("setup.confirmPassword")}</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder={t("setup.confirmPasswordPlaceholder")}
                            autoComplete="new-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
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
                        label={
                          <span>
                            {t("setup.tosAccept")}{" "}
                            <a
                              href={termsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {t("setup.tosLink")}
                            </a>
                          </span>
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? t("common.loading") : t("setup.submit")}
              </Button>
            </form>
          </Form>
        </CardContent>

        <CardFooter className="justify-center text-sm text-muted-foreground">
          {t("register.haveAccount")}&nbsp;
          <Link href="/sign-in" className="text-primary hover:underline">
            {t("common.signIn")}
          </Link>
        </CardFooter>
        </Card>
      </div>
    </AuthLayout>
  )
}

// ---------------------------------------------------------------------------
// Page export — wraps in <Suspense> for static-export compatibility
// (useSearchParams opts out of static prerendering without it)
// ---------------------------------------------------------------------------
export function SetupScreen() {
  return (
    <Suspense>
      <SetupForm />
    </Suspense>
  )
}
