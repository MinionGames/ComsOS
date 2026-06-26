import nextVitals from "eslint-config-next/core-web-vitals";
import eslintConfigPrettier from "eslint-config-prettier";

const config = [
  {
    ignores: [".next/**", "coverage/**", "node_modules/**"],
  },
  ...nextVitals,
  eslintConfigPrettier,
  {
    rules: {
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "react/no-unescaped-entities": "off",
    },
  },
];

export default config;
