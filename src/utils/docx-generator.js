// src/utils/docx-generator.js

import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

// Definisikan style paragraf default agar mudah diubah
const paragraphStyle = {
    alignment: AlignmentType.JUSTIFY,
    spacing: { line: 360 }, // 1.5 spasi
};

/**
 * Mengubah teks dengan format markdown bold (**teks**) menjadi format docx.
 * @param {string} line - Baris teks yang akan diproses.
 * @returns {Array<TextRun>} - Array objek TextRun untuk docx.
 */
const parseBold = (line = '') => {
    const parts = line.split(/(\*\*.*?\*\*)/g).filter(Boolean);
    return parts.map(part => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return new TextRun({ text: part.slice(2, -2), bold: true });
        }
        return new TextRun(part);
    });
};

/**
 * Mengubah blok teks tabel markdown menjadi objek Tabel docx.
 * @param {string} tableBlock - Blok teks yang berisi tabel markdown.
 * @returns {Table} - Objek Tabel docx.
 */
const parseMarkdownTableToDocx = (tableBlock) => {
    // Memisahkan baris dan memfilter garis pemisah '---'
    const lines = tableBlock.trim().split('\n').filter(line => !line.includes('---'));
    
    // Baris pertama adalah header
    const headerLine = lines.shift() || '';
    const headers = headerLine.split('|').map(h => h.trim()).filter(Boolean);
    
    const headerRow = new TableRow({
        children: headers.map(headerText => new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: headerText, bold: true })], alignment: AlignmentType.CENTER })]
        }))
    });

    // Sisa baris adalah data
    const dataRows = lines.map(line => {
        const cells = line.split('|').map(c => c.trim()).filter(Boolean);
        return new TableRow({
            children: cells.map(cellContent => new TableCell({
                // Terapkan style justify pada paragraf di dalam sel
                children: [new Paragraph({ children: parseBold(cellContent), alignment: AlignmentType.JUSTIFY })],
            })),
        });
    });

    return new Table({ rows: [headerRow, ...dataRows], width: { size: 100, type: WidthType.PERCENTAGE } });
};


/**
 * Parser utama yang bisa menangani konten campuran (paragraf dan tabel).
 * @param {string} text - Seluruh teks dari satu bagian (misal: RPP).
 * @returns {Array<Paragraph|Table>} - Array elemen docx.
 */
const parseMixedContent = (text = '') => {
    if (!text) return [new Paragraph("")];
    
    // Pecah teks menjadi blok-blok berdasarkan baris kosong
    const blocks = text.split(/\n\s*\n/).filter(Boolean);
    
    const elements = [];
    blocks.forEach(block => {
        // Cek apakah sebuah blok adalah tabel markdown
        if (block.includes('|') && block.includes('---')) {
            try {
                elements.push(parseMarkdownTableToDocx(block));
            } catch (e) {
                console.error("Gagal parsing tabel, menampilkan sebagai teks biasa:", e);
                elements.push(new Paragraph({ children: parseBold(block), ...paragraphStyle }));
            }
        } else {
            // Jika bukan tabel, proses sebagai paragraf biasa
            block.split('\n').forEach(line => {
                elements.push(new Paragraph({ children: parseBold(line), ...paragraphStyle }));
            });
        }
    });

    return elements;
};


// --- FUNGSI EKSPOR SEKARANG SEMUANYA MENGGUNAKAN PARSER CERDAS ---

export const generateRppDocx = (rppText) => {
    const doc = new Document({ sections: [{ children: [ new Paragraph({ text: "RENCANA PELAKSANAAN PEMBELAJARAN (RPP)", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }), ...parseMixedContent(rppText),] }], });
    Packer.toBlob(doc).then(blob => saveAs(blob, "RPP.docx"));
};

export const generateMateriDocx = (materiText) => {
    const doc = new Document({ sections: [{ children: [ new Paragraph({ text: "RINGKASAN MATERI AJAR", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }), ...parseMixedContent(materiText),] }], });
    Packer.toBlob(doc).then(blob => saveAs(blob, "Materi_Ajar.docx"));
};

export const generateLkpdDocx = (lkpdText) => {
    const doc = new Document({ sections: [{ children: [ new Paragraph({ text: "LEMBAR KERJA PESERTA DIDIK (LKPD)", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }), ...parseMixedContent(lkpdText),] }], });
    Packer.toBlob(doc).then(blob => saveAs(blob, "LKPD.docx"));
};

// Fungsi Evaluasi tetap menggunakan parser JSON untuk kisi-kisi karena lebih andal
export const generateEvaluasiDocx = (kisiKisiText, soalText) => {
    // Fungsi khusus untuk parsing JSON Kisi-Kisi
    const parseKisiKisiJsonToTable = (jsonText = '') => {
        try {
            if (!jsonText || !jsonText.includes('[')) return [new Paragraph("Data kisi-kisi tidak valid.", paragraphStyle)];
            const jsonData = JSON.parse(jsonText);
            if (!Array.isArray(jsonData) || jsonData.length === 0) return [new Paragraph("Data kisi-kisi kosong.", paragraphStyle)];
            const headers = Object.keys(jsonData[0]);
            const headerRow = new TableRow({ children: headers.map(h => new TableCell({ children: [new Paragraph({ text: h, bold: true, alignment: AlignmentType.CENTER })] })) });
            const dataRows = jsonData.map(row => new TableRow({ children: headers.map(h => new TableCell({ children: [new Paragraph(String(row[h] || ''), paragraphStyle)] })) }));
            return [new Table({ rows: [headerRow, ...dataRows], width: { size: 100, type: WidthType.PERCENTAGE } })];
        } catch (e) {
            return [new Paragraph("Format data kisi-kisi tidak valid. Menampilkan data mentah:\n\n" + jsonText, paragraphStyle)];
        }
    };

    const doc = new Document({
        sections: [{
            children: [
                new Paragraph({ text: "PAKET EVALUASI", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
                new Paragraph({ text: "Kisi-Kisi Soal", heading: HeadingLevel.HEADING_2 }),
                ...parseKisiKisiJsonToTable(kisiKisiText),
                new Paragraph({ text: "Soal Evaluasi", heading: HeadingLevel.HEADING_2, pageBreakBefore: true }),
                ...parseMixedContent(soalText),
            ],
        }],
    });
    Packer.toBlob(doc).then(blob => saveAs(blob, "Paket_Evaluasi.docx"));
};
