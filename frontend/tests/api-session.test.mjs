import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

const source = (await readFile(new URL("../lib/api.js", import.meta.url), "utf8"))
  .replace(/^import .*;\r?\n/gm, "")
  .replace("export default api;", "");

function setup(verify) {
  const storage = new Map([["token", "current"]]);
  const messages = [];
  const location = { pathname: "/customers", href: "/customers" };
  let rejectResponse;
  let checks = 0;
  const api = {
    interceptors: {
      request: { use() {} },
      response: { use(_success, failure) { rejectResponse = failure; } },
    },
    async get() { checks++; return verify(storage); },
  };
  vm.runInNewContext(source, {
    axios: { create: () => api, isCancel: (error) => error.code === "ERR_CANCELED" },
    process: { env: {} },
    window: { location },
    localStorage: { getItem: (key) => storage.get(key), removeItem: (key) => storage.delete(key) },
    sessionStorage: { getItem: () => null, removeItem() {} },
    showError: (message) => messages.push(message),
  });
  const fail = (status = 401, token = "current", extra = {}) => rejectResponse({
    response: { status, data: { error: { code: "AUTH_INVALID" } } },
    config: { _authToken: token }, ...extra,
  }).catch(() => {});
  return { storage, location, messages, fail, checks: () => checks };
}

test("an endpoint 401 preserves a session validated by /users/me", async () => {
  const app = setup(async () => ({}));
  await app.fail();
  assert.equal(app.storage.get("token"), "current");
  assert.equal(app.location.href, "/customers");
});

test("concurrent 401s share verification and confirmed invalid sessions sign out", async () => {
  const app = setup(async () => { throw { response: { status: 401, data: { error: { code: "AUTH_INVALID" } } } }; });
  await Promise.all([app.fail(), app.fail()]);
  assert.equal(app.checks(), 1);
  assert.equal(app.storage.has("token"), false);
  assert.equal(app.location.href, "/login");
});

test("network failures, permission errors, cancellations and stale requests keep the token", async () => {
  const app = setup(async () => { throw new Error("offline"); });
  await app.fail();
  await app.fail(403);
  await app.fail(401, "old");
  await app.fail(401, "current", { code: "ERR_CANCELED" });
  assert.equal(app.checks(), 1);
  assert.equal(app.storage.get("token"), "current");
  assert.equal(app.location.href, "/customers");
});

test("a newer login survives an older session verification failure", async () => {
  const app = setup(async (storage) => {
    storage.set("token", "new-login");
    throw { response: { status: 401, data: { error: { code: "AUTH_INVALID" } } } };
  });
  await app.fail();
  assert.equal(app.storage.get("token"), "new-login");
  assert.equal(app.location.href, "/customers");
});
