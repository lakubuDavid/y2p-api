import { Context } from "hono";
import { AppContext } from "../src/types";
import moment from 'moment-timezone';
export const sameDay = (a: Date, b: Date): boolean => {
  const normalize = (date: Date) => {
    return Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    );
  };

  return normalize(a) === normalize(b);
};

export const normalizeDate = (date: Date) => {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};
export const normalizedDate = (date: Date) => {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
};
export const today = () => {
  return normalizedDate(new Date());
};

export const getClientTimeZone = (c:AppContext)=>{
  return c.req.raw.cf?.timezone as string  ?? "Indian/Mauritius"
}
export const getClientTimeZoneOffset = (c:AppContext)=>{
  return moment.tz(getClientTimeZone(c)).utcOffset()
}

export const clientServerTzOffset = (c:Context)=>{
  const clientTzOffset = getClientTimeZoneOffset(c)
  const serverTzOffset = new Date().getTimezoneOffset()
  return clientTzOffset - serverTzOffset
}
