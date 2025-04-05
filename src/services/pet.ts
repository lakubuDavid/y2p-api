import { LibSQLDatabase } from "drizzle-orm/libsql";
import { CreatePet, PetTable, SelectPet } from "../db/schemas/pet";
import { eq, and } from "drizzle-orm";
import { UserTable } from "../db/schemas/user";
import { BaseService } from "./service";
import { parseConfigFileTextToJson } from "typescript";
import { ErrorCodes, Fail, Ok, Result } from "../../lib/error";

export class PetService extends BaseService {
  async all() {
    const result = await this.db
      .select({
        id:PetTable.id,
        name:PetTable.name,
        specie:PetTable.specie,
        createdAt:PetTable.createdAt,
        owner:{
          name:UserTable.name,
          email:UserTable.email,
          phoneNumber:UserTable.phoneNumber,
        }
      })
      .from(PetTable)
      .leftJoin(UserTable, eq(PetTable.owner, UserTable.id));
    if (!result || result.length == 0) {
      Fail("Pets not found", ErrorCodes.NOT_FOUND);
    }
    return Ok(result);
  }
  // private readonly JWT_SECRET: string;
  constructor(db: LibSQLDatabase, jwtSecret: string) {
    super(db, jwtSecret);
  }

  public async add(petInfo: CreatePet) {
    const [result] = await this.db.insert(PetTable).values(petInfo).returning();

    if (!result) {
      Fail("Pets not found", ErrorCodes.NOT_FOUND);
    }
    return Ok(result);
    // return result;
  }

  public async get({
    id,
    userId,
    name,
  }: {
    id?: number;
    userId?: number;
    name?: string;
  }) {
    if (
      (id == undefined && (userId == undefined || name == undefined)) || // No pet id AND no user Id with pet name
      (userId && name == undefined) // User id but no pet name
    ) {
      throw new Error(
        "Must specify either the pet Id or the userId with the pet name",
      );
    }

    return id ? this.getById(id) : this.getByUser(userId!, name!);
  }

  public async getById(petId: number): Promise<Result<SelectPet>> {
    const [result] = await this.db
      .select({
        id: PetTable.id,
        name: PetTable.name,
        owner: PetTable.owner,
        createdAt: PetTable.createdAt,
        ownerName: UserTable.name,
        specie: PetTable.specie,
      })
      .from(PetTable)
      .leftJoin(UserTable, eq(PetTable.owner, UserTable.id))
      .where(eq(PetTable.id, petId));

    if (!result) Fail("Pet not found", ErrorCodes.NOT_FOUND);
    return Ok(result);
  }

  public async getAllByUser(userId: number) {
    const result = await this.db
      .select({
        id: PetTable.id,
        name: PetTable.name,
        owner: PetTable.owner,
        createdAt: PetTable.createdAt,
        ownerName: UserTable.name,
        specie: PetTable.specie,
      })
      .from(PetTable)
      .leftJoin(UserTable, eq(PetTable.owner, UserTable.id))
      .where(eq(PetTable.owner, userId));
    if (!result || result.length == 0) {
      Fail("Pets not found", ErrorCodes.NOT_FOUND);
    }
    return Ok(result);
  }
  public async getByUser(userId: number, name: string) {
    const [result] = await this.db
      .select({
        id: PetTable.id,
        name: PetTable.name,
        owner: PetTable.owner,
        createdAt: PetTable.createdAt,
        ownerName: UserTable.name,
        specie: PetTable.specie,
      })
      .from(PetTable)
      .leftJoin(UserTable, eq(PetTable.owner, UserTable.id))
      .where(and(eq(PetTable.owner, userId), eq(PetTable.name, name)));
    if (!result) {
      Fail("Pets not found", ErrorCodes.NOT_FOUND);
    }
    return Ok(result);
  }

  public async update(
    petId: number,
    userId: number,
    updates: Partial<CreatePet>,
  ) {
    // Ensure user owns the pet
    const pet = await this.verifyOwnership(petId, userId);

    const [result] = await this.db
      .update(PetTable)
      .set({
        ...updates,
        owner: pet.owner, // Prevent owner change
      })
      .where(eq(PetTable.id, petId))
      .returning();

    return result;
  }

  public async delete(petId: number, userId: number) {
    // Ensure user owns the pet
    await this.verifyOwnership(petId, userId);

    const [result] = await this.db
      .delete(PetTable)
      .where(eq(PetTable.id, petId))
      .returning();

    return result;
  }

  private async verifyOwnership(
    petId: number,
    userId: number,
  ): Promise<SelectPet> {
    const [pet] = await this.db
      .select()
      .from(PetTable)
      .where(and(eq(PetTable.id, petId), eq(PetTable.owner, userId)));

    if (!pet) throw new Error("Pet not found or access denied");
    return pet;
  }
}
