# ProcEngine V2 🛰
**High-performance Node-based Spatial Generation Tool**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Rust](https://img.shields.io/badge/backend-Rust-orange.svg)
![React](https://img.shields.io/badge/frontend-React-blue.svg)
![Tauri](https://img.shields.io/badge/shell-Tauri_2.0-red.svg)

ProcEngine V2 — это современный инструмент для процедурной генерации пространств (лесов, городов, подземелий), построенный на принципах **Data-Flow Graph**. Система разделяет визуальное проектирование алгоритмов и высокопроизводительные вычисления.

---

## 🚀 Key Features

*   **Node-Based Architecture:** Проектируйте сложные алгоритмы генерации с помощью визуальных узлов.
*   **Rust-Powered Core:** Все геометрические и физические расчеты выполняются на Rust с использованием библиотеки `nalgebra`.
*   **Interactive Viewport:** Реал-тайм предпросмотр результата с поддержкой Zoom/Pan и визуальными маркерами.
*   **Advanced Masking:** Использование растровых изображений (PNG/JPG) как карт вероятностей для спавна объектов.
*   **SAT Physics:** Встроенная поддержка алгоритма Separating Axis Theorem для корректного расталкивания объектов.
*   **Modular & Embedded:** Ядро полностью отделено от графики и может быть интегрировано в любой C++ или C# проект.

---

## 🛠 Tech Stack

*   **Backend:** [Rust](https://www.rust-lang.org/) (Safety & Performance)
*   **Frontend:** [React](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
*   **Graph Engine:** [React Flow](https://reactflow.dev/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **Desktop Shell:** [Tauri 2.0](https://tauri.app/)
*   **Math:** [nalgebra](https://nalgebra.org/)

---

## 📸 Screenshots

*(Coming Soon: GIFs of node interaction and mask filtering)*

---

## 🚦 Getting Started

### Prerequisites
*   [Rust](https://www.rust-lang.org/tools/install) (1.80+)
*   [Node.js](https://nodejs.org/) (20+)

### Installation
1.  Clone the repository:
    ```bash
    git clone https://github.com/GAKcreater/Procedural-Generator-Engine.git
    cd Procedural-Generator-Engine
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Run in development mode:
    ```bash
    npm run tauri dev
    ```

---

## 🗺 Roadmap

- [x] **Phase 1: Foundation.** Tauri + Rust + React integration.
- [x] **Phase 2: Core Data Flow.** Connections, basic generators, and interactive viewport.
- [ ] **Phase 3: Geometry.** Polygon constructors and boolean operations.
- [ ] **Phase 4: Persistence.** JSON Save/Load system for projects.
- [ ] **Phase 5: Sub-Graphs.** Fractal generation support.

---

## 👨‍💻 Author
**Daniil (GAKcreater)**
*Technical Project Manager & Developer*

Designed as a key component for the [GamakEngine](https://github.com/GAKcreater/GamakEngineProject-master) ecosystem.
