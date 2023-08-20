
/////////////////////////////////////////////////////////////////////////////////////////////////
///
///  88        88  88888888888  88           88888888ba  888888888888  8b        d8  888888888888
///  88        88  88           88           88      "8b      88        Y8,    ,8P        88
///  88        88  88           88           88      ,8P      88         `8b  d8'         88
///  88aaaaaaaa88  88aaaaa      88           88aaaaaa8P'      88           Y88P           88
///  88""""""""88  88"""""      88           88""""""'        88           d88b           88
///  88        88  88           88           88               88         ,8P  Y8,         88
///  88        88  88           88           88               88        d8'    `8b        88
///  88        88  88888888888  88888888888  88               88       8P        Y8       88
///

import { watermark } from "./watermark";
import { relative } from "path";
/////////////////////////////////////////////////////////////////////////////////////////////////
export function prependHeader({
    sourcePath,
    generated,
  }: {
    sourcePath: string;
    generated: string;
  }) {
    return {
      sourcePath,
      generated: `${watermark}
  # Do not edit this file directly - This file was generated automatically by Hotenv.
  # To change these, edit "_PUBLIC_"-prefixed variables in ${relative(
        process.cwd(),
        sourcePath
      )}.
  # Variables prefixed with _PUBLIC_ will be inlined in both the native AND web bundles.
  # Secrets (without "_PUBLIC_") will only be available to the Next.js server and to Expo at build-time.
  # Secrets will not be available to native clients at runtime.\n
  ${generated}`.trim(),
    };
  }
  
  export function getDescription(cmd: "generate" | "config" | "hotenv") {
    switch (cmd) {
      case "generate":
        return (
          "Generates .env* files from .env*.local files, replacing `_PUBLIC_`-prefixed variables with 3 copies: " +
          "one prefixed with `NEXT_PUBLIC`, one with `EXPO_PUBLIC`, and one with just `PUBLIC`.\n\n" +
          "Variables that do not START with `_PUBLIC_` are copied as-is;" +
          "use NEXT_PUBLIC_ to make variables available to web clients only, " +
          "and EXPO_PUBLIC_ to make variables available to native clients only.\n\n" +
          "If the output file already exists, one of the following will happen:\n\n" +
          "\t- If the file was previously generated by Hotenv, it is overwritten.\n" +
          "\t- Otherwise, if the `--backup` flag is set, the file is appended with the supplied suffix" +
          "(default: `.bak`).\n" +
          "\t- Otherwise, if the `--force` flag is set, the file is overwritten.\n" +
          "\t- If none of the above, hotenv perform a dry-run and print the output to stdout then exit with code 1.\n\n"
        );
      case "config":
        return (
          "Configures the platform-specific environment for your project.\n\n" +
          "In your project-specific `package.json`, update your scripts to use `node hotenv config`, e.g.\n\n" +
          "   (for Expo)\n" +
          '   "build": "node hotenv config --target web --env production eas build --platform all",\n' +
          '   "dev:ios": "node hotenv config --target native --env development pnpm start ios",\n\n' +
          "   (for Next.js)\n" +
          '   "start": "node hotenv config --target web --env production next start",\n' +
          '   "dev": "node hotenv config --target web --env development next dev",\n\n' +
          "You can also use shorthand flags:\n\n" +
          '   "dev": "node hotenv config -wd next dev",\n\n' +
          "Hotenv will set the appropriate values for NODE_ENV and TAMAGUI_TARGET, " +
          "and set an equivilent `PUBLIC_` variable on process.env for each set of `*_PUBLIC` variables in your .env files.\n" +
          "Now, you can implement `t3-env` once for the entire monorepo:\n\n" +
          "// ./env/t3.mjs\n" +
          "import { createEnv } from '@t3-oss/env-core';\n\n" +
          "export default createEnv({\n" +
          "   // NOTE: You can make secrets available during the eas build process by uncommenting the second test.\n" +
          "   // Secrets will be stripped form the bundle, BUT BE AWARE: " +
          "   // they CAN be accessed via defineConfig in app.config.(js|ts)... YOU SHOULD NOT DO THIS!\n" +
          '   isServer: () => process.env.TAMAGUI_TARGET === "web" && typeof window === "undefined" /* || process.env.EAS_BUILD === "true" */,\n' +
          '   clientPrefix: "PUBLIC_",\n' +
          "   server: {\n" +
          "     CLERK_SECRET_KEY: z.string().min(1)\n" +
          "   },\n" +
          "   client: {\n" +
          "     PUBLIC_GA_TRACKING_ID: z.string().min(1)\n" +
          "     PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1)\n" +
          "   },\n" +
          "   runtimeEnv: {\n" +
          "     CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY, // secrets are not prefixed, as usual\n" +
          "     PUBLIC_GA_TRACKING_ID: process.env.PUBLIC_GA_TRACKING_ID, // no need to prefix with NEXT_ or EXPO_\n" +
          "     PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.PUBLIC_CLERK_PUBLISHABLE_KEY, // every character counts!\n" +
          "   },\n\n"
        );
      case "hotenv":
        return (
          "Hotenv ❤️ t3-env\n\n" +
          "Wouldn't it be nice if maintaining `.env` files in a monorepo was as easy as it is in a single project? " +
          "This env tool is tailor made for Tamagui monorepos to bring back the good 'ol days of .env simplicity.\n\n" +
          "Manage your variables in one directory (by default, `./env`) using `.env*.local` files. " +
          "Just prefix any variables that should be made available to clients with `_PUBLIC_`." +
          "Then, add the following scripts:\n\n" +
          `   (in the workspace root package.json)\n` +
          '   "hotenv": "hotenv generate",\n\n' +
          `   (in your Nextjs App's package.json)\n` +
          '   "hotenv": "node hotenv config --target web",\n\n' +
          `   (in your Expo App's package.json)\n` +
          '   "hotenv": "node hotenv config --target native",\n\n' +
          "Now add the following to your `turbo.json` pipeline:\n\n" +
          '   "//#hotenv": { "cache": false },\n\n' +
          '   "hotenv": { "cache": false, dependsOn: ["//#hotenv", "^hotenv"] },\n\n' +
          'Now, you can add `"env"` as a dependency to any stage in your `turbo.json` pipeline that has an env script, ' +
          "and you'll know you always have the right environment for the job.\n\n" +
          "By default, Hotenv reads the NODE_ENV and TAMAGUI_TARGET environment variables." +
          "This simplifies adoption in existing Tamagui projects since the docs recommend setting these variables " +
          "in the `package.json` scripts (i.e. `NODE_ENV=production TAMAGUI_TARGET=web pnpm build`.\n\n" +
          "However, for maximum deduplication and transparency, combine `hotenv generate` with `node hotenv config`. " +
          "This will allow you to use a single `_PUBLIC_` prefix for client variables everywhere in the monorepo."
        );
    }
  }
  

//@ts-expect-error - Vite handles this import.meta check
if (import.meta.vitest) {
  const [
    { describe }
    //@ts-expect-error - Vite handles this top-level await
  ] = await Promise.all([import("vitest")]);

  describe.skip("helptexg", () => {
  });

}
