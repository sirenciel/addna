
import { GoogleGenAI, Modality } from "@google/genai";
import { CampaignBlueprint, AdConcept, CreativeFormat, PlacementFormat, AwarenessStage, TargetPersona, BuyingTriggerObject } from '../types';

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

export const analyzeCampaignBlueprint = async (imageBase64: string, caption: string, productInfo: string, offerInfo: string): Promise<CampaignBlueprint> => {
  const imagePart = imageB64ToGenerativePart(imageBase64, 'image/jpeg');
  const prompt = `
    As a world-class DIRECT RESPONSE COPYWRITING EXPERT, your task is to analyze the provided ad creative and context to reverse-engineer its "SALES DNA" and create a comprehensive "Campaign Blueprint". Your goal is not just to describe what you see, but to deeply understand the persuasion strategy at play.

    CONTEXT:
    - Ad Caption: "${caption}"
    - Product/Service Description: "${productInfo || 'Not provided. Infer from ad.'}"
    - Offer/CTA: "${offerInfo || 'Not provided. Infer from ad.'}"

    Based on all the provided information (image and text), generate a structured JSON object for the Campaign Blueprint with the following fields:

    1.  "productAnalysis": {
          "name": "The product/service name, inferred.",
          "keyBenefit": "The single most important benefit the product offers to the customer."
        }
    2.  "targetPersona": {
          "description": "A brief description of the target audience (e.g., 'Busy young mothers who value convenience').",
          "age": "Estimate the age range (e.g., '25-35').",
          "creatorType": "Describe the person in the ad (e.g., 'Real Customer', 'Expert', 'Model').",
          "painPoints": ["List 2-3 key problems or frustrations this persona faces that the product solves."],
          "desiredOutcomes": ["List 2-3 key goals or aspirations this persona has that the product helps achieve."]
        }
    3.  "adDna": {
          "salesMechanism": "The exact persuasion flow from start to finish (e.g., 'Agitate pain -> Show transformation -> Create urgency').",
          "copyPattern": "The structure of the copy (e.g., 'Open loop question -> Testimonial proof -> Limited offer').",
          "persuasionFormula": "The proven copywriting framework used (e.g., 'PAS (Problem-Agitate-Solution)', 'AIDA', 'Story-based').",
          "specificLanguagePatterns": ["An array of exact phrases, words, or sentence structures that create desire, urgency, or relatability (e.g., 'Capek...', 'Coba deh...', 'sekali usap')."],
          "toneOfVoice": "Describe the tone and personality of the copy (e.g., 'Conversational, empathetic, casual Indonesian').",
          "socialProofElements": "How does the ad use social proof, authority, or tribe membership? (e.g., 'Implied community ('everyone's doing it')', 'Features a doctor').",
          "objectionHandling": "What fears or doubts does the ad preemptively address? (e.g., 'Addresses 'too much effort' objection upfront').",
          "visualStyle": "Describe the overall visual style (e.g., 'Candid influencer photo, natural lighting', 'Professional studio shot, clean background', 'Dark and moody cinematic look').",
          "offerSummary": "A brief summary of the offer.",
          "cta": "The primary call to action.",
          "targetCountry": "Infer the target country for the audience based on language, currency, cultural cues, or other context. (e.g., 'Indonesia', 'United States', 'Global')."
        }

    Respond ONLY with the single, valid JSON object.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: [{ parts: [imagePart, { text: prompt }] }],
    config: {
        responseMimeType: "application/json",
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

        For each new persona, create a JSON object with the following structure:
        {
          "description": "A brief, new description of the target audience (e.g., 'Eco-conscious college students').",
          "age": "A plausible age range for this new persona (e.g., '18-22').",
          "creatorType": "A suitable creator type for this persona (e.g., 'Regular User', 'Student Influencer').",
          "painPoints": ["List 2-3 key problems this new persona faces that the product solves."],
          "desiredOutcomes": ["List 2-3 key goals this new persona has that the product helps achieve."]
        }
        
        Respond ONLY with a JSON array of these persona objects.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
    });
    const rawJson = response.text;
    const cleanedJson = rawJson.replace(/^```json\s*|```$/g, '');
    return JSON.parse(cleanedJson);
};


export const generateHighLevelAngles = async (blueprint: CampaignBlueprint, persona: TargetPersona, awarenessStage: AwarenessStage, existingAngles: string[] = []): Promise<string[]> => {
    const prompt = `
        You are a creative strategist. Based on the provided 'Campaign Blueprint', a specific 'Target Persona', and their 'Awareness Stage', generate 4 distinct, high-level strategic angles for a new advertising campaign.
        The angles must be tailored to someone in the "${awarenessStage}" stage. For example, for "Unaware" audiences, angles should focus on the problem or emotion, not the solution. For "Product Aware" audiences, angles can be more feature-focused.
        
        Campaign Blueprint:
        - Product Benefit: ${blueprint.productAnalysis.keyBenefit}
        - Core Persuasion Strategy: Use a "${blueprint.adDna.toneOfVoice}" tone to apply the "${blueprint.adDna.persuasionFormula}" formula.
        - Target Country: ${blueprint.adDna.targetCountry}

        Target Persona:
        - Description: ${persona.description}
        - Pains: ${persona.painPoints.join(', ')}
        - Desires: ${persona.desiredOutcomes.join(', ')}

        🔥 Target Awareness Stage: ${awarenessStage}

        ${existingAngles.length > 0 ? `IMPORTANT: Do not generate any of the following angles, as they already exist: ${existingAngles.join(', ')}.` : ''}

        Respond ONLY with a JSON array of 4 strings. For example: ["Focus on Relieving Pain X for [Persona]", "Highlight How [Persona] Achieves Outcome Y", "Build Emotional Connection with [Persona]", "Showcase a 'Day in the Life' of [Persona]"]
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
    });
    const rawJson = response.text;
    const cleanedJson = rawJson.replace(/^```json\s*|```$/g, '');
    return JSON.parse(cleanedJson);
};

