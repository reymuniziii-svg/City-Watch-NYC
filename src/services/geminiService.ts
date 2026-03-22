import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function summarizeBill(billTitle: string, billSummary: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        You are a civic engagement expert for New York City. 
        Translate the following NYC City Council bill into plain, accessible English for everyday New Yorkers.
        
        Bill Title: ${billTitle}
        Official Summary: ${billSummary}
        
        Provide the response in the following JSON format:
        {
          "whatItDoes": "A clear, concise summary of the bill's practical implications.",
          "whoItAffects": "Identification of the specific groups, communities, or services the bill targets.",
          "whyItMatters": "An explanation of the bill's significance and potential impact on residents' lives.",
          "whatHappensNext": "An overview of the legislative process, indicating the bill's current status and next steps."
        }
      `,
      config: {
        responseMimeType: "application/json"
      }
    });

    let jsonStr = response.text || '{}';
    jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Error summarizing bill:', error);
    return null;
  }
}

export async function summarizeHearing(hearingTitle: string, hearingDescription: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        You are a civic engagement expert for New York City. 
        Explain the following NYC City Council hearing in plain, accessible English.
        
        Hearing Title: ${hearingTitle}
        Description: ${hearingDescription}
        
        Provide the response in the following JSON format:
        {
          "whatHappened": "A concise summary of the hearing's main discussion points.",
          "takeaways": ["The most important conclusions or developments from the hearing."],
          "actionType": "Clarification on the hearing's nature (e.g., Legislative Action, Oversight, Testimony).",
          "keyQuotes": ["Notable statements or exchanges from participants."]
        }
      `,
      config: {
        responseMimeType: "application/json"
      }
    });

    let jsonStr = response.text || '{}';
    jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Error summarizing hearing:', error);
    return null;
  }
}
