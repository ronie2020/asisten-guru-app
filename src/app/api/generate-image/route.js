// src/components/ImageGenerator.js
'use client';

import { useState } from 'react';
import styles from '../app/page.module.css';
import { FaImage, FaSpinner } from 'react-icons/fa';

const ImageGenerator = ({ prompt }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [imageUrl, setImageUrl] = useState(null);
    const [error, setError] = useState(null);

    const handleGenerate = async () => {
        setIsLoading(true);
        setError(null);
        setImageUrl(null);

        try {
            const response = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });

            if (!response.ok) {
                throw new Error('Gagal membuat gambar.');
            }

            const data = await response.json();
            setImageUrl(data.imageUrl);

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.imageGeneratorContainer}>
            {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt={prompt} className={styles.generatedImage} />
            ) : (
                <div className={styles.imagePlaceholder}>
                    <div className={styles.imageIcon}><FaImage /></div>
                    {/* Menggunakan kutip tunggal untuk menghindari peringatan linter */}
                    <p className={styles.imagePromptDesc}>'{prompt}'</p>
                    {isLoading ? (
                        <div className={styles.loadingSpinner}>
                            <FaSpinner className={styles.spinnerIcon} />
                            <span>Membuat gambar...</span>
                        </div>
                    ) : (
                        <button onClick={handleGenerate} className={styles.generateImageButton}>
                            Generate Gambar
                        </button>
                    )}
                    {error && <p className={styles.imageError}>{error}</p>}
                </div>
            )}
        </div>
    );
};

export default ImageGenerator;
