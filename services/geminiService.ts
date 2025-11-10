import { GoogleGenAI, Modality, Type } from "@google/genai";
import { CampaignBlueprint, AdConcept, CreativeFormat, PlacementFormat, AwarenessStage, TargetPersona, BuyingTriggerObject, CarouselSlide, ObjectionObject, PainDesireObject, OfferTypeObject, PivotType, PivotConfig, AdDnaComponent, AdDna, RemixSuggestion, VisualStyleDNA, ALL_CREATIVE_FORMATS, ALL_PLACEMENT_FORMATS, ALL_AWARENESS_STAGES } from '../types';

// Utility to convert file to base64
const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

const imageB64ToGenerativePart = (base64Data: string, mimeType: string = 'image/jpeg') => {
  return {
    inlineData: {
      data: base64Data,
      mimeType: mimeType,
    },
  };
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Strategic Constants ---

const COMPOSITION_FOR_ADS: Record<PlacementFormat, string> = {
    'Instagram Story': 'Biarkan 25% bagian atas kosong untuk headline. Subjek utama di sepertiga tengah-bawah. Jangan pernah menutupi wajah subjek dengan teks.',
    'Instagram Feed': 'Ikuti Aturan Sepertiga atau alur baca pola-Z. Sediakan ruang kosong untuk teks overlay. Jangan pernah menutupi wajah subjek.',
    'Carousel': 'Slide 1: Subjek di tengah dengan latar belakang jelas. Slide 2-5: Komposisi bervariasi dengan zona teks yang konsisten. Jangan pernah menutupi wajah subjek utama.'
};

const CAROUSEL_ARCS: Record<string, string> = {
    'PAS': 'PAS (Problem-Agitate-Solution). Ideal untuk respons langsung. Slide 1 (Hook): Sebutkan MASALAH dengan cara yang mengejutkan atau relatable. Slide 2 (Agitate): Deskripsikan RASA SAKIT dan frustrasi dari masalah tersebut. Mengapa begitu buruk? Slide 3 (Solution): Perkenalkan produk Anda sebagai SOLUSI. Momen "aha!". Slide 4 (Proof): Tunjukkan bukti bahwa itu berhasil (testimoni, data, sebelum/sesudah). Slide 5 (CTA): Beri tahu mereka apa yang harus dilakukan selanjutnya.',
    'Transformation': 'Transformasi: Narasi Sebelum & Sesudah. Terbaik untuk format Sebelum & Sesudah, Testimoni. Slide 1 (Hook): Tunjukkan kondisi SETELAH yang luar biasa. Slide 2 (Sebelum): Ungkap kondisi SEBELUM yang menyakitkan. Slide 3 (Perjuangan): Rincikan perjalanan dan upaya yang gagal. Slide 4 (Penemuan): Bagaimana mereka menemukan solusi Anda. Slide 5 (CTA): Ajak orang lain untuk memulai transformasi mereka.',
    'Educational': 'Edukasi: Ajarkan sesuatu yang berharga. Terbaik untuk format "Edukasi/Tips" atau "Demo". Struktur: (Hook yang Menarik -> Patahkan Mitos 1 -> Patahkan Mitos 2 -> Ungkap Kebenaran/Metode -> Tautan CTA/Produk)',
    'Testimonial Story': 'Kisah Testimoni: Cerita yang berpusat pada pelanggan. Gunakan untuk format "Testimoni" atau "UGC". Struktur: (Hook dengan kutipan kuat -> Perkenalkan pelanggan & kisah mereka -> Hasil spesifik yang mereka dapatkan -> Bagaimana produk memungkinkannya -> CTA)'
};

// --- Strategic Helpers ---
const getRecommendedFormats = (
    awarenessStage: AwarenessStage,
    trigger: BuyingTriggerObject,
    persona: TargetPersona
): CreativeFormat[] => {
    if (awarenessStage === 'Tidak Sadar' || awarenessStage === 'Sadar Masalah') {
        return ['UGC', 'Meme/Iklan Jelek', 'Edukasi/Tips', 'Masalah/Solusi'];
    }
    if (awarenessStage === 'Sadar Solusi') {
        return ['Perbandingan', 'Demo', 'Sebelum & Sesudah', 'Iklan Artikel'];
    }
    if (awarenessStage === 'Sadar Produk') {
        return ['Testimoni', 'Penawaran Langsung', 'UGC', 'Multi-Produk'];
    }
    if (trigger.name === 'Otoritas') {
        return ['Testimoni', 'Edukasi/Tips', 'Iklan Artikel', 'Advertorial'];
    }
    return ALL_CREATIVE_FORMATS;
};


const addMockPerformanceSignals = (concept: Omit<AdConcept, 'imageUrls'>): Omit<AdConcept, 'imageUrls'> => {
    const potentials: AdConcept['performanceSignals']['scalingPotential'][] = ['limited', 'moderate', 'high'];
    return {
        ...concept,
        statusTag: 'Pengujian',
        performanceSignals: {
            scalingPotential: potentials[Math.floor(Math.random() * 3)],
        }
    };
};

// --- JSON Schemas for robust generation ---

const campaignBlueprintSchema = {
    type: Type.OBJECT,
    properties: {
        productAnalysis: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING },
                keyBenefit: { type: Type.STRING }
            },
            required: ['name', 'keyBenefit']
        },
        targetPersona: {
            type: Type.OBJECT,
            properties: {
                description: { type: Type.STRING },
                age: { type: Type.STRING },
                creatorType: { type: Type.STRING },
                painPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                desiredOutcomes: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['description', 'age', 'creatorType', 'painPoints', 'desiredOutcomes']
        },
        adDna: {
            type: Type.OBJECT,
            properties: {
                salesMechanism: { type: Type.STRING },
                copyPattern: { type: Type.STRING },
                persuasionFormula: { type: Type.STRING },
                specificLanguagePatterns: { type: Type.ARRAY, items: { type: Type.STRING } },
                toneOfVoice: { type: Type.STRING },
                socialProofElements: { type: Type.STRING },
                objectionHandling: { type: Type.STRING },
                visualStyle: { type: Type.STRING },
                offerSummary: { type: Type.STRING },
                cta: { type: Type.STRING },
                targetCountry: { type: Type.STRING }
            },
            required: [
                'salesMechanism', 'copyPattern', 'persuasionFormula', 'specificLanguagePatterns', 
                'toneOfVoice', 'socialProofElements', 'objectionHandling', 'visualStyle', 
                'offerSummary', 'cta', 'targetCountry'
            ]
        }
    },
    required: ['productAnalysis', 'targetPersona', 'adDna']
};

const targetPersonaSchema = {
    type: Type.OBJECT,
    properties: {
        description: { type: Type.STRING },
        age: { type: Type.STRING },
        creatorType: { type: Type.STRING },
        painPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
        desiredOutcomes: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ['description', 'age', 'creatorType', 'painPoints', 'desiredOutcomes']
};

const painDesireObjectSchema = {
    type: Type.OBJECT,
    properties: {
        type: { type: Type.STRING, enum: ['Pain', 'Desire'] },
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        emotionalImpact: { type: Type.STRING }
    },
    required: ['type', 'name', 'description', 'emotionalImpact']
};

const objectionObjectSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        counterAngle: { type: Type.STRING }
    },
    required: ['name', 'description', 'counterAngle']
};

const offerTypeObjectSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        psychologicalPrinciple: { type: Type.STRING }
    },
    required: ['name', 'description', 'psychologicalPrinciple']
};

const buyingTriggerObjectSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        example: { type: Type.STRING },
        analysis: { type: Type.STRING }
    },
    required: ['name', 'description', 'example', 'analysis']
};

const carouselSlideSchema = {
    type: Type.OBJECT,
    properties: {
        slideNumber: { type: Type.INTEGER },
        visualPrompt: { type: Type.STRING },
        headline: { type: Type.STRING },
        description: { type: Type.STRING }
    },
    required: ['slideNumber', 'visualPrompt', 'headline', 'description']
};

const adConceptSchema = {
    type: Type.OBJECT,
    properties: {
        id: { type: Type.STRING },
        angle: { type: Type.STRING },
        trigger: buyingTriggerObjectSchema,
        format: { type: Type.STRING },
        placement: { type: Type.STRING },
        awarenessStage: { type: Type.STRING },
        strategicPathId: { type: Type.STRING },
        personaDescription: { type: Type.STRING },
        personaAge: { type: Type.STRING },
        personaCreatorType: { type: Type.STRING },
        visualVehicle: { type: Type.STRING },
        hook: { type: Type.STRING },
        headline: { type: Type.STRING },
        visualPrompt: { type: Type.STRING },
        adSetName: { type: Type.STRING },
        offer: offerTypeObjectSchema,
        carouselSlides: { type: Type.ARRAY, items: carouselSlideSchema },
        triggerImplementationProof: {
            type: Type.OBJECT,
            properties: {
                copyChecklistItemUsed: {
                    type: Type.STRING,
                    description: "Quote the specific copy element that implements the trigger checklist"
                },
                visualChecklistItemUsed: {
                    type: Type.STRING,
                    description: "Describe the specific visual element that implements the trigger checklist"
                }
            },
            required: ['copyChecklistItemUsed', 'visualChecklistItemUsed']
        }
    },
     required: [
        'id', 'angle', 'trigger', 'format', 'placement', 'awarenessStage', 'strategicPathId', 
        'personaDescription', 'personaAge', 'personaCreatorType', 'visualVehicle', 'hook', 
        'headline', 'visualPrompt', 'adSetName', 'offer', 'triggerImplementationProof'
    ]
};

const pivotAdConceptSchema = {
    type: Type.OBJECT,
    properties: {
        ...adConceptSchema.properties,
    },
    required: adConceptSchema.required,
};

const visualStyleDnaSchema = {
    type: Type.OBJECT,
    properties: {
        colorPalette: { type: Type.STRING, description: "Describe dominant colors and mood (e.g., 'Warm earth tones with vibrant orange accents')" },
        lightingStyle: { type: Type.STRING, description: "Natural/Studio/Dramatic/etc + time of day" },
        compositionApproach: { type: Type.STRING, description: "Rule of thirds/Center-focused/Z-pattern/etc" },
        photographyStyle: { type: Type.STRING, description: "UGC raw/Professional editorial/Lifestyle/etc" },
        modelStyling: { type: Type.STRING, description: "Describe hair, makeup, clothing aesthetic" },
        settingType: { type: Type.STRING, description: "Indoor studio/Outdoor urban/Home setting/etc" },
    },
    required: ["colorPalette", "lightingStyle", "compositionApproach", "photographyStyle", "modelStyling", "settingType"]
};


