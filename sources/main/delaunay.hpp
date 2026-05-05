#ifndef DELAUNAY_HPP
#define DELAUNAY_HPP

#include <SFML/Graphics.hpp>
#include <vector>
#include <algorithm>
#include <cmath>

struct Edge {
    sf::Vector2f p1;
    sf::Vector2f p2;

    Edge(sf::Vector2f v1, sf::Vector2f v2) : p1(v1), p2(v2) {}

    // Для поиска уникальных ребер (границы дырки) нам нужно уметь сравнивать их
    // Ребро (A, B) идентично ребру (B, A)
    bool operator==(const Edge& other) const {
        return (p1 == other.p1 && p2 == other.p2) || (p1 == other.p2 && p2 == other.p1);
    }
};

struct Triangle {
    sf::Vector2f p1, p2, p3;

    Triangle(sf::Vector2f v1, sf::Vector2f v2, sf::Vector2f v3) : p1(v1), p2(v2), p3(v3) {}

    // Проверка: содержит ли описанная окружность этого треугольника данную точку?
    bool containsPointInCircumcircle(sf::Vector2f p) const;
    
    // Содержит ли треугольник данную вершину? (Нужно для очистки супер-треугольника)
    bool hasVertex(sf::Vector2f v) const {
        return p1 == v || p2 == v || p3 == v;
    }
};

class Delaunay {
public:
    // Главная функция: принимает точки, возвращает список треугольников
    static std::vector<Triangle> triangulate(std::vector<sf::Vector2f> points);
};

#endif // DELAUNAY_HPP
