export const analyzeReport = async (problem, category, ward, duration, affected) => {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': import.meta.env.VITE_CLAUDE_API_KEY,
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: `You are TRUTH MIRROR AI.
          Analyze this citizen complaint from India.
          
          Problem: "${problem}"
          Category: ${category}
          Location: ${ward}
          Duration: ${duration}
          People affected: ${affected}
          
          Return ONLY this JSON no other text:
          {
            "summary": "one clear sentence summary",
            "severity": "HIGH or MEDIUM or LOW",
            "responsibleDept": "department name",
            "officialToNotify": "type of official",
            "actionRequired": "what action needed",
            "caseId": "TM-XXXX random 4 digits",
            "estimatedResolutionDays": number
          }`
        }]
      })
    });

    if (!response.ok) {
      console.warn(`API returned status ${response.status}`);
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text;
    if (!text) {
      throw new Error("Invalid response format from AI");
    }
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);

  } catch (error) {
    console.error('Claude AI Error:', error);
    // Explicit Fallback to gracefully prevent crashing from invalid API keys / network issues
    return {
      summary: "AI was unable to process the request due to an API error (Key required). The problem has been queued manually.",
      severity: "MEDIUM",
      responsibleDept: "Pending Department Assignment",
      officialToNotify: "N/A",
      actionRequired: "Awaiting Manual Review",
      caseId: `TM-${Math.floor(1000 + Math.random() * 9000)}`,
      estimatedResolutionDays: 7
    };
  }
};
