import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, Step, StoreLocation } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Parses a recipe from a raw text description or URL content.
 */
export const parseRecipeFromText = async (text: string): Promise<Recipe> => {
  const model = "gemini-3-flash-preview";
  
  const response = await ai.models.generateContent({
    model,
    contents: `Extract a structured recipe from the following text. If information is missing, infer reasonable defaults based on the context. Ensure the tone is simple and reassuring. Text: ${text}`,
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
                category: { type: Type.STRING, description: "e.g., Produce, Meat, Spices" },
              },
            },
          },
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                instruction: { type: Type.STRING },
                timeInSeconds: { type: Type.NUMBER, description: "Estimated time for this specific step in seconds, if applicable. 0 if not." },
                tip: { type: Type.STRING, description: "A helpful, reassuring tip or light joke for this step." },
              },
            },
          },
          musicMood: { type: Type.STRING, description: "Suggested music genre/mood for cooking this." },
        },
        required: ["title", "ingredients", "steps"],
      },
    },
  });

  const rawRecipe = JSON.parse(response.text || "{}");
  
  return {
    ...rawRecipe,
    id: crypto.randomUUID(),
    imageUrl: "https://picsum.photos/800/600", // Placeholder
  };
};

/**
 * Scans a recipe from an image (Cookbook scan).
 */
export const scanRecipeFromImage = async (base64Image: string): Promise<Recipe> => {
  const model = "gemini-2.5-flash-image"; // Optimized for image tasks

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image,
          },
        },
        {
          text: "Analyze this image of a recipe. Extract the title, ingredients, and steps into a structured JSON format. Be precise with quantities.",
        },
      ],
    },
    // Note: 2.5-flash-image does not support responseSchema effectively in all environments, 
    // but we can request JSON in the prompt or use the generic structure if supported.
    // For reliability in this demo, we will ask for markdown code block JSON and parse it manually if schema fails,
    // but 3-flash-preview is better for schema. Let's try to prompt for JSON structure directly.
  });

  // Simple parsing logic since 2.5-flash-image might return text with ```json block
  const text = response.text || "";
  const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
  
  let rawRecipe: any = {};
  if (jsonMatch) {
    try {
      rawRecipe = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } catch (e) {
      console.error("Failed to parse JSON from image scan", e);
      throw new Error("Could not read recipe from image. Please try again.");
    }
  } else {
      // Fallback: If structure fails, return a dummy or throw.
       throw new Error("Could not detect a clear recipe structure.");
  }

  return {
    id: crypto.randomUUID(),
    title: rawRecipe.title || "Scanned Recipe",
    description: rawRecipe.description || "Imported from cookbook scan",
    prepTime: rawRecipe.prepTime || "15 mins",
    cookTime: rawRecipe.cookTime || "30 mins",
    servings: rawRecipe.servings || 2,
    ingredients: rawRecipe.ingredients || [],
    steps: rawRecipe.steps || [],
    imageUrl: `data:image/jpeg;base64,${base64Image}`,
    musicMood: "Chill Lo-fi",
  };
};

/**
 * Gets a motivational message or detailed help for a specific step.
 */
export const getCookingHelp = async (stepInstruction: string, context: string): Promise<string> => {
  const model = "gemini-3-flash-preview";
  const response = await ai.models.generateContent({
    model,
    contents: `The user is cooking. Current step: "${stepInstruction}". Context: "${context}". 
    Provide a short, reassuring, and helpful response. If they are worried about overcooking, give specific signs to look for. Keep it under 50 words.`,
  });
  return response.text || "You're doing great! Trust your senses.";
};

/**
 * Finds nearby stores for specific ingredients using Google Maps Grounding.
 */
export const findGroceryStores = async (ingredient: string, latitude: number, longitude: number): Promise<StoreLocation[]> => {
  // Maps grounding is only supported in Gemini 2.5 series models.
  const model = "gemini-2.5-flash"; 
  
  const response = await ai.models.generateContent({
    model,
    contents: `Where can I buy high quality ${ingredient} nearby?`,
    config: {
      tools: [{ googleMaps: {} }],
      toolConfig: {
        retrievalConfig: {
          latLng: {
            latitude,
            longitude,
          },
        },
      },
    },
  });

  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  
  // Extract map data
  const stores: StoreLocation[] = groundingChunks
    .filter((chunk: any) => chunk.maps)
    .map((chunk: any) => ({
      name: chunk.maps.title,
      address: chunk.maps.placeAnswerSources?.[0]?.placeId || "Nearby", // Simplified address handling
      uri: chunk.maps.uri,
    }));

  return stores;
};