/* 打包工具：内含 resedit (MIT, © jet2jet) 与 pe-library (MIT, © jet2jet)。源码 https://github.com/jet2jet/resedit-js 、https://github.com/jet2jet/pe-library-js */
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../../../../../tmp/claude-0/nl/pe-library-js/src/main/format/FormatBase.ts
var FormatBase = class {
  constructor(view) {
    this.view = view;
  }
  copyTo(bin, offset) {
    new Uint8Array(bin, offset, this.view.byteLength).set(
      new Uint8Array(
        this.view.buffer,
        this.view.byteOffset,
        this.view.byteLength
      )
    );
  }
  get byteLength() {
    return this.view.byteLength;
  }
};

// ../../../../../tmp/claude-0/nl/pe-library-js/src/main/format/ArrayFormatBase.ts
var ArrayFormatBase = class extends FormatBase {
  constructor(view) {
    super(view);
  }
  forEach(callback) {
    const len = this.length;
    const a = [];
    a.length = len;
    for (let i = 0; i < len; ++i) {
      a[i] = this.get(i);
    }
    for (let i = 0; i < len; ++i) {
      callback(a[i], i, this);
    }
  }
  _iterator() {
    return new class {
      constructor(base) {
        this.base = base;
        this.i = 0;
      }
      next() {
        if (this.i === this.base.length) {
          return {
            value: void 0,
            done: true
          };
        } else {
          return {
            value: this.base.get(this.i++),
            done: false
          };
        }
      }
    }(this);
  }
};
if (typeof Symbol !== "undefined") {
  ArrayFormatBase.prototype[Symbol.iterator] = // eslint-disable-next-line @typescript-eslint/unbound-method
  ArrayFormatBase.prototype._iterator;
}
var ArrayFormatBase_default = ArrayFormatBase;

// ../../../../../tmp/claude-0/nl/pe-library-js/src/main/format/ImageDataDirectoryArray.ts
var _ImageDataDirectoryArray = class _ImageDataDirectoryArray extends ArrayFormatBase_default {
  constructor(view) {
    super(view);
    this.length = 16;
  }
  /** @note This does not clone binary data; the changes to the array will modify the specified buffer `bin` */
  static from(bin, offset = 0) {
    return new _ImageDataDirectoryArray(new DataView(bin, offset, 128));
  }
  get(index) {
    return {
      virtualAddress: this.view.getUint32(index * 8, true),
      size: this.view.getUint32(4 + index * 8, true)
    };
  }
  set(index, data) {
    this.view.setUint32(index * 8, data.virtualAddress, true);
    this.view.setUint32(4 + index * 8, data.size, true);
  }
  findIndexByVirtualAddress(virtualAddress) {
    for (let i = 0; i < 16; ++i) {
      const va = this.view.getUint32(i * 8, true);
      const vs = this.view.getUint32(4 + i * 8, true);
      if (virtualAddress >= va && virtualAddress < va + vs) {
        return i;
      }
    }
    return null;
  }
};
_ImageDataDirectoryArray.size = 128;
// 16 * 8
_ImageDataDirectoryArray.itemSize = 8;
var ImageDataDirectoryArray = _ImageDataDirectoryArray;

// ../../../../../tmp/claude-0/nl/pe-library-js/src/main/format/ImageDirectoryEntry.ts
var ImageDirectoryEntry = {
  Export: 0,
  Import: 1,
  Resource: 2,
  Exception: 3,
  Certificate: 4,
  Security: 4,
  // alias
  BaseRelocation: 5,
  Debug: 6,
  Architecture: 7,
  GlobalPointer: 8,
  Tls: 9,
  TLS: 9,
  // alias
  LoadConfig: 10,
  BoundImport: 11,
  Iat: 12,
  IAT: 12,
  // alias
  DelayImport: 13,
  ComDescriptor: 14,
  COMDescriptor: 14
  // alias
};
var ImageDirectoryEntry_default = ImageDirectoryEntry;

// ../../../../../tmp/claude-0/nl/pe-library-js/src/main/util/functions.ts
function cloneObject(object) {
  const r = {};
  Object.keys(object).forEach((key) => {
    r[key] = object[key];
  });
  return r;
}
function createDataView(bin, byteOffset, byteLength) {
  if ("buffer" in bin) {
    let newOffset = bin.byteOffset;
    let newLength = bin.byteLength;
    if (typeof byteOffset !== "undefined") {
      newOffset += byteOffset;
      newLength -= byteOffset;
    }
    if (typeof byteLength !== "undefined") {
      newLength = byteLength;
    }
    return new DataView(bin.buffer, newOffset, newLength);
  } else {
    return new DataView(bin, byteOffset, byteLength);
  }
}
function calculateCheckSumForPE(bin, storeToBinary) {
  const dosHeader = ImageDosHeader.from(bin);
  const view = new DataView(bin);
  const checkSumOffset = dosHeader.newHeaderAddress + 88;
  let result = 0;
  const limit = 4294967296;
  const update = (dword) => {
    result += dword;
    if (result >= limit) {
      result = result % limit + (result / limit | 0);
    }
  };
  const len = view.byteLength;
  const lenExtra = len % 4;
  const lenAlign = len - lenExtra;
  for (let i = 0; i < lenAlign; i += 4) {
    if (i !== checkSumOffset) {
      update(view.getUint32(i, true));
    }
  }
  if (lenExtra !== 0) {
    let extra = 0;
    for (let i = 0; i < lenExtra; i++) {
      extra |= view.getUint8(lenAlign + i) << (3 - i) * 8;
    }
    update(extra);
  }
  result = (result & 65535) + (result >>> 16);
  result += result >>> 16;
  result = (result & 65535) + len;
  if (storeToBinary) {
    view.setUint32(checkSumOffset, result, true);
  }
  return result;
}
function roundUp(val, align) {
  return Math.floor((val + align - 1) / align) * align;
}
function copyBuffer(dest, destOffset, src, srcOffset, length) {
  const ua8Dest = "buffer" in dest ? new Uint8Array(
    dest.buffer,
    dest.byteOffset + (destOffset || 0),
    length
  ) : new Uint8Array(dest, destOffset, length);
  const ua8Src = "buffer" in src ? new Uint8Array(
    src.buffer,
    src.byteOffset + (srcOffset || 0),
    length
  ) : new Uint8Array(src, srcOffset, length);
  ua8Dest.set(ua8Src);
}
function allocatePartialBinary(binBase, offset, length) {
  const b = new ArrayBuffer(length);
  copyBuffer(b, 0, binBase, offset, length);
  return b;
}
function cloneToArrayBuffer(binBase) {
  if ("buffer" in binBase) {
    const b = new ArrayBuffer(binBase.byteLength);
    new Uint8Array(b).set(
      new Uint8Array(
        binBase.buffer,
        binBase.byteOffset,
        binBase.byteLength
      )
    );
    return b;
  } else {
    const b = new ArrayBuffer(binBase.byteLength);
    new Uint8Array(b).set(new Uint8Array(binBase));
    return b;
  }
}
function getFixedString(view, offset, length) {
  let actualLen = 0;
  for (let i = 0; i < length; ++i) {
    if (view.getUint8(offset + i) === 0) {
      break;
    }
    ++actualLen;
  }
  if (typeof Buffer !== "undefined") {
    return Buffer.from(
      view.buffer,
      view.byteOffset + offset,
      actualLen
    ).toString("utf8");
  } else if (typeof decodeURIComponent !== "undefined") {
    let s = "";
    for (let i = 0; i < actualLen; ++i) {
      const c = view.getUint8(offset + i);
      if (c < 16) {
        s += "%0" + c.toString(16);
      } else {
        s += "%" + c.toString(16);
      }
    }
    return decodeURIComponent(s);
  } else {
    let s = "";
    for (let i = 0; i < actualLen; ++i) {
      const c = view.getUint8(offset + i);
      s += String.fromCharCode(c);
    }
    return s;
  }
}
function setFixedString(view, offset, length, text) {
  if (typeof Buffer !== "undefined") {
    const u = new Uint8Array(view.buffer, view.byteOffset + offset, length);
    u.set(new Uint8Array(length));
    u.set(Buffer.from(text, "utf8").subarray(0, length));
  } else if (typeof encodeURIComponent !== "undefined") {
    const s = encodeURIComponent(text);
    for (let i = 0, j = 0; i < length; ++i) {
      if (j >= s.length) {
        view.setUint8(i + offset, 0);
      } else {
        const c = s.charCodeAt(j);
        if (c === 37) {
          const n = parseInt(s.substr(j + 1, 2), 16);
          if (typeof n === "number" && !isNaN(n)) {
            view.setUint8(i + offset, n);
          } else {
            view.setUint8(i + offset, 0);
          }
          j += 3;
        } else {
          view.setUint8(i + offset, c);
        }
      }
    }
  } else {
    for (let i = 0, j = 0; i < length; ++i) {
      if (j >= text.length) {
        view.setUint8(i + offset, 0);
      } else {
        const c = text.charCodeAt(j);
        view.setUint8(i + offset, c & 255);
      }
    }
  }
}
function binaryToString(bin) {
  if (typeof TextDecoder !== "undefined") {
    const dec = new TextDecoder();
    return dec.decode(bin);
  } else if (typeof Buffer !== "undefined") {
    let b;
    if ("buffer" in bin) {
      b = Buffer.from(bin.buffer, bin.byteOffset, bin.byteLength);
    } else {
      b = Buffer.from(bin);
    }
    return b.toString("utf8");
  } else {
    let view;
    if ("buffer" in bin) {
      view = new Uint8Array(bin.buffer, bin.byteOffset, bin.byteLength);
    } else {
      view = new Uint8Array(bin);
    }
    if (typeof decodeURIComponent !== "undefined") {
      let s = "";
      for (let i = 0; i < view.length; ++i) {
        const c = view[i];
        if (c < 16) {
          s += "%0" + c.toString(16);
        } else {
          s += "%" + c.toString(16);
        }
      }
      return decodeURIComponent(s);
    } else {
      let s = "";
      for (let i = 0; i < view.length; ++i) {
        const c = view[i];
        s += String.fromCharCode(c);
      }
      return s;
    }
  }
}
function stringToBinary(string) {
  if (typeof TextEncoder !== "undefined") {
    const enc = new TextEncoder();
    return cloneToArrayBuffer(enc.encode(string));
  } else if (typeof Buffer !== "undefined") {
    return cloneToArrayBuffer(Buffer.from(string, "utf8"));
  } else if (typeof encodeURIComponent !== "undefined") {
    const data = encodeURIComponent(string);
    let len = 0;
    for (let i = 0; i < data.length; ++len) {
      const c = data.charCodeAt(i);
      if (c === 37) {
        i += 3;
      } else {
        ++i;
      }
    }
    const bin = new ArrayBuffer(len);
    const view = new Uint8Array(bin);
    for (let i = 0, j = 0; i < data.length; ++j) {
      const c = data.charCodeAt(i);
      if (c === 37) {
        const n = parseInt(data.substring(i + 1, i + 3), 16);
        view[j] = n;
        i += 3;
      } else {
        view[j] = c;
        ++i;
      }
    }
    return bin;
  } else {
    const bin = new ArrayBuffer(string.length);
    new Uint8Array(bin).set(
      [].map.call(
        string,
        (c) => c.charCodeAt(0)
      )
    );
    return bin;
  }
}

// ../../../../../tmp/claude-0/nl/pe-library-js/src/main/format/ImageDosHeader.ts
var _ImageDosHeader = class _ImageDosHeader extends FormatBase {
  // 'MZ'
  constructor(view) {
    super(view);
  }
  static from(bin, offset = 0) {
    return new _ImageDosHeader(createDataView(bin, offset, 64));
  }
  isValid() {
    return this.magic === _ImageDosHeader.DEFAULT_MAGIC;
  }
  get magic() {
    return this.view.getUint16(0, true);
  }
  set magic(val) {
    this.view.setUint16(0, val, true);
  }
  get lastPageSize() {
    return this.view.getUint16(2, true);
  }
  set lastPageSize(val) {
    this.view.setUint16(2, val, true);
  }
  get pages() {
    return this.view.getUint16(4, true);
  }
  set pages(val) {
    this.view.setUint16(4, val, true);
  }
  get relocations() {
    return this.view.getUint16(6, true);
  }
  set relocations(val) {
    this.view.setUint16(6, val, true);
  }
  get headerSizeInParagraph() {
    return this.view.getUint16(8, true);
  }
  set headerSizeInParagraph(val) {
    this.view.setUint16(8, val, true);
  }
  get minAllocParagraphs() {
    return this.view.getUint16(10, true);
  }
  set minAllocParagraphs(val) {
    this.view.setUint16(10, val, true);
  }
  get maxAllocParagraphs() {
    return this.view.getUint16(12, true);
  }
  set maxAllocParagraphs(val) {
    this.view.setUint16(12, val, true);
  }
  get initialSS() {
    return this.view.getUint16(14, true);
  }
  set initialSS(val) {
    this.view.setUint16(14, val, true);
  }
  get initialSP() {
    return this.view.getUint16(16, true);
  }
  set initialSP(val) {
    this.view.setUint16(16, val, true);
  }
  get checkSum() {
    return this.view.getUint16(18, true);
  }
  set checkSum(val) {
    this.view.setUint16(18, val, true);
  }
  get initialIP() {
    return this.view.getUint16(20, true);
  }
  set initialIP(val) {
    this.view.setUint16(20, val, true);
  }
  get initialCS() {
    return this.view.getUint16(22, true);
  }
  set initialCS(val) {
    this.view.setUint16(22, val, true);
  }
  get relocationTableAddress() {
    return this.view.getUint16(24, true);
  }
  set relocationTableAddress(val) {
    this.view.setUint16(24, val, true);
  }
  get overlayNum() {
    return this.view.getUint16(26, true);
  }
  set overlayNum(val) {
    this.view.setUint16(26, val, true);
  }
  // WORD e_res[4] (28,30,32,34)
  get oemId() {
    return this.view.getUint16(36, true);
  }
  set oemId(val) {
    this.view.setUint16(36, val, true);
  }
  get oemInfo() {
    return this.view.getUint16(38, true);
  }
  set oemInfo(val) {
    this.view.setUint16(38, val, true);
  }
  // WORD e_res2[10] (40,42,44,46,48,50,52,54,56,58)
  get newHeaderAddress() {
    return this.view.getUint32(60, true);
  }
  set newHeaderAddress(val) {
    this.view.setUint32(60, val, true);
  }
};
_ImageDosHeader.size = 64;
_ImageDosHeader.DEFAULT_MAGIC = 23117;
var ImageDosHeader = _ImageDosHeader;

// ../../../../../tmp/claude-0/nl/pe-library-js/src/main/format/ImageFileHeader.ts
var _ImageFileHeader = class _ImageFileHeader extends FormatBase {
  constructor(view) {
    super(view);
  }
  static from(bin, offset = 0) {
    return new _ImageFileHeader(new DataView(bin, offset, 20));
  }
  get machine() {
    return this.view.getUint16(0, true);
  }
  set machine(val) {
    this.view.setUint16(0, val, true);
  }
  get numberOfSections() {
    return this.view.getUint16(2, true);
  }
  set numberOfSections(val) {
    this.view.setUint16(2, val, true);
  }
  get timeDateStamp() {
    return this.view.getUint32(4, true);
  }
  set timeDateStamp(val) {
    this.view.setUint32(4, val, true);
  }
  get pointerToSymbolTable() {
    return this.view.getUint32(8, true);
  }
  set pointerToSymbolTable(val) {
    this.view.setUint32(8, val, true);
  }
  get numberOfSymbols() {
    return this.view.getUint32(12, true);
  }
  set numberOfSymbols(val) {
    this.view.setUint32(12, val, true);
  }
  get sizeOfOptionalHeader() {
    return this.view.getUint16(16, true);
  }
  set sizeOfOptionalHeader(val) {
    this.view.setUint16(16, val, true);
  }
  get characteristics() {
    return this.view.getUint16(18, true);
  }
  set characteristics(val) {
    this.view.setUint16(18, val, true);
  }
};
_ImageFileHeader.size = 20;
var ImageFileHeader = _ImageFileHeader;

