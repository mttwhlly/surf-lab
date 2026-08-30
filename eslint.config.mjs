import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// "next/typescript" isn't available in eslint-config-next@14.0.0 (it was added in a
// later release than the Next.js version this project is pinned to) — referencing it
// here made every `next lint` / `eslint` invocation crash instead of just skipping
// TypeScript-specific lint rules. Type safety is still covered by `pnpm type-check`.
const eslintConfig = [
  ...compat.extends("next/core-web-vitals"),
];

export default eslintConfig;
