#ifndef ROOM_HPP
#define ROOM_HPP

#include <SFML/Graphics/Transform.hpp>
#include <vector>
#include <string>
#include "GeneratedObject.hpp"

class Room : public GeneratedObject
{
public:
    Room(sf::Vector2f center, sf::Vector2f size, float angle, int passId, float spacingJitter);

    // Реализация интерфейса GeneratedObject
    std::vector<sf::Vector2f> getVertices() const override;
    sf::Vector2f getCenter() const override;
    void move(sf::Vector2f offset) override;
    float getMass() const override { return m_size.x * m_size.y; }
    int getPassId() const override { return m_passId; }
    float getSpacingJitter() const override { return m_spacingJitter; }
    void setTag(const std::string& tag) override { m_tag = tag; }
    std::string getTag() const override { return m_tag; }
    
    float getRotation() const { return m_rotation; }
    sf::Vector2f getSize() const { return m_size; }

private:
    sf::Vector2f m_room_center;
    sf::Vector2f m_size;
    float m_rotation; // в градусах
    int m_passId;
    float m_spacingJitter;
    std::string m_tag;
};

#endif //ROOM_HPP
