export default {
  transform: {
    "^.+\\.js$": [
      "babel-jest",
      {
        plugins: [
          [
            "@babel/plugin-transform-modules-commonjs",
            { allowTopLevelThis: true },
          ],
        ],
      },
    ],
  },
  testEnvironment: "node",
  collectCoverageFrom: ["src/**/*.js", "!src/**/*.test.js"],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  testPathIgnorePatterns: ["/node_modules/", "/.history/"],
  transformIgnorePatterns: [
    "node_modules/(?!((inquirer|open|fs/promises|path|@inquirer|chalk|chalk-template|figures|strip-ansi)|.*\\.mjs$))",
  ],
  moduleFileExtensions: ["js", "mjs"],
  testEnvironmentOptions: {
    url: "http://localhost",
  },
};
