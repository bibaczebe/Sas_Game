extends Node

# GameState — zapis/odczyt lokalny (tryb offline / single-player).
# Dane zapisywane do user://save.cfg przy każdej zmianie.

const SAVE_PATH := "user://save.cfg"

var character_id:    String = ""
var char_name:       String = ""
var char_class:      String = "warrior"
var race:            String = "human"
var level:           int    = 1
var current_xp:      int    = 0
var gold:            int    = 100
var current_hp:      int    = 100
var max_hp:          int    = 100
var current_energy:  int    = 10
var max_energy:      int    = 10
var unspent_points:  int    = 0
var stats: Dictionary = {
	"strength": 1, "agility": 1, "attack": 1, "defense": 1,
	"vitality": 1, "charisma": 1, "endurance": 1, "magic": 1
}
var equipped_items:  Dictionary = {}
var current_zone:    String = "plains"
var unlocked_biomes: Array  = [0]
var entered_location: String = ""

signal snapshot_updated

const BIOME_UNLOCK_LEVELS: Array = [0, 8, 10, 5, 12, 15, 18, 20]

# Bazowe statystyki dla każdej klasy
const CLASS_BASE_STATS: Dictionary = {
	"warrior":  {"strength":5,"agility":2,"attack":4,"defense":3,"vitality":4,"charisma":1,"endurance":3,"magic":0},
	"archer":   {"strength":2,"agility":5,"attack":4,"defense":2,"vitality":2,"charisma":2,"endurance":3,"magic":2},
	"mage":     {"strength":1,"agility":2,"attack":2,"defense":2,"vitality":2,"charisma":3,"endurance":2,"magic":8},
	"paladin":  {"strength":4,"agility":1,"attack":3,"defense":5,"vitality":4,"charisma":2,"endurance":3,"magic":2},
	"assassin": {"strength":3,"agility":5,"attack":5,"defense":1,"vitality":2,"charisma":1,"endurance":3,"magic":2},
}


# ── Biomy ─────────────────────────────────────────────────────────────────────

func is_biome_unlocked(biome_id: int) -> bool:
	return biome_id in unlocked_biomes

func check_biome_unlocks() -> void:
	for i in BIOME_UNLOCK_LEVELS.size():
		if level >= int(BIOME_UNLOCK_LEVELS[i]) and not (i in unlocked_biomes):
			unlocked_biomes.append(i)


# ── Tworzenie nowej postaci (lokalne) ─────────────────────────────────────────

func create_character(name: String, cls: String, chosen_race: String) -> void:
	character_id   = "local_" + str(Time.get_unix_time_from_system())
	char_name      = name
	char_class     = cls
	race           = chosen_race
	level          = 1
	current_xp     = 0
	gold           = 100
	current_hp     = 100
	max_hp         = 100
	current_energy = 10
	max_energy     = 10
	unspent_points = 0
	current_zone   = "plains"
	unlocked_biomes = [0]
	equipped_items = {}
	stats = CLASS_BASE_STATS.get(cls, CLASS_BASE_STATS["warrior"]).duplicate()
	save_local()
	snapshot_updated.emit()


# ── Zapis / odczyt ────────────────────────────────────────────────────────────

func save_local() -> void:
	var cfg := ConfigFile.new()
	cfg.set_value("character", "id",            character_id)
	cfg.set_value("character", "name",          char_name)
	cfg.set_value("character", "class",         char_class)
	cfg.set_value("character", "race",          race)
	cfg.set_value("character", "level",         level)
	cfg.set_value("character", "xp",            current_xp)
	cfg.set_value("character", "gold",          gold)
	cfg.set_value("character", "hp",            current_hp)
	cfg.set_value("character", "max_hp",        max_hp)
	cfg.set_value("character", "energy",        current_energy)
	cfg.set_value("character", "max_energy",    max_energy)
	cfg.set_value("character", "unspent",       unspent_points)
	cfg.set_value("character", "zone",          current_zone)
	cfg.set_value("character", "biomes",        unlocked_biomes)
	cfg.set_value("character", "stats",         stats)
	cfg.set_value("character", "equipped",      equipped_items)
	cfg.save(SAVE_PATH)


func load_local() -> bool:
	var cfg := ConfigFile.new()
	if cfg.load(SAVE_PATH) != OK:
		return false
	character_id   = cfg.get_value("character", "id",         "")
	if character_id == "":
		return false
	char_name      = cfg.get_value("character", "name",       "Hero")
	char_class     = cfg.get_value("character", "class",      "warrior")
	race           = cfg.get_value("character", "race",       "human")
	level          = cfg.get_value("character", "level",      1)
	current_xp     = cfg.get_value("character", "xp",         0)
	gold           = cfg.get_value("character", "gold",       100)
	current_hp     = cfg.get_value("character", "hp",         100)
	max_hp         = cfg.get_value("character", "max_hp",     100)
	current_energy = cfg.get_value("character", "energy",     10)
	max_energy     = cfg.get_value("character", "max_energy", 10)
	unspent_points = cfg.get_value("character", "unspent",    0)
	current_zone   = cfg.get_value("character", "zone",       "plains")
	unlocked_biomes = cfg.get_value("character", "biomes",   [0])
	stats          = cfg.get_value("character", "stats",      CLASS_BASE_STATS["warrior"].duplicate())
	equipped_items = cfg.get_value("character", "equipped",   {})
	check_biome_unlocks()
	snapshot_updated.emit()
	return true


func has_save() -> bool:
	return FileAccess.file_exists(SAVE_PATH)

func has_character() -> bool:
	return character_id != ""

func delete_save() -> void:
	character_id = ""
	DirAccess.remove_absolute(ProjectSettings.globalize_path(SAVE_PATH))


# ── Pomocnicze settery (auto-zapis po każdej zmianie) ─────────────────────────

func add_gold(amount: int) -> void:
	gold += amount
	save_local()

func set_level(new_level: int) -> void:
	level = new_level
	check_biome_unlocks()
	save_local()

func add_xp(amount: int) -> void:
	current_xp += amount
	while current_xp >= xp_to_next_level():
		current_xp -= xp_to_next_level()
		set_level(level + 1)
		unspent_points += 1
	save_local()

func set_hp(new_hp: int) -> void:
	current_hp = clampi(new_hp, 0, max_hp)
	save_local()

func xp_to_next_level() -> int:
	return int(floor(1000.0 * pow(level, 1.4)))

# Zachowana kompatybilność z kodem który używa load_snapshot()
func load_snapshot(data: Dictionary) -> void:
	if data.has("name"):   char_name  = data["name"]
	if data.has("class"):  char_class = data["class"]
	if data.has("level"):  level      = data["level"]
	if data.has("gold"):   gold       = data["gold"]
	check_biome_unlocks()
	save_local()
	snapshot_updated.emit()
