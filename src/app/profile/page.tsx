import type { Metadata } from "next"
import { ProfileScreen } from "@/components/profile/ProfileScreen"
import { t } from "@/i18n/t"

export const metadata: Metadata = { title: t("meta.profile") }

export default function ProfilePage() {
  return <ProfileScreen />
}
