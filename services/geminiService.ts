
import { GoogleGenAI } from "@google/genai";
import { Habit, HabitLog } from "../types";

// The API key must be obtained exclusively from the environment variable process.env.API_KEY.
export const analyzeProgress = async (habits: Habit[], logs: HabitLog[]) => {
  // Use process.env.API_KEY directly when initializing the @google/genai client instance.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  const today = new Date().toISOString().split('T')[0];
  
  // Prepare data for the model
  const dataSummary = {
    totalHabits: habits.length,
    recentActivity: logs.filter(l => l.date >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
    habitsDef: habits.map(h => ({ name: h.name, objective: h.objective }))
  };

  try {
    const response = await ai.models.generateContent({
      // Use 'gemini-3-flash-preview' for basic text tasks like summarization.
      model: 'gemini-3-flash-preview',
      contents: `
        You are a productivity coach. Analyze this JSON data representing a user's habit tracking.
        Current Date: ${today}
        Data: ${JSON.stringify(dataSummary)}
        
        Provide a concise, motivating summary (max 3 sentences) about their recent performance. 
        Highlight one area they are doing well and one area to improve. 
        Talk directly to the user ("You have...").
      `,
    });
    // The response.text property (not a method) returns the generated text content.
    return response.text;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Error connecting to AI. Please try again later.";
  }
};
