// Browser only: shrinks a photo to at most `maxSide` pixels on its longer side and encodes
// it as WebP (JPEG where the browser cannot encode WebP), as a data URL for upload.
export async function resizeImage(file: File, maxSide = 1600, quality = 0.8) {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: 'from-image',
  })
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const encode = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
  let blob = await encode('image/webp')
  if (blob?.type !== 'image/webp') blob = await encode('image/jpeg')
  if (!blob) throw new Error('Could not read this photo.')
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read this photo.'))
    reader.readAsDataURL(blob)
  })
}
