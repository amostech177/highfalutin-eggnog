import fs from 'fs/promises';

import { uploadToCloudinary, deleteFromCloudinary, getOptimizedUrl } from '../utils/cloudinary.js';

export const uploadSingleFile = async (req, res) => {
  try {
    console.log('Upload request received:', { file: req.file });
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const { path: filePath } = req.file;
    console.log('Uploading file to Cloudinary:', filePath);
    console.log('Cloudinary config:', {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY ? 'set' : 'not set',
      api_secret: process.env.CLOUDINARY_API_SECRET ? 'set' : 'not set'
    });
    const uploadResult = await uploadToCloudinary(filePath, { folder: 'single-uploads' });
    console.log('Cloudinary upload result:', uploadResult);
    await fs.unlink(filePath).catch(err => console.log('Failed to unlink file:', err));
    if (!uploadResult.success) {
      return res.status(500).json({ success: false, message: 'Failed to upload file', error: uploadResult.error });
    }
    res.status(200).json({ success: true, message: 'File uploaded successfully', data: uploadResult.data });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
}




export const uploadMultipleFiles = async (req, res) => {
  try {
    if (!req.files?.length) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }
    const uploadPromises = req.files.map(async (file) => {
      try {
        const uploadResult = await uploadToCloudinary(file.path, { folder: 'multiple-uploads' });
        await fs.unlink(file.path);
        if (uploadResult.success) {
          return { originalName: file.originalname, ...uploadResult.data };
        }
        throw new Error(uploadResult.error);
      } catch (error) {
        await fs.unlink(file.path).catch((unlinkError) => console.error('Error removing temporary file:', unlinkError));
        throw error;
      }
    });
    const results = await Promise.allSettled(uploadPromises);
    const successfulUploads = results.filter(r => r.status === 'fulfilled').map(r => r.value);
    const failedUploads = results.filter(r => r.status === 'rejected').map(r => r.reason.message);
    res.status(200).json({
      success: true,
      message: `${successfulUploads.length} files uploaded successfully`,
      data: { successful: successfulUploads, failed: failedUploads, total: req.files.length },
    });
  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};


export const getOptimizedImage = async (req, res) => {
  try {
    const { publicId } = req.params;
    const { width, height, quality, format } = req.query;
    if (!publicId) {
      return res.status(400).json({ success: false, message: 'Public ID is required' });
    }
    const transformations = { width, height, quality, fetch_format: format }.filter(Boolean);
    const optimizedUrl = getOptimizedUrl(publicId, transformations);
    res.status(200).json({ success: true, message: 'Optimized URL generated', data: { public_id: publicId, optimized_url: optimizedUrl, transformations } });
  } catch (error) {
    console.error('Optimization error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};


export const deleteFile = async (req, res) => {
  try {
    const { publicId } = req.params;
    const { resourceType = 'image' } = req.query;
    if (!publicId) {
      return res.status(400).json({ success: false, message: 'Public ID is required' });
    }
    const deleteResult = await deleteFromCloudinary(publicId, resourceType);
    if (!deleteResult.success) {
      return res.status(500).json({ success: false, message: 'Failed to delete file', error: deleteResult.error });
    }
    res.status(200).json({ success: true, message: 'File deleted successfully', data: deleteResult });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
}