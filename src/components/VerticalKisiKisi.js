// src/components/VerticalKisiKisi.js

import React, { useMemo } from 'react';
import styles from '../app/page.module.css';

/**
 * Komponen ini sekarang bertugas mem-parsing string JSON dari AI
 * dan menampilkannya sebagai tabel HTML yang rapi, sama seperti di file unduhan.
 */
const VerticalKisiKisi = ({ text }) => {
  const tableData = useMemo(() => {
    if (!text || typeof text !== 'string') return null;
    
    try {
      // Logika cerdas untuk menemukan dan mengekstrak JSON dari dalam teks
      const startIndex = text.indexOf('[');
      const endIndex = text.lastIndexOf(']');

      if (startIndex > -1 && endIndex > -1) {
        const jsonString = text.substring(startIndex, endIndex + 1);
        const data = JSON.parse(jsonString);
        
        if (!Array.isArray(data) || data.length === 0) return null;

        // Ambil header dari kunci (keys) objek pertama di dalam array
        const headers = Object.keys(data[0]);
        // Ambil baris data (values) dari setiap objek
        const rows = data.map(item => Object.values(item));

        return { headers, rows };
      }
      
      return null; // Kembalikan null jika tidak ada JSON yang ditemukan

    } catch (error) {
      console.error("Gagal mem-parsing JSON untuk kisi-kisi:", text, error);
      // Fallback jika terjadi error, tampilkan teks mentah agar bisa di-debug
      return { error: text };
    }
  }, [text]);

  // Jangan tampilkan apa-apa jika data masih kosong atau belum valid
  if (!tableData) {
    return <p>Menunggu data kisi-kisi...</p>;
  }

  // Tampilkan pesan error jika parsing gagal
  if (tableData.error) {
    return <pre>{tableData.error}</pre>;
  }

  // Render data menjadi tabel HTML
  return (
    <div className={styles.tableContainer}>
      <table className={styles.kisiKisiTable}>
        <thead>
          <tr>
            {tableData.headers.map((header, index) => (
              <th key={index}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableData.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default VerticalKisiKisi;
