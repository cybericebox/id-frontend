import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { t } from "@/i18n/t"

// Branded 404 page using DS components.
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 text-6xl font-bold text-muted-foreground">
            404
          </div>
          <CardTitle>{t("error.notFound")}</CardTitle>
          <CardDescription>{t("error.notFoundDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/sign-in">{t("error.goHome")}</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
