export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Custom rules for the project
    "type-enum": [
      2,
      "always",
      [
        "feat", // New feature
        "fix", // Bug fix
        "docs", // Documentation
        "style", // Code style changes
        "refactor", // Code refactoring
        "perf", // Performance improvements
        "test", // Tests
        "chore", // Maintenance tasks
        "ci", // CI/CD changes
        "build", // Build system changes
        "revert", // Revert previous commit
      ],
    ],
    "subject-case": [2, "always", "sentence-case"],
    "subject-max-length": [2, "always", 100],
    "body-max-line-length": [2, "always", 200],
  },
};
