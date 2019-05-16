import sys
import struct

fi = open(sys.argv[1],"rb")
fo = open(sys.argv[2],"wb+")

for ch in range(4):
    print ch, sys.argv[3]
    word = fi.read(4)
    data = struct.unpack('i', word)
    while data[0] != -1:
        if ch == int(sys.argv[3]):
            fo.write(struct.pack('i',data[0]))
        word = fi.read(4)
        data = struct.unpack('i', word)
    if ch == int(sys.argv[3]):
        fo.write(struct.pack('i',data[0]))

rest = fi.read()
fo.write(rest)

fi.close()
fo.close()
