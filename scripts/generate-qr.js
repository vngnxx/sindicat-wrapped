// Generates a printable QR code labelled "SINDICATE WRAPPED" pointing at the guest page.
// Usage: node scripts/generate-qr.js [guest-page-url]
// If no URL is given, uses GUEST_URL from .env.
require("dotenv").config();
const path = require("path");
const QRCode = require("qrcode");
const sharp = require("sharp");

const BRAND = "SINDICATE WRAPPED";
const url = process.argv[2] || process.env.GUEST_URL;

if (!url) {
  console.error("Please provide the guest page URL, e.g.:");
  console.error("  node scripts/generate-qr.js https://your-app.vercel.app");
  console.error("or set GUEST_URL in .env");
  process.exit(1);
}

(async () => {
  const outDir = path.join(__dirname, "..");

  // Build an SVG that contains the QR plus the brand label and URL below it.
  const qrSvg = await QRCode.toString(url, { type: "svg", margin: 2 });
  const [, viewBox] = qrSvg.match(/viewBox="([\d\s.-]+)"/) || [];
  if (!viewBox) throw new Error("Could not read QR svg viewBox");
  const [x, y, w, h] = viewBox.split(/\s+/).map(Number);
  const pad = 40;
  const labelSpace = 110;
  const totalW = w + pad * 2;
  const totalH = h + pad * 2 + labelSpace;

  const labeledSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">
  <rect width="${totalW}" height="${totalH}" fill="#ffffff"/>
  ${qrSvg.replace(/<\?xml[^>]*\?>/, "").replace(/<svg[^>]*>/, `<g transform="translate(${pad},${pad})">`).replace("</svg>", "</g>")}
  <text x="${totalW / 2}" y="${y + pad + h + 52}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="44" font-weight="bold" letter-spacing="4" fill="#111">${BRAND}</text>
  <text x="${totalW / 2}" y="${y + pad + h + 92}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="26" fill="#555">Scan untuk minta lagu</text>
</svg>`;

  await sharp(Buffer.from(labeledSvg)).resize({ width: 1024 }).png().toFile(path.join(outDir, "sindicat-wrapped-qr.png"));
  await sharp(Buffer.from(labeledSvg)).png().toFile(path.join(outDir, "sindicat-wrapped-qr.svg"));
  console.log(`✅ QR code dibuat untuk: ${url}`);
  console.log(`   PNG: sindicat-wrapped-qr.png (siap cetak, 1024px, berlabel "${BRAND}")`);
  console.log(`   SVG: sindicat-wrapped-qr.svg (bisa dicetak ukuran berapa saja)`);
})();
