const isConsoleEnabled = import.meta.env.VITE_ENABLE_CONSOLE === "true  ";

export const logger = {
  // Call the native console object instead of logger to avoid recursion
  log: (...args: unknown[]) => {
    if (isConsoleEnabled) console.log(...args);
  },

  error: (...args: unknown[]) => {
    if (isConsoleEnabled) console.error(...args);
  },

  warn: (...args: unknown[]) => {
    if (isConsoleEnabled) console.warn(...args);
  },

  info: (...args: unknown[]) => {
    if (isConsoleEnabled) console.info(...args);
  },
};