const express = require("express");
const fetch = require("node-fetch");
const fs = require("fs-extra");
const tmp = require("tmp-promise");
const mammoth = require("mammoth");
const pdfParse = require("pdf-parse");

const router = express.Router();

router.post("/extract-text-from-url", async (req, res) => {
  const { url, fileName } = req.body;

  if (!url || !fileName) {
    return res.status(400).json({ error: "Missing url or fileName" });
  }

  const ext = fileName.split('.').pop().toLowerCase();

  try {
    const tmpFile = await tmp.file({ postfix: `.${ext}` });

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch file from URL: ${response.statusText}`);
    }

    const buffer = await response.buffer();
    await fs.writeFile(tmpFile.path, buffer);

    let text = "";

    if (ext === "pdf") {
      const data = await pdfParse(buffer);
      text = data.text;
    } else if (ext === "docx") {
      const result = await mammoth.extractRawText({ path: tmpFile.path });
      text = result.value;
    } else if (ext === "doc") {
      return res.status(400).json({
        error: ".doc định dạng cũ không được hỗ trợ. Vui lòng chuyển sang .docx hoặc .pdf."
      });
    } else {
      return res.status(400).json({ error: "Unsupported file extension" });
    }

    res.json({ text });
  } catch (err) {
    console.error("❌ Error extracting text:", err);
    res.status(500).json({ error: "Failed to extract text" });
  }
});

module.exports = router;
