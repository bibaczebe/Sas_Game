extends Node

# Client-side cache of the last CharacterSnapshot received from the server.
# Mirrors the old GameStateManager.js.  All values are read-only from the
# perspective of other nodes — write only through load_snapshot() or the
# individual setters below.

var character_id: String = ""
var char_name: String = ""
var char_class: String = "warrior"
var race: String = "human"
var level: int = 1
var current_xp: int = 0
var gold: int = 0
var current_hp: int = 100
var max_hp: int = 100
var current_energy: int = 10
var max_energy: int = 10
var unspent_points: int = 0
var stats: Dictionary = {
	"strength": 1, "agility": 1, "attack": 1, "defense": 1,
	"vitality": 1, "charisma": 1, "endurance": 1, "magic": 1
}
var equipped_items: Dictionary = {}
var current_zone: String = "town"
var unlocked_biomes: Array = [0]   # 0 = Plains always unlocked
var entered_location: String = ""  # set before changing to LocationHub

signal snapshot_updated


# Biome IDs: 0=Plains 1=Forest 2=Desert 3=Coast 4=Mountain 5=Tundra 6=Snow 7=Volcanic
const BIOME_UNLOCK_LEVELS: Array = [0, 8, 10, 5, 12, 15, 18, 20]


func is_biome_unlocked(biome_id: int) -> bool:
	return biome_id in unlocked_biomes


func check_biome_unlocks() -> void:
	for i in BIOME_UNLOCK_LEVELS.size():
		if level >= int(BIOME_UNLOCK_LEVELS[i]) and not (i in unlocked_biomes):
			unlocked_biomes.append(i)


func load_snapshot(data: Dictionary) -> void:
	character_id  = str(data.get("_id", ""))
	char_name     = data.get("name", "")
	char_class    = data.get("class", "warrior")
	race          = data.get("race", "human")
	level         = data.get("level", 1)
	current_xp    = data.get("currentXP", 0)
	gold          = data.get("gold", 0)
	current_hp    = data.get("currentHP", 100)
	max_hp        = data.get("maxHP", 100)
	current_energy = data.get("currentEnergy", 10)
	max_energy    = data.get("maxEnergy", 10)
	unspent_points = data.get("unspentStatPoints", 0)
	current_zone  = data.get("currentZone", "town")
	if data.has("baseStats"):
		stats = data["baseStats"]
	if data.has("equippedItems"):
		equipped_items = data["equippedItems"]
	check_biome_unlocks()
	snapshot_updated.emit()


func has_character() -> bool:
	return character_id != ""


func add_gold(amount: int) -> void:
	gold += amount


func set_level(new_level: int) -> void:
	level = new_level


# XP needed to reach (current level + 1)
func xp_to_next_level() -> int:
	return int(floor(1000.0 * pow(level, 1.4)))
