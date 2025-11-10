
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
    'Instagram Story': 'Leave top 25% empty for headline. Main subject in the middle-bottom third. Never cover subject face with text.',
    'Instagram Feed': 'Follow Rule of Thirds or Z-pattern reading flow. Provide negative space for text overlays. Never cover subject face.',
    'Carousel': 'Slide 1: Center subject with clear background. Slides 2-5: Vary composition with consistent text zones. Never cover main subject face.'
};

const CAROUSEL_ARCS: Record<string, string> = {
    'PAS': 'PAS (Problem-Agitate-Solution). Ideal for direct response. Slide 1 (Hook): State the PROBLEM in a shocking or relatable way. Slide 2 (Agitate): Describe the PAIN and frustration of the problem. Why is it so bad? Slide 3 (Solution): Introduce your product as the SOLUTION. The "aha!" moment. Slide 4 (Proof): Show evidence it works (testimonial, data, before/after). Slide 5 (CTA): Tell them exactly what to do next.',
    'Transformation': 'Transformation: Before & After narrative. Best for Before & After, Testimonial formats. Slide 1 (Hook): Show the glorious AFTER state. Slide 2 (Before): Reveal the painful BEFORE state. Slide 3 (The Struggle): Detail the journey and failed attempts. Slide 4 (The Discovery): How they found your solution. Slide 5 (CTA): Invite others to start their transformation.',
    'Educational': 'Education: Teach something valuable. Best for "Education/Tips" or "Demo" formats. Structure: (Engaging Hook -> Bust Myth 1 -> Bust Myth 2 -> Reveal Truth/Method -> CTA/Product Link)',
    'Testimonial Story': 'Testimonial Story: Customer-centric story. Use for "Testimonial" or "UGC" formats. Structure: (Hook with a strong quote -> Introduce the customer & their story -> Specific results they got -> How the product enabled it -> CTA)'
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

const TRIGGER_IMPLEMENTATION_CHECKLIST: Record<string, { copyMust: string[], visualMust: string[] }> = {
    'Social Proof': {
        copyMust: ["Specific numbers: \"Join 10,000+ happy customers.\"", "Real testimonial quotes: \"'This changed everything for me.' - Jane D.\"", "Collective action words: \"terbukti\", \"semua orang pakai\""],
        visualMust: ["Multiple people using the product happily.", "A visual overlay of a 5-star rating or testimonial quote.", "A \"sea of faces\" or a collage of user-generated content."]
    },
    'Authority': {
        copyMust: ["Cite an expert or recognized authority: \"Recommended by Dr. Anya Sharma.\"", "Mention certifications or studies: \"Clinically proven to...\"", "Use authority language: \"Ahli bilang...\", \"Studi menunjukkan...\""],
        visualMust: ["An expert in their environment (lab coat, clinic, office).", "Official certification badges or \"As Seen In\" logos.", "Data visualizations or graphs from a study."]
    },
    'Scarcity': {
        copyMust: ["State limited quantity explicitly: \"Hanya 100 unit tersisa.\"", "Mention exclusivity: \"Limited edition design.\"", "Create fear of missing out: \"Once it's gone, it's gone forever.\""],
        visualMust: ["A stock level bar that is almost empty.", "An \"Almost Sold Out\" or \"Limited Edition\" stamp.", "A person rushing to grab the last item off a shelf."]
    },
    'Urgency': {
        copyMust: ["Include an explicit deadline: \"Diskon 50% berakhir malam ini.\"", "State the consequence of delay: \"Harga naik besok.\"", "Use time-sensitive language: \"Sekarang\", \"Buruan\""],
        visualMust: ["A countdown timer animation or graphic.", "A calendar with today's date circled in red.", "A person looking stressed while glancing at a clock."]
    },
    'Reciprocity': {
        copyMust: ["Offer something of value for free ('Get your free guide')", "Frame it as giving before asking ('We want you to try it first')", "Use generous language: 'A gift for you', 'On us'"],
        visualMust: ["Show the free item/bonus prominently", "Show someone happy receiving the free gift", "Show a 'FREE' badge or gift visual"]
    },
    'Liking': {
        copyMust: ["Use a friendly, conversational tone", "Share a personal, relatable story ('I used to be just like you')", "Use inclusive language: 'We all know the feeling'"],
        visualMust: ["Show a relatable influencer or person from the target persona", "Show genuine smiles and warm eye contact", "Use a casual, authentic setting, not a stiff studio"]
    },
    'Fear of Missing Out (FOMO)': {
        copyMust: ["Highlight what others are experiencing ('See what everyone is talking about')", "Emphasize a trend or movement ('Don't be the only one missing out')", "Use FOMO language: 'Don't get left behind', 'Everyone is doing it'"],
        visualMust: ["Show a crowd of people enjoying the product", "Show a 'everyone has it but you' scenario", "Show someone 'left out' vs. the happy group with the product"]
    },
    'Exclusivity': {
        copyMust: ["Emphasize limited access ('Members only', 'Invite-only')", "Mention VIP or premium status", "Use exclusive language: 'Not available to the public', 'The private collection'"],
        visualMust: ["Show a VIP or membership card", "Show a 'members only' sign", "Show luxury or premium packaging"]
    },
    'Instant Gratification': {
        copyMust: ["Promise fast results ('See results in 3 days', 'Feel the difference instantly')", "Emphasize speed and ease ('Quick', 'Instant', 'No hassle')", "Use urgent language: 'Get it right now', 'Instantly'"],
        visualMust: ["Show a rapid transformation (fast-forward visual)", "Show a clock or timer indicating a short duration", "Show someone surprised by the speed of the results"]
    }
};

export const generateCreativeIdeas = async (blueprint: CampaignBlueprint, angle: string, trigger: BuyingTriggerObject, awarenessStage: AwarenessStage, format: CreativeFormat, placement: PlacementFormat, persona: TargetPersona, strategicPathId: string, allowVisualExploration: boolean, offer: OfferTypeObject, preferredCarouselArc?: string): Promise<Omit<AdConcept, 'imageUrls'>[]> => {
    let carouselArcGuidance = '';
    if (placement === 'Carousel') {
        carouselArcGuidance = preferredCarouselArc
            ? `You MUST use the "${preferredCarouselArc}" arc: ${CAROUSEL_ARCS[preferredCarouselArc]}`
            : `Choose the MOST FITTING arc from: ${Object.keys(CAROUSEL_ARCS).join(', ')}`;
    }
    
    const triggerKey = Object.keys(TRIGGER_IMPLEMENTATION_CHECKLIST).find(k => k.toLowerCase() === trigger.name.toLowerCase()) || trigger.name;
    const triggerChecklist = TRIGGER_IMPLEMENTATION_CHECKLIST[triggerKey] || { copyMust: [], visualMust: [] };

    const brief = `
        ---
        ### CREATIVE BRIEF
        - **Product**: ${blueprint.productAnalysis.name} (Benefit: ${blueprint.productAnalysis.keyBenefit})
        - **Strategic Offer**: ${offer.name} - ${offer.description} (CTA: ${blueprint.adDna.cta})
        - **Sales DNA**:
            - Persuasion Formula: "${blueprint.adDna.persuasionFormula}"
            - Tone of Voice: "${blueprint.adDna.toneOfVoice}"
        - **Original Visual Style DNA**: "${blueprint.adDna.visualStyle}"
        - **Target Country for Localization**: "${blueprint.adDna.targetCountry}"
        - **Target Persona**: "${persona.description}" (Age: "${persona.age}", Type: "${persona.creatorType}", Pain Points: ${persona.painPoints.join(', ')})
        - **Creative Mandate**:
            - Angle: "${angle}"
            - 🔥 Psychological Trigger: "${trigger.name}" (Description: ${trigger.description}). In your JSON response, you must return the full trigger object for "${trigger.name}".
            - Awareness Stage: "${awarenessStage}"
            - Format: "${format}"
            - Placement: "${placement}"
        - **Carousel Arc Guidance (if applicable)**: ${carouselArcGuidance}
        ---
    `;

    const prompt = `
You are an expert direct response copywriter specializing in paid advertising. Your task is to write static ad headlines and generate corresponding visual concepts that stop cold traffic, communicate value instantly, and drive conversions. Every output must be optimized for users who have NEVER heard of the brand before.

## Core Principles (Non-Negotiable Rules)
- **Assume Zero Brand Awareness:** Write for someone scrolling fast who knows nothing about you. The headline must be self-explanatory in 2 seconds.
- **Cold Audience First = Scalability:** Headlines that only convert warm audiences CANNOT scale. Cold-optimized headlines work for both cold AND warm traffic.
- **Clarity Always Beats Cleverness:** Clear > Clever, every single time. No puns, wordplay, or inside jokes.
- **Lead with Problem or Outcome (Never Features):** Start with what the user cares about: their pain or desired result.
- **Specificity = Credibility:** Vague claims = ignored. Numbers, timeframes, concrete details = trust.

## ENTITY ID BREAKING RULES (MANDATORY FOR SCALING)
Meta's Andromeda system groups ads with similar first 3 seconds under the same Entity ID. If Entity IDs match = ❌ No new learning, No incremental reach. For EACH new concept variation, you MUST change at least 3 of these: Setting/Location, Subject's Age/Appearance, Camera Angle, Lighting Style, Action/Movement, Color Dominance.

## The Copy-First Workflow (Non-Negotiable)
1.  **Step 1: Write the Words (Copywriter Mode):** Focus ONLY on the text. Write a scroll-stopping Hook, a Headline using the library below, brief Body Copy, and a clear CTA.
2.  **Step 2: Visualize the Message (Art Director Mode):** With copy finalized, ask: "What single image makes this copy 10x more powerful?" Use the Visual Prompt Architecture to construct a prompt that is a direct, strategic interpretation of the words.

## Headline Formula Library
Use these proven structures. Choose a formula that best suits the hook and audience awareness.
- **Formula 1: Problem + Solution:** "[Painful Problem]? → [Your Solution]"
- **Formula 2: Outcome + Timeframe + Proof Element:** "[Specific Result] in [Time] ([Optional: Without X])"
- **Formula 3: Number-Based Credibility:** "[Number] [Type of People/Things] That [Achieved Result]"
- **Formula 4: Problem-Focused Question:** "[Relatable Pain Point]?"
- **Formula 5: Negation (Remove the Pain):** "No More [Pain]" / "Stop [Bad Thing]"
- **Formula 6: Before/After Transformation:** "From [Bad State] to [Good State] in [Timeframe]"
- **Formula 7: Direct Command (Action + Benefit):** "[Power Verb] [Specific Benefit]"
- **Formula 8: Contrarian/Pattern Interrupt:** "Stop [Common Advice] (Here's Why)"

## Psychological Trigger Implementation Checklist for "${trigger.name}"
Your concept MUST pass BOTH a copy and a visual test for the trigger.
- **Copy Must Include (check at least 1):** ${triggerChecklist.copyMust.join('; ')}
- **Visual Must Show (check at least 1):** ${triggerChecklist.visualMust.join('; ')}

## Visual Prompt Architecture (9-Block Framework)
When creating visual prompts, use this exact structure for maximum clarity and impact.
- **Block 1: Pattern Interrupt (The Scroll-Stopper):** Describe ONE unexpected visual element.
- **Block 2: Emotional Anchor (The Human Element):** Core Feeling & detailed Facial Expression.
- **Block 3: Commercial Goal (The Ad's Job):** Start with a phrase like "A high-converting ad image..."
- **Block 4: Scene Foundation (The Context):** Ultra-specific Setting and Time/Lighting.
- **Block 5: Subject (The Persona):** Define the main character of the ad.
- **Block 6: Trigger Visualization (The Psychology):** How does the scene physically SHOW the psychological trigger?
- **Block 7: Product Integration (The Hero):** Place the product as the clear solution.
- **Block 8: Style DNA Fusion (The Aesthetic):** Define the artistic direction.
- **Block 9: Technical Specs (The Execution):** Quality, Composition ("${COMPOSITION_FOR_ADS[placement]}"), Aspect Ratio.

## Carousel-Specific Strategy (5-Slide Story Arcs)
If creating a carousel, follow the provided guidance and structure it as a 5-slide story. Maintain a consistent visual theme and text placement. The final slide must be a clear CTA.

## Mandatory Variation Strategy for A/B Testing: The Three Entry Points Framework
You MUST generate three truly different ad concepts for testing, one for each entry point:
- **Variant A - Emotional Entry:** Leads with feeling, identity, or aspiration. (Best for Top of Funnel)
- **Variant B - Logical Entry:** Leads with logic, proof, data, or a unique mechanism. (Best for Middle of Funnel)
- **Variant C - Social Entry:** Leads with community, tribe, or social proof. (Best for Bottom of Funnel)

Each variant MUST have a fundamentally different visual fingerprint to break the Entity ID.

${brief}

Now, based on all the rules and the brief, generate an array of 3 unique ad concept JSON objects.
- Each object must follow the provided schema.
- Each must represent one of the three entry points (Emotional, Logical, Social).
- Each must have a unique visual prompt to ensure different Entity IDs.
- For 'adSetName', follow this format: [PersonaBrief]_[AngleKeyword]_[Trigger]_[Awareness]_[Format]_[Placement]_v[1, 2, or 3].
- For the 'offer' field, you MUST return the full offer object from the Strategic Offer in the brief.
- Provide JSON output only.
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
            // MANDAT: Pecah Entity ID dengan secara sengaja mengubah gaya.
            textPrompt = `${salesIntent}
**MANDAT KRITIS: PECAH ENTITY ID**
Gambar referensi yang disediakan adalah untuk konteks gaya, TETAPI gambar yang dihasilkan HARUS BERBEDA SECARA FUNDAMENTAL untuk menghindari penalti platform Meta dan menjangkau audiens baru.

**DNA GAYA REFERENSI (UNTUK DIHINDARI/DIUBAH SECARA SIGNIFIKAN):**
- **Latar/Lokasi:** ${styleDNA.settingType}
- **Pencahayaan:** ${styleDNA.lightingStyle}
- **Komposisi/Sudut:** ${styleDNA.compositionApproach}
- **Gaya Model:** ${styleDNA.modelStyling}
- **Palet Warna:** ${styleDNA.colorPalette}
- **Gaya Fotografi:** ${styleDNA.photographyStyle}

**TUGAS ANDA:**
1.  Pahami adegan baru yang dijelaskan dalam prompt ini: "${prompt}"
2.  Render adegan ini sambil secara sadar **MENGUBAH SETIDAKNYA TIGA (3)** elemen dari DNA Gaya Referensi di atas.
    - **Contoh Perubahan Wajib:** Jika referensi adalah 'Studio dalam ruangan', buat gambar baru di 'Kafe perkotaan yang ramai'. Jika referensi adalah 'Pencahayaan dramatis', gunakan 'Cahaya alami siang hari yang lembut'. Jika referensi adalah 'Close-up', gunakan 'Medium shot'.
3.  Tujuan utamanya adalah untuk membuat gambar yang terasa seperti berasal dari kampanye yang sama sekali **BERBEDA**, namun tetap mempertahankan kualitas merek secara keseluruhan. Prioritaskan **keunikan visual** di atas kesamaan gaya. Gambar akhir harus memiliki "sidik jari visual" yang unik.`;
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
    evolutionType: 'angle' | 'trigger' | 'format' | 'placement' | 'awareness' | 'offer' | 'painDesire' | 'persona' | 'visualVehicle' | 'objection',
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
        persona: `Adaptasi seluruh konsep untuk persona target baru: "${(newValue as TargetPersona).description}". Ini memerlukan penulisan ulang headline, hook, dan prompt visual agar sangat relevan dengan poin masalah dan keinginan spesifik persona baru ini. Sudut pandang inti ("${baseConcept.angle}") mungkin perlu sedikit dibingkai ulang.`,
        visualVehicle: `Adaptasi konsep ke 'visual vehicle' baru: "${newValue}". Ini adalah perubahan visual murni. Pertahankan copy inti (hook, headline) sama persis, tetapi bayangkan kembali visualPrompt sepenuhnya untuk mencerminkan gaya visual "${newValue}" yang baru. Ini adalah cara yang kuat untuk memecah Entity ID.`,
        objection: `Adaptasi konsep untuk mengatasi keberatan baru: "${(newValue as ObjectionObject).name}". Sudut pandang dan pesan inti harus dibingkai ulang untuk secara langsung melawan keberatan ini.`
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

export const generateUgcPack = async (blueprint: CampaignBlueprint, persona: TargetPersona, strategicPathId: string): Promise<Omit<AdConcept, 'imageUrls'>[]> => {
    const prompt = `
      Anda adalah seorang direktur kreatif yang berspesialisasi dalam kampanye Konten Buatan Pengguna (UGC) berkinerja tinggi.
      
      **WAWASAN DATA META:** Kampanye UGC dengan kreator yang beragam (4-5 sudut pandang berbeda) mengungguli kampanye kreator tunggal sebanyak 3x.
      
      **Tugas Anda:**
      Hasilkan "Paket Keragaman UGC" berisi 4 konsep iklan berdasarkan brief yang disediakan.
      
      **Brief:**
      - Produk: ${blueprint.productAnalysis.name}
      - Persona Induk: ${persona.description}
      - Penawaran: "${blueprint.adDna.offerSummary}"
      - Negara Target: ${blueprint.adDna.targetCountry}
      
      **INSTRUKSI KRITIS:**
      1.  Untuk setiap konsep, pilih sudut pandang strategis, pemicu, dan tahap kesadaran yang paling sesuai.
      2.  Setiap konsep HARUS mewakili sub-tipe kreator yang BERBEDA dalam persona utama.
          - Contoh sub-tipe: "Si Skeptis yang menjadi Percaya", "Ibu Sibuk yang menemukan jalan pintas", "Ahli yang didorong oleh Data", "Influencer yang berfokus pada Estetika".
      3.  'format' untuk SEMUA konsep harus 'UGC'.
      4.  Teks (hook, headline) untuk setiap konsep harus disesuaikan dengan suara sub-tipe kreatornya yang spesifik.
      5.  Prompt visual harus menggambarkan orang yang berbeda dalam latar yang berbeda dan otentik untuk memaksimalkan keragaman.
      6.  Untuk 'strategicPathId' gunakan "${strategicPathId}".

      **🔥 ATURAN KERAGAMAN UGC KRITIS (Mandat Keragaman Kreator Meta):**
      Untuk SETIAP dari 4 konsep, Anda HARUS memvariasikan:
      1. **Demografi Kreator:** Usia dan gaya yang berbeda (mis. Mahasiswa 18-24, Profesional 30-an).
      2. **Latar Visual:** Latar yang sama sekali berbeda (mis. Kamar kos, Kantor, Dapur, Luar ruangan).
      3. **Gaya Kamera:** Gaya yang berbeda (mis. Selfie, Tripod, Genggam).
      4. **Waktu Hari:** Waktu yang berbeda untuk variasi pencahayaan (mis. Pagi, Malam, Golden hour).
      
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

export const generateConceptFromRemix = async (baseConcept: AdConcept, component: AdDnaComponent, payload: any, blueprint: CampaignBlueprint): Promise<Omit<AdConcept, 'imageUrls'>> => {
    const evolutionType = component as ('angle' | 'trigger' | 'format' | 'placement' | 'awareness' | 'offer' | 'painDesire' | 'persona' | 'visualVehicle' | 'objection');
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
    strategicPathId: string
): Promise<Omit<AdConcept, 'imageUrls'>[]> => {
    
    const prompt = `
        Anda adalah seorang ahli strategi kreatif dan copywriter direct response kelas dunia yang berspesialisasi dalam kampanye iklan Meta. Tugas Anda adalah menghasilkan satu set konsep iklan yang sangat beragam berdasarkan matriks format kreatif.

        **PRINSIP INTI YANG TIDAK BISA DITAWAR (DALAM KONTEKS INDONESIA):**
        1.  **Asumsikan Zero Brand Awareness:** Tulis untuk audiens dingin. Kejelasan > Kecerdasan.
        2.  **Fokus pada Masalah atau Hasil:** Fokus pada apa yang dipedulikan pengguna, bukan fitur.
        3.  **Spesifisitas = Kredibilitas:** Gunakan angka dan detail konkret.
        4.  **🔥 MANDAT KRITIS: PECAH ENTITY ID:** Sangat PENTING bahwa setiap konsep memiliki ciri visual yang BERBEDA SECARA FUNDAMENTAL untuk memaksimalkan jangkauan di Meta. Gunakan latar, pencahayaan, demografi subjek, dan sudut kamera yang berbeda untuk setiap konsep. Ini adalah aturan nomor satu. Saat membuat prompt visual, pastikan setiap konsep memiliki latar, gaya pencahayaan, dan komposisi yang SAMA SEKALI BERBEDA.

        **BRIEF KAMPANYE:**
        - Produk: ${blueprint.productAnalysis.name} (Manfaat: ${blueprint.productAnalysis.keyBenefit})
        - Penawaran Strategis: ${blueprint.adDna.offerSummary} (CTA: ${blueprint.adDna.cta})
        - DNA Penjualan: Gunakan formula persuasi "${blueprint.adDna.persuasionFormula}" dengan nada "${blueprint.adDna.toneOfVoice}".
        - Negara Target untuk Lokalisasi: "${blueprint.adDna.targetCountry}"
        - Persona Target: "${persona.description}" (Usia: "${persona.age}", Tipe: "${persona.creatorType}", Poin Masalah: ${persona.painPoints.join(', ')})

        **TUGAS ANDA: BUAT MATRIKS KONSEP IKLAN**
        Hasilkan array JSON dari ${formats.length} konsep iklan unik, satu untuk setiap format kreatif berikut:

        - **Format Kreatif:** [${formats.join(', ')}]

        **UNTUK SETIAP KONSEP DALAM MATRIKS, ANDA HARUS:**
        1.  **Pilih Pemicu Psikologis & Sudut Pandang TERBAIK:** Untuk setiap format, pilih pemicu dan sudut pandang strategis yang paling sesuai untuk kombinasi format/persona ini.
        2.  **Tulis Teks Iklan (Copy-First):** Buat 'hook' yang menghentikan guliran dan 'headline' yang kuat yang menerapkan pemicu psikologis yang Anda pilih.
        3.  **🔥 Buat Visual yang Unik:** Tulis 'visualPrompt' yang sangat terperinci yang (a) secara visual memperkuat teks iklan dan (b) BERBEDA secara fundamental dari prompt visual lainnya dalam set ini. Anda HARUS memvariasikan latar, pencahayaan, model/subjek, dan sudut kamera untuk setiap konsep untuk menjamin Entity ID yang unik.
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

export const generateHpAuthorityPack = async (blueprint: CampaignBlueprint, persona: TargetPersona, strategicPathId: string): Promise<Omit<AdConcept, 'imageUrls'>[]> => {
    const prompt = `
        Anda adalah seorang ahli strategi kreatif senior yang berspesialisasi dalam iklan yang dipimpin oleh Pendiri/Pakar (HP).
        Tugas Anda adalah membuat "Paket Otoritas HP" yang berisi 3 konsep iklan yang berbeda.
        
        **Brief:**
        - Produk: ${blueprint.productAnalysis.name} - ${blueprint.productAnalysis.keyBenefit}
        - Persona: ${persona.description}
        - Penawaran: "${blueprint.adDna.offerSummary}"
        - Negara Target: ${blueprint.adDna.targetCountry}
        
        **ALUR KERJA WAJIB:**
        1.  **Identifikasi 3 Keberatan Teratas:** Pertama, pikirkan 3 keberatan paling umum yang akan dimiliki oleh persona ini terhadap produk ini.
        2.  **Hasilkan 3 Konsep:** Untuk setiap keberatan, hasilkan satu konsep iklan yang secara langsung mengatasinya.
        
        **PERSYARATAN KONSEP (UNTUK SETIAP DARI 3 KONSEP):**
        1.  **Penanganan Keberatan:** Headline dan hook HARUS secara langsung melawan salah satu keberatan yang Anda identifikasi.
        2.  **Sudut Pandang "Kita vs Mereka":** Bingkai solusi sebagai cara yang superior dibandingkan "cara lama" atau pesaing.
        3.  **Persona "Pakar/Pendiri":** 'visualPrompt' HARUS menggambarkan seorang ahli yang kredibel atau pendiri yang bersemangat (sesuai dengan Tipe Kreator 'Pakar'). Visual harus memancarkan otoritas dan kepercayaan.
        4.  **Format Kreatif:** Gunakan format yang sesuai untuk membangun otoritas, seperti 'Iklan Artikel', 'Advertorial', atau 'Demo'.
        5.  **Keragaman Visual:** Pastikan setiap konsep memiliki prompt visual yang berbeda secara fundamental (latar, pencahayaan, komposisi yang berbeda) untuk memecah Entity ID.
        6.  Gunakan ID Jalur Strategis ini untuk semua konsep: "${strategicPathId}".
        
        Hanya berikan respons berupa array JSON dari 3 objek konsep iklan yang mematuhi skema.
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
