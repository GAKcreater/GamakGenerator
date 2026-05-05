#include "graph.hpp"
#include <map>
#include <algorithm>
#include <cmath>
#include <random>

// Структура для сортировки ребер по длине
struct EdgeWithWeight {
    Edge edge;
    float weight;
};

// Компаратор для использования sf::Vector2f в качестве ключа в std::map
struct Vector2fComp {
    bool operator()(const sf::Vector2f& a, const sf::Vector2f& b) const {
        if (std::abs(a.x - b.x) > 1e-5f) return a.x < b.x;
        return a.y < b.y - 1e-5f;
    }
};

// Структура непересекающихся множеств (DSU) для проверки на циклы
class DSU {
    std::map<sf::Vector2f, sf::Vector2f, Vector2fComp> parent;
public:
    void make_set(sf::Vector2f v) {
        if (parent.find(v) == parent.end()) {
            parent[v] = v;
        }
    }
    
    sf::Vector2f find_set(sf::Vector2f v) {
        if (parent[v] == v)
            return v;
        return parent[v] = find_set(parent[v]);
    }
    
    void union_sets(sf::Vector2f a, sf::Vector2f b) {
        a = find_set(a);
        b = find_set(b);
        if (a != b)
            parent[b] = a;
    }
};

std::vector<Edge> GraphGenerator::createDungeonGraph(const std::vector<Triangle>& triangles, float extraEdgeProbability) {
    std::vector<EdgeWithWeight> edges;
    DSU dsu;

    // 1. Извлекаем все уникальные ребра из треугольников и вычисляем их длину
    for (const auto& t : triangles) {
        Edge arr[] = { {t.p1, t.p2}, {t.p2, t.p3}, {t.p3, t.p1} };
        for (auto& e : arr) {
            bool exists = false;
            for (const auto& ew : edges) {
                if (ew.edge == e) { exists = true; break; }
            }
            if (!exists) {
                float dx = e.p1.x - e.p2.x;
                float dy = e.p1.y - e.p2.y;
                edges.push_back({e, std::sqrt(dx*dx + dy*dy)});
            }
            // Регистрируем вершины в DSU
            dsu.make_set(e.p1);
            dsu.make_set(e.p2);
        }
    }

    // 2. Сортируем ребра по возрастанию длины (алгоритм Крускала)
    std::sort(edges.begin(), edges.end(), [](const EdgeWithWeight& a, const EdgeWithWeight& b) {
        return a.weight < b.weight;
    });

    std::vector<Edge> result;
    
    // 3. Строим граф
    for (const auto& ew : edges) {
        // Если вершины лежат в разных множествах — ребро безопасно, цикла не будет
        if (dsu.find_set(ew.edge.p1) != dsu.find_set(ew.edge.p2)) {
            result.push_back(ew.edge);
            dsu.union_sets(ew.edge.p1, ew.edge.p2);
        } else {
            // Ребро создает цикл (длинный ненужный коридор). 
            // Но мы можем случайно оставить его, чтобы создать петлю!
            float r = (float)rand() / RAND_MAX;
            if (r < extraEdgeProbability) {
                result.push_back(ew.edge);
            }
        }
    }

    return result;
}
