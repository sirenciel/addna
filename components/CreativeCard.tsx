import React, { useState } from 'react';
import { AdConcept, CreativeFormat, PlacementFormat, MindMapNode } from '../types';
import { EditIcon, ClipboardCopyIcon, SparklesIcon, RefreshCwIcon } from './icons';

interface CreativeCardProps {
  node: MindMapNode;
  onGenerateImage: (id: string) => void;
  onEditConcept: (id: string) => void;
  onEvolveConcept: (id: string) => void;
  onOpenLightbox: (concept: AdConcept, startIndex: number) => void;
  className?: string;
}

export const CreativeCard: React.FC<CreativeCardProps> = ({ node, onGenerateImage, onEditConcept, onEvolveConcept, onOpenLightbox, className = '' }) => {
    const [copyButtonText, setCopyButtonText] = useState('Salin Teks');
    const [currentSlide, setCurrentSlide] = useState(0);

    if (node.type !== 'creative') return null;
    const concept = (node.content as { concept: AdConcept }).concept;

    const handleCopy = () => {
        const textToCopy = `Headline: ${concept.headline}\nHook: ${concept.hook}`;
        navigator.clipboard.writeText(textToCopy);
        setCopyButtonText('Disalin!');
        setTimeout(() => setCopyButtonText('Salin Teks'), 2000);
    };

    const awarenessColorMap = {
        "Unaware": "bg-red-500",
        "Problem Aware": "bg-orange-500",
        "Solution Aware": "bg-yellow-500",
        "Product Aware": "bg-green-500",
    }

    const formatColorMap: Record<CreativeFormat, string> = {
        'UGC': 'bg-sky-500',
        'Before & After': 'bg-amber-500',
        'Comparison': 'bg-purple-500',
        'Demo': 'bg-teal-500',
        'Testimonial': 'bg-pink-500',
        'Problem/Solution': 'bg-rose-500',
        'Educational/Tip': 'bg-lime-500',
        'Storytelling': 'bg-fuchsia-500',
    };
    
    const placementColorMap: Record<PlacementFormat, string> = {
        'Carousel': 'bg-indigo-500',
        'Instagram Feed': 'bg-cyan-500',
        'Instagram Story': 'bg-violet-500',
    };
    
    const totalImages = concept.imageUrls?.length || 0;
    const isCarousel = concept.placement === 'Carousel';

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentSlide(prev => (prev === 0 ? totalImages - 1 : prev - 1));
    };
    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentSlide(prev => (prev === totalImages - 1 ? 0 : prev + 1));
    };

    const currentHeadline = isCarousel && concept.carouselSlides && concept.carouselSlides[currentSlide]
        ? concept.carouselSlides[currentSlide].headline
        : concept.headline;

    return (
        <div className={`bg-brand-surface border border-gray-700 rounded-lg shadow-md flex flex-col transition-shadow hover:shadow-brand-secondary/20 overflow-hidden w-full h-full ${className}`}>
            <div 
                className={`relative w-full aspect-square flex-shrink-0 group ${totalImages > 0 ? 'cursor-pointer' : ''}`}
                onClick={() => {
                    if (concept.imageUrls && concept.imageUrls.length > 0) {
                        onOpenLightbox(concept, currentSlide);
                    }
                }}
            >
                 {concept.isGenerating ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900/50">
                        <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <p className="text-xs mt-2">{isCarousel ? 'Membuat gambar carousel...' : 'Membuat gambar...'}</p>
                    </div>
                ) : concept.error ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-red-900/50 p-2 text-center">
                        <p className="text-sm font-semibold">Gagal</p>
                        <p className="text-xs text-white/70 mt-1">{concept.error}</p>
                         <button onClick={() => onGenerateImage(node.id)} className="mt-2 text-xs bg-brand-primary px-2 py-1 rounded hover:bg-indigo-500">Coba Lagi</button>
                    </div>
                ) : totalImages > 0 ? (
                    <>
                        <img src={concept.imageUrls![currentSlide]} alt={`${concept.headline} - slide ${currentSlide + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                            <p className="text-white text-center font-bold text-base drop-shadow-lg" style={{textShadow: '1px 1px 3px rgba(0,0,0,0.7)'}}>{currentHeadline}</p>
                        </div>
                        {totalImages > 1 && (
                            <>
                                <button onClick={handlePrev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1 hover:bg-black/80 transition-opacity opacity-0 group-hover:opacity-100">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                                </button>
                                <button onClick={handleNext} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1 hover:bg-black/80 transition-opacity opacity-0 group-hover:opacity-100">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                </button>
                                <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
                                    {currentSlide + 1} / {totalImages}
                                </div>
                            </>
                        )}
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-900/50">
                        <button onClick={(e) => { e.stopPropagation(); onGenerateImage(node.id); }} className="px-4 py-2 bg-brand-secondary text-white font-semibold rounded-lg hover:bg-green-500 transition-colors">
                            {isCarousel ? 'Buat Gambar Carousel' : 'Buat Gambar'}
                        </button>
                    </div>
                )}
            </div>
            <div className="p-3 flex-grow flex flex-col justify-between">
                <div>
                     <div className="flex justify-between items-start gap-2 mb-1">
                        <h5 className="font-bold text-sm leading-tight pr-1">{concept.headline}</h5>
                        <div className="flex-shrink-0 flex flex-col items-end gap-1">
                            {concept.trigger && (
                                <span className="text-xs px-1.5 py-0.5 rounded-full text-white font-semibold whitespace-nowrap bg-orange-600">
                                    🔥 {concept.trigger}
                                </span>
                            )}
                            <span className={`text-xs px-1.5 py-0.5 rounded-full text-black font-semibold whitespace-nowrap ${awarenessColorMap[concept.awarenessStage] || 'bg-gray-400'}`}>
                                {concept.awarenessStage.replace(' Aware', '')}
                            </span>
                            {concept.format && (
                                <span className={`text-xs px-1.5 py-0.5 rounded-full text-white font-semibold whitespace-nowrap ${formatColorMap[concept.format] || 'bg-gray-400'}`}>
                                    {concept.format}
                                </span>
                            )}
                             {concept.placement && (
                                <span className={`text-xs px-1.5 py-0.5 rounded-full text-white font-semibold whitespace-nowrap ${placementColorMap[concept.placement] || 'bg-gray-400'}`}>
                                    {concept.placement}
                                </span>
                            )}
                        </div>
                    </div>
                    <p className="text-xs text-brand-text-secondary line-clamp-2">{concept.hook}</p>
                </div>
                <div className="flex items-center gap-1 mt-2">
                    <button onClick={() => onEditConcept(node.id)} title="Edit Detail & Prompt" className="flex-1 text-xs bg-gray-700 hover:bg-gray-600 p-1.5 rounded-md flex items-center justify-center gap-1"><EditIcon className="w-3 h-3"/> Detail</button>
                    <button onClick={handleCopy} title="Salin Teks" className="flex-1 text-xs bg-gray-700 hover:bg-gray-600 p-1.5 rounded-md flex items-center justify-center gap-1"><ClipboardCopyIcon className="w-3 h-3"/> {copyButtonText}</button>
                    <button 
                        onClick={() => onEvolveConcept(node.id)} 
                        disabled={concept.isEvolving}
                        title="Buat variasi dari konsep ini" 
                        className="flex-1 text-xs bg-gray-700 hover:bg-gray-600 p-1.5 rounded-md flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                        {concept.isEvolving ? <RefreshCwIcon className="w-3 h-3 animate-spin" /> : <SparklesIcon className="w-3 h-3"/>}
                        Evolusi
                    </button>
                </div>
            </div>
        </div>
    );
};