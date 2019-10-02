module.exports = {
  globals: {
    "ts-jest": {
      "tsConfig": "tsconfig.json"
    }
  },
  moduleFileExtensions: [
    "ts",
    "tsx",
    "js"
  ],
  testMatch: [
    "**/tests/**/*.spec.ts"
  ],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
  moduleNameMapper: {
    "^@/(.+)": "<rootDir>/src/$1"
  }
}