export const analyzeCampaignBlueprint = async (imageBase64: string, caption: string, productInfo: string, offerInfo: string): Promise<CampaignBlueprint> => {
  const imagePart = imageB64ToGenerativePart(imageBase64, 'image/jpeg');
  const prompt = `
    Sebagai AHLI COPYWRITING DIRECT RESPONSE kelas dunia, tugas Anda adalah menganalisis materi iklan dan konteks yang diberikan untuk merekayasa balik "DNA PENJUALAN" dan membuat "Blueprint Kampanye" yang komprehensif. Tujuan Anda bukan hanya mendeskripsikan apa yang Anda lihat, tetapi untuk memahami secara mendalam strategi persuasi yang digunakan.

    KONTEKS:
    - Caption Iklan: "${caption}"
    - Deskripsi Produk/Layanan: "${productInfo || 'Tidak diberikan. Simpulkan dari iklan.'}"
    - Penawaran/CTA: "${offerInfo || 'Tidak diberikan. Simpulkan dari iklan.'}"

    Berdasarkan semua informasi yang diberikan (gambar dan teks), hasilkan objek JSON terstruktur untuk Blueprint Kampanye.

    Hanya berikan respons berupa satu objek JSON yang valid dan sesuai dengan skema yang disediakan.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: [{ parts: [imagePart, { text: prompt }] }],
    config: {
        responseMimeType: "application/json",
        responseSchema: campaignBlueprintSchema,
    }
  });

  const rawJson = response.text;
  return JSON.parse(rawJson) as CampaignBlueprint;
};

export const generatePersonaVariations = async (blueprint: CampaignBlueprint, existingPersonas: TargetPersona[]): Promise<TargetPersona[]> => {
    const prompt = `
        Anda adalah seorang ahli segmentasi pasar yang menggunakan ilmu audiens terbaru dari Meta.
        
        **WAWASAN KUNCI DARI META:**
        "Motivator yang berbeda membuka audiens baru 89% dari waktu."
        Artinya: Produk yang sama, pendorong psikologis yang BERBEDA = audiens BARU.
        
        **Tugas Anda:**
        Hasilkan 3 variasi persona yang mewakili MOTIVATOR BERBEDA untuk membeli produk yang sama.
        
        **Persona & Motivator Asli:**
        - ${blueprint.targetPersona.description}
        - Poin Masalah Utama: ${blueprint.targetPersona.painPoints[0]}
        - Keinginan Utama: ${blueprint.targetPersona.desiredOutcomes[0]}
        
        **Persona yang Sudah Ada untuk Dihindari:**
        ${existingPersonas.map(p => `- ${p.description}`).join('\n')}
        
        **🎯 Strategi Variasi (Pilih 3 jenis yang berbeda):**
        
        1️⃣ **Pergeseran Usia/Tahap Kehidupan:**
           - Jika asli profesional 25-35 → coba mahasiswa 18-24 ATAU mapan 40-50
           - Motivator baru: Prioritas hidup yang berbeda (membangun karir vs. keluarga vs. warisan)
        
        2️⃣ **Pergeseran Pendapatan/Aspirasi:**
           - Jika asli berpenghasilan menengah → coba sadar anggaran ATAU mencari premium
           - Motivator baru: Persamaan nilai berubah (termurah vs. terbaik vs. status)
        
        3️⃣ **Pergeseran Kasus Penggunaan/Konteks:**
           - Jika asli menggunakan produk untuk bekerja → coba untuk rekreasi/hobi ATAU sebagai hadiah
           - Motivator baru: "Pekerjaan yang harus diselesaikan" yang berbeda (produktivitas vs. kesenangan vs. hubungan)
        
        4️⃣ **Pergeseran Psikografis:**
           - Jika asli menghindari risiko → coba pengadopsi awal/pembuat tren
           - Motivator baru: Pendorong keputusan yang berbeda (keamanan vs. inovasi vs. bukti sosial)
        
        5️⃣ **Balik Gender (jika relevan):**
           - Jika asli perempuan → coba persona laki-laki dengan poin masalah yang berbeda
           - Motivator baru: Kekhawatiran atau aspirasi spesifik gender
        
        **Persyaratan Output:**
        - Setiap persona HARUS memiliki motivator utama yang JELAS BERBEDA
        - Poin masalah harus mencerminkan motivator baru (bukan hanya diubah kata-katanya)
        - Usia, tipe kreator, dan hasil yang diinginkan semuanya harus mendukung psikologi baru
        - Jadilah spesifik: "Ibu 2 anak yang sibuk, bekerja dari rumah" BUKAN "Profesional yang bekerja"
        
        Hanya berikan respons berupa array JSON dari 3 objek persona.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ parts: [{ text: prompt }] }],
        config: { 
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: targetPersonaSchema,
            },
        }
    });
    const rawJson = response.text;
    const cleanedJson = rawJson.replace(/^```json\s*|```$/g, '');
    return JSON.parse(cleanedJson);
};

export const generatePainDesires = async (blueprint: CampaignBlueprint, persona: TargetPersona): Promise<PainDesireObject[]> => {
    const prompt = `
        Anda adalah seorang master psikolog konsumen. Tugas Anda adalah mengidentifikasi pendorong emosional terdalam untuk persona target tertentu.
        Berdasarkan konteks kampanye yang diberikan, hasilkan campuran 4 pendorong emosional inti yang berbeda: 2 Poin Masalah (ketakutan, frustrasi) dan 2 Keinginan (aspirasi, tujuan).

        **Konteks:**
        - **Produk:** ${blueprint.productAnalysis.name} - Ini memecahkan masalah dengan memberikan "${blueprint.productAnalysis.keyBenefit}".
        - **Persona Target:** ${persona.description}
        - **Poin Masalah yang Diketahui:** ${persona.painPoints.join(', ')}
        - **Keinginan yang Diketahui:** ${persona.desiredOutcomes.join(', ')}
        - **Negara Target untuk Lokalisasi:** "${blueprint.adDna.targetCountry}"

        **Instruksi:**
        1.  Lihat lebih dalam dari poin masalah dan keinginan yang dangkal. Gali *keadaan emosional yang mendasarinya*.
        2.  Untuk setiap pendorong, definisikan "type" sebagai "Pain" (Masalah) atau "Desire" (Keinginan).
        3.  Berikan "name" (nama) yang singkat dan berdampak (misalnya, "Takut Ketinggalan", "Keinginan untuk Percaya Diri Tanpa Usaha").
        4.  Berikan "description" (deskripsi) yang menjelaskan pendorong dari sudut pandang persona.
        5.  Berikan "emotionalImpact" (dampak emosional) yang menggambarkan perasaan mentah yang disebabkan oleh pendorong ini (misalnya, "Kecemasan dan tekanan sosial", "Kebebasan dan keyakinan diri").

        **Output:**
        Hanya berikan respons berupa array JSON yang valid dari 4 objek (2 Poin Masalah, 2 Keinginan) yang sesuai dengan skema.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ text: prompt }],
        config: {
            responseMimeType: "application/json",
            responseSchema: { type: Type.ARRAY, items: painDesireObjectSchema }
        }
    });
    const rawJson = response.text;
    const cleanedJson = rawJson.replace(/^```json\s*|```$/g, '');
    return JSON.parse(cleanedJson);
};

export const generateObjections = async (blueprint: CampaignBlueprint, persona: TargetPersona, painDesire: PainDesireObject): Promise<ObjectionObject[]> => {
    const prompt = `
        Anda adalah seorang peneliti pasar dan psikolog penjualan berpengalaman. Tugas Anda adalah memprediksi 3 keberatan PALING MUNGKIN yang akan dimiliki oleh persona tertentu, yang berasal langsung dari pendorong emosional inti (poin masalah atau keinginan).

        **Konteks:**
        - **Produk:** ${blueprint.productAnalysis.name} (Manfaat Utama: ${blueprint.productAnalysis.keyBenefit})
        - **Penawaran:** ${blueprint.adDna.offerSummary}
        - **Persona Target:** ${persona.description}
        - **Negara Target untuk Lokalisasi:** "${blueprint.adDna.targetCountry}"

        **🔥 Pendorong Emosional Inti:**
        - **Tipe:** ${painDesire.type}
        - **Nama:** "${painDesire.name}"
        - **Deskripsi:** "${painDesire.description}"
        - **Dampak Emosional:** "${painDesire.emotionalImpact}"

        **Instruksi:**
        1.  Hubungkan titik-titiknya: Bagaimana janji produk berinteraksi dengan pendorong emosional spesifik ini untuk menciptakan skeptisisme atau keraguan?
        2.  Untuk setiap keberatan, berikan "name" (nama) yang singkat dan jelas (misalnya, "Ini tidak akan berhasil untuk situasi SAYA yang spesifik", "Hasilnya terlihat terlalu bagus untuk menjadi kenyataan", "Mungkin terlalu mahal untuk nilainya").
        3.  Berikan "description" (deskripsi) yang menjelaskan psikologi di balik keberatan tersebut, menghubungkannya kembali ke pendorong emosional inti.
        4.  Berikan "counterAngle" (sudut pandang tandingan) strategis yang menyarankan cara terbaik untuk mengatasi keberatan ini dalam sebuah iklan.

        **Output:**
        Hanya berikan respons berupa array JSON yang valid dari 3 objek keberatan yang sesuai dengan skema.
    `;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: objectionObjectSchema
            }
        }
    });
    const rawJson = response.text;
    const cleanedJson = rawJson.replace(/^```json\s*|```$/g, '');
    return JSON.parse(cleanedJson);
};

export const generateOfferTypes = async (blueprint: CampaignBlueprint, persona: TargetPersona, objection: ObjectionObject): Promise<OfferTypeObject[]> => {
    const prompt = `
        Anda adalah seorang master pemasar dan ekonom perilaku. Tugas Anda adalah merancang 3 "Jenis Penawaran" yang berbeda dan menarik, yang dirancang khusus untuk menetralkan keberatan pelanggan.

        **Konteks:**
        - **Produk:** ${blueprint.productAnalysis.name} (Manfaat: ${blueprint.productAnalysis.keyBenefit})
        - **Penawaran Asli:** ${blueprint.adDna.offerSummary}
        - **Persona Target:** ${persona.description}
        - **Negara Target untuk Lokalisasi:** "${blueprint.adDna.targetCountry}"

        **🔥 Keberatan Pelanggan yang Harus Diatasi:**
        - **Nama Keberatan:** "${objection.name}"
        - **Psikologi:** "${objection.description}"

        **Instruksi:**
        1.  Analisis keberatan tersebut. Apa ketakutan atau kekhawatiran dasarnya? (misalnya, Takut rugi, skeptisisme, sensitivitas harga).
        2.  Hasilkan 3 struktur penawaran berbeda yang secara langsung mengatasi masalah dasar ini.
        3.  Untuk setiap penawaran, berikan:
            - "name" (nama) yang jelas (misalnya, "Uji Coba 30 Hari Bebas Risiko", "Diskon Bundel Hemat", "Cicilan Bayar dalam 3 Kali").
            - "description" (deskripsi) yang menjelaskan cara kerja penawaran untuk pelanggan.
            - "psychologicalPrinciple" (prinsip psikologis) inti yang bekerja (misalnya, "Pembalikan Risiko", "Penjangkaran Nilai", "Pengurangan Rasa Sakit Pembayaran").

        **Output:**
        Hanya berikan respons berupa array JSON yang valid dari 3 objek penawaran yang sesuai dengan skema.
    `;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ text: prompt }],
        config: {
            responseMimeType: "application/json",
            responseSchema: { type: Type.ARRAY, items: offerTypeObjectSchema }
        }
    });
    const rawJson = response.text;
    return JSON.parse(rawJson.replace(/^```json\s*|```$/g, ''));
};


export const generateHighLevelAngles = async (blueprint: CampaignBlueprint, persona: TargetPersona, awarenessStage: AwarenessStage, objection: ObjectionObject, painDesire: PainDesireObject, offer: OfferTypeObject, existingAngles: string[] = []): Promise<string[]> => {
    const prompt = `
        Anda adalah seorang ahli strategi kreatif. Tugas Anda adalah menghasilkan 4 sudut pandang strategis tingkat tinggi yang berbeda untuk sebuah kampanye iklan.
        **BATASAN KRITIS:**
        1. Setiap sudut pandang HARUS secara langsung melawan keberatan pelanggan tertentu.
        2. Setiap sudut pandang HARUS beresonansi dengan pendorong emosional inti (Poin Masalah/Keinginan).
        3. Setiap sudut pandang HARUS dibingkai dalam konteks Jenis Penawaran yang diberikan.

        **Blueprint Kampanye:**
        - Manfaat Produk: ${blueprint.productAnalysis.keyBenefit}
        - Strategi Persuasi Inti: Gunakan nada "${blueprint.adDna.toneOfVoice}" untuk menerapkan formula "${blueprint.adDna.persuasionFormula}".
        - Negara Target: ${blueprint.adDna.targetCountry}

        **Persona Target:**
        - Deskripsi: ${persona.description}

        **🔥 Pendorong Emosional Inti:**
        - **Tipe:** ${painDesire.type}
        - **Nama:** "${painDesire.name}"

        **🔥 Keberatan Pelanggan yang Harus Diatasi:**
        - **Nama Keberatan:** "${objection.name}"
        - **Strategi Tandingan yang Disarankan:** "${objection.counterAngle}"

        **🔥 Jenis Penawaran Strategis:**
        - **Nama Penawaran:** "${offer.name}"
        - **Psikologi:** "${offer.psychologicalPrinciple}"

        **🔥 Tahap Kesadaran Target:** ${awarenessStage}

        **Tugas Anda:**
        Berdasarkan semua konteks di atas, hasilkan 4 sudut pandang strategis.
        1. Sudut pandang harus disesuaikan untuk seseorang dalam tahap "${awarenessStage}".
        2. **Yang terpenting, setiap sudut pandang harus merupakan eksekusi kreatif dari strategi tandingan, sambil juga terhubung dengan pendorong emosional inti dan memanfaatkan penawaran yang diberikan.**
        3. Gunakan "Strategi Tandingan yang Disarankan" dan "Jenis Penawaran Strategis" sebagai inspirasi utama Anda.

        ${existingAngles.length > 0 ? `PENTING: Jangan menghasilkan sudut pandang berikut, karena sudah ada: ${existingAngles.join(', ')}.` : ''}

        Hanya berikan respons berupa array JSON dari 4 string sudut pandang unik. Contohnya: ["Tonjolkan uji coba bebas risiko untuk membangun kepercayaan dan melawan skeptisisme", "Tampilkan nilai jangka panjang dan ROI dari bundel untuk membenarkan harga", "Tunjukkan kesederhanaan produk dan kemudian sajikan rencana cicilan yang mudah"]
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ parts: [{ text: prompt }] }],
        config: { 
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        }
    });
    const rawJson = response.text;
    const cleanedJson = rawJson.replace(/^```json\s*|```$/g, '');
    return JSON.parse(cleanedJson);
};

