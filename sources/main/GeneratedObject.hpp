#ifndef GENERATED_OBJECT_HPP
#define GENERATED_OBJECT_HPP

#include <SFML/Graphics.hpp>
#include <vector>

/**
 * @brief Базовый интерфейс для всех генерируемых объектов (комнаты, залы, зоны).
 */
class GeneratedObject {
public:
    virtual ~GeneratedObject() = default;

    // Геометрия для SAT (теорема о разделяющей оси)
    virtual std::vector<sf::Vector2f> getVertices() const = 0;
    virtual sf::Vector2f getCenter() const = 0;
    virtual void move(sf::Vector2f offset) = 0;
    
    // Физические свойства
    virtual float getMass() const = 0;
    
    // Метаданные
    virtual int getPassId() const = 0;
    virtual float getSpacingJitter() const = 0;
    virtual void setTag(const std::string& tag) = 0;
    virtual std::string getTag() const = 0;
};

#endif // GENERATED_OBJECT_HPP
