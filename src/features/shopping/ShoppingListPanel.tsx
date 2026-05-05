import { Check, ChevronDown, ChevronRight, Loader2, PartyPopper, ShoppingCart } from "lucide-react";
import { useState } from "react";
import type { DerivedShoppingListItem } from "../../types/smartmeal";
import { categoryLabels } from "../../utils/labels";
import styles from "./ShoppingListPanel.module.css";

type ShoppingListPanelProps = {
  items: DerivedShoppingListItem[];
  modeLabel: string;
  isLoading?: boolean;
  pendingItemId?: string;
  onRetry?: () => void;
  onToggle: (id: string) => void;
};

export function ShoppingListPanel({ items, modeLabel, isLoading = false, pendingItemId, onRetry, onToggle }: ShoppingListPanelProps) {
  const categories = Array.from(new Set(items.map((item) => item.category)));
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const remainingCount = items.filter((item) => !item.checked).length;

  function toggleCategory(category: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }

  return (
    <section className={styles.panel} aria-label="购物清单">
      <div className={styles.header}>
        <span>
          <ShoppingCart size={19} />
          购物清单
        </span>
        <strong>{modeLabel} · {remainingCount === 0 ? "全部完成" : `${remainingCount} 项待买`}</strong>
      </div>

      {isLoading ? (
        <div className={styles.skeletonList} aria-label="正在加载购物清单">
          {[0, 1, 2].map((item) => <span key={item} />)}
        </div>
      ) : items.length === 0 ? (
        <div className={styles.emptyState}>
          <strong>还没有购物清单</strong>
          <p>先生成今日餐单或本周计划，再让系统按缺口整理采购项。</p>
          {onRetry ? <button type="button" onClick={onRetry}>重试生成</button> : null}
        </div>
      ) : remainingCount === 0 ? (
        <div className={styles.complete}>
          <PartyPopper size={20} />
          今日采购已完成，可以确认采用这份餐单。
        </div>
      ) : null}

      {!isLoading && items.length > 0 ? <div className={styles.groups}>
        {categories.map((category) => {
          const categoryItems = items.filter((item) => item.category === category);
          const isCollapsed = collapsed.has(category);

          return (
            <div className={styles.group} key={category}>
              <button className={styles.groupToggle} type="button" onClick={() => toggleCategory(category)}>
                {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                <span>{categoryLabels[category]}</span>
                <em>{categoryItems.filter((item) => !item.checked).length} 项</em>
              </button>
              {!isCollapsed ? categoryItems.map((item) => (
                <button
                  className={`${styles.item} ${item.checked ? styles.checked : ""}`}
                  key={item.id}
                  type="button"
                  onClick={() => onToggle(item.id)}
                  disabled={Boolean(pendingItemId)}
                >
                  <span className={styles.checkbox}>{pendingItemId === item.id ? <Loader2 size={14} /> : item.checked ? <Check size={14} /> : null}</span>
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.reason}</small>
                  </span>
                  <em>{item.amount}</em>
                </button>
              )) : null}
            </div>
          );
        })}
      </div> : null}
    </section>
  );
}
