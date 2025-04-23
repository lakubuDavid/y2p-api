// File: /tests/user.test.ts
import { expect, test, describe, beforeEach, mock } from "bun:test";
import { UserService } from "../../src/services/user";
import { ErrorCodes } from "../../lib/error";

describe("UserService", () => {
  let userService;
  let mockDb;

  beforeEach(() => {
    mockDb = {
      insert: mock(() => ({
        values: mock(() => ({
          returning: mock(() => [
            [{ id: 1, email: "user@example.com", name: "Test User" }],
          ]),
        })),
      })),
      select: mock(() => ({
        from: mock(() => ({
          innerJoin: mock(() => ({
            where: mock(() => [
              { id: 1, email: "user@example.com", name: "Test User" },
            ]),
          })),
        })),
      })),
      update: mock(() => ({
        set: mock(() => ({
          where: mock(() => ({
            returning: mock(() => [
              [{ id: 1, email: "user@example.com", name: "Updated User" }],
            ]),
          })),
        })),
      })),
      delete: mock(() => ({
        where: mock(() => ({
          returning: mock(() => [
            [{ id: 1, email: "user@example.com", name: "Test User" }],
          ]),
        })),
      })),
    };

    userService = new UserService(mockDb, "jwt_secret");
  });

  test("should create a user successfully", async () => {
    mockDb.select = mock(() => ({
        from: mock(() => ({
          innerJoin: mock(() => ({
            where: mock(() => [
            ]),
          })),
        })),
    }));
    mockDb.insert = mock(() => ({
      values: mock(() => ({
        returning: mock(() => [
          { id: 1, email: "user@example.com", name: "Test User" },
        ]),
      })),
    }));
    const userData = {
      email: "user@example.com",
      name: "Test User",
      password: "password123",
    };

    const result = await userService.create(userData);
    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
    expect(result.data.email).toBe("user@example.com");
  });

  test("should get user by email", async () => {
    const email = "user@example.com";

    const result = await userService.getByEmail(email);

    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
    expect(result.data.email).toBe(email);
  });

  test("should return error if user not found by email", async () => {
    // Change the mock to return empty array
    mockDb.select = mock(() => ({
        from: mock(() => ({
          innerJoin: mock(() => ({
            where: mock(() => [
            ]),
          })),
        })),
    }));

    const result = await userService.getByEmail("nonexistent@example.com");

    expect(result.data).toBeUndefined();
    expect(result.error).toBeDefined();
    expect(result.error.code).toBe(ErrorCodes.USER_NOT_FOUND);
  });
});
