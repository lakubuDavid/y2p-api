// File: test/unit/routes/user.test.ts
import { expect, test, describe, beforeEach, mock } from "bun:test";
import { Hono } from "hono";
import { UserService } from "../../../src/services/user";
import { ErrorCodes, Ok, Fail } from "../../../lib/error";
import user from "../../../src/routes/user";
import { AuthService } from "../../../src/services/auth";

declare module "hono" {
  interface ContextVariableMap {
    authService: AuthService;
    userService: UserService;
  }
}
describe("User Routes", () => {
  let app: Hono;
  let mockUserService: any;

  process.env["ENVIRONMENT"] = "test";

  beforeEach(() => {
    // Create mock user service
    mockUserService = {
      all: mock(() =>
        Ok([{ id: 1, email: "user@example.com", name: "Test User" }]),
      ),
      getById: mock(() =>
        Ok({ id: 1, email: "user@example.com", name: "Test User" }),
      ),
    };

    // Create app instance with mock services
    app = new Hono();
    app.use("*", (c, next) => {
      c.set("userService", mockUserService);
      c.set("jwtPayload", { userId: 1, role: "user" }); // Mock authenticated user
      return next();
    });

    // Add user routes
    app.route("/user", user);
  });

  test("GET /user should call all()", async () => {
    const req = new Request("http://localhost/user");
    const res = await app.fetch(req);
    expect(res.status).toBe(200);
    expect(mockUserService.all).toHaveBeenCalledTimes(1);

    const result = await res.json();
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
  });

  test("GET /user/me should call getById() with authenticated user id", async () => {
    const req = new Request("http://localhost/user/me");
    const res = await app.fetch(req);

    expect(res.status).toBe(200);
    expect(mockUserService.getById).toHaveBeenCalledTimes(1);
    expect(mockUserService.getById.mock.calls[0][0]).toBe(1); // Should use the ID from JWT payload

    const result = await res.json();
    expect(result.data).toBeDefined();
  });

  test("GET /user/me should return error when user not found", async () => {
    mockUserService.getById = mock(() =>
      Fail("User not found", ErrorCodes.USER_NOT_FOUND),
    );

    const req = new Request("http://localhost/user/me");
    const res = await app.fetch(req);
    expect(res.status).toBe(404);

    const result = await res.json();
    expect(result.error).toBeDefined();
    expect(result.error?.code).toBe(ErrorCodes.USER_NOT_FOUND);
  });

  test("GET /user without authentication should return unauthorized", async () => {
    process.env["ENVIRONMENT"] = "production"
    // Create a new app without the JWT payload
    const unauthApp = new Hono();
    unauthApp.use("*", (c, next) => {
      c.set("userService", mockUserService);
      // No JWT payload set
      return next();
    });
    unauthApp.route("/user", user);

    const req = new Request("http://localhost/user");
    const res = await unauthApp.fetch(req);

    const result = await res.text();
    expect(res.status).toBe(401);

    expect(result).toBe("Unauthorized");
  });
});
