extends Node
## Autoloaded as `NetworkManager`. Thin wrapper around ENetMultiplayerPeer.
## Modes: solo (no peer), host (server + local player), client.

signal hosted
signal joined
signal join_failed
signal server_left
signal peer_joined(id: int)
signal peer_left(id: int)

const DEFAULT_PORT := 7777
const MAX_CLIENTS := 16

enum Mode { SOLO, HOST, CLIENT }
var mode: int = Mode.SOLO


func _ready() -> void:
	multiplayer.peer_connected.connect(_on_peer_connected)
	multiplayer.peer_disconnected.connect(_on_peer_disconnected)
	multiplayer.connected_to_server.connect(_on_connected_to_server)
	multiplayer.connection_failed.connect(_on_connection_failed)
	multiplayer.server_disconnected.connect(_on_server_disconnected)


func start_solo() -> void:
	leave()
	mode = Mode.SOLO


func host(port: int = DEFAULT_PORT) -> Error:
	leave()
	var peer := ENetMultiplayerPeer.new()
	var err := peer.create_server(port, MAX_CLIENTS)
	if err != OK:
		push_warning("Host failed: %s" % err)
		return err
	multiplayer.multiplayer_peer = peer
	mode = Mode.HOST
	hosted.emit()
	return OK


func join(ip: String, port: int = DEFAULT_PORT) -> Error:
	leave()
	var peer := ENetMultiplayerPeer.new()
	var err := peer.create_client(ip, port)
	if err != OK:
		push_warning("Join failed: %s" % err)
		return err
	multiplayer.multiplayer_peer = peer
	mode = Mode.CLIENT
	return OK


func leave() -> void:
	if multiplayer.multiplayer_peer != null:
		multiplayer.multiplayer_peer.close()
	multiplayer.multiplayer_peer = null
	mode = Mode.SOLO


func is_networked() -> bool:
	return multiplayer.multiplayer_peer != null and \
		multiplayer.multiplayer_peer.get_connection_status() != MultiplayerPeer.CONNECTION_DISCONNECTED


func local_id() -> int:
	return 1 if mode == Mode.SOLO else multiplayer.get_unique_id()


# --------------------------------------------------------------------------- #
func _on_peer_connected(id: int) -> void:
	peer_joined.emit(id)

func _on_peer_disconnected(id: int) -> void:
	peer_left.emit(id)

func _on_connected_to_server() -> void:
	joined.emit()

func _on_connection_failed() -> void:
	leave()
	join_failed.emit()

func _on_server_disconnected() -> void:
	leave()
	server_left.emit()
