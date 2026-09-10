import type { NativeImage } from "electron";
import type { BrowserGrabGuestRect } from "./desktop-browser-grab-payload.js";

const GRAB_SCREENSHOT_JPEG_QUALITY = 70;
const GRAB_SCREENSHOT_MAX_EDGE = 720;

interface CropGrabScreenshotArgs {
  image: NativeImage;
  rect: BrowserGrabGuestRect;
  viewHeight: number;
  viewWidth: number;
}

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function cropGrabScreenshotToDataUrl(
  args: CropGrabScreenshotArgs,
): string | null {
  if (args.image.isEmpty() || args.viewWidth <= 0 || args.viewHeight <= 0) {
    return null;
  }
  if (args.rect.width < 1 || args.rect.height < 1) {
    return null;
  }
  const size = args.image.getSize();
  if (size.width <= 0 || size.height <= 0) {
    return null;
  }
  const scaleX = size.width / args.viewWidth;
  const scaleY = size.height / args.viewHeight;
  const x = clampInt(args.rect.x * scaleX, 0, size.width);
  const y = clampInt(args.rect.y * scaleY, 0, size.height);
  const width = clampInt(args.rect.width * scaleX, 1, size.width - x);
  const height = clampInt(args.rect.height * scaleY, 1, size.height - y);
  if (width < 1 || height < 1) {
    return null;
  }
  let cropped = args.image.crop({ x, y, width, height });
  if (cropped.isEmpty()) {
    return null;
  }
  const croppedSize = cropped.getSize();
  const longestEdge = Math.max(croppedSize.width, croppedSize.height);
  if (longestEdge > GRAB_SCREENSHOT_MAX_EDGE) {
    const scale = GRAB_SCREENSHOT_MAX_EDGE / longestEdge;
    cropped = cropped.resize({
      width: Math.max(1, Math.round(croppedSize.width * scale)),
      height: Math.max(1, Math.round(croppedSize.height * scale)),
    });
  }
  const jpeg = cropped.toJPEG(GRAB_SCREENSHOT_JPEG_QUALITY);
  if (jpeg.length === 0) {
    return null;
  }
  return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
}
