// ── Government Report Generator ───────────────────────────────────────────────
// wardData: Array<{ ward, total, categories: {cat: count}, avgSeverity }>

const SEVERITY_LABEL = (avg) =>
  avg >= 7.5 ? 'CRITICAL' : avg >= 5 ? 'HIGH' : avg >= 3 ? 'MODERATE' : 'LOW';

const DEADLINE = (avg) =>
  avg >= 7.5 ? '24 hours' : avg >= 5 ? '3 days' : avg >= 3 ? '7 days' : '14 days';

const topCategory = (categories) =>
  Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0] || 'general';

// Template-based fallback used when Gemini is unavailable
const buildFallbackReport = (reportId, wardData, dateStr, city, total) => {
  const wardAnalysis = wardData.map((w) => {
    const cat = topCategory(w.categories);
    const sev = SEVERITY_LABEL(w.avgSeverity);
    return {
      ward: w.ward,
      unresolvedCount: w.total,
      severityLevel: sev,
      topIssue: cat,
      recommendedAction: `Immediate inspection and rectification of ${cat} infrastructure in ${w.ward}`,
      deadline: DEADLINE(w.avgSeverity),
      responsibleDept: `Municipal ${cat.charAt(0).toUpperCase() + cat.slice(1)} Department`,
    };
  });

  const criticalWards = wardAnalysis.filter((w) => w.severityLevel === 'CRITICAL');
  const highWards = wardAnalysis.filter((w) => w.severityLevel === 'HIGH');

  return {
    reportId,
    wardAnalysis,
    english: {
      title: `Official Civic Accountability Report — ${city}, ${dateStr}`,
      executiveSummary: `This report documents ${total} unresolved civic complaints across ${wardData.length} ward${wardData.length !== 1 ? 's' : ''} in ${city} as of ${dateStr}. ${criticalWards.length > 0 ? `${criticalWards.length} ward${criticalWards.length !== 1 ? 's' : ''} (${criticalWards.map((w) => w.ward).join(', ')}) have reached CRITICAL severity and require immediate escalation.` : 'No wards have reached critical severity at this time.'} All ward officials are hereby directed to treat this document as an official directive requiring immediate compliance.`,
      severityAnalysis: `Severity assessment across ${wardData.length} wards indicates ${criticalWards.length} CRITICAL, ${highWards.length} HIGH, ${wardAnalysis.filter((w) => w.severityLevel === 'MODERATE').length} MODERATE, and ${wardAnalysis.filter((w) => w.severityLevel === 'LOW').length} LOW severity zones. The concentration of unresolved complaints in specific wards suggests systemic gaps in municipal service delivery and inadequate first-response protocols. Immediate escalation is required for all CRITICAL and HIGH severity wards to prevent further civic deterioration.`,
      systemicIssues: `Analysis of complaint patterns reveals recurring deficiencies in inter-departmental coordination, inadequate on-ground monitoring, and absence of time-bound resolution frameworks. The backlog of unresolved complaints indicates that current grievance redressal mechanisms are insufficient. Resource misallocation at the ward level and the lack of automated escalation protocols are identified as primary root causes contributing to the current situation.`,
      recommendations: [
        `Convene emergency ward-level review meetings within 48 hours for all CRITICAL and HIGH severity wards`,
        `Deploy dedicated rapid-response inspection teams to ${criticalWards.length > 0 ? criticalWards.map((w) => w.ward).join(', ') : 'high-priority wards'} within 24 hours`,
        `Implement mandatory 72-hour resolution SLA for all new complaints with automated escalation to senior officers`,
        `Establish daily complaint resolution tracking dashboards accessible to all ward officers and department heads`,
        `Submit weekly resolution progress reports to the District Collector's office until backlog is cleared`,
      ],
      conclusion: `Failure to address these complaints within the stipulated timelines shall constitute a breach of civic duty and may result in formal accountability proceedings under the relevant Municipal Act. All ward officials and department heads are hereby directed to treat this report as an official directive requiring immediate and documented compliance.`,
    },
    hindi: {
      title: `आधिकारिक नागरिक जवाबदेही रिपोर्ट — ${city}, ${dateStr}`,
      executiveSummary: `यह रिपोर्ट ${dateStr} को ${city} के ${wardData.length} वार्डों में ${total} अनसुलझी नागरिक शिकायतों का दस्तावेज़ीकरण करती है। ${criticalWards.length > 0 ? `${criticalWards.length} वार्ड (${criticalWards.map((w) => w.ward).join(', ')}) गंभीर स्थिति में हैं और तत्काल हस्तक्षेप की आवश्यकता है।` : 'वर्तमान में कोई भी वार्ड अत्यंत गंभीर स्थिति में नहीं है।'} सभी वार्ड अधिकारियों को इस दस्तावेज़ को तत्काल अनुपालन की आवश्यकता वाले आधिकारिक निर्देश के रूप में मानने का आदेश दिया जाता है।`,
      severityAnalysis: `${wardData.length} वार्डों में गंभीरता के आकलन से पता चलता है कि ${criticalWards.length} अत्यंत गंभीर, ${highWards.length} उच्च, ${wardAnalysis.filter((w) => w.severityLevel === 'MODERATE').length} मध्यम और ${wardAnalysis.filter((w) => w.severityLevel === 'LOW').length} निम्न गंभीरता वाले क्षेत्र हैं। विशिष्ट वार्डों में अनसुलझी शिकायतों की सघनता नगरपालिका सेवा वितरण में प्रणालीगत कमियों को दर्शाती है।`,
      recommendations: [
        `48 घंटों के भीतर सभी अत्यंत गंभीर और उच्च गंभीरता वाले वार्डों में आपातकालीन समीक्षा बैठकें आयोजित करें`,
        `24 घंटों के भीतर प्राथमिकता वाले वार्डों में समर्पित त्वरित-प्रतिक्रिया निरीक्षण दल तैनात करें`,
        `सभी नई शिकायतों के लिए अनिवार्य 72 घंटे समाधान SLA और वरिष्ठ अधिकारियों को स्वचालित एस्केलेशन लागू करें`,
        `सभी वार्ड अधिकारियों के लिए दैनिक शिकायत समाधान ट्रैकिंग डैशबोर्ड स्थापित करें`,
      ],
      conclusion: `निर्धारित समय-सीमा के भीतर इन शिकायतों का समाधान न करने पर संबंधित नगरपालिका अधिनियम के तहत औपचारिक जवाबदेही कार्यवाही की जा सकती है। सभी वार्ड अधिकारियों और विभाग प्रमुखों को इस रिपोर्ट पर तत्काल और दस्तावेज़ीकृत अनुपालन सुनिश्चित करने का निर्देश दिया जाता है।`,
    },
  };
};

