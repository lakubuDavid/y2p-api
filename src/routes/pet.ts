import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { AppContext, Bindings, Variables } from "../types";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { Failed, Ok } from "../../lib/error";
import { authenticatedOnly } from "../middlewares/authentication";
import { InsertPetSchema, UpdatePetSchema } from "@/models/pet";

const pets = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// JWT middleware
// pets.use("*", (c, next) => {
//   const jwtMiddleware = jwt({
//     secret: c.env.JWT_SECRET,
//   });
//   return jwtMiddleware(c, next);
// });

pets.use("*", authenticatedOnly);
const petSchema = z.object({
  name: z.string().min(1, "Pet name is required"),
});

const updatePetSchema = z.object({
  name: z.string().min(1, "Pet name is required").optional(),
});

// Create pet
pets.post("/", zValidator("json", InsertPetSchema), async (c) => {
  const { petService } = c.var;
  const payload = c.get("jwtPayload");
  const { name,specie,metadata,ownerId } = c.req.valid("json");

  try {
    const pet = await petService.create({
      name,
      ownerId: ownerId,
      metadata,
      specie
    });

    return c.json(
      {
        status: "ok",
        message: "Pet created successfully",
        pet,
      },
      201,
    );
  } catch (error) {
    return c.json(
      {
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to create pet",
      },
      400,
    );
  }
});

// Get user's pets
pets.get("/", async (c) => {
  const { petService } = c.var;
  const payload = c.get("jwtPayload");
  console.log(payload);
  try {
    const response = await petService.all();
    console.log(response);
    return c.json({
      data: response.data,
      error: response.error,
      status: response.error ? "error" : "ok",
    });
  } catch (error) {
    return c.json(
      {
        status: "error",
        message: "Failed to fetch pets",
        error,
      },
      500,
    );
  }
});

// Get specific pet
pets.get("/:id", async (c) => {
  const { petService } = c.var;
  const id = parseInt(c.req.param("id"));

  if (isNaN(id)) {
    return c.json({ status: "error", message: "Invalid pet ID" }, 400);
  }

  try {
    const { data: pet, error } = await petService.getById(id);
    if (error) {
      return c.json(Failed(error));
    }
    return c.json(Ok(pet));
  } catch (error) {
    if (error instanceof Error && error.message === "Pet not found") {
      return c.json({ status: "error", message: error.message }, 404);
    }
    return c.json({ status: "error", message: "Failed to fetch pet" }, 500);
  }
});

// Get specific pet
pets.get("/:id/history", async (c) => {
  const { petService,reservationService } = c.var;
  const id = parseInt(c.req.param("id"));

  if (isNaN(id)) {
    return c.json({ status: "error", message: "Invalid pet ID" }, 400);
  }

  try {
    const { data: history, error } = await reservationService.getHistory({petId:id})
    if (error) {
      return c.json(Failed(error));
    }
    return c.json(Ok(history));
  } catch (error) {
    if (error instanceof Error && error.message === "Pet not found") {
      return c.json({ status: "error", message: error.message }, 404);
    }
    return c.json({ status: "error", message: "Failed to fetch pet" }, 500);
  }
});

// Update pet
pets.patch("/:id", zValidator("json", UpdatePetSchema), async (c) => {
  const { petService } = c.var;
  const payload = c.get("jwtPayload");
  const id = parseInt(c.req.param("id"));
  const updates = c.req.valid("json");

  if (isNaN(id)) {
    return c.json({ status: "error", message: "Invalid pet ID" }, 400);
  }

  try {
    const pet = await petService.update(id, updates);
    return c.json({ status: "ok", pet });
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return c.json({ status: "error", message: error.message }, 404);
    }
    return c.json(
      {
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to update pet",
      },
      400,
    );
  }
});

// Delete pet
pets.delete("/:id", async (c) => {
  const { petService } = c.var;
  const payload = c.get("jwtPayload");
  const id = parseInt(c.req.param("id"));

  if (isNaN(id)) {
    return c.json({ status: "error", message: "Invalid pet ID" }, 400);
  }

  try {
    await petService.delete(id);
    return c.json({
      status: "ok",
      message: "Pet deleted successfully",
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return c.json({ status: "error", message: error.message }, 404);
    }
    return c.json(
      {
        status: "error",
        message: "Failed to delete pet",
      },
      500,
    );
  }
});

export default pets;
