import { LibSQLDatabase } from "drizzle-orm/libsql";
import { CreatePet, PetTable, SelectPet } from "../db/schemas/pet";
import { eq, and } from "drizzle-orm";
import { UserTable } from "../db/schemas/user";

export class PetService {
  private readonly JWT_SECRET: string;
  constructor(private db: LibSQLDatabase,jwtSecret:string) {
    if (!jwtSecret) throw new Error('JWT_SECRET is required');
    this.JWT_SECRET = jwtSecret;
  }
  
  public async add(petInfo: CreatePet) {
    const [result] = await this.db
      .insert(PetTable)
      .values(petInfo)
      .returning();
    return result;
  }

  public async get(petId: number) {
    const [result] = await this.db
      .select({
        id: PetTable.id,
        name: PetTable.name,
        owner: PetTable.owner,
        createdAt: PetTable.createdAt,
        ownerName: UserTable.name,
      })
      .from(PetTable)
      .leftJoin(UserTable, eq(PetTable.owner, UserTable.id))
      .where(eq(PetTable.id, petId));
    
    if (!result) throw new Error('Pet not found');
    return result;
  }

  public async getUserPets(userId: number) {
    return await this.db
      .select({
        id: PetTable.id,
        name: PetTable.name,
        createdAt: PetTable.createdAt,
      })
      .from(PetTable)
      .where(eq(PetTable.owner, userId));
  }

  public async update(petId: number, userId: number, updates: Partial<CreatePet>) {
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

  private async verifyOwnership(petId: number, userId: number): Promise<SelectPet> {
    const [pet] = await this.db
      .select()
      .from(PetTable)
      .where(
        and(
          eq(PetTable.id, petId),
          eq(PetTable.owner, userId)
        )
      );

    if (!pet) throw new Error('Pet not found or access denied');
    return pet;
  }
}
