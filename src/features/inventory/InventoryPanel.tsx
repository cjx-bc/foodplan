import { AlertTriangle, Box, Loader2, Plus, ShoppingBag } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { IconButton } from "../../components/IconButton";
import type { InventoryCategory, InventoryConsumptionApplyItem, InventoryConsumptionPreview, InventoryItem } from "../../types/smartmeal";
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
  consumptionPreview: InventoryConsumptionPreview[];
  manualConsumptionDraft: InventoryConsumptionApplyItem[];
  isManualConsumptionMode: boolean;
  isSubmitting?: boolean;
  onAddInventory: (value: InventoryFormValue) => Promise<void>;
  onToggleManualConsumptionMode: () => void;
  onUpdateManualConsumption: (inventoryItemId: string, consumeValue: number) => void;
  onApplyManualConsumption: () => void;
  onApplyAutoConsumption: () => void;
};

export function InventoryPanel({
  inventory,
  consumptionPreview,
  manualConsumptionDraft,
  isManualConsumptionMode,
  isSubmitting = false,
  onAddInventory,
  onToggleManualConsumptionMode,
  onUpdateManualConsumption,
  onApplyManualConsumption,
  onApplyAutoConsumption,
}: InventoryPanelProps) {
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
  const consumptionMap = useMemo(
    () => new Map(consumptionPreview.filter((item) => item.inventoryItemId).map((item) => [item.inventoryItemId!, item])),
    [consumptionPreview],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (isSubmitting) return;
    const value = {
      ...form,
      name: form.name.trim(),
      quantity: form.quantity.trim() || "1 份",
    };
    if (!value.name) return;
    try {
      await onAddInventory(value);
      setForm((current) => ({ ...current, name: "", quantity: "1 份" }));
    } catch {
      // Keep the user's input so they can retry after the app-level error banner.
    }
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

      <div className={styles.workspace}>
        <section className={styles.aiCard}>
          <h3>AI 提醒</h3>
          <p>
            {consumptionPreview.length > 0
              ? `当前已采用方案预计会消耗 ${consumptionPreview.length} 项库存，确认吃完后再扣减数量。`
              : "当前还没有已采用方案对应的库存消耗。先去 AI 对话页生成并采用方案。"}
          </p>
          <div className={styles.consumptionActions}>
            <button type="button" title="逐项确认后再扣减" onClick={onToggleManualConsumptionMode} disabled={consumptionPreview.length === 0}>
              手动扣减
            </button>
            <button type="button" title="按当前执行方案自动扣减可匹配数量" onClick={onApplyAutoConsumption} disabled={isSubmitting || consumptionPreview.length === 0}>
              自动扣减
            </button>
          </div>
          {consumptionPreview.length > 0 ? (
            <div className={styles.previewList}>
              {consumptionPreview.map((item) => (
                <span key={`${item.inventoryItemId ?? item.name}-${item.plannedAmountText}`}>
                  {item.name} <em>-{item.plannedAmountText}</em>
                </span>
              ))}
            </div>
          ) : null}
        </section>

        <form className={styles.form} onSubmit={submit}>
          <div className={styles.formHeader}>
            <h3>添加食材</h3>
          </div>
          <div className={styles.field}>
            <label htmlFor="inventory-name">食材名称</label>
            <input
              id="inventory-name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="例如：鸡蛋"
              disabled={isSubmitting}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="inventory-category">分类</label>
            <select
              id="inventory-category"
              value={form.category}
              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as InventoryCategory }))}
              disabled={isSubmitting}
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
              disabled={isSubmitting}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="inventory-expire">过期日期</label>
            <input
              id="inventory-expire"
              type="date"
              value={form.expireDate}
              onChange={(event) => setForm((current) => ({ ...current, expireDate: event.target.value }))}
              disabled={isSubmitting}
            />
          </div>
          <IconButton icon={isSubmitting ? <Loader2 size={17} /> : <Plus size={17} />} variant="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "添加中" : "添加食材"}
          </IconButton>
        </form>
      </div>

      {isManualConsumptionMode ? (
        <section className={styles.manualCard}>
          <div className={styles.formHeader}>
            <h3>手动确认扣减</h3>
          </div>
          <div className={styles.manualList}>
            {manualConsumptionDraft.map((item) => (
              <label key={item.inventoryItemId} className={styles.manualRow}>
                <span>{inventory.find((inventoryItem) => inventoryItem.id === item.inventoryItemId)?.name ?? item.inventoryItemId}</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={item.consumeValue}
                  onChange={(event) => onUpdateManualConsumption(item.inventoryItemId, Number(event.target.value))}
                />
                <em>{item.consumeUnit}</em>
              </label>
            ))}
          </div>
          <div className={styles.consumptionActions}>
            <button type="button" onClick={onApplyManualConsumption} disabled={isSubmitting || manualConsumptionDraft.length === 0}>确认扣减</button>
            <button type="button" onClick={onToggleManualConsumptionMode}>取消</button>
          </div>
        </section>
      ) : null}

      <div className={styles.tableTools}>
        <strong>全部食材</strong>
        <div>
          <button type="button">全部分类</button>
          <button type="button">搜索食材</button>
        </div>
      </div>

      <div className={styles.table}>
        <div className={styles.tableHead}>
          <span>食材</span>
          <span>分类</span>
          <span>数量</span>
          <span>过期日期</span>
          <span>状态</span>
          <span>操作</span>
        </div>
        {inventory.length === 0 ? (
          <div className={styles.emptyState}>
            <strong>还没有库存食材</strong>
            <span>先添加鸡蛋、番茄或牛奶，后续餐单会优先使用这些库存。</span>
          </div>
        ) : inventory.map((item) => (
          <div className={styles.tableRow} key={item.id}>
            <strong>{item.name}</strong>
            <span>{categoryLabels[item.category]}</span>
            <span>
              {item.quantity}
              {consumptionMap.get(item.id) ? <em className={styles.consumeMark}>-{consumptionMap.get(item.id)?.plannedAmountText}</em> : null}
            </span>
            <span>{item.expireDate}</span>
            <em className={styles[item.status]}>{item.status === "expiring_soon" ? "临期" : item.status === "need_buy" ? "需采购" : item.status === "expired" ? "过期" : "新鲜"}</em>
            <button type="button" aria-label={`操作 ${item.name}`}>···</button>
          </div>
        ))}
      </div>
    </section>
  );
}
