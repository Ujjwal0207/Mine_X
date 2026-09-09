import { useState, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api, type ApiMeta } from "../services/api";
import ComposeBox from "../components/ComposeBox";
import PostCard from "../components/PostCard";
import type { Post, Notification } from "../types";

export default function HomePage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState<ApiMeta>({});
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

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

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // Ignored if notifications service unavailable
    }
  }, [user]);

  useEffect(() => {
    loadPosts();
    loadNotifications();

    const interval = setInterval(() => {
      loadNotifications();
    }, 15000);

    return () => clearInterval(interval);
  }, [loadPosts, loadNotifications]);

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  if (authLoading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="app-layout">
      <main className="main-column">
        <header className="page-header">
          <div className="top-bar">
            <span>
              Home
              <span className="phase-badge">Phase 4 (RabbitMQ)</span>
            </span>
            <div className="user-info">
              <button
                type="button"
                className={`btn-notification ${unreadCount > 0 ? "has-unread" : ""}`}
                onClick={() => {
                  setShowNotifications((s) => {
                    if (!s) void loadNotifications();
                    return !s;
                  });
                }}
                title="Notifications from RabbitMQ workers"
              >
                🔔 {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
              </button>
              <span>@{user.username}</span>
              <button className="btn-secondary" onClick={logout}>
                Log out
              </button>
            </div>
          </div>
        </header>

        {showNotifications && (
          <div className="notifications-drawer">
            <div className="notifications-header">
              <h3>Notifications (RabbitMQ Worker)</h3>
              {unreadCount > 0 && (
                <button className="btn-text" onClick={handleMarkAllRead}>
                  Mark all as read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <p className="notification-meta">No notifications yet. Tag someone with @username to test!</p>
            ) : (
              <div className="notifications-list">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`notification-card ${!n.read ? "unread" : ""}`}
                  >
                    <div>
                      <p>{n.content}</p>
                      <span className="notification-meta">
                        {new Date(n.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {!n.read && (
                      <button
                        className="btn-mark-read"
                        onClick={() => handleMarkRead(n.id)}
                      >
                        Read
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {meta.service && (
          <div className="system-info">
            <span className="system-tag">{meta.service}</span>
            <span className="system-tag">{meta.instance}</span>
            {meta.cache && (
              <span className={`system-tag cache-${meta.cache.toLowerCase()}`}>
                Redis {meta.cache}
              </span>
            )}
            <span className="system-tag">RabbitMQ Events: ON</span>
            <button className="btn-refresh" onClick={loadPosts} type="button">
              Refresh feed
            </button>
          </div>
        )}

        <ComposeBox
          onPostCreated={(post) => {
            setPosts((prev) => [post, ...prev]);
            setMeta((prev) => ({ ...prev, cache: "INVALIDATED" }));
            setTimeout(loadNotifications, 1000); // Reload notifications after worker processes
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