export const generateBuyingTriggers = async (blueprint: CampaignBlueprint, persona: TargetPersona, angle: string, awarenessStage: AwarenessStage): Promise<BuyingTriggerObject[]> => {
    const prompt = `
        Anda adalah seorang Pelatih Copywriting Direct Response. Tujuan Anda adalah untuk mengedukasi pengiklan tentang pemicu psikologis terbaik untuk digunakan dalam kampanye mereka dengan membuat "Swipe File" mini.
        Berdasarkan konteks kampanye, pilih 4 pemicu psikologis PALING RELEVAN dan KUAT dari daftar yang telah ditentukan di bawah ini. Pemicu harus sesuai untuk tahap kesadaran audiens.
        Kemudian, untuk setiap pemicu yang dipilih, jelaskan dengan jelas, berikan contoh konkret, dan analisis mengapa contoh itu berhasil untuk audiens spesifik ini.

        **Daftar Pemicu Psikologis yang Telah Ditentukan:**
        - **Bukti Sosial:** Orang percaya pada apa yang dilakukan orang lain. (misalnya, "Bergabunglah dengan 10.000+ pelanggan yang puas").
        - **Otoritas:** Orang percaya pada para ahli dan sumber yang kredibel. (misalnya, "Direkomendasikan oleh para dermatologis ternama").
        - **Kelangkaan:** Orang menginginkan apa yang langka atau terbatas. (misalnya, "Hanya tersisa 50 stok!").
        - **Urgensi:** Orang bertindak ketika ada batas waktu. (misalnya, "Diskon berakhir malam ini!").
        - **Timbal Balik:** Orang merasa wajib memberi kembali setelah menerima sesuatu. (misalnya, "Dapatkan panduan gratis & lihat cara kerjanya").
        - **Rasa Suka:** Orang membeli dari mereka yang mereka kenal, sukai, dan percayai. (misalnya, menggunakan influencer yang relatable).
        - **Takut Ketinggalan (FOMO):** Orang tidak ingin ketinggalan pengalaman positif. (misalnya, "Lihat apa yang sedang dibicarakan semua orang").
        - **Eksklusivitas:** Orang ingin menjadi bagian dari kelompok terpilih. (misalnya, "Dapatkan akses ke komunitas pribadi kami").
        - **Kepuasan Instan:** Orang menginginkan hasil sekarang juga. (misalnya, "Lihat hasil nyata hanya dalam 3 hari").

        **Konteks:**
        - **Produk:** ${blueprint.productAnalysis.name}
        - **Manfaat Utama:** ${blueprint.productAnalysis.keyBenefit}
        - **Persona Target:** ${persona.description} (Poin Masalah: ${persona.painPoints.join(', ')})
        - **Sudut Pandang Strategis:** "${angle}"
        - **Tahap Kesadaran:** "${awarenessStage}"
        - **Negara Target untuk Lokalisasi:** "${blueprint.adDna.targetCountry}"

        **Instruksi:**
        1.  Analisis konteks dan pilih 4 pemicu terbaik dari daftar. Untuk tahap "Tidak Sadar" atau "Sadar Masalah", pemicu seperti Timbal Balik atau Rasa Suka lebih baik. Untuk "Sadar Solusi" atau "Sadar Produk", pemicu seperti Kelangkaan atau Bukti Sosial lebih efektif.
        2.  Untuk setiap pemicu yang dipilih, buat objek JSON dengan empat bidang seperti yang didefinisikan dalam skema: "name", "description", "example", dan "analysis".
        3.  "example" harus berupa cuplikan teks iklan atau ide visual yang spesifik dan dapat ditindaklanjuti yang beresonansi di "${blueprint.adDna.targetCountry}".
        4.  **Yang terpenting, bidang "analysis" harus menjelaskan dalam 1-2 kalimat MENGAPA contoh ini efektif untuk persona dan konteks spesifik ini, seolah-olah Anda sedang memberikan anotasi pada iklan yang sukses di swipe file.**

        **Output:**
        Hanya berikan respons berupa array JSON yang valid dari 4 objek ini. Jangan sertakan teks atau markdown lain.
    `;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ parts: [{ text: prompt }] }],
        config: { 
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: buyingTriggerObjectSchema
            }
        }
    });
    const rawJson = response.text;
    const cleanedJson = rawJson.replace(/^```json\s*|```$/g, '');
    return JSON.parse(cleanedJson);
};

export const getBuyingTriggerDetails = async (triggerName: string, blueprint: CampaignBlueprint, persona: TargetPersona, angle: string): Promise<BuyingTriggerObject> => {
    const prompt = `
        Anda adalah seorang Pelatih Copywriting Direct Response.
        Tugas Anda adalah memberikan detail untuk pemicu psikologis tertentu dalam konteks kampanye yang diberikan, termasuk analisis "swipe file".

        **Pemicu Psikologis yang Perlu Dirinci:** "${triggerName}"

        **Konteks Kampanye:**
        - **Produk:** ${blueprint.productAnalysis.name}
        - **Manfaat Utama:** ${blueprint.productAnalysis.keyBenefit}
        - **Persona Target:** ${persona.description} (Poin Masalah: ${persona.painPoints.join(', ')})
        - **Sudut Pandang Strategis:** "${angle}"
        - **Negara Target untuk Lokalisasi:** "${blueprint.adDna.targetCountry}"

        **Instruksi:**
        1.  Berikan "description" (deskripsi) yang jelas dan ringkas untuk "${triggerName}".
        2.  Buat "example" (contoh) konkret tentang bagaimana pemicu ini berlaku langsung pada konteks kampanye yang diberikan.
        3.  Berikan "analysis" (analisis) yang menjelaskan dalam 1-2 kalimat MENGAPA contoh ini akan efektif untuk persona dan konteks spesifik ini.
        4.  Kembalikan satu objek JSON dengan empat bidang: "name" (yang seharusnya "${triggerName}"), "description", "example", dan "analysis".

        **Output:**
        Hanya berikan respons berupa satu objek JSON yang valid dan sesuai dengan skema. Jangan sertakan teks atau markdown lain.
    `;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
            responseMimeType: "application/json",
            responseSchema: buyingTriggerObjectSchema
        }
    });
    const rawJson = response.text;
    const cleanedJson = rawJson.replace(/^```json\s*|```$/g, '');
    return JSON.parse(cleanedJson);
};

const HEADLINE_FORMULAS: Record<AwarenessStage, string[]> = {
    'Tidak Sadar': [
        'Pola Aneh/Kontrarian: "Stop [Saran Umum]. (Ini cara yang benar)."',
        'Pertanyaan Fokus-Masalah: "Apakah Anda juga [Masalah yang sangat spesifik dan relatable]?"',
    ],
    'Sadar Masalah': [
        'Masalah → Solusi: "[Masalah Menyakitkan]? → Ini solusinya."',
        'Hilangkan Rasa Sakit: "Ucapkan Selamat Tinggal pada [Rasa Sakit/Masalah]."',
    ],
    'Sadar Solusi': [
        'Hasil + Jangka Waktu: "Dapatkan [Hasil Spesifik] dalam [Jangka Waktu] (Tanpa [Pengorbanan])"',
        'Transformasi Sebelum/Sesudah: "Dari [Kondisi Buruk] menjadi [Kondisi Baik] dalam [Jangka Waktu]."',
        'Perintah Langsung + Manfaat: "[Kata Kerja Aksi] untuk [Manfaat Utama]."',
    ],
    'Sadar Produk': [
        'Kredibilitas Berbasis Angka: "[Jumlah] [Tipe Orang] telah beralih ke [Produk Anda]."',
        'Penawaran Langsung: "Dapatkan [Penawaran Spesifik Anda] - Hanya [Elemen Urgensi/Kelangkaan]."',
    ]
};

const TRIGGER_IMPLEMENTATION_CHECKLIST: Record<string, { copyMust: string[], visualMust: string[] }> = {
    'Bukti Sosial': {
        copyMust: ["Sebutkan angka spesifik (misal, 'Bergabung dengan 10.000+ pelanggan bahagia')", "Kutip testimoni nyata ('Ini mengubah segalanya bagi saya.' - Jane D.)", "Gunakan kata-kata aksi kolektif seperti 'terbukti', 'semua orang menggunakan'"],
        visualMust: ["Tampilkan beberapa orang yang menggunakan produk dengan senang", "Tampilkan overlay kutipan/rating testimoni pada gambar", "Tampilkan kolase konten buatan pengguna (UGC) atau 'lautan wajah'"]
    },
    'Otoritas': {
        copyMust: ["Sebutkan ahli atau otoritas yang diakui (misal, 'Direkomendasikan oleh Dr. Anya Sharma')", "Sebutkan sertifikasi atau studi ('Terbukti secara klinis untuk...')", "Gunakan bahasa otoritas: 'Para ahli mengatakan', 'Studi menunjukkan'"],
        visualMust: ["Tampilkan seorang ahli di lingkungannya (jas lab, klinik, kantor)", "Tampilkan lencana sertifikasi resmi atau logo 'Seperti yang Dilihat Di'", "Tampilkan visualisasi data atau grafik dari sebuah studi"]
    },
    'Kelangkaan': {
        copyMust: ["Sebutkan kuantitas terbatas secara eksplisit ('Hanya 100 unit tersisa')", "Sebutkan eksklusivitas ('Desain edisi terbatas')", "Ciptakan ketakutan akan kehilangan ('Setelah habis, tidak akan ada lagi')"],
        visualMust: ["Tampilkan bar stok yang hampir kosong", "Tampilkan stempel 'Hampir Habis' atau 'Edisi Terbatas'", "Tampilkan seseorang bergegas untuk mengambil item terakhir"]
    },
    'Urgensi': {
        copyMust: ["Sertakan tenggat waktu yang eksplisit ('Diskon 50% berakhir malam ini')", "Sebutkan konsekuensi dari penundaan ('Harga naik besok')", "Gunakan bahasa yang peka waktu: 'Sekarang', 'Segera'"],
        visualMust: ["Tampilkan timer hitung mundur atau grafik", "Tampilkan kalender dengan tanggal hari ini dilingkari merah", "Tampilkan seseorang yang tampak stres sambil melirik jam"]
    },
    'Timbal Balik': {
        copyMust: ["Tawarkan sesuatu yang berharga secara gratis ('Dapatkan panduan gratis Anda')", "Bingkai sebagai memberi sebelum meminta ('Kami ingin Anda mencobanya terlebih dahulu')", "Gunakan bahasa kemurahan hati: 'Hadiah untuk Anda', 'Dari kami untuk Anda'"],
        visualMust: ["Tampilkan item gratis/bonus secara menonjol", "Tampilkan seseorang yang senang menerima hadiah gratis", "Tampilkan lencana 'GRATIS' atau visual kado"]
    },
    'Rasa Suka': {
        copyMust: ["Gunakan nada yang ramah dan percakapan", "Bagikan cerita pribadi atau relatable ('Saya dulu juga seperti itu')", "Gunakan bahasa inklusif: 'Kita semua tahu perasaan itu'"],
        visualMust: ["Tampilkan influencer atau orang yang relatable dengan persona target", "Tampilkan senyum tulus dan kontak mata yang hangat", "Gunakan latar yang kasual dan otentik, bukan studio yang kaku"]
    },
    'Takut Ketinggalan (FOMO)': {
        copyMust: ["Tonjolkan pengalaman orang lain ('Lihat apa yang semua orang bicarakan')", "Tekankan tren atau gerakan ('Jangan menjadi satu-satunya yang ketinggalan')", "Gunakan bahasa FOMO: 'Jangan sampai ketinggalan', 'Semua orang melakukannya'"],
        visualMust: ["Tampilkan kerumunan orang yang menikmati produk", "Tampilkan skenario 'semua orang memilikinya kecuali Anda'", "Tampilkan seseorang yang 'tertinggal' vs. kelompok yang bahagia dengan produk"]
    },
    'Eksklusivitas': {
        copyMust: ["Tekankan akses terbatas ('Hanya untuk anggota', 'Khusus undangan')", "Sebutkan status VIP atau premium", "Gunakan bahasa eksklusif: 'Tidak tersedia untuk umum', 'Koleksi pribadi'"],
        visualMust: ["Tampilkan kartu VIP atau keanggotaan", "Tampilkan tanda 'hanya untuk anggota'", "Tampilkan kemasan mewah atau premium"]
    },
    'Kepuasan Instan': {
        copyMust: ["Janjikan hasil cepat ('Lihat hasilnya dalam 3 hari', 'Langsung terasa bedanya')", "Tekankan kecepatan dan kemudahan ('Cepat', 'Instan', 'Tanpa repot')", "Gunakan bahasa yang mendesak: 'Dapatkan sekarang juga', 'Langsung'"],
        visualMust: ["Tampilkan transformasi cepat (visual fast-forward)", "Tampilkan jam atau timer yang menunjukkan durasi singkat", "Tampilkan seseorang yang terkejut dengan cepatnya hasil"]
    }
};

