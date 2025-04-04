import { createMiddleware } from "hono/factory";
import { StatusCode } from "hono/utils/http-status";
import { ErrorCodes, ManagedError } from "../../lib/error";
import { ZodError } from "zod";

interface PossiblyFormattedResponse {
  data?: any;
  error?: ManagedError | Error | any;
  status?: string;
  message?: string;
  code?: ErrorCodes;
}

export const responseFormatter = createMiddleware(async (c, next) => {
  await next();
  try {
    const cloned_res = c.res.clone()
    const data = await cloned_res.json();
    // console.log(data)
    const previousResponse = data as PossiblyFormattedResponse;
    let newResponse: PossiblyFormattedResponse = previousResponse;
    if (c.res.ok) {
      if (!previousResponse.data) {
        newResponse.data = previousResponse;
      }
    } else {
      if (!previousResponse.error) {
        newResponse = { ...previousResponse, error: c.res.statusText };
      } else {
        // console.log(previousResponse)
        if (previousResponse.error instanceof ManagedError)
          newResponse.code = newResponse.code ?? previousResponse.error.code;
        if(previousResponse.error instanceof ZodError){
          newResponse.code = newResponse.code ?? ErrorCodes.VALIDATION_ERROR;
          
        }
        newResponse.message =
          newResponse.message ?? previousResponse.error.message;
      }
    }
    newResponse.status = c.res.ok ? "ok" : "error";
    // console.log(newResponse);
    // return c.json(newResponse, c.res.status as StatusCode);
    c.res = Response.json(newResponse,{status:cloned_res.status});
  } catch (err) {}
});
