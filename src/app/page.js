// Lokasi file: pages/index.js atau app/page.js

'use client'; // <--- TAMBAHKAN BARIS INI DI PALING ATAS

import { useState } from 'react';
import styles from './page.module.css'; // Anda bisa sesuaikan styling nanti
import ReactMarkdown from 'react-markdown'; // <-- TAMBAHKAN IMPORT INI
import KisiKisiTable from '../components/KisiKisiTable'; // <-- import komponen KisiKisiTable
import { generateRppDocx, generateMateriDocx, generateEvaluasiDocx } from '../utils/docx-generator.js';
import { FaCopy, FaCheck } from 'react-icons/fa'; // <-- TAMBAHKAN IMPORT INI

export default function Home() {
  // State untuk menyimpan input dari form
  const [mataPelajaran, setMataPelajaran] = useState('');
  const [kelas, setKelas] = useState('');
  const [topik, setTopik] = useState('');
  

  // State untuk menyimpan hasil dari Gemini
  const [isLoading, setIsLoading] = useState(false);
  const [hasil, setHasil] = useState(null);
  const [error, setError] = useState(null);  
  const [copiedItem, setCopiedItem] = useState(''); // <-- TAMBAHKAN STATE UNTUK MENYIMPAN ITEM YANG DI-COPY

// ...state untuk tab
  const [activeTab, setActiveTab] = useState('rpp');

  // Fungsi yang akan dijalankan saat tombol "Generate" di-klik
  const handleSubmit = async (e) => {
  e.preventDefault();
  setIsLoading(true);
  setHasil(null);
  setError(null);

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mataPelajaran, kelas, topik }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Terjadi kesalahan pada server.');
    }

    setHasil(data);
  } catch (err) {
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
};

const handleCopy = (text, itemName) => {
  navigator.clipboard.writeText(text).then(() => {
    setCopiedItem(itemName); // Set item mana yang disalin
    setTimeout(() => {
      setCopiedItem(''); // Reset setelah 2 detik
    }, 2000);
  }).catch(err => {
    console.error('Gagal menyalin teks: ', err);
  });
};

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>
          🚀 Asisten Guru Cerdas
          <br />      
                
        </h1>        

        <p className={styles.description}>
          Buat RPP, Kisi-Kisi, dan Soal Evaluasi dalam hitungan menit.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            value={mataPelajaran}
            onChange={(e) => setMataPelajaran(e.target.value)}
            placeholder="Mata Pelajaran (masukan mata pelajaran, misal: Matematika)"
            required
          />
          <input
            type="text"
            value={kelas}
            onChange={(e) => setKelas(e.target.value)}
            placeholder="Kelas (masukan kelas, misal: Kelas 7)"
            required
          />
          <input
            type="text"
            value={topik}
            onChange={(e) => setTopik(e.target.value)}
            placeholder="Topik/Materi Pokok"
            required
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Sedang Membuat...' : '✨ Generate Paket Mengajar'}
          </button>
        </form>

        {error && <p className={styles.error}>{error}</p>}

      {hasil && (
    <div className={styles.resultsContainer}>
        {/* Tombol-tombol Tab */}
      <div className={styles.tabs}>
        <button
          className={activeTab === 'rpp' ? styles.activeTab : ''}
          onClick={() => setActiveTab('rpp')}
        >
          RPP
        </button>
        
        <button
          className={activeTab === 'kisiKisi' ? styles.activeTab : ''}
          onClick={() => setActiveTab('kisiKisi')}
        >
          Kisi-Kisi
        </button>
        <button
          className={activeTab === 'soal' ? styles.activeTab : ''}
          onClick={() => setActiveTab('soal')}
        >
          Soal Evaluasi
        </button>
      </div>

    {/* Konten Tab */}

       
{/* Letakkan tombol download di sini, hanya muncul jika ada hasil */}
{hasil && (
    <div className={styles.downloadSection}>
        <button onClick={() => generateRppDocx(hasil.rpp)} className={styles.downloadButton}>
            📄 Download RPP
        </button>
        <button onClick={() => generateMateriDocx(hasil.materi)} className={styles.downloadButton}>
            📚 Download Materi
        </button>
        <button onClick={() => generateEvaluasiDocx(hasil.kisiKisi, hasil.soal)} className={styles.downloadButton}>
            📝 Download Evaluasi
        </button>
    </div>
)}
  <div className={styles.tabContent}>
  <div className={styles.contentWrapper}>
    {/* Tombol Salin akan ditempatkan di sini, di atas kontennya */}
    {activeTab === 'rpp' && (
      <>
        <button onClick={() => handleCopy(hasil.rpp, 'rpp')} className={styles.copyButton} title="Salin Teks">
          {copiedItem === 'rpp' ? <FaCheck color="green" /> : <FaCopy />}
        </button>
        <ReactMarkdown>{hasil.rpp}</ReactMarkdown>
      </>
    )}
      {activeTab === 'kisiKisi' && (
        <>
          <button onClick={() => handleCopy(hasil.kisiKisi, 'kisiKisi')} className={styles.copyButton}>
            {copiedItem === 'kisiKisi' ? '✅ Tersalin!' : 'Salin Teks'}
          </button>
          <KisiKisiTable text={hasil.kisiKisi} /> 
        </>
      )}
    {activeTab === 'soal' && (
      <>
        <button onClick={() => handleCopy(hasil.soal, 'soal')} className={styles.copyButton}>
          {copiedItem === 'soal' ? '✅ Tersalin!' : 'Salin Teks'}
        </button>
        <ReactMarkdown>{hasil.soal}</ReactMarkdown>
      </>
    )}
  </div>
</div>
    </div>
  )}  
      </main>
    </div>
  );
}