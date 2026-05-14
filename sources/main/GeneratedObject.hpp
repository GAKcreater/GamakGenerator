#ifndef GENERATED_OBJECT_HPP
#define GENERATED_OBJECT_HPP

#include <SFML/Graphics.hpp>
#include <vector>

/**
 * @brief Базовый интерфейс для всех генерируемых объектов (комнаты, залы, зоны).
 */
class GeneratedObject : public sf::Drawable {
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

    // Отрисовка (из sf::Drawable)
    virtual void draw(sf::RenderTarget& target, sf::RenderStates states) const override = 0;
};

#endif // GENERATED_OBJECT_HPP
