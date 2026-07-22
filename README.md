# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactDom from "eslint-plugin-react-dom";
import reactX from "eslint-plugin-react-x";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs["recommended-typescript"],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

# Frontend Testing Quick Guide (React + Vitest)

---

## 1. Test File (.test.tsx)

```
### File Location
Keep test file in the same folder as the component.

### Example
ManagePage.tsx
ManagePage.test.tsx
```

---

## 2. Basic Test Example

```js
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("ManagePage", () => {
  it("renders page", () => {
    render(<ManagePage />);
    expect(screen.getByText("Manage End User")).toBeInTheDocument();
  });
});
```

---

## 3. Click Test Example

```js
it("switch tab", () => {
  render(<ManagePage />);

  fireEvent.click(screen.getByText("Products"));

  expect(screen.getByText("Allocated Products Table")).toBeInTheDocument();
});
```

---

## 4. Run Tests (CLI)

```js
Run all tests:
npm run test

Run Vitest directly:
npx vitest
```

---

## 5. Visual UI Mode (Test Dashboard)

```js
Open UI in browser:
npx vitest --ui

What you see:
- Browser opens test dashboard
- All test files listed
- Click test to view results
- Pass/fail status
- Execution details
```

---

## 7. Rules

```js
- One test = one behavior
- File name must be ComponentName.test.tsx
- Always use render() first
- Then perform action (click/type)
- Then assert using expect()
```