export const generateCreativeIdeas = async (blueprint: CampaignBlueprint, angle: string, trigger: BuyingTriggerObject, awarenessStage: AwarenessStage, format: CreativeFormat, placement: PlacementFormat, persona: TargetPersona, strategicPathId: string, allowVisualExploration: boolean, offer: OfferTypeObject, preferredCarouselArc?: string): Promise<Omit<AdConcept, 'imageUrls'>[]> => {
    const recommendedFormats = getRecommendedFormats(awarenessStage, trigger, persona);
    const formatStrategy = `
        **STRATEGI FORMAT (Gunakan Panduan Ini):**
        Berdasarkan tahap kesadaran "${awarenessStage}" dan pemicu "${trigger.name}", format yang DIREKOMENDASIKAN adalah: ${recommendedFormats.join(', ')}.
        
        Anda diberi format "${format}". Jika format ini TIDAK ada dalam daftar yang direkomendasikan, Anda harus mengadaptasi eksekusi Anda agar berfungsi dengan sangat baik untuk kombinasi tahap/pemicu ini.
        
        **Tolok Ukur Kinerja Meta Saat Ini (Q4 2024):**
        - Statis: Menang jika memiliki visual BOLD + headline numerik + teks yang menyenangkan.
        - HP (Pendiri/Ahli): Menang dengan otoritas + penanganan keberatan + "Kita vs Mereka".
        - UGC: Menang melalui KERAGAMAN kreator (4-5 sudut pandang berbeda, bukan 1 kreator).
    `;

    let carouselArcGuidance = '';
    if (placement === 'Carousel') {
        carouselArcGuidance = preferredCarouselArc
            ? `ANDA HARUS menggunakan alur "${preferredCarouselArc}": ${CAROUSEL_ARCS[preferredCarouselArc]}`
            : `Pilih alur yang PALING TEPAT dari: ${Object.keys(CAROUSEL_ARCS).join(', ')}`;
    }

    const formatInstructions: Record<CreativeFormat, string> = {
        'UGC': "Simulasikan video atau foto asli buatan pengguna. Nada harus otentik, tidak terlalu dipoles. Prompt visual harus mendeskripsikan suasana yang realistis. KHUSUS UNTUK UGC: Tren terbaru menekankan 'keragaman kreator'. Pastikan visualPrompt mencerminkan persona ini secara otentik (gaya 'TikTok Shop-style' yang sederhana) dan bukan UGC yang terlalu dipoles.",
        'Sebelum & Sesudah': "Tunjukkan dengan jelas keadaan 'sebelum' yang menunjukkan masalah dan keadaan 'sesudah' yang menunjukkan solusi yang diberikan oleh produk. Transformasi harus jelas.",
        'Perbandingan': "Bandingkan produk secara langsung atau tidak langsung dengan alternatif (misalnya, 'cara lama'). Tonjolkan fitur atau manfaat unggulan produk.",
        'Demo': "Tunjukkan produk sedang beraksi. Prompt visual harus fokus pada produk yang digunakan dan fungsionalitas utamanya.",
        'Testimoni': "Tampilkan pelanggan yang puas. Hook dan headline harus dibaca seperti kutipan. Prompt visual harus menggambarkan seseorang yang mewakili persona target, terlihat bahagia dan percaya diri.",
        'Masalah/Solusi': "Mulai dengan menyajikan masalah umum yang dihadapi persona target dengan jelas. Agitasi masalah dengan mendeskripsikan frustrasi yang ditimbulkannya. Terakhir, sajikan produk sebagai solusi sempurna. Visual harus menggambarkan keadaan 'masalah' atau 'solusi' dengan jelas.",
        'Edukasi/Tips': "Berikan nilai asli dengan mengajarkan audiens sesuatu yang berguna terkait dengan domain produk. Bingkai iklan sebagai tips bermanfaat atau 'cara cepat'. Produk harus diintegrasikan secara alami sebagai alat untuk mencapai hasil dari tips tersebut.",
        'Bercerita': "Ceritakan kisah pendek yang relatable di mana seorang karakter (mewakili persona) mengatasi tantangan menggunakan produk. Narasi harus memiliki awal, tengah, dan akhir yang jelas. Fokusnya harus pada perjalanan emosional dan transformasi.",
        'Iklan Artikel': "Simulasikan cuplikan artikel berita atau posting blog otoritatif. Visual harus terlihat seperti tangkapan layar publikasi online berkualitas tinggi, dengan headline dan gambar yang menarik yang terasa seperti konten editorial.",
        'Layar Terpisah': "Buat visual yang secara harfiah terbagi dua. Satu sisi menunjukkan 'masalah' atau 'cara lama', dan sisi lain menunjukkan 'solusi' dengan produk Anda. Kontrasnya harus tajam dan langsung dapat dipahami.",
        'Advertorial': "Rancang iklan yang meniru gaya konten editorial dari majalah atau blog tepercaya. Harus menarik secara visual, informatif, dan tidak terlalu 'menjual' pada pandangan pertama. Teks harus bersifat edukatif atau didorong oleh cerita.",
        'Listicle': "Bingkai iklan sebagai daftar, seperti '5 Alasan Mengapa...' atau '3 Kesalahan Teratas...'. Untuk carousel, setiap slide adalah satu poin dalam daftar. Untuk gambar statis, visual harus mewakili poin #1, dengan headline yang menggoda daftar tersebut.",
        'Multi-Produk': "Tampilkan beberapa produk sekaligus, baik sebagai bundel, koleksi, atau berbagai pilihan. Prompt visual harus dengan jelas mengatur produk-produk dengan cara yang menarik, menyoroti nilai dari grup tersebut.",
        'Kita vs Mereka': "Ciptakan kontras yang kuat antara merek/produk Anda (Kami) dan persaingan atau cara lama yang inferior (Mereka). Visual dan teks harus dengan jelas menetapkan dua sisi yang berlawanan dan memposisikan produk Anda sebagai pemenang yang jelas.",
        'Meme/Iklan Jelek': "Gunakan format meme yang sedang populer atau buat desain 'jelek' yang disengaja dan berkualitas rendah yang terlihat seperti postingan asli dan organik. Tujuannya adalah untuk menghentikan guliran melalui humor, keterkaitan, dan dengan menghindari tampilan iklan yang dipoles.",
        'Penawaran Langsung': "Jadikan penawaran sebagai pahlawan mutlak dari iklan. Visual harus berani dan berpusat pada diskon, bonus, atau penawaran khusus (misalnya, 'DISKON 50%' dalam teks besar). Teks harus langsung dan jelas menjelaskan penawaran serta urgensi/kelangkaannya."
    };

    const placementInstructions: Record<PlacementFormat, string> = {
        'Carousel': `**MANDAT PEMBUATAN CAROUSEL**: 
1.  **ATURAN KONSISTENSI VISUAL CAROUSEL**:
    - **SEMUA** slide harus memiliki: Palet warna yang sama, Gaya pencahayaan yang sama (misalnya, semua golden hour ATAU semua studio), Model/subjek yang sama (orang yang sama di semua slide).
    - **VARIASIKAN** hanya elemen-elemen ini per slide: Aksi/pose subjek, Properti/objek dalam adegan, Zona overlay teks (tetapi pertahankan penempatan yang konsisten).
2.  ${carouselArcGuidance}
3.  Setelah memilih alur, hasilkan array 'carouselSlides' dengan tepat 5 slide yang mengikuti struktur narasinya.
4.  **KRITIS**: Anda harus mengikuti alur kerja COPY-FIRST. Pertama, tulis copy (headline, deskripsi) untuk semua 5 slide. KEMUDIAN, untuk setiap copy slide, buat 'visualPrompt' yang merupakan interpretasi visual langsung dari pesan slide spesifik tersebut dan mengikuti aturan komposisi untuk Carousel.
5.  Slide terakhir HARUS selalu berupa Ajakan Bertindak (CTA) yang menggabungkan penawaran: "${offer.name}".
6.  Semua teks HARUS dalam bahasa ${blueprint.adDna.targetCountry} dan sesuai dengan nada ${blueprint.adDna.toneOfVoice}.`,
        'Instagram Feed': "Desain untuk rasio aspek 1:1 atau 4:5. Visual harus berkualitas tinggi dan menghentikan guliran. Hook harus berupa pertanyaan yang menarik atau pernyataan berani untuk mendorong interaksi di caption.",
        'Instagram Story': "Desain untuk rasio aspek vertikal 9:16. Visual harus terasa asli dan otentik dengan platform. Hook harus cepat dan tajam. Prompt visual dapat menyarankan overlay teks atau elemen interaktif."
    };
    
    const triggerKey = Object.keys(TRIGGER_IMPLEMENTATION_CHECKLIST).find(k => k.toLowerCase() === trigger.name.toLowerCase()) || trigger.name;
    const triggerChecklist = TRIGGER_IMPLEMENTATION_CHECKLIST[triggerKey] || { copyMust: [], visualMust: [] };

    const prompt = `
        Anda adalah seorang copywriter direct response dan direktur kreatif kelas dunia. Tugas Anda adalah menghasilkan sebuah array berisi 3 konsep iklan yang **berbeda secara strategis** berdasarkan satu brief. Anda harus mengikuti semua prinsip dan alur kerja yang disediakan.

        ---
        **PRINSIP INTI YANG TIDAK BISA DITAWAR (DALAM KONTEKS INDONESIA):**
        1.  **Asumsikan Zero Brand Awareness:** Tulis untuk audiens dingin. Kejelasan > Kecerdasan.
        2.  **Fokus pada Masalah atau Hasil:** Fokus pada apa yang dipedulikan pengguna, bukan fitur.
        3.  **Spesifisitas = Kredibilitas:** Gunakan angka dan detail konkret.

        **ALUR KERJA WAJIB: COPY-FIRST**
        Proses Anda untuk SETIAP konsep harus: Pertama, tulis kata-kata yang menjual (hook, headline). Kedua, buat visual yang membuat kata-kata itu 10x lebih kuat.

        **🔥 MISI INTI ANDA: VARIASI TES A/B (Kerangka Tiga Pintu Masuk)**
        Sangat PENTING bahwa ketiga konsep tersebut BUKAN hanya versi yang diubah kata-katanya satu sama lain. Anda HARUS menghasilkan tiga hipotesis kreatif yang benar-benar berbeda:
        - **Konsep 1 - "Pintu Masuk Emosional"**: Berawal dari perasaan, identitas, atau aspirasi. Menjawab "Bagaimana ini akan membuat saya merasa?"
        - **Konsep 2 - "Pintu Masuk Logis"**: Berawal dari logika, bukti, data, atau mekanisme unik. Menjawab "Bagaimana cara kerjanya?"
        - **Konsep 3 - "Pintu Masuk Sosial"**: Berawal dari komunitas, suku, atau bukti sosial. Menjawab "Siapa lagi yang menggunakan ini?"
        
        ${formatStrategy}

        **🔥 MANDAT DIFERENSIASI VISUAL (KRITIS UNTUK ENTITY ID META):**
        Setiap dari 3 konsep HARUS memiliki ciri visual yang BERBEDA SECARA FUNDAMENTAL:
        - **Konsep 1 (Pintu Masuk Emosional) Gaya Visual:** Latar: Ruang pribadi, intim (kamar tidur, mobil). Pencahayaan: Lembut, hangat, golden hour. Kamera: Close-up pada ekspresi. Aksi: Kontemplatif, rentan.
        - **Konsep 2 (Pintu Masuk Logis) Gaya Visual:** Latar: Lingkungan "demo" yang bersih (meja, lab). Pencahayaan: Terang, merata, klinis. Kamera: Medium shot menunjukkan produk + konteks. Aksi: Demonstratif, instruksional.
        - **Konsep 3 (Pintu Masuk Sosial) Gaya Visual:** Latar: Ruang sosial, publik (kafe, gym). Pencahayaan: Alami, realistis. Kamera: Wide shot menunjukkan konteks grup. Aksi: Interaktif, dinamika grup.

        **PEMERIKSAAN ATURAN ENTITY ID META:** Sebelum menyelesaikan 3 prompt visual Anda, tanyakan: "Jika saya menunjukkan 3 gambar ini berdampingan TANPA teks, akankah manusia segera melihat bahwa mereka berasal dari 3 kampanye iklan yang berbeda?" Jika TIDAK, BUAT ULANG.
        ---
        **BRIEF (Dasar Anda):**
        - Produk: ${blueprint.productAnalysis.name} (Manfaat: ${blueprint.productAnalysis.keyBenefit})
        - **Penawaran Strategis**: ${offer.name} - ${offer.description} (CTA: ${blueprint.adDna.cta})
        - **DNA Penjualan**:
            - Formula Persuasi: "${blueprint.adDna.persuasionFormula}"
            - Nada Suara: "${blueprint.adDna.toneOfVoice}"
        - **DNA Gaya Visual Asli: "${blueprint.adDna.visualStyle}"**
        - **Negara Target untuk Lokalisasi: "${blueprint.adDna.targetCountry}"**
        - **Persona Target**: "${persona.description}" (Usia: "${persona.age}", Tipe: "${persona.creatorType}", Poin Masalah: ${persona.painPoints.join(', ')})
        - **Mandat Kreatif**:
            - Sudut Pandang: "${angle}"
            - 🔥 Pemicu Psikologis: "${trigger.name}" (Deskripsi: ${trigger.description}). Dalam respons JSON Anda, Anda harus mengembalikan objek pemicu lengkap untuk "${trigger.name}".
            - Tahap Kesadaran: "${awarenessStage}"
            - Format: "${format}" (Panduan: ${formatInstructions[format]})
            - Penempatan: "${placement}" (Panduan: ${placementInstructions[placement]})

        **🔥 DAFTAR PERIKSA IMPLEMENTASI PEMICU untuk "${trigger.name}":**
        COPY Anda harus menyertakan setidaknya SATU dari ini: ${triggerChecklist.copyMust.join(', ')}.
        PROMPT VISUAL Anda harus menyertakan setidaknya SATU dari ini: ${triggerChecklist.visualMust.join(', ')}.
        ⚠️ Jika konsep Anda tidak lolos pemeriksaan ini, itu GAGAL.
        
        ---
        **PROSES PEMBUATAN UNTUK SETIAP DARI 3 KONSEP (Emosional, Logis, Sosial):**

        **LANGKAH 1: Tulis Kata-kata (Mode Copywriter)**
        1.  **HOOK:** Hasilkan hook kelas dunia yang menghentikan guliran.
        2.  **HEADLINE:** Anda HARUS menggunakan salah satu formula ini untuk tahap "${awarenessStage}", menyesuaikannya dengan pintu masuk yang Anda pilih.
            ${HEADLINE_FORMULAS[awarenessStage].map((f, i) => `${i + 1}. ${f}`).join('\n')}
        3.  Teks harus selaras dengan pemicu "${trigger.name}", penawaran "${offer.name}", dan dilokalkan untuk ${blueprint.adDna.targetCountry}.

        **LANGKAH 2: Visualisasikan Pesan (Mode Art Director)**
        - Buat **visualPrompt** yang terperinci menggunakan **TEMPLATE PROMPT VISUAL** INI TEPAT:

        **TEMPLATE PROMPT VISUAL (Isi setiap bagian secara eksplisit):**
        [ELEMEN PENGHENTI GULIRAN] Satu objek/aksi tak terduga: ...
        [EMOSI & EKSPRESI] Perasaan inti subjek: ... | Detail ekspresi wajah: ...
        [OTENTISITAS PERSONA] Latar untuk ${persona.description} di ${blueprint.adDna.targetCountry}: ... | Gaya subjek yang otentik dengan ${persona.creatorType}: ...
        [PENARGETAN AI META] Bagaimana visual ini menargetkan persona melalui piksel untuk dibaca oleh algoritma Meta (misalnya, untuk berpenghasilan tinggi, jelaskan 'kantor rumah minimalis, mewah'; untuk Gen Z, 'kamar kos trendi dengan ring light'): ...
        [VISUALISASI PEMICU untuk "${trigger.name}"] Bagaimana adegan menunjukkan ${trigger.name} (Harus menggunakan salah satu dari: ${triggerChecklist.visualMust.join('; ')}): ...
        [PENEMPATAN PRODUK] Di mana/bagaimana produk muncul: ...
        [FUSI DNA GAYA] DNA Asli: "${blueprint.adDna.visualStyle}" | Palet warna yang dihasilkan: ... | Suasana hati yang dihasilkan: ...
        [SPESIFIKASI TEKNIS] Komposisi untuk '${placement}': "${COMPOSITION_FOR_ADS[placement]}" | Rasio aspek: ${placement === 'Instagram Story' ? '9:16 vertikal' : placement === 'Instagram Feed' ? '1:1 atau 4:5' : 'dioptimalkan untuk iklan digital'}. | Sudut kamera: ... | Pencahayaan: ...

        **LANGKAH 3: Isi Bukti Implementasi Pemicu**
        - Untuk setiap konsep, isi objek 'triggerImplementationProof' di JSON.
        
        ---
        
        **PEMERIKSAAN KUALITAS INTERNAL SEBELUM MERESPONS:**
        Untuk setiap konsep yang Anda buat, tanyakan pada diri sendiri:
        1.  Apakah prompt visual MEMPERKUAT inti emosional dari hook/headline?
        2.  Jika saya menunjukkan gambar ini TANPA teks, apakah masih akan membangkitkan perasaan yang benar?
        3.  **ATURAN ENTITY ID META**: Apakah prompt visual untuk konsep Emosional, Logis, dan Sosial berbeda secara fundamental? Mereka HARUS menggunakan latar, komposisi, sudut kamera, dan ekspresi emosional yang berbeda untuk menghindari kejenuhan kreatif dan penalti platform.
        
        ---

        Sekarang, hasilkan array berisi 3 objek JSON menggunakan proses di atas. Patuhi skema JSON yang disediakan dengan ketat. Untuk 'adSetName', ikuti format ini: [PersonaSingkat]_[KataKunciSudutPandang]_[Pemicu]_[Kesadaran]_[Format]_[Penempatan]_v[1, 2, atau 3]. Untuk bidang 'offer', Anda HARUS mengembalikan objek penawaran lengkap yang cocok dengan Penawaran Strategis.
        Hanya berikan respons berupa array JSON.
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ parts: [{ text: prompt }] }],
        config: { 
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: adConceptSchema
            }
        }
    });

    const rawJson = response.text;
    const cleanedJson = rawJson.replace(/^```json\s*|```$/g, '');
    const ideas = JSON.parse(cleanedJson) as (Omit<AdConcept, 'imageUrls' | 'entryPoint'>)[];
    
    const entryPoints: ('Emotional' | 'Logical' | 'Social')[] = ['Emotional', 'Logical', 'Social'];

    return ideas.map((idea, index) => addMockPerformanceSignals({
        ...idea,
        entryPoint: entryPoints[index % 3] as 'Emotional' | 'Logical' | 'Social'
    }));
};

export const analyzeReferenceImageStyle = async (imageBase64: string): Promise<VisualStyleDNA> => {
    const imagePart = imageB64ToGenerativePart(imageBase64);
    const prompt = `
    Analisis gambar iklan ini dan ekstrak DNA GAYA VISUALNYA.
    Kembalikan objek JSON dengan:
        {
            "colorPalette": "Jelaskan warna dominan dan suasana hati (misalnya, 'Warna tanah hangat dengan aksen oranye cerah')",
            "lightingStyle": "Alami/Studio/Dramatis/dll + waktu hari",
            "compositionApproach": "Aturan sepertiga/Fokus tengah/Pola-Z/dll",
            "photographyStyle": "Mentah UGC/Editorial profesional/Gaya hidup/dll",
            "modelStyling": "Jelaskan rambut, riasan, estetika pakaian",
            "settingType": "Studio dalam ruangan/Perkotaan luar ruangan/Latar rumah/dll"
        }
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ parts: [imagePart, { text: prompt }] }],
        config: { 
            responseMimeType: "application/json",
            responseSchema: visualStyleDnaSchema,
        }
    });

    return JSON.parse(response.text);
};


