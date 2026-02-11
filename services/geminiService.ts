import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, Step, StoreLocation } from "../types";

// --- CONFIGURATION ---

// Initialize Gemini Client Lazily
const getGemini = () => {
  const apiKey = process.env.EXPO_PUBLIC_API_KEY || process.env.API_KEY;
  if (!apiKey) {
      console.error("Gemini API Key is missing. Please set EXPO_PUBLIC_API_KEY.");
      throw new Error("Gemini API Key is missing. Please check your app configuration.");
  }
  return new GoogleGenAI({ apiKey });
};

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';

const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// --- OPENAI FALLBACK HELPERS ---

/**
 * Calls OpenAI GPT-4o as a fallback when Gemini fails.
 * Supports text and vision inputs.
 */
const callOpenAI = async (
    systemPrompt: string, 
    userPrompt: string, 
    imageBase64?: string, 
    jsonMode: boolean = true
): Promise<any> => {
    if (!OPENAI_API_KEY) {
        console.warn("OpenAI Fallback requested but no API Key found.");
        throw new Error("OpenAI Fallback unavailable: Missing EXPO_PUBLIC_OPENAI_API_KEY.");
    }

    const messages: any[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: [] }
    ];

    if (imageBase64) {
        messages[1].content = [
            { type: "text", text: userPrompt },
            { 
                type: "image_url", 
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` } 
            }
        ];
    } else {
        messages[1].content = userPrompt;
    }

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: messages,
                response_format: jsonMode ? { type: "json_object" } : undefined,
                temperature: 0.7
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        const content = data.choices[0].message.content;
        return jsonMode ? JSON.parse(content) : content;
    } catch (error: any) {
        console.error("OpenAI Fallback Error:", error);
        throw new Error(`OpenAI Fallback Failed: ${error.message}`);
    }
};

// Helper to format dietary context for prompts
const formatDietaryContext = (allergies: string[] = [], diets: string[] = []) => {
  if (allergies.length === 0 && diets.length === 0) return "";
  return `
    IMPORTANT DIETARY ENFORCEMENT:
    User Allergies: ${allergies.join(", ")}.
    User Diet: ${diets.join(", ")}.
    
    CRITICAL INSTRUCTION: 
    1. Check if the recipe contains any restricted ingredients.
    2. If it does, YOU MUST SUBSTITUTE them with valid alternatives that fit the diet.
    3. In the 'ingredients' list, explicitly mention the substitution.
    4. In the 'steps', ensure cooking instructions match the new ingredients.
  `;
};

// Helper to normalize data from either AI into a Recipe object
const mapToRecipe = (raw: any, imageBase64?: string): Recipe => {
    return {
        ...raw,
        id: generateId(),
        // If we have a local image (scan), use it. Otherwise fallback to generated/placeholder.
        imageUrl: imageBase64 
            ? `data:image/jpeg;base64,${imageBase64}` 
            : (raw.imageUrl || "https://picsum.photos/800/600"),
        isPremium: false,
        author: "AI Chef",
        reviews: [],
        isPublic: false,
        isOffline: false,
        steps: raw.steps || [],
        ingredients: raw.ingredients || []
    };
};

// --- EXPORTED FUNCTIONS ---

/**
 * Parses a recipe from a raw text description.
 */
export const parseRecipeFromText = async (text: string, allergies: string[] = [], diets: string[] = []): Promise<Recipe> => {
  const dietaryPrompt = formatDietaryContext(allergies, diets);
  const geminiSchema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      description: { type: Type.STRING },
      prepTime: { type: Type.STRING },
      cookTime: { type: Type.STRING },
      servings: { type: Type.NUMBER },
      ingredients: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            amount: { type: Type.STRING },
            category: { type: Type.STRING },
          },
        },
      },
      steps: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            instruction: { type: Type.STRING },
            timeInSeconds: { type: Type.NUMBER },
            tip: { type: Type.STRING },
            warning: { type: Type.STRING },
          },
        },
      },
    },
    required: ["title", "ingredients", "steps"],
  };

  // 1. Try Gemini
  try {
      const ai = getGemini();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `You are an expert chef API. Input: "${text}". ${dietaryPrompt}. Structure the input into a recipe JSON.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: geminiSchema,
        },
      });
      const raw = JSON.parse(response.text || "{}");
      return mapToRecipe(raw);
  } catch (e) {
      console.warn("Gemini parseRecipeFromText failed, attempting OpenAI fallback...", e);
      
      // 2. Fallback OpenAI
      const system = `You are a recipe parser. Return strictly valid JSON matching this structure: { title: string, description: string, prepTime: string, cookTime: string, servings: number, ingredients: [{name, amount, category}], steps: [{instruction, timeInSeconds: number, tip, warning}] }.`;
      const user = `Parse this text into a recipe: "${text}". ${dietaryPrompt}`;
      
      const raw = await callOpenAI(system, user, undefined, true);
      return mapToRecipe(raw);
  }
};

