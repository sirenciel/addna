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
    As an expert marketing strategist, analyze the provided ad creative and context to create a comprehensive "Campaign Blueprint".

    CONTEXT:
    - Ad Caption: "${caption}"
    - Product/Service Description: "${productInfo || 'Not provided. Infer from ad.'}"
    - Offer/CTA: "${offerInfo || 'Not provided. Infer from ad.'}"

    Based on all the provided information (image and text), generate a structured JSON object for the Campaign Blueprint with the following fields:

    1.  "productAnalysis": {
          "name": "The product/service name, inferred.",
          "keyBenefit": "The single most important benefit the product offers to the customer."
        }
    2.  "offerAnalysis": {
          "summary": "A brief summary of the offer.",
          "cta": "The primary call to action."
        }
    3.  "targetPersona": {
          "description": "A brief description of the target audience (e.g., 'Busy young mothers who value convenience').",
          "age": "Estimate the age range (e.g., '25-35').",
          "creatorType": "Describe the person in the ad (e.g., 'Real Customer', 'Expert', 'Model').",
          "painPoints": ["List 2-3 key problems or frustrations this persona faces that the product solves."],
          "desiredOutcomes": ["List 2-3 key goals or aspirations this persona has that the product helps achieve."]
        }
    4.  "adDna": {
          "visualFocus": "The main subject or element of the visual.",
          "emotionValue": "The core emotion or value proposition conveyed (e.g., 'Joy and togetherness', 'Efficiency and time-saving').",
          "textHook": "The most compelling opening line from the caption.",
          "visualStyle": "Describe the overall visual style (e.g., 'Candid influencer photo, natural lighting', 'Professional studio shot, clean background', 'Dark and moody cinematic look').",
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

  // FIX: Access response text directly
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
    // FIX: Access response text directly
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
        - Core Emotion: ${blueprint.adDna.emotionValue}
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
    // FIX: Access response text directly
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
    // FIX: Access response text directly
    const rawJson = response.text;
    const cleanedJson = rawJson.replace(/^```json\s*|```$/g, '');
    return JSON.parse(cleanedJson);
};


