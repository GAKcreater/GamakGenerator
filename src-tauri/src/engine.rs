use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use nalgebra::{Point2, Vector2};

/// Базовая структура для "умной" точки (PROC-12)
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ProcPoint {
    pub pos: Point2<f32>,
    pub attributes: HashMap<String, f32>,
    pub tags: Vec<String>,
}

/// Структура для путей и ломаных линий
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ProcPath {
    pub points: Vec<Point2<f32>>,
    pub is_closed: bool,
    pub attributes: HashMap<String, f32>,
    pub tags: Vec<String>,
}

/// Структура для полноценных полигонов (с поддержкой дырок)
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ProcPolygon {
    pub exterior: Vec<Point2<f32>>,
    pub holes: Vec<Vec<Point2<f32>>>,
    pub attributes: HashMap<String, f32>,
    pub tags: Vec<String>,
}

/// Универсальный контейнер-объект (тот самый "Object")
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ProcObject {
    pub id: String,
    pub position: Point2<f32>,
    pub rotation: f32, // в радианах
    pub scale: Vector2<f32>,
    pub children: Vec<ProcEntity>,
    pub tags: Vec<String>,
}

/// Перечисление всех возможных типов сущностей в нашем мире
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "type", content = "data")]
pub enum ProcEntity {
    Point(ProcPoint),
    Path(ProcPath),
    Polygon(ProcPolygon),
    Object(ProcObject),
}

/// Контекст генерации (наша "общая память")
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ProcContext {
    pub seed: u32,
    pub layers: HashMap<String, Vec<ProcEntity>>,
}

// Пример функции, которую мы будем вызывать из React
#[tauri::command]
pub fn generate_test_points(count: usize) -> Vec<ProcPoint> {
    let mut points = Vec::new();
    for i in 0..count {
        points.push(ProcPoint {
            pos: Point2::new(i as f32 * 10.0, 0.0),
            attributes: HashMap::new(),
            tags: vec!["test".to_string()],
        });
    }
    points
}
