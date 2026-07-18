import { useState, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api, type ApiMeta } from "../services/api";
import ComposeBox from "../components/ComposeBox";
import PostCard from "../components/PostCard";
import type { Post } from "../types";

export default function HomePage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState<ApiMeta>({});

  const loadPosts = useCallback(async () => {
    try {
      const { data, meta: responseMeta } = await api.getPosts();
      setPosts(data.posts);
      setMeta(responseMeta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load posts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  if (authLoading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="app-layout">
      <main className="main-column">
        <header className="page-header">
          <div className="top-bar">
            <span>
              Home
              <span className="phase-badge">Phase 2-3</span>
            </span>
            <div className="user-info">
              <span>@{user.username}</span>
              <button className="btn-secondary" onClick={logout}>
                Log out
              </button>
            </div>
          </div>
        </header>

        {meta.service && (
          <div className="system-info">
            <span className="system-tag">{meta.service}</span>
            <span className="system-tag">{meta.instance}</span>
            {meta.cache && (
              <span className={`system-tag cache-${meta.cache.toLowerCase()}`}>
                Redis {meta.cache}
              </span>
            )}
            <button className="btn-refresh" onClick={loadPosts} type="button">
              Refresh feed
            </button>
          </div>
        )}

        <ComposeBox
          onPostCreated={(post) => {
            setPosts((prev) => [post, ...prev]);
            setMeta((prev) => ({ ...prev, cache: "INVALIDATED" }));
          }}
        />

        {loading && <div className="loading">Loading posts...</div>}
        {error && <div className="error-msg">{error}</div>}

        {!loading && posts.length === 0 && (
          <div className="empty-state">
            <p>No posts yet. Be the first to post something!</p>
          </div>
        )}

        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </main>
    </div>
  );
}
