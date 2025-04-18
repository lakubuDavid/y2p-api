import { describe, test, expect, beforeAll, afterAll, mock } from "bun:test";
import { PetService } from "../../src/services/pet";
import { CreatePet, PetTable } from "../../src/db/schemas/pet";
import { LibSQLDatabase } from "drizzle-orm/libsql";
import { ErrorCodes } from "../../lib/error";

describe("PetService", () => {
  let petService: PetService;
  let mockDb: any;

  beforeAll(() => {
    // Mock database interactions
    mockDb = {
      insert: mock(() => ({
        values: mock(() => ({
          returning: mock(() => [{ id: 1, name: "Buddy", specie: "Dog" }]),
        })),
      })),
      select: mock(() => ({
        from: mock(() => ({
          where: mock(() => ({
            all: mock(() => [
              { id: 1, name: "Buddy", specie: "Dog", ownerId: 1 },
            ]),
          })),
          all: mock(() => [
            { id: 1, name: "Buddy", specie: "Dog", ownerId: 1 },
            { id: 2, name: "Whiskers", specie: "Cat", ownerId: 2 },
          ]),
          leftJoin: mock(() => ({
            where: mock(() => ({
              all: mock(() => [
                {
                  pet: { id: 1, name: "Buddy", specie: "Dog", ownerId: 1 },
                  user: { id: 1, name: "John", email: "john@example.com" },
                },
              ]),
            })),
            all: mock(() => [
              {
                pet: { id: 1, name: "Buddy", specie: "Dog", ownerId: 1 },
                user: { id: 1, name: "John", email: "john@example.com" },
              },
            ]),
          })),
        })),
      })),
      update: mock(() => ({
        set: mock(() => ({
          where: mock(() => ({
            returning: mock(() => [{ id: 1, name: "Max", specie: "Dog" }]),
          })),
        })),
      })),
      delete: mock(() => ({
        where: mock(() => ({
          returning: mock(() => [{ id: 1, name: "Buddy", specie: "Dog" }]),
        })),
      })),
    };

    petService = new PetService(
      mockDb as unknown as LibSQLDatabase,
      "secret-token",
    );
  });

  describe("create", () => {
    test("should create a new pet successfully", async () => {
      const petData: CreatePet = {
        name: "Buddy",
        ownerId: 1,
        specie: "Dog",
        metadata: {},
      };

      const result = await petService.create(petData);

      expect(result.error).toBeUndefined();
      expect(result.data).toMatchObject({
        id: 1,
        name: "Buddy",
        specie: "Dog",
      });
      expect(mockDb.insert).toHaveBeenCalledWith(PetTable);
    });

    test("should return error if pet creation fails", async () => {
      mockDb.insert = mock(() => ({
        values: mock(() => ({
          returning: mock(() => []),
        })),
      }));

      const petData: CreatePet = {
        name: "Buddy",
        ownerId: 1,
        specie: "Dog",
        metadata: {},
      };

      const result = await petService.create(petData);
      expect(result.error).not.toBeNull();
      expect(result.error?.code).toBe(ErrorCodes.NOT_FOUND);
    });
  });

  describe("all", () => {
    test("should retrieve all pets", async () => {
      mockDb.select = mock(() => ({
        from: mock(() => ({
          leftJoin: mock(() => [
            {
              pet: { id: 1, name: "Buddy", specie: "Dog", ownerId: 1 },
              user: { id: 1, name: "John", email: "john@example.com" },
            },
          ]),
        })),
      }));
      const result = await petService.all();
      expect(result.error).toBeUndefined();
      expect(result.data).toHaveLength(1);
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe("update", () => {
    test("should update a pet successfully", async () => {
      mockDb.select = mock(() => ({
        from: mock(() => ({
          innerJoin: mock(() => ({
            where: mock(() => [
              {
                pet: { id: 1, name: "Buddy", specie: "Dog", ownerId: 1 },
                user: { id: 1, name: "John", email: "john@example.com" },
              },
            ]),
          })),
        })),
      }));
      const petData = {
        name: "Max",
        specie: "Dog",
        metadata: {},
      };

      const result = await petService.update(1, petData);

      expect(result.error).toBeUndefined();
      expect(result.data).toMatchObject({ id: 1, name: "Max", specie: "Dog" });
    });

    test("should return error if pet not found for update", async () => {
      mockDb.update = mock(() => ({
        set: mock(() => ({
          where: mock(() => ({
            returning: mock(() => []),
          })),
        })),
      }));

      mockDb.select = mock(() => ({
        from: mock(() => ({
          innerJoin: mock(() => ({
            where: mock(() => [
              {
                pet: { id: 1, name: "Buddy", specie: "Dog", ownerId: 1 },
                user: { id: 1, name: "John", email: "john@example.com" },
              },
            ]),
          })),
        })),
      }));
      const petData = {
        name: "Max",
        specie: "Dog",
      };

      const result = await petService.update(999, petData);

      expect(result.error).not.toBeUndefined();
      expect(result.error?.code).toBe(ErrorCodes.NOT_FOUND);
    });
  });

  describe("delete", () => {
    test("should delete a pet successfully", async () => {
      const result = await petService.delete(1);

      expect(result.error).toBeUndefined();
      expect(result.data).toMatchObject({
        id: 1,
        name: "Buddy",
        specie: "Dog",
      });
    });

    test("should return error if pet not found for deletion", async () => {
      mockDb.delete = mock(() => ({
        where: mock(() => ({
          returning: mock(() => []),
        })),
      }));

      const result = await petService.delete(999);

      expect(result.error).not.toBeUndefined();
      expect(result.error?.code).toBe(ErrorCodes.NOT_FOUND);
    });
  });
});
