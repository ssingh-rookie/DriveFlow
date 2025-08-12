import antfu from "@antfu/eslint-config";

export default antfu({
  // TypeScript support (excluding React to avoid conflicts)
  typescript: true,

  // Ignore patterns
  ignores: [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/.next/**",
    "**/coverage/**",
    "**/public/**",
    "**/*.d.ts",
    "**/pnpm-lock.yaml",
    "**/package-lock.json",
    "**/yarn.lock",
    "apps/web/**", // Let Next.js handle its own ESLint config
  ],

  // Project-specific rules
  rules: {
    // Allow console logs in development
    "no-console": "warn",

    // Allow unused vars with underscore prefix
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],

    // Allow any type in some cases
    "@typescript-eslint/no-explicit-any": "warn",

    // Allow non-null assertions
    "@typescript-eslint/no-non-null-assertion": "warn",
  },
});
