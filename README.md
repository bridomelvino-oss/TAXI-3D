# RUNZONE

Stickman paintball sandbox prototype built with **Godot 4 + GDScript**.
Low-poly, untextured, fast on small PCs.

## Run

1. Open `project.godot` with Godot **4.3+** (Forward+).
2. Press F5 — main scene is `scenes/main.tscn`.

## Controls

| Action          | Key                          |
| --------------- | ---------------------------- |
| Move            | WASD                         |
| Sprint          | Shift (hold)                 |
| Slide           | Ctrl (while sprinting)       |
| Jump / Bhop     | Space                        |
| Wall-jump       | Space against a wall mid-air |
| Shoot paint     | Left click                   |
| Place block     | Right click                  |
| Break block     | Q                            |
| Cycle paint     | C                            |
| Cycle block     | B                            |
| Toggle FPS/TPS  | V                            |
| Free mouse      | Esc                          |

## Architecture

```
scenes/      scene files (player, weapons, ui, main)
scripts/
  globals/   autoloaded singletons (GameSettings, BlockDB)
  player/    movement controller + camera
  weapons/   paintball gun + projectile
  world/     voxel world + chunk meshing
  ui/        hud
```

Systems are decoupled and communicate via signals — easy to extend with
multiplayer (each Player already exposes a clean authority surface),
inventories, weapon variants, larger worlds, etc.

## Performance choices

* Chunks are 16³ and use **face culling**: hidden faces never reach the GPU.
* All blocks share **one material** with vertex colors → one draw call per chunk.
* Paintball impacts use native **Decal** nodes (no per-mesh texture rewriting).
* Decals are capped at 200; oldest are freed automatically.
* No textures, no normal maps — pure low-poly look.
