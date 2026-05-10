import { v2 as cloudinary } from 'cloudinary';

console.log('Initializing Cloudinary with:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY ? 'present' : 'missing',
  api_secret: process.env.CLOUDINARY_API_SECRET ? 'present' : 'missing'
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a file to Cloudinary
 * @param {string} filePath - Local file path
 * @param {object} options - Upload options
 * @returns {Promise<object>} - Upload result
 */

export const uploadToCloudinary = async (filePath, options = {}) => {
  try {
     const result = await cloudinary.uploader.upload(filePath, {
      folder: 'uploads',
      resource_type: 'auto',
      use_filename: true,
      unique_filename: false,
      ...options,
    });
    return {
      success: true,
      data: {
        public_id: result.public_id,
        url: result.secure_url,
        format: result.format,
        resource_type: result.resource_type,
        bytes: result.bytes,
        width: result.width || null,
        height: result.height || null,
        created_at: result.created_at,
      },
    };

  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Deletes a file from Cloudinary
 * @param {string} publicId - File's public ID
 * @param {string} resourceType - Resource type (e.g., image, video)
 * @returns {Promise<object>} - Deletion result
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return { success: result.result === 'ok', result: result.result };
  } catch (error) {
    console.error('Cloudinary deletion error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Generates an optimized image URL
 * @param {string} publicId - Image's public ID
 * @param {object} transformations - Transformation options
 * @returns {string} - Optimized URL
 */
export const getOptimizedUrl = (publicId, transformations = {}) => {
  return cloudinary.url(publicId, {
    quality: 'auto',
    fetch_format: 'auto',
    ...transformations,
  });
};


