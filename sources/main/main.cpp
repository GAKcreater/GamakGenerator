#include <iostream>
#include <string>
#include <vector>
#include <random>
#include <SFML/Graphics.hpp>
#include <ctime>
#include <cmath>
#include <optional>
#include <fstream>
#include <filesystem>
#include <map>
#include <thread>
#include <atomic>
#include <functional>
#include <memory>

#include <boost/json.hpp>

#include "GeneratedObject.hpp"
#include "room.hpp"
#include "delaunay.hpp"
#include "graph.hpp"

namespace json = boost::json;
namespace fs = std::filesystem;

struct ObjectPassConfig {
    std::string name = "default";
    std::string type = "room";       
    int minRoomSize = 20;
    int maxRoomSize = 60;
    int roomCount = 80;
    float maxRotation = 0.0f;
    float spawnRadius = 150.0f;
    float spawnDispersion = 0.5f;
    float spawnExp = 0.5f;
    float defaultSpacing = 10.0f;
    float spacingVariance = 5.0f; 
    std::string spawnAround = ""; 
    std::string spawnMaskPath = ""; 
    std::map<std::string, float> interactions; 
};

struct GenerationConfig {
    int seed = 0;
    bool showDebugGraph = true;
    int mainRoomThreshold = 45; 
    float loopProbability = 0.15f; 
    float corridorWidth = 12.0f;
    float lShapeProbability = 0.5f;
    float physicsGravity = 0.01f;
    float corridorSnapRadius = 20.0f;
    float maxCorridorBendAngle = 35.0f;
    float lastDurationMs = 1000.0f; 
    std::vector<ObjectPassConfig> passes;
    std::vector<std::vector<float>> spacingMatrix;

    void buildSpacingMatrix() {
        size_t n = passes.size();
        spacingMatrix.assign(n, std::vector<float>(n, 0.0f));
        for (size_t i = 0; i < n; ++i) {
            for (size_t j = 0; j < n; ++j) {
                float dist = (passes[i].defaultSpacing + passes[j].defaultSpacing) / 2.0f;
                if (passes[i].interactions.count(passes[j].name)) dist = std::max(dist, passes[i].interactions.at(passes[j].name));
                if (passes[j].interactions.count(passes[i].name)) dist = std::max(dist, passes[j].interactions.at(passes[i].name));
                spacingMatrix[i][j] = dist;
            }
        }
    }

