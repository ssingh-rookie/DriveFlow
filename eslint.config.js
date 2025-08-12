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
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "unused-imports/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "ts/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],

    // Allow any type in some cases
    "@typescript-eslint/no-explicit-any": "warn",
    "ts/no-explicit-any": "warn",

    // Allow non-null assertions
    "@typescript-eslint/no-non-null-assertion": "warn",
    "ts/no-non-null-assertion": "warn",

    // Relax some strict rules for development
    "ts/no-unused-expressions": "warn",
    "node/prefer-global/process": "off",
    "import/no-duplicates": "warn",
    "ts/no-require-imports": "warn",
    "no-restricted-globals": "warn",
    "jsdoc/check-param-names": "off",
    "ts/consistent-type-imports": "warn",
    "perfectionist/sort-imports": "warn",
    "perfectionist/sort-named-imports": "warn",
  },
});
