"""Assemble the game into one page: head.html + every module in order.txt + tail.html -> index.html."""
import os
head=open('head.html').read(); tail=open('tail.html').read()
out=[head]
for name in open('order.txt').read().split():
    body=open(name).read().rstrip('\n')
    out.append(f'// ---- {name} ----\n__m["{name}"] = (() => {{\n{body}\n}})();\n\n')
s=''.join(out).rstrip('\n')+'\n'+tail.lstrip('\n')
open('index.html','w').write(s)
print(len(s))
