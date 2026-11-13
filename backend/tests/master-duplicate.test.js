import assert from "node:assert/strict";
import { test } from "node:test";
import createMasterCrudHandlers from "../services/masters/masterCrud.service.js";
import checkDuplicate from "../utils/checkDuplicate.js";

test("duplicate checks normalize values and exclude the current record on update", async () => {
  let receivedQuery;
  const Model = {
    async exists(query) {
      receivedQuery = query;
      return null;
    },
  };

  const normalized = await checkDuplicate({
    Model,
    value: "  Website ",
    field: "sourceName",
    normalizedField: "normalizedSourceName",
    excludeId: "123",
  });

  assert.equal(normalized, "website");
  assert.equal(receivedQuery.$or[0].normalizedSourceName, "website");
  assert.deepEqual(receivedQuery._id, { $ne: "123" });
  assert.equal(receivedQuery.$or[1].sourceName.test("WEBSITE"), true);
});

test("duplicate checks use uppercase normalization where configured", async () => {
  const Model = {
    async exists(query) {
      assert.equal(query.$or[0].normalizedGSTIN, "GSTIN123");
      return null;
    },
  };

  const normalized = await checkDuplicate({
    Model,
    value: " gstin123 ",
    field: "gstin",
    normalizedField: "normalizedGSTIN",
    format: "upper",
  });

  assert.equal(normalized, "GSTIN123");
});

test("duplicate checks reject matches and skip empty optional values", async () => {
  const duplicateModel = { exists: async () => ({ _id: "existing" }) };
  await assert.rejects(
    checkDuplicate({
      Model: duplicateModel,
      value: "website",
      field: "sourceName",
      normalizedField: "normalizedSourceName",
      message: "Duplicate lead source",
    }),
    (error) =>
      error.statusCode === 409 &&
      error.code === "DUPLICATE_RESOURCE" &&
      error.message === "Duplicate lead source"
  );

  const emptyModel = {
    exists() {
      assert.fail("Empty values must not be checked as duplicates");
    },
  };
  assert.equal(
    await checkDuplicate({
      Model: emptyModel,
      value: " ",
      field: "gstin",
      normalizedField: "normalizedGSTIN",
      format: "upper",
    }),
    null
  );
});

test("master CRUD normalizes values on create and excludes the updated record", async () => {
  const duplicateQueries = [];
  let created;
  const existing = {
    _id: "0123456789abcdef01234567",
    sourceName: "Website",
    async save() {},
  };
  const Model = {
    async exists(query) {
      duplicateQueries.push(query);
      return null;
    },
    async create(fields) {
      created = fields;
      return fields;
    },
    async findById() {
      return existing;
    },
  };
  const handlers = createMasterCrudHandlers({
    Model,
    fields: ["sourceName"],
    duplicate: {
      field: "sourceName",
      normalizedField: "normalizedSourceName",
    },
  });
  const response = {
    status() {
      return this;
    },
    json() {},
  };

  await handlers.create(
    { body: { sourceName: " Facebook " }, auth: { userId: "user-1" } },
    response
  );
  assert.equal(created.normalizedSourceName, "facebook");

  await handlers.update(
    {
      body: { sourceName: "WEBSITE" },
      auth: { userId: "user-1" },
      params: { id: existing._id },
    },
    response
  );
  assert.deepEqual(duplicateQueries[1]._id, { $ne: existing._id });
  assert.equal(existing.normalizedSourceName, "website");
});
