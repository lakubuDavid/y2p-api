export interface Success<T> {
  data: T;
  error?: never;
}
export interface Failure<E> {
  error: E;
  data?: never;
}
export type Result<T, E = ManagedError> = Success<T> | Failure<E>;

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
export const Fail = (message: string, code?: ErrorCodes) => {
  return {
    error: new ManagedError(message, code ?? ErrorCodes.UNKNOWN),
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
  UNKNOWN,
  VALIDATION_ERROR,
  INVALID_ARGUMENT,
  RECORD_ALREADY_EXISTS,
  USER_ALREADY_EXISTS,
  MISSING_AUTORIZATION,
  NOT_AUTHENTICATED,
  NOT_FOUND,
  INVALID_TOKEN,
  EMAIL_SENDING_FAILED,
  USER_NOT_FOUND,
  SERVER_MISCONFIGURATION,
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
      return 401; // Unauthorized
    case ErrorCodes.NOT_AUTHENTICATED:
      return 403; // Forbidden
    case ErrorCodes.EMAIL_SENDING_FAILED:
    case ErrorCodes.SERVER_MISCONFIGURATION:
    default:
      return 500; // Default to 500 for any unhandled cases
  }
};
