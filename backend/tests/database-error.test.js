import assert from "node:assert/strict";
import { test } from "node:test";
import errorHandler from "../middleware/errorHandler.js";

test("database connectivity errors return a clear 503 in production", () => {
  const previousEnv = process.env.NODE_ENV;
  const previousLog = console.error;
  process.env.NODE_ENV = "production";
  console.error = () => {};
  try {
    for (const name of ["MongoServerSelectionError", "MongooseServerSelectionError", "MongoNetworkError", "MongoNetworkTimeoutError", "Error"]) {
      let status;
      let body;
      const headers = {};
      const res = {
        set(key, value) { headers[key] = value; },
        status(value) { status = value; return this; },
        json(value) { body = value; },
      };
      const err = new Error("Internal connection details");
      err.name = name;
      errorHandler(err, { method: "GET", originalUrl: "/api/masters/warehouses" }, res, () => {});
      assert.equal(status, name === "Error" ? 500 : 503);
      assert.equal(body.error.code, name === "Error" ? "INTERNAL_ERROR" : "DATABASE_UNAVAILABLE");
      assert.equal(body.error.stack, undefined);
      if (status === 503) assert.equal(headers["Retry-After"], "5");
    }
  } finally {
    console.error = previousLog;
    if (previousEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnv;
  }
});
