import { createMiddleware } from 'hono/factory'
import { jwt } from "hono/jwt";
import { env } from "hono/adapter";

export const authenticatedOnly = createMiddleware(async (c,next)=>{
  
  const jwtMiddleware = jwt({
    //@ts-ignore
    secret: env<Bindings>(c).JWT_SECRET,
    cookie: {
      key: "__token",
      // secret: "secret",
    },
  });
  return jwtMiddleware(c, next);
})
