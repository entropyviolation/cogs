/**
 * lib/remove-background.ts — Lightweight client-side background remover
 *
 * Removes a (near-)uniform background from an uploaded image so user "orbs"
 * blend onto the velvet desktop like the built-in ones. This is a pragmatic,
 * dependency-free approximation: it samples the four corners to estimate the
 * background colour, then makes pixels within a colour-distance threshold
 * transparent (with a soft edge), crops to the remaining content, and returns a
 * square PNG data URL. No network / model required.
 */

export interface RemoveBackgroundOptions {
  /** Colour distance (0-441) under which a pixel is treated as background. */
  threshold?: number
  /** Output square size in px. */
  size?: number
}

function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const dr = r1 - r2
  const dg = g1 - g2
  const db = b1 - b2
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

export async function removeBackground(
  file: File | Blob,
  options: RemoveBackgroundOptions = {},
): Promise<string> {
  const threshold = options.threshold ?? 60
  const outSize = options.size ?? 256

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = dataUrl
  })

  // Draw at native size onto a working canvas.
  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")
  if (!ctx) return dataUrl
  ctx.drawImage(img, 0, 0, w, h)

  let imageData: ImageData
  try {
    imageData = ctx.getImageData(0, 0, w, h)
  } catch {
    // Tainted canvas or other failure — fall back to the original image.
    return dataUrl
  }
  const data = imageData.data

  // Estimate background colour from the four corners.
  const corners = [
    [0, 0],
    [w - 1, 0],
    [0, h - 1],
    [w - 1, h - 1],
  ]
  let br = 0
  let bg = 0
  let bb = 0
  for (const [cx, cy] of corners) {
    const idx = (cy * w + cx) * 4
    br += data[idx]
    bg += data[idx + 1]
    bb += data[idx + 2]
  }
  br /= corners.length
  bg /= corners.length
  bb /= corners.length

  // Bounding box of remaining content while knocking out background pixels.
  let minX = w
  let minY = h
  let maxX = 0
  let maxY = 0
  let kept = 0

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4
      const dist = colorDistance(data[idx], data[idx + 1], data[idx + 2], br, bg, bb)
      if (dist < threshold) {
        data[idx + 3] = 0
      } else if (dist < threshold * 1.6) {
        // Soft edge: fade alpha across the transition band.
        const t = (dist - threshold) / (threshold * 0.6)
        data[idx + 3] = Math.round(Math.max(0, Math.min(1, t)) * data[idx + 3])
      }
      if (data[idx + 3] > 10) {
        kept++
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }

  ctx.putImageData(imageData, 0, 0)

  // If basically everything was removed, keep the whole image instead.
  if (kept < w * h * 0.01 || maxX <= minX || maxY <= minY) {
    minX = 0
    minY = 0
    maxX = w - 1
    maxY = h - 1
  }

  const cropW = maxX - minX + 1
  const cropH = maxY - minY + 1
  const side = Math.max(cropW, cropH)

  const out = document.createElement("canvas")
  out.width = outSize
  out.height = outSize
  const octx = out.getContext("2d")
  if (!octx) return canvas.toDataURL("image/png")
  octx.imageSmoothingQuality = "high"
  const scale = outSize / side
  const drawW = cropW * scale
  const drawH = cropH * scale
  const dx = (outSize - drawW) / 2
  const dy = (outSize - drawH) / 2
  octx.drawImage(canvas, minX, minY, cropW, cropH, dx, dy, drawW, drawH)

  return out.toDataURL("image/png")
}
