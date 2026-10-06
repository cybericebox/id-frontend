import { describe, expect, it, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"

vi.mock("next/navigation", () => ({ usePathname: () => "/sign-in" }))

import uk from "../../messages/uk.json"
import en from "../../messages/en.json"
import { ErrorPage, ErrorScreen, NotFoundScreen } from "./ErrorPage"

const noop = () => {}

describe("ErrorPage", () => {
  it("page mode: centred column plus the footer with brand, home and feedback links", () => {
    const html = renderToStaticMarkup(<NotFoundScreen />)
    expect(html).toContain("ib-error--page")
    expect(html).toContain(">404<")
    expect(html).toContain("Сторінку не знайдено")
    expect(html).toContain("<footer")
    expect(html).toContain("ib-error__brand")
    expect(html).toContain("Cyber ICE Box")
    expect(html).toContain('href="mailto:')
    expect(html).toContain(">На головну<")
    expect(html).toContain(">Назад<")
  })

  it("block mode: only the column, no footer and no crest", () => {
    const html = renderToStaticMarkup(<NotFoundScreen mode="block" title="Шаблон не знайдено" body="Немає такого." />)
    expect(html).toContain("ib-error--block")
    expect(html).toContain("Шаблон не знайдено")
    expect(html).not.toContain("<footer")
    expect(html).not.toContain("<img")
    expect(html).not.toContain("ib-error--page")
    expect(html).toContain("<h2")
  })

  it("shows the code line only when the error carries a code", () => {
    expect(renderToStaticMarkup(<ErrorScreen onRetry={noop} />)).not.toContain("ib-error__ref")
    const html = renderToStaticMarkup(<ErrorScreen onRetry={noop} error={{ code: 50310 }} />)
    expect(html).toContain("ib-error__ref")
    expect(html).toContain("Код помилки: 50310")
    expect(html).toContain(">500<")
    expect(html).toContain(">Спробувати ще раз<")
  })

  it("has a retry action for errors and a home action for not-found", () => {
    expect(renderToStaticMarkup(<ErrorPage status={404} title="a" body="b" />)).toContain('href="/sign-in"')
    expect(renderToStaticMarkup(<ErrorPage status={500} title="a" body="b" onRetry={noop} />)).toContain(">Спробувати ще раз<")
  })

  it("has the texts in both catalogs", () => {
    for (const key of ["error.notFound", "error.notFoundDescription", "error.goHome", "error.page.back", "error.page.nav", "error.page.title", "error.page.body"] as const) {
      expect(uk[key]).toBeTruthy()
      expect(en[key]).toBeTruthy()
    }
  })
})
