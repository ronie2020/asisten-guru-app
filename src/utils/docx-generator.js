// src/utils/docx-generator.js

import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

// --- PENGATURAN GAYA DOKUMEN ---
const FONT_SIZE = 24; // Ukuran 12pt (12 * 2)
const FONT_FAMILY = "Times New Roman";

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
 * --- FUNGSI PARSE TABEL YANG DIPERBARUI TOTAL ---
 * Mengubah blok teks tabel markdown menjadi objek Tabel docx yang rapi dan andal.
 * @param {string} tableBlock - Blok teks yang berisi tabel markdown.
 * @returns {Table} - Objek Tabel docx.
 */
const parseMarkdownTableToDocx = (tableBlock) => {
    const lines = tableBlock.trim().split('\n').filter(line => !line.includes('---'));
    const headerLine = lines.shift() || '';
    const headers = headerLine.split('|').map(h => h.trim()).filter(Boolean);
    const numColumns = headers.length > 0 ? headers.length : 1;

    // Tentukan lebar kolom secara merata
    const columnWidths = Array(numColumns).fill(100 / numColumns);

    const headerRow = new TableRow({
        children: headers.map((headerText, index) => new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: headerText, bold: true, size: FONT_SIZE, font: FONT_FAMILY })], alignment: AlignmentType.CENTER })],
            width: { size: columnWidths[index], type: WidthType.PERCENTAGE },
        }))
    });

    const dataRows = lines.map(line => {
        // Memecah sel, membiarkan sel kosong di tengah tetap ada
        const cells = line.split('|').slice(1, -1).map(c => c.trim());
        
        // Memastikan setiap baris memiliki jumlah sel yang sama dengan header
        while (cells.length < numColumns) {
            cells.push(""); // Tambahkan sel kosong jika perlu
        }

        return new TableRow({
            children: cells.map((cellContent, index) => new TableCell({
                children: [new Paragraph({ children: parseBold(cellContent), alignment: AlignmentType.LEFT })],
                width: { size: columnWidths[index], type: WidthType.PERCENTAGE }, // Terapkan lebar ke setiap sel data
            })),
        });
    });

    return new Table({ 
        rows: [headerRow, ...dataRows], 
        width: { size: 9000, type: WidthType.DXA }, // Gunakan lebar tetap untuk stabilitas
    });
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
 * Mengubah string JSON dari Kisi-Kisi menjadi objek Tabel docx dengan lebar kolom yang seimbang.
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
        const numColumns = headers.length > 0 ? headers.length : 1;
        const columnWidths = Array(numColumns).fill(100 / numColumns);

        const headerRow = new TableRow({
            children: headers.map((headerText, index) => new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: headerText, bold: true, size: FONT_SIZE, font: FONT_FAMILY })], alignment: AlignmentType.CENTER })],
                width: { size: columnWidths[index], type: WidthType.PERCENTAGE },
            }))
        });
        const dataRows = jsonData.map(row => new TableRow({
            children: headers.map((header, index) => new TableCell({
                children: [new Paragraph({ children: parseBold(String(row[header] || '')), ...paragraphStyle })],
                width: { size: columnWidths[index], type: WidthType.PERCENTAGE },
            }))
        }));
        return [new Table({ rows: [headerRow, ...dataRows], width: { size: 9000, type: WidthType.DXA } })];
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

// --- FUNGSI EKSPOR BARU UNTUK PROTA & PROMES ---

export const generateProtaDocx = (protaText) => {
    const doc = new Document({
        sections: [{
            children: [
                new Paragraph({ text: "PROGRAM TAHUNAN (PROTA)", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
                ...parseMixedContent(protaText), // Menggunakan parser cerdas yang bisa menangani tabel
            ],
        }],
    });
    Packer.toBlob(doc).then(blob => saveAs(blob, "Program_Tahunan.docx"));
};

export const generatePromesDocx = (promesText) => {
    const doc = new Document({
        sections: [{
            children: [
                new Paragraph({ text: "PROGRAM SEMESTER (PROMES)", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
                ...parseMixedContent(promesText), // Menggunakan parser cerdas yang bisa menangani tabel
            ],
        }],
    });
    Packer.toBlob(doc).then(blob => saveAs(blob, "Program_Semester.docx"));
};
