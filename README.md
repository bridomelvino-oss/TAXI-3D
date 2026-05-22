# RUNZONE

Stickman paintball sandbox prototype built with **Godot 4 + GDScript**.
Low-poly, untextured, fast on small PCs. Solo or LAN multiplayer.

## Run

1. Open `project.godot` with Godot **4.3+** (Forward+).
2. Press F5 — the lobby opens. Pick **Solo**, **Host**, or **Join**.

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

## Multiplayer (LAN)

Built on **ENetMultiplayerPeer** — peer-to-peer with one host.

* **Host**: pick a port (default `7777`), click `Host LAN game`.
* **Join**: type the host's IP + port, click `Join`.
* The server replicates player spawning (`MultiplayerSpawner`) and block
  edits (RPCs). Each player's transform is replicated by a
  `MultiplayerSynchronizer` installed at runtime, with authority on the
  owning peer.

Terrain is procedurally generated from a shared `world_seed` so all
peers see the same world without sending the chunk data over the wire.
(Player edits made before a client joined are not yet re-sent — see
"Roadmap" below.)

## World streaming

* 16³ chunks generated on demand around the local player.
* Generation runs on `WorkerThreadPool` threads — no frame hitches.
* Mesh upload is rate-limited (`max_loads_per_frame`).
* Face culling: only visible faces reach the GPU.
* Shared vertex-color material → one draw call per chunk.

## Architecture

```
scenes/
  main.tscn               game scene (env, world, players container, spawner, HUD)
  player/player.tscn      stickman + capsule + camera + gun
  weapons/                paintball projectile
  ui/                     lobby + hud
scripts/
  globals/                GameSettings, BlockDB (autoloads)
  net/network_manager.gd  ENet host/join wrapper (autoload)
  player/                 movement controller + camera
  weapons/                paintball gun + projectile
  world/                  voxel world streamer + chunk meshing + generator
  ui/                     lobby + hud
```

Each module is self-contained and communicates via signals or thin
public APIs (e.g. `VoxelWorld.request_set_block`, `PaintballGun.setup`).

## Performance choices

* Face-culled chunks + vertex-color material → 1 draw call/chunk.
* Threaded chunk generation, throttled spawn rate.
* Paintball impacts use native **Decal** nodes; capped at 200.
* No textures, no normal maps.
* `msaa_3d=1` (2×) for clean edges at minimal cost.

## Roadmap

* Replay queued block edits to joining clients.
* Player hits, paint coverage scoring.
* Inventory + block hot-bar UI.
* Server-authoritative projectile collision for fair play.
* Larger view distances via greedy meshing.