// ../../../../../tmp/claude-0/nl/pe-library-js/src/main/format/ImageOptionalHeader.ts
var _ImageOptionalHeader = class _ImageOptionalHeader extends FormatBase {
  constructor(view) {
    super(view);
  }
  static from(bin, offset = 0) {
    return new _ImageOptionalHeader(new DataView(bin, offset, 96));
  }
  get magic() {
    return this.view.getUint16(0, true);
  }
  set magic(val) {
    this.view.setUint16(0, val, true);
  }
  get majorLinkerVersion() {
    return this.view.getUint8(2);
  }
  set majorLinkerVersion(val) {
    this.view.setUint8(2, val);
  }
  get minorLinkerVersion() {
    return this.view.getUint8(3);
  }
  set minorLinkerVersion(val) {
    this.view.setUint8(3, val);
  }
  get sizeOfCode() {
    return this.view.getUint32(4, true);
  }
  set sizeOfCode(val) {
    this.view.setUint32(4, val, true);
  }
  get sizeOfInitializedData() {
    return this.view.getUint32(8, true);
  }
  set sizeOfInitializedData(val) {
    this.view.setUint32(8, val, true);
  }
  get sizeOfUninitializedData() {
    return this.view.getUint32(12, true);
  }
  set sizeOfUninitializedData(val) {
    this.view.setUint32(12, val, true);
  }
  get addressOfEntryPoint() {
    return this.view.getUint32(16, true);
  }
  set addressOfEntryPoint(val) {
    this.view.setUint32(16, val, true);
  }
  get baseOfCode() {
    return this.view.getUint32(20, true);
  }
  set baseOfCode(val) {
    this.view.setUint32(20, val, true);
  }
  get baseOfData() {
    return this.view.getUint32(24, true);
  }
  set baseOfData(val) {
    this.view.setUint32(24, val, true);
  }
  get imageBase() {
    return this.view.getUint32(28, true);
  }
  set imageBase(val) {
    this.view.setUint32(28, val, true);
  }
  get sectionAlignment() {
    return this.view.getUint32(32, true);
  }
  set sectionAlignment(val) {
    this.view.setUint32(32, val, true);
  }
  get fileAlignment() {
    return this.view.getUint32(36, true);
  }
  set fileAlignment(val) {
    this.view.setUint32(36, val, true);
  }
  get majorOperatingSystemVersion() {
    return this.view.getUint16(40, true);
  }
  set majorOperatingSystemVersion(val) {
    this.view.setUint16(40, val, true);
  }
  get minorOperatingSystemVersion() {
    return this.view.getUint16(42, true);
  }
  set minorOperatingSystemVersion(val) {
    this.view.setUint16(42, val, true);
  }
  get majorImageVersion() {
    return this.view.getUint16(44, true);
  }
  set majorImageVersion(val) {
    this.view.setUint16(44, val, true);
  }
  get minorImageVersion() {
    return this.view.getUint16(46, true);
  }
  set minorImageVersion(val) {
    this.view.setUint16(46, val, true);
  }
  get majorSubsystemVersion() {
    return this.view.getUint16(48, true);
  }
  set majorSubsystemVersion(val) {
    this.view.setUint16(48, val, true);
  }
  get minorSubsystemVersion() {
    return this.view.getUint16(50, true);
  }
  set minorSubsystemVersion(val) {
    this.view.setUint16(50, val, true);
  }
  get win32VersionValue() {
    return this.view.getUint32(52, true);
  }
  set win32VersionValue(val) {
    this.view.setUint32(52, val, true);
  }
  get sizeOfImage() {
    return this.view.getUint32(56, true);
  }
  set sizeOfImage(val) {
    this.view.setUint32(56, val, true);
  }
  get sizeOfHeaders() {
    return this.view.getUint32(60, true);
  }
  set sizeOfHeaders(val) {
    this.view.setUint32(60, val, true);
  }
  get checkSum() {
    return this.view.getUint32(64, true);
  }
  set checkSum(val) {
    this.view.setUint32(64, val, true);
  }
  get subsystem() {
    return this.view.getUint16(68, true);
  }
  set subsystem(val) {
    this.view.setUint16(68, val, true);
  }
  get dllCharacteristics() {
    return this.view.getUint16(70, true);
  }
  set dllCharacteristics(val) {
    this.view.setUint16(70, val, true);
  }
  get sizeOfStackReserve() {
    return this.view.getUint32(72, true);
  }
  set sizeOfStackReserve(val) {
    this.view.setUint32(72, val, true);
  }
  get sizeOfStackCommit() {
    return this.view.getUint32(76, true);
  }
  set sizeOfStackCommit(val) {
    this.view.setUint32(76, val, true);
  }
  get sizeOfHeapReserve() {
    return this.view.getUint32(80, true);
  }
  set sizeOfHeapReserve(val) {
    this.view.setUint32(80, val, true);
  }
  get sizeOfHeapCommit() {
    return this.view.getUint32(84, true);
  }
  set sizeOfHeapCommit(val) {
    this.view.setUint32(84, val, true);
  }
  get loaderFlags() {
    return this.view.getUint32(88, true);
  }
  set loaderFlags(val) {
    this.view.setUint32(88, val, true);
  }
  get numberOfRvaAndSizes() {
    return this.view.getUint32(92, true);
  }
  set numberOfRvaAndSizes(val) {
    this.view.setUint32(92, val, true);
  }
};
_ImageOptionalHeader.size = 96;
_ImageOptionalHeader.DEFAULT_MAGIC = 267;
var ImageOptionalHeader = _ImageOptionalHeader;

// ../../../../../tmp/claude-0/nl/pe-library-js/src/main/format/ImageOptionalHeader64.ts
function getUint64LE(view, offset) {
  return view.getUint32(offset + 4, true) * 4294967296 + view.getUint32(offset, true);
}
function setUint64LE(view, offset, val) {
  view.setUint32(offset, val & 4294967295, true);
  view.setUint32(offset + 4, Math.floor(val / 4294967296), true);
}
function getUint64LEBigInt(view, offset) {
  if (typeof BigInt === "undefined") {
    throw new Error("BigInt not supported");
  }
  return BigInt(4294967296) * BigInt(view.getUint32(offset + 4, true)) + BigInt(view.getUint32(offset, true));
}
function setUint64LEBigInt(view, offset, val) {
  if (typeof BigInt === "undefined") {
    throw new Error("BigInt not supported");
  }
  view.setUint32(offset, Number(val & BigInt(4294967295)), true);
  view.setUint32(
    offset + 4,
    Math.floor(Number(val / BigInt(4294967296) & BigInt(4294967295))),
    true
  );
}
var _ImageOptionalHeader64 = class _ImageOptionalHeader64 extends FormatBase {
  constructor(view) {
    super(view);
  }
  static from(bin, offset = 0) {
    return new _ImageOptionalHeader64(new DataView(bin, offset, 112));
  }
  get magic() {
    return this.view.getUint16(0, true);
  }
  set magic(val) {
    this.view.setUint16(0, val, true);
  }
  get majorLinkerVersion() {
    return this.view.getUint8(2);
  }
  set majorLinkerVersion(val) {
    this.view.setUint8(2, val);
  }
  get minorLinkerVersion() {
    return this.view.getUint8(3);
  }
  set minorLinkerVersion(val) {
    this.view.setUint8(3, val);
  }
  get sizeOfCode() {
    return this.view.getUint32(4, true);
  }
  set sizeOfCode(val) {
    this.view.setUint32(4, val, true);
  }
  get sizeOfInitializedData() {
    return this.view.getUint32(8, true);
  }
  set sizeOfInitializedData(val) {
    this.view.setUint32(8, val, true);
  }
  get sizeOfUninitializedData() {
    return this.view.getUint32(12, true);
  }
  set sizeOfUninitializedData(val) {
    this.view.setUint32(12, val, true);
  }
  get addressOfEntryPoint() {
    return this.view.getUint32(16, true);
  }
  set addressOfEntryPoint(val) {
    this.view.setUint32(16, val, true);
  }
  get baseOfCode() {
    return this.view.getUint32(20, true);
  }
  set baseOfCode(val) {
    this.view.setUint32(20, val, true);
  }
  get imageBase() {
    return getUint64LE(this.view, 24);
  }
  set imageBase(val) {
    setUint64LE(this.view, 24, val);
  }
  get imageBaseBigInt() {
    return getUint64LEBigInt(this.view, 24);
  }
  set imageBaseBigInt(val) {
    setUint64LEBigInt(this.view, 24, val);
  }
  get sectionAlignment() {
    return this.view.getUint32(32, true);
  }
  set sectionAlignment(val) {
    this.view.setUint32(32, val, true);
  }
  get fileAlignment() {
    return this.view.getUint32(36, true);
  }
  set fileAlignment(val) {
    this.view.setUint32(36, val, true);
  }
  get majorOperatingSystemVersion() {
    return this.view.getUint16(40, true);
  }
  set majorOperatingSystemVersion(val) {
    this.view.setUint16(40, val, true);
  }
  get minorOperatingSystemVersion() {
    return this.view.getUint16(42, true);
  }
  set minorOperatingSystemVersion(val) {
    this.view.setUint16(42, val, true);
  }
  get majorImageVersion() {
    return this.view.getUint16(44, true);
  }
  set majorImageVersion(val) {
    this.view.setUint16(44, val, true);
  }
  get minorImageVersion() {
    return this.view.getUint16(46, true);
  }
  set minorImageVersion(val) {
    this.view.setUint16(46, val, true);
  }
  get majorSubsystemVersion() {
    return this.view.getUint16(48, true);
  }
  set majorSubsystemVersion(val) {
    this.view.setUint16(48, val, true);
  }
  get minorSubsystemVersion() {
    return this.view.getUint16(50, true);
  }
  set minorSubsystemVersion(val) {
    this.view.setUint16(50, val, true);
  }
  get win32VersionValue() {
    return this.view.getUint32(52, true);
  }
  set win32VersionValue(val) {
    this.view.setUint32(52, val, true);
  }
  get sizeOfImage() {
    return this.view.getUint32(56, true);
  }
  set sizeOfImage(val) {
    this.view.setUint32(56, val, true);
  }
  get sizeOfHeaders() {
    return this.view.getUint32(60, true);
  }
  set sizeOfHeaders(val) {
    this.view.setUint32(60, val, true);
  }
  get checkSum() {
    return this.view.getUint32(64, true);
  }
  set checkSum(val) {
    this.view.setUint32(64, val, true);
  }
  get subsystem() {
    return this.view.getUint16(68, true);
  }
  set subsystem(val) {
    this.view.setUint16(68, val, true);
  }
  get dllCharacteristics() {
    return this.view.getUint16(70, true);
  }
  set dllCharacteristics(val) {
    this.view.setUint16(70, val, true);
  }
  get sizeOfStackReserve() {
    return getUint64LE(this.view, 72);
  }
  set sizeOfStackReserve(val) {
    setUint64LE(this.view, 72, val);
  }
  get sizeOfStackReserveBigInt() {
    return getUint64LEBigInt(this.view, 72);
  }
  set sizeOfStackReserveBigInt(val) {
    setUint64LEBigInt(this.view, 72, val);
  }
  get sizeOfStackCommit() {
    return getUint64LE(this.view, 80);
  }
  set sizeOfStackCommit(val) {
    setUint64LE(this.view, 80, val);
  }
  get sizeOfStackCommitBigInt() {
    return getUint64LEBigInt(this.view, 80);
  }
  set sizeOfStackCommitBigInt(val) {
    setUint64LEBigInt(this.view, 80, val);
  }
  get sizeOfHeapReserve() {
    return getUint64LE(this.view, 88);
  }
  set sizeOfHeapReserve(val) {
    setUint64LE(this.view, 88, val);
  }
  get sizeOfHeapReserveBigInt() {
    return getUint64LEBigInt(this.view, 88);
  }
  set sizeOfHeapReserveBigInt(val) {
    setUint64LEBigInt(this.view, 88, val);
  }
  get sizeOfHeapCommit() {
    return getUint64LE(this.view, 96);
  }
  set sizeOfHeapCommit(val) {
    setUint64LE(this.view, 96, val);
  }
  get sizeOfHeapCommitBigInt() {
    return getUint64LEBigInt(this.view, 96);
  }
  set sizeOfHeapCommitBigInt(val) {
    setUint64LEBigInt(this.view, 96, val);
  }
  get loaderFlags() {
    return this.view.getUint32(104, true);
  }
  set loaderFlags(val) {
    this.view.setUint32(104, val, true);
  }
  get numberOfRvaAndSizes() {
    return this.view.getUint32(108, true);
  }
  set numberOfRvaAndSizes(val) {
    this.view.setUint32(108, val, true);
  }
};
_ImageOptionalHeader64.size = 112;
_ImageOptionalHeader64.DEFAULT_MAGIC = 523;
var ImageOptionalHeader64 = _ImageOptionalHeader64;

// ../../../../../tmp/claude-0/nl/pe-library-js/src/main/format/ImageNtHeaders.ts
var _ImageNtHeaders = class _ImageNtHeaders extends FormatBase {
  // 'PE\x00\x00'
  constructor(view) {
    super(view);
  }
  static from(bin, offset = 0) {
    const magic = createDataView(
      bin,
      offset + ImageFileHeader.size,
      6
    ).getUint16(4, true);
    let len = 4 + ImageFileHeader.size + ImageDataDirectoryArray.size;
    if (magic === ImageOptionalHeader64.DEFAULT_MAGIC) {
      len += ImageOptionalHeader64.size;
    } else {
      len += ImageOptionalHeader.size;
    }
    return new _ImageNtHeaders(createDataView(bin, offset, len));
  }
  isValid() {
    return this.signature === _ImageNtHeaders.DEFAULT_SIGNATURE;
  }
  is32bit() {
    return this.view.getUint16(ImageFileHeader.size + 4, true) === ImageOptionalHeader.DEFAULT_MAGIC;
  }
  get signature() {
    return this.view.getUint32(0, true);
  }
  set signature(val) {
    this.view.setUint32(0, val, true);
  }
  get fileHeader() {
    return ImageFileHeader.from(this.view.buffer, this.view.byteOffset + 4);
  }
  get optionalHeader() {
    const off = ImageFileHeader.size + 4;
    const magic = this.view.getUint16(off, true);
    if (magic === ImageOptionalHeader64.DEFAULT_MAGIC) {
      return ImageOptionalHeader64.from(
        this.view.buffer,
        this.view.byteOffset + off
      );
    } else {
      return ImageOptionalHeader.from(
        this.view.buffer,
        this.view.byteOffset + off
      );
    }
  }
  get optionalHeaderDataDirectory() {
    return ImageDataDirectoryArray.from(
      this.view.buffer,
      this.view.byteOffset + this.getDataDirectoryOffset()
    );
  }
  getDataDirectoryOffset() {
    let off = ImageFileHeader.size + 4;
    const magic = this.view.getUint16(off, true);
    if (magic === ImageOptionalHeader64.DEFAULT_MAGIC) {
      off += ImageOptionalHeader64.size;
    } else {
      off += ImageOptionalHeader.size;
    }
    return off;
  }
  getSectionHeaderOffset() {
    return this.getDataDirectoryOffset() + ImageDataDirectoryArray.size;
  }
};
_ImageNtHeaders.DEFAULT_SIGNATURE = 17744;
var ImageNtHeaders = _ImageNtHeaders;

// ../../../../../tmp/claude-0/nl/pe-library-js/src/main/format/ImageSectionHeaderArray.ts
var _ImageSectionHeaderArray = class _ImageSectionHeaderArray extends ArrayFormatBase_default {
  constructor(view, length) {
    super(view);
    this.length = length;
  }
  static from(bin, length, offset = 0) {
    const size = length * 40;
    return new _ImageSectionHeaderArray(
      new DataView(bin, offset, size),
      length
    );
  }
  get(index) {
    return {
      name: getFixedString(this.view, index * 40, 8),
      virtualSize: this.view.getUint32(8 + index * 40, true),
      virtualAddress: this.view.getUint32(12 + index * 40, true),
      sizeOfRawData: this.view.getUint32(16 + index * 40, true),
      pointerToRawData: this.view.getUint32(20 + index * 40, true),
      pointerToRelocations: this.view.getUint32(24 + index * 40, true),
      pointerToLineNumbers: this.view.getUint32(28 + index * 40, true),
      numberOfRelocations: this.view.getUint16(32 + index * 40, true),
      numberOfLineNumbers: this.view.getUint16(34 + index * 40, true),
      characteristics: this.view.getUint32(36 + index * 40, true)
    };
  }
  set(index, data) {
    setFixedString(this.view, index * 40, 8, data.name);
    this.view.setUint32(8 + index * 40, data.virtualSize, true);
    this.view.setUint32(12 + index * 40, data.virtualAddress, true);
    this.view.setUint32(16 + index * 40, data.sizeOfRawData, true);
    this.view.setUint32(20 + index * 40, data.pointerToRawData, true);
    this.view.setUint32(24 + index * 40, data.pointerToRelocations, true);
    this.view.setUint32(28 + index * 40, data.pointerToLineNumbers, true);
    this.view.setUint16(32 + index * 40, data.numberOfRelocations, true);
    this.view.setUint16(34 + index * 40, data.numberOfLineNumbers, true);
    this.view.setUint32(36 + index * 40, data.characteristics, true);
  }
};
_ImageSectionHeaderArray.itemSize = 40;
var ImageSectionHeaderArray = _ImageSectionHeaderArray;

