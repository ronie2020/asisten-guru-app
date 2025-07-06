// src/utils/docx-generator.js

import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

// --- PENGATURAN GAYA DOKUMEN ---
// Definisikan style default di satu tempat agar mudah diubah
const FONT_SIZE = 24; // Ukuran 12pt (12 * 2)
const FONT_FAMILY = "Times New Roman";

const paragraphStyle = {
    alignment: AlignmentType.JUSTIFY,
    spacing: { line: 360 }, // 1.5 spasi
};

/**
 * Mengubah teks dengan format markdown bold (**teks**) menjadi format docx.
 * Fungsi ini sekarang juga menerapkan ukuran dan jenis font default.
 * @param {string} line - Baris teks yang akan diproses.
 * @returns {Array<TextRun>} - Array objek TextRun untuk docx.
 */
const parseBold = (line = '') => {
    const parts = line.split(/(\*\*.*?\*\*)/g).filter(Boolean);
    return parts.map(part => {
        const isBold = part.startsWith('**') && part.endsWith('**');
        const text = isBold ? part.slice(2, -2) : part;
        return new TextRun({ 
            text, 
            bold: isBold,
            size: FONT_SIZE,
            font: FONT_FAMILY,
        });
    });
};

/**
 * Mengubah blok teks tabel markdown menjadi objek Tabel docx.
 * @param {string} tableBlock - Blok teks yang berisi tabel markdown.
 * @returns {Table} - Objek Tabel docx.
 */
const parseMarkdownTableToDocx = (tableBlock) => {
    const lines = tableBlock.trim().split('\n').filter(line => !line.includes('---'));
    const headerLine = lines.shift() || '';
    const headers = headerLine.split('|').map(h => h.trim()).filter(Boolean);
    
    const headerRow = new TableRow({
        children: headers.map(headerText => new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: headerText, bold: true, size: FONT_SIZE, font: FONT_FAMILY })], alignment: AlignmentType.CENTER })]
        }))
    });

    const dataRows = lines.map(line => {
        const cells = line.split('|').map(c => c.trim()).filter(Boolean);
        return new TableRow({
            children: cells.map(cellContent => new TableCell({
                children: [new Paragraph({ children: parseBold(cellContent), alignment: AlignmentType.LEFT })],
            })),
        });
    });

    return new Table({ rows: [headerRow, ...dataRows], width: { size: 100, type: WidthType.PERCENTAGE } });
};


/**
 * Parser utama yang bisa menangani konten campuran (paragraf dan tabel markdown).
 * @param {string} text - Seluruh teks dari satu bagian.
 * @returns {Array<Paragraph|Table>} - Array elemen docx.
 */
const parseMixedContent = (text = '') => {
    if (!text) return [new Paragraph("")];
    const blocks = text.split(/\n\s*\n/).filter(Boolean);
    const elements = [];
    blocks.forEach(block => {
        if (block.includes('|') && block.includes('---')) {
            try { elements.push(parseMarkdownTableToDocx(block)); } 
            catch (e) { elements.push(new Paragraph({ children: parseBold(block), ...paragraphStyle })); }
        } else {
            block.split('\n').forEach(line => {
                elements.push(new Paragraph({ children: parseBold(line), ...paragraphStyle }));
            });
        }
    });
    return elements;
};

/**
 * Mengubah string JSON dari Kisi-Kisi menjadi objek Tabel docx.
 * @param {string} text - String yang mungkin berisi data JSON array.
 * @returns {Array<Table|Paragraph>} - Array berisi objek Tabel jika berhasil, atau Paragraf jika gagal.
 */
const parseKisiKisiJsonToTable = (text = '') => {
    try {
        if (!text || !text.includes('[')) return [new Paragraph("Tidak ada data kisi-kisi untuk diproses.", paragraphStyle)];
        const startIndex = text.indexOf('[');
        const endIndex = text.lastIndexOf(']');
        if (startIndex === -1 || endIndex === -1) throw new Error("Format JSON tidak valid.");
        
        const jsonString = text.substring(startIndex, endIndex + 1);
        const jsonData = JSON.parse(jsonString);
        if (!Array.isArray(jsonData) || jsonData.length === 0) return [new Paragraph("Data kisi-kisi kosong.", paragraphStyle)];
        
        const headers = Object.keys(jsonData[0]);
        const headerRow = new TableRow({
            children: headers.map(headerText => new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: headerText, bold: true, size: FONT_SIZE, font: FONT_FAMILY })], alignment: AlignmentType.CENTER })]
            }))
        });
        const dataRows = jsonData.map(row => new TableRow({
            children: headers.map(header => new TableCell({
                children: [new Paragraph({ children: parseBold(String(row[header] || '')), ...paragraphStyle })]
            }))
        }));
        return [new Table({ rows: [headerRow, ...dataRows], width: { size: 100, type: WidthType.PERCENTAGE } })];
    } catch (e) {
        return [new Paragraph("Format data kisi-kisi tidak valid. Menampilkan data mentah:\n\n" + text, paragraphStyle)];
    }
};


// --- FUNGSI EKSPOR ---

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

export const generateEvaluasiDocx = (kisiKisiText, soalText) => {
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
