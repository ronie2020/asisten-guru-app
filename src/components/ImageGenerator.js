// src/components/ImageGenerator.js
'use client';

import React from 'react'; // Tidak perlu useState lagi
import styles from '../app/page.module.css';
import { FaSearch } from 'react-icons/fa'; // Menggunakan ikon pencarian

/**
 * Komponen ini sekarang tidak membuat gambar, tetapi membuat link pencarian
 * ke Google Images berdasarkan prompt yang diberikan.
 */
const ImageGenerator = ({ prompt }) => {
    
    // Membuat URL pencarian Google Images yang aman
    const googleSearchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(prompt)}`;

    return (
        <div className={styles.imageGeneratorContainer}>
            <div className={styles.imagePlaceholder}>
                <div className={styles.imageIcon}><FaSearch /></div>
                <p className={styles.imagePromptDesc}>Saran pencarian gambar:</p>
                <p className={styles.imagePromptText}>{prompt}</p>
                
                {/* Tombol ini sekarang adalah sebuah link yang membuka tab baru */}
                <a 
                    href={googleSearchUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className={styles.generateImageButton}
                >
                    Cari Inspirasi Gambar
                </a>
            </div>
        </div>
    );
};

export default ImageGenerator;
