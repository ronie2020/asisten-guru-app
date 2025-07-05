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
 * Mengubah string JSON dari Kisi-Kisi menjadi objek Tabel docx dengan cerdas.
 * @param {string} text - String yang mungkin berisi data JSON array.
 * @returns {Array<Table|Paragraph>} - Array berisi objek Tabel jika berhasil, atau Paragraf jika gagal.
 */
const parseKisiKisiJsonToTable = (text = '') => {
    try {
        if (!text || text.trim() === '') {
            return [new Paragraph("Tidak ada data kisi-kisi untuk diproses.", paragraphStyle)];
        }

        // --- LOGIKA CERDAS UNTUK MENGEKSTRAK JSON ---
        const startIndex = text.indexOf('[');
        const endIndex = text.lastIndexOf(']');

        if (startIndex === -1 || endIndex === -1) {
            throw new Error("Tanda kurung siku JSON '[' atau ']' tidak ditemukan.");
        }
        
        const jsonString = text.substring(startIndex, endIndex + 1);
        const jsonData = JSON.parse(jsonString);
        // ---------------------------------------------

        if (!Array.isArray(jsonData) || jsonData.length === 0) {
            return [new Paragraph("Data kisi-kisi tidak valid atau kosong.", paragraphStyle)];
        }
        
        const headers = Object.keys(jsonData[0]);
        const headerRow = new TableRow({
            children: headers.map(headerText => new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: headerText, bold: true })], alignment: AlignmentType.CENTER })]
            }))
        });

        const dataRows = jsonData.map(row => new TableRow({
            children: headers.map(header => new TableCell({
                children: [new Paragraph(String(row[header] || ''), paragraphStyle)]
            }))
        }));

        return [new Table({ rows: [headerRow, ...dataRows], width: { size: 100, type: WidthType.PERCENTAGE } })];
    } catch (e) {
        console.error("Gagal parsing JSON untuk DOCX:", e);
        // Fallback jika terjadi error, tampilkan teks mentah agar bisa di-debug
        return [new Paragraph("Format data kisi-kisi tidak valid. Menampilkan data mentah:\n\n" + text, paragraphStyle)];
    }
};

/**
 * Parser umum untuk teks biasa (non-tabel) yang menerapkan style paragraf.
 * @param {string} text - Teks yang akan diproses.
 * @returns {Array<Paragraph>} - Array objek Paragraph.
 */
const parseMixedContent = (text = '') => {
    const paragraphs = [];
    text.split('\n').forEach(line => {
        paragraphs.push(new Paragraph({ children: parseBold(line), ...paragraphStyle }));
    });
    return paragraphs;
};

// --- FUNGSI EKSPOR UNTUK SETIAP JENIS DOKUMEN ---

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
                ...parseKisiKisiJsonToTable(kisiKisiText), // Memanggil parser JSON yang sudah cerdas
                new Paragraph({ text: "Soal Evaluasi", heading: HeadingLevel.HEADING_2, pageBreakBefore: true }),
                ...parseMixedContent(soalText),
            ],
        }],
    });
    Packer.toBlob(doc).then(blob => saveAs(blob, "Paket_Evaluasi.docx"));
};
