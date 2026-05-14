#ifndef ROOM_HPP
#define ROOM_HPP

#include <SFML/Graphics.hpp>
#include <vector>
#include <string>
#include "GeneratedObject.hpp"

class Room : public GeneratedObject
{
public:
    Room(sf::Vector2f center, sf::Vector2f size, float angle, int passId, float spacingJitter);
    
    sf::RectangleShape room_shape;
    
    void setColor(sf::Color col);
    void setOutColor(sf::Color col);

    // Реализация интерфейса GeneratedObject
    std::vector<sf::Vector2f> getVertices() const override;
    sf::Vector2f getCenter() const override;
    void move(sf::Vector2f offset) override;
    float getMass() const override { return room_shape.getSize().x * room_shape.getSize().y; }
    int getPassId() const override { return m_passId; }
    float getSpacingJitter() const override { return m_spacingJitter; }
    
    void draw(sf::RenderTarget& target, sf::RenderStates states) const override;

    float getRotation() const { return room_shape.getRotation().asDegrees(); }

private:
    sf::Vector2f m_room_center;
    int m_passId;
    float m_spacingJitter;
};

#endif //ROOM_HPP
