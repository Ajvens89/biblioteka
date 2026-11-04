import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";
import { CATALOG_ONLY_MODE, circulationDisabledResult } from "./catalog-mode";
import * as reservations from "./actions/reservations";
import * as loans from "./actions/loans";
import * as extensions from "./actions/extension-requests";
import * as waitlist from "./actions/waitlist";
import * as wishlist from "./actions/wishlist";
import * as ratings from "./actions/ratings";
import * as notifications from "./actions/notifications";
import * as copies from "./actions/copies";
import * as games from "./actions/games";
import { registerAction } from "./actions/auth";
import { registerLocal } from "./auth/local-auth";
import { POST as cronPost } from "../app/api/cron/[job]/route";
import { middleware } from "../middleware";

const testGlobal = globalThis as typeof globalThis & { prisma?: PrismaClient };
const previousPrisma = testGlobal.prisma;
const previousFetch = globalThis.fetch;
const previousCronSecret = process.env.CRON_SECRET;
const previousAuthProvider = process.env.AUTH_PROVIDER;
let databaseAccesses = 0;
let networkCalls = 0;

before(() => {
  // Any actor lookup, mutation, audit record or notification creation will fail the test.
  testGlobal.prisma = new Proxy({} as PrismaClient, { get() {
    databaseAccesses++;
    throw new Error("Catalog-only entrypoint attempted database access");
  } });
  globalThis.fetch = async () => {
    networkCalls++;
    throw new Error("Catalog-only entrypoint attempted network/mail access");
  };
  process.env.CRON_SECRET = "catalog-only-unit-test-secret";
  process.env.AUTH_PROVIDER = "local";
});
after(() => {
  testGlobal.prisma = previousPrisma;
  globalThis.fetch = previousFetch;
  if (previousCronSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = previousCronSecret;
  if (previousAuthProvider === undefined) delete process.env.AUTH_PROVIDER;
  else process.env.AUTH_PROVIDER = previousAuthProvider;
});

describe("catalog-only server boundary", () => {
  it("rejects all old circulation mutation/lookup RPCs without reaching auth, DB or mail", async () => {
    assert.equal(CATALOG_ONLY_MODE, true);
    const modules: Array<[string, Record<string, unknown>]> = [
      ["reservations", reservations], ["loans", loans],
      ["extensions", {
        requestLoanExtensionAction: extensions.requestLoanExtensionAction,
        approveExtensionRequestAction: extensions.approveExtensionRequestAction,
        rejectExtensionRequestAction: extensions.rejectExtensionRequestAction,
      }],
      ["waitlist", { joinWaitlistAction: waitlist.joinWaitlistAction, leaveWaitlistAction: waitlist.leaveWaitlistAction }],
      ["wishlist", { toggleWishlistAction: wishlist.toggleWishlistAction, removeWishlistItemAction: wishlist.removeWishlistItemAction }],
      ["ratings", { submitGameRatingAction: ratings.submitGameRatingAction }],
      ["notifications", { markNotificationRead: notifications.markNotificationRead, markAllNotificationsRead: notifications.markAllNotificationsRead }],
      ["copies", { editCopy: copies.editCopy, createCopy: games.createCopy, updateCopy: games.updateCopy }],
    ];
    let checked = 0;
    for (const [moduleName, actions] of modules) {
      for (const [name, action] of Object.entries(actions)) {
        assert.equal(typeof action, "function", `${moduleName}.${name}`);
        // Even malformed or replayed historical arguments must stop at the mode guard.
        const result = await (action as (...args: unknown[]) => Promise<unknown>)(undefined, undefined, undefined);
        assert.deepEqual(result, circulationDisabledResult(), `${moduleName}.${name}`);
        checked++;
      }
    }
    assert.equal(checked, 30);
    assert.equal(databaseAccesses, 0);
    assert.equal(networkCalls, 0);
  });

  it("returns empty historical account widgets without querying private data", async () => {
    const id = "5a1e69f0-2667-46be-957c-cfaaf1b67aff";
    assert.deepEqual(await extensions.getPendingExtensionRequests(), []);
    assert.equal(await extensions.getUserPendingExtension(id), null);
    assert.equal(await waitlist.getWaitlistStatusAction(id), null);
    assert.equal(await wishlist.isOnWishlistAction(id), false);
    assert.deepEqual(await ratings.getGameRatingSummary(id), { average: 0, count: 0 });
    assert.equal(await ratings.getUserGameRating(id, id), null);
    assert.equal(await notifications.getUnreadNotificationCount(), 0);
    assert.deepEqual(await notifications.getNotifications(), { items: [], total: 0, page: 1, pages: 0 });
    assert.equal(await copies.getCopyForEdit(id), null);
    assert.equal(databaseAccesses, 0);
    assert.equal(networkCalls, 0);
  });

  it("keeps cron authentication and skips every recognized job without DB or email", async () => {
    const unauthenticated = await cronPost(new Request("https://library.example/api/cron/cleanup", { method: "POST" }), {
      params: Promise.resolve({ job: "cleanup" }),
    });
    assert.equal(unauthenticated.status, 401);
    for (const job of ["expire-reservations", "mark-overdue-loans", "send-return-reminders", "cleanup"]) {
      const response = await cronPost(new Request(`https://library.example/api/cron/${job}`, {
        method: "POST", headers: { authorization: "Bearer catalog-only-unit-test-secret" },
      }), { params: Promise.resolve({ job }) });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { ok: true, job, skipped: true, reason: "catalog-only" });
    }
    assert.equal(databaseAccesses, 0);
    assert.equal(networkCalls, 0);
  });

  it("redirects old personal-account routes and retains admin login protection", async () => {
    for (const pathname of ["/moje-konto?tab=wypozyczenia", "/moje-rezerwacje", "/moje-konto/archiwum"]) {
      const response = await middleware(new NextRequest(`https://library.example${pathname}`));
      assert.equal(response.headers.get("location"), "https://library.example/katalog");
    }
    const admin = await middleware(new NextRequest("https://library.example/admin/gry"));
    assert.equal(new URL(admin.headers.get("location")!).pathname, "/login");
    assert.equal(databaseAccesses, 0);
    assert.equal(networkCalls, 0);
  });

  it("keeps public account registration disabled without touching the database", async () => {
    assert.equal((await registerAction(undefined, new FormData())).success, false);
    assert.equal((await registerLocal("unused@example.invalid", "unused", "Unused")).ok, false);
    assert.equal(databaseAccesses, 0);
    assert.equal(networkCalls, 0);
  });
});
