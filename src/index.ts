import { Hono } from "hono";
import { cors } from "hono/cors";
import auth from "./routes/auth";
import pet from "./routes/pet";
import staff from "./routes/staff";
import user from "./routes/user";
import { Bindings, Variables } from "./types";
import { setupDb } from "./db";
import { registerServices } from "./services";
import { logger } from "hono/logger";
import { getCookie } from "hono/cookie";
import { config } from "dotenv";
import {authHeaders} from "./middlewares/authHeaders"
import reservation from "./routes/reservation";


const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

config({path:".env"})

app.use(logger());
app.use(
  cors(
    {
      credentials:true,
      // origin:(origin,c)=>{
      //   return origin
      // },
      origin:["http://localhost:5173"]
    }
  ),
);
app.use(setupDb());
app.use(registerServices());
app.use(authHeaders)

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.get("/api", (c) => {
  const co = getCookie(c, "__token");
  return c.text("Something");
});

app.route("/api/auth", auth);
app.route("/api/pet", pet);
app.route("/api/staff", staff);
app.route("/api/reservation",reservation)
app.route("/api/user",user)

export default app;
