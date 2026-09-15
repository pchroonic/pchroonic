const MAX_LOGO_BYTES = 2 * 1024 * 1024;

function logoError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function startsWith(buffer, bytes) {
  if (!Buffer.isBuffer(buffer) || buffer.length < bytes.length) return false;
  return bytes.every((value, index) => buffer[index] === value);
}

function detectLogoImageType(buffer) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) return null;
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mimeType: 'image/png', extension: 'png' };
  }
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) {
    return { mimeType: 'image/jpeg', extension: 'jpg' };
  }
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return { mimeType: 'image/webp', extension: 'webp' };
  }
  if (buffer.length >= 16 && buffer.toString('ascii', 4, 8) === 'ftyp') {
    const brands = buffer.toString('ascii', 8, Math.min(buffer.length, 40));
    if (brands.includes('avif') || brands.includes('avis')) return { mimeType: 'image/avif', extension: 'avif' };
  }
  return null;
}

function decodeLogoBase64(value, maxBytes = MAX_LOGO_BYTES) {
  const raw = String(value || '').trim();
  if (!raw) throw logoError('Choose a logo image first.');
  const encoded = raw.startsWith('data:') ? raw.slice(raw.indexOf(',') + 1) : raw;
  if (!encoded || !/^[A-Za-z0-9+/\r\n]*={0,2}$/.test(encoded) || encoded.length % 4 === 1) {
    throw logoError('The logo image could not be read. Please choose the file again.');
  }
  const compact = encoded.replace(/[\r\n]/g, '');
  if (compact.length > Math.ceil(maxBytes * 4 / 3) + 8) {
    throw logoError('The logo is too large. Please use an image up to 2 MB.', 413);
  }
  const buffer = Buffer.from(compact, 'base64');
  if (!buffer.length) throw logoError('The logo image is empty.');
  if (buffer.length > maxBytes) throw logoError('The logo is too large. Please use an image up to 2 MB.', 413);
  const imageType = detectLogoImageType(buffer);
  if (!imageType) throw logoError('Use a PNG, JPG, WebP or AVIF image.');
  return { buffer, ...imageType };
}

module.exports = { MAX_LOGO_BYTES, detectLogoImageType, decodeLogoBase64 };
