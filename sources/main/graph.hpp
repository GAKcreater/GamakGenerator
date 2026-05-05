#ifndef GRAPH_HPP
#define GRAPH_HPP

#include <vector>
#include "delaunay.hpp"

class GraphGenerator {
public:
    // Принимает треугольники Делоне и вероятность добавления лишних ребер (петель)
    static std::vector<Edge> createDungeonGraph(const std::vector<Triangle>& triangles, float extraEdgeProbability);
};

#endif // GRAPH_HPP
