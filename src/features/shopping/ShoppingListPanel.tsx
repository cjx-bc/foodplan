import { Check, ChevronDown, ChevronRight, PartyPopper, ShoppingCart } from "lucide-react";
import { useState } from "react";
import type { DerivedShoppingListItem } from "../../types/smartmeal";
import { categoryLabels } from "../../utils/labels";
import styles from "./ShoppingListPanel.module.css";

type ShoppingListPanelProps = {
  items: DerivedShoppingListItem[];
  modeLabel: string;
  onToggle: (id: string) => void;
};

export function ShoppingListPanel({ items, modeLabel, onToggle }: ShoppingListPanelProps) {
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

      {remainingCount === 0 ? (
        <div className={styles.complete}>
          <PartyPopper size={20} />
          今日采购已完成，可以确认采用这份餐单。
        </div>
      ) : null}

      <div className={styles.groups}>
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
                >
                  <span className={styles.checkbox}>{item.checked ? <Check size={14} /> : null}</span>
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
      </div>
    </section>
  );
}