    void loadFromFile(const std::string& filename) {
        if (passes.empty()) {
            passes.push_back({"halls", "room", 50, 80, 10, 0.0f, 250.0f, 0.6f, 0.5f, 20.0f, 10.0f, "", "", {{"halls", 50.0f}}});
            passes.push_back({"rooms", "room", 15, 30, 120, 45.0f, 120.0f, 0.8f, 0.5f, 15.0f, 5.0f, "halls", "", {{"halls", 30.0f}}});
        }
        if (!fs::exists(filename)) { 
            fs::path p(filename);
            if (p.has_parent_path() && !fs::exists(p.parent_path())) {
                fs::create_directories(p.parent_path());
            }
            saveToFile(filename); 
            buildSpacingMatrix(); 
            return; 
        }
        try {
            std::ifstream ifs(filename);
            std::string content((std::istreambuf_iterator<char>(ifs)), std::istreambuf_iterator<char>());
            if (content.empty()) { buildSpacingMatrix(); return; }
            json::value jv = json::parse(content);
            json::object const& obj = jv.as_object();
            auto getF = [&](const json::object& o, const char* k, float& t) {
                if (o.contains(k)) t = o.at(k).is_double() ? (float)o.at(k).as_double() : (float)o.at(k).as_int64();
            };
            auto getI = [&](const json::object& o, const char* k, int& t) {
                if (o.contains(k)) t = (int)(o.at(k).is_int64() ? o.at(k).as_int64() : o.at(k).as_double());
            };
            getI(obj, "seed", seed);
            if (obj.contains("showDebugGraph") && obj.at("showDebugGraph").is_bool()) {
                showDebugGraph = obj.at("showDebugGraph").as_bool();
            }
            getI(obj, "mainRoomThreshold", mainRoomThreshold);
            getF(obj, "loopProbability", loopProbability);
            getF(obj, "corridorWidth", corridorWidth);
            getF(obj, "lShapeProbability", lShapeProbability);
            getF(obj, "physicsGravity", physicsGravity);
            getF(obj, "corridorSnapRadius", corridorSnapRadius);
            getF(obj, "maxCorridorBendAngle", maxCorridorBendAngle);
            if (obj.contains("passes") && obj.at("passes").is_array()) {
                passes.clear();
                for (auto& item : obj.at("passes").as_array()) {
                    auto& pObj = item.as_object();
                    ObjectPassConfig p;
                    if (pObj.contains("name")) p.name = std::string(pObj.at("name").as_string());
                    if (pObj.contains("type")) p.type = std::string(pObj.at("type").as_string());
                    getI(pObj, "minRoomSize", p.minRoomSize);
                    getI(pObj, "maxRoomSize", p.maxRoomSize);
                    getI(pObj, "roomCount", p.roomCount);
                    getF(pObj, "maxRotation", p.maxRotation);
                    getF(pObj, "spawnRadius", p.spawnRadius);
                    getF(pObj, "spawnDispersion", p.spawnDispersion);
                    getF(pObj, "spawnExp", p.spawnExp);
                    getF(pObj, "defaultSpacing", p.defaultSpacing);
                    getF(pObj, "spacingVariance", p.spacingVariance);
                    if (pObj.contains("spawnAround")) p.spawnAround = std::string(pObj.at("spawnAround").as_string());
                    if (pObj.contains("spawnMaskPath")) p.spawnMaskPath = std::string(pObj.at("spawnMaskPath").as_string());
                    if (pObj.contains("interactions") && pObj.at("interactions").is_object()) {
                        for (auto& rule : pObj.at("interactions").as_object()) {
                            float val = rule.value().is_double() ? (float)rule.value().as_double() : (float)rule.value().as_int64();
                            p.interactions[std::string(rule.key())] = val;
                        }
                    }
                    passes.push_back(p);
                }
            }
        } catch (...) {}
        buildSpacingMatrix();

        std::ifstream timeFile("last_duration.txt");
        if (timeFile.is_open()) {
            timeFile >> lastDurationMs;
        }
    }

    void saveToFile(const std::string& filename) {
        std::ofstream ofs(filename);
        ofs << "{\n    \"seed\": " << seed << ",\n    \"showDebugGraph\": " << (showDebugGraph ? "true" : "false") << ",\n";
        ofs << "    \"mainRoomThreshold\": " << mainRoomThreshold << ",\n    \"loopProbability\": " << loopProbability << ",\n";
        ofs << "    \"corridorWidth\": " << corridorWidth << ",\n    \"lShapeProbability\": " << lShapeProbability << ",\n";
        ofs << "    \"physicsGravity\": " << physicsGravity << ",\n    \"corridorSnapRadius\": " << corridorSnapRadius << ",\n";
        ofs << "    \"maxCorridorBendAngle\": " << maxCorridorBendAngle << ",\n    \"passes\": [\n";
        for (size_t i = 0; i < passes.size(); ++i) {
            ofs << "        {\n            \"name\": \"" << passes[i].name << "\",\n            \"type\": \"" << passes[i].type << "\",\n";
            ofs << "            \"minRoomSize\": " << passes[i].minRoomSize << ",\n";
            ofs << "            \"maxRoomSize\": " << passes[i].maxRoomSize << ",\n            \"roomCount\": " << passes[i].roomCount << ",\n";
            ofs << "            \"maxRotation\": " << passes[i].maxRotation << ",\n            \"spawnRadius\": " << passes[i].spawnRadius << ",\n";
            ofs << "            \"spawnDispersion\": " << passes[i].spawnDispersion << ",\n            \"spawnExp\": " << passes[i].spawnExp << ",\n";
            ofs << "            \"defaultSpacing\": " << passes[i].defaultSpacing << ",\n";
            ofs << "            \"spacingVariance\": " << passes[i].spacingVariance << ",\n";
            ofs << "            \"spawnAround\": \"" << passes[i].spawnAround << "\",\n";
            ofs << "            \"spawnMaskPath\": \"" << passes[i].spawnMaskPath << "\",\n";
            ofs << "            \"interactions\": {\n";
            size_t k = 0;
            for (auto const& [other, dist] : passes[i].interactions) {
                ofs << "                \"" << other << "\": " << dist << (k == passes[i].interactions.size() - 1 ? "" : ",") << "\n";
                k++;
            }
            ofs << "            }\n        }" << (i == passes.size() - 1 ? "" : ",") << "\n";
        }
        ofs << "    ]\n}";
    }
};

