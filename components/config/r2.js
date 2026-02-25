/**
 * r2.js - Cloudflare R2 Storage Configuration
 *
 * Purpose:
 *   Sets up and exports an S3-compatible client for Cloudflare R2 object storage.
 *   Used to upload, retrieve, and delete files (such as article images) in the backend.
 *
 * Usage:
 *   - Imports S3Client from AWS SDK and configures it for Cloudflare R2 using environment variables.
 *   - Exports the configured client as 's3'.
 *
 * Where Used:
 *   - Article model and controller (for image upload/delete)
 *   - Any backend code needing access to R2 storage
 *
 * Referenced in:
 *   - components/Article/model.js
 *   - components/Article/controller.js
 *
 * Environment Variables Required:
 *   - R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
 */
import { S3Client } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  region: "auto",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export { s3 };
