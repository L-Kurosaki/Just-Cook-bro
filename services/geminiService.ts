import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, Step, StoreLocation } from "../types";

// Initialize Gemini Client Lazily
// This prevents top-level crashes if process.env is undefined in some web contexts
const getAi = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
};

// React Native doesn't support crypto.randomUUID out of the box without polyfills.
const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
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
    2. If it does, YOU MUST SUBSTITUTE them with valid alternatives that fit the diet (e.g., use almond milk for dairy, gluten-free flour for wheat, tofu/tempeh for meat).
    3. Ensure the substitution maintains the texture and flavor of the dish as closely as possible.
    4. In the 'ingredients' list, explicitly mention the substitution (e.g., "Almond Milk (Dairy-Free subst.)").
    5. In the 'steps', ensure cooking instructions match the new ingredients (e.g., "cook tofu" instead of "cook chicken").
    6. If the dish is completely incompatible (e.g., a steak for a vegan), create the closest thematic alternative (e.g., Cauliflower Steak).
  `;
};

/**
 * Parses a recipe from a raw text description or URL content.
 */
export const parseRecipeFromText = async (text: string, allergies: string[] = [], diets: string[] = []): Promise<Recipe> => {
  const model = "gemini-3-flash-preview";
  const ai = getAi();
  
  const dietaryPrompt = formatDietaryContext(allergies, diets);

  const prompt = `
    You are an expert chef API. 
    Input: "${text}"
    
    ${dietaryPrompt}

    1. Structure the input into a recipe.
    2. Identify "actionVerb" for steps (e.g., 'chop', 'boil').
    3. Identify "originalAuthor" if mentioned in the text (e.g. "Recipe by Grandma", "Courtesy of Chef John").
    4. Provide specific "warning" for steps where timing is critical.
    5. Suggest a 'musicMood'.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
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
          originalAuthor: { type: Type.STRING },
          originalSource: { type: Type.STRING },
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
                actionVerb: { type: Type.STRING },
              },
            },
          },
          musicMood: { type: Type.STRING },
          dietaryTags: { type: Type.ARRAY, items: { type: Type.STRING } },
          allergens: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["title", "ingredients", "steps"],
      },
    },
  });

  const rawRecipe = JSON.parse(response.text || "{}");
  
  return {
    ...rawRecipe,
    id: generateId(),
    imageUrl: "https://picsum.photos/800/600", 
    isPremium: false,
    author: "You",
    reviews: [],
    isPublic: false,
    isOffline: false
  };
};

/**
 * Analyzes a URL (YouTube, Blog, etc.) using Google Search grounding.
 * Adds strict attribution extraction.
 */
export const extractRecipeFromUrl = async (url: string, allergies: string[] = [], diets: string[] = []): Promise<Recipe> => {
    const model = "gemini-3-flash-preview";
    const ai = getAi();
    const dietaryPrompt = formatDietaryContext(allergies, diets);

    const prompt = `
      I have this URL: ${url}
      
      Tasks:
      1. Visit the URL/Search to find the content.
      2. Extract the recipe details.
      3. CRITICAL: Identify the Original Creator/Author Name and their Social Handle if available.
      4. Format into JSON.

      ${dietaryPrompt}
    `;

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
                    originalAuthor: { type: Type.STRING, description: "The name of the person who created the recipe" },
                    originalSource: { type: Type.STRING, description: "The platform (e.g. YouTube, TikTok)" },
                    socialHandle: { type: Type.STRING, description: "Their @handle or channel name" },
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
                                actionVerb: { type: Type.STRING },
                            },
                        },
                    },
                    musicMood: { type: Type.STRING },
                    dietaryTags: { type: Type.ARRAY, items: { type: Type.STRING } },
                    allergens: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ["title", "ingredients", "steps"],
            },
        }
    });

    const rawRecipe = JSON.parse(response.text || "{}");

    return {
        ...rawRecipe,
        id: generateId(),
        imageUrl: "https://picsum.photos/800/600",
        sourceUrl: url,
        isPremium: false,
        author: "Web Import",
        reviews: [],
        isPublic: false,
        isOffline: false
    };
};

/**
 * Suggests 6 recipes based on the image.
 */