class ObjectFactory {
public:
    static std::shared_ptr<GeneratedObject> create(const ObjectPassConfig& pass, sf::Vector2f pos, int passId) {
        sf::Vector2f size((float)(pass.minRoomSize + rand() % (pass.maxRoomSize - pass.minRoomSize + 1)),
                          (float)(pass.minRoomSize + rand() % (pass.maxRoomSize - pass.minRoomSize + 1)));
        float angle = pass.maxRotation > 0.0f ? (float)(rand() % 2000 - 1000) / 1000.0f * pass.maxRotation : 0.0f;
        float jitter = pass.spacingVariance > 0.0f ? (float)(rand() % 2000 - 1000) / 1000.0f * pass.spacingVariance : 0.0f;

        return std::make_shared<Room>(pos, size, angle, passId, jitter);
    }
};

// --- Геометрия и SAT ---
float dot(sf::Vector2f a, sf::Vector2f b) { return a.x * b.x + a.y * b.y; }
float length(sf::Vector2f v) { return std::sqrt(v.x * v.x + v.y * v.y); }
sf::Vector2f normalize(sf::Vector2f v) { float l = length(v); return l > 0 ? v / l : v; }
sf::Vector2f getNormal(sf::Vector2f p1, sf::Vector2f p2) { return sf::Vector2f(- (p2.y - p1.y), p2.x - p1.x); }

float distToEdge(sf::Vector2f p, sf::Vector2f a, sf::Vector2f b) {
    sf::Vector2f ab = b - a;
    sf::Vector2f ap = p - a;
    float t = dot(ap, ab) / dot(ab, ab);
    if (t < 0.0f) return length(p - a);
    if (t > 1.0f) return length(p - b);
    return length(p - (a + ab * t));
}

struct Projection { float min, max; };
Projection project(const std::vector<sf::Vector2f>& vertices, sf::Vector2f axis) {
    float min = dot(vertices[0], axis); float max = min;
    for (size_t k = 1; k < vertices.size(); ++k) {
        float p = dot(vertices[k], axis);
        if (p < min) min = p; if (p > max) max = p;
    }
    return {min, max};
}

std::optional<sf::Vector2f> getCollisionMTV(const GeneratedObject& a, const GeneratedObject& b, float spacing) {
    auto vA = a.getVertices(); auto vB = b.getVertices();
    std::vector<sf::Vector2f> axes;
    auto addAxes = [&](const std::vector<sf::Vector2f>& v) {
        for (size_t i = 0; i < v.size(); ++i) axes.push_back(normalize(getNormal(v[i], v[(i + 1) % v.size()])));
    };
    addAxes(vA); addAxes(vB);
    float minOverlap = std::numeric_limits<float>::max();
    sf::Vector2f smallestAxis;
    for (auto& axis : axes) {
        Projection pA = project(vA, axis); Projection pB = project(vB, axis);
        float overlap = std::min(pA.max, pB.max + spacing/2) - std::max(pA.min, pB.min - spacing/2);
        if (overlap <= 0) return std::nullopt;
        if (overlap < minOverlap) { minOverlap = overlap; smallestAxis = axis; }
    }
    sf::Vector2f d = a.getCenter() - b.getCenter();
    if (d.x == 0 && d.y == 0) { d.x = ((rand() % 100) - 50) * 0.01f; d.y = ((rand() % 100) - 50) * 0.01f; }
    if (dot(d, smallestAxis) < 0) smallestAxis = -smallestAxis;
    return smallestAxis * minOverlap;
}

