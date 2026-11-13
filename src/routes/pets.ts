import { Router, type Response } from "express";
import { requireRole, AuthRequest } from "../middleware/auth.ts";
import { db } from "../db/index.ts";
import { pets, vetAuthorizations } from "../db/schema.ts";
import { eq, and } from "drizzle-orm";

export const petsRouter = Router();

// Get all pets for current owner or sitter
petsRouter.get("/", requireRole(["PET_OWNER", "PET_SITTER", "ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const ownerPets = await db.select().from(pets).where(eq(pets.ownerId, req.dbUser.id));
    res.json(ownerPets);
  } catch (error: any) {
    console.error("Fetch pets error:", error);
    res.status(500).json({ error: "Failed to fetch pets", cause: error.message });
  }
});

// Create a pet profile
petsRouter.post("/", requireRole(["PET_OWNER", "PET_SITTER", "ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const { 
      name, type, breed, age, weight, photoUrl,
      foodType, foodGramsPerMeal, foodFrequency, otherNotes,
      vaccinationRecordsUrl, dietaryRestrictions, 
      medicalConditions, medicationRequirements, behavioralNotes,
      vetAuth
    } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: "Name and type are required" });
    }

    const result = await db.insert(pets).values({
      ownerId: req.dbUser.id,
      name, type, breed, age, 
      weight: weight ? String(weight) : null,
      photoUrl: photoUrl || null,
      foodType: foodType || null,
      foodGramsPerMeal: foodGramsPerMeal ? String(foodGramsPerMeal) : null,
      foodFrequency: foodFrequency || null,
      otherNotes: otherNotes || null,
      vaccinationRecordsUrl, dietaryRestrictions,
      medicalConditions, medicationRequirements, behavioralNotes
    }).returning();

    const newPet = result[0];

    let insertedVetAuth = null;
    if (vetAuth && vetAuth.clinicName && vetAuth.clinicPhone && vetAuth.clinicAddress && vetAuth.digitalSignature) {
      const vetResult = await db.insert(vetAuthorizations).values({
        petId: newPet.id,
        clinicName: vetAuth.clinicName,
        clinicPhone: vetAuth.clinicPhone,
        clinicAddress: vetAuth.clinicAddress,
        digitalSignature: vetAuth.digitalSignature,
        preAuthorizedSpendLimit: vetAuth.preAuthorizedSpendLimit || 0
      }).returning();
      insertedVetAuth = vetResult[0];
    }

    res.status(201).json({ pet: newPet, vetAuth: insertedVetAuth });
  } catch (error: any) {
    console.error("Create pet error:", error);
    res.status(500).json({ error: "Failed to create pet profile", cause: error.message });
  }
});

// Get a specific pet profile
petsRouter.get("/:id", requireRole(["PET_OWNER", "PET_SITTER", "ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.id, 10);
    if (isNaN(petId)) return res.status(400).json({ error: "Invalid pet ID" });

    // Sitters might need to see pet profiles if they have a booking, but for now we'll allow owners and admins freely.
    // If strict role check is needed, we'd verify the sitter has an active booking with this pet.
    let condition = eq(pets.id, petId);
    if (req.dbUser.role === "PET_OWNER") {
      condition = and(eq(pets.id, petId), eq(pets.ownerId, req.dbUser.id));
    }

    const petResult = await db.select().from(pets).where(condition);
    if (petResult.length === 0) {
      return res.status(404).json({ error: "Pet not found" });
    }

    const vetAuths = await db.select().from(vetAuthorizations).where(eq(vetAuthorizations.petId, petId));

    res.json({ pet: petResult[0], vetAuth: vetAuths[0] || null });
  } catch (error: any) {
    console.error("Fetch pet error:", error);
    res.status(500).json({ error: "Failed to fetch pet", cause: error.message });
  }
});

// Update a pet profile
petsRouter.put("/:id", requireRole(["PET_OWNER", "PET_SITTER", "ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.id, 10);
    if (isNaN(petId)) return res.status(400).json({ error: "Invalid pet ID" });

    const condition = req.dbUser.role === "ADMIN" 
      ? eq(pets.id, petId) 
      : and(eq(pets.id, petId), eq(pets.ownerId, req.dbUser.id));

    const { 
      name, type, breed, age, weight, photoUrl,
      foodType, foodGramsPerMeal, foodFrequency, otherNotes,
      vaccinationRecordsUrl, dietaryRestrictions, 
      medicalConditions, medicationRequirements, behavioralNotes
    } = req.body;

    const result = await db.update(pets)
      .set({
        name, type, breed, age, 
        weight: weight !== undefined ? (weight ? String(weight) : null) : undefined,
        photoUrl: photoUrl !== undefined ? (photoUrl || null) : undefined,
        foodType: foodType !== undefined ? (foodType || null) : undefined,
        foodGramsPerMeal: foodGramsPerMeal !== undefined ? (foodGramsPerMeal ? String(foodGramsPerMeal) : null) : undefined,
        foodFrequency: foodFrequency !== undefined ? (foodFrequency || null) : undefined,
        otherNotes: otherNotes !== undefined ? (otherNotes || null) : undefined,
        vaccinationRecordsUrl: vaccinationRecordsUrl !== undefined ? vaccinationRecordsUrl : undefined,
        dietaryRestrictions: dietaryRestrictions !== undefined ? dietaryRestrictions : undefined,
        medicalConditions: medicalConditions !== undefined ? medicalConditions : undefined,
        medicationRequirements: medicationRequirements !== undefined ? medicationRequirements : undefined,
        behavioralNotes: behavioralNotes !== undefined ? behavioralNotes : undefined
      })
      .where(condition)
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: "Pet not found or unauthorized" });
    }

    res.json({ pet: result[0] });
  } catch (error: any) {
    console.error("Update pet error:", error);
    res.status(500).json({ error: "Failed to update pet", cause: error.message });
  }
});

// Delete a pet profile
petsRouter.delete("/:id", requireRole(["PET_OWNER", "ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.id, 10);
    if (isNaN(petId)) return res.status(400).json({ error: "Invalid pet ID" });

    const condition = req.dbUser.role === "ADMIN" 
      ? eq(pets.id, petId) 
      : and(eq(pets.id, petId), eq(pets.ownerId, req.dbUser.id));

    const result = await db.delete(pets).where(condition).returning();
    if (result.length === 0) {
      return res.status(404).json({ error: "Pet not found or unauthorized" });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("Delete pet error:", error);
    res.status(500).json({ error: "Failed to delete pet", cause: error.message });
  }
});