// ../../../../../tmp/claude-0/nl/pe-library-js/src/main/util/generate.ts
var DOS_STUB_PROGRAM = new Uint8Array([
  14,
  31,
  186,
  14,
  0,
  180,
  9,
  205,
  33,
  184,
  1,
  76,
  205,
  33,
  68,
  79,
  83,
  32,
  109,
  111,
  100,
  101,
  32,
  110,
  111,
  116,
  32,
  115,
  117,
  112,
  112,
  111,
  114,
  116,
  101,
  100,
  46,
  13,
  13,
  10,
  36,
  0,
  0,
  0,
  0,
  0,
  0,
  0
]);
var DOS_STUB_SIZE = roundUp(
  ImageDosHeader.size + DOS_STUB_PROGRAM.length,
  128
);
var DEFAULT_FILE_ALIGNMENT = 512;
function fillDosStubData(bin) {
  const dos = ImageDosHeader.from(bin);
  dos.magic = ImageDosHeader.DEFAULT_MAGIC;
  dos.lastPageSize = DOS_STUB_SIZE % 512;
  dos.pages = Math.ceil(DOS_STUB_SIZE / 512);
  dos.relocations = 0;
  dos.headerSizeInParagraph = Math.ceil(ImageDosHeader.size / 16);
  dos.minAllocParagraphs = 0;
  dos.maxAllocParagraphs = 65535;
  dos.initialSS = 0;
  dos.initialSP = 128;
  dos.relocationTableAddress = ImageDosHeader.size;
  dos.newHeaderAddress = DOS_STUB_SIZE;
  copyBuffer(
    bin,
    ImageDosHeader.size,
    DOS_STUB_PROGRAM,
    0,
    DOS_STUB_PROGRAM.length
  );
}
function estimateNewHeaderSize(is32Bit) {
  return (
    // magic
    4 + ImageFileHeader.size + (is32Bit ? ImageOptionalHeader.size : ImageOptionalHeader64.size) + ImageDataDirectoryArray.size
  );
}
function fillPeHeaderEmptyData(bin, offset, totalBinSize, is32Bit, isDLL) {
  let _bin;
  let _offset;
  if ("buffer" in bin) {
    _bin = bin.buffer;
    _offset = bin.byteOffset + offset;
  } else {
    _bin = bin;
    _offset = offset;
  }
  new DataView(_bin, _offset).setUint32(
    0,
    ImageNtHeaders.DEFAULT_SIGNATURE,
    true
  );
  const fh = ImageFileHeader.from(_bin, _offset + 4);
  fh.machine = is32Bit ? 332 : 34404;
  fh.numberOfSections = 0;
  fh.timeDateStamp = 0;
  fh.pointerToSymbolTable = 0;
  fh.numberOfSymbols = 0;
  fh.sizeOfOptionalHeader = (is32Bit ? ImageOptionalHeader.size : ImageOptionalHeader64.size) + ImageDataDirectoryArray.size;
  fh.characteristics = isDLL ? 8450 : 258;
  const oh = (is32Bit ? ImageOptionalHeader : ImageOptionalHeader64).from(
    _bin,
    _offset + 4 + ImageFileHeader.size
  );
  oh.magic = is32Bit ? ImageOptionalHeader.DEFAULT_MAGIC : ImageOptionalHeader64.DEFAULT_MAGIC;
  oh.sizeOfCode = 0;
  oh.sizeOfInitializedData = 0;
  oh.sizeOfUninitializedData = 0;
  oh.addressOfEntryPoint = 0;
  oh.baseOfCode = 4096;
  oh.imageBase = is32Bit ? 16777216 : 6442450944;
  oh.sectionAlignment = 4096;
  oh.fileAlignment = DEFAULT_FILE_ALIGNMENT;
  oh.majorOperatingSystemVersion = 6;
  oh.minorOperatingSystemVersion = 0;
  oh.majorSubsystemVersion = 6;
  oh.minorSubsystemVersion = 0;
  oh.sizeOfHeaders = roundUp(totalBinSize, oh.fileAlignment);
  oh.subsystem = 2;
  oh.dllCharacteristics = (is32Bit ? 0 : 32) + // IMAGE_DLL_CHARACTERISTICS_HIGH_ENTROPY_VA
  64 + // IMAGE_DLLCHARACTERISTICS_DYNAMIC_BASE
  256;
  oh.sizeOfStackReserve = 1048576;
  oh.sizeOfStackCommit = 4096;
  oh.sizeOfHeapReserve = 1048576;
  oh.sizeOfHeapCommit = 4096;
  oh.numberOfRvaAndSizes = ImageDataDirectoryArray.size / ImageDataDirectoryArray.itemSize;
}
function makeEmptyNtExecutableBinary(is32Bit, isDLL) {
  const bufferSize = roundUp(
    DOS_STUB_SIZE + estimateNewHeaderSize(is32Bit),
    DEFAULT_FILE_ALIGNMENT
  );
  const bin = new ArrayBuffer(bufferSize);
  fillDosStubData(bin);
  fillPeHeaderEmptyData(bin, DOS_STUB_SIZE, bufferSize, is32Bit, isDLL);
  return bin;
}

// ../../../../../tmp/claude-0/nl/pe-library-js/src/main/NtExecutable.ts
var NtExecutable = class _NtExecutable {
  constructor(_headers, _sections, _ex) {
    this._headers = _headers;
    this._sections = _sections;
    this._ex = _ex;
    const dh = ImageDosHeader.from(_headers);
    const nh = ImageNtHeaders.from(_headers, dh.newHeaderAddress);
    this._dh = dh;
    this._nh = nh;
    this._dda = nh.optionalHeaderDataDirectory;
    _sections.sort((a, b) => {
      const ra = a.info.pointerToRawData;
      const rb = a.info.pointerToRawData;
      if (ra !== rb) {
        return ra - rb;
      }
      const va = a.info.virtualAddress;
      const vb = b.info.virtualAddress;
      if (va === vb) {
        return a.info.virtualSize - b.info.virtualSize;
      }
      return va - vb;
    });
  }
  /**
   * Creates an NtExecutable instance with an 'empty' executable binary.
   * @param is32Bit set true if the binary is for 32-bit (default: false)
   * @param isDLL set true if the binary is DLL (default: true)
   * @return NtExecutable instance
   */
  static createEmpty(is32Bit = false, isDLL = true) {
    return this.from(makeEmptyNtExecutableBinary(is32Bit, isDLL));
  }
  /**
   * Parse the binary and create NtExecutable instance.
   * An error will be thrown if the binary data is invalid
   * @param bin binary data
   * @param options additional option for parsing
   * @return NtExecutable instance
   */
  static from(bin, options) {
    const dh = ImageDosHeader.from(bin);
    const nh = ImageNtHeaders.from(bin, dh.newHeaderAddress);
    if (!dh.isValid() || !nh.isValid()) {
      throw new TypeError("Invalid binary format");
    }
    if (nh.fileHeader.numberOfSymbols > 0) {
      throw new Error("Binary with symbols is not supported now");
    }
    const fileAlignment = nh.optionalHeader.fileAlignment;
    const securityEntry = nh.optionalHeaderDataDirectory.get(
      ImageDirectoryEntry_default.Certificate
    );
    if (securityEntry.size > 0) {
      if (!(options == null ? void 0 : options.ignoreCert)) {
        throw new Error(
          "Parsing signed executable binary is not allowed by default."
        );
      }
    }
    const secOff = dh.newHeaderAddress + nh.getSectionHeaderOffset();
    const secCount = nh.fileHeader.numberOfSections;
    const sections = [];
    const tempSectionHeaderBinary = allocatePartialBinary(
      bin,
      secOff,
      secCount * ImageSectionHeaderArray.itemSize
    );
    const secArray = ImageSectionHeaderArray.from(
      tempSectionHeaderBinary,
      secCount,
      0
    );
    let lastOffset = roundUp(
      secOff + secCount * ImageSectionHeaderArray.itemSize,
      fileAlignment
    );
    secArray.forEach((info) => {
      if (!info.pointerToRawData || !info.sizeOfRawData) {
        info.pointerToRawData = 0;
        info.sizeOfRawData = 0;
        sections.push({
          info,
          data: null
        });
      } else {
        const secBin = allocatePartialBinary(
          bin,
          info.pointerToRawData,
          info.sizeOfRawData
        );
        sections.push({
          info,
          data: secBin
        });
        const secEndOffset = roundUp(
          info.pointerToRawData + info.sizeOfRawData,
          fileAlignment
        );
        if (secEndOffset > lastOffset) {
          lastOffset = secEndOffset;
        }
      }
    });
    const headers = allocatePartialBinary(bin, 0, secOff);
    let exData = null;
    let lastExDataOffset = bin.byteLength;
    if (securityEntry.size > 0) {
      lastExDataOffset = securityEntry.virtualAddress;
    }
    if (lastOffset < lastExDataOffset) {
      exData = allocatePartialBinary(
        bin,
        lastOffset,
        lastExDataOffset - lastOffset
      );
    }
    return new _NtExecutable(headers, sections, exData);
  }
  /**
   * Returns whether the executable is for 32-bit architecture
   */
  is32bit() {
    return this._nh.is32bit();
  }
  getTotalHeaderSize() {
    return this._headers.byteLength;
  }
  get dosHeader() {
    return this._dh;
  }
  get newHeader() {
    return this._nh;
  }
  getRawHeader() {
    return this._headers;
  }
  getImageBase() {
    return this._nh.optionalHeader.imageBase;
  }
  getFileAlignment() {
    return this._nh.optionalHeader.fileAlignment;
  }
  getSectionAlignment() {
    return this._nh.optionalHeader.sectionAlignment;
  }
  /**
   * Return all sections. The returned array is sorted by raw address.
   */
  getAllSections() {
    return this._sections;
  }
  /**
   * Return the section data from ImageDirectoryEntry enum value.
   * @note
   * The returned instance is equal to the value in {@link getAllSections}'s return value.
   */
  getSectionByEntry(entry) {
    const dd = this._dda.get(entry);
    const r = this._sections.filter((sec) => {
      const vaEnd = sec.info.virtualAddress + sec.info.virtualSize;
      return dd.virtualAddress >= sec.info.virtualAddress && dd.virtualAddress < vaEnd;
    }).shift();
    return r !== void 0 ? r : null;
  }
  /**
   * Set the section data from ImageDirectoryEntry enum value.
   * If entry is found, then replaces the secion data. If not found, then adds the section data.
   *
   * NOTE: 'virtualAddress' and 'pointerToRawData' of section object is ignored
   * and calculated automatically. 'virtualSize' and 'sizeOfRawData' are used, but
   * if the 'section.data.byteLength' is larger than 'sizeOfRawData', then
   * these members are replaced.
   *
   * @param entry ImageDirectoryEntry enum value for the section
   * @param section the section data, or null to remove the section
   */
  setSectionByEntry(entry, section) {
    const sec = section ? { data: section.data, info: section.info } : null;
    const dd = this._dda.get(entry);
    const hasEntry = dd.size > 0;
    if (!sec) {
      if (!hasEntry) {
      } else {
        this._dda.set(entry, { size: 0, virtualAddress: 0 });
        const len = this._sections.length;
        for (let i = 0; i < len; ++i) {
          const sec2 = this._sections[i];
          const vaStart = sec2.info.virtualAddress;
          const vaLast = vaStart + sec2.info.virtualSize;
          if (dd.virtualAddress >= vaStart && dd.virtualAddress < vaLast) {
            this._sections.splice(i, 1);
            this._nh.fileHeader.numberOfSections = this._sections.length;
            break;
          }
        }
      }
    } else {
      const rawSize = !sec.data ? 0 : sec.data.byteLength;
      const fileAlign = this._nh.optionalHeader.fileAlignment;
      const secAlign = this._nh.optionalHeader.sectionAlignment;
      let alignedFileSize = !sec.data ? 0 : roundUp(rawSize, fileAlign);
      const alignedSecSize = !sec.data ? 0 : roundUp(sec.info.virtualSize, secAlign);
      if (sec.info.sizeOfRawData < alignedFileSize) {
        sec.info.sizeOfRawData = alignedFileSize;
      } else {
        alignedFileSize = sec.info.sizeOfRawData;
      }
      if (!hasEntry) {
        let virtAddr = 0;
        let rawAddr = roundUp(this._headers.byteLength, fileAlign);
        this._sections.forEach((secExist) => {
          if (secExist.info.pointerToRawData) {
            if (rawAddr <= secExist.info.pointerToRawData) {
              rawAddr = secExist.info.pointerToRawData + secExist.info.sizeOfRawData;
            }
          }
          if (virtAddr <= secExist.info.virtualAddress) {
            virtAddr = secExist.info.virtualAddress + secExist.info.virtualSize;
          }
        });
        if (!alignedFileSize) {
          rawAddr = 0;
        }
        if (!virtAddr) {
          virtAddr = this.newHeader.optionalHeader.baseOfCode;
        }
        virtAddr = roundUp(virtAddr, secAlign);
        sec.info.pointerToRawData = rawAddr;
        sec.info.virtualAddress = virtAddr;
        this._dda.set(entry, {
          size: rawSize,
          virtualAddress: virtAddr
        });
        this._sections.push(sec);
        this._nh.fileHeader.numberOfSections = this._sections.length;
        this._nh.optionalHeader.sizeOfImage = roundUp(
          virtAddr + alignedSecSize,
          this._nh.optionalHeader.sectionAlignment
        );
      } else {
        this.replaceSectionImpl(dd.virtualAddress, sec.info, sec.data);
      }
    }
  }
  /**
   * Returns the extra data in the executable, or `null` if nothing.
   * You can rewrite the returned buffer without using `setExtraData` if
   * the size of the new data is equal to the old data.
   */
  getExtraData() {
    return this._ex;
  }
  /**
   * Specifies the new extra data in the executable.
   * The specified buffer will be cloned and you can release it after calling this method.
   * @param bin buffer containing the new data
   * @note
   * The extra data will not be aligned by `NtExecutable`.
   */
  setExtraData(bin) {
    if (bin === null) {
      this._ex = null;
    } else {
      this._ex = cloneToArrayBuffer(bin);
    }
  }
  /**
   * Generates the executable binary data.
   */
  generate(paddingSize) {
    const dh = this._dh;
    const nh = this._nh;
    const secOff = dh.newHeaderAddress + nh.getSectionHeaderOffset();
    let size = secOff;
    size += this._sections.length * ImageSectionHeaderArray.itemSize;
    const align = nh.optionalHeader.fileAlignment;
    size = roundUp(size, align);
    this._sections.forEach((sec) => {
      if (!sec.info.pointerToRawData) {
        return;
      }
      const lastOff = sec.info.pointerToRawData + sec.info.sizeOfRawData;
      if (size < lastOff) {
        size = lastOff;
        size = roundUp(size, align);
      }
    });
    const lastPosition = size;
    if (this._ex !== null) {
      size += this._ex.byteLength;
    }
    if (typeof paddingSize === "number") {
      size += paddingSize;
    }
    const bin = new ArrayBuffer(size);
    const u8bin = new Uint8Array(bin);
    u8bin.set(new Uint8Array(this._headers, 0, secOff));
    ImageDataDirectoryArray.from(
      bin,
      dh.newHeaderAddress + nh.getDataDirectoryOffset()
    ).set(ImageDirectoryEntry_default.Certificate, {
      size: 0,
      virtualAddress: 0
    });
    const secArray = ImageSectionHeaderArray.from(
      bin,
      this._sections.length,
      secOff
    );
    this._sections.forEach((sec, i) => {
      if (!sec.data) {
        sec.info.pointerToRawData = 0;
        sec.info.sizeOfRawData = 0;
      }
      secArray.set(i, sec.info);
      if (!sec.data || !sec.info.pointerToRawData) {
        return;
      }
      u8bin.set(new Uint8Array(sec.data), sec.info.pointerToRawData);
    });
    if (this._ex !== null) {
      u8bin.set(new Uint8Array(this._ex), lastPosition);
    }
    if (nh.optionalHeader.checkSum !== 0) {
      calculateCheckSumForPE(bin, true);
    }
    return bin;
  }
  rearrangeSections(rawAddressStart, rawDiff, virtualAddressStart, virtualDiff) {
    if (!rawDiff && !virtualDiff) {
      return;
    }
    const nh = this._nh;
    const secAlign = nh.optionalHeader.sectionAlignment;
    const dirs = this._dda;
    const len = this._sections.length;
    let lastVirtAddress = 0;
    for (let i = 0; i < len; ++i) {
      const sec = this._sections[i];
      let virtAddr = sec.info.virtualAddress;
      if (virtualDiff && virtAddr >= virtualAddressStart) {
        const iDir = dirs.findIndexByVirtualAddress(virtAddr);
        virtAddr += virtualDiff;
        if (iDir !== null) {
          dirs.set(iDir, {
            virtualAddress: virtAddr,
            size: sec.info.virtualSize
          });
        }
        sec.info.virtualAddress = virtAddr;
      }
      const fileAddr = sec.info.pointerToRawData;
      if (rawDiff && fileAddr >= rawAddressStart) {
        sec.info.pointerToRawData = fileAddr + rawDiff;
      }
      lastVirtAddress = roundUp(
        sec.info.virtualAddress + sec.info.virtualSize,
        secAlign
      );
    }
    nh.optionalHeader.sizeOfImage = lastVirtAddress;
  }
  // NOTE: info.virtualSize must be valid
  replaceSectionImpl(virtualAddress, info, data) {
    const len = this._sections.length;
    for (let i = 0; i < len; ++i) {
      const s = this._sections[i];
      if (s.info.virtualAddress === virtualAddress) {
        const secAlign = this._nh.optionalHeader.sectionAlignment;
        const fileAddr = s.info.pointerToRawData;
        const oldFileAddr = fileAddr + s.info.sizeOfRawData;
        const oldVirtAddr = virtualAddress + roundUp(s.info.virtualSize, secAlign);
        s.info = cloneObject(info);
        s.info.virtualAddress = virtualAddress;
        s.info.pointerToRawData = fileAddr;
        s.data = data;
        const newFileAddr = fileAddr + info.sizeOfRawData;
        const newVirtAddr = virtualAddress + roundUp(info.virtualSize, secAlign);
        this.rearrangeSections(
          oldFileAddr,
          newFileAddr - oldFileAddr,
          oldVirtAddr,
          newVirtAddr - oldVirtAddr
        );
        {
          const dirs = this._dda;
          const iDir = dirs.findIndexByVirtualAddress(virtualAddress);
          if (iDir !== null) {
            dirs.set(iDir, {
              virtualAddress,
              size: info.virtualSize
            });
          }
        }
        break;
      }
    }
  }
};

