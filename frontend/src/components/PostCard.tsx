import type { Post } from "../types";

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);

  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

interface Props {
  post: Post;
}

export default function PostCard({ post }: Props) {
  const initial = post.author.name.charAt(0).toUpperCase();

  return (
    <article className="post-card">
      <div className="avatar">{initial}</div>
      <div className="post-content">
        <div className="post-header">
          <span className="post-name">{post.author.name}</span>
          <span className="post-username">@{post.author.username}</span>
          <span className="post-time">· {timeAgo(post.createdAt)}</span>
        </div>
        <p className="post-text">{post.content}</p>
      </div>
    </article>
  );
}
