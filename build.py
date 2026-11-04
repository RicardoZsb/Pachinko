"""构建脚本
  python3 build.py          → dist/index.html（网页版）、dist/artifact.html
  python3 build.py --app    → 另外生成 Windows 软件 dist/弹珠游园会.exe（需要 Node.js）

Windows 软件 = Neutralinojs 运行时（vendor/neutralino-win_x64.exe）
             + 页面资源打成 resources.neu（ASAR 格式）后内嵌进 exe
             + 自定义图标与版本信息（tools/win/patch-exe.cjs）
"""
import json
import pathlib
import shutil
import struct
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / 'src'
VENDOR = ROOT / 'vendor'
DIST = ROOT / 'dist'
BUILD = ROOT / 'build'
VERSION = '2.1.0'
APP_NAME = '弹珠游园会'

JS_ORDER = ['core.js', 'audio.js', 'render.js', 'store.js', 'ui.js']
GOOGLE_FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">'
                '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
                '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=ZCOOL+KuaiLe&display=swap">')
LOCAL_FONTS_CSS = """
@font-face { font-family: "ZCOOL KuaiLe"; src: url("fonts/ZCOOLKuaiLe-Regular.ttf") format("truetype"); font-display: swap; }
@font-face { font-family: "Baloo 2"; src: url("fonts/Baloo2-wght.ttf") format("truetype"); font-weight: 400 800; font-display: swap; }
"""


def read(p):
    return (SRC / p).read_text(encoding='utf-8')


def page(head_extra, css, body, scripts, full=True):
    title = f'<title>{APP_NAME}</title>'
    inner_head = f'{title}\n{head_extra}\n<style>\n{css}\n</style>'
    if not full:  # 发布为网页卡片时不带 doctype/head/body
        return f'{inner_head}\n{body}\n{scripts}\n'
    return ('<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            f'{inner_head}\n</head>\n<body>\n{body}\n{scripts}\n</body>\n</html>\n')


def build_web():
    css, body = read('style.css'), read('body.html')
    js = '\n'.join(read(f) for f in JS_ORDER)
    scripts = f'<script>\n{js}\n</script>'
    DIST.mkdir(exist_ok=True)
    (DIST / 'index.html').write_text(page(GOOGLE_FONTS, css, body, scripts), encoding='utf-8')
    # 网页卡片版不允许页面触发下载，隐藏“导出表格”按钮
    art_scripts = '<script>window.PB_NO_DOWNLOAD = true;</script>\n' + scripts
    (DIST / 'artifact.html').write_text(page(GOOGLE_FONTS, css, body, art_scripts, full=False), encoding='utf-8')
    print('网页版 → dist/index.html, dist/artifact.html')


def asar_pack(entries):
    """entries: [(归档内路径, bytes)] → ASAR（Neutralino 的 resources.neu）"""
    header = {'files': {}}
    offset, blobs = 0, []
    for path, data in entries:
        parts = path.strip('/').split('/')
        node = header
        for p in parts[:-1]:
            node = node['files'].setdefault(p, {'files': {}})
        node['files'][parts[-1]] = {'size': len(data), 'offset': str(offset)}
        offset += len(data)
        blobs.append(data)
    js = json.dumps(header, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    js += b' ' * ((-len(js)) % 4)            # 用空格补齐 4 字节，避免头部末尾出现 \0
    header_pickle = struct.pack('<II', 4 + len(js), len(js)) + js
    size_pickle = struct.pack('<II', 4, len(header_pickle))
    return size_pickle + header_pickle + b''.join(blobs)


def neutralino_config():
    return {
        'applicationId': 'fair.pinball.app',
        'version': VERSION,
        'defaultMode': 'window',
        'port': 0,
        'documentRoot': '/resources/',
        'url': '/',
        'enableServer': True,
        'enableNativeAPI': True,
        'tokenSecurity': 'one-time',
        'logging': {'enabled': False, 'writeToLogFile': False},
        'nativeAllowList': [
            'app.exit', 'os.getPath', 'os.open',
            'filesystem.readFile', 'filesystem.writeFile', 'filesystem.createDirectory',
            'filesystem.move', 'filesystem.remove', 'filesystem.getStats',
            'window.setFullScreen', 'window.exitFullScreen', 'window.isFullScreen'
        ],
        'modes': {
            'window': {
                'title': APP_NAME,
                'width': 1600, 'height': 900, 'minWidth': 960, 'minHeight': 540,
                'maximize': True, 'fullScreen': False, 'alwaysOnTop': False,
                'icon': '/resources/icon.png',
                'enableInspector': False, 'borderless': False, 'hidden': False, 'resizable': True,
                'exitProcessOnClose': True, 'useSavedState': False
            }
        },
        'cli': {
            'binaryName': 'pinball-fair', 'resourcesPath': '/resources/',
            'clientLibrary': '/resources/js/neutralino.js', 'binaryVersion': '6.9.0', 'clientVersion': '6.9.0'
        }
    }


def build_app():
    css = LOCAL_FONTS_CSS + read('style.css')
    body = read('body.html')
    js = '\n'.join(read(f) for f in JS_ORDER)
    scripts = f'<script src="js/neutralino.js"></script>\n<script>\n{js}\n</script>'
    html = page('', css, body, scripts)
    files = [
        ('neutralino.config.json', json.dumps(neutralino_config(), ensure_ascii=False, indent=2).encode('utf-8')),
        ('resources/index.html', html.encode('utf-8')),
        ('resources/js/neutralino.js', (VENDOR / 'neutralino.js').read_bytes()),
        ('resources/fonts/ZCOOLKuaiLe-Regular.ttf', (VENDOR / 'fonts' / 'ZCOOLKuaiLe-Regular.ttf').read_bytes()),
        ('resources/fonts/Baloo2-wght.ttf', (VENDOR / 'fonts' / 'Baloo2-wght.ttf').read_bytes()),
        ('resources/icon.png', (ROOT / 'tools' / 'win' / 'icon.png').read_bytes()),
    ]
    BUILD.mkdir(exist_ok=True)
    # 同时保留一份目录结构，便于检查或用其他平台的运行时调试
    app_dir = BUILD / 'app'
    if app_dir.exists():
        shutil.rmtree(app_dir)
    for path, data in files:
        p = app_dir / path
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(data)
    neu = BUILD / 'resources.neu'
    neu.write_bytes(asar_pack(files))
    print(f'资源包 → build/resources.neu（{neu.stat().st_size / 1024 / 1024:.2f} MB）')
    out = DIST / f'{APP_NAME}.exe'
    subprocess.run(['node', str(ROOT / 'tools' / 'win' / 'patch-exe.cjs'),
                    str(VENDOR / 'neutralino-win_x64.exe'), str(neu),
                    str(ROOT / 'tools' / 'win' / 'icon.ico'), str(out), VERSION], check=True)


if __name__ == '__main__':
    build_web()
    if '--app' in sys.argv:
        build_app()
