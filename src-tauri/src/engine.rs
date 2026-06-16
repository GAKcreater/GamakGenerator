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

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct MaskInfo {
    pub width: u32,
    pub height: u32,
}

#[tauri::command]
pub fn get_mask_info(path: String) -> Option<MaskInfo> {
    use image::GenericImageView;
    image::open(path).ok().map(|img| {
        let (w, h) = img.dimensions();
        MaskInfo { width: w, height: h }
    })
}

// Команда для применения физики расталкивания
#[tauri::command]
pub fn apply_physics(mut points: Vec<ProcPoint>, iterations: usize) -> Vec<ProcPoint> {
    let radius = 10.0; // Базовый радиус "тела" точки
    
    for _ in 0..iterations {
        let mut moved = false;
        
        // Квадратичная проверка (для MVP пойдет, позже заменим на Spatial Hash)
        for i in 0..points.len() {
            for j in 0..points.len() {
                if i == j { continue; }
                
                let p1 = points[i].pos;
                let p2 = points[j].pos;
                let dist = nalgebra::distance(&p1, &p2);
                
                if dist < radius * 2.0 && dist > 0.001 {
                    let overlap = radius * 2.0 - dist;
                    let dir = (p1 - p2).normalize();
                    let push = dir * (overlap * 0.5);
                    
                    points[i].pos += push;
                    moved = true;
                }
            }
        }
        if !moved { break; }
    }
    
    points
}

// Обновленная функция генерации с поддержкой маски, масштаба и центров
#[tauri::command]
pub fn generate_test_points(
    count: usize, 
    mask_path: Option<String>, 
    radius: f32, 
    mask_scale: f32,
    mask_center_x: f32,
    mask_center_y: f32,
    center_x: f32,
    center_y: f32
) -> Vec<ProcPoint> {
    use std::time::{SystemTime, UNIX_EPOCH};
    use image::GenericImageView;
    
    let mut seed = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_micros() as u32;
    let mut next_rand = || {
        seed = seed.wrapping_mul(1103515245).wrapping_add(12345);
        (seed % 1000) as f32 / 1000.0
    };

    let img = mask_path.and_then(|p| image::open(p).ok());

    let mut points = Vec::new();
    let mut attempts = 0;
    let max_attempts = count * 100;

    while points.len() < count && attempts < max_attempts {
        attempts += 1;
        
        // Генерируем точку относительно центра спавна
        let rx = (next_rand() - 0.5) * radius * 2.0;
        let ry = (next_rand() - 0.5) * radius * 2.0;
        
        let x = rx + center_x;
        let y = ry + center_y;

        if let Some(ref mask) = img {
            let (w, h) = mask.dimensions();
            
            // Проверка по маске учитывает мировые координаты точки
            let mx = (((x - mask_center_x) / mask_scale) + w as f32 / 2.0) as i32;
            let my = (((y - mask_center_y) / mask_scale) + h as f32 / 2.0) as i32;

            if mx >= 0 && mx < (w as i32) && my >= 0 && my < (h as i32) {
                let pixel = mask.get_pixel(mx as u32, my as u32);
                let brightness = pixel[0] as f32 / 255.0;
                
                if next_rand() > brightness {
                    continue;
                }
            } else {
                continue;
            }
        }

        points.push(ProcPoint {
            pos: Point2::new(x, y),
            attributes: HashMap::new(),
            tags: vec!["gen".to_string()],
        });
    }
    
    points
}

fn cross_product(o: Point2<f32>, a: Point2<f32>, b: Point2<f32>) -> f32 {
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
}

#[tauri::command]
pub fn generate_convex_hull(points: Vec<ProcPoint>) -> ProcPolygon {
    if points.len() <= 2 {
        return ProcPolygon {
            exterior: points.iter().map(|p| p.pos).collect(),
            holes: vec![],
            attributes: HashMap::new(),
            tags: vec!["insufficient_points".to_string()],
        };
    }

    let mut pts: Vec<Point2<f32>> = points.iter().map(|p| p.pos).collect();
    pts.sort_by(|a, b| a.x.partial_cmp(&b.x).unwrap().then(a.y.partial_cmp(&b.y).unwrap()));

    let mut lower = Vec::new();
    for p in &pts {
        while lower.len() >= 2 && cross_product(lower[lower.len() - 2], lower[lower.len() - 1], *p) <= 0.0 {
            lower.pop();
        }
        lower.push(*p);
    }

    let mut upper = Vec::new();
    for p in pts.iter().rev() {
        while upper.len() >= 2 && cross_product(upper[upper.len() - 2], upper[upper.len() - 1], *p) <= 0.0 {
            upper.pop();
        }
        upper.push(*p);
    }

    lower.pop();
    upper.pop();
    lower.extend(upper);

    ProcPolygon {
        exterior: lower,
        holes: vec![],
        attributes: HashMap::new(),
        tags: vec!["convex_hull".to_string()],
    }
}
