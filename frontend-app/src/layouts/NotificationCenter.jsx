import { CheckCheck, CircleAlert, CircleCheck, Info, PackageCheck } from "lucide-react";

function formatTime(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "";
}

function NotificationItem({ item, onRead }) {
  const Icon = item.resultStatus === "success" ? CircleCheck : item.resultStatus === "failed" ? CircleAlert : Info;
  return <button className={`fm-notification-item ${item.isRead ? "is-read" : ""}`} type="button" onClick={() => !item.isRead && onRead?.([item.id])}>
    <Icon size={18} /><span><strong>{item.title}</strong><small>{item.content}</small><time>{formatTime(item.createdAt)}</time></span>{!item.isRead && <i aria-label="未读" />}
  </button>;
}

export function NotificationCenter({ center, activeTab, onTabChange, onPageChange, onRead, onReadAll }) {
  const items = activeTab === "system" ? center.systemNotifications : center.taskNotifications;
  const pagination = center.pagination || { page: 1, totalPages: 1, total: 0 };
  const unread = items.filter((item) => !item.isRead).length;
  const taskUnread = center.unreadByCategory?.task || 0;
  return <section className="fm-notification-center" aria-label="通知中心">
    <header><strong>通知中心</strong>{unread > 0 && <button type="button" onClick={() => onReadAll?.(activeTab)}><CheckCheck size={15} />全部已读</button>}</header>
    <div className="fm-notification-tabs" role="tablist">
      <button type="button" role="tab" aria-selected={activeTab === "system"} className={activeTab === "system" ? "is-active" : ""} onClick={() => onTabChange("system")}><Info size={15} />系统通知</button>
      <button type="button" role="tab" aria-selected={activeTab === "task"} className={activeTab === "task" ? "is-active" : ""} onClick={() => onTabChange("task")}><PackageCheck size={15} />订单与任务{taskUnread ? ` (${taskUnread})` : ""}</button>
    </div>
    <div className="fm-notification-list">{items.length ? items.map((item) => <NotificationItem key={item.id} item={item} onRead={onRead} />) : <p className="fm-notification-empty">暂无{activeTab === "system" ? "系统" : "订单或任务"}通知</p>}</div>
    {pagination.totalPages > 1 && <footer className="fm-notification-pagination"><span>第 {pagination.page} / {pagination.totalPages} 页</span><div><button type="button" disabled={pagination.page <= 1} onClick={() => onPageChange?.(pagination.page - 1)}>上一页</button><button type="button" disabled={pagination.page >= pagination.totalPages} onClick={() => onPageChange?.(pagination.page + 1)}>下一页</button></div></footer>}
  </section>;
}
