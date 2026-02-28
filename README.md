# 启思 Keysight

一个面向问卷交叉表（Excel）分析的本地前端工具，支持：
- Excel 结构映射解析（题目行/一级列头/二级列头/数据起始列）
- 题目与 Header 的一级/二级多选联动
- 多视图管理（保存不同筛选组合）
- 表格卡片展示（顺序、数据类型、小数位、灯泡高亮）
- 复制当前卡片 / 复制当前页面
- 配置导入导出（JSON）
- 生成可双击打开的单文件版本（`index.single.html`）

## 仓库地址

- GitHub: [non-optimized-git/keysight](https://github.com/non-optimized-git/keysight)

## 技术栈

- React 18 + TypeScript
- Vite 5
- Tailwind CSS
- SheetJS (`xlsx`)

## 本地开发

```bash
npm install
npm run dev
```

默认会启动 Vite 开发服务（通常是 `http://localhost:5173`）。

## 生产构建

```bash
npm run build
```

构建产物在 `dist/`。

## 单文件使用（离线分发）

项目根目录已有可直接双击打开的文件：

- `index.single.html`

适合发给不需要 Node 环境的使用者进行演示和本地使用。

## 主要交互说明

### 1) 映射
上传 Excel 后，先完成映射：
- 选择题目所在单元行
- 选择一级表头所在单元格
- 选择二级表头所在单元格
- 选择有数据的第一列

> 行标签列固定为第 0 列。

### 2) 题目/行选择
左侧题目树支持：
- 一级题目勾选
- 二级行（如 NET/MEAN）独立勾选
- 同名行按“行索引”区分，不会互相串选

### 3) Header 选择
上方 Header 区域支持一级与二级展开选择，右侧卡片按当前选择展示。

### 4) 卡片阅读
每个卡片支持：
- 数据类型切换（`%` / `Abs`）
- 小数位设置
- 顺序（默认 / 升序 / 降序）
- 灯泡高亮（每行最高值）
- 删除当前卡片
- 复制当前卡片

### 5) 无 bar 行规则
以下行不显示 bar 背景：
- `Column n`
- `Total / TOTAL`
- `合计 / 总计`

### 6) 视图与配置
- 可新建/重命名/删除视图
- 可导出当前配置为 JSON
- 可导入历史配置复用分析口径

## 目录结构（核心）

```text
src/
  components/
    layout/           # 顶部、侧栏、映射弹窗
    views/            # 数据卡片、Header 区、视图 Tab
    ui/               # 基础组件（按钮/弹窗）
  hooks/              # 解析、配置、错误日志等
  utils/              # 解析与过滤工具函数
  types/              # 类型定义
  main.tsx            # 入口
```

## 常见命令

```bash
npm run dev      # 本地开发
npm run build    # 生产构建
npm run preview  # 本地预览构建结果
npm run test     # 测试
```

## 注意事项

- 建议使用现代浏览器（Chrome/Edge/Safari 最新版）。
- Excel 文件建议保留标准结构（Table of contents / Abs / % / %Sig）。
- 大文件下首次解析可能需要几秒钟。

## License

当前仓库未单独声明 License；如需对外发布，建议补充 `LICENSE` 文件。
