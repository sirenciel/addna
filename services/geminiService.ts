
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { CampaignBlueprint, AdConcept, CreativeFormat, PlacementFormat, AwarenessStage, TargetPersona, BuyingTriggerObject, CarouselSlide, ObjectionObject, PainDesireObject, OfferTypeObject, PivotType, PivotConfig, AdDnaComponent, AdDna, RemixSuggestion } from '../types';

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
    'Instagram Story': 'Leave top 25% clear for headline. Main subject in middle-lower third. Never cover the subject\'s face with text.',
    'Instagram Feed': 'Follow Rule of thirds or Z-pattern reading flow. Leave clear space for text overlay. Never cover the subject\'s face.',
    'Carousel': 'Slide 1: Center subject with clear bg. Slides 2-5: Varied composition with consistent text zones. Never cover the main subject\'s face.'
};

const CAROUSEL_ARCS: Record<string, string> = {
    'PAS': 'Problem-Agitate-Solution. Ideal for direct response. Slide 1 (Hook): State the PROBLEM in a shocking or relatable way. Slide 2 (Agitate): Describe the PAIN and frustration of the problem. Why is it so bad? Slide 3 (Solution): Introduce your product as the SOLUTION. The "aha!" moment. Slide 4 (Proof): Show evidence it works (testimonial, data, before/after). Slide 5 (CTA): Tell them exactly what to do next.',
    'Transformation': 'Before & After narrative. Best for Before & After, Testimonials. Slide 1 (Hook): Show the glorious AFTER state. Slide 2 (Before): Reveal the painful BEFORE state. Slide 3 (The Struggle): Detail the journey and failed attempts. Slide 4 (The Discovery): How they found your solution. Slide 5 (CTA): Invite others to start their transformation.',
    'Educational': 'Teach something valuable. Best for "Educational/Tip" or "Demo" formats. Structure: (Intriguing Hook -> Bust Myth 1 -> Bust Myth 2 -> Reveal The Truth/Method -> CTA/Product Link)',
    'Testimonial Story': 'Customer-centric story. Use for "Testimonial" or "UGC" formats. Structure: (Hook with a powerful quote -> Introduce the customer & their story -> The specific result they got -> How the product made it possible -> CTA)'
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
        carouselSlides: { type: Type.ARRAY, items: carouselSlideSchema }
    },
     required: [
        'id', 'angle', 'trigger', 'format', 'placement', 'awarenessStage', 'strategicPathId', 
        'personaDescription', 'personaAge', 'personaCreatorType', 'visualVehicle', 'hook', 
        'headline', 'visualPrompt', 'adSetName', 'offer'
    ]
};

const pivotAdConceptSchema = {
    type: Type.OBJECT,
    properties: {
        ...adConceptSchema.properties,
    },
    required: adConceptSchema.required,
};


