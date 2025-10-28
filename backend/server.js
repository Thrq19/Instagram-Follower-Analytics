// server.js (di folder 'backend')

const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

const app = express();
const port = 3000;

app.use(express.json({ limit: '10mb' }));

// CORS Middleware
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// === Endpoint Utama ===
app.post('/generate-pdf', async (req, res) => {
    console.log(`[${new Date().toLocaleTimeString()}] Menerima request /generate-pdf`);
    try {
        const { results, theme } = req.body;

        // Validasi
        if (!results || !results.mutuals || !results.notFollowingBack || !results.notFollowedByYou) {
            return res.status(400).json({ message: 'Data hasil analisis tidak lengkap.' });
        }
        if (!theme || (theme !== 'light' && theme !== 'dark')) {
            return res.status(400).json({ message: 'Mode tema tidak valid.' });
        }

        const modeFolder = theme === 'dark' ? 'DarkMode' : 'LightMode';
        const suffix = theme === 'dark' ? '_dm.pdf' : '_lm.pdf';
        const templateFolderPath = path.join(__dirname, 'templates', modeFolder);

        const finalPdfDoc = await PDFDocument.create();

        // --- 1. Halaman Judul ---
        const judulTemplatePath = path.join(templateFolderPath, `judul${suffix}`);
        console.log(`Memuat template judul: ${judulTemplatePath}`);
        try {
            const judulTemplateBytes = await fs.readFile(judulTemplatePath);
            const judulTemplateDoc = await PDFDocument.load(judulTemplateBytes);
            const [judulPage] = await finalPdfDoc.copyPages(judulTemplateDoc, [0]);
            finalPdfDoc.addPage(judulPage);
            console.log("Halaman judul ditambahkan.");
        } catch (readError) {
             console.error(`Gagal memuat template ${judulTemplatePath}:`, readError);
             throw new Error(`Template judul tidak ditemukan atau rusak.`);
        }

        // --- 2. Sections (Mutuals, NFB, NFBY) ---
        const sections = [
            { name: 'Mutuals', data: results.mutuals, templateFile: `m${suffix}` },
            { name: 'Not Following Back', data: results.notFollowingBack, templateFile: `nfb${suffix}` },
            { name: 'Not Followed By You', data: results.notFollowedByYou, templateFile: `nfby${suffix}` }
        ];

        const font = await finalPdfDoc.embedFont(StandardFonts.Helvetica);
        const fontSize = 12;
        const lineHeight = fontSize * 1.4;
        const linkColor = theme === 'dark' ? rgb(0.73, 0.53, 0.99) : rgb(0.58, 0.44, 0.86);
        const textColor = theme === 'dark' ? rgb(1, 1, 1) : rgb(0.2, 0.2, 0.2);
        const titleColor = rgb(0.88, 0.19, 0.42); // #E1306C (Pink Instagram)

        for (const section of sections) {
             console.log(`Memproses section: ${section.name}`);
             const sectionTemplatePath = path.join(templateFolderPath, section.templateFile);
             console.log(`Memuat template section: ${sectionTemplatePath}`);
             let templatePage;

             // --- KOORDINAT YANG DISESUAIKAN (dalam points) ---
             const { width, height } = { width: 595, height: 842 }; // Ukuran A4 points
             const startX = 27;          // Jarak dari KIRI halaman (9.5mm)
             // === STARTY DITINGKATKAN LAGI (200pt dari atas) ===
             const startY = height - 200; // Posisi Y awal (842 - 200 = 642pt dari BAWAH)
             // ===================================================
             const pageBottomMargin = 77; // Jarak dari BAWAH halaman (27mm dari bawah)
             // ************************************************

             const contentWidth = width - (startX * 2);
             const numColumns = 3;
             const columnWidth = contentWidth / numColumns;
             let currentX = startX;
             let currentY = startY;
             let columnIndex = 0;
             let pageIndexOffset = 0;

             // Muat template section pertama kali
             try {
                const sectionTemplateBytes = await fs.readFile(sectionTemplatePath);
                const sectionTemplateDoc = await PDFDocument.load(sectionTemplateBytes);
                const [copiedPage] = await finalPdfDoc.copyPages(sectionTemplateDoc, [0]);
                finalPdfDoc.addPage(copiedPage);
                templatePage = finalPdfDoc.getPage(finalPdfDoc.getPageCount() - 1);
             } catch (readError) {
                 console.error(`Gagal memuat template ${sectionTemplatePath}:`, readError);
                 throw new Error(`Template section tidak ditemukan atau rusak.`);
             }

             // --- Tulis Judul Section (Manual, agar tidak bentrok dengan template) ---
             const titleText = `${section.name} (${section.data.length})`;
             templatePage.drawText(titleText, {
                 x: startX,
                 y: height - 100, // Perkiraan di atas daftar username
                 font: font,
                 size: 16, // Ukuran font judul
                 color: titleColor,
                 fontWeight: 'bold',
             });
             // Garis pemisah/underline (di bawah judul)
             templatePage.drawLine({
                 start: { x: startX, y: height - 110 },
                 end: { x: startX + font.widthOfTextAtSize(titleText, 16), y: height - 110 },
                 thickness: 1.5,
                 color: titleColor,
             });


             // --- Tulis Daftar Username ---
             for (let i = 0; i < section.data.length; i++) {
                 const username = section.data[i];
                 const displayIndex = i + 1;
                 const textPrefix = `${displayIndex}. `;
                 const textUsername = `@${username}`;
                 const prefixWidth = font.widthOfTextAtSize(textPrefix, fontSize);

                 // Cek jika perlu pindah halaman atau kolom
                 if (currentY < pageBottomMargin) {
                     columnIndex++;
                     if (columnIndex >= numColumns) {
                         // === PAGINATION ===
                         console.log(`Pindah halaman untuk ${section.name}...`);
                         const nextPageTemplateBytes = await fs.readFile(sectionTemplatePath);
                         const nextPageTemplateDoc = await PDFDocument.load(nextPageTemplateBytes);
                         const [nextCopiedPage] = await finalPdfDoc.copyPages(nextPageTemplateDoc, [0]);
                         finalPdfDoc.addPage(nextCopiedPage);
                         templatePage = finalPdfDoc.getPage(finalPdfDoc.getPageCount() - 1);
                         currentY = startY; // Kembali ke Y awal
                         columnIndex = 0; // Kembali ke kolom pertama
                         pageIndexOffset++;
                     } else {
                         currentY = startY; // Kembali ke Y awal untuk kolom baru
                     }
                     currentX = startX + (columnIndex * columnWidth);
                 }

                 // Gambar teks nomor
                 templatePage.drawText(textPrefix, {
                     x: currentX,
                     y: currentY,
                     font: font,
                     size: fontSize,
                     color: textColor,
                 });

                 // Gambar teks username sebagai link
                 const usernameX = currentX + prefixWidth;
                  templatePage.drawText(textUsername, {
                     x: usernameX,
                     y: currentY,
                     font: font,
                     size: fontSize,
                     color: linkColor,
                 });

                 // Tambahkan anotasi link
                 const userLink = `https://www.instagram.com/${username}`;
                 const linkWidth = font.widthOfTextAtSize(textUsername, fontSize);
                 try {
                      templatePage.createAnnotation('Link', { 
                          x: usernameX, 
                          y: currentY - lineHeight * 0.8, // Posisi Y disesuaikan
                          width: linkWidth, 
                          height: lineHeight 
                      }).setURI(userLink);
                  } catch (annotError) {
                      console.warn("Gagal membuat anotasi link untuk:", username, annotError);
                  }


                 currentY -= lineHeight; // Pindah ke baris di bawahnya
             }
              console.log(`Section ${section.name} selesai.`);
         }


        // --- 3. Simpan dan Kirim PDF ---
        const pdfBytes = await finalPdfDoc.save();

        res.setHeader('Content-Disposition', 'attachment; filename="instagram-analysis-results.pdf"');
        res.setHeader('Content-Type', 'application/pdf');
        res.send(Buffer.from(pdfBytes));
        console.log(`[${new Date().toLocaleTimeString()}] PDF berhasil dikirim.`);

    } catch (error) {
        console.error(`[${new Date().toLocaleTimeString()}] Error generating PDF:`, error);
        res.status(500).json({ message: 'Gagal membuat PDF di server.' });
    }
});

// --- Jalankan Server ---
app.listen(port, () => {
    console.log(`Backend PDF generator berjalan di http://localhost:${port}`);
    console.log(`Koordinat konten diatur ke: startX=${27}, startY=${842 - 200}, pageBottomMargin=${77}`);
});