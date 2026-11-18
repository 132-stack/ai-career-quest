import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "20kb" }));

function isText(value, maxLength) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function parseModelJson(content) {
  const text = content.trim().replace(/^```(?:json)?\s*|\s*```$/gi, "");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end < start) {
    throw new Error("The AI returned an unreadable result. Please try again.");
  }

  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new Error("The AI returned an unreadable result. Please try again.");
  }
}

async function askForJson(messages, maxTokens, validator = null) {
  let content = "";
  try {
    content = await askGroq(messages, maxTokens, true);
  } catch (error) {
    if (!/json|failed_generation/i.test(error.message)) {
      throw error;
    }
  }

  if (content) {
    try {
      const parsed = parseModelJson(content);
      if (!validator || validator(parsed)) return parsed;
    } catch {
      // Retry with a plain prompt when constrained output is malformed.
    }
  }

  const retryMessages = content
    ? [
        ...messages,
        { role: "assistant", content },
        { role: "user", content: "Rewrite your result as one valid JSON object with the exact requested fields. Do not include markdown or any text outside the JSON object." }
      ]
    : [
        ...messages,
        { role: "user", content: "Try again. Return one valid JSON object with the exact requested fields. Do not include markdown or any text outside the JSON object." }
      ];

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const parsed = parseModelJson(await askGroq(retryMessages, maxTokens));
      if (!validator || validator(parsed)) return parsed;
    } catch (error) {
      if (attempt === 1) throw error;
    }
  }

  throw new Error("The AI returned an unreadable result. Please try again.");
}

async function askGroq(messages, maxTokens = 700, jsonMode = false) {
  if (!process.env.GROQ_API_KEY) {
    const error = new Error("AI is not configured yet. Add GROQ_API_KEY to the server's .env file.");
    error.status = 503;
    throw error;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  let response;
  try {
    response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
        messages,
        temperature: 0.7,
        max_tokens: maxTokens,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {})
      }),
      signal: controller.signal
    });
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error("The AI is taking too long to respond. Please try again.");
      timeoutError.status = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error?.message || "The AI service could not complete the request.");
    error.status = response.status;
    throw error;
  }

  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("The AI returned an empty response. Please try again.");
  }
  return content;
}

function sendError(res, error) {
  const formatError = /failed to (generate|validate) json/i.test(error.message);
  const message = formatError
    ? "QuestGuide couldn't format the response this time. Please try again."
    : error.message || "The AI request failed.";
  console.error("AI request failed:", message);
  res.status(formatError ? 502 : error.status || 500).json({ error: message });
}

