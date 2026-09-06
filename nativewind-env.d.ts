/// <reference types="nativewind/types" />

/**
 * `import '../global.css'` is how Metro is told to compile the Tailwind
 * entrypoint; nothing consumes the module's value. TypeScript has no CSS
 * loader, so without this declaration the side-effect import is an error.
 */
declare module '*.css' {}
