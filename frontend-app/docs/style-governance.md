# 样式治理与检查口径

## 重复选择器

项目保留两种统计，二者不能直接比较：

| 指标 | 脚本 | 含义 | 使用方式 |
| --- | --- | --- | --- |
| `contextualDuplicateSelectors` | `npm.cmd run check:redundancy` | 在相同 `@media`、`@container`、`@scope` 等上下文内出现多次的同一选择器；忽略动画规则和 SCSS 父级嵌套选择器。 | 阻断门禁，当前上限为 45。新增时用 `--duplicate-details` 定位并合并或说明原因。 |
| `rawSelectorOccurrences` | `npm.cmd run check:styles` | 样式源中原始规则层面出现多次的选择器数。合法的响应式、状态变体也可能计入。 | 趋势指标，不单独阻断；显著增加时审查是否新增无效覆盖。 |

## 样式入口

- `src/main.jsx` 只能导入全局层样式，不能导入 feature 样式。
- 页面 JSX 每个功能只导入一个 `*Styles.css` 或 `*Styles.scss` 入口；入口文件只负责确定导入顺序。
- 排序固定为：基础布局 → 业务区域 → 状态/预览 → 响应式 → 兼容覆盖。
- 禁止新增 `final`、`fix`、`temporary`、`override` 一类临时文件。第三方兼容样式必须集中在明确命名的 `vendor-compat` 文件，并写明依赖与删除条件。

## 必跑命令

```powershell
npm.cmd run check:coverage
npm.cmd run check:redundancy
npm.cmd run check:styles
npm.cmd run check:breakpoints
npm.cmd run check:style-entrypoints
npm.cmd run audit:assets
npm.cmd run audit:style-transitions
npm.cmd run build
npm.cmd run test
```
