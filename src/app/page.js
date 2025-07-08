// src/app/page.js
'use client';

import { useState } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import styles from './page.module.css';
import { FaCopy, FaCheck } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
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
    const [subtopik, setSubtopik] = useState(''); // State baru untuk Sub-Topik
    const [jumlahPertemuan, setJumlahPertemuan] = useState(''); // State baru untuk Jumlah Pertemuan
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

    // State untuk UI
    const [activeTab, setActiveTab] = useState('rpp');
    const [copiedItem, setCopiedItem] = useState('');

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
        // Reset semua state harian
        setRpp(''); setLkpd(''); setKisiKisi(''); setSoal(''); setMateri(''); setVideo('');
        setActiveTab('rpp');

        const setters = {
            rpp: setRpp, lkpd: setLkpd, kisiKisi: setKisiKisi, 
            soal: setSoal, materi: setMateri, video: setVideo
        };
        
        await fetchEventSource('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Mengirim data baru ke backend
            body: JSON.stringify({ mataPelajaran, kelas, topik, subtopik, jumlahPertemuan }),
            onmessage(event) {
                const parsedData = JSON.parse(event.data);
                const { type, data } = parsedData;
                if (type && setters[type]) {
                    setters[type](data);
                }
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

    const hasHarianResult = rpp || lkpd || kisiKisi || soal || materi || video;
    const hasTahunanResult = prota || promes;

    // --- TAMPILAN (JSX) ---
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
                    
                    {/* Input tambahan hanya muncul jika mode 'harian' */}
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
                    <>
                        <div className={styles.downloadSection}>
                            <button onClick={() => generateRppDocx(rpp)} className={styles.downloadButton}>📄 Download RPP</button>
                            <button onClick={() => generateMateriDocx(materi)} className={styles.downloadButton}>📚 Download Materi</button>
                            <button onClick={() => generateLkpdDocx(lkpd)} className={styles.downloadButton}>📋 Download LKPD</button>
                            <button onClick={() => generateEvaluasiDocx(kisiKisi, soal)} className={styles.downloadButton}>📝 Download Evaluasi</button>
                        </div>
                        <div className={styles.resultsContainer}>
                            <div className={styles.tabs}>
                                <button className={activeTab === 'rpp' ? styles.activeTab : ''} onClick={() => setActiveTab('rpp')}>RPP</button>
                                <button className={activeTab === 'lkpd' ? styles.activeTab : ''} onClick={() => setActiveTab('lkpd')}>LKPD</button>
                                <button className={activeTab === 'kisiKisi' ? styles.activeTab : ''} onClick={() => setActiveTab('kisiKisi')}>Kisi-Kisi</button>
                                <button className={activeTab === 'soal' ? styles.activeTab : ''} onClick={() => setActiveTab('soal')}>Soal Evaluasi</button>
                                <button className={activeTab === 'materi' ? styles.activeTab : ''} onClick={() => setActiveTab('materi')}>Materi Ajar</button>
                                <button className={activeTab === 'video' ? styles.activeTab : ''} onClick={() => setActiveTab('video')}>Rekomendasi Video</button>
                            </div>
                            <div className={styles.tabContent}>
                                <div className={styles.contentWrapper}>
                                    {activeTab === 'rpp' && <><button onClick={() => handleCopy(rpp, 'rpp')} className={styles.copyButton} title="Salin Teks">{copiedItem === 'rpp' ? <FaCheck color="green" /> : <FaCopy />}</button><ReactMarkdown>{rpp}</ReactMarkdown></>}
                                    {activeTab === 'lkpd' && <><button onClick={() => handleCopy(lkpd, 'lkpd')} className={styles.copyButton} title="Salin Teks">{copiedItem === 'lkpd' ? <FaCheck color="green" /> : <FaCopy />}</button><ReactMarkdown>{lkpd}</ReactMarkdown></>}
                                    {activeTab === 'kisiKisi' && <><button onClick={() => handleCopy(kisiKisi, 'kisiKisi')} className={styles.copyButton} title="Salin Teks">{copiedItem === 'kisiKisi' ? <FaCheck color="green" /> : <FaCopy />}</button><VerticalKisiKisi text={kisiKisi} /></>}
                                    {activeTab === 'soal' && <><button onClick={() => handleCopy(soal, 'soal')} className={styles.copyButton} title="Salin Teks">{copiedItem === 'soal' ? <FaCheck color="green" /> : <FaCopy />}</button><ReactMarkdown>{soal}</ReactMarkdown></>}
                                    {activeTab === 'materi' && <><button onClick={() => handleCopy(materi, 'materi')} className={styles.copyButton} title="Salin Teks">{copiedItem === 'materi' ? <FaCheck color="green" /> : <FaCopy />}</button><ReactMarkdown>{materi}</ReactMarkdown></>}
                                    {activeTab === 'video' && <VideoRecommendations text={video} />}
                                </div>
                            </div>
                        </div>
                    </>
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
                                    {activeTab === 'prota' && <><button onClick={() => handleCopy(prota, 'prota')} className={styles.copyButton} title="Salin Teks">{copiedItem === 'prota' ? <FaCheck color="green" /> : <FaCopy />}</button><ReactMarkdown>{prota}</ReactMarkdown></>}
                                    {activeTab === 'promes' && <><button onClick={() => handleCopy(promes, 'promes')} className={styles.copyButton} title="Salin Teks">{copiedItem === 'promes' ? <FaCheck color="green" /> : <FaCopy />}</button><ReactMarkdown>{promes}</ReactMarkdown></>}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