export const generateBuyingTriggers = async (blueprint: CampaignBlueprint, persona: TargetPersona, angle: string, awarenessStage: AwarenessStage): Promise<BuyingTriggerObject[]> => {
    const prompt = `
        You are a Direct Response Copywriting Coach. Your goal is to educate an advertiser on the best psychological triggers to use for their campaign.
        Based on the campaign context, select the 4 MOST RELEVANT and POWERFUL psychological triggers from the predefined list below. The triggers must be appropriate for the audience's awareness stage.
        Then, for each selected trigger, explain it clearly and provide a concrete example of how it applies directly to this product, persona, angle, and awareness stage.

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
        2.  For each chosen trigger, create a JSON object with three fields: "name", "description", and "example".
        3.  **name:** The exact name of the trigger from the list.
        4.  **description:** A simple, one-sentence explanation of the psychological principle.
        5.  **example:** A specific, actionable example of how to apply this trigger in an ad for *this* product, persona, angle, and awareness stage. The example should be a snippet of ad copy or a visual idea that resonates in "${blueprint.adDna.targetCountry}".

        **Output:**
        Respond ONLY with a valid JSON array of these 4 objects. Do not include any other text or markdown.
    `;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
    });
    const rawJson = response.text;
    const cleanedJson = rawJson.replace(/^```json\s*|```$/g, '');
    return JSON.parse(cleanedJson);
};

const HOOK_FORMULAS: Record<AwarenessStage, string[]> = {
  'Unaware': [
    'Provocative Question: "Kenapa [negative state] padahal [should be positive]?"',
    'Bold Statement: "[Shocking fact] yang [demographic] tidak tahu."',
    'Pattern Interrupt: "Stop [common behavior]. Ini kenapa."'
  ],
  'Problem Aware': [
    'Agitation: "Masih [struggling]? Ini [hidden cause] yang bikin gagal terus."',
    'Empathy: "Pernah ngerasa [frustration]? Ternyata bukan salah kamu..."',
    'Social Proof: "[X] orang udah solve [problem]. Rahasianya cuma [Y]."'
  ],
  'Solution Aware': [
    'Comparison: "Forget [old solution]. [New approach] terbukti [X]% lebih [benefit]."',
    'Authority: "[Expert/Study] bilang ini cara paling [effective adjective]."',
    'Mechanism: "Ini kenapa [solution type] work 10x lebih baik..."'
  ],
  'Product Aware': [
    'Offer: "[Product] sekarang [offer]. Tapi [scarcity/urgency]."',
    'Testimonial: "\'[Specific result]\' - [Relatable person], [timeframe]"',
    'Exclusive: "Cuma [lucky group] yang bisa akses [benefit] ini..."'
  ]
};

const HEADLINE_FORMULAS: Record<AwarenessStage, string[]> = {
    'Unaware': [
        'Curiosity: "[Intriguing fact] yang bikin [desired outcome] tanpa [common effort]"',
        'Promise: "Cara [do desirable thing] yang [surprising attribute]"',
        'Identity: "Untuk [persona] yang [pain/desire]: [This is for you]"'
    ],
    'Problem Aware': [
        'Solution Reveal: "[Problem] fixed dengan [simple method]. Ini caranya."',
        'Authority: "[Expert/data] bilang ini solusi paling [superlative] untuk [problem]"',
        'New Mechanism: "Ternyata [problem] bukan karena [common belief]. Tapi karena [real cause]..."'
    ],
    'Solution Aware': [
        'Differentiation: "Beda [Product] sama [competitor/old way]: [Key differentiator]"',
        'Proof: "[Specific result] dalam [timeframe] - [social proof number] udah buktiin"',
        'Mechanism: "Kenapa [our approach] work [X]x lebih [benefit metric]"'
    ],
    'Product Aware': [
        'Direct Offer: "[Offer] - [Urgency/scarcity element]"',
        'Overcome Objection: "[Product] + [Bonus] = [Total value]. Tapi harga cuma [price]. [Reason to believe]"',
        'Exclusive: "Akses eksklusif [Product Name]: [Unique benefit] yang ga ada di [competitor]"'
    ]
}

