import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, Step, StoreLocation } from "../types";

// Initialize Gemini Client Lazily
const getAi = () => {
  // Safe access to process.env for web environments
  // We check process.env.API_KEY (standard) AND process.env.EXPO_PUBLIC_API_KEY (automatic in Expo)
  let apiKey = '';
  
  if (typeof process !== 'undefined' && process.env) {
      apiKey = process.env.API_KEY || process.env.EXPO_PUBLIC_API_KEY || '';
  }
  
  if (!apiKey) {
      throw new Error("Missing API Key. Please check your .env or environment configuration.");
  }
    
  return new GoogleGenAI({ apiKey: apiKey });
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
    5. In the 'steps', ensure cooking instructions match the new ingredients.
  `;
};

/**
 * Parses a recipe from a raw text description.
 */
export const parseRecipeFromText = async (text: string, allergies: string[] = [], diets: string[] = []): Promise<Recipe> => {
  const model = "gemini-2.5-flash";
  const ai = getAi();
  
  const dietaryPrompt = formatDietaryContext(allergies, diets);

  const prompt = `
    You are an expert chef API. 
    Input: "${text}"
    ${dietaryPrompt}
    Structure the input into a recipe JSON.
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
              },
            },
          },
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
    isOffline: false,
    steps: rawRecipe.steps || []
  };
};

/**
 * Analyzes a URL (YouTube, Blog, etc.) using Google Search grounding.
 */
export const extractRecipeFromUrl = async (url: string, allergies: string[] = [], diets: string[] = []): Promise<Recipe> => {
    const model = "gemini-2.5-flash";
    const ai = getAi();
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
                                properties: {
                                    name: { type: Type.STRING },
                                    amount: { type: Type.STRING },
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
        throw new Error(`Could not extract recipe: ${e.message}`);
    }
};

/**
 * Suggests 6 recipes based on the image.
 */
export const suggestRecipesFromImage = async (base64Image: string, allergies: string[] = [], diets: string[] = []): Promise<Array<{ title: string, description: string }>> => {
    const model = "gemini-2.5-flash";
    const ai = getAi();
    const dietaryPrompt = formatDietaryContext(allergies, diets);

    const prompt = `
      Analyze this image of food.
      Search for 6 distinct, accurate recipes that match this image.
      ${dietaryPrompt}
      Return title and description.
    `;

    try {
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

        return JSON.parse(response.text || "[]");
    } catch (e) {
        console.error("Gemini Vision Error:", e);
        // Throwing here ensures the UI knows something went wrong instead of failing silently
        throw new Error("Failed to analyze image.");
    }
};

/**
 * Step 2 of Image Gen.
 */
export const generateFullRecipeFromSuggestion = async (suggestion: { title: string, description: string }, base64Image?: string, allergies: string[] = [], diets: string[] = []): Promise<Recipe> => {
    const model = "gemini-2.5-flash"; // Using 2.5 Flash for speed/reliability
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
                            },
                        },
                    },
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
        isOffline: false,
        steps: rawRecipe.steps || []
    };
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

export const getCookingHelp = async (stepInstruction: string, context: string): Promise<string> => {
  const model = "gemini-2.5-flash";
  const ai = getAi();
  const response = await ai.models.generateContent({
    model,
    contents: `Step: "${stepInstruction}". Context: "${context}". Give a very short, funny, or encouraging tip. Max 20 words.`,
  });
  return response.text || "You got this!";
};