// ../../../../../tmp/claude-0/nl/pe-library-js/src/main/NtExecutableResource.ts
function removeDuplicates(a) {
  return a.reduce((p, c) => {
    return p.indexOf(c) >= 0 ? p : p.concat(c);
  }, []);
}
function readString(view, offset) {
  const length = view.getUint16(offset, true);
  let r = "";
  offset += 2;
  for (let i = 0; i < length; ++i) {
    r += String.fromCharCode(view.getUint16(offset, true));
    offset += 2;
  }
  return r;
}
function readLanguageTable(view, typeEntry, name, languageTable, cb) {
  let off = languageTable;
  const nameEntry = {
    name,
    languageTable,
    characteristics: view.getUint32(off, true),
    dateTime: view.getUint32(off + 4, true),
    majorVersion: view.getUint16(off + 8, true),
    minorVersion: view.getUint16(off + 10, true)
  };
  const nameCount = view.getUint16(off + 12, true);
  const idCount = view.getUint16(off + 14, true);
  off += 16;
  for (let i = 0; i < nameCount; ++i) {
    const nameOffset = view.getUint32(off, true) & 2147483647;
    const dataOffset = view.getUint32(off + 4, true);
    if ((dataOffset & 2147483648) !== 0) {
      off += 8;
      continue;
    }
    const name2 = readString(view, nameOffset);
    cb(typeEntry, nameEntry, { lang: name2, dataOffset });
    off += 8;
  }
  for (let i = 0; i < idCount; ++i) {
    const id = view.getUint32(off, true) & 2147483647;
    const dataOffset = view.getUint32(off + 4, true);
    if ((dataOffset & 2147483648) !== 0) {
      off += 8;
      continue;
    }
    cb(typeEntry, nameEntry, { lang: id, dataOffset });
    off += 8;
  }
}
function readNameTable(view, type, nameTable, cb) {
  let off = nameTable;
  const typeEntry = {
    type,
    nameTable,
    characteristics: view.getUint32(off, true),
    dateTime: view.getUint32(off + 4, true),
    majorVersion: view.getUint16(off + 8, true),
    minorVersion: view.getUint16(off + 10, true)
  };
  const nameCount = view.getUint16(off + 12, true);
  const idCount = view.getUint16(off + 14, true);
  off += 16;
  for (let i = 0; i < nameCount; ++i) {
    const nameOffset = view.getUint32(off, true) & 2147483647;
    let nextTable = view.getUint32(off + 4, true);
    if (!(nextTable & 2147483648)) {
      off += 8;
      continue;
    }
    nextTable &= 2147483647;
    const name = readString(view, nameOffset);
    readLanguageTable(view, typeEntry, name, nextTable, cb);
    off += 8;
  }
  for (let i = 0; i < idCount; ++i) {
    const id = view.getUint32(off, true) & 2147483647;
    let nextTable = view.getUint32(off + 4, true);
    if (!(nextTable & 2147483648)) {
      off += 8;
      continue;
    }
    nextTable &= 2147483647;
    readLanguageTable(view, typeEntry, id, nextTable, cb);
    off += 8;
  }
}
function divideEntriesImplByID(r, names, entries) {
  const entriesByString = {};
  const entriesByNumber = {};
  entries.forEach((e) => {
    if (typeof e.lang === "string") {
      entriesByString[e.lang] = e;
      names.push(e.lang);
    } else {
      entriesByNumber[e.lang] = e;
    }
  });
  const strKeys = Object.keys(entriesByString);
  strKeys.sort().forEach((type) => {
    r.s.push(entriesByString[type]);
  });
  const numKeys = Object.keys(entriesByNumber);
  numKeys.map((k) => Number(k)).sort((a, b) => a - b).forEach((type) => {
    r.n.push(entriesByNumber[type]);
  });
  return 16 + 8 * (strKeys.length + numKeys.length);
}
function divideEntriesImplByName(r, names, entries) {
  const entriesByString = {};
  const entriesByNumber = {};
  entries.forEach((e) => {
    if (typeof e.id === "string") {
      const a = entriesByString[e.id] ?? (entriesByString[e.id] = []);
      names.push(e.id);
      a.push(e);
    } else {
      const a = entriesByNumber[e.id] ?? (entriesByNumber[e.id] = []);
      a.push(e);
    }
  });
  const sSum = Object.keys(entriesByString).sort().map((id) => {
    const o = {
      id,
      s: [],
      n: []
    };
    r.s.push(o);
    return divideEntriesImplByID(o, names, entriesByString[id]);
  }).reduce((p, c) => p + 8 + c, 0);
  const nSum = Object.keys(entriesByNumber).map((k) => Number(k)).sort((a, b) => a - b).map((id) => {
    const o = {
      id,
      s: [],
      n: []
    };
    r.n.push(o);
    return divideEntriesImplByID(o, names, entriesByNumber[id]);
  }).reduce((p, c) => p + 8 + c, 0);
  return 16 + sSum + nSum;
}
function divideEntriesImplByType(r, names, entries) {
  const entriesByString = {};
  const entriesByNumber = {};
  entries.forEach((e) => {
    if (typeof e.type === "string") {
      const a = entriesByString[e.type] ?? (entriesByString[e.type] = []);
      names.push(e.type);
      a.push(e);
    } else {
      const a = entriesByNumber[e.type] ?? (entriesByNumber[e.type] = []);
      a.push(e);
    }
  });
  const sSum = Object.keys(entriesByString).sort().map((type) => {
    const o = { type, s: [], n: [] };
    r.s.push(o);
    return divideEntriesImplByName(o, names, entriesByString[type]);
  }).reduce((p, c) => p + 8 + c, 0);
  const nSum = Object.keys(entriesByNumber).map((k) => Number(k)).sort((a, b) => a - b).map((type) => {
    const o = { type, s: [], n: [] };
    r.n.push(o);
    return divideEntriesImplByName(o, names, entriesByNumber[type]);
  }).reduce((p, c) => p + 8 + c, 0);
  return 16 + sSum + nSum;
}
function calculateStringLengthForWrite(text) {
  const length = text.length;
  return length > 65535 ? 65535 : length;
}
function getStringOffset(target, strings) {
  const l = strings.length;
  for (let i = 0; i < l; ++i) {
    const s = strings[i];
    if (s.text === target) {
      return s.offset;
    }
  }
  throw new Error("Unexpected");
}
function writeString(view, offset, text) {
  const length = calculateStringLengthForWrite(text);
  view.setUint16(offset, length, true);
  offset += 2;
  for (let i = 0; i < length; ++i) {
    view.setUint16(offset, text.charCodeAt(i), true);
    offset += 2;
  }
  return offset;
}
function writeLanguageTable(view, offset, strings, data) {
  view.setUint32(offset, 0, true);
  view.setUint32(offset + 4, 0, true);
  view.setUint32(offset + 8, 0, true);
  view.setUint16(offset + 12, data.s.length, true);
  view.setUint16(offset + 14, data.n.length, true);
  offset += 16;
  data.s.forEach((e) => {
    const strOff = getStringOffset(e.lang, strings);
    view.setUint32(offset, strOff, true);
    view.setUint32(offset + 4, e.offset, true);
    offset += 8;
  });
  data.n.forEach((e) => {
    view.setUint32(offset, e.lang, true);
    view.setUint32(offset + 4, e.offset, true);
    offset += 8;
  });
  return offset;
}
function writeNameTable(view, offset, leafOffset, strings, data) {
  view.setUint32(offset, 0, true);
  view.setUint32(offset + 4, 0, true);
  view.setUint32(offset + 8, 0, true);
  view.setUint16(offset + 12, data.s.length, true);
  view.setUint16(offset + 14, data.n.length, true);
  offset += 16;
  data.s.forEach((e) => {
    e.offset = leafOffset;
    leafOffset = writeLanguageTable(view, leafOffset, strings, e);
  });
  data.n.forEach((e) => {
    e.offset = leafOffset;
    leafOffset = writeLanguageTable(view, leafOffset, strings, e);
  });
  data.s.forEach((e) => {
    const strOff = getStringOffset(e.id, strings);
    view.setUint32(offset, strOff + 2147483648, true);
    view.setUint32(offset + 4, e.offset + 2147483648, true);
    offset += 8;
  });
  data.n.forEach((e) => {
    view.setUint32(offset, e.id, true);
    view.setUint32(offset + 4, e.offset + 2147483648, true);
    offset += 8;
  });
  return leafOffset;
}
function writeTypeTable(view, offset, strings, data) {
  view.setUint32(offset, 0, true);
  view.setUint32(offset + 4, 0, true);
  view.setUint32(offset + 8, 0, true);
  view.setUint16(offset + 12, data.s.length, true);
  view.setUint16(offset + 14, data.n.length, true);
  offset += 16;
  let nextTableOffset = offset + 8 * (data.s.length + data.n.length);
  data.s.forEach((e) => {
    e.offset = nextTableOffset;
    nextTableOffset += 16 + 8 * (e.s.length + e.n.length);
  });
  data.n.forEach((e) => {
    e.offset = nextTableOffset;
    nextTableOffset += 16 + 8 * (e.s.length + e.n.length);
  });
  data.s.forEach((e) => {
    const strOff = getStringOffset(e.type, strings);
    view.setUint32(offset, strOff + 2147483648, true);
    view.setUint32(offset + 4, e.offset + 2147483648, true);
    offset += 8;
    nextTableOffset = writeNameTable(
      view,
      e.offset,
      nextTableOffset,
      strings,
      e
    );
  });
  data.n.forEach((e) => {
    view.setUint32(offset, e.type, true);
    view.setUint32(offset + 4, e.offset + 2147483648, true);
    offset += 8;
    nextTableOffset = writeNameTable(
      view,
      e.offset,
      nextTableOffset,
      strings,
      e
    );
  });
  return nextTableOffset;
}
var NtExecutableResource = class _NtExecutableResource {
  constructor() {
    /** The timestamp for resource */
    this.dateTime = 0;
    /** The major version data for resource */
    this.majorVersion = 0;
    /** The minor version data for resource */
    this.minorVersion = 0;
    /** Resource entries */
    this.entries = [];
    /**
     * The section data header of resource data (used by outputResource method).
     * This instance will be null if the base executable does not contain resource data.
     * You can override this field before calling outputResource method.
     * (Note that the addresses and sizes are ignored for output)
     */
    this.sectionDataHeader = null;
    this.originalSize = 0;
  }
  parse(section, ignoreUnparsableData) {
    if (!section.data) {
      return;
    }
    const view = new DataView(section.data);
    this.dateTime = view.getUint32(4, true);
    this.majorVersion = view.getUint16(8, true);
    this.minorVersion = view.getUint16(10, true);
    const nameCount = view.getUint16(12, true);
    const idCount = view.getUint16(14, true);
    let off = 16;
    const res2 = [];
    const cb = (t, n, l) => {
      const off2 = view.getUint32(l.dataOffset, true) - section.info.virtualAddress;
      const size = view.getUint32(l.dataOffset + 4, true);
      const cp = view.getUint32(l.dataOffset + 8, true);
      if (off2 >= 0) {
        const bin = new Uint8Array(size);
        bin.set(new Uint8Array(section.data, off2, size));
        res2.push({
          type: t.type,
          id: n.name,
          lang: l.lang,
          codepage: cp,
          bin: bin.buffer
        });
      } else {
        if (!ignoreUnparsableData) {
          throw new Error(
            "Cannot parse resource directory entry; RVA seems to be invalid."
          );
        }
        res2.push({
          type: t.type,
          id: n.name,
          lang: l.lang,
          codepage: cp,
          bin: new ArrayBuffer(0),
          rva: l.dataOffset
        });
      }
    };
    for (let i = 0; i < nameCount; ++i) {
      const nameOffset = view.getUint32(off, true) & 2147483647;
      let nextTable = view.getUint32(off + 4, true);
      if (!(nextTable & 2147483648)) {
        off += 8;
        continue;
      }
      nextTable &= 2147483647;
      const name = readString(view, nameOffset);
      readNameTable(view, name, nextTable, cb);
      off += 8;
    }
    for (let i = 0; i < idCount; ++i) {
      const typeId = view.getUint32(off, true) & 2147483647;
      let nextTable = view.getUint32(off + 4, true);
      if (!(nextTable & 2147483648)) {
        off += 8;
        continue;
      }
      nextTable &= 2147483647;
      readNameTable(view, typeId, nextTable, cb);
      off += 8;
    }
    this.entries = res2;
    this.originalSize = section.data.byteLength;
  }
  /**
   * Parses resource data for `NtExecutable`.
   * This function returns valid instance even if
   * the executable does not have resource data.
   * @param exe `NtExecutable` instance
   * @param ignoreUnparsableData (default: false) specify true if skipping 'unparsable' (e.g. unusual format) data.
   *   When true, the resource data may break on write operation.
   */
  static from(exe2, ignoreUnparsableData = false) {
    const secs = [].concat(exe2.getAllSections()).sort((a, b) => a.info.virtualAddress - b.info.virtualAddress);
    const entry = exe2.getSectionByEntry(ImageDirectoryEntry_default.Resource);
    if (entry) {
      const reloc = exe2.getSectionByEntry(
        ImageDirectoryEntry_default.BaseRelocation
      );
      for (let i = 0; i < secs.length; ++i) {
        const s = secs[i];
        if (s === entry) {
          for (let j = i + 1; j < secs.length; ++j) {
            if (!reloc || secs[j] !== reloc) {
              throw new Error(
                "After Resource section, sections except for relocation are not supported"
              );
            }
          }
          break;
        }
      }
    }
    const r = new _NtExecutableResource();
    r.sectionDataHeader = entry ? cloneObject(entry.info) : null;
    if (entry) {
      r.parse(entry, ignoreUnparsableData);
    }
    return r;
  }
  /**
   * Add or replace the resource entry.
   * This method replaces the entry only if there is an entry with `type`, `id` and `lang` equal.
   */
  replaceResourceEntry(entry) {
    for (let len = this.entries.length, i = 0; i < len; ++i) {
      const e = this.entries[i];
      if (e.type === entry.type && e.id === entry.id && e.lang === entry.lang) {
        this.entries[i] = entry;
        return;
      }
    }
    this.entries.push(entry);
  }
  /**
   * Returns all resource entries, which has specified type and id, as UTF-8 string data.
   * @param type Resource type
   * @param id Resource id
   * @returns an array of lang and value pair (tuple)
   */
  getResourceEntriesAsString(type, id) {
    return this.entries.filter((entry) => entry.type === type && entry.id === id).map((entry) => [entry.lang, binaryToString(entry.bin)]);
  }
  /**
   * Add or replace the resource entry with UTF-8 string data.
   * This method is a wrapper of {@link NtExecutableResource.replaceResourceEntry}.
   */
  replaceResourceEntryFromString(type, id, lang, value) {
    const entry = {
      type,
      id,
      lang,
      codepage: 1200,
      bin: stringToBinary(value)
    };
    this.replaceResourceEntry(entry);
  }
  /**
   * Removes resource entries which has specified type and id.
   */
  removeResourceEntry(type, id, lang) {
    this.entries = this.entries.filter(
      (entry) => !(entry.type === type && entry.id === id && (typeof lang === "undefined" || entry.lang === lang))
    );
  }
  /**
   * Generates resource data binary for NtExecutable (not for .res file)
   * @param virtualAddress The virtual address for the section
   * @param alignment File alignment value of executable
   * @param noGrow Set true to disallow growing resource section (throw errors if data exceeds)
   * @param allowShrink Set true to allow shrinking resource section (if the data size is less than original)
   */
  generateResourceData(virtualAddress, alignment, noGrow = false, allowShrink = false) {
    const r = {
      s: [],
      n: []
    };
    let strings = [];
    let size = divideEntriesImplByType(r, strings, this.entries);
    strings = removeDuplicates(strings);
    const stringsOffset = size;
    size += strings.reduce((prev, cur) => {
      return prev + 2 + calculateStringLengthForWrite(cur) * 2;
    }, 0);
    size = roundUp(size, 8);
    const descOffset = size;
    size = this.entries.reduce((p, e) => {
      e.offset = p;
      return p + 16;
    }, descOffset);
    const dataOffset = size;
    size = this.entries.reduce((p, e) => {
      return roundUp(p, 8) + e.bin.byteLength;
    }, dataOffset);
    let alignedSize = roundUp(size, alignment);
    const originalAlignedSize = roundUp(this.originalSize, alignment);
    if (noGrow) {
      if (alignedSize > originalAlignedSize) {
        throw new Error("New resource data is larger than original");
      }
    }
    if (!allowShrink) {
      if (alignedSize < originalAlignedSize) {
        alignedSize = originalAlignedSize;
      }
    }
    const bin = new ArrayBuffer(alignedSize);
    const view = new DataView(bin);
    let o = descOffset;
    let va = virtualAddress + dataOffset;
    this.entries.forEach((e) => {
      const len = e.bin.byteLength;
      if (typeof e.rva !== "undefined") {
        view.setUint32(o, e.rva, true);
      } else {
        va = roundUp(va, 8);
        view.setUint32(o, va, true);
        va += len;
      }
      view.setUint32(o + 4, len, true);
      view.setUint32(o + 8, e.codepage, true);
      view.setUint32(o + 12, 0, true);
      o += 16;
    });
    o = dataOffset;
    this.entries.forEach((e) => {
      const len = e.bin.byteLength;
      copyBuffer(bin, o, e.bin, 0, len);
      o += roundUp(len, 8);
    });
    const stringsData = [];
    o = stringsOffset;
    strings.forEach((s) => {
      stringsData.push({
        offset: o,
        text: s
      });
      o = writeString(view, o, s);
    });
    writeTypeTable(view, 0, stringsData, r);
    if (alignedSize > size) {
      const pad = "PADDINGX";
      for (let i = size, j = 0; i < alignedSize; ++i, ++j) {
        if (j === 8) {
          j = 0;
        }
        view.setUint8(i, pad.charCodeAt(j));
      }
    }
    return {
      bin,
      rawSize: size,
      dataOffset,
      descEntryOffset: descOffset,
      descEntryCount: this.entries.length
    };
  }
  /**
   * Writes holding resource data to specified NtExecutable instance.
   * @param exeDest An NtExecutable instance to write resource section to
   * @param noGrow Set true to disallow growing resource section (throw errors if data exceeds)
   * @param allowShrink Set true to allow shrinking resource section (if the data size is less than original)
   */
  outputResource(exeDest, noGrow = false, allowShrink = false) {
    const fileAlign = exeDest.getFileAlignment();
    let sectionData;
    if (this.sectionDataHeader) {
      sectionData = {
        data: null,
        info: cloneObject(this.sectionDataHeader)
      };
    } else {
      sectionData = {
        data: null,
        info: {
          name: ".rsrc",
          virtualSize: 0,
          virtualAddress: 0,
          sizeOfRawData: 0,
          pointerToRawData: 0,
          pointerToRelocations: 0,
          pointerToLineNumbers: 0,
          numberOfRelocations: 0,
          numberOfLineNumbers: 0,
          characteristics: 1073741888
          // read access and initialized data
        }
      };
    }
    const data = this.generateResourceData(
      0,
      fileAlign,
      noGrow,
      allowShrink
    );
    sectionData.data = data.bin;
    sectionData.info.sizeOfRawData = data.bin.byteLength;
    sectionData.info.virtualSize = data.rawSize;
    exeDest.setSectionByEntry(ImageDirectoryEntry_default.Resource, sectionData);
    const generatedSection = exeDest.getSectionByEntry(
      ImageDirectoryEntry_default.Resource
    );
    const view = new DataView(generatedSection.data);
    let o = data.descEntryOffset;
    let va = generatedSection.info.virtualAddress + data.dataOffset;
    for (let i = 0; i < data.descEntryCount; ++i) {
      const len = view.getUint32(o + 4, true);
      va = roundUp(va, 8);
      view.setUint32(o, va, true);
      va += len;
      o += 16;
    }
  }
};

