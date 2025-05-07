const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");
const fs = require("fs-extra");
const tmp = require("tmp-promise");
const FormData = require("form-data");

router.post("/transcribe-audio-from-url", async (req, res) => {
  const { url, fileName } = req.body;

  if (!url || !fileName) {
    return res.status(400).json({ error: "Missing url or fileName" });
  }

  try {
    const tmpFile = await tmp.file({ postfix: "_" + fileName });
    const response = await fetch(url);
    const buffer = await response.buffer();
    await fs.writeFile(tmpFile.path, buffer);

    const formData = new FormData();
    formData.append("file", fs.createReadStream(tmpFile.path));
    formData.append("model", "whisper-1");
    formData.append("language", "vi");

    const openaiRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: formData
    });

    const result = await openaiRes.json();
    await fs.unlink(tmpFile.path); // cleanup

    if (result.text) {
      return res.json({ transcript: result.text });
    } else {
      return res.status(500).json({ error: "Transcription failed", detail: result });
    }
  } catch (err) {
    console.error("❌ Audio processing failed:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
