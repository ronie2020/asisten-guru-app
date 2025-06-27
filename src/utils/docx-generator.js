// src/utils/docx-generator.js

import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } from 'docx';
import { saveAs } from 'file-saver';

// Fungsi parseMarkdown tidak berubah
const parseMarkdown = (text) => {
    if (!text) return [new Paragraph("")];
    const paragraphs = text.split('\n').map(line => {
        const parts = line.split(/(\*\*.*?\*\*)/g).filter(Boolean);
        const runs = parts.map(part => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return new TextRun({ text: part.slice(2, -2), bold: true });
            }
            return new TextRun(part);
        });
        return new Paragraph({ children: runs });
    });
    return paragraphs;
};


// --- FUNGSI PARSE KISI-KISI DENGAN PENANGANAN ERROR LEBIH BAIK ---
const parseKisiKisiToTable = (text) => {
    // Kita bungkus semuanya dengan try...catch untuk menangani error tak terduga
    try {
        if (!text || typeof text !== 'string') return [new Paragraph("Data kisi-kisi tidak tersedia.")];
    
        const soalBlocks = text.split(/\n\s*\n/).filter(Boolean);
        const parsedSoals = soalBlocks.map(block => {
            const soalData = {};
            const lines = block.split('\n').filter(Boolean);
            lines.forEach(line => {
                const separatorIndex = line.indexOf(':');
                if (separatorIndex > -1) {
                    const key = line.substring(0, separatorIndex).trim();
                    const value = line.substring(separatorIndex + 1).trim();
                    if (key && value) {
                        soalData[key] = value;
                    }
                }
            });
            return soalData;
        }).filter(soal => soal['Nomor']);

        if (parsedSoals.length === 0) {
            return [new Paragraph(text)]; // Fallback jika parsing gagal
        }

        // Membuat baris header untuk tabel
        const headerRow = new TableRow({
            // 'children' harus berupa array dari TableCell
            children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "No", bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Indikator Soal", bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Level Kognitif", bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Bentuk Soal", bold: true })] })] }),
            ],
        });

        // Membuat baris data untuk setiap soal
        const dataRows = parsedSoals.map(soal => {
            return new TableRow({
                // 'children' harus berupa array dari TableCell
                children: [
                    new TableCell({ children: [new Paragraph(soal['Nomor'] || '')] }),
                    new TableCell({ children: [new Paragraph(soal['Indikator Soal'] || '')] }),
                    new TableCell({ children: [new Paragraph(soal['Level Kognitif'] || '')] }),
                    new TableCell({ children: [new Paragraph(soal['Bentuk Soal'] || '')] }),
                ],
            });
        });

        const table = new Table({
            rows: [headerRow, ...dataRows],
            width: { size: 100, type: WidthType.PERCENTAGE },
        });

        return [table];
    } catch (err) {
        console.error("Gagal saat mem-parsing tabel kisi-kisi:", err);
        // Jika terjadi error apapun di dalam fungsi ini, kembalikan teks asli sebagai fallback
        return [new Paragraph("Terjadi kesalahan saat memproses data kisi-kisi. Menampilkan data mentah:\n\n" + text)];
    }
};

// Fungsi utama generateDocx tidak berubah
export const generateRppDocx = (rppText) => {
    const doc = new Document({ sections: [{ children: [ new Paragraph({ text: "RENCANA PELAKSANAAN PEMBELAJARAN (RPP)", heading: HeadingLevel.HEADING_1, alignment: 'center' }), ...parseMarkdown(rppText),] }], });
    Packer.toBlob(doc).then(blob => saveAs(blob, "RPP.docx"));
};

export const generateMateriDocx = (materiText) => {
    const doc = new Document({ sections: [{ children: [ new Paragraph({ text: "RINGKASAN MATERI AJAR", heading: HeadingLevel.HEADING_1, alignment: 'center' }), ...parseMarkdown(materiText),] }], });
    Packer.toBlob(doc).then(blob => saveAs(blob, "Materi_Ajar.docx"));
};

export const generateEvaluasiDocx = (kisiKisiText, soalText) => {
    const doc = new Document({
        sections: [{
            children: [
                new Paragraph({ text: "PAKET EVALUASI", heading: HeadingLevel.HEADING_1, alignment: 'center' }),
                new Paragraph({ text: "Kisi-Kisi Soal", heading: HeadingLevel.HEADING_2 }),
                ...parseKisiKisiToTable(kisiKisiText),
                new Paragraph({ text: "Soal Evaluasi", heading: HeadingLevel.HEADING_2, pageBreakBefore: true }),
                ...parseMarkdown(soalText),
            ],
        }],
    });
    Packer.toBlob(doc).then(blob => saveAs(blob, "Paket_Evaluasi.docx"));
};