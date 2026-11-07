# Building sprite mapping

Source: `user_specs/building_structure_ref_tiers.jpg` (user-provided concept sheet).
Each type uses a cropped, background-keyed WebP in `assets/bld/<type>.webp` plus a 0.5× mip `assets/bld/<type>_m.webp`.

| Game type | Name | Sheet picture |
|-----------|------|----------------|
| hall | 宗門大殿 | Sect Hall |
| altar | 求武台 | Recruitment Platform |
| house | 住房 | Housing |
| wudao | 武道館 | Martial Arts Hall |
| lianwu | 練武閣 | Training Pavilion |
| library | 長書閣 | Sutra Pavilion |
| alchemy | 煉丹房 | Alchemy Room |
| forge | 鍛造坊 | Forge (宗師 row) |
| cangku | 倉庫 | Warehouse |
| shitang | 食堂 | Dining Hall |
| lingtian | 靈田 | Spirit Fields |
| renwutang | 任務堂 | Mission Hall |
| zhifatang | 執法堂 | Law Enforcement Hall |
| waishitang | 外事堂 | Foreign Affairs Hall |
| kuangchang | 礦場 | Mine |
| zongcang | 總倉 | Main Storage |
| juling | 聚靈陣 | Spirit Gathering Formation |
| lingshou | 靈獸欄 | Spirit Beast Enclosure |
| chuangong | 傳功殿 | Mantra Transfer Hall |
| tianjietai | 天劫台 | 天劫台 |
| huanjingta | 幻境試煉塔 | Illusion Trial Tower |
| xianyuan | 仙緣閣 | Celestial Fate Pavilion |
| qingxinge | 清心閣 | Heart Pavilion |
| fuluge | 符籙閣 | Talisman Pavilion |
| gongfage | 功法閣 | Mantra Pavilion (upper) |
| huzhen | 護宗陣 | Sect Protection Formation |
| yinglieci | 英烈祠 | Ancestor Shrine |
| laozu | 老祖隱居地 | Patriarch Seclusion Ground |
| lingmai | 靈脈源頭 | Spirit Vein Source |

Unused sheet pictures (no unique game type): Jin Dan Nourge, lower Mantra Pavilion, lower Forge.

Keying notes:
- Caption bars under each building were punched out.
- Band backgrounds (purple / teal / beige) were flood-filled from the crop edges; high-tier island clouds and purple swirls attached to the platform were kept.
- A few mid/martial sprites may still show a faint leftover diagram connector tick near the top if the stroke touched the roof.
- Fallback: if a PNG fails to load, the existing procedural drawer is used.

Cleanup notes (after first crop):
- Caption leftovers above mid-tier windows were wiped on: qingxinge, fuluge, gongfage, chuangong, juling, zongcang.
- huanjingta: left neighbor lantern (天劫台 fragment) partially wiped; a remnant may remain lower-left.
- High-tier island shots (huzhen, yinglieci, laozu, lingmai) keep painted sky/clouds/purple swirl around the platform — the band does not key cleanly from the island art, so they read as “sticker” islands rather than free-cut silhouettes.
- xianyuan keeps a soft teal halo and a sliver of a neighboring lantern on the right.
- Several mid-tier sprites (fuluge, gongfage, qingxinge, altar, forge, juling) may still show faint teal diagram connector ticks.
- Unused sheet pictures: Jin Dan Nourge, lower Mantra Pavilion, lower Forge.

## v5 cleanup
- Thin teal/white diagram connectors (plus-ticks and H/V strokes) removed from martial/mid sprites (house, forge, altar, wudao, lianwu, library, alchemy, qingxinge, juling, chuangong, fuluge, tianjietai, zongcang, …).
- Island / painted-band rectangles (huzhen, yinglieci, laozu, lingmai, xianyuan) keyed from the edges then cropped with an elliptical radial alpha fade so no hard box remains; swirl/clouds kept when they sit inside the ellipse.
- huanjingta: left-neighbor lantern component dropped; leftover sky faded.

## v6 fidelity + soft light (2026-11-06)

- Re-extracted from the original sheet at native crop resolution (no 128-color quantize, no 220px cap).
- Denoised JPEG grain (NLM) on the aligned crop; v5 silhouettes used as alpha masks so roofs/islands are not eaten by the keyer.
- Stored at 420px wide (≥2× typical on-screen width) plus 0.5× mips; WebP q82 / mip q78, total under 2.5 MB.
- Runtime: `imageSmoothingEnabled` + `imageSmoothingQuality='high'`, integer-ish dest rects, mip when drawn below 55% of source width.
- 仙氣 / purple glow / green mist: monotonic radial gradients, no stroked rings or cloud puffs, lower alpha, slow pulse.
- Island leftover sky kept as a softer radial veil (blurred, dimmer halo).

## v7 opaque interiors (2026-11-06)

Roof-tile / lattice / pillar-gap holes were punching through to the map. Every sprite’s outer silhouette is now morphologically closed and hole-filled; interior alpha is 255 (1px feathered outer edge). Islands keep a soft outer halo; platform bodies are solid. Hole colours inpainted from neighbouring building pixels; mint/teal speckles decontaminated.

## v9 AI regenerate (2026-11-06)

- Replaced all 29 sprites with high-res AI generations (reference: building_structure_ref_tiers.jpg + approved hall test).
- Magenta chroma-key (sampled corner ~#C60D69), despill, morphological hole-fill, 1px feather, trim, 512px WebP q88 + 256px mip.
- Total under 2.2 MB. Alpha interior holes: 0.
- hall reused the approved generated test image; others regenerated to match.

## v10 distinct duplicates (2026-11-06)

Replaced near-identical AI clones with style-matched variants derived from `hall.webp` (same isometric angle, line weight, tile rendering, stone base):
- **library**: taller multi-story 青瓦 pavilion (天一閣-inspired)
- **lianwu**: taller/narrower crimson-roof closed training pavilion
- **wudao**: open 演武場 based on altar stage + wooden dummies / racks / corner shed
- **renwutang**: amber roof + wooden notice board + banner
- **waishitang**: jade-teal roof + ceremonial gate, lanterns, 外/使 banners
- **hall**: original sprite unchanged

Backups: `assets/bld/bak_dup_20261106/`

## v11 form-only variants (2026-11-06)

User: 「外觀要改變，畫風不變」「不是改顏色」. Replaced v10 recolors.
Same hall palette (dark grey tiles, red-brown wood, cream walls, grey stone). Form-only changes:
- **library**: tall 2–3 story 藏書樓 pavilion (天一閣-like), tapering stacked roofs
- **lianwu**: long low 硬山/捲棚 training hall with open side bays and weapon racks
- **wudao**: open 演武場 stage with covered pavilion + training posts (original colors)
- **renwutang**: single-story hall with front 水榭 porch + wooden notice board
- **waishitang**: hall behind 牌坊 gate / courtyard wall (tiny lantern accents only)
- **hall**: unchanged

Backups: `bak_dup_20261106/` (pre-v10 originals), `bak_v2_20261106/` (v10 recolors)
