const { PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { r2Client, R2_CONFIG } = require('../config/r2.config');

class MedicationImageService {
  constructor() {
    this.bucketConfig = R2_CONFIG.buckets.medications;
  }

  // Generate organized file key with medication name, category, and dosage
  generateFileKey(medicationId, fileName, medicationName, category, dosage) {
    // Clean the inputs for filename safety
    const cleanName = medicationName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-') // Replace special chars with hyphens
      .replace(/-+/g, '-') // Remove multiple hyphens
      .substring(0, 30); // Limit length
    
    const cleanCategory = category 
      ? category.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').substring(0, 20)
      : '';
    
    const cleanDosage = dosage 
      ? dosage.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').substring(0, 15)
      : '';
    
    const fileExtension = fileName.split('.').pop();
    const timestamp = Date.now();
    
    // Build filename: {name}-{category}-{dosage}-{timestamp}
    let filename = cleanName;
    if (cleanCategory) filename += `-${cleanCategory}`;
    if (cleanDosage) filename += `-${cleanDosage}`;
    filename += `-${timestamp}`;
    
    // Final format: medications/{medication-id}/{name}-{category}-{dosage}-{timestamp}.{ext}
    return `medications/${medicationId}/${filename}.${fileExtension}`;
  }

  // Upload medication image to R2 with organized naming
  async uploadMedicationImage(fileBuffer, fileName, mimeType, medicationId, medicationName, category, dosage) {
    try {
      console.log('📸 Uploading medication image for:', medicationName);

      // Generate organized file key
      const fileKey = this.generateFileKey(medicationId, fileName, medicationName, category, dosage);

      // Upload parameters
      const uploadParams = {
        Bucket: this.bucketConfig.name,
        Key: fileKey,
        Body: fileBuffer,
        ContentType: mimeType,
        Metadata: {
          'medication-id': medicationId,
          'medication-name': medicationName,
          'category': category || '',
          'dosage': dosage || '',
          'uploaded-at': new Date().toISOString(),
          'original-filename': fileName
        },
        ACL: 'public-read'
      };

      console.log('📤 Uploading medication image to R2:', fileKey);

      // Upload to R2
      await r2Client.send(new PutObjectCommand(uploadParams));

      // Generate public URL
      const publicUrl = `${this.bucketConfig.publicDomain}/${fileKey}`;

      console.log('✅ Medication image uploaded successfully:', publicUrl);

      return {
        fileKey,
        publicUrl,
        fileName: fileKey.split('/').pop(), // Just the filename part
        originalName: fileName,
        mimeType,
        size: fileBuffer.length
      };

    } catch (error) {
      console.error('❌ Error uploading medication image to R2:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }

  // Delete medication image from R2
  async deleteMedicationImage(fileKey) {
    try {
      const deleteParams = {
        Bucket: this.bucketConfig.name,
        Key: fileKey
      };

      await r2Client.send(new DeleteObjectCommand(deleteParams));
      console.log('✅ Medication image deleted from R2:', fileKey);

      return true;
    } catch (error) {
      console.error('❌ Error deleting medication image from R2:', error);
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  }

  // Check if image exists in R2
  async imageExists(fileKey) {
    try {
      const headParams = {
        Bucket: this.bucketConfig.name,
        Key: fileKey
      };

      await r2Client.send(new HeadObjectCommand(headParams));
      return true;
    } catch (error) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  // Generate public URL for medication image
  getPublicUrl(fileKey) {
    if (!fileKey) return null;
    return `${this.bucketConfig.publicDomain}/${fileKey}`;
  }

  // Update medication image (delete old, upload new) with organized naming
  async updateMedicationImage(newFileBuffer, newFileName, mimeType, medicationId, medicationName, category, dosage, oldFileKey) {
    try {
      // Delete old image if exists
      if (oldFileKey) {
        try {
          await this.deleteMedicationImage(oldFileKey);
          console.log('🗑️ Deleted old image:', oldFileKey);
        } catch (deleteError) {
          console.warn('⚠️ Could not delete old image, continuing with upload:', deleteError.message);
        }
      }

      // Upload new image with organized naming
      console.log('📸 Uploading updated medication image for:', medicationName);
      return await this.uploadMedicationImage(
        newFileBuffer, 
        newFileName, 
        mimeType, 
        medicationId, 
        medicationName, 
        category, 
        dosage
      );

    } catch (error) {
      console.error('❌ Error updating medication image:', error);
      throw error;
    }
  }

  // Get all images for a specific medication (useful for management)
  async getMedicationImages(medicationId) {
    // This would require listing objects with prefix
    // For now, returns the folder structure info
    return {
      medicationId,
      folderPath: `medications/${medicationId}/`,
      exampleFormat: `medications/${medicationId}/{name}-{category}-{dosage}-{timestamp}.{ext}`
    };
  }
}

module.exports = new MedicationImageService();