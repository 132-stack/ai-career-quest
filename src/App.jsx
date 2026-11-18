import { useState } from "react";
import {
  Bot, Cpu, Palette, FlaskConical, ShieldCheck, BriefcaseBusiness,
  BrainCircuit, Star, Trophy, Send, Sparkles
} from "lucide-react";
import { careers } from "./data/careers";

const careerIcons = {
  Palette,
  Cpu,
  FlaskConical,
  ShieldCheck,
  BriefcaseBusiness,
  BrainCircuit
};

const starterMessage = {
  role: "assistant",
  content: "Hi, explorer! I'm QuestGuide. Pick a career and generate a challenge, or ask me for a hint. We'll figure it out together!"
};

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const rawText = await response.text();
  let data;

  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    throw new Error("The server returned an unreadable response. Please try again.");
  }

  if (!response.ok) {
    throw new Error(data.error || "The request could not be completed.");
  }

  return data;
}

export default function App() {
  const [selected, setSelected] = useState(careers[0]);
  const [completed, setCompleted] = useState([]);
  const [xp, setXp] = useState(0);
  const [mission, setMission] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [answerStatus, setAnswerStatus] = useState(null);
  const [missionLoading, setMissionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [messages, setMessages] = useState([starterMessage]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState("");

  const rank =
    xp >= 500 ? "AI Pioneer" :
    xp >= 250 ? "Prompt Pro" :
    xp >= 100 ? "Tech Explorer" :
    "Rookie Inventor";
  const Icon = careerIcons[selected.icon];
  const missionComplete = completed.includes(selected.id);

  function chooseCareer(career) {
    setSelected(career);
    setMission(null);
    setQuizAnswers([]);
    setQuizIndex(0);
    setAnswerStatus(null);
    setFeedback(null);
    setError("");
  }

  async function generateMission() {
    setMissionLoading(true);
    setMission(null);
    setQuizAnswers([]);
    setQuizIndex(0);
    setAnswerStatus(null);
    setFeedback(null);
    setError("");

    try {
      const data = await postJson("/api/missions/generate", {
        career: selected.role,
        description: selected.description,
        focus: selected.missionFocus,
        skills: selected.skills
      });
      setMission(data.mission);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setMissionLoading(false);
    }
  }

  function chooseQuizAnswer(optionIndex) {
    if (!mission?.questions || answerStatus || missionComplete) return;

    const question = mission.questions[quizIndex];
    const isCorrect = optionIndex === question.correctIndex;

    setQuizAnswers(previous => {
      const next = [...previous];
      next[quizIndex] = optionIndex;
      return next;
    });
    setAnswerStatus(isCorrect ? "correct" : "incorrect");

    window.setTimeout(() => {
      setAnswerStatus(null);
      if (quizIndex < mission.questions.length - 1) {
        setQuizIndex(previous => previous + 1);
        return;
      }

      const finalAnswers = [...quizAnswers];
      finalAnswers[quizIndex] = optionIndex;
      evaluateQuiz(finalAnswers);
    }, 900);
  }

  async function evaluateQuiz(finalAnswers) {
    if (missionLoading || missionComplete) return;

    setMissionLoading(true);
    setFeedback(null);
    setError("");

    try {
      const data = await postJson("/api/missions/evaluate", {
        career: selected.role,
        mission,
        answer: JSON.stringify(finalAnswers)
      });
      setFeedback(data.evaluation);
      if (data.evaluation.passed) {
        setCompleted(previous => previous.includes(selected.id) ? previous : [...previous, selected.id]);
        setXp(previous => previous + 100);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setMissionLoading(false);
    }
  }

  async function askAI(event) {
    event.preventDefault();
    const question = input.trim();
    if (!question || chatLoading) return;

    setMessages(previous => [...previous, { role: "user", content: question }]);
    setInput("");
    setChatLoading(true);

    try {
      const data = await postJson("/api/mentor", {
        message: question,
        career: selected.role,
        task: mission ? `${mission.title}: ${mission.scenario}` : "",
        studentDraft: mission?.questions
          ? quizAnswers.map((answer, index) => `${index + 1}: ${answer === undefined ? "not answered" : mission.questions[index].options[answer]}`).join("; ")
          : ""
      });
      setMessages(previous => [
        ...previous,
        { role: "assistant", content: data.reply }
      ]);
    } catch (requestError) {
      setMessages(previous => [
        ...previous,
        { role: "assistant", content: `I couldn't connect just now: ${requestError.message}` }
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <div className="app">
      <header>
        <a className="logo" href="#top">
          <Sparkles aria-hidden="true" />
          AI CAREER QUEST
        </a>
        <nav aria-label="Main navigation">
          <a href="#map">Career map</a>
          <a href="#careers">Explore jobs</a>
          <a href="#mentor">AI mentor</a>
        </nav>
        <div className="player" aria-live="polite">🚀 {rank} | {xp} XP</div>
      </header>

      <main id="top">
        <section className="hero">
          <div>
            <p className="tag">YOUR FUTURE STARTS WITH CURIOSITY</p>
            <h1>Find your path in <span>AI careers.</span></h1>
            <p>
              Explore real jobs, see how people get started, and try an AI-made
              challenge. No experience needed—just curiosity.
            </p>
            <a className="main-button" href="#map">Explore the career map →</a>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="planet">✦</div>
            <div className="orbit"></div>
            <div className="floating">🤖</div>
          </div>
        </section>

        <section className="stats" aria-label="Your progress">
          <div className="stat">
            <Trophy aria-hidden="true" />
            <div><small>CHALLENGES PASSED</small><h2>{completed.length}/{careers.length}</h2></div>
          </div>
          <div className="stat">
            <Star aria-hidden="true" />
            <div><small>EXPERIENCE</small><h2>{xp} XP</h2></div>
          </div>
          <div className="stat">
            <BrainCircuit aria-hidden="true" />
            <div><small>REAL CAREER PATHS</small><h2>{careers.length}</h2></div>
          </div>
        </section>

        <section id="map" className="section">
          <p className="tag">EXPLORE REAL JOBS AND HOW TO GET THERE</p>
          <h2>🗺️ Your AI Career Map</h2>
          <p className="section-intro">
            These are real kinds of jobs. Select one to see useful school subjects,
            beginner skills, and different ways people train for the work.
          </p>
          <div className="game-layout">
            <div className="world-map" aria-label="Choose a career">
              <div className="map-grid" aria-hidden="true"></div>
              <svg className="map-roads" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <path d="M15 25 L48 15 L80 25 L75 70 L43 82 L14 70 Z M15 25 L75 70 M48 15 L43 82 M80 25 L14 70" />
              </svg>
              {careers.map(career => {
                const CareerIcon = careerIcons[career.icon];
                return (
                  <button
                    key={career.id}
                    className={`map-node ${selected.id === career.id ? "active" : ""}`}
                    style={{
                      left: `${career.x}%`,
                      top: `${career.y}%`,
                      "--zone": career.color
                    }}
                    onClick={() => chooseCareer(career)}
                    aria-pressed={selected.id === career.id}
                  >
                    <CareerIcon size={23} aria-hidden="true" />
                    <span>{career.name}</span>
                    {completed.includes(career.id) && <span className="map-check" aria-label="Challenge passed">✓</span>}
                  </button>
                );
              })}
            </div>

            <div className="career-panel" id="careers" aria-live="polite">
              <div className="career-icon"><Icon size={35} aria-hidden="true" /></div>
              <p className="tag">REAL-WORLD CAREER</p>
              <h2>{selected.role}</h2>
              <p>{selected.description}</p>

              <h4>SKILLS YOU CAN PRACTICE</h4>
              <div className="skills">
                {selected.skills.map(skill => <span key={skill}>{skill}</span>)}
              </div>

              <h4 className="pathway-heading">A POSSIBLE PATH</h4>
              <ol className="pathway">
                {selected.pathway.map((step, index) => (
                  <li key={step.title}>
                    <span className="pathway-step">{index + 1}</span>
                    <div><strong>{step.title}</strong><p>{step.description}</p></div>
                  </li>
                ))}
              </ol>
              <p className="pathway-note">
                There isn't just one route. Some people learn at college or university;
                others use job training, certificates, or build experience another way.
              </p>

              <h4>GOOD SUBJECTS TO EXPLORE</h4>
              <div className="skills">
                {selected.subjects.map(subject => <span key={subject}>{subject}</span>)}
              </div>

              <div className="mission">
                <h3>🎯 Try an AI-made challenge</h3>
                <p>QuestGuide will make a new, short activity for this job. You can ask the mentor for hints at any time.</p>
                <button onClick={generateMission} disabled={missionLoading || missionComplete}>
                  {missionLoading ? "QuestGuide is working..." : missionComplete ? "Challenge passed ✓" : mission ? "Make another challenge" : "Generate my challenge"}
                </button>
                {mission && (
                  <div className="mission-task">
                    <p className="tag">YOUR CHALLENGE</p>
                    <h4>{mission.title}</h4>
                    <p>{mission.scenario}</p>
                    {!feedback && (
                      <div className="quiz" key={quizIndex}>
                        <div className="quiz-progress">
                          <span>Question {quizIndex + 1} of {mission.questions.length}</span>
                          <div className="quiz-progress-track">
                            <div
                              className="quiz-progress-fill"
                              style={{ width: `${((quizIndex + 1) / mission.questions.length) * 100}%` }}
                            />
                          </div>
                        </div>
                        <fieldset className={`quiz-question ${answerStatus ? "answer-locked" : ""}`}>
                          <legend>{mission.questions[quizIndex].question}</legend>
                          <div className="quiz-options">
                            {mission.questions[quizIndex].options.map((option, optionIndex) => {
                              const selected = quizAnswers[quizIndex] === optionIndex;
                              const correct = answerStatus && optionIndex === mission.questions[quizIndex].correctIndex;
                              return (
                                <button
                                  type="button"
                                  className={`quiz-option ${selected ? "selected" : ""} ${correct ? "correct" : ""} ${selected && answerStatus === "incorrect" ? "incorrect" : ""}`}
                                  key={option}
                                  onClick={() => chooseQuizAnswer(optionIndex)}
                                  disabled={Boolean(answerStatus) || missionLoading || missionComplete}
                                >
                                  <span className="option-letter">{String.fromCharCode(65 + optionIndex)}</span>
                                  <span>{option}</span>
                                </button>
                              );
                            })}
                          </div>
                        </fieldset>
                        {answerStatus && (
                          <div className={`answer-feedback ${answerStatus}`} role="status">
                            {answerStatus === "correct"
                              ? "✓ Correct!"
                              : `Keep going — ${mission.questions[quizIndex].explanation}`}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {feedback && (
                  <div className={`mission-feedback ${feedback.passed ? "passed" : ""}`} role="status">
                    <strong>{feedback.passed ? "Nice work! +100 XP" : "You're on your way"}</strong>
                    <p>{feedback.feedback}</p>
                    {!feedback.passed && <p><strong>Next step:</strong> {feedback.nextStep}</p>}
                  </div>
                )}
                {error && <p className="error-message" role="alert">{error}</p>}
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="mentor">
          <div className="mentor-heading">
            <p className="tag">HERE TO HELP YOU LEARN</p>
            <h2>🤖 QuestGuide AI Mentor</h2>
            <p>Ask for a hint, a simple explanation, or help planning your next step.</p>
          </div>
          <div className="chat">
            <div className="chat-header">
              <Bot aria-hidden="true" />
              <div><strong>QuestGuide</strong><small>AI career mentor for students</small></div>
              <span className="online">● READY</span>
            </div>
            <div className="chat-messages" aria-live="polite" aria-label="Mentor conversation">
              {messages.map((msg, index) => (
                <div key={index} className={`message ${msg.role}`}>{msg.content}</div>
              ))}
              {chatLoading && <div className="message assistant">QuestGuide is thinking...</div>}
            </div>
            {mission && <p className="chat-context">QuestGuide knows you're working on: {mission.title}</p>}
            <form onSubmit={askAI} className="chat-input">
              <input
                value={input}
                onChange={event => setInput(event.target.value)}
                placeholder="Ask for a hint or explain a tricky word..."
                aria-label="Message QuestGuide"
                maxLength={1000}
              />
              <button type="submit" disabled={chatLoading || !input.trim()} aria-label="Send message">
                <Send size={18} />
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer>
        AI CAREER QUEST © 2026
        <p>Explore boldly. Build responsibly.</p>
      </footer>
    </div>
  );
}
