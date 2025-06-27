// Lokasi file: src/app/api/generate/route.js

import { GoogleGenerativeAI } from "@google/generative-ai";

// Inisialisasi model Gemini dengan API Key dari environment variable
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
// Ganti seluruh isi blok try...catch di src/app/api/generate/route.js

try {
    const { mataPelajaran, kelas, topik } = await request.json();

    if (!mataPelajaran || !kelas || !topik) {
        return new Response(JSON.stringify({ error: "Input tidak lengkap." }), { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // --- PROMPT BARU YANG LEBIH CERDAS ---
    // Kita minta semua dalam satu kali jalan dan gunakan pemisah unik
const prompt = `
    Anda adalah ahli kurikulum di Indonesia. Buat satu paket mengajar lengkap untuk:
    - Mata Pelajaran: ${mataPelajaran}
    - Kelas: ${kelas}
    - Topik: ${topik}

    Tolong hasilkan empat bagian berikut, dan pisahkan setiap bagian HANYA dengan pemisah unik yang saya tentukan.

    Bagian 1: RPP mengacu pada kurikulum terbaru yang ada di indonesia dengan memasukan komponen pembelajaran Mendalam didalamnya.
    Format: Tujuan Pembelajaran, Kegiatan Pembelajaran (Pendahuluan, Inti, Penutup), pisahkan per bagian, Poin Materi Utama.

    [---SEPARATOR_RPP---]

    Bagian 2: Kisi-Kisi Soal.
    Buat kisi-kisi untuk 15 soal (10 Pilihan Ganda, 5 Esai) dengan format berikut untuk setiap soal:
    Nomor: [Nomor Soal]
    Indikator Soal: [Indikator Soal yang jelas]
    Level Kognitif: [C1, C2, C3, dst.]
    Bentuk Soal: [Pilihan Ganda atau Esai]
    Pisahkan setiap soal dengan baris baru. 

    [---SEPARATOR_KISI---]

    Bagian 3: Soal Evaluasi.
    Buat 15 soal (10 Pilihan Ganda dengan opsi a,b,c,d dan 5 Esai) berdasarkan kisi-kisi. buatkan format soal dengan mengacu pada soal Hots, Sertakan Kunci Jawaban di bagian akhir.

    [---SEPARATOR_SOAL---]
    
    Bagian 4: Ringkasan Materi Ajar.
    Buat ringkasan materi ajar yang jelas dan padat dalam format poin-poin atau paragraf singkat yang mudah dipahami oleh siswa.

    [---SEPARATOR_MATERI---]
`;

// --- HANYA SATU KALI PANGGILAN API ---
const result = await model.generateContent(prompt);
const response = await result.response;
const fullText = response.text();

// --- PISAHKAN HASILNYA MENJADI 4 BAGIAN ---
const parts = fullText.split(/\[---SEPARATOR_.*?---]/);
const rpp = parts[0]?.trim() || '';
const kisiKisi = parts[1]?.trim() || '';
const soal = parts[2]?.trim() || '';
const materi = parts[3]?.trim() || ''; // <-- BAGIAN BARU

// Kirim semua hasilnya kembali ke frontend
return new Response(JSON.stringify({
    rpp,
    kisiKisi,
    soal,
    materi // <-- KIRIM MATERI KE FRONTEND
}), { status: 200 });

} catch (error) {
    console.error("Error di API route:", error);
    return new Response(JSON.stringify({ error: "Gagal memproses permintaan." }), { status: 500 });
}
}