export const generateGovernmentReport = async (wardData, city = 'Hyderabad') => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const reportId = `RPT-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
  const total = wardData.reduce((s, w) => s + w.total, 0);

  const wardLines = wardData
    .sort((a, b) => b.total - a.total)
    .map((w) => {
      const cats = Object.entries(w.categories)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${k}:${v}`)
        .join(', ');
      return `- ${w.ward}: ${w.total} unresolved (${cats}), avg severity ${w.avgSeverity.toFixed(1)}/10`;
    })
    .join('\n');

  const schema = JSON.stringify({
    reportId,
    wardAnalysis: [{
      ward: 'string — exact ward name',
      unresolvedCount: 'number',
      severityLevel: 'CRITICAL | HIGH | MODERATE | LOW',
      topIssue: 'string',
      recommendedAction: 'string',
      deadline: 'string e.g. 24 hours / 3 days / 7 days',
      responsibleDept: 'string',
    }],
    english: {
      title: 'string',
      executiveSummary: '3-sentence formal summary',
      severityAnalysis: '3-sentence severity assessment',
      systemicIssues: '1-paragraph root-cause analysis',
      recommendations: ['5 specific actionable items with timelines'],
      conclusion: '2 formal sentences with urgency and consequence language',
    },
    hindi: {
      title: 'string in Hindi',
      executiveSummary: '3-sentence Hindi summary',
      severityAnalysis: '2-sentence Hindi severity analysis',
      recommendations: ['4 Hindi recommendations'],
      conclusion: '2 Hindi closing sentences',
    },
  }, null, 2);

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a senior government official drafting a formal civic accountability report for TRUTH MIRROR, India's municipal complaint platform.

Report ID: ${reportId}
Date: ${dateStr}
City: ${city}
Total Unresolved Complaints: ${total}

WARD DATA:
${wardLines}

Write a formal bilingual government report. Return ONLY valid JSON matching this exact schema — no markdown fences, no extra keys, no trailing commas:

${schema}

Important: Hindi text must use proper Devanagari script. All string values must be properly JSON-escaped.`,
            }],
          }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 2500 },
        }),
      }
    );

    if (!resp.ok) throw new Error(`Gemini ${resp.status}`);

    const data = await resp.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    const parsed = JSON.parse(clean);

    // Ensure reportId is consistent even if Gemini modified it
    parsed.reportId = reportId;
    return parsed;
  } catch (err) {
    console.error('Gemini report generation failed, using fallback:', err);
    return buildFallbackReport(reportId, wardData, dateStr, city, total);
  }
};

// ── Complaint Classifier ──────────────────────────────────────────────────────
export const classifyComplaint = async (transcript) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are an AI assistant for TRUTH MIRROR, a civic complaint platform in India.
Analyze this voice complaint transcript. It may be in Hindi, Telugu, Tamil, Kannada, Bengali, or English.

Transcript: "${transcript}"

Extract all details and classify the complaint. Return ONLY this JSON, no other text:
{
  "category": "one of: water, roads, electricity, health, sanitation",
  "severity": <integer 1-10, where 10 is most severe>,
  "responsibleDept": "relevant government department name in English",
  "location": "ward/area/location extracted from speech, or 'Unknown' if not mentioned",
  "summary": "one clear sentence summary in English",
  "caseId": "TM-VOICE-XXXX with random 4 digits",
  "actionRequired": "specific action needed by the department"
}`
            }]
          }],
          generationConfig: { temperature: 0.1 }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API error body:', errText);
      throw new Error(`Gemini API Error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty response from Gemini');

    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);

  } catch (error) {
    console.error('Gemini classification error:', error);
    // Graceful fallback so the UI never crashes
    return {
      category: 'sanitation',
      severity: 5,
      responsibleDept: 'Pending Department Assignment',
      location: 'Unknown',
      summary: 'Voice complaint received. Gemini API key required for auto-classification. Manual review pending.',
      caseId: `TM-VOICE-${Math.floor(1000 + Math.random() * 9000)}`,
      actionRequired: 'Awaiting Manual Review'
    };
  }
};
