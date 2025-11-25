import { GoogleGenAI } from "@google/genai";
import { Habit, HabitLog } from "../types";

export const analyzeProgress = async (apiKey: string, habits: Habit[], logs: HabitLog[]) => {
  if (!apiKey) return "AI Configuration Missing. Please add your Google Gemini API Key in the Habits tab settings.";

  const ai = new GoogleGenAI({ apiKey });
  const today = new Date().toISOString().split('T')[0];
  
  // Prepare data for the model
  const dataSummary = {
    totalHabits: habits.length,
    recentActivity: logs.filter(l => l.date >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
    habitsDef: habits.map(h => ({ name: h.name, objective: h.objective }))
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `
        You are a productivity coach. Analyze this JSON data representing a user's habit tracking.
        Current Date: ${today}
        Data: ${JSON.stringify(dataSummary)}
        
        Provide a concise, motivating summary (max 3 sentences) about their recent performance. 
        Highlight one area they are doing well and one area to improve. 
        Talk directly to the user ("You have...").
      `,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Error connecting to AI. Please check your API Key.";
  }
};