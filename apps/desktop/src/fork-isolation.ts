import { homedir } from "node:os";
import { join, resolve } from "node:path";

export const FORK_PACKAGED_APP_NAME = "bb dev";
export const UNPACKAGED_APP_NAME = "bb-dev";
export const FORK_ISOLATION_ENV_NAME = "BB_DESKTOP_FORK_ISOLATION";
export const FORK_SERVER_PORT = "39886";
export const FORK_HOST_DAEMON_PORT = "39887";
export const OFFICIAL_SERVER_PORT = "38886";
export const OFFICIAL_HOST_DAEMON_PORT = "38887";

interface ApplyForkPackagedIsolationArgs {
  argv: readonly string[];
  env: NodeJS.ProcessEnv;
  homeDir?: string;
  isPackaged: boolean;
  platform: NodeJS.Platform;
}

export interface ForkPackagedIsolation {
  appName: string;
  env: NodeJS.ProcessEnv;
  userDataPath: string | null;
}

function expandHomeDirectory(pathValue: string, homeDir: string): string {
  if (pathValue === "~") {
    return homeDir;
  }
  if (pathValue.startsWith("~/")) {
    return resolve(homeDir, pathValue.slice(2));
  }
  return resolve(pathValue);
}

export function resolveOfficialDataDir(homeDir: string): string {
  return join(homeDir, ".bb");
}

export function resolveForkPackagedDataDir(homeDir: string): string {
  return join(homeDir, ".bb-dev", "packaged");
}

export function resolveForkUserDataDir(
  homeDir: string,
  platform: NodeJS.Platform,
): string {
  if (platform === "darwin") {
    return join(homeDir, "Library", "Application Support", "bb-dev");
  }
  return join(homeDir, ".config", "bb-dev");
}

export function argvHasUserDataDir(argv: readonly string[]): boolean {
  return argv.some(
    (argument) =>
      argument === "--user-data-dir" || argument.startsWith("--user-data-dir="),
  );
}

export function isOfficialDataDir(dataDir: string, homeDir: string): boolean {
  return resolve(dataDir) === resolve(resolveOfficialDataDir(homeDir));
}

export function applyForkPackagedIsolation(
  args: ApplyForkPackagedIsolationArgs,
): ForkPackagedIsolation {
  const homeDir = args.homeDir ?? homedir();
  if (!args.isPackaged) {
    return {
      appName: UNPACKAGED_APP_NAME,
      env: { ...args.env },
      userDataPath: null,
    };
  }

  const env: NodeJS.ProcessEnv = { ...args.env };
  const packagedDataDir = resolveForkPackagedDataDir(homeDir);
  const rawDataDir = env.BB_DATA_DIR?.trim();
  const usingOfficialOrDefaultDataDir =
    rawDataDir === undefined ||
    rawDataDir.length === 0 ||
    isOfficialDataDir(expandHomeDirectory(rawDataDir, homeDir), homeDir);

  if (usingOfficialOrDefaultDataDir) {
    env.BB_DATA_DIR = packagedDataDir;
    if (
      env.BB_SERVER_PORT === undefined ||
      env.BB_SERVER_PORT.trim().length === 0 ||
      env.BB_SERVER_PORT.trim() === OFFICIAL_SERVER_PORT
    ) {
      env.BB_SERVER_PORT = FORK_SERVER_PORT;
    }
    if (
      env.BB_HOST_DAEMON_PORT === undefined ||
      env.BB_HOST_DAEMON_PORT.trim().length === 0 ||
      env.BB_HOST_DAEMON_PORT.trim() === OFFICIAL_HOST_DAEMON_PORT
    ) {
      env.BB_HOST_DAEMON_PORT = FORK_HOST_DAEMON_PORT;
    }
    env[FORK_ISOLATION_ENV_NAME] = "1";
  }

  return {
    appName: FORK_PACKAGED_APP_NAME,
    env,
    userDataPath: argvHasUserDataDir(args.argv)
      ? null
      : resolveForkUserDataDir(homeDir, args.platform),
  };
}
