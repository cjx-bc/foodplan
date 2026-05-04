import { AlertTriangle, Box, Plus, ShoppingBag } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { IconButton } from "../../components/IconButton";
import type { InventoryCategory, InventoryItem } from "../../types/smartmeal";
import { categoryLabels } from "../../utils/labels";
import styles from "./InventoryPanel.module.css";

export type InventoryFormValue = {
  name: string;
  category: InventoryCategory;
  quantity: string;
  expireDate: string;
};

type InventoryPanelProps = {
  inventory: InventoryItem[];
  onAddInventory: (value: InventoryFormValue) => void;
};

export function InventoryPanel({ inventory, onAddInventory }: InventoryPanelProps) {
  const [form, setForm] = useState<InventoryFormValue>({
    name: "",
    category: "vegetable",
    quantity: "1 份",
    expireDate: "2026-05-10",
  });
  const summary = useMemo(
    () => ({
      total: inventory.length,
      expiring: inventory.filter((item) => item.status === "expiring_soon").length,
      needBuy: inventory.filter((item) => item.status === "need_buy").length,
    }),
    [inventory],
  );

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = {
      ...form,
      name: form.name.trim(),
      quantity: form.quantity.trim() || "1 份",
    };
    if (!value.name) return;
    onAddInventory(value);
    setForm((current) => ({ ...current, name: "", quantity: "1 份" }));
  }

  return (
    <section className={styles.panel} aria-label="家庭库存管理页">
      <div className={styles.sectionHeader}>
        <span className={styles.step}><Box size={22} /></span>
        <div>
          <h2>家庭库存管理页</h2>
          <p>手动维护库存，AI 优先使用临期食材。</p>
        </div>
      </div>

      <div className={styles.stats}>
        <div>
          <Box size={23} />
          <strong>{summary.total}</strong>
          <span>种食材</span>
        </div>
        <div className={styles.warn}>
          <AlertTriangle size={23} />
          <strong>{summary.expiring}</strong>
          <span>个临期</span>
        </div>
        <div>
          <ShoppingBag size={23} />
          <strong>{summary.needBuy}</strong>
          <span>种需采购</span>
        </div>
      </div>

      <form className={styles.form} onSubmit={submit}>
        <div className={styles.field}>
          <label htmlFor="inventory-name">食材</label>
          <input
            id="inventory-name"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="如 黄瓜"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="inventory-category">分类</label>
          <select
            id="inventory-category"
            value={form.category}
            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as InventoryCategory }))}
          >
            {Object.entries(categoryLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="inventory-quantity">数量</label>
          <input
            id="inventory-quantity"
            value={form.quantity}
            onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
            placeholder="1 份"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="inventory-expire">过期日期</label>
          <input
            id="inventory-expire"
            type="date"
            value={form.expireDate}
            onChange={(event) => setForm((current) => ({ ...current, expireDate: event.target.value }))}
          />
        </div>
        <IconButton icon={<Plus size={17} />} variant="primary" type="submit">新增库存</IconButton>
      </form>

      <div className={styles.table}>
        <div className={styles.tableHead}>
          <span>食材</span>
          <span>分类</span>
          <span>数量</span>
          <span>状态</span>
        </div>
        {inventory.map((item) => (
          <div className={styles.tableRow} key={item.id}>
            <strong>{item.name}</strong>
            <span>{categoryLabels[item.category]}</span>
            <span>{item.quantity}</span>
            <em className={styles[item.status]}>{item.status === "expiring_soon" ? "临期" : item.status === "need_buy" ? "需采购" : item.status === "expired" ? "过期" : "新鲜"}</em>
          </div>
        ))}
      </div>
    </section>
  );
}