export const suggestRecipesFromImage = async (base64Image: string, allergies: string[] = [], diets: string[] = []): Promise<Array<{ title: string, description: string }>> => {
    const model = "gemini-3-flash-preview";
    const ai = getAi();
    const dietaryPrompt = formatDietaryContext(allergies, diets);

    const prompt = `
      Analyze this image of food.
      Search for 6 distinct, accurate recipes.
      ${dietaryPrompt}
      Return title and description.
    `;

    const response = await ai.models.generateContent({
        model,
        contents: {
            parts: [
                { inlineData: { mimeType: "image/jpeg", data: base64Image } },
                { text: prompt }
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

    try {
        return JSON.parse(response.text || "[]");
    } catch (e) {
        return [];
    }
};

/**
 * Step 2 of Image Gen.
 */
export const generateFullRecipeFromSuggestion = async (suggestion: { title: string, description: string }, base64Image?: string, allergies: string[] = [], diets: string[] = []): Promise<Recipe> => {
    const model = "gemini-3-flash-preview";
    const ai = getAi();
    const dietaryPrompt = formatDietaryContext(allergies, diets);

    const prompt = `
      Create a detailed recipe for "${suggestion.title}".
      Context: ${suggestion.description}.
      ${dietaryPrompt}
    `;

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
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
                                actionVerb: { type: Type.STRING },
                            },
                        },
                    },
                    musicMood: { type: Type.STRING },
                    dietaryTags: { type: Type.ARRAY, items: { type: Type.STRING } },
                    allergens: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ["title", "ingredients", "steps"],
            },
        }
    });

    const rawRecipe = JSON.parse(response.text || "{}");
    
    return {
        ...rawRecipe,
        id: generateId(),
        imageUrl: base64Image ? `data:image/jpeg;base64,${base64Image}` : "https://picsum.photos/800/600",
        isPremium: false,
        author: "AI Chef",
        reviews: [],
        isPublic: false,
        isOffline: false
    };
};

/**
 * Video Analysis with STRICT Watermark detection for Attribution.
 */
export const generateRecipeFromVideoFrames = async (frames: string[], allergies: string[] = [], diets: string[] = []): Promise<Recipe> => {
  const model = "gemini-3-pro-preview"; 
  const ai = getAi();
  
  const dietaryPrompt = formatDietaryContext(allergies, diets);

  const prompt = `
    Analyze these video frames for a cooking recipe.
    ${dietaryPrompt}

    TASKS:
    1. Extract the recipe steps and ingredients.
    2. **STRICT ATTRIBUTION CHECK**: You MUST look for watermarks, TikTok handles, YouTube channel names, or on-screen text overlays that identify the creator. 
       - Examples: "@GordonRamsay", "Tasty", "BingingWithBabish".
       - This is CRITICAL for user safety and credit.
    3. If a name or handle is found, set "originalAuthor" and "socialHandle".
    4. If the platform is identifiable (e.g. TikTok logo), set "originalSource".
  `;

  const parts: any[] = [{ text: prompt }];
  frames.forEach(base64 => {
    parts.push({ inlineData: { mimeType: "image/jpeg", data: base64 } });
  });

  const response = await ai.models.generateContent({
    model,
    contents: { parts },
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
          originalAuthor: { type: Type.STRING, description: "Name extracted from watermark/text. Mandatory if visible." },
          socialHandle: { type: Type.STRING, description: "Handle extracted from watermark/text" },
          originalSource: { type: Type.STRING },
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
                actionVerb: { type: Type.STRING },
              },
            },
          },
          musicMood: { type: Type.STRING },
          dietaryTags: { type: Type.ARRAY, items: { type: Type.STRING } },
          allergens: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["title", "ingredients", "steps"],
      },
    },
  });

  const rawRecipe = JSON.parse(response.text || "{}");

  return {
    ...rawRecipe,
    id: generateId(),
    imageUrl: frames.length > 0 ? `data:image/jpeg;base64,${frames[Math.floor(frames.length / 2)]}` : "https://picsum.photos/800/600",
    isPremium: false,
    author: "Video AI",
    reviews: [],
    isPublic: false,
    isOffline: false
  };
};

/**
 * OCR Legacy
 */
export const extractTextFromImage = async (base64Image: string, type: 'ingredients' | 'steps'): Promise<string> => {
  const model = "gemini-3-flash-preview";
  const ai = getAi();
  const prompt = type === 'ingredients' 
    ? "Extract food ingredients list. One per line."
    : "Extract cooking steps. Numbered list.";

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: base64Image } },
        { text: prompt },
      ],
    },
  });
  return response.text || "";
};

export const getCookingHelp = async (stepInstruction: string, context: string): Promise<string> => {
  const model = "gemini-3-flash-preview";
  const ai = getAi();
  const response = await ai.models.generateContent({
    model,
    contents: `Step: "${stepInstruction}". Context: "${context}". Give a very short, funny, or encouraging tip. Max 20 words.`,
  });
  return response.text || "You got this!";
};

export const findGroceryStores = async (ingredient: string, latitude: number, longitude: number): Promise<StoreLocation[]> => {
  const model = "gemini-2.5-flash"; 
  const ai = getAi();
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
};

export const scanRecipeFromImage = async (base64Image: string, allergies: string[] = [], diets: string[] = []): Promise<Recipe> => {
   const suggestions = await suggestRecipesFromImage(base64Image, allergies, diets);
   if (suggestions.length > 0) return generateFullRecipeFromSuggestion(suggestions[0], base64Image, allergies, diets);
   throw new Error("Could not generate recipe");
};