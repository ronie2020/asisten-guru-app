// src/app/api/generate/route.js

import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Fungsi final untuk mengubah stream dari Google AI SDK menjadi format Server-Sent Events (SSE).
 * Logika ini lebih andal karena secara eksplisit mencari tag pembuka dan penutup untuk setiap bagian.
 * @param {ReadableStream} stream - Stream asli dari Google AI SDK.
 * @returns {ReadableStream} - Stream baru dalam format SSE.
 */
function AIStream(stream) {
    return new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            let buffer = '';
            
            const sections = ['RPP', 'LKPD', 'KISI', 'SOAL', 'MATERI', 'VIDEO'];
            let sectionIndex = 0;

            // Menggunakan for await...of, cara yang paling andal untuk membaca stream
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
        const { mataPelajaran, kelas, topik, subtopik, jumlahPertemuan } = await request.json();
        
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        // Prompt final yang menggunakan tag MULAI dan SELESAI serta meminta JSON untuk Kisi-Kisi
        const prompt = `Anda adalah seorang ahli kurikulum indonesia dan seorang guru yang kreatif, dan memahami kurikulum terbaru di indeonesia
        Buat satu paket mengajar lengkap untuk: 
        Mata Pelajaran: ${mataPelajaran}, 
        Kelas: ${kelas}, 
        Topik Utama: ${topik}${subtopik ? `, Sub-Topik Spesifik: ${subtopik}` : ''}${jumlahPertemuan ? `, Jumlah Pertemuan yang Direncanakan: ${jumlahPertemuan}` : ''}. 

        INSTRUKSI PENTING:
        - Di dalam bagian RPP, LKPD, dan Materi Ajar, jika ada konsep yang bisa dijelaskan dengan gambar, sisipkan placeholder dengan format [GAMBAR: deskripsi gambar yang sangat detail untuk AI generator gambar].
        - Contoh placeholder: [GAMBAR: Diagram sel tumbuhan dengan label untuk dinding sel, kloroplas, dan vakuola].
        
        Hasilnya HARUS terdiri dari ENAM bagian yang dipisahkan dengan separator unik.

        ---KONTEN_RPP_MULAI---
        [Di sini isi Bagian 1: RPP Ringkas, sisipkan [GAMBAR: ...] jika perlu,
        Pastikan untuk menyertakan semua elemen penting seperti tujuan pembelajaran, profil lulusan yang sesuai (bukan Profil pelajar Pancasila), prinsip pembelajaran, pengalaman belajar, serta kerangka pembelajaran, langkah-langkah pembelajaran, penilaian, dan sumber belajar.]
        ---KONTEN_RPP_SELESAI--- 

        ---KONTEN_LKPD_MULAI---
        [Di sini isi Bagian 2: LKPD, sisipkan [GAMBAR: ...] jika perlu, mengacu pada RPP yang dibuat sebelumnya.]
        ---KONTEN_LKPD_SELESAI--- 

        ---KONTEN_KISI_MULAI---
        [Di sini isi Bagian 3: Kisi-Kisi Soal, jumlah soal 15 terdiri 10 PG 5 Essai. PENTING: Hasilkan dalam format JSON array yang valid saja, tanpa teks atau penjelasan tambahan. Contoh: [{"No.": "1", "Kompetensi Dasar (KD)": "...", ...}]]
        ---KONTEN_KISI_SELESAI--- 

        ---KONTEN_SOAL_MULAI---
        [Di sini isi Bagian 4: Soal Evaluasi, sisipkan [GAMBAR: ...] jika perlu, jumlah soal 15 terdiri dari 10 PG dan 5 Essai, buatkan jenis soal numerasi literasi dan HOTS, buatkan jawaban dan penjelasannya di halaman selanjutnya.]
        ---KONTEN_SOAL_SELESAI--- 

        ---KONTEN_MATERI_MULAI---
        [Di sini isi Bagian 5: Ringkasan Materi Ajar, sisipkan [GAMBAR: ...] jika perlu, masukan point utama dari pembelajaran, gunakan bahasa yang mudah dipahami oleh siswa kelas ${kelas}.]
        ---KONTEN_MATERI_SELESAI--- 

        ---KONTEN_VIDEO_MULAI---
        Di sini isi Bagian 6: 3 Rekomendasi Video dari YouTube yang relevan dengan Topik, Format setiap rekomendasi: "Judul Video: [Judul Video di Sini]\nDeskripsi: [Deskripsi singkat video di sini]". 
        Pisahkan setiap rekomendasi dengan baris kosong. ]
        ---KONTEN_VIDEO_SELESAI---`;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContentStream(prompt.replace(/(\r\n|\n|\r)/gm, ""));
        
        const stream = AIStream(result.stream);
        
        return new Response(stream, {
            headers: { 
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error) {
        console.error("Error di API route:", error);
        return new Response(JSON.stringify({ error: "Gagal memproses permintaan." }), { status: 500 });
    }
}