const TRIGGER_IMPLEMENTATION_CHECKLIST: Record<string, { copyMust: string[], visualMust: string[] }> = {
  'Social Proof': {
    copyMust: [
      'Include specific numbers (e.g., "10,000+ users", "4.8/5 stars", "Ribuan orang udah...")',
      'Quote or reference real people, testimonials, or authority figures',
      'Use words that imply collective action: "terbukti", "ratusan", "semua orang", "akhirnya"'
    ],
    visualMust: [
      'Show multiple people using product OR',
      'Show testimonial quotes/ratings visible in the image OR',
      'Show "as seen on" badges, media mentions, or crowd shots OR',
      'Show before-after comparison from real customers with visible transformation'
    ]
  },
  'Scarcity': {
    copyMust: [
      'State limited quantity/availability explicitly ("Hanya X tersisa", "Stok terbatas")',
      'Use time/stock language that creates fear of missing out',
      'Mention exclusivity or rarity ("Limited edition", "Jarang ada")'
    ],
    visualMust: [
      'Show limited quantity indicators (countdown timer, stock level bar) OR',
      'Show "almost sold out" or "low stock" warning in image OR',
      'Show exclusive/limited edition packaging or badge OR',
      'Show nearly empty shelf or product display'
    ]
  },
  'Urgency': {
    copyMust: [
      'Include explicit deadline ("Hari ini aja", "Berakhir dalam X jam", "Sampai besok")',
      'State consequence of delay ("Setelah ini, harga naik lagi")',
      'Use time-sensitive language: "Sekarang", "Buruan", "Jangan sampai telat"'
    ],
    visualMust: [
      'Show countdown timer or clock prominently OR',
      'Show calendar with date circled/highlighted OR',
      'Show person acting quickly/urgently (running, grabbing product) OR',
      'Show visual cue of time passing (hourglass, timer app)'
    ]
  },
  'Reciprocity': {
    copyMust: [
      'Offer something valuable for free first ("Gratis panduan", "Bonus ini dulu")',
      'Frame as giving before asking ("Coba dulu", "Lihat hasilnya gratis")',
      'Use language of generosity: "Kami kasih", "Khusus untuk kamu", "Hadiah dari kami"'
    ],
    visualMust: [
      'Show the free item/bonus being offered prominently OR',
      'Show person receiving or unboxing the freebie with delight OR',
      'Show "FREE" badge or gift wrap visual OR',
      'Show before (empty hands) and after (holding gift) state'
    ]
  },
  'Authority': {
    copyMust: [
      'Cite expert, doctor, scientist, or recognized authority ("Dokter X merekomendasikan")',
      'Mention certifications, studies, or research ("Terbukti secara klinis")',
      'Use authority language: "Ahli bilang", "Studi menunjukkan", "Sertifikasi dari"'
    ],
    visualMust: [
      'Show expert/doctor/professional in their environment (lab coat, clinic) OR',
      'Show certification badges, seals, or official logos OR',
      'Show research data, graphs, or scientific imagery OR',
      'Show person in position of authority holding/endorsing product'
    ]
  },
  'Liking': {
    copyMust: [
      'Use relatable, friendly, conversational tone as if talking to a friend',
      'Share personal story or vulnerability ("Aku dulu juga gitu")',
      'Use inclusive language: "Kita", "Sama-sama", "Buat kamu yang..."'
    ],
    visualMust: [
      'Show relatable influencer or person similar to persona using product naturally OR',
      'Show genuine smile, warm eye contact, inviting body language OR',
      'Show casual, authentic setting (home, coffee shop, not studio) OR',
      'Show person who looks like the target persona (age, style, vibe)'
    ]
  },
  'Fear of Missing Out (FOMO)': {
    copyMust: [
      'Highlight what others are experiencing ("10,000 orang udah ngerasain ini")',
      'Emphasize trend or movement ("Viral di TikTok", "Yang lagi hits")',
      'Use FOMO language: "Jangan sampai ketinggalan", "Semua orang udah coba", "Kamu belum?"'
    ],
    visualMust: [
      'Show crowd of people enjoying the product or experience OR',
      'Show trending/viral visual cues (phone screens with high engagement) OR',
      'Show "everyone else has it" scenario (empty shelf, sold out signs) OR',
      'Show person looking sad/left out vs. person happy with product'
    ]
  },
  'Exclusivity': {
    copyMust: [
      'Emphasize limited access ("Khusus member", "Hanya untuk select few")',
      'Mention VIP, premium, or elite status ("Akses VIP", "Edisi khusus")',
      'Use exclusive language: "Invite-only", "Private community", "Tidak dijual bebas"'
    ],
    visualMust: [
      'Show VIP pass, membership card, or exclusive badge OR',
      'Show velvet rope, locked door, or "members only" sign OR',
      'Show luxury packaging or premium presentation OR',
      'Show small, intimate group of people (not a crowd)'
    ]
  },
  'Instant Gratification': {
    copyMust: [
      'Promise quick results ("Hasil dalam 3 hari", "Langsung terasa")',
      'Emphasize speed and ease ("Cepat", "Instan", "Tanpa ribet")',
      'Use immediate language: "Sekarang juga", "Langsung", "Dalam hitungan menit"'
    ],
    visualMust: [
      'Show rapid transformation or instant result (fast-forward visual) OR',
      'Show clock/timer showing short duration OR',
      'Show person expressing surprise at how fast it worked OR',
      'Show side-by-side immediate before/after'
    ]
  }
};

