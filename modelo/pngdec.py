import zlib, struct, sys
def leer(f):
    d=open(f,'rb').read(); i=8; idat=b''; pal=None; trns=None
    while i<len(d):
        n,=struct.unpack('>I',d[i:i+4]); t=d[i+4:i+8]; c=d[i+8:i+8+n]; i+=12+n
        if t==b'IHDR': w,h,bd,ct=struct.unpack('>IIBB',c[:10])
        elif t==b'PLTE': pal=[tuple(c[k:k+3]) for k in range(0,len(c),3)]
        elif t==b'tRNS': trns=c
        elif t==b'IDAT': idat+=c
    raw=zlib.decompress(idat); bpp={2:3,6:4,3:1,0:1,4:2}[ct]; stride=w*bpp; rows=[]; prev=bytearray(stride); p=0
    for y in range(h):
        ft=raw[p]; line=bytearray(raw[p+1:p+1+stride]); p+=1+stride
        for x in range(stride):
            a=line[x-bpp] if x>=bpp else 0; b=prev[x]; cc=prev[x-bpp] if x>=bpp else 0
            if ft==1: line[x]=(line[x]+a)&255
            elif ft==2: line[x]=(line[x]+b)&255
            elif ft==3: line[x]=(line[x]+(a+b)//2)&255
            elif ft==4:
                pp=a+b-cc; pa,pb,pc=abs(pp-a),abs(pp-b),abs(pp-cc)
                line[x]=(line[x]+(a if pa<=pb and pa<=pc else b if pb<=pc else cc))&255
        rows.append(bytes(line)); prev=line
    def px(x,y):
        r=rows[y]
        if ct==3: k=r[x]; return pal[k]+((trns[k] if trns and k<len(trns) else 255),)
        if ct==6: return tuple(r[4*x:4*x+4])
        if ct==2: return tuple(r[3*x:3*x+3])+(255,)
        return (r[bpp*x],)*3+(255,)
    return w,h,ct,px

def cat(r,g,b):
    if abs(r-g)<14 and abs(g-b)<14: return 0
    if r>150 and b<120: return 3
    if g>b+15: return 2
    return 1
