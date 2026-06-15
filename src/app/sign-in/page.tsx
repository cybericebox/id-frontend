"use client"

// TODO (F2.2): Replace this placeholder with the real sign-in form
// (email + password fields, react-hook-form + zod validation, apiPost to /api/auth/sign-in).
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { t } from "@/i18n/t"

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("signIn.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {/* Sign-in form goes here — task F2.2 */}
            {t("signIn.subtitle")}
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
