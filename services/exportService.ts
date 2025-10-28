import JSZip from 'jszip';
import * as FileSaver from 'file-saver';
import { AdConcept } from '../types';

// Helper function to convert base64 to blob
const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
};

/**
 * Renders text on top of a base64 image using a canvas.
 * @param base64Image The source image in base64 format.
 * @param text The text to overlay on the image.
 * @returns A promise that resolves to the new base64 image with text.
 */
const renderTextOnImage = (base64Image: string, text: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context'));
            }

            // Set canvas dimensions to match image
            canvas.width = img.width;
            canvas.height = img.height;

            // Draw the original image
            ctx.drawImage(img, 0, 0);

            // --- Text Styling ---
            const padding = canvas.width * 0.05; // 5% padding
            const maxTextWidth = canvas.width - (padding * 2);
            let fontSize = Math.max(24, Math.round(canvas.width / 20)); // Responsive font size
            ctx.font = `bold ${fontSize}px 'Helvetica Neue', sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillStyle = 'white';
            ctx.textBaseline = 'bottom';

            // Adjust font size if text is too wide
            while (ctx.measureText(text).width > maxTextWidth && fontSize > 16) {
                fontSize--;
                ctx.font = `bold ${fontSize}px 'Helvetica Neue', sans-serif`;
            }

            // --- Text Background ---
            const textMetrics = ctx.measureText(text);
            const textHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;
            const bgHeight = textHeight + (padding * 0.8);
            const bgY = canvas.height - bgHeight - padding;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(padding, bgY, maxTextWidth, bgHeight);

            // --- Draw Text ---
            ctx.fillStyle = 'white';
            ctx.fillText(text, canvas.width / 2, canvas.height - padding * 1.4);

            resolve(canvas.toDataURL('image/jpeg', 0.9));
        };
        img.onerror = () => reject(new Error('Image failed to load for canvas rendering.'));
        img.src = base64Image;
    });
};


export const exportConceptsToZip = async (concepts: AdConcept[]) => {
    const zip = new JSZip();

    if (concepts.length === 0) {
        alert("No creative concepts to export.");
        return;
    }

    // 1. Create CSV file
    const headers = [
        "adSetName", "headline", "hook", "personaDescription", "personaAge", "personaCreatorType",
        "angle", "trigger", "format", "placement", "awarenessStage", "visualVehicle", "visualPrompt", "carouselSlides"
    ];
    let csvContent = headers.join(',') + '\n';
    
    concepts.forEach(concept => {
        const carouselSlidesData = concept.carouselSlides ? JSON.stringify(concept.carouselSlides).replace(/"/g, '""') : '';
        const row = [
            `"${concept.adSetName || ''}"`,
            `"${concept.headline.replace(/"/g, '""')}"`,
            `"${concept.hook.replace(/"/g, '""')}"`,
            `"${concept.personaDescription.replace(/"/g, '""')}"`,
            `"${concept.personaAge}"`,
            `"${concept.personaCreatorType}"`,
            `"${concept.angle.replace(/"/g, '""')}"`,
            `"${concept.trigger}"`,
            `"${concept.format}"`,
            `"${concept.placement}"`,
            `"${concept.awarenessStage}"`,
            `"${concept.visualVehicle.replace(/"/g, '""')}"`,
            `"${concept.visualPrompt.replace(/"/g, '""')}"`,
            `"${carouselSlidesData}"`
        ];
        csvContent += row.join(',') + '\n';
    });

    zip.file("concepts.csv", csvContent);

    // 2. Add images to a folder, rendering text on them
    const imagesFolder = zip.folder("images");
    if (imagesFolder) {
        const imagePromises = concepts
            .filter(concept => concept.imageUrls && concept.imageUrls.length > 0)
            .flatMap(concept => 
                concept.imageUrls!.map(async (imageUrl, index) => {
                    const isCarousel = concept.placement === 'Carousel' && concept.carouselSlides && concept.carouselSlides[index];
                    const textToRender = isCarousel ? concept.carouselSlides![index].headline : concept.headline;

                    const finalImageBase64 = await renderTextOnImage(imageUrl, textToRender);

                    const parts = finalImageBase64.split(',');
                    const mimeType = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
                    const base64Data = parts[1];
                    const blob = base64ToBlob(base64Data, mimeType);
                    const fileExtension = mimeType.split('/')[1] || 'jpg';
                    
                    const baseFilename = concept.adSetName || concept.id;
                    const filename = concept.imageUrls!.length > 1
                        ? `${baseFilename}_slide_${index + 1}.${fileExtension}`
                        : `${baseFilename}.${fileExtension}`;
                        
                    imagesFolder.file(filename, blob, { base64: true });
                })
            );
        await Promise.all(imagePromises);
    }
    
    // 3. Generate and download zip
    const zipBlob = await zip.generateAsync({ type: "blob" });
    FileSaver.saveAs(zipBlob, "ad_concepts_export.zip");
};