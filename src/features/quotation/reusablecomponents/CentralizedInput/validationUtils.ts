const validateInput = (value: any, rules?: any, isFocused?: boolean): string => {
  let errorMessage = "";

  if (!rules) return errorMessage;

  if (!rules.required && !value) {
    return errorMessage;
  }

  return errorMessage;
};

export default validateInput;
