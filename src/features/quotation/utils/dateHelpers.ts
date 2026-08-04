export const formatDate = (value: string | Date | null | undefined): string => {
  if (!value) return "";

  try {
    const date = new Date(value);

    if (isNaN(date.getTime())) {
      return "";
    }

    return date.toISOString().split("T")[0]; // YYYY-MM-DD
  } catch {
    return "";
  }
};