void separateRooms(std::vector<std::shared_ptr<GeneratedObject>>& objects, const GenerationConfig& config, std::function<void(float)> reportProgress) {
    int maxIterations = 500;
    std::vector<sf::Vector2f> spawnPositions;
    for (const auto& obj : objects) spawnPositions.push_back(obj->getCenter());

    for (int it = 0; it < maxIterations; ++it) {
        reportProgress((float)it / maxIterations);
        bool moved = false;
        std::vector<sf::Vector2f> forces(objects.size(), {0, 0});
        std::vector<int> counts(objects.size(), 0);
        for (size_t i = 0; i < objects.size(); ++i) {
            for (size_t j = i + 1; j < objects.size(); ++j) {
                float baseSpacing = config.spacingMatrix[objects[i]->getPassId()][objects[j]->getPassId()];
                float spacing = baseSpacing + objects[i]->getSpacingJitter() + objects[j]->getSpacingJitter();
                auto mtvOpt = getCollisionMTV(*objects[i], *objects[j], std::max(0.0f, spacing));
                if (mtvOpt) {
                    float totalMass = objects[i]->getMass() + objects[j]->getMass();
                    forces[i] += (*mtvOpt) * (objects[j]->getMass() / totalMass); counts[i]++;
                    forces[j] -= (*mtvOpt) * (objects[i]->getMass() / totalMass); counts[j]++;
                    moved = true;
                }
            }
        }
        if (!moved) { reportProgress(1.0f); break; }
        for (size_t i = 0; i < objects.size(); ++i) {
            sf::Vector2f separation = (counts[i] > 0) ? (forces[i] / (float)counts[i]) * 0.9f : sf::Vector2f(0, 0);
            sf::Vector2f spring = (spawnPositions[i] - objects[i]->getCenter()) * config.physicsGravity;
            if (counts[i] > 0) spring *= 0.1f;
            objects[i]->move(separation + spring);
        }
    }
}

std::mt19937 globalGen;

std::optional<sf::Vector2f> getPointInCircle(float radius, float dispersion, float exp, const sf::Image* mask = nullptr) {
    int maxAttempts = 100;
    std::uniform_real_distribution<float> uDist(0.0f, 1.0f);
    for (int attempt = 0; attempt < maxAttempts; ++attempt) {
        sf::Vector2f p;
        if (exp <= 0.0f) {
            std::normal_distribution<float> dist(0.0f, radius * dispersion);
            float x, y;
            do { x = dist(globalGen); y = dist(globalGen); } while (x * x + y * y > radius * radius);
            p = sf::Vector2f(x, y);
        } else {
            float angle = uDist(globalGen) * 2.0f * 3.14159265f;
            float r = radius * std::pow(uDist(globalGen), exp);
            p = sf::Vector2f(std::cos(angle) * r, std::sin(angle) * r);
        }
        if (!mask) return p;
        sf::Vector2u size = mask->getSize();
        int maskX = (int)p.x + (int)size.x / 2;
        int maskY = (int)p.y + (int)size.y / 2;
        if (maskX >= 0 && (unsigned int)maskX < size.x && maskY >= 0 && (unsigned int)maskY < size.y) {
            float brightness = mask->getPixel({(unsigned int)maskX, (unsigned int)maskY}).r / 255.0f;
            if (uDist(globalGen) <= brightness) return p;
        }
    }
    return std::nullopt; 
}

