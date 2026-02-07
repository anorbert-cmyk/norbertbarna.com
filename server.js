const express = require("express");
const compression = require("compression");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Enable gzip compression
app.use(compression());

// Security headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// Cache static assets for 1 year
app.use("/assets", express.static(path.join(__dirname, "assets"), {
  maxAge: "1y",
  immutable: true
}));

// Serve HTML files without extension
app.use(express.static(__dirname, {
  extensions: ["html"],
  maxAge: "1h"
}));

// Handle clean URLs (e.g., /works -> /works.html)
app.get("*", (req, res) => {
  const filePath = path.join(__dirname, req.path + ".html");
  const indexPath = path.join(__dirname, req.path, "index.html");
  
  if (require("fs").existsSync(filePath)) {
    res.sendFile(filePath);
  } else if (require("fs").existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).sendFile(path.join(__dirname, "index.html"));
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Portfolio running on http://localhost:${PORT}`);
});
