import {createOption} from "@commander-js/extra-typings"
///////////////////////////////////////////////////////////
///
///    ,ad8888ba,    88888888ba  888888888888   ad88888ba
///   d8"'    `"8b   88      "8b      88       d8"     "8b
///  d8'        `8b  88      ,8P      88       Y8,
///  88          88  88aaaaaa8P'      88       `Y8aaaaa,
///  88          88  88""""""'        88         `"""""8b,
///  Y8,        ,8P  88               88               `8b
///   Y8a.    .a8P   88               88       Y8a     a8P
///    `"Y8888Y"'    88               88        "Y88888P"
///
///////////////////////////////////////////////////////////

export const verbose = createOption(
    "-v, --verbose",
    "Show verbose error outputs from Tamagui",
  ).default(true);
  
  export const dryRun = createOption(
    "-d, --dry-run",
    "Show what would be generated without actually generating anything",
  ).default(false);
  
  export const backup = createOption(
    "-b, --backup [extension]",
    "Backup files that would be overwritten with the given extension",
  )
    .preset(".bak")
    .default(false as const)
    .conflicts("force");
  
  export const force = createOption(
    "-f, --force",
    "When a collision occurs with a file not generated by hotenv, overwrite it instead of failing",
  )
    .default(false)
    .conflicts("backup");
  
  export const isWeb = createOption("-w, --web", "Equivalent to --platform web")
    .implies({ platform: "web" })
    .default(false)
    .conflicts("native");
  
  export const isNative = createOption("-n, --native", "Equivalent to --platform native")
    .implies({
      platform: "native",
    })
    .default(false)
    .conflicts("web");
  
  export const isDev = createOption("--dev", "Equivalent to --env development")
    .implies({
      env: "development",
    })
    .default(true)
    .conflicts(["prod", "test"]);
  
  export const isProd = createOption("--prod", "Equivalent to --env production")
    .implies({
      env: "production",
    })
    .default(false)
    .conflicts(["dev", "test"]);
  
  export const isTest = createOption("--test", "Equivalent to --env test")
    .implies({
      env: "test",
    })
    .default(false)
    .conflicts(["dev", "prod"]);
  
  export const platform = createOption(
    "-p, --platform <platform>",
    "Target platform - either 'web' or 'native'",
  )
    .env("TAMAGUI_TARGET")
    .choices(["web", "native"] as const)
    .makeOptionMandatory();
  
  export const env = createOption(
    "-e, --env <env>",
    "Sets the NODE_ENV environment variable manually",
  )
    .env("NODE_ENV")
    .choices(["development", "production", "test"] as const)
    .default("development" as const)
    .makeOptionMandatory();
  