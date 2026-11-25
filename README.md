# Telepad (Vue 3 + FastAPI)

Telegram Saved Messages 风格的本地笔记应用 —— 使用 **Vue 3 + TypeScript + Pinia** 与 **FastAPI + SQLAlchemy 2.0 + SQLite** 重构实现，保留 100% 功能、API 契约、JSON 备份格式与日/夜双主题视觉体验。

## 目录结构

```text
telepad-vue-fastapi/
├── backend/          # FastAPI + SQLAlchemy 2.0 + Pydantic v2（uv 管理，默认端口 8000）
├── frontend/         # Vue 3 + TypeScript + Pinia + Vite（默认端口 5174）
└── data/             # 独立本地持久化目录（SQLite、上传图片、自动同步 Markdown 镜像）
```

## 快速启动

### 1. 启动后端（FastAPI，端口 8000）

```bash
cd backend
uv sync
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

访问 API 文档：`http://127.0.0.1:8000/docs`

### 2. 启动前端（Vue 3 + Vite，端口 5174）

```bash
cd frontend
npm install
npm run dev
```

打开浏览器访问：`http://127.0.0.1:5174`

## 生产构建与单服务托管

```bash
cd frontend && npm run build
cd ../backend && TELEPAD_SERVE_STATIC=1 uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
```

## 运行测试

```bash
# 后端单元测试与全生命周期 API 测试
cd backend && uv run pytest -v

# 前端类型检查与构建验证
cd frontend && npm run build
```