// ../../../../../tmp/claude-0/nl/resedit-js/src/main/data/index.ts
var data_exports = {};
__export(data_exports, {
  IconFile: () => IconFile,
  IconItem: () => IconItem,
  RawIconItem: () => RawIconItem
});

// ../../../../../tmp/claude-0/nl/resedit-js/src/main/util/functions.ts
function cloneObject2(object) {
  const r = {};
  Object.keys(object).forEach((key) => {
    r[key] = object[key];
  });
  return r;
}
function createDataView2(bin, byteOffset, byteLength) {
  if ("buffer" in bin) {
    let newOffset = bin.byteOffset;
    let newLength = bin.byteLength;
    if (typeof byteOffset !== "undefined") {
      newOffset += byteOffset;
      newLength -= byteOffset;
    }
    if (typeof byteLength !== "undefined") {
      newLength = byteLength;
    }
    return new DataView(bin.buffer, newOffset, newLength);
  } else {
    return new DataView(bin, byteOffset, byteLength);
  }
}
function roundUp2(val, align) {
  return Math.floor((val + align - 1) / align) * align;
}
function copyBuffer2(dest, destOffset, src, srcOffset, length) {
  const ua8Dest = "buffer" in dest ? new Uint8Array(
    dest.buffer,
    dest.byteOffset + (destOffset || 0),
    length
  ) : new Uint8Array(dest, destOffset, length);
  const ua8Src = "buffer" in src ? new Uint8Array(
    src.buffer,
    src.byteOffset + (srcOffset || 0),
    length
  ) : new Uint8Array(src, srcOffset, length);
  ua8Dest.set(ua8Src);
}
function allocatePartialBinary2(binBase, offset, length) {
  const b = new ArrayBuffer(length);
  copyBuffer2(b, 0, binBase, offset, length);
  return b;
}
function readInt32WithLastOffset(view, offset, last) {
  return offset + 4 <= last ? view.getInt32(offset, true) : 0;
}
function readUint8WithLastOffset(view, offset, last) {
  return offset < last ? view.getUint8(offset) : 0;
}
function readUint16WithLastOffset(view, offset, last) {
  return offset + 2 <= last ? view.getUint16(offset, true) : 0;
}
function readUint32WithLastOffset(view, offset, last) {
  return offset + 4 <= last ? view.getUint32(offset, true) : 0;
}

// ../../../../../tmp/claude-0/nl/resedit-js/src/main/data/IconItem.ts
function calcMaskSize(width, height) {
  const actualWidthBytes = roundUp2(Math.abs(width), 32) / 8;
  return actualWidthBytes * Math.abs(height);
}
var IconItem = class _IconItem {
  constructor(width, height, bin, byteOffset, byteLength) {
    const view = createDataView2(bin, byteOffset, byteLength);
    const totalSize = view.byteLength;
    let headerSize = view.getUint32(0, true);
    if (headerSize > totalSize) {
      headerSize = totalSize;
    }
    const sizeImage = readUint32WithLastOffset(view, 20, headerSize);
    const bi = {
      width: readInt32WithLastOffset(view, 4, headerSize),
      height: readInt32WithLastOffset(view, 8, headerSize),
      planes: readUint16WithLastOffset(view, 12, headerSize),
      bitCount: readUint16WithLastOffset(view, 14, headerSize),
      compression: readUint32WithLastOffset(view, 16, headerSize),
      sizeImage,
      xPelsPerMeter: readInt32WithLastOffset(view, 24, headerSize),
      yPelsPerMeter: readInt32WithLastOffset(view, 28, headerSize),
      colorUsed: readUint32WithLastOffset(view, 32, headerSize),
      colorImportant: readUint32WithLastOffset(view, 36, headerSize),
      colors: []
    };
    let offset = 40;
    let colors = bi.colorUsed;
    if (!colors) {
      switch (bi.bitCount) {
        case 1:
          colors = 2;
          break;
        case 4:
          colors = 16;
          break;
        case 8:
          colors = 256;
          break;
      }
    }
    for (let i = 0; i < colors; ++i) {
      bi.colors.push({
        b: readUint8WithLastOffset(view, offset, totalSize),
        g: readUint8WithLastOffset(view, offset + 1, totalSize),
        r: readUint8WithLastOffset(view, offset + 2, totalSize)
      });
      offset += 4;
    }
    this.width = width;
    this.height = height;
    this.bitmapInfo = bi;
    const widthBytes = roundUp2(bi.bitCount * Math.abs(bi.width), 32) / 8;
    const absActualHeight = Math.abs(bi.height) / 2;
    const size = bi.compression !== 0 && sizeImage !== 0 ? sizeImage : widthBytes * absActualHeight;
    if (size + offset > totalSize) {
      throw new Error(
        `Unexpected bitmap data in icon: bitmap size ${size} is larger than ${totalSize} - ${offset}`
      );
    }
    this._pixels = allocatePartialBinary2(view, offset, size);
    offset += size;
    const maskSize = calcMaskSize(bi.width, absActualHeight);
    if (maskSize + offset <= totalSize) {
      this.masks = allocatePartialBinary2(view, offset, maskSize);
    } else {
      this.masks = new ArrayBuffer(maskSize);
    }
  }
  /**
   * Bitmap pixel data.
   * @note
   * On set, if `bitmapInfo.sizeImage` is non-zero, `bitmapInfo.sizeImage` will be updated.
   */
  get pixels() {
    return this._pixels;
  }
  /**
   * Bitmap pixel data.
   * @note
   * On set, if `bitmapInfo.sizeImage` is non-zero, `bitmapInfo.sizeImage` will be updated.
   */
  set pixels(newValue) {
    this._pixels = newValue;
    if (this.bitmapInfo.sizeImage !== 0) {
      this.bitmapInfo.sizeImage = newValue.byteLength;
    }
  }
  static from(arg1, arg2, arg3, byteOffset, byteLength) {
    let width;
    let height;
    let bin;
    if (typeof arg3 === "object") {
      width = arg1;
      height = arg2;
      bin = arg3;
    } else {
      width = null;
      height = null;
      bin = arg1;
      byteOffset = arg2;
      byteLength = arg3;
    }
    return new _IconItem(width, height, bin, byteOffset, byteLength);
  }
  isIcon() {
    return true;
  }
  isRaw() {
    return false;
  }
  generate() {
    const bi = this.bitmapInfo;
    const absWidth = Math.abs(bi.width);
    const absWidthBytes = roundUp2(bi.bitCount * absWidth, 32) / 8;
    const absActualHeight = Math.abs(bi.height) / 2;
    const actualSizeImage = absWidthBytes * absActualHeight;
    const sizeMask = calcMaskSize(bi.width, absActualHeight);
    const colorCount = bi.colors.length;
    const totalSize = 40 + 4 * colorCount + actualSizeImage + sizeMask;
    const bin = new ArrayBuffer(totalSize);
    const view = new DataView(bin);
    view.setUint32(0, 40, true);
    view.setInt32(4, bi.width, true);
    view.setInt32(8, bi.height, true);
    view.setUint16(12, bi.planes, true);
    view.setUint16(14, bi.bitCount, true);
    view.setUint32(16, bi.compression, true);
    view.setUint32(20, bi.sizeImage, true);
    view.setInt32(24, bi.xPelsPerMeter, true);
    view.setInt32(28, bi.yPelsPerMeter, true);
    view.setUint32(32, bi.colorUsed, true);
    view.setUint32(
      36,
      bi.colorImportant > colorCount ? colorCount : bi.colorImportant,
      true
    );
    let offset = 40;
    bi.colors.forEach((c) => {
      view.setUint8(offset, c.b);
      view.setUint8(offset + 1, c.g);
      view.setUint8(offset + 2, c.r);
      offset += 4;
    });
    copyBuffer2(bin, offset, this.pixels, 0, actualSizeImage);
    copyBuffer2(bin, offset + actualSizeImage, this.masks, 0, sizeMask);
    return bin;
  }
};

// ../../../../../tmp/claude-0/nl/resedit-js/src/main/data/RawIconItem.ts
var RawIconItem = class _RawIconItem {
  constructor(bin, width, height, bitCount, byteOffset, byteLength) {
    this.width = width;
    this.height = height;
    this.bitCount = bitCount;
    if (typeof byteOffset !== "number") {
      byteOffset = 0;
      byteLength = bin.byteLength;
    } else if (typeof byteLength !== "number") {
      byteLength = bin.byteLength - byteOffset;
    }
    this.bin = allocatePartialBinary2(bin, byteOffset, byteLength);
  }
  static from(bin, width, height, bitCount, byteOffset, byteLength) {
    return new _RawIconItem(
      bin,
      width,
      height,
      bitCount,
      byteOffset,
      byteLength
    );
  }
  isIcon() {
    return false;
  }
  isRaw() {
    return true;
  }
};

