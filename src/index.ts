// * AVOID DEFAULT IMPORTS AND EXPORTS
import {
  existsSync,
  copyFileSync,
  writeFileSync,
  readFileSync,
  readdirSync
} from "fs";
import { relative, resolve, join } from "path";
import { spawnSync } from "child_process";
import { program, createArgument } from "@commander-js/extra-typings";
import { watermark } from "./watermark";
import {
  backup,
  dryRun,
  force,
  env,
  isDev,
  isNative,
  isProd,
  isTest,
  isWeb,
  platform,
  verbose
} from "./options";
import { getDescription, prependHeader } from "./helptext";
import { beforeEach, test } from "vitest";

////////////////////////////////////////////////////////////
///
///  88888888ba   88888888ba     ,ad8888ba,      ,ad8888ba,
///  88      "8b  88      "8b   d8"'    `"8b    d8"'    `"8b
///  88      ,8P  88      ,8P  d8'        `8b  d8'
///  88aaaaaa8P'  88aaaaaa8P'  88          88  88
///  88""""""'    88""""88'    88          88  88      88888
///  88           88    `8b    Y8,        ,8P  Y8,        88
///  88           88     `8b    Y8a.    .a8P    Y8a.    .a88
///  88           88      `8b    `"Y8888Y"'      `"Y88888P"
///
////////////////////////////////////////////////////////////
const hotenv = program
  .showHelpAfterError("(add --help for additional information)")
  .usage("hotenv <command> [options] -- [arguments]")
  .description(getDescription("hotenv"));

const commands = {
  generate: hotenv
    .createCommand("generate")
    .usage("hotenv generate [options] -- [searchDirs...]")
    .description(getDescription("generate"))
    .addHelpText(
      "after",
      `
    Examples:
      $ hotenv generate (defaults to ./env)
      $ hotenv generate ./env1 ./env2 ./env3 (operate on multiple directories or change the default)
    `
    ),
  config: hotenv
    .createCommand("config")
    .usage("node hotenv config <options> -- <commands...>")
    .description(getDescription("config"))
    .addHelpText(
      "after",
      `
    Examples:
      $ node hotenv config --platform web --env development -- next dev (or node hotenv config -w -d -- next dev)
      $ node hotenv config --platform native --env production -- expo build:all (or node hotenv config -n -p -- expo build:all)
      $ node hotenv config --platform native --env test -- jest (or node hotenv config -n -t -- jest)
  `
    )
};

const args = {
  searchDirs: createArgument(
    "[searchDirs...]",
    "Dir(s) to search for .env files, relative to the caller's working directory"
  ).default(`./env`),
  commands: createArgument(
    "<commands...>",
    "Command to run using the generated environment"
  )
    .argRequired()
    .argParser((val: string) => val.split(" "))
};

/////////////////////////////////////////////////////////////////
///
///    ,ad8888ba,   88b           d88  88888888ba,     ad88888ba
///   d8"'    `"8b  888b         d888  88      `"8b   d8"     "8b
///  d8'            88`8b       d8'88  88        `8b  Y8,
///  88             88 `8b     d8' 88  88         88  `Y8aaaaa,
///  88             88  `8b   d8'  88  88         88    `"""""8b,
///  Y8,            88   `8b d8'   88  88         8P          `8b
///   Y8a.    .a8P  88    `888'    88  88      .a8P   Y8a     a8P
///    `"Y8888Y"'   88     `8'     88  88888888Y"'     "Y88888P"
///
/////////////////////////////////////////////////////////////////

const generate = commands.generate
  .addArgument(args.searchDirs)
  .addOption(dryRun)
  .addOption(backup)
  .addOption(force)
  .action((dirOrDirs, opts) => {
    const actions = [dirOrDirs]
      .flat()
      .map(readDotEnvs)
      .reduce(makeCallBackQueueReducer(opts), [] as Array<() => void>);

    if (actions.every(isNoop)) {
      console.error("No .env*.local files found");
      process.exit(1);
    }

    actions.forEach(action => {
      try {
        action();
      } catch (e) {
        console.error(e);
        process.exit(1);
      }
    });

    if (dryRun) console.log("Dry run, no changes made");
    process.exit(0);
  });

