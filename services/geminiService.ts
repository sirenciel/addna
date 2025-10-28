
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


export const generateCreativeIdeas = async (blueprint: CampaignBlueprint, angle: string, trigger: string, awarenessStage: AwarenessStage, format: CreativeFormat, placement: PlacementFormat, persona: TargetPersona, strategicPathId: string, allowVisualExploration: boolean): Promise<Omit<AdConcept, 'imageUrls'>[]> => {
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
        'Carousel': `Create a multi-slide story. Generate a 'carouselSlides' array with 3-5 slides following this story arc:
        - Slide 1 (HOOK): Stop the scroll. Eye-catching visual + pattern interrupt question/bold statement.
        - Slide 2 (AGITATE/RELATE): "Me too!" moment. Show the persona's pain point vividly.
        - Slide 3 (SOLUTION): Introduce the product/mechanism as the solution. Show it in action.
        - Slide 4 (PROOF): Build believability. Show results, testimonials, or social proof numbers.
        - Slide 5 (CTA): Drive action. Clear Call To Action + Offer + Urgency/Scarcity.`,
        'Instagram Feed': "Design for a 1:1 or 4:5 aspect ratio. The visual should be high-quality and scroll-stopping. The hook should be an engaging question or a bold statement to encourage interaction in the caption.",
        'Instagram Story': "Design for a 9:16 vertical aspect ratio. The visual should feel native and authentic to the platform. The hook should be quick and punchy. The visual prompt can suggest text overlays or interactive elements."
    };
    
     const visualStyleInstruction = allowVisualExploration
    ? `- **Style**: Anda BEBAS mengusulkan visualStyle dan visualPrompt yang sama sekali baru yang Anda yakini akan lebih 'scroll-stopping' untuk Persona dan Format ini (misal: 'grafis kontras tinggi', 'gaya meme', 'cinematic'). Buatlah sesuatu yang tak terduga dan menarik perhatian.`
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
        - 🔥 Psychological Buying Trigger: "${trigger}"
        - Awareness Stage: "${awarenessStage}"
        - Creative Format: "${format}" (Guidelines: ${formatInstructions[format]})
        - Ad Placement: "${placement}" (Guidelines: ${placementInstructions[placement]})

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
        - The formula you choose MUST align with the trigger "${trigger}" and be localized for ${blueprint.adDna.targetCountry}.

        **STEP 3: Write the Headline.**
        - **HEADLINE FORMULAS MANDATE**: You MUST use one of these formulas for the "${awarenessStage}" stage:
        ${HEADLINE_FORMULAS[awarenessStage].map((f, i) => `${i + 1}. ${f.replace('[Product Name]', blueprint.productAnalysis.name).replace('[Offer]', blueprint.adDna.offerSummary)}`).join('\n')}
        - It must include the key benefit ("${blueprint.productAnalysis.keyBenefit}"), embed the "${trigger}" feeling, and be localized for ${blueprint.adDna.targetCountry}.

        **STEP 4: Write the Visual Prompt.** Expand your visual hook idea into a full prompt.
        - **VISUAL PROMPT STRUCTURE** (Write in this exact order):
        - **Scene Foundation**: Setting (specific place), Time/Lighting (e.g., "Golden hour sunlight"), Camera Angle (e.g., "Eye-level POV").
        - **Subject**: Who (${persona.description}, age ${persona.age}), Doing what (active verb), Expression (specific emotion), Clothing/styling (authentic to ${blueprint.adDna.targetCountry} & persona).
        - **Trigger Visualization**: How does the scene SHOW the "${trigger}" trigger? (e.g., For "Scarcity", show a nearly empty shelf). Be specific.
        - **Product Integration**: How is the product shown? Is the brand visible?
        ${visualStyleInstruction}
        - **Final Instruction**: Photorealistic, commercial quality, authentic, not AI-illustration-looking.
        ---
        
        Now, generate an array of 3 JSON objects using the process above. Each object must have the following structure:
        - id: A unique string identifier.
        - angle: Must be "${angle}".
        - trigger: Must be "${trigger}".
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
        - adSetName: A suggested ad set name in the format: Persona_Angle_Trigger_Awareness_Format_Placement_v[1,2, or 3].
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
    return JSON.parse(cleanedJson) as Omit<AdConcept, 'imageUrls'>[];
};


export const generateAdImage = async (prompt: string, referenceImageBase64?: string, allowVisualExploration: boolean = false): Promise<string> => {
    
    const useReference = referenceImageBase64 && !allowVisualExploration;

    const textPart = { 
        text: useReference 
            ? `Inspired by the visual style, lighting, and mood of the provided reference image, generate a new, ultra-photorealistic commercial photo of the following scene: ${prompt}. The final image must look like a real, high-quality photograph, not an AI illustration.`
            : `Ultra-photorealistic commercial advertisement photo, high detail, sharp focus. The scene is: ${prompt}. The final image should look like a real photograph, not an AI illustration.`
    };
    
    const parts: any[] = [textPart];

    if (useReference) {
        parts.unshift(imageB64ToGenerativePart(referenceImageBase64!));
    }

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
        - **Psychological Trigger:** "${concept.trigger}"
        - **Creative Format:** ${concept.format}
        - **Target Country:** ${blueprint.adDna.targetCountry}
        - **Visual Vehicle (The high-level visual direction):** "${concept.visualVehicle}"

        **Task:**
        Generate a new \`visualPrompt\` string that:
        1.  **Creates a strong 'Visual Hook'**: The scene described must be the visual counterpart to the 'Text Hook'. What visual would make that text hook 10x more powerful and scroll-stopping?
        2.  Faithfully executes the direction given in the \`visualVehicle\`.
        3.  Visually embodies the psychological trigger: "${concept.trigger}".
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
        angle: `Adapt the concept to a new strategic angle: "${newValue}". The trigger ("${baseConcept.trigger}") and format ("${baseConcept.format}") should remain consistent, but the core message (headline, hook) and visual must be re-imagined to reflect this new angle.`,
        trigger: `Adapt the concept to use a new psychological trigger: "${newValue}". The angle ("${baseConcept.angle}") and format ("${baseConcept.format}") should remain consistent, but the headline, hook, and visual must be rewritten to powerfully evoke the feeling of "${newValue}".`,
        format: `Adapt the concept to a new creative format: "${newValue}". The angle ("${baseConcept.angle}") and trigger ("${baseConcept.trigger}") are the same, but the entire execution (headline, hook, visual) must be re-imagined for the new format. If the new format is "Carousel", you MUST generate a "carouselSlides" array.`,
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
        - Trigger: "${baseConcept.trigger}"
        - Format: "${baseConcept.format}"
        - Placement: "${baseConcept.placement}"
        - Headline: "${baseConcept.headline}"
        - Hook: "${baseConcept.hook}"
        
        **🔥 Evolution Mandate: ${evolutionInstructions[evolutionType]}**

        Now, generate an array containing ONE new JSON object for the evolved concept.
        
        The object must have the following structure:
        - id: A new unique string identifier.
        - angle: The angle for the new concept.
        - trigger: The trigger for the new concept.
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
        - adSetName: A suggested ad set name reflecting the new evolved parameters.
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
    const result = JSON.parse(cleanedJson);
    return Array.isArray(result) ? result : [result]; // Ensure it's always an array
};


// Helper function to extract MIME type from base64 string
export const getMimeType = (base64: string): string => {
    return base64.substring(base64.indexOf(":") + 1, base64.indexOf(";"));
}
