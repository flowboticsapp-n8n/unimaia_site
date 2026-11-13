"""Gera a imagem de compartilhamento do site (og:image, 1200x630), usada na prévia do WhatsApp,
Instagram e Facebook: foto do consultório ao fundo, véu azul da marca, logo e frase no centro.

Rodar só quando a foto, a logo ou os dados mudarem (não faz parte do build):
    python3 scripts/og_image.py

Requisitos: Python 3.10+ e Pillow com FreeType e raqm (lê as fontes .woff2 do site).
Saída (versionada no Git): src/static/assets/img/og-unimaia-<versão>.jpg
Se mudar a arte, suba VERSION e o nome em src/partials/layout.html: o WhatsApp e o Facebook
guardam a prévia em cache pela URL da imagem.
"""

import json
from pathlib import Path
from urllib.parse import urlparse

from PIL import Image, ImageDraw, ImageFont, ImageOps

VERSION = "v1"
ROOT = Path(__file__).resolve().parent.parent
PHOTO = ROOT / "media" / "hero-consulta-original.jpg"  # mesma foto (de esboço) do topo da página inicial
LOGO = ROOT / "src" / "static" / "assets" / "brand" / "logo-vertical-dark-v1-640.png"  # versão para fundo escuro
FONTS = ROOT / "src" / "fonts"
OUT = ROOT / "src" / "static" / "assets" / "img" / f"og-unimaia-{VERSION}.jpg"

W, H = 1200, 630
BRAND_950 = (6, 24, 46)
BRAND_100 = (214, 244, 254)
BRAND_300 = (109, 207, 246)
WHITE = (255, 255, 255)


def font(name: str, size: int, weight: int) -> ImageFont.FreeTypeFont:
    f = ImageFont.truetype(str(FONTS / name), size)
    f.set_variation_by_axes([weight])  # fontes variáveis: escolhe o peso
    return f


def background() -> Image.Image:
    # Espelhada como no site (a médica fica à esquerda) e cortada para 1200x630 a partir do centro.
    photo = ImageOps.mirror(Image.open(PHOTO).convert("RGB"))
    photo = ImageOps.fit(photo, (W, H), Image.LANCZOS, centering=(0.5, 0.4))
    # Véu da marca: escurece a foto para o texto ter contraste, mais forte embaixo.
    veil = Image.new("RGBA", (W, H))
    draw = ImageDraw.Draw(veil)
    for y in range(H):
        alpha = round(255 * (0.80 + 0.12 * y / H))
        draw.line([(0, y), (W, y)], fill=BRAND_950 + (alpha,))
    return Image.alpha_composite(photo.convert("RGBA"), veil)


def main() -> None:
    config = json.loads((ROOT / "site.config.json").read_text(encoding="utf-8"))
    host = urlparse(config["siteUrl"]).netloc

    img = background()
    draw = ImageDraw.Draw(img)

    logo = Image.open(LOGO).convert("RGBA")
    logo_w = 440
    logo = logo.resize((logo_w, round(logo.height * logo_w / logo.width)), Image.LANCZOS)
    top = 92
    img.alpha_composite(logo, ((W - logo.width) // 2, top))

    y = top + logo.height + 44
    draw.text((W / 2, y), "Especialistas em um só lugar", font=font("outfit-latin-wght-normal.woff2", 64, 800), fill=WHITE, anchor="mt")
    y += 88
    draw.text(
        (W / 2, y),
        "Consultas · Odontologia · Exames · Vacinas",
        font=font("plus-jakarta-sans-latin-wght-normal.woff2", 30, 500),
        fill=BRAND_100,
        anchor="mt",
    )

    # Rodapé da arte: cidade e endereço do site, numa "pílula".
    label = f"{config['city']}-{config['state']}  ·  {host}"
    small = font("plus-jakarta-sans-latin-wght-normal.woff2", 24, 700)
    box = draw.textbbox((W / 2, H - 70), label, font=small, anchor="mm")
    pad_x, pad_y = 26, 14
    draw.rounded_rectangle(
        (box[0] - pad_x, box[1] - pad_y, box[2] + pad_x, box[3] + pad_y),
        radius=40,
        outline=BRAND_300 + (150,),
        width=2,
        fill=(255, 255, 255, 18),
    )
    draw.text((W / 2, H - 70), label, font=small, fill=BRAND_300, anchor="mm")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    # JPEG comum (não progressivo) e leve: alguns apps não mostram a prévia se a imagem for pesada.
    img.convert("RGB").save(OUT, quality=84, optimize=True, progressive=False)
    print(f"{OUT.relative_to(ROOT)}: {W}x{H}, {OUT.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
