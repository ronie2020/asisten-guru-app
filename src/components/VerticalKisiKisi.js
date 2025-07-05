// src/components/VerticalKisiKisi.js

import React, { useMemo } from 'react';
import styles from '../app/page.module.css';

/**
 * Komponen ini sekarang bertugas mem-parsing string JSON
 * dan menampilkannya dalam format kartu vertikal yang mudah dibaca.
 */
const VerticalKisiKisi = ({ text }) => {
  const parsedData = useMemo(() => {
    if (!text || typeof text !== 'string') return [];
    
    try {
      // Logika untuk secara cerdas menemukan dan mem-parsing JSON di dalam teks
      const startIndex = text.indexOf('[');
      const endIndex = text.lastIndexOf(']');

      if (startIndex > -1 && endIndex > -1) {
        const jsonString = text.substring(startIndex, endIndex + 1);
        const data = JSON.parse(jsonString);
        return Array.isArray(data) ? data : [];
      }
      
      return []; // Kembalikan array kosong jika tidak ada JSON yang ditemukan

    } catch (error) {
      console.error("Gagal mem-parsing JSON untuk kisi-kisi:", text, error);
      // Fallback jika string yang diekstrak ternyata tetap tidak valid
      return [{ error: "Format data kisi-kisi dari AI tidak valid." }];
    }
  }, [text]);

  // Jangan tampilkan apa-apa jika data masih kosong
  if (parsedData.length === 0) {
    return <p>Menunggu data kisi-kisi...</p>;
  }

  // Tampilkan pesan error jika parsing gagal
  if (parsedData[0]?.error) {
    return <p className={styles.error}>{parsedData[0].error}</p>;
  }

  // Render data dalam format kartu vertikal per soal
  return (
    <div>
      {parsedData.map((row, index) => (
        <div key={index} className={styles.kisiKisiCard}>
          {Object.entries(row).map(([key, value]) => (
            <div key={key} className={styles.kisiKisiRow}>
              <strong className={styles.kisiKisiLabel}>{key}:</strong>
              <span>{value}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default VerticalKisiKisi;
