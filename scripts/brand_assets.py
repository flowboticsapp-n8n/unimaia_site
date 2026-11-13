"""Gera as variações da logo oficial da Unimaia (brand/unimaia-logo-original.webp),
da logo da Ótica Maia (brand/otica-maia-logo-original.jpg)
e o crédito da Flowbotics no rodapé (brand/flowbotics-logo-original.webp).

Rodar só quando a logo original mudar (não faz parte do build):
    python3 scripts/brand_assets.py

Requisitos: Python 3.10+, Pillow com suporte a AVIF (Pillow >= 11.3) e numpy.
Saída (versionada no Git):
    src/static/assets/brand/  -> logos em AVIF, WebP e PNG (1x e 2x), claras e para fundo escuro
    src/static/               -> favicon.ico, favicon-32.png, apple-touch-icon.png, icon-512.png

Se trocar a logo, mude VERSION: o nome dos arquivos muda e o cache de 1 ano do navegador não serve a antiga.
"""

from pathlib import Path

import numpy as np
from PIL import Image

VERSION = "v1"
ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "brand" / "unimaia-logo-original.webp"
OUT_BRAND = ROOT / "src" / "static" / "assets" / "brand"
OUT_STATIC = ROOT / "src" / "static"

# Linhas (em pixels da original) que separam o símbolo "M" da palavra UNIMAIA.
MARK_ROWS = (380, 672)
WORD_ROWS = (672, 860)

WHITE = (255, 255, 255)


def remove_background(img: Image.Image) -> Image.Image:
    """Fundo branco -> transparente, só na região externa (os traços brancos dentro das letras ficam).

    1) marca como fundo os pixels quase brancos conectados à borda (flood fill);
    2) numa faixa de 2 px em volta, aplica "color to alpha" contra o branco, para a borda ficar suave
       e sem halo branco quando a logo aparece sobre fundo escuro.
    """
    rgb = np.asarray(img.convert("RGB")).astype(np.float64)
    h, w, _ = rgb.shape
    whiteness_gap = 255 - rgb.min(axis=2)  # 0 = branco puro

    near_white = whiteness_gap < 40
    outside = np.zeros((h, w), dtype=bool)
    stack = [(0, x) for x in range(w)] + [(h - 1, x) for x in range(w)]
    stack += [(y, 0) for y in range(h)] + [(y, w - 1) for y in range(h)]
    while stack:
        y, x = stack.pop()
        if outside[y, x] or not near_white[y, x]:
            continue
        outside[y, x] = True
        if y > 0:
            stack.append((y - 1, x))
        if y < h - 1:
            stack.append((y + 1, x))
        if x > 0:
            stack.append((y, x - 1))
        if x < w - 1:
            stack.append((y, x + 1))

    band = outside.copy()
    for _ in range(2):  # dilata 2 px para pegar o anti-aliasing da borda
        grown = band.copy()
        grown[1:, :] |= band[:-1, :]
        grown[:-1, :] |= band[1:, :]
        grown[:, 1:] |= band[:, :-1]
        grown[:, :-1] |= band[:, 1:]
        band = grown

    alpha = np.ones((h, w))
    ctoa = np.clip(whiteness_gap / 255.0, 0, 1)
    alpha[band] = ctoa[band]
    alpha[outside & (whiteness_gap < 12)] = 0

    # "Desmistura" a cor do branco nos pixels semitransparentes.
    a = alpha[..., None]
    fg = np.where(a > 0, (rgb - (1 - a) * 255) / np.maximum(a, 1e-6), 0)
    fg = np.clip(fg, 0, 255)
    out = np.dstack([fg, alpha * 255]).round().astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def negative_mark(mark: Image.Image) -> Image.Image:
    """Versão para fundo escuro: o "V" azul-marinho vira branco (as barras azuis ficam iguais)."""
    arr = np.asarray(mark).copy()
    r, g, b, a = (arr[..., i].astype(int) for i in range(4))
    navy = (g < 62) & (b < 115) & (r < 40) & (a > 0)
    # Só a peça do "V": flood fill a partir da ponta de baixo do V (centro da imagem).
    # Evita pintar de branco os trechos mais escuros das barras azuis, que são peças separadas.
    h, w = navy.shape
    seed = next((y, w // 2) for y in range(int(h * 0.8), 0, -1) if navy[y, w // 2])
    v_shape = np.zeros_like(navy)
    stack = [seed]
    while stack:
        y, x = stack.pop()
        if v_shape[y, x] or not navy[y, x]:
            continue
        v_shape[y, x] = True
        stack += [(yy, xx) for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)) if 0 <= yy < h and 0 <= xx < w]
    arr[v_shape, 0:3] = 255
    return Image.fromarray(arr, "RGBA")