export const analyzeCampaignBlueprint = async (imageBase64: string, caption: string, productInfo: string, offerInfo: string): Promise<CampaignBlueprint> => {
  const imagePart = imageB64ToGenerativePart(imageBase64, 'image/jpeg');
  const prompt = `
    As a world-class DIRECT RESPONSE COPYWRITING EXPERT, your task is to analyze the provided ad creative and context to reverse-engineer its "SALES DNA" and create a comprehensive "Campaign Blueprint". Your goal is not just to describe what you see, but to deeply understand the persuasion strategy at play.

    CONTEXT:
    - Ad Caption: "${caption}"
    - Product/Service Description: "${productInfo || 'Not provided. Infer from ad.'}"
    - Offer/CTA: "${offerInfo || 'Not provided. Infer from ad.'}"

    Based on all the provided information (image and text), generate a structured JSON object for the Campaign Blueprint.

    Respond ONLY with the single, valid JSON object that conforms to the provided schema.
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
        You are a market research expert. Based on the provided 'Campaign Blueprint', generate 3 new, distinct target persona variations.
        These personas should be plausible alternative audiences for the product, exploring different demographics, psychographics, or use cases.

        Campaign Blueprint:
        - Product: ${blueprint.productAnalysis.name}
        - Key Benefit: ${blueprint.productAnalysis.keyBenefit}
        - Original Persona: ${blueprint.targetPersona.description}
        - Target Country: ${blueprint.adDna.targetCountry}

        Existing Persona Descriptions to avoid:
        ${existingPersonas.map(p => `- ${p.description}`).join('\n')}

        For each new persona, create a JSON object with the structure defined in the schema.
        
        Respond ONLY with a JSON array of these persona objects.
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
        You are a master consumer psychologist. Your task is to identify the deepest emotional drivers for a specific target persona.
        Based on the provided campaign context, generate a mix of 4 distinct, core emotional drivers: 2 Pains (fears, frustrations) and 2 Desires (aspirations, goals).

        **Context:**
        - **Product:** ${blueprint.productAnalysis.name} - It solves problems by delivering "${blueprint.productAnalysis.keyBenefit}".
        - **Target Persona:** ${persona.description}
        - **Known Pains:** ${persona.painPoints.join(', ')}
        - **Known Desires:** ${persona.desiredOutcomes.join(', ')}
        - **Target Country for Localization:** "${blueprint.adDna.targetCountry}"

        **Instructions:**
        1.  Go beyond the surface-level pains and desires provided. Dig deeper into the *underlying emotional state*.
        2.  For each driver, define its "type" as either "Pain" or "Desire".
        3.  Provide a short, impactful "name" (e.g., "Fear of Being Left Behind", "Desire for Effortless Confidence").
        4.  Provide a "description" explaining the driver from the persona's point of view.
        5.  Provide the "emotionalImpact" which describes the raw feeling this driver causes (e.g., "Anxiety and social pressure", "Freedom and self-assurance").

        **Output:**
        Respond ONLY with a valid JSON array of 4 objects (2 Pains, 2 Desires) that conform to the schema.
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
        You are a seasoned market researcher and sales psychologist. Your task is to predict the 3 MOST LIKELY objections a specific persona will have, stemming directly from a core emotional driver (a pain or desire).

        **Context:**
        - **Product:** ${blueprint.productAnalysis.name} (Key Benefit: ${blueprint.productAnalysis.keyBenefit})
        - **Offer:** ${blueprint.adDna.offerSummary}
        - **Target Persona:** ${persona.description}
        - **Target Country for Localization:** "${blueprint.adDna.targetCountry}"

        **🔥 Core Emotional Driver:**
        - **Type:** ${painDesire.type}
        - **Name:** "${painDesire.name}"
        - **Description:** "${painDesire.description}"
        - **Emotional Impact:** "${painDesire.emotionalImpact}"

        **Instructions:**
        1.  Connect the dots: How does the product's promise interact with this specific emotional driver to create skepticism or doubt?
        2.  For each objection, provide a short, clear "name" (e.g., "This won't work for MY specific situation", "The results look too good to be true", "It's probably too expensive for the value").
        3.  Provide a "description" explaining the psychology behind the objection, linking it back to the core emotional driver.
        4.  Provide a strategic "counterAngle" that suggests the best way to address this objection in an ad.

        **Output:**
        Respond ONLY with a valid JSON array of 3 objection objects that conform to the schema.
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
        You are a master marketer and behavioral economist. Your task is to craft 3 distinct, compelling "Offer Types" designed specifically to neutralize a customer's objection.

        **Context:**
        - **Product:** ${blueprint.productAnalysis.name} (Benefit: ${blueprint.productAnalysis.keyBenefit})
        - **Original Offer:** ${blueprint.adDna.offerSummary}
        - **Target Persona:** ${persona.description}
        - **Target Country for Localization:** "${blueprint.adDna.targetCountry}"

        **🔥 Customer Objection to Overcome:**
        - **Objection Name:** "${objection.name}"
        - **Psychology:** "${objection.description}"

        **Instructions:**
        1.  Analyze the objection. What is the root fear or concern? (e.g., Fear of loss, skepticism, price sensitivity).
        2.  Generate 3 distinct offer structures that directly address this root concern.
        3.  For each offer, provide:
            - A clear "name" (e.g., "Risk-Free 30-Day Trial", "Value Bundle Discount", "Pay-in-3 Installments").
            - A "description" explaining how the offer works for the customer.
            - The core "psychologicalPrinciple" at play (e.g., "Risk Reversal", "Value Anchoring", "Pain of Payment Reduction").

        **Output:**
        Respond ONLY with a valid JSON array of 3 offer objects that conform to the schema.
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
        You are a creative strategist. Your task is to generate 4 distinct, high-level strategic angles for an ad campaign.
        **CRITICAL CONSTRAINTS:**
        1. Each angle MUST directly counter a specific customer objection.
        2. Each angle MUST resonate with a core emotional driver (Pain/Desire).
        3. Each angle MUST be framed within the context of the provided Offer Type.

        **Campaign Blueprint:**
        - Product Benefit: ${blueprint.productAnalysis.keyBenefit}
        - Core Persuasion Strategy: Use a "${blueprint.adDna.toneOfVoice}" tone to apply the "${blueprint.adDna.persuasionFormula}" formula.
        - Target Country: ${blueprint.adDna.targetCountry}

        **Target Persona:**
        - Description: ${persona.description}

        **🔥 Core Emotional Driver:**
        - **Type:** ${painDesire.type}
        - **Name:** "${painDesire.name}"

        **🔥 Customer Objection to Overcome:**
        - **Objection Name:** "${objection.name}"
        - **Suggested Counter-Strategy:** "${objection.counterAngle}"

        **🔥 Strategic Offer Type:**
        - **Offer Name:** "${offer.name}"
        - **Psychology:** "${offer.psychologicalPrinciple}"

        **🔥 Target Awareness Stage:** ${awarenessStage}

        **Your Task:**
        Based on all the context above, generate 4 strategic angles.
        1. The angles must be tailored to someone in the "${awarenessStage}" stage.
        2. **Crucially, each angle must be a creative execution of the counter-strategy, while also connecting to the core emotional driver and leveraging the provided offer.**
        3. Use the "Suggested Counter-Strategy" and "Strategic Offer Type" as your primary inspiration.

        ${existingAngles.length > 0 ? `IMPORTANT: Do not generate any of the following angles, as they already exist: ${existingAngles.join(', ')}.` : ''}

        Respond ONLY with a JSON array of 4 unique angle strings. For example: ["Highlight the risk-free trial to build trust and counter skepticism", "Showcase the long-term value and ROI from the bundle to justify the price", "Demonstrate the product's simplicity and then present the easy installment plan"]
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
        You are a Direct Response Copywriting Coach. Your goal is to educate an advertiser on the best psychological triggers to use for their campaign by creating a mini "Swipe File".
        Based on the campaign context, select the 4 MOST RELEVANT and POWERFUL psychological triggers from the predefined list below. The triggers must be appropriate for the audience's awareness stage.
        Then, for each selected trigger, explain it clearly, provide a concrete example, and analyze why that example works for this specific audience.

        **Predefined List of Psychological Triggers:**
        - **Social Proof:** People trust what others are doing. (e.g., "Join 10,000+ happy customers").
        - **Authority:** People trust experts and credible sources. (e.g., "Recommended by top dermatologists").
        - **Scarcity:** People want what is rare or limited. (e.g., "Only 50 left in stock!").
        - **Urgency:** People act when there's a time limit. (e.g., "Sale ends tonight!").
        - **Reciprocity:** People feel obligated to give back after receiving something. (e.g., "Get a free guide & see how it works").
        - **Liking:** People buy from those they know, like, and trust. (e.g., using a relatable influencer).
        - **Fear of Missing Out (FOMO):** People don't want to be left out of a positive experience. (e.g., "See what everyone is talking about").
        - **Exclusivity:** People want to be part of a select group. (e.g., "Get access to our private community").
        - **Instant Gratification:** People want results now. (e.g., "See visible results in just 3 days").

        **Context:**
        - **Product:** ${blueprint.productAnalysis.name}
        - **Key Benefit:** ${blueprint.productAnalysis.keyBenefit}
        - **Target Persona:** ${persona.description} (Pain Points: ${persona.painPoints.join(', ')})
        - **Strategic Angle:** "${angle}"
        - **Awareness Stage:** "${awarenessStage}"
        - **Target Country for Localization:** "${blueprint.adDna.targetCountry}"

        **Instructions:**
        1.  Analyze the context and choose the 4 best triggers from the list. For "Unaware" or "Problem Aware" stages, triggers like Reciprocity or Liking are better. For "Solution Aware" or "Product Aware", triggers like Scarcity or Social Proof are more effective.
        2.  For each chosen trigger, create a JSON object with four fields as defined in the schema: "name", "description", "example", and "analysis".
        3.  The "example" should be a specific, actionable ad copy snippet or visual idea that resonates in "${blueprint.adDna.targetCountry}".
        4.  **Crucially, the "analysis" field must explain in 1-2 sentences WHY this example is effective for this specific persona and context, as if you were annotating a successful ad in a swipe file.**

        **Output:**
        Respond ONLY with a valid JSON array of these 4 objects. Do not include any other text or markdown.
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
        You are a Direct Response Copywriting Coach.
        Your task is to provide the details for a specific psychological trigger within a given campaign context, including a "swipe file" analysis.

        **Psychological Trigger to Detail:** "${triggerName}"

        **Campaign Context:**
        - **Product:** ${blueprint.productAnalysis.name}
        - **Key Benefit:** ${blueprint.productAnalysis.keyBenefit}
        - **Target Persona:** ${persona.description} (Pain Points: ${persona.painPoints.join(', ')})
        - **Strategic Angle:** "${angle}"
        - **Target Country for Localization:** "${blueprint.adDna.targetCountry}"

        **Instructions:**
        1.  Provide a clear, concise "description" for "${triggerName}".
        2.  Create a concrete "example" of how this trigger applies directly to the provided campaign context.
        3.  Provide an "analysis" explaining in 1-2 sentences WHY this example would be effective for this specific persona and context.
        4.  Return a single JSON object with four fields: "name" (which should be "${triggerName}"), "description", "example", and "analysis".

        **Output:**
        Respond ONLY with the single, valid JSON object that conforms to the schema. Do not include any other text or markdown.
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
    'Unaware': [
        'Pola Aneh/Kontrarian: "Stop [Saran Umum]. (Ini cara yang benar)."',
        'Pertanyaan Fokus-Masalah: "Apakah Anda juga [Masalah yang sangat spesifik dan relatable]?"',
    ],
    'Problem Aware': [
        'Masalah → Solusi: "[Masalah Menyakitkan]? → Ini solusinya."',
        'Hilangkan Rasa Sakit: "Ucapkan Selamat Tinggal pada [Rasa Sakit/Masalah]."',
    ],
    'Solution Aware': [
        'Hasil + Jangka Waktu: "Dapatkan [Hasil Spesifik] dalam [Jangka Waktu] (Tanpa [Pengorbanan])"',
        'Transformasi Sebelum/Sesudah: "Dari [Kondisi Buruk] menjadi [Kondisi Baik] dalam [Jangka Waktu]."',
        'Perintah Langsung + Manfaat: "[Kata Kerja Aksi] untuk [Manfaat Utama]."',
    ],
    'Product Aware': [
        'Kredibilitas Berbasis Angka: "[Jumlah] [Tipe Orang] telah beralih ke [Produk Anda]."',
        'Penawaran Langsung: "Dapatkan [Penawaran Spesifik Anda] - Hanya [Elemen Urgensi/Kelangkaan]."',
    ]
};

const TRIGGER_IMPLEMENTATION_CHECKLIST: Record<string, { copyMust: string[], visualMust: string[] }> = {
    'Social Proof': {
        copyMust: ["Sebutkan angka spesifik (misal, 'Bergabung dengan 10.000+ pelanggan bahagia')", "Kutip testimoni nyata ('Ini mengubah segalanya bagi saya.' - Jane D.)", "Gunakan kata-kata aksi kolektif seperti 'terbukti', 'semua orang menggunakan'"],
        visualMust: ["Tampilkan beberapa orang yang menggunakan produk dengan senang", "Tampilkan overlay kutipan/rating testimoni pada gambar", "Tampilkan kolase konten buatan pengguna (UGC) atau 'lautan wajah'"]
    },
    'Authority': {
        copyMust: ["Sebutkan ahli atau otoritas yang diakui (misal, 'Direkomendasikan oleh Dr. Anya Sharma')", "Sebutkan sertifikasi atau studi ('Terbukti secara klinis untuk...')", "Gunakan bahasa otoritas: 'Para ahli mengatakan', 'Studi menunjukkan'"],
        visualMust: ["Tampilkan seorang ahli di lingkungannya (jas lab, klinik, kantor)", "Tampilkan lencana sertifikasi resmi atau logo 'Seperti yang Dilihat Di'", "Tampilkan visualisasi data atau grafik dari sebuah studi"]
    },
    'Scarcity': {
        copyMust: ["Sebutkan kuantitas terbatas secara eksplisit ('Hanya 100 unit tersisa')", "Sebutkan eksklusivitas ('Desain edisi terbatas')", "Ciptakan ketakutan akan kehilangan ('Setelah habis, tidak akan ada lagi')"],
        visualMust: ["Tampilkan bar stok yang hampir kosong", "Tampilkan stempel 'Hampir Habis' atau 'Edisi Terbatas'", "Tampilkan seseorang bergegas untuk mengambil item terakhir"]
    },
    'Urgency': {
        copyMust: ["Sertakan tenggat waktu yang eksplisit ('Diskon 50% berakhir malam ini')", "Sebutkan konsekuensi dari penundaan ('Harga naik besok')", "Gunakan bahasa yang peka waktu: 'Sekarang', 'Segera'"],
        visualMust: ["Tampilkan timer hitung mundur atau grafik", "Tampilkan kalender dengan tanggal hari ini dilingkari merah", "Tampilkan seseorang yang tampak stres sambil melirik jam"]
    },
    'Reciprocity': {
        copyMust: ["Tawarkan sesuatu yang berharga secara gratis ('Dapatkan panduan gratis Anda')", "Bingkai sebagai memberi sebelum meminta ('Kami ingin Anda mencobanya terlebih dahulu')", "Gunakan bahasa kemurahan hati: 'Hadiah untuk Anda', 'Dari kami untuk Anda'"],
        visualMust: ["Tampilkan item gratis/bonus secara menonjol", "Tampilkan seseorang yang senang menerima hadiah gratis", "Tampilkan lencana 'GRATIS' atau visual kado"]
    },
    'Liking': {
        copyMust: ["Gunakan nada yang ramah dan percakapan", "Bagikan cerita pribadi atau relatable ('Saya dulu juga seperti itu')", "Gunakan bahasa inklusif: 'Kita semua tahu perasaan itu'"],
        visualMust: ["Tampilkan influencer atau orang yang relatable dengan persona target", "Tampilkan senyum tulus dan kontak mata yang hangat", "Gunakan latar yang kasual dan otentik, bukan studio yang kaku"]
    },
    'Fear of Missing Out (FOMO)': {
        copyMust: ["Tonjolkan pengalaman orang lain ('Lihat apa yang semua orang bicarakan')", "Tekankan tren atau gerakan ('Jangan menjadi satu-satunya yang ketinggalan')", "Gunakan bahasa FOMO: 'Jangan sampai ketinggalan', 'Semua orang melakukannya'"],
        visualMust: ["Tampilkan kerumunan orang yang menikmati produk", "Tampilkan skenario 'semua orang memilikinya kecuali Anda'", "Tampilkan seseorang yang 'tertinggal' vs. kelompok yang bahagia dengan produk"]
    },
    'Exclusivity': {
        copyMust: ["Tekankan akses terbatas ('Hanya untuk anggota', 'Khusus undangan')", "Sebutkan status VIP atau premium", "Gunakan bahasa eksklusif: 'Tidak tersedia untuk umum', 'Koleksi pribadi'"],
        visualMust: ["Tampilkan kartu VIP atau keanggotaan", "Tampilkan tanda 'hanya untuk anggota'", "Tampilkan kemasan mewah atau premium"]
    },
    'Instant Gratification': {
        copyMust: ["Janjikan hasil cepat ('Lihat hasilnya dalam 3 hari', 'Langsung terasa bedanya')", "Tekankan kecepatan dan kemudahan ('Cepat', 'Instan', 'Tanpa repot')", "Gunakan bahasa yang mendesak: 'Dapatkan sekarang juga', 'Langsung'"],
        visualMust: ["Tampilkan transformasi cepat (visual fast-forward)", "Tampilkan jam atau timer yang menunjukkan durasi singkat", "Tampilkan seseorang yang terkejut dengan cepatnya hasil"]
    }
};

export const generateCreativeIdeas = async (blueprint: CampaignBlueprint, angle: string, trigger: BuyingTriggerObject, awarenessStage: AwarenessStage, format: CreativeFormat, placement: PlacementFormat, persona: TargetPersona, strategicPathId: string, allowVisualExploration: boolean, offer: OfferTypeObject): Promise<Omit<AdConcept, 'imageUrls'>[]> => {
    const formatInstructions: Record<CreativeFormat, string> = {
        'UGC': "Simulate a genuine user-generated video or photo. The tone should be authentic, not overly polished. Visual prompt should describe a realistic setting.",
        'Before & After': "Clearly show a 'before' state demonstrating a problem and an 'after' state showing the solution provided by the product. The transformation should be obvious.",
        'Comparison': "Compare the product directly or indirectly with an alternative (e.g., 'the old way'). Highlight the product's superior features or benefits.",
        'Demo': "Show the product in action. The visual prompt should focus on the product being used and its key functionality.",
        'Testimonial': "Feature a satisfied customer. The hook and headline should read like a quote. The visual prompt should depict a person representing the target persona, looking happy and confident.",
        'Problem/Solution': "Start by clearly presenting a common problem the target persona faces. Agitate the problem by describing the frustrations it causes. Finally, present the product as the perfect solution. The visual should depict the 'problem' or the 'solution' state vividly.",
        'Educational/Tip': "Provide genuine value by teaching the audience something useful related to the product's domain. Frame the ad as a helpful tip or a quick 'how-to'. The product should be naturally integrated as a tool to achieve the tip's outcome.",
        'Storytelling': "Tell a short, relatable story where a character (representing the persona) overcomes a challenge using the product. The narrative should have a clear beginning, middle, and end. The focus should be on the emotional journey and transformation.",
        'Article Ad': "Simulate a snippet of a news article or an authoritative blog post. The visual should look like a screenshot of a high-quality online publication, with a compelling headline and image that feels like editorial content.",
        'Split Screen': "Create a visual that is literally split in half. One side shows the 'problem' or 'the old way,' and the other side shows the 'solution' with your product. The contrast should be stark and instantly understandable.",
        'Advertorial': "Design an ad that mimics the style of editorial content from a trusted magazine or blog. It should be visually appealing, informative, and less 'salesy' at first glance. The copy should be educational or story-driven.",
        'Listicle': "Frame the ad as a list, like '5 Reasons Why...' or 'Top 3 Mistakes...'. For carousels, each slide is one point on the list. For static images, the visual should represent the #1 point, with the headline teasing the list.",
        'MultiProduct': "Showcase multiple products at once, either as a bundle, a collection, or a range of options. The visual prompt should clearly arrange the products in an attractive way, highlighting the value of the group.",
        'US vs Them': "Create a strong contrast between your brand/product (Us) and the competition or the old, inferior way of doing things (Them). The visual and copy should clearly establish two opposing sides and position your product as the obvious winner.",
        'Meme/Ugly Ad': "Utilize a currently popular meme format or create an intentionally 'ugly,' low-fidelity design that looks like a native, organic post. The goal is to stop the scroll through humor, relatability, and by avoiding the polished look of a typical ad.",
        'Direct Offer': "Make the offer the absolute hero of the ad. The visual should be bold and centered around the discount, bonus, or special deal (e.g., '50% OFF' in large text). The copy should be direct and clearly explain the offer and its urgency/scarcity."
    };

    const placementInstructions: Record<PlacementFormat, string> = {
        'Carousel': `**CAROUSEL CREATION MANDATE**: 
1.  First, you MUST choose the MOST SUITABLE story arc from the list below based on the creative format ("${format}") and strategic angle.
    - **PAS (Problem-Agitate-Solution)**: ${CAROUSEL_ARCS['PAS']}
    - **Transformation**: ${CAROUSEL_ARCS['Transformation']}
    - **Educational**: ${CAROUSEL_ARCS['Educational']}
    - **Testimonial Story**: ${CAROUSEL_ARCS['Testimonial Story']}
2.  After choosing an arc, generate a 'carouselSlides' array with exactly 5 slides that follow its narrative structure.
3.  **CRITICAL**: You must follow a COPY-FIRST workflow. First, write the copy (headline, description) for all 5 slides. THEN, for each slide's copy, create a 'visualPrompt' that is a direct visual interpretation of that specific slide's message and follows the composition rule for Carousels.
4.  The final slide MUST always be the Call to Action (CTA) which incorporates the offer: "${offer.name}".
5.  All text MUST be in ${blueprint.adDna.targetCountry} language and match the ${blueprint.adDna.toneOfVoice} tone.`,
        'Instagram Feed': "Design for a 1:1 or 4:5 aspect ratio. The visual should be high-quality and scroll-stopping. The hook should be an engaging question or a bold statement to encourage interaction in the caption.",
        'Instagram Story': "Design for a 9:16 vertical aspect ratio. The visual should feel native and authentic to the platform. The hook should be quick and punchy. The visual prompt can suggest text overlays or interactive elements."
    };
    
     const visualStyleInstruction = allowVisualExploration
    ? `- **Style**: Anda BEBAS mengusulkan visualStyle dan visualPrompt yang sama sekali baru, TAPI **gunakan gaya visual asli ("${blueprint.adDna.visualStyle}") sebagai titik awal atau inspirasi**. Tujuannya adalah variasi kreatif, bukan sesuatu yang sama sekali tidak berhubungan. Buatlah sesuatu yang tak terduga namun tetap terasa 'on-brand'.`
    : `- **Style**: The visual style MUST be a direct evolution of the original 'Visual Style DNA'. Blend the DNA ("${blueprint.adDna.visualStyle}") with the persona's aesthetic ("${persona.creatorType}"). The result should look like a new ad from the same brand, for a different audience segment. **DO NOT create a visual style that is completely unrelated to the original DNA.**`;


    const prompt = `
        You are a world-class direct response copywriter and creative director. Your task is to generate an array of 3 **strategically distinct** ad concepts based on a single brief. You must follow all principles and workflows provided.

        ---
        **NON-NEGOTIABLE CORE PRINCIPLES:**
        1.  **Assume Zero Brand Awareness:** Write for a cold audience. Clarity > Cleverness.
        2.  **Lead with Problem or Outcome:** Focus on what the user cares about, not features.
        3.  **Specificity = Credibility:** Use numbers and concrete details.

        **MANDATORY WORKFLOW: COPY-FIRST**
        Your process for EACH concept must be: First, write the selling words (hook, headline). Second, create a visual that makes those words 10x more powerful.

        **🔥 YOUR CORE MISSION: A/B TEST VARIATIONS (Three Entry Points Framework)**
        It is CRITICAL that the three concepts are NOT just reworded versions of each other. You MUST generate three genuinely different creative hypotheses:
        - **Concept 1 - "Emotional Entry"**: Leads with feeling, identity, or aspiration. Answers "How will this make me feel?"
        - **Concept 2 - "Logical Entry"**: Leads with logic, proof, data, or a unique mechanism. Answers "How does this work?"
        - **Concept 3 - "Social Entry"**: Leads with community, tribe, or social proof. Answers "Who else uses this?"

        ---
        **THE BRIEF (Your Foundation):**
        - Product: ${blueprint.productAnalysis.name} (Benefit: ${blueprint.productAnalysis.keyBenefit})
        - **Strategic Offer**: ${offer.name} - ${offer.description} (CTA: ${blueprint.adDna.cta})
        - **Sales DNA**:
            - Persuasion Formula: "${blueprint.adDna.persuasionFormula}"
            - Tone of Voice: "${blueprint.adDna.toneOfVoice}"
        - **Original Visual Style DNA: "${blueprint.adDna.visualStyle}"**
        - **Target Country for Localization: "${blueprint.adDna.targetCountry}"**
        - **Target Persona**: "${persona.description}" (Age: "${persona.age}", Type: "${persona.creatorType}", Pains: ${persona.painPoints.join(', ')})
        - **Creative Mandate**:
            - Angle: "${angle}"
            - 🔥 Psychological Trigger: "${trigger.name}" (Description: ${trigger.description}). In your JSON response, you must return a full trigger object for "${trigger.name}".
            - Awareness Stage: "${awarenessStage}"
            - Format: "${format}" (Guidelines: ${formatInstructions[format]})
            - Placement: "${placement}" (Guidelines: ${placementInstructions[placement]})

        **🔥 TRIGGER IMPLEMENTATION CHECKLIST for "${trigger.name}":**
        Your COPY must include at least ONE of these: ${TRIGGER_IMPLEMENTATION_CHECKLIST[trigger.name]?.copyMust.join(', ')}.
        Your VISUAL PROMPT must include at least ONE of these: ${TRIGGER_IMPLEMENTATION_CHECKLIST[trigger.name]?.visualMust.join(', ')}.
        ⚠️ If your concept doesn't pass this checklist, it FAILS.
        
        ---
        **CREATION PROCESS FOR EACH OF THE 3 CONCEPTS (Emotional, Logical, Social):**

        **STEP 1: Write the Words (Copywriter Mode)**
        1.  **HOOK:** Generate a world-class, scroll-stopping hook that scores high on at least TWO of:
            - **Curiosity Gap:** Creates a powerful need to know the answer.
            - **Specificity:** Uses concrete numbers, details, timelines.
            - **Contrarianism:** Challenges a common belief.
        2.  **HEADLINE:** You MUST use one of these formulas for the "${awarenessStage}" stage, adapting it to your chosen entry point (Emotional/Logical/Social). You will fill in the bracketed placeholders with specific, compelling text.
            ${HEADLINE_FORMULAS[awarenessStage].map((f, i) => `${i + 1}. ${f}`).join('\n')}
        3.  The copy must align with the trigger "${trigger.name}", the offer "${offer.name}", and be localized for ${blueprint.adDna.targetCountry}.

        **STEP 2: Visualize the Message (Art Director Mode)**
        - Create a detailed **visualPrompt** using this EXACT **9-Block Visual Prompt Architecture**:

        **[Block 1: Pattern Interrupt (The Scroll-Stopper)]**
        - Describe ONE unexpected, high-contrast visual element that breaks the scroll pattern. (e.g., A vibrant neon object in a monochrome scene).

        **[Block 2: Emotional Anchor (The Human Element)]**
        - **Core Feeling:** State the target emotion (e.g., Ecstatic relief, quiet confidence).
        - **Facial Expression:** Detail the expression with intensity, ensuring direct eye contact with the camera.

        **[Block 3: Commercial Goal (The Ad's Job)]**
        - Start the prompt with a phrase like: "A high-converting ad image," or "Ultra-photorealistic commercial photography."

        **[Block 4: Scene Foundation (The Context)]**
        - **Setting:** Be ultra-specific and relatable for an audience in **${blueprint.adDna.targetCountry}**.
        - **Time/Lighting:** Specific time of day and lighting style (e.g., "Golden hour sunlight").

        **[Block 5: Subject (The Persona)]**
        - Describe the main person: "${persona.description}, age ${persona.age}, with ${persona.creatorType} aesthetic." Use active verbs reflecting the copy. Style must be authentic to **${blueprint.adDna.targetCountry}** culture.

        **[Block 6: Trigger Visualization (The Psychology)]**
        - How does the scene physically SHOW the "${trigger.name}" trigger? You MUST implement one of these visual cues: ${TRIGGER_IMPLEMENTATION_CHECKLIST[trigger.name]?.visualMust.join('; ')}.

        **[Block 7: Product Integration (The Hero)]**
        - Where is the product? How does it relate to the subject? It must be the clear 'hero' or 'enabler' of the emotion.

        **[Block 8: Style DNA Fusion (The Aesthetic)]**
        - ${visualStyleInstruction} Describe the resulting COLOR PALETTE and MOOD.

        **[Block 9: Technical Specs (The Execution)]**
        - **Quality:** Photorealistic, high-end camera look, sharp focus.
        - **Composition for Ads (NON-NEGOTIABLE):** Adhere to this rule for a '${placement}' placement: **"${COMPOSITION_FOR_ADS[placement]}"**.
        - **Aspect Ratio:** ${placement === 'Instagram Story' ? '9:16 vertical' : placement === 'Instagram Feed' ? '1:1 or 4:5' : 'digital ad optimized'}.
        ---
        
        **INTERNAL QUALITY CHECK:**
        Before responding, ensure your 3 concepts are truly DIFFERENT (Emotional vs Logical vs Social) and that each one follows the COPY-FIRST workflow and passes the 9-Block visual architecture and trigger checklist. If not, REGENERATE.
        
        ---

        Now, generate an array of 3 JSON objects using the process above. Adhere strictly to the provided JSON schema. For 'adSetName', follow this format: [PersonaShort]_[AngleKeyword]_[Trigger]_[Awareness]_[Format]_[Placement]_v[1, 2, or 3]. For the 'offer' field, you MUST return a full offer object matching the Strategic Offer.
        Respond ONLY with the JSON array.
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

    return ideas.map((idea, index) => ({
        ...idea,
        entryPoint: entryPoints[index % 3] as 'Emotional' | 'Logical' | 'Social'
    }));
};


export const generateAdImage = async (prompt: string, referenceImageBase64?: string, allowVisualExploration: boolean = false): Promise<string> => {
    
    const NEGATIVE_PROMPT = "NO generic stock photo look, NO obvious AI artifacts (weird hands, distorted faces), NO text in image (we'll add overlay), NO watermarks or logos unless product branding, NO cluttered composition, NO excessive filters that look unnatural.";
    const salesIntent = `A highly persuasive, high-converting, and scroll-stopping advertisement image designed to sell a product. The image must be ultra-photorealistic, high-contrast, and emotionally resonant. The central focus must be on the user's benefit or transformation. Negative prompt: ${NEGATIVE_PROMPT}`;
    
    let textPrompt: string;
    const parts: any[] = [];

    if (referenceImageBase64) {
        parts.push(imageB64ToGenerativePart(referenceImageBase64));
        if (allowVisualExploration) {
            // When exploration is allowed, the reference image is "inspiration" for STYLE ONLY.
            textPrompt = `${salesIntent} The provided image is a **STYLE REFERENCE ONLY**. Your task is to extract its artistic style (e.g., color palette, lighting, composition, texture) and apply it to a **COMPLETELY NEW SCENE** described in the following prompt. **IMPORTANT: DO NOT replicate the subject matter, objects, or people from the reference image.** The content for the new image must come *exclusively* from the text that follows. The new scene is: ${prompt}. The final image must look like a professional, high-converting ad, not a generic stock photo or AI illustration.`;
        } else {
            // When exploration is NOT allowed, the reference image is a strict guide.
            textPrompt = `${salesIntent} Using the provided reference image for style, lighting, and mood, create this new scene: ${prompt}. The final image must look like a professional, high-converting ad, not a generic stock photo.`;
        }
    } else {
        // No reference image at all.
        textPrompt = `${salesIntent} The scene is: ${prompt}. The final image must look like a professional, high-converting ad, not a generic stock photo or AI illustration.`;
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
    
    console.error("Image generation failed. Response:", JSON.stringify(response, null, 2));
    throw new Error('Image generation failed: No image data received from API or the request was blocked.');
};

export const refineVisualPrompt = async (concept: AdConcept, blueprint: CampaignBlueprint): Promise<string> => {
    const prompt = `
        You are an expert prompt engineer for AI image generators.
        Your task is to generate a new, detailed, specific visual prompt that is perfectly aligned with the provided ad copy (hook) and visual direction (visual vehicle).

        **Ad Concept Details:**
        - **Product:** ${blueprint.productAnalysis.name}
        - **Persona:** ${concept.personaDescription} (Age: ${concept.personaAge}, Style: ${concept.personaCreatorType})
        - **Headline:** ${concept.headline}
        - **🔥 Text Hook (The primary text the user sees):** "${concept.hook}"
        - **Psychological Trigger:** "${concept.trigger.name}"
        - **Creative Format:** ${concept.format}
        - **Target Country:** ${blueprint.adDna.targetCountry}
        - **Visual Vehicle (The high-level visual direction):** "${concept.visualVehicle}"

        **Task:**
        Generate a new \`visualPrompt\` string that:
        1.  **Creates a strong 'Visual Hook'**: The scene described must be the visual counterpart to the 'Text Hook'. What visual would make that text hook 10x more powerful and scroll-stopping?
        2.  Faithfully executes the direction given in the \`visualVehicle\`.
        3.  Visually embodies the psychological trigger: "${concept.trigger.name}".
        4.  Is authentic to the persona's age and style, and culturally appropriate for **${blueprint.adDna.targetCountry}**. The scene must feel genuine to them.
        5.  Creates a unique visual style by thoughtfully blending the original ad's DNA ("${blueprint.adDna.visualStyle}") with the persona's authentic aesthetic.
        6.  Includes rich details about composition, lighting, subject's expression, action, and environment.
        7.  Is highly descriptive and specific, ready to be used with an AI image generator.

        Respond ONLY with the text for the new visual prompt, without any labels or quotation marks.
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
    evolutionType: 'angle' | 'trigger' | 'format' | 'placement',
    newValue: string | BuyingTriggerObject
): Promise<Omit<AdConcept, 'imageUrls'>[]> => {
    
    const evolutionInstructions = {
        angle: `Adapt the concept to a new strategic angle: "${newValue}". The trigger ("${baseConcept.trigger.name}") and format ("${baseConcept.format}") should remain consistent, but the core message (headline, hook) and visual must be re-imagined to reflect this new angle.`,
        trigger: `Adapt the concept to use a new psychological trigger: "${(newValue as BuyingTriggerObject).name}" (Description: ${(newValue as BuyingTriggerObject).description}). The angle ("${baseConcept.angle}") and format ("${baseConcept.format}") should remain consistent, but the headline, hook, and visual must be rewritten to powerfully evoke the feeling of "${(newValue as BuyingTriggerObject).name}".`,
        format: `Adapt the concept to a new creative format: "${newValue}". The angle ("${baseConcept.angle}") and trigger ("${baseConcept.trigger.name}") are the same, but the entire execution (headline, hook, visual) must be re-imagined for the new format. If the new format is "Carousel", you MUST generate a "carouselSlides" array.`,
        placement: `Adapt the concept for a new placement: "${newValue}". The core creative (angle, trigger, format) is the same, but the execution must be optimized. For "Instagram Story", this means a 9:16 aspect ratio and a punchier hook. For "Carousel", it means telling a story across multiple slides.`
    };

    const prompt = `
        You are a world-class creative director tasked with strategically evolving an existing ad concept.
        Given a base creative concept and a specific evolution mandate, generate ONE new, distinct ad concept that expertly adapts the original idea.

        **Campaign Blueprint:**
        - Product: ${blueprint.productAnalysis.name} (Benefit: ${blueprint.productAnalysis.keyBenefit})
        - Persona: ${baseConcept.personaDescription} (Age: ${baseConcept.personaAge}, Creator Type: ${baseConcept.personaCreatorType})
        - **Sales DNA**:
            - Persuasion Formula: "${blueprint.adDna.persuasionFormula}"
            - Tone of Voice: "${blueprint.adDna.toneOfVoice}"
        - Visual Style DNA: "${blueprint.adDna.visualStyle}"
        - Target Country for Localization: "${blueprint.adDna.targetCountry}"
        - **Strategic Offer to use**: "${baseConcept.offer.name} - ${baseConcept.offer.description}"

        **Base Creative Concept:**
        - Angle: "${baseConcept.angle}"
        - Trigger: "${baseConcept.trigger.name}"
        - Format: "${baseConcept.format}"
        - Placement: "${baseConcept.placement}"
        - Headline: "${baseConcept.headline}"
        - Hook: "${baseConcept.hook}"
        
        **🔥 Evolution Mandate: ${evolutionInstructions[evolutionType]}**

        Now, generate an array containing ONE new JSON object for the evolved concept.
        Adhere strictly to the provided JSON schema.
        For 'adSetName', create a new name reflecting the new evolved parameters, like: [Persona]_[NewAngle/Trigger/etc]_[...]_v1.
        For the 'offer' field, you MUST return the full offer object from the 'Strategic Offer to use' section above.

        Respond ONLY with a JSON array containing the single new concept object.
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
    
    return result.map((concept): Omit<AdConcept, 'imageUrls'> => ({
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
      CRITICAL MANDATE: Adapt this WINNING concept for a different age group.
      - **Original Age:** ${baseConcept.personaAge}
      - **Target Age:** ${config.targetAge}
      
      **YOUR TASK:**
      1. **Persona Re-profiling:** Rewrite the persona description to authentically represent the ${config.targetAge} demographic. Update pain points and desires to match their life stage.
      2. **Language Adaptation:** Adjust tone and vocabulary:
         - 18-24: Use Gen Z slang, meme references, irony. Be super casual.
         - 25-34: Professional but relatable. Career & lifestyle focused.
         - 35-44: Family-oriented language. Emphasize time-saving and quality.
         - 45+: Clear, straightforward, trust-building. Avoid slang.
      3. **Visual Adaptation:** Change the model/subject age in the visual prompt to ${config.targetAge}. Adjust setting to match their lifestyle (e.g., 18-24 = dorm/cafe, 35-44 = home office/kitchen).
      4. **Pain Point Shift:** The CORE pain might change. Example:
         - 18-24: "I want to look good for Insta" → "I want to feel confident at college"
         - 35-44: "I want quick results" → "I need something that fits my busy schedule"
      
      **KEEP CONSTANT:** 
      - Strategic Angle: "${baseConcept.angle}"
      - Psychological Trigger: "${baseConcept.trigger.name}"
      - Creative Format: "${baseConcept.format}"
      - Placement: "${baseConcept.placement}"
      
      The STRATEGY stays the same, but EXECUTION must authentically speak to ${config.targetAge}.
    `,

    'gender-flip': `
      CRITICAL MANDATE: Adapt this WINNING concept for the opposite gender.
      - **Original Persona:** ${baseConcept.personaDescription}
      - **Target Gender:** ${config.targetGender}
      
      **YOUR TASK:**
      1. **Persona Re-gender:** Rewrite the description for a ${config.targetGender} person. Be authentic - don't just swap pronouns. Consider:
         - Different pain points (e.g., Male: "hair loss anxiety", Female: "aging skincare concerns")
         - Different desired outcomes (e.g., Male: "confidence in dating", Female: "professional image")
      2. **Copy Adaptation:** 
         - Male audience: Direct, achievement-oriented, logic + emotion blend
         - Female audience: Empathy-first, community/social proof, emotion + logic blend
      3. **Visual Adaptation:** Change the subject in visual prompt to be a ${config.targetGender} person. Adjust styling and setting to feel authentic (not stereotypical).
      4. **Social Proof Shift:** If using testimonials, switch gender of testimonial givers to match target.
      
      **KEEP CONSTANT:** Same strategic angle, trigger, format, placement.
      
      ⚠️ AVOID STEREOTYPES. The pivot must feel authentic, not pandering.
    `,

    'lifestyle-swap': `
      CRITICAL MANDATE: Adapt this WINNING concept for a different lifestyle/creator type.
      - **Original Type:** ${baseConcept.personaCreatorType}
      - **Target Type:** ${config.targetLifestyle}
      
      **YOUR TASK:**
      1. **Lifestyle Reprofiling:** Completely reimagine the persona as a "${config.targetLifestyle}". Change:
         - Daily routines & challenges
         - Values & aspirations (e.g., Influencer values aesthetics, Regular User values practicality)
         - Social proof sources they trust
      2. **Visual Style Pivot:** 
         - Influencer: Curated, aspirational, high-production
         - Regular User: Authentic, relatable, "iPhone photo" quality
         - Expert: Professional setting, credibility signals (e.g., lab coat, charts)
      3. **Copy Tone Shift:**
         - Influencer: "This changed my content game!" (aspirational)
         - Regular User: "As a busy mom, this saves me so much time!" (relatable)
         - Expert: "Based on my 10 years in the field..." (authoritative)
      4. **Pain Point Reframing:** Same product, different "job to be done":
         - Influencer: "I need this to create better content"
         - Regular User: "I need this to simplify my life"
      
      **KEEP CONSTANT:** Same strategic angle, trigger, format, placement.
    `,

    'market-expand': `
      CRITICAL MANDATE: Localize this WINNING concept for a new market.
      - **Original Market:** ${blueprint.adDna.targetCountry}
      - **Target Market:** ${config.targetCountry}
      
      **YOUR TASK - DEEP CULTURAL LOCALIZATION:**
      1. **Language Localization:**
         - If targeting Indonesia: Use "Bahasa Gaul" (Jaksel slang), e.g., "literally", "which is"
         - If targeting Malaysia: Mix Malay/English naturally
         - If targeting Singapore: Singlish patterns, e.g., "lah", "lor"
         - If targeting Philippines: Taglish, e.g., "Grabe, super effective!"
      
      2. **Cultural Value Shifts:**
         - Indonesia: Family-centric, halal awareness, "gotong royong" (community)
         - Malaysia: "Kiasu" mentality (fear of missing out), Islamic values
         - Singapore: Efficiency, meritocracy, "chope" culture (reserving)
         - Philippines: "Bayanihan" spirit, family pride, "utang na loob" (debt of gratitude)
      
      3. **Visual Cultural Markers:**
         - Setting must be RECOGNIZABLE to target market (e.g., HDB flat for Singapore, "warung" for Indonesia)
         - Models must have authentic features & styling for the region
         - Include subtle cultural props (e.g., prayer mat for Malaysia/Indonesia Muslim demo)
      
      4. **Payment & Pricing Localization:**
         - Indonesia: Always mention "cicilan 0%" (installments)
         - Singapore: Emphasize premium quality, worth the investment
         - Philippines: Show affordability, accessible to "masa"
      
      5. **Social Proof Sources:**
         - Use LOCAL influencers, testimonials from the target country
         - Reference local trends, not global ones
      
      **KEEP CONSTANT:** Same strategic angle, trigger, format, placement.
      
      ⚠️ CRITICAL: This is NOT just translation. It's cultural TRANSFORMATION.
    `,

    'awareness-shift': `
      CRITICAL MANDATE: Retarget this WINNING concept for a different awareness stage.
      - **Original Stage:** ${baseConcept.awarenessStage}
      - **Target Stage:** ${config.targetAwareness}
      
      **YOUR TASK - AWARENESS STAGE ADAPTATION:**
      1. **Hook Rewrite (MOST CRITICAL):**
         - **Unaware:** Problem-focused, pattern interrupt. "Ever notice how...?"
         - **Problem Aware:** Agitation, empathy. "Tired of struggling with...?"
         - **Solution Aware:** Mechanism reveal, differentiation. "Unlike other solutions..."
         - **Product Aware:** Direct offer, social proof. "Join 10,000+ customers..."
      
      2. **Headline Formula Shift:**
         - Use the appropriate formula for ${config.targetAwareness} stage from the hook formulas.
      
      3. **Visual Shift:**
         - Unaware: Show relatable "problem moment" they didn't know was a problem
         - Problem Aware: Dramatize the pain/frustration
         - Solution Aware: Show the mechanism or comparison
         - Product Aware: Show the product in use + results
      
      4. **Copy Depth:**
         - Unaware: Short, curiosity-driven. Don't "sell" yet.
         - Problem Aware: Medium, agitate then tease solution.
         - Solution Aware: Longer, explain "how it works" and why it's better.
         - Product Aware: Brief, direct. They know the product, just push them over the edge.
      
      **KEEP CONSTANT:** Same angle, trigger, format, placement.
      
      The MESSAGE stays the same, but the ENTRY POINT changes based on their knowledge level.
    `,

    'channel-adapt': `
      CRITICAL MANDATE: Optimize this WINNING concept for a different platform.
      - **Original Platform:** Instagram
      - **Target Platform:** ${config.targetPlatform}
      
      **YOUR TASK - PLATFORM-SPECIFIC OPTIMIZATION:**
      
      ${config.targetPlatform === 'TikTok' ? `
        **TikTok Optimization:**
        1. **Hook:** MUST grab attention in 0.5 seconds. Use pattern interrupt or trending sound reference.
        2. **Video Flow:** "Hook → Agitate → Solution → CTA" in 15-30 seconds max.
        3. **Visual Style:** Raw, authentic, "behind-the-scenes" feel. NO polished ad look.
        4. **Copy Tone:** Super casual, Gen Z slang, emoji-heavy. Use TikTok lingo (e.g., "no cap", "slay", "understood the assignment").
        5. **CTA:** "Link in bio" or "Duet this if you relate!"
        6. **Text Overlay:** Use TikTok's native text styles (white with black outline, positioned top/bottom).
      ` : ''}
      
      ${config.targetPlatform === 'Facebook' ? `
        **Facebook Optimization:**
        1. **Hook:** First 3 lines of caption are CRITICAL (before "See More"). Make it a complete thought.
        2. **Visual Style:** More polished than TikTok, but not as curated as Instagram. Think "professional but relatable".
        3. **Copy Length:** Facebook allows longer copy - use it. Tell a story, include FAQs.
        4. **Audience:** Skews older (35+). Use clear, trust-building language. Less slang.
        5. **Social Proof:** Heavy on testimonials, reviews, before-afters. Facebook users are more skeptical.
        6. **CTA:** "Learn More" button works best. Lead to landing page, not direct product page.
      ` : ''}
      
      ${config.targetPlatform === 'YouTube' ? `
        **YouTube Optimization (Pre-Roll/In-Stream Ad):**
        1. **Hook:** First 5 seconds must establish WIIFM ("What's In It For Me"). Viewer can skip after 5 sec.
        2. **Structure:** "Problem → Agitation → Solution Demo → CTA" in 15-30 seconds.
        3. **Visual:** Show the product in ACTION. Demo format works best.
        4. **Audio:** Must work WITH sound (unlike Instagram Feed which is often muted). Use voiceover or on-screen talent speaking.
        5. **CTA:** Overlay clickable end card with website URL.
      ` : ''}
      
      **KEEP CONSTANT:** Same strategic angle, trigger, core message.
      
      The CONTENT stays similar, but PRESENTATION must be native to ${config.targetPlatform}.
    `
  };

  const prompt = `
    You are a world-class creative strategist performing a "Quick Pivot" on a PROVEN WINNING ad concept.
    
    **CONTEXT:**
    This ad concept has already been tested and is performing well. Your job is NOT to reinvent it, but to ADAPT it intelligently for a different audience/context while keeping the core winning elements intact.
    
    **Base Winning Concept:**
    - Headline: "${baseConcept.headline}"
    - Hook: "${baseConcept.hook}"
    - Persona: ${baseConcept.personaDescription} (Age: ${baseConcept.personaAge}, Type: ${baseConcept.personaCreatorType})
    - Angle: "${baseConcept.angle}"
    - Trigger: "${baseConcept.trigger.name}"
    - Format: "${baseConcept.format}"
    - Visual: ${baseConcept.visualVehicle}
    
    **Campaign Blueprint (for context):**
    - Product: ${blueprint.productAnalysis.name} (Benefit: ${blueprint.productAnalysis.keyBenefit})
    - Sales DNA Tone: "${blueprint.adDna.toneOfVoice}"
    - Visual Style DNA: "${blueprint.adDna.visualStyle}"
    - Offer: "${baseConcept.offer.name} - ${baseConcept.offer.description}"
    
    ---
    **PIVOT TYPE: ${pivotType.toUpperCase().replace('-', ' ')}**
    
    ${pivotInstructions[pivotType]}
    
    ---
    **QUALITY STANDARDS:**
    - The pivoted concept must feel like a NATURAL SIBLING of the original, not a forced rewrite.
    - Maintain the same "energy" and persuasive power.
    - Don't make it generic - keep it specific and emotionally resonant for the new target.
    
    Now, generate an array of ONE pivoted ad concept as a JSON object following the schema.
    For 'adSetName', use this format: [NewPersonaShort]_[Angle]_[Trigger]_[Awareness]_[Format]_[Placement]_pivot
    For 'id', generate a new unique ID.
    For 'strategicPathId', keep the same as the base concept: "${baseConcept.strategicPathId}"
    For the 'offer' field, you MUST return the full offer object from the 'Base Winning Concept' context above.

    Respond ONLY with a JSON array containing the single new concept object.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ parts: [{ text: prompt }] }],
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
    const ideas = JSON.parse(cleanedJson) as (Omit<AdConcept, 'imageUrls' | 'entryPoint'>)[];
    
    return ideas.map(idea => ({ ...idea, entryPoint: 'Pivoted' }));
};

export const generateRemixSuggestions = async (
    component: AdDnaComponent,
    baseConcept: AdConcept,
    dna: AdDna,
    blueprint: CampaignBlueprint
): Promise<RemixSuggestion[]> => {

    const prompt = `
        You are an expert creative strategist. Your task is to generate 3 smart, distinct alternatives for a specific component of a winning ad's DNA.

        **Winning Ad DNA:**
        - Product: ${blueprint.productAnalysis.name} (Benefit: ${blueprint.productAnalysis.keyBenefit})
        - Persona: ${dna.persona.description}
        - Pain/Desire: ${dna.painDesire.name}
        - Trigger: ${dna.trigger.name}
        - Format: ${dna.format}
        - Country: ${blueprint.adDna.targetCountry}

        **🔥 DNA Component to Remix: Persona**

        **Your Mission:**
        Generate 3 entirely new, plausible Target Persona variations. For each variation, you must:
        1.  Create a "title" that summarizes the new persona (e.g., "Option 1: Male Gen Z (18-24)").
        2.  Create a "description" that BRIEFLY explains the necessary strategic shifts in copy, visuals, and pain points to appeal to this new persona.
        3.  Create a full "payload" object which is a valid JSON object for the new Target Persona, following the provided schema. This payload must be a complete, ready-to-use persona object.

        **CRITICAL:** The variations must be genuinely different from the original persona and from each other. Think about different demographics, psychographics, and use cases.
        
        Respond ONLY with a valid JSON array of 3 suggestion objects.
    `;

    const remixSuggestionSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            payload: targetPersonaSchema
        },
        required: ['title', 'description', 'payload']
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ text: prompt }],
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: remixSuggestionSchema,
            }
        }
    });
    
    const rawJson = response.text;
    const cleanedJson = rawJson.replace(/^```json\s*|```$/g, '');
    return JSON.parse(cleanedJson);
};