const config = commands.config
  .addArgument(args.commands)
  .addOption(verbose)
  .addOption(isWeb)
  .addOption(isNative)
  .addOption(isDev)
  .addOption(isProd)
  .addOption(isTest)
  .addOption(platform)
  .addOption(env)
  .action(async ([cmd, ...args], { platform, env, verbose }) => {
    if (!cmd) {
      console.error("No command specified");
      process.exit(1);
    }

    const child = spawnSync(cmd, args, {
      env: Object.assign({}, process.env, {
        TAMAGUI_TARGET: platform,
        NODE_ENV: env,
        DISABLE_WARN_DYNAMIC_LOAD: verbose ? "0" : "1",
        SHOW_FULL_BUNDLE_ERRORS: verbose ? "1" : "0",
        DISABLE_EXTRACTION: env === "production" ? "0" : "1"
      }),
      stdio: "inherit",
      cwd: process.cwd()
    });

    process.exit(child.status ?? 1);
  });

export const cli = hotenv.addCommand(generate).addCommand(config);

////////////////////////////////////////////////////////////////////////
///
///  88888888888  88        88  888b      88    ,ad8888ba,    ad88888ba
///  88           88        88  8888b     88   d8"'    `"8b  d8"     "8b
///  88           88        88  88 `8b    88  d8'            Y8,F()
///  88aaaaa      88        88  88  `8b   88  88             `Y8aaaaa,
///  88"""""      88        88  88   `8b  88  88               `"""""8b,
///  88           88        88  88    `8b 88  Y8,                    `8b
///  88           Y8a.    .a8P  88     `8888   Y8a.    .a8P  Y8a     a8P
///  88            `"Y8888Y"'   88      `888    `"Y8888Y"'    "Y88888P"
///
////////////////////////////////////////////////////////////////////////

type Fn = () => void;

const isNoop = (fn: Fn): fn is Fn & { hasEffect: never } =>
  !("hasEffect" in fn && fn.hasEffect);
const isFatal = (fn: Fn): fn is Fn & { isFatal: true } =>
  !!("isFatal" in fn && fn.isFatal);

function generateEnv(args: { sourcePath: string; contents: string }) {
  const generated = transformContents(args);
  const prefixed = prependHeader(generated);
  return {
    ...prefixed,
    destinationPath: args.sourcePath.replace(/\.env(.*).local$/, ".env$1")
  };
}

function isPublic(key?: string) {
  const prefixes = ["NEXT_PUBLIC_", "EXPO_PUBLIC_", "_PUBLIC_"];

  return prefixes.some(prefix => key?.trim().startsWith(prefix));
}

