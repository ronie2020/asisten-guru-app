// src/components/VerticalKisiKisi.js

import React, { useMemo } from 'react';
import styles from '../app/page.module.css';

const VerticalKisiKisi = ({ text }) => {
  const parsedData = useMemo(() => {
    if (!text || typeof text !== 'string') return [];
    
    try {
      const startIndex = text.indexOf('[');
      const endIndex = text.lastIndexOf(']');

      if (startIndex > -1 && endIndex > -1) {
        const jsonString = text.substring(startIndex, endIndex + 1);
        const data = JSON.parse(jsonString);
        return Array.isArray(data) ? data : [];
      }
      
      return [];

    } catch (error) {
      console.error("Gagal mem-parsing JSON untuk kisi-kisi:", text, error);
      return [{ error: "Format data kisi-kisi dari AI tidak valid." }];
    }
  }, [text]);

  if (parsedData.length === 0) {
    return <p>Menunggu data kisi-kisi...</p>;
  }

  if (parsedData[0]?.error) {
    return <p className={styles.error}>{parsedData[0].error}</p>;
  }

  return (
    <div className={styles.tableContainer}>
      <table className={styles.kisiKisiTable}>
        <thead>
          <tr>
            {Object.keys(parsedData[0]).map((header, index) => (
              <th key={index}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {parsedData.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {Object.values(row).map((cell, cellIndex) => (
                <td key={cellIndex}>{String(cell)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default VerticalKisiKisi;
