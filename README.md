# GamakGenerator (ProcEngine V2)

Универсальный нодовый движок процедурной генерации на базе **Rust** и **Tauri**.

## Текущие возможности
- **Node-Based Workflow**: Визуальное программирование алгоритмов генерации.
- **Advanced Point Scattering**: Генерация облаков точек с поддержкой различных распределений (Uniform, Gaussian), Edge Gravity и Clumping.
- **Geometry Engine**: Поддержка полигонов, расчет Convex Hull (выпуклой оболочки) в реальном времени.
- **Masking System**: Ограничение генерации по растровым маскам (изображениям).
- **Physics**: SAT-based физика расталкивания объектов.
- **Interactive UI**: Кастомный редактор со сплиттерами, инспектором параметров и производительным Viewport на Canvas.

## Технологический стек
- **Backend**: Rust (Tauri, nalgebra, geo, rand_chacha).
- **Frontend**: React, TypeScript, ReactFlow, TailwindCSS.

## Запуск
```bash
npm install
npm run tauri dev
```
