import { LibsqlError } from "@libsql/client";
import { Resend } from "resend";
import { ZodError } from "zod";

export interface Success<T> {
  data: T;
  error?: never;
}
export interface Failure<E> {
  error: E;
  data?: never;
  rawError?: Error
}
export type Result<T, E = ManagedError> = Success<T> | Failure<E>;
export type AsyncResult<T, E = ManagedError> = Promise<Result<T,E>>;
export const Ok = <T,>(data: T): Result<T> => {
  return { data };
};
// export const Fail = <E extends Error>(error: E): Result<unknown, E> => {
//   if(error instanceof CodedError){
//     return {error}
//   }
//   else{
//     return {error:{...error,code:ErrorCodes.UNKNOWN}}
//   }
// };
export const Fail = (message: string, code?: ErrorCodes,rawError?:Error) => {
  return {
    error: new ManagedError(message, code ?? ErrorCodes.UNKNOWN),
    rawError
  };
};
export const Failed = (error: ManagedError) => {
  return { error };
};

export class ManagedError extends Error {
  constructor(
    public message: string,
    public code: ErrorCodes,
  ) {
    super(message);
  }
}

export enum ErrorCodes {
  UNKNOWN = "unknown",
  VALIDATION_ERROR = "validation_error",
  INVALID_ARGUMENT = "invalid_argument",
  INVALID_OPERATION = "invalid_operation",
  RECORD_ALREADY_EXISTS = "record_already_exists",
  USER_ALREADY_EXISTS = "user_already_exists",
  MISSING_AUTORIZATION = "missing_autorization",
  NOT_AUTHENTICATED = "not_authenticated",
  NOT_FOUND = "not_found",
  INVALID_TOKEN = "invalid_token",
  EMAIL_SENDING_FAILED = "email_sending_failed",
  USER_NOT_FOUND = "user_not_found",
  SERVER_MISCONFIGURATION = "server_misconfiguration",
  DATABASE_ERROR = "database_error",
  AUTHENTICATION_FAILED = "authentication_failed",
}

export const MatchHTTPCode = (code: ErrorCodes) => {
  switch (code) {
    case ErrorCodes.UNKNOWN:
      return 500; // Internal Server Error
    case ErrorCodes.VALIDATION_ERROR:
    case ErrorCodes.INVALID_ARGUMENT:
    case ErrorCodes.INVALID_TOKEN:
      return 400; // Bad Request
    case ErrorCodes.NOT_FOUND:
    case ErrorCodes.USER_NOT_FOUND:
      return 404; // Not found
    case ErrorCodes.RECORD_ALREADY_EXISTS:
      return 409; // Conflict
    case ErrorCodes.USER_ALREADY_EXISTS:
      return 409; // Conflict
    case ErrorCodes.MISSING_AUTORIZATION:
    case ErrorCodes.AUTHENTICATION_FAILED:
      return 401; // Unauthorized
    case ErrorCodes.NOT_AUTHENTICATED:
    case ErrorCodes.INVALID_OPERATION:
      return 403; // Forbidden
    case ErrorCodes.EMAIL_SENDING_FAILED:
    case ErrorCodes.DATABASE_ERROR:
    case ErrorCodes.SERVER_MISCONFIGURATION:
    default:
      return 500; // Default to 500 for any unhandled cases
  }
};

export const MatchErrorCode = (err : Error)=>{
  if(err instanceof LibsqlError){
    return ErrorCodes.DATABASE_ERROR
  }
  if(err instanceof ZodError){
    return ErrorCodes.VALIDATION_ERROR
  }
  if(err instanceof ManagedError){
    return err.code
  }
  return ErrorCodes.UNKNOWN
}