int main() {
    GenerationConfig config;
    std::string configPath = "generation_configs/default.json";
    config.loadFromFile(configPath);
    unsigned int windowSize = 900;
    sf::Vector2f spawnCenter((float)windowSize/2, (float)windowSize/2);

    std::vector<std::shared_ptr<GeneratedObject>> objects;
    std::vector<sf::RectangleShape> corridors;
    std::vector<Triangle> globalTriangles;
    std::vector<Edge> globalGraph;
    
    std::atomic<bool> isGenerating{false};
    std::atomic<const char*> currentStatus{"Ready"};
    std::thread workerThread;
    sf::Clock genTimer;

    auto generateAsync = [&]() {
        unsigned int currentSeed = (config.seed == 0) ? (unsigned int)time(nullptr) : (unsigned int)config.seed;
        srand(currentSeed); globalGen.seed(currentSeed);
        sf::Clock internalTimer;
        std::vector<std::shared_ptr<GeneratedObject>> localObjects;
        std::map<std::string, int> passNameToId;
        for (size_t i = 0; i < config.passes.size(); ++i) passNameToId[config.passes[i].name] = (int)i;

        std::map<int, sf::Image> masks;
        for (size_t i = 0; i < config.passes.size(); ++i) {
            if (!config.passes[i].spawnMaskPath.empty() && fs::exists(config.passes[i].spawnMaskPath)) {
                masks[(int)i].loadFromFile(config.passes[i].spawnMaskPath);
            }
        }

        for (size_t passIdx = 0; passIdx < config.passes.size(); ++passIdx) {
            auto& pass = config.passes[passIdx];
            currentStatus = "Spawning...";
            std::vector<sf::Vector2f> targets;
            if (!pass.spawnAround.empty() && passNameToId.count(pass.spawnAround)) {
                int tId = passNameToId[pass.spawnAround];
                for (const auto& obj : localObjects) if (obj->getPassId() == tId) targets.push_back(obj->getCenter());
            }
            const sf::Image* currentMask = masks.count((int)passIdx) ? &masks[(int)passIdx] : nullptr;
            for (int i = 0; i < pass.roomCount; ++i) {
                sf::Vector2f sC = targets.empty() ? spawnCenter : targets[rand() % targets.size()];
                auto posOpt = getPointInCircle(pass.spawnRadius, pass.spawnDispersion, pass.spawnExp, currentMask);
                if (posOpt) localObjects.push_back(ObjectFactory::create(pass, sC + *posOpt, (int)passIdx));
            }
            currentStatus = "Processing Physics...";
            separateRooms(localObjects, config, [&](float p) {});
        }

        currentStatus = "Selecting Main Rooms...";
        std::vector<sf::Vector2f> mainPoints;
        for (auto& obj : localObjects) {
            if (auto r = std::dynamic_pointer_cast<Room>(obj)) {
                auto s = r->room_shape.getSize();
                if (s.x > config.mainRoomThreshold && s.y > config.mainRoomThreshold) mainPoints.push_back(r->getCenter());
            }
        }

        currentStatus = "Delaunay & MST...";
        std::vector<Triangle> localTri = Delaunay::triangulate(mainPoints);
        std::vector<Edge> localGraph = GraphGenerator::createDungeonGraph(localTri, config.loopProbability);

        currentStatus = "Building Corridors...";
        std::vector<sf::RectangleShape> localCorridors;
        std::vector<Edge> refinedGraph; 
        for (const auto& edge : localGraph) {
            std::vector<sf::Vector2f> waypoints; waypoints.push_back(edge.p1);
            std::vector<std::pair<sf::Vector2f, float>> candidates;
            for (const auto& obj : localObjects) {
                sf::Vector2f center = obj->getCenter();
                if (length(center - edge.p1) < 1.0f || length(center - edge.p2) < 1.0f) continue;
                if (distToEdge(center, edge.p1, edge.p2) < config.corridorSnapRadius) {
                    sf::Vector2f ab = edge.p2 - edge.p1; sf::Vector2f ap = center - edge.p1;
                    float t = dot(ap, ab) / dot(ab, ab);
                    if (t > 0.05f && t < 0.95f) candidates.push_back({center, t});
                }
            }
            std::sort(candidates.begin(), candidates.end(), [](auto& a, auto& b) { return a.second < b.second; });
            for (auto& cand : candidates) {
                sf::Vector2f v1 = cand.first - waypoints.back(); sf::Vector2f v2 = edge.p2 - cand.first;
                float d = dot(normalize(v1), normalize(v2));
                if (std::acos(std::max(-1.0f, std::min(1.0f, d))) * 180.0f / 3.14159265f <= config.maxCorridorBendAngle) waypoints.push_back(cand.first);
            }
            waypoints.push_back(edge.p2);
            for (size_t i = 0; i < waypoints.size() - 1; ++i) {
                sf::Vector2f pA = waypoints[i]; sf::Vector2f pB = waypoints[i+1];
                if ((float)rand() / RAND_MAX < config.lShapeProbability) {
                    sf::Vector2f corner = (rand() % 2 == 0) ? sf::Vector2f(pB.x, pA.y) : sf::Vector2f(pA.x, pB.y);
                    refinedGraph.push_back({pA, corner}); refinedGraph.push_back({corner, pB});
                    auto createSegment = [&](sf::Vector2f a, sf::Vector2f b) {
                        float len = length(b - a); if (len < 0.1f) return;
                        sf::RectangleShape c; c.setFillColor(sf::Color(70, 70, 150));
                        c.setSize({len + config.corridorWidth, config.corridorWidth});
                        c.setOrigin({c.getSize().x / 2.0f, c.getSize().y / 2.0f});
                        c.setPosition((a + b) / 2.0f); if (std::abs(a.y - b.y) > 0.1f) c.setRotation(sf::degrees(90.0f));
                        localCorridors.push_back(c);
                    };
                    createSegment(pA, corner); createSegment(corner, pB);
                } else {
                    refinedGraph.push_back({pA, pB}); sf::Vector2f diff = pB - pA; float len = length(diff);
                    if (len > 0.1f) {
                        sf::RectangleShape c; c.setFillColor(sf::Color(70, 70, 150));
                        c.setSize({len, config.corridorWidth}); c.setOrigin({len / 2.0f, config.corridorWidth / 2.0f});
                        c.setPosition((pA + pB) / 2.0f); c.setRotation(sf::degrees(std::atan2(diff.y, diff.x) * 180.0f / 3.14159265f));
                        localCorridors.push_back(c);
                    }
                }
            }
        }
        for (auto& obj : localObjects) {
            if (auto r = std::dynamic_pointer_cast<Room>(obj)) {
                auto s = r->room_shape.getSize();
                if (s.x > config.mainRoomThreshold && s.y > config.mainRoomThreshold) {
                    r->setColor(sf::Color(100, 150, 100)); r->setOutColor(sf::Color::Green);
                } else {
                    bool hit = false; sf::Vector2f rCenter = r->getCenter();
                    for (const auto& e : refinedGraph) if (length(rCenter - e.p1) < 1.0f || length(rCenter - e.p2) < 1.0f) { hit = true; break; }
                    if (hit) { r->setColor(sf::Color(80, 80, 80)); r->setOutColor(sf::Color(150, 150, 150)); }
                    else { r->setColor(sf::Color(40, 40, 50)); r->setOutColor(sf::Color(80, 80, 100)); }
                }
            }
        }
        objects = std::move(localObjects); corridors = std::move(localCorridors);
        globalTriangles = localTri; globalGraph = refinedGraph;
        config.lastDurationMs = internalTimer.getElapsedTime().asMilliseconds();
        isGenerating = false;
    };

    auto trigger = [&]() {
        if (isGenerating) return;
        if (workerThread.joinable()) workerThread.join();
        isGenerating = true; genTimer.restart();
        workerThread = std::thread(generateAsync);
    };

    trigger();
    sf::RenderWindow win(sf::VideoMode({windowSize, windowSize}), "Legacy Dungeon Gen");
    win.setFramerateLimit(60);
    while (win.isOpen()) {
        while (const std::optional event = win.pollEvent()) {
            if (event->is<sf::Event::Closed>()) win.close();
            if (const auto* kr = event->getIf<sf::Event::KeyReleased>()) {
                if (kr->code == sf::Keyboard::Key::R) { config.loadFromFile(configPath); trigger(); }
                if (kr->code == sf::Keyboard::Key::G) config.showDebugGraph = !config.showDebugGraph;
            }
        }
        win.clear(sf::Color(20, 20, 20));
        if (isGenerating) { /* progress bar logic... */ } 
        else {
            sf::VertexArray dLines(sf::PrimitiveType::Lines);
            for (const auto& t : globalTriangles) {
                sf::Color c(100, 100, 100, 30);
                dLines.append(sf::Vertex(t.p1, c)); dLines.append(sf::Vertex(t.p2, c));
                dLines.append(sf::Vertex(t.p2, c)); dLines.append(sf::Vertex(t.p3, c));
                dLines.append(sf::Vertex(t.p3, c)); dLines.append(sf::Vertex(t.p1, c));
            }
            win.draw(dLines);
            if (config.showDebugGraph) {
                sf::VertexArray gLines(sf::PrimitiveType::Lines);
                for (const auto& e : globalGraph) { sf::Color c(255, 255, 0); gLines.append(sf::Vertex(e.p1, c)); gLines.append(sf::Vertex(e.p2, c)); }
                win.draw(gLines);
            } else for (auto& c : corridors) win.draw(c);
            for (auto& obj : objects) win.draw(*obj);
        }
        win.display();
    }
    if (workerThread.joinable()) workerThread.join();
    return 0;
}