export const generateAdImage = async (prompt: string, referenceImageBase64?: string, allowVisualExploration: boolean = false): Promise<string> => {
    
    const NEGATIVE_PROMPT = "TIDAK ADA tampilan foto stok generik, TIDAK ADA artefak AI yang jelas (tangan aneh, wajah terdistorsi), TIDAK ADA teks dalam gambar (kami akan menambahkan overlay), TIDAK ADA tanda air atau logo kecuali branding produk, TIDAK ADA komposisi yang berantakan, TIDAK ADA filter berlebihan yang terlihat tidak alami.";
    const salesIntent = `Gambar iklan yang sangat persuasif, berkonversi tinggi, dan menghentikan guliran yang dirancang untuk menjual produk. Gambar harus sangat fotorealistik, kontras tinggi, dan beresonansi secara emosional. Fokus utama harus pada manfaat atau transformasi pengguna. Prompt negatif: ${NEGATIVE_PROMPT}`;
    
    let textPrompt: string;
    const parts: any[] = [];

    if (referenceImageBase64) {
        // LANGKAH 1: Analisis gaya gambar referensi terlebih dahulu untuk kontrol yang lebih presisi.
        const styleDNA = await analyzeReferenceImageStyle(referenceImageBase64);
        
        // Selalu sertakan gambar referensi agar model dapat melihatnya.
        parts.push(imageB64ToGenerativePart(referenceImageBase64));

        if (allowVisualExploration) {
            // Gunakan DNA yang diekstraksi sebagai INSPIRASI, tetapi prioritaskan adegan baru.
            textPrompt = `${salesIntent} 
Menggunakan gambar referensi yang disediakan sebagai INSPIRASI:
1.  Ekstrak elemen gaya ini: palet warna dari "${styleDNA.colorPalette}", suasana pencahayaan dari "${styleDNA.lightingStyle}", dan prinsip komposisi dari "${styleDNA.compositionApproach}".
2.  Anda BOLEH mengembangkan/meremix konsep visual sambil mempertahankan nuansa merek.
3.  Adegan yang dijelaskan di bawah ini adalah panduan UTAMA Anda: ${prompt}
4.  Seimbangkan gambar akhir: 60% deskripsi adegan baru + 40% DNA gaya referensi.`;
        } else {
            // Gunakan DNA yang diekstraksi sebagai PANDUAN KETAT atau TEMPLAT.
            textPrompt = `${salesIntent} 
Menggunakan gambar referensi yang disediakan sebagai PANDUAN KETAT dengan DNA gaya berikut:
- Palet Warna: ${styleDNA.colorPalette}
- Pencahayaan: ${styleDNA.lightingStyle}
- Komposisi: ${styleDNA.compositionApproach}
- Gaya Fotografi: ${styleDNA.photographyStyle}

1.  Pertahankan gaya, pencahayaan, dan pendekatan komposisi yang sama persis.
2.  Adaptasi HANYA subjek/latar agar sesuai dengan adegan baru ini: ${prompt}
3.  Gambar referensi dan DNA-nya adalah TEMPLAT Anda - tetaplah sangat mirip dengannya.`;
        }
    } else {
        // Tidak ada gambar referensi sama sekali.
        textPrompt = `${salesIntent} Adegan adalah: ${prompt}. Gambar akhir harus terlihat seperti iklan profesional berkonversi tinggi, bukan foto stok generik atau ilustrasi AI.`;
    }
    
    parts.push({ text: textPrompt });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ parts: parts }],
      config: {
          responseModalities: [Modality.IMAGE],
      },
    });

    const responseParts = response.candidates?.[0]?.content?.parts;

    if (responseParts) {
      for (const part of responseParts) {
        if (part.inlineData) {
          const base64ImageBytes: string = part.inlineData.data;
          const mimeType = part.inlineData.mimeType;
          return `data:${mimeType};base64,${base64ImageBytes}`;
        }
      }
    }
    
    console.error("Pembuatan gambar gagal. Respons:", JSON.stringify(response, null, 2));
    throw new Error('Gagal membuat gambar: Tidak ada data gambar yang diterima dari API atau permintaan diblokir.');
};

