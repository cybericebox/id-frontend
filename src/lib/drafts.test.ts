// @vitest-environment jsdom
// Profile drafts belong to one account: another user signing in in the same tab never sees them.
import { beforeEach, describe, expect, it } from "vitest"

import { clearAccountDrafts } from "./drafts"
import { accountEmailDraftKey, profileNameDraftKey, setupDraftKey } from "./storageKeys"

describe("account drafts", () => {
  beforeEach(() => sessionStorage.clear())

  it("are keyed by the user id", () => {
    expect(profileNameDraftKey("u1")).not.toBe(profileNameDraftKey("u2"))
    expect(accountEmailDraftKey("u1")).not.toBe(accountEmailDraftKey("u2"))
    expect(profileNameDraftKey("u1")).toMatch(/^cib_/)
  })

  it("an account switch drops the drafts of every other account and keeps the own ones", () => {
    sessionStorage.setItem(profileNameDraftKey("u1"), "{}")
    sessionStorage.setItem(accountEmailDraftKey("u1"), "{}")
    sessionStorage.setItem(profileNameDraftKey("u2"), "{}")
    sessionStorage.setItem(setupDraftKey("token"), "{}")
    sessionStorage.setItem("cib_back", "x")
    clearAccountDrafts("u2")
    expect(sessionStorage.getItem(profileNameDraftKey("u1"))).toBeNull()
    expect(sessionStorage.getItem(accountEmailDraftKey("u1"))).toBeNull()
    expect(sessionStorage.getItem(profileNameDraftKey("u2"))).toBe("{}")
    // not account drafts: left alone
    expect(sessionStorage.getItem(setupDraftKey("token"))).toBe("{}")
    expect(sessionStorage.getItem("cib_back")).toBe("x")
  })

  it("sign-out drops them all", () => {
    sessionStorage.setItem(profileNameDraftKey("u1"), "{}")
    sessionStorage.setItem(accountEmailDraftKey("u2"), "{}")
    clearAccountDrafts()
    expect(sessionStorage.length).toBe(0)
  })
})
