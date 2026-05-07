import { Bot, CalendarPlus, Droplets, Flame, Leaf, Loader2, RotateCcw, Send, Target } from "lucide-react";
import { FormEvent, useLayoutEffect, useRef, useState } from "react";
import { IconButton } from "../../components/IconButton";
import type { ChatMessage } from "../../types/smartmeal";
import styles from "./ChatPanel.module.css";

const quickActions = [
  { label: "推荐食材替换", icon: RotateCcw },
  { label: "快捷调整营养目标", icon: Target },
  { label: "减少油脂", icon: Droplets },
  { label: "提升蛋白质", icon: Leaf },
  { label: "控制热量", icon: Flame },
  { label: "多用库存食材", icon: CalendarPlus },
];

type ChatPanelProps = {
  messages: ChatMessage[];
  isGenerating: boolean;
  isBootstrapping: boolean;
  onSend: (message: string) => void;
  onQuickAction: (action: string) => void;
  proposalMessageId?: string | null;
  proposalMode?: "daily" | "weekly" | null;
  onAdoptDaily?: () => void;
  onAdoptWeekly?: () => void;
  proposalPending?: boolean;
};

export function ChatPanel({
  messages,
  isGenerating,
  isBootstrapping,
  onSend,
  onQuickAction,
  proposalMessageId,
  proposalMode,
  onAdoptDaily,
  onAdoptWeekly,
  proposalPending = false,
}: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const lastMessageCountRef = useRef(messages.length);
  const lastGeneratingRef = useRef(isGenerating);
  const hasMountedRef = useRef(false);

  useLayoutEffect(() => {
    const container = messagesRef.current;
    if (!container) return;

    const messageCountChanged = lastMessageCountRef.current !== messages.length;
    const generatingStarted = !lastGeneratingRef.current && isGenerating;

    if (!hasMountedRef.current || isBootstrapping) {
      container.scrollTop = container.scrollHeight;
    } else if (messageCountChanged || generatingStarted) {
      container.scrollTop = container.scrollHeight;
    }

    hasMountedRef.current = true;
    lastMessageCountRef.current = messages.length;
    lastGeneratingRef.current = isGenerating;
  }, [messages.length, isGenerating, isBootstrapping]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || isGenerating) return;
    onSend(message);
    setDraft("");
  }

  return (
    <section className={styles.panel} aria-label="AI 对话搭配页">
      <div className={styles.sectionHeader}>
        <span className={styles.step}><Bot size={18} /></span>
        <div>
          <h2>AI 对话搭配页</h2>
          <p>告诉 AI 口味、目标和库存，快速生成方案。</p>
        </div>
      </div>

      <div className={styles.messages} ref={messagesRef} aria-label="聊天消息记录">
        {messages.length === 0 && !isGenerating ? (
          <div className={styles.emptyState}>
            <strong>还没有对话</strong>
            <p>先在上方输入需求。你可以问普通问题，也可以让 AI 生成今日餐单。</p>
          </div>
        ) : null}
        {messages.map((message) => (
          <article key={message.id} className={`${styles.message} ${styles[message.role]}`}>
            <div className={styles.avatar}>{message.role === "assistant" ? <Bot size={20} /> : "你"}</div>
            <div className={styles.bubble}>
              <p>{message.content}</p>
              {message.id === proposalMessageId && proposalMode ? (
                <div className={styles.proposalActions}>
                  {proposalMode === "daily" ? (
                    <button type="button" onClick={onAdoptDaily} disabled={proposalPending}>
                      {proposalPending ? "采用中..." : "采用今日方案"}
                    </button>
                  ) : (
                    <button type="button" onClick={onAdoptWeekly} disabled={proposalPending}>
                      {proposalPending ? "采用中..." : "采用本周方案"}
                    </button>
                  )}
                </div>
              ) : null}
              <time>{message.createdAt}</time>
            </div>
          </article>
        ))}
        {isGenerating ? (
          <article className={`${styles.message} ${styles.assistant}`} aria-live="polite">
            <div className={styles.avatar}>
              <Bot size={20} />
            </div>
            <div className={`${styles.bubble} ${styles.thinking}`}>
              <Loader2 size={17} />
              <p>正在思考ing</p>
            </div>
          </article>
        ) : null}
        <div aria-hidden="true" className={styles.scrollAnchor} />
      </div>

      <form className={styles.inputRow} onSubmit={submit}>
        <label className="srOnly" htmlFor="meal-chat-input">
          告诉 AI 你的口味、目标或饮食问题
        </label>
        <input
          id="meal-chat-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={isGenerating}
          placeholder="告诉 AI 你的口味、目标，或问任何饮食问题..."
        />
        <IconButton icon={isGenerating ? <Loader2 size={16} /> : <Send size={16} />} variant="primary" type="submit" aria-label="发送消息" disabled={isGenerating} />
      </form>

      <div className={styles.actions}>
        <h3>常用饮食指令</h3>
        <div className={styles.actionGrid}>
          {quickActions.map(({ label, icon: Icon }) => (
            <IconButton key={label} icon={<Icon size={14} />} onClick={() => onQuickAction(label)} type="button" disabled={isGenerating}>
              {label}
            </IconButton>
          ))}
        </div>
      </div>
    </section>
  );
}
