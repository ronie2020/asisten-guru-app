// Lokasi file: src/app/api/generate/route.js

import { GoogleGenerativeAI } from "@google/generative-ai";

// Inisialisasi model Gemini dengan API Key dari environment variable
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// src/app/api/generate/route.js

export async function POST(request) {
    try {
        const { mataPelajaran, kelas, topik } = await request.json();

        if (!mataPelajaran || !kelas || !topik) {
            return new Response(JSON.stringify({ error: "Input tidak lengkap." }), { status: 400 });
        }

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