"""Вирізає 6 піктограм категорій ходів з ілюстрацій грального набору.

Петрогліфи беруться зі сканів __zalizna-prysiaha-hralnyj-nabir__/moves:
вогнище (пригода), поселення (стосунки), воїни зі списом (битва), змій
(пошкодження), коло з хрестом (завдання), оракул (оракул). Результат —
PNG-маска 128x128 у website/src/assets/moves; колір дає CSS (--cat-*).

Запуск з кореня репозиторію (потрібен Pillow):
    python3 website/scripts/crop-move-icons.py /tmp/icons-preview.png
Аргумент — куди зберегти зведене прев'ю всіх шести.
"""
from PIL import Image, ImageOps
import sys
S=1.75
base='__zalizna-prysiaha-hralnyj-nabir__/moves/zalizna-prysiaha-hralnyj-nabir_page-%04d.jpg'
crops={
 'adventure':(7,(262,1620,400,1800)),
 'relationship':(8,(872,1700,1100,1852)),
 'combat':(11,(118,1425,505,1840)),
 'suffer':(13,(552,1585,905,1915)),
 'quest':(14,(465,1460,610,1600)),
 'fate':(15,(725,1185,1255,1935)),
}
out='website/src/assets/moves/'
prev=Image.new('RGB',(6*140,140),'white')
for i,(k,(p,box)) in enumerate(crops.items()):
    im=Image.open(base%p).convert('L')
    im=im.crop(tuple(int(v*S) for v in box))
    mask=im.point(lambda v:255 if v<110 else 0)
    if k=='suffer':
        from PIL import ImageDraw
        ImageDraw.Draw(mask).rectangle([int((725-552)*S),0,mask.size[0],int((1660-1585)*S)],fill=0)
    bb=mask.getbbox(); mask=mask.crop(bb)
    w,h=mask.size; side=max(w,h)+8
    sq=Image.new('L',(side,side),0); sq.paste(mask,((side-w)//2,(side-h)//2))
    sq=sq.resize((128,128),Image.LANCZOS)
    rgba=Image.new('RGBA',(128,128),(0,0,0,0)); rgba.putalpha(sq)
    black=Image.new('RGBA',(128,128),(0,0,0,255)); black.putalpha(sq)
    black.save(out+k+'.png',optimize=True)
    prev.paste(Image.composite(Image.new('RGB',(128,128),'black'),Image.new('RGB',(128,128),'white'),sq),(i*140+6,6))
prev.save(sys.argv[1])
