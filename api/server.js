// api/server.js (Perbaikan Nama File Font)

const express = require('express');
const { PDFDocument, rgb } = require('pdf-lib'); // StandardFonts sudah tidak dipakai
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Variabel cache font
let customFontBytes = null;
let embeddedFont = null; // Cache font yang sudah di-embed

app.post('/api/generate-pdf', async (req, res) => {
    console.log(`[${new Date().toLocaleTimeString()}] Menerima request /api/generate-pdf`);
    try {
        const { results, theme } = req.body;

        // Validasi
        if (!results /*...*/) { return res.status(400).json({ message: 'Data hasil analisis tidak lengkap.' }); }
        if (!theme /*...*/) { return res.status(400).json({ message: 'Mode tema tidak valid.' }); }

        const modeFolder = theme === 'dark' ? 'DarkMode' : 'LightMode';
        const suffix = theme === 'dark' ? '_dm.pdf' : '_lm.pdf';
        const templateFolderPath = path.join(__dirname, '..', 'templates', modeFolder);

        const finalPdfDoc = await PDFDocument.create();

        // --- 1. Muat dan Embed Font Kustom ---
        // *** GUNAKAN NAMA FILE DARI SCREENSHOT ANDA ***
        const fontFileName = 'Inter-24pt-Regular.ttf'; 
        // *******************************************

        if (!customFontBytes) {
            console.log(`Memuat font kustom (${fontFileName})...`);
            const fontPath = path.join(__dirname, fontFileName); // Cari di folder 'api'
            try {
                 customFontBytes = await fs.readFile(fontPath);
            } catch (fontError) {
                 console.error(`KRITIS: File font tidak ditemukan!`, fontError);
                 throw new Error(`File font '${fontFileName}' tidak ditemukan di folder 'api'.`);
            }
        }
        // Embed font ke dokumen PDF (cukup sekali per dokumen)
        const font = await finalPdfDoc.embedFont(customFontBytes);
        console.log("Font kustom berhasil di-embed.");
        // ----------------------------------

        // --- 2. Halaman Judul ---
        const judulTemplatePath = path.join(templateFolderPath, `judul${suffix}`);
        try { /* ... Muat judul ... */
            const judulTemplateBytes = await fs.readFile(judulTemplatePath);
            const judulTemplateDoc = await PDFDocument.load(judulTemplateBytes);
            const [judulPage] = await finalPdfDoc.copyPages(judulTemplateDoc, [0]);
            finalPdfDoc.addPage(judulPage);
         } catch (readError) {
             console.error(`Gagal memuat template ${judulTemplatePath}:`, readError);
             return res.status(500).json({ message: `Template judul (${modeFolder}/judul${suffix}) tidak ditemukan.` });
         }

        // --- 3. Sections ---
        const sections = [
            { name: 'Mutuals', data: results.mutuals, templateFile: `m${suffix}` },
            { name: 'Not Following Back', data: results.notFollowingBack, templateFile: `nfb${suffix}` },
            { name: 'Not Followed By You', data: results.notFollowedByYou, templateFile: `nfby${suffix}` }
        ];
        
        const fontSize = 12; const lineHeight = fontSize * 1.4;
        const linkColor = theme === 'dark' ? rgb(0.73, 0.53, 0.99) : rgb(0.58, 0.44, 0.86);
        const textColor = theme === 'dark' ? rgb(1, 1, 1) : rgb(0.2, 0.2, 0.2);
        const { width, height } = { width: 595, height: 842 }; // A4
        const startX = 27; const startY = height - 155; const pageBottomMargin = 77;
        const contentWidth = width - (startX * 2); const numColumns = 3; const columnWidth = contentWidth / numColumns;

        for (const section of sections) {
             const sectionTemplatePath = path.join(templateFolderPath, section.templateFile);
             let templatePage; let currentX = startX; let currentY = startY; let columnIndex = 0;

             try { /* Muat template section */
                const sectionTemplateBytes = await fs.readFile(sectionTemplatePath);
                const sectionTemplateDoc = await PDFDocument.load(sectionTemplateBytes);
                const [copiedPage] = await finalPdfDoc.copyPages(sectionTemplateDoc, [0]);
                finalPdfDoc.addPage(copiedPage);
                templatePage = finalPdfDoc.getPage(finalPdfDoc.getPageCount() - 1);
              } catch (readError) { /* ... */ return res.status(500).json({ message: `Template section (${modeFolder}/${section.templateFile}) tidak ditemukan.` }); }

             // --- Tulis Daftar Username (Menggunakan Font Kustom) ---
             for (let i = 0; i < section.data.length; i++) {
                 const username = section.data[i]; const displayIndex = i + 1;
                 const textPrefix = `${displayIndex}. `; const textUsername = `@${username}`;
                 const prefixWidth = font.widthOfTextAtSize(textPrefix, fontSize);

                 // Pagination (Logika sama)
                 if (currentY < pageBottomMargin) { /* ... (Kode pagination sama) ... */
                     columnIndex++;
                     if (columnIndex >= numColumns) {
                         const nextPageTemplateBytes = await fs.readFile(sectionTemplatePath); const nextPageTemplateDoc = await PDFDocument.load(nextPageTemplateBytes); const [nextCopiedPage] = await finalPdfDoc.copyPages(nextPageTemplateDoc, [0]); finalPdfDoc.addPage(nextCopiedPage); templatePage = finalPdfDoc.getPage(finalPdfDoc.getPageCount() - 1);
                         currentY = startY; columnIndex = 0;
                     } else { currentY = startY; } currentX = startX + (columnIndex * columnWidth);
                  }

                 // 1. Gambar teks nomor
                 templatePage.drawText(textPrefix, { x: currentX, y: currentY, font, size: fontSize, color: textColor });

                 // 2. Gambar teks username
                 const usernameX = currentX + prefixWidth;
                 templatePage.drawText(textUsername, { x: usernameX, y: currentY, font, size: fontSize, color: linkColor });

                 // 3. Buat URI Link
                 const userLink = `https://www.instagram.com/${username}`;

                 // 4. Tambahkan Anotasi Link
                 const linkWidth = font.widthOfTextAtSize(textUsername, fontSize);
                 const fontHeight = font.heightAtSize(fontSize);
                 const yBottom = currentY - (fontHeight * 0.2);
                 const yTop = currentY + (fontHeight * 0.8);

                 try {
                     const uriAction = finalPdfDoc.context.obj({ Type: 'Action', S: 'URI', URI: userLink });
                     templatePage.node.addAnnot(
                         finalPdfDoc.context.obj({
                             Type: 'Annot', Subtype: 'Link',
                             Rect: [usernameX, yBottom, usernameX + linkWidth, yTop],
                             Border: [0, 0, 0], A: uriAction,
                         })
                     );
                 } catch (annotError) {
                      console.warn("Gagal membuat anotasi link untuk:", username, annotError);
                 }

                 currentY -= lineHeight; // Pindah baris
             }
             console.log(`Section ${section.name} selesai.`);
         }

        // --- Simpan dan Kirim PDF ---
        const pdfBytes = await finalPdfDoc.save({ useObjectStreams: false });
        res.setHeader('Content-Disposition', 'attachment; filename="instagram-analysis-results.pdf"');
        res.setHeader('Content-Type', 'application/pdf');
        res.send(Buffer.from(pdfBytes));
        console.log(`[${new Date().toLocaleTimeString()}] PDF berhasil dikirim.`);

    } catch (error) {
        console.error(`[${new Date().toLocaleTimeString()}] Error generating PDF:`, error);
        res.status(500).json({ message: `Gagal membuat PDF di server: ${error.message || 'Unknown server error'}` });
    }
});


// --- Jalankan Server (Lokal) & Export ---
if (require.main === module) {
    app.listen(port, () => {
        console.log(`Backend PDF generator (LOCAL TEST) berjalan di http://localhost:${port}`);
        console.log(`Pastikan font kustom (Inter-24pt-Regular.ttf) ada di folder 'api'`);
    });
}
module.exports = app;