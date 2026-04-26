import pygame
import random

# Настройки
W, H, S = 600, 400, 20
B, G, R, WHT = (0, 0, 0), (0, 200, 0), (200, 0, 0), (255, 255, 255)

def rand_pos():
    return random.randrange(0, W, S), random.randrange(0, H, S)

pygame.init()
s = pygame.display.set_mode((W, H))
pygame.display.set_caption("Snake")
c = pygame.time.Clock()

snake = [(W // 2, H // 2)]
d = (S, 0)
food = rand_pos()
run = True

while run:
    for e in pygame.event.get():
        if e.type == pygame.QUIT:
            run = False

    k = pygame.key.get_pressed()
    if k[pygame.K_UP] and d[1] != S:
        d = (0, -S)
    elif k[pygame.K_DOWN] and d[1] != -S:
        d = (0, S)
    elif k[pygame.K_LEFT] and d[0] != S:
        d = (-S, 0)
    elif k[pygame.K_RIGHT] and d[0] != -S:
        d = (S, 0)

    hx, hy = snake[0][0] + d[0], snake[0][1] + d[1]

    if hx < 0 or hx >= W or hy < 0 or hy >= H or (hx, hy) in snake:
        run = False

    snake.insert(0, (hx, hy))
    if (hx, hy) == food:
        food = rand_pos()
    else:
        snake.pop()

    s.fill(B)
    for seg in snake:
        pygame.draw.rect(s, G, (*seg, S, S))
    pygame.draw.rect(s, R, (*food, S, S))
    pygame.display.flip()
    c.tick(10)