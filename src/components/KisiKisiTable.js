// src/components/KisiKisiTable.js

import React, { useMemo } from 'react';
import styles from '../app/page.module.css';

const KisiKisiTable = ({ text }) => {
  const tableData = useMemo(() => {
    if (!text || typeof text !== 'string') {
      return [];
    }

    // Memecah output menjadi blok-blok untuk setiap soal.
    // Pemisah adalah satu atau lebih baris kosong.
    const soalBlocks = text.split(/\n\s*\n/).filter(Boolean);

    const parsedSoals = soalBlocks.map(block => {
      const soalData = {};
      const lines = block.split('\n').filter(Boolean); // Pecah setiap blok menjadi barisan

      lines.forEach(line => {
        // --- PERBAIKAN UTAMA ADA DI SINI ---
        // 1. Cek dulu apakah baris mengandung ':'
        const separatorIndex = line.indexOf(':');
        if (separatorIndex > -1) {
          // 2. Ambil key dan value dengan cara yang lebih aman
          const key = line.substring(0, separatorIndex).trim();
          const value = line.substring(separatorIndex + 1).trim();
          
          // 3. Simpan ke objek dengan cara yang sederhana dan benar
          if (key && value) {
            soalData[key] = value;
          }
        }
      });
      return soalData;
    });

    // Filter untuk memastikan hanya objek yang punya data 'Nomor' yang masuk
    return parsedSoals.filter(soal => soal['Nomor']);

  }, [text]);

  if (tableData.length === 0) {
    // Jika parsing gagal total, tampilkan teks asli agar bisa di-debug
    return <pre>{text}</pre>;
  }

  return (
    <div className={styles.tableContainer}>
      <table className={styles.kisiKisiTable}>
        <thead>
          <tr>
            <th>No</th>
            <th>Indikator Soal</th>
            <th>Level Kognitif</th>
            <th>Bentuk Soal</th>
          </tr>
        </thead>
        <tbody>
          {tableData.map((soal, index) => (
            <tr key={index}>
              {/* Ambil data dari objek yang sudah diparsing */}
              <td>{soal['Nomor'] || '-'}</td>
              <td>{soal['Indikator Soal'] || '-'}</td>
              <td>{soal['Level Kognitif'] || '-'}</td>
              <td>{soal['Bentuk Soal'] || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default KisiKisiTable;