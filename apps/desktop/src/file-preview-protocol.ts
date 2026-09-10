import { net, protocol, type Session } from "electron";
import {
  FILE_PREVIEW_SCHEME,
  filePreviewSchemeToLoopbackHttpUrl,
} from "@bb/config/file-preview-origin";

const installedSessions = new WeakSet<Session>();

export function registerFilePreviewSchemePrivileges(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: FILE_PREVIEW_SCHEME,
      privileges: {
        bypassCSP: true,
        corsEnabled: true,
        secure: true,
        standard: true,
        stream: true,
        supportFetchAPI: true,
      },
    },
  ]);
}

export function installFilePreviewProtocolHandler(targetSession: Session): void {
  if (installedSessions.has(targetSession)) {
    return;
  }
  const handle = targetSession.protocol?.handle?.bind(targetSession.protocol);
  if (typeof handle !== "function") {
    return;
  }
  installedSessions.add(targetSession);
  handle(FILE_PREVIEW_SCHEME, async (request) => {
    const upstream = filePreviewSchemeToLoopbackHttpUrl(request.url);
    if (upstream === null) {
      return new Response("Not found", { status: 404 });
    }
    return net.fetch(upstream, {
      bypassCustomProtocolHandlers: true,
      method: request.method,
    });
  });
}
