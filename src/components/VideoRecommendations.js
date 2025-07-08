// src/components/VideoRecommendations.js

import React, { useMemo } from 'react';
import styles from '../app/page.module.css';
import { FaYoutube } from 'react-icons/fa';

/**
 * Komponen untuk mem-parsing dan menampilkan rekomendasi video.
 */
const VideoRecommendations = ({ text }) => {
  const videos = useMemo(() => {
    if (!text || typeof text !== 'string') return [];

    // Pecah teks menjadi blok-blok untuk setiap video
    const blocks = text.trim().split(/\n\s*\n/);

    return blocks.map(block => {
      const titleMatch = block.match(/Judul Video:\s*(.*)/);
      const descMatch = block.match(/Deskripsi:\s*(.*)/);

      const title = titleMatch ? titleMatch[1] : 'Judul tidak ditemukan';
      const description = descMatch ? descMatch[1] : 'Deskripsi tidak tersedia.';
      
      // Buat link pencarian YouTube yang aman
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(title)}`;

      return { title, description, searchUrl };
    });
  }, [text]);

  if (videos.length === 0) {
    return <p>Menunggu rekomendasi video...</p>;
  }

  return (
    <div className={styles.videoContainer}>
      {videos.map((video, index) => (
        <div key={index} className={styles.videoCard}>
          <h4 className={styles.videoTitle}>{video.title}</h4>
          <p className={styles.videoDesc}>{video.description}</p>
          <a href={video.searchUrl} target="_blank" rel="noopener noreferrer" className={styles.videoLink}>
            <FaYoutube /> Cari di YouTube
          </a>
        </div>
      ))}
    </div>
  );
};

export default VideoRecommendations;