// ../../../../../tmp/claude-0/nl/resedit-js/src/main/data/IconFile.ts
function generateEntryBinary(icons) {
  let count = icons.length;
  if (count > 65535) {
    count = 65535;
  }
  const tmpIcons = icons.map((item) => {
    if (item.data.isIcon()) {
      return {
        item,
        bin: item.data.generate(),
        offset: 0
      };
    } else {
      return {
        item,
        bin: item.data.bin,
        offset: 0
      };
    }
  });
  const size = tmpIcons.reduce(
    (p, icon) => {
      icon.offset = p;
      return p + icon.bin.byteLength;
    },
    6 + 16 * count
  );
  const bin = new ArrayBuffer(size);
  const view = new DataView(bin);
  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, count, true);
  let offset = 6;
  tmpIcons.forEach((icon) => {
    const item = icon.item;
    let width;
    let height;
    let colors;
    let planes;
    let bitCount;
    if (item.data.isIcon()) {
      const bi = item.data.bitmapInfo;
      width = typeof item.width !== "undefined" ? item.width : Math.abs(bi.width);
      height = typeof item.height !== "undefined" ? item.height : Math.abs(bi.height / 2);
      colors = typeof item.colors !== "undefined" ? item.colors : bi.colorUsed || bi.colors.length;
      planes = typeof item.planes !== "undefined" ? item.planes : bi.planes;
      bitCount = typeof item.bitCount !== "undefined" ? item.bitCount : bi.bitCount;
    } else {
      width = typeof item.width !== "undefined" ? item.width : Math.abs(item.data.width);
      height = typeof item.height !== "undefined" ? item.height : Math.abs(item.data.height);
      colors = typeof item.colors !== "undefined" ? item.colors : 0;
      planes = typeof item.planes !== "undefined" ? item.planes : 1;
      bitCount = typeof item.bitCount !== "undefined" ? item.bitCount : item.data.bitCount;
    }
    const dataSize = icon.bin.byteLength;
    view.setUint8(offset, width >= 256 ? 0 : width);
    view.setUint8(offset + 1, height >= 256 ? 0 : height);
    view.setUint8(offset + 2, colors >= 256 ? 0 : colors);
    view.setUint8(offset + 3, 0);
    view.setUint16(offset + 4, planes, true);
    view.setUint16(offset + 6, bitCount, true);
    view.setUint32(offset + 8, dataSize, true);
    view.setUint32(offset + 12, icon.offset, true);
    offset += 16;
    copyBuffer2(bin, icon.offset, icon.bin, 0, dataSize);
  });
  return bin;
}
var IconFile = class _IconFile {
  constructor(bin) {
    if (!bin) {
      this.icons = [];
      return;
    }
    const view = createDataView2(bin);
    const totalSize = view.byteLength;
    const icons = [];
    if (view.getUint16(2, true) === 1) {
      const count = view.getUint16(4, true);
      let offset = 6;
      for (let i = 0; i < count; ++i) {
        const dataSize = readUint32WithLastOffset(
          view,
          offset + 8,
          totalSize
        );
        const dataOffset = readUint32WithLastOffset(
          view,
          offset + 12,
          totalSize
        );
        const width = readUint8WithLastOffset(view, offset, totalSize);
        const height = readUint8WithLastOffset(
          view,
          offset + 1,
          totalSize
        );
        const bitCount = readUint8WithLastOffset(
          view,
          offset + 6,
          totalSize
        );
        let data;
        if (view.getUint32(dataOffset, true) === 40) {
          data = IconItem.from(
            width,
            height,
            bin,
            dataOffset,
            dataSize
          );
        } else {
          data = RawIconItem.from(
            bin,
            width || 256,
            height || 256,
            bitCount,
            dataOffset,
            dataSize
          );
        }
        icons.push({
          width,
          height,
          colors: readUint8WithLastOffset(
            view,
            offset + 2,
            totalSize
          ),
          planes: readUint16WithLastOffset(
            view,
            offset + 4,
            totalSize
          ),
          bitCount,
          data
        });
        offset += 16;
      }
    }
    this.icons = icons;
  }
  static from(bin) {
    return new _IconFile(bin);
  }
  generate() {
    return generateEntryBinary(this.icons);
  }
};

// ../../../../../tmp/claude-0/nl/resedit-js/src/main/resource/VersionInfo.ts
function readStringToNullChar(view, offset, last) {
  let r = "";
  while (offset + 2 <= last) {
    const c = view.getUint16(offset, true);
    if (!c) {
      break;
    }
    r += String.fromCharCode(c);
    offset += 2;
  }
  return r;
}
function writeStringWithNullChar(view, offset, value) {
  for (let i = 0; i < value.length; ++i) {
    view.setUint16(offset, value.charCodeAt(i), true);
    offset += 2;
  }
  view.setUint16(offset, 0, true);
  return offset + 2;
}
function createFixedInfo() {
  return {
    fileVersionMS: 0,
    fileVersionLS: 0,
    productVersionMS: 0,
    productVersionLS: 0,
    fileFlagsMask: 0,
    fileFlags: 0,
    fileOS: 0,
    // Unknown
    fileType: 0,
    // Unknown
    fileSubtype: 0,
    fileDateMS: 0,
    fileDateLS: 0
  };
}
function parseStringTable(view, offset, last) {
  const tableLen = view.getUint16(offset, true);
  const valueLen = view.getUint16(offset + 2, true);
  if (offset + tableLen < last) {
    last = offset + tableLen;
  }
  const tableName = readStringToNullChar(view, offset + 6, last);
  offset += roundUp2(6 + 2 * (tableName.length + 1), 4);
  const langAndCp = parseInt(tableName, 16);
  if (isNaN(langAndCp)) {
    throw new Error("Invalid StringTable data format");
  }
  offset += roundUp2(valueLen, 4);
  const r = {
    lang: Math.floor(langAndCp / 65536),
    codepage: langAndCp & 65535,
    values: {}
  };
  while (offset < last) {
    const childDataLen = view.getUint16(offset, true);
    const childValueLen = view.getUint16(offset + 2, true);
    const valueType = view.getUint16(offset + 4, true);
    if (valueType !== 1) {
      if (valueType !== 0 || childValueLen !== 2) {
        offset += roundUp2(childDataLen, 4);
        continue;
      }
    }
    let childDataLast = offset + childDataLen;
    if (childDataLast > last) {
      childDataLast = last;
    }
    const name = readStringToNullChar(view, offset + 6, childDataLast);
    offset = roundUp2(offset + 6 + 2 * (name.length + 1), 4);
    if (valueType === 0) {
      const valueData = view.getUint16(offset, true);
      if (valueData === 0) {
        r.values[name] = "";
      }
      offset = roundUp2(offset + 2, 4);
    } else {
      let childValueLast = offset + childValueLen * 2;
      if (childValueLast > childDataLast) {
        childValueLast = childDataLast;
      }
      const value = readStringToNullChar(view, offset, childValueLast);
      offset = roundUp2(childValueLast, 4);
      r.values[name] = value;
    }
  }
  return [last, r];
}
function parseStringFileInfo(view, offset, last) {
  const valueLen = view.getUint16(offset + 2, true);
  offset += 36;
  offset += roundUp2(valueLen, 4);
  const r = [];
  while (offset < last) {
    const childData = parseStringTable(view, offset, last);
    const table = childData[1];
    const a = r.filter(
      (e) => e.lang === table.lang && e.codepage === table.codepage
    );
    if (a.length === 0) {
      r.push(table);
    } else {
      for (const key in table.values) {
        const value = table.values[key];
        if (value != null) {
          a[0].values[key] = value;
        }
      }
    }
    offset = roundUp2(childData[0], 4);
  }
  return r;
}
function parseVarFileInfo(view, offset, last) {
  const valueLen = view.getUint16(offset + 2, true);
  offset += 32;
  offset += roundUp2(valueLen, 4);
  const r = [];
  while (offset < last) {
    const childDataLen = view.getUint16(offset, true);
    const childValueLen = view.getUint16(offset + 2, true);
    if (view.getUint16(offset + 4, true) !== 0) {
      offset += roundUp2(childDataLen, 4);
      continue;
    }
    let childDataLast = offset + childDataLen;
    if (childDataLast > last) {
      childDataLast = last;
    }
    const name = readStringToNullChar(view, offset + 6, childDataLast);
    offset = roundUp2(offset + 6 + 2 * (name.length + 1), 4);
    if (name !== "Translation" || childValueLen % 4 !== 0) {
      offset = roundUp2(childDataLast, 4);
      continue;
    }
    for (let child = 0; child < childValueLen; child += 4) {
      if (offset + 4 > childDataLast) {
        break;
      }
      const lang = view.getUint16(offset, true);
      const codepage = view.getUint16(offset + 2, true);
      offset += 4;
      if (r.filter((e) => e.lang === lang && e.codepage === codepage).length === 0) {
        r.push({ lang, codepage });
      }
    }
    offset = roundUp2(childDataLast, 4);
  }
  return r;
}
function parseVersionEntry(view, entry) {
  const totalLen = view.getUint16(0, true);
  let dataLen = view.getUint16(2, true);
  if (view.getUint16(4, true) !== 0) {
    throw new Error("Invalid version data format");
  }
  if (totalLen < dataLen + 40) {
    throw new Error("Invalid version data format");
  }
  if (readStringToNullChar(view, 6, totalLen) !== "VS_VERSION_INFO") {
    throw new Error("Invalid version data format");
  }
  const d = {
    lang: entry.lang,
    fixedInfo: createFixedInfo(),
    strings: [],
    translations: [],
    unknowns: []
  };
  let offset = 38;
  if (dataLen) {
    dataLen += 40;
    const sig = readUint32WithLastOffset(view, 40, dataLen);
    const sVer = readUint32WithLastOffset(view, 44, dataLen);
    if (sig === 4277077181 && sVer <= 65536) {
      d.fixedInfo = {
        fileVersionMS: readUint32WithLastOffset(view, 48, dataLen),
        fileVersionLS: readUint32WithLastOffset(view, 52, dataLen),
        productVersionMS: readUint32WithLastOffset(view, 56, dataLen),
        productVersionLS: readUint32WithLastOffset(view, 60, dataLen),
        fileFlagsMask: readUint32WithLastOffset(view, 64, dataLen),
        fileFlags: readUint32WithLastOffset(view, 68, dataLen),
        fileOS: readUint32WithLastOffset(view, 72, dataLen),
        fileType: readUint32WithLastOffset(view, 76, dataLen),
        fileSubtype: readUint32WithLastOffset(view, 80, dataLen),
        fileDateMS: readUint32WithLastOffset(view, 84, dataLen),
        fileDateLS: readUint32WithLastOffset(view, 88, dataLen)
      };
    }
    offset = dataLen;
  }
  offset = roundUp2(offset, 4);
  while (offset < totalLen) {
    const childLen = view.getUint16(offset, true);
    let childLast = offset + childLen;
    if (childLast > totalLen) {
      childLast = totalLen;
    }
    const name = readStringToNullChar(view, offset + 6, childLast);
    switch (name) {
      case "StringFileInfo":
        d.strings = d.strings.concat(
          parseStringFileInfo(view, offset, childLast)
        );
        break;
      case "VarFileInfo":
        d.translations = d.translations.concat(
          parseVarFileInfo(view, offset, childLast)
        );
        break;
      default:
        d.unknowns.push({
          name,
          entireBin: allocatePartialBinary2(view, offset, childLen)
        });
        break;
    }
    offset += roundUp2(childLen, 4);
  }
  return d;
}
function generateStringTable(table) {
  let size = 24;
  const keys = Object.keys(table.values);
  size = keys.reduce((prev, key) => {
    const value = table.values[key];
    if (value == null) {
      return prev;
    }
    const childHeaderSize = roundUp2(6 + 2 * (key.length + 1), 4);
    const newSize = roundUp2(
      prev + childHeaderSize + 2 * (value.length + 1),
      4
    );
    return newSize > 65532 ? prev : newSize;
  }, size);
  const bin = new ArrayBuffer(size);
  const view = new DataView(bin);
  view.setUint16(0, size, true);
  view.setUint16(2, 0, true);
  view.setUint16(4, 1, true);
  let langAndCp = ((table.lang & 65535) * 65536 + (table.codepage & 65535)).toString(16).toLowerCase();
  if (langAndCp.length < 8) {
    const l = 8 - langAndCp.length;
    langAndCp = "00000000".substr(0, l) + langAndCp;
  }
  let offset = roundUp2(writeStringWithNullChar(view, 6, langAndCp), 4);
  keys.forEach((key) => {
    const value = table.values[key];
    if (value == null) {
      return;
    }
    const childHeaderSize = roundUp2(6 + 2 * (key.length + 1), 4);
    const newSize = childHeaderSize + 2 * (value.length + 1);
    if (offset + newSize <= 65532) {
      view.setUint16(offset, newSize, true);
      if (value.length === 0) {
        view.setUint16(offset + 2, 2, true);
        view.setUint16(offset + 4, 0, true);
      } else {
        view.setUint16(offset + 2, value.length + 1, true);
        view.setUint16(offset + 4, 1, true);
      }
      offset = roundUp2(writeStringWithNullChar(view, offset + 6, key), 4);
      offset = roundUp2(writeStringWithNullChar(view, offset, value), 4);
    }
  });
  return bin;
}
function generateStringTableInfo(tables) {
  let size = 36;
  const tableBins = tables.map((table) => generateStringTable(table));
  size += tableBins.reduce((p, c) => p + c.byteLength, 0);
  const bin = new ArrayBuffer(size);
  const view = new DataView(bin);
  view.setUint16(0, size, true);
  view.setUint16(2, 0, true);
  view.setUint16(4, 1, true);
  let offset = roundUp2(writeStringWithNullChar(view, 6, "StringFileInfo"), 4);
  tableBins.forEach((table) => {
    const len = table.byteLength;
    copyBuffer2(bin, offset, table, 0, len);
    offset += len;
  });
  return bin;
}
function generateVarFileInfo(translations) {
  let size = 32;
  const translationsValueSize = translations.length * 4;
  size += 32 + translationsValueSize;
  const bin = new ArrayBuffer(size);
  const view = new DataView(bin);
  view.setUint16(0, size, true);
  view.setUint16(2, 0, true);
  view.setUint16(4, 1, true);
  let offset = roundUp2(writeStringWithNullChar(view, 6, "VarFileInfo"), 4);
  view.setUint16(offset, 32 + translationsValueSize, true);
  view.setUint16(offset + 2, translationsValueSize, true);
  view.setUint16(offset + 4, 0, true);
  offset = roundUp2(
    writeStringWithNullChar(view, offset + 6, "Translation"),
    4
  );
  translations.forEach((translation) => {
    view.setUint16(offset, translation.lang, true);
    view.setUint16(offset + 2, translation.codepage, true);
    offset += 4;
  });
  return bin;
}
function generateVersionEntryBinary(entry) {
  let size = 92;
  const stringTableInfoBin = generateStringTableInfo(entry.strings);
  const stringTableInfoLen = stringTableInfoBin.byteLength;
  size += stringTableInfoLen;
  const varFileInfoBin = generateVarFileInfo(entry.translations);
  const varFileInfoLen = varFileInfoBin.byteLength;
  size += varFileInfoLen;
  size = entry.unknowns.reduce(
    (p, data) => p + roundUp2(data.entireBin.byteLength, 4),
    size
  );
  const bin = new ArrayBuffer(size);
  const view = new DataView(bin);
  view.setUint16(0, size, true);
  view.setUint16(2, 52, true);
  view.setUint16(4, 0, true);
  let offset = roundUp2(
    writeStringWithNullChar(view, 6, "VS_VERSION_INFO"),
    4
  );
  view.setUint32(offset, 4277077181, true);
  view.setUint32(offset + 4, 65536, true);
  view.setUint32(offset + 8, entry.fixedInfo.fileVersionMS, true);
  view.setUint32(offset + 12, entry.fixedInfo.fileVersionLS, true);
  view.setUint32(offset + 16, entry.fixedInfo.productVersionMS, true);
  view.setUint32(offset + 20, entry.fixedInfo.productVersionLS, true);
  view.setUint32(offset + 24, entry.fixedInfo.fileFlagsMask, true);
  view.setUint32(offset + 28, entry.fixedInfo.fileFlags, true);
  view.setUint32(offset + 32, entry.fixedInfo.fileOS, true);
  view.setUint32(offset + 36, entry.fixedInfo.fileType, true);
  view.setUint32(offset + 40, entry.fixedInfo.fileSubtype, true);
  view.setUint32(offset + 44, entry.fixedInfo.fileDateMS, true);
  view.setUint32(offset + 48, entry.fixedInfo.fileDateLS, true);
  offset += 52;
  copyBuffer2(bin, offset, stringTableInfoBin, 0, stringTableInfoLen);
  offset += stringTableInfoLen;
  copyBuffer2(bin, offset, varFileInfoBin, 0, varFileInfoLen);
  offset += varFileInfoLen;
  entry.unknowns.forEach((e) => {
    const len = e.entireBin.byteLength;
    copyBuffer2(bin, offset, e.entireBin, 0, len);
    offset += roundUp2(len, 4);
  });
  return bin;
}
function clampInt(val, min, max) {
  if (isNaN(val) || val < min) {
    return min;
  } else if (val >= max) {
    return max;
  }
  return Math.floor(val);
}
function parseVersionArguments(arg1, arg2, arg3, arg4, arg5) {
  let major;
  let minor;
  let micro;
  let revision;
  let lang;
  if (typeof arg1 === "string" && (typeof arg2 === "undefined" || typeof arg2 === "number") && typeof arg3 === "undefined") {
    [major, minor, micro, revision] = arg1.split(".").map((token) => clampInt(Number(token), 0, 65535)).concat(0, 0, 0);
    lang = arg2;
  } else {
    major = clampInt(Number(arg1), 0, 65535);
    minor = clampInt(Number(arg2), 0, 65535);
    micro = clampInt(
      typeof arg3 === "undefined" ? 0 : Number(arg3),
      0,
      65535
    );
    revision = clampInt(
      typeof arg4 === "undefined" ? 0 : Number(arg4),
      0,
      65535
    );
    lang = arg5;
  }
  return [major, minor, micro, revision, lang];
}
var VersionInfo = class _VersionInfo {
  constructor(entry) {
    if (!entry) {
      this.data = {
        lang: 0,
        // MAKELANGID(LANG_NEUTRAL, SUBLANG_NEUTRAL)
        fixedInfo: createFixedInfo(),
        strings: [],
        translations: [],
        unknowns: []
      };
    } else {
      const view = new DataView(entry.bin);
      this.data = parseVersionEntry(view, entry);
    }
  }
  /** Returns new `VersionInfo` instance with empty data. */
  static createEmpty() {
    return new _VersionInfo();
  }
  static create(arg1, fixedInfo, strings) {
    let lang;
    if (typeof arg1 === "object") {
      lang = arg1.lang;
      fixedInfo = arg1.fixedInfo;
      strings = arg1.strings;
    } else {
      lang = arg1;
    }
    const vi2 = new _VersionInfo();
    vi2.data.lang = lang;
    for (const _fixedInfoKey in fixedInfo) {
      const fixedInfoKey = _fixedInfoKey;
      if (fixedInfoKey in fixedInfo) {
        const value = fixedInfo[fixedInfoKey];
        if (value != null) {
          vi2.data.fixedInfo[fixedInfoKey] = value;
        }
      }
    }
    vi2.data.strings = strings.map(
      ({ lang: lang2, codepage, values }) => ({
        lang: lang2,
        codepage,
        values: cloneObject2(values)
      })
    );
    vi2.data.translations = strings.map(
      ({ lang: lang2, codepage }) => ({ lang: lang2, codepage })
    );
    return vi2;
  }
  /** Pick up all version-info entries */
  static fromEntries(entries) {
    return entries.filter((e) => e.type === 16).map((e) => new _VersionInfo(e));
  }
  /** A language value for this resource entry. */
  get lang() {
    return this.data.lang;
  }
  set lang(value) {
    this.data.lang = value;
  }
  /**
   * The property of fixed version info, containing file version, product version, etc.
   * (data: `VS_FIXEDFILEINFO`)
   *
   * Although this property is read-only, you can rewrite
   * each child fields directly to apply data.
   */
  get fixedInfo() {
    return this.data.fixedInfo;
  }
  /**
   * Returns all languages that the executable supports. (data: `VarFileInfo`)
   *
   * Usually the returned array is equal to the one returned by `getAllLanguagesForStringValues`,
   * but some resource-generating tools doesn't generate same values.
   */
  getAvailableLanguages() {
    return this.data.translations.slice(0);
  }
  /**
   * Replaces all languages that the executable supports.
   */
  replaceAvailableLanguages(languages) {
    this.data.translations = languages.slice(0);
  }
  /**
   * Returns all string values for the specified language. (data: values in lang-charset block of `StringFileInfo`)
   */
  getStringValues(language) {
    const a = this.data.strings.filter(
      (e) => e.lang === language.lang && e.codepage === language.codepage
    ).map((e) => e.values);
    return a.length > 0 ? a[0] : {};
  }
  /**
   * Returns all languages used by string values. (data: lang-charset name of `StringFileInfo`)
   *
   * Usually the returned array is equal to the one returned by `getAvailableLanguages`,
   * but some resource-generating tools doesn't generate same values.
   */
  getAllLanguagesForStringValues() {
    return this.data.strings.map(
      ({ codepage, lang }) => ({ codepage, lang })
    );
  }
  /**
   * Add or replace the string values.
   * @param language language info
   * @param values string values (key-value pairs)
   * @param addToAvailableLanguage set `true` to add `language` into available languages
   *     if not existing in `getAvailableLanguages()` (default: `true`)
   */
  setStringValues(language, values, addToAvailableLanguage = true) {
    const a = this.data.strings.filter(
      (e) => e.lang === language.lang && e.codepage === language.codepage
    );
    let table;
    if (a.length === 0) {
      table = {
        lang: language.lang,
        codepage: language.codepage,
        values: {}
      };
      this.data.strings.push(table);
    } else {
      table = a[0];
    }
    for (const key in values) {
      const value = values[key];
      if (value != null) {
        table.values[key] = value;
      }
    }
    if (addToAvailableLanguage) {
      const t = this.data.translations.filter(
        (e) => e.lang === language.lang && e.codepage === language.codepage
      );
      if (t.length === 0) {
        this.data.translations.push({
          lang: language.lang,
          codepage: language.codepage
        });
      }
    }
  }
  /**
   * Add or replace the string value.
   * @param language language info
   * @param key the key name of string value
   * @param value the string value
   * @param addToAvailableLanguage set `true` to add `language` into available languages
   *     if not existing in `getAvailableLanguages()` (default: `true`)
   */
  setStringValue(language, key, value, addToAvailableLanguage = true) {
    this.setStringValues(
      language,
      { [key]: value },
      addToAvailableLanguage
    );
  }
  /**
   * Remove all string values for specified language.
   * @param language language info
   * @param removeFromAvailableLanguage set `true` to remove `language` from available languages
   *     if existing in `getAvailableLanguages()` (default: `true`)
   */
  removeAllStringValues(language, removeFromAvailableLanguage = true) {
    const strings = this.data.strings;
    const len = strings.length;
    for (let i = 0; i < len; ++i) {
      const e = strings[i];
      if (e != null && e.lang === language.lang && e.codepage === language.codepage) {
        strings.splice(i, 1);
        if (removeFromAvailableLanguage) {
          const translations = this.data.translations;
          for (let j = 0; j < translations.length; j++) {
            const t = translations[j];
            if (t != null && t.lang === language.lang && t.codepage === language.codepage) {
              translations.splice(j, 1);
              break;
            }
          }
        }
        break;
      }
    }
  }
  /**
   * Remove specified string value for specified language.
   * @param language language info
   * @param key the key name of string value to be removed
   * @param removeFromAvailableLanguage set `true` to remove `language` from available languages
   *     if no more string values exist for `language` (default: `true`)
   */
  removeStringValue(language, key, removeFromAvailableLanguage = true) {
    const strings = this.data.strings;
    const len = strings.length;
    for (let i = 0; i < len; ++i) {
      const e = strings[i];
      if (e != null && e.lang === language.lang && e.codepage === language.codepage) {
        try {
          delete e.values[key];
        } catch (_ex) {
        }
        if (removeFromAvailableLanguage && Object.keys(e.values).length === 0) {
          strings.splice(i, 1);
          const translations = this.data.translations;
          for (let j = 0; j < translations.length; j++) {
            const t = translations[j];
            if (t != null && t.lang === language.lang && t.codepage === language.codepage) {
              translations.splice(j, 1);
              break;
            }
          }
        }
        break;
      }
    }
  }
  /**
   * Creates `Type.ResourceEntry` object for this instance.
   * Usually `outputToResourceEntries` is suitable for generating resource data
   * into executables, but you can use this method if necessary.
   */
  generateResource() {
    const bin = generateVersionEntryBinary(this.data);
    return {
      type: 16,
      id: 1,
      lang: this.lang,
      codepage: 1200,
      bin
    };
  }
  /**
   * Generates version info resource data (using `generateResource()`) and emits into `entries` array.
   * If version info resource already exists in `entries`, this method replaces it with the new one.
   * @param entries resource entry array for output
   */
  outputToResourceEntries(entries) {
    const res2 = this.generateResource();
    const len = entries.length;
    for (let i = 0; i < len; ++i) {
      const e = entries[i];
      if (e != null && e.type === 16 && e.id === res2.id && e.lang === res2.lang) {
        entries[i] = res2;
        return;
      }
    }
    entries.push(res2);
  }
  // utility methods
  getDefaultVersionLang(propName) {
    const num = Number(this.lang);
    if (this.lang !== "" && !isNaN(num)) {
      return num;
    }
    const a = this.data.strings.filter((e) => propName in e.values && e.values[propName] != null).map((e) => e.lang);
    if (a.length === 1) {
      return a[0];
    }
    return 1033;
  }
  setFileVersion(arg1, arg2, arg3, arg4, arg5) {
    this.setFileVersionImpl(
      ...parseVersionArguments(arg1, arg2, arg3, arg4, arg5)
    );
  }
  setFileVersionImpl(major, minor, micro, revision, lang) {
    lang = typeof lang !== "undefined" ? lang : this.getDefaultVersionLang("FileVersion");
    this.fixedInfo.fileVersionMS = major << 16 | minor;
    this.fixedInfo.fileVersionLS = micro << 16 | revision;
    this.setStringValue(
      { lang, codepage: 1200 },
      "FileVersion",
      `${major}.${minor}.${micro}.${revision}`,
      true
    );
  }
  setProductVersion(arg1, arg2, arg3, arg4, arg5) {
    this.setProductVersionImpl(
      ...parseVersionArguments(arg1, arg2, arg3, arg4, arg5)
    );
  }
  setProductVersionImpl(major, minor, micro, revision, lang) {
    lang = typeof lang !== "undefined" ? lang : this.getDefaultVersionLang("ProductVersion");
    this.fixedInfo.productVersionMS = major << 16 | minor;
    this.fixedInfo.productVersionLS = micro << 16 | revision;
    this.setStringValue(
      { lang, codepage: 1200 },
      "ProductVersion",
      `${major}.${minor}.${micro}.${revision}`,
      true
    );
  }
};

