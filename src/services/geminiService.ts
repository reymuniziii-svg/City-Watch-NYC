import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function expandSearchQuery(query: string): Promise<string[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `The user is searching a database of NYC City Council bills for: "${query}". Generate a list of 10-15 specific keywords, synonyms, legal terms, or related concepts that would likely appear in the title or summary of relevant bills. Return ONLY a JSON array of strings.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error('Error expanding search query:', error);
    return [];
  }
}

export async function chatWithAssistant(history: { role: 'user' | 'model', parts: { text: string }[] }[], message: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...history,
        { role: 'user', parts: [{ text: message }] }
      ],
      config: {
        systemInstruction: "You are a helpful, non-partisan assistant for 'Council Watch', an app tracking the NYC City Council. Answer questions about NYC local government, how bills become laws, and general civic questions. Keep answers concise and easy to understand for everyday New Yorkers.",
      }
    });
    return response.text;
  } catch (error) {
    console.error('Error in chat:', error);
    return "I'm sorry, I'm having trouble connecting to the council database right now. Please try again later.";
  }
}

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

export async function summarizeHearing(hearingTitle: string, committeeOrBills: string, hearingDate?: string) {
  try {
    const dateContext = hearingDate ? `\nScheduled Date: ${hearingDate}` : '';
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        You are a civic engagement expert for New York City.
        Explain the following UPCOMING NYC City Council hearing in plain, accessible English.
        This hearing has NOT happened yet — use future tense throughout.
        
        Committee / Hearing Title: ${hearingTitle}
        Bills or Agenda Items: ${committeeOrBills}${dateContext}
        
        Provide the response in the following JSON format:
        {
          "whatIsAbout": "A clear, plain-English explanation of what this hearing is about and why it is being held.",
          "takeaways": ["Key things to know or watch for at this hearing — 2 to 3 points."],
          "billsConsidered": ["List of bills or topics that will be discussed, if known. Leave empty array if none."],
          "whatToExpect": "What typically happens at this type of hearing (testimony, oversight, vote, etc.)."
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
