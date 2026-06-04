import urllib.request

urls = [
    'https://www.geogebra.org/material/iframe/id/yt7nyqkt/width/800/height/600/ai/false/smb/false/stb/false/b/false/v/false/asb/false/sri/true/rc/false',
    'https://www.geogebra.org/material/iframe/id/vby66mct/width/800/height/600/ai/false/smb/false/stb/false/b/false/v/false/asb/false/sri/true/rc/false',
]
for url in urls:
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            print(url)
            print(resp.status)
            print(len(resp.read()))
    except Exception as e:
        print(url)
        print('ERROR', e)
