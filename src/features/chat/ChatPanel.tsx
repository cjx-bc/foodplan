import { Bot, CalendarPlus, Droplets, Flame, Leaf, Loader2, RotateCcw, Send, Target } from "lucide-react";
import { FormEvent, useState } from "react";
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
  onSend: (message: string) => void;
  onQuickAction: (action: string) => void;
};

export function ChatPanel({ messages, isGenerating, onSend, onQuickAction }: ChatPanelProps) {
  const [draft, setDraft] = useState("");

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
        <span className={styles.step}><Bot size={22} /></span>
        <div>
          <h2>AI 对话搭配页</h2>
          <p>告诉 AI 口味、目标和库存，生成今日饮食方案。</p>
        </div>
      </div>

      <div className={styles.messages}>
        {messages.map((message) => (
          <article key={message.id} className={`${styles.message} ${styles[message.role]}`}>
            <div className={styles.avatar}>{message.role === "assistant" ? <Bot size={20} /> : "你"}</div>
            <div className={styles.bubble}>
              <p>{message.content}</p>
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
              <p>AI 正在结合营养目标和家庭库存生成方案...</p>
            </div>
          </article>
        ) : null}
      </div>

      <div className={styles.actions}>
        <h3>智能快捷操作</h3>
        <div className={styles.actionGrid}>
          {quickActions.map(({ label, icon: Icon }) => (
            <IconButton key={label} icon={<Icon size={17} />} onClick={() => onQuickAction(label)} type="button" disabled={isGenerating}>
              {label}
            </IconButton>
          ))}
        </div>
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
        <IconButton icon={isGenerating ? <Loader2 size={18} /> : <Send size={18} />} variant="primary" type="submit" aria-label="发送消息" disabled={isGenerating} />
      </form>
    </section>
  );
}
