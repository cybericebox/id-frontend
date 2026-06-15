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
import { Wordmark } from "@/components/brand/Wordmark"
import { t } from "@/i18n/t"

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
  HasGoogle: boolean
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
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="flex w-full max-w-md flex-col">
        <div className="mb-6 flex justify-center">
          <Wordmark size="lg" />
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
    </main>
  )
}

// ---------------------------------------------------------------------------
// Inner component (uses useSearchParams — must be inside <Suspense>)
// ---------------------------------------------------------------------------
function SetupForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""
  const linkError = searchParams.get("error") ?? ""

  // Fetch state
  const [setupInfo, setSetupInfo] = useState<SetupInfo | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isFetching, setIsFetching] = useState(true)

  // Submit state
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Derived: whether Google is currently linked (may update after page reload post-link)
  const hasGoogle = setupInfo?.HasGoogle ?? false

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
    mode: "onChange",
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

    let cancelled = false

    async function fetchSetupInfo() {
      try {
        const res = await fetch(
          `/api/auth/setup?token=${encodeURIComponent(token)}`,
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

        const data: SetupInfo = await res.json()

        if (!cancelled) {
          setSetupInfo(data)
          // Prefill editable fields
          form.reset({
            FirstName: data.FirstName ?? "",
            LastName: data.LastName ?? "",
            Password: "",
            ConfirmPassword: "",
            AcceptTos: false,
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
  // Submit handler
  // ---------------------------------------------------------------------------
  const onSubmit: SubmitHandler<SetupValues> = async (data) => {
    setSubmitError(null)
    setIsSubmitting(true)

    try {
      const body = {
        FirstName: data.FirstName,
        LastName: data.LastName,
        Password: data.Password,
        TosVersion: data.AcceptTos ? TOS_VERSION : 0,
      }

      // The endpoint responds with 302 (sign-in redirect).
      // redirect:'follow' lets fetch chase the redirect automatically.
      // On res.ok or res.redirected → navigate to /profile.
      const res = await fetch(
        `/api/auth/setup/complete?token=${encodeURIComponent(token)}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          redirect: "follow",
        }
      )

      if (res.ok || res.redirected) {
        window.location.href = "/profile"
        return
      }

      // Parse 4xx error body from daemon
      let message: string = t("setup.errorTitle")
      try {
        const payload = await res.json()
        if (typeof payload === "object" && payload !== null) {
          message =
            (payload as { message?: string; error?: string }).message ??
            (payload as { message?: string; error?: string }).error ??
            message
        }
      } catch {
        // non-JSON body — keep the generic message
      }
      setSubmitError(message)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t("error.generic"))
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
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="flex w-full max-w-md flex-col">
          <div className="mb-6 flex justify-center">
            <Wordmark size="lg" />
          </div>
          <Card className="frost-panel frost-in w-full">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {t("common.loading")}
            </CardContent>
          </Card>
        </div>
      </main>
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
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="flex w-full max-w-md flex-col">
        <div className="mb-6 flex justify-center">
          <Wordmark size="lg" />
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
                      window.location.href = `/api/auth/setup/google?token=${encodeURIComponent(token)}`
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
                        label={t("setup.tosLabel")}
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
    </main>
  )
}

// ---------------------------------------------------------------------------
// Page export — wraps in <Suspense> for static-export compatibility
// (useSearchParams opts out of static prerendering without it)
// ---------------------------------------------------------------------------
export default function SetupPage() {
  return (
    <Suspense>
      <SetupForm />
    </Suspense>
  )
}
