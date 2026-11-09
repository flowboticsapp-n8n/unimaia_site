"""Gera versões otimizadas (AVIF, WebP e JPEG) das fotos do site a partir dos originais em media/.

Rodar só quando uma foto mudar (não faz parte do build):
    python3 scripts/optimize_images.py

Requisitos: Python 3.10+ e Pillow com suporte a AVIF (Pillow >= 11.3).
Saída (versionada no Git): src/static/assets/img/<nome>-<versão>-<largura>.{avif,webp,jpg}

Se trocar uma foto, suba a versão (v1 -> v2): o nome muda e o cache de 1 ano não serve a antiga.
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "static" / "assets" / "img"

IMAGES = [
    {
        # Médica conversando com paciente na mesa do consultório. Unsplash (licença gratuita),
        # foto de Vitaly Gariev: https://unsplash.com/photos/doctor-consulting-with-a-patient-in-an-office-MJmsLpeHPfg
        # Imagem de esboço para apresentar ao cliente; trocar por foto real da Unimaia.
        "source": ROOT / "media" / "hero-consulta-original.jpg",
        "name": "hero-consulta-v1",
        "crop": None,
        "widths": (640, 1024, 1600),
    },
]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for spec in IMAGES:
        img = Image.open(spec["source"]).convert("RGB")
        if spec.get("crop"):
            img = img.crop(spec["crop"])
        for width in spec["widths"]:
            height = round(img.height * width / img.width)
            resized = img.resize((width, height), Image.LANCZOS)
            stem = OUT / f"{spec['name']}-{width}"
            # Qualidade moderada: a foto fica atrás de um véu branco, detalhe fino não aparece.
            resized.save(f"{stem}.avif", quality=50)
            resized.save(f"{stem}.webp", quality=68, method=6)
            resized.save(f"{stem}.jpg", quality=72, optimize=True, progressive=True)
            sizes = {ext: (stem.with_suffix(f".{ext}")).stat().st_size for ext in ("avif", "webp", "jpg")}
            print(f"{spec['name']}-{width}: {width}x{height}  " + "  ".join(f"{k} {v // 1024} KB" for k, v in sizes.items()))


if __name__ == "__main__":
    main()
