# 自定义报纸壳（可选）

与默认 **`devpaper build …`** 配合：在此目录放置 **`{id}.html`**，并在 **`devpaper/assets/user/{id}.css`** 放置同名样式，构建后会出现在各日 **`YYYY-MM-DD.html`** 顶栏的**版式下拉框**里（与各 `tpl-<id>.html` 对应）。

## 占位符（与内置 `newspaper` 相同）

`{id}.html` 内需包含：

- `{{INLINE_CSS}}` — 由构建注入 `{id}.css` 全文  
- `{{MASTHEAD_DATE}}`、`{{FILE_DATE}}`（任意位置单独用文件名日期）
- `{{FILE_DATE_SECONDARY}}` — 报头用：仅当一级标题日与文件名日**不同**时输出 ` · YYYY-MM-DD` 片段（含 `span`），与 `newspaper.html` 一致；避免两日期相同却写两遍  
- `{{BODY_CLASS}}`  
- `{{ARTICLES}}` — 文章区 HTML 与内置日报一致（头版/要闻/简讯或文摘）

可从 `../newspaper.html` 复制后改 class 与排版。

## 展示名（可选）

在同目录增加 **`catalog.json`**：

```json
[
  { "id": "acme", "label": "企业简报" }
]
```

`id` 须与文件名一致（仅小写字母、数字、中划线）。**勿**与内置保留 id 冲突：`newspaper`、`broadsheet`、`reader`、`reader-night`。