/**
 * Analyzes a URL (YouTube, Blog, etc.) using Google Search grounding.
 * NOTE: This is Gemini exclusive as OpenAI does not have native search tools in this integration.
 */
export const extractRecipeFromUrl = async (url: string, allergies: string[] = [], diets: string[] = []): Promise<Recipe> => {
    const model = "gemini-3-flash-preview";
    const dietaryPrompt = formatDietaryContext(allergies, diets);

    const prompt = `
      I have this URL: ${url}
      Tasks:
      1. Visit the URL/Search to find the content.
      2. Extract the recipe details.
      3. Identify the Original Creator/Author Name and their Social Handle if available.
      4. Format into JSON.
      ${dietaryPrompt}
    `;

    try {
        const ai = getGemini();
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        prepTime: { type: Type.STRING },
                        cookTime: { type: Type.STRING },
                        servings: { type: Type.NUMBER },
                        originalAuthor: { type: Type.STRING },
                        originalSource: { type: Type.STRING },
                        socialHandle: { type: Type.STRING },
                        ingredients: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: { name: { type: Type.STRING }, amount: { type: Type.STRING } },
                            },
                        },
                        steps: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    instruction: { type: Type.STRING },
                                    timeInSeconds: { type: Type.NUMBER },
                                    tip: { type: Type.STRING },
                                    warning: { type: Type.STRING },
                                },
                            },
                        },
                    },
                    required: ["title", "ingredients", "steps"],
                },
            }
        });

        if (!response.text) throw new Error("Empty response from AI");
        const rawRecipe = JSON.parse(response.text);

        return {
            ...rawRecipe,
            id: generateId(),
            imageUrl: "https://picsum.photos/800/600",
            sourceUrl: url,
            isPremium: false,
            author: "Web Import",
            reviews: [],
            isPublic: false,
            isOffline: false,
            steps: rawRecipe.steps || []
        };
    } catch (e: any) {
        console.error("Gemini URL Extraction Error:", e);
        // We cannot fallback to OpenAI here easily as it requires browsing capability.
        throw new Error(`Could not extract recipe: ${e.message}. Note: Link extraction relies on Gemini Search.`);
    }
};

/**
 * Suggests 6 recipes based on the image.
 */
export const suggestRecipesFromImage = async (base64Image: string, allergies: string[] = [], diets: string[] = []): Promise<Array<{ title: string, description: string }>> => {
    const dietaryPrompt = formatDietaryContext(allergies, diets);

    // 1. Try Gemini
    try {
        const ai = getGemini();
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: {
                parts: [
                    { inlineData: { mimeType: "image/jpeg", data: base64Image } },
                    { text: `Analyze this image of food. Search for 6 distinct, accurate recipes that match this image. ${dietaryPrompt}. Return title and description.` }
                ]
            },
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            description: { type: Type.STRING }
                        },
                        required: ["title", "description"]
                    }
                }
            }
        });

        return JSON.parse(response.text || "[]");
    } catch (e) {
        console.warn("Gemini Vision failed, attempting OpenAI fallback...", e);
        
        // 2. Fallback OpenAI
        // OpenAI json_object mode requires the root to be an object, not an array.
        const system = "You are a food expert. Analyze the image and return a JSON object with a key 'suggestions' containing an array of 6 recipes: { suggestions: [{title, description}] }.";
        const user = `Suggest recipes for this image. ${dietaryPrompt}`;
        
        try {
            const resWrapped = await callOpenAI(system, user, base64Image, true);
            return resWrapped.suggestions || [];
        } catch (openAiError) {
             throw new Error("Both AI services failed to analyze the image.");
        }
    }
};

