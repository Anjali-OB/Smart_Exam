// ── API Config — using Groq (free, fast, no limits) ──────────
// Get free key at: https://console.groq.com
const API_KEY = import.meta.env.VITE_GROQ_API_KEY || ''
const BASE    = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL   = 'llama-3.1-8b-instant'

// ── Plain text response (feedback, reports, hints — no JSON needed) ──
async function ask(prompt) {
  if (!API_KEY) throw new Error('API key not set. Add VITE_GROQ_API_KEY to your .env file.')
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
      max_tokens:  4096,
    }),
  })
  if (!res.ok) throw new Error(`API error: ${res.status} — ${res.statusText}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

// ── JSON response — uses Groq's JSON mode so the model is FORCED to
//    return valid JSON syntax, instead of just hoping it follows the
//    prompt instructions (which smaller models sometimes ignore). ──
async function askJSON(prompt) {
  if (!API_KEY) throw new Error('API key not set. Add VITE_GROQ_API_KEY to your .env file.')
  const res = await fetch(BASE, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model:           MODEL,
      messages:        [{ role: 'user', content: prompt }],
      temperature:     0.3,
      max_tokens:      4096,
      response_format: { type: 'json_object' },
    }),
  })
  if (!res.ok) throw new Error(`API error: ${res.status} — ${res.statusText}`)
  const data = await res.json()
  const raw  = data.choices?.[0]?.message?.content || ''
  return parseJSON(raw)
}

// ── Defensive JSON parser — kept as a safety net in case the model
//    still wraps the JSON in stray text despite JSON mode ──────
function parseJSON(raw) {
  let cleaned = raw.replace(/```json|```/g, '').trim()

  const firstBrace   = cleaned.indexOf('{')
  const firstBracket = cleaned.indexOf('[')
  const starts = [firstBrace, firstBracket].filter(i => i !== -1)
  if (starts.length === 0) {
    throw new Error(`AI response had no JSON. Raw reply: "${cleaned.slice(0, 200)}"`)
  }
  const start     = Math.min(...starts)
  const openChar  = cleaned[start]
  const closeChar = openChar === '{' ? '}' : ']'
  const end = cleaned.lastIndexOf(closeChar)

  if (end === -1 || end < start) {
    throw new Error(`AI response had incomplete JSON. Tail: "${cleaned.slice(-200)}"`)
  }

  cleaned = cleaned.slice(start, end + 1)

  try {
    return JSON.parse(cleaned)
  } catch (e) {
    throw new Error(`Could not parse AI response as JSON. Tail: "${cleaned.slice(-200)}"`)
  }
}

// ── Generate questions with type counts ──────────────────────
export async function generateQuestions({ topic, subject, difficulty = 'medium', typeCounts = {} }) {
  const parts = []
  if ((typeCounts.mcq       || 0) > 0) parts.push(`${typeCounts.mcq} multiple-choice questions (exactly 4 options, one correct)`)
  if ((typeCounts.truefalse || 0) > 0) parts.push(`${typeCounts.truefalse} true/false questions`)
  if ((typeCounts.short     || 0) > 0) parts.push(`${typeCounts.short} short answer questions (one sentence answer)`)
  if ((typeCounts.long      || 0) > 0) parts.push(`${typeCounts.long} long answer questions (paragraph answer)`)

  if (!parts.length) parts.push('5 multiple-choice questions (exactly 4 options, one correct)')

  const prompt = `You are an expert educator. Generate the following questions about "${topic}" for subject "${subject}". Difficulty: ${difficulty}.

Generate: ${parts.join(', ')}.

Respond with a JSON object of the exact shape:
{
  "questions": [
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
}

STRICT RULES:
- MCQ: exactly 4 options, exactly one is_correct=true
- True/False: exactly 2 options (True and False)
- Short/Long: options must be empty array []
- Respond with ONLY the JSON object shown above, nothing else`

  const result = await askJSON(prompt)
  return result.questions || []
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
Respond with a JSON object: {"results": [{"index":0,"difficulty":"easy","reason":"brief reason"}]}`
  const result = await askJSON(prompt)
  return result.results || []
}

// ── Weak topic detector ───────────────────────────────────────
export async function detectWeakTopics({ testTitle, subject, wrongQuestions }) {
  const prompt = `Analyse these incorrectly answered exam questions to detect weak topics.
Test: ${testTitle}, Subject: ${subject}
Wrong questions:
${wrongQuestions.map((q, i) => `${i+1}. ${q}`).join('\n')}
Respond with a JSON object: {"weak_topics":["topic1","topic2"],"recommendation":"2-3 sentence study advice"}`
  return await askJSON(prompt)
}

// ── Student performance prediction ───────────────────────────
export async function predictPerformance(studentHistory) {
  const prompt = `Based on this student's past test scores, predict their performance trend.
History: ${studentHistory.map(h => `${h.title}: ${h.pct}%`).join(', ')}
Respond with a JSON object: {"trend":"improving","prediction":"brief prediction","risk_level":"low","suggestion":"1 sentence advice"}`
  return await askJSON(prompt)
}

// ── Answer similarity checker ─────────────────────────────────
export async function checkAnswerSimilarity({ question, modelAnswer, studentAnswer }) {
  const prompt = `Grade this student's answer for accuracy.
Question: ${question}
Model Answer: ${modelAnswer}
Student Answer: ${studentAnswer}
Respond with a JSON object: {"score":0-100,"grade":"correct","feedback":"1 sentence"}`
  return await askJSON(prompt)
}

// ── Plagiarism detector ────────────────────────────────────────
export async function detectPlagiarism(answers) {
  const prompt = `Compare these student answers for plagiarism.
Answers: ${JSON.stringify(answers.map(a => ({ student: a.name, answer: a.text })))}
Respond with a JSON object: {"pairs":[{"student1":"name","student2":"name","similarity":0-100,"flag":true}],"summary":"1 sentence"}`
  return await askJSON(prompt)
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
Respond with a JSON object: {"score":1-10,"issues":[],"suggestion":""}`
  return await askJSON(prompt)
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

Respond with a JSON object of the exact shape:
{
  "questions": [
    {"type":"mcq","question_text":"Question?","explanation":"brief","marks":1,
     "options":[{"option_text":"A","is_correct":false},{"option_text":"B","is_correct":true},{"option_text":"C","is_correct":false},{"option_text":"D","is_correct":false}]},
    {"type":"truefalse","question_text":"Statement.","explanation":"brief","marks":1,
     "options":[{"option_text":"True","is_correct":true},{"option_text":"False","is_correct":false}]},
    {"type":"short","question_text":"Short question?","explanation":"model answer","marks":2,"options":[]}
  ]
}
STRICT RULES: MCQ=exactly 4 options, T/F=exactly 2 options, short/long=empty options array. Respond with ONLY the JSON object shown above.`
  const result = await askJSON(prompt)
  return result.questions || []
}