import React, { useState, useRef } from 'react';
import { UploadIcon } from './icons';

interface InputFormProps {
  onGenerate: (image: string, caption: string, productInfo: string, offerInfo: string) => void;
}

export const InputForm: React.FC<InputFormProps> = ({ onGenerate }) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [caption, setCaption] = useState<string>('');
  const [productInfo, setProductInfo] = useState<string>('');
  const [offerInfo, setOfferInfo] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // Ensure result is not null and is a data URL before splitting
            if (result && result.includes(',')) {
                resolve(result.split(',')[1]);
            } else {
                reject(new Error("Invalid file data URL."));
            }
        };
        reader.onerror = error => reject(error);
    });
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!imageFile) {
      alert('Silakan unggah gambar referensi.');
      return;
    }
    setIsLoading(true);
    try {
        const base64Data = await fileToBase64(imageFile);
        onGenerate(base64Data, caption, productInfo, offerInfo);
    } catch (error) {
        console.error("Error reading file:", error);
        alert('Gagal membaca file gambar.');
        setIsLoading(false); // Reset loading state on error
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="max-w-4xl mx-auto bg-brand-surface rounded-xl shadow-2xl p-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-brand-text-primary">Mulai Dari Satu Iklan Referensi</h2>
        <p className="text-brand-text-secondary mt-2">Unggah satu iklan dan berikan konteks untuk menghasilkan puluhan konsep baru yang unik.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div 
            className="w-full aspect-square border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center text-center p-4 cursor-pointer hover:border-brand-primary transition-colors"
            onClick={triggerFileSelect}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
              ref={fileInputRef}
              disabled={isLoading}
            />
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="max-h-full max-w-full object-contain rounded-md" />
            ) : (
              <div className="text-brand-text-secondary">
                <UploadIcon className="mx-auto h-12 w-12" />
                <p className="mt-2 font-semibold">Klik untuk unggah gambar</p>
                <p className="text-xs">PNG, JPG, WEBP</p>
              </div>
            )}
          </div>

          <div className="flex flex-col h-full space-y-4">
            <div>
              <label htmlFor="caption" className="block text-sm font-medium text-brand-text-secondary mb-2">Teks / Caption Iklan</label>
              <textarea
                id="caption"
                rows={4}
                className="w-full bg-gray-900 border border-gray-700 rounded-md p-3 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors disabled:opacity-50"
                placeholder="Contoh: Capek bolak-balik ngepel lantai karena kotor terus? Coba deh pembersih lantai X, sekali usap langsung kinclong!"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="productInfo" className="block text-sm font-medium text-brand-text-secondary mb-2">Deskripsi Produk/Layanan (Opsional)</label>
              <textarea
                id="productInfo"
                rows={3}
                className="w-full bg-gray-900 border border-gray-700 rounded-md p-3 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors disabled:opacity-50"
                placeholder="Contoh: Pembersih lantai organik dengan wangi lavender, aman untuk anak dan hewan peliharaan."
                value={productInfo}
                onChange={(e) => setProductInfo(e.target.value)}
                disabled={isLoading}
              />
            </div>
             <div>
              <label htmlFor="offerInfo" className="block text-sm font-medium text-brand-text-secondary mb-2">Penawaran / CTA (Opsional)</label>
              <textarea
                id="offerInfo"
                rows={3}
                className="w-full bg-gray-900 border border-gray-700 rounded-md p-3 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors disabled:opacity-50"
                placeholder="Contoh: Beli 1 gratis 1 khusus hari ini! Klik link di bio untuk membeli."
                value={offerInfo}
                onChange={(e) => setOfferInfo(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <button
            type="submit"
            disabled={!imageFile || isLoading}
            className="w-full md:w-auto px-12 py-3 bg-brand-primary text-white font-bold rounded-lg hover:bg-indigo-500 transition-transform transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center mx-auto"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Memproses...
              </>
            ) : (
              'Hasilkan Konsep Iklan Baru'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};