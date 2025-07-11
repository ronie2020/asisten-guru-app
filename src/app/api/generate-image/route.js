// src/app/api/generate-image/route.js

// Tidak boleh ada import CSS atau komponen React di file API seperti ini.

export async function POST(request) {
    try {
        // Menerima prompt dari frontend
        const { prompt } = await request.json();

        if (!prompt) {
            return new Response(JSON.stringify({ error: "Prompt tidak boleh kosong." }), { status: 400 });
        }
        
        // Menyiapkan payload untuk API Imagen
        const payload = {
            instances: [{ prompt: prompt }],
            parameters: { "sampleCount": 1 }
        };

        const apiKey = process.env.GEMINI_API_KEY || "";
        
        // Menggunakan model Imagen yang stabil dan benar
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

        // Memanggil API Imagen
        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!apiResponse.ok) {
            const errorBody = await apiResponse.json();
            console.error("Error dari API Imagen:", errorBody);
            throw new Error(errorBody.error?.message || `Gagal memanggil API Imagen: ${apiResponse.statusText}`);
        }

        const result = await apiResponse.json();

        // Mengambil data gambar dalam format base64
        if (result.predictions && result.predictions.length > 0 && result.predictions[0].bytesBase64Encoded) {
            const imageUrl = `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`;
            // Mengirim URL gambar kembali ke frontend
            return new Response(JSON.stringify({ imageUrl: imageUrl }), { status: 200 });
        } else {
            throw new Error("Respons dari API Imagen tidak mengandung data gambar.");
        }

    } catch (error) {
        console.error("Error di API generate-image:", error);
        return new Response(JSON.stringify({ error: error.message || "Gagal membuat gambar." }), { status: 500 });
    }
}
