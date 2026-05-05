#include "room.hpp"

Room::Room(sf::Vector2f center, sf::Vector2f size, float angle, int passId, float spacingJitter) :
    m_room_center(center), m_size(size), m_rotation(angle), m_passId(passId), m_spacingJitter(spacingJitter)
{
}

sf::Vector2f Room::getCenter() const {
    return m_room_center;
}

void Room::move(sf::Vector2f offset) {
    m_room_center += offset;
}

std::vector<sf::Vector2f> Room::getVertices() const {
    std::vector<sf::Vector2f> vertices;
    vertices.reserve(4);
    
    sf::Transform trans;
    trans.translate(m_room_center);
    trans.rotate(sf::degrees(m_rotation));
    trans.translate({-m_size.x / 2.0f, -m_size.y / 2.0f});
    
    vertices.push_back(trans.transformPoint({0, 0}));
    vertices.push_back(trans.transformPoint({m_size.x, 0}));
    vertices.push_back(trans.transformPoint({m_size.x, m_size.y}));
    vertices.push_back(trans.transformPoint({0, m_size.y}));
    
    return vertices;
}
