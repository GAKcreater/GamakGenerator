#include "room.hpp"

Room::Room(sf::Vector2f center, sf::Vector2f size, float angle, int passId, float spacingJitter) :
    m_room_center(center), m_passId(passId), m_spacingJitter(spacingJitter)
{
    room_shape.setSize(size);
    room_shape.setOrigin({size.x / 2.0f, size.y / 2.0f});
    room_shape.setPosition(m_room_center);
    room_shape.setRotation(sf::degrees(angle));
}

void Room::setColor(sf::Color col) {
    room_shape.setFillColor(col);
}

void Room::setOutColor(sf::Color col) {
    room_shape.setOutlineColor(col);
    room_shape.setOutlineThickness(1.f);
}

sf::Vector2f Room::getCenter() const {
    return m_room_center;
}

void Room::move(sf::Vector2f offset) {
    m_room_center += offset;
    room_shape.setPosition(m_room_center);
}

std::vector<sf::Vector2f> Room::getVertices() const {
    std::vector<sf::Vector2f> vertices;
    vertices.reserve(4);
    sf::Transform trans = room_shape.getTransform();
    sf::Vector2f size = room_shape.getSize();
    vertices.push_back(trans.transformPoint({0, 0}));
    vertices.push_back(trans.transformPoint({size.x, 0}));
    vertices.push_back(trans.transformPoint({size.x, size.y}));
    vertices.push_back(trans.transformPoint({0, size.y}));
    return vertices;
}

void Room::draw(sf::RenderTarget& target, sf::RenderStates states) const {
    target.draw(room_shape, states);
}
