const { S3Client } = require('@aws-sdk/client-s3');

// Configure R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// Bucket configurations
const R2_CONFIG = {
  client: r2Client,
  buckets: {
    medications: {
      name: process.env.R2_MEDICATION_BUCKET || 'medication-pictures',
      publicDomain: process.env.R2_MEDICATION_PUBLIC_DOMAIN,
      isPublic: true // Medication images are public
    },
    prescriptions: {
      name: process.env.R2_PRESCRIPTION_BUCKET || 'pharmacy-prescriptions', 
      publicDomain: process.env.R2_PRESCRIPTION_PUBLIC_DOMAIN,
      isPublic: false // Prescriptions are private
    }
  }
};

module.exports = { r2Client, R2_CONFIG };