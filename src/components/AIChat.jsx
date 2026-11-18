import { useState } from "react";

export default function AIChat() {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);

  async function askAI() {
    if (!message.trim()) return;

    setLoading(true);
    setReply("");

    try {
      const response = await fetch("/api/mentor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "AI request failed");
      }

      setReply(data.reply);
    } catch (error) {
      setReply("AI Mentor error: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="ai-chat">
      <h2>🤖 Ask your AI Career Mentor</h2>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ask about AI careers, skills or missions..."
      />

      <button onClick={askAI} disabled={loading}>
        {loading ? "Thinking..." : "Ask Groq AI"}
      </button>

      {reply && (
        <div className="ai-reply">
          <h3>Career Mentor</h3>
          <p>{reply}</p>
        </div>
      )}
    </section>
  );
}