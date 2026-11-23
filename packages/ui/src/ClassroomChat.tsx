import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  ClassroomApiError,
  classroomError,
  classroomRequest,
} from "./classroom-api";

interface Message {
  id: number;
  senderId: number;
  senderName: string;
  text: string;
  createdAt: string;
}

interface Chat {
  name: string;
  userId: number;
  teacherId: number;
  members: { id: number; name: string }[];
  messages: Message[];
  before: number | null;
}

const emojis = ["🙂", "👍", "👏", "🙏", "✅", "🙋", "🎉", "💪"];

function Avatar({ name }: { name: string }) {
  return (
    <span className="fw-chat-avatar" aria-hidden="true">
      {Array.from(name)[0]}
    </span>
  );
}

export function ClassroomChat({
  id,
  showTitle = false,
}: {
  id: number;
  showTitle?: boolean;
}) {
  const [chat, setChat] = useState<Chat>();
  const [draft, setDraft] = useState("");
  const [members, setMembers] = useState(false);
  const [emojiPicker, setEmojiPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState("");
  const [sendError, setSendError] = useState("");
  const request = useRef<{ text: string; requestUid: string } | undefined>(
    undefined,
  );
  const lock = useRef(false);
  const feed = useRef<HTMLOListElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const autoScroll = useRef(true);
  const restoreHeight = useRef<number | undefined>(undefined);
  const path = `/classrooms/${id}/messages`;

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const latest = await classroomRequest<Chat>(path, undefined, signal);
        if (signal?.aborted) return;
        setChat((previous) => {
          if (!previous) return latest;
          const unique = new Map(
            [...previous.messages, ...latest.messages].map((message) => [
              message.id,
              message,
            ]),
          );
          return {
            ...latest,
            messages: [...unique.values()].sort((a, b) => a.id - b.id),
            before: previous.before,
          };
        });
        setError("");
      } catch (cause) {
        if (!signal?.aborted) {
          if (
            cause instanceof ClassroomApiError &&
            [401, 403, 404].includes(cause.status)
          )
            setChat(undefined);
          setError(classroomError(cause));
        }
      }
    },
    [path],
  );

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    const timer = window.setInterval(
      () => void refresh(controller.signal),
      3500,
    );
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [refresh]);

  useEffect(() => {
    if (!feed.current) return;
    if (restoreHeight.current !== undefined) {
      feed.current.scrollTop +=
        feed.current.scrollHeight - restoreHeight.current;
      restoreHeight.current = undefined;
    } else if (autoScroll.current)
      feed.current.scrollTop = feed.current.scrollHeight;
  }, [chat]);

  async function loadOlder() {
    if (!chat?.before || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const older = await classroomRequest<Chat>(
        `${path}?before=${chat.before}`,
      );
      restoreHeight.current = feed.current?.scrollHeight;
      setChat((current) => {
        if (!current) return older;
        const unique = new Map(
          [...older.messages, ...current.messages].map((message) => [
            message.id,
            message,
          ]),
        );
        return {
          ...current,
          before: older.before,
          messages: [...unique.values()].sort((a, b) => a.id - b.id),
        };
      });
      setError("");
    } catch (cause) {
      setError(classroomError(cause));
    } finally {
      setLoadingOlder(false);
    }
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || lock.current) return;
    lock.current = true;
    setBusy(true);
    setSendError("");
    if (request.current?.text !== text)
      request.current = { text, requestUid: crypto.randomUUID() };
    try {
      await classroomRequest(path, request.current);
      request.current = undefined;
      setDraft("");
      setEmojiPicker(false);
      autoScroll.current = true;
      await refresh();
    } catch (cause) {
      setSendError(classroomError(cause));
    } finally {
      lock.current = false;
      setBusy(false);
      requestAnimationFrame(() => input.current?.focus());
    }
  }

  if (!chat)
    return error ? (
      <p role="alert">
        {error} <button onClick={() => void refresh()}>重试</button>
      </p>
    ) : (
      <p role="status">正在载入班级群…</p>
    );

  return (
    <section className="fw-chat" aria-label="班级群">
      <header className="fw-chat-header">
        {showTitle && <h2>{chat.name}</h2>}
        <button
          type="button"
          aria-expanded={members}
          aria-controls="fw-chat-members"
          onClick={() => setMembers(!members)}
        >
          群成员 {chat.members.length}
        </button>
      </header>
      {error && (
        <p role="alert" className="fw-chat-error">
          {error} <button onClick={() => void refresh()}>刷新</button>
        </p>
      )}
      <div className="fw-chat-layout">
        <div className="fw-chat-conversation">
          <ol
            ref={feed}
            className="fw-chat-feed"
            aria-label="群消息"
            onScroll={(event) => {
              const node = event.currentTarget;
              autoScroll.current =
                node.scrollHeight - node.scrollTop - node.clientHeight < 50;
            }}
          >
            {chat.before && (
              <li className="fw-chat-empty">
                <button
                  onClick={() => void loadOlder()}
                  disabled={loadingOlder}
                >
                  {loadingOlder ? "载入中…" : "加载更早消息"}
                </button>
              </li>
            )}
            {!chat.messages.length && (
              <li className="fw-chat-empty">还没有群消息。</li>
            )}
            {chat.messages.map((message, index) => {
              const own = message.senderId === chat.userId;
              const previous = chat.messages[index - 1];
              const grouped =
                previous?.senderId === message.senderId &&
                previous.createdAt.slice(0, 16) ===
                  message.createdAt.slice(0, 16);
              return (
                <li
                  key={message.id}
                  className={`fw-chat-row${own ? " own" : ""}${grouped ? " grouped" : ""}`}
                >
                  {grouped ? (
                    <span className="fw-chat-avatar-spacer" />
                  ) : (
                    <Avatar name={message.senderName} />
                  )}
                  <div className="fw-chat-message">
                    {!grouped && (
                      <div className="fw-chat-meta">
                        {own ? "我" : message.senderName}
                        {!own && message.senderId === chat.teacherId && (
                          <span>教师</span>
                        )}
                        <time dateTime={message.createdAt}>
                          {new Date(message.createdAt).toLocaleString("zh-CN", {
                            month: "numeric",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </time>
                      </div>
                    )}
                    <p className="fw-chat-bubble">{message.text}</p>
                  </div>
                </li>
              );
            })}
          </ol>
          <form
            className="fw-chat-compose"
            onSubmit={(event) => void send(event)}
          >
            <textarea
              ref={input}
              value={draft}
              disabled={busy}
              aria-label="消息"
              placeholder="发消息给班级"
              maxLength={1000}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing &&
                  event.nativeEvent.keyCode !== 229
                ) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <div className="fw-chat-toolbar">
              <div className="fw-chat-emoji">
                <button
                  type="button"
                  aria-expanded={emojiPicker}
                  aria-controls="fw-chat-emoji"
                  onClick={() => setEmojiPicker(!emojiPicker)}
                >
                  表情
                </button>
                {emojiPicker && (
                  <div id="fw-chat-emoji">
                    {emojis.map((emoji) => (
                      <button
                        type="button"
                        key={emoji}
                        onClick={() => {
                          const field = input.current;
                          const start = field?.selectionStart ?? draft.length;
                          const end = field?.selectionEnd ?? start;
                          const updated =
                            draft.slice(0, start) + emoji + draft.slice(end);
                          if (updated.length <= 1000) setDraft(updated);
                          setEmojiPicker(false);
                          requestAnimationFrame(() => {
                            field?.focus();
                            field?.setSelectionRange(
                              start + emoji.length,
                              start + emoji.length,
                            );
                          });
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="fw-chat-send">
                <span>Enter 发送 · Shift + Enter 换行</span>
                <button type="submit" disabled={busy || !draft.trim()}>
                  {busy ? "发送中…" : "发送"}
                </button>
              </div>
            </div>
            {sendError && (
              <p className="fw-chat-error" role="alert">
                {sendError}。可重新发送。
              </p>
            )}
          </form>
        </div>
        <aside
          id="fw-chat-members"
          className="fw-chat-members"
          hidden={!members}
        >
          <h3>群成员</h3>
          <ul>
            {chat.members.map((member) => (
              <li key={member.id}>
                <Avatar name={member.name} />
                {member.name}
                {member.id === chat.userId ? "（我）" : ""}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}
