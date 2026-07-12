use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use nalgebra::{Point2, Vector2};
use geo::{Polygon, Contains, BoundingRect, LineString};
use rand::{Rng, SeedableRng};
use rand_chacha::ChaCha8Rng;

#[derive(Debug, Clone)]
pub struct RasterMask {
    pub data: Vec<bool>,
    pub width: usize,
    pub height: usize,
    pub min_x: f32,
    pub min_y: f32,
    pub resolution: f32,
}

impl RasterMask {
    pub fn is_inside(&self, x: f32, y: f32) -> bool {
        if x < self.min_x || y < self.min_y { return false; }
        let ix = ((x - self.min_x) / self.resolution) as usize;
        let iy = ((y - self.min_y) / self.resolution) as usize;
        if ix >= self.width || iy >= self.height { return false; }
        self.data[iy * self.width + ix]
    }
}

fn rasterize_polygon(poly: &ProcPolygon, resolution: f32) -> Option<RasterMask> {
    let mut min_x = f32::MAX; let mut min_y = f32::MAX;
    let mut max_x = f32::MIN; let mut max_y = f32::MIN;

    let all_rings = std::iter::once(&poly.exterior).chain(poly.holes.iter());
    for ring in all_rings.clone() {
        for p in ring {
            if p.x < min_x { min_x = p.x; }
            if p.y < min_y { min_y = p.y; }
            if p.x > max_x { max_x = p.x; }
            if p.y > max_y { max_y = p.y; }
        }
    }

    if min_x == f32::MAX { return None; }

    let width = ((max_x - min_x) / resolution).ceil() as usize + 1;
    let height = ((max_y - min_y) / resolution).ceil() as usize + 1;
    let mut data = vec![false; width * height];

    for iy in 0..height {
        let y = min_y + (iy as f32) * resolution;
        let mut intersections = Vec::new();

        for ring in all_rings.clone() {
            let len = ring.len();
            for i in 0..len {
                let p1 = ring[i];
                let p2 = ring[(i + 1) % len];

                // Check if scanline y intersects the edge (p1, p2)
                let (up, down) = if p1.y < p2.y { (p1, p2) } else { (p2, p1) };

                // Strict inequality on one side prevents double-counting vertices
                if y >= up.y && y < down.y {
                    let intersect_x = up.x + (y - up.y) * (down.x - up.x) / (down.y - up.y);
                    intersections.push(intersect_x);
                }
            }
        }

        intersections.sort_by(|a, b| a.partial_cmp(b).unwrap());

        let mut chunks = intersections.chunks(2);
        while let Some(chunk) = chunks.next() {
            if chunk.len() == 2 {
                let start_x = chunk[0];
                let end_x = chunk[1];
                let start_ix = ((start_x - min_x) / resolution).ceil() as i32;
                let end_ix = ((end_x - min_x) / resolution).floor() as i32;

                let start_ix = start_ix.max(0) as usize;
                let end_ix = end_ix.min((width as i32) - 1) as usize;

                for ix in start_ix..=end_ix {
                    data[iy * width + ix] = true;
                }
            }
        }
    }

    Some(RasterMask {
        data,
        width,
        height,
        min_x,
        min_y,
        resolution,
    })
}


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
pub enum MaskSource {
    ThresholdedMap {
        map: MapSource,
        threshold: f32,
    },
    Polygon(ProcPolygon),
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "type", content = "data")]
pub enum MapSource {
    Image {
        path: String,
        scale: f32,
        #[serde(rename = "centerX")]
        center_x: f32,
        #[serde(rename = "centerY")]
        center_y: f32
    }
}

