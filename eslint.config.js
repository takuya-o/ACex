// eslint.config.js
import recommendedConfig from '@aarongoldenthal/eslint-config-standard/recommended-esm.js';

// create by npx elint --init
import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  {files: ["**/*.{js,mjs,cjs,ts}"]},
  {languageOptions: { globals: {...globals.browser, ...globals.node} }},
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  // add
  {
    ignores: ['.vscode/**', 'archive/**', 'node_modules/**', 'coverage/**', '**/*{.,-}min.js', 'src/**/*.js', 'src/lib/**', '.npm/**', 'asset/**', 'sample/**', 'bak/**'],
    name: 'ignores'
  },
  ...recommendedConfig,
  {
    rules: {
      // 命名規則 https://typescript-eslint.io/rules/naming-convention
      "@typescript-eslint/naming-convention": [
        "error",
        { // classやtypeなどは頭大文
          "format": ["PascalCase"],
          "selector": "typeLike",
        },
        { // 変数名はキャメルケース
          "format": ["camelCase"],
          "selector": "variable",
        }
      ],
      // 変数!禁止 https://typescript-eslint.io/rules/no-non-null-assertion
      //"@typescript-eslint/no-non-null-assertion": "off",
      // 未使用の変数や関数は宣言禁止、ただし大文字で始まっているものはクラスなので許す
      // https://typescript-eslint.io/rules/no-unused-vars/
      "@typescript-eslint/no-unused-vars": ["error", {
        "argsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_",
        "varsIgnorePattern": "^[A-Z]",
      }],
      // メンバーの順序 https://typescript-eslint.io/rules/member-ordering
      //"@typescript-eslint/member-ordering": "warn",
      // コメントの先頭が大文字から
      "capitalized-comments": ["off", "always", {
        "ignoreConsecutiveComments": true,
        "ignoreInlineComments": true,
      }],
      //"complexity": ["error", { "max": 5 }], //GitLab5
      "max-lines": ["warn", { "max": 300 }], //GitLab250
      "max-lines-per-function": ["warn", { "max": 50 }], //GitLab25
      "no-console": "off",
      "no-duplicate-imports": ["error", { "includeExports": true }],
      //"no-octal-escape": "off", //Workaround RangeError: Maximum call stack size exceeded
      "no-unused-vars": ["error", {
        "argsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_",
        "varsIgnorePattern": "^[A-Z]",
      }],
      "sort-imports": ["warn"],
    }
  }
];
