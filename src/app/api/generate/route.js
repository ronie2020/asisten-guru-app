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
            
            // Definisikan urutan bagian konten yang diharapkan
            const sections = ['RPP', 'LKPD', 'KISI', 'SOAL', 'MATERI'];
            let sectionIndex = 0;

            // Menggunakan for await...of, cara yang paling andal untuk membaca stream dari Google AI
            for await (const chunk of stream) {
                // Tambahkan potongan data baru ke buffer
                buffer += chunk.text();

                // Loop untuk memproses buffer selama masih ada kemungkinan menemukan bagian lengkap
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

                    // Hanya proses jika tag pembuka dan penutup LENGKAP ditemukan di buffer
                    if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
                        // Ekstrak konten yang berada di antara tag
                        const content = buffer.substring(startIndex + startTag.length, endIndex).trim();
                        
                        // Tentukan tipe data untuk dikirim ke frontend
                        let type = currentSectionName.toLowerCase();
                        if (type === 'kisi') type = 'kisiKisi'; // Perbaikan: Gunakan nama yang konsisten

                        // Buat payload JSON dan kirim sebagai event
                        const payload = { type: type, data: content };
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
                        
                        // Buang bagian yang sudah diproses dari buffer
                        buffer = buffer.substring(endIndex + endTag.length);
                        
                        // Lanjut ke bagian berikutnya
                        sectionIndex++;
                    } else {
                        // Bagian lengkap belum ditemukan, tunggu data stream berikutnya
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
        
        // Prompt final yang menggunakan tag MULAI dan SELESAI serta meminta JSON untuk Kisi-Kisi
        const prompt = `Buat satu paket mengajar lengkap untuk: Mata Pelajaran: ${mataPelajaran}, Kelas: ${kelas}, Topik: ${topik}. Hasilnya HARUS terdiri dari LIMA bagian yang dipisahkan dengan separator unik.---KONTEN_RPP_MULAI---[Di sini isi Bagian 1: RPP Ringkas, masukan elemen pembelajaran mendalam dan profil pelajar pancasila.]---KONTEN_RPP_SELESAI--- ---KONTEN_LKPD_MULAI---[Di sini isi Bagian 2: LKPD]---KONTEN_LKPD_SELESAI--- ---KONTEN_KISI_MULAI---[Di sini isi Bagian 3: Kisi-Kisi Soal dengan jumlah soal 15 terdiri dari 10 PG dan 5 Essai. PENTING: Hasilkan dalam format JSON array yang valid saja, tanpa teks atau penjelasan tambahan. Contoh: [{"No.": "1", "Kompetensi Dasar (KD)": "...", ...}]]---KONTEN_KISI_SELESAI--- ---KONTEN_SOAL_MULAI---[Di sini isi Bagian 4: Soal Evaluasi, buat soal dengan format soal HOTS dan lampirkan seluruh jawaban dan penjelasan.]---KONTEN_SOAL_SELESAI--- ---KONTEN_MATERI_MULAI---[Di sini isi Bagian 5: Ringkasan Materi Ajar, buat ringkas dan lengkap, buat per poin penting]---KONTEN_MATERI_SELESAI---`;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        // Hapus baris baru dari prompt untuk stabilitas
        const result = await model.generateContentStream(prompt.replace(/(\r\n|\n|\r)/gm, ""));
        
        const stream = AIStream(result.stream);
        
        // Mengirim response dengan header yang benar untuk Server-Sent Events (SSE)
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
