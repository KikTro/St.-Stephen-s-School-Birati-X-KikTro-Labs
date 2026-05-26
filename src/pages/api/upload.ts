import type { NextApiRequest, NextApiResponse } from "next";
import { v2 as cloudinary } from "cloudinary";

// Increase Next.js API body parser capacity to support raw videos up to 150MB
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "150mb",
    },
  },
};

// Retrieve environment credentials
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

// Dynamically configure the Cloudinary SDK if credentials exist
if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const { name, type, postType, base64 } = req.body;

  if (!name || !type || !postType || !base64) {
    return res.status(400).json({ error: "Missing required parameters: name, type, postType, or base64." });
  }

  // Robust environment credentials checking and troubleshooting helper
  if (!cloudName || !apiKey || !apiSecret) {
    const missing: string[] = [];
    if (!cloudName) missing.push("CLOUDINARY_CLOUD_NAME");
    if (!apiKey) missing.push("CLOUDINARY_API_KEY");
    if (!apiSecret) missing.push("CLOUDINARY_API_SECRET");

    return res.status(500).json({
      error: `Cloudinary credentials are not configured on the server. Please check your .env.local file. Missing: ${missing.join(", ")}`,
    });
  }

  try {
    // Cloudinary uploader accepts base64 data URLs directly.
    // Ensure the base64 string starts with the appropriate media MIME type header.
    let uploadFile = base64;
    if (!uploadFile.startsWith("data:")) {
      uploadFile = `data:${type};base64,${base64}`;
    }

    // Direct secure API transmission to Cloudinary CDN
    const uploadResponse = await cloudinary.uploader.upload(uploadFile, {
      resource_type: "auto", // Auto-detects image, video, raw document, etc.
      folder: postType === "idea" ? "robotics_community/ideas" : "robotics_community/projects",
      public_id: `${Date.now()}_${name.split(".")[0].replace(/[^a-zA-Z0-9-_]/g, "")}`,
    });

    return res.status(200).json({
      success: true,
      fileId: uploadResponse.public_id,
      url: uploadResponse.secure_url, // Return CDN-optimized HTTPS URL
      name: name,
    });
  } catch (err: any) {
    console.error("Cloudinary Server Upload Error:", err);
    return res.status(500).json({
      error: err.message || "Internal server error during media transmission to Cloudinary.",
    });
  }
}
