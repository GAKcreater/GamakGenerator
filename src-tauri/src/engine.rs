use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use nalgebra::{Point2, Vector2};
use geo::{Polygon, Contains, BoundingRect, LineString};
use rand::{Rng, SeedableRng};
use rand_chacha::ChaCha8Rng;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ProcPoint {
    pub pos: Point2<f32>,
    pub attributes: HashMap<String, f32>,
    pub tags: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ProcPath {
    pub points: Vec<Point2<f32>>,
    pub is_closed: bool,
    pub attributes: HashMap<String, f32>,
    pub tags: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ProcPolygon {
    pub exterior: Vec<Point2<f32>>,
    pub holes: Vec<Vec<Point2<f32>>>,
    pub attributes: HashMap<String, f32>,
    pub tags: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "type", content = "data")]
pub enum ProcEntity {
    Point(ProcPoint),
    Path(ProcPath),
    Polygon(ProcPolygon),
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "type", content = "data")]
#[serde(rename_all = "camelCase")]
pub enum MaskSource {
    Image { path: String, scale: f32, centerX: f32, centerY: f32 },
    Polygon(ProcPolygon),
}

fn to_geo_poly(proc_poly: &ProcPolygon) -> Polygon<f32> {
    let ext: Vec<(f32, f32)> = proc_poly.exterior.iter().map(|p| (p.x, p.y)).collect();
    let holes: Vec<LineString<f32>> = proc_poly.holes.iter()
        .map(|h| LineString::from(h.iter().map(|p| (p.x, p.y)).collect::<Vec<(f32, f32)>>()))
        .collect();
    Polygon::new(LineString::from(ext), holes)
}

#[tauri::command]
pub fn get_mask_info(path: String) -> Option<HashMap<String, u32>> {
    use image::GenericImageView;
    image::open(path).ok().map(|img| {
        let (w, h) = img.dimensions();
        let mut res = HashMap::new();
        res.insert("width".to_string(), w);
        res.insert("height".to_string(), h);
        res
    })
}

#[tauri::command]
pub fn generate_test_points(
    count: usize, 
    radius: f32, 
    centerX: f32,
    centerY: f32,
    seed: u64,
    masks: Vec<MaskSource>,
    distribution: String,
    gravity: f32,
    clumping: f32
) -> Vec<ProcPoint> {
    use image::GenericImageView;
    let mut rng = ChaCha8Rng::seed_from_u64(seed);
    
    let mut images = HashMap::new();
    for mask in &masks {
        if let MaskSource::Image { path, .. } = mask {
            if let Ok(img) = image::open(path) { images.insert(path.clone(), img); }
        }
    }

    let mut points = Vec::new();
    let mut attempts = 0;
    let max_attempts = count * 200;

    while points.len() < count && attempts < max_attempts {
        attempts += 1;
        
        let (mut rx, mut ry) = match distribution.as_str() {
            "Gaussian" => {
                let u1: f32 = rng.gen();
                let u2: f32 = rng.gen();
                let mag = (-2.0 * u1.ln().max(-100.0)).sqrt();
                (
                    mag * (2.0 * std::f32::consts::PI * u2).cos() * (radius * 0.4),
                    mag * (2.0 * std::f32::consts::PI * u2).sin() * (radius * 0.4)
                )
            },
            "Uniform" => {
                let angle: f32 = rng.gen_range(0.0..std::f32::consts::TAU);
                let r: f32 = rng.gen_range(0.0..radius);
                (angle.cos() * r, angle.sin() * r)
            },
            _ => (
                (rng.gen::<f32>() - 0.5) * radius * 2.0,
                (rng.gen::<f32>() - 0.5) * radius * 2.0
            )
        };

        if gravity != 0.0 {
            let d = (rx*rx + ry*ry).sqrt();
            if d > 0.1 {
                let ratio = d / radius;
                let power = if gravity > 0.0 { 1.0 / (1.0 + gravity * 2.0) } else { 1.0 + gravity.abs() * 2.0 };
                let new_ratio = ratio.powf(power);
                let factor = (new_ratio * radius) / d;
                rx *= factor; ry *= factor;
            }
        }

        let x = rx + centerX;
        let y = ry + centerY;

        let mut allowed = true;
        for mask in &masks {
            match mask {
                MaskSource::Image { path, scale, centerX: mcx, centerY: mcy } => {
                    if let Some(img) = images.get(path) {
                        let (w, h) = img.dimensions();
                        let mx = (((x - mcx) / scale) + w as f32 / 2.0) as i32;
                        let my = (((y - mcy) / scale) + h as f32 / 2.0) as i32;
                        if mx >= 0 && mx < (w as i32) && my >= 0 && my < (h as i32) {
                            let pixel = img.get_pixel(mx as u32, my as u32);
                            if rng.gen::<f32>() > (pixel[0] as f32 / 255.0) { allowed = false; break; }
                        } else { allowed = false; break; }
                    }
                },
                MaskSource::Polygon(poly) => {
                    let geo_poly = to_geo_poly(poly);
                    if !geo_poly.contains(&geo::Point::new(x, y)) { allowed = false; break; }
                }
            }
        }

        if allowed {
            points.push(ProcPoint { pos: Point2::new(x, y), attributes: HashMap::new(), tags: vec!["gen".to_string()] });
        }
    }

    if clumping > 0.0 && points.len() > 1 {
        let original = points.clone();
        for i in 0..points.len() {
            let mut nearest_idx = 0;
            let mut min_dist = f32::MAX;
            for j in 0..original.len() {
                if i == j { continue; }
                let d = nalgebra::distance(&points[i].pos, &original[j].pos);
                if d < min_dist { min_dist = d; nearest_idx = j; }
            }
            if min_dist < radius * 0.5 {
                let dir = (original[nearest_idx].pos - points[i].pos).normalize();
                points[i].pos += dir * (min_dist * clumping * 0.5);
            }
        }
    }
    points
}