def trim(img: Image.Image, min_alpha: int = 0) -> Image.Image:
    """Corta as bordas transparentes. min_alpha ignora "poeira" quase invisível em volta da arte."""
    mask = img.getchannel("A").point(lambda v: 255 if v > min_alpha else 0)
    return img.crop(mask.getbbox())


def horizontal_lockup(mark: Image.Image, word: Image.Image, height: int) -> Image.Image:
    """Símbolo à esquerda e palavra à direita, para caber no cabeçalho."""
    mark_h = height
    mark_w = round(mark.width * mark_h / mark.height)
    word_h = round(height * 0.56)
    word_w = round(word.width * word_h / word.height)
    gap = round(height * 0.22)
    canvas = Image.new("RGBA", (mark_w + gap + word_w, height), (0, 0, 0, 0))
    canvas.alpha_composite(mark.resize((mark_w, mark_h), Image.LANCZOS), (0, 0))
    canvas.alpha_composite(word.resize((word_w, word_h), Image.LANCZOS), (mark_w + gap, (height - word_h) // 2))
    return canvas


def save_all(img: Image.Image, stem: str) -> None:
    img.save(OUT_BRAND / f"{stem}.avif", quality=70)
    img.save(OUT_BRAND / f"{stem}.webp", quality=85, method=6)
    img.save(OUT_BRAND / f"{stem}.png", optimize=True)


def square_icon(mark: Image.Image, size: int, background=None, padding=0.12) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), background or (0, 0, 0, 0))
    inner = round(size * (1 - 2 * padding))
    scale = inner / max(mark.width, mark.height)
    m = mark.resize((max(1, round(mark.width * scale)), max(1, round(mark.height * scale))), Image.LANCZOS)
    canvas.alpha_composite(m, ((size - m.width) // 2, (size - m.height) // 2))
    return canvas


FLOWBOTICS_SRC = ROOT / "brand" / "flowbotics-logo-original.webp"
# Colunas (pixels da original) da palavra "Flow", escrita em azul-marinho; "botics" começa depois.
FLOWBOTICS_DARK_WORD_COLS = (630, 1199)


def flowbotics_assets() -> list:
    """Logo da Flowbotics (crédito "Desenvolvido por" no rodapé escuro): "Flow" vira branco."""
    logo = Image.open(FLOWBOTICS_SRC).convert("RGBA")  # a original já tem fundo transparente
    arr = np.asarray(logo).copy()
    x0, x1 = FLOWBOTICS_DARK_WORD_COLS
    region = arr[:, x0:x1]
    region[region[..., 3] > 0, 0:3] = 255
    # A original tem pixels com alfa 1 a 9 espalhados pelo fundo: limpa e ignora no corte.
    arr[arr[..., 3] <= 12, 3] = 0
    dark = trim(Image.fromarray(arr, "RGBA"), min_alpha=12)
    out = []
    big_h = 48  # 2x de h-6 (24 px)
    big_w = round(dark.width * big_h / dark.height)
    big_w += big_w % 2  # largura par: a 1x fica exatamente com a metade
    big = dark.resize((big_w, big_h), Image.LANCZOS)
    small = big.resize((big_w // 2, big_h // 2), Image.LANCZOS)
    save_all(big, f"flowbotics-dark-{VERSION}-48")
    save_all(small, f"flowbotics-dark-{VERSION}-24")
    out.append((f"flowbotics-dark-{VERSION}", small.size, big.size))
    return out


OTICA_SRC = ROOT / "brand" / "otica-maia-logo-original.jpg"


def max_filter(values: np.ndarray, radius: int) -> np.ndarray:
    """Maior valor na vizinhança (2*radius+1)² de cada pixel, só com numpy (sem scipy)."""
    padded = np.pad(values, radius, mode="edge")
    h, w = values.shape
    out = np.zeros_like(values)
    for dy in range(2 * radius + 1):
        for dx in range(2 * radius + 1):
            np.maximum(out, padded[dy:dy + h, dx:dx + w], out=out)
    return out


def remove_black_background(img: Image.Image) -> Image.Image:
    """Fundo preto -> transparente, mantendo o degradê dourado.

    Na arte não existe preto de propósito (é tudo dourado), então todo pixel quase preto é fundo,
    inclusive o miolo das letras. Na borda das letras, o alfa é o brilho do pixel dividido pelo brilho
    do dourado vizinho: assim a borda fica suave e o dourado escuro não vira semitransparente.
    """
    rgb = np.asarray(img.convert("RGB")).astype(np.float64)
    bright = rgb.max(axis=2)
    alpha = np.clip(bright / np.maximum(max_filter(bright, 3), 1), 0, 1)
    background = bright < 24  # inclui o "chuvisco" da compressão JPEG no fundo
    alpha[background] = 0
    solid = ~max_filter(background.astype(np.float64), 1).astype(bool)  # longe do fundo: 100% opaco
    alpha[solid] = 1
    a = alpha[..., None]
    fg = np.where(a > 0, rgb / np.maximum(a, 1e-6), 0)  # "desmistura" do preto
    out = np.dstack([np.clip(fg, 0, 255), alpha * 255]).round().astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def otica_assets() -> list:
    """Logo da Ótica Maia sem o fundo preto, para usar sobre fundo escuro (seção da ótica)."""
    logo = trim(remove_black_background(Image.open(OTICA_SRC)), min_alpha=12)
    out = []
    big_w = 640  # 2x de 320 px de largura
    big_h = round(logo.height * big_w / logo.width)
    big_h += big_h % 2  # altura par: a 1x fica exatamente com a metade
    big = logo.resize((big_w, big_h), Image.LANCZOS)
    small = big.resize((big_w // 2, big_h // 2), Image.LANCZOS)
    save_all(big, f"otica-maia-{VERSION}-640")
    save_all(small, f"otica-maia-{VERSION}-320")
    out.append((f"otica-maia-{VERSION}", small.size, big.size))
    return out


def main() -> None:
    OUT_BRAND.mkdir(parents=True, exist_ok=True)
    full = remove_background(Image.open(SRC))
    mark = trim(full.crop((0, MARK_ROWS[0], full.width, MARK_ROWS[1])))
    word = trim(full.crop((0, WORD_ROWS[0], full.width, WORD_ROWS[1])))
    vertical = trim(full)
    mark_dark = negative_mark(mark)
    vertical_dark = vertical.copy()
    top = vertical_dark.crop((0, 0, vertical_dark.width, mark.height + 2))
    top_box = top.getchannel("A").getbbox()  # posição exata do símbolo dentro da logo vertical
    vertical_dark.paste(negative_mark(top.crop(top_box)), top_box[:2])

    # Cabeçalho (h-10 = 40 px): monta a 2x (80 px) e reduz pela metade para a 1x.
    # As duas ficam com a MESMA proporção, então o width/height do HTML vale para ambas (sem "pulo").
    sizes = []
    for stem, m in ((f"logo-horizontal-{VERSION}", mark), (f"logo-horizontal-dark-{VERSION}", mark_dark)):
        big = horizontal_lockup(m, word, 80)
        if big.width % 2:  # largura par: a 1x fica exatamente com a metade
            padded = Image.new("RGBA", (big.width + 1, big.height), (0, 0, 0, 0))
            padded.alpha_composite(big, (0, 0))
            big = padded
        small = big.resize((big.width // 2, big.height // 2), Image.LANCZOS)
        save_all(big, f"{stem}-80")
        save_all(small, f"{stem}-40")
        sizes.append((stem, small.size, big.size))
    for w in (320, 640):  # logo vertical (composição original) para usos maiores
        h = round(vertical.height * w / vertical.width)
        save_all(vertical.resize((w, h), Image.LANCZOS), f"logo-vertical-{VERSION}-{w}")
        save_all(vertical_dark.resize((w, h), Image.LANCZOS), f"logo-vertical-dark-{VERSION}-{w}")
    save_all(square_icon(mark, 256, padding=0.04), f"simbolo-{VERSION}-256")

    # Ícones do navegador e do celular (só o símbolo, que é legível em tamanho pequeno).
    square_icon(mark, 32, padding=0.04).save(OUT_STATIC / "favicon-32.png", optimize=True)
    square_icon(mark, 48, padding=0.04).save(
        OUT_STATIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)]
    )
    # iPhone preenche transparência com preto: ícone com fundo branco.
    square_icon(mark, 180, background=(255, 255, 255, 255), padding=0.16).convert("RGB").save(
        OUT_STATIC / "apple-touch-icon.png", optimize=True
    )
    square_icon(mark, 512, background=(255, 255, 255, 255), padding=0.16).convert("RGB").save(
        OUT_STATIC / "icon-512.png", optimize=True
    )

    sizes += flowbotics_assets()
    sizes += otica_assets()
    for stem, small, big in sizes:
        print(f"{stem}: 1x {small[0]}x{small[1]}, 2x {big[0]}x{big[1]}  (use width={small[0]} height={small[1]} no HTML)")
    for f in sorted(OUT_BRAND.iterdir()):
        print(f"{f.name}: {f.stat().st_size} bytes")


if __name__ == "__main__":
    main()
