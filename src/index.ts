import {  Hono } from "hono";
import { cors } from "hono/cors";
import auth from "./routes/auth";
import pet from "./routes/pet";
import staff from "./routes/staff"
import { Bindings, Variables } from "./types";
import { setupDb } from "./db";
import { registerServices } from "./services";
const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use(cors());
app.use(setupDb())
app.use(registerServices())

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.route("/api/auth", auth);
app.route("/api/pet", pet);
app.route("/api/staff",staff)

export default app;