#[tauri::command]
pub fn apply_physics(mut points: Vec<ProcPoint>, iterations: usize) -> Vec<ProcPoint> {
    let radius = 10.0;
    for _ in 0..iterations {
        let mut moved = false;
        let original = points.clone();
        for i in 0..points.len() {
            for j in 0..original.len() {
                if i == j { continue; }
                let p1 = points[i].pos;
                let p2 = original[j].pos;
                let dist = nalgebra::distance(&p1, &p2);
                if dist < radius * 2.0 && dist > 0.001 {
                    let overlap = radius * 2.0 - dist;
                    let dir = (p1 - p2).normalize();
                    points[i].pos += dir * (overlap * 0.5);
                    moved = true;
                }
            }
        }
        if !moved { break; }
    }
    points
}

#[tauri::command]
pub fn generate_convex_hull(points: Vec<ProcPoint>) -> ProcPolygon {
    if points.len() <= 2 {
        return ProcPolygon { exterior: points.iter().map(|p| p.pos).collect(), holes: vec![], attributes: HashMap::new(), tags: vec![] };
    }
    let mut pts: Vec<Point2<f32>> = points.iter().map(|p| p.pos).collect();
    pts.sort_by(|a, b| a.x.partial_cmp(&b.x).unwrap().then(a.y.partial_cmp(&b.y).unwrap()));
    let mut lower = Vec::new();
    fn cross(o: Point2<f32>, a: Point2<f32>, b: Point2<f32>) -> f32 { (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x) }
    for p in &pts {
        while lower.len() >= 2 && cross(lower[lower.len() - 2], lower[lower.len() - 1], *p) <= 0.0 { lower.pop(); }
        lower.push(*p);
    }
    let mut upper = Vec::new();
    for p in pts.iter().rev() {
        while upper.len() >= 2 && cross(upper[upper.len() - 2], upper[upper.len() - 1], *p) <= 0.0 { upper.pop(); }
        upper.push(*p);
    }
    lower.pop(); upper.pop(); lower.extend(upper);
    ProcPolygon { exterior: lower, holes: vec![], attributes: HashMap::new(), tags: vec![] }
}
