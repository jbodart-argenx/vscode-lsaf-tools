import globals from "globals";

export default [{
    files: ["**/*.js"],
    ignores: [
        ".vscode-test/**",
        ".vscode-test-web/**",
        "dist/**",
    ],
    languageOptions: {
        globals: {
            ...globals.commonjs,
            ...globals.node,
            ...globals.mocha,
        },

        ecmaVersion: 2022,
        sourceType: "module",
    },

    rules: {
        "no-const-assign": "warn",
        "no-this-before-super": "warn",
        "no-undef": "warn",
        "no-unreachable": "warn",
        "no-unused-vars": "warn",
        "constructor-super": "warn",
        "valid-typeof": "warn",
    }
},
{
    files: [
        "test/jest/*.js",
        "test/jest-mocks/*.js"
    ],
    env: {
        jest: true
    }
},
];