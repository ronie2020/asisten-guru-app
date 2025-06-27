// src/utils/docx-generator.js

import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
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

// --- FUNGSI PARSE KISI-KISI DIPERBARUI UNTUK FORMAT VERTIKAL ---
const parseKisiKisiToTable = (text) => {
    if (!text || typeof text !== 'string') return [new Paragraph("Data kisi-kisi tidak tersedia.")];
    
    // 1. Parsing teks menjadi objek-objek soal
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
        // Fallback jika parsing gagal
        return [new Paragraph(text)];
    }

    // 2. Membuat tabel di dokumen Word dari objek-objek soal
    const headerRow = new TableRow({
        children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "No", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Indikator Soal", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Level Kognitif", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Bentuk Soal", bold: true })] })] }),
        ],
    });

    const dataRows = parsedSoals.map(soal => {
        return new TableRow({
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
        // Anda bisa uncomment bagian border ini jika ingin tabelnya memiliki garis
        // borders: {
        //     top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        //     bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        //     left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        //     right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        //     insideH: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        //     insideV: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        // },
    });

    return [table];
};

// Fungsi generateDocx tidak berubah, karena perbaikan ada di dalam parseKisiKisiToTable
export const generateDocx = (rppText, kisiKisiText, soalText) => {
    const doc = new Document({
        sections: [{
            children: [
                new Paragraph({ text: "RENCANA PELAKSANAAN PEMBELAJARAN (RPP)", heading: HeadingLevel.HEADING_1, alignment: 'center' }),
                ...parseMarkdown(rppText),
                new Paragraph({ text: "KISI-KISI SOAL", heading: HeadingLevel.HEADING_1, alignment: 'center', pageBreakBefore: true }),
                ...parseKisiKisiToTable(kisiKisiText),
                new Paragraph({ text: "SOAL EVALUASI", heading: HeadingLevel.HEADING_1, alignment: 'center', pageBreakBefore: true }),
                ...parseMarkdown(soalText),
            ],
        }],
    });

    Packer.toBlob(doc).then(blob => {
        saveAs(blob, "Paket-Mengajar.docx");
        console.log("Dokumen berhasil dibuat!");
    }).catch(err => {
        console.error("Gagal membuat blob dokumen:", err);
    });
};