export const generateConceptFromRemix = async (
    baseConcept: AdConcept,
    remixComponent: AdDnaComponent,
    newPayload: TargetPersona, // Currently only persona
    blueprint: CampaignBlueprint
): Promise<Omit<AdConcept, 'imageUrls'>> => {

    const newPersona = newPayload;

    const prompt = `
        You are a world-class creative director. Your task is to adapt a proven winning ad concept for a COMPLETELY NEW target persona. You must retain the core strategic successful elements but completely re-imagine the execution to be authentic and resonant for the new audience.

        **Core Winning Strategy (DO NOT CHANGE):**
        - Angle: "${baseConcept.angle}"
        - Trigger: "${baseConcept.trigger.name}"
        - Format: "${baseConcept.format}"
        - Placement: "${baseConcept.placement}"
        - Awareness Stage: "${baseConcept.awarenessStage}"
        - Offer: "${baseConcept.offer.name} - ${baseConcept.offer.description}"
        - Sales DNA Tone: "${blueprint.adDna.toneOfVoice}"
        - Original Visual Style DNA: "${blueprint.adDna.visualStyle}"

        **Base Concept (for context only):**
        - Original Persona: "${baseConcept.personaDescription}"
        - Original Headline: "${baseConcept.headline}"

        **🔥 NEW TARGET PERSONA (YOUR ADAPTATION MANDATE):**
        - **Description:** ${newPersona.description}
        - **Age:** ${newPersona.age}
        - **Creator Type/Style:** ${newPersona.creatorType}
        - **Pain Points:** ${newPersona.painPoints.join(', ')}
        - **Desired Outcomes:** ${newPersona.desiredOutcomes.join(', ')}
        - **Target Country:** ${blueprint.adDna.targetCountry}

        **Your Task:**
        Generate ONE new ad concept JSON object.
        1.  **Rewrite Copy:** Create a new 'hook' and 'headline' that speaks directly to the new persona's pains and desires, in their language and tone.
        2.  **Re-imagine Visuals:** Create a new 'visualPrompt' and 'visualVehicle' that are authentic to the new persona's world (setting, style, model).
        3.  **Update Persona Fields:** The 'personaDescription', 'personaAge', and 'personaCreatorType' fields in the JSON must reflect the NEW persona.
        4.  **Create New Ad Set Name:** Generate a new 'adSetName' that reflects the new persona.
        5.  Keep the 'strategicPathId' the same as the base concept.
        6.  For the 'offer' field, you MUST return the full offer object from the 'Core Winning Strategy' context above.

        Respond ONLY with a single valid JSON object that conforms to the ad concept schema.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ text: prompt }],
        config: {
            responseMimeType: "application/json",
            responseSchema: adConceptSchema,
        }
    });

    const rawJson = response.text;
    const cleanedJson = rawJson.replace(/^```json\s*|```$/g, '');
    const newConcept = JSON.parse(cleanedJson) as Omit<AdConcept, 'imageUrls' | 'entryPoint'>;

    return {
        ...newConcept,
        entryPoint: 'Remixed',
    };
};


export const generateConceptsFromPersona = async (
    blueprint: CampaignBlueprint,
    persona: TargetPersona,
    strategicPathId: string
): Promise<Omit<AdConcept, 'imageUrls'>[]> => {
    
    const prompt = `
        You are a world-class direct response copywriter and full-stack creative strategist. Your task is to generate an array of 3 strategically distinct ad concepts based on a Campaign Blueprint and a specific Target Persona.

        **CORE MISSION: A/B TEST VARIATIONS (Three Entry Points Framework)**
        It is CRITICAL that you generate three genuinely different creative hypotheses:
        - **Concept 1 - "Emotional Entry"**: Leads with feeling, identity, or aspiration.
        - **Concept 2 - "Logical Entry"**: Leads with logic, proof, or a unique mechanism.
        - **Concept 3 - "Social Entry"**: Leads with community or social proof.

        **THE BRIEF:**
        - Product: ${blueprint.productAnalysis.name} (Benefit: ${blueprint.productAnalysis.keyBenefit})
        - Strategic Offer: ${blueprint.adDna.offerSummary} (CTA: ${blueprint.adDna.cta})
        - Sales DNA Tone: "${blueprint.adDna.toneOfVoice}"
        - Original Visual Style DNA: "${blueprint.adDna.visualStyle}"
        - Target Country for Localization: "${blueprint.adDna.targetCountry}"
        - **🔥 Target Persona**: "${persona.description}" (Age: "${persona.age}", Type: "${persona.creatorType}", Pains: ${persona.painPoints.join(', ')})

        **YOUR FULL-STACK TASK FOR EACH OF THE 3 CONCEPTS (Emotional, Logical, Social):**

        **STEP 1: Invent a Plausible Strategic Path (Strategist Mode)**
        1.  **Invent an Angle:** Create a high-level strategic angle that resonates with the persona.
        2.  **Choose a Psychological Trigger:** Select the MOST effective trigger from the list: [Social Proof, Authority, Scarcity, Urgency, Reciprocity, Liking, FOMO, Exclusivity, Instant Gratification]. For the chosen trigger, you must generate a full object containing the 'name', a detailed 'description', a concrete 'example', and an 'analysis' of why it works for this persona.
        3.  **Choose a Creative Format & Placement:** Select the best format and placement for your idea.
        4.  **Choose an Awareness Stage:** Select the most appropriate stage for your angle.

        **STEP 2: Write the Words & Visualize the Message (Copywriter & Art Director Mode)**
        1.  Based on the path you invented, write a world-class, scroll-stopping **hook** and **headline**.
        2.  Create a detailed **visualPrompt** that brings the concept to life, is authentic to the persona, and visually embodies the chosen trigger.

        **Final Output Generation:**
        - For each concept, generate a complete JSON object.
        - The 'adSetName' should follow this format: [PersonaShort]_[AngleKeyword]_[Trigger]_[Awareness]_[Format]_[Placement]_v[1, 2, or 3].
        - The 'offer' object's 'name' must be "${blueprint.adDna.offerSummary}". You must invent a plausible 'description' and 'psychologicalPrinciple' for it.
        - **CRITICAL**: The 'strategicPathId' field for ALL concepts MUST be exactly this value: "${strategicPathId}".

        Respond ONLY with a JSON array of 3 concept objects. Adhere strictly to the provided JSON schema.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ text: prompt }],
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
    const ideas = JSON.parse(cleanedJson) as (Omit<AdConcept, 'imageUrls' | 'entryPoint'>)[];
    
    const entryPoints: ('Emotional' | 'Logical' | 'Social')[] = ['Emotional', 'Logical', 'Social'];

    return ideas.map((idea, index) => ({
        ...idea,
        entryPoint: entryPoints[index % 3] as 'Emotional' | 'Logical' | 'Social'
    }));
};


// Helper function to extract MIME type from base64 string
export const getMimeType = (base64: string): string => {
    return base64.substring(base64.indexOf(":") + 1, base64.indexOf(";"));
}