// ../../../../../tmp/claude-0/nl/resedit-js/src/main/resource/index.ts
var resource_exports = {};
__export(resource_exports, {
  IconGroupEntry: () => IconGroupEntry,
  StringTable: () => StringTable,
  VersionFileDriverSubtype: () => VersionFileDriverSubtype,
  VersionFileFlags: () => VersionFileFlags_default,
  VersionFileFontSubtype: () => VersionFileFontSubtype,
  VersionFileOS: () => VersionFileOS_default,
  VersionFileType: () => VersionFileType_default,
  VersionInfo: () => VersionInfo
});

// ../../../../../tmp/claude-0/nl/resedit-js/src/main/resource/IconGroupEntry.ts
function generateEntryBinary2(icons) {
  let count = icons.length;
  if (count > 65535) {
    count = 65535;
  }
  const size = 6 + 14 * icons.length;
  const bin = new ArrayBuffer(size);
  const view = new DataView(bin);
  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, count, true);
  let offset = 6;
  icons.forEach((icon) => {
    view.setUint8(offset, icon.width >= 256 ? 0 : icon.width);
    view.setUint8(offset + 1, icon.height >= 256 ? 0 : icon.height);
    view.setUint8(offset + 2, icon.colors >= 256 ? 0 : icon.colors);
    view.setUint8(offset + 3, 0);
    view.setUint16(offset + 4, icon.planes, true);
    view.setUint16(offset + 6, icon.bitCount, true);
    view.setUint32(offset + 8, icon.dataSize, true);
    view.setUint16(offset + 12, icon.iconID, true);
    offset += 14;
  });
  return bin;
}
function findUnusedIconID(entries, lang, isCursor) {
  const type = isCursor ? 1 : 3;
  const filteredIDs = entries.filter(
    (e) => e.type === type && e.lang === lang && typeof e.id === "number"
  ).map((e) => e.id).sort((a, b) => a - b);
  let idCurrent = 1;
  for (const id of filteredIDs) {
    if (idCurrent < id) {
      return {
        id: idCurrent,
        last: false
      };
    } else if (idCurrent === id) {
      ++idCurrent;
    }
  }
  return {
    id: idCurrent,
    last: true
  };
}
var IconGroupEntry = class _IconGroupEntry {
  constructor(groupEntry) {
    const view = new DataView(groupEntry.bin);
    const totalSize = view.byteLength;
    const icons = [];
    if (view.getUint16(2, true) === 1) {
      const count = view.getUint16(4, true);
      let offset = 6;
      for (let i = 0; i < count; ++i) {
        icons.push({
          width: readUint8WithLastOffset(view, offset, totalSize),
          height: readUint8WithLastOffset(
            view,
            offset + 1,
            totalSize
          ),
          colors: readUint8WithLastOffset(
            view,
            offset + 2,
            totalSize
          ),
          planes: readUint16WithLastOffset(
            view,
            offset + 4,
            totalSize
          ),
          bitCount: readUint16WithLastOffset(
            view,
            offset + 6,
            totalSize
          ),
          dataSize: readUint32WithLastOffset(
            view,
            offset + 8,
            totalSize
          ),
          iconID: readUint16WithLastOffset(
            view,
            offset + 12,
            totalSize
          )
        });
        offset += 14;
      }
    }
    this.id = groupEntry.id;
    this.lang = groupEntry.lang;
    this.icons = icons;
  }
  static fromEntries(entries) {
    return entries.filter((e) => e.type === 14).map((e) => new _IconGroupEntry(e));
  }
  generateEntry() {
    const bin = generateEntryBinary2(this.icons);
    return {
      type: 14,
      id: this.id,
      lang: this.lang,
      codepage: 0,
      bin
    };
  }
  /**
   * Return an array of `IconItem` / `RawIconItem`, which are in the group of this `IconGroupEntry` instance,
   * from specified resource entries.
   */
  getIconItemsFromEntries(entries) {
    return entries.map((e) => {
      if (e.type !== 3 || e.lang !== this.lang) {
        return null;
      }
      const c = this.icons.filter((icon) => e.id === icon.iconID).shift();
      if (!c) {
        return null;
      }
      return {
        entry: e,
        icon: c
      };
    }).filter((item) => !!item).map((item) => {
      const bin = item.entry.bin;
      const view = new DataView(bin);
      if (view.getUint32(0, true) === 40) {
        return IconItem.from(bin);
      } else {
        const c = item.icon;
        return RawIconItem.from(bin, c.width, c.height, c.bitCount);
      }
    });
  }
  /**
   * Add or replace icon resource entries with specified icon data.
   * The IDs of individual icon resources (`RT_ICON`) are calculated automatically.
   * @param destEntries base (destination) resource entries.
   * @param iconGroupID the icon ID for the new resource data.
   *     If the icon-group resource of the ID and 'lang' value already exists,
   *     the resource data is replaced; otherwise the resource data is appended.
   * @param lang the language for specified icons (0 for neutral, 0x409 for en-US)
   * @param icons the icons to replace
   */
  static replaceIconsForResource(destEntries, iconGroupID, lang, icons) {
    let entry = destEntries.filter(
      (e) => e.type === 14 && e.id === iconGroupID && e.lang === lang
    ).shift();
    const tmpIconArray = icons.map((icon) => {
      if (icon.isIcon()) {
        let { width, height } = icon;
        if (width === null) {
          width = icon.bitmapInfo.width;
        }
        if (height === null) {
          height = icon.bitmapInfo.height;
          if (icon.masks !== null) {
            height = Math.floor(height / 2);
          }
        }
        return {
          base: icon,
          bm: {
            width,
            height,
            planes: icon.bitmapInfo.planes,
            bitCount: icon.bitmapInfo.bitCount
          },
          bin: icon.generate(),
          id: 0
        };
      } else {
        return {
          base: icon,
          bm: {
            width: icon.width,
            height: icon.height,
            planes: 1,
            bitCount: icon.bitCount
          },
          bin: icon.bin,
          id: 0
        };
      }
    });
    if (entry) {
      for (let i = destEntries.length - 1; i >= 0; --i) {
        const e = destEntries[i];
        if (e != null && e.type === 3) {
          if (!isIconUsed(e, destEntries, entry)) {
            destEntries.splice(i, 1);
          }
        }
      }
    } else {
      entry = {
        type: 14,
        id: iconGroupID,
        lang,
        codepage: 0,
        // set later
        bin: null
      };
      destEntries.push(entry);
    }
    let idInfo;
    tmpIconArray.forEach((icon) => {
      if (!(idInfo == null ? void 0 : idInfo.last)) {
        idInfo = findUnusedIconID(destEntries, lang, false);
      } else {
        ++idInfo.id;
      }
      destEntries.push({
        type: 3,
        // RT_ICON
        id: idInfo.id,
        lang,
        codepage: 0,
        bin: icon.bin
      });
      icon.id = idInfo.id;
    });
    const binEntry = generateEntryBinary2(
      tmpIconArray.map((icon) => {
        let width = Math.abs(icon.bm.width);
        if (width >= 256) {
          width = 0;
        }
        let height = Math.abs(icon.bm.height);
        if (height >= 256) {
          height = 0;
        }
        let colors = 0;
        if (icon.base.isIcon()) {
          const bmBase = icon.base.bitmapInfo;
          colors = bmBase.colorUsed || bmBase.colors.length;
          if (!colors) {
            switch (bmBase.bitCount) {
              case 1:
                colors = 2;
                break;
              case 4:
                colors = 16;
                break;
            }
          }
          if (colors >= 256) {
            colors = 0;
          }
        }
        return {
          width,
          height,
          colors,
          planes: icon.bm.planes,
          bitCount: icon.bm.bitCount,
          dataSize: icon.bin.byteLength,
          iconID: icon.id
        };
      })
    );
    entry.bin = binEntry;
    function isIconUsed(icon, allEntries, excludeGroup) {
      return allEntries.some((e) => {
        if (e.type !== 14 || e.id === excludeGroup.id && e.lang === excludeGroup.lang) {
          return false;
        }
        const g = new _IconGroupEntry(e);
        return g.icons.some((c) => {
          return c.iconID === icon.id;
        });
      });
    }
  }
};

