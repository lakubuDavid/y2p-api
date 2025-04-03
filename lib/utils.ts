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
