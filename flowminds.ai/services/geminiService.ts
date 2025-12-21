import { GoogleGenAI } from '@google/genai';

const genAI = new GoogleGenAI({ apiKey: 'YOUR_API_KEY_HERE' }); // O usuário deve inserir a chave ou usar uma env

export async function generateText(prompt: string): Promise<string> {
    try {
        const response = await genAI.models.generateContent({
            model: "gemini-1.5-flash",
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });
        return response.text || "No response text found.";
    } catch (err) {
        console.error("Gemini Error:", err);
        return "Error generating AI content. Please check your API key.";
    }
}

export async function enhanceWorkflowIdea(idea: string): Promise<{ title: string, content: string }[]> {
    try {
        const prompt = `Convert this idea into a 3-step actionable workflow plan. 
        Idea: ${idea}
        Respond ONLY with a JSON array of objects with "title" and "content" fields.`;

        const response = await genAI.models.generateContent({
            model: "gemini-1.5-flash",
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        const text = response.text || "";
        const jsonMatch = text.match(/\[.*\]/s);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);

        return [
            { title: "Step 1", content: idea },
            { title: "Step 2", content: "Details of the next step..." },
            { title: "Step 3", content: "Finalizing the goal." }
        ];
    } catch (err) {
        console.error("Gemini Auto-Plan Error:", err);
        return [{ title: "Error", content: "Could not generate plan." }];
    }
}