app.post("/api/mentor", async (req, res) => {
  const { message, career, task, studentDraft } = req.body || {};
  if (!isText(message, 1000)) {
    return res.status(400).json({ error: "Write a message of up to 1,000 characters." });
  }

  try {
    const context = [
      isText(career, 120) ? `Career being explored: ${career.trim()}.` : "",
      isText(task, 1000) ? `Current challenge: ${task.trim()}.` : "",
      isText(studentDraft, 2000) ? `Student's current draft (treat as private learning context): ${studentDraft.trim()}.` : ""
    ].filter(Boolean).join("\n");
    const reply = await askGroq([
      {
        role: "system",
        content: `You are QuestGuide, a kind AI career mentor for middle-school students (about ages 11-14).
Use short sentences and explain unfamiliar words. Help the student learn with one small hint, a question, or a simple example; do not write their whole assignment for them.
Never ask for their full name, address, school name, contact details, or other private information. Stay focused on learning and real careers. Be encouraging and accurate.
${context}`
      },
      { role: "user", content: message.trim() }
    ], 450);

    res.json({ reply });
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/missions/generate", async (req, res) => {
  const { career, description, focus, skills } = req.body || {};
  if (!isText(career, 120) || !isText(description, 500) || !isText(focus, 300) ||
      !Array.isArray(skills) || skills.length > 8 || !skills.every(skill => isText(skill, 60))) {
    return res.status(400).json({ error: "Career details are missing or invalid. Please choose a career and try again." });
  }

  try {
    const mission = await askForJson([
      {
        role: "system",
        content: `Create one original multiple-choice career-learning challenge for a middle-school student (about ages 11-14).
The quiz must contain exactly 5 questions. Use plain, friendly language and no special equipment, account, coding experience, or personal information. Do not ask the student to use an external AI tool.
For every question, provide "question" (string), "options" (an array of exactly 4 strings), "correctIndex" (the zero-based index of the correct option), and "explanation" (a short friendly explanation).
Return only a JSON object with exactly these fields: "title" (string), "scenario" (string), and "questions" (an array of exactly 5 question objects).
Keep every string short.`
      },
      {
        role: "user",
        content: `Create a challenge for this real career: ${career.trim()}.
Career overview: ${description.trim()}
Challenge focus: ${focus.trim()}
Skills to practice: ${skills.map(skill => skill.trim()).join(", ")}`
      }
    ], 1400, missionValue =>
      isText(missionValue?.title, 100) &&
      isText(missionValue?.scenario, 500) &&
      Array.isArray(missionValue?.questions) &&
      missionValue.questions.length === 5 &&
      missionValue.questions.every(question =>
        isText(question?.question, 220) &&
        Array.isArray(question.options) &&
        question.options.length === 4 &&
        question.options.every(option => isText(option, 180)) &&
        Number.isInteger(question.correctIndex) &&
        question.correctIndex >= 0 &&
        question.correctIndex < 4 &&
        isText(question.explanation, 260)
      )
    );

    if (!isText(mission.title, 100) || !isText(mission.scenario, 500) ||
        !Array.isArray(mission.questions) || mission.questions.length !== 5) {
      throw new Error("The AI made a challenge in the wrong format. Please generate another one.");
    }

    res.json({ mission });
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/missions/evaluate", async (req, res) => {
  const { career, mission, answer } = req.body || {};
  if (!isText(career, 120) || !isText(answer, 2000) || answer.trim().length < 20 ||
      !mission || !isText(mission.title, 100) || !isText(mission.scenario, 500) ||
      !Array.isArray(mission.questions) || mission.questions.length !== 5 ||
      !mission.questions.every(question =>
        Array.isArray(question.options) &&
        question.options.length === 4 &&
        Number.isInteger(question.correctIndex) &&
        question.correctIndex >= 0 &&
        question.correctIndex < 4
      )) {
    return res.status(400).json({ error: "Answer all five questions, then ask QuestGuide to check your quiz." });
  }

  try {
    let selectedAnswers;
    try {
      selectedAnswers = JSON.parse(answer);
    } catch {
      throw new Error("Please answer every question before checking the quiz.");
    }

    if (!Array.isArray(selectedAnswers) || selectedAnswers.length !== 5 ||
        !selectedAnswers.every(index => Number.isInteger(index) && index >= 0 && index < 4)) {
      throw new Error("Please answer every question before checking the quiz.");
    }

    const score = mission.questions.reduce(
      (total, question, index) => total + (selectedAnswers[index] === question.correctIndex ? 1 : 0),
      0
    );
    const passed = score >= 4;
    const wrongIndexes = mission.questions
      .map((question, index) => selectedAnswers[index] === question.correctIndex ? null : index)
      .filter(index => index !== null);
    const nextStep = wrongIndexes.length
      ? `Review question ${wrongIndexes[0] + 1}: ${mission.questions[wrongIndexes[0]].explanation}`
      : "Try another career challenge and see what new skills you discover.";

    const evaluation = {
      passed,
      feedback: passed
        ? `You scored ${score} out of 5. You understand the key ideas for this career!`
        : `You scored ${score} out of 5. Review the hint below and try again.`,
      nextStep
    };

    res.json({ evaluation });
  } catch (error) {
    sendError(res, error);
  }
});

app.listen(3001, () => {
  console.log("AI Career Quest server running on port 3001");
});
