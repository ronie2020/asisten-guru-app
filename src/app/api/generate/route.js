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

        // --- PROMPT DIPERBAIKI DENGAN SEPARATOR TANPA KURUNG SIKU ---
        const prompt = `
            Anda adalah ahli kurikulum di Indonesia. Buat satu paket mengajar lengkap untuk:
            - Mata Pelajaran: ${mataPelajaran}
            - Kelas: ${kelas}
            - Topik: ${topik}

            Tolong hasilkan empat bagian berikut, dan pisahkan setiap bagian HANYA dengan pemisah unik yang saya tentukan di bawah.

            Bagian 1: RPP Ringkas mengacu pada kurikulum terbaru dengan memasukan elemen pembelajaran mendalam di dalamnya.
            Format: Tujuan Pembelajaran, Kegiatan Pembelajaran (Pendahuluan, Inti, Penutup), Poin Materi Utama.

            ---SEPARATOR_RPP---

            Bagian 2: Kisi-Kisi Soal.
            Buat kisi-kisi untuk 15 soal (10 Pilihan Ganda, 5 Esai) dengan format vertikal berikut untuk setiap soal:
            Nomor: [Nomor Soal]
            Indikator Soal: [Indikator Soal yang jelas]
            Level Kognitif: [C1, C2, C3, dst.]
            Bentuk Soal: [Pilihan Ganda atau Esai]
            Pisahkan setiap soal dengan baris kosong.

            ---SEPARATOR_KISI---

            Bagian 3: Soal Evaluasi.
            Buat 15 soal (10 Pilihan Ganda dengan opsi a,b,c,d dan 3 Esai) berdasarkan kisi-kisi. Sertakan Kunci Jawaban di bagian akhir.

            ---SEPARATOR_SOAL---

            Bagian 4: Ringkasan Materi Ajar.
            Buat ringkasan materi ajar yang jelas dan padat dalam format poin-poin atau paragraf singkat yang mudah dipahami oleh siswa.

            ---SEPARATOR_MATERI---
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const fullText = response.text();

        // --- LOGIKA SPLIT DIPERBAIKI (TANPA KURUNG SIKU) ---
        const parts = fullText.split(/---SEPARATOR_.*?---/);

        const rpp = parts[0]?.trim() || '';
        const kisiKisi = parts[1]?.trim() || '';
        const soal = parts[2]?.trim() || '';
        const materi = parts[3]?.trim() || '';

        return new Response(JSON.stringify({
            rpp,
            kisiKisi,
            soal,
            materi
        }), { status: 200 });

    } catch (error) {
        console.error("Error di API route:", error);
        return new Response(JSON.stringify({ error: "Gagal memproses permintaan." }), { status: 500 });
    }
}
