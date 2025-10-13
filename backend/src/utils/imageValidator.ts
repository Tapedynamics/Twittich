/**
 * Image Validation Utility
 * Validates base64 images for security
 */

export const validateBase64Image = (base64: string): void => {
  // Check if it's a valid base64 image format
  const validMimes = /^data:image\/(png|jpg|jpeg|gif|webp);base64,/;

  if (!validMimes.test(base64)) {
    throw new Error('Invalid image format. Only PNG, JPG, JPEG, GIF, and WEBP are allowed. SVG is not permitted for security reasons.');
  }

  // Extract base64 data (remove data:image/...;base64, prefix)
  const base64Data = base64.split(',')[1];

  if (!base64Data) {
    throw new Error('Invalid base64 image data');
  }

  // Calculate size in bytes
  const sizeInBytes = Buffer.from(base64Data, 'base64').length;
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (sizeInBytes > maxSize) {
    throw new Error(`Image too large. Maximum size is 5MB. Your image is ${(sizeInBytes / 1024 / 1024).toFixed(2)}MB`);
  }

  // Additional security: check for common malicious patterns
  const decodedData = Buffer.from(base64Data, 'base64').toString('utf8', 0, 100);

  // Check for script tags (XSS attempt in image metadata)
  if (decodedData.toLowerCase().includes('<script')) {
    throw new Error('Image contains suspicious content and was rejected');
  }

  // Check for PHP code (web shell attempt)
  if (decodedData.includes('<?php')) {
    throw new Error('Image contains suspicious content and was rejected');
  }
};

/**
 * Sanitize image before storage
 * Returns the validated base64 string
 */
export const sanitizeImage = (base64: string): string => {
  validateBase64Image(base64);
  return base64;
};
