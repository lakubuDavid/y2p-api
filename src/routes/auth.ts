import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { AppContext, Bindings, Variables } from "../types";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Add JWT middleware for protected routes
auth.use(
  "/protected/*",
  (c,next)=>{
    const jwtMiddleware = jwt({
    secret: c.env.JWT_SECRET,
  })
  return jwtMiddleware(c, next)
  }
);

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string(),
});

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  name: z.string().min(2, "Name must be at least 2 characters"),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

auth.post(
  "/login",
  zValidator("json", loginSchema),
  async (c) => {
    const { authService } = c.var;
    const { email, password } = c.req.valid("json");
    // const body =await  c.req.json()
    // return c.json(body)
    // const { email, password } = body;
    
    try {
      const { user, accessToken, refreshToken } = await authService.login(email, password);
      return c.json({ 
        status: "ok",
        user,
        accessToken,
        refreshToken
      });
    } catch (error) {
      if (error instanceof Error) {
        return c.json({ status: "error", message: error.message }, 401);
      }
      return c.json({ status: "error", message: "An unexpected error occurred" }, 500);
    }
  },
);

auth.post(
  "/signup",
  zValidator("json", signupSchema),
  async (c) => {
    const { authService } = c.var;
    const { email, password, name } = c.req.valid("json");
    
    try {
      const { user, accessToken, refreshToken } = await authService.signUp(email, password, name);
      return c.json({ 
        status: "ok",
        message: "User created successfully",
        user,
        accessToken,
        refreshToken
      }, 201);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Email already registered") {
          return c.json({ status: "error", message: error.message }, 409);
        }
        return c.json({ status: "error", message: error.message }, 400);
      }
      return c.json({ status: "error", message: "An unexpected error occurred" }, 500);
    }
  },
);

auth.post(
  "/refresh",
  zValidator("json", refreshSchema),
  async (c) => {
    const { authService } = c.var;
    const { refreshToken } = c.req.valid("json");
    
    try {
      const tokens = await authService.refreshTokens(refreshToken);
      return c.json({ 
        status: "ok",
        ...tokens
      });
    } catch (error) {
      return c.json({ 
        status: "error", 
        message: "Invalid refresh token" 
      }, 401);
    }
  }
);

auth.post("/protected/logout", async (c) => {
  const { authService } = c.var;
  const payload = c.get("jwtPayload");
  const refreshToken = c.req.header("x-refresh-token");
  
  if (refreshToken) {
    await authService.revokeToken(refreshToken);
  }
  
  return c.json({ status: "ok", message: "Logged out successfully" });
});

auth.post("/protected/logout-all", async (c) => {
  const { authService } = c.var;
  const payload = c.get("jwtPayload");
  
  await authService.revokeAllUserTokens(payload.userId);
  
  return c.json({ status: "ok", message: "Logged out from all devices" });
});

export default auth;