fn to_geo_poly(proc_poly: &ProcPolygon) -> Polygon<f32> {
    let mut ext: Vec<(f32, f32)> = proc_poly.exterior.iter().map(|p| (p.x, p.y)).collect();
    if let (Some(first), Some(last)) = (ext.first(), ext.last()) {
        if first.0 != last.0 || first.1 != last.1 {
            ext.push(*first);
        }
    }
    let holes: Vec<LineString<f32>> = proc_poly.holes.iter()
        .map(|h| {
            let mut h_vec: Vec<(f32, f32)> = h.iter().map(|p| (p.x, p.y)).collect();
            if let (Some(first), Some(last)) = (h_vec.first(), h_vec.last()) {
                if first.0 != last.0 || first.1 != last.1 {
                    h_vec.push(*first);
                }
            }
            LineString::from(h_vec)
        })
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
    maps: Vec<MapSource>,
    distribution: String,
    gravity: f32,
    clumping: f32,
    edgeReference: String
) -> Vec<ProcPoint> {
    use image::GenericImageView;
    let mut rng = ChaCha8Rng::seed_from_u64(seed);

    let mut images = HashMap::new();
    let mut raster_masks: HashMap<String, RasterMask> = HashMap::new();


    let mut load_map_image = |map_source: &MapSource| {
        if let MapSource::Image { path, .. } = map_source {
            if !images.contains_key(path) {
                if let Ok(img) = image::open(path) { images.insert(path.clone(), img); }
            }
        }
    };

    for mask in &masks {
        if let MaskSource::ThresholdedMap { map, .. } = mask {
            load_map_image(map);
        }
    }
    for map in &maps {
        load_map_image(map);
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

        if gravity != 0.0 && edgeReference == "Circle" {
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

        let mut prob = 1.0;
        for map in &maps {
            if let MapSource::Image { path, scale, center_x: mcx, center_y: mcy } = map {
                if let Some(img) = images.get(path) {
                    let (w, h) = img.dimensions();
                    let mx = (((x - mcx) / scale) + w as f32 / 2.0) as i32;
                    let my = (((y - mcy) / scale) + h as f32 / 2.0) as i32;
                    if mx >= 0 && mx < (w as i32) && my >= 0 && my < (h as i32) {
                        let pixel = img.get_pixel(mx as u32, my as u32);
                        prob *= pixel[0] as f32 / 255.0;
                    } else {
                        prob = 0.0;
                    }
                }
            }
        }

        if rng.gen::<f32>() > prob {
            continue;
        }

        let mut allowed = true;
        let mut min_dist_to_edge = f32::MAX;
        let mut has_poly_mask = false;

        for mask in &masks {
            match mask {
                MaskSource::ThresholdedMap { map, threshold } => {
                    if let MapSource::Image { path, scale, center_x: mcx, center_y: mcy } = map {
                        if let Some(img) = images.get(path) {
                            let (w, h) = img.dimensions();
                            let mx = (((x - mcx) / scale) + w as f32 / 2.0) as i32;
                            let my = (((y - mcy) / scale) + h as f32 / 2.0) as i32;
                            if mx >= 0 && mx < (w as i32) && my >= 0 && my < (h as i32) {
                                let pixel = img.get_pixel(mx as u32, my as u32);
                                let val = pixel[0] as f32 / 255.0;
                                if val <= *threshold {
                                    allowed = false; break;
                                }
                            } else { allowed = false; break; }
                        }
                    }
                },
                MaskSource::Polygon(poly) => {
                    use std::hash::{Hash, Hasher};
                    use std::collections::hash_map::DefaultHasher;

                    let mut hasher = DefaultHasher::new();
                    poly.exterior.iter().for_each(|p| {
                        let bits = p.x.to_bits();
                        bits.hash(&mut hasher);
                        let bits = p.y.to_bits();
                        bits.hash(&mut hasher);
                    });
                    let poly_hash = format!("{:x}", hasher.finish());
                    let poly_key = &poly_hash[0..8];

                    if !raster_masks.contains_key(poly_key) {
                        if let Some(raster) = rasterize_polygon(poly, 2.0) { // 2.0 is resolution
                            raster_masks.insert(poly_key.to_string(), raster);
                        } else {
                             allowed = false; break;
                        }
                    }

                    if let Some(raster) = raster_masks.get(poly_key) {
                        if !raster.is_inside(x, y) {
                             allowed = false; break;
                        } else {
                            has_poly_mask = true;
                            // This part is tricky. Raster gives fast inside/outside,
                            // but distance to edge is expensive. We'll approximate.
                            let ix = ((x - raster.min_x) / raster.resolution) as i32;
                            let iy = ((y - raster.min_y) / raster.resolution) as i32;
                            let mut min_d2 = i32::MAX;
                            'search: for r in 1..((raster.width + raster.height) as i32) {
                                for i in -r..=r {
                                    for j in [-r, r].iter() {
                                        let nx = ix + i;
                                        let ny = iy + j;
                                        if nx >= 0 && nx < raster.width as i32 && ny >= 0 && ny < raster.height as i32 {
                                            if !raster.data[(ny as usize) * raster.width + (nx as usize)] {
                                                min_d2 = r*r;
                                                break 'search;
                                            }
                                        } else { // Outside grid is outside polygon
                                            min_d2 = r*r;
                                            break 'search;
                                        }
                                        let nx = ix + j;
                                        let ny = iy + i;
                                         if nx >= 0 && nx < raster.width as i32 && ny >= 0 && ny < raster.height as i32 {
                                            if !raster.data[(ny as usize) * raster.width + (nx as usize)] {
                                                min_d2 = r*r;
                                                break 'search;
                                            }
                                        } else {
                                            min_d2 = r*r;
                                            break 'search;
                                        }
                                    }
                                }
                            }
                            let dist = (min_d2 as f32).sqrt() * raster.resolution;
                            if dist < min_dist_to_edge {
                                min_dist_to_edge = dist;
                            }
                        }
                    } else {
                         allowed = false; break;
                    }
                }
            }
        }

        if allowed && has_poly_mask && gravity != 0.0 && edgeReference == "Mask" {
            let ref_dist = (radius * 0.25).max(10.0);
            let nd = (min_dist_to_edge / ref_dist).clamp(0.0, 1.0);

            let g_prob = if gravity > 0.0 {
                (1.0 - nd).powf(gravity * 3.0)
            } else {
                nd.powf(gravity.abs() * 3.0)
            };

            if rng.gen::<f32>() > g_prob {
                continue;
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
pub fn generate_hull(
    points: Vec<ProcPoint>,
    algorithm: String,
    radius: f32,
    resolution: f32
) -> Vec<ProcPolygon> {
    if points.is_empty() { return vec![]; }

    if algorithm == "Metaballs" {
        println!("Metaballs started with {} points, radius: {}, res: {}", points.len(), radius, resolution);
        let mut min_x = f32::MAX; let mut min_y = f32::MAX;
        let mut max_x = f32::MIN; let mut max_y = f32::MIN;
        for p in &points {
            if p.pos.x < min_x { min_x = p.pos.x; }
            if p.pos.y < min_y { min_y = p.pos.y; }
            if p.pos.x > max_x { max_x = p.pos.x; }
            if p.pos.y > max_y { max_y = p.pos.y; }
        }
        let padding = radius * 2.5;
        min_x -= padding; min_y -= padding;
        max_x += padding; max_y += padding;

        let cols = ((max_x - min_x) / resolution).ceil() as usize + 2;
        let rows = ((max_y - min_y) / resolution).ceil() as usize + 2;
        println!("Grid size: {}x{}", cols, rows);

        let mut grid = vec![vec![0.0_f32; cols]; rows];
        let r2 = radius * radius;
        for y in 0..rows {
            let py = min_y + (y as f32) * resolution;
            for x in 0..cols {
                let px = min_x + (x as f32) * resolution;
                let mut sum = 0.0;
                for pt in &points {
                    let d2 = (px - pt.pos.x).powi(2) + (py - pt.pos.y).powi(2);
                    sum += r2 / (d2 + 0.0001);
                }
                grid[y][x] = sum;
            }
        }

        let threshold = 1.0;
        let mut segments: Vec<(Point2<f32>, Point2<f32>)> = Vec::new();

        for y in 0..rows-1 {
            for x in 0..cols-1 {
                let v00 = grid[y][x];
                let v10 = grid[y][x+1];
                let v11 = grid[y+1][x+1];
                let v01 = grid[y+1][x];

                let p00 = Point2::new(min_x + (x as f32)*resolution, min_y + (y as f32)*resolution);
                let p10 = Point2::new(min_x + ((x+1) as f32)*resolution, min_y + (y as f32)*resolution);
                let p11 = Point2::new(min_x + ((x+1) as f32)*resolution, min_y + ((y+1) as f32)*resolution);
                let p01 = Point2::new(min_x + (x as f32)*resolution, min_y + ((y+1) as f32)*resolution);

                let mut idx = 0;
                if v00 >= threshold { idx |= 1; }
                if v10 >= threshold { idx |= 2; }
                if v11 >= threshold { idx |= 4; }
                if v01 >= threshold { idx |= 8; }

                let interp = |v1: f32, v2: f32, p1: Point2<f32>, p2: Point2<f32>| -> Point2<f32> {
                    if (v2 - v1).abs() < 0.0001 { return p1; }
                    let t = (threshold - v1) / (v2 - v1);
                    Point2::new(p1.x + t * (p2.x - p1.x), p1.y + t * (p2.y - p1.y))
                };

                let top = || interp(v00, v10, p00, p10);
                let right = || interp(v10, v11, p10, p11);
                let bottom = || interp(v01, v11, p01, p11);
                let left = || interp(v00, v01, p00, p01);

                match idx {
                    1 | 14 => segments.push((left(), top())),
                    2 | 13 => segments.push((top(), right())),
                    4 | 11 => segments.push((right(), bottom())),
                    8 | 7  => segments.push((bottom(), left())),
                    3 | 12 => segments.push((left(), right())),
                    6 | 9  => segments.push((top(), bottom())),
                    5 => { segments.push((left(), top())); segments.push((right(), bottom())); },
                    10 => { segments.push((top(), right())); segments.push((bottom(), left())); },
                    _ => {}
                }
            }
        }

        let epsilon = resolution * 0.01;
        let mut rings: Vec<Vec<Point2<f32>>> = vec![];

        while !segments.is_empty() {
            let mut ring = vec![segments[0].0, segments[0].1];
            segments.remove(0);

            loop {
                let last = *ring.last().unwrap();
                let mut found = false;

                for i in 0..segments.len() {
                    if nalgebra::distance(&segments[i].0, &last) < epsilon {
                        ring.push(segments[i].1);
                        segments.remove(i);
                        found = true; break;
                    } else if nalgebra::distance(&segments[i].1, &last) < epsilon {
                        ring.push(segments[i].0);
                        segments.remove(i);
                        found = true; break;
                    }
                }
                if !found { break; }
            }
            if ring.len() > 2 {
                rings.push(ring);
            }
        }

        println!("Rings generated: {}", rings.len());
        rings.into_iter().map(|ring| ProcPolygon {
            exterior: ring,
            holes: vec![],
            attributes: HashMap::new(),
            tags: vec![]
        }).collect()

    } else if algorithm == "AlphaShape" {
        use spade::{DelaunayTriangulation, Triangulation, Point2 as SpadePoint2};
        let mut tr: DelaunayTriangulation<SpadePoint2<f32>> = DelaunayTriangulation::new();
        let mut pt_map = HashMap::new();

        for p in &points {
            if let Ok(handle) = tr.insert(SpadePoint2::new(p.pos.x, p.pos.y)) {
                pt_map.insert(handle.index(), p.pos);
            }
        }

        let mut edge_counts = HashMap::new();

        for face in tr.inner_faces() {
            let [p1, p2, p3] = face.positions();
            let a = ((p1.x - p2.x).powi(2) + (p1.y - p2.y).powi(2)).sqrt();
            let b = ((p2.x - p3.x).powi(2) + (p2.y - p3.y).powi(2)).sqrt();
            let c = ((p3.x - p1.x).powi(2) + (p3.y - p1.y).powi(2)).sqrt();

            let s = (a + b + c) / 2.0;
            let area = (s * (s - a) * (s - b) * (s - c)).sqrt();
            let r_circ = if area > 0.0001 { (a * b * c) / (4.0 * area) } else { f32::MAX };

            // We use radius parameter from UI as the alpha value (Max circumradius allowed)
            if r_circ <= radius {
                let v = face.vertices();
                let i1 = v[0].index();
                let i2 = v[1].index();
                let i3 = v[2].index();

                let mut add_edge = |mut i, mut j| {
                    if i > j { std::mem::swap(&mut i, &mut j); }
                    *edge_counts.entry((i, j)).or_insert(0) += 1;
                };

                add_edge(i1, i2);
                add_edge(i2, i3);
                add_edge(i3, i1);
            }
        }

        let mut adj: HashMap<usize, Vec<usize>> = HashMap::new();
        for ((u, v), count) in edge_counts {
            if count == 1 { // Boundary edges belong to exactly one valid triangle
                adj.entry(u).or_default().push(v);
                adj.entry(v).or_default().push(u);
            }
        }

        let mut rings: Vec<Vec<Point2<f32>>> = vec![];
        let mut visited = std::collections::HashSet::new();

        let keys: Vec<usize> = adj.keys().cloned().collect();
        for &start in &keys {
            if visited.contains(&start) { continue; }
            let mut ring = vec![];
            let mut curr = start;
            let mut prev = usize::MAX;

            loop {
                visited.insert(curr);
                if let Some(pos) = pt_map.get(&curr) {
                    ring.push(Point2::new(pos.x, pos.y));
                }

                let neighbors = adj.get(&curr).unwrap();
                let mut next = usize::MAX;
                for &n in neighbors {
                    if n != prev {
                        next = n;
                        break;
                    }
                }

                if next == usize::MAX || next == start {
                    break;
                }
                prev = curr;
                curr = next;
            }
            if ring.len() >= 3 {
                rings.push(ring);
            }
        }

        rings.into_iter().map(|ring| ProcPolygon {
            exterior: ring,
            holes: vec![],
            attributes: HashMap::new(),
            tags: vec![]
        }).collect()
    } else {
        // Convex hull
        if points.len() <= 2 {
            return vec![ProcPolygon { exterior: points.iter().map(|p| p.pos).collect(), holes: vec![], attributes: HashMap::new(), tags: vec![] }];
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
        vec![ProcPolygon { exterior: lower, holes: vec![], attributes: HashMap::new(), tags: vec![] }]
    }
}

#[tauri::command]
pub fn polygon_boolean(poly1: ProcPolygon, poly2: ProcPolygon, operation: String) -> Vec<ProcPolygon> {
    use geo::BooleanOps;

    let g1 = to_geo_poly(&poly1);
    let g2 = to_geo_poly(&poly2);

    let result_multipoly = match operation.as_str() {
        "union" => g1.union(&g2),
        "difference" | "subtract" => g1.difference(&g2),
        "intersection" => g1.intersection(&g2),
        "xor" => g1.xor(&g2),
        _ => return vec![]
    };

    use geo::coords_iter::CoordsIter;

    result_multipoly.into_iter().map(|poly| {
        let exterior: Vec<Point2<f32>> = poly.exterior().coords_iter().map(|c| Point2::new(c.x as f32, c.y as f32)).collect();
        let holes: Vec<Vec<Point2<f32>>> = poly.interiors().iter().map(|h| h.coords_iter().map(|c| Point2::new(c.x as f32, c.y as f32)).collect()).collect();
        ProcPolygon {
            exterior,
            holes,
            attributes: HashMap::new(),
            tags: vec![]
        }
    }).collect()
}