export const refineVisualPrompt = async (concept: AdConcept, blueprint: CampaignBlueprint): Promise<string> => {
    const prompt = `
        Anda adalah seorang ahli rekayasa prompt untuk generator gambar AI.
        Tugas Anda adalah menghasilkan prompt visual baru yang terperinci dan spesifik yang selaras sempurna dengan teks iklan (hook) dan arahan visual (visual vehicle) yang disediakan.

        **Detail Konsep Iklan:**
        - **Produk:** ${blueprint.productAnalysis.name}
        - **Persona:** ${concept.personaDescription} (Usia: ${concept.personaAge}, Gaya: ${concept.personaCreatorType})
        - **Headline:** ${concept.headline}
        - **🔥 Hook Teks (Teks utama yang dilihat pengguna):** "${concept.hook}"
        - **Pemicu Psikologis:** "${concept.trigger.name}"
        - **Format Kreatif:** ${concept.format}
        - **Negara Target:** ${blueprint.adDna.targetCountry}
        - **Arahan Visual (Visual Vehicle):** "${concept.visualVehicle}"

        **Tugas:**
        Hasilkan string \`visualPrompt\` baru yang:
        1.  **Menciptakan 'Kait Visual' yang kuat**: Adegan yang dijelaskan harus menjadi padanan visual dari 'Kait Teks'. Visual apa yang akan membuat kait teks itu 10x lebih kuat dan menghentikan guliran?
        2.  Dengan setia melaksanakan arahan yang diberikan dalam \`visualVehicle\`.
        3.  Secara visual mewujudkan pemicu psikologis: "${concept.trigger.name}".
        4.  Otentik dengan usia dan gaya persona, serta sesuai secara budaya untuk **${blueprint.adDna.targetCountry}**. Adegan harus terasa asli bagi mereka.
        5.  Menciptakan gaya visual yang unik dengan memadukan DNA iklan asli ("${blueprint.adDna.visualStyle}") dengan estetika otentik persona secara cermat.
        6.  Menyertakan detail kaya tentang komposisi, pencahayaan, ekspresi subjek, aksi, dan lingkungan.
        7.  Sangat deskriptif dan spesifik, siap digunakan dengan generator gambar AI.

        Hanya berikan respons berupa teks untuk prompt visual baru, tanpa label atau tanda kutip.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ parts: [{ text: prompt }] }],
    });
    
    return response.text;
};


export const evolveConcept = async (
    baseConcept: AdConcept,
    blueprint: CampaignBlueprint,
    // FIX: Added 'persona' to the evolutionType union type.
    evolutionType: 'angle' | 'trigger' | 'format' | 'placement' | 'awareness' | 'offer' | 'painDesire' | 'persona',
    newValue: any
): Promise<Omit<AdConcept, 'imageUrls'>[]> => {
    
    const evolutionInstructions: Record<string, string> = {
        angle: `Adaptasi konsep ke sudut pandang strategis baru: "${newValue}". Pemicu ("${baseConcept.trigger.name}") dan format ("${baseConcept.format}") harus tetap konsisten, tetapi pesan inti (headline, hook) dan visual harus dibayangkan ulang untuk mencerminkan sudut pandang baru ini.`,
        trigger: `Adaptasi konsep untuk menggunakan pemicu psikologis baru: "${(newValue as BuyingTriggerObject).name}" (Deskripsi: ${(newValue as BuyingTriggerObject).description}). Sudut pandang ("${baseConcept.angle}") dan format ("${baseConcept.format}") harus tetap konsisten, tetapi headline, hook, dan visual harus ditulis ulang untuk membangkitkan perasaan "${(newValue as BuyingTriggerObject).name}" dengan kuat.`,
        format: `Adaptasi konsep ke format kreatif baru: "${newValue}". Sudut pandang ("${baseConcept.angle}") dan pemicu ("${baseConcept.trigger.name}") sama, tetapi seluruh eksekusi (headline, hook, visual) harus dibayangkan ulang untuk format baru. Jika format baru adalah "Carousel", Anda HARUS menghasilkan array "carouselSlides".`,
        placement: `Adaptasi konsep untuk penempatan baru: "${newValue}". Kreatif inti (sudut pandang, pemicu, format) sama, tetapi eksekusi harus dioptimalkan. Untuk "Instagram Story", ini berarti rasio aspek 9:16 dan hook yang lebih tajam. Untuk "Carousel", ini berarti menceritakan sebuah kisah di beberapa slide.`,
        awareness: `Adaptasi konsep untuk tahap kesadaran baru: "${newValue}". Pesan inti sama tetapi titik masuk harus berubah. Tulis ulang hook dan headline agar sesuai dengan tahap baru.`,
        offer: `Adaptasi konsep ke penawaran baru: "${(newValue as OfferTypeObject).name}". Pesan inti (sudut pandang, pemicu) sama, tetapi CTA dan bagian akhir dari teks harus ditulis ulang untuk mencerminkan penawaran baru ini.`,
        painDesire: `Adaptasi konsep ke Poin Masalah/Keinginan baru: "${(newValue as PainDesireObject).name}". Ini adalah pergeseran yang signifikan. Sudut pandang inti harus dievaluasi ulang untuk terhubung dengan pendorong emosional baru ini. Headline, hook, dan visual harus dibayangkan ulang sepenuhnya.`,
        persona: `Adaptasi seluruh konsep untuk persona target baru: "${(newValue as TargetPersona).description}". Ini memerlukan penulisan ulang headline, hook, dan prompt visual agar sangat relevan dengan poin masalah dan keinginan spesifik persona baru ini. Sudut pandang inti ("${baseConcept.angle}") mungkin perlu sedikit dibingkai ulang.`
    };

    const prompt = `
        Anda adalah seorang direktur kreatif kelas dunia yang ditugaskan untuk secara strategis mengembangkan konsep iklan yang sudah ada.
        Diberikan konsep kreatif dasar dan mandat evolusi spesifik, hasilkan SATU konsep iklan baru yang berbeda yang dengan ahli mengadaptasi ide asli.

        **Blueprint Kampanye:**
        - Produk: ${blueprint.productAnalysis.name} (Manfaat: ${blueprint.productAnalysis.keyBenefit})
        - Persona: ${baseConcept.personaDescription} (Usia: ${baseConcept.personaAge}, Tipe Kreator: ${baseConcept.personaCreatorType})
        - **DNA Penjualan**:
            - Formula Persuasi: "${blueprint.adDna.persuasionFormula}"
            - Nada Suara: "${blueprint.adDna.toneOfVoice}"
        - DNA Gaya Visual: "${blueprint.adDna.visualStyle}"
        - Negara Target untuk Lokalisasi: "${blueprint.adDna.targetCountry}"
        - **Penawaran Strategis untuk digunakan**: "${baseConcept.offer.name} - ${baseConcept.offer.description}"

        **Konsep Kreatif Dasar:**
        - Sudut Pandang: "${baseConcept.angle}"
        - Pemicu: "${baseConcept.trigger.name}"
        - Format: "${baseConcept.format}"
        - Penempatan: "${baseConcept.placement}"
        - Headline: "${baseConcept.headline}"
        - Hook: "${baseConcept.hook}"
        
        **🔥 Mandat Evolusi: ${evolutionInstructions[evolutionType]}**

        Sekarang, hasilkan sebuah array yang berisi SATU objek JSON baru untuk konsep yang telah berevolusi.
        Patuhi skema JSON yang disediakan dengan ketat.
        Untuk 'adSetName', buat nama baru yang mencerminkan parameter evolusi baru, seperti: [Persona]_[SudutPandang/PemicuBaru/dll]_[...]_v1.
        Untuk bidang 'offer', jika jenis evolusi adalah 'offer', gunakan penawaran baru yang disediakan dalam mandat. Jika tidak, Anda HARUS mengembalikan objek penawaran lengkap dari bagian 'Penawaran Strategis untuk digunakan' di atas.

        Hanya berikan respons berupa array JSON yang berisi satu objek konsep baru.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ parts: [{ text: prompt }] }],
        config: { 
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: adConceptSchema,
            }
        }
    });
    
    const rawJson = response.text;
    const cleanedJson = rawJson.replace(/^```json\s*|```$/g, '');
    const result = JSON.parse(cleanedJson) as (Omit<AdConcept, 'imageUrls' | 'entryPoint'>)[];
    
    return result.map((concept): Omit<AdConcept, 'imageUrls'> => addMockPerformanceSignals({
        ...concept,
        entryPoint: 'Evolved',
    }));
};

