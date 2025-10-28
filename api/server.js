// api/server.js (Perbaikan Pembuatan URI Link)

const express = require('express');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

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

        // --- Halaman Judul ---
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

        // --- Sections ---
        const sections = [
            { name: 'Mutuals', data: results.mutuals, templateFile: `m${suffix}` },
            { name: 'Not Following Back', data: results.notFollowingBack, templateFile: `nfb${suffix}` },
            { name: 'Not Followed By You', data: results.notFollowedByYou, templateFile: `nfby${suffix}` }
        ];
        const font = await finalPdfDoc.embedFont(StandardFonts.Helvetica);
        const fontSize = 12; const lineHeight = fontSize * 1.4;
        const linkColor = theme === 'dark' ? rgb(0.73, 0.53, 0.99) : rgb(0.58, 0.44, 0.86);
        const textColor = theme === 'dark' ? rgb(1, 1, 1) : rgb(0.2, 0.2, 0.2);
        const { width, height } = { width: 595, height: 842 }; // A4
        const startX = 27; const startY = height - 155; const pageBottomMargin = 77;
        const contentWidth = width - (startX * 2); const numColumns = 3; const columnWidth = contentWidth / numColumns;

        for (const section of sections) {
             const sectionTemplatePath = path.join(templateFolderPath, section.templateFile);
             let templatePage; let currentX = startX; let currentY = startY; let columnIndex = 0;

             try { /* Muat template section pertama */
                const sectionTemplateBytes = await fs.readFile(sectionTemplatePath);
                const sectionTemplateDoc = await PDFDocument.load(sectionTemplateBytes);
                const [copiedPage] = await finalPdfDoc.copyPages(sectionTemplateDoc, [0]);
                finalPdfDoc.addPage(copiedPage);
                templatePage = finalPdfDoc.getPage(finalPdfDoc.getPageCount() - 1);
              } catch (readError) { /* Error handling */
                 console.error(`Gagal memuat template ${sectionTemplatePath}:`, readError);
                 return res.status(500).json({ message: `Template section (${modeFolder}/${section.templateFile}) tidak ditemukan.` });
              }

             // --- Tulis Daftar Username ---
             for (let i = 0; i < section.data.length; i++) {
                 const username = section.data[i]; const displayIndex = i + 1;
                 const textPrefix = `${displayIndex}. `; const textUsername = `@${username}`;
                 const prefixWidth = font.widthOfTextAtSize(textPrefix, fontSize);

                 // Pagination (Logika sama)
                 if (currentY < pageBottomMargin) { /* ... (Kode pagination sama) ... */
                     columnIndex++;
                     if (columnIndex >= numColumns) {
                         const nextPageTemplateBytes = await fs.readFile(sectionTemplatePath); const nextPageTemplateDoc = await PDFDocument.load(nextPageTemplateBytes); const [nextCopiedPage] = await finalPdfDoc.copyPages(nextPageTemplateDoc, [0]); finalPdfDoc.addPage(nextCopiedPage); templatePage = finalPdfDoc.getPage(finalPdfDoc.getPageCount() - 1);
                         // Optional: Tulis judul lanjutan
                         currentY = startY; columnIndex = 0;
                     } else { currentY = startY; } currentX = startX + (columnIndex * columnWidth);
                  }

                 // 1. Gambar teks nomor
                 templatePage.drawText(textPrefix, { x: currentX, y: currentY, font, size: fontSize, color: textColor });

                 // 2. Gambar teks username DENGAN WARNA LINK
                 const usernameX = currentX + prefixWidth;
                 templatePage.drawText(textUsername, { x: usernameX, y: currentY, font, size: fontSize, color: linkColor });

                 // 3. Buat URI Link
                 const userLink = `https://www.instagram.com/${username}`;

                 // 4. Tambahkan Anotasi Link (Area Klik)
                 const linkWidth = font.widthOfTextAtSize(textUsername, fontSize);
                 const fontHeight = font.heightAtSize(fontSize);
                 const yBottom = currentY - (fontHeight * 0.2);
                 const yTop = currentY + (fontHeight * 0.8);

                 try {
                     // *** PERBAIKAN: Gunakan string JS biasa untuk URI ***
                     const uriAction = finalPdfDoc.context.obj({
                         Type: 'Action',
                         S: 'URI',
                         URI: userLink // Langsung gunakan string URL
                     });
                     // **************************************************

                     templatePage.node.addAnnot(
                         finalPdfDoc.context.obj({
                             Type: 'Annot', Subtype: 'Link',
                             Rect: [usernameX, yBottom, usernameX + linkWidth, yTop],
                             Border: [0, 0, 0], // Tanpa border
                             A: uriAction,
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
        const pdfBytes = await finalPdfDoc.save();
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
        console.log(`Base template folder path: ${path.resolve(__dirname, '..', 'templates')}`);
    });
}
module.exports = app;