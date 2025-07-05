// src/app/api/generate/route.js

import { GoogleGenerativeAI } from "@google/generative-ai";

// Fungsi final untuk memproses dan melabeli stream
function AIStream(stream) {
    return new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            let buffer = '';
            
            const sections = ['RPP', 'LKPD', 'KISI', 'SOAL', 'MATERI'];
            let sectionIndex = 0;

            for await (const chunk of stream) {
                buffer += chunk.text();

                let separatorFoundInLoop = true;
                while (separatorFoundInLoop) {
                    if (sectionIndex >= sections.length) {
                        separatorFoundInLoop = false;
                        break;
                    }

                    const currentSectionName = sections[sectionIndex];
                    const startTag = `---KONTEN_${currentSectionName}_MULAI---`;
                    const endTag = `---KONTEN_${currentSectionName}_SELESAI---`;

                    const startIndex = buffer.indexOf(startTag);
                    const endIndex = buffer.indexOf(endTag);

                    if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
                        const content = buffer.substring(startIndex + startTag.length, endIndex).trim();
                        
                        // Menggunakan nama tipe yang konsisten
                        let type = currentSectionName.toLowerCase();
                        if (type === 'kisi') type = 'kisiKisi';

                        const payload = { type: type, data: content };
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
                        
                        buffer = buffer.substring(endIndex + endTag.length);
                        sectionIndex++;
                    } else {
                        separatorFoundInLoop = false;
                    }
                }
            }
            controller.close();
        }
    });
}


export async function POST(request) {
    try {
        const { mataPelajaran, kelas, topik } = await request.json();
        
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const prompt = `Buat satu paket mengajar lengkap untuk: Mata Pelajaran: ${mataPelajaran}, Kelas: ${kelas}, Topik: ${topik}. Hasilnya HARUS terdiri dari LIMA bagian yang dipisahkan dengan separator unik.---KONTEN_RPP_MULAI---[Di sini isi Bagian 1: RPP Ringkas Dengan memasukan komponen pembelajaran mendalam yang relevan]---KONTEN_RPP_SELESAI--- ---KONTEN_LKPD_MULAI---[Di sini isi Bagian 2: LKPD]---KONTEN_LKPD_SELESAI--- ---KONTEN_KISI_MULAI---[Di sini isi Bagian 3: Kisi-Kisi Soal, jumlah soal 15 terdiri dari 10 PG 5 Essai. PENTING: Hasilkan dalam format JSON array yang valid saja, tanpa teks atau penjelasan tambahan. Contoh: [{"No.": "1", "Kompetensi Dasar (KD)": "...", ...}]]---KONTEN_KISI_SELESAI--- ---KONTEN_SOAL_MULAI---[Di sini isi Bagian 4: Soal Evaluasi, gunakan soal HOTS, lampirkan jawaban dari soal evaluasi tersebut.]---KONTEN_SOAL_SELESAI--- ---KONTEN_MATERI_MULAI---[Di sini isi Bagian 5: Ringkasan Materi Ajar]---KONTEN_MATERI_SELESAI---`;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContentStream(prompt.replace(/(\r\n|\n|\r)/gm, ""));
        
        const stream = AIStream(result.stream);
        
        return new Response(stream, {
            headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
        });

    } catch (error) {
        console.error("Error di API route:", error);
        return new Response(JSON.stringify({ error: "Gagal memproses permintaan." }), { status: 500 });
    }
}