export const generateQuickPivot = async (
  baseConcept: AdConcept,
  blueprint: CampaignBlueprint,
  pivotType: PivotType,
  config: PivotConfig
): Promise<Omit<AdConcept, 'imageUrls'>[]> => {

  const pivotInstructions: Record<PivotType, string> = {
    'age-shift': `
      MANDAT KRITIS: Adaptasi konsep UNGGULAN ini untuk kelompok umur yang berbeda.
      - **Usia Asli:** ${baseConcept.personaAge}
      - **Target Usia:** ${config.targetAge}
      
      **TUGAS ANDA:**
      1. **Profil Ulang Persona:** Tulis ulang deskripsi persona untuk secara otentik mewakili demografi ${config.targetAge}. Perbarui pain points dan keinginan agar sesuai dengan tahap kehidupan mereka.
      2. **Adaptasi Bahasa:** Sesuaikan nada dan kosakata:
         - 13-17: Gunakan bahasa gaul Gen Z, referensi meme, ironi. Sangat santai.
         - 18-24: Profesional tapi relatable. Fokus karir & gaya hidup.
         - 25-34: Bahasa berorientasi keluarga. Tekankan penghematan waktu dan kualitas.
         - 35-44: Jelas, lugas, membangun kepercayaan. Hindari bahasa gaul.
      3. **Adaptasi Visual:** Ubah usia model/subjek di prompt visual menjadi ${config.targetAge}. Sesuaikan latar agar cocok dengan gaya hidup mereka. Pikirkan "penargetan piksel": pemandangan ini harus secara visual mengkodekan demografi target untuk dibaca oleh AI Meta (misalnya, 18-24 = kamar kos/kafe, 35-44 = kantor rumah/dapur).
      4. **Pergeseran Pain Point:** Pain point INTI mungkin berubah. Contoh:
         - 18-24: "Aku ingin terlihat bagus di Insta" → "Aku ingin merasa percaya diri di kampus"
         - 35-44: "Aku ingin hasil cepat" → "Aku butuh sesuatu yang cocok dengan jadwalku yang padat"
      
      **TETAP KONSTAN:** 
      - Angle Strategis: "${baseConcept.angle}"
      - Pemicu Psikologis: "${baseConcept.trigger.name}"
      - Format Kreatif: "${baseConcept.format}"
      - Penempatan: "${baseConcept.placement}"
      
      STRATEGI tetap sama, tetapi EKSEKUSI harus secara otentik berbicara kepada ${config.targetAge}.
    `,
    'gender-flip': `
      MANDAT KRITIS: Adaptasi konsep UNGGULAN ini untuk gender yang berlawanan.
      - **Persona Asli:** ${baseConcept.personaDescription}
      - **Target Gender:** ${config.targetGender}
      
      **TUGAS ANDA:**
      1. **Re-gender Persona:** Tulis ulang deskripsi untuk orang ${config.targetGender}. Jadilah otentik - jangan hanya menukar kata ganti. Pertimbangkan:
         - Pain points yang berbeda (misalnya, Pria: "kecemasan akan rambut rontok", Wanita: "kekhawatiran perawatan kulit penuaan")
         - Hasil yang diinginkan yang berbeda (misalnya, Pria: "percaya diri dalam berkencan", Wanita: "citra profesional")
      2. **Adaptasi Teks:** 
         - Audiens pria: Langsung, berorientasi pada pencapaian, campuran logika + emosi
         - Audiens wanita: Empati-dahulu, komunitas/bukti sosial, campuran emosi + logika
      3. **Adaptasi Visual:** Ubah subjek dalam prompt visual menjadi orang ${config.targetGender}. Sesuaikan gaya dan latar agar terasa otentik (bukan stereotip). Pikirkan "penargetan piksel": pastikan latar dan gaya (misalnya, dekorasi kamar, pakaian) secara visual mengkodekan demografi gender target untuk AI Meta.
      4. **Pergeseran Bukti Sosial:** Jika menggunakan testimoni, ganti gender pemberi testimoni agar sesuai dengan target.
      
      **TETAP KONSTAN:** Angle strategis, pemicu, format, penempatan yang sama.
      
      ⚠️ HINDARI STEREOTIP. Pivot harus terasa otentik, bukan menggurui.
    `,
    'lifestyle-swap': `
      MANDAT KRITIS: Adaptasi konsep UNGGULAN ini untuk gaya hidup/tipe kreator yang berbeda.
      - **Tipe Asli:** ${baseConcept.personaCreatorType}
      - **Target Tipe:** ${config.targetLifestyle}
      
      **TUGAS ANDA:**
      1. **Profil Ulang Gaya Hidup:** Bayangkan kembali persona sebagai seorang "${config.targetLifestyle}". Ubah:
         - Rutinitas & tantangan harian
         - Nilai & aspirasi (misalnya, Influencer menghargai estetika, Pengguna Biasa menghargai kepraktisan)
         - Sumber bukti sosial yang mereka percayai
      2. **Pivot Gaya Visual:** 
         - Influencer: Terkurasi, aspiratif, produksi tinggi
         - Pengguna Biasa: Otentik, relatable, kualitas "foto iPhone"
         - Ahli: Latar profesional, sinyal kredibilitas (misalnya, jas lab, grafik)
         Pikirkan "penargetan piksel": gaya visual yang dipilih harus secara langsung memberi sinyal subkultur dan tingkat pendapatan target kepada AI Meta.
      3. **Pergeseran Nada Teks:**
         - Influencer: "Ini mengubah permainan kontenku!" (aspiratif)
         - Pengguna Biasa: "Sebagai ibu yang sibuk, ini sangat membantuku." (praktis)
         - Ahli: "Data menunjukkan ini adalah metode yang paling efektif." (otoritatif)
      
      **TETAP KONSTAN:** Angle, pemicu, format.
    `,
    'market-expand': `
      MANDAT KRITIS: Adaptasi konsep UNGGULAN ini untuk pasar/budaya yang berbeda.
      - **Pasar Asli:** ${blueprint.adDna.targetCountry}
      - **Target Pasar:** ${config.targetCountry}
      
      **TUGAS ANDA:**
      1. **Lokalisasi Persona:** Ganti nama dan referensi budaya agar sesuai dengan ${config.targetCountry}.
      2. **Lokalisasi Teks & Visual:** Terjemahkan teks ke dalam bahasa lokal (jika berbeda). Sesuaikan visual prompt untuk menampilkan model, latar, dan gaya yang otentik dengan ${config.targetCountry}.
      3. **Adaptasi Budaya:** Pertimbangkan nuansa budaya. Humor, bukti sosial, dan nilai-nilai mungkin perlu disesuaikan.
      
      **TETAP KONSTAN:** Angle, pemicu, format.
    `,
    'awareness-shift': `
      MANDAT KRITIS: Adaptasi konsep UNGGULAN ini untuk tahap kesadaran yang berbeda.
      - **Tahap Asli:** ${baseConcept.awarenessStage}
      - **Target Tahap:** ${config.targetAwareness}
      
      **TUGAS ANDA:**
      1. **Bingkai Ulang Pesan:** Ubah hook dan headline.
         - Unaware/Problem Aware: Fokus pada masalah/agitasi.
         - Solution/Product Aware: Fokus pada solusi/bukti/penawaran.
      2. **Sesuaikan CTA:** CTA harus cocok dengan tahap baru.
      
      **TETAP KONSTAN:** Persona, angle, format.
    `,
    'channel-adapt': `
      MANDAT KRITIS: Adaptasi konsep UNGGULAN ini untuk platform yang berbeda.
      - **Platform Asli:** Instagram
      - **Target Platform:** ${config.targetPlatform}
      
      **TUGAS ANDA:**
      1. **Adaptasi Format:**
         - TikTok: Video pendek, tren suara, teks di layar.
         - Facebook: Teks lebih panjang, link-focused.
         - YouTube: Pre-roll skippable, hook 5 detik.
      2. **Ubah Visual Prompt:** Sesuaikan rasio aspek dan gaya agar asli dengan platform target.
      
      **TETAP KONSTAN:** Persona, angle, pesan inti.
    `,
    'emotional-flip': `
      MANDAT KRITIS: Lakukan pivot emosional. Balikkan emosi inti dari rasa sakit ke keinginan, atau sebaliknya, untuk menguji kerangka pesan yang sama sekali berbeda.
      - **Emosi Asli:** ${baseConcept.entryPoint === 'Emotional' ? 'Fokus pada emosi' : 'Fokus pada logika/sosial'}
      - **Target Emosi:** Balikkan dari positif ke negatif, atau sebaliknya.
      
      **TUGAS ANDA:**
      1. **Bingkai Ulang Hook/Headline:** Jika asli berfokus pada rasa sakit ("Benci X?"), balikkan menjadi berfokus pada keinginan ("Ingin Y?").
      2. **Adaptasi Visual:** Ubah emosi subjek dalam prompt visual agar sesuai dengan emosi baru.
      
      **TETAP KONSTAN:** Persona, angle, format.
    `,
    'proof-type-shift': `
      MANDAT KRITIS: Lakukan pivot jenis bukti. Ubah mekanisme kepercayaan untuk membangun kredibilitas dengan cara yang berbeda.
      - **Jenis Bukti Asli:** ${baseConcept.trigger.name}
      - **Target Jenis Bukti:** Pilih pemicu yang berbeda (misalnya, dari Bukti Sosial ke Otoritas).
      
      **TUGAS ANDA:**
      1. **Ubah Pemicu:** Ganti pemicu inti dalam hook/headline.
      2. **Sesuaikan Visual:** Visual harus mencerminkan jenis bukti baru (misalnya, dari kerumunan orang menjadi seorang ahli).
      
      **TETAP KONSTAN:** Persona, angle, format.
    `,
    'urgency-vs-evergreen': `
      MANDAT KRITIS: Lakukan pivot urgensi. Uji pesan berbasis kelangkaan versus proposisi nilai yang tak lekang oleh waktu.
      - **Pendekatan Asli:** (Tentukan apakah asli menggunakan urgensi)
      - **Target Pendekatan:** Balikkan. Jika mendesak, buat menjadi abadi. Jika abadi, tambahkan urgensi.
      
      **TUGAS ANDA:**
      1. **Ubah Teks:** Tambahkan atau hapus elemen kelangkaan/urgensi (misalnya, "Penawaran berakhir malam ini" vs. "Solusi tepercaya").
      2. **Sesuaikan Visual:** Visual harus mencerminkan pendekatan baru (misalnya, timer hitung mundur vs. adegan yang tenang dan meyakinkan).
      
      **TETAP KONSTAN:** Persona, angle, format.
    `
  };

  const prompt = `
    Anda adalah seorang Creative Director elit yang bertugas melakukan "Quick Pivot" pada konsep iklan yang sudah terbukti berhasil.
    Tugas Anda adalah mengadaptasi konsep ini untuk audiens atau konteks BARU, dengan tetap mempertahankan DNA strategis yang membuatnya berhasil.

    **Blueprint Kampanye:**
    - Produk: ${blueprint.productAnalysis.name} (Manfaat: ${blueprint.productAnalysis.keyBenefit})
    - DNA Penjualan: Gunakan formula persuasi "${blueprint.adDna.persuasionFormula}" dengan nada "${blueprint.adDna.toneOfVoice}".

    **Konsep Iklan Asli (PEMENANG):**
    - Headline: "${baseConcept.headline}"
    - Persona: ${baseConcept.personaDescription}
    - Angle: "${baseConcept.angle}"
    - Pemicu: "${baseConcept.trigger.name}"
    - Format: "${baseConcept.format}"

    **🔥 MANDAT PIVOT: ${pivotInstructions[pivotType]}**

    Sekarang, hasilkan sebuah array yang berisi SATU objek JSON baru untuk konsep yang telah di-pivot.
    Patuhi skema JSON yang disediakan dengan ketat.
    - Untuk 'adSetName', buat nama baru yang mencerminkan parameter pivot, seperti: [PivotType]_[Target]_[...]
    - Untuk 'personaDescription', 'personaAge', dll., Anda HARUS memperbarui bidang-bidang ini untuk mencerminkan persona baru.
    - Untuk 'strategicPathId', gunakan kembali ID dari konsep dasar: "${baseConcept.strategicPathId}".

    Respons HANYA dengan array JSON yang berisi satu objek konsep baru.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: [{ text: prompt }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: pivotAdConceptSchema
      }
    }
  });

  const rawJson = response.text;
  const cleanedJson = rawJson.replace(/^```json\s*|```$/g, '');
  const result = JSON.parse(cleanedJson) as (Omit<AdConcept, 'imageUrls' | 'entryPoint'>)[];

  return result.map((concept): Omit<AdConcept, 'imageUrls'> => addMockPerformanceSignals({
    ...concept,
    entryPoint: 'Pivoted',
  }));
};

// FIX: Added generateConceptsFromPersona function
export const generateConceptsFromPersona = async (blueprint: CampaignBlueprint, persona: TargetPersona, strategicPathId: string): Promise<Omit<AdConcept, 'imageUrls'>[]> => {
    const prompt = `
    Anda adalah seorang ahli strategi kreatif senior. Untuk produk dan persona yang diberikan, hasilkan satu paket berisi 3 konsep iklan berpotensi tinggi yang beragam.
    
    **Produk:** ${blueprint.productAnalysis.name} - ${blueprint.productAnalysis.keyBenefit}
    **Persona:** ${persona.description} (${persona.age}, ${persona.creatorType}). Poin Masalah: ${persona.painPoints.join(', ')}. Keinginan: ${persona.desiredOutcomes.join(', ')}.
    **Negara Target:** ${blueprint.adDna.targetCountry}

    **Tugas Anda:**
    1.  Buat 3 konsep yang berbeda. Masing-masing HARUS menggunakan "Pintu Masuk" yang berbeda (Emosional, Logis, Sosial) untuk menguji sudut pandang psikologis yang berbeda.
    2.  Untuk setiap konsep, pilih Tahap Kesadaran, Sudut Pandang, Pemicu, Format, dan Penempatan yang sesuai.
    3.  Ikuti alur kerja COPY-FIRST: tulis hook & headline yang mematikan, KEMUDIAN buat prompt visual terperinci yang menghidupkannya.
    4.  Pastikan prompt visual berbeda untuk menghindari kejenuhan kreatif (latar, pencahayaan, komposisi yang berbeda).
    5.  Kembalikan konsep sebagai array JSON berisi 3 objek, yang mematuhi adConceptSchema.
    6.  Untuk 'strategicPathId', gunakan nilai ini: "${strategicPathId}".
    7.  Untuk bidang 'offer', gunakan objek ini: ${JSON.stringify({name: blueprint.adDna.offerSummary, description: blueprint.adDna.offerSummary, psychologicalPrinciple: "Penawaran Langsung"})}.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ text: prompt }],
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: adConceptSchema
            }
        }
    });

    const rawJson = response.text;
    const ideas = JSON.parse(rawJson.replace(/^```json\s*|```$/g, '')) as (Omit<AdConcept, 'imageUrls' | 'entryPoint'>)[];

    const entryPoints: ('Emotional' | 'Logical' | 'Social')[] = ['Emotional', 'Logical', 'Social'];
    return ideas.map((idea, index) => addMockPerformanceSignals({
        ...idea,
        entryPoint: entryPoints[index % 3]
    }));
};

