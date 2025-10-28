import React, { useState, useEffect, useCallback } from 'react';
import { AdConcept } from '../types';
import { XIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';

interface LightboxProps {
  concept: AdConcept;
  startIndex?: number;
  onClose: () => void;
}

export const Lightbox: React.FC<LightboxProps> = ({ concept, startIndex = 0, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const images = concept.imageUrls || [];

  const handleNext = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  }, [images.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, handleNext, handlePrev]);

  if (!images || images.length === 0) {
    return null;
  }
  
  const isCarousel = concept.placement === 'Carousel' && concept.carouselSlides && concept.carouselSlides[currentIndex];
  const currentHeadline = isCarousel ? concept.carouselSlides![currentIndex].headline : concept.headline;


  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <style>{`
          @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
          }
          .animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; }
      `}</style>
      <button
        className="absolute top-4 right-4 text-white hover:text-gray-300 z-50"
        onClick={onClose}
        aria-label="Close"
      >
        <XIcon className="w-8 h-8" />
      </button>

      <div
        className="relative w-full h-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on the image area
      >
        {images.length > 1 && (
          <button
            className="absolute left-4 md:left-8 text-white bg-black/30 rounded-full p-2 hover:bg-black/60 transition-colors z-50"
            onClick={handlePrev}
            aria-label="Previous image"
          >
            <ChevronLeftIcon className="w-8 h-8" />
          </button>
        )}

        <div className="relative max-w-full max-h-full flex items-center justify-center">
            <img
                src={images[currentIndex]}
                alt={`Lightbox image ${currentIndex + 1} of ${images.length}`}
                className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
             <div className="absolute bottom-4 md:bottom-8 left-0 right-0 p-4 text-center">
                <div className="inline-block bg-black/60 backdrop-blur-md rounded-lg p-3">
                    <p className="text-white font-bold text-lg md:text-xl drop-shadow-lg">{currentHeadline}</p>
                </div>
            </div>
        </div>


        {images.length > 1 && (
          <button
            className="absolute right-4 md:right-8 text-white bg-black/30 rounded-full p-2 hover:bg-black/60 transition-colors z-50"
            onClick={handleNext}
            aria-label="Next image"
          >
            <ChevronRightIcon className="w-8 h-8" />
          </button>
        )}
      </div>
       {images.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm px-3 py-1 rounded-full">
                {currentIndex + 1} / {images.length}
            </div>
        )}
    </div>
  );
};