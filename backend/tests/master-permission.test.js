import assert from "node:assert/strict";
import { test } from "node:test";
import User from "../models/userSchema.js";
import requireMasterPermission from "../middleware/requireMasterPermission.js";

test("master permissions preserve active employee sessions", async () => {
  const original = User.findById;
  const originalSetting = process.env.MASTER_PERMISSIONS_ENABLED;
  let account;
  User.findById = () => ({
    select(fields) {
      if (!account) return Promise.resolve(null);
      return Promise.resolve(Object.fromEntries(
        fields.split(" ").map((field) => [field, account[field]])
      ));
    },
  });
  const check = () => new Promise((resolve) => {
    requireMasterPermission("customers")(
      { auth: { userId: "employee", role: "Employee" }, method: "GET" },
      {}, resolve
    );
  });
  try {
    delete process.env.MASTER_PERMISSIONS_ENABLED;
    account = { role: "Employee", status: "Active", permissions: [] };
    assert.equal(await check(), undefined);
    process.env.MASTER_PERMISSIONS_ENABLED = "false";
    assert.equal(await check(), undefined);
    account.status = "Inactive";
    assert.equal((await check()).code, "AUTH_INVALID");
    process.env.MASTER_PERMISSIONS_ENABLED = "true";
    account = { role: "Employee", status: "Active", permissions: ["customers:view"] };
    assert.equal(await check(), undefined);
    account.permissions = [];
    const denied = await check();
    assert.equal(denied.statusCode, 403);
    assert.equal(denied.code, "PERMISSION_DENIED");
    account.status = "Inactive";
    assert.equal((await check()).code, "AUTH_INVALID");
    account = null;
    assert.equal((await check()).code, "AUTH_INVALID");
  } finally {
    User.findById = original;
    if (originalSetting === undefined) delete process.env.MASTER_PERMISSIONS_ENABLED;
    else process.env.MASTER_PERMISSIONS_ENABLED = originalSetting;
  }
});
