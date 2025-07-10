// src/app/api/chat/route.js

import { GoogleGenerativeAI } from "@google/generative-ai";

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
        const { history, context } = await request.json();
        
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        const cleanHistory = history.filter(msg => msg.parts[0].text.trim() !== '');

        const chat = model.startChat({
            history: cleanHistory,
        });

        const lastUserMessage = history[history.length - 1].parts[0].text;

        // --- INI BAGIAN YANG KITA UBAH ---
        // Prompt sistem baru yang lebih tegas untuk mengontrol respons AI
        const systemPrompt = `
            Anda adalah "Asisten Guru Cerdas". Tugas Anda adalah membantu guru menyempurnakan materi ajar.
            INSTRUKSI PENTING:
            1. Jawab pertanyaan atau perintah dari guru secara langsung dan to the point.
            2. JANGAN ulangi pertanyaan atau konteks yang sudah diberikan oleh guru.
            3. Fokus pada memberikan hasil atau perbaikan yang diminta, bukan penjelasan panjang.

            Konteks materi saat ini adalah:
            ---
            ${context}
            ---
        `;

        const result = await chat.sendMessageStream(systemPrompt + "\n\n" + lastUserMessage);
        
        const stream = AIStream(result.stream);
        
        return new Response(stream, {
            headers: { 
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error) {
        console.error("Error di API chat:", error);
        return new Response(JSON.stringify({ error: "Gagal memproses permintaan chat." }), { status: 500 });
    }
}