export const generateCreativeIdeas = async (blueprint: CampaignBlueprint, angle: string, trigger: string, awarenessStage: AwarenessStage, format: CreativeFormat, placement: PlacementFormat, persona: TargetPersona, strategicPathId: string): Promise<Omit<AdConcept, 'imageUrls'>[]> => {
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
        'Carousel': "Create a multi-slide story. Generate a 'carouselSlides' array with 3-5 slides. Each slide object needs a 'slideNumber', 'visualPrompt', 'headline', and 'description'. The main 'visualPrompt' for the concept should be for the cover slide.",
        'Instagram Feed': "Design for a 1:1 or 4:5 aspect ratio. The visual should be high-quality and scroll-stopping. The hook should be an engaging question or a bold statement to encourage interaction in the caption.",
        'Instagram Story': "Design for a 9:16 vertical aspect ratio. The visual should feel native and authentic to the platform. The hook should be quick and punchy. The visual prompt can suggest text overlays or interactive elements."
    };

    const prompt = `
        You are a world-class creative director specializing in high-conversion direct response ads. Your task is to generate 3 unique ad concepts that are strategic variations of a base campaign.
        The primary goal is to create VISUALLY DISTINCT executions that still feel like they belong to the SAME CAMPAIGN, anchored by the original ad's DNA. Each concept must be a concrete execution of the given angle, trigger, format, and placement.

        **Campaign Blueprint (The Foundation):**
        - Product: ${blueprint.productAnalysis.name} (Benefit: ${blueprint.productAnalysis.keyBenefit})
        - Offer: ${blueprint.offerAnalysis.summary} (CTA: ${blueprint.offerAnalysis.cta})
        - **Original Visual Style DNA: "${blueprint.adDna.visualStyle}" <-- THIS IS THE CORE VISUAL GUIDELINE.**
        - **Target Country for Localization: "${blueprint.adDna.targetCountry}"**

        **Target Persona Details (The Audience Lens):**
        - Description: "${persona.description}"
        - Age: "${persona.age}"
        - Creator Type: "${persona.creatorType}" (This dictates the style of the person in the ad)
        - Pains: ${persona.painPoints.join(', ')}

        **Creative Mandate (The Specific Task):**
        - Strategic Angle to execute: "${angle}"
        - 🔥 Psychological Buying Trigger: "${trigger}". This is the core psychological principle to embed in the ad. The copy and visuals MUST evoke the feeling of this trigger.
        - Awareness Stage: "${awarenessStage}"
        - Creative Format: "${format}" (Guidelines: ${formatInstructions[format]})
        - Ad Placement: "${placement}" (Guidelines: ${placementInstructions[placement]})

        Generate an array of 3 JSON objects. Each object must have the following structure:
        - id: A unique string identifier.
        - angle: A very short description of the messaging angle for this creative.
        - trigger: Must be "${trigger}".
        - format: Must be "${format}".
        - placement: Must be "${placement}".
        - awarenessStage: Must be "${awarenessStage}".
        - strategicPathId: Must be "${strategicPathId}".
        - personaDescription: Must be "${persona.description}".
        - personaAge: Must be "${persona.age}".
        - personaCreatorType: Must be "${persona.creatorType}".
        - visualVehicle: A brief description of the visual format (e.g., "Authentic-looking vertical user video").
        - hook: A compelling opening line for the ad copy, embodying the psychological essence of the "${trigger}" and addressing a pain point for this specific persona and awareness stage. **Must be localized for ${blueprint.adDna.targetCountry}.**
        - headline: A powerful headline for the ad, highlighting the key benefit and reinforcing the "${trigger}". **Must be localized for ${blueprint.adDna.targetCountry}.**
        - visualPrompt: A detailed, specific prompt for an AI image generator.
            - **CRITICAL INSTRUCTIONS FOR VISUAL PROMPT**:
            - 1. **Embody The Trigger**: The visual scene MUST be a metaphor for or a direct representation of the psychological trigger: "${trigger}". The entire scene's mood, composition, and action should convey this trigger.
            - 2. **Persona-Driven Scene**: The core concept, setting, subject, and overall vibe MUST be authentic to the persona's Age ("${persona.age}") and Creator Type ("${persona.creatorType}"). The scene must feel genuine to them and be culturally appropriate for **${blueprint.adDna.targetCountry}**.
            - 3. **DNA-Anchored Style**: The visual style MUST be a direct evolution of the original 'Visual Style DNA'. Blend the DNA ("${blueprint.adDna.visualStyle}") with the persona's aesthetic ("${persona.creatorType}"). The result should look like a new ad from the same brand, for a different audience segment. **DO NOT create a visual style that is completely unrelated to the original DNA.**
            - 4. **Action and Emotion**: The person in the scene should be interacting with the product or embodying the feeling the product provides. Describe their expression and body language.
        - adSetName: A suggested ad set name in the format: Persona_Angle_Trigger_Awareness_Format_Placement_v1.
        
        *** IMPORTANT FOR CAROUSEL PLACEMENT ***
        If placement is "Carousel", include a "carouselSlides" field: an array of 3-5 slide objects, each with "slideNumber", "visualPrompt", "headline", and "description". The final slide should strongly feature the CTA and embody the trigger. All text must be localized for **${blueprint.adDna.targetCountry}**.

        Respond ONLY with the JSON array.
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
    });

    // FIX: Access response text directly
    const rawJson = response.text;
    const cleanedJson = rawJson.replace(/^```json\s*|```$/g, '');
    return JSON.parse(cleanedJson) as Omit<AdConcept, 'imageUrls'>[];
};


export const generateAdImage = async (prompt: string, referenceImageBase64?: string): Promise<string> => {
    
    const textPart = { 
        text: referenceImageBase64 
            ? `Inspired by the visual style, lighting, and mood of the provided reference image, generate a new, ultra-photorealistic commercial photo of the following scene: ${prompt}. The final image must look like a real, high-quality photograph, not an AI illustration.`
            : `Ultra-photorealistic commercial advertisement photo, high detail, sharp focus. The scene is: ${prompt}. The final image should look like a real photograph, not an AI illustration.`
    };
    
    const parts: any[] = [textPart];

    if (referenceImageBase64) {
        parts.unshift(imageB64ToGenerativePart(referenceImageBase64));
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
        Given an ad concept, including a 'visual vehicle' (a high-level description of the scene), refine it into a new, detailed, specific visual prompt.

        **Ad Concept Details:**
        - **Product:** ${blueprint.productAnalysis.name}
        - **Persona:** ${concept.personaDescription} (Age: ${concept.personaAge}, Style: ${concept.personaCreatorType})
        - **Headline:** ${concept.headline}
        - **Psychological Trigger:** "${concept.trigger}"
        - **Creative Format:** ${concept.format}
        - **Target Country:** ${blueprint.adDna.targetCountry}
        - **Visual Vehicle (The new high-level direction):** "${concept.visualVehicle}"

        **Task:**
        Generate a new \`visualPrompt\` string that:
        1.  Faithfully executes the new direction given in the \`visualVehicle\`.
        2.  Visually embodies the psychological trigger: "${concept.trigger}".
        3.  Is authentic to the persona's age and style, and culturally appropriate for **${blueprint.adDna.targetCountry}**. The scene must feel genuine to them.
        4.  Creates a unique visual style by thoughtfully blending the original ad's DNA ("${blueprint.adDna.visualStyle}") with the persona's authentic aesthetic.
        5.  Includes rich details about composition, lighting, subject's expression, action, and environment.
        6.  Is highly descriptive and specific, ready to be used with an AI image generator.

        Respond ONLY with the text for the new visual prompt, without any labels or quotation marks.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ parts: [{ text: prompt }] }],
    });
    
    // FIX: Access response text directly
    return response.text;
};


export const generateConceptVariations = async (baseConcept: AdConcept, blueprint: CampaignBlueprint): Promise<Omit<AdConcept, 'imageUrls'>[]> => {
    const prompt = `
        You are a world-class creative director tasked with evolving an existing ad concept.
        Given the original Campaign Blueprint and a specific creative concept, generate 3 NEW and DISTINCT variations.
        These variations should maintain the core strategic angle, buying trigger, and creative format but explore different creative executions.

        Campaign Blueprint:
        - Product: ${blueprint.productAnalysis.name} (Benefit: ${blueprint.productAnalysis.keyBenefit})
        - Target Persona: ${baseConcept.personaDescription} (Age: ${baseConcept.personaAge}, Creator Type: ${baseConcept.personaCreatorType})
        - Visual Style DNA: "${blueprint.adDna.visualStyle}"
        - **Target Country for Localization: "${blueprint.adDna.targetCountry}"**

        Base Creative Concept (built on the "${baseConcept.angle}" angle with psychological trigger "${baseConcept.trigger}" and format "${baseConcept.format}"):
        - Headline: ${baseConcept.headline}
        - Hook: ${baseConcept.hook}
        - Visual Prompt: ${baseConcept.visualPrompt}
        
        Now, generate an array of 3 new JSON objects for the variations. For each variation, change the headline, hook, and visual prompt significantly while staying true to the original angle, trigger, persona attributes, and format.
        If the base concept placement is 'Carousel', do NOT generate the 'carouselSlides' field for the variations; focus only on the main concept fields.
        
        Each object must have the following structure:
        - id: A new unique string identifier.
        - angle: Must be similar to "${baseConcept.angle}".
        - trigger: Must be "${baseConcept.trigger}".
        - format: Must be "${baseConcept.format}".
        - placement: Must be "${baseConcept.placement}".
        - awarenessStage: Must be "${baseConcept.awarenessStage}".
        - strategicPathId: Must be "${baseConcept.strategicPathId}".
        - personaDescription: Must be "${baseConcept.personaDescription}".
        - personaAge: Must be "${baseConcept.personaAge}".
        - personaCreatorType: Must be "${baseConcept.personaCreatorType}".
        - visualVehicle: A brief description of the visual format.
        - hook: A compelling new opening line for the ad copy, still embodying the psychological essence of the "${baseConcept.trigger}". **Must be localized for ${blueprint.adDna.targetCountry}.**
        - headline: A powerful new headline for the ad, still embodying the psychological essence of the "${baseConcept.trigger}". **Must be localized for ${blueprint.adDna.targetCountry}.**
        - visualPrompt: A new, detailed, specific prompt for an AI image generator. 
            - It MUST be visually distinct from the base concept's prompt.
            - It MUST incorporate the Visual Style DNA: "${blueprint.adDna.visualStyle}".
            - It MUST be appropriate for the persona's age, creator type, and the cultural context of **${blueprint.adDna.targetCountry}**.
            - It MUST visually embody the trigger: "${baseConcept.trigger}".
        - adSetName: A suggested ad set name in the format: Persona_Angle_Trigger_Format_Placement_v[number].

        Respond ONLY with the JSON array.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
    });

    // FIX: Access response text directly
    const rawJson = response.text;
    const cleanedJson = rawJson.replace(/^```json\s*|```$/g, '');
    return JSON.parse(cleanedJson) as Omit<AdConcept, 'imageUrls'>[];
};

// Helper function to extract MIME type from base64 string
export const getMimeType = (base64: string): string => {
    return base64.substring(base64.indexOf(":") + 1, base64.indexOf(";"));
}