// FIX: Added generateUgcPack function
export const generateUgcPack = async (blueprint: CampaignBlueprint, angle: string, trigger: BuyingTriggerObject, awarenessStage: AwarenessStage, placement: PlacementFormat, persona: TargetPersona, strategicPathId: string, allowVisualExploration: boolean, offer: OfferTypeObject): Promise<Omit<AdConcept, 'imageUrls'>[]> => {
    const prompt = `
      Anda adalah seorang direktur kreatif yang berspesialisasi dalam kampanye Konten Buatan Pengguna (UGC) berkinerja tinggi.
      
      **WAWASAN DATA META:** Kampanye UGC dengan kreator yang beragam (4-5 sudut pandang berbeda) mengungguli kampanye kreator tunggal sebanyak 3x.
      
      **Tugas Anda:**
      Hasilkan "Paket Keragaman UGC" berisi 4 konsep iklan berdasarkan brief yang disediakan.
      
      **Brief:**
      - Produk: ${blueprint.productAnalysis.name}
      - Persona: ${persona.description}
      - Sudut Pandang: "${angle}"
      - Pemicu: "${trigger.name}"
      - Tahap Kesadaran: "${awarenessStage}"
      - Penempatan: "${placement}"
      - Penawaran: "${offer.name}"
      - Negara Target: ${blueprint.adDna.targetCountry}
      
      **INSTRUKSI KRITIS:**
      1.  Buat 4 konsep, masing-masing mewakili sub-tipe kreator yang BERBEDA dalam persona utama.
          - Contoh sub-tipe: "Si Skeptis yang menjadi Percaya", "Ibu Sibuk yang menemukan jalan pintas", "Ahli yang didorong oleh Data", "Influencer yang berfokus pada Estetika".
      2.  Setiap konsep HARUS menggunakan Sudut Pandang, Pemicu, dan Penawaran yang SAMA. Ini adalah tes terkontrol dari sudut pandang kreator.
      3.  'format' untuk SEMUA konsep harus 'UGC'.
      4.  Teks (hook, headline) untuk setiap konsep harus disesuaikan dengan suara sub-tipe kreatornya yang spesifik.
      5.  Prompt visual harus menggambarkan orang yang berbeda dalam latar yang berbeda dan otentik untuk memaksimalkan keragaman.
      6. Untuk 'strategicPathId' gunakan "${strategicPathId}".

      **🔥 ATURAN KERAGAMAN UGC KRITIS (Mandat Keragaman Kreator Meta):**
      Untuk SETIAP dari 4 mikro-persona, Anda HARUS memvariasikan:
      1. **Demografi Kreator:**
         - Konsep 1: Usia 18-24, gaya kasual
         - Konsep 2: Usia 25-34, gaya profesional
         - Konsep 3: Usia 35-44, gaya orang tua/keluarga
         - Konsep 4: Usia 45+, gaya dewasa/ahli
      2. **Latar Visual (HARUS sama sekali berbeda):**
         - Konsep 1: Latar kamar tidur/kamar kos
         - Konsep 2: Kantor/ruang kerja bersama
         - Konsep 3: Dapur/ruang tamu (ruang keluarga)
         - Konsep 4: Luar ruangan/ruang publik
      3. **Gaya Kamera:**
         - Konsep 1: Gaya selfie vertikal (kamera depan)
         - Konsep 2: Pengaturan tripod, jarak sedang
         - Konsep 3: Genggam, sedikit goyang (otentik)
         - Konsep 4: Pembingkaian profesional tetapi pencahayaan alami
      4. **Waktu Hari (untuk variasi pencahayaan):**
         - Konsep 1: Malam hari (pencahayaan dalam ruangan yang hangat)
         - Konsep 2: Tengah hari (cahaya alami yang terang)
         - Konsep 3: Pagi hari (cahaya alami yang lembut)
         - Konsep 4: Golden hour (luar ruangan)
      
      Variasi ini WAJIB untuk menghindari pengelompokan Entity ID. AI Meta akan memperlakukan masing-masing sebagai iklan yang berbeda secara fundamental.
      
      Hanya berikan respons berupa array JSON dari 4 objek konsep iklan.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: [{ text: prompt }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: adConceptSchema
        }
      }
    });
    
    const rawJson = response.text;
    const ideas = JSON.parse(rawJson.replace(/^```json\s*|```$/g, '')) as Omit<AdConcept, 'imageUrls'>[];
    return ideas.map(idea => addMockPerformanceSignals(idea));
};

// FIX: Added generateRemixSuggestions function
export const generateRemixSuggestions = async (component: AdDnaComponent, baseConcept: AdConcept, adDna: AdDna, blueprint: CampaignBlueprint): Promise<RemixSuggestion[]> => {
    const suggestionsPrompt = `
      Anda adalah seorang ahli strategi kreatif. Diberikan sebuah konsep iklan dan salah satu komponen DNA-nya, hasilkan 3 saran alternatif untuk komponen tersebut.
      
      **Konsep Dasar:**
      - Headline: ${baseConcept.headline}
      - Persona: ${adDna.persona.description}
      - Sudut Pandang: ${adDna.angle}
      
      **Komponen untuk Diremix:** "${component}"
      **Nilai Saat Ini:** "${(adDna as any)[component]?.name || (adDna as any)[component]}"
      
      **Tugas:**
      Hasilkan 3 ide alternatif yang berbeda dan kreatif untuk "${component}".
      Untuk setiap ide, berikan "title" singkat, "description" tentang pergeseran strategis, dan "payload" yang merupakan nilai string atau objek baru.
      - Payload harus cocok dengan tipe komponen yang diremix. Untuk objek kompleks seperti Persona atau Pemicu, hasilkan objek lengkap.
      
      Hanya berikan respons berupa array JSON dari 3 objek saran.
      Skema: { title: string, description: string, payload: any }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: [{ text: suggestionsPrompt }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              payload: { type: Type.OBJECT, description: "Bisa berupa string atau objek lengkap tergantung pada komponen" }
            },
            required: ['title', 'description', 'payload']
          }
        }
      }
    });
    
    const rawJson = response.text;
    return JSON.parse(rawJson.replace(/^```json\s*|```$/g, ''));
};

// FIX: Added generateConceptFromRemix function
export const generateConceptFromRemix = async (baseConcept: AdConcept, component: AdDnaComponent, payload: any, blueprint: CampaignBlueprint): Promise<Omit<AdConcept, 'imageUrls'>> => {
    const evolutionType = component as ('angle' | 'trigger' | 'format' | 'placement' | 'awareness' | 'offer' | 'painDesire' | 'persona');
    const evolvedConcepts = await evolveConcept(baseConcept, blueprint, evolutionType, payload);
    const newConcept = {
        ...evolvedConcepts[0],
        entryPoint: 'Remixed' as const,
    };
    return newConcept;
};

export const generateMatrixConcepts = async (
    blueprint: CampaignBlueprint, 
    persona: TargetPersona, 
    formats: CreativeFormat[], 
    triggerNames: string[], 
    strategicPathId: string
): Promise<Omit<AdConcept, 'imageUrls'>[]> => {
    
    const prompt = `
        Anda adalah seorang ahli strategi kreatif dan copywriter direct response kelas dunia yang berspesialisasi dalam kampanye iklan Meta. Tugas Anda adalah menghasilkan satu set konsep iklan yang sangat beragam berdasarkan matriks format kreatif dan pemicu psikologis.

        **PRINSIP INTI YANG TIDAK BISA DITAWAR (DALAM KONTEKS INDONESIA):**
        1.  **Asumsikan Zero Brand Awareness:** Tulis untuk audiens dingin. Kejelasan > Kecerdasan.
        2.  **Fokus pada Masalah atau Hasil:** Fokus pada apa yang dipedulikan pengguna, bukan fitur.
        3.  **Spesifisitas = Kredibilitas:** Gunakan angka dan detail konkret.
        4.  **PECAH ENTITY ID:** Sangat PENTING bahwa setiap konsep memiliki ciri visual yang BERBEDA SECARA FUNDAMENTAL untuk memaksimalkan jangkauan di Meta. Gunakan latar, pencahayaan, demografi subjek, dan sudut kamera yang berbeda untuk setiap konsep.

        **BRIEF KAMPANYE:**
        - Produk: ${blueprint.productAnalysis.name} (Manfaat: ${blueprint.productAnalysis.keyBenefit})
        - Penawaran Strategis: ${blueprint.adDna.offerSummary} (CTA: ${blueprint.adDna.cta})
        - DNA Penjualan: Gunakan formula persuasi "${blueprint.adDna.persuasionFormula}" dengan nada "${blueprint.adDna.toneOfVoice}".
        - Negara Target untuk Lokalisasi: "${blueprint.adDna.targetCountry}"
        - Persona Target: "${persona.description}" (Usia: "${persona.age}", Tipe: "${persona.creatorType}", Poin Masalah: ${persona.painPoints.join(', ')})

        **TUGAS ANDA: BUAT MATRIKS KONSEP IKLAN**
        Hasilkan array JSON dari ${formats.length * triggerNames.length} konsep iklan unik, satu untuk setiap kombinasi dalam matriks berikut:

        - **Format Kreatif:** [${formats.join(', ')}]
        - **Pemicu Psikologis:** [${triggerNames.join(', ')}]

        **UNTUK SETIAP KONSEP DALAM MATRIKS, ANDA HARUS:**
        1.  **Pilih Sudut Pandang & Tahap Kesadaran:** Pilih sudut pandang strategis dan tahap kesadaran yang paling sesuai untuk kombinasi format/pemicu.
        2.  **Tulis Teks Iklan (Copy-First):** Buat 'hook' yang menghentikan guliran dan 'headline' yang kuat yang menerapkan pemicu psikologis.
        3.  **Buat Visual yang Unik:** Tulis 'visualPrompt' yang sangat terperinci yang (a) secara visual memperkuat teks iklan dan (b) BERBEDA secara fundamental dari prompt visual lainnya dalam set ini.
        4.  **Isi Semua Bidang:** Lengkapi semua bidang yang diperlukan dari skema JSON adConcept, termasuk nama set iklan yang deskriptif.
        5.  **Gunakan ID Jalur Strategis yang Disediakan:** Untuk 'strategicPathId', gunakan nilai ini: "${strategicPathId}".
        6.  **Gunakan Penawaran yang Disediakan:** Untuk bidang 'offer', gunakan objek ini: ${JSON.stringify({name: blueprint.adDna.offerSummary, description: blueprint.adDna.offerSummary, psychologicalPrinciple: "Penawaran Langsung"})}.

        Hanya berikan respons berupa array JSON yang valid dari objek konsep iklan.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ text: prompt }],
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: adConceptSchema
            }
        }
    });

    const rawJson = response.text;
    const ideas = JSON.parse(rawJson.replace(/^```json\s*|```$/g, '')) as (Omit<AdConcept, 'imageUrls' | 'entryPoint'>)[];

    const entryPoints: ('Emotional' | 'Logical' | 'Social')[] = ['Emotional', 'Logical', 'Social'];
    return ideas.map((idea, index) => addMockPerformanceSignals({
        ...idea,
        entryPoint: entryPoints[index % 3]
    }));
};