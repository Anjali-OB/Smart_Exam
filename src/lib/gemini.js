// ── API Config — using Groq (free, fast, no limits) ──────────
// Get free key at: https://console.groq.com
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const BASE    = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL   = 'llama-3.1-8b-instant'

async function ask(prompt) {
  if (!API_KEY) throw new Error('API key not set. Add VITE_GEMINI_API_KEY to your .env file.')
  const res = await fetch(BASE, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model:       MODEL,
      messages:    [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens:  8192,
    }),
  })
  if (!res.ok) throw new Error(`API error: ${res.status} — ${res.statusText}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

// ── Generate questions with type counts ──────────────────────
export async function generateQuestions({ topic, subject, difficulty = 'medium', typeCounts = {} }) {
  const parts = []
  if ((typeCounts.mcq       || 0) > 0) parts.push(`${typeCounts.mcq} multiple-choice questions (exactly 4 options, one correct)`)
  if ((typeCounts.truefalse || 0) > 0) parts.push(`${typeCounts.truefalse} true/false questions`)
  if ((typeCounts.short     || 0) > 0) parts.push(`${typeCounts.short} short answer questions (one sentence answer)`)
  if ((typeCounts.long      || 0) > 0) parts.push(`${typeCounts.long} long answer questions (paragraph answer)`)

  // Fallback: if no typeCounts provided, generate 5 MCQ
  if (!parts.length) parts.push('5 multiple-choice questions (exactly 4 options, one correct)')

  const prompt = `You are an expert educator. Generate the following questions about "${topic}" for subject "${subject}". Difficulty: ${difficulty}.

Generate: ${parts.join(', ')}.

Return ONLY a valid JSON array, no markdown, no explanation:
[
  {
    "type": "mcq",
    "question_text": "Question here?",
    "explanation": "Brief explanation of correct answer",
    "marks": 1,
    "options": [
      {"option_text": "Option A", "is_correct": false},
      {"option_text": "Option B", "is_correct": true},
      {"option_text": "Option C", "is_correct": false},
      {"option_text": "Option D", "is_correct": false}
    ]
  },
  {
    "type": "truefalse",
    "question_text": "Statement to evaluate.",
    "explanation": "Explanation",
    "marks": 1,
    "options": [
      {"option_text": "True",  "is_correct": true},
      {"option_text": "False", "is_correct": false}
    ]
  },
  {
    "type": "short",
    "question_text": "Short question?",
    "explanation": "Model answer",
    "marks": 2,
    "options": []
  },
  {
    "type": "long",
    "question_text": "Detailed question?",
    "explanation": "Key points",
    "marks": 5,
    "options": []
  }
]

STRICT RULES:
- MCQ: exactly 4 options, exactly one is_correct=true
- True/False: exactly 2 options (True and False)
- Short/Long: options must be empty array []
- Return ONLY the JSON array, absolutely nothing else`

  const raw = await ask(prompt)
  return JSON.parse(raw.replace(/```json|```/g, '').trim())
}

// ── Student personalised feedback ────────────────────────────
export async function generateStudentFeedback({ studentName, testTitle, score, total, wrongTopics }) {
  const pct    = Math.round(score / total * 100)
  const prompt = `You are a supportive teacher giving personalised feedback.
Student: ${studentName}, Test: ${testTitle}, Score: ${score}/${total} (${pct}%)
Topics with mistakes: ${wrongTopics.join(', ') || 'none'}
Write 3-4 sentences: acknowledge performance honestly, point out specific areas to improve, give one concrete study tip, end with encouragement. Plain text only.`
  return await ask(prompt)
}

// ── Class performance analysis ───────────────────────────────
export async function analyseClassPerformance({ testTitle, avgScore, totalMarks, questionStats }) {
  const prompt = `You are an experienced teacher analysing class performance.
Test: ${testTitle}, Class Average: ${avgScore}/${totalMarks} (${Math.round(avgScore/totalMarks*100)}%)
Question data:
${questionStats.map(q => `Q${q.num}: "${q.text}" — ${q.correct}/${q.total} correct (${q.pct}%)`).join('\n')}
Write 4-5 sentences: overall assessment, topics students struggled with, topics done well, recommendation for next class. Plain text only, no bullet points.`
  return await ask(prompt)
}

// ── Difficulty analyser ───────────────────────────────────────
export async function analyseDifficulty(questions) {
  const prompt = `Rate the difficulty of each exam question as easy/medium/hard.
Questions:
${questions.map((q, i) => `${i+1}. ${q.question_text}`).join('\n')}
Return ONLY JSON array: [{"index":0,"difficulty":"easy","reason":"brief reason"}] — no markdown.`
  const raw = await ask(prompt)
  return JSON.parse(raw.replace(/```json|```/g, '').trim())
}

// ── Weak topic detector ───────────────────────────────────────
export async function detectWeakTopics({ testTitle, subject, wrongQuestions }) {
  const prompt = `Analyse these incorrectly answered exam questions to detect weak topics.
Test: ${testTitle}, Subject: ${subject}
Wrong questions:
${wrongQuestions.map((q, i) => `${i+1}. ${q}`).join('\n')}
Return ONLY JSON: {"weak_topics":["topic1","topic2"],"recommendation":"2-3 sentence study advice"} — no markdown.`
  const raw = await ask(prompt)
  return JSON.parse(raw.replace(/```json|```/g, '').trim())
}

// ── Student performance prediction ───────────────────────────
export async function predictPerformance(studentHistory) {
  const prompt = `Based on this student's past test scores, predict their performance trend.
History: ${studentHistory.map(h => `${h.title}: ${h.pct}%`).join(', ')}
Return ONLY JSON: {"trend":"improving","prediction":"brief prediction","risk_level":"low","suggestion":"1 sentence advice"} — no markdown.`
  const raw = await ask(prompt)
  return JSON.parse(raw.replace(/```json|```/g, '').trim())
}

// ── Answer similarity checker ─────────────────────────────────
export async function checkAnswerSimilarity({ question, modelAnswer, studentAnswer }) {
  const prompt = `Grade this student's answer for accuracy.
Question: ${question}
Model Answer: ${modelAnswer}
Student Answer: ${studentAnswer}
Return ONLY JSON: {"score":0-100,"grade":"correct","feedback":"1 sentence"} — no markdown.`
  const raw = await ask(prompt)
  return JSON.parse(raw.replace(/```json|```/g, '').trim())
}

// ── Plagiarism detector ────────────────────────────────────────
export async function detectPlagiarism(answers) {
  const prompt = `Compare these student answers for plagiarism.
Answers: ${JSON.stringify(answers.map(a => ({ student: a.name, answer: a.text })))}
Return ONLY JSON: {"pairs":[{"student1":"name","student2":"name","similarity":0-100,"flag":true}],"summary":"1 sentence"} — no markdown.`
  const raw = await ask(prompt)
  return JSON.parse(raw.replace(/```json|```/g, '').trim())
}

// ── Smart hint ────────────────────────────────────────────────
export async function getSmartHint({ question, options }) {
  const prompt = `Give a helpful hint for this exam question WITHOUT revealing the answer.
Question: ${question}
Options: ${options?.join(', ') || ''}
Write ONE short hint sentence (max 20 words). Plain text only.`
  return await ask(prompt)
}

// ── Question quality check ────────────────────────────────────
export async function checkQuestionQuality(questionText, options) {
  const prompt = `Review this exam question for clarity and quality:
Question: "${questionText}"
Options: ${options.map((o, i) => `${String.fromCharCode(65+i)}) ${o}`).join(', ')}
Return ONLY JSON: {"score":1-10,"issues":[],"suggestion":""} — no markdown.`
  const raw = await ask(prompt)
  return JSON.parse(raw.replace(/```json|```/g, '').trim())
}

// ── Auto report generator ─────────────────────────────────────
export async function generateClassReport({ testTitle, subject, stats, topStudents, atRisk }) {
  const prompt = `Generate a formal class performance report.
Test: ${testTitle}, Subject: ${subject}
Stats: ${JSON.stringify(stats)}
Top performers: ${topStudents.join(', ')}
At-risk students (below 40%): ${atRisk.join(', ') || 'none'}
Write a professional 5-6 sentence report. Plain text only.`
  return await ask(prompt)
}

// ── Extract questions from uploaded document ──────────────────
export async function extractQuestionsFromDocument(text) {
  const prompt = `You are an expert educator. Analyze this document and extract ALL questions from it. If no explicit questions exist, generate relevant exam questions from the content.

Document content:
${text.slice(0, 6000)}

Return ONLY a valid JSON array, no markdown, no explanation:
[
  {"type":"mcq","question_text":"Question?","explanation":"brief","marks":1,
   "options":[{"option_text":"A","is_correct":false},{"option_text":"B","is_correct":true},{"option_text":"C","is_correct":false},{"option_text":"D","is_correct":false}]},
  {"type":"truefalse","question_text":"Statement.","explanation":"brief","marks":1,
   "options":[{"option_text":"True","is_correct":true},{"option_text":"False","is_correct":false}]},
  {"type":"short","question_text":"Short question?","explanation":"model answer","marks":2,"options":[]}
]
STRICT RULES: MCQ=exactly 4 options, T/F=exactly 2 options, short/long=empty options array. Return ONLY the JSON array.`
  const raw = await ask(prompt)
  return JSON.parse(raw.replace(/```json|```/g, '').trim())
}