/**
 * Step 2 of Image Gen.
 */
export const generateFullRecipeFromSuggestion = async (suggestion: { title: string, description: string }, base64Image?: string, allergies: string[] = [], diets: string[] = []): Promise<Recipe> => {
    const dietaryPrompt = formatDietaryContext(allergies, diets);

    // 1. Try Gemini
    try {
        const model = "gemini-3-flash-preview";
        const ai = getGemini();
        const response = await ai.models.generateContent({
            model,
            contents: `Create a detailed recipe for "${suggestion.title}". Context: ${suggestion.description}. ${dietaryPrompt}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        prepTime: { type: Type.STRING },
                        cookTime: { type: Type.STRING },
                        servings: { type: Type.NUMBER },
                        ingredients: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    amount: { type: Type.STRING },
                                    category: { type: Type.STRING },
                                },
                            },
                        },
                        steps: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    instruction: { type: Type.STRING },
                                    timeInSeconds: { type: Type.NUMBER },
                                    tip: { type: Type.STRING },
                                    warning: { type: Type.STRING },
                                },
                            },
                        },
                    },
                    required: ["title", "ingredients", "steps"],
                },
            }
        });
        const raw = JSON.parse(response.text || "{}");
        return mapToRecipe(raw, base64Image);
    } catch (e) {
        console.warn("Gemini generation failed, attempting OpenAI fallback...", e);

        // 2. Fallback OpenAI
        const system = `You are an expert chef. Create a detailed recipe JSON with schema: { title, description, prepTime, cookTime, servings, ingredients: [{name, amount, category}], steps: [{instruction, timeInSeconds, tip, warning}] }.`;
        const user = `Create recipe for "${suggestion.title}". ${suggestion.description}. ${dietaryPrompt}`;
        
        const raw = await callOpenAI(system, user, undefined, true);
        return mapToRecipe(raw, base64Image);
    }
};

export const findGroceryStores = async (ingredient: string, latitude: number, longitude: number): Promise<StoreLocation[]> => {
  const model = "gemini-2.5-flash"; 
  
  // Maps is unique to Gemini, no OpenAI fallback possible for "finding real places" without external tools
  try {
      const ai = getGemini();
      const response = await ai.models.generateContent({
        model,
        contents: `Find 3 closest grocery stores near lat:${latitude}, long:${longitude} that likely sell ${ingredient}.`,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: { retrievalConfig: { latLng: { latitude, longitude } } },
        },
      });
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const stores: StoreLocation[] = groundingChunks
        .filter((chunk: any) => chunk.maps)
        .map((chunk: any) => ({
          name: chunk.maps.title,
          address: chunk.maps.placeAnswerSources?.[0]?.placeId || "Nearby", 
          uri: chunk.maps.uri,
          rating: 4.5
        }));
      return Array.from(new Map(stores.map(item => [item.name, item])).values()).slice(0, 3);
  } catch(e) {
      console.warn("Gemini Maps failed", e);
      return [];
  }
};

export const getCookingHelp = async (stepInstruction: string, context: string): Promise<string> => {
  // 1. Try Gemini
  try {
    const model = "gemini-3-flash-preview";
    const ai = getGemini();
    const response = await ai.models.generateContent({
      model,
      contents: `Step: "${stepInstruction}". Context: "${context}". Give a very short, funny, or encouraging tip. Max 20 words.`,
    });
    return response.text || "You got this!";
  } catch (e) {
      console.warn("Gemini help failed, attempting OpenAI fallback...", e);
      // 2. Fallback OpenAI
      try {
        const system = "You are a helpful cooking assistant. Keep it short (max 20 words), funny or encouraging.";
        const user = `Step: "${stepInstruction}". Context: "${context}".`;
        const text = await callOpenAI(system, user, undefined, false); // False = text mode
        return text;
      } catch (err) {
        return "You got this! (Offline)";
      }
  }
};