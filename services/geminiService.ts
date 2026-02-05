import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, Step, StoreLocation } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Parses a recipe from a raw text description or URL content.
 */
export const parseRecipeFromText = async (text: string): Promise<Recipe> => {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    You are an expert chef API. 
    Input: "${text}"
    
    1. If the input is a URL, attempt to extract the recipe content structure from it.
    2. If the input is text describing a video, structure it into steps.
    3. Identify "actionVerb" for steps (e.g., 'chop', 'boil', 'fry', 'bake', 'mix').
    4. Provide specific "warning" for steps where timing is critical (e.g., "Garlic burns fast!").
    5. Identify potential allergens based on ingredients.
    6. Suggest a 'musicMood'.
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
    },
  });

  const rawRecipe = JSON.parse(response.text || "{}");
  
  return {
    ...rawRecipe,
    id: crypto.randomUUID(),
    imageUrl: "https://picsum.photos/800/600", 
    isPremium: false,
    author: "You",
    reviews: [],
    isPublic: false,
    isOffline: false
  };
};

/**
 * Step 1 of Image Gen: Suggests 6 recipes based on the image + internet search.
 */
export const suggestRecipesFromImage = async (base64Image: string): Promise<Array<{ title: string, description: string }>> => {
    const model = "gemini-3-flash-preview";
    
    const prompt = `
      Analyze this image of food or ingredients. 
      Identify the food items.
      Search the internet to find 6 distinct, highly-rated, and accurate recipes that match this food.
      Return a list of these 6 recipes with a title and a short appetizing description for each.
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
        console.error("Failed to parse suggestions", e);
        return [];
    }
};

/**
 * Step 2 of Image Gen: Takes the selected suggestion and generates the full recipe.
 */
export const generateFullRecipeFromSuggestion = async (suggestion: { title: string, description: string }, base64Image?: string): Promise<Recipe> => {
    const model = "gemini-3-flash-preview";
    
    const prompt = `
      Create a detailed, step-by-step cooking recipe for "${suggestion.title}".
      Description context: ${suggestion.description}.
      
      Requirements:
      1. List precise ingredients with amounts.
      2. Numbered step-by-step instructions.
      3. Identify "actionVerb" for steps.
      4. Provide tips and warnings.
      5. Suggest a 'musicMood'.
    `;

    const response = await ai.models.generateContent({
        model,
        contents: prompt, // We don't strictly need the image again, the text context is usually enough now
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
        id: crypto.randomUUID(),
        // We use the original image if available, else a placeholder
        imageUrl: base64Image ? `data:image/jpeg;base64,${base64Image}` : "https://picsum.photos/800/600",
        isPremium: false,
        author: "AI Chef",
        reviews: [],
        isPublic: false,
        isOffline: false
    };
};

/**
 * Legacy support / Direct scan if needed (consolidated for backward compatibility if called elsewhere)
 */
export const scanRecipeFromImage = async (base64Image: string): Promise<Recipe> => {
   // This is a fallback that does both steps in one if called directly.
   const suggestions = await suggestRecipesFromImage(base64Image);
   if (suggestions.length > 0) {
       return generateFullRecipeFromSuggestion(suggestions[0], base64Image);
   }
   throw new Error("Could not generate recipe");
};

/**
 * OCR extraction for specific text blocks (ingredients or steps)
 */
export const extractTextFromImage = async (base64Image: string, type: 'ingredients' | 'steps'): Promise<string> => {
  const model = "gemini-3-flash-preview";
  const prompt = type === 'ingredients' 
    ? "Look at this image. Extract only the food ingredients listed. Return them as a simple list, one per line. Do not include title or other text. If there are quantities, include them."
    : "Look at this image. Extract the cooking instructions/steps. Return them as a numbered list. Do not include ingredients or title. Ignore UI elements.";

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
  const response = await ai.models.generateContent({
    model,
    contents: `Step: "${stepInstruction}". Context: "${context}". Give a very short, funny, or encouraging tip. Max 20 words.`,
  });
  return response.text || "You got this!";
};

export const findGroceryStores = async (ingredient: string, latitude: number, longitude: number): Promise<StoreLocation[]> => {
  const model = "gemini-2.5-flash"; 
  
  const response = await ai.models.generateContent({
    model,
    contents: `Find 3 closest grocery stores near lat:${latitude}, long:${longitude} that likely sell ${ingredient}.`,
    config: {
      tools: [{ googleMaps: {} }],
      toolConfig: {
        retrievalConfig: {
          latLng: { latitude, longitude },
        },
      },
    },
  });

  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  
  const stores: StoreLocation[] = groundingChunks
    .filter((chunk: any) => chunk.maps)
    .map((chunk: any) => ({
      name: chunk.maps.title,
      address: chunk.maps.placeAnswerSources?.[0]?.placeId || "Nearby", 
      uri: chunk.maps.uri,
      rating: 4.5 // Mock rating as grounding doesn't always provide it
    }));

  const uniqueStores = Array.from(new Map(stores.map(item => [item.name, item])).values());
  return uniqueStores.slice(0, 3);
};