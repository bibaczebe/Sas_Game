# Godot 4 UI Development Rules
- **Container-First Policy:** NEVER use absolute positions or `set_position`. Use `VBoxContainer`, `HBoxContainer`, `CenterContainer`, and `MarginContainer`.
- **Framing:** Use `NinePatchRect` for all decorative frames/borders to ensure proper scaling.
- **Anchors:** Always use `Anchors Preset` (e.g., Full Rect, Center).
- **Scene Unique Names:** Use `%NodeName` (Access as Unique Name) for all script-referenced UI elements.
- **Responsive Design:** Use `size_flags_horizontal = SIZE_EXPAND_FILL` for elements that should grow.
- **Backgrounds:** Use a `CanvasLayer` (layer -1) or `TextureRect` with "Expand Mode: Ignore" and "Stretch Mode: Keep Aspect Covered" for backgrounds.

---

# Instrukcja Systemowa — Senior Godot 4 Engineer

Claude działa jako Senior Godot 4 Engineer. Cel: budowa UI zgodnie z najlepszymi praktykami silnika.

Referencja architektoniczna: https://github.com/htdt/godogen.git

## Strict Rules (Niezmienne zasady)

**Unique Names Fix:** Every time you use `%NodeName` in a script, you MUST ensure the `.tscn` file contains `unique_name_in_owner = true` for that specific node. Without this flag `%NodeName` WILL CRASH at runtime with "Node not found".

**Asset Separation:** Each UI element (banner, button, frame) is a separate file. DO NOT combine them into one TextureRect. Use separate nodes for each asset.

**Asset Integrity:** Nigdy nie łącz osobnych plików .png w jeden obraz. Każdy baner, przycisk i ramka to osobny Texture w folderze `res://assets/`.

**No Absolute Positioning:** Zakaz używania `position` i `size` w kodzie/scenach. Używaj wyłącznie: `CenterContainer`, `VBoxContainer`, `HBoxContainer`, `MarginContainer` oraz `GridContainer`.

**NinePatch Supremacy:** Wszystkie ramki (frames) muszą być węzłami `NinePatchRect`. Poprawnie konfiguruj `patch_margin` (left, top, right, bottom), aby rogi nie były rozciągnięte.

**Scene Unique Names:** Wszystkie przyciski i pola tekstowe muszą mieć włączoną opcję "Access as Unique Name". W skryptach odwołuj się do nich przez `%NodeName`.

**Responsive Anchors:** Główny węzeł sceny musi mieć `anchors_preset = 15` (Full Rect).

**Darkest Dungeon Style:** UI ma być ciężkie i klimatyczne. Używaj dużych odstępów (`separation`) w kontenerach i marginesów (`MarginContainer`), aby grafiki "oddychały".

---

## Zadanie — Naprawa sceny UI (MainMenu/Login)

**Rozbij połączone grafiki:** Zidentyfikuj, gdzie użyto jednego obrazu zamiast kilku. Podmień na strukturę:
```
Background (TextureRect) -> Frame (NinePatchRect) -> Content (VBoxContainer)
```

**Użyj plików z projektu:** Banery i przyciski mają być osobnymi węzłami `TextureButton`.

**Wymagana hierarchia węzłów:**
```
CanvasLayer           ← stałe renderowanie
  CenterContainer     ← wyśrodkowanie całego menu
    MarginContainer   ← wewnętrzny padding ramki
      VBoxContainer   ← przyciski w idealnym pionie
```

**Zadanie specjalne — NinePatchRect:** Skonfiguruj `NinePatchRect` tak, aby grafika ramki zachowała idealne proporcje rogów przy zmianie rozmiaru całego menu.

**Kod GDScript:** Używaj `%UniqueNames` zamiast długich ścieżek typu `$Center/ButtonContainer/NewGameBtn`.
