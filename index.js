require("dotenv").config();
const express = require("express");
const AWSv2 = require("aws-sdk");
const cors = require("cors");

const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const app = express();
app.use(express.json());
app.use(cors());

// S3 v2 - dùng cho PUT (upload)
const s3v2 = new AWSv2.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// S3 v3 - dùng cho GET (download)
const s3v3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Route test
app.get("/", (req, res) => {
  res.send("✅ S3 URL API running...");
});

// Tạo presigned URL cho upload
app.post("/generate-s3-url", (req, res) => {
  const { s3_key, contentType } = req.body;

  if (!s3_key || !contentType) {
    return res.status(400).json({ error: "Missing s3_key or contentType" });
  }

  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: s3_key,
    Expires: 300,
    ContentType: contentType
  };

  const upload_url = s3v2.getSignedUrl("putObject", params);
  res.json({ upload_url, s3_key });
});

// Tạo presigned URL cho download
app.get("/generate-presigned-url", async (req, res) => {
  const { s3_key } = req.query;
  if (!s3_key) return res.status(400).json({ error: "Missing s3_key" });

  try {
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: s3_key
    });

    const url = await getSignedUrl(s3v3, command, { expiresIn: 600 });

    res.json({
      presigned_url: url,
      expires_in: 600
    });
  } catch (err) {
    console.error("❌ Error generating presigned URL:", err);
    res.status(500).json({ error: "Failed to generate presigned URL" });
  }
});

// Kết nối các route mở rộng
const extractTextRoute = require("./routes/extract-text-from-url");
const transcribeAudioRoute = require("./routes/transcribe-audio-from-url");

app.use(extractTextRoute);
app.use(transcribeAudioRoute);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
