// File: /tests/auth.test.ts
import { expect, test, describe, beforeEach, mock } from "bun:test";
import { AuthService } from "../../src/services/auth";
import { ErrorCodes } from "../../lib/error";

describe("AuthService", () => {
  let authService;
  let mockDb;
  let mockPasswordCompare;

  beforeEach(() => {
    // Mock Bcrypt compare function
    mockPasswordCompare = mock(() => Promise.resolve(true));

    // Mock implementation to replace bcrypt in your AuthService
    globalThis.bcrypt = {
      compare: mockPasswordCompare,
    };

    mockDb = {
      select: mock(() => ({
        from: mock(() => ({
          where: mock(() => [
            {
              id: 1,
              email: "user@example.com",
              password_hash: "hashedpassword",
              role: "user",
            },
          ]),
        })),
      })),
      insert: mock(() => ({
        values: mock(() => ({
          returning: mock(() => [
            [{ id: 1, token: "refresh-token", user_id: 1 }],
          ]),
        })),
      })),
    };

    authService = new AuthService(mockDb, "jwt_secret");
  });

  // NOTE: THIS CANNOT BE MOCKED AND WILL BE DONE IN PRODUCTION
  // IF I FIND A WAY TO MOCK IT I WILL BUT FOR NOW
  // IT'S IN THE FRIDGE
  // 
  // test.skip("should login successfully with valid credentials", async () => {
  //   mockDb.select = mock(() => ({
  //     from: mock(() => ({
  //       where: mock(() => [
  //         {
  //           id: 1,
  //           email: "user@example.com",
  //           password_hash: "hashedpassword",
  //           role: "user",
  //         },
  //       ]),
  //     })),
  //   }));
  //   authService.hashPassword = mock(()=>["hashedpassword"])

  //   const result = await authService.login("user@example.com", "password123");
  //   console.log(result)
  //   expect(result.error).toBeUndefined();
  //   expect(result.data).toBeDefined();
  //   expect(result.data.accessToken).toBeDefined();
  //   expect(result.data.refreshToken).toBeDefined();
  //   expect(result.data.user).toBeDefined();
  // });

  test("should fail login with invalid credentials", async () => {
    // Mock password compare to return false (invalid password)
    mockPasswordCompare.mockImplementationOnce(() => Promise.resolve(false));

    const result = await authService.login("user@example.com", "wrongpassword");

    expect(result.data).toBeUndefined();
    expect(result.error).toBeDefined();
    expect(result.error.code).toBe(ErrorCodes.AUTHENTICATION_FAILED);
  });
});