// ../../../../../tmp/claude-0/nl/resedit-js/src/main/resource/StringTableItem.ts
var StringTableItem = class _StringTableItem {
  constructor() {
    this.length = 16;
    this._a = [];
    this._a.length = 16;
    for (let i = 0; i < 16; ++i) {
      this._a[i] = "";
    }
  }
  static fromEntry(bin, offset, byteLength) {
    const view = new DataView(bin, offset, byteLength);
    const ret = new _StringTableItem();
    let o = 0;
    for (let i = 0; i < 16; ++i) {
      const len = view.getUint16(o, true);
      o += 2;
      let s = "";
      for (let j = 0; j < len; ++j) {
        s += String.fromCharCode(view.getUint16(o, true));
        o += 2;
      }
      ret._a[i] = s;
    }
    return ret;
  }
  get(index) {
    const value = this._a[index];
    return value != null && value !== "" ? value : null;
  }
  getAll() {
    return this._a.map((s) => s || null);
  }
  set(index, val) {
    this._a[index] = `${val ?? ""}`.substr(0, 4097);
  }
  calcByteLength() {
    let len = 0;
    for (let i = 0; i < 16; ++i) {
      const item = this._a[i];
      len += 2;
      if (item != null) {
        len += 2 * item.length;
      }
    }
    return Math.floor((len + 15) / 16) * 16;
  }
  generate(bin, offset) {
    const out2 = new DataView(bin, offset);
    let len = 0;
    for (let i = 0; i < 16; ++i) {
      const s = this._a[i];
      const l = s == null ? 0 : s.length > 4097 ? 4097 : s.length;
      out2.setUint16(len, l, true);
      len += 2;
      if (s != null) {
        for (let j = 0; j < l; ++j) {
          out2.setUint16(len, s.charCodeAt(j), true);
          len += 2;
        }
      }
    }
    return Math.floor((len + 15) / 16) * 16;
  }
};

// ../../../../../tmp/claude-0/nl/resedit-js/src/main/resource/StringTable.ts
var StringTable = class _StringTable {
  constructor() {
    this.lang = 0;
    this.items = [];
  }
  /** Create StringTable instance from resource entries, with specified language. */
  static fromEntries(lang, entries) {
    const r = new _StringTable();
    entries.forEach((e) => {
      if (e.type !== 6 || e.lang !== lang || typeof e.id !== "number" || e.id <= 0) {
        return;
      }
      r.items[e.id - 1] = StringTableItem.fromEntry(
        e.bin,
        0,
        e.bin.byteLength
      );
    });
    r.lang = lang;
    return r;
  }
  /** Return all string entries. */
  getAllStrings() {
    return this.items.map((e, i) => {
      return e.getAll().map(
        (x, j) => x !== null && x !== "" ? { id: (i << 4) + j, text: x } : null
      ).filter((x) => !!x);
    }).reduce((p, c) => p.concat(c), []);
  }
  /** Return the string data for ID value, which can be used for Win32API LoadString. */
  getById(id) {
    if (id < 0) {
      return null;
    }
    const entryIndex = id >> 4;
    const entryPos = id & 15;
    const e = this.items[entryIndex];
    return (e == null ? void 0 : e.get(entryPos)) ?? null;
  }
  /**
   * Set/overwide the string data for ID value, which can be used for Win32API LoadString.
   * @param id data ID
   * @param text string data (entry will be removed if null or empty string is specified)
   */
  setById(id, text) {
    if (id < 0) {
      return;
    }
    const entryIndex = id >> 4;
    const entryPos = id & 15;
    let e = this.items[entryIndex];
    if (!e) {
      this.items[entryIndex] = e = new StringTableItem();
    }
    e.set(entryPos, text);
  }
  /** Generates an array of Entry for resource processings */
  generateEntries() {
    return this.items.map((e, i) => {
      const len = e.calcByteLength();
      const bin = new ArrayBuffer(len);
      e.generate(bin, 0);
      return {
        type: 6,
        id: i + 1,
        lang: this.lang,
        codepage: 1200,
        bin
      };
    }).filter((e) => !!e);
  }
  /**
   * Replace all string entries for NtExecutableResource with containing resource data.
   * The only entries of same language are replaced.
   */
  replaceStringEntriesForExecutable(res2) {
    const entries = this.generateEntries();
    const dest = res2.entries;
    for (let i = 0; i < dest.length; ++i) {
      const e = dest[i];
      if (e != null && e.type === 6 && e.lang === this.lang) {
        for (let j = dest.length - 1; j >= i; --j) {
          const e2 = dest[j];
          if (e2 != null && e2.type === 6 && e2.lang === this.lang) {
            dest.splice(j, 1);
          }
        }
        const f = dest.splice.bind(dest, i, 0);
        f(...entries);
        return;
      }
    }
    for (let i = 0; i < dest.length; ++i) {
      const e = dest[i];
      if (e != null && e.type === 6 && e.lang < this.lang) {
        const f = dest.splice.bind(dest, i + 1, 0);
        f(...entries);
        return;
      }
    }
    for (let i = dest.length - 1; i >= 0; --i) {
      const e = dest[i];
      if (e != null && e.type === 6) {
        const f = dest.splice.bind(dest, i + 1, 0);
        f(...entries);
        return;
      }
    }
    dest.push(...entries);
  }
};

// ../../../../../tmp/claude-0/nl/resedit-js/src/main/resource/VersionFileFlags.ts
var VersionFileFlags = {
  Debug: 1,
  Prerelease: 2,
  Patched: 4,
  PrivateBuild: 8,
  InfoInferred: 16,
  SpecialBuild: 32
};
var VersionFileFlags_default = VersionFileFlags;

// ../../../../../tmp/claude-0/nl/resedit-js/src/main/resource/VersionFileOS.ts
var VersionFileOS = {
  Unknown: 0,
  _Windows16: 1,
  _PM16: 2,
  _PM32: 3,
  _Windows32: 4,
  DOS: 65536,
  OS2_16: 131072,
  OS2_32: 196608,
  NT: 262144,
  DOS_Windows16: 65537,
  DOS_Windows32: 65540,
  NT_Windows32: 262148,
  OS2_16_PM16: 131074,
  OS2_32_PM32: 196611
};
var VersionFileOS_default = VersionFileOS;

// ../../../../../tmp/claude-0/nl/resedit-js/src/main/resource/VersionFileSubtypes.ts
var VersionFileDriverSubtype = {
  Unknown: 0,
  Printer: 1,
  Keyboard: 2,
  Language: 3,
  Display: 4,
  Mouse: 5,
  Network: 6,
  System: 7,
  Installable: 8,
  Sound: 9,
  Comm: 10,
  VersionedPrinter: 12
};
var VersionFileFontSubtype = {
  Unknown: 0,
  Raster: 1,
  Vector: 2,
  TrueType: 3
};

// ../../../../../tmp/claude-0/nl/resedit-js/src/main/resource/VersionFileType.ts
var VersionFileType = {
  Unknown: 0,
  App: 1,
  DLL: 2,
  Driver: 3,
  Font: 4,
  VxD: 5,
  StaticLibrary: 7
};
var VersionFileType_default = VersionFileType;

// ../../../../../tmp/claude-0/nl/resedit-js/src/main/sign/data/derUtil.ts
function makeDERLength(length) {
  if (length < 128) {
    return [length];
  }
  const r = [];
  while (true) {
    r.push(length & 255);
    if (length < 256) {
      break;
    }
    length >>= 8;
  }
  r.push(128 + r.length);
  return r.reverse();
}

// ../../../../../tmp/claude-0/nl/resedit-js/src/main/sign/data/ObjectIdentifier.ts
var ObjectIdentifier = class {
  constructor(value) {
    if (typeof value === "string") {
      this.value = value.split(/\./g).map((s) => Number(s));
    } else {
      this.value = value;
    }
  }
  toDER() {
    const id = this.value;
    const r = [];
    if (id.length < 2) {
      throw new Error("Unexpected 'value' field");
    }
    r.push(id[0] * 40 + id[1]);
    for (let i = 2; i < id.length; ++i) {
      let val = id[i];
      let isFirst = true;
      const insertPos = r.length;
      while (true) {
        let v = val & 127;
        if (!isFirst) {
          v += 128;
        }
        r.splice(insertPos, 0, v);
        if (val < 128) {
          break;
        }
        isFirst = false;
        val = Math.floor(val / 128);
      }
    }
    return [6].concat(makeDERLength(r.length)).concat(r);
  }
};

// ../../../../../tmp/claude-0/nl/resedit-js/src/main/sign/data/KnownOids.ts
var OID_SHA1_NO_SIGN = new ObjectIdentifier([1, 3, 14, 3, 2, 26]);
var OID_SHA256_NO_SIGN = new ObjectIdentifier([2, 16, 840, 1, 101, 3, 4, 2, 1]);
var OID_SHA384_NO_SIGN = new ObjectIdentifier([2, 16, 840, 1, 101, 3, 4, 2, 2]);
var OID_SHA512_NO_SIGN = new ObjectIdentifier([2, 16, 840, 1, 101, 3, 4, 2, 3]);
var OID_SHA224_NO_SIGN = new ObjectIdentifier([2, 16, 840, 1, 101, 3, 4, 2, 4]);
var OID_SHA512_224_NO_SIGN = new ObjectIdentifier([2, 16, 840, 1, 101, 3, 4, 2, 5]);
var OID_SHA512_256_NO_SIGN = new ObjectIdentifier([2, 16, 840, 1, 101, 3, 4, 2, 6]);
var OID_SHA3_224_NO_SIGN = new ObjectIdentifier([2, 16, 840, 1, 101, 3, 4, 2, 7]);
var OID_SHA3_256_NO_SIGN = new ObjectIdentifier([2, 16, 840, 1, 101, 3, 4, 2, 8]);
var OID_SHA3_384_NO_SIGN = new ObjectIdentifier([2, 16, 840, 1, 101, 3, 4, 2, 9]);
var OID_SHA3_512_NO_SIGN = new ObjectIdentifier([2, 16, 840, 1, 101, 3, 4, 2, 10]);
var OID_SHAKE128_NO_SIGN = new ObjectIdentifier([2, 16, 840, 1, 101, 3, 4, 2, 11]);
var OID_SHAKE256_NO_SIGN = new ObjectIdentifier([2, 16, 840, 1, 101, 3, 4, 2, 12]);
var OID_RSA = new ObjectIdentifier([1, 2, 840, 113549, 1, 1, 1]);
var OID_DSA = new ObjectIdentifier([1, 2, 840, 10040, 4, 1]);
var OID_SIGNED_DATA = new ObjectIdentifier([1, 2, 840, 113549, 1, 7, 2]);
var OID_CONTENT_TYPE = new ObjectIdentifier([1, 2, 840, 113549, 1, 9, 3]);
var OID_MESSAGE_DIGEST = new ObjectIdentifier([1, 2, 840, 113549, 1, 9, 4]);
var OID_SPC_STATEMENT_TYPE_OBJID = new ObjectIdentifier([1, 3, 6, 1, 4, 1, 311, 2, 1, 11]);
var OID_SPC_SP_OPUS_INFO_OBJID = new ObjectIdentifier([1, 3, 6, 1, 4, 1, 311, 2, 1, 12]);
var OID_SPC_INDIVIDUAL_SP_KEY_PURPOSE_OBJID = new ObjectIdentifier([1, 3, 6, 1, 4, 1, 311, 2, 1, 21]);
var OID_RFC3161_COUNTER_SIGNATURE = new ObjectIdentifier([1, 3, 6, 1, 4, 1, 311, 3, 3, 1]);

// ../../../../../tmp/claude-0/nl/resedit-js/src/main/sign/data/SpcIndirectDataContent.ts
var SPC_INDIRECT_DATA_OBJID = new ObjectIdentifier([1, 3, 6, 1, 4, 1, 311, 2, 1, 4]);

// ../../../../../tmp/claude-0/nl/resedit-js/src/main/sign/data/SpcPeImageData.ts
var SPC_PE_IMAGE_DATA_OBJID = new ObjectIdentifier([1, 3, 6, 1, 4, 1, 311, 2, 1, 15]);

// patch-exe.ts
var fs = __toESM(require("fs"));
var [, , inExe, resNeu, icoPath, outExe, version = "2.1.0"] = process.argv;
if (!inExe || !resNeu || !icoPath || !outExe) {
  console.error("\u7528\u6CD5\uFF1Anode patch-exe.cjs <neutralino-win_x64.exe> <resources.neu> <icon.ico> <\u8F93\u51FA.exe> [\u7248\u672C\u53F7]");
  process.exit(1);
}
var EN_US = 1033;
var exe = NtExecutable.from(fs.readFileSync(inExe), { ignoreCert: true });
var res = NtExecutableResource.from(exe);
var ico = data_exports.IconFile.from(fs.readFileSync(icoPath));
resource_exports.IconGroupEntry.replaceIconsForResource(res.entries, 1, EN_US, ico.icons.map((i) => i.data));
var [ma, mi, pa] = version.split(".").map((n) => parseInt(n, 10) || 0);
var vi = resource_exports.VersionInfo.createEmpty();
vi.setFileVersion(ma, mi, pa, 0, EN_US);
vi.setProductVersion(ma, mi, pa, 0, EN_US);
vi.setStringValues({ lang: EN_US, codepage: 1200 }, {
  ProductName: "\u5F39\u73E0\u6E38\u56ED\u4F1A",
  FileDescription: "\u5F39\u73E0\u6E38\u56ED\u4F1A \xB7 \u6D3B\u52A8\u62BD\u5956\u5F39\u73E0\u5C0F\u6E38\u620F",
  InternalName: "pinball-fair",
  OriginalFilename: "\u5F39\u73E0\u6E38\u56ED\u4F1A.exe",
  ProductVersion: version,
  FileVersion: version,
  LegalCopyright: "Built with Neutralinojs (MIT)"
});
vi.outputToResourceEntries(res.entries);
var neu = fs.readFileSync(resNeu);
var RES_NAME = "NEUTRALINOJS_RESOURCES_NEU";
for (let i = res.entries.length - 1; i >= 0; i--) {
  const e = res.entries[i];
  if (e.type === 10 && e.id === RES_NAME) res.entries.splice(i, 1);
}
res.entries.push({ type: 10, id: RES_NAME, lang: EN_US, codepage: 0, bin: neu.buffer.slice(neu.byteOffset, neu.byteOffset + neu.byteLength) });
res.outputResource(exe);
var out = Buffer.from(exe.generate());
var fuse = Buffer.from("POSTJECT_SENTINEL_fce680ab2cc467b6e072b8b5df1996b2:");
var at = out.indexOf(fuse);
if (at < 0 || out.indexOf(fuse, at + 1) >= 0) throw new Error("\u54E8\u5175\u5F00\u5173\u6570\u91CF\u4E0D\u5BF9\uFF0C\u65E0\u6CD5\u786E\u8BA4\u5D4C\u5165\u6A21\u5F0F");
out[at + fuse.length] = "1".charCodeAt(0);
fs.writeFileSync(outExe, out);
console.log(`\u5DF2\u751F\u6210 ${outExe}\uFF08${(out.length / 1024 / 1024).toFixed(2)} MB\uFF0C\u5185\u5D4C\u8D44\u6E90 ${(neu.length / 1024 / 1024).toFixed(2)} MB\uFF09`);
