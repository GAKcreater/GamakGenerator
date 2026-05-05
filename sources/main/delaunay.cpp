#include "delaunay.hpp"

// Математика проверки точки внутри описанной окружности
bool Triangle::containsPointInCircumcircle(sf::Vector2f p) const {
    float x1 = p1.x, y1 = p1.y;
    float x2 = p2.x, y2 = p2.y;
    float x3 = p3.x, y3 = p3.y;

    float ab = (x1 * x1 + y1 * y1);
    float cd = (x2 * x2 + y2 * y2);
    float ef = (x3 * x3 + y3 * y3);

    // Вычисляем центр описанной окружности (circumcenter)
    float circum_x = (ab * (y3 - y2) + cd * (y1 - y3) + ef * (y2 - y1)) / (x1 * (y3 - y2) + x2 * (y1 - y3) + x3 * (y2 - y1)) / 2.0f;
    float circum_y = (ab * (x3 - x2) + cd * (x1 - x3) + ef * (x2 - x1)) / (y1 * (x3 - x2) + y2 * (x1 - x3) + y3 * (x2 - x1)) / 2.0f;

    sf::Vector2f circumCenter(circum_x, circum_y);
    
    // Радиус в квадрате
    float circumRadiusSq = (x1 - circum_x) * (x1 - circum_x) + (y1 - circum_y) * (y1 - circum_y);
    
    // Расстояние от центра до точки p в квадрате
    float distSq = (p.x - circum_x) * (p.x - circum_x) + (p.y - circum_y) * (p.y - circum_y);

    return distSq <= circumRadiusSq;
}

std::vector<Triangle> Delaunay::triangulate(std::vector<sf::Vector2f> points) {
    std::vector<Triangle> triangles;

    if (points.empty()) return triangles;

    // 1. Создаем Супер-треугольник
    // Находим границы точек
    float minX = points[0].x, minY = points[0].y, maxX = minX, maxY = minY;
    for (const auto& p : points) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
    }

    float dx = maxX - minX;
    float dy = maxY - minY;
    float deltaMax = std::max(dx, dy);
    float midX = (minX + maxX) / 2.0f;
    float midY = (minY + maxY) / 2.0f;

    // Вершины супер-треугольника должны быть очень далеко
    sf::Vector2f sp1(midX - 20 * deltaMax, midY - deltaMax);
    sf::Vector2f sp2(midX, midY + 20 * deltaMax);
    sf::Vector2f sp3(midX + 20 * deltaMax, midY - deltaMax);

    triangles.emplace_back(sp1, sp2, sp3);

    // 2. Инкрементально добавляем точки
    for (const auto& p : points) {
        std::vector<Triangle> badTriangles;
        
        // Находим все "плохие" треугольники
        for (const auto& t : triangles) {
            if (t.containsPointInCircumcircle(p)) {
                badTriangles.push_back(t);
            }
        }

        // Находим уникальные ребра (границу дырки)
        std::vector<Edge> polygon;
        for (const auto& bt : badTriangles) {
            std::vector<Edge> edges = { {bt.p1, bt.p2}, {bt.p2, bt.p3}, {bt.p3, bt.p1} };
            for (const auto& edge : edges) {
                bool isShared = false;
                for (const auto& otherBt : badTriangles) {
                    if (&bt == &otherBt) continue;
                    std::vector<Edge> otherEdges = { {otherBt.p1, otherBt.p2}, {otherBt.p2, otherBt.p3}, {otherBt.p3, otherBt.p1} };
                    for (const auto& otherEdge : otherEdges) {
                        if (edge == otherEdge) {
                            isShared = true;
                            break;
                        }
                    }
                    if (isShared) break;
                }
                if (!isShared) polygon.push_back(edge);
            }
        }

        // Удаляем плохие треугольники
        triangles.erase(std::remove_if(triangles.begin(), triangles.end(), [&](const Triangle& t) {
            for (const auto& bt : badTriangles) {
                if (t.p1 == bt.p1 && t.p2 == bt.p2 && t.p3 == bt.p3) return true;
            }
            return false;
        }), triangles.end());

        // Создаем новые треугольники от точки к границе дырки
        for (const auto& edge : polygon) {
            triangles.emplace_back(edge.p1, edge.p2, p);
        }
    }

    // 3. Очистка: удаляем всё, что связано с Супер-треугольником
    triangles.erase(std::remove_if(triangles.begin(), triangles.end(), [&](const Triangle& t) {
        return t.hasVertex(sp1) || t.hasVertex(sp2) || t.hasVertex(sp3);
    }), triangles.end());

    return triangles;
}