const injectDynamicValues = (formula: string, blueprint: CampaignBlueprint, persona: TargetPersona): string => {
    return formula
        .replace(/\[Product Name\]/g, blueprint.productAnalysis.name)
        .replace(/\[Product\]/g, blueprint.productAnalysis.name)
        .replace(/\[Offer\]/g, blueprint.adDna.offerSummary)
        .replace(/\[persona\]/g, persona.description)
        .replace(/\[problem\]/g, persona.painPoints[0] || 'masalah utama')
        .replace(/\[benefit\]/g, blueprint.productAnalysis.keyBenefit)
        .replace(/\[desired outcome\]/g, persona.desiredOutcomes[0] || 'hasil yang diinginkan');
};


export const generateCreativeIdeas = async (blueprint: CampaignBlueprint, angle: string, trigger: BuyingTriggerObject, awarenessStage: AwarenessStage, format: CreativeFormat, placement: PlacementFormat, persona: TargetPersona, strategicPathId: string, allowVisualExploration: boolean): Promise<Omit<AdConcept, 'imageUrls'>[]> => {
    const formatInstructions: Record<CreativeFormat, string> = {
        'UGC': "Simulate a genuine user-generated video or photo. The tone should be authentic, not overly polished. Visual prompt should describe a realistic setting.",
        'Before & After': "Clearly show a 'before' state demonstrating a problem and an 'after' state showing the solution provided by the product. The transformation should be obvious.",
        'Comparison': "Compare the product directly or indirectly with an alternative (e.g., 'the old way'). Highlight the product's superior features or benefits.",
        'Demo': "Show the product in action. The visual prompt should focus on the product being used and its key functionality.",
        'Testimonial': "Feature a satisfied customer. The hook and headline should read like a quote. The visual prompt should depict a person representing the target persona, looking happy and confident.",
        'Problem/Solution': "Start by clearly presenting a common problem the target persona faces. Agitate the problem by describing the frustrations it causes. Finally, present the product as the perfect solution. The visual should depict the 'problem' or the 'solution' state vividly.",
        'Educational/Tip': "Provide genuine value by teaching the audience something useful related to the product's domain. Frame the ad as a helpful tip or a quick 'how-to'. The product should be naturally integrated as a tool to achieve the tip's outcome.",
        'Storytelling': "Tell a short, relatable story where a character (representing the persona) overcomes a challenge using the product. The narrative should have a clear beginning, middle, and end. The focus should be on the emotional journey and transformation.",
    };

    const placementInstructions: Record<PlacementFormat, string> = {
        'Carousel': `**CAROUSEL CREATION MANDATE**: You MUST generate a 'carouselSlides' array with exactly 5 slides. Each slide needs: slideNumber, visualPrompt, headline, and description. Follow this EXACT story arc:

**Slide 1 (HOOK) - Purpose: STOP THE SCROLL**
- Visual: Your most eye-catching, scroll-stopping image (the "visual hook" from Step 1). Should trigger curiosity or pattern interrupt.
- Headline: Use one of the hook formulas. Max 8 words. Should create open loop.
- Description: 1-2 sentences expanding on the curiosity gap. DO NOT reveal solution yet.
- Example: Visual = "Person looking shocked at their phone screen showing dramatic before/after", Headline = "Kenapa aku baru tahu ini sekarang?!", Description = "Selama ini salah cara. Pantesan ga efektif..."

**Slide 2 (AGITATE) - Purpose: "ME TOO!" MOMENT**
- Visual: Show the persona's pain point VIVIDLY. Make them feel seen and understood. Should show frustration, tiredness, or problem state clearly.
- Headline: Describe the pain in relatable language. 6-10 words.
- Description: Agitate the pain. Describe consequences or frustrations. 2-3 sentences.
- Example: Visual = "Person exhausted, surrounded by messy cleaning supplies, looking defeated", Headline = "Udah capek bersih-bersih tapi tetep kotor", Description = "Rasanya kayak ga ada habisnya. Udah ngabisin waktu berjam-jam, tapi besoknya kotor lagi..."

**Slide 3 (SOLUTION) - Purpose: INTRODUCE THE MECHANISM**
- Visual: Product in action OR transformation moment. Show HOW it solves the problem simply.
- Headline: Reveal the solution simply. Use "Ternyata cuma perlu..." or "Solusinya: ...". 5-8 words.
- Description: Explain the simple mechanism or how it works. 2-3 sentences.
- Example: Visual = "Product being used, with visible results happening (sparkles, shine appearing)", Headline = "Ternyata cuma butuh ${blueprint.productAnalysis.name}", Description = "Formulanya dirancang khusus buat... Cukup [simple action], langsung bersih maksimal."

**Slide 4 (PROOF) - Purpose: BUILD BELIEVABILITY**
- Visual: WAJIB mengimplementasikan trigger "${trigger.name}" secara visual. Pilih dan deskripsikan secara spesifik SATU ide dari checklist visual untuk trigger ini. Contohnya: ${TRIGGER_IMPLEMENTATION_CHECKLIST[trigger.name]?.visualMust[0] || 'Tunjukkan hasil yang nyata.'}
- Headline: Proof statement. Include numbers if possible. 6-10 words.
- Description: Specific results, testimonial snippet, or data point. 2-3 sentences.
- Example: Visual = "Collage of user testimonials or before/after results from multiple people", Headline = "10,000+ orang udah buktiin hasilnya", Description = "Rating 4.9/5 dari ribuan review. 'Beneran game changer!' - Sarah, 29..."

**Slide 5 (CTA) - Purpose: DRIVE ACTION WITH ${trigger.name.toUpperCase()}**
- Visual: Product + offer visualization. If applicable, show scarcity/urgency cues for the offer. Clear, clean, product-focused shot.
- Headline: ${blueprint.adDna.offerSummary} + ${blueprint.adDna.cta} + urgency/scarcity element (from trigger). 8-12 words.
- Description: Clear CTA. Restate offer + create urgency. 2-3 sentences.
- Example: Visual = "Product shot with price tag, FREE badge, and countdown timer visible", Headline = "Beli sekarang GRATIS ongkir + bonus brush. Promo cuma sampai besok!", Description = "Klik link di bio. Jangan sampai nyesel ga kebagian harga spesial ini. Stok terbatas!"

All text MUST be in ${blueprint.adDna.targetCountry} language and match the ${blueprint.adDna.toneOfVoice} tone.`,
        'Instagram Feed': "Design for a 1:1 or 4:5 aspect ratio. The visual should be high-quality and scroll-stopping. The hook should be an engaging question or a bold statement to encourage interaction in the caption.",
        'Instagram Story': "Design for a 9:16 vertical aspect ratio. The visual should feel native and authentic to the platform. The hook should be quick and punchy. The visual prompt can suggest text overlays or interactive elements."
    };
    
     const visualStyleInstruction = allowVisualExploration
    ? `- **Style**: Anda BEBAS mengusulkan visualStyle dan visualPrompt yang sama sekali baru, TAPI **gunakan gaya visual asli ("${blueprint.adDna.visualStyle}") sebagai titik awal atau inspirasi**. Tujuannya adalah variasi kreatif, bukan sesuatu yang sama sekali tidak berhubungan. Buatlah sesuatu yang tak terduga namun tetap terasa 'on-brand'.`
    : `- **Style**: The visual style MUST be a direct evolution of the original 'Visual Style DNA'. Blend the DNA ("${blueprint.adDna.visualStyle}") with the persona's aesthetic ("${persona.creatorType}"). The result should look like a new ad from the same brand, for a different audience segment. **DO NOT create a visual style that is completely unrelated to the original DNA.**`;


    const prompt = `
        You are a world-class direct response creative director. Your task is to generate 3 unique ad concepts that are strategic variations of a base campaign.
        Each concept must be a concrete, ready-to-launch execution of the given angle, trigger, format, and placement.

        **Campaign Blueprint (The Foundation):**
        - Product: ${blueprint.productAnalysis.name} (Benefit: ${blueprint.productAnalysis.keyBenefit})
        - Offer: ${blueprint.adDna.offerSummary} (CTA: ${blueprint.adDna.cta})
        - **Sales DNA**:
            - Persuasion Formula: "${blueprint.adDna.persuasionFormula}"
            - Tone of Voice: "${blueprint.adDna.toneOfVoice}"
        - **Original Visual Style DNA: "${blueprint.adDna.visualStyle}"**
        - **Target Country for Localization: "${blueprint.adDna.targetCountry}"**

        **Target Persona Details (The Audience Lens):**
        - Description: "${persona.description}" (Age: "${persona.age}", Creator Type: "${persona.creatorType}")
        - Pains: ${persona.painPoints.join(', ')}

        **Creative Mandate (The Specific Task):**
        - Strategic Angle: "${angle}"
        - 🔥 Psychological Buying Trigger: "${trigger.name}" (Description: ${trigger.description})
        - Awareness Stage: "${awarenessStage}"
        - Creative Format: "${format}" (Guidelines: ${formatInstructions[format]})
        - Ad Placement: "${placement}" (Guidelines: ${placementInstructions[placement]})

        **🔥 TRIGGER IMPLEMENTATION CHECKLIST for "${trigger.name}":**
        
        Your HOOK must include at least ONE of these:
        ${(TRIGGER_IMPLEMENTATION_CHECKLIST[trigger.name]?.copyMust || []).map((req, i) => `${i + 1}. ${req}`).join('\n')}

        Your VISUAL PROMPT must include at least ONE of these:
        ${(TRIGGER_IMPLEMENTATION_CHECKLIST[trigger.name]?.visualMust || []).map((req, i) => `${i + 1}. ${req}`).join('\n')}

        ⚠️ If your concept doesn't pass this checklist, it FAILS the trigger requirement.

        **VARIATION STRATEGY:**
        Generate 3 concepts, each testing a DIFFERENT hypothesis, while still adhering to the core mandate.
        - **Concept 1 - "Emotional Entry"**: Lead with emotion/identity. Hook focuses on feeling/aspiration. Visual shows an emotional state.
        - **Concept 2 - "Logical Entry"**: Lead with mechanism/proof. Hook focuses on how it works/data. Visual shows the product/process clearly.
        - **Concept 3 - "Social Entry"**: Lead with community/tribe. Hook focuses on "others like you". Visual shows multiple people or testimonials.

        ---
        **CREATION PROCESS FOR EACH CONCEPT:**
        
        **STEP 1: Visual-Text Synergy.** First, design the "3-Second Scroll-Stop Moment". What SPECIFIC VISUAL combined with a text hook would make someone STOP scrolling? Describe this visual hook idea in one vivid sentence.
        
        **STEP 2: Write the Hook.** Based on the visual hook idea, write the text hook.
        - **HOOK CREATION MANDATE**: You MUST use one of these proven formulas for the "${awarenessStage}" stage:
        ${HOOK_FORMULAS[awarenessStage].map((f, i) => `${i + 1}. ${f}`).join('\n')}
        - The formula you choose MUST align with the trigger "${trigger.name}" and be localized for ${blueprint.adDna.targetCountry}.
        
        **HOOK FORMULA IMPLEMENTATION EXAMPLE**:
        Formula: "${HOOK_FORMULAS[awarenessStage][0]}"
        Context: Persona = "Busy moms", Pain = "Constantly cleaning floors", Product = "Super floor cleaner"
        
        ❌ BAD HOOK (too generic): "Tired of cleaning?"
        ✅ GOOD HOOK (follows formula perfectly): "Kenapa lantai rumah kamu kotor lagi setelah 2 jam ngepel? (Hint: Bukan karena anakmu)"
        
        ^ Notice: Uses provocative question, addresses specific negative state ("kotor lagi setelah 2 jam"), hints at unexpected cause, uses conversational Indonesian.
        
        NOW write YOUR hook following one formula above using:
        - Persona pains: ${persona.painPoints.join(', ')}
        - Product benefit: ${blueprint.productAnalysis.keyBenefit}
        - Trigger feeling: ${trigger.name}
        - ${blueprint.adDna.targetCountry} language with ${blueprint.adDna.toneOfVoice} tone

        **STEP 3: Write the Headline.**
        - **HEADLINE FORMULAS MANDATE**: You MUST use one of these formulas for the "${awarenessStage}" stage:
        ${HEADLINE_FORMULAS[awarenessStage].map((f, i) => `${i + 1}. ${injectDynamicValues(f, blueprint, persona)}`).join('\n')}
        - It must include the key benefit ("${blueprint.productAnalysis.keyBenefit}"), embed the "${trigger.name}" feeling, and be localized for ${blueprint.adDna.targetCountry}.

        **STEP 4: Write the Visual Prompt.** Expand your visual hook idea into a full, detailed prompt using this EXACT structure:

        **[COMMERCIAL GOAL & PSYCHOLOGY]**
        - **Primary Goal**: The image MUST visually communicate the main benefit ("${blueprint.productAnalysis.keyBenefit}") and evoke a specific, powerful emotion relevant to the solution (e.g., 'relief', 'desire', 'curiosity').
        - **Psychological Impact**: The scene should make the persona feel that achieving their desired outcome ("${persona.desiredOutcomes[0] || 'their goal'}") is easy and attainable with this product.
        - **Sales Focus**: The image must be a "scroll-stopper" that compels the user to stop, feel an emotion, and read the headline. It must look like a high-converting ad, not a generic stock photo.

        **[SCENE FOUNDATION]**
        - **Setting**: Where exactly is this happening? (Be ultra-specific: "Bright minimalist kitchen with white marble countertop and succulents in background" NOT just "kitchen"). The setting must feel authentic and relatable for an audience in **${blueprint.adDna.targetCountry}**.
        - **Time/Lighting**: What time of day? What's the lighting quality? (e.g., "Golden hour sunlight streaming through sheer curtains creating soft shadows", "Bright ring light setup for selfie video")
        - **Camera Angle**: Exact camera position (e.g., "Eye-level straight-on POV", "Overhead flat lay 90 degrees", "Low angle looking up at 45 degrees", "Over-the-shoulder shot")

        **[SUBJECT]**
        - **Who**: ${persona.description}, age ${persona.age}, with ${persona.creatorType} aesthetic
        - **Doing What**: Use active verbs + object (e.g., "Enthusiastically demonstrating the product's feature while making direct eye contact with camera")
        - **Expression**: Must clearly convey the emotional 'AFTER' state of using the product (e.g., 'visibly relieved and happy', 'feeling confident and successful', 'surprised and delighted by the result').
        - **Clothing/Styling**: Must be authentic to **${blueprint.adDna.targetCountry}** culture and ${persona.creatorType} style (e.g., "Wearing casual oversized hoodie and jeans, natural makeup, messy bun")

        **[TRIGGER VISUALIZATION - CRITICAL]**
        How does the scene physically SHOW the "${trigger.name}" trigger? This is NOT optional.
        ${TRIGGER_IMPLEMENTATION_CHECKLIST[trigger.name]?.visualMust[0] || 'Visualize the trigger somehow.'}
        Be extremely specific about HOW the trigger appears in the frame.

        **[PRODUCT INTEGRATION]**
        - **Product Positioning**: Where is the product in frame? (Foreground hero shot / background lifestyle prop / being held at chest level)
        - **Brand Visibility**: Is logo/branding clearly visible? From what angle?
        - **Product in Action**: Show the product as the clear 'hero' or 'solution'. The result of using the product (e.g., 'the sparkling clean surface', 'the flawless skin') should be as prominent, or more prominent, than the product itself.

        **[STYLE DNA FUSION]**
        ${visualStyleInstruction}
        Describe the COLOR PALETTE, COMPOSITION STYLE, and MOOD that results from this fusion.

        **[TECHNICAL SPECS]**
        Photorealistic, commercial quality, shot with high-end camera, sharp focus on subject's face and product, authentic NOT AI-illustration-looking, ${placement === 'Instagram Story' ? '9:16 vertical aspect ratio' : placement === 'Instagram Feed' ? '1:1 or 4:5 aspect ratio' : 'optimized for digital advertising'}.
        ---
        
        ---
        **BEFORE YOU RESPOND - INTERNAL QUALITY CHECK:**
        
        For EACH of the 3 concepts you generated, silently score these (don't include scores in JSON):
        
        1. **Hook Clarity (1-10)**: Does it follow a proven formula from the list? Is it immediately understandable?
        2. **Trigger Visibility (1-10)**: Is the "${trigger.name}" trigger OBVIOUS in both copy AND visual? Can you see/feel it?
        3. **Persona Authenticity (1-10)**: Does it feel 100% genuine to "${persona.description}" living in ${blueprint.adDna.targetCountry}? No cringe?
        4. **Visual-Text Synergy (1-10)**: Do hook and visual amplify each other, or are they disconnected?
        5. **Sales DNA Consistency (1-10)**: Does it feel like part of the original campaign family? Same persuasion style?
        6. **Variation Distinctness (1-10)**: Are your 3 concepts truly DIFFERENT from each other (Emotional vs Logical vs Social)?
        
        **If ANY concept scores below 7 on ANY criteria, REGENERATE that specific element before responding.**
        **If Concepts 1, 2, 3 are too similar to each other, REGENERATE to ensure distinctness.**
        
        ---

        Now, generate an array of 3 JSON objects using the process above. Each object must have the following structure:
        - id: A unique string identifier.
        - angle: Must be "${angle}".
        - trigger: Must be "${trigger.name}".
        - format: Must be "${format}".
        - placement: Must be "${placement}".
        - awarenessStage: Must be "${awarenessStage}".
        - strategicPathId: Must be "${strategicPathId}".
        - personaDescription: Must be "${persona.description}".
        - personaAge: Must be "${persona.age}".
        - personaCreatorType: Must be "${persona.creatorType}".
        - visualVehicle: A brief description of the visual format (e.g., "Authentic-looking vertical user video").
        - hook: Your generated hook.
        - headline: Your generated headline.
        - visualPrompt: Your generated visual prompt.
        - adSetName: A suggested ad set name. **MUST follow this EXACT format, replacing bracketed items and using underscores**: [PersonaShortDescription]_[AngleKeyword]_[TriggerName]_[AwarenessStage]_[Format]_[Placement]_v[1, 2, or 3]. Example: BusyMoms_HematWaktu_SocialProof_ProblemAware_UGC_Story_v1.
        - carouselSlides: (Only if placement is "Carousel") An array of 3-5 slide objects, following the specified story arc. All text must be localized.

        Respond ONLY with the JSON array.
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
    });

    const rawJson = response.text;
    const cleanedJson = rawJson.replace(/^```json\s*|```$/g, '');
    // FIX: Add parentheses around the intersection type to ensure it's parsed as an array of objects, not an intersection with an array.
    const ideas = JSON.parse(cleanedJson) as (Omit<AdConcept, 'imageUrls' | 'trigger'> & { trigger: string })[];
    
    // Augment the AI's response with the full trigger object
    // FIX: The direct spread `{ ...idea, trigger }` can cause a TypeScript type inference issue.
    // Destructuring the string `trigger` out and spreading the rest helps TypeScript correctly construct the new object type.
    return ideas.map(idea => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { trigger: _, ...restOfIdea } = idea;
        return { ...restOfIdea, trigger };
    });
};


export const generateAdImage = async (prompt: string, referenceImageBase64?: string, allowVisualExploration: boolean = false): Promise<string> => {
    
    const salesIntent = "A highly persuasive, high-converting, and scroll-stopping advertisement image designed to sell a product. The image must be ultra-photorealistic, high-contrast, and emotionally resonant. The central focus must be on the user's benefit or transformation.";
    
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
    newValue: string
): Promise<Omit<AdConcept, 'imageUrls'>[]> => {
    
    const evolutionInstructions = {
        angle: `Adapt the concept to a new strategic angle: "${newValue}". The trigger ("${baseConcept.trigger.name}") and format ("${baseConcept.format}") should remain consistent, but the core message (headline, hook) and visual must be re-imagined to reflect this new angle.`,
        trigger: `Adapt the concept to use a new psychological trigger: "${newValue}". The angle ("${baseConcept.angle}") and format ("${baseConcept.format}") should remain consistent, but the headline, hook, and visual must be rewritten to powerfully evoke the feeling of "${newValue}".`,
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

        **Base Creative Concept:**
        - Angle: "${baseConcept.angle}"
        - Trigger: "${baseConcept.trigger.name}"
        - Format: "${baseConcept.format}"
        - Placement: "${baseConcept.placement}"
        - Headline: "${baseConcept.headline}"
        - Hook: "${baseConcept.hook}"
        
        **🔥 Evolution Mandate: ${evolutionInstructions[evolutionType]}**

        Now, generate an array containing ONE new JSON object for the evolved concept.
        
        The object must have the following structure:
        - id: A new unique string identifier.
        - angle: The angle for the new concept.
        - trigger: The name of the trigger for the new concept (string).
        - format: The format for the new concept.
        - placement: The placement for the new concept.
        - awarenessStage: Must be "${baseConcept.awarenessStage}".
        - strategicPathId: Must be "${baseConcept.strategicPathId}".
        - personaDescription: Must be "${baseConcept.personaDescription}".
        - personaAge: Must be "${baseConcept.personaAge}".
        - personaCreatorType: Must be "${baseConcept.personaCreatorType}".
        - visualVehicle: A brief description of the new visual format.
        - hook: A compelling new opening line for the ad copy, adapted for the evolution mandate and localized for ${blueprint.adDna.targetCountry}.
        - headline: A powerful new headline, adapted for the evolution mandate and localized for ${blueprint.adDna.targetCountry}.
        - visualPrompt: A new, detailed, specific prompt for an AI image generator.
            - It MUST be a creative re-interpretation based on the evolution mandate.
            - It MUST incorporate the Visual Style DNA: "${blueprint.adDna.visualStyle}".
            - It MUST be appropriate for the persona and the cultural context of ${blueprint.adDna.targetCountry}.
        - adSetName: A suggested ad set name. **MUST follow a strict format reflecting the new evolved parameters**, like: [Persona]_[NewAngle/Trigger/etc]_[...]_v1.
        - carouselSlides: (Only if the new format is "Carousel") An array of 3-5 slide objects.

        Respond ONLY with a JSON array containing the single new concept object.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
    });
    
    const rawJson = response.text;
    const cleanedJson = rawJson.replace(/^```json\s*|```$/g, '');
    const result = JSON.parse(cleanedJson) as (Omit<AdConcept, 'trigger' | 'imageUrls'> & { trigger: string })[];
    
    // Augment the AI response to ensure the trigger is a BuyingTriggerObject
    return result.map((concept): Omit<AdConcept, 'imageUrls'> => {
        let triggerObject: BuyingTriggerObject;
        if (evolutionType === 'trigger') {
            triggerObject = { name: newValue, description: 'Evolved trigger', example: 'Evolved trigger' };
        } else {
            triggerObject = baseConcept.trigger;
        }
        // FIX: The direct spread `{ ...concept, trigger: triggerObject }` was causing a TypeScript
        // type inference issue. Destructuring `trigger` out and spreading the rest
        // helps TypeScript correctly construct the new object type.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { trigger: _, ...restOfConcept } = concept;

        return {
            ...restOfConcept,
            trigger: triggerObject,
        };
    });
};


// Helper function to extract MIME type from base64 string
export const getMimeType = (base64: string): string => {
    return base64.substring(base64.indexOf(":") + 1, base64.indexOf(";"));
}