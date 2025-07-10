// src/app/page.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import styles from './page.module.css';
import { FaCopy, FaCheck, FaPaperPlane } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import VerticalKisiKisi from '../components/VerticalKisiKisi';
import VideoRecommendations from '../components/VideoRecommendations';
import { 
    generateRppDocx, 
    generateMateriDocx, 
    generateLkpdDocx, 
    generateEvaluasiDocx,
    generateProtaDocx,
    generatePromesDocx
} from '../utils/docx-generator.js';

export default function Home() {
    // --- STATE ---
    const [mode, setMode] = useState('harian');
    const [mataPelajaran, setMataPelajaran] = useState('');
    const [kelas, setKelas] = useState('');
    const [topik, setTopik] = useState('');
    const [subtopik, setSubtopik] = useState('');
    const [jumlahPertemuan, setJumlahPertemuan] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // State untuk Paket Harian
    const [rpp, setRpp] = useState('');
    const [lkpd, setLkpd] = useState('');
    const [kisiKisi, setKisiKisi] = useState('');
    const [soal, setSoal] = useState('');
    const [materi, setMateri] = useState('');
    const [video, setVideo] = useState('');

    // State untuk Perencanaan Tahunan
    const [prota, setProta] = useState('');
    const [promes, setPromes] = useState('');

    // --- STATE UNTUK CHAT ---
    const [chatHistory, setChatHistory] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);

    // State untuk UI
    const [activeTab, setActiveTab] = useState('rpp');
    const [copiedItem, setCopiedItem] = useState('');
    
    const chatEndRef = useRef(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory, isChatLoading]);

    // --- FUNGSI ---
    const handleCopy = (text, itemName) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedItem(itemName);
        setTimeout(() => setCopiedItem(''), 2000);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (mode === 'harian') {
            handleGenerateHarian();
        } else {
            handleGeneratePlanning();
        }
    };

    const handleGenerateHarian = async () => {
        setIsLoading(true);
        setError(null);
        setRpp(''); setLkpd(''); setKisiKisi(''); setSoal(''); setMateri(''); setVideo(''); setChatHistory([]);
        setActiveTab('rpp');

        const setters = { rpp: setRpp, lkpd: setLkpd, kisiKisi: setKisiKisi, soal: setSoal, materi: setMateri, video: setVideo };
        
        await fetchEventSource('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mataPelajaran, kelas, topik, subtopik, jumlahPertemuan }),
            onmessage(event) {
                const parsedData = JSON.parse(event.data);
                const { type, data } = parsedData;
                if (type && setters[type]) setters[type](data);
            },
            onclose() { setIsLoading(false); },
            onerror(err) { setError("Gagal terhubung ke server streaming."); setIsLoading(false); throw err; }
        });
    };

    const handleGeneratePlanning = async () => {
        setIsLoading(true);
        setError(null);
        setProta(''); setPromes('');
        setActiveTab('prota');

        let fullText = '';
        
        await fetchEventSource('/api/generate-planning', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mataPelajaran, kelas }),
            onmessage(event) {
                const parsedData = JSON.parse(event.data);
                fullText += parsedData.data;
                const parts = fullText.split('---SEPARATOR_BARU---');
                setProta(parts[0] || '');
                setPromes(parts[1] || '');
            },
            onclose() { setIsLoading(false); },
            onerror(err) { setError("Gagal terhubung ke server streaming."); setIsLoading(false); throw err; }
        });
    };

    // --- FUNGSI CHAT YANG DIPERBARUI TOTAL ---
    const handleChatSubmit = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || isChatLoading) return;

        const newUserMessage = { role: 'user', parts: [{ text: chatInput }] };
        
        // Riwayat yang akan dikirim ke API (tanpa placeholder AI)
        const historyForApi = [...chatHistory, newUserMessage];
        
        // --- PERBAIKAN UTAMA ADA DI SINI ---
        // Perbarui UI dalam satu kali panggilan: tambahkan pesan pengguna dan placeholder AI
        setChatHistory(prev => [...prev, newUserMessage, { role: 'model', parts: [{ text: '' }] }]);
        setChatInput('');
        setIsChatLoading(true);

        // Menyiapkan konteks dari materi yang sudah ada
        const context = `
            Konteks RPP: ${rpp}
            Konteks LKPD: ${lkpd}
            Konteks Materi Ajar: ${materi}
            Konteks Soal: ${soal}
        `;

        await fetchEventSource('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ history: historyForApi, context: context }),
            onmessage(event) {
                const parsedData = JSON.parse(event.data);
                // Menambahkan data stream ke pesan AI terakhir di riwayat
                setChatHistory(prev => {
                    const newHistory = [...prev];
                    if (newHistory.length > 0 && newHistory[newHistory.length - 1].role === 'model') {
                        newHistory[newHistory.length - 1].parts[0].text += parsedData.data;
                    }
                    return newHistory;
                });
            },
            onclose() {
                setIsChatLoading(false);
            },
            onerror(err) {
                console.error("Chat EventSource failed:", err);
                setChatHistory(prev => {
                    const newHistory = [...prev];
                    if (newHistory.length > 0 && newHistory[newHistory.length - 1].role === 'model') {
                        newHistory[newHistory.length - 1].parts[0].text = "Maaf, terjadi kesalahan saat menghubungi asisten.";
                    }
                    return newHistory;
                });
                setIsChatLoading(false);
                throw err;
            }
        });
    };

    const hasHarianResult = rpp || lkpd || kisiKisi || soal || materi || video;
    const hasTahunanResult = prota || promes;

    return (
        <div className={styles.container}>
            <main className={styles.main}>
                <h1 className={styles.title}>🚀 Asisten Guru Cerdas</h1>
                <p className={styles.description}>Pilih jenis dokumen yang ingin Anda buat.</p>
                
                <div className={styles.modeSelector}>
                    <button className={`${styles.modeButton} ${mode === 'harian' ? styles.activeMode : ''}`} onClick={() => setMode('harian')}>Paket Mengajar Harian</button>
                    <button className={`${styles.modeButton} ${mode === 'tahunan' ? styles.activeMode : ''}`} onClick={() => setMode('tahunan')}>Perencanaan Tahunan & Semester</button>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <input type="text" value={mataPelajaran} onChange={(e) => setMataPelajaran(e.target.value)} placeholder="Mata Pelajaran" required />
                    <input type="text" value={kelas} onChange={(e) => setKelas(e.target.value)} placeholder="Kelas" required />
                    {mode === 'harian' && (
                        <>
                            <input type="text" value={topik} onChange={(e) => setTopik(e.target.value)} placeholder="Topik/Materi Pokok" required />
                            <input type="text" value={subtopik} onChange={(e) => setSubtopik(e.target.value)} placeholder="Sub-Topik (Opsional)" />
                            <input type="number" value={jumlahPertemuan} onChange={(e) => setJumlahPertemuan(e.target.value)} placeholder="Jumlah Pertemuan (Opsional)" />
                        </>
                    )}
                    <button type="submit" disabled={isLoading}>{isLoading ? 'Sedang Membuat...' : `✨ Generate ${mode === 'harian' ? 'Paket Mengajar' : 'Perencanaan'}`}</button>
                </form>

                {error && <p className={styles.error}>{error}</p>}
                
                {/* Area Hasil untuk Paket Harian */}
                {mode === 'harian' && hasHarianResult && (
                    <div className={styles.resultsContainer}>
                        <div className={styles.tabs}>
                            <button className={activeTab === 'rpp' ? styles.activeTab : ''} onClick={() => setActiveTab('rpp')}>RPP</button>
                            <button className={activeTab === 'lkpd' ? styles.activeTab : ''} onClick={() => setActiveTab('lkpd')}>LKPD</button>
                            <button className={activeTab === 'kisiKisi' ? styles.activeTab : ''} onClick={() => setActiveTab('kisiKisi')}>Kisi-Kisi</button>
                            <button className={activeTab === 'soal' ? styles.activeTab : ''} onClick={() => setActiveTab('soal')}>Soal Evaluasi</button>
                            <button className={activeTab === 'materi' ? styles.activeTab : ''} onClick={() => setActiveTab('materi')}>Materi Ajar</button>
                            <button className={activeTab === 'video' ? styles.activeTab : ''} onClick={() => setActiveTab('video')}>Rekomendasi Video</button>
                            <button className={activeTab === 'chat' ? styles.activeTab : ''} onClick={() => setActiveTab('chat')}>💬 Chat Asisten</button>
                        </div>
                        <div className={styles.tabContent}>
                            <div className={styles.contentWrapper}>
                                {activeTab === 'rpp' && <><button onClick={() => handleCopy(rpp, 'rpp')} className={styles.copyButton} title="Salin Teks">{copiedItem === 'rpp' ? <FaCheck color="green" /> : <FaCopy />}</button><ReactMarkdown remarkPlugins={[remarkGfm]}>{rpp}</ReactMarkdown></>}
                                {activeTab === 'lkpd' && <><button onClick={() => handleCopy(lkpd, 'lkpd')} className={styles.copyButton} title="Salin Teks">{copiedItem === 'lkpd' ? <FaCheck color="green" /> : <FaCopy />}</button><ReactMarkdown remarkPlugins={[remarkGfm]}>{lkpd}</ReactMarkdown></>}
                                {activeTab === 'kisiKisi' && <><button onClick={() => handleCopy(kisiKisi, 'kisiKisi')} className={styles.copyButton} title="Salin Teks">{copiedItem === 'kisiKisi' ? <FaCheck color="green" /> : <FaCopy />}</button><VerticalKisiKisi text={kisiKisi} /></>}
                                {activeTab === 'soal' && <><button onClick={() => handleCopy(soal, 'soal')} className={styles.copyButton} title="Salin Teks">{copiedItem === 'soal' ? <FaCheck color="green" /> : <FaCopy />}</button><ReactMarkdown remarkPlugins={[remarkGfm]}>{soal}</ReactMarkdown></>}
                                {activeTab === 'materi' && <><button onClick={() => handleCopy(materi, 'materi')} className={styles.copyButton} title="Salin Teks">{copiedItem === 'materi' ? <FaCheck color="green" /> : <FaCopy />}</button><ReactMarkdown remarkPlugins={[remarkGfm]}>{materi}</ReactMarkdown></>}
                                {activeTab === 'video' && <VideoRecommendations text={video} />}
                                {activeTab === 'chat' && (
                                    <div className={styles.chatContainer}>
                                        <div className={styles.chatHistory}>
                                            {chatHistory.map((message, index) => (
                                                <div key={index} className={`${styles.chatMessage} ${styles[message.role === 'user' ? 'userMessage' : 'modelMessage']}`}>
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.parts[0].text}</ReactMarkdown>
                                                </div>
                                            ))}
                                            {isChatLoading && (
                                                <div className={`${styles.chatMessage} ${styles.modelMessage}`}>
                                                    <span className={styles.typingIndicator}></span>
                                                </div>
                                            )}
                                            <div ref={chatEndRef} />
                                        </div>
                                        <form onSubmit={handleChatSubmit} className={styles.chatForm}>
                                            <input
                                                type="text"
                                                value={chatInput}
                                                onChange={(e) => setChatInput(e.target.value)}
                                                placeholder="Tanyakan sesuatu untuk menyempurnakan hasil..."
                                                disabled={isChatLoading}
                                            />
                                            <button type="submit" disabled={isChatLoading || !chatInput.trim()}>
                                                <FaPaperPlane />
                                            </button>
                                        </form>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Area Hasil untuk Perencanaan Tahunan */}
                {mode === 'tahunan' && hasTahunanResult && (
                    <>
                        <div className={styles.downloadSection}>
                            <button onClick={() => generateProtaDocx(prota)} className={styles.downloadButton}>🗓️ Download Prota</button>
                            <button onClick={() => generatePromesDocx(promes)} className={styles.downloadButton}>📅 Download Promes</button>
                        </div>
                        <div className={styles.resultsContainer}>
                            <div className={styles.tabs}>
                                <button className={activeTab === 'prota' ? styles.activeTab : ''} onClick={() => setActiveTab('prota')}>Program Tahunan</button>
                                <button className={activeTab === 'promes' ? styles.activeTab : ''} onClick={() => setActiveTab('promes')}>Program Semester</button>
                            </div>
                            <div className={styles.tabContent}>
                                <div className={styles.contentWrapper}>
                                    {activeTab === 'prota' && <><button onClick={() => handleCopy(prota, 'prota')} className={styles.copyButton} title="Salin Teks">{copiedItem === 'prota' ? <FaCheck color="green" /> : <FaCopy />}</button><ReactMarkdown remarkPlugins={[remarkGfm]}>{prota}</ReactMarkdown></>}
                                    {activeTab === 'promes' && <><button onClick={() => handleCopy(promes, 'promes')} className={styles.copyButton} title="Salin Teks">{copiedItem === 'promes' ? <FaCheck color="green" /> : <FaCopy />}</button><ReactMarkdown remarkPlugins={[remarkGfm]}>{promes}</ReactMarkdown></>}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
