from pathlib import Path

ROOT = Path(r"c:\.Drive W\Code\lan-saturn-2")
OUT = ROOT / "assets" / "icons"
DUO = OUT / "duotone"
MONO = OUT / "mono"
DUO.mkdir(parents=True, exist_ok=True)
MONO.mkdir(parents=True, exist_ok=True)

PURPLE = "#A855F7"
CYAN = "#22D3EE"

# (filename, [(tag_body_with_{P}_and_{C}_placeholders)])
ICONS = {
    "01-alice": '''
  <circle cx="9" cy="8" r="3.5" stroke="{P}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M3 19c0-3 2.7-5 6-5s6 2 6 5" stroke="{P}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M16 11h5m0 0-2.5-2.5M21 11l-2.5 2.5" stroke="{C}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
''',
    "02-bob": '''
  <circle cx="15" cy="8" r="3.5" stroke="{P}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M9 19c0-3 2.7-5 6-5s6 2 6 5" stroke="{P}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M8 11H3m0 0 2.5-2.5M3 11l2.5 2.5" stroke="{C}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
''',
    "03-eve": '''
  <path d="M4 13c2.2-4.2 5-6 8-6s5.8 1.8 8 6c-2.2 4.2-5 6-8 6s-5.8-1.8-8-6Z" stroke="{P}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="12" cy="13" r="2.2" stroke="{C}" stroke-width="2"/>
  <path d="M12 3v2M5 6l1.5 1.5M19 6l-1.5 1.5" stroke="{C}" stroke-width="2" stroke-linecap="round"/>
''',
    "04-encryption": '''
  <rect x="5" y="11" width="14" height="9" rx="2" stroke="{P}" stroke-width="2" stroke-linejoin="round"/>
  <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="{C}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="12" cy="15.5" r="1" fill="{C}"/>
''',
    "05-decryption": '''
  <rect x="5" y="11" width="14" height="9" rx="2" stroke="{P}" stroke-width="2" stroke-linejoin="round"/>
  <path d="M8 11V7a4 4 0 0 1 7.6-1.7" stroke="{C}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="12" cy="15.5" r="1" fill="{C}"/>
''',
    "06-verified-aead": '''
  <path d="M12 3 19 6v6c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V6l7-3Z" stroke="{P}" stroke-width="2" stroke-linejoin="round"/>
  <path d="m9 12.2 2.1 2.1 4.2-4.3" stroke="{C}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
''',
    "07-packet-inspector": '''
  <rect x="3" y="5" width="14" height="12" rx="2" stroke="{P}" stroke-width="2" stroke-linejoin="round"/>
  <path d="M6.5 9h7M6.5 12.5h4" stroke="{P}" stroke-width="2" stroke-linecap="round"/>
  <circle cx="16.5" cy="15.5" r="3.2" stroke="{C}" stroke-width="2"/>
  <path d="m19 18 2.2 2.2" stroke="{C}" stroke-width="2" stroke-linecap="round"/>
''',
    "08-tampering": '''
  <path d="M12 4 21 19H3L12 4Z" stroke="{C}" stroke-width="2" stroke-linejoin="round"/>
  <path d="M12 9.5v4" stroke="{P}" stroke-width="2" stroke-linecap="round"/>
  <circle cx="12" cy="16.2" r="1" fill="{P}"/>
''',
    "09-replay-attack": '''
  <rect x="8.5" y="9" width="7" height="6" rx="1.2" stroke="{P}" stroke-width="2" stroke-linejoin="round"/>
  <path d="M19 12a7 7 0 1 1-2.1-5L19 9" stroke="{C}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M19 4.5V9h-4.5" stroke="{C}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
''',
    "10-key-exchange": '''
  <circle cx="7" cy="9" r="3" stroke="{P}" stroke-width="2"/>
  <path d="M10 9h10m-3 0v2.5M20 9v2.5" stroke="{P}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="17" cy="16" r="3" stroke="{C}" stroke-width="2"/>
  <path d="M14 16H4m3 0v-2.5M4 16v-2.5" stroke="{C}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
''',
    "11-secure-connection": '''
  <circle cx="5" cy="12" r="2.2" stroke="{C}" stroke-width="2"/>
  <circle cx="19" cy="12" r="2.2" stroke="{C}" stroke-width="2"/>
  <path d="M7.2 12H9m6 0h1.8" stroke="{C}" stroke-width="2" stroke-linecap="round"/>
  <path d="M12 6.5 16 8.2v3.6c0 2.7-1.7 4.7-4 5.5-2.3-.8-4-2.8-4-5.5V8.2l4-1.7Z" stroke="{P}" stroke-width="2" stroke-linejoin="round"/>
''',
    "12-attack-lab": '''
  <rect x="3" y="4" width="18" height="16" rx="2.5" stroke="{P}" stroke-width="2" stroke-linejoin="round"/>
  <path d="m7 9.5 2.5 2.5L7 14.5M11.5 14.5h3" stroke="{C}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M17.5 8v3.2c0 1.3-.8 2.3-2 2.8-1.2-.5-2-1.5-2-2.8V8l2-.8 2 .8Z" stroke="{C}" stroke-width="2" stroke-linejoin="round"/>
''',
}

for name, body in ICONS.items():
    duo_svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">{body.format(P=PURPLE, C=CYAN)}</svg>\n'
    mono_svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">{body.format(P="currentColor", C="currentColor")}</svg>\n'
    (DUO / f"{name}.svg").write_text(duo_svg, encoding="utf-8")
    (MONO / f"{name}.svg").write_text(mono_svg, encoding="utf-8")

# Copy pilot app-logo.svg and create monochrome app-logo-mono.svg
app_logo_duo = (ROOT / "tmp" / "custom-icons" / "lan-saturn-crypto-lab" / "app-logo.svg").read_text(encoding="utf-8")
(OUT / "app-logo.svg").write_text(app_logo_duo, encoding="utf-8")

app_logo_mono = '''<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" fill="none">
  <path d="M 96 292 C 58 260, 108 198, 256 172 C 404 146, 454 188, 416 220" stroke="currentColor" stroke-width="18" stroke-linecap="round" opacity="0.45"/>
  <path d="M 256 116 L 352 154 V 248 C 352 316, 308 364, 256 392 C 204 364, 160 316, 160 248 V 154 Z" stroke="currentColor" stroke-width="18" stroke-linejoin="round"/>
  <circle cx="256" cy="248" r="62" stroke="currentColor" stroke-width="14"/>
  <circle cx="256" cy="236" r="14" fill="currentColor"/>
  <path d="M 248 246 L 264 246 L 268 278 L 244 278 Z" fill="currentColor"/>
  <path d="M 76 308 C 122 346, 224 334, 304 300 C 392 262, 444 218, 434 192" stroke="currentColor" stroke-width="20" stroke-linecap="round"/>
</svg>
'''
(OUT / "app-logo-mono.svg").write_text(app_logo_mono, encoding="utf-8")
print(f"Generated {len(ICONS)*2 + 2} SVG files.")