function transformContents(args: { sourcePath: string; contents: string }) {
  const generated = args.contents
    .split("\n")
    .filter(isPublic)
    .flatMap((line: string, lineNum: number, lines: string[]) => {
      const [key, rest] = line
        .replace(/#.*/, "")
        .trim()
        .split("=")
        .reduce(
          ([key, rest], cur, i) =>
            i === 0 ? [cur, ""] : [key, `${rest}=${cur}`],
          ["", ""]
        );

      /* Only public variables are output in the generated file so the generated files are safe for version control. */
      /* By convention, env*.local files should NEVER be committed to version control */
      return isPublic(key) && key.startsWith("_")
        ? [`NEXT${key}${rest}`, "\n", `EXPO${key}${rest}`, "\n"]
        : [`${key}${rest}`, "\n"];
    })
    .join("");

  return { ...args, generated };
}

function readDotEnvs(relativeDir: string) {
  const absoluteDir = resolve(process.cwd(), relativeDir);
  const files = readdirSync(absoluteDir)
    .filter(name => /^\.env.*\.local$/i.test(name))
    .map(name => {
      const sourcePath = join(absoluteDir, name);

      return {
        sourcePath,
        contents: readFileSync(sourcePath, "utf8")
      };
    });

  return { relativeDir, files };
}

function makeCallBackQueueReducer(opts: {
  dryRun: boolean;
  backup: string | false;
  force: boolean;
}) {
  const { dryRun, backup, force } = opts;
  return (
    actions: (() => void)[],
    current: {
      relativeDir: string;
      files: {
        sourcePath: string;
        contents: string;
      }[];
    }
  ) => {
    actions.push(() =>
      console.log(
        current.files.length
          ? `${current.relativeDir}: Found ${current.files.length} .env*.local file(s)`
          : `${current.relativeDir}: No .env*.local files found`
      )
    );

    current.files.forEach(item => {
      const { destinationPath, generated, sourcePath } = generateEnv(item);
      const backupPath = `${destinationPath}${backup}`;
      const exists = existsSync(destinationPath);
      const relativeDestination = relative(process.cwd(), destinationPath);
      const relativeSource = relative(process.cwd(), sourcePath);
      const relativeBackup = relative(process.cwd(), backupPath);

      const reportGenerated = () =>
        console.log(
          `${current.relativeDir}:  📦 Generated ${relativeDestination} from ${relativeSource}`
        );
      const reportExisting = () =>
        console.log(
          `${current.relativeDir}:  ⛔️ ${relativeDestination} already exists`
        );
      const reportPrevious = () =>
        console.log(
          `${current.relativeDir}:  ✅ ${relativeDestination} was previously generated by hotenv`
        );
      const reportBackup = () =>
        console.log(
          `${current.relativeDir}:  📦 Backing up ${relativeDestination} to ${relativeBackup}...`
        );
      const reportOverWrite = () =>
        console.log(
          `${current.relativeDir}:  🧨 Overwriting ${relativeDestination}...`
        );
      const reportFailed = () =>
        console.log(
          `${current.relativeDir}:  ❌ ${relativeDestination} already exists, use --force to overwrite or --backup to backup`
        );
      const reportWrite = () =>
        console.log(
          `${current.relativeDir}:  📦 Writing ${relativeDestination} with platform-specific public variables...`
        );
      const doBackup = () =>
        dryRun ? void 0 : copyFileSync(destinationPath, backupPath);
      const doWrite = () =>
        dryRun ? void 0 : writeFileSync(destinationPath, generated);

      reportFailed.isFatal = true;
      doBackup.hasEffect = true;
      doWrite.hasEffect = true;

      actions.push(reportGenerated);

      if (exists) {
        const isGenerated = readFileSync(destinationPath, "utf-8").includes(
          watermark.trim()
        );

        actions.push(reportExisting);

        if (isGenerated) {
          actions.push(reportPrevious, doWrite);
        } else if (backup) {
          actions.push(reportBackup, doBackup, reportWrite, doWrite);
        } else if (force) {
          actions.push(reportOverWrite, doWrite);
        } else {
          actions.push(reportFailed);
        }
      } else {
        actions.push(reportWrite, doWrite);
      }
    });

    if (actions.some(isFatal)) {
      actions.filter(isNoop).forEach(action => action());
      process.exit(1);
    }
    return actions;
  };
}

///////////////////////////////////////////////////////////////////
///
///  888888888888  88888888888  ad88888ba  888888888888  ad88888ba
///       88       88          d8"     "8b      88      d8"     "8b
///       88       88          Y8,              88      Y8,
///       88       88aaaaa     `Y8aaaaa,        88      `Y8aaaaa,
///       88       88"""""       `"""""8b,      88        `"""""8b,
///       88       88                  `8b      88              `8b
///       88       88          Y8a     a8P      88      Y8a     a8P
///       88       88888888888  "Y88888P"       88       "Y88888P"
///
///////////////////////////////////////////////////////////////////

//@ts-expect-error - Vite handles this import.meta check
if (import.meta.vitest) {
  const [
    { describe, afterAll, beforeAll, it, expect, suite, vi },
    {
      existsSync,
      copyFileSync,
      writeFileSync,
      readFileSync,
      readdirSync,
      mkdtempSync,
      mkdirSync,
      rmSync
    },
    { join, resolve }
    //@ts-expect-error - Vite handles this top-level await
  ] = await Promise.all([import("vitest"), import("fs"), import("path")]);
  suite("hotenv helper functions", describe => {
    let testDir: string;
    let testEnvPaths: string[];
    let cwd: string;
    let consoleOutput: string[] = [];
    let originalConsole: Console;
    let originalProcess: typeof process;

    const mockedConsole = {
      log: (output: string) => consoleOutput.push(output),
      error: (output: string) => consoleOutput.push(output),
      warn: (output: string) => consoleOutput.push(output),
      info: (output: string) => consoleOutput.push(output),
      debug: (output: string) => consoleOutput.push(output),
      trace: (output: string) => consoleOutput.push(output),
      clear: () => (consoleOutput = []),
      getOutput: () => consoleOutput
    }

    const mockProcess = {
      cwd: () => cwd,
      chdir: (path: string) => cwd = path
    }

    beforeAll(() => {
      originalConsole = global.console;
      originalProcess = global.process;
      global.console = mockedConsole as any as Console
      global.process = mockProcess as any as typeof process

      testDir = mkdtempSync(resolve(__dirname, "tmp-"));
      process.chdir(testDir);

      testEnvPaths = [
        join(testDir, ".env.production.local"),
        join(testDir, ".env.development.local"),
        join(testDir, ".env.test.local"),
        join(testDir, ".env.local")
      ];

      testEnvPaths.forEach(path => writeFileSync(path, "TEST_ENV=123"));
    });

    afterAll(() => {
      console.clear();
      process.chdir(resolve(__dirname, ".."));
      rmSync(testDir, { recursive: true });
      
      global.console = originalConsole;
      global.process = originalProcess;
    });

    describe("readDotEnvs should only read .env*.local files in a directory", () => {
      const result = readDotEnvs(testDir);
      expect(result.files).toHaveLength(4);
      expect(testEnvPaths).toContain(result.files[0]?.sourcePath);
      expect(testEnvPaths).toContain(result.files[1]?.sourcePath);
      expect(testEnvPaths).toContain(result.files[2]?.sourcePath);
      expect(testEnvPaths).toContain(result.files[3]?.sourcePath);
      expect(
        testEnvPaths.every(path => {
          return (
            relative(testDir, path).startsWith(".env") &&
            relative(testDir, path).endsWith(".local")
          );
        })
      );
    });

    describe("readDotEnvs should return the relative directory", () => {
      const result = readDotEnvs(testDir);
      expect(result.relativeDir).toEqual(testDir);
    });

    describe("readDotEnvs should not throw if the directory does not exist", () => {
      expect(() => readDotEnvs("does-not-exist")).not.toThrow();

      const result = readDotEnvs("does-not-exist");
      expect(result.files).toHaveLength(0);
    });

    describe("transformContents should only output *_PUBLIC variables", () => {
      const result = transformContents({
        sourcePath: testEnvPaths[0]!,
        contents: `
        TEST_ENV=123
        _PUBLIC_TEST_ENV=123 # comments should
        NEXT_PUBLIC_TEST_CARRYOVER_ENV=123 # be stripped
        EXPO_PUBLIC_TEST_CARRYOVER_ENV=123
        NEXT_TEST_PRIVATE_ENV=123
        PUBLICKEY=123 # should be stripped
        `
      });
      expect(result.generated).toEqual(
        "NEXT_PUBLIC_TEST_ENV=123\n" +
          "EXPO_PUBLIC_TEST_ENV=123\n" +
          "NEXT_PUBLIC_TEST_CARRYOVER_ENV=123\n" +
          "EXPO_PUBLIC_TEST_CARRYOVER_ENV=123\n"
      );
    });

    describe("transformContents should not throw if the file does not exist", () => {
      expect(() =>
        transformContents({
          sourcePath: "does-not-exist",
          contents: "TEST_ENV=123"
        })
      ).not.toThrow();
    });

    describe("transformContents should not throw if the file is empty", () => {
      expect(() =>
        transformContents({
          sourcePath: testEnvPaths[0]!,
          contents: ""
        })
      ).not.toThrow();
    });

    describe("prependHeader should prepend the watermark to the top of the file", () => {
      const result = prependHeader(
        transformContents({
          sourcePath: testEnvPaths[0]!,
          contents: "NEXT_PUBLIC_TEST_ENV=123"
        })
      );

      const regex = new RegExp(`${watermark}\n.*NEXT_PUBLIC_TEST_ENV=123`, "s");
      expect(result.generated).toMatch(regex);
    });

    describe("makeCallBackQueueReducer should generate a callback queue with the correct actions", () => {
      const dryRun = false;
      const backup = ".backup";
      const force = false;
  
      const actions: (() => void)[] = [];
      const current = {
        relativeDir: "/path/to/dir",
        files: [
          {
            sourcePath: "/path/to/dir/.env.local",
            contents: "VAR1=value1\nVAR2=value2\nNEXT_PUBLIC_VAR3=value3\n",
          },
        ],
      };
  
      const reducer = makeCallBackQueueReducer({ dryRun, backup, force });
      const result = reducer(actions, current);
  
      expect(result).toHaveLength(4);
  
      expect(result[0]).toBeInstanceOf(Function);
      expect(result[1]).toBeInstanceOf(Function);
      expect(result[2]).toBeInstanceOf(Function);
      expect(result[3]).toBeInstanceOf(Function);

      // @ts-expect-error - mocked function
      expect(console.getOutput()).toEqual([
        "//TODO"
      ]);

    });
  });

}
