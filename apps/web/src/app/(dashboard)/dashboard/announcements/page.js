'use client';

// PATH: apps/web/src/app/(dashboard)/dashboard/announcements/page.js

import { useEffect, useState, useRef } from 'react';
import { Plus, Pin, Trash2, MessageSquare, Smile } from 'lucide-react';
import useAnnouncementStore from '@/stores/announcementStore';
import useWorkspaceStore from '@/stores/workspaceStore';
import useAuthStore from '@/stores/authStore';
import { formatRelativeTime, getInitials } from '@/lib/utils';
import toast from 'react-hot-toast';

const EMOJIS = ['👍', '🎉', '🔥', '✅', '❤️', '🚀'];

// "Raiya Chowdhury" → "RaiyaChowdhury"
// This is what you type after @ and what the backend matches against
const toHandle = (name = '') => name.replace(/\s+/g, '');

// Highlight @handles in rendered text
function RenderContent({ text = '' }) {
  const parts = text.split(/(@\w+)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('@')
          ? <span key={i} style={{ color: '#4f46e5', fontWeight: 600, background: '#eef2ff', padding: '1px 5px', borderRadius: 4 }}>{part}</span>
          : part
      )}
    </>
  );
}

// Comment input with @ autocomplete
function CommentInput({ announcementId, members, onSubmit }) {
  const [text, setText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const val = e.target.value;
    setText(val);

    // Detect @ trigger — find last @ followed by optional word chars
    const match = val.match(/@(\w*)$/);
    if (match) {
      const query = match[1].toLowerCase(); // what's typed after @
      // Show ALL members when just @ typed (query=''), filter as they type more
      const filtered = members.filter(m =>
        toHandle(m.user?.name || '').toLowerCase().startsWith(query)
      );
      setSuggestions(filtered);
      setMentionOpen(true);
    } else {
      setMentionOpen(false);
      setSuggestions([]);
    }
  };

  const insertMention = (member) => {
    const handle = toHandle(member.user?.name || '');
    // Replace the partial @query at end of text with full @handle + space
    const newText = text.replace(/@(\w*)$/, `@${handle} `);
    setText(newText);
    setMentionOpen(false);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
    if (e.key === 'Escape') setMentionOpen(false);
  };

  const submit = () => {
    if (!text.trim()) return;
    onSubmit(announcementId, text.trim());
    setText('');
    setMentionOpen(false);
    setSuggestions([]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {/* Input wrapper — relative for dropdown */}
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            ref={inputRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Write a comment... type @ to mention"
            style={{
              width: '100%', height: 36, padding: '0 12px', fontSize: 13,
              border: '1px solid #e4e7ec', borderRadius: 8, outline: 'none',
              fontFamily: 'var(--font-sans)', color: '#101828', boxSizing: 'border-box',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderColor = '#6366f1'}
            onBlur={e => {
              e.target.style.borderColor = '#e4e7ec';
              // Delay so click on suggestion registers before closing
              setTimeout(() => setMentionOpen(false), 200);
            }}
          />

          {/* Autocomplete dropdown — shows all members on @, filters as you type */}
          {mentionOpen && suggestions.length > 0 && (
            <div style={{
              position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, right: 0,
              background: '#fff', border: '1px solid #e4e7ec', borderRadius: 10,
              boxShadow: '0 8px 24px rgba(16,24,40,0.12)', zIndex: 100,
              overflow: 'hidden', padding: 4, maxHeight: 220, overflowY: 'auto',
            }}>
              <div style={{ padding: '4px 10px 6px', fontSize: 10, fontWeight: 700, color: '#98a2b3', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Mention a teammate
              </div>
              {suggestions.map(m => (
                <button
                  key={m.userId}
                  onMouseDown={e => { e.preventDefault(); insertMention(m); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '8px 10px', background: 'none',
                    border: 'none', borderRadius: 7, cursor: 'pointer', textAlign: 'left',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f1f3f7'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%', background: '#4f46e5',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0, overflow: 'hidden',
                  }}>
                    {m.user?.avatar
                      ? <img src={m.user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : getInitials(m.user?.name || '')
                    }
                  </div>
                  {/* Name + handle */}
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#101828', lineHeight: 1.3 }}>
                      {m.user?.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#98a2b3' }}>
                      @{toHandle(m.user?.name || '')}
                    </div>
                  </div>
                  {/* Role badge */}
                  <div style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, color: m.role === 'ADMIN' ? '#4f46e5' : '#6b7280', background: m.role === 'ADMIN' ? '#eef2ff' : '#f1f3f7', padding: '2px 7px', borderRadius: 10 }}>
                    {m.role}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {mentionOpen && suggestions.length === 0 && (
            <div style={{
              position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, right: 0,
              background: '#fff', border: '1px solid #e4e7ec', borderRadius: 10,
              padding: '10px 14px', fontSize: 13, color: '#98a2b3',
              boxShadow: '0 8px 24px rgba(16,24,40,0.12)', zIndex: 100,
            }}>
              No members found
            </div>
          )}
        </div>

        <button
          onClick={submit}
          disabled={!text.trim()}
          style={{
            height: 36, padding: '0 14px', background: '#4f46e5', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: text.trim() ? 'pointer' : 'not-allowed',
            opacity: text.trim() ? 1 : 0.5,
            fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap', transition: 'background 0.15s',
          }}
          onMouseEnter={e => { if (text.trim()) e.currentTarget.style.background = '#4338ca'; }}
          onMouseLeave={e => e.currentTarget.style.background = '#4f46e5'}
        >
          Send
        </button>
      </div>

      {/* Hint */}
      <div style={{ fontSize: 11, color: '#c0c9d8' }}>
        Type <strong style={{ color: '#98a2b3' }}>@</strong> to see all members · e.g.{' '}
        <code style={{ background: '#f1f3f7', padding: '1px 5px', borderRadius: 3, fontSize: 11, color: '#4f46e5' }}>
          @{members[0] ? toHandle(members[0].user?.name || 'RaiyaChowdhury') : 'RaiyaChowdhury'}
        </code>
      </div>
    </div>
  );
}

export default function AnnouncementsPage() {
  const {
    announcements, fetchAnnouncements, createAnnouncement,
    deleteAnnouncement, togglePin, toggleReaction, addComment, isLoading
  } = useAnnouncementStore();
  const { currentWorkspace, fetchWorkspaceById } = useWorkspaceStore();
  const { user } = useAuthStore();
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [openComments, setOpenComments] = useState({});
  const [showEmojiFor, setShowEmojiFor] = useState(null);

  const members = currentWorkspace?.members || [];
  const currentMember = members.find(m => m.userId === user?.id);
  const isAdmin = currentMember?.role === 'ADMIN';
  const canPost = isAdmin || currentMember?.canPostAnnouncements;

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    // Refresh workspace data to get latest permissions
    fetchWorkspaceById(currentWorkspace.id);
    fetchAnnouncements(currentWorkspace.id);
  }, [currentWorkspace?.id]);

  const handlePost = async () => {
    if (!content.trim()) return;
    setPosting(true);
    const r = await createAnnouncement(currentWorkspace.id, content.trim());
    if (r.success) setContent('');
    else toast.error(r.error);
    setPosting(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement?')) return;
    const r = await deleteAnnouncement(id, currentWorkspace.id);
    if (!r.success) toast.error(r.error);
  };

  const handlePin = async (id, pinned) => {
    const r = await togglePin(id, !pinned);
    if (!r.success) toast.error(r.error);
  };

  const handleReaction = async (announcementId, emoji) => {
    setShowEmojiFor(null);
    await toggleReaction(announcementId, emoji, currentWorkspace.id);
  };

  const handleComment = async (announcementId, text) => {
    const r = await addComment(announcementId, text, currentWorkspace.id);
    if (!r.success) toast.error(r.error);
  };

  const getReactionGroups = (reactions = []) => {
    const groups = {};
    reactions.forEach(r => { groups[r.emoji] = (groups[r.emoji] || 0) + 1; });
    return groups;
  };

  const sorted = [
    ...announcements.filter(a => a.pinned),
    ...announcements.filter(a => !a.pinned),
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Announcements</h2>
          <p className="page-sub">Workspace-wide updates from your team</p>
        </div>
      </div>

      {/* Compose — admin or members with canPostAnnouncements */}
      {canPost && (
        <div className="compose-card">
          <textarea
            placeholder="Write an announcement for your team..."
            value={content}
            onChange={e => setContent(e.target.value)}
            className="compose-textarea"
            rows={3}
          />
          <div className="compose-footer">
            <span className="compose-hint">Visible to all workspace members</span>
            <button className="btn-primary" onClick={handlePost} disabled={posting || !content.trim()}>
              <Plus size={14} /> {posting ? 'Posting...' : 'Post Announcement'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="loading">Loading...</div>
      ) : sorted.length === 0 ? (
        <div className="empty-state">No announcements yet.</div>
      ) : (
        <div className="feed">
          {sorted.map(ann => {
            const reactionGroups = getReactionGroups(ann.reactions);
            const commentsOpen = openComments[ann.id];

            return (
              <div key={ann.id} className={`ann-card ${ann.pinned ? 'ann-card--pinned' : ''}`}>
                {ann.pinned && <div className="ann-pinned-badge"><Pin size={11} /> Pinned</div>}

                <div className="ann-header">
                  <div className="ann-author">
                    <div className="ann-avatar">
                      {ann.author?.avatar
                        ? <img src={ann.author.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : getInitials(ann.author?.name || '')
                      }
                    </div>
                    <div>
                      <span className="ann-author-name">{ann.author?.name}</span>
                      <span className="ann-time">{formatRelativeTime(ann.createdAt)}</span>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="ann-header-actions">
                      <button
                        className={`icon-btn ${ann.pinned ? 'icon-btn--active' : ''}`}
                        onClick={() => handlePin(ann.id, ann.pinned)}
                        title={ann.pinned ? 'Unpin' : 'Pin to top'}
                      >
                        <Pin size={14} />
                      </button>
                      <button className="icon-btn icon-btn--danger" onClick={() => handleDelete(ann.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Content with highlighted @mentions */}
                <p className="ann-content">
                  <RenderContent text={ann.content} />
                </p>

                {/* Reactions */}
                <div className="ann-reactions">
                  {Object.entries(reactionGroups).map(([emoji, count]) => (
                    <button key={emoji} className="reaction-chip" onClick={() => handleReaction(ann.id, emoji)}>
                      {emoji} <span>{count}</span>
                    </button>
                  ))}
                  <div style={{ position: 'relative' }}>
                    <button className="add-reaction-btn" onClick={() => setShowEmojiFor(showEmojiFor === ann.id ? null : ann.id)}>
                      <Smile size={14} />
                    </button>
                    {showEmojiFor === ann.id && (
                      <div className="emoji-picker">
                        {EMOJIS.map(e => (
                          <button key={e} className="emoji-btn" onClick={() => handleReaction(ann.id, e)}>{e}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    className="comment-toggle-btn"
                    onClick={() => setOpenComments(p => ({ ...p, [ann.id]: !p[ann.id] }))}
                  >
                    <MessageSquare size={13} />
                    {ann.comments?.length > 0 && <span>{ann.comments.length}</span>}
                    {commentsOpen ? 'Hide' : 'Comment'}
                  </button>
                </div>

                {/* Comments section */}
                {commentsOpen && (
                  <div className="comments-section">
                    {ann.comments?.map(c => (
                      <div key={c.id} className="comment">
                        <div className="comment-avatar">
                          {c.author?.avatar
                            ? <img src={c.author.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : getInitials(c.author?.name || '')
                          }
                        </div>
                        <div className="comment-body">
                          <div className="comment-meta">
                            <strong>{c.author?.name}</strong>
                            <span>{formatRelativeTime(c.createdAt)}</span>
                          </div>
                          <p className="comment-text">
                            <RenderContent text={c.content} />
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* @mention-aware comment input */}
                    <CommentInput
                      announcementId={ann.id}
                      members={members}
                      onSubmit={handleComment}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .page { display: flex; flex-direction: column; gap: 24px; }
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; }
        .page-title { font-size: 22px; font-weight: 700; color: #101828; letter-spacing: -0.4px; margin: 0 0 4px; }
        .page-sub { font-size: 14px; color: #6b7280; margin: 0; }
        .loading { text-align: center; padding: 40px; color: #98a2b3; font-size: 14px; }
        .empty-state { text-align: center; padding: 60px; color: #98a2b3; font-size: 14px; }
        .compose-card { background: #fff; border: 1px solid #e4e7ec; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
        .compose-textarea { width: 100%; padding: 12px; font-size: 14px; border: 1px solid #e4e7ec; border-radius: 9px; resize: vertical; font-family: var(--font-sans); color: #101828; outline: none; box-sizing: border-box; line-height: 1.5; }
        .compose-textarea:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        .compose-footer { display: flex; align-items: center; justify-content: space-between; }
        .compose-hint { font-size: 12px; color: #98a2b3; }
        .btn-primary { display: flex; align-items: center; gap: 6px; padding: 9px 18px; background: #4f46e5; color: #fff; border: none; border-radius: 9px; font-size: 13.5px; font-weight: 600; cursor: pointer; font-family: var(--font-sans); transition: background 0.15s; }
        .btn-primary:hover:not(:disabled) { background: #4338ca; }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .feed { display: flex; flex-direction: column; gap: 16px; }
        .ann-card { background: #fff; border: 1px solid #e4e7ec; border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 12px; }
        .ann-card--pinned { border-color: #c7d2fe; background: #fafbff; }
        .ann-pinned-badge { display: inline-flex; align-items: center; gap: 4px; align-self: flex-start; font-size: 11px; font-weight: 600; color: #4f46e5; background: #eef2ff; padding: 3px 8px; border-radius: 20px; }
        .ann-header { display: flex; align-items: center; justify-content: space-between; }
        .ann-author { display: flex; align-items: center; gap: 10px; }
        .ann-avatar { width: 36px; height: 36px; border-radius: 50%; background: #4f46e5; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #fff; overflow: hidden; flex-shrink: 0; }
        .ann-author-name { display: block; font-size: 14px; font-weight: 600; color: #101828; }
        .ann-time { display: block; font-size: 12px; color: #98a2b3; }
        .ann-header-actions { display: flex; gap: 6px; }
        .icon-btn { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; background: none; border: 1px solid #e4e7ec; border-radius: 7px; cursor: pointer; color: #6b7280; transition: all 0.12s; }
        .icon-btn:hover { background: #f8f9fb; }
        .icon-btn--active { background: #eef2ff; color: #4f46e5; border-color: #c7d2fe; }
        .icon-btn--danger:hover { background: #fef2f2; color: #f04438; border-color: #fecaca; }
        .ann-content { font-size: 14px; color: #374151; line-height: 1.6; margin: 0; white-space: pre-wrap; }
        .ann-reactions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .reaction-chip { display: flex; align-items: center; gap: 4px; padding: 4px 10px; background: #f8f9fb; border: 1px solid #e4e7ec; border-radius: 20px; font-size: 13px; cursor: pointer; transition: all 0.12s; }
        .reaction-chip:hover { background: #eef2ff; border-color: #c7d2fe; }
        .reaction-chip span { font-size: 12px; color: #6b7280; font-weight: 600; }
        .add-reaction-btn { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; background: none; border: 1px solid #e4e7ec; border-radius: 50%; cursor: pointer; color: #6b7280; transition: all 0.12s; }
        .add-reaction-btn:hover { background: #f8f9fb; }
        .emoji-picker { position: absolute; bottom: calc(100% + 6px); left: 0; z-index: 50; background: #fff; border: 1px solid #e4e7ec; border-radius: 10px; padding: 6px; display: flex; gap: 2px; box-shadow: 0 8px 24px rgba(16,24,40,0.12); }
        .emoji-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 16px; background: none; border: none; border-radius: 6px; cursor: pointer; }
        .emoji-btn:hover { background: #f1f3f7; }
        .comment-toggle-btn { display: flex; align-items: center; gap: 5px; padding: 4px 10px; font-size: 12.5px; color: #6b7280; background: none; border: 1px solid #e4e7ec; border-radius: 20px; cursor: pointer; margin-left: auto; font-family: var(--font-sans); transition: all 0.12s; }
        .comment-toggle-btn:hover { background: #f8f9fb; color: #4f46e5; border-color: #c7d2fe; }
        .comment-toggle-btn span { font-weight: 600; }
        .comments-section { border-top: 1px solid #f1f3f7; padding-top: 12px; display: flex; flex-direction: column; gap: 10px; }
        .comment { display: flex; gap: 9px; }
        .comment-avatar { width: 28px; height: 28px; border-radius: 50%; background: #6366f1; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #fff; flex-shrink: 0; overflow: hidden; }
        .comment-body { flex: 1; }
        .comment-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 3px; font-size: 12px; color: #6b7280; }
        .comment-meta strong { color: #101828; }
        .comment-text { font-size: 13.5px; color: #374151; margin: 0; line-height: 1.5; }
      `}</style>
    </div>
  );
}