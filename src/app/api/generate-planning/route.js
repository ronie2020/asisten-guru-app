// src/app/api/generate-planning/route.js

import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Fungsi ini mengubah stream dari Google AI SDK menjadi format Server-Sent Events (SSE)
 * yang bisa dibaca oleh browser.
 * @param {ReadableStream} stream - Stream asli dari Google AI SDK.
 * @returns {ReadableStream} - Stream baru dalam format SSE.
 */
function AIStream(stream) {
    return new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            for await (const chunk of stream) {
                try {
                    const text = chunk.text();
                    const payload = { data: text };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
                } catch (e) {
                    console.error("Gagal memproses chunk:", e);
                }
            }
            controller.close();
        },
    });
}


export async function POST(request) {
    try {
        // Hanya membutuhkan mata pelajaran dan kelas
        const { mataPelajaran, kelas } = await request.json();
        
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        // Prompt khusus untuk meminta Prota dan Promes
        const prompt = `
            Anda adalah seorang ahli kurikulum senior di Indonesia dan seorang guru kreatif.
            Buatlah perencanaan pembelajaran lengkap untuk satu tahun ajaran.
            Mengacu pada Kurikulum Merdeka, dengan fokus pada mata pelajaran ${mataPelajaran} untuk kelas ${kelas}.

            Detail:
            - Mata Pelajaran: ${mataPelajaran}
            - Kelas: ${kelas}

            Tolong hasilkan DUA bagian berikut, dan pisahkan setiap bagian HANYA dengan separator unik '---SEPARATOR_BARU---'.

            Bagian 1: Program Tahunan (Prota), pastikan mengacu pada kurikulum terbaru.
            Buat dalam format tabel markdown. Kolom yang dibutuhkan: Semester, Tujuan Pembelajaran (TP), dan Alokasi Waktu (dalam Jam Pelajaran).

            ---SEPARATOR_BARU---

            Bagian 2: Program Semester (Promes) untuk Semester Ganjil, mengacu pada kurikulum terbaru.
            Buat dalam format tabel markdown. Kolom yang dibutuhkan: Tujuan Pembelajaran (TP), Materi Pokok, dan alokasi per bulan (Juli, Agustus, September, Oktober, November, Desember).
        `;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContentStream(prompt);
        
        const stream = AIStream(result.stream);
        
        return new Response(stream, {
            headers: { 
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error) {
        console.error("Error di API route (planning):", error);
        return new Response(JSON.stringify({ error: "Gagal memproses permintaan perencanaan." }), { status: 500 });
    }
}
