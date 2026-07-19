import { useState, FormEvent } from "react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";
import type { Post } from "../types";

interface Props {
  onPostCreated: (post: Post) => void;
}

export default function ComposeBox({ onPostCreated }: Props) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const remaining = 280 - content.length;
  const initial = user?.name.charAt(0).toUpperCase() ?? "?";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim() || remaining < 0) return;

    setError("");
    setLoading(true);

    try {
      const { post } = await api.createPost(content.trim());
      setContent("");
      onPostCreated(post);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="compose-box">
      <div className="avatar">{initial}</div>
      <form className="compose-form" onSubmit={handleSubmit}>
        <textarea
          placeholder="What's happening?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={280}
        />
        {error && <div className="error-msg">{error}</div>}
        <div className="compose-actions">
          <span className={`char-count ${remaining < 0 ? "over" : ""}`}>
            {remaining}
          </span>
          <button
            type="submit"
            className="btn-post"
            disabled={loading || !content.trim() || remaining < 0}
          >
            {loading ? "Posting..." : "Post"}
          </button>
        </div>
      </form>
    </div>
  );
}
