import { LibSQLDatabase } from "drizzle-orm/libsql";
import { CreatePet, PetTable, SelectPet } from "../db/schemas/pet";
import { eq, and } from "drizzle-orm";
import { UserTable } from "../db/schemas/user";
import { BaseService } from "./service";
import { parseConfigFileTextToJson } from "typescript";
import {
  AsyncResult,
  ErrorCodes,
  Fail,
  Failed,
  Ok,
  Result,
} from "../../lib/error";

export interface PetInfo {
  id: number;
  name: string;
  specie: string;
  createdAt: Date;
  ownerId: number;
  owner?: {
    id: number;
    name: string;
    email: string;
    phoneNumber: string;
  };
}

export interface PartialPetInfo {
  id: number;
  name: string;
  specie: string;
  createdAt: Date;
  ownerId: number;
  owner: {
    id: number;
    name: string;
    email: string;
    phoneNumber: string;
  } | null;
}
export const PetTablePublicColumns = {
  id: PetTable.id,
  name: PetTable.name,
  ownerId: PetTable.ownerId,
  createdAt: PetTable.createdAt,
  ownerName: UserTable.name,
  specie: PetTable.specie,
  metadata: PetTable.metadata,
  owner: {
    id: UserTable.id,
    name: UserTable.name,
    email: UserTable.email,
    phoneNumber: UserTable.phoneNumber,
  },
};

export class PetService extends BaseService {
  async all(): AsyncResult<PartialPetInfo[]> {
    const result = await this.db
      .select(PetTablePublicColumns)
      .from(PetTable)
      .leftJoin(UserTable, eq(PetTable.ownerId, UserTable.id));
    if (!result || result.length == 0) {
      return Fail("Pets not found", ErrorCodes.NOT_FOUND);
    }
    return Ok(result);
  }
  // private readonly JWT_SECRET: string;
  constructor(db: LibSQLDatabase, jwtSecret: string) {
    super(db, jwtSecret);
  }

  public async create(petInfo: CreatePet): AsyncResult<SelectPet> {
    const [result] = await this.db.insert(PetTable).values(petInfo).returning();

    if (!result) {
      return Fail("Pets not found", ErrorCodes.NOT_FOUND);
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
  }): AsyncResult<PetInfo> {
    console.log("get called");
    if (
      (id == undefined && (userId == undefined || name == undefined)) || // No pet id AND no user Id with pet name
      (userId && name == undefined) // User id but no pet name
    ) {
      return Fail(
        "Must specify either the pet Id or the userId with the pet name",
        ErrorCodes.NOT_FOUND,
      );
    }

    return id ? this.getById(id) : this.getByUser(userId!, name!);
  }

  public async getById(petId: number): AsyncResult<PetInfo> {
    const [result] = await this.db
      .select(PetTablePublicColumns)
      .from(PetTable)
      .innerJoin(UserTable, eq(PetTable.ownerId, UserTable.id))
      .where(eq(PetTable.id, petId));

    if (!result) Fail("Pet not found", ErrorCodes.NOT_FOUND);
    return Ok(result);
  }

  public async getAllByUser(userId: number) {
    const result = await this.db
      .select(PetTablePublicColumns)
      .from(PetTable)
      .innerJoin(UserTable, eq(PetTable.ownerId, UserTable.id))
      .where(eq(PetTable.ownerId, userId));
    if (!result || result.length == 0) {
      Fail("Pets not found", ErrorCodes.NOT_FOUND);
    }
    return Ok(result);
  }
  public async getByUser(userId: number, name: string): AsyncResult<PetInfo> {
    const [result] = await this.db
      .select(PetTablePublicColumns)
      .from(PetTable)
      .innerJoin(UserTable, eq(PetTable.ownerId, UserTable.id))
      .where(and(eq(PetTable.ownerId, userId), eq(PetTable.name, name)));
    if (!result) {
      Fail("Pets not found", ErrorCodes.NOT_FOUND);
    }
    return Ok(result);
  }

  public async update(
    petId: number,
    updates: Partial<CreatePet>,
  ): AsyncResult<SelectPet> {
    // Ensure user owns the pet
    const { data: pet, error } = await this.getById(petId);

    if (error || !pet) {
      return error
        ? Failed(error)
        : Fail("Pet not Found", ErrorCodes.NOT_FOUND);
    }

    // If metadata is being updated, merge with existing metadata
    let updatedMetadata = updates.metadata;
    if (updates.metadata) {
      try {
        // const existingMetadata = pet.metadata;
        const newMetadata = updates.metadata;
        updatedMetadata = {
          // ...existingMetadata,
          ...newMetadata,
        };
      } catch (e) {
        console.error("Error processing metadata:", e);
      }
    }
    const [result] = await this.db
      .update(PetTable)
      .set({
        ...updates,
        metadata: updatedMetadata,
        ownerId: pet.ownerId, // Prevent owner change
      })
      .where(eq(PetTable.id, petId))
      .returning();

    if (!result) {
      return Fail("Pet not found", ErrorCodes.NOT_FOUND);
    }
    return Ok(result);
  }

  public async delete(petId: number): AsyncResult<SelectPet> {
    // Ensure user owns the pet
    // await this.verifyOwnership(petId, userId);

    const [result] = await this.db
      .delete(PetTable)
      .where(eq(PetTable.id, petId))
      .returning();

    if (!result) {
      return Fail("Pet not found", ErrorCodes.NOT_FOUND);
    }

    return Ok(result);
  }

  private async verifyOwnership(
    petId: number,
    userId: number,
  ): Promise<SelectPet> {
    const [pet] = await this.db
      .select()
      .from(PetTable)
      .where(and(eq(PetTable.id, petId), eq(PetTable.ownerId, userId)));

    if (!pet) throw new Error("Pet not found or access denied");
    return pet;
  }
}
