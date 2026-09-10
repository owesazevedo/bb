import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyForkPackagedIsolation,
  FORK_HOST_DAEMON_PORT,
  FORK_ISOLATION_ENV_NAME,
  FORK_PACKAGED_APP_NAME,
  FORK_SERVER_PORT,
  UNPACKAGED_APP_NAME,
} from "../src/fork-isolation.js";

const HOME = "/Users/wesley";

describe("fork packaged isolation", () => {
  it("leaves unpackaged Electron on the source-dev identity", () => {
    const isolation = applyForkPackagedIsolation({
      argv: ["electron"],
      env: { BB_DATA_DIR: join(HOME, ".bb-dev", "workspace-instance") },
      homeDir: HOME,
      isPackaged: false,
      platform: "darwin",
    });

    expect(isolation.appName).toBe(UNPACKAGED_APP_NAME);
    expect(isolation.userDataPath).toBeNull();
    expect(isolation.env.BB_DATA_DIR).toBe(
      join(HOME, ".bb-dev", "workspace-instance"),
    );
    expect(isolation.env[FORK_ISOLATION_ENV_NAME]).toBeUndefined();
  });

  it("does not share ~/.bb or the official ports when the packaged app has no overrides", () => {
    const isolation = applyForkPackagedIsolation({
      argv: ["/Applications/bb dev-engine.app/Contents/MacOS/bb"],
      env: {},
      homeDir: HOME,
      isPackaged: true,
      platform: "darwin",
    });

    expect(isolation.appName).toBe(FORK_PACKAGED_APP_NAME);
    expect(isolation.env.BB_DATA_DIR).toBe(join(HOME, ".bb-dev", "packaged"));
    expect(isolation.env.BB_SERVER_PORT).toBe(FORK_SERVER_PORT);
    expect(isolation.env.BB_HOST_DAEMON_PORT).toBe(FORK_HOST_DAEMON_PORT);
    expect(isolation.env[FORK_ISOLATION_ENV_NAME]).toBe("1");
    expect(isolation.userDataPath).toBe(
      join(HOME, "Library", "Application Support", "bb-dev"),
    );
  });

  it("rewrites an accidental BB_DATA_DIR pointing at the official app", () => {
    const isolation = applyForkPackagedIsolation({
      argv: ["bb"],
      env: { BB_DATA_DIR: "~/.bb" },
      homeDir: HOME,
      isPackaged: true,
      platform: "darwin",
    });

    expect(isolation.env.BB_DATA_DIR).toBe(join(HOME, ".bb-dev", "packaged"));
    expect(isolation.env.BB_SERVER_PORT).toBe(FORK_SERVER_PORT);
  });

  it("keeps a pnpm-dev instance dir and its ports when launching the packaged binary from source", () => {
    const isolation = applyForkPackagedIsolation({
      argv: [
        "bb",
        `--user-data-dir=${join(HOME, ".bb-dev", "workspace", "desktop")}`,
      ],
      env: {
        BB_DATA_DIR: join(HOME, ".bb-dev", "workspace"),
        BB_HOST_DAEMON_PORT: "19003",
        BB_SERVER_PORT: "19000",
      },
      homeDir: HOME,
      isPackaged: true,
      platform: "darwin",
    });

    expect(isolation.env.BB_DATA_DIR).toBe(join(HOME, ".bb-dev", "workspace"));
    expect(isolation.env.BB_SERVER_PORT).toBe("19000");
    expect(isolation.env.BB_HOST_DAEMON_PORT).toBe("19003");
    expect(isolation.env[FORK_ISOLATION_ENV_NAME]).toBeUndefined();
    expect(isolation.userDataPath).toBeNull();
  });
});
