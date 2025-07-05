// src/app/page.js
'use client';

import { useState } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import styles from './page.module.css';
import { FaCopy, FaCheck } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import VerticalKisiKisi from '../components/VerticalKisiKisi';
import { generateRppDocx, generateMateriDocx, generateLkpdDocx, generateEvaluasiDocx } from '../utils/docx-generator.js';

export default function Home() {
    // State declarations
    const [mataPelajaran, setMataPelajaran] = useState('');
    const [kelas, setKelas] = useState('');
    const [topik, setTopik] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [rpp, setRpp] = useState('');
    const [lkpd, setLkpd] = useState('');
    const [kisiKisi, setKisiKisi] = useState('');
    const [soal, setSoal] = useState('');
    const [materi, setMateri] = useState('');
    const [activeTab, setActiveTab] = useState('rpp');
    const [copiedItem, setCopiedItem] = useState('');

    const handleCopy = (text, itemName) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedItem(itemName);
        setTimeout(() => setCopiedItem(''), 2000);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setRpp(''); setLkpd(''); setKisiKisi(''); setSoal(''); setMateri('');
        setActiveTab('rpp');

        // Objek pemetaan yang sudah benar dan konsisten
        const setters = {
            rpp: setRpp,
            lkpd: setLkpd,
            kisiKisi: setKisiKisi, // <-- SUDAH DIPERBAIKI
            soal: setSoal,
            materi: setMateri
        };
        
        await fetchEventSource('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mataPelajaran, kelas, topik }),
            onmessage(event) {
                const parsedData = JSON.parse(event.data);
                const { type, data } = parsedData;
                if (type && setters[type]) {
                    // Logika yang benar: mengganti konten, bukan menambahkan
                    setters[type](data);
                }
            },
            onclose() {
                setIsLoading(false);
            },
            onerror(err) {
                console.error("EventSource failed:", err);
                setError("Gagal terhubung ke server streaming.");
                setIsLoading(false);
                throw err;
            }
        });
    };

    const hasResult = rpp || lkpd || kisiKisi || soal || materi;

    return (
        <div className={styles.container}>
            <main className={styles.main}>
                <h1 className={styles.title}>🚀 Asisten Guru Cerdas</h1>
                <p className={styles.description}>Buat RPP, Kisi-Kisi, dan Soal Evaluasi dalam hitungan menit.</p>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <input type="text" value={mataPelajaran} onChange={(e) => setMataPelajaran(e.target.value)} placeholder="Mata Pelajaran" required />
                    <input type="text" value={kelas} onChange={(e) => setKelas(e.target.value)} placeholder="Kelas" required />
                    <input type="text" value={topik} onChange={(e) => setTopik(e.target.value)} placeholder="Topik/Materi Pokok" required />
                    <button type="submit" disabled={isLoading}>{isLoading ? 'Sedang Membuat...' : '✨ Generate Paket Mengajar'}</button>
                </form>
                {error && <p className={styles.error}>{error}</p>}
                {hasResult && (
                    <div className={styles.downloadSection}>
                        <button onClick={() => generateRppDocx(rpp)} className={styles.downloadButton}>📄 Download RPP</button>
                        <button onClick={() => generateMateriDocx(materi)} className={styles.downloadButton}>📚 Download Materi</button>
                        <button onClick={() => generateLkpdDocx(lkpd)} className={styles.downloadButton}>📋 Download LKPD</button>
                        <button onClick={() => generateEvaluasiDocx(kisiKisi, soal)} className={styles.downloadButton}>📝 Download Evaluasi</button>
                    </div>
                )}
                {hasResult && (
                    <div className={styles.resultsContainer}>
                        <div className={styles.tabs}>
                            <button className={activeTab === 'rpp' ? styles.activeTab : ''} onClick={() => setActiveTab('rpp')}>RPP</button>
                            <button className={activeTab === 'lkpd' ? styles.activeTab : ''} onClick={() => setActiveTab('lkpd')}>LKPD</button>
                            <button className={activeTab === 'kisiKisi' ? styles.activeTab : ''} onClick={() => setActiveTab('kisiKisi')}>Kisi-Kisi</button>
                            <button className={activeTab === 'soal' ? styles.activeTab : ''} onClick={() => setActiveTab('soal')}>Soal Evaluasi</button>
                            <button className={activeTab === 'materi' ? styles.activeTab : ''} onClick={() => setActiveTab('materi')}>Materi Ajar</button>
                        </div>
                        <div className={styles.tabContent}>
                            <div className={styles.contentWrapper}>
                                {activeTab === 'rpp' && <><button onClick={() => handleCopy(rpp, 'rpp')} className={styles.copyButton} title="Salin Teks">{copiedItem === 'rpp' ? <FaCheck color="green" /> : <FaCopy />}</button><ReactMarkdown>{rpp}</ReactMarkdown></>}
                                {activeTab === 'lkpd' && <><button onClick={() => handleCopy(lkpd, 'lkpd')} className={styles.copyButton} title="Salin Teks">{copiedItem === 'lkpd' ? <FaCheck color="green" /> : <FaCopy />}</button><ReactMarkdown>{lkpd}</ReactMarkdown></>}
                                {activeTab === 'kisiKisi' && <><button onClick={() => handleCopy(kisiKisi, 'kisiKisi')} className={styles.copyButton} title="Salin Teks">{copiedItem === 'kisiKisi' ? <FaCheck color="green" /> : <FaCopy />}</button><VerticalKisiKisi text={kisiKisi} /></>}
                                {activeTab === 'soal' && <><button onClick={() => handleCopy(soal, 'soal')} className={styles.copyButton} title="Salin Teks">{copiedItem === 'soal' ? <FaCheck color="green" /> : <FaCopy />}</button><ReactMarkdown>{soal}</ReactMarkdown></>}
                                {activeTab === 'materi' && <><button onClick={() => handleCopy(materi, 'materi')} className={styles.copyButton} title="Salin Teks">{copiedItem === 'materi' ? <FaCheck color="green" /> : <FaCopy />}</button><ReactMarkdown>{materi}</ReactMarkdown></>}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
