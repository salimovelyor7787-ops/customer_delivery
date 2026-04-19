import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Uzbek copy uses ASCII apostrophe (o'chirish, qo'shish). `&apos;` in JSX text is fine but
      // must not appear inside JS string literals (renders literally). Allow `'` in JSX children.
      "react/no-unescaped-entities": ["error", { forbid: [">", "}", "\""] }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
