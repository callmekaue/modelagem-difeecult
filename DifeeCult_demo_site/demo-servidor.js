var DemoServidor = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
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

  // node_modules/base64-js/index.js
  var require_base64_js = __commonJS({
    "node_modules/base64-js/index.js"(exports) {
      "use strict";
      init_globais();
      exports.byteLength = byteLength;
      exports.toByteArray = toByteArray;
      exports.fromByteArray = fromByteArray;
      var lookup = [];
      var revLookup = [];
      var Arr = typeof Uint8Array !== "undefined" ? Uint8Array : Array;
      var code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
      for (i = 0, len = code.length; i < len; ++i) {
        lookup[i] = code[i];
        revLookup[code.charCodeAt(i)] = i;
      }
      var i;
      var len;
      revLookup["-".charCodeAt(0)] = 62;
      revLookup["_".charCodeAt(0)] = 63;
      function getLens(b64) {
        var len2 = b64.length;
        if (len2 % 4 > 0) {
          throw new Error("Invalid string. Length must be a multiple of 4");
        }
        var validLen = b64.indexOf("=");
        if (validLen === -1) validLen = len2;
        var placeHoldersLen = validLen === len2 ? 0 : 4 - validLen % 4;
        return [validLen, placeHoldersLen];
      }
      function byteLength(b64) {
        var lens = getLens(b64);
        var validLen = lens[0];
        var placeHoldersLen = lens[1];
        return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
      }
      function _byteLength(b64, validLen, placeHoldersLen) {
        return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
      }
      function toByteArray(b64) {
        var tmp;
        var lens = getLens(b64);
        var validLen = lens[0];
        var placeHoldersLen = lens[1];
        var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));
        var curByte = 0;
        var len2 = placeHoldersLen > 0 ? validLen - 4 : validLen;
        var i2;
        for (i2 = 0; i2 < len2; i2 += 4) {
          tmp = revLookup[b64.charCodeAt(i2)] << 18 | revLookup[b64.charCodeAt(i2 + 1)] << 12 | revLookup[b64.charCodeAt(i2 + 2)] << 6 | revLookup[b64.charCodeAt(i2 + 3)];
          arr[curByte++] = tmp >> 16 & 255;
          arr[curByte++] = tmp >> 8 & 255;
          arr[curByte++] = tmp & 255;
        }
        if (placeHoldersLen === 2) {
          tmp = revLookup[b64.charCodeAt(i2)] << 2 | revLookup[b64.charCodeAt(i2 + 1)] >> 4;
          arr[curByte++] = tmp & 255;
        }
        if (placeHoldersLen === 1) {
          tmp = revLookup[b64.charCodeAt(i2)] << 10 | revLookup[b64.charCodeAt(i2 + 1)] << 4 | revLookup[b64.charCodeAt(i2 + 2)] >> 2;
          arr[curByte++] = tmp >> 8 & 255;
          arr[curByte++] = tmp & 255;
        }
        return arr;
      }
      function tripletToBase64(num) {
        return lookup[num >> 18 & 63] + lookup[num >> 12 & 63] + lookup[num >> 6 & 63] + lookup[num & 63];
      }
      function encodeChunk(uint8, start, end) {
        var tmp;
        var output = [];
        for (var i2 = start; i2 < end; i2 += 3) {
          tmp = (uint8[i2] << 16 & 16711680) + (uint8[i2 + 1] << 8 & 65280) + (uint8[i2 + 2] & 255);
          output.push(tripletToBase64(tmp));
        }
        return output.join("");
      }
      function fromByteArray(uint8) {
        var tmp;
        var len2 = uint8.length;
        var extraBytes = len2 % 3;
        var parts = [];
        var maxChunkLength = 16383;
        for (var i2 = 0, len22 = len2 - extraBytes; i2 < len22; i2 += maxChunkLength) {
          parts.push(encodeChunk(uint8, i2, i2 + maxChunkLength > len22 ? len22 : i2 + maxChunkLength));
        }
        if (extraBytes === 1) {
          tmp = uint8[len2 - 1];
          parts.push(
            lookup[tmp >> 2] + lookup[tmp << 4 & 63] + "=="
          );
        } else if (extraBytes === 2) {
          tmp = (uint8[len2 - 2] << 8) + uint8[len2 - 1];
          parts.push(
            lookup[tmp >> 10] + lookup[tmp >> 4 & 63] + lookup[tmp << 2 & 63] + "="
          );
        }
        return parts.join("");
      }
    }
  });

  // node_modules/ieee754/index.js
  var require_ieee754 = __commonJS({
    "node_modules/ieee754/index.js"(exports) {
      init_globais();
      exports.read = function(buffer, offset, isLE, mLen, nBytes) {
        var e, m;
        var eLen = nBytes * 8 - mLen - 1;
        var eMax = (1 << eLen) - 1;
        var eBias = eMax >> 1;
        var nBits = -7;
        var i = isLE ? nBytes - 1 : 0;
        var d = isLE ? -1 : 1;
        var s = buffer[offset + i];
        i += d;
        e = s & (1 << -nBits) - 1;
        s >>= -nBits;
        nBits += eLen;
        for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {
        }
        m = e & (1 << -nBits) - 1;
        e >>= -nBits;
        nBits += mLen;
        for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {
        }
        if (e === 0) {
          e = 1 - eBias;
        } else if (e === eMax) {
          return m ? NaN : (s ? -1 : 1) * Infinity;
        } else {
          m = m + Math.pow(2, mLen);
          e = e - eBias;
        }
        return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
      };
      exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
        var e, m, c;
        var eLen = nBytes * 8 - mLen - 1;
        var eMax = (1 << eLen) - 1;
        var eBias = eMax >> 1;
        var rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
        var i = isLE ? 0 : nBytes - 1;
        var d = isLE ? 1 : -1;
        var s = value < 0 || value === 0 && 1 / value < 0 ? 1 : 0;
        value = Math.abs(value);
        if (isNaN(value) || value === Infinity) {
          m = isNaN(value) ? 1 : 0;
          e = eMax;
        } else {
          e = Math.floor(Math.log(value) / Math.LN2);
          if (value * (c = Math.pow(2, -e)) < 1) {
            e--;
            c *= 2;
          }
          if (e + eBias >= 1) {
            value += rt / c;
          } else {
            value += rt * Math.pow(2, 1 - eBias);
          }
          if (value * c >= 2) {
            e++;
            c /= 2;
          }
          if (e + eBias >= eMax) {
            m = 0;
            e = eMax;
          } else if (e + eBias >= 1) {
            m = (value * c - 1) * Math.pow(2, mLen);
            e = e + eBias;
          } else {
            m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
            e = 0;
          }
        }
        for (; mLen >= 8; buffer[offset + i] = m & 255, i += d, m /= 256, mLen -= 8) {
        }
        e = e << mLen | m;
        eLen += mLen;
        for (; eLen > 0; buffer[offset + i] = e & 255, i += d, e /= 256, eLen -= 8) {
        }
        buffer[offset + i - d] |= s * 128;
      };
    }
  });

  // node_modules/buffer/index.js
  var require_buffer = __commonJS({
    "node_modules/buffer/index.js"(exports) {
      "use strict";
      init_globais();
      var base64 = require_base64_js();
      var ieee754 = require_ieee754();
      var customInspectSymbol = typeof Symbol === "function" && typeof Symbol["for"] === "function" ? Symbol["for"]("nodejs.util.inspect.custom") : null;
      exports.Buffer = Buffer3;
      exports.SlowBuffer = SlowBuffer;
      exports.INSPECT_MAX_BYTES = 50;
      var K_MAX_LENGTH = 2147483647;
      exports.kMaxLength = K_MAX_LENGTH;
      Buffer3.TYPED_ARRAY_SUPPORT = typedArraySupport();
      if (!Buffer3.TYPED_ARRAY_SUPPORT && typeof console !== "undefined" && typeof console.error === "function") {
        console.error(
          "This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support."
        );
      }
      function typedArraySupport() {
        try {
          const arr = new Uint8Array(1);
          const proto = { foo: function() {
            return 42;
          } };
          Object.setPrototypeOf(proto, Uint8Array.prototype);
          Object.setPrototypeOf(arr, proto);
          return arr.foo() === 42;
        } catch (e) {
          return false;
        }
      }
      Object.defineProperty(Buffer3.prototype, "parent", {
        enumerable: true,
        get: function() {
          if (!Buffer3.isBuffer(this)) return void 0;
          return this.buffer;
        }
      });
      Object.defineProperty(Buffer3.prototype, "offset", {
        enumerable: true,
        get: function() {
          if (!Buffer3.isBuffer(this)) return void 0;
          return this.byteOffset;
        }
      });
      function createBuffer(length) {
        if (length > K_MAX_LENGTH) {
          throw new RangeError('The value "' + length + '" is invalid for option "size"');
        }
        const buf = new Uint8Array(length);
        Object.setPrototypeOf(buf, Buffer3.prototype);
        return buf;
      }
      function Buffer3(arg, encodingOrOffset, length) {
        if (typeof arg === "number") {
          if (typeof encodingOrOffset === "string") {
            throw new TypeError(
              'The "string" argument must be of type string. Received type number'
            );
          }
          return allocUnsafe(arg);
        }
        return from(arg, encodingOrOffset, length);
      }
      Buffer3.poolSize = 8192;
      function from(value, encodingOrOffset, length) {
        if (typeof value === "string") {
          return fromString(value, encodingOrOffset);
        }
        if (ArrayBuffer.isView(value)) {
          return fromArrayView(value);
        }
        if (value == null) {
          throw new TypeError(
            "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value
          );
        }
        if (isInstance(value, ArrayBuffer) || value && isInstance(value.buffer, ArrayBuffer)) {
          return fromArrayBuffer(value, encodingOrOffset, length);
        }
        if (typeof SharedArrayBuffer !== "undefined" && (isInstance(value, SharedArrayBuffer) || value && isInstance(value.buffer, SharedArrayBuffer))) {
          return fromArrayBuffer(value, encodingOrOffset, length);
        }
        if (typeof value === "number") {
          throw new TypeError(
            'The "value" argument must not be of type number. Received type number'
          );
        }
        const valueOf = value.valueOf && value.valueOf();
        if (valueOf != null && valueOf !== value) {
          return Buffer3.from(valueOf, encodingOrOffset, length);
        }
        const b = fromObject(value);
        if (b) return b;
        if (typeof Symbol !== "undefined" && Symbol.toPrimitive != null && typeof value[Symbol.toPrimitive] === "function") {
          return Buffer3.from(value[Symbol.toPrimitive]("string"), encodingOrOffset, length);
        }
        throw new TypeError(
          "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value
        );
      }
      Buffer3.from = function(value, encodingOrOffset, length) {
        return from(value, encodingOrOffset, length);
      };
      Object.setPrototypeOf(Buffer3.prototype, Uint8Array.prototype);
      Object.setPrototypeOf(Buffer3, Uint8Array);
      function assertSize(size) {
        if (typeof size !== "number") {
          throw new TypeError('"size" argument must be of type number');
        } else if (size < 0) {
          throw new RangeError('The value "' + size + '" is invalid for option "size"');
        }
      }
      function alloc(size, fill, encoding) {
        assertSize(size);
        if (size <= 0) {
          return createBuffer(size);
        }
        if (fill !== void 0) {
          return typeof encoding === "string" ? createBuffer(size).fill(fill, encoding) : createBuffer(size).fill(fill);
        }
        return createBuffer(size);
      }
      Buffer3.alloc = function(size, fill, encoding) {
        return alloc(size, fill, encoding);
      };
      function allocUnsafe(size) {
        assertSize(size);
        return createBuffer(size < 0 ? 0 : checked(size) | 0);
      }
      Buffer3.allocUnsafe = function(size) {
        return allocUnsafe(size);
      };
      Buffer3.allocUnsafeSlow = function(size) {
        return allocUnsafe(size);
      };
      function fromString(string, encoding) {
        if (typeof encoding !== "string" || encoding === "") {
          encoding = "utf8";
        }
        if (!Buffer3.isEncoding(encoding)) {
          throw new TypeError("Unknown encoding: " + encoding);
        }
        const length = byteLength(string, encoding) | 0;
        let buf = createBuffer(length);
        const actual = buf.write(string, encoding);
        if (actual !== length) {
          buf = buf.slice(0, actual);
        }
        return buf;
      }
      function fromArrayLike(array) {
        const length = array.length < 0 ? 0 : checked(array.length) | 0;
        const buf = createBuffer(length);
        for (let i = 0; i < length; i += 1) {
          buf[i] = array[i] & 255;
        }
        return buf;
      }
      function fromArrayView(arrayView) {
        if (isInstance(arrayView, Uint8Array)) {
          const copy = new Uint8Array(arrayView);
          return fromArrayBuffer(copy.buffer, copy.byteOffset, copy.byteLength);
        }
        return fromArrayLike(arrayView);
      }
      function fromArrayBuffer(array, byteOffset, length) {
        if (byteOffset < 0 || array.byteLength < byteOffset) {
          throw new RangeError('"offset" is outside of buffer bounds');
        }
        if (array.byteLength < byteOffset + (length || 0)) {
          throw new RangeError('"length" is outside of buffer bounds');
        }
        let buf;
        if (byteOffset === void 0 && length === void 0) {
          buf = new Uint8Array(array);
        } else if (length === void 0) {
          buf = new Uint8Array(array, byteOffset);
        } else {
          buf = new Uint8Array(array, byteOffset, length);
        }
        Object.setPrototypeOf(buf, Buffer3.prototype);
        return buf;
      }
      function fromObject(obj) {
        if (Buffer3.isBuffer(obj)) {
          const len = checked(obj.length) | 0;
          const buf = createBuffer(len);
          if (buf.length === 0) {
            return buf;
          }
          obj.copy(buf, 0, 0, len);
          return buf;
        }
        if (obj.length !== void 0) {
          if (typeof obj.length !== "number" || numberIsNaN(obj.length)) {
            return createBuffer(0);
          }
          return fromArrayLike(obj);
        }
        if (obj.type === "Buffer" && Array.isArray(obj.data)) {
          return fromArrayLike(obj.data);
        }
      }
      function checked(length) {
        if (length >= K_MAX_LENGTH) {
          throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + K_MAX_LENGTH.toString(16) + " bytes");
        }
        return length | 0;
      }
      function SlowBuffer(length) {
        if (+length != length) {
          length = 0;
        }
        return Buffer3.alloc(+length);
      }
      Buffer3.isBuffer = function isBuffer(b) {
        return b != null && b._isBuffer === true && b !== Buffer3.prototype;
      };
      Buffer3.compare = function compare(a, b) {
        if (isInstance(a, Uint8Array)) a = Buffer3.from(a, a.offset, a.byteLength);
        if (isInstance(b, Uint8Array)) b = Buffer3.from(b, b.offset, b.byteLength);
        if (!Buffer3.isBuffer(a) || !Buffer3.isBuffer(b)) {
          throw new TypeError(
            'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
          );
        }
        if (a === b) return 0;
        let x = a.length;
        let y = b.length;
        for (let i = 0, len = Math.min(x, y); i < len; ++i) {
          if (a[i] !== b[i]) {
            x = a[i];
            y = b[i];
            break;
          }
        }
        if (x < y) return -1;
        if (y < x) return 1;
        return 0;
      };
      Buffer3.isEncoding = function isEncoding(encoding) {
        switch (String(encoding).toLowerCase()) {
          case "hex":
          case "utf8":
          case "utf-8":
          case "ascii":
          case "latin1":
          case "binary":
          case "base64":
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return true;
          default:
            return false;
        }
      };
      Buffer3.concat = function concat(list, length) {
        if (!Array.isArray(list)) {
          throw new TypeError('"list" argument must be an Array of Buffers');
        }
        if (list.length === 0) {
          return Buffer3.alloc(0);
        }
        let i;
        if (length === void 0) {
          length = 0;
          for (i = 0; i < list.length; ++i) {
            length += list[i].length;
          }
        }
        const buffer = Buffer3.allocUnsafe(length);
        let pos = 0;
        for (i = 0; i < list.length; ++i) {
          let buf = list[i];
          if (isInstance(buf, Uint8Array)) {
            if (pos + buf.length > buffer.length) {
              if (!Buffer3.isBuffer(buf)) buf = Buffer3.from(buf);
              buf.copy(buffer, pos);
            } else {
              Uint8Array.prototype.set.call(
                buffer,
                buf,
                pos
              );
            }
          } else if (!Buffer3.isBuffer(buf)) {
            throw new TypeError('"list" argument must be an Array of Buffers');
          } else {
            buf.copy(buffer, pos);
          }
          pos += buf.length;
        }
        return buffer;
      };
      function byteLength(string, encoding) {
        if (Buffer3.isBuffer(string)) {
          return string.length;
        }
        if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
          return string.byteLength;
        }
        if (typeof string !== "string") {
          throw new TypeError(
            'The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' + typeof string
          );
        }
        const len = string.length;
        const mustMatch = arguments.length > 2 && arguments[2] === true;
        if (!mustMatch && len === 0) return 0;
        let loweredCase = false;
        for (; ; ) {
          switch (encoding) {
            case "ascii":
            case "latin1":
            case "binary":
              return len;
            case "utf8":
            case "utf-8":
              return utf8ToBytes(string).length;
            case "ucs2":
            case "ucs-2":
            case "utf16le":
            case "utf-16le":
              return len * 2;
            case "hex":
              return len >>> 1;
            case "base64":
              return base64ToBytes(string).length;
            default:
              if (loweredCase) {
                return mustMatch ? -1 : utf8ToBytes(string).length;
              }
              encoding = ("" + encoding).toLowerCase();
              loweredCase = true;
          }
        }
      }
      Buffer3.byteLength = byteLength;
      function slowToString(encoding, start, end) {
        let loweredCase = false;
        if (start === void 0 || start < 0) {
          start = 0;
        }
        if (start > this.length) {
          return "";
        }
        if (end === void 0 || end > this.length) {
          end = this.length;
        }
        if (end <= 0) {
          return "";
        }
        end >>>= 0;
        start >>>= 0;
        if (end <= start) {
          return "";
        }
        if (!encoding) encoding = "utf8";
        while (true) {
          switch (encoding) {
            case "hex":
              return hexSlice(this, start, end);
            case "utf8":
            case "utf-8":
              return utf8Slice(this, start, end);
            case "ascii":
              return asciiSlice(this, start, end);
            case "latin1":
            case "binary":
              return latin1Slice(this, start, end);
            case "base64":
              return base64Slice(this, start, end);
            case "ucs2":
            case "ucs-2":
            case "utf16le":
            case "utf-16le":
              return utf16leSlice(this, start, end);
            default:
              if (loweredCase) throw new TypeError("Unknown encoding: " + encoding);
              encoding = (encoding + "").toLowerCase();
              loweredCase = true;
          }
        }
      }
      Buffer3.prototype._isBuffer = true;
      function swap(b, n, m) {
        const i = b[n];
        b[n] = b[m];
        b[m] = i;
      }
      Buffer3.prototype.swap16 = function swap16() {
        const len = this.length;
        if (len % 2 !== 0) {
          throw new RangeError("Buffer size must be a multiple of 16-bits");
        }
        for (let i = 0; i < len; i += 2) {
          swap(this, i, i + 1);
        }
        return this;
      };
      Buffer3.prototype.swap32 = function swap32() {
        const len = this.length;
        if (len % 4 !== 0) {
          throw new RangeError("Buffer size must be a multiple of 32-bits");
        }
        for (let i = 0; i < len; i += 4) {
          swap(this, i, i + 3);
          swap(this, i + 1, i + 2);
        }
        return this;
      };
      Buffer3.prototype.swap64 = function swap64() {
        const len = this.length;
        if (len % 8 !== 0) {
          throw new RangeError("Buffer size must be a multiple of 64-bits");
        }
        for (let i = 0; i < len; i += 8) {
          swap(this, i, i + 7);
          swap(this, i + 1, i + 6);
          swap(this, i + 2, i + 5);
          swap(this, i + 3, i + 4);
        }
        return this;
      };
      Buffer3.prototype.toString = function toString() {
        const length = this.length;
        if (length === 0) return "";
        if (arguments.length === 0) return utf8Slice(this, 0, length);
        return slowToString.apply(this, arguments);
      };
      Buffer3.prototype.toLocaleString = Buffer3.prototype.toString;
      Buffer3.prototype.equals = function equals(b) {
        if (!Buffer3.isBuffer(b)) throw new TypeError("Argument must be a Buffer");
        if (this === b) return true;
        return Buffer3.compare(this, b) === 0;
      };
      Buffer3.prototype.inspect = function inspect() {
        let str = "";
        const max = exports.INSPECT_MAX_BYTES;
        str = this.toString("hex", 0, max).replace(/(.{2})/g, "$1 ").trim();
        if (this.length > max) str += " ... ";
        return "<Buffer " + str + ">";
      };
      if (customInspectSymbol) {
        Buffer3.prototype[customInspectSymbol] = Buffer3.prototype.inspect;
      }
      Buffer3.prototype.compare = function compare(target, start, end, thisStart, thisEnd) {
        if (isInstance(target, Uint8Array)) {
          target = Buffer3.from(target, target.offset, target.byteLength);
        }
        if (!Buffer3.isBuffer(target)) {
          throw new TypeError(
            'The "target" argument must be one of type Buffer or Uint8Array. Received type ' + typeof target
          );
        }
        if (start === void 0) {
          start = 0;
        }
        if (end === void 0) {
          end = target ? target.length : 0;
        }
        if (thisStart === void 0) {
          thisStart = 0;
        }
        if (thisEnd === void 0) {
          thisEnd = this.length;
        }
        if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
          throw new RangeError("out of range index");
        }
        if (thisStart >= thisEnd && start >= end) {
          return 0;
        }
        if (thisStart >= thisEnd) {
          return -1;
        }
        if (start >= end) {
          return 1;
        }
        start >>>= 0;
        end >>>= 0;
        thisStart >>>= 0;
        thisEnd >>>= 0;
        if (this === target) return 0;
        let x = thisEnd - thisStart;
        let y = end - start;
        const len = Math.min(x, y);
        const thisCopy = this.slice(thisStart, thisEnd);
        const targetCopy = target.slice(start, end);
        for (let i = 0; i < len; ++i) {
          if (thisCopy[i] !== targetCopy[i]) {
            x = thisCopy[i];
            y = targetCopy[i];
            break;
          }
        }
        if (x < y) return -1;
        if (y < x) return 1;
        return 0;
      };
      function bidirectionalIndexOf(buffer, val, byteOffset, encoding, dir) {
        if (buffer.length === 0) return -1;
        if (typeof byteOffset === "string") {
          encoding = byteOffset;
          byteOffset = 0;
        } else if (byteOffset > 2147483647) {
          byteOffset = 2147483647;
        } else if (byteOffset < -2147483648) {
          byteOffset = -2147483648;
        }
        byteOffset = +byteOffset;
        if (numberIsNaN(byteOffset)) {
          byteOffset = dir ? 0 : buffer.length - 1;
        }
        if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
        if (byteOffset >= buffer.length) {
          if (dir) return -1;
          else byteOffset = buffer.length - 1;
        } else if (byteOffset < 0) {
          if (dir) byteOffset = 0;
          else return -1;
        }
        if (typeof val === "string") {
          val = Buffer3.from(val, encoding);
        }
        if (Buffer3.isBuffer(val)) {
          if (val.length === 0) {
            return -1;
          }
          return arrayIndexOf(buffer, val, byteOffset, encoding, dir);
        } else if (typeof val === "number") {
          val = val & 255;
          if (typeof Uint8Array.prototype.indexOf === "function") {
            if (dir) {
              return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset);
            } else {
              return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset);
            }
          }
          return arrayIndexOf(buffer, [val], byteOffset, encoding, dir);
        }
        throw new TypeError("val must be string, number or Buffer");
      }
      function arrayIndexOf(arr, val, byteOffset, encoding, dir) {
        let indexSize = 1;
        let arrLength = arr.length;
        let valLength = val.length;
        if (encoding !== void 0) {
          encoding = String(encoding).toLowerCase();
          if (encoding === "ucs2" || encoding === "ucs-2" || encoding === "utf16le" || encoding === "utf-16le") {
            if (arr.length < 2 || val.length < 2) {
              return -1;
            }
            indexSize = 2;
            arrLength /= 2;
            valLength /= 2;
            byteOffset /= 2;
          }
        }
        function read(buf, i2) {
          if (indexSize === 1) {
            return buf[i2];
          } else {
            return buf.readUInt16BE(i2 * indexSize);
          }
        }
        let i;
        if (dir) {
          let foundIndex = -1;
          for (i = byteOffset; i < arrLength; i++) {
            if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
              if (foundIndex === -1) foundIndex = i;
              if (i - foundIndex + 1 === valLength) return foundIndex * indexSize;
            } else {
              if (foundIndex !== -1) i -= i - foundIndex;
              foundIndex = -1;
            }
          }
        } else {
          if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
          for (i = byteOffset; i >= 0; i--) {
            let found = true;
            for (let j = 0; j < valLength; j++) {
              if (read(arr, i + j) !== read(val, j)) {
                found = false;
                break;
              }
            }
            if (found) return i;
          }
        }
        return -1;
      }
      Buffer3.prototype.includes = function includes(val, byteOffset, encoding) {
        return this.indexOf(val, byteOffset, encoding) !== -1;
      };
      Buffer3.prototype.indexOf = function indexOf(val, byteOffset, encoding) {
        return bidirectionalIndexOf(this, val, byteOffset, encoding, true);
      };
      Buffer3.prototype.lastIndexOf = function lastIndexOf(val, byteOffset, encoding) {
        return bidirectionalIndexOf(this, val, byteOffset, encoding, false);
      };
      function hexWrite(buf, string, offset, length) {
        offset = Number(offset) || 0;
        const remaining = buf.length - offset;
        if (!length) {
          length = remaining;
        } else {
          length = Number(length);
          if (length > remaining) {
            length = remaining;
          }
        }
        const strLen = string.length;
        if (length > strLen / 2) {
          length = strLen / 2;
        }
        let i;
        for (i = 0; i < length; ++i) {
          const parsed = parseInt(string.substr(i * 2, 2), 16);
          if (numberIsNaN(parsed)) return i;
          buf[offset + i] = parsed;
        }
        return i;
      }
      function utf8Write(buf, string, offset, length) {
        return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length);
      }
      function asciiWrite(buf, string, offset, length) {
        return blitBuffer(asciiToBytes(string), buf, offset, length);
      }
      function base64Write(buf, string, offset, length) {
        return blitBuffer(base64ToBytes(string), buf, offset, length);
      }
      function ucs2Write(buf, string, offset, length) {
        return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length);
      }
      Buffer3.prototype.write = function write(string, offset, length, encoding) {
        if (offset === void 0) {
          encoding = "utf8";
          length = this.length;
          offset = 0;
        } else if (length === void 0 && typeof offset === "string") {
          encoding = offset;
          length = this.length;
          offset = 0;
        } else if (isFinite(offset)) {
          offset = offset >>> 0;
          if (isFinite(length)) {
            length = length >>> 0;
            if (encoding === void 0) encoding = "utf8";
          } else {
            encoding = length;
            length = void 0;
          }
        } else {
          throw new Error(
            "Buffer.write(string, encoding, offset[, length]) is no longer supported"
          );
        }
        const remaining = this.length - offset;
        if (length === void 0 || length > remaining) length = remaining;
        if (string.length > 0 && (length < 0 || offset < 0) || offset > this.length) {
          throw new RangeError("Attempt to write outside buffer bounds");
        }
        if (!encoding) encoding = "utf8";
        let loweredCase = false;
        for (; ; ) {
          switch (encoding) {
            case "hex":
              return hexWrite(this, string, offset, length);
            case "utf8":
            case "utf-8":
              return utf8Write(this, string, offset, length);
            case "ascii":
            case "latin1":
            case "binary":
              return asciiWrite(this, string, offset, length);
            case "base64":
              return base64Write(this, string, offset, length);
            case "ucs2":
            case "ucs-2":
            case "utf16le":
            case "utf-16le":
              return ucs2Write(this, string, offset, length);
            default:
              if (loweredCase) throw new TypeError("Unknown encoding: " + encoding);
              encoding = ("" + encoding).toLowerCase();
              loweredCase = true;
          }
        }
      };
      Buffer3.prototype.toJSON = function toJSON() {
        return {
          type: "Buffer",
          data: Array.prototype.slice.call(this._arr || this, 0)
        };
      };
      function base64Slice(buf, start, end) {
        if (start === 0 && end === buf.length) {
          return base64.fromByteArray(buf);
        } else {
          return base64.fromByteArray(buf.slice(start, end));
        }
      }
      function utf8Slice(buf, start, end) {
        end = Math.min(buf.length, end);
        const res = [];
        let i = start;
        while (i < end) {
          const firstByte = buf[i];
          let codePoint = null;
          let bytesPerSequence = firstByte > 239 ? 4 : firstByte > 223 ? 3 : firstByte > 191 ? 2 : 1;
          if (i + bytesPerSequence <= end) {
            let secondByte, thirdByte, fourthByte, tempCodePoint;
            switch (bytesPerSequence) {
              case 1:
                if (firstByte < 128) {
                  codePoint = firstByte;
                }
                break;
              case 2:
                secondByte = buf[i + 1];
                if ((secondByte & 192) === 128) {
                  tempCodePoint = (firstByte & 31) << 6 | secondByte & 63;
                  if (tempCodePoint > 127) {
                    codePoint = tempCodePoint;
                  }
                }
                break;
              case 3:
                secondByte = buf[i + 1];
                thirdByte = buf[i + 2];
                if ((secondByte & 192) === 128 && (thirdByte & 192) === 128) {
                  tempCodePoint = (firstByte & 15) << 12 | (secondByte & 63) << 6 | thirdByte & 63;
                  if (tempCodePoint > 2047 && (tempCodePoint < 55296 || tempCodePoint > 57343)) {
                    codePoint = tempCodePoint;
                  }
                }
                break;
              case 4:
                secondByte = buf[i + 1];
                thirdByte = buf[i + 2];
                fourthByte = buf[i + 3];
                if ((secondByte & 192) === 128 && (thirdByte & 192) === 128 && (fourthByte & 192) === 128) {
                  tempCodePoint = (firstByte & 15) << 18 | (secondByte & 63) << 12 | (thirdByte & 63) << 6 | fourthByte & 63;
                  if (tempCodePoint > 65535 && tempCodePoint < 1114112) {
                    codePoint = tempCodePoint;
                  }
                }
            }
          }
          if (codePoint === null) {
            codePoint = 65533;
            bytesPerSequence = 1;
          } else if (codePoint > 65535) {
            codePoint -= 65536;
            res.push(codePoint >>> 10 & 1023 | 55296);
            codePoint = 56320 | codePoint & 1023;
          }
          res.push(codePoint);
          i += bytesPerSequence;
        }
        return decodeCodePointsArray(res);
      }
      var MAX_ARGUMENTS_LENGTH = 4096;
      function decodeCodePointsArray(codePoints) {
        const len = codePoints.length;
        if (len <= MAX_ARGUMENTS_LENGTH) {
          return String.fromCharCode.apply(String, codePoints);
        }
        let res = "";
        let i = 0;
        while (i < len) {
          res += String.fromCharCode.apply(
            String,
            codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
          );
        }
        return res;
      }
      function asciiSlice(buf, start, end) {
        let ret = "";
        end = Math.min(buf.length, end);
        for (let i = start; i < end; ++i) {
          ret += String.fromCharCode(buf[i] & 127);
        }
        return ret;
      }
      function latin1Slice(buf, start, end) {
        let ret = "";
        end = Math.min(buf.length, end);
        for (let i = start; i < end; ++i) {
          ret += String.fromCharCode(buf[i]);
        }
        return ret;
      }
      function hexSlice(buf, start, end) {
        const len = buf.length;
        if (!start || start < 0) start = 0;
        if (!end || end < 0 || end > len) end = len;
        let out = "";
        for (let i = start; i < end; ++i) {
          out += hexSliceLookupTable[buf[i]];
        }
        return out;
      }
      function utf16leSlice(buf, start, end) {
        const bytes = buf.slice(start, end);
        let res = "";
        for (let i = 0; i < bytes.length - 1; i += 2) {
          res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
        }
        return res;
      }
      Buffer3.prototype.slice = function slice(start, end) {
        const len = this.length;
        start = ~~start;
        end = end === void 0 ? len : ~~end;
        if (start < 0) {
          start += len;
          if (start < 0) start = 0;
        } else if (start > len) {
          start = len;
        }
        if (end < 0) {
          end += len;
          if (end < 0) end = 0;
        } else if (end > len) {
          end = len;
        }
        if (end < start) end = start;
        const newBuf = this.subarray(start, end);
        Object.setPrototypeOf(newBuf, Buffer3.prototype);
        return newBuf;
      };
      function checkOffset(offset, ext, length) {
        if (offset % 1 !== 0 || offset < 0) throw new RangeError("offset is not uint");
        if (offset + ext > length) throw new RangeError("Trying to access beyond buffer length");
      }
      Buffer3.prototype.readUintLE = Buffer3.prototype.readUIntLE = function readUIntLE(offset, byteLength2, noAssert) {
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) checkOffset(offset, byteLength2, this.length);
        let val = this[offset];
        let mul = 1;
        let i = 0;
        while (++i < byteLength2 && (mul *= 256)) {
          val += this[offset + i] * mul;
        }
        return val;
      };
      Buffer3.prototype.readUintBE = Buffer3.prototype.readUIntBE = function readUIntBE(offset, byteLength2, noAssert) {
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) {
          checkOffset(offset, byteLength2, this.length);
        }
        let val = this[offset + --byteLength2];
        let mul = 1;
        while (byteLength2 > 0 && (mul *= 256)) {
          val += this[offset + --byteLength2] * mul;
        }
        return val;
      };
      Buffer3.prototype.readUint8 = Buffer3.prototype.readUInt8 = function readUInt8(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 1, this.length);
        return this[offset];
      };
      Buffer3.prototype.readUint16LE = Buffer3.prototype.readUInt16LE = function readUInt16LE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 2, this.length);
        return this[offset] | this[offset + 1] << 8;
      };
      Buffer3.prototype.readUint16BE = Buffer3.prototype.readUInt16BE = function readUInt16BE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 2, this.length);
        return this[offset] << 8 | this[offset + 1];
      };
      Buffer3.prototype.readUint32LE = Buffer3.prototype.readUInt32LE = function readUInt32LE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return (this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16) + this[offset + 3] * 16777216;
      };
      Buffer3.prototype.readUint32BE = Buffer3.prototype.readUInt32BE = function readUInt32BE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return this[offset] * 16777216 + (this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3]);
      };
      Buffer3.prototype.readBigUInt64LE = defineBigIntMethod(function readBigUInt64LE(offset) {
        offset = offset >>> 0;
        validateNumber(offset, "offset");
        const first = this[offset];
        const last = this[offset + 7];
        if (first === void 0 || last === void 0) {
          boundsError(offset, this.length - 8);
        }
        const lo = first + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 24;
        const hi = this[++offset] + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + last * 2 ** 24;
        return BigInt(lo) + (BigInt(hi) << BigInt(32));
      });
      Buffer3.prototype.readBigUInt64BE = defineBigIntMethod(function readBigUInt64BE(offset) {
        offset = offset >>> 0;
        validateNumber(offset, "offset");
        const first = this[offset];
        const last = this[offset + 7];
        if (first === void 0 || last === void 0) {
          boundsError(offset, this.length - 8);
        }
        const hi = first * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + this[++offset];
        const lo = this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last;
        return (BigInt(hi) << BigInt(32)) + BigInt(lo);
      });
      Buffer3.prototype.readIntLE = function readIntLE(offset, byteLength2, noAssert) {
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) checkOffset(offset, byteLength2, this.length);
        let val = this[offset];
        let mul = 1;
        let i = 0;
        while (++i < byteLength2 && (mul *= 256)) {
          val += this[offset + i] * mul;
        }
        mul *= 128;
        if (val >= mul) val -= Math.pow(2, 8 * byteLength2);
        return val;
      };
      Buffer3.prototype.readIntBE = function readIntBE(offset, byteLength2, noAssert) {
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) checkOffset(offset, byteLength2, this.length);
        let i = byteLength2;
        let mul = 1;
        let val = this[offset + --i];
        while (i > 0 && (mul *= 256)) {
          val += this[offset + --i] * mul;
        }
        mul *= 128;
        if (val >= mul) val -= Math.pow(2, 8 * byteLength2);
        return val;
      };
      Buffer3.prototype.readInt8 = function readInt8(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 1, this.length);
        if (!(this[offset] & 128)) return this[offset];
        return (255 - this[offset] + 1) * -1;
      };
      Buffer3.prototype.readInt16LE = function readInt16LE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 2, this.length);
        const val = this[offset] | this[offset + 1] << 8;
        return val & 32768 ? val | 4294901760 : val;
      };
      Buffer3.prototype.readInt16BE = function readInt16BE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 2, this.length);
        const val = this[offset + 1] | this[offset] << 8;
        return val & 32768 ? val | 4294901760 : val;
      };
      Buffer3.prototype.readInt32LE = function readInt32LE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16 | this[offset + 3] << 24;
      };
      Buffer3.prototype.readInt32BE = function readInt32BE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return this[offset] << 24 | this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3];
      };
      Buffer3.prototype.readBigInt64LE = defineBigIntMethod(function readBigInt64LE(offset) {
        offset = offset >>> 0;
        validateNumber(offset, "offset");
        const first = this[offset];
        const last = this[offset + 7];
        if (first === void 0 || last === void 0) {
          boundsError(offset, this.length - 8);
        }
        const val = this[offset + 4] + this[offset + 5] * 2 ** 8 + this[offset + 6] * 2 ** 16 + (last << 24);
        return (BigInt(val) << BigInt(32)) + BigInt(first + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 24);
      });
      Buffer3.prototype.readBigInt64BE = defineBigIntMethod(function readBigInt64BE(offset) {
        offset = offset >>> 0;
        validateNumber(offset, "offset");
        const first = this[offset];
        const last = this[offset + 7];
        if (first === void 0 || last === void 0) {
          boundsError(offset, this.length - 8);
        }
        const val = (first << 24) + // Overflow
        this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + this[++offset];
        return (BigInt(val) << BigInt(32)) + BigInt(this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last);
      });
      Buffer3.prototype.readFloatLE = function readFloatLE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return ieee754.read(this, offset, true, 23, 4);
      };
      Buffer3.prototype.readFloatBE = function readFloatBE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return ieee754.read(this, offset, false, 23, 4);
      };
      Buffer3.prototype.readDoubleLE = function readDoubleLE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 8, this.length);
        return ieee754.read(this, offset, true, 52, 8);
      };
      Buffer3.prototype.readDoubleBE = function readDoubleBE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 8, this.length);
        return ieee754.read(this, offset, false, 52, 8);
      };
      function checkInt(buf, value, offset, ext, max, min) {
        if (!Buffer3.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance');
        if (value > max || value < min) throw new RangeError('"value" argument is out of bounds');
        if (offset + ext > buf.length) throw new RangeError("Index out of range");
      }
      Buffer3.prototype.writeUintLE = Buffer3.prototype.writeUIntLE = function writeUIntLE(value, offset, byteLength2, noAssert) {
        value = +value;
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) {
          const maxBytes = Math.pow(2, 8 * byteLength2) - 1;
          checkInt(this, value, offset, byteLength2, maxBytes, 0);
        }
        let mul = 1;
        let i = 0;
        this[offset] = value & 255;
        while (++i < byteLength2 && (mul *= 256)) {
          this[offset + i] = value / mul & 255;
        }
        return offset + byteLength2;
      };
      Buffer3.prototype.writeUintBE = Buffer3.prototype.writeUIntBE = function writeUIntBE(value, offset, byteLength2, noAssert) {
        value = +value;
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) {
          const maxBytes = Math.pow(2, 8 * byteLength2) - 1;
          checkInt(this, value, offset, byteLength2, maxBytes, 0);
        }
        let i = byteLength2 - 1;
        let mul = 1;
        this[offset + i] = value & 255;
        while (--i >= 0 && (mul *= 256)) {
          this[offset + i] = value / mul & 255;
        }
        return offset + byteLength2;
      };
      Buffer3.prototype.writeUint8 = Buffer3.prototype.writeUInt8 = function writeUInt8(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 1, 255, 0);
        this[offset] = value & 255;
        return offset + 1;
      };
      Buffer3.prototype.writeUint16LE = Buffer3.prototype.writeUInt16LE = function writeUInt16LE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 2, 65535, 0);
        this[offset] = value & 255;
        this[offset + 1] = value >>> 8;
        return offset + 2;
      };
      Buffer3.prototype.writeUint16BE = Buffer3.prototype.writeUInt16BE = function writeUInt16BE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 2, 65535, 0);
        this[offset] = value >>> 8;
        this[offset + 1] = value & 255;
        return offset + 2;
      };
      Buffer3.prototype.writeUint32LE = Buffer3.prototype.writeUInt32LE = function writeUInt32LE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 4, 4294967295, 0);
        this[offset + 3] = value >>> 24;
        this[offset + 2] = value >>> 16;
        this[offset + 1] = value >>> 8;
        this[offset] = value & 255;
        return offset + 4;
      };
      Buffer3.prototype.writeUint32BE = Buffer3.prototype.writeUInt32BE = function writeUInt32BE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 4, 4294967295, 0);
        this[offset] = value >>> 24;
        this[offset + 1] = value >>> 16;
        this[offset + 2] = value >>> 8;
        this[offset + 3] = value & 255;
        return offset + 4;
      };
      function wrtBigUInt64LE(buf, value, offset, min, max) {
        checkIntBI(value, min, max, buf, offset, 7);
        let lo = Number(value & BigInt(4294967295));
        buf[offset++] = lo;
        lo = lo >> 8;
        buf[offset++] = lo;
        lo = lo >> 8;
        buf[offset++] = lo;
        lo = lo >> 8;
        buf[offset++] = lo;
        let hi = Number(value >> BigInt(32) & BigInt(4294967295));
        buf[offset++] = hi;
        hi = hi >> 8;
        buf[offset++] = hi;
        hi = hi >> 8;
        buf[offset++] = hi;
        hi = hi >> 8;
        buf[offset++] = hi;
        return offset;
      }
      function wrtBigUInt64BE(buf, value, offset, min, max) {
        checkIntBI(value, min, max, buf, offset, 7);
        let lo = Number(value & BigInt(4294967295));
        buf[offset + 7] = lo;
        lo = lo >> 8;
        buf[offset + 6] = lo;
        lo = lo >> 8;
        buf[offset + 5] = lo;
        lo = lo >> 8;
        buf[offset + 4] = lo;
        let hi = Number(value >> BigInt(32) & BigInt(4294967295));
        buf[offset + 3] = hi;
        hi = hi >> 8;
        buf[offset + 2] = hi;
        hi = hi >> 8;
        buf[offset + 1] = hi;
        hi = hi >> 8;
        buf[offset] = hi;
        return offset + 8;
      }
      Buffer3.prototype.writeBigUInt64LE = defineBigIntMethod(function writeBigUInt64LE(value, offset = 0) {
        return wrtBigUInt64LE(this, value, offset, BigInt(0), BigInt("0xffffffffffffffff"));
      });
      Buffer3.prototype.writeBigUInt64BE = defineBigIntMethod(function writeBigUInt64BE(value, offset = 0) {
        return wrtBigUInt64BE(this, value, offset, BigInt(0), BigInt("0xffffffffffffffff"));
      });
      Buffer3.prototype.writeIntLE = function writeIntLE(value, offset, byteLength2, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
          const limit = Math.pow(2, 8 * byteLength2 - 1);
          checkInt(this, value, offset, byteLength2, limit - 1, -limit);
        }
        let i = 0;
        let mul = 1;
        let sub = 0;
        this[offset] = value & 255;
        while (++i < byteLength2 && (mul *= 256)) {
          if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
            sub = 1;
          }
          this[offset + i] = (value / mul >> 0) - sub & 255;
        }
        return offset + byteLength2;
      };
      Buffer3.prototype.writeIntBE = function writeIntBE(value, offset, byteLength2, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
          const limit = Math.pow(2, 8 * byteLength2 - 1);
          checkInt(this, value, offset, byteLength2, limit - 1, -limit);
        }
        let i = byteLength2 - 1;
        let mul = 1;
        let sub = 0;
        this[offset + i] = value & 255;
        while (--i >= 0 && (mul *= 256)) {
          if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
            sub = 1;
          }
          this[offset + i] = (value / mul >> 0) - sub & 255;
        }
        return offset + byteLength2;
      };
      Buffer3.prototype.writeInt8 = function writeInt8(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 1, 127, -128);
        if (value < 0) value = 255 + value + 1;
        this[offset] = value & 255;
        return offset + 1;
      };
      Buffer3.prototype.writeInt16LE = function writeInt16LE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 2, 32767, -32768);
        this[offset] = value & 255;
        this[offset + 1] = value >>> 8;
        return offset + 2;
      };
      Buffer3.prototype.writeInt16BE = function writeInt16BE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 2, 32767, -32768);
        this[offset] = value >>> 8;
        this[offset + 1] = value & 255;
        return offset + 2;
      };
      Buffer3.prototype.writeInt32LE = function writeInt32LE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 4, 2147483647, -2147483648);
        this[offset] = value & 255;
        this[offset + 1] = value >>> 8;
        this[offset + 2] = value >>> 16;
        this[offset + 3] = value >>> 24;
        return offset + 4;
      };
      Buffer3.prototype.writeInt32BE = function writeInt32BE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 4, 2147483647, -2147483648);
        if (value < 0) value = 4294967295 + value + 1;
        this[offset] = value >>> 24;
        this[offset + 1] = value >>> 16;
        this[offset + 2] = value >>> 8;
        this[offset + 3] = value & 255;
        return offset + 4;
      };
      Buffer3.prototype.writeBigInt64LE = defineBigIntMethod(function writeBigInt64LE(value, offset = 0) {
        return wrtBigUInt64LE(this, value, offset, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
      });
      Buffer3.prototype.writeBigInt64BE = defineBigIntMethod(function writeBigInt64BE(value, offset = 0) {
        return wrtBigUInt64BE(this, value, offset, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
      });
      function checkIEEE754(buf, value, offset, ext, max, min) {
        if (offset + ext > buf.length) throw new RangeError("Index out of range");
        if (offset < 0) throw new RangeError("Index out of range");
      }
      function writeFloat(buf, value, offset, littleEndian, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
          checkIEEE754(buf, value, offset, 4, 34028234663852886e22, -34028234663852886e22);
        }
        ieee754.write(buf, value, offset, littleEndian, 23, 4);
        return offset + 4;
      }
      Buffer3.prototype.writeFloatLE = function writeFloatLE(value, offset, noAssert) {
        return writeFloat(this, value, offset, true, noAssert);
      };
      Buffer3.prototype.writeFloatBE = function writeFloatBE(value, offset, noAssert) {
        return writeFloat(this, value, offset, false, noAssert);
      };
      function writeDouble(buf, value, offset, littleEndian, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
          checkIEEE754(buf, value, offset, 8, 17976931348623157e292, -17976931348623157e292);
        }
        ieee754.write(buf, value, offset, littleEndian, 52, 8);
        return offset + 8;
      }
      Buffer3.prototype.writeDoubleLE = function writeDoubleLE(value, offset, noAssert) {
        return writeDouble(this, value, offset, true, noAssert);
      };
      Buffer3.prototype.writeDoubleBE = function writeDoubleBE(value, offset, noAssert) {
        return writeDouble(this, value, offset, false, noAssert);
      };
      Buffer3.prototype.copy = function copy(target, targetStart, start, end) {
        if (!Buffer3.isBuffer(target)) throw new TypeError("argument should be a Buffer");
        if (!start) start = 0;
        if (!end && end !== 0) end = this.length;
        if (targetStart >= target.length) targetStart = target.length;
        if (!targetStart) targetStart = 0;
        if (end > 0 && end < start) end = start;
        if (end === start) return 0;
        if (target.length === 0 || this.length === 0) return 0;
        if (targetStart < 0) {
          throw new RangeError("targetStart out of bounds");
        }
        if (start < 0 || start >= this.length) throw new RangeError("Index out of range");
        if (end < 0) throw new RangeError("sourceEnd out of bounds");
        if (end > this.length) end = this.length;
        if (target.length - targetStart < end - start) {
          end = target.length - targetStart + start;
        }
        const len = end - start;
        if (this === target && typeof Uint8Array.prototype.copyWithin === "function") {
          this.copyWithin(targetStart, start, end);
        } else {
          Uint8Array.prototype.set.call(
            target,
            this.subarray(start, end),
            targetStart
          );
        }
        return len;
      };
      Buffer3.prototype.fill = function fill(val, start, end, encoding) {
        if (typeof val === "string") {
          if (typeof start === "string") {
            encoding = start;
            start = 0;
            end = this.length;
          } else if (typeof end === "string") {
            encoding = end;
            end = this.length;
          }
          if (encoding !== void 0 && typeof encoding !== "string") {
            throw new TypeError("encoding must be a string");
          }
          if (typeof encoding === "string" && !Buffer3.isEncoding(encoding)) {
            throw new TypeError("Unknown encoding: " + encoding);
          }
          if (val.length === 1) {
            const code = val.charCodeAt(0);
            if (encoding === "utf8" && code < 128 || encoding === "latin1") {
              val = code;
            }
          }
        } else if (typeof val === "number") {
          val = val & 255;
        } else if (typeof val === "boolean") {
          val = Number(val);
        }
        if (start < 0 || this.length < start || this.length < end) {
          throw new RangeError("Out of range index");
        }
        if (end <= start) {
          return this;
        }
        start = start >>> 0;
        end = end === void 0 ? this.length : end >>> 0;
        if (!val) val = 0;
        let i;
        if (typeof val === "number") {
          for (i = start; i < end; ++i) {
            this[i] = val;
          }
        } else {
          const bytes = Buffer3.isBuffer(val) ? val : Buffer3.from(val, encoding);
          const len = bytes.length;
          if (len === 0) {
            throw new TypeError('The value "' + val + '" is invalid for argument "value"');
          }
          for (i = 0; i < end - start; ++i) {
            this[i + start] = bytes[i % len];
          }
        }
        return this;
      };
      var errors = {};
      function E(sym, getMessage, Base) {
        errors[sym] = class NodeError extends Base {
          constructor() {
            super();
            Object.defineProperty(this, "message", {
              value: getMessage.apply(this, arguments),
              writable: true,
              configurable: true
            });
            this.name = `${this.name} [${sym}]`;
            this.stack;
            delete this.name;
          }
          get code() {
            return sym;
          }
          set code(value) {
            Object.defineProperty(this, "code", {
              configurable: true,
              enumerable: true,
              value,
              writable: true
            });
          }
          toString() {
            return `${this.name} [${sym}]: ${this.message}`;
          }
        };
      }
      E(
        "ERR_BUFFER_OUT_OF_BOUNDS",
        function(name) {
          if (name) {
            return `${name} is outside of buffer bounds`;
          }
          return "Attempt to access memory outside buffer bounds";
        },
        RangeError
      );
      E(
        "ERR_INVALID_ARG_TYPE",
        function(name, actual) {
          return `The "${name}" argument must be of type number. Received type ${typeof actual}`;
        },
        TypeError
      );
      E(
        "ERR_OUT_OF_RANGE",
        function(str, range, input) {
          let msg = `The value of "${str}" is out of range.`;
          let received = input;
          if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
            received = addNumericalSeparator(String(input));
          } else if (typeof input === "bigint") {
            received = String(input);
            if (input > BigInt(2) ** BigInt(32) || input < -(BigInt(2) ** BigInt(32))) {
              received = addNumericalSeparator(received);
            }
            received += "n";
          }
          msg += ` It must be ${range}. Received ${received}`;
          return msg;
        },
        RangeError
      );
      function addNumericalSeparator(val) {
        let res = "";
        let i = val.length;
        const start = val[0] === "-" ? 1 : 0;
        for (; i >= start + 4; i -= 3) {
          res = `_${val.slice(i - 3, i)}${res}`;
        }
        return `${val.slice(0, i)}${res}`;
      }
      function checkBounds(buf, offset, byteLength2) {
        validateNumber(offset, "offset");
        if (buf[offset] === void 0 || buf[offset + byteLength2] === void 0) {
          boundsError(offset, buf.length - (byteLength2 + 1));
        }
      }
      function checkIntBI(value, min, max, buf, offset, byteLength2) {
        if (value > max || value < min) {
          const n = typeof min === "bigint" ? "n" : "";
          let range;
          if (byteLength2 > 3) {
            if (min === 0 || min === BigInt(0)) {
              range = `>= 0${n} and < 2${n} ** ${(byteLength2 + 1) * 8}${n}`;
            } else {
              range = `>= -(2${n} ** ${(byteLength2 + 1) * 8 - 1}${n}) and < 2 ** ${(byteLength2 + 1) * 8 - 1}${n}`;
            }
          } else {
            range = `>= ${min}${n} and <= ${max}${n}`;
          }
          throw new errors.ERR_OUT_OF_RANGE("value", range, value);
        }
        checkBounds(buf, offset, byteLength2);
      }
      function validateNumber(value, name) {
        if (typeof value !== "number") {
          throw new errors.ERR_INVALID_ARG_TYPE(name, "number", value);
        }
      }
      function boundsError(value, length, type) {
        if (Math.floor(value) !== value) {
          validateNumber(value, type);
          throw new errors.ERR_OUT_OF_RANGE(type || "offset", "an integer", value);
        }
        if (length < 0) {
          throw new errors.ERR_BUFFER_OUT_OF_BOUNDS();
        }
        throw new errors.ERR_OUT_OF_RANGE(
          type || "offset",
          `>= ${type ? 1 : 0} and <= ${length}`,
          value
        );
      }
      var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;
      function base64clean(str) {
        str = str.split("=")[0];
        str = str.trim().replace(INVALID_BASE64_RE, "");
        if (str.length < 2) return "";
        while (str.length % 4 !== 0) {
          str = str + "=";
        }
        return str;
      }
      function utf8ToBytes(string, units) {
        units = units || Infinity;
        let codePoint;
        const length = string.length;
        let leadSurrogate = null;
        const bytes = [];
        for (let i = 0; i < length; ++i) {
          codePoint = string.charCodeAt(i);
          if (codePoint > 55295 && codePoint < 57344) {
            if (!leadSurrogate) {
              if (codePoint > 56319) {
                if ((units -= 3) > -1) bytes.push(239, 191, 189);
                continue;
              } else if (i + 1 === length) {
                if ((units -= 3) > -1) bytes.push(239, 191, 189);
                continue;
              }
              leadSurrogate = codePoint;
              continue;
            }
            if (codePoint < 56320) {
              if ((units -= 3) > -1) bytes.push(239, 191, 189);
              leadSurrogate = codePoint;
              continue;
            }
            codePoint = (leadSurrogate - 55296 << 10 | codePoint - 56320) + 65536;
          } else if (leadSurrogate) {
            if ((units -= 3) > -1) bytes.push(239, 191, 189);
          }
          leadSurrogate = null;
          if (codePoint < 128) {
            if ((units -= 1) < 0) break;
            bytes.push(codePoint);
          } else if (codePoint < 2048) {
            if ((units -= 2) < 0) break;
            bytes.push(
              codePoint >> 6 | 192,
              codePoint & 63 | 128
            );
          } else if (codePoint < 65536) {
            if ((units -= 3) < 0) break;
            bytes.push(
              codePoint >> 12 | 224,
              codePoint >> 6 & 63 | 128,
              codePoint & 63 | 128
            );
          } else if (codePoint < 1114112) {
            if ((units -= 4) < 0) break;
            bytes.push(
              codePoint >> 18 | 240,
              codePoint >> 12 & 63 | 128,
              codePoint >> 6 & 63 | 128,
              codePoint & 63 | 128
            );
          } else {
            throw new Error("Invalid code point");
          }
        }
        return bytes;
      }
      function asciiToBytes(str) {
        const byteArray = [];
        for (let i = 0; i < str.length; ++i) {
          byteArray.push(str.charCodeAt(i) & 255);
        }
        return byteArray;
      }
      function utf16leToBytes(str, units) {
        let c, hi, lo;
        const byteArray = [];
        for (let i = 0; i < str.length; ++i) {
          if ((units -= 2) < 0) break;
          c = str.charCodeAt(i);
          hi = c >> 8;
          lo = c % 256;
          byteArray.push(lo);
          byteArray.push(hi);
        }
        return byteArray;
      }
      function base64ToBytes(str) {
        return base64.toByteArray(base64clean(str));
      }
      function blitBuffer(src, dst, offset, length) {
        let i;
        for (i = 0; i < length; ++i) {
          if (i + offset >= dst.length || i >= src.length) break;
          dst[i + offset] = src[i];
        }
        return i;
      }
      function isInstance(obj, type) {
        return obj instanceof type || obj != null && obj.constructor != null && obj.constructor.name != null && obj.constructor.name === type.name;
      }
      function numberIsNaN(obj) {
        return obj !== obj;
      }
      var hexSliceLookupTable = (function() {
        const alphabet = "0123456789abcdef";
        const table = new Array(256);
        for (let i = 0; i < 16; ++i) {
          const i16 = i * 16;
          for (let j = 0; j < 16; ++j) {
            table[i16 + j] = alphabet[i] + alphabet[j];
          }
        }
        return table;
      })();
      function defineBigIntMethod(fn) {
        return typeof BigInt === "undefined" ? BufferBigIntNotDefined : fn;
      }
      function BufferBigIntNotDefined() {
        throw new Error("BigInt not supported");
      }
    }
  });

  // shims/globais.js
  var import_buffer, process;
  var init_globais = __esm({
    "shims/globais.js"() {
      import_buffer = __toESM(require_buffer());
      process = { env: {}, on() {
      }, exit() {
      }, versions: {}, platform: "browser", cwd: () => "/", nextTick: (fn, ...a) => Promise.resolve().then(() => fn(...a)) };
      globalThis.DemoBuffer = import_buffer.Buffer;
    }
  });

  // shims/express.js
  var require_express = __commonJS({
    "shims/express.js"(exports, module) {
      init_globais();
      function escapar(t) {
        return t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }
      function compilar(caminho, prefixo) {
        const chaves = [];
        const partes = caminho.replace(/\/+$/, "").split("/").map((seg) => {
          if (seg.startsWith(":")) {
            chaves.push(seg.slice(1));
            return "([^/]+)";
          }
          return escapar(seg);
        });
        const corpo = partes.join("/") || "";
        const re = new RegExp(`^${corpo}${prefixo ? "(?:/|$)" : "/?$"}`, "i");
        return (p) => {
          const m = re.exec(p);
          if (!m) return null;
          const params = {};
          chaves.forEach((k, i) => {
            params[k] = decodeURIComponent(m[i + 1]);
          });
          return params;
        };
      }
      function criarApp() {
        const camadas = [];
        const app = {};
        const registrar = (metodo) => (caminho, ...handlers) => {
          if (typeof caminho === "function") {
            handlers.unshift(caminho);
            caminho = "/";
          }
          const lista = Array.isArray(caminho) ? caminho : [caminho];
          const testes = lista.map((c) => compilar(c, metodo === null));
          camadas.push({ metodo, casar: (p) => {
            for (const t of testes) {
              const r = t(p);
              if (r) return r;
            }
            return null;
          }, handlers: handlers.flat() });
          return app;
        };
        for (const m of ["get", "post", "put", "delete", "patch"]) app[m] = registrar(m.toUpperCase());
        app.use = registrar(null);
        app.disable = () => app;
        app.enable = () => app;
        app.set = () => app;
        app.listen = () => ({ close() {
        } });
        app.handle = (req, res) => new Promise((resolve) => {
          res._fim = resolve;
          let i = 0, j = 0, params = {};
          const proxima = (err) => {
            if (res.headersSent) return;
            while (i < camadas.length) {
              const c = camadas[i];
              if (j === 0) {
                if (c.metodo && c.metodo !== req.method && !(c.metodo === "GET" && req.method === "HEAD")) {
                  i++;
                  continue;
                }
                const casou = c.casar(req.path);
                if (!casou) {
                  i++;
                  continue;
                }
                params = casou;
              }
              if (j >= c.handlers.length) {
                i++;
                j = 0;
                continue;
              }
              const h = c.handlers[j++];
              const ehErro = h.length === 4;
              if (err ? !ehErro : ehErro) continue;
              req.params = params;
              try {
                const r = err ? h(err, req, res, proxima) : h(req, res, proxima);
                if (r && typeof r.then === "function") r.catch((e) => proxima(e || new Error("Erro")));
              } catch (e) {
                proxima(e);
              }
              return;
            }
            if (err) {
              console.error(err);
              res.status(err.status || 500).json({ error: err.message || "Erro interno do servidor." });
            } else res.status(404).json({ error: "Rota n\xE3o encontrada." });
          };
          proxima();
        });
        return app;
      }
      function criarRes() {
        const res = {
          statusCode: 200,
          headers: {},
          corpo: null,
          headersSent: false,
          locals: {},
          status(c) {
            this.statusCode = c;
            return this;
          },
          setHeader(k, v) {
            this.headers[String(k).toLowerCase()] = String(v);
            return this;
          },
          getHeader(k) {
            return this.headers[String(k).toLowerCase()];
          },
          set(k, v) {
            if (typeof k === "object") Object.entries(k).forEach(([a, b]) => this.setHeader(a, b));
            else this.setHeader(k, v);
            return this;
          },
          header(k, v) {
            return this.set(k, v);
          },
          type(t) {
            this.setHeader("content-type", t.includes("/") ? t : { json: "application/json", html: "text/html", csv: "text/csv", text: "text/plain" }[t] || t);
            return this;
          },
          json(o) {
            if (!this.getHeader("content-type")) this.setHeader("content-type", "application/json; charset=utf-8");
            return this._terminar(JSON.stringify(o));
          },
          send(b) {
            if (b !== null && typeof b === "object" && !(b instanceof Uint8Array)) return this.json(b);
            if (typeof b === "string" && !this.getHeader("content-type")) this.setHeader("content-type", "text/html; charset=utf-8");
            return this._terminar(b);
          },
          sendStatus(c) {
            this.statusCode = c;
            return this._terminar(String(c));
          },
          end(b) {
            return this._terminar(b ?? null);
          },
          sendFile() {
            this.statusCode = 404;
            return this._terminar("");
          },
          _terminar(b) {
            if (this.headersSent) return this;
            this.corpo = b;
            this.headersSent = true;
            if (this._fim) this._fim();
            return this;
          }
        };
        return res;
      }
      function json() {
        return (req, res, next) => next();
      }
      function raw(opcoes = {}) {
        const tipos = [].concat(opcoes.type || []);
        return (req, res, next) => {
          const tipo = String(req.headers["content-type"] || "").split(";")[0].trim();
          if (!req._bruto || !tipos.includes(tipo)) return next();
          if (opcoes.limit && req._bruto.length > opcoes.limit) {
            const e = new Error("request entity too large");
            e.type = "entity.too.large";
            e.status = 413;
            return next(e);
          }
          req.body = req._bruto;
          next();
        };
      }
      function express() {
        return criarApp();
      }
      express.json = json;
      express.raw = raw;
      express.static = () => (req, res, next) => next();
      express.criarRes = criarRes;
      module.exports = express;
    }
  });

  // shims/sqlite3.js
  var require_sqlite3 = __commonJS({
    "shims/sqlite3.js"(exports, module) {
      init_globais();
      function conv(params) {
        if (params === void 0 || params === null) return [];
        const lista = Array.isArray(params) ? params : [params];
        return lista.map((v) => {
          if (v === void 0) return null;
          if (typeof v === "boolean") return v ? 1 : 0;
          if (v instanceof Date) return v.getTime();
          if (typeof v === "bigint") return Number(v);
          if (v instanceof Uint8Array) return new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
          return v;
        });
      }
      function erro(e) {
        const msg = String(e && e.message || e);
        const codigo = /constraint failed/i.test(msg) ? "SQLITE_CONSTRAINT" : /no such|syntax/i.test(msg) ? "SQLITE_ERROR" : "SQLITE_ERROR";
        const err = new Error(`${codigo}: ${msg}`);
        err.code = codigo;
        err.errno = codigo === "SQLITE_CONSTRAINT" ? 19 : 1;
        return err;
      }
      var LEITURA = /^\s*(SELECT|PRAGMA\s+table_info|WITH)\b/i;
      var depois = (fn) => Promise.resolve().then(fn);
      var Database = class {
        constructor(_caminho, cb) {
          this.db = globalThis.__DEMO_SQL;
          if (typeof cb === "function") depois(() => cb(null));
        }
        configure() {
        }
        run(sql, params, cb) {
          if (typeof params === "function") {
            cb = params;
            params = [];
          }
          depois(() => {
            let ctx = {};
            try {
              const p = conv(params);
              if (p.length) this.db.run(sql, p);
              else this.db.run(sql);
              const id = this.db.exec("SELECT last_insert_rowid()")[0];
              ctx = { lastID: id ? Number(id.values[0][0]) : 0, changes: this.db.getRowsModified(), sql };
              if (!LEITURA.test(sql) && globalThis.__DEMO_ALTEROU) globalThis.__DEMO_ALTEROU();
            } catch (e) {
              if (cb) cb.call({}, erro(e));
              else console.error(e);
              return;
            }
            if (cb) cb.call(ctx, null);
          });
          return this;
        }
        _consulta(sql, params, um) {
          const st = this.db.prepare(sql);
          try {
            st.bind(conv(params));
            const linhas = [];
            while (st.step()) {
              linhas.push(st.getAsObject());
              if (um) break;
            }
            return um ? linhas[0] : linhas;
          } finally {
            st.free();
          }
        }
        get(sql, params, cb) {
          if (typeof params === "function") {
            cb = params;
            params = [];
          }
          depois(() => {
            let r;
            try {
              r = this._consulta(sql, params, true);
            } catch (e) {
              return cb(erro(e));
            }
            cb(null, r);
          });
          return this;
        }
        all(sql, params, cb) {
          if (typeof params === "function") {
            cb = params;
            params = [];
          }
          depois(() => {
            let r;
            try {
              r = this._consulta(sql, params, false);
            } catch (e) {
              return cb(erro(e));
            }
            cb(null, r);
          });
          return this;
        }
        exec(sql, cb) {
          depois(() => {
            try {
              this.db.exec(sql);
            } catch (e) {
              return cb && cb(erro(e));
            }
            cb && cb(null);
          });
          return this;
        }
        serialize(fn) {
          if (fn) fn();
          return this;
        }
        close(cb) {
          if (cb) depois(() => cb(null));
        }
      };
      module.exports = { verbose() {
        return module.exports;
      }, Database };
    }
  });

  // shims/vazios.js
  var require_vazios = __commonJS({
    "shims/vazios.js"(exports, module) {
      init_globais();
      var AsyncLocalStorage = class {
        getStore() {
          return void 0;
        }
        run(_s, fn, ...a) {
          return fn(...a);
        }
      };
      module.exports = {
        AsyncLocalStorage,
        Pool: class {
          query() {
            throw new Error("Postgres indispon\xEDvel no modo demonstra\xE7\xE3o.");
          }
        },
        types: { setTypeParser() {
        } },
        readdirSync: () => [],
        readFileSync: () => "",
        existsSync: () => false,
        join: (...p) => p.join("/").replace(/\/+/g, "/"),
        resolve: (...p) => p.join("/"),
        dirname: (p) => String(p).split("/").slice(0, -1).join("/"),
        basename: (p) => String(p).split("/").pop(),
        extname: (p) => {
          const m = /\.[^./]+$/.exec(p);
          return m ? m[0] : "";
        }
      };
    }
  });

  // node_modules/scrypt-js/scrypt.js
  var require_scrypt = __commonJS({
    "node_modules/scrypt-js/scrypt.js"(exports, module) {
      "use strict";
      init_globais();
      (function(root) {
        const MAX_VALUE = 2147483647;
        function SHA256(m) {
          const K = new Uint32Array([
            1116352408,
            1899447441,
            3049323471,
            3921009573,
            961987163,
            1508970993,
            2453635748,
            2870763221,
            3624381080,
            310598401,
            607225278,
            1426881987,
            1925078388,
            2162078206,
            2614888103,
            3248222580,
            3835390401,
            4022224774,
            264347078,
            604807628,
            770255983,
            1249150122,
            1555081692,
            1996064986,
            2554220882,
            2821834349,
            2952996808,
            3210313671,
            3336571891,
            3584528711,
            113926993,
            338241895,
            666307205,
            773529912,
            1294757372,
            1396182291,
            1695183700,
            1986661051,
            2177026350,
            2456956037,
            2730485921,
            2820302411,
            3259730800,
            3345764771,
            3516065817,
            3600352804,
            4094571909,
            275423344,
            430227734,
            506948616,
            659060556,
            883997877,
            958139571,
            1322822218,
            1537002063,
            1747873779,
            1955562222,
            2024104815,
            2227730452,
            2361852424,
            2428436474,
            2756734187,
            3204031479,
            3329325298
          ]);
          let h0 = 1779033703, h1 = 3144134277, h2 = 1013904242, h3 = 2773480762;
          let h4 = 1359893119, h5 = 2600822924, h6 = 528734635, h7 = 1541459225;
          const w = new Uint32Array(64);
          function blocks(p2) {
            let off = 0, len = p2.length;
            while (len >= 64) {
              let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7, u, i2, j, t1, t2;
              for (i2 = 0; i2 < 16; i2++) {
                j = off + i2 * 4;
                w[i2] = (p2[j] & 255) << 24 | (p2[j + 1] & 255) << 16 | (p2[j + 2] & 255) << 8 | p2[j + 3] & 255;
              }
              for (i2 = 16; i2 < 64; i2++) {
                u = w[i2 - 2];
                t1 = (u >>> 17 | u << 32 - 17) ^ (u >>> 19 | u << 32 - 19) ^ u >>> 10;
                u = w[i2 - 15];
                t2 = (u >>> 7 | u << 32 - 7) ^ (u >>> 18 | u << 32 - 18) ^ u >>> 3;
                w[i2] = (t1 + w[i2 - 7] | 0) + (t2 + w[i2 - 16] | 0) | 0;
              }
              for (i2 = 0; i2 < 64; i2++) {
                t1 = (((e >>> 6 | e << 32 - 6) ^ (e >>> 11 | e << 32 - 11) ^ (e >>> 25 | e << 32 - 25)) + (e & f ^ ~e & g) | 0) + (h + (K[i2] + w[i2] | 0) | 0) | 0;
                t2 = ((a >>> 2 | a << 32 - 2) ^ (a >>> 13 | a << 32 - 13) ^ (a >>> 22 | a << 32 - 22)) + (a & b ^ a & c ^ b & c) | 0;
                h = g;
                g = f;
                f = e;
                e = d + t1 | 0;
                d = c;
                c = b;
                b = a;
                a = t1 + t2 | 0;
              }
              h0 = h0 + a | 0;
              h1 = h1 + b | 0;
              h2 = h2 + c | 0;
              h3 = h3 + d | 0;
              h4 = h4 + e | 0;
              h5 = h5 + f | 0;
              h6 = h6 + g | 0;
              h7 = h7 + h | 0;
              off += 64;
              len -= 64;
            }
          }
          blocks(m);
          let i, bytesLeft = m.length % 64, bitLenHi = m.length / 536870912 | 0, bitLenLo = m.length << 3, numZeros = bytesLeft < 56 ? 56 : 120, p = m.slice(m.length - bytesLeft, m.length);
          p.push(128);
          for (i = bytesLeft + 1; i < numZeros; i++) {
            p.push(0);
          }
          p.push(bitLenHi >>> 24 & 255);
          p.push(bitLenHi >>> 16 & 255);
          p.push(bitLenHi >>> 8 & 255);
          p.push(bitLenHi >>> 0 & 255);
          p.push(bitLenLo >>> 24 & 255);
          p.push(bitLenLo >>> 16 & 255);
          p.push(bitLenLo >>> 8 & 255);
          p.push(bitLenLo >>> 0 & 255);
          blocks(p);
          return [
            h0 >>> 24 & 255,
            h0 >>> 16 & 255,
            h0 >>> 8 & 255,
            h0 >>> 0 & 255,
            h1 >>> 24 & 255,
            h1 >>> 16 & 255,
            h1 >>> 8 & 255,
            h1 >>> 0 & 255,
            h2 >>> 24 & 255,
            h2 >>> 16 & 255,
            h2 >>> 8 & 255,
            h2 >>> 0 & 255,
            h3 >>> 24 & 255,
            h3 >>> 16 & 255,
            h3 >>> 8 & 255,
            h3 >>> 0 & 255,
            h4 >>> 24 & 255,
            h4 >>> 16 & 255,
            h4 >>> 8 & 255,
            h4 >>> 0 & 255,
            h5 >>> 24 & 255,
            h5 >>> 16 & 255,
            h5 >>> 8 & 255,
            h5 >>> 0 & 255,
            h6 >>> 24 & 255,
            h6 >>> 16 & 255,
            h6 >>> 8 & 255,
            h6 >>> 0 & 255,
            h7 >>> 24 & 255,
            h7 >>> 16 & 255,
            h7 >>> 8 & 255,
            h7 >>> 0 & 255
          ];
        }
        function PBKDF2_HMAC_SHA256_OneIter(password, salt, dkLen) {
          password = password.length <= 64 ? password : SHA256(password);
          const innerLen = 64 + salt.length + 4;
          const inner = new Array(innerLen);
          const outerKey = new Array(64);
          let i;
          let dk = [];
          for (i = 0; i < 64; i++) {
            inner[i] = 54;
          }
          for (i = 0; i < password.length; i++) {
            inner[i] ^= password[i];
          }
          for (i = 0; i < salt.length; i++) {
            inner[64 + i] = salt[i];
          }
          for (i = innerLen - 4; i < innerLen; i++) {
            inner[i] = 0;
          }
          for (i = 0; i < 64; i++) outerKey[i] = 92;
          for (i = 0; i < password.length; i++) outerKey[i] ^= password[i];
          function incrementCounter() {
            for (let i2 = innerLen - 1; i2 >= innerLen - 4; i2--) {
              inner[i2]++;
              if (inner[i2] <= 255) return;
              inner[i2] = 0;
            }
          }
          while (dkLen >= 32) {
            incrementCounter();
            dk = dk.concat(SHA256(outerKey.concat(SHA256(inner))));
            dkLen -= 32;
          }
          if (dkLen > 0) {
            incrementCounter();
            dk = dk.concat(SHA256(outerKey.concat(SHA256(inner))).slice(0, dkLen));
          }
          return dk;
        }
        function blockmix_salsa8(BY, Yi, r, x, _X) {
          let i;
          arraycopy(BY, (2 * r - 1) * 16, _X, 0, 16);
          for (i = 0; i < 2 * r; i++) {
            blockxor(BY, i * 16, _X, 16);
            salsa20_8(_X, x);
            arraycopy(_X, 0, BY, Yi + i * 16, 16);
          }
          for (i = 0; i < r; i++) {
            arraycopy(BY, Yi + i * 2 * 16, BY, i * 16, 16);
          }
          for (i = 0; i < r; i++) {
            arraycopy(BY, Yi + (i * 2 + 1) * 16, BY, (i + r) * 16, 16);
          }
        }
        function R(a, b) {
          return a << b | a >>> 32 - b;
        }
        function salsa20_8(B, x) {
          arraycopy(B, 0, x, 0, 16);
          for (let i = 8; i > 0; i -= 2) {
            x[4] ^= R(x[0] + x[12], 7);
            x[8] ^= R(x[4] + x[0], 9);
            x[12] ^= R(x[8] + x[4], 13);
            x[0] ^= R(x[12] + x[8], 18);
            x[9] ^= R(x[5] + x[1], 7);
            x[13] ^= R(x[9] + x[5], 9);
            x[1] ^= R(x[13] + x[9], 13);
            x[5] ^= R(x[1] + x[13], 18);
            x[14] ^= R(x[10] + x[6], 7);
            x[2] ^= R(x[14] + x[10], 9);
            x[6] ^= R(x[2] + x[14], 13);
            x[10] ^= R(x[6] + x[2], 18);
            x[3] ^= R(x[15] + x[11], 7);
            x[7] ^= R(x[3] + x[15], 9);
            x[11] ^= R(x[7] + x[3], 13);
            x[15] ^= R(x[11] + x[7], 18);
            x[1] ^= R(x[0] + x[3], 7);
            x[2] ^= R(x[1] + x[0], 9);
            x[3] ^= R(x[2] + x[1], 13);
            x[0] ^= R(x[3] + x[2], 18);
            x[6] ^= R(x[5] + x[4], 7);
            x[7] ^= R(x[6] + x[5], 9);
            x[4] ^= R(x[7] + x[6], 13);
            x[5] ^= R(x[4] + x[7], 18);
            x[11] ^= R(x[10] + x[9], 7);
            x[8] ^= R(x[11] + x[10], 9);
            x[9] ^= R(x[8] + x[11], 13);
            x[10] ^= R(x[9] + x[8], 18);
            x[12] ^= R(x[15] + x[14], 7);
            x[13] ^= R(x[12] + x[15], 9);
            x[14] ^= R(x[13] + x[12], 13);
            x[15] ^= R(x[14] + x[13], 18);
          }
          for (let i = 0; i < 16; ++i) {
            B[i] += x[i];
          }
        }
        function blockxor(S, Si, D, len) {
          for (let i = 0; i < len; i++) {
            D[i] ^= S[Si + i];
          }
        }
        function arraycopy(src, srcPos, dest, destPos, length) {
          while (length--) {
            dest[destPos++] = src[srcPos++];
          }
        }
        function checkBufferish(o) {
          if (!o || typeof o.length !== "number") {
            return false;
          }
          for (let i = 0; i < o.length; i++) {
            const v = o[i];
            if (typeof v !== "number" || v % 1 || v < 0 || v >= 256) {
              return false;
            }
          }
          return true;
        }
        function ensureInteger(value, name) {
          if (typeof value !== "number" || value % 1) {
            throw new Error("invalid " + name);
          }
          return value;
        }
        function _scrypt(password, salt, N, r, p, dkLen, callback) {
          N = ensureInteger(N, "N");
          r = ensureInteger(r, "r");
          p = ensureInteger(p, "p");
          dkLen = ensureInteger(dkLen, "dkLen");
          if (N === 0 || (N & N - 1) !== 0) {
            throw new Error("N must be power of 2");
          }
          if (N > MAX_VALUE / 128 / r) {
            throw new Error("N too large");
          }
          if (r > MAX_VALUE / 128 / p) {
            throw new Error("r too large");
          }
          if (!checkBufferish(password)) {
            throw new Error("password must be an array or buffer");
          }
          password = Array.prototype.slice.call(password);
          if (!checkBufferish(salt)) {
            throw new Error("salt must be an array or buffer");
          }
          salt = Array.prototype.slice.call(salt);
          let b = PBKDF2_HMAC_SHA256_OneIter(password, salt, p * 128 * r);
          const B = new Uint32Array(p * 32 * r);
          for (let i = 0; i < B.length; i++) {
            const j = i * 4;
            B[i] = (b[j + 3] & 255) << 24 | (b[j + 2] & 255) << 16 | (b[j + 1] & 255) << 8 | (b[j + 0] & 255) << 0;
          }
          const XY = new Uint32Array(64 * r);
          const V = new Uint32Array(32 * r * N);
          const Yi = 32 * r;
          const x = new Uint32Array(16);
          const _X = new Uint32Array(16);
          const totalOps = p * N * 2;
          let currentOp = 0;
          let lastPercent10 = null;
          let stop = false;
          let state = 0;
          let i0 = 0, i1;
          let Bi;
          const limit = callback ? parseInt(1e3 / r) : 4294967295;
          const nextTick = typeof setImmediate !== "undefined" ? setImmediate : setTimeout;
          const incrementalSMix = function() {
            if (stop) {
              return callback(new Error("cancelled"), currentOp / totalOps);
            }
            let steps;
            switch (state) {
              case 0:
                Bi = i0 * 32 * r;
                arraycopy(B, Bi, XY, 0, Yi);
                state = 1;
                i1 = 0;
              // Fall through
              case 1:
                steps = N - i1;
                if (steps > limit) {
                  steps = limit;
                }
                for (let i = 0; i < steps; i++) {
                  arraycopy(XY, 0, V, (i1 + i) * Yi, Yi);
                  blockmix_salsa8(XY, Yi, r, x, _X);
                }
                i1 += steps;
                currentOp += steps;
                if (callback) {
                  const percent10 = parseInt(1e3 * currentOp / totalOps);
                  if (percent10 !== lastPercent10) {
                    stop = callback(null, currentOp / totalOps);
                    if (stop) {
                      break;
                    }
                    lastPercent10 = percent10;
                  }
                }
                if (i1 < N) {
                  break;
                }
                i1 = 0;
                state = 2;
              // Fall through
              case 2:
                steps = N - i1;
                if (steps > limit) {
                  steps = limit;
                }
                for (let i = 0; i < steps; i++) {
                  const offset = (2 * r - 1) * 16;
                  const j = XY[offset] & N - 1;
                  blockxor(V, j * Yi, XY, Yi);
                  blockmix_salsa8(XY, Yi, r, x, _X);
                }
                i1 += steps;
                currentOp += steps;
                if (callback) {
                  const percent10 = parseInt(1e3 * currentOp / totalOps);
                  if (percent10 !== lastPercent10) {
                    stop = callback(null, currentOp / totalOps);
                    if (stop) {
                      break;
                    }
                    lastPercent10 = percent10;
                  }
                }
                if (i1 < N) {
                  break;
                }
                arraycopy(XY, 0, B, Bi, Yi);
                i0++;
                if (i0 < p) {
                  state = 0;
                  break;
                }
                b = [];
                for (let i = 0; i < B.length; i++) {
                  b.push(B[i] >> 0 & 255);
                  b.push(B[i] >> 8 & 255);
                  b.push(B[i] >> 16 & 255);
                  b.push(B[i] >> 24 & 255);
                }
                const derivedKey = PBKDF2_HMAC_SHA256_OneIter(password, b, dkLen);
                if (callback) {
                  callback(null, 1, derivedKey);
                }
                return derivedKey;
            }
            if (callback) {
              nextTick(incrementalSMix);
            }
          };
          if (!callback) {
            while (true) {
              const derivedKey = incrementalSMix();
              if (derivedKey != void 0) {
                return derivedKey;
              }
            }
          }
          incrementalSMix();
        }
        const lib = {
          scrypt: function(password, salt, N, r, p, dkLen, progressCallback) {
            return new Promise(function(resolve, reject) {
              let lastProgress = 0;
              if (progressCallback) {
                progressCallback(0);
              }
              _scrypt(password, salt, N, r, p, dkLen, function(error, progress, key) {
                if (error) {
                  reject(error);
                } else if (key) {
                  if (progressCallback && lastProgress !== 1) {
                    progressCallback(1);
                  }
                  resolve(new Uint8Array(key));
                } else if (progressCallback && progress !== lastProgress) {
                  lastProgress = progress;
                  return progressCallback(progress);
                }
              });
            });
          },
          syncScrypt: function(password, salt, N, r, p, dkLen) {
            return new Uint8Array(_scrypt(password, salt, N, r, p, dkLen));
          }
        };
        if (typeof exports !== "undefined") {
          module.exports = lib;
        } else if (typeof define === "function" && define.amd) {
          define(lib);
        } else if (root) {
          if (root.scrypt) {
            root._scrypt = root.scrypt;
          }
          root.scrypt = lib;
        }
      })(exports);
    }
  });

  // shims/crypto.js
  var require_crypto = __commonJS({
    "shims/crypto.js"(exports, module) {
      init_globais();
      var { syncScrypt } = require_scrypt();
      var { Buffer: Buffer3 } = require_buffer();
      var bytes = (v) => typeof v === "string" ? Buffer3.from(v, "utf8") : Buffer3.from(v);
      module.exports = {
        randomBytes(n) {
          const a = new Uint8Array(n);
          globalThis.crypto.getRandomValues(a);
          return Buffer3.from(a);
        },
        scryptSync(senha, sal, tamanho, opcoes = {}) {
          return Buffer3.from(syncScrypt(bytes(senha), bytes(sal), opcoes.N || opcoes.cost || 16384, opcoes.r || opcoes.blockSize || 8, opcoes.p || opcoes.parallelization || 1, tamanho));
        },
        timingSafeEqual(a, b) {
          if (a.length !== b.length) throw new RangeError("Input buffers must have the same byte length");
          let d = 0;
          for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
          return d === 0;
        },
        randomUUID() {
          return globalThis.crypto.randomUUID();
        }
      };
    }
  });

  // ../difeecult/Difeecult/precificacao.js
  var require_precificacao = __commonJS({
    "../difeecult/Difeecult/precificacao.js"(exports, module) {
      init_globais();
      (function(raiz, fabrica) {
        const modulo = fabrica();
        if (typeof module === "object" && module.exports) module.exports = modulo;
        else raiz.Precificacao = modulo;
      })(typeof self !== "undefined" ? self : exports, function() {
        const ETAPAS = ["Tecido", "Aviamentos", "Corte", "Costura", "Estampa", "Acabamento", "Etiqueta e embalagem", "Frete", "M\xE3o de obra", "Outro"];
        const UNIDADES = ["m", "kg", "un", "pe\xE7a", "hora"];
        const PERCENTUAIS = [
          { chave: "imposto_pct", nome: "Impostos", ajuda: "Simples Nacional, ICMS... sobre a venda" },
          { chave: "taxa_pct", nome: "Taxa do cart\xE3o / marketplace", ajuda: "O que a maquininha ou o site descontam" },
          { chave: "comissao_pct", nome: "Comiss\xE3o", ajuda: "Vendedor, influencer, representante" },
          { chave: "despesas_pct", nome: "Despesas fixas da loja", ajuda: "Aluguel, internet, sal\xE1rios... em % do faturamento" },
          { chave: "margem_pct", nome: "Lucro desejado", ajuda: "O que sobra limpo para voc\xEA" }
        ];
        const ARREDONDAMENTOS = { 90: "Terminar em ,90", inteiro: "Valor redondo (R$ inteiro)", centavo: "Sem arredondar" };
        const PADROES = { imposto_pct: 6, taxa_pct: 4, comissao_pct: 0, despesas_pct: 10, margem_pct: 30, arredondamento: "90" };
        const LIMITES = { itens: 40, descricao: 80, quantidade: 1e5, valor: 1e6, rendimento: 1e4 };
        const centavos = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;
        const numero = (v) => {
          if (v === null || v === void 0 || v === "") return null;
          const n = typeof v === "number" ? v : Number(String(v).trim().replace(/\s/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
          return Number.isFinite(n) ? n : NaN;
        };
        function arredondar(preco, modo) {
          if (!(preco > 0)) return centavos(preco || 0);
          if (modo === "inteiro") return Math.ceil(preco - 1e-9);
          if (modo === "90") return centavos(Math.ceil(preco - 0.9 - 1e-9) + 0.9);
          return Math.ceil(preco * 100 - 1e-6) / 100;
        }
        function subtotalItem(item) {
          const q = Number(item.quantidade) || 0, v = Number(item.valor_unitario) || 0, r = Number(item.rendimento) || 1;
          return centavos(q * v / r);
        }
        function percentuaisEfetivos(ficha, padroes) {
          const base = { ...PADROES, ...padroes || {} };
          const saida = {};
          for (const { chave } of PERCENTUAIS) {
            const proprio = ficha ? ficha[chave] : null;
            saida[chave] = proprio === null || proprio === void 0 || proprio === "" ? Number(base[chave]) || 0 : Number(proprio) || 0;
          }
          saida.arredondamento = ficha && ficha.arredondamento || base.arredondamento || "90";
          return saida;
        }
        function analisarPreco(preco, custo, p) {
          preco = centavos(preco);
          const imposto = centavos(preco * p.imposto_pct / 100);
          const taxa = centavos(preco * p.taxa_pct / 100);
          const comissao = centavos(preco * p.comissao_pct / 100);
          const despesas = centavos(preco * p.despesas_pct / 100);
          const lucro = centavos(preco - custo - imposto - taxa - comissao - despesas);
          const margem = preco > 0 ? Math.round(lucro / preco * 1e3) / 10 : 0;
          let situacao = "ok";
          if (!(custo > 0)) situacao = "sem_custo";
          else if (lucro < 0) situacao = "prejuizo";
          else if (margem < p.margem_pct - 0.5) situacao = "abaixo";
          return { preco, custo, imposto, taxa, comissao, despesas, lucro, margem_pct: margem, markup: custo > 0 ? Math.round(preco / custo * 100) / 100 : null, situacao };
        }
        function calcular(ficha, padroes, precoAtual) {
          const itens = (ficha && ficha.itens || []).map((item) => ({ ...item, subtotal: subtotalItem(item) }));
          const custo = centavos(itens.reduce((s, i) => s + i.subtotal, 0));
          const p = percentuaisEfetivos(ficha, padroes);
          const variaveis = Math.round((p.imposto_pct + p.taxa_pct + p.comissao_pct + p.despesas_pct) * 100) / 100;
          const total = Math.round((variaveis + p.margem_pct) * 100) / 100;
          const porEtapa = {};
          for (const i of itens) porEtapa[i.etapa] = centavos((porEtapa[i.etapa] || 0) + i.subtotal);
          const base = { itens, custo, percentuais: p, soma_variaveis: variaveis, soma_percentuais: total, por_etapa: porEtapa };
          const atual = precoAtual === null || precoAtual === void 0 || precoAtual === "" ? null : analisarPreco(Number(precoAtual), custo, p);
          if (total >= 100) {
            return { ...base, erro: `Os percentuais somam ${String(total).replace(".", ",")}%: n\xE3o sobra nada para pagar o custo. Diminua o lucro ou as despesas.`, preco_calculado: null, preco_sugerido: null, preco_minimo: null, sugerido: null, atual };
          }
          const divisor = 1 - total / 100;
          const precoCalculado = custo / divisor;
          const precoSugerido = arredondar(precoCalculado, p.arredondamento);
          const precoMinimo = variaveis < 100 ? arredondar(custo / (1 - variaveis / 100), "centavo") : null;
          return {
            ...base,
            erro: null,
            divisor: Math.round(divisor * 1e4) / 1e4,
            preco_calculado: centavos(precoCalculado),
            preco_sugerido: precoSugerido,
            preco_minimo: precoMinimo,
            markup: custo > 0 ? Math.round(precoSugerido / custo * 100) / 100 : null,
            sugerido: analisarPreco(precoSugerido, custo, p),
            atual
          };
        }
        function validarFicha(bruto) {
          if (!bruto || typeof bruto !== "object") return { erro: "Dados da ficha inv\xE1lidos." };
          const lista = Array.isArray(bruto.itens) ? bruto.itens : [];
          if (lista.length > LIMITES.itens) return { erro: `No m\xE1ximo ${LIMITES.itens} itens por ficha.` };
          const itens = [];
          for (const [indice, item] of lista.entries()) {
            const linha = `Item ${indice + 1}`;
            const etapa = String(item?.etapa || "").trim();
            if (!ETAPAS.includes(etapa)) return { erro: `${linha}: escolha a etapa (tecido, corte, costura...).` };
            const descricao = String(item.descricao || "").trim();
            if (descricao.length > LIMITES.descricao) return { erro: `${linha}: descri\xE7\xE3o at\xE9 ${LIMITES.descricao} caracteres.` };
            const quantidade = numero(item.quantidade);
            if (!(quantidade > 0) || quantidade > LIMITES.quantidade) return { erro: `${linha}: informe uma quantidade maior que zero.` };
            const unidade = String(item.unidade || "").trim();
            if (!UNIDADES.includes(unidade)) return { erro: `${linha}: unidade inv\xE1lida.` };
            const valor = numero(item.valor_unitario);
            if (valor === null || Number.isNaN(valor) || valor < 0 || valor > LIMITES.valor) return { erro: `${linha}: informe o valor (zero ou mais).` };
            const rend = numero(item.rendimento);
            const rendimento = rend === null ? 1 : rend;
            if (!(rendimento > 0) || rendimento > LIMITES.rendimento) return { erro: `${linha}: o rendimento (quantas pe\xE7as saem) precisa ser maior que zero.` };
            itens.push({ etapa, descricao, quantidade: Math.round(quantidade * 1e4) / 1e4, unidade, valor_unitario: Math.round(valor * 1e4) / 1e4, rendimento: Math.round(rendimento * 1e4) / 1e4 });
          }
          const ficha = { itens };
          for (const { chave, nome } of PERCENTUAIS) {
            const v = numero(bruto[chave]);
            if (v === null) {
              ficha[chave] = null;
              continue;
            }
            if (Number.isNaN(v) || v < 0 || v >= 100) return { erro: `${nome}: informe de 0 a 99,99%.` };
            ficha[chave] = Math.round(v * 100) / 100;
          }
          const arred = bruto.arredondamento === "" || bruto.arredondamento == null ? null : String(bruto.arredondamento);
          if (arred !== null && !ARREDONDAMENTOS[arred]) return { erro: "Arredondamento inv\xE1lido." };
          ficha.arredondamento = arred;
          ficha.observacoes = String(bruto.observacoes || "").trim().slice(0, 500);
          return { ficha };
        }
        function validarPadroes(bruto) {
          const saida = {};
          for (const { chave, nome } of PERCENTUAIS) {
            const v = numero(bruto?.[chave]);
            if (v === null || Number.isNaN(v) || v < 0 || v >= 100) return { erro: `${nome}: informe de 0 a 99,99%.` };
            saida[chave] = Math.round(v * 100) / 100;
          }
          const total = PERCENTUAIS.reduce((s, { chave }) => s + saida[chave], 0);
          if (total >= 100) return { erro: "A soma dos percentuais precisa ficar abaixo de 100%." };
          const arred = String(bruto?.arredondamento ?? "90");
          if (!ARREDONDAMENTOS[arred]) return { erro: "Arredondamento inv\xE1lido." };
          saida.arredondamento = arred;
          return { padroes: saida };
        }
        return { ETAPAS, UNIDADES, PERCENTUAIS, ARREDONDAMENTOS, PADROES, LIMITES, arredondar, subtotalItem, percentuaisEfetivos, analisarPreco, calcular, validarFicha, validarPadroes };
      });
    }
  });

  // ../difeecult/Difeecult/clt.js
  var require_clt = __commonJS({
    "../difeecult/Difeecult/clt.js"(exports, module) {
      init_globais();
      var TABELAS_CLT = {
        vigencia: "2026",
        salario_minimo: 1621,
        inss: {
          teto: 8475.55,
          faixas: [
            { ate: 1621, aliquota: 0.075 },
            { ate: 2902.84, aliquota: 0.09 },
            { ate: 4354.27, aliquota: 0.12 },
            { ate: 8475.55, aliquota: 0.14 }
          ]
        },
        irrf: {
          faixas: [
            { ate: 2428.8, aliquota: 0, deduzir: 0 },
            { ate: 2826.65, aliquota: 0.075, deduzir: 182.16 },
            { ate: 3751.05, aliquota: 0.15, deduzir: 394.16 },
            { ate: 4664.68, aliquota: 0.225, deduzir: 675.49 },
            { ate: Infinity, aliquota: 0.275, deduzir: 908.73 }
          ],
          deducao_dependente: 189.59,
          desconto_simplificado: 607.2,
          // Lei 15.270/2025: redução mensal do imposto calculado pela tabela.
          reducao: { isencao_ate: 5e3, reducao_maxima: 312.89, transicao_ate: 7350, fixo: 978.62, fator: 0.133145 }
        },
        vt_percentual_maximo: 0.06,
        alimentacao_desconto_maximo: 0.2,
        fgts: 0.08,
        descontos_limite_salario: 0.7
      };
      var centavos = (valor) => {
        const n = Number(valor);
        return Math.sign(n) * Math.round(Math.abs(n) * 100 + 1e-6) / 100;
      };
      function calcularInss(salario, tabela = TABELAS_CLT) {
        const base = Math.min(Math.max(0, salario), tabela.inss.teto);
        let anterior = 0, total = 0;
        const faixas = [];
        for (const faixa of tabela.inss.faixas) {
          if (base <= anterior) break;
          const parte = Math.min(base, faixa.ate) - anterior;
          const valor = parte * faixa.aliquota;
          faixas.push({ de: anterior, ate: faixa.ate, aliquota: faixa.aliquota, base: centavos(parte), valor: centavos(valor) });
          total += valor;
          anterior = faixa.ate;
        }
        return { valor: centavos(total), base: centavos(base), faixas, aliquota_efetiva: base ? total / salario : 0 };
      }
      function impostoPelaTabela(base, tabela) {
        const faixa = tabela.irrf.faixas.find((f) => base <= f.ate);
        return { valor: Math.max(0, base * faixa.aliquota - faixa.deduzir), faixa };
      }
      function calcularIrrf({ rendimento, inss, dependentes = 0, pensao = 0 }, tabela = TABELAS_CLT) {
        const t = tabela.irrf;
        const baseLegal = Math.max(0, rendimento - inss - dependentes * t.deducao_dependente - pensao);
        const baseSimplificada = Math.max(0, rendimento - t.desconto_simplificado);
        const legal = impostoPelaTabela(baseLegal, tabela), simplificado = impostoPelaTabela(baseSimplificada, tabela);
        const usaSimplificado = simplificado.valor < legal.valor;
        const escolhido = usaSimplificado ? simplificado : legal;
        const imposto = escolhido.valor;
        let reducao = 0;
        if (rendimento <= t.reducao.isencao_ate) reducao = Math.min(imposto, t.reducao.reducao_maxima);
        else if (rendimento <= t.reducao.transicao_ate) reducao = Math.min(imposto, Math.max(0, t.reducao.fixo - t.reducao.fator * rendimento));
        return {
          valor: centavos(Math.max(0, imposto - reducao)),
          base: centavos(usaSimplificado ? baseSimplificada : baseLegal),
          deducao: usaSimplificado ? "simplificado" : "legal",
          aliquota: escolhido.faixa.aliquota,
          parcela_deduzir: escolhido.faixa.deduzir,
          imposto_tabela: centavos(imposto),
          reducao_lei_15270: centavos(reducao)
        };
      }
      function calcularFolha(f, opcoes = {}, tabela = TABELAS_CLT) {
        const bruto = centavos(f.salario_bruto);
        const encargosPercentual = Number(opcoes.encargos_patronais_percentual || 0) / 100;
        const inss = calcularInss(bruto, tabela);
        const pensao = centavos(f.pensao_alimenticia || 0);
        const irrf = calcularIrrf({ rendimento: bruto, inss: inss.valor, dependentes: Number(f.dependentes_irrf || 0), pensao }, tabela);
        const vtCusto = f.recebe_vt ? centavos(Number(f.vt_valor_diario || 0) * Number(f.vt_dias_uteis || 0)) : 0;
        const vtDesconto = f.recebe_vt && f.descontar_vt ? centavos(Math.min(vtCusto, bruto * tabela.vt_percentual_maximo)) : 0;
        const alimentacao = centavos(f.alimentacao_valor || 0);
        const alimentacaoPercentual = Math.min(Number(f.alimentacao_desconto_percentual || 0), tabela.alimentacao_desconto_maximo * 100) / 100;
        const alimentacaoDesconto = centavos(alimentacao * alimentacaoPercentual);
        const outros = centavos(f.outros_descontos || 0);
        const totalDescontos = centavos(inss.valor + irrf.valor + vtDesconto + alimentacaoDesconto + pensao + outros);
        const liquido = centavos(bruto - totalDescontos);
        const fgts = centavos(bruto * tabela.fgts);
        const encargos = centavos(bruto * encargosPercentual);
        const vtEmpresa = centavos(vtCusto - vtDesconto);
        const alimentacaoEmpresa = centavos(alimentacao - alimentacaoDesconto);
        const avisos = [];
        if (bruto < tabela.salario_minimo) avisos.push(`Sal\xE1rio abaixo do m\xEDnimo de ${tabela.vigencia} (R$ ${tabela.salario_minimo.toFixed(2).replace(".", ",")}). Confira se a jornada \xE9 parcial.`);
        if (totalDescontos > bruto * tabela.descontos_limite_salario) avisos.push("Os descontos passam de 70% do sal\xE1rio. Revise pens\xE3o e outros descontos.");
        if (Number(f.alimentacao_desconto_percentual || 0) > tabela.alimentacao_desconto_maximo * 100) avisos.push("O desconto da alimenta\xE7\xE3o foi limitado a 20% do benef\xEDcio (PAT).");
        return {
          vigencia: tabela.vigencia,
          bruto,
          descontos: { inss: inss.valor, irrf: irrf.valor, vale_transporte: vtDesconto, alimentacao: alimentacaoDesconto, pensao_alimenticia: pensao, outros, total: totalDescontos },
          liquido,
          beneficios: { vale_transporte_custo: vtCusto, vale_transporte_empresa: vtEmpresa, alimentacao_valor: alimentacao, alimentacao_empresa: alimentacaoEmpresa },
          empresa: { fgts, encargos_patronais: encargos, encargos_patronais_percentual: encargosPercentual * 100, custo_total: centavos(bruto + fgts + encargos + vtEmpresa + alimentacaoEmpresa) },
          memoria: { inss, irrf },
          avisos
        };
      }
      var num = (v) => v === null || v === void 0 || v === "" || typeof v === "boolean" ? NaN : Number(v);
      var fracaoOk = (v) => Number.isFinite(v) && v >= 0 && v <= 1;
      var valorOk = (v) => Number.isFinite(v) && v >= 0 && v <= 1e7;
      var r2 = (v) => Math.round(v * 100) / 100;
      var r6 = (v) => Math.round(v * 1e6) / 1e6;
      function validarTabelaClt(bruto, ano) {
        const b = bruto && typeof bruto === "object" ? bruto : {};
        const erro = (mensagem) => ({ erro: mensagem });
        const salarioMinimo = num(b.salario_minimo);
        if (!(salarioMinimo > 0 && salarioMinimo <= 1e6)) return erro("Informe o sal\xE1rio m\xEDnimo do ano.");
        const inssBruto = Array.isArray(b.inss?.faixas) ? b.inss.faixas : [];
        if (inssBruto.length < 1 || inssBruto.length > 10) return erro("O INSS precisa de 1 a 10 faixas.");
        const inss = [];
        for (const [i, f] of inssBruto.entries()) {
          const ate = num(f?.ate), aliquota = num(f?.aliquota);
          if (!(ate > 0 && ate <= 1e7)) return erro(`INSS, faixa ${i + 1}: informe o valor "at\xE9".`);
          if (!fracaoOk(aliquota)) return erro(`INSS, faixa ${i + 1}: al\xEDquota de 0% a 100%.`);
          if (i && ate <= inss[i - 1].ate) return erro(`INSS, faixa ${i + 1}: o limite precisa ser maior que o da faixa anterior.`);
          inss.push({ ate: r2(ate), aliquota: r6(aliquota) });
        }
        const irBruto = Array.isArray(b.irrf?.faixas) ? b.irrf.faixas : [];
        if (irBruto.length < 2 || irBruto.length > 10) return erro("O IRRF precisa de 2 a 10 faixas.");
        const irrf = [];
        for (const [i, f] of irBruto.entries()) {
          const ultima = i === irBruto.length - 1;
          const ate = ultima ? Infinity : num(f?.ate), aliquota = num(f?.aliquota), deduzir = num(f?.deduzir ?? 0);
          if (!ultima && !(ate > 0 && ate <= 1e7)) return erro(`IRRF, faixa ${i + 1}: informe o valor "at\xE9".`);
          if (!ultima && i && ate <= irrf[i - 1].ate) return erro(`IRRF, faixa ${i + 1}: o limite precisa ser maior que o da faixa anterior.`);
          if (!fracaoOk(aliquota)) return erro(`IRRF, faixa ${i + 1}: al\xEDquota de 0% a 100%.`);
          if (!valorOk(deduzir)) return erro(`IRRF, faixa ${i + 1}: parcela a deduzir inv\xE1lida.`);
          if (i && aliquota < irrf[i - 1].aliquota) return erro(`IRRF, faixa ${i + 1}: a al\xEDquota n\xE3o pode ser menor que a da faixa anterior.`);
          irrf.push({ ate: ultima ? Infinity : r2(ate), aliquota: r6(aliquota), deduzir: r2(deduzir) });
        }
        const dependente = num(b.irrf?.deducao_dependente), simplificado = num(b.irrf?.desconto_simplificado);
        if (!valorOk(dependente)) return erro("Dedu\xE7\xE3o por dependente inv\xE1lida.");
        if (!valorOk(simplificado)) return erro("Desconto simplificado inv\xE1lido.");
        const rb = b.irrf?.reducao || {};
        const reducao = { isencao_ate: num(rb.isencao_ate ?? 0), reducao_maxima: num(rb.reducao_maxima ?? 0), transicao_ate: num(rb.transicao_ate ?? 0), fixo: num(rb.fixo ?? 0), fator: num(rb.fator ?? 0) };
        if (![reducao.isencao_ate, reducao.reducao_maxima, reducao.transicao_ate, reducao.fixo].every(valorOk) || !(Number.isFinite(reducao.fator) && reducao.fator >= 0 && reducao.fator <= 1)) return erro("Redu\xE7\xE3o do IR (Lei 15.270/2025): valores inv\xE1lidos. Use 0 para desligar.");
        if (reducao.transicao_ate && reducao.transicao_ate < reducao.isencao_ate) return erro("Redu\xE7\xE3o do IR: o limite da redu\xE7\xE3o parcial precisa ser maior ou igual ao da isen\xE7\xE3o.");
        const vt = num(b.vt_percentual_maximo), alimentacao = num(b.alimentacao_desconto_maximo), fgts = num(b.fgts);
        if (!fracaoOk(vt)) return erro("Desconto m\xE1ximo do vale-transporte: de 0% a 100%.");
        if (!fracaoOk(alimentacao)) return erro("Desconto m\xE1ximo da alimenta\xE7\xE3o: de 0% a 100%.");
        if (!fracaoOk(fgts)) return erro("FGTS: de 0% a 100%.");
        return {
          tabela: {
            vigencia: String(ano),
            salario_minimo: r2(salarioMinimo),
            inss: { teto: inss[inss.length - 1].ate, faixas: inss },
            irrf: { faixas: irrf, deducao_dependente: r2(dependente), desconto_simplificado: r2(simplificado), reducao: { isencao_ate: r2(reducao.isencao_ate), reducao_maxima: r2(reducao.reducao_maxima), transicao_ate: r2(reducao.transicao_ate), fixo: r2(reducao.fixo), fator: r6(reducao.fator) } },
            vt_percentual_maximo: r6(vt),
            alimentacao_desconto_maximo: r6(alimentacao),
            fgts: r6(fgts),
            descontos_limite_salario: TABELAS_CLT.descontos_limite_salario
          }
        };
      }
      var LIMITES_VARIAVEIS = {
        horas_extras_50: 300,
        horas_extras_100: 300,
        atrasos_horas: 300,
        faltas_dias: 31,
        feriados: 10,
        comissoes: 1e6,
        bonus: 1e6,
        outros_proventos: 1e6,
        reembolsos: 1e6,
        adiantamento: 1e6,
        outros_descontos_mes: 1e6
      };
      var CAMPOS_TEXTO_VARIAVEIS = { outros_proventos_descricao: 80, outros_descontos_mes_descricao: 80, nota_fiscal: 30 };
      function validarVariaveisHolerite(bruto = {}) {
        const b = bruto && typeof bruto === "object" ? bruto : {};
        const v = {};
        for (const [campo, maximo] of Object.entries(LIMITES_VARIAVEIS)) {
          const valor = b[campo] === void 0 || b[campo] === null || b[campo] === "" ? 0 : Number(b[campo]);
          if (!Number.isFinite(valor) || valor < 0 || valor > maximo) return { erro: `Valor inv\xE1lido em "${campo.replace(/_/g, " ")}" (de 0 a ${maximo.toLocaleString("pt-BR")}).` };
          if (Math.abs(Math.round(valor * 100) - valor * 100) > 1e-6) return { erro: `Use no m\xE1ximo duas casas decimais em "${campo.replace(/_/g, " ")}".` };
          v[campo] = Math.round(valor * 100) / 100;
        }
        if (!Number.isInteger(v.faltas_dias * 2)) return { erro: "Faltas: use dias inteiros ou meio dia (ex.: 1,5)." };
        if (!Number.isInteger(v.feriados)) return { erro: "Feriados no m\xEAs: n\xFAmero inteiro." };
        for (const [campo, maximo] of Object.entries(CAMPOS_TEXTO_VARIAVEIS)) {
          const texto = String(b[campo] ?? "").replace(/\s+/g, " ").trim();
          if (texto.length > maximo) return { erro: `"${campo.replace(/_/g, " ")}" at\xE9 ${maximo} caracteres.` };
          v[campo] = texto;
        }
        if (v.outros_proventos > 0 && !v.outros_proventos_descricao) return { erro: "Diga o que s\xE3o os outros proventos (ex.: pr\xEAmio de vendas)." };
        if (v.outros_descontos_mes > 0 && !v.outros_descontos_mes_descricao) return { erro: "Diga o que \xE9 o outro desconto do m\xEAs (ex.: uniforme)." };
        return { variaveis: v };
      }
      var competenciaValida = (c) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(c || ""));
      function diasDoMes(competencia) {
        const [a, m] = competencia.split("-").map(Number);
        return new Date(Date.UTC(a, m, 0)).getUTCDate();
      }
      function domingosDoMes(competencia) {
        const [a, m] = competencia.split("-").map(Number);
        let n = 0;
        for (let d = 1; d <= diasDoMes(competencia); d += 1) if (new Date(Date.UTC(a, m - 1, d)).getUTCDay() === 0) n += 1;
        return n;
      }
      var NOMES_MES = ["janeiro", "fevereiro", "mar\xE7o", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
      var rotuloCompetencia = (c) => `${NOMES_MES[Number(c.slice(5, 7)) - 1]} de ${c.slice(0, 4)}`;
      var pct = (v) => `${(Math.round(v * 1e4) / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
      var horas = (h) => `${h.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}h`;
      function diasTrabalhados(f, competencia) {
        const inicio = `${competencia}-01`, fim = `${competencia}-${String(diasDoMes(competencia)).padStart(2, "0")}`;
        if (f.data_admissao && f.data_admissao > fim) return { erro: `Admiss\xE3o em ${f.data_admissao.split("-").reverse().join("/")}: n\xE3o h\xE1 holerite para ${rotuloCompetencia(competencia)}.` };
        if (f.data_desligamento && f.data_desligamento < inicio) return { erro: `Desligado em ${f.data_desligamento.split("-").reverse().join("/")}: n\xE3o h\xE1 holerite para ${rotuloCompetencia(competencia)}.` };
        let primeiro = 1, ultimo = 30;
        if (f.data_admissao && f.data_admissao >= inicio) primeiro = Math.min(30, Number(f.data_admissao.slice(8, 10)));
        if (f.data_desligamento && f.data_desligamento <= fim) ultimo = Math.min(30, Number(f.data_desligamento.slice(8, 10)));
        if (f.data_desligamento && f.data_desligamento === fim) ultimo = 30;
        return { dias: Math.max(0, ultimo - primeiro + 1) };
      }
      function calcularHolerite(f, variaveisBrutas, competencia, opcoes = {}, tabela = TABELAS_CLT) {
        if (!competenciaValida(competencia)) return { erro: "M\xEAs de refer\xEAncia inv\xE1lido (use AAAA-MM)." };
        const lido = validarVariaveisHolerite(variaveisBrutas);
        if (lido.erro) return lido;
        const v = lido.variaveis;
        const periodo = diasTrabalhados(f, competencia);
        if (periodo.erro) return periodo;
        const pj = f.tipo_vinculo === "PJ";
        const mensal = centavos(f.salario_bruto);
        const proporcional = periodo.dias < 30;
        const base = centavos(proporcional ? mensal / 30 * periodo.dias : mensal);
        const itens = [];
        const provento = (codigo, descricao, referencia, valor) => {
          const x = centavos(valor);
          if (x > 0) itens.push({ codigo, descricao, referencia, provento: x, desconto: 0 });
          return x > 0 ? x : 0;
        };
        const desconto = (codigo, descricao, referencia, valor) => {
          const x = centavos(valor);
          if (x > 0) itens.push({ codigo, descricao, referencia, provento: 0, desconto: x });
          return x > 0 ? x : 0;
        };
        const avisos = [];
        const encargosPercentual = Number(opcoes.encargos_patronais_percentual || 0) / 100;
        if (pj) {
          provento("0001", "Honor\xE1rios do contrato", proporcional ? `${periodo.dias} dias` : "mensal", base);
          provento("0020", "Comiss\xF5es", "", v.comissoes);
          provento("0030", "B\xF4nus / gratifica\xE7\xE3o", "", v.bonus);
          provento("0040", v.outros_proventos_descricao || "Outros", "", v.outros_proventos);
          const tributavel2 = centavos(base + v.comissoes + v.bonus + v.outros_proventos);
          provento("0050", "Reembolso de despesas", "n\xE3o tribut\xE1vel", v.reembolsos);
          const irrfPct = Number(f.pj_irrf_percentual || 0) / 100, csrfPct = Number(f.pj_csrf_percentual || 0) / 100, issPct = Number(f.pj_iss_percentual || 0) / 100;
          const irrf2 = desconto("0301", "IRRF retido na fonte", pct(irrfPct), tributavel2 * irrfPct);
          const csrf = desconto("0302", "PIS/COFINS/CSLL retidos", pct(csrfPct), tributavel2 * csrfPct);
          const iss = desconto("0303", "ISS retido", pct(issPct), tributavel2 * issPct);
          desconto("0206", "Adiantamento", "", v.adiantamento);
          desconto("0208", v.outros_descontos_mes_descricao || "Outros descontos", "", v.outros_descontos_mes);
          const totalProventos2 = centavos(itens.reduce((t, i) => t + i.provento, 0));
          const totalDescontos2 = centavos(itens.reduce((t, i) => t + i.desconto, 0));
          const liquido2 = centavos(totalProventos2 - totalDescontos2);
          if (liquido2 < 0) return { erro: "Os descontos passam do valor a pagar. Revise o adiantamento e os outros descontos." };
          if (!v.nota_fiscal) avisos.push("Sem n\xFAmero de nota fiscal: pe\xE7a a NF do prestador antes de pagar.");
          return {
            tipo_vinculo: "PJ",
            competencia,
            competencia_rotulo: rotuloCompetencia(competencia),
            vigencia: tabela.vigencia,
            itens,
            totais: { proventos: totalProventos2, descontos: totalDescontos2, liquido: liquido2 },
            bases: { valor_contrato: mensal, base_retencoes: tributavel2, irrf: irrf2, csrf, iss, retencoes: centavos(irrf2 + csrf + iss) },
            empresa: { custo_total: totalProventos2, retencoes_a_recolher: centavos(irrf2 + csrf + iss) },
            referencias: { dias_trabalhados: periodo.dias },
            variaveis: v,
            avisos
          };
        }
        const jornada = Number(f.jornada_semanal || 44);
        const divisor = jornada * 5;
        const valorHora = mensal / divisor;
        const descansos = domingosDoMes(competencia) + v.feriados;
        const diasUteis = Math.max(1, diasDoMes(competencia) - descansos);
        provento("0001", "Sal\xE1rio base", proporcional ? `${periodo.dias} dias` : "30 dias", base);
        const he50 = provento("0010", "Horas extras 50%", v.horas_extras_50 ? horas(v.horas_extras_50) : "", valorHora * 1.5 * v.horas_extras_50);
        const he100 = provento("0011", "Horas extras 100%", v.horas_extras_100 ? horas(v.horas_extras_100) : "", valorHora * 2 * v.horas_extras_100);
        const dsrHe = provento("0012", "DSR sobre horas extras", `${descansos}/${diasUteis}`, (he50 + he100) / diasUteis * descansos);
        const comissoes = provento("0020", "Comiss\xF5es", "", v.comissoes);
        const dsrComissoes = provento("0021", "DSR sobre comiss\xF5es", `${descansos}/${diasUteis}`, comissoes / diasUteis * descansos);
        const bonus = provento("0030", "Gratifica\xE7\xE3o / b\xF4nus", "", v.bonus);
        const outros = provento("0040", v.outros_proventos_descricao || "Outros proventos", "", v.outros_proventos);
        const faltas = desconto("0101", "Faltas", v.faltas_dias ? `${v.faltas_dias.toLocaleString("pt-BR")} ${v.faltas_dias === 1 ? "dia" : "dias"}` : "", mensal / 30 * v.faltas_dias);
        const atrasos = desconto("0102", "Atrasos", v.atrasos_horas ? horas(v.atrasos_horas) : "", valorHora * v.atrasos_horas);
        const tributavel = centavos(Math.max(0, base + he50 + he100 + dsrHe + comissoes + dsrComissoes + bonus + outros - faltas - atrasos));
        const inss = calcularInss(tributavel, tabela);
        desconto("0201", "INSS", tributavel ? pct(inss.valor / tributavel) : "", inss.valor);
        const pensao = centavos(f.pensao_alimenticia || 0);
        const irrf = calcularIrrf({ rendimento: tributavel, inss: inss.valor, dependentes: Number(f.dependentes_irrf || 0), pensao }, tabela);
        desconto("0202", "IRRF", irrf.valor ? pct(irrf.aliquota) : "", irrf.valor);
        const vtDias = f.recebe_vt ? Math.max(0, Number(f.vt_dias_uteis || 0) - Math.ceil(v.faltas_dias)) : 0;
        const vtCusto = f.recebe_vt ? centavos(Number(f.vt_valor_diario || 0) * vtDias) : 0;
        const vtDesconto = desconto("0203", "Vale-transporte", f.recebe_vt && f.descontar_vt ? pct(tabela.vt_percentual_maximo) : "", f.recebe_vt && f.descontar_vt ? Math.min(vtCusto, base * tabela.vt_percentual_maximo) : 0);
        const alimentacao = centavos(f.alimentacao_valor || 0);
        const alimentacaoPct = Math.min(Number(f.alimentacao_desconto_percentual || 0), tabela.alimentacao_desconto_maximo * 100) / 100;
        const alimentacaoDesconto = desconto("0204", "Vale-alimenta\xE7\xE3o / refei\xE7\xE3o", alimentacaoPct ? pct(alimentacaoPct) : "", alimentacao * alimentacaoPct);
        desconto("0205", "Pens\xE3o aliment\xEDcia", "", pensao);
        desconto("0206", "Adiantamento salarial", "", v.adiantamento);
        desconto("0207", f.outros_descontos_descricao || "Outros descontos", "fixo", f.outros_descontos || 0);
        desconto("0208", v.outros_descontos_mes_descricao || "Outros descontos do m\xEAs", "", v.outros_descontos_mes);
        const totalProventos = centavos(itens.reduce((t, i) => t + i.provento, 0));
        const totalDescontos = centavos(itens.reduce((t, i) => t + i.desconto, 0));
        const liquido = centavos(totalProventos - totalDescontos);
        if (liquido < 0) return { erro: "Os descontos passam do total a receber. Revise faltas, adiantamento e outros descontos." };
        const fgts = centavos(tributavel * tabela.fgts);
        const encargos = centavos(tributavel * encargosPercentual);
        const vtEmpresa = centavos(vtCusto - vtDesconto), alimentacaoEmpresa = centavos(alimentacao - alimentacaoDesconto);
        if (mensal < tabela.salario_minimo) avisos.push(`Sal\xE1rio abaixo do m\xEDnimo de ${tabela.vigencia} (R$ ${tabela.salario_minimo.toFixed(2).replace(".", ",")}). Confira se a jornada \xE9 parcial.`);
        if (totalDescontos - v.adiantamento > totalProventos * tabela.descontos_limite_salario) avisos.push("Os descontos passam de 70% do sal\xE1rio. Revise pens\xE3o e outros descontos.");
        if (f.data_desligamento && f.data_desligamento.slice(0, 7) === competencia) avisos.push("M\xEAs do desligamento: as verbas rescis\xF3rias (f\xE9rias, 13\xBA, aviso) n\xE3o entram neste holerite.");
        return {
          tipo_vinculo: "CLT",
          competencia,
          competencia_rotulo: rotuloCompetencia(competencia),
          vigencia: tabela.vigencia,
          itens,
          totais: { proventos: totalProventos, descontos: totalDescontos, liquido },
          bases: { salario_base: mensal, base_inss: tributavel, base_fgts: tributavel, fgts_mes: fgts, base_irrf: irrf.base, faixa_irrf: irrf.valor ? pct(irrf.aliquota) : irrf.reducao_lei_15270 ? "isento (Lei 15.270)" : "isento", deducao_irrf: irrf.deducao, reducao_lei_15270: irrf.reducao_lei_15270 },
          empresa: { fgts, encargos_patronais: encargos, encargos_patronais_percentual: encargosPercentual * 100, vale_transporte: vtEmpresa, alimentacao: alimentacaoEmpresa, custo_total: centavos(tributavel + fgts + encargos + vtEmpresa + alimentacaoEmpresa) },
          referencias: { dias_trabalhados: periodo.dias, jornada_semanal: jornada, divisor, valor_hora: centavos(valorHora), dias_uteis: diasUteis, descansos },
          variaveis: v,
          avisos
        };
      }
      module.exports = { TABELAS_CLT, calcularInss, calcularIrrf, calcularFolha, validarTabelaClt, calcularHolerite, validarVariaveisHolerite, competenciaValida, rotuloCompetencia };
    }
  });

  // ../difeecult/Difeecult/server.js
  var require_server = __commonJS({
    "../difeecult/Difeecult/server.js"(exports, module) {
      init_globais();
      var express = require_express();
      var sqlite3 = require_sqlite3().verbose();
      var { Pool } = require_vazios();
      var crypto = require_crypto();
      var Precificacao = require_precificacao();
      var { TABELAS_CLT, calcularFolha, validarTabelaClt, calcularHolerite, competenciaValida, rotuloCompetencia } = require_clt();
      var fs = require_vazios();
      var path = require_vazios();
      var { AsyncLocalStorage } = require_vazios();
      var app = express();
      var PORT = Number(process.env.PORT || 3e3);
      var DATABASE_PATH = process.env.DATABASE_PATH || path.join("/", "banco.sqlite");
      var USE_POSTGRES = Boolean(process.env.DATABASE_URL);
      var ALLOW_CARD_PAYMENTS = process.env.ENABLE_CARD_PAYMENTS === "true";
      var SESSION_TTL_MS = 8 * 60 * 60 * 1e3;
      var sessions = globalThis.__DEMO_SESSOES || /* @__PURE__ */ new Map();
      var transactionStorage = new AsyncLocalStorage();
      if (USE_POSTGRES) {
        const { types } = require_vazios();
        types.setTypeParser(20, (v) => v === null ? null : Number(v));
        types.setTypeParser(1700, (v) => v === null ? null : Number(v));
        types.setTypeParser(1082, (v) => v);
      }
      var db = USE_POSTGRES ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 5 }) : new sqlite3.Database(DATABASE_PATH);
      if (!USE_POSTGRES) db.configure("busyTimeout", 5e3);
      if (process.env.VERCEL === "1" && !USE_POSTGRES) {
        throw new Error("DATABASE_URL \xE9 obrigat\xF3rio em produ\xE7\xE3o/Vercel; SQLite \xE9 permitido apenas localmente.");
      }
      app.disable("x-powered-by");
      app.use(express.json({ limit: "100kb" }));
      app.use((req, res, next) => {
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("X-Frame-Options", "SAMEORIGIN");
        res.setHeader("Referrer-Policy", "same-origin");
        next();
      });
      var ARQUIVOS_PUBLICOS = {
        "/": "index.html",
        "/index.html": "index.html",
        "/style.css": "style.css",
        "/script.js": "script.js",
        "/logo-difeecult.svg": "logo-difeecult.svg",
        "/favicon.svg": "favicon.svg",
        "/precificacao.js": "precificacao.js"
      };
      app.get(Object.keys(ARQUIVOS_PUBLICOS), (req, res, next) => {
        const arquivo = ARQUIVOS_PUBLICOS[req.path.toLowerCase()];
        if (!arquivo) return next();
        res.sendFile(arquivo, { root: "/" });
      });
      function postgresSql(sql) {
        let parameterIndex = 0;
        return sql.replace(/\?/g, () => `$${++parameterIndex}`);
      }
      function activePostgresClient() {
        return transactionStorage.getStore() || db;
      }
      var run = (sql, params = []) => USE_POSTGRES ? activePostgresClient().query(`${postgresSql(sql)}${/^\s*INSERT\s/i.test(sql) && !/\bRETURNING\b/i.test(sql) ? " RETURNING id" : ""}`, params).then((result) => ({ lastID: result.rows[0]?.id, changes: result.rowCount })) : new Promise((resolve, reject) => db.run(sql, params, function(err) {
        err ? reject(err) : resolve(this);
      }));
      var get = (sql, params = []) => USE_POSTGRES ? activePostgresClient().query(postgresSql(sql), params).then((result) => result.rows[0]) : new Promise((resolve, reject) => db.get(sql, params, (err, row) => err ? reject(err) : resolve(row)));
      var all = (sql, params = []) => USE_POSTGRES ? activePostgresClient().query(postgresSql(sql), params).then((result) => result.rows || []) : new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || [])));
      var transaction = async (callback) => {
        if (!USE_POSTGRES) {
          await run("BEGIN IMMEDIATE");
          try {
            const result = await callback();
            await run("COMMIT");
            return result;
          } catch (err) {
            try {
              await run("ROLLBACK");
            } catch (_) {
            }
            throw err;
          }
        }
        const client = await db.connect();
        try {
          await client.query("BEGIN");
          const result = await transactionStorage.run(client, callback);
          await client.query("COMMIT");
          return result;
        } catch (err) {
          try {
            await client.query("ROLLBACK");
          } catch (_) {
          }
          throw err;
        } finally {
          client.release();
        }
      };
      async function ensureColumn(table, column, definition) {
        if (USE_POSTGRES) return;
        const columns = await all(`PRAGMA table_info(${table})`);
        if (!columns.some((item) => item.name === column)) await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      }
      async function renomearColuna(tabela, antiga, nova) {
        if (USE_POSTGRES) return;
        const colunas = await all(`PRAGMA table_info(${tabela})`);
        if (colunas.some((c) => c.name === antiga) && !colunas.some((c) => c.name === nova)) await run(`ALTER TABLE ${tabela} RENAME COLUMN ${antiga} TO ${nova}`);
      }
      async function liberarEstoqueNegativoSqlite() {
        const tabela = await get("SELECT sql FROM sqlite_master WHERE type='table' AND name='produtos'");
        if (!/check\s*\(\s*estoque\s*>=\s*0\s*\)/i.test(String(tabela?.sql || ""))) return;
        await transaction(async () => {
          await run("CREATE TABLE produtos_rebuild (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, categoria TEXT NOT NULL, preco REAL NOT NULL CHECK(preco >= 0), estoque INTEGER NOT NULL DEFAULT 0, ativo INTEGER NOT NULL DEFAULT 1)");
          await run("INSERT INTO produtos_rebuild (id,nome,categoria,preco,estoque) SELECT id,nome,categoria,preco,estoque FROM produtos");
          await run("DROP TABLE produtos");
          await run("ALTER TABLE produtos_rebuild RENAME TO produtos");
        });
      }
      function normalizeLogin(value) {
        return String(value || "").trim().toLowerCase();
      }
      function isAdminUser(user) {
        return Boolean(user && (user.login === "admin" || String(user.departamento || "").toLowerCase() === "diretoria"));
      }
      var VALOR_MONETARIO_MAXIMO = 99999999999e-2;
      function parseInteiro(value) {
        if (typeof value === "number") return Number.isSafeInteger(value) ? value : null;
        if (typeof value !== "string" && typeof value !== "bigint") return null;
        const texto = String(value).trim();
        if (!/^[0-9]+$/.test(texto)) return null;
        const numero = Number(texto);
        return Number.isSafeInteger(numero) ? numero : null;
      }
      function parseMoney(value) {
        let texto;
        if (typeof value === "number") {
          if (!Number.isFinite(value)) return null;
          texto = String(value);
        } else if (typeof value === "string") {
          texto = value.trim().replace(/\s/g, "");
          if (texto.includes(",") && texto.includes(".")) return null;
          texto = texto.replace(",", ".");
        } else return null;
        if (!/^[0-9]+(\.[0-9]{1,2})?$/.test(texto)) return null;
        const numero = Number(texto);
        if (!Number.isFinite(numero) || numero > VALOR_MONETARIO_MAXIMO) return null;
        return Math.round(numero * 100) / 100;
      }
      function validDate(value, required = true) {
        return !required && !value || /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(value));
      }
      function filtroData(value) {
        const texto = String(value ?? "").trim();
        return validDate(texto, false) && texto ? texto : "";
      }
      function validDiscountPercentage(value) {
        const numero = Number(value);
        if (!Number.isFinite(numero) || numero <= 0 || numero > 100) return false;
        return /^[0-9]{1,3}([.,][0-9]{1,2})?$/.test(String(value).trim().replace(/\s/g, ""));
      }
      function parseComissao(value) {
        if (value === void 0 || value === null || String(value).trim() === "") return 0;
        const numero = parseMoney(value);
        return numero === null || numero > 100 ? null : numero;
      }
      function dataDeHoje() {
        return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(/* @__PURE__ */ new Date());
      }
      function toDbBool(value) {
        const truthy = Boolean(value);
        return USE_POSTGRES ? truthy : truthy ? 1 : 0;
      }
      function fromDbBool(value) {
        return value === true || value === 1 || value === "1" || value === "t";
      }
      var PARAMETROS_CATALOGO = {
        permitir_estoque_negativo: {
          categoria: "vendas",
          padrao: "false",
          tipo: "booleano",
          rotulo: "Vender mesmo sem estoque",
          descricao: "Ligado, o caixa consegue vender mais do que h\xE1 no estoque e o saldo fica negativo (ex.: -1). Desligado, a venda \xE9 bloqueada quando falta pe\xE7a."
        },
        brinde_quantidade_minima: {
          categoria: "vendas",
          padrao: "3",
          tipo: "inteiro",
          minimo: 0,
          maximo: 100,
          unidade: "pe\xE7as",
          rotulo: "Brinde a partir de",
          descricao: "A partir desta quantidade de pe\xE7as na mesma venda, o caixa pergunta se o cliente ganhou brinde. Zero desliga o brinde."
        },
        estoque_minimo_aviso: {
          categoria: "estoque",
          padrao: "5",
          tipo: "inteiro",
          minimo: 0,
          maximo: 1e3,
          unidade: "un.",
          rotulo: "Avisar quando o estoque chegar a",
          descricao: 'Produtos com esta quantidade ou menos aparecem como "acabando" no Quadro de avisos, no estoque e na hora da venda. Zero avisa s\xF3 quando esgota.'
        },
        dias_vencimento_proximo: {
          categoria: "financeiro",
          padrao: "7",
          tipo: "inteiro",
          minimo: 1,
          maximo: 90,
          unidade: "dias",
          rotulo: 'Conta "vencendo" com anteced\xEAncia de',
          descricao: 'Contas a pagar e a receber que vencem dentro deste prazo aparecem como "vencendo" nos indicadores, e a d\xEDvida fixa do m\xEAs seguinte \xE9 lan\xE7ada quando entra nesse prazo.'
        },
        clt_encargos_patronais_percentual: {
          categoria: "clt",
          padrao: "0",
          tipo: "inteiro",
          minimo: 0,
          maximo: 40,
          unidade: "%",
          rotulo: "Encargos da empresa sobre a folha",
          descricao: "Somado ao custo de cada funcion\xE1rio na Folha CLT. Simples Nacional (anexos I a III) normalmente usa 0%; no regime normal fica perto de 27 a 28% (INSS patronal + RAT + terceiros). Confirme com a contabilidade."
        }
      };
      async function lerParametro(chave) {
        const definicao = PARAMETROS_CATALOGO[chave];
        if (!definicao) return null;
        const linha = await get("SELECT valor FROM parametros WHERE chave=?", [chave]);
        const bruto = linha ? String(linha.valor) : definicao.padrao;
        if (definicao.tipo === "booleano") return bruto === "true";
        const inteiro = parseInteiro(bruto);
        if (inteiro === null) return parseInteiro(definicao.padrao);
        return Math.min(definicao.maximo, Math.max(definicao.minimo, inteiro));
      }
      async function listarParametros() {
        const salvos = await all("SELECT chave,valor,atualizado_em FROM parametros");
        const porChave = new Map(salvos.map((item) => [item.chave, item]));
        return Object.entries(PARAMETROS_CATALOGO).map(([chave, definicao]) => {
          const salvo = porChave.get(chave);
          const valor = salvo ? String(salvo.valor) : definicao.padrao;
          return {
            chave,
            categoria: definicao.categoria,
            unidade: definicao.unidade || "",
            rotulo: definicao.rotulo,
            descricao: definicao.descricao,
            tipo: definicao.tipo,
            padrao: definicao.padrao,
            minimo: definicao.minimo ?? null,
            maximo: definicao.maximo ?? null,
            valor,
            alterado: Boolean(salvo),
            atualizado_em: salvo?.atualizado_em || null
          };
        });
      }
      function hashPassword(password) {
        const salt = crypto.randomBytes(16).toString("hex");
        const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
        return `scrypt$${salt}$${hash}`;
      }
      function verifyPassword(password, stored) {
        if (!stored) return false;
        if (!stored.startsWith("scrypt$")) return stored === String(password);
        const [, salt, expected] = stored.split("$");
        const actual = crypto.scryptSync(String(password), salt, 64).toString("hex");
        return Boolean(expected && actual.length === expected.length && crypto.timingSafeEqual(import_buffer.Buffer.from(actual), import_buffer.Buffer.from(expected)));
      }
      function publicUser(row) {
        return { id: row.id, nome: row.nome, departamento: row.departamento, login: row.login };
      }
      function issueSession(user) {
        const token = crypto.randomBytes(32).toString("hex");
        sessions.set(token, { user, expiresAt: Date.now() + SESSION_TTL_MS });
        return token;
      }
      function getBearer(req) {
        const header = String(req.headers.authorization || "");
        return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
      }
      function requireAuth(req, res, next) {
        const token = getBearer(req);
        const session = sessions.get(token);
        if (!session || session.expiresAt <= Date.now()) {
          if (token) sessions.delete(token);
          return res.status(401).json({ error: "Sess\xE3o ausente ou expirada. Fa\xE7a login novamente." });
        }
        req.user = session.user;
        next();
      }
      function requireAdmin(req, res, next) {
        if (!isAdminUser(req.user)) return res.status(403).json({ error: "Acesso restrito ao administrador." });
        next();
      }
      var TELAS_PERMISSAO = [
        { chave: "dashboard", grupo: "Comercial", nome: "Dashboard", editar: null },
        { chave: "vendas", grupo: "Comercial", nome: "Vendas (PDV)", ver: "Acessar o PDV e registrar vendas", editar: null },
        { chave: "caixa", grupo: "Comercial", nome: "Caixa", editar: "Confirmar pagamentos, cancelar vendas, ver o CPF completo" },
        { chave: "estoque", grupo: "Comercial", nome: "Produtos & Estoque", editar: "Cadastrar produtos, modelos, cores e fotos; entrada e sa\xEDda" },
        { chave: "precos", grupo: "Comercial", nome: "Custos e forma\xE7\xE3o de pre\xE7o", ver: "Ver custos, margens e pre\xE7o sugerido", editar: "Montar fichas de custo e aplicar o pre\xE7o calculado" },
        { chave: "movimentar", grupo: "Comercial", nome: "Movimentar", editar: "Registrar doa\xE7\xF5es, brindes, entradas e sa\xEDdas" },
        { chave: "avisos", grupo: "Comercial", nome: "Quadro de avisos", editar: null },
        { chave: "eventos", grupo: "Comercial", nome: "Eventos", editar: "Criar e alterar eventos e planilhas de envio" },
        { chave: "relatorios", grupo: "Comercial", nome: "Relat\xF3rios", editar: null },
        { chave: "contas", grupo: "Financeiro", nome: "Contas a Pagar", editar: "Lan\xE7ar, pagar e excluir contas e d\xEDvidas fixas" },
        { chave: "recebimentos", grupo: "Financeiro", nome: "Contas a Receber", editar: "Lan\xE7ar, receber e cancelar recebimentos" },
        { chave: "clt", grupo: "Cadastros", nome: "Funcion\xE1rios e holerites", ver: "Ver funcion\xE1rios, sal\xE1rios e holerites", editar: "Cadastrar funcion\xE1rios e gerar holerites" },
        { chave: "fornecedores", grupo: "Cadastros", nome: "Fornecedores", editar: "Cadastrar, alterar e excluir" },
        { chave: "descontos", grupo: "Cadastros", nome: "Cupons de Influencer", ver: "Ver cupons, comiss\xF5es e ganhos", editar: "Criar e alterar cupons" },
        { chave: "historico-produtos", grupo: "Administrativo", nome: "Hist\xF3rico de Produtos", editar: null },
        { chave: "log", grupo: "Administrativo", nome: "Log de Atividades", editar: null },
        { chave: "parametros", grupo: "Administrativo", nome: "Par\xE2metros do Sistema", editar: "Alterar os par\xE2metros" }
      ];
      var TELAS_POR_CHAVE = new Map(TELAS_PERMISSAO.map((t) => [t.chave, t]));
      var PERMISSOES_PADRAO = { dashboard: "ver", vendas: "ver", caixa: "ver", avisos: "ver", eventos: "ver", relatorios: "ver" };
      function pode(user, tela, nivel = "ver") {
        if (!user) return false;
        if (isAdminUser(user)) return true;
        const atual = user.permissoes?.[tela];
        return nivel === "editar" ? atual === "editar" : atual === "ver" || atual === "editar";
      }
      function requireVer(...telas) {
        return (req, res, next) => telas.some((t) => pode(req.user, t, "ver")) ? next() : res.status(403).json({ error: "Voc\xEA n\xE3o tem acesso a esta \xE1rea. Pe\xE7a ao administrador." });
      }
      function requireEditar(...telas) {
        return (req, res, next) => telas.some((t) => pode(req.user, t, "editar")) ? next() : res.status(403).json({ error: "Voc\xEA pode ver esta \xE1rea, mas n\xE3o alterar. Pe\xE7a ao administrador." });
      }
      async function permissoesDoUsuario(usuarioId) {
        const linhas = await all("SELECT tela, pode_editar FROM usuario_permissao WHERE usuario_id=?", [usuarioId]);
        const mapa = {};
        for (const l of linhas) if (TELAS_POR_CHAVE.has(l.tela)) mapa[l.tela] = fromDbBool(l.pode_editar) && TELAS_POR_CHAVE.get(l.tela).editar ? "editar" : "ver";
        return mapa;
      }
      function normalizarPermissoes(bruto) {
        if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) return null;
        const mapa = {};
        for (const [tela, nivel] of Object.entries(bruto)) {
          const definicao = TELAS_POR_CHAVE.get(tela);
          if (!definicao) return null;
          if (nivel === "nenhum" || nivel === null || nivel === false) continue;
          if (nivel === "ver") mapa[tela] = "ver";
          else if (nivel === "editar") {
            if (!definicao.editar) return null;
            mapa[tela] = "editar";
          } else return null;
        }
        return mapa;
      }
      async function gravarPermissoes(usuarioId, mapa) {
        await run("DELETE FROM usuario_permissao WHERE usuario_id=?", [usuarioId]);
        const sql = `INSERT INTO usuario_permissao (usuario_id,tela,pode_editar) VALUES (?,?,?)${USE_POSTGRES ? " RETURNING usuario_id AS id" : ""}`;
        for (const [tela, nivel] of Object.entries(mapa)) await run(sql, [usuarioId, tela, toDbBool(nivel === "editar")]);
      }
      function atualizarSessoesDoUsuario(usuarioId, mapa) {
        for (const sessao of sessions.values()) if (Number(sessao.user.id) === Number(usuarioId)) sessao.user = { ...sessao.user, permissoes: mapa };
      }
      function encerrarSessoesDoUsuario(usuarioId) {
        for (const [token, sessao] of sessions.entries()) if (Number(sessao.user.id) === Number(usuarioId)) sessions.delete(token);
      }
      function errorResponse(res, err) {
        if (err && ["SQLITE_CONSTRAINT", "23505", "23514", "23503"].includes(err.code)) return res.status(400).json({ error: "Registro inv\xE1lido, duplicado ou relacionado a um registro inexistente." });
        console.error(err);
        return res.status(500).json({ error: "Erro interno do servidor." });
      }
      var ACOES_LOG = ["VENDA", "BRINDE", "VENDA_CANCELADA", "VENDA_EXCLUIDA", "PRODUTO", "MODELO", "VARIACAO", "COR", "ENTRADA", "SAIDA", "DOACAO", "PERMISSAO", "CLT", "USUARIO"];
      function diaIso(valor) {
        return valor instanceof Date ? valor.toISOString().slice(0, 10) : String(valor).slice(0, 10);
      }
      function itensParaLog(itens) {
        return itens.filter((i) => i.tipo === "VENDA").map((i) => `${i.produto_nome} x${i.quantidade}`).join(", ");
      }
      async function registrarLog(usuario, acao, descricao, { valor = null, vendaId = null, quando = null } = {}) {
        await run(
          "INSERT INTO log_atividade (criado_em,usuario_id,usuario_nome,acao,descricao,valor,venda_id) VALUES (?,?,?,?,?,?,?)",
          [quando || (/* @__PURE__ */ new Date()).toISOString(), usuario?.id ?? null, String(usuario?.nome || "").slice(0, 120), acao, String(descricao).slice(0, 500), valor, vendaId]
        );
      }
      async function completarHistoricoAntigo() {
        await run(`UPDATE vendas SET usuario_id=(SELECT p.confirmado_por FROM pagamentos p WHERE p.venda_id=vendas.id AND p.confirmado_por IS NOT NULL ORDER BY p.id LIMIT 1) WHERE usuario_id IS NULL`);
        const semHora = await all("SELECT v.id, v.data_venda, (SELECT p.confirmado_em FROM pagamentos p WHERE p.venda_id=v.id AND p.confirmado_em IS NOT NULL ORDER BY p.id LIMIT 1) AS confirmado_em FROM vendas v WHERE v.criado_em IS NULL");
        for (const venda of semHora) {
          const quando = venda.confirmado_em ? new Date(venda.confirmado_em) : null;
          const valor = quando && !Number.isNaN(quando.getTime()) ? quando.toISOString() : `${diaIso(venda.data_venda)}T12:00:00.000Z`;
          await run("UPDATE vendas SET criado_em=? WHERE id=?", [valor, venda.id]);
        }
        const vendas = await all("SELECT v.id, v.total, v.criado_em, v.usuario_id, u.nome AS usuario_nome FROM vendas v LEFT JOIN usuarios_erp u ON u.id=v.usuario_id WHERE NOT EXISTS (SELECT 1 FROM log_atividade l WHERE l.acao='VENDA' AND l.venda_id=v.id) ORDER BY v.id");
        if (vendas.length) {
          const porVenda = await itensDasVendas(vendas.map((v) => v.id));
          for (const venda of vendas) {
            const itens = porVenda.get(Number(venda.id)) || [];
            const usuario = { id: venda.usuario_id, nome: venda.usuario_nome || "" };
            const quando = new Date(venda.criado_em).toISOString();
            await registrarLog(usuario, "VENDA", `Venda #${venda.id}: ${itensParaLog(itens) || "sem itens"}`, { valor: Number(venda.total), vendaId: venda.id, quando });
            const brinde = itens.find((i) => i.tipo === "BRINDE");
            if (brinde) await registrarLog(usuario, "BRINDE", `Brinde na venda #${venda.id}: ${brinde.produto_nome}`, { valor: 0, vendaId: venda.id, quando });
          }
        }
        const canceladas = await all("SELECT c.venda_id, c.total, c.motivo, c.cancelado_em, c.cancelado_por, u.nome AS usuario_nome FROM vendas_canceladas c LEFT JOIN usuarios_erp u ON u.id=c.cancelado_por WHERE NOT EXISTS (SELECT 1 FROM log_atividade l WHERE l.acao='VENDA_CANCELADA' AND l.venda_id=c.venda_id)");
        for (const c of canceladas) {
          const data = new Date(String(c.cancelado_em).includes("T") || c.cancelado_em instanceof Date ? c.cancelado_em : `${String(c.cancelado_em).replace(" ", "T")}Z`);
          await registrarLog({ id: c.cancelado_por, nome: c.usuario_nome || "" }, "VENDA_CANCELADA", `Venda #${c.venda_id} cancelada. Motivo: ${c.motivo}`, { valor: Number(c.total), vendaId: c.venda_id, quando: Number.isNaN(data.getTime()) ? null : data.toISOString() });
        }
      }
      async function initialize() {
        if (USE_POSTGRES) {
          const migrationsPath = path.join("/", "supabase", "migrations");
          const migrations = fs.readdirSync(migrationsPath).filter((file) => file.endsWith(".sql")).sort();
          for (const migrationFile of migrations) {
            await db.query(fs.readFileSync(path.join(migrationsPath, migrationFile), "utf8"));
          }
        }
        if (!USE_POSTGRES) {
          await run(`CREATE TABLE IF NOT EXISTS usuarios_erp (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, departamento TEXT NOT NULL, login TEXT UNIQUE NOT NULL, senha TEXT NOT NULL)`);
          await run(`CREATE TABLE IF NOT EXISTS produtos (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, categoria TEXT NOT NULL, preco REAL NOT NULL CHECK(preco >= 0), estoque INTEGER NOT NULL DEFAULT 0, ativo INTEGER NOT NULL DEFAULT 1)`);
          await liberarEstoqueNegativoSqlite();
          await run(`CREATE TABLE IF NOT EXISTS vendas (id INTEGER PRIMARY KEY AUTOINCREMENT, total REAL NOT NULL CHECK(total >= 0), forma_pagamento TEXT NOT NULL DEFAULT 'Dinheiro', data_venda TEXT NOT NULL)`);
          await run(`CREATE TABLE IF NOT EXISTS caixa (id INTEGER PRIMARY KEY AUTOINCREMENT, venda_id INTEGER NOT NULL, valor REAL NOT NULL CHECK(valor >= 0), forma_pagamento TEXT NOT NULL, data_pagamento TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Pago')`);
          await run(`CREATE TABLE IF NOT EXISTS contas (id INTEGER PRIMARY KEY AUTOINCREMENT, descricao TEXT NOT NULL, valor REAL NOT NULL CHECK(valor >= 0), vencimento TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Pendente')`);
          await run(`CREATE TABLE IF NOT EXISTS contas_receber (id INTEGER PRIMARY KEY AUTOINCREMENT, descricao TEXT NOT NULL, categoria TEXT NOT NULL DEFAULT '', relacionado TEXT NOT NULL DEFAULT '', valor REAL NOT NULL CHECK(valor >= 0), vencimento TEXT NOT NULL, data_recebimento TEXT, status TEXT NOT NULL DEFAULT 'Pendente', forma_recebimento TEXT NOT NULL DEFAULT '', observacoes TEXT NOT NULL DEFAULT '')`);
          await run("DROP TABLE IF EXISTS beneficios");
          await run(`CREATE TABLE IF NOT EXISTS descontos (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, codigo TEXT NOT NULL UNIQUE, percentual REAL NOT NULL CHECK(percentual > 0 AND percentual <= 100), status TEXT NOT NULL DEFAULT 'Ativo', data_inicio TEXT, validade TEXT, criado_em TEXT DEFAULT CURRENT_TIMESTAMP)`);
          await run(`CREATE TABLE IF NOT EXISTS pagamento_historico (id INTEGER PRIMARY KEY AUTOINCREMENT, pagamento_id INTEGER NOT NULL, estado_anterior TEXT, estado_novo TEXT NOT NULL, operador_id INTEGER, observacao TEXT NOT NULL DEFAULT '', criado_em TEXT DEFAULT CURRENT_TIMESTAMP)`);
          await ensureColumn("descontos", "comissao_percentual", "REAL NOT NULL DEFAULT 0 CHECK(comissao_percentual >= 0 AND comissao_percentual <= 100)");
          await ensureColumn("vendas", "subtotal", "REAL NOT NULL DEFAULT 0");
          await ensureColumn("vendas", "desconto_id", "INTEGER");
          await ensureColumn("vendas", "desconto_codigo", "TEXT NOT NULL DEFAULT ''");
          await ensureColumn("vendas", "desconto_percentual", "REAL NOT NULL DEFAULT 0");
          await ensureColumn("vendas", "desconto_valor", "REAL NOT NULL DEFAULT 0");
          await ensureColumn("vendas", "status_pagamento", "TEXT NOT NULL DEFAULT 'confirmado'");
          await ensureColumn("vendas", "parcelas", "INTEGER NOT NULL DEFAULT 1");
          await ensureColumn("vendas", "forma_pagamento_detalhe", "TEXT NOT NULL DEFAULT ''");
          await ensureColumn("vendas", "cpf_nota", "TEXT CHECK(cpf_nota IS NULL OR (length(cpf_nota)=11 AND cpf_nota NOT GLOB '*[^0-9]*'))");
          await run(`CREATE TABLE IF NOT EXISTS venda_item (id INTEGER PRIMARY KEY AUTOINCREMENT, venda_id INTEGER NOT NULL REFERENCES vendas(id) ON DELETE CASCADE, produto_id INTEGER NOT NULL REFERENCES produtos(id), tipo TEXT NOT NULL DEFAULT 'VENDA' CHECK(tipo IN ('VENDA','BRINDE')), quantidade INTEGER NOT NULL CHECK(quantidade > 0), preco_unitario REAL NOT NULL CHECK(preco_unitario >= 0), CHECK(tipo <> 'BRINDE' OR (preco_unitario = 0 AND quantidade = 1)))`);
          await run("CREATE INDEX IF NOT EXISTS venda_item_venda_idx ON venda_item(venda_id)");
          await run("CREATE INDEX IF NOT EXISTS venda_item_produto_idx ON venda_item(produto_id)");
          await run("CREATE UNIQUE INDEX IF NOT EXISTS venda_item_linha_unica ON venda_item(venda_id, produto_id, tipo)");
          await run("CREATE UNIQUE INDEX IF NOT EXISTS venda_item_um_brinde_por_venda ON venda_item(venda_id) WHERE tipo='BRINDE'");
          await run(`CREATE TABLE IF NOT EXISTS movimentacao_estoque (id INTEGER PRIMARY KEY AUTOINCREMENT, produto_id INTEGER NOT NULL REFERENCES produtos(id), tipo TEXT NOT NULL CHECK(tipo IN ('ENTRADA','SAIDA','VENDA','BRINDE','DOACAO','DEVOLUCAO')), quantidade INTEGER NOT NULL, venda_id INTEGER REFERENCES vendas(id) ON DELETE SET NULL, criado_por INTEGER REFERENCES usuarios_erp(id) ON DELETE SET NULL, destino TEXT NOT NULL DEFAULT '', observacao TEXT NOT NULL DEFAULT '', criado_em TEXT DEFAULT CURRENT_TIMESTAMP, CHECK((tipo IN ('ENTRADA','DEVOLUCAO') AND quantidade > 0) OR (tipo IN ('SAIDA','VENDA','BRINDE','DOACAO') AND quantidade < 0)))`);
          const esquemaMov = await get("SELECT sql FROM sqlite_master WHERE type='table' AND name='movimentacao_estoque'");
          if (esquemaMov && !String(esquemaMov.sql).includes("DOACAO")) {
            await transaction(async () => {
              await run(`CREATE TABLE movimentacao_estoque_nova (id INTEGER PRIMARY KEY AUTOINCREMENT, produto_id INTEGER NOT NULL REFERENCES produtos(id), tipo TEXT NOT NULL CHECK(tipo IN ('ENTRADA','SAIDA','VENDA','BRINDE','DOACAO','DEVOLUCAO')), quantidade INTEGER NOT NULL, venda_id INTEGER REFERENCES vendas(id) ON DELETE SET NULL, criado_por INTEGER REFERENCES usuarios_erp(id) ON DELETE SET NULL, destino TEXT NOT NULL DEFAULT '', observacao TEXT NOT NULL DEFAULT '', criado_em TEXT DEFAULT CURRENT_TIMESTAMP, CHECK((tipo IN ('ENTRADA','DEVOLUCAO') AND quantidade > 0) OR (tipo IN ('SAIDA','VENDA','BRINDE','DOACAO') AND quantidade < 0)))`);
              await run("INSERT INTO movimentacao_estoque_nova (id,produto_id,tipo,quantidade,venda_id,criado_por,observacao,criado_em) SELECT id,produto_id,tipo,quantidade,venda_id,criado_por,observacao,criado_em FROM movimentacao_estoque");
              await run("DROP TABLE movimentacao_estoque");
              await run("ALTER TABLE movimentacao_estoque_nova RENAME TO movimentacao_estoque");
            });
          }
          await run("CREATE INDEX IF NOT EXISTS movimentacao_estoque_produto_idx ON movimentacao_estoque(produto_id)");
          await run("CREATE INDEX IF NOT EXISTS movimentacao_estoque_venda_idx ON movimentacao_estoque(venda_id)");
          const colunasDaVenda = await all("PRAGMA table_info(vendas)");
          if (colunasDaVenda.some((coluna) => coluna.name === "produto_id")) {
            await transaction(async () => {
              await run(`INSERT INTO venda_item (venda_id,produto_id,tipo,quantidade,preco_unitario)
        SELECT v.id, v.produto_id, 'VENDA', v.quantidade, ROUND(CASE WHEN v.quantidade > 0 THEN (CASE WHEN v.subtotal > 0 THEN v.subtotal ELSE v.total END) / v.quantidade ELSE 0 END, 2)
        FROM vendas v WHERE NOT EXISTS (SELECT 1 FROM venda_item i WHERE i.venda_id=v.id)`);
              await run("ALTER TABLE vendas DROP COLUMN quantidade");
              await run("ALTER TABLE vendas DROP COLUMN produto_id");
            });
          }
          await ensureColumn("contas_receber", "venda_id", "INTEGER");
          await run("CREATE UNIQUE INDEX IF NOT EXISTS contas_receber_venda_id_idx ON contas_receber(venda_id)");
          await run(`INSERT INTO contas_receber (descricao,categoria,relacionado,valor,vencimento,data_recebimento,status,forma_recebimento,observacoes,venda_id)
    SELECT 'Venda #' || v.id || ' - ' || COALESCE((SELECT p.nome FROM venda_item i JOIN produtos p ON p.id=i.produto_id WHERE i.venda_id=v.id ORDER BY i.id LIMIT 1),'Produto'), 'Venda', 'Venda #' || v.id, v.total, v.data_venda,
      CASE WHEN v.status_pagamento='confirmado' THEN v.data_venda ELSE NULL END,
      CASE WHEN v.status_pagamento='confirmado' THEN 'Recebido' WHEN v.status_pagamento IN ('cancelado','recusado') THEN 'Cancelado' ELSE 'Pendente' END,
      v.forma_pagamento, 'Acompanhamento criado automaticamente para a venda.', v.id
    FROM vendas v
    WHERE NOT EXISTS (SELECT 1 FROM contas_receber cr WHERE cr.venda_id=v.id)`);
          await run(`CREATE TABLE IF NOT EXISTS eventos (id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT NOT NULL, titulo TEXT NOT NULL, descricao TEXT NOT NULL DEFAULT '', criado_por INTEGER, criado_em TEXT DEFAULT CURRENT_TIMESTAMP)`);
          await run("DROP TABLE IF EXISTS evento_itens");
          await ensureColumn("eventos", "criado_por", "INTEGER");
          await run(`CREATE TABLE IF NOT EXISTS contas_fixas (id INTEGER PRIMARY KEY AUTOINCREMENT, descricao TEXT NOT NULL, valor REAL NOT NULL CHECK(valor >= 0), dia_vencimento INTEGER NOT NULL CHECK(dia_vencimento BETWEEN 1 AND 31), primeiro_mes TEXT NOT NULL, gerada_ate TEXT, ativa INTEGER NOT NULL DEFAULT 1, encerrada_em TEXT, criado_por INTEGER, criado_em TEXT DEFAULT CURRENT_TIMESTAMP)`);
          await ensureColumn("contas", "conta_fixa_id", "INTEGER");
          await ensureColumn("contas", "competencia", "TEXT");
          await run("CREATE UNIQUE INDEX IF NOT EXISTS contas_fixa_competencia_unica ON contas(conta_fixa_id, competencia)");
          await run(`CREATE TABLE IF NOT EXISTS eventos_anuais (id INTEGER PRIMARY KEY AUTOINCREMENT, titulo TEXT NOT NULL, descricao TEXT NOT NULL DEFAULT '', mes INTEGER NOT NULL CHECK(mes BETWEEN 1 AND 12), dia INTEGER NOT NULL CHECK(dia BETWEEN 1 AND 31), gerado_ate_ano INTEGER NOT NULL, ativo INTEGER NOT NULL DEFAULT 1, criado_por INTEGER, criado_em TEXT DEFAULT CURRENT_TIMESTAMP)`);
          await ensureColumn("eventos", "anual_id", "INTEGER");
          await ensureColumn("eventos", "ano_ocorrencia", "INTEGER");
          await ensureColumn("eventos", "data_fim", "TEXT");
          await ensureColumn("eventos", "hora_inicio", "TEXT");
          await ensureColumn("eventos", "hora_fim", "TEXT");
          await ensureColumn("eventos", "local", "TEXT NOT NULL DEFAULT ''");
          await ensureColumn("eventos", "tipo", "TEXT NOT NULL DEFAULT 'outro'");
          await ensureColumn("eventos_anuais", "duracao_dias", "INTEGER NOT NULL DEFAULT 0");
          await ensureColumn("eventos_anuais", "hora_inicio", "TEXT");
          await ensureColumn("eventos_anuais", "hora_fim", "TEXT");
          await ensureColumn("eventos_anuais", "local", "TEXT NOT NULL DEFAULT ''");
          await ensureColumn("eventos_anuais", "tipo", "TEXT NOT NULL DEFAULT 'outro'");
          await ensureColumn("vendas", "evento_id", "INTEGER");
          await run("CREATE INDEX IF NOT EXISTS vendas_evento_idx ON vendas(evento_id)");
          await ensureColumn("movimentacao_estoque", "evento_id", "INTEGER");
          await run("CREATE INDEX IF NOT EXISTS movimentacao_evento_idx ON movimentacao_estoque(evento_id)");
          await run(`UPDATE movimentacao_estoque SET evento_id=(SELECT v.evento_id FROM vendas v WHERE v.id=movimentacao_estoque.venda_id)
      WHERE venda_id IS NOT NULL AND evento_id IS NULL AND EXISTS (SELECT 1 FROM vendas v WHERE v.id=movimentacao_estoque.venda_id AND v.evento_id IS NOT NULL)`);
          await run("CREATE UNIQUE INDEX IF NOT EXISTS eventos_anual_ano_unico ON eventos(anual_id, ano_ocorrencia)");
          await run(`CREATE TABLE IF NOT EXISTS parametros (chave TEXT PRIMARY KEY, valor TEXT NOT NULL, atualizado_por INTEGER, atualizado_em TEXT DEFAULT CURRENT_TIMESTAMP)`);
          await run("DELETE FROM parametros WHERE chave='permitir_ativar_cupom_vencido'");
          await ensureColumn("produtos", "ativo", "INTEGER NOT NULL DEFAULT 1");
          await run(`CREATE TABLE IF NOT EXISTS modelos (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, categoria TEXT NOT NULL, preco REAL NOT NULL CHECK(preco >= 0), criado_em TEXT DEFAULT CURRENT_TIMESTAMP)`);
          await ensureColumn("produtos", "modelo_id", "INTEGER");
          await ensureColumn("produtos", "cor", "TEXT NOT NULL DEFAULT ''");
          await ensureColumn("produtos", "tamanho", "TEXT NOT NULL DEFAULT ''");
          await run("CREATE INDEX IF NOT EXISTS produtos_modelo_idx ON produtos(modelo_id)");
          await run("CREATE UNIQUE INDEX IF NOT EXISTS produtos_variacao_unica ON produtos(modelo_id, lower(cor), lower(tamanho)) WHERE modelo_id IS NOT NULL");
          await run(`CREATE TABLE IF NOT EXISTS fornecedor (id_fornecedor INTEGER PRIMARY KEY AUTOINCREMENT, razao_social TEXT NOT NULL, nome_fantasia TEXT NOT NULL DEFAULT '', cnpj TEXT NOT NULL UNIQUE CHECK(length(cnpj) = 14), tipo TEXT NOT NULL DEFAULT 'FORNECEDOR' CHECK(tipo IN ('FORNECEDOR','PRESTADOR_PJ')), ativo INTEGER NOT NULL DEFAULT 1)`);
          await run(`CREATE TABLE IF NOT EXISTS fornecedor_telefone (id_fornecedor INTEGER NOT NULL REFERENCES fornecedor(id_fornecedor) ON DELETE CASCADE, id_telefone INTEGER NOT NULL, codigo_pais TEXT NOT NULL, ddd TEXT NOT NULL DEFAULT '', numero TEXT NOT NULL, PRIMARY KEY (id_fornecedor, id_telefone), UNIQUE (id_fornecedor, codigo_pais, ddd, numero))`);
          await run(`CREATE TABLE IF NOT EXISTS fornecedor_email (id_fornecedor INTEGER NOT NULL REFERENCES fornecedor(id_fornecedor) ON DELETE CASCADE, id_email INTEGER NOT NULL, email TEXT NOT NULL, PRIMARY KEY (id_fornecedor, id_email), UNIQUE (id_fornecedor, email))`);
          await ensureColumn("fornecedor", "tipo", "TEXT NOT NULL DEFAULT 'FORNECEDOR' CHECK(tipo IN ('FORNECEDOR','PRESTADOR_PJ'))");
          await ensureColumn("fornecedor", "ativo", "INTEGER NOT NULL DEFAULT 1");
          await ensureColumn("contas", "id_fornecedor", "INTEGER REFERENCES fornecedor(id_fornecedor)");
          await ensureColumn("contas_fixas", "id_fornecedor", "INTEGER REFERENCES fornecedor(id_fornecedor)");
          await run(`CREATE TABLE IF NOT EXISTS cor (id_cor INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK(length(nome) BETWEEN 1 AND 30))`);
          await run(`INSERT OR IGNORE INTO cor (nome) SELECT MIN(cor) FROM produtos WHERE cor <> '' AND length(cor) <= 30 GROUP BY lower(cor)`);
          await run(`CREATE TABLE IF NOT EXISTS foto (id_foto INTEGER PRIMARY KEY AUTOINCREMENT, tipo_mime TEXT NOT NULL CHECK(tipo_mime IN ('image/jpeg','image/png','image/webp')), dados BLOB NOT NULL, tamanho INTEGER NOT NULL, criada_em TEXT DEFAULT CURRENT_TIMESTAMP)`);
          await ensureColumn("produtos", "id_foto", "INTEGER REFERENCES foto(id_foto)");
          await ensureColumn("modelos", "id_foto", "INTEGER REFERENCES foto(id_foto)");
          await run("DROP TABLE IF EXISTS postagens_atleticas");
          for (const t of ["descontos", "eventos", "modelos", "contas_fixas", "eventos_anuais"]) await renomearColuna(t, "created_at", "criado_em");
          await renomearColuna("foto", "mime", "tipo_mime");
          const telefonesRepetidos = await all("SELECT codigo_pais, ddd, numero, COUNT(*) AS qtd FROM fornecedor_telefone GROUP BY codigo_pais, ddd, numero HAVING COUNT(*) > 1");
          if (telefonesRepetidos.length) throw new Error(`H\xE1 telefones repetidos entre fornecedores (${telefonesRepetidos.map((t) => `+${t.codigo_pais} ${t.ddd} ${t.numero}`).join("; ")}). Corrija-os antes de iniciar.`);
          await run("CREATE UNIQUE INDEX IF NOT EXISTS fornecedor_telefone_numero_unico ON fornecedor_telefone(codigo_pais, ddd, numero)");
          const emailsRepetidos = await all("SELECT lower(email) AS email FROM fornecedor_email GROUP BY lower(email) HAVING COUNT(*) > 1");
          if (emailsRepetidos.length) throw new Error(`H\xE1 e-mails repetidos entre fornecedores (${emailsRepetidos.map((e) => e.email).join("; ")}). Corrija-os antes de iniciar.`);
          await run("CREATE UNIQUE INDEX IF NOT EXISTS fornecedor_email_unico ON fornecedor_email(lower(email))");
          await run(`CREATE TABLE IF NOT EXISTS vendas_canceladas (id INTEGER PRIMARY KEY AUTOINCREMENT, venda_id INTEGER NOT NULL UNIQUE, produto_id INTEGER REFERENCES produtos(id) ON DELETE SET NULL, produto_nome TEXT NOT NULL, cliente TEXT NOT NULL DEFAULT '', cpf_nota TEXT CHECK(cpf_nota IS NULL OR (length(cpf_nota)=11 AND cpf_nota NOT GLOB '*[^0-9]*')), quantidade INTEGER NOT NULL CHECK(quantidade > 0), subtotal REAL NOT NULL DEFAULT 0, desconto_codigo TEXT NOT NULL DEFAULT '', desconto_valor REAL NOT NULL DEFAULT 0, total REAL NOT NULL CHECK(total >= 0), forma_pagamento TEXT NOT NULL, data_venda TEXT NOT NULL, status_pagamento_anterior TEXT NOT NULL, valor_estornado_caixa REAL NOT NULL DEFAULT 0 CHECK(valor_estornado_caixa >= 0), estoque_devolvido INTEGER NOT NULL DEFAULT 1, motivo TEXT NOT NULL CHECK(length(motivo) BETWEEN 3 AND 300), cancelado_por INTEGER REFERENCES usuarios_erp(id) ON DELETE SET NULL, cancelado_em TEXT DEFAULT CURRENT_TIMESTAMP)`);
          await run("CREATE INDEX IF NOT EXISTS vendas_canceladas_data_idx ON vendas_canceladas(cancelado_em)");
          await ensureColumn("vendas_canceladas", "cpf_nota", "TEXT CHECK(cpf_nota IS NULL OR (length(cpf_nota)=11 AND cpf_nota NOT GLOB '*[^0-9]*'))");
          await ensureColumn("vendas_canceladas", "evento_id", "INTEGER");
          await run(`CREATE TABLE IF NOT EXISTS pagamentos (id INTEGER PRIMARY KEY AUTOINCREMENT, venda_id INTEGER, provedor TEXT NOT NULL, chave_idempotencia TEXT NOT NULL UNIQUE, estado TEXT NOT NULL, valor REAL NOT NULL CHECK(valor >= 0), resultado_codigo TEXT, mensagem TEXT NOT NULL DEFAULT '', criado_em TEXT DEFAULT CURRENT_TIMESTAMP, atualizado_em TEXT DEFAULT CURRENT_TIMESTAMP)`);
          await ensureColumn("pagamentos", "adquirente", "TEXT NOT NULL DEFAULT ''");
          await ensureColumn("pagamentos", "maquina_identificacao", "TEXT NOT NULL DEFAULT ''");
          await ensureColumn("pagamentos", "nsu", "TEXT NOT NULL DEFAULT ''");
          await ensureColumn("pagamentos", "codigo_autorizacao", "TEXT NOT NULL DEFAULT ''");
          await ensureColumn("pagamentos", "valor_aprovado", "REAL");
          await ensureColumn("pagamentos", "aprovado_em", "TEXT");
          await ensureColumn("pagamentos", "confirmado_por", "INTEGER");
          await ensureColumn("pagamentos", "confirmado_em", "TEXT");
          await ensureColumn("pagamentos", "observacoes", "TEXT NOT NULL DEFAULT ''");
          await ensureColumn("pagamentos", "estado_repasse", "TEXT NOT NULL DEFAULT 'nao_aplicavel'");
          await ensureColumn("vendas", "usuario_id", "INTEGER REFERENCES usuarios_erp(id) ON DELETE SET NULL");
          await ensureColumn("vendas", "criado_em", "TEXT");
          await run(`CREATE TABLE IF NOT EXISTS log_atividade (id INTEGER PRIMARY KEY AUTOINCREMENT, criado_em TEXT NOT NULL, usuario_id INTEGER, usuario_nome TEXT NOT NULL DEFAULT '', acao TEXT NOT NULL CHECK(acao IN (${ACOES_LOG.map((a) => `'${a}'`).join(",")})), descricao TEXT NOT NULL, valor REAL, venda_id INTEGER)`);
          await run("CREATE INDEX IF NOT EXISTS log_atividade_criado_em_idx ON log_atividade(criado_em)");
          await run("CREATE INDEX IF NOT EXISTS log_atividade_acao_idx ON log_atividade(acao, venda_id)");
          const esquemaLog = await get("SELECT sql FROM sqlite_master WHERE type='table' AND name='log_atividade'");
          if (!ACOES_LOG.every((acao) => String(esquemaLog.sql).includes(`'${acao}'`))) {
            await transaction(async () => {
              await run(`CREATE TABLE log_atividade_nova (id INTEGER PRIMARY KEY AUTOINCREMENT, criado_em TEXT NOT NULL, usuario_id INTEGER, usuario_nome TEXT NOT NULL DEFAULT '', acao TEXT NOT NULL CHECK(acao IN (${ACOES_LOG.map((x) => `'${x}'`).join(",")})), descricao TEXT NOT NULL, valor REAL, venda_id INTEGER)`);
              await run("INSERT INTO log_atividade_nova SELECT id,criado_em,usuario_id,usuario_nome,acao,descricao,valor,venda_id FROM log_atividade");
              await run("DROP TABLE log_atividade");
              await run("ALTER TABLE log_atividade_nova RENAME TO log_atividade");
              await run("CREATE INDEX IF NOT EXISTS log_atividade_criado_em_idx ON log_atividade(criado_em)");
              await run("CREATE INDEX IF NOT EXISTS log_atividade_acao_idx ON log_atividade(acao, venda_id)");
            });
          }
          const tinhaPermissoes = await get("SELECT name FROM sqlite_master WHERE type='table' AND name='usuario_permissao'");
          await run(`CREATE TABLE IF NOT EXISTS usuario_permissao (usuario_id INTEGER NOT NULL REFERENCES usuarios_erp(id) ON DELETE CASCADE, tela TEXT NOT NULL CHECK(length(tela) BETWEEN 1 AND 40), pode_editar INTEGER NOT NULL DEFAULT 0 CHECK(pode_editar IN (0,1)), PRIMARY KEY (usuario_id, tela))`);
          if (!tinhaPermissoes) {
            for (const u of await all("SELECT id,login,departamento FROM usuarios_erp")) if (!isAdminUser(u)) await gravarPermissoes(u.id, PERMISSOES_PADRAO);
          }
          const temFuncionarioAntigo = await get("SELECT name FROM sqlite_master WHERE type='table' AND name='funcionario_clt'");
          const temFuncionario = await get("SELECT name FROM sqlite_master WHERE type='table' AND name='funcionario'");
          if (temFuncionarioAntigo && !temFuncionario) await run("ALTER TABLE funcionario_clt RENAME TO funcionario");
          await run(`CREATE TABLE IF NOT EXISTS funcionario (id INTEGER PRIMARY KEY AUTOINCREMENT, nome_completo TEXT NOT NULL CHECK(length(nome_completo) BETWEEN 5 AND 150), cpf TEXT NOT NULL UNIQUE CHECK(length(cpf)=11 AND cpf NOT GLOB '*[^0-9]*'), cargo TEXT NOT NULL DEFAULT '', data_admissao TEXT, salario_bruto REAL NOT NULL CHECK(salario_bruto > 0), dependentes_irrf INTEGER NOT NULL DEFAULT 0 CHECK(dependentes_irrf BETWEEN 0 AND 20), pensao_alimenticia REAL NOT NULL DEFAULT 0 CHECK(pensao_alimenticia >= 0), recebe_vt INTEGER NOT NULL DEFAULT 0, descontar_vt INTEGER NOT NULL DEFAULT 1, vt_valor_diario REAL NOT NULL DEFAULT 0 CHECK(vt_valor_diario >= 0), vt_dias_uteis INTEGER NOT NULL DEFAULT 22 CHECK(vt_dias_uteis BETWEEN 0 AND 31), alimentacao_valor REAL NOT NULL DEFAULT 0 CHECK(alimentacao_valor >= 0), alimentacao_desconto_percentual REAL NOT NULL DEFAULT 0 CHECK(alimentacao_desconto_percentual BETWEEN 0 AND 20), outros_descontos REAL NOT NULL DEFAULT 0 CHECK(outros_descontos >= 0), outros_descontos_descricao TEXT NOT NULL DEFAULT '', ativo INTEGER NOT NULL DEFAULT 1, criado_em TEXT DEFAULT CURRENT_TIMESTAMP)`);
          await run("CREATE TABLE IF NOT EXISTS clt_tabela (ano INTEGER PRIMARY KEY CHECK(ano BETWEEN 2020 AND 2100), dados TEXT NOT NULL, atualizado_por INTEGER REFERENCES usuarios_erp(id) ON DELETE SET NULL, atualizado_em TEXT DEFAULT CURRENT_TIMESTAMP)");
          for (const [coluna, definicao] of COLUNAS_NOVAS_FUNCIONARIO) await ensureColumn("funcionario", coluna, definicao);
          await run(`CREATE TABLE IF NOT EXISTS funcionario_telefone (id_funcionario INTEGER NOT NULL REFERENCES funcionario(id) ON DELETE CASCADE, id_telefone INTEGER NOT NULL, tipo TEXT NOT NULL DEFAULT 'Celular' CHECK(tipo IN (${TIPOS_TELEFONE_FUNCIONARIO.map((t) => `'${t}'`).join(",")})), codigo_pais TEXT NOT NULL, ddd TEXT NOT NULL DEFAULT '', numero TEXT NOT NULL, PRIMARY KEY (id_funcionario, id_telefone), UNIQUE (id_funcionario, codigo_pais, ddd, numero))`);
          await run(`CREATE TABLE IF NOT EXISTS funcionario_email (id_funcionario INTEGER NOT NULL REFERENCES funcionario(id) ON DELETE CASCADE, id_email INTEGER NOT NULL, tipo TEXT NOT NULL DEFAULT 'Pessoal' CHECK(tipo IN (${TIPOS_EMAIL_FUNCIONARIO.map((t) => `'${t}'`).join(",")})), email TEXT NOT NULL, PRIMARY KEY (id_funcionario, id_email), UNIQUE (id_funcionario, email))`);
          await run(`CREATE TABLE IF NOT EXISTS empresa (id INTEGER PRIMARY KEY CHECK(id = 1), razao_social TEXT NOT NULL DEFAULT '', nome_fantasia TEXT NOT NULL DEFAULT '', cnpj TEXT NOT NULL DEFAULT '' CHECK(cnpj = '' OR length(cnpj) = 14), endereco TEXT NOT NULL DEFAULT '', cidade TEXT NOT NULL DEFAULT '', uf TEXT NOT NULL DEFAULT '', telefone TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', atualizado_em TEXT DEFAULT CURRENT_TIMESTAMP)`);
          await ensureColumn("contas", "categoria", "TEXT NOT NULL DEFAULT ''");
          await ensureColumn("contas_fixas", "categoria", "TEXT NOT NULL DEFAULT ''");
          await ensureColumn("contas", "observacoes", "TEXT NOT NULL DEFAULT ''");
          await ensureColumn("contas", "data_pagamento", "TEXT");
          await ensureColumn("contas", "forma_pagamento", "TEXT NOT NULL DEFAULT ''");
          await run("CREATE TABLE IF NOT EXISTS categoria_produto (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL UNIQUE COLLATE NOCASE CHECK(length(nome) BETWEEN 1 AND 40), criado_em TEXT DEFAULT CURRENT_TIMESTAMP)");
          await run("CREATE TABLE IF NOT EXISTS tipo_evento (id INTEGER PRIMARY KEY AUTOINCREMENT, chave TEXT NOT NULL UNIQUE, nome TEXT NOT NULL UNIQUE COLLATE NOCASE CHECK(length(nome) BETWEEN 1 AND 40), cor TEXT NOT NULL DEFAULT '#94a3b8' CHECK(length(cor) = 7), criado_em TEXT DEFAULT CURRENT_TIMESTAMP)");
          await run(`CREATE TABLE IF NOT EXISTS ficha_custo (id INTEGER PRIMARY KEY AUTOINCREMENT,
      modelo_id INTEGER UNIQUE REFERENCES modelos(id) ON DELETE CASCADE, produto_id INTEGER UNIQUE REFERENCES produtos(id) ON DELETE CASCADE,
      imposto_pct REAL CHECK(imposto_pct IS NULL OR (imposto_pct >= 0 AND imposto_pct < 100)), taxa_pct REAL CHECK(taxa_pct IS NULL OR (taxa_pct >= 0 AND taxa_pct < 100)),
      comissao_pct REAL CHECK(comissao_pct IS NULL OR (comissao_pct >= 0 AND comissao_pct < 100)), despesas_pct REAL CHECK(despesas_pct IS NULL OR (despesas_pct >= 0 AND despesas_pct < 100)),
      margem_pct REAL CHECK(margem_pct IS NULL OR (margem_pct >= 0 AND margem_pct < 100)), arredondamento TEXT CHECK(arredondamento IS NULL OR arredondamento IN ('90','inteiro','centavo')),
      observacoes TEXT NOT NULL DEFAULT '', atualizado_por INTEGER, atualizado_em TEXT DEFAULT CURRENT_TIMESTAMP,
      CHECK((modelo_id IS NULL) <> (produto_id IS NULL)))`);
          await run(`CREATE TABLE IF NOT EXISTS ficha_custo_item (id INTEGER PRIMARY KEY AUTOINCREMENT, ficha_id INTEGER NOT NULL REFERENCES ficha_custo(id) ON DELETE CASCADE,
      ordem INTEGER NOT NULL DEFAULT 0, etapa TEXT NOT NULL CHECK(length(etapa) BETWEEN 1 AND 30), descricao TEXT NOT NULL DEFAULT '' CHECK(length(descricao) <= 80),
      quantidade REAL NOT NULL CHECK(quantidade > 0), unidade TEXT NOT NULL CHECK(unidade IN ('m','kg','un','pe\xE7a','hora')),
      valor_unitario REAL NOT NULL CHECK(valor_unitario >= 0), rendimento REAL NOT NULL DEFAULT 1 CHECK(rendimento > 0))`);
          await run("CREATE INDEX IF NOT EXISTS ficha_custo_item_ficha_idx ON ficha_custo_item(ficha_id)");
          await run(`CREATE TABLE IF NOT EXISTS holerite (id INTEGER PRIMARY KEY AUTOINCREMENT, funcionario_id INTEGER NOT NULL REFERENCES funcionario(id) ON DELETE RESTRICT, competencia TEXT NOT NULL CHECK(length(competencia) = 7), tipo_vinculo TEXT NOT NULL CHECK(tipo_vinculo IN ('CLT','PJ')), variaveis TEXT NOT NULL DEFAULT '{}', dados TEXT NOT NULL, total_proventos REAL NOT NULL CHECK(total_proventos >= 0), total_descontos REAL NOT NULL CHECK(total_descontos >= 0), liquido REAL NOT NULL CHECK(liquido >= 0), conta_id INTEGER REFERENCES contas(id) ON DELETE SET NULL, gerado_por INTEGER REFERENCES usuarios_erp(id) ON DELETE SET NULL, gerado_em TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE (funcionario_id, competencia))`);
        }
        await prepararCatalogos();
        await completarHistoricoAntigo();
        const count = await get("SELECT COUNT(*) AS count FROM usuarios_erp");
        if (Number(count.count) === 0 && process.env.SEED_ADMIN_PASSWORD) {
          await run("INSERT INTO usuarios_erp (nome, departamento, login, senha) VALUES (?, ?, ?, ?)", ["Administrador ERP", "Diretoria", "admin", hashPassword(process.env.SEED_ADMIN_PASSWORD)]);
        }
        await tentarGerarRecorrencias(true);
      }
      app.post("/api/login", async (req, res) => {
        try {
          const login = normalizeLogin(req.body.login);
          const senha = String(req.body.senha || "");
          if (!login || !senha) return res.status(400).json({ error: "Informe login e senha." });
          const row = await get("SELECT id,nome,departamento,login,senha FROM usuarios_erp WHERE lower(login)=?", [login]);
          if (!row || !verifyPassword(senha, row.senha)) return res.status(401).json({ error: "Usu\xE1rio ou senha incorretos." });
          if (!row.senha.startsWith("scrypt$")) await run("UPDATE usuarios_erp SET senha=? WHERE id=?", [hashPassword(senha), row.id]);
          const user = { ...publicUser(row), admin: isAdminUser(row), permissoes: isAdminUser(row) ? {} : await permissoesDoUsuario(row.id) };
          res.json({ ...user, token: issueSession(user) });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.post("/api/logout", requireAuth, (req, res) => {
        sessions.delete(getBearer(req));
        res.json({ mensagem: "Sess\xE3o encerrada." });
      });
      app.get("/api/me", requireAuth, (req, res) => res.json(req.user));
      app.get("/api/usuarios", requireAuth, requireVer("log"), async (req, res) => {
        try {
          const usuarios = await all("SELECT id,nome,departamento,login FROM usuarios_erp ORDER BY nome");
          if (isAdminUser(req.user)) for (const u of usuarios) {
            u.admin = isAdminUser(u);
            u.permissoes = u.admin ? {} : await permissoesDoUsuario(u.id);
          }
          res.json(usuarios);
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.get("/api/permissoes/telas", requireAuth, (req, res) => res.json({ telas: TELAS_PERMISSAO, padrao: PERMISSOES_PADRAO }));
      app.put("/api/usuarios/:id/permissoes", requireAuth, requireAdmin, async (req, res) => {
        const mapa = normalizarPermissoes(req.body?.permissoes);
        if (!mapa) return res.status(400).json({ error: "Permiss\xF5es inv\xE1lidas." });
        try {
          const usuario = await get("SELECT id,nome,login,departamento FROM usuarios_erp WHERE id=?", [req.params.id]);
          if (!usuario) return res.status(404).json({ error: "Usu\xE1rio n\xE3o encontrado." });
          if (isAdminUser(usuario)) return res.status(400).json({ error: "O administrador j\xE1 tem acesso a tudo." });
          await transaction(async () => {
            await gravarPermissoes(usuario.id, mapa);
            const resumo = Object.entries(mapa).map(([t, n]) => `${TELAS_POR_CHAVE.get(t).nome}${n === "editar" ? " (editar)" : ""}`).join(", ") || "nenhuma tela";
            await registrarLog(req.user, "PERMISSAO", `Permiss\xF5es de ${usuario.nome} (${usuario.login}): ${resumo}`);
          });
          atualizarSessoesDoUsuario(usuario.id, mapa);
          res.json({ mensagem: "Permiss\xF5es atualizadas.", permissoes: mapa });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.post("/api/usuarios", requireAuth, requireAdmin, async (req, res) => {
        const { nome, departamento, login, senha } = req.body;
        if (!String(nome || "").trim() || !String(departamento || "").trim() || !/^[a-zA-Z0-9._-]{3,40}$/.test(String(login || "").trim()) || String(senha || "").length < 6) return res.status(400).json({ error: "Informe nome, departamento, login v\xE1lido e senha com pelo menos 6 caracteres." });
        const mapa = req.body.permissoes === void 0 ? { ...PERMISSOES_PADRAO } : normalizarPermissoes(req.body.permissoes);
        if (!mapa) return res.status(400).json({ error: "Permiss\xF5es inv\xE1lidas." });
        try {
          const r = await transaction(async () => {
            const novo = await run("INSERT INTO usuarios_erp (nome,departamento,login,senha) VALUES (?,?,?,?)", [String(nome).trim(), String(departamento).trim(), normalizeLogin(login), hashPassword(senha)]);
            if (!isAdminUser({ login: normalizeLogin(login), departamento })) await gravarPermissoes(novo.lastID, mapa);
            await registrarLog(req.user, "USUARIO", `Usu\xE1rio criado: ${String(nome).trim()} (${normalizeLogin(login)}), ${String(departamento).trim()}`);
            return novo;
          });
          res.status(201).json({ id: r.lastID });
        } catch (e) {
          if (await get("SELECT id FROM usuarios_erp WHERE lower(login)=?", [normalizeLogin(login)]).catch(() => null)) return res.status(409).json({ error: `O login "${normalizeLogin(login)}" j\xE1 existe. Use outro login ou redefina a senha desse usu\xE1rio na lista.` });
          errorResponse(res, e);
        }
      });
      app.put("/api/usuarios/:id/senha", requireAuth, requireAdmin, async (req, res) => {
        const senha = String(req.body?.senha ?? "");
        if (senha.length < 6 || senha.length > 200) return res.status(400).json({ error: "A senha precisa ter pelo menos 6 caracteres." });
        try {
          const usuario = await get("SELECT id,nome,login FROM usuarios_erp WHERE id=?", [req.params.id]);
          if (!usuario) return res.status(404).json({ error: "Usu\xE1rio n\xE3o encontrado." });
          await run("UPDATE usuarios_erp SET senha=? WHERE id=?", [hashPassword(senha), usuario.id]);
          if (Number(usuario.id) !== Number(req.user.id)) encerrarSessoesDoUsuario(usuario.id);
          await registrarLog(req.user, "USUARIO", `Senha redefinida: ${usuario.nome} (${usuario.login})`);
          res.json({ mensagem: `Senha de ${usuario.nome} redefinida. O login \xE9 "${usuario.login}".` });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.delete("/api/usuarios/:id", requireAuth, requireAdmin, async (req, res) => {
        try {
          const user = await get("SELECT id,login,nome FROM usuarios_erp WHERE id=?", [req.params.id]);
          if (!user) return res.status(404).json({ error: "Usu\xE1rio n\xE3o encontrado." });
          const count = await get("SELECT COUNT(*) AS total FROM usuarios_erp");
          if (user.login === "admin" || Number(count.total) <= 1) return res.status(400).json({ error: "N\xE3o \xE9 poss\xEDvel excluir o administrador principal." });
          await run("DELETE FROM usuario_permissao WHERE usuario_id=?", [req.params.id]);
          await run("DELETE FROM usuarios_erp WHERE id=?", [req.params.id]);
          encerrarSessoesDoUsuario(req.params.id);
          await registrarLog(req.user, "USUARIO", `Usu\xE1rio exclu\xEDdo: ${user.nome} (${user.login})`);
          res.json({ mensagem: "Usu\xE1rio exclu\xEDdo com sucesso." });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.get("/api/produtos", requireAuth, async (req, res) => {
        try {
          const linhas = await all("SELECT p.*, COALESCE(p.id_foto, m.id_foto) AS id_foto_efetivo FROM produtos p LEFT JOIN modelos m ON m.id = p.modelo_id ORDER BY p.nome");
          res.json(linhas.map((l) => ({ ...l, id_foto: l.id_foto == null ? null : Number(l.id_foto), id_foto_efetivo: l.id_foto_efetivo == null ? null : Number(l.id_foto_efetivo) })));
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.post("/api/produtos", requireAuth, requireEditar("estoque"), async (req, res) => {
        const nome = String(req.body.nome || "").trim();
        let categoria = String(req.body.categoria || "").trim(), preco = parseMoney(req.body.preco);
        if (!nome || !categoria || preco === null || categoria.length > 40) return res.status(400).json({ error: "Nome, categoria (at\xE9 40 caracteres) e pre\xE7o v\xE1lido s\xE3o obrigat\xF3rios. Use no m\xE1ximo duas casas decimais." });
        try {
          categoria = await garantirCategoria(categoria);
          const r = await transaction(async () => {
            const novo = await run("INSERT INTO produtos (nome,categoria,preco,estoque,ativo) VALUES (?,?,?,0,?)", [nome, categoria, preco, toDbBool(true)]);
            await registrarLog(req.user, "PRODUTO", `Produto cadastrado: ${nome} (${categoria})`, { valor: preco });
            return novo;
          });
          res.status(201).json({ id: r.lastID });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.put("/api/produtos/:id/estoque", requireAuth, requireEditar("estoque"), async (req, res) => {
        const quantidade = parseInteiro(req.body.quantidade), tipo = req.body.tipo;
        if (quantidade === null || quantidade <= 0 || !["Entrada", "Sa\xEDda"].includes(tipo)) return res.status(400).json({ error: "Tipo e quantidade inteira positiva s\xE3o obrigat\xF3rios." });
        try {
          const produto = await get("SELECT id,nome,ativo FROM produtos WHERE id=?", [req.params.id]);
          if (!produto) return res.status(404).json({ error: "Produto n\xE3o encontrado." });
          if (!produto.ativo) return res.status(409).json({ error: "Produto inativo n\xE3o recebe movimenta\xE7\xF5es. Reative-o para continuar." });
          const permitirNegativo = await lerParametro("permitir_estoque_negativo");
          await transaction(async () => {
            const r = tipo === "Entrada" ? await run("UPDATE produtos SET estoque=estoque+? WHERE id=?", [quantidade, req.params.id]) : permitirNegativo ? await run("UPDATE produtos SET estoque=estoque-? WHERE id=?", [quantidade, req.params.id]) : await run("UPDATE produtos SET estoque=estoque-? WHERE id=? AND estoque>=?", [quantidade, req.params.id, quantidade]);
            if (!r.changes) throw Object.assign(new Error("Produto inexistente ou estoque insuficiente."), { statusCode: 400 });
            await registrarMovimentacao(Number(req.params.id), tipo === "Entrada" ? "ENTRADA" : "SAIDA", tipo === "Entrada" ? quantidade : -quantidade, { usuarioId: req.user.id, observacao: "Movimenta\xE7\xE3o manual de estoque" });
            await registrarLog(req.user, tipo === "Entrada" ? "ENTRADA" : "SAIDA", `${tipo} de estoque: ${produto.nome} (${tipo === "Entrada" ? "+" : "-"}${quantidade})`);
          });
          res.json({ mensagem: "Estoque atualizado." });
        } catch (e) {
          if (e.statusCode) return res.status(e.statusCode).json({ error: e.message });
          errorResponse(res, e);
        }
      });
      app.post("/api/estoque/lote", requireAuth, requireEditar("estoque"), async (req, res) => {
        const tipo = req.body?.tipo;
        const itensBrutos = Array.isArray(req.body?.itens) ? req.body.itens : [];
        if (!["Entrada", "Sa\xEDda"].includes(tipo)) return res.status(400).json({ error: "Tipo deve ser Entrada ou Sa\xEDda." });
        if (!itensBrutos.length || itensBrutos.length > 300) return res.status(400).json({ error: "Informe de 1 a 300 pe\xE7as." });
        const pedidos = /* @__PURE__ */ new Map();
        for (const bruto of itensBrutos) {
          const id = parseInteiro(bruto?.produto_id), quantidade = parseInteiro(bruto?.quantidade);
          if (id === null || id <= 0 || quantidade === null || quantidade <= 0 || quantidade > 1e5) return res.status(400).json({ error: "Cada pe\xE7a precisa de uma quantidade inteira maior que zero." });
          pedidos.set(id, (pedidos.get(id) || 0) + quantidade);
        }
        try {
          const permitirNegativo = await lerParametro("permitir_estoque_negativo");
          const entra = tipo === "Entrada";
          const resultado = await transaction(async () => {
            let unidades = 0;
            for (const [id, quantidade] of pedidos) {
              const produto = await get("SELECT id,nome,ativo,estoque FROM produtos WHERE id=?", [id]);
              if (!produto) throw Object.assign(new Error(`Produto #${id} n\xE3o encontrado.`), { statusCode: 404 });
              if (!fromDbBool(produto.ativo)) throw Object.assign(new Error(`${produto.nome} est\xE1 inativo. Reative-o para movimentar.`), { statusCode: 409 });
              const r = entra ? await run("UPDATE produtos SET estoque=estoque+? WHERE id=?", [quantidade, id]) : permitirNegativo ? await run("UPDATE produtos SET estoque=estoque-? WHERE id=?", [quantidade, id]) : await run("UPDATE produtos SET estoque=estoque-? WHERE id=? AND estoque>=?", [quantidade, id, quantidade]);
              if (!r.changes) throw Object.assign(new Error(`Estoque insuficiente de ${produto.nome} (h\xE1 ${produto.estoque}, a sa\xEDda pede ${quantidade}).`), { statusCode: 400 });
              await registrarMovimentacao(id, entra ? "ENTRADA" : "SAIDA", entra ? quantidade : -quantidade, { usuarioId: req.user.id, observacao: `${tipo} em lote` });
              await registrarLog(req.user, entra ? "ENTRADA" : "SAIDA", `${tipo} de estoque: ${produto.nome} (${entra ? "+" : "-"}${quantidade})`);
              unidades += quantidade;
            }
            return unidades;
          });
          res.json({ mensagem: `${tipo} lan\xE7ada: ${pedidos.size} ${pedidos.size === 1 ? "pe\xE7a" : "pe\xE7as"}, ${entra ? "+" : "-"}${resultado} ${resultado === 1 ? "unidade" : "unidades"}.`, pecas: pedidos.size, unidades: resultado });
        } catch (e) {
          if (e.statusCode) return res.status(e.statusCode).json({ error: e.message });
          errorResponse(res, e);
        }
      });
      app.get("/api/movimentacoes-estoque", requireAuth, requireVer("estoque", "movimentar"), async (req, res) => {
        const tipo = String(req.query.tipo || "").toUpperCase();
        const produtoId = parseInteiro(req.query.produto_id);
        const limite = Math.min(500, Math.max(1, parseInteiro(req.query.limite) || 200));
        const filtros = [];
        const params = [];
        if (["ENTRADA", "SAIDA", "VENDA", "BRINDE", "DOACAO", "DEVOLUCAO"].includes(tipo)) {
          filtros.push("m.tipo=?");
          params.push(tipo);
        }
        if (produtoId) {
          filtros.push("m.produto_id=?");
          params.push(produtoId);
        }
        const onde = String(req.query.evento || req.query.evento_id || "");
        if (onde === "loja") filtros.push("m.evento_id IS NULL");
        else if (onde === "eventos") filtros.push("m.evento_id IS NOT NULL");
        else if (parseInteiro(onde)) {
          filtros.push("m.evento_id=?");
          params.push(parseInteiro(onde));
        }
        try {
          res.json(await all(`SELECT m.id,m.produto_id,p.nome AS produto_nome,m.tipo,m.quantidade,m.venda_id,m.destino,m.observacao,m.criado_em,u.nome AS usuario_nome,m.evento_id,ev.titulo AS evento_titulo FROM movimentacao_estoque m JOIN produtos p ON p.id=m.produto_id LEFT JOIN eventos ev ON ev.id=m.evento_id LEFT JOIN usuarios_erp u ON u.id=m.criado_por ${filtros.length ? `WHERE ${filtros.join(" AND ")}` : ""} ORDER BY m.id DESC LIMIT ?`, [...params, limite]));
        } catch (e) {
          errorResponse(res, e);
        }
      });
      var TIPOS_MOVIMENTAR = { DOACAO: "Doa\xE7\xE3o", BRINDE: "Brinde", ENTRADA: "Entrada", SAIDA: "Sa\xEDda" };
      var REGISTRADO_MOVIMENTAR = { DOACAO: "Doa\xE7\xE3o registrada", BRINDE: "Brinde registrado", ENTRADA: "Entrada registrada", SAIDA: "Sa\xEDda registrada" };
      app.post("/api/movimentacoes-estoque", requireAuth, requireEditar("movimentar"), async (req, res) => {
        const tipo = String(req.body?.tipo || "").toUpperCase();
        const produtoId = parseInteiro(req.body?.produto_id);
        const quantidade = parseInteiro(req.body?.quantidade);
        const destino = String(req.body?.destino ?? "").trim();
        const observacao = String(req.body?.observacao ?? "").trim();
        if (!TIPOS_MOVIMENTAR[tipo]) return res.status(400).json({ error: "Escolha o tipo: Doa\xE7\xE3o, Brinde, Entrada ou Sa\xEDda." });
        if (produtoId === null || produtoId <= 0 || quantidade === null || quantidade <= 0 || quantidade > 1e5) return res.status(400).json({ error: "Escolha o produto e informe uma quantidade inteira maior que zero." });
        if (destino.length > 150 || observacao.length > 300) return res.status(400).json({ error: "Destino at\xE9 150 caracteres e observa\xE7\xE3o at\xE9 300." });
        if (tipo === "DOACAO" && !destino) return res.status(400).json({ error: "Informe para quem ou para onde foi a doa\xE7\xE3o." });
        try {
          const produto = await get("SELECT id,nome,preco,ativo FROM produtos WHERE id=?", [produtoId]);
          if (!produto) return res.status(404).json({ error: "Produto n\xE3o encontrado." });
          if (!fromDbBool(produto.ativo)) return res.status(409).json({ error: "Produto inativo n\xE3o recebe movimenta\xE7\xF5es. Reative-o para continuar." });
          const temEvento = req.body?.evento_id !== void 0 && req.body?.evento_id !== null && req.body?.evento_id !== "";
          const eventoId = temEvento ? parseInteiro(req.body.evento_id) : null;
          if (temEvento && (eventoId === null || eventoId <= 0)) return res.status(400).json({ error: "Evento inv\xE1lido." });
          const evento = eventoId ? await get("SELECT id,titulo FROM eventos WHERE id=?", [eventoId]) : null;
          if (eventoId && !evento) return res.status(404).json({ error: "Evento n\xE3o encontrado." });
          const entra = tipo === "ENTRADA";
          const permitirNegativo = await lerParametro("permitir_estoque_negativo");
          const resultado = await transaction(async () => {
            const r = entra ? await run("UPDATE produtos SET estoque=estoque+? WHERE id=?", [quantidade, produtoId]) : permitirNegativo ? await run("UPDATE produtos SET estoque=estoque-? WHERE id=?", [quantidade, produtoId]) : await run("UPDATE produtos SET estoque=estoque-? WHERE id=? AND estoque>=?", [quantidade, produtoId, quantidade]);
            if (!r.changes) throw Object.assign(new Error(`Estoque insuficiente de ${produto.nome}.`), { statusCode: 400 });
            await registrarMovimentacao(produtoId, tipo, entra ? quantidade : -quantidade, { usuarioId: req.user.id, destino, observacao: observacao || `${REGISTRADO_MOVIMENTAR[tipo]} em Movimentar`, eventoId });
            const sinal = entra ? "+" : "-";
            await registrarLog(req.user, tipo, `${TIPOS_MOVIMENTAR[tipo]}: ${produto.nome} (${sinal}${quantidade})${destino ? ` | destino: ${destino}` : ""}${observacao ? ` | ${observacao}` : ""}${evento ? ` | evento: ${evento.titulo}` : ""}`, { valor: ["DOACAO", "BRINDE"].includes(tipo) ? 0 : null });
            return await get("SELECT estoque FROM produtos WHERE id=?", [produtoId]);
          });
          res.status(201).json({ mensagem: `${REGISTRADO_MOVIMENTAR[tipo]}.`, estoque: Number(resultado.estoque) });
        } catch (e) {
          if (e.statusCode) return res.status(e.statusCode).json({ error: e.message });
          errorResponse(res, e);
        }
      });
      var FUSO_LOJA = "America/Sao_Paulo";
      function instanteDe(valor) {
        if (!valor) return null;
        if (valor instanceof Date) return valor;
        const texto = String(valor);
        const data = new Date(/[T]/.test(texto) ? texto : `${texto.replace(" ", "T")}Z`);
        return Number.isNaN(data.getTime()) ? null : data;
      }
      function diaNaLoja(instante) {
        return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO_LOJA, year: "numeric", month: "2-digit", day: "2-digit" }).format(instante);
      }
      function somarDias(dia, n) {
        const d = /* @__PURE__ */ new Date(`${dia}T12:00:00Z`);
        d.setUTCDate(d.getUTCDate() + n);
        return d.toISOString().slice(0, 10);
      }
      var centavos = (v) => Math.round(Number(v || 0) * 100) / 100;
      var semAcentoServidor = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
      async function montarRelatorioSaidas({ inicio, fim, busca = "", categoria = "", pagamento = "" }) {
        const termo = semAcentoServidor(busca).trim();
        const produtoCombina = (nome, cat) => (!termo || semAcentoServidor(`${nome} ${cat}`).includes(termo)) && (!categoria || cat === categoria);
        const produtosAtuais = await all("SELECT id,nome,categoria,preco,estoque,ativo FROM produtos");
        const porId = new Map(produtosAtuais.map((p) => [Number(p.id), p]));
        const vendasBrutas = await all(`SELECT v.id,v.data_venda,v.criado_em,v.total,v.subtotal,v.desconto_valor,v.desconto_codigo,v.forma_pagamento,v.forma_pagamento_detalhe,v.parcelas,v.status_pagamento,
      uv.nome AS vendedor_nome, vc.motivo AS motivo_cancelamento, vc.cancelado_em, v.evento_id, ev.titulo AS evento_titulo
    FROM vendas v LEFT JOIN usuarios_erp uv ON uv.id=v.usuario_id LEFT JOIN vendas_canceladas vc ON vc.venda_id=v.id LEFT JOIN eventos ev ON ev.id=v.evento_id
    WHERE v.data_venda>=? AND v.data_venda<=? ORDER BY v.id`, [inicio, fim]);
        const itensPorVenda = await itensDasVendas(vendasBrutas.map((v) => v.id));
        const partesPorVenda = await partesDasVendas(vendasBrutas);
        const vendas = [];
        for (const v of vendasBrutas) {
          const itens = (itensPorVenda.get(Number(v.id)) || []).map((i) => ({
            produto_id: Number(i.produto_id),
            produto_nome: i.produto_nome,
            categoria: i.produto_categoria || "",
            tipo: i.tipo,
            quantidade: i.quantidade,
            preco_unitario: centavos(i.preco_unitario),
            valor: centavos(i.quantidade * i.preco_unitario)
          }));
          if ((termo || categoria) && !itens.some((i) => produtoCombina(i.produto_nome, i.categoria))) continue;
          if (pagamento && v.forma_pagamento !== pagamento && !partesDe(v, partesPorVenda).some((p) => p.forma === pagamento)) continue;
          const estado = v.status_pagamento === "confirmado" ? "aprovado" : v.status_pagamento;
          const cancelada = Boolean(v.cancelado_em) || ["cancelado", "recusado"].includes(estado);
          const instante = instanteDe(v.criado_em);
          vendas.push({
            id: Number(v.id),
            data: diaIso(v.data_venda),
            quando: instante ? instante.toISOString() : null,
            vendedor_nome: v.vendedor_nome || "",
            forma_pagamento: v.forma_pagamento || "Dinheiro",
            forma_pagamento_detalhe: v.forma_pagamento_detalhe || "",
            pagamentos: partesDe(v, partesPorVenda),
            parcelas: Number(v.parcelas || 1),
            subtotal: centavos(v.subtotal ?? v.total),
            desconto_valor: centavos(v.desconto_valor),
            desconto_codigo: v.desconto_codigo || "",
            total: centavos(v.total),
            status: estado || "aprovado",
            cancelada,
            motivo_cancelamento: v.motivo_cancelamento || "",
            itens,
            evento_id: v.evento_id ? Number(v.evento_id) : null,
            evento_titulo: v.evento_titulo || ""
          });
        }
        const movs = await all(`SELECT m.id,m.produto_id,p.nome AS produto_nome,p.categoria,m.tipo,m.quantidade,m.destino,m.observacao,m.criado_em,u.nome AS usuario_nome,ev.titulo AS evento_titulo
    FROM movimentacao_estoque m JOIN produtos p ON p.id=m.produto_id LEFT JOIN usuarios_erp u ON u.id=m.criado_por LEFT JOIN eventos ev ON ev.id=m.evento_id
    WHERE m.venda_id IS NULL AND m.tipo IN ('BRINDE','DOACAO','SAIDA') AND m.criado_em>=? AND m.criado_em<? ORDER BY m.id`, [somarDias(inicio, -1), somarDias(fim, 2)]);
        const avulsas = [];
        for (const m of movs) {
          const instante = instanteDe(m.criado_em);
          if (!instante) continue;
          const dia = diaNaLoja(instante);
          if (dia < inicio || dia > fim || !produtoCombina(m.produto_nome, m.categoria || "")) continue;
          avulsas.push({ id: Number(m.id), quando: instante.toISOString(), data: dia, tipo: m.tipo, produto_id: Number(m.produto_id), produto_nome: m.produto_nome, categoria: m.categoria || "", quantidade: Math.abs(Number(m.quantidade)), destino: m.destino || "", observacao: m.observacao || "", usuario_nome: m.usuario_nome || "", evento_titulo: m.evento_titulo || "" });
        }
        const linhaProduto = /* @__PURE__ */ new Map();
        const produto = (id, nome, cat) => {
          if (!linhaProduto.has(id)) linhaProduto.set(id, { produto_id: id, produto_nome: nome, categoria: cat, vendidas: 0, valor_vendido: 0, brindes: 0, doacoes: 0, outras_saidas: 0, total_saiu: 0, saldo_atual: Number(porId.get(id)?.estoque ?? 0) });
          return linhaProduto.get(id);
        };
        const brindes = [];
        const resumo = { vendas: 0, vendas_canceladas: 0, faturamento: 0, descontos: 0, pecas_vendidas: 0, brindes: 0, brindes_em_vendas: 0, brindes_avulsos: 0, doacoes: 0, outras_saidas: 0, total_pecas: 0, ticket_medio: 0 };
        const porPagamento = /* @__PURE__ */ new Map();
        const porVendedor = /* @__PURE__ */ new Map();
        for (const v of vendas) {
          if (v.cancelada) {
            resumo.vendas_canceladas += 1;
            continue;
          }
          resumo.vendas += 1;
          resumo.faturamento += v.total;
          resumo.descontos += v.desconto_valor;
          for (const p of v.pagamentos) {
            const pg = porPagamento.get(p.forma) || { forma: p.forma, vendas: 0, valor: 0 };
            pg.vendas += 1;
            pg.valor += p.valor;
            porPagamento.set(p.forma, pg);
          }
          const nomeVendedor = v.vendedor_nome || "Sem registro";
          const vd = porVendedor.get(nomeVendedor) || { nome: nomeVendedor, vendas: 0, pecas: 0, valor: 0 };
          vd.vendas += 1;
          vd.valor += v.total;
          porVendedor.set(nomeVendedor, vd);
          for (const i of v.itens) {
            if (!produtoCombina(i.produto_nome, i.categoria)) continue;
            const linha = produto(i.produto_id, i.produto_nome, i.categoria);
            if (i.tipo === "BRINDE") {
              linha.brindes += i.quantidade;
              resumo.brindes_em_vendas += i.quantidade;
              brindes.push({ quando: v.quando, data: v.data, produto_id: i.produto_id, produto_nome: i.produto_nome, quantidade: i.quantidade, origem: "VENDA", venda_id: v.id, usuario_nome: v.vendedor_nome, destino: "", observacao: "", evento_titulo: v.evento_titulo });
            } else {
              linha.vendidas += i.quantidade;
              linha.valor_vendido += i.valor;
              resumo.pecas_vendidas += i.quantidade;
              vd.pecas += i.quantidade;
            }
          }
        }
        for (const a of avulsas) {
          const linha = produto(a.produto_id, a.produto_nome, a.categoria);
          if (a.tipo === "BRINDE") {
            linha.brindes += a.quantidade;
            resumo.brindes_avulsos += a.quantidade;
            brindes.push({ ...a, origem: "AVULSO", venda_id: null });
          } else if (a.tipo === "DOACAO") {
            linha.doacoes += a.quantidade;
            resumo.doacoes += a.quantidade;
          } else {
            linha.outras_saidas += a.quantidade;
            resumo.outras_saidas += a.quantidade;
          }
        }
        const produtos = [...linhaProduto.values()].map((l) => ({ ...l, valor_vendido: centavos(l.valor_vendido), total_saiu: l.vendidas + l.brindes + l.doacoes + l.outras_saidas })).sort((a, b) => b.total_saiu - a.total_saiu || b.valor_vendido - a.valor_vendido || String(a.produto_nome).localeCompare(String(b.produto_nome), "pt-BR"));
        resumo.brindes = resumo.brindes_em_vendas + resumo.brindes_avulsos;
        resumo.total_pecas = resumo.pecas_vendidas + resumo.brindes + resumo.doacoes + resumo.outras_saidas;
        resumo.faturamento = centavos(resumo.faturamento);
        resumo.descontos = centavos(resumo.descontos);
        resumo.ticket_medio = resumo.vendas ? centavos(resumo.faturamento / resumo.vendas) : 0;
        brindes.sort((a, b) => String(a.quando || a.data).localeCompare(String(b.quando || b.data)));
        return {
          periodo: { inicio, fim },
          filtros: { busca, categoria, pagamento },
          gerado_em: (/* @__PURE__ */ new Date()).toISOString(),
          resumo,
          produtos,
          vendas,
          brindes,
          doacoes: avulsas.filter((a) => a.tipo === "DOACAO"),
          outras_saidas: avulsas.filter((a) => a.tipo === "SAIDA"),
          por_pagamento: [...porPagamento.values()].map((p) => ({ ...p, valor: centavos(p.valor) })).sort((a, b) => b.valor - a.valor),
          por_vendedor: [...porVendedor.values()].map((p) => ({ ...p, valor: centavos(p.valor) })).sort((a, b) => b.valor - a.valor)
        };
      }
      app.get("/api/relatorios/saidas", requireAuth, requireVer("relatorios"), async (req, res) => {
        const inicio = filtroData(req.query.inicio), fim = filtroData(req.query.fim);
        if (!inicio || !fim) return res.status(400).json({ error: "Informe a data inicial e a final (AAAA-MM-DD)." });
        if (fim < inicio) return res.status(400).json({ error: "A data final n\xE3o pode ser anterior \xE0 inicial." });
        if ((/* @__PURE__ */ new Date(`${fim}T00:00:00Z`) - /* @__PURE__ */ new Date(`${inicio}T00:00:00Z`)) / 864e5 > 366) return res.status(400).json({ error: "Escolha um per\xEDodo de at\xE9 um ano." });
        try {
          res.json(await montarRelatorioSaidas({ inicio, fim, busca: String(req.query.busca || "").slice(0, 80), categoria: String(req.query.categoria || "").slice(0, 80), pagamento: String(req.query.pagamento || "").slice(0, 40) }));
        } catch (e) {
          errorResponse(res, e);
        }
      });
      var COLUNA_MOVIMENTO = { ENTRADA: "entradas", VENDA: "vendas", BRINDE: "brindes", DOACAO: "doacoes", SAIDA: "outras_saidas", DEVOLUCAO: "devolucoes" };
      async function montarRelatorioEstoque({ inicio, fim }) {
        const produtos = await all("SELECT id,nome,categoria,preco,estoque,ativo FROM produtos");
        const primeiro = await get("SELECT MIN(criado_em) AS desde FROM movimentacao_estoque");
        const desdeInstante = instanteDe(primeiro?.desde);
        const movs = await all("SELECT produto_id,tipo,quantidade,criado_em FROM movimentacao_estoque WHERE criado_em>=?", [somarDias(inicio, -1)]);
        const linhas = new Map(produtos.map((p) => [Number(p.id), {
          produto_id: Number(p.id),
          produto_nome: p.nome,
          categoria: p.categoria || "",
          preco: centavos(p.preco),
          ativo: fromDbBool(p.ativo),
          saldo_atual: Number(p.estoque || 0),
          depois_do_fim: 0,
          no_periodo: 0,
          entradas: 0,
          vendas: 0,
          brindes: 0,
          doacoes: 0,
          outras_saidas: 0,
          devolucoes: 0
        }]));
        for (const m of movs) {
          const linha = linhas.get(Number(m.produto_id));
          const instante = instanteDe(m.criado_em);
          if (!linha || !instante) continue;
          const dia = diaNaLoja(instante);
          const quantidade = Number(m.quantidade || 0);
          if (dia > fim) linha.depois_do_fim += quantidade;
          else if (dia >= inicio) {
            linha.no_periodo += quantidade;
            const coluna = COLUNA_MOVIMENTO[m.tipo];
            if (coluna) linha[coluna] += Math.abs(quantidade);
          }
        }
        const lista = [...linhas.values()].map(({ depois_do_fim, no_periodo, ...l }) => {
          const saldoFinal = l.saldo_atual - depois_do_fim;
          return { ...l, saldo_final: saldoFinal, saldo_inicial: saldoFinal - no_periodo, movimentou: no_periodo !== 0 || l.entradas + l.vendas + l.brindes + l.doacoes + l.outras_saidas + l.devolucoes > 0 };
        });
        const somaLivro = new Map((await all("SELECT produto_id, SUM(quantidade) AS soma FROM movimentacao_estoque GROUP BY produto_id")).map((l) => [Number(l.produto_id), Number(l.soma || 0)]));
        const semHistorico = lista.filter((p) => p.saldo_atual !== (somaLivro.get(p.produto_id) || 0)).length;
        return { periodo: { inicio, fim }, historico_desde: desdeInstante ? diaNaLoja(desdeInstante) : null, produtos_com_estoque_anterior: semHistorico, gerado_em: (/* @__PURE__ */ new Date()).toISOString(), produtos: lista };
      }
      app.get("/api/relatorios/estoque", requireAuth, requireVer("relatorios"), async (req, res) => {
        const inicio = filtroData(req.query.inicio), fim = filtroData(req.query.fim || req.query.inicio);
        if (!inicio || !fim) return res.status(400).json({ error: "Informe a data (AAAA-MM-DD)." });
        if (fim < inicio) return res.status(400).json({ error: "A data final n\xE3o pode ser anterior \xE0 inicial." });
        if ((/* @__PURE__ */ new Date(`${fim}T00:00:00Z`) - /* @__PURE__ */ new Date(`${inicio}T00:00:00Z`)) / 864e5 > 366) return res.status(400).json({ error: "Escolha um per\xEDodo de at\xE9 um ano." });
        try {
          res.json(await montarRelatorioEstoque({ inicio, fim }));
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.get("/api/historico-produtos", requireAuth, requireVer("historico-produtos"), async (req, res) => {
        const tipo = String(req.query.tipo || "").toUpperCase();
        const produtoId = parseInteiro(req.query.produto_id);
        const inicio = String(req.query.inicio || ""), fim = String(req.query.fim || "");
        try {
          const linhas = [];
          if (!tipo || tipo === "VENDA" || tipo === "BRINDE") {
            const params = [];
            const where = ["1=1"];
            if (tipo) {
              where.push("i.tipo=?");
              params.push(tipo);
            }
            if (produtoId) {
              where.push("i.produto_id=?");
              params.push(produtoId);
            }
            if (validDate(inicio)) {
              where.push("v.data_venda >= ?");
              params.push(inicio);
            }
            if (validDate(fim)) {
              where.push("v.data_venda <= ?");
              params.push(fim);
            }
            const vendas = await all(`SELECT i.venda_id, i.produto_id, p.nome AS produto_nome, i.tipo, i.quantidade, i.preco_unitario, v.data_venda, v.criado_em, u.nome AS usuario_nome,
        CASE WHEN c.id IS NULL THEN 0 ELSE 1 END AS cancelada, v.evento_id, ev.titulo AS evento_titulo
        FROM venda_item i JOIN vendas v ON v.id=i.venda_id JOIN produtos p ON p.id=i.produto_id LEFT JOIN eventos ev ON ev.id=v.evento_id
        LEFT JOIN usuarios_erp u ON u.id=v.usuario_id LEFT JOIN vendas_canceladas c ON c.venda_id=v.id
        WHERE ${where.join(" AND ")} ORDER BY v.id DESC, i.id LIMIT 2000`, params);
            for (const l of vendas) linhas.push({ quando: l.criado_em ? new Date(l.criado_em).toISOString() : `${diaIso(l.data_venda)}T12:00:00.000Z`, tipo: l.tipo, origem: "VENDA", produto_id: Number(l.produto_id), produto_nome: l.produto_nome, quantidade: Number(l.quantidade), valor: Math.round(Number(l.quantidade) * Number(l.preco_unitario) * 100) / 100, venda_id: Number(l.venda_id), usuario_nome: l.usuario_nome || "", destino: "", observacao: "", cancelada: Number(l.cancelada) === 1, evento_id: l.evento_id ? Number(l.evento_id) : null, evento_titulo: l.evento_titulo || "" });
          }
          if (!tipo || tipo === "DOACAO" || tipo === "BRINDE") {
            const params = [];
            const where = ["m.venda_id IS NULL", tipo ? "m.tipo=?" : "m.tipo IN ('DOACAO','BRINDE')"];
            if (tipo) params.push(tipo);
            if (produtoId) {
              where.push("m.produto_id=?");
              params.push(produtoId);
            }
            const movs = await all(`SELECT m.id, m.produto_id, p.nome AS produto_nome, m.tipo, m.quantidade, m.destino, m.observacao, m.criado_em, u.nome AS usuario_nome, m.evento_id, ev.titulo AS evento_titulo
        FROM movimentacao_estoque m JOIN produtos p ON p.id=m.produto_id LEFT JOIN usuarios_erp u ON u.id=m.criado_por LEFT JOIN eventos ev ON ev.id=m.evento_id
        WHERE ${where.join(" AND ")} ORDER BY m.id DESC LIMIT 2000`, params);
            for (const m of movs) {
              const bruto = m.criado_em instanceof Date ? m.criado_em : new Date(String(m.criado_em).includes("T") ? m.criado_em : `${String(m.criado_em).replace(" ", "T")}Z`);
              const quando = Number.isNaN(bruto.getTime()) ? String(m.criado_em) : bruto.toISOString();
              const dia = quando.slice(0, 10);
              if (validDate(inicio) && dia < inicio || validDate(fim) && dia > fim) continue;
              linhas.push({ quando, tipo: m.tipo, origem: "MOVIMENTAR", produto_id: Number(m.produto_id), produto_nome: m.produto_nome, quantidade: Math.abs(Number(m.quantidade)), valor: 0, venda_id: null, usuario_nome: m.usuario_nome || "", destino: m.destino || "", observacao: m.observacao || "", cancelada: false, evento_id: m.evento_id ? Number(m.evento_id) : null, evento_titulo: m.evento_titulo || "" });
            }
          }
          linhas.sort((a, b) => a.quando < b.quando ? 1 : a.quando > b.quando ? -1 : 0);
          const onde = String(req.query.evento || "");
          const filtradas = onde === "loja" ? linhas.filter((l) => !l.evento_id) : onde === "eventos" ? linhas.filter((l) => l.evento_id) : parseInteiro(onde) ? linhas.filter((l) => l.evento_id === parseInteiro(onde)) : linhas;
          if (filtradas !== linhas) {
            linhas.length = 0;
            linhas.push(...filtradas);
          }
          const resumo = { VENDA: { pecas: 0, valor: 0 }, BRINDE: { pecas: 0 }, DOACAO: { pecas: 0 } };
          for (const l of linhas) {
            if (l.cancelada) continue;
            resumo[l.tipo].pecas += l.quantidade;
            if (l.tipo === "VENDA") resumo.VENDA.valor = Math.round((resumo.VENDA.valor + l.valor) * 100) / 100;
          }
          res.json({ resumo, linhas: linhas.slice(0, 1e3) });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.get("/api/log-atividades", requireAuth, requireVer("log"), async (req, res) => {
        const acao = String(req.query.acao || "").toUpperCase();
        const usuarioId = parseInteiro(req.query.usuario_id);
        const busca = String(req.query.busca || "").trim().slice(0, 80);
        const inicio = String(req.query.inicio || ""), fim = String(req.query.fim || "");
        const where = [];
        const params = [];
        if (ACOES_LOG.includes(acao)) {
          where.push("acao=?");
          params.push(acao);
        }
        if (usuarioId) {
          where.push("usuario_id=?");
          params.push(usuarioId);
        }
        if (busca) {
          where.push("(descricao LIKE ? OR usuario_nome LIKE ?)");
          params.push(`%${busca}%`, `%${busca}%`);
        }
        try {
          const linhas = (await all(`SELECT id,criado_em,usuario_id,usuario_nome,acao,descricao,valor,venda_id FROM log_atividade ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY criado_em DESC, id DESC LIMIT 3000`, params)).map((l) => ({ ...l, criado_em: new Date(l.criado_em).toISOString(), valor: l.valor === null || l.valor === void 0 ? null : Number(l.valor), venda_id: l.venda_id == null ? null : Number(l.venda_id) })).filter((l) => {
            const dia = new Date(new Date(l.criado_em).getTime() - 3 * 3600 * 1e3).toISOString().slice(0, 10);
            return (!validDate(inicio) || dia >= inicio) && (!validDate(fim) || dia <= fim);
          });
          res.json(linhas.slice(0, 1e3));
        } catch (e) {
          errorResponse(res, e);
        }
      });
      var SIM = (v) => v === true || v === 1 || v === "1" || v === "true";
      var TIPOS_VINCULO = ["CLT", "PJ"];
      var TIPOS_TELEFONE_FUNCIONARIO = ["Celular", "WhatsApp", "Residencial", "Trabalho", "Recado"];
      var TIPOS_EMAIL_FUNCIONARIO = ["Pessoal", "Trabalho"];
      var ESTADOS_CIVIS = ["", "Solteiro(a)", "Casado(a)", "Uni\xE3o est\xE1vel", "Divorciado(a)", "Vi\xFAvo(a)"];
      var TIPOS_CONTA_BANCARIA = ["", "Corrente", "Poupan\xE7a", "Sal\xE1rio", "Pagamento"];
      var UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
      var LIMITE_CONTATOS_FUNCIONARIO = 10;
      var COLUNAS_NOVAS_FUNCIONARIO = [
        ["tipo_vinculo", "TEXT NOT NULL DEFAULT 'CLT' CHECK(tipo_vinculo IN ('CLT','PJ'))"],
        ["data_nascimento", "TEXT"],
        ["rg", "TEXT NOT NULL DEFAULT ''"],
        ["estado_civil", "TEXT NOT NULL DEFAULT ''"],
        ["pis", "TEXT NOT NULL DEFAULT ''"],
        ["ctps", "TEXT NOT NULL DEFAULT ''"],
        ["cbo", "TEXT NOT NULL DEFAULT ''"],
        ["departamento", "TEXT NOT NULL DEFAULT ''"],
        ["jornada_semanal", "INTEGER NOT NULL DEFAULT 44 CHECK(jornada_semanal BETWEEN 1 AND 44)"],
        ["data_desligamento", "TEXT"],
        ["cep", "TEXT NOT NULL DEFAULT ''"],
        ["logradouro", "TEXT NOT NULL DEFAULT ''"],
        ["numero", "TEXT NOT NULL DEFAULT ''"],
        ["complemento", "TEXT NOT NULL DEFAULT ''"],
        ["bairro", "TEXT NOT NULL DEFAULT ''"],
        ["cidade", "TEXT NOT NULL DEFAULT ''"],
        ["uf", "TEXT NOT NULL DEFAULT ''"],
        ["banco", "TEXT NOT NULL DEFAULT ''"],
        ["agencia", "TEXT NOT NULL DEFAULT ''"],
        ["conta_bancaria", "TEXT NOT NULL DEFAULT ''"],
        ["tipo_conta", "TEXT NOT NULL DEFAULT ''"],
        ["chave_pix", "TEXT NOT NULL DEFAULT ''"],
        ["emergencia_nome", "TEXT NOT NULL DEFAULT ''"],
        ["emergencia_parentesco", "TEXT NOT NULL DEFAULT ''"],
        ["emergencia_telefone", "TEXT NOT NULL DEFAULT ''"],
        ["observacoes", "TEXT NOT NULL DEFAULT ''"],
        ["cnpj", "TEXT CHECK(cnpj IS NULL OR length(cnpj) = 14)"],
        ["razao_social", "TEXT NOT NULL DEFAULT ''"],
        ["pj_irrf_percentual", "REAL NOT NULL DEFAULT 0 CHECK(pj_irrf_percentual BETWEEN 0 AND 30)"],
        ["pj_csrf_percentual", "REAL NOT NULL DEFAULT 0 CHECK(pj_csrf_percentual BETWEEN 0 AND 30)"],
        ["pj_iss_percentual", "REAL NOT NULL DEFAULT 0 CHECK(pj_iss_percentual BETWEEN 0 AND 30)"]
      ];
      var TEXTOS_FUNCIONARIO = { rg: 20, ctps: 30, cbo: 10, departamento: 60, logradouro: 150, numero: 10, complemento: 60, bairro: 80, cidade: 80, banco: 60, agencia: 10, conta_bancaria: 20, chave_pix: 140, emergencia_nome: 120, emergencia_parentesco: 40, emergencia_telefone: 20, observacoes: 1e3, razao_social: 150 };
      function lerTelefonesFuncionario(lista) {
        if (lista === void 0 || lista === null) return { lista: [] };
        if (!Array.isArray(lista)) return { erro: "Os telefones devem vir em uma lista." };
        if (lista.length > LIMITE_CONTATOS_FUNCIONARIO) return { erro: `No m\xE1ximo ${LIMITE_CONTATOS_FUNCIONARIO} telefones por funcion\xE1rio.` };
        const vistos = /* @__PURE__ */ new Set(), saida = [];
        for (const [i, item] of lista.entries()) {
          const rotulo = `Telefone ${i + 1}`;
          const tipo = item?.tipo ? String(item.tipo) : "Celular";
          if (!TIPOS_TELEFONE_FUNCIONARIO.includes(tipo)) return { erro: `${rotulo}: tipo inv\xE1lido.` };
          const codigoPais = somenteDigitos(item?.codigo_pais || "55"), ddd = somenteDigitos(item?.ddd), numero = somenteDigitos(item?.numero);
          if (!/^[0-9]{1,4}$/.test(codigoPais)) return { erro: `${rotulo}: c\xF3digo do pa\xEDs com 1 a 4 d\xEDgitos (ex.: 55).` };
          if (codigoPais === "55") {
            if (!/^[1-9][0-9]$/.test(ddd)) return { erro: `${rotulo}: informe o DDD com 2 d\xEDgitos.` };
            if (!/^[0-9]{8,9}$/.test(numero)) return { erro: `${rotulo}: o n\xFAmero tem 8 ou 9 d\xEDgitos, sem o DDD.` };
          } else if (!/^[0-9]{4,12}$/.test(numero) || ddd && !/^[0-9]{2,3}$/.test(ddd)) return { erro: `${rotulo}: n\xFAmero inv\xE1lido.` };
          const chave = `${codigoPais}|${ddd}|${numero}`;
          if (vistos.has(chave)) return { erro: `${rotulo}: n\xFAmero repetido.` };
          vistos.add(chave);
          saida.push({ tipo, codigo_pais: codigoPais, ddd, numero });
        }
        return { lista: saida };
      }
      function lerEmailsFuncionario(lista) {
        if (lista === void 0 || lista === null) return { lista: [] };
        if (!Array.isArray(lista)) return { erro: "Os e-mails devem vir em uma lista." };
        if (lista.length > LIMITE_CONTATOS_FUNCIONARIO) return { erro: `No m\xE1ximo ${LIMITE_CONTATOS_FUNCIONARIO} e-mails por funcion\xE1rio.` };
        const vistos = /* @__PURE__ */ new Set(), saida = [];
        for (const [i, item] of lista.entries()) {
          const tipo = item?.tipo ? String(item.tipo) : "Pessoal";
          if (!TIPOS_EMAIL_FUNCIONARIO.includes(tipo)) return { erro: `E-mail ${i + 1}: tipo inv\xE1lido.` };
          const email = String(item?.email ?? "").trim().toLowerCase();
          if (!email || email.length > 254 || !REGEX_EMAIL.test(email)) return { erro: `E-mail ${i + 1}: informe um endere\xE7o v\xE1lido.` };
          if (vistos.has(email)) return { erro: `E-mail ${i + 1}: e-mail repetido.` };
          vistos.add(email);
          saida.push({ tipo, email });
        }
        return { lista: saida };
      }
      function lerFuncionario(corpo, { simulacao = false } = {}) {
        const b = corpo || {};
        const tipo = b.tipo_vinculo === void 0 || b.tipo_vinculo === "" ? "CLT" : String(b.tipo_vinculo).toUpperCase();
        if (!TIPOS_VINCULO.includes(tipo)) return { erro: "V\xEDnculo inv\xE1lido: escolha CLT ou PJ." };
        const pj = tipo === "PJ";
        const nome = normalizarTexto(b.nome_completo);
        const cpf = normalizarCpf(typeof b.cpf === "string" ? b.cpf : "");
        const cargo = normalizarTexto(b.cargo || "");
        const admissao = String(b.data_admissao || "").trim();
        const desligamento = String(b.data_desligamento || "").trim();
        const nascimento = String(b.data_nascimento || "").trim();
        const salario = parseMoney(b.salario_bruto);
        const dependentes = pj ? 0 : parseInteiro(b.dependentes_irrf ?? 0);
        const pensao = pj ? 0 : parseMoney(b.pensao_alimenticia ?? 0);
        const recebeVt = !pj && SIM(b.recebe_vt), descontarVt = b.descontar_vt === void 0 ? true : SIM(b.descontar_vt);
        const vtDiario = parseMoney(b.vt_valor_diario ?? 0);
        const vtDias = parseInteiro(b.vt_dias_uteis ?? 22);
        const alimentacao = pj ? 0 : parseMoney(b.alimentacao_valor ?? 0);
        const alimentacaoPct = pj ? 0 : parseMoney(b.alimentacao_desconto_percentual ?? 0);
        const outros = pj ? 0 : parseMoney(b.outros_descontos ?? 0);
        const outrosDescricao = pj ? "" : normalizarTexto(b.outros_descontos_descricao || "");
        const jornada = b.jornada_semanal === void 0 || b.jornada_semanal === "" ? 44 : parseInteiro(b.jornada_semanal);
        if (!simulacao && (!nome || nome.length < 5 || nome.length > 150 || !/\s/.test(nome))) return { erro: "Informe o nome completo (nome e sobrenome, at\xE9 150 caracteres)." };
        if (!simulacao && !cpf.cpf) return { erro: "CPF inv\xE1lido. Confira os 11 n\xFAmeros." };
        if (cargo.length > 80) return { erro: "Cargo at\xE9 80 caracteres." };
        if (admissao && !dataReal(admissao)) return { erro: `Data de ${pj ? "in\xEDcio do contrato" : "admiss\xE3o"} inv\xE1lida.` };
        if (desligamento && !dataReal(desligamento)) return { erro: "Data de desligamento inv\xE1lida." };
        if (desligamento && admissao && desligamento < admissao) return { erro: "O desligamento n\xE3o pode ser antes da admiss\xE3o." };
        if (nascimento && !dataReal(nascimento)) return { erro: "Data de nascimento inv\xE1lida." };
        if (nascimento && admissao && Number(admissao.slice(0, 4)) - Number(nascimento.slice(0, 4)) < 14) return { erro: "Pela data de nascimento, a pessoa teria menos de 14 anos na admiss\xE3o." };
        if (salario === null || salario <= 0 || salario > 1e6) return { erro: pj ? "Informe o valor mensal do contrato (maior que zero, com at\xE9 duas casas)." : "Informe o sal\xE1rio bruto (valor mensal maior que zero, com at\xE9 duas casas)." };
        if (dependentes === null || dependentes > 20) return { erro: "Dependentes para o IR: n\xFAmero inteiro de 0 a 20." };
        if (pensao === null || outros === null || vtDiario === null || alimentacao === null) return { erro: "Valores em reais inv\xE1lidos. Use at\xE9 duas casas decimais." };
        if (vtDias === null || vtDias > 31) return { erro: "Dias de VT no m\xEAs: inteiro de 0 a 31." };
        if (alimentacaoPct === null || alimentacaoPct > 20) return { erro: "O desconto da alimenta\xE7\xE3o vai de 0% a 20% do benef\xEDcio (limite do PAT)." };
        if (outrosDescricao.length > 120) return { erro: "Descri\xE7\xE3o de outros descontos at\xE9 120 caracteres." };
        if (outros > 0 && !outrosDescricao) return { erro: "Diga o que s\xE3o os outros descontos (ex.: plano de sa\xFAde)." };
        if (jornada === null || jornada < 1 || jornada > 44) return { erro: "Jornada semanal: de 1 a 44 horas." };
        const textos = {};
        for (const [campo, maximo] of Object.entries(TEXTOS_FUNCIONARIO)) {
          textos[campo] = campo === "observacoes" ? String(b[campo] ?? "").trim() : normalizarTexto(b[campo] ?? "");
          if (textos[campo].length > maximo) return { erro: `"${campo.replace(/_/g, " ")}" pode ter at\xE9 ${maximo} caracteres.` };
        }
        const estadoCivil = String(b.estado_civil ?? "");
        if (!ESTADOS_CIVIS.includes(estadoCivil)) return { erro: "Estado civil inv\xE1lido." };
        const tipoConta = String(b.tipo_conta ?? "");
        if (!TIPOS_CONTA_BANCARIA.includes(tipoConta)) return { erro: "Tipo de conta banc\xE1ria inv\xE1lido." };
        const uf = String(b.uf ?? "").trim().toUpperCase();
        if (uf && !UFS.includes(uf)) return { erro: "UF inv\xE1lida." };
        const cep = somenteDigitos(b.cep);
        if (cep && cep.length !== 8) return { erro: "CEP com 8 n\xFAmeros." };
        const pis = pj ? "" : somenteDigitos(b.pis);
        if (pis && pis.length !== 11) return { erro: "PIS/NIS com 11 n\xFAmeros." };
        const cnpj = pj ? somenteDigitos(b.cnpj) : "";
        if (pj && !simulacao && !cnpjValido(cnpj)) return { erro: "CNPJ do prestador inv\xE1lido. Confira os 14 n\xFAmeros." };
        const percentuais = {};
        for (const campo of ["pj_irrf_percentual", "pj_csrf_percentual", "pj_iss_percentual"]) {
          const valor = pj ? parseMoney(b[campo] ?? 0) : 0;
          if (valor === null || valor > 30) return { erro: "Reten\xE7\xF5es do PJ: percentuais de 0% a 30%." };
          percentuais[campo] = valor;
        }
        const telefones = lerTelefonesFuncionario(b.telefones), emails = lerEmailsFuncionario(b.emails);
        if (telefones.erro || emails.erro) return { erro: telefones.erro || emails.erro };
        return {
          dados: {
            tipo_vinculo: tipo,
            nome_completo: nome,
            cpf: cpf.cpf,
            cargo,
            data_admissao: admissao || null,
            data_desligamento: desligamento || null,
            data_nascimento: nascimento || null,
            salario_bruto: salario,
            dependentes_irrf: dependentes,
            pensao_alimenticia: pensao,
            recebe_vt: recebeVt,
            descontar_vt: descontarVt,
            vt_valor_diario: recebeVt ? vtDiario : 0,
            vt_dias_uteis: vtDias,
            alimentacao_valor: alimentacao,
            alimentacao_desconto_percentual: alimentacaoPct,
            outros_descontos: outros,
            outros_descontos_descricao: outrosDescricao,
            jornada_semanal: jornada,
            estado_civil: estadoCivil,
            tipo_conta: tipoConta,
            uf,
            cep,
            pis,
            cnpj: cnpj || null,
            ...textos,
            ...percentuais,
            razao_social: pj ? textos.razao_social : ""
          },
          telefones: telefones.lista,
          emails: emails.lista
        };
      }
      var NUMEROS_FUNCIONARIO = ["salario_bruto", "dependentes_irrf", "pensao_alimenticia", "vt_valor_diario", "vt_dias_uteis", "alimentacao_valor", "alimentacao_desconto_percentual", "outros_descontos", "jornada_semanal", "pj_irrf_percentual", "pj_csrf_percentual", "pj_iss_percentual"];
      function funcionarioDoBanco(l) {
        const f = { ...l, id: Number(l.id), recebe_vt: fromDbBool(l.recebe_vt), descontar_vt: fromDbBool(l.descontar_vt), ativo: fromDbBool(l.ativo), tipo_vinculo: l.tipo_vinculo || "CLT" };
        for (const campo of NUMEROS_FUNCIONARIO) f[campo] = Number(l[campo] ?? 0);
        for (const campo of ["data_admissao", "data_desligamento", "data_nascimento"]) f[campo] = l[campo] ? diaIso(l[campo]) : null;
        delete f.criado_em;
        return f;
      }
      var COLUNAS_FUNCIONARIO = ["tipo_vinculo", "nome_completo", "cpf", "cargo", "data_admissao", "data_desligamento", "data_nascimento", "salario_bruto", "dependentes_irrf", "pensao_alimenticia", "recebe_vt", "descontar_vt", "vt_valor_diario", "vt_dias_uteis", "alimentacao_valor", "alimentacao_desconto_percentual", "outros_descontos", "outros_descontos_descricao", "jornada_semanal", "estado_civil", "tipo_conta", "uf", "cep", "pis", "cnpj", ...Object.keys(TEXTOS_FUNCIONARIO), "pj_irrf_percentual", "pj_csrf_percentual", "pj_iss_percentual"];
      var valoresFuncionario = (d) => COLUNAS_FUNCIONARIO.map((c) => ["recebe_vt", "descontar_vt"].includes(c) ? toDbBool(d[c]) : d[c]);
      async function gravarContatosFuncionario(id, telefones, emails) {
        await run("DELETE FROM funcionario_telefone WHERE id_funcionario=?", [id]);
        await run("DELETE FROM funcionario_email WHERE id_funcionario=?", [id]);
        let n = 0;
        for (const t of telefones) await run(`INSERT INTO funcionario_telefone (id_funcionario,id_telefone,tipo,codigo_pais,ddd,numero) VALUES (?,?,?,?,?,?)${USE_POSTGRES ? " RETURNING id_funcionario AS id" : ""}`, [id, ++n, t.tipo, t.codigo_pais, t.ddd, t.numero]);
        n = 0;
        for (const e of emails) await run(`INSERT INTO funcionario_email (id_funcionario,id_email,tipo,email) VALUES (?,?,?,?)${USE_POSTGRES ? " RETURNING id_funcionario AS id" : ""}`, [id, ++n, e.tipo, e.email]);
      }
      function anoAtualBrasil() {
        return Number(new Intl.DateTimeFormat("en", { timeZone: "America/Sao_Paulo", year: "numeric" }).format(/* @__PURE__ */ new Date()));
      }
      async function tabelasCltDisponiveis() {
        const salvas = await all("SELECT t.ano, t.dados, t.atualizado_em, u.nome AS atualizado_por_nome FROM clt_tabela t LEFT JOIN usuarios_erp u ON u.id=t.atualizado_por ORDER BY t.ano");
        const lista = [];
        for (const l of salvas) {
          const lido = validarTabelaClt(JSON.parse(l.dados), Number(l.ano));
          if (lido.tabela) lista.push({ ano: Number(l.ano), tabela: lido.tabela, origem: "parametros", atualizado_em: l.atualizado_em, atualizado_por_nome: l.atualizado_por_nome || "" });
        }
        const anoPadrao = Number(TABELAS_CLT.vigencia);
        if (!lista.some((t) => t.ano === anoPadrao)) lista.push({ ano: anoPadrao, tabela: TABELAS_CLT, origem: "padrao" });
        return lista.sort((a, b) => a.ano - b.ano);
      }
      async function tabelaCltVigente() {
        const ano = anoAtualBrasil();
        const lista = await tabelasCltDisponiveis();
        const escolhida = [...lista].reverse().find((t) => t.ano <= ano) || lista[0];
        return { ...escolhida, ano_atual: ano, desatualizada: escolhida.ano < ano };
      }
      async function opcoesFolha() {
        const vigente = await tabelaCltVigente();
        return { encargos_patronais_percentual: await lerParametro("clt_encargos_patronais_percentual"), tabela: vigente.tabela, desatualizada: vigente.desatualizada, ano_atual: vigente.ano_atual };
      }
      function avisoTabelaDesatualizada(opcoes) {
        return opcoes.desatualizada ? `As tabelas de ${opcoes.ano_atual} ainda n\xE3o foram cadastradas em Par\xE2metros: o c\xE1lculo usa as de ${opcoes.tabela.vigencia}.` : null;
      }
      function calcularComTabela(f, opcoes) {
        const calculo = calcularFolha(f, opcoes, opcoes.tabela);
        const aviso = avisoTabelaDesatualizada(opcoes);
        if (aviso) calculo.avisos.unshift(aviso);
        return calculo;
      }
      var somar = (lista, f) => Math.round(lista.reduce((t, x) => t + f(x), 0) * 100) / 100;
      app.get("/api/clt/tabelas", requireAuth, requireVer("clt"), async (req, res) => {
        try {
          const o = await opcoesFolha();
          res.json({ ...o.tabela, encargos_patronais_percentual: o.encargos_patronais_percentual, desatualizada: o.desatualizada, ano_atual: o.ano_atual, aviso_tabela: avisoTabelaDesatualizada(o) });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.get("/api/clt/tabelas-anuais", requireAuth, requireVer("parametros"), async (req, res) => {
        try {
          const vigente = await tabelaCltVigente();
          res.json({ ano_atual: vigente.ano_atual, ano_vigente: vigente.ano, desatualizada: vigente.desatualizada, ano_padrao: Number(TABELAS_CLT.vigencia), tabelas: await tabelasCltDisponiveis() });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.put("/api/clt/tabelas-anuais/:ano", requireAuth, requireEditar("parametros"), async (req, res) => {
        const ano = parseInteiro(req.params.ano);
        if (ano === null || ano < 2020 || ano > 2100) return res.status(400).json({ error: "Ano inv\xE1lido (de 2020 a 2100)." });
        const lido = validarTabelaClt(req.body?.tabela, ano);
        if (lido.erro) return res.status(400).json({ error: lido.erro });
        try {
          await transaction(async () => {
            const existe = await get("SELECT ano FROM clt_tabela WHERE ano=?", [ano]);
            const dados = JSON.stringify(lido.tabela);
            if (existe) await run("UPDATE clt_tabela SET dados=?, atualizado_por=?, atualizado_em=CURRENT_TIMESTAMP WHERE ano=?", [dados, req.user.id, ano]);
            else await run(`INSERT INTO clt_tabela (ano,dados,atualizado_por) VALUES (?,?,?)${USE_POSTGRES ? " RETURNING ano AS id" : ""}`, [ano, dados, req.user.id]);
            const t = lido.tabela;
            await registrarLog(req.user, "CLT", `Tabelas CLT de ${ano} ${existe ? "atualizadas" : "cadastradas"}: sal\xE1rio m\xEDnimo R$ ${t.salario_minimo.toFixed(2).replace(".", ",")}, teto INSS R$ ${t.inss.teto.toFixed(2).replace(".", ",")}`);
          });
          const vigente = await tabelaCltVigente();
          const mensagem = ano > vigente.ano_atual ? `Tabelas de ${ano} salvas. Elas passam a valer em 1\xBA de janeiro de ${ano}; at\xE9 l\xE1 a Folha CLT continua com as de ${vigente.ano}.` : ano === vigente.ano ? `Tabelas de ${ano} salvas. A Folha CLT j\xE1 usa os valores novos.` : `Tabelas de ${ano} salvas. A Folha CLT continua com as de ${vigente.ano}, que s\xE3o mais recentes.`;
          res.json({ mensagem, tabela: lido.tabela });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.delete("/api/clt/tabelas-anuais/:ano", requireAuth, requireEditar("parametros"), async (req, res) => {
        const ano = parseInteiro(req.params.ano);
        try {
          const r = await run("DELETE FROM clt_tabela WHERE ano=?", [ano]);
          if (!r.changes) return res.status(404).json({ error: "N\xE3o h\xE1 tabelas salvas para este ano." });
          await registrarLog(req.user, "CLT", `Tabelas CLT de ${ano} exclu\xEDdas${ano === Number(TABELAS_CLT.vigencia) ? " (volta ao padr\xE3o do sistema)" : ""}`);
          res.json({ mensagem: ano === Number(TABELAS_CLT.vigencia) ? `Tabelas de ${ano} voltaram ao padr\xE3o do sistema.` : `Tabelas de ${ano} exclu\xEDdas.` });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      var r2c = (v) => Math.round(Number(v || 0) * 100) / 100;
      function resumoMensal(f, opcoes) {
        if (f.tipo_vinculo !== "PJ") return calcularComTabela(f, opcoes);
        const bruto = r2c(f.salario_bruto);
        const irrf = r2c(bruto * f.pj_irrf_percentual / 100), csrf = r2c(bruto * f.pj_csrf_percentual / 100), iss = r2c(bruto * f.pj_iss_percentual / 100);
        const total = r2c(irrf + csrf + iss);
        return { vigencia: opcoes.tabela.vigencia, bruto, descontos: { irrf, csrf, iss, inss: 0, vale_transporte: 0, alimentacao: 0, total }, liquido: r2c(bruto - total), empresa: { fgts: 0, encargos_patronais: 0, custo_total: bruto }, avisos: [] };
      }
      async function contatosDosFuncionarios() {
        const telefones = await all("SELECT id_funcionario,id_telefone,tipo,codigo_pais,ddd,numero FROM funcionario_telefone ORDER BY id_funcionario,id_telefone");
        const emails = await all("SELECT id_funcionario,id_email,tipo,email FROM funcionario_email ORDER BY id_funcionario,id_email");
        return (id) => ({
          telefones: telefones.filter((t) => Number(t.id_funcionario) === id).map((t) => ({ tipo: t.tipo, codigo_pais: t.codigo_pais, ddd: t.ddd, numero: t.numero })),
          emails: emails.filter((e) => Number(e.id_funcionario) === id).map((e) => ({ tipo: e.tipo, email: e.email }))
        });
      }
      var somarSe = (lista, filtro, f) => somar(lista.filter(filtro), f);
      app.get(["/api/funcionarios", "/api/clt/funcionarios"], requireAuth, requireVer("clt"), async (req, res) => {
        try {
          const opcoes = await opcoesFolha();
          const contatos = await contatosDosFuncionarios();
          const holerites = await all("SELECT funcionario_id, COUNT(*) AS n, MAX(competencia) AS ultimo FROM holerite GROUP BY funcionario_id");
          const lista = (await all("SELECT * FROM funcionario ORDER BY ativo DESC, nome_completo")).map(funcionarioDoBanco).map((f) => {
            const h = holerites.find((x) => Number(x.funcionario_id) === f.id);
            return { ...f, ...contatos(f.id), holerites: Number(h?.n || 0), ultimo_holerite: h?.ultimo || null, calculo: resumoMensal(f, opcoes) };
          });
          const ativos = lista.filter((f) => f.ativo);
          const calc = ativos.map((f) => f.calculo);
          res.json({
            funcionarios: lista,
            totais: {
              funcionarios: ativos.length,
              clt: ativos.filter((f) => f.tipo_vinculo === "CLT").length,
              pj: ativos.filter((f) => f.tipo_vinculo === "PJ").length,
              bruto: somar(calc, (c) => c.bruto),
              inss: somar(calc, (c) => c.descontos.inss || 0),
              irrf: somar(calc, (c) => c.descontos.irrf || 0),
              descontos: somar(calc, (c) => c.descontos.total),
              liquido: somar(calc, (c) => c.liquido),
              fgts: somar(calc, (c) => c.empresa.fgts || 0),
              custo_total: somar(calc, (c) => c.empresa.custo_total),
              custo_clt: somarSe(ativos, (f) => f.tipo_vinculo === "CLT", (f) => f.calculo.empresa.custo_total),
              custo_pj: somarSe(ativos, (f) => f.tipo_vinculo === "PJ", (f) => f.calculo.empresa.custo_total)
            },
            vigencia: opcoes.tabela.vigencia,
            desatualizada: opcoes.desatualizada,
            aviso_tabela: avisoTabelaDesatualizada(opcoes),
            encargos_patronais_percentual: opcoes.encargos_patronais_percentual
          });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.post(["/api/funcionarios/simular", "/api/clt/simular"], requireAuth, requireVer("clt"), async (req, res) => {
        const lido = lerFuncionario(req.body, { simulacao: true });
        if (lido.erro) return res.status(400).json({ error: lido.erro });
        try {
          res.json(resumoMensal(lido.dados, await opcoesFolha()));
        } catch (e) {
          errorResponse(res, e);
        }
      });
      async function conflitoDeDocumento(dados, ignorarId = 0) {
        if (await get("SELECT id FROM funcionario WHERE cpf=? AND id<>?", [dados.cpf, ignorarId])) return "J\xE1 existe um funcion\xE1rio com este CPF.";
        if (dados.cnpj && await get("SELECT id FROM funcionario WHERE cnpj=? AND id<>?", [dados.cnpj, ignorarId])) return "J\xE1 existe um prestador com este CNPJ.";
        return null;
      }
      app.post(["/api/funcionarios", "/api/clt/funcionarios"], requireAuth, requireEditar("clt"), async (req, res) => {
        const lido = lerFuncionario(req.body);
        if (lido.erro) return res.status(400).json({ error: lido.erro });
        try {
          const conflito = await conflitoDeDocumento(lido.dados);
          if (conflito) return res.status(409).json({ error: conflito });
          const id = await transaction(async () => {
            const novo = await run(`INSERT INTO funcionario (${COLUNAS_FUNCIONARIO.join(",")}) VALUES (${COLUNAS_FUNCIONARIO.map(() => "?").join(",")})`, valoresFuncionario(lido.dados));
            await gravarContatosFuncionario(novo.lastID, lido.telefones, lido.emails);
            await registrarLog(req.user, "CLT", `Funcion\xE1rio cadastrado (${lido.dados.tipo_vinculo}): ${lido.dados.nome_completo}${lido.dados.cargo ? ` (${lido.dados.cargo})` : ""}`);
            return Number(novo.lastID);
          });
          res.status(201).json({ id, calculo: resumoMensal(lido.dados, await opcoesFolha()) });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.put(["/api/funcionarios/:id", "/api/clt/funcionarios/:id"], requireAuth, requireEditar("clt"), async (req, res) => {
        const lido = lerFuncionario(req.body);
        if (lido.erro) return res.status(400).json({ error: lido.erro });
        try {
          const atual = await get("SELECT id FROM funcionario WHERE id=?", [req.params.id]);
          if (!atual) return res.status(404).json({ error: "Funcion\xE1rio n\xE3o encontrado." });
          const conflito = await conflitoDeDocumento(lido.dados, Number(atual.id));
          if (conflito) return res.status(409).json({ error: conflito.replace("J\xE1 existe um", "J\xE1 existe outro") });
          await transaction(async () => {
            await run(`UPDATE funcionario SET ${COLUNAS_FUNCIONARIO.map((c) => `${c}=?`).join(",")} WHERE id=?`, [...valoresFuncionario(lido.dados), atual.id]);
            await gravarContatosFuncionario(atual.id, lido.telefones, lido.emails);
            await registrarLog(req.user, "CLT", `Funcion\xE1rio alterado: ${lido.dados.nome_completo}`);
          });
          res.json({ mensagem: "Cadastro atualizado." });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.put(["/api/funcionarios/:id/status", "/api/clt/funcionarios/:id/status"], requireAuth, requireEditar("clt"), async (req, res) => {
        const ativo = SIM(req.body?.ativo);
        const saida = String(req.body?.data_desligamento || "").trim();
        if (!ativo && saida && !dataReal(saida)) return res.status(400).json({ error: "Data de desligamento inv\xE1lida." });
        try {
          const f = await get("SELECT id,nome_completo,data_admissao FROM funcionario WHERE id=?", [req.params.id]);
          if (!f) return res.status(404).json({ error: "Funcion\xE1rio n\xE3o encontrado." });
          if (!ativo && saida && f.data_admissao && saida < diaIso(f.data_admissao)) return res.status(400).json({ error: "O desligamento n\xE3o pode ser antes da admiss\xE3o." });
          await transaction(async () => {
            await run("UPDATE funcionario SET ativo=?, data_desligamento=? WHERE id=?", [toDbBool(ativo), ativo ? null : saida || dataDeHoje(), f.id]);
            await registrarLog(req.user, "CLT", `Funcion\xE1rio ${ativo ? "reativado" : `desligado em ${(saida || dataDeHoje()).split("-").reverse().join("/")}`}: ${f.nome_completo}`);
          });
          res.json({ mensagem: ativo ? "Funcion\xE1rio de volta na folha." : "Funcion\xE1rio desligado. O cadastro e os holerites foram mantidos." });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.delete(["/api/funcionarios/:id", "/api/clt/funcionarios/:id"], requireAuth, requireEditar("clt"), async (req, res) => {
        try {
          const f = await get("SELECT id,nome_completo FROM funcionario WHERE id=?", [req.params.id]);
          if (!f) return res.status(404).json({ error: "Funcion\xE1rio n\xE3o encontrado." });
          const n = Number((await get("SELECT COUNT(*) AS n FROM holerite WHERE funcionario_id=?", [f.id])).n);
          if (n) return res.status(409).json({ error: `${f.nome_completo} tem ${n} ${n === 1 ? "holerite" : "holerites"} e n\xE3o pode ser exclu\xEDdo. Use "Desligar" para tirar da folha e manter o hist\xF3rico.` });
          await transaction(async () => {
            await run("DELETE FROM funcionario_telefone WHERE id_funcionario=?", [f.id]);
            await run("DELETE FROM funcionario_email WHERE id_funcionario=?", [f.id]);
            await run("DELETE FROM funcionario WHERE id=?", [f.id]);
            await registrarLog(req.user, "CLT", `Funcion\xE1rio exclu\xEDdo: ${f.nome_completo}`);
          });
          res.json({ mensagem: "Funcion\xE1rio exclu\xEDdo." });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      var CAMPOS_EMPRESA = { razao_social: 150, nome_fantasia: 150, endereco: 200, cidade: 80, telefone: 30, email: 254 };
      async function lerEmpresa() {
        const e = await get("SELECT razao_social,nome_fantasia,cnpj,endereco,cidade,uf,telefone,email FROM empresa WHERE id=1");
        return e || { razao_social: "", nome_fantasia: "", cnpj: "", endereco: "", cidade: "", uf: "", telefone: "", email: "" };
      }
      app.get("/api/empresa", requireAuth, async (req, res) => {
        try {
          res.json(await lerEmpresa());
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.put("/api/empresa", requireAuth, requireEditar("parametros"), async (req, res) => {
        const b = req.body || {};
        const dados = {};
        for (const [campo, maximo] of Object.entries(CAMPOS_EMPRESA)) {
          dados[campo] = normalizarTexto(b[campo] ?? "");
          if (dados[campo].length > maximo) return res.status(400).json({ error: `"${campo.replace(/_/g, " ")}" at\xE9 ${maximo} caracteres.` });
        }
        if (!dados.razao_social) return res.status(400).json({ error: "Informe a raz\xE3o social (ou o nome) da empresa." });
        dados.cnpj = somenteDigitos(b.cnpj);
        if (dados.cnpj && !cnpjValido(dados.cnpj)) return res.status(400).json({ error: "CNPJ da empresa inv\xE1lido." });
        dados.uf = String(b.uf ?? "").trim().toUpperCase();
        if (dados.uf && !UFS.includes(dados.uf)) return res.status(400).json({ error: "UF inv\xE1lida." });
        if (dados.email && !REGEX_EMAIL.test(dados.email)) return res.status(400).json({ error: "E-mail da empresa inv\xE1lido." });
        try {
          const colunas = ["razao_social", "nome_fantasia", "cnpj", "endereco", "cidade", "uf", "telefone", "email"];
          if (await get("SELECT id FROM empresa WHERE id=1")) await run(`UPDATE empresa SET ${colunas.map((c) => `${c}=?`).join(",")}, atualizado_em=CURRENT_TIMESTAMP WHERE id=1`, colunas.map((c) => dados[c]));
          else await run(`INSERT INTO empresa (id,${colunas.join(",")}) VALUES (1,${colunas.map(() => "?").join(",")})`, colunas.map((c) => dados[c]));
          res.json({ mensagem: "Dados da empresa salvos. Eles aparecem no cabe\xE7alho dos holerites.", empresa: dados });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      async function opcoesDaCompetencia(competencia) {
        const ano = Number(competencia.slice(0, 4));
        const lista = await tabelasCltDisponiveis();
        const escolhida = [...lista].reverse().find((t) => t.ano <= ano) || lista[0];
        return { encargos_patronais_percentual: await lerParametro("clt_encargos_patronais_percentual"), tabela: escolhida.tabela, aviso: escolhida.ano < ano ? `As tabelas de ${ano} ainda n\xE3o foram cadastradas em Par\xE2metros: o c\xE1lculo usa as de ${escolhida.ano}.` : null };
      }
      function calcularHoleriteComAviso(f, variaveis, competencia, opcoes) {
        const calculo = calcularHolerite(f, variaveis, competencia, opcoes, opcoes.tabela);
        if (!calculo.erro && opcoes.aviso && f.tipo_vinculo !== "PJ") calculo.avisos.unshift(opcoes.aviso);
        return calculo;
      }
      var trabalhaNoMes = (f, competencia) => {
        const inicio = `${competencia}-01`, fim = `${competencia}-31`;
        return (!f.data_admissao || f.data_admissao <= fim) && (!f.data_desligamento || f.data_desligamento >= inicio);
      };
      function retratoFuncionario(f) {
        const campos = ["id", "tipo_vinculo", "nome_completo", "cpf", "cargo", "cbo", "departamento", "data_admissao", "data_desligamento", "jornada_semanal", "pis", "cnpj", "razao_social", "banco", "agencia", "conta_bancaria", "tipo_conta", "chave_pix", "dependentes_irrf", "salario_bruto"];
        return Object.fromEntries(campos.map((c) => [c, f[c] ?? null]));
      }
      var momentoIso = (v) => v instanceof Date ? v.toISOString() : v ? `${String(v).replace(" ", "T")}${/Z|[+-]\d\d:?\d\d$/.test(String(v)) ? "" : "Z"}` : null;
      function holeriteResumo(h) {
        return { id: Number(h.id), funcionario_id: Number(h.funcionario_id), competencia: h.competencia, tipo_vinculo: h.tipo_vinculo, total_proventos: Number(h.total_proventos), total_descontos: Number(h.total_descontos), liquido: Number(h.liquido), gerado_em: momentoIso(h.gerado_em), gerado_por_nome: h.gerado_por_nome || "", conta: h.conta_id ? { id: Number(h.conta_id), status: h.conta_status, vencimento: h.conta_vencimento ? diaIso(h.conta_vencimento) : null, data_pagamento: h.conta_data_pagamento ? diaIso(h.conta_data_pagamento) : null } : null };
      }
      var SQL_HOLERITE = `SELECT h.*, u.nome AS gerado_por_nome, c.status AS conta_status, c.vencimento AS conta_vencimento, c.data_pagamento AS conta_data_pagamento
  FROM holerite h LEFT JOIN usuarios_erp u ON u.id=h.gerado_por LEFT JOIN contas c ON c.id=h.conta_id`;
      app.get("/api/folha", requireAuth, requireVer("clt"), async (req, res) => {
        const competencia = String(req.query.competencia || dataDeHoje().slice(0, 7));
        if (!competenciaValida(competencia)) return res.status(400).json({ error: "M\xEAs inv\xE1lido (use AAAA-MM)." });
        try {
          const opcoes = await opcoesDaCompetencia(competencia);
          const funcionarios = (await all("SELECT * FROM funcionario ORDER BY nome_completo")).map(funcionarioDoBanco);
          const holerites = (await all(`${SQL_HOLERITE} WHERE h.competencia=?`, [competencia])).map((h) => ({ ...holeriteResumo(h), dados: JSON.parse(h.dados) }));
          const linhas = [];
          for (const f of funcionarios) {
            const h = holerites.find((x) => x.funcionario_id === f.id);
            if (!h && !(f.ativo && trabalhaNoMes(f, competencia))) continue;
            const previa = h ? null : calcularHoleriteComAviso(f, {}, competencia, opcoes);
            const base = h ? h.dados.calculo : previa;
            linhas.push({
              funcionario: { id: f.id, nome_completo: f.nome_completo, cargo: f.cargo, tipo_vinculo: f.tipo_vinculo, cpf: f.cpf, ativo: f.ativo, data_admissao: f.data_admissao, data_desligamento: f.data_desligamento },
              holerite: h ? { ...h, dados: void 0 } : null,
              previa: previa && !previa.erro ? { totais: previa.totais, custo_total: previa.empresa.custo_total } : null,
              erro: previa?.erro || null,
              custo_total: base && !base.erro ? base.empresa.custo_total : 0,
              liquido: h ? h.liquido : previa && !previa.erro ? previa.totais.liquido : 0,
              proventos: h ? h.total_proventos : previa && !previa.erro ? previa.totais.proventos : 0,
              descontos: h ? h.total_descontos : previa && !previa.erro ? previa.totais.descontos : 0
            });
          }
          const gerados = linhas.filter((l) => l.holerite);
          res.json({
            competencia,
            competencia_rotulo: rotuloCompetencia(competencia),
            aviso_tabela: opcoes.aviso,
            linhas,
            totais: {
              pessoas: linhas.length,
              gerados: gerados.length,
              pendentes: linhas.length - gerados.length,
              proventos: somar(linhas, (l) => l.proventos),
              descontos: somar(linhas, (l) => l.descontos),
              liquido: somar(linhas, (l) => l.liquido),
              custo_total: somar(linhas, (l) => l.custo_total),
              pagos: gerados.filter((l) => l.holerite.conta?.status === "Pago").length
            }
          });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      async function lerPedidoHolerite(corpo) {
        const funcionarioId = parseInteiro(corpo?.funcionario_id);
        const competencia = String(corpo?.competencia || "");
        if (!funcionarioId) return { status: 400, erro: "Escolha o funcion\xE1rio." };
        if (!competenciaValida(competencia)) return { status: 400, erro: "M\xEAs inv\xE1lido (use AAAA-MM)." };
        const linha = await get("SELECT * FROM funcionario WHERE id=?", [funcionarioId]);
        if (!linha) return { status: 404, erro: "Funcion\xE1rio n\xE3o encontrado." };
        const f = funcionarioDoBanco(linha);
        const opcoes = await opcoesDaCompetencia(competencia);
        const calculo = calcularHoleriteComAviso(f, corpo?.variaveis || {}, competencia, opcoes);
        if (calculo.erro) return { status: 400, erro: calculo.erro };
        return { f, competencia, calculo };
      }
      app.post("/api/holerites/simular", requireAuth, requireVer("clt"), async (req, res) => {
        try {
          const p = await lerPedidoHolerite(req.body);
          if (p.erro) return res.status(p.status).json({ error: p.erro });
          res.json(p.calculo);
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.post("/api/holerites", requireAuth, requireEditar("clt"), async (req, res) => {
        const lancar = SIM(req.body?.lancar_conta);
        const vencimento = String(req.body?.vencimento || "");
        if (lancar && !dataReal(vencimento)) return res.status(400).json({ error: "Informe a data de pagamento para lan\xE7ar em Contas a pagar." });
        try {
          const p = await lerPedidoHolerite(req.body);
          if (p.erro) return res.status(p.status).json({ error: p.erro });
          const { f, competencia, calculo } = p;
          const empresa = await lerEmpresa();
          const resultado = await transaction(async () => {
            const existente = await get("SELECT h.id, h.conta_id, c.status AS conta_status FROM holerite h LEFT JOIN contas c ON c.id=h.conta_id WHERE h.funcionario_id=? AND h.competencia=?", [f.id, competencia]);
            if (existente?.conta_status === "Pago") throw Object.assign(new Error("Este holerite j\xE1 foi pago em Contas a pagar. Desfa\xE7a o pagamento l\xE1 para refazer o holerite."), { statusCode: 409 });
            const dados = JSON.stringify({ calculo, funcionario: retratoFuncionario(f), empresa });
            const mesAno = `${competencia.slice(5, 7)}/${competencia.slice(0, 4)}`;
            const descricaoConta = `${f.tipo_vinculo === "PJ" ? "Honor\xE1rios" : "Sal\xE1rio"} ${mesAno} \xB7 ${f.nome_completo}`;
            let contaId = existente?.conta_id ? Number(existente.conta_id) : null;
            if (lancar && calculo.totais.liquido > 0) {
              if (contaId) await run("UPDATE contas SET descricao=?,valor=?,vencimento=?,categoria=? WHERE id=?", [descricaoConta, calculo.totais.liquido, vencimento, "Folha de pagamento", contaId]);
              else contaId = Number((await run("INSERT INTO contas (descricao,valor,vencimento,categoria,observacoes,competencia) VALUES (?,?,?,?,?,?)", [descricaoConta, calculo.totais.liquido, vencimento, "Folha de pagamento", `Holerite de ${rotuloCompetencia(competencia)}.`, competencia])).lastID);
            } else if (contaId) {
              await run("UPDATE holerite SET conta_id=NULL WHERE id=?", [existente.id]);
              await run("DELETE FROM contas WHERE id=? AND status='Pendente'", [contaId]);
              contaId = null;
            }
            const valores = [calculo.tipo_vinculo, JSON.stringify(calculo.variaveis), dados, calculo.totais.proventos, calculo.totais.descontos, calculo.totais.liquido, contaId, req.user.id];
            let id;
            if (existente) {
              await run("UPDATE holerite SET tipo_vinculo=?,variaveis=?,dados=?,total_proventos=?,total_descontos=?,liquido=?,conta_id=?,gerado_por=?,gerado_em=CURRENT_TIMESTAMP WHERE id=?", [...valores, existente.id]);
              id = Number(existente.id);
            } else id = Number((await run("INSERT INTO holerite (tipo_vinculo,variaveis,dados,total_proventos,total_descontos,liquido,conta_id,gerado_por,funcionario_id,competencia) VALUES (?,?,?,?,?,?,?,?,?,?)", [...valores, f.id, competencia])).lastID);
            await registrarLog(req.user, "CLT", `Holerite ${existente ? "refeito" : "gerado"}: ${f.nome_completo}, ${rotuloCompetencia(competencia)} (l\xEDquido R$ ${calculo.totais.liquido.toFixed(2).replace(".", ",")})`, { valor: calculo.totais.liquido });
            return { id, refeito: Boolean(existente), conta_id: contaId };
          });
          res.status(resultado.refeito ? 200 : 201).json({ ...resultado, calculo, mensagem: `Holerite de ${rotuloCompetencia(competencia)} ${resultado.refeito ? "atualizado" : "gerado"}${resultado.conta_id ? " e lan\xE7ado em Contas a pagar" : ""}.` });
        } catch (e) {
          if (e.statusCode) return res.status(e.statusCode).json({ error: e.message });
          errorResponse(res, e);
        }
      });
      app.get("/api/holerites", requireAuth, requireVer("clt"), async (req, res) => {
        const funcionarioId = parseInteiro(req.query.funcionario_id);
        try {
          const linhas = await all(`${SQL_HOLERITE} ${funcionarioId ? "WHERE h.funcionario_id=?" : ""} ORDER BY h.competencia DESC, h.id DESC LIMIT 500`, funcionarioId ? [funcionarioId] : []);
          res.json(linhas.map(holeriteResumo));
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.get("/api/holerites/:id", requireAuth, requireVer("clt"), async (req, res) => {
        try {
          const h = await get(`${SQL_HOLERITE} WHERE h.id=?`, [req.params.id]);
          if (!h) return res.status(404).json({ error: "Holerite n\xE3o encontrado." });
          res.json({ ...holeriteResumo(h), ...JSON.parse(h.dados) });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.delete("/api/holerites/:id", requireAuth, requireEditar("clt"), async (req, res) => {
        try {
          const h = await get("SELECT h.id,h.competencia,h.conta_id,c.status AS conta_status,f.nome_completo FROM holerite h JOIN funcionario f ON f.id=h.funcionario_id LEFT JOIN contas c ON c.id=h.conta_id WHERE h.id=?", [req.params.id]);
          if (!h) return res.status(404).json({ error: "Holerite n\xE3o encontrado." });
          if (h.conta_status === "Pago") return res.status(409).json({ error: "Este holerite j\xE1 foi pago em Contas a pagar e n\xE3o pode ser exclu\xEDdo." });
          await transaction(async () => {
            await run("DELETE FROM holerite WHERE id=?", [h.id]);
            if (h.conta_id) await run("DELETE FROM contas WHERE id=? AND status='Pendente'", [h.conta_id]);
            await registrarLog(req.user, "CLT", `Holerite exclu\xEDdo: ${h.nome_completo}, ${rotuloCompetencia(h.competencia)}`);
          });
          res.json({ mensagem: `Holerite exclu\xEDdo${h.conta_id ? " e a conta a pagar dele foi removida" : ""}.` });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.get("/api/vendas/config", requireAuth, async (req, res) => {
        try {
          res.json({ brinde_quantidade_minima: await lerParametro("brinde_quantidade_minima") });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.put("/api/produtos/:id/status", requireAuth, requireEditar("estoque"), async (req, res) => {
        const ativo = req.body.ativo === true || String(req.body.ativo) === "true";
        try {
          const produto = await get("SELECT id FROM produtos WHERE id=?", [req.params.id]);
          if (!produto) return res.status(404).json({ error: "Produto n\xE3o encontrado." });
          const r = await run("UPDATE produtos SET ativo=? WHERE id=?", [toDbBool(ativo), req.params.id]);
          if (!r.changes) return res.status(404).json({ error: "Produto n\xE3o encontrado." });
          res.json({ mensagem: ativo ? "Produto reativado." : "Produto inativado. O hist\xF3rico de vendas foi preservado.", ativo });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      var LIMITES_MODELO = { cores: 20, tamanhos: 15, variacoes: 120, rotulo: 30, nome: 60 };
      var normalizarTexto = (valor) => String(valor ?? "").trim().replace(/\s+/g, " ");
      var chaveTexto = (valor) => normalizarTexto(valor).toLowerCase();
      var nomeVariacao = (modelo, cor, tamanho) => [modelo, cor, tamanho].filter(Boolean).join(" - ");
      function lerRotulos(valor, campo) {
        const itens = Array.isArray(valor) ? valor : String(valor ?? "").split(/[,;\n]/);
        const vistos = /* @__PURE__ */ new Set();
        const lista = [];
        for (const bruto of itens) {
          if (typeof bruto !== "string" && typeof bruto !== "number") return { erro: `Valor inv\xE1lido em ${campo}.` };
          const rotulo = normalizarTexto(bruto);
          if (!rotulo) continue;
          if (rotulo.length > LIMITES_MODELO.rotulo) return { erro: `Cada item de ${campo} pode ter at\xE9 ${LIMITES_MODELO.rotulo} caracteres.` };
          if (vistos.has(rotulo.toLowerCase())) continue;
          vistos.add(rotulo.toLowerCase());
          lista.push(rotulo);
        }
        return { lista };
      }
      async function criarVariacoes(modelo, cores, tamanhos) {
        const existentes = await all("SELECT cor,tamanho FROM produtos WHERE modelo_id=?", [modelo.id]);
        const jaExiste = new Set(existentes.map((v) => `${chaveTexto(v.cor)}|${chaveTexto(v.tamanho)}`));
        let criadas = 0;
        for (const cor of cores.length ? cores : [""]) {
          for (const tamanho of tamanhos.length ? tamanhos : [""]) {
            if (jaExiste.has(`${chaveTexto(cor)}|${chaveTexto(tamanho)}`)) continue;
            await run(
              "INSERT INTO produtos (nome,categoria,preco,estoque,ativo,modelo_id,cor,tamanho) VALUES (?,?,?,0,?,?,?,?)",
              [nomeVariacao(modelo.nome, cor, tamanho), modelo.categoria, modelo.preco, toDbBool(true), modelo.id, cor, tamanho]
            );
            criadas += 1;
          }
        }
        return criadas;
      }
      async function nomeDeModeloEmUso(nome, ignorarId = 0) {
        const modelos = await all("SELECT id,nome FROM modelos");
        return modelos.some((m) => Number(m.id) !== Number(ignorarId) && chaveTexto(m.nome) === chaveTexto(nome));
      }
      var LIMITE_NOME_COR = 30;
      var inserirCor = (nome) => run(USE_POSTGRES ? "INSERT INTO cor (nome) VALUES (?) RETURNING id_cor AS id" : "INSERT INTO cor (nome) VALUES (?)", [nome]);
      var mensagemCoresFaltando = (faltando) => `${faltando.length === 1 ? "Cor n\xE3o cadastrada" : "Cores n\xE3o cadastradas"}: ${faltando.join(", ")}. Escolha uma cor da lista ou cadastre-a antes.`;
      async function resolverCores(nomes) {
        const cadastradas = await all("SELECT nome FROM cor");
        const porChave = new Map(cadastradas.map((c) => [chaveTexto(c.nome), c.nome]));
        const resolvidas = [], faltando = [], vistas = /* @__PURE__ */ new Set();
        for (const nome of nomes) {
          const oficial = porChave.get(chaveTexto(nome));
          if (!oficial) {
            faltando.push(nome);
            continue;
          }
          if (vistas.has(chaveTexto(oficial))) continue;
          vistas.add(chaveTexto(oficial));
          resolvidas.push(oficial);
        }
        return { resolvidas, faltando };
      }
      app.get("/api/cores", requireAuth, async (req, res) => {
        try {
          const cores = await all("SELECT id_cor,nome FROM cor");
          cores.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
          res.json(cores.map((c) => ({ id_cor: Number(c.id_cor), nome: c.nome })));
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.post("/api/cores", requireAuth, requireEditar("estoque"), async (req, res) => {
        const nome = normalizarTexto(req.body?.nome);
        if (!nome || nome.length > LIMITE_NOME_COR || /[,;]/.test(nome)) return res.status(400).json({ error: `Informe o nome da cor (at\xE9 ${LIMITE_NOME_COR} caracteres, sem v\xEDrgula nem ponto e v\xEDrgula).` });
        try {
          const existente = (await all("SELECT nome FROM cor")).find((c) => chaveTexto(c.nome) === chaveTexto(nome));
          if (existente) return res.status(409).json({ error: `Esta cor j\xE1 est\xE1 cadastrada como "${existente.nome}".` });
          const r = await inserirCor(nome);
          await registrarLog(req.user, "COR", `Cor cadastrada: ${nome}`);
          res.status(201).json({ id_cor: Number(r.lastID), nome });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.delete("/api/cores/:id", requireAuth, requireEditar("estoque"), async (req, res) => {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) return res.status(404).json({ error: "Cor n\xE3o encontrada." });
        try {
          const cor = await get("SELECT id_cor,nome FROM cor WHERE id_cor=?", [id]);
          if (!cor) return res.status(404).json({ error: "Cor n\xE3o encontrada." });
          const emUso = (await all("SELECT cor FROM produtos WHERE cor <> ''")).filter((p) => chaveTexto(p.cor) === chaveTexto(cor.nome)).length;
          if (emUso) return res.status(409).json({ error: `A cor "${cor.nome}" est\xE1 em uso por ${emUso} ${emUso === 1 ? "pe\xE7a" : "pe\xE7as"} e n\xE3o pode ser exclu\xEDda.` });
          await run("DELETE FROM cor WHERE id_cor=?", [id]);
          res.json({ mensagem: "Cor exclu\xEDda." });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      var LIMITE_FOTO_BYTES = 300 * 1024;
      var receberFoto = express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: LIMITE_FOTO_BYTES });
      var idPositivo = (valor) => {
        const n = Number(valor);
        return Number.isInteger(n) && n > 0 ? n : null;
      };
      function erroDeFoto(err, req, res, next) {
        if (err?.type === "entity.too.large") return res.status(413).json({ error: `Foto grande demais. O limite \xE9 ${LIMITE_FOTO_BYTES / 1024} KB depois da compress\xE3o.` });
        next(err);
      }
      function tipoDaImagem(b) {
        if (!import_buffer.Buffer.isBuffer(b) || b.length < 12) return null;
        if (b[0] === 255 && b[1] === 216 && b[2] === 255) return "image/jpeg";
        if (b.subarray(0, 8).equals(import_buffer.Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
        if (b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
        return null;
      }
      async function gravarFoto(corpo) {
        const mime = tipoDaImagem(corpo);
        if (!mime) throw Object.assign(new Error("Envie uma imagem JPEG, PNG ou WebP."), { statusCode: 415 });
        const r = await run(USE_POSTGRES ? "INSERT INTO foto (tipo_mime,dados,tamanho) VALUES (?,?,?) RETURNING id_foto AS id" : "INSERT INTO foto (tipo_mime,dados,tamanho) VALUES (?,?,?)", [mime, corpo, corpo.length]);
        return Number(r.lastID);
      }
      var removerFotosOrfas = () => run("DELETE FROM foto WHERE id_foto NOT IN (SELECT id_foto FROM produtos WHERE id_foto IS NOT NULL) AND id_foto NOT IN (SELECT id_foto FROM modelos WHERE id_foto IS NOT NULL)");
      var respostaDeFoto = (res, e) => e.statusCode ? res.status(e.statusCode).json({ error: e.message }) : errorResponse(res, e);
      app.get("/api/fotos/:id", async (req, res) => {
        try {
          const id = idPositivo(req.params.id);
          const foto = id === null ? null : await get("SELECT tipo_mime,dados FROM foto WHERE id_foto=?", [id]);
          if (!foto) return res.status(404).json({ error: "Foto n\xE3o encontrada." });
          res.setHeader("Content-Type", foto.tipo_mime);
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          res.send(import_buffer.Buffer.from(foto.dados));
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.put("/api/produtos/:id/foto", requireAuth, requireEditar("estoque"), receberFoto, erroDeFoto, async (req, res) => {
        const id = idPositivo(req.params.id);
        try {
          const idFoto = await transaction(async () => {
            if (id === null || !await get("SELECT id FROM produtos WHERE id=?", [id])) throw Object.assign(new Error("Produto n\xE3o encontrado."), { statusCode: 404 });
            const nova = await gravarFoto(req.body);
            await run("UPDATE produtos SET id_foto=? WHERE id=?", [nova, id]);
            await removerFotosOrfas();
            return nova;
          });
          res.json({ id_foto: idFoto });
        } catch (e) {
          respostaDeFoto(res, e);
        }
      });
      app.delete("/api/produtos/:id/foto", requireAuth, requireEditar("estoque"), async (req, res) => {
        const id = idPositivo(req.params.id);
        try {
          await transaction(async () => {
            if (id === null || !await get("SELECT id FROM produtos WHERE id=?", [id])) throw Object.assign(new Error("Produto n\xE3o encontrado."), { statusCode: 404 });
            await run("UPDATE produtos SET id_foto=NULL WHERE id=?", [id]);
            await removerFotosOrfas();
          });
          res.json({ mensagem: "Foto removida." });
        } catch (e) {
          respostaDeFoto(res, e);
        }
      });
      async function pecasDaCor(modeloId, cor) {
        const pecas = (await all("SELECT id,cor FROM produtos WHERE modelo_id=?", [modeloId])).filter((p) => chaveTexto(p.cor) === chaveTexto(cor));
        if (!pecas.length) throw Object.assign(new Error("Esta cor n\xE3o existe neste modelo."), { statusCode: 404 });
        return pecas;
      }
      app.put("/api/modelos/:id/foto", requireAuth, requireEditar("estoque"), receberFoto, erroDeFoto, async (req, res) => {
        const id = idPositivo(req.params.id);
        const cor = typeof req.query.cor === "string" ? req.query.cor : "";
        try {
          const idFoto = await transaction(async () => {
            if (id === null || !await get("SELECT id FROM modelos WHERE id=?", [id])) throw Object.assign(new Error("Modelo n\xE3o encontrado."), { statusCode: 404 });
            const pecas = cor ? await pecasDaCor(id, cor) : null;
            const nova = await gravarFoto(req.body);
            if (pecas) for (const peca of pecas) await run("UPDATE produtos SET id_foto=? WHERE id=?", [nova, peca.id]);
            else await run("UPDATE modelos SET id_foto=? WHERE id=?", [nova, id]);
            await removerFotosOrfas();
            return nova;
          });
          res.json({ id_foto: idFoto });
        } catch (e) {
          respostaDeFoto(res, e);
        }
      });
      app.delete("/api/modelos/:id/foto", requireAuth, requireEditar("estoque"), async (req, res) => {
        const id = idPositivo(req.params.id);
        const cor = typeof req.query.cor === "string" ? req.query.cor : "";
        try {
          await transaction(async () => {
            if (id === null || !await get("SELECT id FROM modelos WHERE id=?", [id])) throw Object.assign(new Error("Modelo n\xE3o encontrado."), { statusCode: 404 });
            if (cor) for (const peca of await pecasDaCor(id, cor)) await run("UPDATE produtos SET id_foto=NULL WHERE id=?", [peca.id]);
            else await run("UPDATE modelos SET id_foto=NULL WHERE id=?", [id]);
            await removerFotosOrfas();
          });
          res.json({ mensagem: "Foto removida." });
        } catch (e) {
          respostaDeFoto(res, e);
        }
      });
      app.get("/api/modelos", requireAuth, async (req, res) => {
        try {
          const modelos = await all("SELECT id,nome,categoria,preco,id_foto FROM modelos ORDER BY nome");
          const variacoes = await all("SELECT id,modelo_id,nome,cor,tamanho,preco,estoque,ativo,id_foto FROM produtos WHERE modelo_id IS NOT NULL ORDER BY id");
          res.json(modelos.map((modelo) => {
            const doModelo = variacoes.filter((v) => Number(v.modelo_id) === Number(modelo.id)).map((v) => ({ id: v.id, nome: v.nome, cor: v.cor, tamanho: v.tamanho, preco: Number(v.preco), estoque: Number(v.estoque), ativo: fromDbBool(v.ativo), id_foto: v.id_foto == null ? null : Number(v.id_foto) }));
            return {
              id: modelo.id,
              nome: modelo.nome,
              categoria: modelo.categoria,
              preco: Number(modelo.preco),
              id_foto: modelo.id_foto == null ? null : Number(modelo.id_foto),
              total_estoque: doModelo.reduce((soma, v) => soma + v.estoque, 0),
              ativo: doModelo.some((v) => v.ativo),
              variacoes: doModelo
            };
          }));
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.post("/api/modelos", requireAuth, requireEditar("estoque"), async (req, res) => {
        const nome = normalizarTexto(req.body.nome), preco = parseMoney(req.body.preco);
        let categoria = normalizarTexto(req.body.categoria);
        if (!nome || nome.length > LIMITES_MODELO.nome || !categoria || preco === null) {
          return res.status(400).json({ error: `Nome (at\xE9 ${LIMITES_MODELO.nome} caracteres), categoria e pre\xE7o v\xE1lido s\xE3o obrigat\xF3rios. Use no m\xE1ximo duas casas decimais.` });
        }
        const cores = lerRotulos(req.body.cores, "cores"), tamanhos = lerRotulos(req.body.tamanhos, "tamanhos");
        if (cores.erro || tamanhos.erro) return res.status(400).json({ error: cores.erro || tamanhos.erro });
        if (!cores.lista.length && !tamanhos.lista.length) return res.status(400).json({ error: "Informe ao menos uma cor ou um tamanho." });
        if (cores.lista.length > LIMITES_MODELO.cores || tamanhos.lista.length > LIMITES_MODELO.tamanhos) {
          return res.status(400).json({ error: `Use no m\xE1ximo ${LIMITES_MODELO.cores} cores e ${LIMITES_MODELO.tamanhos} tamanhos por modelo.` });
        }
        if (Math.max(cores.lista.length, 1) * Math.max(tamanhos.lista.length, 1) > LIMITES_MODELO.variacoes) {
          return res.status(400).json({ error: `O modelo n\xE3o pode passar de ${LIMITES_MODELO.variacoes} varia\xE7\xF5es.` });
        }
        try {
          const coresOk = await resolverCores(cores.lista);
          if (coresOk.faltando.length) return res.status(400).json({ error: mensagemCoresFaltando(coresOk.faltando) });
          if (await nomeDeModeloEmUso(nome)) return res.status(409).json({ error: "J\xE1 existe um modelo com este nome." });
          if (categoria.length > 40) return res.status(400).json({ error: "Categoria at\xE9 40 caracteres." });
          categoria = await garantirCategoria(categoria);
          const resultado = await transaction(async () => {
            const modelo = await run("INSERT INTO modelos (nome,categoria,preco) VALUES (?,?,?)", [nome, categoria, preco]);
            const criadas = await criarVariacoes({ id: modelo.lastID, nome, categoria, preco }, coresOk.resolvidas, tamanhos.lista);
            await registrarLog(req.user, "MODELO", `Modelo cadastrado: ${nome} (${categoria}), ${Number(criadas)} ${Number(criadas) === 1 ? "pe\xE7a" : "pe\xE7as"}${coresOk.resolvidas.length ? ` | cores: ${coresOk.resolvidas.join(", ")}` : ""}${tamanhos.lista.length ? ` | tamanhos: ${tamanhos.lista.join(", ")}` : ""}`, { valor: preco });
            return { id: modelo.lastID, variacoes_criadas: criadas };
          });
          res.status(201).json(resultado);
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.post("/api/modelos/:id/variacoes", requireAuth, requireEditar("estoque"), async (req, res) => {
        const cores = lerRotulos(req.body.cores, "cores"), tamanhos = lerRotulos(req.body.tamanhos, "tamanhos");
        if (cores.erro || tamanhos.erro) return res.status(400).json({ error: cores.erro || tamanhos.erro });
        if (!cores.lista.length && !tamanhos.lista.length) return res.status(400).json({ error: "Informe ao menos uma cor ou um tamanho novo." });
        try {
          const resultado = await transaction(async () => {
            const modelo = await get("SELECT id,nome,categoria,preco FROM modelos WHERE id=?", [req.params.id]);
            if (!modelo) throw Object.assign(new Error("Modelo n\xE3o encontrado."), { statusCode: 404 });
            const coresOk = await resolverCores(cores.lista);
            if (coresOk.faltando.length) throw Object.assign(new Error(mensagemCoresFaltando(coresOk.faltando)), { statusCode: 400 });
            const existentes = await all("SELECT cor,tamanho FROM produtos WHERE modelo_id=?", [modelo.id]);
            if (cores.lista.length && existentes.some((v) => !v.cor)) throw Object.assign(new Error("Este modelo foi cadastrado sem cores. Cadastre um novo modelo com cores e tamanhos."), { statusCode: 409 });
            if (tamanhos.lista.length && existentes.some((v) => !v.tamanho)) throw Object.assign(new Error("Este modelo foi cadastrado sem tamanhos. Cadastre um novo modelo com cores e tamanhos."), { statusCode: 409 });
            const unir = (atuais, novos) => {
              const vistos = new Set(atuais.map(chaveTexto));
              return [...atuais, ...novos.filter((item) => !vistos.has(chaveTexto(item)))];
            };
            const todasCores = unir([...new Set(existentes.map((v) => v.cor).filter(Boolean))], coresOk.resolvidas);
            const todosTamanhos = unir([...new Set(existentes.map((v) => v.tamanho).filter(Boolean))], tamanhos.lista);
            if (todasCores.length > LIMITES_MODELO.cores || todosTamanhos.length > LIMITES_MODELO.tamanhos || Math.max(todasCores.length, 1) * Math.max(todosTamanhos.length, 1) > LIMITES_MODELO.variacoes) {
              throw Object.assign(new Error(`Limite excedido: no m\xE1ximo ${LIMITES_MODELO.cores} cores, ${LIMITES_MODELO.tamanhos} tamanhos e ${LIMITES_MODELO.variacoes} varia\xE7\xF5es por modelo.`), { statusCode: 400 });
            }
            const criadas = await criarVariacoes({ id: modelo.id, nome: modelo.nome, categoria: modelo.categoria, preco: modelo.preco }, todasCores, todosTamanhos);
            if (Number(criadas)) await registrarLog(req.user, "VARIACAO", `Varia\xE7\xF5es adicionadas ao modelo ${modelo.nome}: ${Number(criadas)} ${Number(criadas) === 1 ? "pe\xE7a nova" : "pe\xE7as novas"}${coresOk.resolvidas.length ? ` | cores: ${coresOk.resolvidas.join(", ")}` : ""}${tamanhos.lista.length ? ` | tamanhos: ${tamanhos.lista.join(", ")}` : ""}`, { valor: Number(modelo.preco) });
            return { variacoes_criadas: criadas };
          });
          res.status(201).json(resultado);
        } catch (e) {
          if (e.statusCode) return res.status(e.statusCode).json({ error: e.message });
          errorResponse(res, e);
        }
      });
      app.put("/api/modelos/:id", requireAuth, requireEditar("estoque"), async (req, res) => {
        const nome = normalizarTexto(req.body.nome), preco = parseMoney(req.body.preco);
        let categoria = normalizarTexto(req.body.categoria);
        if (!nome || nome.length > LIMITES_MODELO.nome || !categoria || preco === null) {
          return res.status(400).json({ error: `Nome (at\xE9 ${LIMITES_MODELO.nome} caracteres), categoria e pre\xE7o v\xE1lido s\xE3o obrigat\xF3rios. Use no m\xE1ximo duas casas decimais.` });
        }
        try {
          if (await nomeDeModeloEmUso(nome, req.params.id)) return res.status(409).json({ error: "J\xE1 existe um modelo com este nome." });
          if (categoria.length > 40) return res.status(400).json({ error: "Categoria at\xE9 40 caracteres." });
          categoria = await garantirCategoria(categoria);
          await transaction(async () => {
            const r = await run("UPDATE modelos SET nome=?,categoria=?,preco=? WHERE id=?", [nome, categoria, preco, req.params.id]);
            if (!r.changes) throw Object.assign(new Error("Modelo n\xE3o encontrado."), { statusCode: 404 });
            const variacoes = await all("SELECT id,cor,tamanho FROM produtos WHERE modelo_id=?", [req.params.id]);
            for (const v of variacoes) {
              await run("UPDATE produtos SET nome=?,categoria=?,preco=? WHERE id=?", [nomeVariacao(nome, v.cor, v.tamanho), categoria, preco, v.id]);
            }
          });
          res.json({ mensagem: "Modelo atualizado em todas as varia\xE7\xF5es." });
        } catch (e) {
          if (e.statusCode) return res.status(e.statusCode).json({ error: e.message });
          errorResponse(res, e);
        }
      });
      app.put("/api/modelos/:id/status", requireAuth, requireEditar("estoque"), async (req, res) => {
        const ativo = req.body.ativo === true || String(req.body.ativo) === "true";
        try {
          const modelo = await get("SELECT id FROM modelos WHERE id=?", [req.params.id]);
          if (!modelo) return res.status(404).json({ error: "Modelo n\xE3o encontrado." });
          await run("UPDATE produtos SET ativo=? WHERE modelo_id=?", [toDbBool(ativo), req.params.id]);
          res.json({ mensagem: ativo ? "Modelo reativado." : "Modelo inativado. O hist\xF3rico de vendas foi preservado.", ativo });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      function normalizeDiscountCode(value) {
        return String(value || "").trim().toUpperCase();
      }
      function discountIsValid(discount, today = dataDeHoje()) {
        return discount && discount.status === "Ativo" && (!discount.data_inicio || discount.data_inicio <= today) && (!discount.validade || discount.validade >= today);
      }
      function discountIsExpired(discount, today = dataDeHoje()) {
        return Boolean(discount?.validade) && discount.validade < today;
      }
      function discountValidationMessage(discount, today = dataDeHoje()) {
        if (discountIsExpired(discount, today)) return `Este desconto est\xE1 vencido desde ${discount.validade}. Defina uma nova data de validade antes de ativ\xE1-lo.`;
        if (discount.data_inicio && discount.data_inicio > today) return `Este desconto s\xF3 come\xE7a a valer em ${discount.data_inicio}.`;
        return null;
      }
      var LIMITES_FORNECEDOR = { razao_social: 150, nome_fantasia: 150, email: 254, contatos: 20 };
      var TIPOS_FORNECEDOR = ["FORNECEDOR", "PRESTADOR_PJ"];
      var REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      var somenteDigitos = (valor) => String(valor ?? "").replace(/\D/g, "");
      var inserirFornecedorTabela = (sql, params) => run(USE_POSTGRES ? `${sql} RETURNING id_fornecedor AS id` : sql, params);
      function cnpjValido(cnpj) {
        if (!/^\d{14}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
        const digito = (base) => {
          let soma = 0, peso = base.length - 7;
          for (const n of base) {
            soma += Number(n) * peso--;
            if (peso < 2) peso = 9;
          }
          const resto = soma % 11;
          return resto < 2 ? 0 : 11 - resto;
        };
        const d1 = digito(cnpj.slice(0, 12)), d2 = digito(cnpj.slice(0, 12) + d1);
        return cnpj.endsWith(`${d1}${d2}`);
      }
      function lerTelefones(lista) {
        if (lista === void 0 || lista === null) return { lista: [] };
        if (!Array.isArray(lista)) return { erro: "Os telefones devem ser enviados como uma lista." };
        if (lista.length > LIMITES_FORNECEDOR.contatos) return { erro: `Informe no m\xE1ximo ${LIMITES_FORNECEDOR.contatos} telefones por fornecedor.` };
        const vistos = /* @__PURE__ */ new Set(), saida = [];
        for (const [indice, item] of lista.entries()) {
          const rotulo = `Telefone ${indice + 1}`;
          const codigoPais = somenteDigitos(item?.codigo_pais), ddd = somenteDigitos(item?.ddd), numero = somenteDigitos(item?.numero);
          if (!/^[0-9]{1,4}$/.test(codigoPais)) return { erro: `${rotulo}: informe o c\xF3digo do pa\xEDs (1 a 4 d\xEDgitos, ex.: 55).` };
          if (codigoPais === "55") {
            if (!/^[1-9][0-9]$/.test(ddd)) return { erro: `${rotulo}: informe o DDD com 2 d\xEDgitos.` };
            if (!/^[0-9]{8,9}$/.test(numero)) return { erro: `${rotulo}: o n\xFAmero brasileiro tem 8 ou 9 d\xEDgitos, sem o DDD.` };
          } else {
            if (ddd && !/^[0-9]{2,3}$/.test(ddd)) return { erro: `${rotulo}: o DDD deve ter 2 ou 3 d\xEDgitos (ou ficar em branco).` };
            if (!/^[0-9]{4,12}$/.test(numero)) return { erro: `${rotulo}: o n\xFAmero deve ter de 4 a 12 d\xEDgitos.` };
          }
          if (codigoPais.length + ddd.length + numero.length > 15) return { erro: `${rotulo}: o telefone completo n\xE3o pode passar de 15 d\xEDgitos.` };
          const chave = `${codigoPais}|${ddd}|${numero}`;
          if (vistos.has(chave)) return { erro: `${rotulo}: telefone repetido para este fornecedor.` };
          vistos.add(chave);
          saida.push({ codigo_pais: codigoPais, ddd, numero });
        }
        return { lista: saida };
      }
      function lerEmails(lista) {
        if (lista === void 0 || lista === null) return { lista: [] };
        if (!Array.isArray(lista)) return { erro: "Os e-mails devem ser enviados como uma lista." };
        if (lista.length > LIMITES_FORNECEDOR.contatos) return { erro: `Informe no m\xE1ximo ${LIMITES_FORNECEDOR.contatos} e-mails por fornecedor.` };
        const vistos = /* @__PURE__ */ new Set(), saida = [];
        for (const [indice, item] of lista.entries()) {
          const email = String(item?.email ?? "").trim().toLowerCase();
          if (!email || email.length > LIMITES_FORNECEDOR.email || !REGEX_EMAIL.test(email)) return { erro: `E-mail ${indice + 1}: informe um endere\xE7o v\xE1lido.` };
          if (vistos.has(email)) return { erro: `E-mail ${indice + 1}: e-mail repetido para este fornecedor.` };
          vistos.add(email);
          saida.push({ email });
        }
        return { lista: saida };
      }
      function lerDadosFornecedor(body) {
        const razaoSocial = normalizarTexto(body?.razao_social), nomeFantasia = normalizarTexto(body?.nome_fantasia), cnpj = somenteDigitos(body?.cnpj);
        if (!razaoSocial || razaoSocial.length > LIMITES_FORNECEDOR.razao_social) return { erro: `Raz\xE3o social \xE9 obrigat\xF3ria (at\xE9 ${LIMITES_FORNECEDOR.razao_social} caracteres).` };
        if (nomeFantasia.length > LIMITES_FORNECEDOR.nome_fantasia) return { erro: `Nome fantasia pode ter at\xE9 ${LIMITES_FORNECEDOR.nome_fantasia} caracteres.` };
        if (!cnpjValido(cnpj)) return { erro: "CNPJ inv\xE1lido. Informe os 14 d\xEDgitos corretos (a m\xE1scara \xE9 opcional)." };
        const tipo = body?.tipo === void 0 || body?.tipo === null || body?.tipo === "" ? "FORNECEDOR" : String(body.tipo);
        if (!TIPOS_FORNECEDOR.includes(tipo)) return { erro: "Tipo inv\xE1lido. Use FORNECEDOR ou PRESTADOR_PJ." };
        const telefones = lerTelefones(body?.telefones), emails = lerEmails(body?.emails);
        if (telefones.erro || emails.erro) return { erro: telefones.erro || emails.erro };
        return { razaoSocial, nomeFantasia, cnpj, tipo, telefones: telefones.lista, emails: emails.lista };
      }
      async function gravarContatosFornecedor(idFornecedor, telefones, emails) {
        await run("DELETE FROM fornecedor_telefone WHERE id_fornecedor=?", [idFornecedor]);
        await run("DELETE FROM fornecedor_email WHERE id_fornecedor=?", [idFornecedor]);
        let sequencia = 0;
        for (const t of telefones) await inserirFornecedorTabela("INSERT INTO fornecedor_telefone (id_fornecedor,id_telefone,codigo_pais,ddd,numero) VALUES (?,?,?,?,?)", [idFornecedor, ++sequencia, t.codigo_pais, t.ddd, t.numero]);
        sequencia = 0;
        for (const e of emails) await inserirFornecedorTabela("INSERT INTO fornecedor_email (id_fornecedor,id_email,email) VALUES (?,?,?)", [idFornecedor, ++sequencia, e.email]);
      }
      var idDeFornecedor = (valor) => {
        const id = Number(valor);
        return Number.isInteger(id) && id > 0 ? id : null;
      };
      var cnpjEmUso = async (cnpj, ignorarId = 0) => Boolean(await get("SELECT id_fornecedor FROM fornecedor WHERE cnpj=? AND id_fornecedor<>?", [cnpj, ignorarId]));
      async function emailEmUso(emails, ignorarId = 0) {
        for (const e of emails) {
          const dono = await get("SELECT f.razao_social FROM fornecedor_email fe JOIN fornecedor f ON f.id_fornecedor=fe.id_fornecedor WHERE lower(fe.email)=? AND fe.id_fornecedor<>?", [e.email, ignorarId]);
          if (dono) return `O e-mail ${e.email} j\xE1 est\xE1 cadastrado para o fornecedor "${dono.razao_social}".`;
        }
        return null;
      }
      var formatarTelefone = (t) => `+${t.codigo_pais} ${t.ddd ? `(${t.ddd}) ` : ""}${t.numero}`;
      async function telefoneEmUso(telefones, ignorarId = 0) {
        for (const t of telefones) {
          const dono = await get("SELECT f.razao_social FROM fornecedor_telefone ft JOIN fornecedor f ON f.id_fornecedor=ft.id_fornecedor WHERE ft.codigo_pais=? AND ft.ddd=? AND ft.numero=? AND ft.id_fornecedor<>?", [t.codigo_pais, t.ddd, t.numero, ignorarId]);
          if (dono) return `O telefone ${formatarTelefone(t)} j\xE1 est\xE1 cadastrado para o fornecedor "${dono.razao_social}".`;
        }
        return null;
      }
      app.get("/api/fornecedores", requireAuth, requireVer("fornecedores", "contas"), async (req, res) => {
        try {
          const fornecedores = await all("SELECT id_fornecedor,razao_social,nome_fantasia,cnpj,tipo,ativo FROM fornecedor ORDER BY lower(razao_social), id_fornecedor");
          const telefones = await all("SELECT id_fornecedor,id_telefone,codigo_pais,ddd,numero FROM fornecedor_telefone ORDER BY id_fornecedor, id_telefone");
          const emails = await all("SELECT id_fornecedor,id_email,email FROM fornecedor_email ORDER BY id_fornecedor, id_email");
          res.json(fornecedores.map((f) => ({
            id_fornecedor: Number(f.id_fornecedor),
            razao_social: f.razao_social,
            nome_fantasia: f.nome_fantasia,
            cnpj: f.cnpj,
            tipo: f.tipo,
            ativo: fromDbBool(f.ativo),
            telefones: telefones.filter((t) => Number(t.id_fornecedor) === Number(f.id_fornecedor)).map((t) => ({ id_telefone: Number(t.id_telefone), codigo_pais: t.codigo_pais, ddd: t.ddd, numero: t.numero })),
            emails: emails.filter((e) => Number(e.id_fornecedor) === Number(f.id_fornecedor)).map((e) => ({ id_email: Number(e.id_email), email: e.email }))
          })));
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.post("/api/fornecedores", requireAuth, requireEditar("fornecedores"), async (req, res) => {
        const dados = lerDadosFornecedor(req.body);
        if (dados.erro) return res.status(400).json({ error: dados.erro });
        try {
          if (await cnpjEmUso(dados.cnpj)) return res.status(409).json({ error: "J\xE1 existe um fornecedor com este CNPJ." });
          const telefoneRepetido = await telefoneEmUso(dados.telefones);
          if (telefoneRepetido) return res.status(409).json({ error: telefoneRepetido });
          const emailRepetido = await emailEmUso(dados.emails);
          if (emailRepetido) return res.status(409).json({ error: emailRepetido });
          const id = await transaction(async () => {
            const r = await inserirFornecedorTabela("INSERT INTO fornecedor (razao_social,nome_fantasia,cnpj,tipo,ativo) VALUES (?,?,?,?,?)", [dados.razaoSocial, dados.nomeFantasia, dados.cnpj, dados.tipo, toDbBool(true)]);
            await gravarContatosFornecedor(r.lastID, dados.telefones, dados.emails);
            return r.lastID;
          });
          res.status(201).json({ id_fornecedor: Number(id) });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.put("/api/fornecedores/:id", requireAuth, requireEditar("fornecedores"), async (req, res) => {
        const id = idDeFornecedor(req.params.id);
        if (id === null) return res.status(404).json({ error: "Fornecedor n\xE3o encontrado." });
        const dados = lerDadosFornecedor(req.body);
        if (dados.erro) return res.status(400).json({ error: dados.erro });
        try {
          if (!await get("SELECT id_fornecedor FROM fornecedor WHERE id_fornecedor=?", [id])) return res.status(404).json({ error: "Fornecedor n\xE3o encontrado." });
          if (await cnpjEmUso(dados.cnpj, id)) return res.status(409).json({ error: "J\xE1 existe outro fornecedor com este CNPJ." });
          const telefoneRepetido = await telefoneEmUso(dados.telefones, id);
          if (telefoneRepetido) return res.status(409).json({ error: telefoneRepetido });
          const emailRepetido = await emailEmUso(dados.emails, id);
          if (emailRepetido) return res.status(409).json({ error: emailRepetido });
          await transaction(async () => {
            await run("UPDATE fornecedor SET razao_social=?,nome_fantasia=?,cnpj=?,tipo=? WHERE id_fornecedor=?", [dados.razaoSocial, dados.nomeFantasia, dados.cnpj, dados.tipo, id]);
            await gravarContatosFornecedor(id, dados.telefones, dados.emails);
          });
          res.json({ mensagem: "Fornecedor atualizado." });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.put("/api/fornecedores/:id/status", requireAuth, requireEditar("fornecedores"), async (req, res) => {
        const id = idDeFornecedor(req.params.id);
        if (id === null) return res.status(404).json({ error: "Fornecedor n\xE3o encontrado." });
        const ativo = req.body?.ativo === true || String(req.body?.ativo) === "true";
        try {
          const r = await run("UPDATE fornecedor SET ativo=? WHERE id_fornecedor=?", [toDbBool(ativo), id]);
          if (!r.changes) return res.status(404).json({ error: "Fornecedor n\xE3o encontrado." });
          res.json({ mensagem: ativo ? "Cadastro reativado." : "Cadastro inativado. As contas j\xE1 lan\xE7adas continuam vinculadas a ele." });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.delete("/api/fornecedores/:id", requireAuth, requireEditar("fornecedores"), async (req, res) => {
        const id = idDeFornecedor(req.params.id);
        if (id === null) return res.status(404).json({ error: "Fornecedor n\xE3o encontrado." });
        try {
          if (!await get("SELECT id_fornecedor FROM fornecedor WHERE id_fornecedor=?", [id])) return res.status(404).json({ error: "Fornecedor n\xE3o encontrado." });
          const vinculadas = Number((await get("SELECT COUNT(*) AS n FROM contas WHERE id_fornecedor=?", [id])).n);
          const fixas = Number((await get("SELECT COUNT(*) AS n FROM contas_fixas WHERE id_fornecedor=?", [id])).n);
          if (vinculadas || fixas) return res.status(409).json({ error: `Este cadastro tem ${vinculadas} ${vinculadas === 1 ? "conta a pagar" : "contas a pagar"}${fixas ? ` e ${fixas} ${fixas === 1 ? "d\xEDvida fixa" : "d\xEDvidas fixas"}` : ""} vinculadas e n\xE3o pode ser exclu\xEDdo. Inative o cadastro para tir\xE1-lo das listas e manter o hist\xF3rico.` });
          await transaction(async () => {
            await run("DELETE FROM fornecedor_telefone WHERE id_fornecedor=?", [id]);
            await run("DELETE FROM fornecedor_email WHERE id_fornecedor=?", [id]);
            await run("DELETE FROM fornecedor WHERE id_fornecedor=?", [id]);
          });
          res.json({ mensagem: "Fornecedor exclu\xEDdo com sucesso." });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.get("/api/descontos", requireAuth, async (req, res) => {
        try {
          const cupons = await all("SELECT id,nome,codigo,percentual,comissao_percentual,status,data_inicio,validade,criado_em FROM descontos ORDER BY id DESC");
          if (!pode(req.user, "descontos")) return res.json(cupons.map(({ comissao_percentual, ...publico }) => publico));
          const usos = await all(`SELECT v.desconto_id, COUNT(*) AS usos, COALESCE(SUM(v.desconto_valor),0) AS desconto_concedido, COALESCE(SUM(v.total),0) AS faturamento FROM vendas v WHERE v.desconto_id IS NOT NULL AND v.status_pagamento NOT IN ${VENDAS_FORA_DO_FATURAMENTO} GROUP BY v.desconto_id`);
          const porCupom = new Map(usos.map((u) => [Number(u.desconto_id), u]));
          const arredondar = (valor) => Math.round(Number(valor || 0) * 100) / 100;
          res.json(cupons.map((cupom) => {
            const uso = porCupom.get(Number(cupom.id));
            const comissao = Number(cupom.comissao_percentual || 0);
            const faturamento = arredondar(uso?.faturamento);
            return { ...cupom, comissao_percentual: comissao, usos: Number(uso?.usos || 0), desconto_concedido: arredondar(uso?.desconto_concedido), faturamento, ganho_influencer: Math.round(faturamento * comissao) / 100 };
          }));
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.post("/api/descontos/validar", requireAuth, async (req, res) => {
        const codigo = normalizeDiscountCode(req.body.codigo);
        if (!codigo) return res.status(400).json({ error: "Informe um c\xF3digo de desconto." });
        try {
          const desconto = await get("SELECT id,nome,codigo,percentual,status,data_inicio,validade FROM descontos WHERE codigo=?", [codigo]);
          if (!discountIsValid(desconto)) return res.status(400).json({ error: "C\xF3digo inexistente, inativo ou fora do per\xEDodo de validade." });
          res.json(desconto);
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.post("/api/descontos", requireAuth, requireEditar("descontos"), async (req, res) => {
        const nome = String(req.body.nome || "").trim(), codigo = normalizeDiscountCode(req.body.codigo), percentual = req.body.percentual, dataInicio = String(req.body.data_inicio || ""), validade = String(req.body.validade || ""), status = String(req.body.status || "Ativo"), comissao = parseComissao(req.body.comissao_percentual);
        if (!nome || !codigo || !validDiscountPercentage(percentual) || !validDate(dataInicio, false) || !validDate(validade, false) || dataInicio && validade && dataInicio > validade || comissao === null || !["Ativo", "Inativo"].includes(status)) return res.status(400).json({ error: "Influencer, c\xF3digo, percentual de desconto e comiss\xE3o (0 a 100, com at\xE9 duas casas) e per\xEDodo do cupom s\xE3o inv\xE1lidos." });
        if (status === "Ativo" && discountIsExpired({ validade }, dataDeHoje())) return res.status(400).json({ error: `N\xE3o \xE9 poss\xEDvel cadastrar um desconto ativo com validade em ${validade}, que j\xE1 est\xE1 vencida.` });
        try {
          const r = await run("INSERT INTO descontos (nome,codigo,percentual,comissao_percentual,status,data_inicio,validade) VALUES (?,?,?,?,?,?,?)", [nome, codigo, Number(percentual), comissao, status, dataInicio || null, validade || null]);
          res.status(201).json({ id: r.lastID });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.put("/api/descontos/:id", requireAuth, requireEditar("descontos"), async (req, res) => {
        const nome = String(req.body.nome || "").trim(), codigo = normalizeDiscountCode(req.body.codigo), percentual = req.body.percentual, dataInicio = String(req.body.data_inicio || ""), validade = String(req.body.validade || ""), status = String(req.body.status || "Ativo"), comissao = parseComissao(req.body.comissao_percentual);
        if (!nome || !codigo || !validDiscountPercentage(percentual) || !validDate(dataInicio, false) || !validDate(validade, false) || dataInicio && validade && dataInicio > validade || comissao === null || !["Ativo", "Inativo"].includes(status)) return res.status(400).json({ error: "Influencer, c\xF3digo, percentual de desconto e comiss\xE3o (0 a 100, com at\xE9 duas casas) e per\xEDodo do cupom s\xE3o inv\xE1lidos." });
        const atual = await get("SELECT id FROM descontos WHERE id=?", [req.params.id]);
        if (!atual) return res.status(404).json({ error: "Desconto n\xE3o encontrado." });
        if (status === "Ativo" && discountIsExpired({ validade }, dataDeHoje())) return res.status(400).json({ error: `N\xE3o \xE9 poss\xEDvel salvar um desconto ativo com validade em ${validade}, que j\xE1 est\xE1 vencida.` });
        try {
          const r = await run("UPDATE descontos SET nome=?,codigo=?,percentual=?,comissao_percentual=?,status=?,data_inicio=?,validade=? WHERE id=?", [nome, codigo, Number(percentual), comissao, status, dataInicio || null, validade || null, req.params.id]);
          if (!r.changes) return res.status(404).json({ error: "Desconto n\xE3o encontrado." });
          res.json({ mensagem: "Desconto atualizado." });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.put("/api/descontos/:id/status", requireAuth, requireEditar("descontos"), async (req, res) => {
        const status = String(req.body.status || "");
        if (!["Ativo", "Inativo"].includes(status)) return res.status(400).json({ error: "Status de desconto inv\xE1lido." });
        try {
          const desconto = await get("SELECT id,nome,codigo,percentual,status,data_inicio,validade FROM descontos WHERE id=?", [req.params.id]);
          if (!desconto) return res.status(404).json({ error: "Desconto n\xE3o encontrado." });
          const hoje = dataDeHoje();
          const novaValidade = String(req.body.validade || "").trim();
          if (novaValidade && !validDate(novaValidade)) return res.status(400).json({ error: "Data de validade inv\xE1lida." });
          if (status === "Ativo" && discountIsExpired(desconto, hoje)) {
            if (novaValidade) {
              if (novaValidade < hoje) return res.status(400).json({ error: "A nova data de validade n\xE3o pode ser anterior a hoje.", exige_validade: true, vencida_em: desconto.validade });
              await run("UPDATE descontos SET validade=? WHERE id=?", [novaValidade, req.params.id]);
            } else {
              return res.status(400).json({
                error: `Desconto vencido em ${desconto.validade}. Informe uma nova data de validade para reativar.`,
                exige_validade: true,
                vencida_em: desconto.validade
              });
            }
          } else if (status === "Ativo" && novaValidade) {
            const aviso = discountValidationMessage({ ...desconto, validade: novaValidade }, hoje);
            if (aviso) return res.status(400).json({ error: aviso });
            await run("UPDATE descontos SET validade=? WHERE id=?", [novaValidade, req.params.id]);
          }
          const r = await run("UPDATE descontos SET status=? WHERE id=?", [status, req.params.id]);
          if (!r.changes) return res.status(404).json({ error: "Desconto n\xE3o encontrado." });
          res.json({ mensagem: status === "Ativo" ? "Desconto ativado." : "Desconto desativado." });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      var MANUAL_PAYMENT_METHODS = ["Dinheiro", "Pix", "Cart\xE3o d\xE9bito", "Cart\xE3o cr\xE9dito", "Transfer\xEAncia", "Diversificado", "Outro", "Cart\xE3o", "Cr\xE9dito"];
      var FORMAS_DIVISAO = ["Dinheiro", "Pix", "Cart\xE3o d\xE9bito", "Cart\xE3o cr\xE9dito", "Transfer\xEAncia"];
      var ROTULO_FORMA_CURTO = { "Cart\xE3o d\xE9bito": "D\xE9bito", "Cart\xE3o cr\xE9dito": "Cr\xE9dito" };
      var moedaTexto = (v) => `R$ ${Number(v).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
      function lerPartesPagamento(lista) {
        if (!Array.isArray(lista) || lista.length < 2 || lista.length > 5) return { erro: "No pagamento diversificado, informe de 2 a 5 formas de pagamento." };
        const partes = [];
        for (const [i, bruto] of lista.entries()) {
          const forma = String(bruto?.forma || "");
          const valor = parseMoney(bruto?.valor);
          const parcelas = forma === "Cart\xE3o cr\xE9dito" ? parseInteiro(bruto?.parcelas ?? 1) : 1;
          if (!FORMAS_DIVISAO.includes(forma)) return { erro: `Forma ${i + 1}: escolha dinheiro, Pix, d\xE9bito, cr\xE9dito ou transfer\xEAncia.` };
          if (partes.some((p) => p.forma === forma)) return { erro: `${ROTULO_FORMA_CURTO[forma] || forma} aparece duas vezes. Junte os valores numa linha s\xF3.` };
          if (valor === null || valor <= 0) return { erro: `Forma ${i + 1}: informe um valor maior que zero, com at\xE9 duas casas.` };
          if (parcelas === null || parcelas < 1 || parcelas > 12) return { erro: "Parcelas do cr\xE9dito: de 1 a 12." };
          partes.push({ forma, valor, parcelas });
        }
        return { partes };
      }
      var descreverPartes = (partes) => partes.map((p) => `${ROTULO_FORMA_CURTO[p.forma] || p.forma} ${moedaTexto(p.valor)}${p.parcelas > 1 ? ` (${p.parcelas}x)` : ""}`).join(" + ");
      async function partesDasVendas(vendas) {
        const ids = vendas.filter((v) => v.forma_pagamento === "Diversificado").map((v) => Number(v.id));
        const mapa = /* @__PURE__ */ new Map();
        if (!ids.length) return mapa;
        for (const l of await all(`SELECT venda_id,forma_pagamento,valor FROM caixa WHERE venda_id IN (${ids.map(() => "?").join(",")}) ORDER BY id`, ids)) {
          const lista = mapa.get(Number(l.venda_id)) || [];
          lista.push({ forma: l.forma_pagamento, valor: Number(l.valor) });
          mapa.set(Number(l.venda_id), lista);
        }
        return mapa;
      }
      var partesDe = (v, mapa) => v.forma_pagamento === "Diversificado" && mapa.get(Number(v.id))?.length ? mapa.get(Number(v.id)) : [{ forma: v.forma_pagamento || "Dinheiro", valor: Number(v.total) }];
      function somarPorForma(mapaFormas, v, mapaPartes) {
        for (const p of partesDe(v, mapaPartes)) {
          const pg = mapaFormas.get(p.forma) || { forma: p.forma, vendas: 0, valor: 0 };
          pg.vendas += 1;
          pg.valor += p.valor;
          mapaFormas.set(p.forma, pg);
        }
      }
      var PAYMENT_STATE_LABELS = { aguardando: "Aguardando confirma\xE7\xE3o", aprovado: "Pago / Confirmado", recusado: "Recusado", cancelado: "Cancelado", resultado_desconhecido: "Revisar / Diverg\xEAncia" };
      function normalizePaymentMethod(value) {
        return String(value || "").trim();
      }
      function validInstallments(method, value) {
        const installments = Number(value || 1);
        return Number.isInteger(installments) && installments >= 1 && installments <= 12 && (method !== "Cart\xE3o cr\xE9dito" && method !== "Cr\xE9dito" || installments >= 1);
      }
      function paymentStateLabel(state) {
        return PAYMENT_STATE_LABELS[state] || "Estado de pagamento desconhecido";
      }
      function normalizarCpf(valor) {
        if (valor === void 0 || valor === null || typeof valor === "string" && valor.trim() === "") return { cpf: null };
        if (typeof valor !== "string") return { cpf: null, invalido: true };
        const cpf = valor.replace(/[.\-\s]/g, "");
        if (!/^[0-9]{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return { cpf: null, invalido: true };
        const digito = (base) => {
          let soma = 0;
          for (let i = 0; i < base.length; i += 1) soma += Number(base[i]) * (base.length + 1 - i);
          const resto = soma * 10 % 11;
          return resto === 10 ? 0 : resto;
        };
        if (digito(cpf.slice(0, 9)) !== Number(cpf[9]) || digito(cpf.slice(0, 10)) !== Number(cpf[10])) return { cpf: null, invalido: true };
        return { cpf };
      }
      function mascararCpf(cpf) {
        return cpf ? `${"*".repeat(9)}${String(cpf).slice(-2)}` : null;
      }
      var MAX_ITENS_VENDA = 50;
      async function registrarMovimentacao(produtoId, tipo, quantidadeComSinal, { vendaId = null, usuarioId = null, observacao = "", destino = "", eventoId = null } = {}) {
        await run("INSERT INTO movimentacao_estoque (produto_id,tipo,quantidade,venda_id,criado_por,destino,observacao,evento_id) VALUES (?,?,?,?,?,?,?,?)", [produtoId, tipo, quantidadeComSinal, vendaId, usuarioId, String(destino).slice(0, 150), String(observacao).slice(0, 300), eventoId || null]);
      }
      async function itensDasVendas(vendaIds) {
        const ids = [...new Set(vendaIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
        const porVenda = /* @__PURE__ */ new Map();
        for (let inicio = 0; inicio < ids.length; inicio += 200) {
          const lote = ids.slice(inicio, inicio + 200);
          const linhas = await all(`SELECT i.id,i.venda_id,i.produto_id,i.tipo,i.quantidade,i.preco_unitario,p.nome AS produto_nome,p.categoria AS produto_categoria FROM venda_item i JOIN produtos p ON p.id=i.produto_id WHERE i.venda_id IN (${lote.map(() => "?").join(",")}) ORDER BY i.id`, lote);
          for (const linha of linhas) {
            if (!porVenda.has(Number(linha.venda_id))) porVenda.set(Number(linha.venda_id), []);
            porVenda.get(Number(linha.venda_id)).push({ ...linha, quantidade: Number(linha.quantidade), preco_unitario: Number(linha.preco_unitario) });
          }
        }
        return porVenda;
      }
      function resumoDosItens(itens) {
        if (itens.length === 1 && itens[0].tipo === "VENDA") return itens[0].produto_nome;
        const vendidos = itens.filter((i) => i.tipo === "VENDA").map((i) => `${i.produto_nome}${i.quantidade > 1 ? ` x${i.quantidade}` : ""}`);
        const brinde = itens.find((i) => i.tipo === "BRINDE");
        return vendidos.join(", ") + (brinde ? ` + brinde: ${brinde.produto_nome}` : "");
      }
      async function anexarItens(registros, campoVenda = "id", completo = true) {
        const porVenda = await itensDasVendas(registros.map((r) => r[campoVenda]));
        for (const registro of registros) {
          const itens = porVenda.get(Number(registro[campoVenda])) || [];
          registro.itens = itens;
          registro.produto_nome = resumoDosItens(itens);
          if (!completo) continue;
          const vendidos = itens.filter((i) => i.tipo === "VENDA");
          registro.produto_id = vendidos[0]?.produto_id ?? null;
          registro.produto_categoria = vendidos[0]?.produto_categoria ?? "";
          registro.quantidade = vendidos.reduce((soma, i) => soma + i.quantidade, 0);
          registro.quantidade_brinde = itens.filter((i) => i.tipo === "BRINDE").reduce((soma, i) => soma + i.quantidade, 0);
        }
        return registros;
      }
      async function devolverEstoqueDaVenda(vendaId, usuarioId, observacao) {
        const itens = (await itensDasVendas([vendaId])).get(Number(vendaId)) || [];
        const eventoId = (await get("SELECT evento_id FROM vendas WHERE id=?", [vendaId]))?.evento_id || null;
        for (const item of itens) {
          const devolvido = await run("UPDATE produtos SET estoque=estoque+? WHERE id=?", [item.quantidade, item.produto_id]);
          if (!devolvido.changes) throw Object.assign(new Error("N\xE3o foi poss\xEDvel devolver o estoque: produto n\xE3o encontrado."), { statusCode: 409 });
          await registrarMovimentacao(item.produto_id, "DEVOLUCAO", item.quantidade, { vendaId, usuarioId, observacao: item.tipo === "BRINDE" ? `Devolu\xE7\xE3o do brinde: ${observacao}` : observacao, eventoId });
        }
        return itens;
      }
      function resumoParaCancelamento(itens) {
        const vendidos = itens.filter((i) => i.tipo === "VENDA");
        const unico = vendidos.length === 1 && itens.length === 1 ? vendidos[0].produto_id : null;
        return { produtoId: unico, nome: resumoDosItens(itens).slice(0, 500) || "Venda sem itens", unidades: Math.max(1, vendidos.reduce((soma, i) => soma + i.quantidade, 0)) };
      }
      function ocultarCpf(user, registros) {
        return pode(user, "caixa", "editar") ? registros : registros.map((r) => ({ ...r, cpf_nota: mascararCpf(r.cpf_nota) }));
      }
      app.post("/api/vendas/:id/cancelar", requireAuth, requireEditar("caixa"), async (req, res) => {
        const vendaId = parseInteiro(req.params.id);
        const motivo = String(req.body?.motivo ?? "").trim();
        if (vendaId === null || vendaId <= 0) return res.status(404).json({ error: "Venda n\xE3o encontrada." });
        if (motivo.length < 3 || motivo.length > 300) return res.status(400).json({ error: "Informe o motivo do cancelamento (de 3 a 300 caracteres)." });
        try {
          await transaction(async () => {
            const venda = await get("SELECT v.* FROM vendas v WHERE v.id=?", [vendaId]);
            if (!venda) throw Object.assign(new Error("Venda n\xE3o encontrada."), { statusCode: 404 });
            if (await get("SELECT id FROM vendas_canceladas WHERE venda_id=?", [vendaId])) throw Object.assign(new Error("Esta venda j\xE1 foi cancelada."), { statusCode: 409 });
            const resumo = resumoParaCancelamento(await devolverEstoqueDaVenda(vendaId, req.user.id, `Cancelamento da venda #${vendaId}`));
            const conta = await get("SELECT relacionado FROM contas_receber WHERE venda_id=?", [vendaId]);
            const caixa = await get("SELECT COALESCE(SUM(valor),0) AS total FROM caixa WHERE venda_id=?", [vendaId]);
            await run(
              "INSERT INTO vendas_canceladas (venda_id,produto_id,produto_nome,cliente,cpf_nota,quantidade,subtotal,desconto_codigo,desconto_valor,total,forma_pagamento,data_venda,status_pagamento_anterior,valor_estornado_caixa,estoque_devolvido,motivo,cancelado_por,evento_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
              [vendaId, resumo.produtoId, resumo.nome, conta?.relacionado || "", venda.cpf_nota || null, resumo.unidades, venda.subtotal || 0, venda.desconto_codigo || "", venda.desconto_valor || 0, venda.total, venda.forma_pagamento, venda.data_venda, venda.status_pagamento, Number(caixa?.total || 0), toDbBool(true), motivo, req.user.id, venda.evento_id || null]
            );
            const agora = (/* @__PURE__ */ new Date()).toISOString();
            for (const pagamento of await all("SELECT id,estado FROM pagamentos WHERE venda_id=?", [vendaId])) {
              if (pagamento.estado === "cancelado") continue;
              await run("UPDATE pagamentos SET estado='cancelado',atualizado_em=? WHERE id=?", [agora, pagamento.id]);
              await run("INSERT INTO pagamento_historico (pagamento_id,estado_anterior,estado_novo,operador_id,observacao) VALUES (?,?,?,?,?)", [pagamento.id, pagamento.estado, "cancelado", req.user.id, `Venda cancelada: ${motivo}`]);
            }
            await run("UPDATE contas_receber SET status='Cancelado',data_recebimento=NULL WHERE venda_id=?", [vendaId]);
            await run("DELETE FROM caixa WHERE venda_id=?", [vendaId]);
            const novoStatus = ["cancelado", "recusado"].includes(venda.status_pagamento) ? venda.status_pagamento : "cancelado";
            await run("UPDATE vendas SET status_pagamento=? WHERE id=?", [novoStatus, vendaId]);
            await registrarLog(req.user, "VENDA_CANCELADA", `Venda #${vendaId} cancelada. Motivo: ${motivo}`, { valor: Number(venda.total), vendaId });
          });
          res.json({ mensagem: "Venda cancelada e registrada em vendas canceladas." });
        } catch (e) {
          if (e.statusCode) return res.status(e.statusCode).json({ error: e.message });
          errorResponse(res, e);
        }
      });
      app.get("/api/vendas-canceladas", requireAuth, requireVer("caixa"), async (req, res) => {
        const busca = String(req.query.busca || "").trim().slice(0, 80);
        try {
          const numero = parseInteiro(busca.replace(/^#/, ""));
          const where = busca ? `WHERE c.produto_nome LIKE ? OR c.motivo LIKE ? OR c.cliente LIKE ?${numero ? " OR c.venda_id=?" : ""}` : "";
          const params = busca ? [`%${busca}%`, `%${busca}%`, `%${busca}%`, ...numero ? [numero] : []] : [];
          const registros = await all(`SELECT c.*, u.nome AS cancelado_por_nome, v.criado_em AS venda_criada_em, uv.nome AS vendedor_nome FROM vendas_canceladas c LEFT JOIN usuarios_erp u ON u.id=c.cancelado_por LEFT JOIN vendas v ON v.id=c.venda_id LEFT JOIN usuarios_erp uv ON uv.id=v.usuario_id ${where} ORDER BY c.id DESC LIMIT 500`, params);
          const itens = await itensDasVendas(registros.map((r) => r.venda_id));
          for (const r of registros) r.itens = itens.get(Number(r.venda_id)) || [];
          res.json(ocultarCpf(req.user, registros));
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.use("/api/vendas", requireAuth, async (req, res, next) => {
        if (req.method === "DELETE") {
          return res.status(405).json({ error: 'Vendas n\xE3o podem ser exclu\xEDdas. Use "Cancelar venda": o estoque volta, o valor sai do caixa e a venda fica registrada.' });
        }
        if (req.method !== "POST") return next();
        if (!pode(req.user, "vendas")) return res.status(403).json({ error: "Voc\xEA n\xE3o tem acesso ao PDV. Pe\xE7a ao administrador." });
        const itensBrutos = Array.isArray(req.body.itens) ? req.body.itens : [{ produto_id: req.body.produto_id, quantidade: req.body.quantidade }];
        const pagamento = normalizePaymentMethod(req.body.forma_pagamento || "Dinheiro");
        const detalhe = String(req.body.forma_pagamento_detalhe || "").trim();
        const parcelas = parseInteiro(req.body.parcelas ?? 1) ?? 0;
        const codigoDesconto = normalizeDiscountCode(req.body.desconto_codigo);
        const temDescontoManual = req.body.desconto_percentual_manual !== void 0 && req.body.desconto_percentual_manual !== null && req.body.desconto_percentual_manual !== "";
        const percentualManual = req.body.desconto_percentual_manual;
        const temDescontoReais = req.body.desconto_valor_manual !== void 0 && req.body.desconto_valor_manual !== null && req.body.desconto_valor_manual !== "";
        const valorManual = temDescontoReais ? parseMoney(req.body.desconto_valor_manual) : null;
        const pedidos = [];
        let itensValidos = itensBrutos.length >= 1 && itensBrutos.length <= MAX_ITENS_VENDA;
        for (const bruto of itensValidos ? itensBrutos : []) {
          const id = parseInteiro(bruto?.produto_id);
          const quantidade = parseInteiro(bruto?.quantidade);
          if (id === null || id <= 0 || quantidade === null || quantidade <= 0) {
            itensValidos = false;
            break;
          }
          const repetido = pedidos.find((pedido) => pedido.produtoId === id);
          if (repetido) repetido.quantidade += quantidade;
          else pedidos.push({ produtoId: id, quantidade });
        }
        if (!itensValidos || !MANUAL_PAYMENT_METHODS.includes(pagamento) || !validInstallments(pagamento, parcelas) || detalhe.length > 120 || pagamento === "Outro" && !detalhe) {
          return res.status(400).json({ error: "Produto, quantidade inteira, forma de pagamento, parcelas e descri\xE7\xE3o v\xE1lidos s\xE3o obrigat\xF3rios." });
        }
        const divisao = pagamento === "Diversificado" ? lerPartesPagamento(req.body.pagamentos) : null;
        if (divisao?.erro) return res.status(400).json({ error: divisao.erro });
        const temBrinde = req.body.brinde_produto_id !== void 0 && req.body.brinde_produto_id !== null && req.body.brinde_produto_id !== "";
        const brindeProdutoId = temBrinde ? parseInteiro(req.body.brinde_produto_id) : null;
        if (temBrinde && (brindeProdutoId === null || brindeProdutoId <= 0)) return res.status(400).json({ error: "Produto do brinde inv\xE1lido." });
        if (temDescontoReais && (valorManual === null || valorManual <= 0)) {
          return res.status(400).json({ error: "Informe o desconto em reais maior que zero e com at\xE9 duas casas decimais." });
        }
        if (temDescontoManual && !validDiscountPercentage(percentualManual) || [Boolean(codigoDesconto), temDescontoManual, temDescontoReais].filter(Boolean).length > 1) {
          return res.status(400).json({ error: "Informe apenas um desconto: cupom v\xE1lido, percentual manual entre 0 e 100% ou valor em reais." });
        }
        const cpfNota = normalizarCpf(req.body.cpf_nota);
        if (cpfNota.invalido) return res.status(400).json({ error: "CPF inv\xE1lido. Confira os 11 n\xFAmeros." });
        const temEvento = req.body.evento_id !== void 0 && req.body.evento_id !== null && req.body.evento_id !== "";
        const eventoId = temEvento ? parseInteiro(req.body.evento_id) : null;
        if (temEvento && (eventoId === null || eventoId <= 0)) return res.status(400).json({ error: "Evento inv\xE1lido." });
        let eventoTitulo = "";
        try {
          if (eventoId) {
            const evento = await get("SELECT id,titulo,data,data_fim,hora_inicio,hora_fim FROM eventos WHERE id=?", [eventoId]);
            if (!evento) return res.status(404).json({ error: "Evento n\xE3o encontrado." });
            const hoje = dataDeHoje();
            if (!(diaIso(evento.data) <= hoje && hoje <= diaIso(evento.data_fim || evento.data)) && !eventoAoVivo(evento)) return res.status(400).json({ error: `O evento "${evento.titulo}" n\xE3o est\xE1 acontecendo hoje. Venda pela loja ou escolha o evento do dia.` });
            eventoTitulo = evento.titulo;
          }
          const permitirEstoqueNegativo = await lerParametro("permitir_estoque_negativo");
          const minimoParaBrinde = await lerParametro("brinde_quantidade_minima");
          const result = await transaction(async () => {
            const linhas = [];
            for (const pedido of pedidos) {
              const produto = await get("SELECT id,nome,preco,estoque,ativo FROM produtos WHERE id=?", [pedido.produtoId]);
              if (!produto) throw Object.assign(new Error("Produto n\xE3o encontrado."), { statusCode: 404 });
              if (!fromDbBool(produto.ativo)) throw Object.assign(new Error("Produto inativo n\xE3o pode receber novas vendas."), { statusCode: 409 });
              linhas.push({ produto, quantidade: pedido.quantidade, preco: Number(produto.preco) });
            }
            const unidades = linhas.reduce((soma, linha) => soma + linha.quantidade, 0);
            let brinde = null;
            if (temBrinde) {
              if (!minimoParaBrinde) throw Object.assign(new Error("O brinde est\xE1 desligado nos par\xE2metros do sistema."), { statusCode: 400 });
              if (unidades < minimoParaBrinde) throw Object.assign(new Error(`O brinde s\xF3 vale a partir de ${minimoParaBrinde} pe\xE7as na venda (esta tem ${unidades}).`), { statusCode: 400 });
              const produto = await get("SELECT id,nome,preco,estoque,ativo FROM produtos WHERE id=?", [brindeProdutoId]);
              if (!produto) throw Object.assign(new Error("Produto do brinde n\xE3o encontrado."), { statusCode: 404 });
              if (!fromDbBool(produto.ativo)) throw Object.assign(new Error("Produto inativo n\xE3o pode ser dado como brinde."), { statusCode: 409 });
              brinde = { produto, quantidade: 1 };
            }
            const necessario = /* @__PURE__ */ new Map();
            for (const linha of linhas) necessario.set(linha.produto.id, { produto: linha.produto, quantidade: linha.quantidade });
            if (brinde) {
              const atual = necessario.get(brinde.produto.id);
              if (atual) atual.quantidade += 1;
              else necessario.set(brinde.produto.id, { produto: brinde.produto, quantidade: 1 });
            }
            let estoqueNegativo = false;
            for (const { produto, quantidade } of necessario.values()) {
              if (Number(produto.estoque) < quantidade) {
                if (!permitirEstoqueNegativo) throw Object.assign(new Error(necessario.size > 1 || brinde ? `Estoque insuficiente de ${produto.nome} (h\xE1 ${produto.estoque}, a venda pede ${quantidade}).` : "Estoque insuficiente."), { statusCode: 400 });
                estoqueNegativo = true;
              }
            }
            let desconto = null;
            if (codigoDesconto) {
              desconto = await get("SELECT id,nome,codigo,percentual,status,data_inicio,validade FROM descontos WHERE codigo=?", [codigoDesconto]);
              if (!discountIsValid(desconto)) throw Object.assign(new Error("C\xF3digo de desconto inv\xE1lido, inativo ou fora da validade."), { statusCode: 400 });
            }
            const subtotal = Math.round(linhas.reduce((soma, linha) => soma + Math.round(linha.preco * linha.quantidade * 100), 0)) / 100;
            if (temDescontoReais && valorManual > subtotal) throw Object.assign(new Error(`O desconto de R$ ${valorManual.toFixed(2).replace(".", ",")} n\xE3o pode passar do subtotal da venda (R$ ${subtotal.toFixed(2).replace(".", ",")}).`), { statusCode: 400 });
            const descontoPercentual = temDescontoReais ? 0 : temDescontoManual ? Number(percentualManual) : Number(desconto?.percentual || 0);
            const descontoValor = temDescontoReais ? valorManual : Math.round(subtotal * descontoPercentual) / 100;
            const total = Math.max(0, Math.round((subtotal - descontoValor) * 100) / 100);
            const data = dataDeHoje();
            let detalheVenda = detalhe, parcelasVenda = parcelas;
            if (divisao) {
              const soma = Math.round(divisao.partes.reduce((t, p) => t + p.valor * 100, 0));
              if (soma !== Math.round(total * 100)) throw Object.assign(new Error(`As formas de pagamento somam ${moedaTexto(soma / 100)}, mas o total da venda \xE9 ${moedaTexto(total)}.`), { statusCode: 400 });
              detalheVenda = descreverPartes(divisao.partes).slice(0, 120);
              parcelasVenda = divisao.partes.find((p) => p.forma === "Cart\xE3o cr\xE9dito")?.parcelas || 1;
            }
            const agora = (/* @__PURE__ */ new Date()).toISOString();
            const venda = await run("INSERT INTO vendas (total,forma_pagamento,data_venda,subtotal,desconto_id,desconto_codigo,desconto_percentual,desconto_valor,status_pagamento,parcelas,forma_pagamento_detalhe,cpf_nota,usuario_id,criado_em,evento_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [total, pagamento, data, subtotal, desconto?.id || null, desconto?.codigo || "", descontoPercentual, descontoValor, "confirmado", parcelasVenda, detalheVenda, cpfNota.cpf, req.user.id, agora, eventoId]);
            const pagamentoRegistro = await run("INSERT INTO pagamentos (venda_id,provedor,chave_idempotencia,estado,valor,valor_aprovado,aprovado_em,confirmado_por,confirmado_em,observacoes) VALUES (?,?,?,?,?,?,?,?,?,?)", [venda.lastID, "manual", `venda-${venda.lastID}`, "aprovado", total, total, agora, req.user.id, agora, "Confirmado automaticamente ao finalizar a venda."]);
            await run("INSERT INTO pagamento_historico (pagamento_id,estado_anterior,estado_novo,operador_id,observacao) VALUES (?,?,?,?,?)", [pagamentoRegistro.lastID, null, "aprovado", req.user.id, "Venda finalizada: pagamento confirmado automaticamente."]);
            const itensGravados = [];
            for (const linha of linhas) {
              await run("INSERT INTO venda_item (venda_id,produto_id,tipo,quantidade,preco_unitario) VALUES (?,?,'VENDA',?,?)", [venda.lastID, linha.produto.id, linha.quantidade, linha.preco]);
              const baixa = permitirEstoqueNegativo ? await run("UPDATE produtos SET estoque=estoque-? WHERE id=?", [linha.quantidade, linha.produto.id]) : await run("UPDATE produtos SET estoque=estoque-? WHERE id=? AND estoque>=?", [linha.quantidade, linha.produto.id, linha.quantidade]);
              if (!baixa.changes) throw Object.assign(new Error("Estoque insuficiente."), { statusCode: 400 });
              await registrarMovimentacao(linha.produto.id, "VENDA", -linha.quantidade, { vendaId: venda.lastID, usuarioId: req.user.id, observacao: `Venda #${venda.lastID}${eventoTitulo ? ` \xB7 ${eventoTitulo}` : ""}`, eventoId });
              itensGravados.push({ produto_id: linha.produto.id, produto_nome: linha.produto.nome, tipo: "VENDA", quantidade: linha.quantidade, preco_unitario: linha.preco });
            }
            if (brinde) {
              await run("INSERT INTO venda_item (venda_id,produto_id,tipo,quantidade,preco_unitario) VALUES (?,?,'BRINDE',1,0)", [venda.lastID, brinde.produto.id]);
              const baixa = permitirEstoqueNegativo ? await run("UPDATE produtos SET estoque=estoque-1 WHERE id=?", [brinde.produto.id]) : await run("UPDATE produtos SET estoque=estoque-1 WHERE id=? AND estoque>=1", [brinde.produto.id]);
              if (!baixa.changes) throw Object.assign(new Error("Estoque insuficiente."), { statusCode: 400 });
              await registrarMovimentacao(brinde.produto.id, "BRINDE", -1, { vendaId: venda.lastID, usuarioId: req.user.id, observacao: `Brinde da venda #${venda.lastID}${eventoTitulo ? ` \xB7 ${eventoTitulo}` : ""}`, eventoId });
              itensGravados.push({ produto_id: brinde.produto.id, produto_nome: brinde.produto.nome, tipo: "BRINDE", quantidade: 1, preco_unitario: 0 });
            }
            for (const parte of divisao ? divisao.partes : [{ forma: pagamento, valor: total }]) {
              await run("INSERT INTO caixa (venda_id,valor,forma_pagamento,data_pagamento,status) VALUES (?,?,?,?,?)", [venda.lastID, parte.valor, parte.forma, data, "Pago"]);
            }
            await registrarLog(req.user, "VENDA", `Venda #${venda.lastID}: ${itensParaLog(itensGravados)} | ${divisao ? `Diversificado: ${detalheVenda}` : pagamento}${eventoTitulo ? ` | evento: ${eventoTitulo}` : ""}`, { valor: total, vendaId: venda.lastID, quando: agora });
            if (brinde) await registrarLog(req.user, "BRINDE", `Brinde na venda #${venda.lastID}: ${brinde.produto.nome}${eventoTitulo ? ` | evento: ${eventoTitulo}` : ""}`, { valor: 0, vendaId: venda.lastID, quando: agora });
            await run("INSERT INTO contas_receber (descricao,categoria,relacionado,valor,vencimento,data_recebimento,status,forma_recebimento,observacoes,venda_id) VALUES (?,?,?,?,?,?,?,?,?,?)", [`Venda #${venda.lastID} - ${resumoDosItens(itensGravados)}`.slice(0, 200), "Venda", `Venda #${venda.lastID}`, total, data, data, "Recebido", pagamento, divisao ? `Pago em partes: ${detalheVenda}.` : "Acompanhamento criado automaticamente para a venda.", venda.lastID]);
            return { id: venda.lastID, venda_id: venda.lastID, pagamento_id: pagamentoRegistro.lastID, pagamentos: divisao ? divisao.partes : null, subtotal, desconto_percentual: descontoPercentual, desconto_valor: descontoValor, total, status_pagamento: "aprovado", itens: itensGravados, brinde: brinde ? { produto_id: brinde.produto.id, produto_nome: brinde.produto.nome } : null, estoque_negativo: estoqueNegativo, mensagem: "Venda registrada e pagamento confirmado." };
          });
          return res.status(201).json(result);
        } catch (e) {
          if (e.statusCode) return res.status(e.statusCode).json({ error: e.message });
          return errorResponse(res, e);
        }
      });
      app.get("/api/vendas", requireAuth, requireVer("caixa", "dashboard", "relatorios"), async (req, res) => {
        const busca = String(req.query.busca || "").trim();
        const de = filtroData(req.query.de);
        const ate = filtroData(req.query.ate);
        const status = String(req.query.status_pagamento || "");
        const filtros = [];
        const params = [];
        if (de) {
          params.push(de);
          filtros.push("v.data_venda>=?");
        }
        if (ate) {
          params.push(ate);
          filtros.push("v.data_venda<=?");
        }
        if (["confirmado", "aguardando", "recusado", "cancelado", "divergencia"].includes(status)) {
          params.push(status);
          filtros.push("v.status_pagamento=?");
        }
        const buscaNumerica = /^[0-9]{1,12}$/.test(busca);
        const buscaPorProduto = "EXISTS (SELECT 1 FROM venda_item bi JOIN produtos pr ON pr.id=bi.produto_id WHERE bi.venda_id=v.id AND pr.nome LIKE ?)";
        if (buscaNumerica) {
          filtros.push(`(v.id=? OR ${buscaPorProduto})`);
          params.push(Number(busca), `%${busca}%`);
        } else if (busca) {
          filtros.push(buscaPorProduto);
          params.push(`%${busca}%`);
        }
        const where = filtros.length ? `WHERE ${filtros.join(" AND ")}` : "";
        try {
          const vendas = await all(`SELECT v.*,cr.relacionado AS cliente,vc.motivo AS motivo_cancelamento,vc.cancelado_em AS cancelada_em,uv.nome AS vendedor_nome,ev.titulo AS evento_titulo FROM vendas v LEFT JOIN contas_receber cr ON cr.venda_id=v.id LEFT JOIN vendas_canceladas vc ON vc.venda_id=v.id LEFT JOIN usuarios_erp uv ON uv.id=v.usuario_id LEFT JOIN eventos ev ON ev.id=v.evento_id ${where} ORDER BY v.id DESC`, params);
          const limite = parseInteiro(req.query.limite);
          const recorte = limite && limite > 0 ? vendas.slice(0, Math.min(limite, 200)) : vendas;
          const partes = await partesDasVendas(recorte);
          for (const v of recorte) if (v.forma_pagamento === "Diversificado") v.pagamentos = partesDe(v, partes);
          res.json(ocultarCpf(req.user, await anexarItens(recorte)));
        } catch (e) {
          errorResponse(res, e);
        }
      });
      var VENDAS_FORA_DO_FATURAMENTO = "('cancelado','recusado')";
      app.get("/api/indicadores/vendas-mensais", requireAuth, requireVer("dashboard", "relatorios"), async (req, res) => {
        const meses = Math.min(parseInteiro(req.query.meses) || 6, 24);
        try {
          const vendas = await all(`SELECT v.data_venda AS data, v.total AS total FROM vendas v WHERE v.status_pagamento NOT IN ${VENDAS_FORA_DO_FATURAMENTO}`);
          const acumulado = /* @__PURE__ */ new Map();
          const hoje = /* @__PURE__ */ new Date();
          for (let deslocamento = meses - 1; deslocamento >= 0; deslocamento -= 1) {
            const referencia = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - deslocamento, 1));
            acumulado.set(`${referencia.getUTCFullYear()}-${String(referencia.getUTCMonth() + 1).padStart(2, "0")}`, { mes: `${referencia.getUTCFullYear()}-${String(referencia.getUTCMonth() + 1).padStart(2, "0")}`, total: 0, quantidade: 0, vendas: 0 });
          }
          vendas.forEach((venda) => {
            const registro = acumulado.get(String(venda.data || "").slice(0, 7));
            if (!registro) return;
            registro.total = Math.round((registro.total + Number(venda.total || 0)) * 100) / 100;
            registro.vendas += 1;
          });
          const lista = [...acumulado.values()];
          res.json({ meses: lista, total_geral: Math.round(lista.reduce((soma, item) => soma + item.total, 0) * 100) / 100 });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.get("/api/indicadores/vendas", requireAuth, requireVer("dashboard", "relatorios"), async (req, res) => {
        const mes = /^[0-9]{4}-(0[1-9]|1[0-2])$/.test(String(req.query.mes || "")) ? String(req.query.mes) : dataDeHoje().slice(0, 7);
        const inicio = `${mes}-01`;
        const fim = new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0).toISOString().slice(0, 10);
        const valores = `SELECT COALESCE(SUM(v.total),0) AS total, COALESCE(SUM((SELECT COALESCE(SUM(i.quantidade),0) FROM venda_item i WHERE i.venda_id=v.id AND i.tipo='VENDA')),0) AS quantidade, COUNT(*) AS vendas FROM vendas v WHERE v.data_venda BETWEEN ? AND ? AND v.status_pagamento NOT IN ${VENDAS_FORA_DO_FATURAMENTO}`;
        try {
          const resumo = await get(valores, [inicio, fim]);
          const canceladas = await get("SELECT COUNT(*) AS total FROM vendas v WHERE v.data_venda BETWEEN ? AND ? AND v.status_pagamento IN " + VENDAS_FORA_DO_FATURAMENTO, [inicio, fim]);
          const aguardando = await get("SELECT COUNT(*) AS total FROM vendas v WHERE v.data_venda BETWEEN ? AND ? AND v.status_pagamento NOT IN ('confirmado','cancelado','recusado')", [inicio, fim]);
          const brindesVenda = await get(`SELECT COALESCE(SUM(i.quantidade),0) AS pecas, COALESCE(SUM(i.quantidade * p.preco),0) AS valor
      FROM venda_item i JOIN vendas v ON v.id=i.venda_id JOIN produtos p ON p.id=i.produto_id
      WHERE i.tipo='BRINDE' AND v.data_venda BETWEEN ? AND ? AND v.status_pagamento NOT IN ${VENDAS_FORA_DO_FATURAMENTO}`, [inicio, fim]);
          const avulsos = await all("SELECT m.quantidade, m.criado_em, p.preco FROM movimentacao_estoque m JOIN produtos p ON p.id=m.produto_id WHERE m.tipo='BRINDE' AND m.venda_id IS NULL");
          let brindesAvulsos = 0, valorAvulsos = 0;
          for (const m of avulsos) {
            const bruto = m.criado_em instanceof Date ? m.criado_em : new Date(String(m.criado_em).includes("T") ? m.criado_em : `${String(m.criado_em).replace(" ", "T")}Z`);
            if (Number.isNaN(bruto.getTime())) continue;
            const dia = diaNaLoja(bruto);
            if (dia < inicio || dia > fim) continue;
            brindesAvulsos += Math.abs(Number(m.quantidade));
            valorAvulsos += Math.abs(Number(m.quantidade)) * Number(m.preco || 0);
          }
          res.json({
            mes,
            inicio,
            fim,
            vendas: Number(resumo.vendas || 0),
            unidades: Number(resumo.quantidade || 0),
            total: Math.round(Number(resumo.total || 0) * 100) / 100,
            canceladas: Number(canceladas.total || 0),
            aguardando_confirmacao: Number(aguardando.total || 0),
            brindes: Number(brindesVenda.pecas || 0) + brindesAvulsos,
            brindes_em_vendas: Number(brindesVenda.pecas || 0),
            brindes_avulsos: brindesAvulsos,
            brindes_valor: Math.round((Number(brindesVenda.valor || 0) + valorAvulsos) * 100) / 100
          });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.get("/api/indicadores/financeiro", requireAuth, requireVer("contas", "recebimentos"), async (req, res) => {
        await tentarGerarRecorrencias();
        const hoje = dataDeHoje();
        const dias = await lerParametro("dias_vencimento_proximo");
        const limiteProximo = /* @__PURE__ */ new Date(`${hoje}T00:00:00Z`);
        limiteProximo.setUTCDate(limiteProximo.getUTCDate() + dias);
        const proximo = limiteProximo.toISOString().slice(0, 10);
        const de = filtroData(req.query.de);
        const ate = filtroData(req.query.ate);
        try {
          const aPagar = await get(`SELECT
      COALESCE(SUM(CASE WHEN status='Pendente' THEN valor ELSE 0 END),0) AS pendente,
      COALESCE(SUM(CASE WHEN status='Pendente' AND vencimento<? THEN valor ELSE 0 END),0) AS vencido,
      COALESCE(SUM(CASE WHEN status='Pendente' AND vencimento>=? AND vencimento<=? THEN valor ELSE 0 END),0) AS proximo,
      COALESCE(SUM(CASE WHEN status='Pendente' THEN 1 ELSE 0 END),0) AS quantidade,
      COALESCE(SUM(CASE WHEN status='Pago' THEN valor ELSE 0 END),0) AS pago,
      COALESCE(SUM(CASE WHEN status='Pago' THEN 1 ELSE 0 END),0) AS quantidade_paga
      FROM contas`, [hoje, hoje, proximo]);
          const aReceber = await get(`SELECT
      COALESCE(SUM(CASE WHEN status='Pendente' THEN valor ELSE 0 END),0) AS pendente,
      COALESCE(SUM(CASE WHEN status='Pendente' AND vencimento<? THEN valor ELSE 0 END),0) AS vencido,
      COALESCE(SUM(CASE WHEN status='Pendente' AND vencimento>=? AND vencimento<=? THEN valor ELSE 0 END),0) AS proximo,
      COALESCE(SUM(CASE WHEN status='Pendente' THEN 1 ELSE 0 END),0) AS quantidade,
      COALESCE(SUM(CASE WHEN status='Recebido' THEN valor ELSE 0 END),0) AS recebido,
      COALESCE(SUM(CASE WHEN status='Recebido' THEN 1 ELSE 0 END),0) AS quantidade_recebida
      FROM contas_receber`, [hoje, hoje, proximo]);
          const periodo = de && ate ? { de, ate } : null;
          const recebidoPeriodo = periodo ? await get(`SELECT COALESCE(SUM(valor),0) AS total FROM contas_receber WHERE status='Recebido' AND data_recebimento BETWEEN ? AND ?`, [de, ate]) : { total: 0 };
          const pagoPeriodo = periodo ? await get(`SELECT COALESCE(SUM(valor),0) AS total FROM contas WHERE status='Pago' AND vencimento BETWEEN ? AND ?`, [de, ate]) : { total: 0 };
          const arredondar = (valor) => Math.round(Number(valor || 0) * 100) / 100;
          res.json({
            referencia: { hoje, dias_vencimento_proximo: dias, vencimento_proximo_ate: proximo },
            contas_a_pagar: {
              pendente: arredondar(aPagar.pendente),
              vencido: arredondar(aPagar.vencido),
              proximo: arredondar(aPagar.proximo),
              quantidade: Number(aPagar.quantidade || 0),
              pago_total: arredondar(aPagar.pago),
              quantidade_paga: Number(aPagar.quantidade_paga || 0),
              pago_no_periodo: arredondar(pagoPeriodo.total)
            },
            contas_a_receber: {
              pendente: arredondar(aReceber.pendente),
              vencido: arredondar(aReceber.vencido),
              proximo: arredondar(aReceber.proximo),
              quantidade: Number(aReceber.quantidade || 0),
              recebido_total: arredondar(aReceber.recebido),
              quantidade_recebida: Number(aReceber.quantidade_recebida || 0),
              recebido_no_periodo: arredondar(recebidoPeriodo.total)
            },
            periodo
          });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.get("/api/caixa", requireAuth, requireVer("caixa", "dashboard", "relatorios"), async (req, res) => {
        try {
          res.json(await all("SELECT * FROM caixa ORDER BY data_pagamento DESC,id DESC"));
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.get("/api/pagamentos/pendentes", requireAuth, requireVer("caixa"), async (req, res) => {
        try {
          res.json(await anexarItens(await all("SELECT p.*,v.total,v.forma_pagamento,v.parcelas,v.forma_pagamento_detalhe FROM pagamentos p JOIN vendas v ON v.id=p.venda_id WHERE p.estado IN ('aguardando','resultado_desconhecido') ORDER BY p.id DESC"), "venda_id", false));
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.get("/api/pagamentos", requireAuth, requireVer("caixa"), async (req, res) => {
        const estados = ["aguardando", "aprovado", "recusado", "cancelado", "resultado_desconhecido"];
        const estado = String(req.query.estado || "");
        const forma = String(req.query.forma_pagamento || "");
        const adquirente = String(req.query.adquirente || "").trim();
        const filtros = [];
        const params = [];
        if (estados.includes(estado)) {
          params.push(estado);
          filtros.push("p.estado=?");
        }
        if (forma) {
          params.push(forma);
          filtros.push("v.forma_pagamento=?");
        }
        if (adquirente) {
          params.push(adquirente);
          filtros.push("p.adquirente=?");
        }
        const where = filtros.length ? `WHERE ${filtros.join(" AND ")}` : "";
        try {
          res.json(await anexarItens(await all(`SELECT p.*,v.total,v.forma_pagamento,v.parcelas,v.forma_pagamento_detalhe,v.data_venda FROM pagamentos p JOIN vendas v ON v.id=p.venda_id ${where} ORDER BY p.id DESC`, params), "venda_id", false));
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.put("/api/vendas/:id/pagamento", requireAuth, requireEditar("caixa"), async (req, res) => {
        const estado = String(req.body.estado || "");
        const estadosPermitidos = ["aprovado", "recusado", "cancelado", "resultado_desconhecido"];
        if (!estadosPermitidos.includes(estado)) return res.status(400).json({ error: "Estado de confirma\xE7\xE3o inv\xE1lido." });
        const adquirente = String(req.body.adquirente || "").trim().slice(0, 120);
        const maquina = String(req.body.maquina_identificacao || "").trim().slice(0, 120);
        const nsu = String(req.body.nsu || "").trim().slice(0, 80);
        const codigoAutorizacao = String(req.body.codigo_autorizacao || "").trim().slice(0, 80);
        const observacoes = String(req.body.observacoes || "").trim().slice(0, 500);
        const aprovadoEm = String(req.body.aprovado_em || "").trim();
        const valorAprovado = Number(req.body.valor_aprovado);
        try {
          const result = await transaction(async () => {
            const venda = await get("SELECT id,total,forma_pagamento,status_pagamento FROM vendas WHERE id=?", [req.params.id]);
            const pagamento = await get("SELECT * FROM pagamentos WHERE venda_id=? ORDER BY id DESC", [req.params.id]);
            if (!venda || !pagamento) throw Object.assign(new Error("Pagamento pendente n\xE3o encontrado."), { statusCode: 404 });
            if (!["aguardando", "resultado_desconhecido"].includes(pagamento.estado)) throw Object.assign(new Error("Este pagamento j\xE1 foi processado e n\xE3o pode ser confirmado novamente."), { statusCode: 409 });
            if (estado === "aprovado" && (!Number.isFinite(valorAprovado) || Math.round(valorAprovado * 100) !== Math.round(Number(venda.total) * 100))) throw Object.assign(new Error("O valor aprovado deve ser exatamente igual ao total da venda."), { statusCode: 400 });
            if (estado === "aprovado" && aprovadoEm && Number.isNaN(Date.parse(aprovadoEm))) throw Object.assign(new Error("Data e hora da aprova\xE7\xE3o inv\xE1lidas."), { statusCode: 400 });
            const agora = (/* @__PURE__ */ new Date()).toISOString();
            const atualizado = await run("UPDATE pagamentos SET estado=?,adquirente=?,maquina_identificacao=?,nsu=?,codigo_autorizacao=?,valor_aprovado=?,aprovado_em=?,confirmado_por=?,confirmado_em=?,observacoes=?,atualizado_em=? WHERE id=? AND estado IN ('aguardando','resultado_desconhecido')", [estado, adquirente, maquina, nsu, codigoAutorizacao, estado === "aprovado" ? valorAprovado : null, estado === "aprovado" ? aprovadoEm || agora : null, req.user.id, agora, observacoes, agora, pagamento.id]);
            if (!atualizado.changes) throw Object.assign(new Error("Pagamento j\xE1 foi processado em outra aba."), { statusCode: 409 });
            const statusVenda = estado === "aprovado" ? "confirmado" : estado === "resultado_desconhecido" ? "divergencia" : estado;
            await run("UPDATE vendas SET status_pagamento=? WHERE id=?", [statusVenda, venda.id]);
            await run("INSERT INTO pagamento_historico (pagamento_id,estado_anterior,estado_novo,operador_id,observacao) VALUES (?,?,?,?,?)", [pagamento.id, pagamento.estado, estado, req.user.id, observacoes || `Confirma\xE7\xE3o manual: ${paymentStateLabel(estado)}.`]);
            if (estado === "aprovado") await run("INSERT INTO caixa (venda_id,valor,forma_pagamento,data_pagamento,status) VALUES (?,?,?,?,?)", [venda.id, valorAprovado, venda.forma_pagamento, agora.slice(0, 10), "Pago"]);
            if (estado === "aprovado") await run("UPDATE contas_receber SET status='Recebido',data_recebimento=?,forma_recebimento=? WHERE venda_id=? AND status<>'Cancelado'", [agora.slice(0, 10), venda.forma_pagamento, venda.id]);
            if (estado === "recusado" || estado === "cancelado") await run("UPDATE contas_receber SET status='Cancelado',data_recebimento=NULL WHERE venda_id=?", [venda.id]);
            return { pagamento_id: pagamento.id, venda_id: venda.id, estado, status_pagamento: statusVenda, mensagem: estado === "aprovado" ? "Pagamento confirmado manualmente e lan\xE7ado no caixa." : `Pagamento registrado como ${paymentStateLabel(estado)}.` };
          });
          res.json(result);
        } catch (e) {
          if (e.statusCode) return res.status(e.statusCode).json({ error: e.message });
          errorResponse(res, e);
        }
      });
      app.put("/api/pagamentos/:id/repasse", requireAuth, requireEditar("caixa"), async (req, res) => {
        const estado = String(req.body.estado_repasse || "");
        if (!["nao_aplicavel", "aguardando_repasse", "repassado", "divergencia"].includes(estado)) return res.status(400).json({ error: "Estado de repasse inv\xE1lido." });
        try {
          const pagamento = await get("SELECT id,estado FROM pagamentos WHERE id=?", [req.params.id]);
          if (!pagamento) return res.status(404).json({ error: "Pagamento n\xE3o encontrado." });
          if (pagamento.estado !== "aprovado") return res.status(400).json({ error: "Somente pagamentos confirmados podem ter repasse conciliado." });
          const r = await run("UPDATE pagamentos SET estado_repasse=?,atualizado_em=? WHERE id=?", [estado, (/* @__PURE__ */ new Date()).toISOString(), req.params.id]);
          if (!r.changes) return res.status(404).json({ error: "Pagamento n\xE3o encontrado." });
          res.json({ mensagem: "Estado de repasse atualizado manualmente.", estado_repasse: estado });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.get("/api/pagamentos/:id/historico", requireAuth, requireVer("caixa"), async (req, res) => {
        try {
          const pagamento = await get("SELECT id,venda_id FROM pagamentos WHERE id=?", [req.params.id]);
          if (!pagamento) return res.status(404).json({ error: "Pagamento n\xE3o encontrado." });
          const historico = await all("SELECT h.estado_anterior,h.estado_novo,h.observacao,h.criado_em,u.nome AS operador_nome,u.login AS operador_login FROM pagamento_historico h LEFT JOIN usuarios_erp u ON u.id=h.operador_id WHERE h.pagamento_id=? ORDER BY h.id ASC", [req.params.id]);
          res.json(historico.map((item) => ({ ...item, estado_label: paymentStateLabel(item.estado_novo) })));
        } catch (e) {
          errorResponse(res, e);
        }
      });
      async function lerVinculoFornecedor(corpo, atual = null) {
        if (corpo?.id_fornecedor === void 0) return { manter: true };
        if (corpo.id_fornecedor === null || corpo.id_fornecedor === "") return { id: null };
        const id = idDeFornecedor(corpo.id_fornecedor);
        if (id === null) return { erro: "Fornecedor inv\xE1lido." };
        const cadastro = await get("SELECT id_fornecedor,ativo FROM fornecedor WHERE id_fornecedor=?", [id]);
        if (!cadastro) return { erro: "Fornecedor n\xE3o encontrado." };
        if (Number(atual) !== id && !fromDbBool(cadastro.ativo)) return { erro: "Este cadastro est\xE1 inativo. Reative-o para lan\xE7ar novas contas." };
        return { id };
      }
      var COLUNAS_FORNECEDOR_DA_CONTA = "f.razao_social AS fornecedor_razao_social, f.nome_fantasia AS fornecedor_nome_fantasia, f.tipo AS fornecedor_tipo";
      var CATEGORIAS_CONTA_MAX = 60;
      var FORMAS_PAGAMENTO_CONTA = ["", "Pix", "Boleto", "Transfer\xEAncia", "Dinheiro", "Cart\xE3o de cr\xE9dito", "Cart\xE3o de d\xE9bito", "D\xE9bito autom\xE1tico", "Outro"];
      function lerConta(body) {
        const descricao = normalizarTexto(body.descricao), valor = parseMoney(body.valor), vencimento = String(body.vencimento || "");
        const categoria = normalizarTexto(body.categoria || ""), observacoes = String(body.observacoes || "").trim();
        if (!descricao || valor === null || !dataReal(vencimento)) return { erro: `Descri\xE7\xE3o, vencimento v\xE1lido e valor monet\xE1rio s\xE3o obrigat\xF3rios. ${ERRO_VALOR_MONETARIO}` };
        if (descricao.length > 200) return { erro: "Descri\xE7\xE3o at\xE9 200 caracteres." };
        if (categoria.length > CATEGORIAS_CONTA_MAX) return { erro: `Categoria at\xE9 ${CATEGORIAS_CONTA_MAX} caracteres.` };
        if (observacoes.length > 500) return { erro: "Observa\xE7\xE3o at\xE9 500 caracteres." };
        return { descricao, valor, vencimento, categoria, observacoes };
      }
      app.get("/api/contas", requireAuth, requireVer("contas"), async (req, res) => {
        try {
          await tentarGerarRecorrencias();
          res.json((await all(`SELECT c.*, ${COLUNAS_FORNECEDOR_DA_CONTA}, h.id AS holerite_id FROM contas c LEFT JOIN fornecedor f ON f.id_fornecedor=c.id_fornecedor LEFT JOIN holerite h ON h.conta_id=c.id ORDER BY c.vencimento ASC, c.id ASC`)).map((c) => ({ ...c, valor: Number(c.valor), vencimento: diaIso(c.vencimento), data_pagamento: c.data_pagamento ? diaIso(c.data_pagamento) : null, holerite_id: c.holerite_id == null ? null : Number(c.holerite_id) })));
        } catch (e) {
          errorResponse(res, e);
        }
      });
      var ERRO_VALOR_MONETARIO = "Informe um valor monet\xE1rio v\xE1lido, com no m\xE1ximo duas casas decimais e sem valor negativo.";
      app.post("/api/contas", requireAuth, requireEditar("contas"), async (req, res) => {
        const dados = lerConta(req.body);
        if (dados.erro) return res.status(400).json({ error: dados.erro });
        try {
          const vinculo = await lerVinculoFornecedor(req.body);
          if (vinculo.erro) return res.status(400).json({ error: vinculo.erro });
          const r = await run("INSERT INTO contas (descricao,valor,vencimento,id_fornecedor,categoria,observacoes) VALUES (?,?,?,?,?,?)", [dados.descricao, dados.valor, dados.vencimento, vinculo.id ?? null, dados.categoria, dados.observacoes]);
          res.status(201).json({ id: r.lastID });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.put("/api/contas/:id", requireAuth, requireEditar("contas"), async (req, res) => {
        const dados = lerConta(req.body);
        if (dados.erro) return res.status(400).json({ error: dados.erro });
        try {
          const atual = await get("SELECT id,id_fornecedor,status FROM contas WHERE id=?", [req.params.id]);
          if (!atual) return res.status(404).json({ error: "Conta n\xE3o encontrada." });
          const vinculo = await lerVinculoFornecedor(req.body, atual.id_fornecedor);
          if (vinculo.erro) return res.status(400).json({ error: vinculo.erro });
          await run("UPDATE contas SET descricao=?,valor=?,vencimento=?,id_fornecedor=?,categoria=?,observacoes=? WHERE id=?", [dados.descricao, dados.valor, dados.vencimento, vinculo.manter ? atual.id_fornecedor : vinculo.id, dados.categoria, dados.observacoes, atual.id]);
          res.json({ mensagem: "Conta atualizada." });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.put("/api/contas/:id/pagar", requireAuth, requireEditar("contas"), async (req, res) => {
        const data = String(req.body?.data_pagamento || dataDeHoje());
        const forma = String(req.body?.forma_pagamento || "");
        if (!dataReal(data)) return res.status(400).json({ error: "Data de pagamento inv\xE1lida." });
        if (data > dataDeHoje()) return res.status(400).json({ error: "A data de pagamento n\xE3o pode ser no futuro." });
        if (!FORMAS_PAGAMENTO_CONTA.includes(forma)) return res.status(400).json({ error: "Forma de pagamento inv\xE1lida." });
        try {
          const r = await run("UPDATE contas SET status='Pago',data_pagamento=?,forma_pagamento=? WHERE id=? AND status<>'Pago'", [data, forma, req.params.id]);
          if (!r.changes) return res.status(await get("SELECT id FROM contas WHERE id=?", [req.params.id]) ? 409 : 404).json({ error: "Conta n\xE3o encontrada ou j\xE1 paga." });
          res.json({ mensagem: "Conta paga." });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.put("/api/contas/:id/estornar", requireAuth, requireEditar("contas"), async (req, res) => {
        try {
          const r = await run("UPDATE contas SET status='Pendente',data_pagamento=NULL,forma_pagamento='' WHERE id=? AND status='Pago'", [req.params.id]);
          if (!r.changes) return res.status(404).json({ error: "Conta n\xE3o encontrada ou ainda n\xE3o paga." });
          res.json({ mensagem: "Pagamento desfeito. A conta voltou a ficar em aberto." });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.delete("/api/contas/:id", requireAuth, requireEditar("contas"), async (req, res) => {
        try {
          const r = await transaction(async () => {
            await run("UPDATE holerite SET conta_id=NULL WHERE conta_id=?", [req.params.id]);
            return run("DELETE FROM contas WHERE id=?", [req.params.id]);
          });
          if (!r.changes) return res.status(404).json({ error: "Conta n\xE3o encontrada." });
          res.json({ mensagem: "Conta exclu\xEDda com sucesso." });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.get("/api/recebimentos", requireAuth, requireVer("recebimentos"), async (req, res) => {
        try {
          res.json(await all("SELECT * FROM contas_receber ORDER BY vencimento ASC,id ASC"));
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.post("/api/recebimentos", requireAuth, requireEditar("recebimentos"), async (req, res) => {
        const descricao = String(req.body.descricao || "").trim(), categoria = String(req.body.categoria || "").trim(), relacionado = String(req.body.relacionado || "").trim(), valor = parseMoney(req.body.valor), vencimento = String(req.body.vencimento || ""), observacoes = String(req.body.observacoes || "").trim();
        if (!descricao || valor === null || !validDate(vencimento)) return res.status(400).json({ error: `Descri\xE7\xE3o, vencimento v\xE1lido e valor monet\xE1rio s\xE3o obrigat\xF3rios. ${ERRO_VALOR_MONETARIO}` });
        try {
          const r = await run("INSERT INTO contas_receber (descricao,categoria,relacionado,valor,vencimento,observacoes) VALUES (?,?,?,?,?,?)", [descricao, categoria, relacionado, valor, vencimento, observacoes]);
          res.status(201).json({ id: r.lastID });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.put("/api/recebimentos/:id", requireAuth, requireEditar("recebimentos"), async (req, res) => {
        const descricao = String(req.body.descricao || "").trim(), categoria = String(req.body.categoria || "").trim(), relacionado = String(req.body.relacionado || "").trim(), valor = parseMoney(req.body.valor), vencimento = String(req.body.vencimento || ""), dataRecebimento = String(req.body.data_recebimento || ""), status = String(req.body.status || "Pendente"), forma = String(req.body.forma_recebimento || "").trim(), observacoes = String(req.body.observacoes || "").trim(), statuses = ["Pendente", "Recebido", "Vencido", "Cancelado"];
        if (!descricao || valor === null || !validDate(vencimento) || !validDate(dataRecebimento, false) || !statuses.includes(status)) return res.status(400).json({ error: `Dados do recebimento inv\xE1lidos. ${ERRO_VALOR_MONETARIO}` });
        try {
          const r = await run("UPDATE contas_receber SET descricao=?,categoria=?,relacionado=?,valor=?,vencimento=?,data_recebimento=?,status=?,forma_recebimento=?,observacoes=? WHERE id=?", [descricao, categoria, relacionado, valor, vencimento, dataRecebimento || null, status, forma, observacoes, req.params.id]);
          if (!r.changes) return res.status(404).json({ error: "Recebimento n\xE3o encontrado." });
          res.json({ mensagem: "Recebimento atualizado." });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.put("/api/recebimentos/:id/receber", requireAuth, requireEditar("recebimentos"), async (req, res) => {
        const data = String(req.body.data_recebimento || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)), forma = String(req.body.forma_recebimento || "").trim();
        if (!validDate(data)) return res.status(400).json({ error: "Data de recebimento inv\xE1lida." });
        try {
          const r = await run("UPDATE contas_receber SET status='Recebido',data_recebimento=?,forma_recebimento=? WHERE id=? AND status<>'Cancelado'", [data, forma, req.params.id]);
          if (!r.changes) return res.status(404).json({ error: "Recebimento n\xE3o encontrado ou cancelado." });
          res.json({ mensagem: "Recebimento baixado." });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.put("/api/recebimentos/:id/estornar", requireAuth, requireEditar("recebimentos"), async (req, res) => {
        try {
          const atual = await get("SELECT id,status,venda_id FROM contas_receber WHERE id=?", [req.params.id]);
          if (!atual) return res.status(404).json({ error: "Recebimento n\xE3o encontrado." });
          if (atual.venda_id) return res.status(409).json({ error: "Este recebimento \xE9 de uma venda: o pagamento \xE9 controlado no Caixa." });
          if (atual.status !== "Recebido") return res.status(409).json({ error: "Este recebimento n\xE3o est\xE1 marcado como recebido." });
          await run("UPDATE contas_receber SET status='Pendente',data_recebimento=NULL,forma_recebimento='' WHERE id=?", [atual.id]);
          res.json({ mensagem: "Recebimento desfeito. O valor voltou a ficar em aberto." });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.put("/api/recebimentos/:id/cancelar", requireAuth, requireEditar("recebimentos"), async (req, res) => {
        try {
          const r = await run("UPDATE contas_receber SET status='Cancelado' WHERE id=?", [req.params.id]);
          if (!r.changes) return res.status(404).json({ error: "Recebimento n\xE3o encontrado." });
          res.json({ mensagem: "Recebimento cancelado." });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.get("/api/parametros", requireAuth, async (req, res) => {
        try {
          res.json(await listarParametros());
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.put("/api/parametros/:chave", requireAuth, requireEditar("parametros"), async (req, res) => {
        const chave = String(req.params.chave || "");
        const definicao = PARAMETROS_CATALOGO[chave];
        if (!definicao) return res.status(404).json({ error: "Par\xE2metro desconhecido." });
        const bruto = String(req.body.valor ?? "").trim();
        let valor;
        if (definicao.tipo === "booleano") {
          if (!["true", "false"].includes(bruto)) return res.status(400).json({ error: "Informe true ou false para este par\xE2metro." });
          valor = bruto;
        } else {
          const inteiro = parseInteiro(bruto);
          if (inteiro === null || inteiro < definicao.minimo || inteiro > definicao.maximo) return res.status(400).json({ error: `Informe um n\xFAmero inteiro entre ${definicao.minimo} e ${definicao.maximo}.` });
          valor = String(inteiro);
        }
        try {
          await all("INSERT INTO parametros (chave,valor,atualizado_por) VALUES (?,?,?) ON CONFLICT(chave) DO UPDATE SET valor=excluded.valor,atualizado_por=excluded.atualizado_por,atualizado_em=CURRENT_TIMESTAMP", [chave, valor, req.user.id]);
          ultimaGeracaoRecorrentes = 0;
          res.json({ mensagem: "Par\xE2metro atualizado.", chave, valor });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      var somaMeses = (competencia, n) => {
        const [ano, mes] = competencia.split("-").map(Number);
        const d = new Date(Date.UTC(ano, mes - 1 + n, 1));
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      };
      var ultimoDiaDoMes = (ano, mes) => new Date(Date.UTC(ano, mes, 0)).getUTCDate();
      var dataNoMes = (competencia, dia) => {
        const [ano, mes] = competencia.split("-").map(Number);
        return `${competencia}-${String(Math.min(dia, ultimoDiaDoMes(ano, mes))).padStart(2, "0")}`;
      };
      var dataNoAno = (ano, mes, dia) => dataNoMes(`${ano}-${String(mes).padStart(2, "0")}`, dia);
      var somaDias = (iso, dias) => {
        const d = /* @__PURE__ */ new Date(`${iso}T00:00:00Z`);
        d.setUTCDate(d.getUTCDate() + dias);
        return d.toISOString().slice(0, 10);
      };
      var dataReal = (iso) => {
        if (!validDate(iso)) return false;
        const d = /* @__PURE__ */ new Date(`${iso}T00:00:00Z`);
        return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
      };
      var ehDuplicado = (erro) => Boolean(erro) && (["SQLITE_CONSTRAINT", "23505"].includes(erro.code) || /UNIQUE constraint|duplicate key/i.test(String(erro.message)));
      var ultimaGeracaoRecorrentes = 0;
      async function gerarContasFixas() {
        const hoje = dataDeHoje();
        const mesAtual = hoje.slice(0, 7);
        const janela = Number(await lerParametro("dias_vencimento_proximo")) || 7;
        const modelos = await all("SELECT * FROM contas_fixas WHERE ativa=?", [toDbBool(true)]);
        for (const modelo of modelos) {
          const proximoMes = somaMeses(mesAtual, 1);
          const limite = dataNoMes(proximoMes, modelo.dia_vencimento) <= somaDias(hoje, janela) ? proximoMes : mesAtual;
          let competencia = modelo.gerada_ate ? somaMeses(modelo.gerada_ate, 1) : modelo.primeiro_mes;
          let ultima = null;
          let criadas = 0;
          while (competencia <= limite && criadas < 24) {
            try {
              await run(
                "INSERT INTO contas (descricao,valor,vencimento,conta_fixa_id,competencia,id_fornecedor,categoria) VALUES (?,?,?,?,?,?,?)",
                [modelo.descricao, modelo.valor, dataNoMes(competencia, modelo.dia_vencimento), modelo.id, competencia, modelo.id_fornecedor ?? null, modelo.categoria || ""]
              );
            } catch (erro) {
              if (!ehDuplicado(erro)) throw erro;
            }
            ultima = competencia;
            competencia = somaMeses(competencia, 1);
            criadas += 1;
          }
          if (ultima) await run("UPDATE contas_fixas SET gerada_ate=? WHERE id=? AND (gerada_ate IS NULL OR gerada_ate<?)", [ultima, modelo.id, ultima]);
        }
      }
      async function gerarEventosAnuais() {
        const anoAtual = Number(dataDeHoje().slice(0, 4));
        const series = await all("SELECT * FROM eventos_anuais WHERE ativo=?", [toDbBool(true)]);
        for (const serie of series) {
          let ano = Math.max(Number(serie.gerado_ate_ano) + 1, anoAtual);
          let ultimo = null;
          let criados = 0;
          while (ano <= anoAtual + 1 && criados < 10) {
            try {
              const inicio = dataNoAno(ano, Number(serie.mes), Number(serie.dia));
              const duracao = Number(serie.duracao_dias || 0);
              await run(
                "INSERT INTO eventos (data,data_fim,hora_inicio,hora_fim,local,tipo,titulo,descricao,criado_por,anual_id,ano_ocorrencia) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                [inicio, duracao > 0 ? somarDiasData(inicio, duracao) : null, serie.hora_inicio || null, serie.hora_fim || null, serie.local || "", serie.tipo || "outro", serie.titulo, serie.descricao, serie.criado_por, serie.id, ano]
              );
            } catch (erro) {
              if (!ehDuplicado(erro)) throw erro;
            }
            ultimo = ano;
            ano += 1;
            criados += 1;
          }
          if (ultimo) await run("UPDATE eventos_anuais SET gerado_ate_ano=? WHERE id=? AND gerado_ate_ano<?", [ultimo, serie.id, ultimo]);
        }
      }
      async function tentarGerarRecorrencias(forcar = false) {
        const agora = Date.now();
        if (!forcar && agora - ultimaGeracaoRecorrentes < 6e4) return;
        ultimaGeracaoRecorrentes = agora;
        for (const [nome, gerar] of [["contas fixas", gerarContasFixas], ["eventos anuais", gerarEventosAnuais]]) {
          try {
            await gerar();
          } catch (erro) {
            ultimaGeracaoRecorrentes = 0;
            console.error(`Falha ao gerar ${nome}:`, erro.message);
          }
        }
      }
      async function criarEventoAnual({ titulo, descricao, data, usuarioId, dataFim = null, horaInicio = null, horaFim = null, local = "", tipo = "outro" }) {
        const serie = await run(
          "INSERT INTO eventos_anuais (titulo,descricao,mes,dia,gerado_ate_ano,ativo,criado_por,duracao_dias,hora_inicio,hora_fim,local,tipo) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
          [titulo, descricao, Number(data.slice(5, 7)), Number(data.slice(8, 10)), Number(data.slice(0, 4)), toDbBool(true), usuarioId, dataFim ? diasEntreDatas(data, dataFim) : 0, horaInicio, horaFim, local, tipo]
        );
        return serie.lastID;
      }
      function somarDiasData(dia, n) {
        const d = /* @__PURE__ */ new Date(`${dia}T12:00:00Z`);
        d.setUTCDate(d.getUTCDate() + n);
        return d.toISOString().slice(0, 10);
      }
      function diasEntreDatas(inicio, fim) {
        return Math.round((/* @__PURE__ */ new Date(`${fim}T12:00:00Z`) - /* @__PURE__ */ new Date(`${inicio}T12:00:00Z`)) / 864e5);
      }
      app.get("/api/contas-fixas", requireAuth, requireVer("contas"), async (req, res) => {
        try {
          await tentarGerarRecorrencias();
          const modelos = await all(`SELECT f.*,
      (SELECT MIN(c.vencimento) FROM contas c WHERE c.conta_fixa_id=f.id AND c.status='Pendente') AS proximo_vencimento,
      (SELECT COUNT(*) FROM contas c WHERE c.conta_fixa_id=f.id) AS contas_geradas
      FROM contas_fixas f ORDER BY f.ativa DESC, f.descricao ASC`);
          const nomes = await all("SELECT id_fornecedor,razao_social,nome_fantasia,tipo FROM fornecedor");
          for (const m of modelos) {
            const f = nomes.find((item) => Number(item.id_fornecedor) === Number(m.id_fornecedor));
            m.fornecedor_razao_social = f?.razao_social ?? null;
            m.fornecedor_nome_fantasia = f?.nome_fantasia ?? null;
            m.fornecedor_tipo = f?.tipo ?? null;
          }
          res.json(modelos.map((m) => ({ ...m, valor: Number(m.valor), ativa: fromDbBool(m.ativa) })));
        } catch (e) {
          errorResponse(res, e);
        }
      });
      function lerDividaFixa(corpo) {
        const descricao = normalizarTexto(corpo.descricao);
        const valor = parseMoney(corpo.valor);
        const categoria = normalizarTexto(corpo.categoria || "");
        if (!descricao || descricao.length > 120 || valor === null) return { erro: `Informe a descri\xE7\xE3o (at\xE9 120 caracteres) e um valor monet\xE1rio v\xE1lido. Use no m\xE1ximo duas casas decimais.` };
        if (categoria.length > CATEGORIAS_CONTA_MAX) return { erro: `Categoria at\xE9 ${CATEGORIAS_CONTA_MAX} caracteres.` };
        return { descricao, valor, categoria };
      }
      app.post("/api/contas-fixas", requireAuth, requireEditar("contas"), async (req, res) => {
        const dados = lerDividaFixa(req.body);
        if (dados.erro) return res.status(400).json({ error: dados.erro });
        const primeiro = String(req.body.primeiro_vencimento || "");
        if (!dataReal(primeiro)) return res.status(400).json({ error: "Informe uma data v\xE1lida para o primeiro vencimento." });
        const competencia = primeiro.slice(0, 7);
        if (competencia < dataDeHoje().slice(0, 7)) return res.status(400).json({ error: "O primeiro vencimento deve ser deste m\xEAs em diante. Contas de meses passados devem ser lan\xE7adas como despesa avulsa." });
        try {
          const vinculo = await lerVinculoFornecedor(req.body);
          if (vinculo.erro) return res.status(400).json({ error: vinculo.erro });
          const id = await transaction(async () => {
            const modelo = await run(
              "INSERT INTO contas_fixas (descricao,valor,dia_vencimento,primeiro_mes,gerada_ate,ativa,criado_por,id_fornecedor,categoria) VALUES (?,?,?,?,?,?,?,?,?)",
              [dados.descricao, dados.valor, Number(primeiro.slice(8, 10)), competencia, competencia, toDbBool(true), req.user.id, vinculo.id ?? null, dados.categoria]
            );
            await run("INSERT INTO contas (descricao,valor,vencimento,conta_fixa_id,competencia,id_fornecedor,categoria) VALUES (?,?,?,?,?,?,?)", [dados.descricao, dados.valor, primeiro, modelo.lastID, competencia, vinculo.id ?? null, dados.categoria]);
            return modelo.lastID;
          });
          await tentarGerarRecorrencias(true);
          res.status(201).json({ id, mensagem: "D\xEDvida fixa salva. A conta de cada m\xEAs ser\xE1 lan\xE7ada automaticamente, sempre no mesmo dia." });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.put("/api/contas-fixas/:id", requireAuth, requireEditar("contas"), async (req, res) => {
        const dados = lerDividaFixa(req.body);
        if (dados.erro) return res.status(400).json({ error: dados.erro });
        const dia = parseInteiro(req.body.dia_vencimento);
        if (dia === null || dia < 1 || dia > 31) return res.status(400).json({ error: "Informe o dia do vencimento, de 1 a 31." });
        try {
          const atualizadas = await transaction(async () => {
            const modelo = await get("SELECT id,id_fornecedor FROM contas_fixas WHERE id=?", [req.params.id]);
            if (!modelo) throw Object.assign(new Error("D\xEDvida fixa n\xE3o encontrada."), { statusCode: 404 });
            const vinculo = await lerVinculoFornecedor(req.body, modelo.id_fornecedor);
            if (vinculo.erro) throw Object.assign(new Error(vinculo.erro), { statusCode: 400 });
            const idFornecedor = vinculo.manter ? modelo.id_fornecedor ?? null : vinculo.id;
            await run("UPDATE contas_fixas SET descricao=?,valor=?,dia_vencimento=?,id_fornecedor=?,categoria=? WHERE id=?", [dados.descricao, dados.valor, dia, idFornecedor, dados.categoria, modelo.id]);
            const pendentes = await all("SELECT id,competencia FROM contas WHERE conta_fixa_id=? AND status='Pendente' AND competencia>=?", [modelo.id, dataDeHoje().slice(0, 7)]);
            for (const conta of pendentes) await run("UPDATE contas SET descricao=?,valor=?,vencimento=?,id_fornecedor=?,categoria=? WHERE id=?", [dados.descricao, dados.valor, dataNoMes(conta.competencia, dia), idFornecedor, dados.categoria, conta.id]);
            return pendentes.length;
          });
          ultimaGeracaoRecorrentes = 0;
          res.json({ mensagem: `D\xEDvida fixa atualizada. A mudan\xE7a vale para ${atualizadas === 1 ? "a conta pendente" : `as ${atualizadas} contas pendentes`} deste m\xEAs em diante e para os pr\xF3ximos meses.` });
        } catch (e) {
          if (e.statusCode) return res.status(e.statusCode).json({ error: e.message });
          errorResponse(res, e);
        }
      });
      app.put("/api/contas-fixas/:id/encerrar", requireAuth, requireEditar("contas"), async (req, res) => {
        try {
          const removidas = await transaction(async () => {
            const modelo = await get("SELECT id FROM contas_fixas WHERE id=?", [req.params.id]);
            if (!modelo) throw Object.assign(new Error("D\xEDvida fixa n\xE3o encontrada."), { statusCode: 404 });
            await run("UPDATE contas_fixas SET ativa=?,encerrada_em=? WHERE id=?", [toDbBool(false), dataDeHoje(), modelo.id]);
            const futuras = await all("SELECT id FROM contas WHERE conta_fixa_id=? AND status='Pendente' AND vencimento>?", [modelo.id, dataDeHoje()]);
            for (const conta of futuras) await run("DELETE FROM contas WHERE id=?", [conta.id]);
            return futuras.length;
          });
          res.json({ mensagem: `D\xEDvida fixa encerrada. N\xE3o ser\xE3o lan\xE7adas novas contas${removidas ? ` e ${removidas === 1 ? "a conta futura n\xE3o paga foi removida" : `${removidas} contas futuras n\xE3o pagas foram removidas`}` : ""}. O hist\xF3rico foi mantido.` });
        } catch (e) {
          if (e.statusCode) return res.status(e.statusCode).json({ error: e.message });
          errorResponse(res, e);
        }
      });
      app.put("/api/contas-fixas/:id/reativar", requireAuth, requireEditar("contas"), async (req, res) => {
        try {
          await transaction(async () => {
            const modelo = await get("SELECT id FROM contas_fixas WHERE id=?", [req.params.id]);
            if (!modelo) throw Object.assign(new Error("D\xEDvida fixa n\xE3o encontrada."), { statusCode: 404 });
            await run("UPDATE contas_fixas SET ativa=?,encerrada_em=NULL,gerada_ate=? WHERE id=?", [toDbBool(true), somaMeses(dataDeHoje().slice(0, 7), -1), modelo.id]);
          });
          await tentarGerarRecorrencias(true);
          res.json({ mensagem: "D\xEDvida fixa reativada. As contas voltam a ser lan\xE7adas a partir deste m\xEAs." });
        } catch (e) {
          if (e.statusCode) return res.status(e.statusCode).json({ error: e.message });
          errorResponse(res, e);
        }
      });
      app.put("/api/eventos-anuais/:id/parar", requireAuth, requireEditar("eventos"), async (req, res) => {
        try {
          const removidos = await transaction(async () => {
            const serie = await get("SELECT id FROM eventos_anuais WHERE id=?", [req.params.id]);
            if (!serie) throw Object.assign(new Error("Evento anual n\xE3o encontrado."), { statusCode: 404 });
            await run("UPDATE eventos_anuais SET ativo=? WHERE id=?", [toDbBool(false), serie.id]);
            const futuros = await all("SELECT e.id,(SELECT COUNT(*) FROM vendas v WHERE v.evento_id=e.id) AS vendas FROM eventos e WHERE e.anual_id=? AND e.data>?", [serie.id, dataDeHoje()]);
            let apagados = 0;
            for (const futuro of futuros) {
              if (Number(futuro.vendas) > 0) continue;
              await run("DELETE FROM eventos WHERE id=?", [futuro.id]);
              apagados += 1;
            }
            return apagados;
          });
          res.json({ mensagem: `Este evento n\xE3o vai mais se repetir todo ano${removidos ? ` e ${removidos === 1 ? "o pr\xF3ximo ano salvo foi removido" : `${removidos} anos futuros salvos foram removidos`}` : ""}. Os anos que j\xE1 t\xEAm vendas foram mantidos.` });
        } catch (e) {
          if (e.statusCode) return res.status(e.statusCode).json({ error: e.message });
          errorResponse(res, e);
        }
      });
      var RECUPERACAO_TENTATIVAS_MAXIMAS = 5;
      var RECUPERACAO_BLOQUEIO_MS = 10 * 60 * 1e3;
      var recuperacaoTentativas = /* @__PURE__ */ new Map();
      function chaveRecuperacaoConfigurada() {
        return String(process.env.ADMIN_RECOVERY_KEY || "");
      }
      function comparacaoSegura(a, b) {
        const bufferA = import_buffer.Buffer.from(String(a));
        const bufferB = import_buffer.Buffer.from(String(b));
        return bufferA.length === bufferB.length && crypto.timingSafeEqual(bufferA, bufferB);
      }
      function estadoRecuperacao(login) {
        const registro = recuperacaoTentativas.get(login) || { falhas: 0, bloqueadoAte: 0 };
        if (registro.bloqueadoAte > Date.now()) return registro;
        if (registro.bloqueadoAte) recuperacaoTentativas.delete(login);
        return { falhas: 0, bloqueadoAte: 0 };
      }
      app.post("/api/recuperar-acesso", async (req, res) => {
        const chaveEsperada = chaveRecuperacaoConfigurada();
        if (!chaveEsperada) return res.status(503).json({ error: "Recupera\xE7\xE3o de acesso desabilitada. O administrador precisa configurar ADMIN_RECOVERY_KEY no servidor." });
        const login = normalizeLogin(req.body.login);
        const chave = String(req.body.chave_recuperacao || "");
        const novaSenha = String(req.body.nova_senha || "");
        if (!login || !chave || !novaSenha) return res.status(400).json({ error: "Informe login, chave de recupera\xE7\xE3o e a nova senha." });
        if (novaSenha.length < 6) return res.status(400).json({ error: "A nova senha precisa ter pelo menos 6 caracteres." });
        const registro = estadoRecuperacao(login);
        if (registro.bloqueadoAte > Date.now()) return res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente." });
        if (!comparacaoSegura(chave, chaveEsperada)) {
          registro.falhas += 1;
          if (registro.falhas >= RECUPERACAO_TENTATIVAS_MAXIMAS) registro.bloqueadoAte = Date.now() + RECUPERACAO_BLOQUEIO_MS;
          recuperacaoTentativas.set(login, registro);
          return res.status(401).json({ error: "Chave de recupera\xE7\xE3o inv\xE1lida." });
        }
        try {
          const usuario = await get("SELECT id,login,departamento FROM usuarios_erp WHERE lower(login)=?", [login]);
          if (!usuario || !isAdminUser({ login: usuario.login, departamento: usuario.departamento })) return res.status(403).json({ error: "A recupera\xE7\xE3o de acesso \xE9 exclusiva do perfil de administrador." });
          await run("UPDATE usuarios_erp SET senha=? WHERE id=?", [hashPassword(novaSenha), usuario.id]);
          recuperacaoTentativas.delete(login);
          for (const [token, sessao] of sessions) if (sessao.user.id === usuario.id) sessions.delete(token);
          res.json({ mensagem: "Senha redefinida. Fa\xE7a login novamente com a nova senha." });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      var CHAVE_PADROES_PRECO = "precificacao_padroes";
      var formatarReais = (v) => `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      async function padroesDePreco() {
        const linha = await get("SELECT valor FROM parametros WHERE chave=?", [CHAVE_PADROES_PRECO]);
        if (!linha) return { ...Precificacao.PADROES };
        try {
          const salvo = JSON.parse(linha.valor);
          const ok = Precificacao.validarPadroes(salvo);
          return ok.padroes || { ...Precificacao.PADROES };
        } catch (_) {
          return { ...Precificacao.PADROES };
        }
      }
      var numOuNull = (v) => v === null || v === void 0 ? null : Number(v);
      function fichaDoBanco(linha, itens) {
        if (!linha) return null;
        return {
          id: Number(linha.id),
          imposto_pct: numOuNull(linha.imposto_pct),
          taxa_pct: numOuNull(linha.taxa_pct),
          comissao_pct: numOuNull(linha.comissao_pct),
          despesas_pct: numOuNull(linha.despesas_pct),
          margem_pct: numOuNull(linha.margem_pct),
          arredondamento: linha.arredondamento || null,
          observacoes: linha.observacoes || "",
          atualizado_em: linha.atualizado_em,
          itens: itens.map((i) => ({ etapa: i.etapa, descricao: i.descricao, quantidade: Number(i.quantidade), unidade: i.unidade, valor_unitario: Number(i.valor_unitario), rendimento: Number(i.rendimento) }))
        };
      }
      async function produtoPrecificavel(tipo, id) {
        const n = parseInteiro(id);
        if (!n) return null;
        if (tipo === "modelo") {
          const m = await get("SELECT id,nome,categoria,preco FROM modelos WHERE id=?", [n]);
          if (!m) return null;
          const v = await get("SELECT COUNT(*) AS variacoes, COALESCE(SUM(estoque),0) AS estoque, SUM(CASE WHEN ativo THEN 1 ELSE 0 END) AS ativos FROM produtos WHERE modelo_id=?", [n]);
          return { tipo, id: n, nome: m.nome, categoria: m.categoria, preco: Number(m.preco), variacoes: Number(v.variacoes), estoque: Number(v.estoque), ativo: Number(v.variacoes) ? Number(v.ativos) > 0 : true };
        }
        if (tipo === "peca") {
          const p = await get("SELECT id,nome,categoria,preco,estoque,ativo FROM produtos WHERE id=? AND modelo_id IS NULL", [n]);
          if (!p) return null;
          return { tipo, id: n, nome: p.nome, categoria: p.categoria, preco: Number(p.preco), variacoes: 0, estoque: Number(p.estoque), ativo: fromDbBool(p.ativo) };
        }
        return null;
      }
      var colunaFicha = (tipo) => tipo === "modelo" ? "modelo_id" : "produto_id";
      async function lerFicha(tipo, id) {
        const linha = await get(`SELECT * FROM ficha_custo WHERE ${colunaFicha(tipo)}=?`, [id]);
        if (!linha) return null;
        const itens = await all("SELECT * FROM ficha_custo_item WHERE ficha_id=? ORDER BY ordem, id", [linha.id]);
        return fichaDoBanco(linha, itens);
      }
      app.get("/api/precificacao", requireAuth, requireVer("precos"), async (req, res) => {
        try {
          const padroes = await padroesDePreco();
          const modelos = await all(`SELECT m.id,m.nome,m.categoria,m.preco, COUNT(p.id) AS variacoes, COALESCE(SUM(p.estoque),0) AS estoque, SUM(CASE WHEN p.ativo THEN 1 ELSE 0 END) AS ativos
      FROM modelos m LEFT JOIN produtos p ON p.modelo_id=m.id GROUP BY m.id,m.nome,m.categoria,m.preco ORDER BY m.nome`);
          const pecas = await all("SELECT id,nome,categoria,preco,estoque,ativo FROM produtos WHERE modelo_id IS NULL ORDER BY nome");
          const fichas = await all("SELECT * FROM ficha_custo");
          const itens = await all("SELECT * FROM ficha_custo_item ORDER BY ordem, id");
          const itensPorFicha = /* @__PURE__ */ new Map();
          for (const i of itens) {
            const k = Number(i.ficha_id);
            if (!itensPorFicha.has(k)) itensPorFicha.set(k, []);
            itensPorFicha.get(k).push(i);
          }
          const fichaPor = new Map(fichas.map((f) => [f.modelo_id != null ? `modelo:${f.modelo_id}` : `peca:${f.produto_id}`, fichaDoBanco(f, itensPorFicha.get(Number(f.id)) || [])]));
          const montar = (tipo, l) => {
            const ficha = fichaPor.get(`${tipo}:${l.id}`) || null;
            const item = { tipo, id: Number(l.id), nome: l.nome, categoria: l.categoria, preco: Number(l.preco), variacoes: Number(l.variacoes || 0), estoque: Number(l.estoque || 0), ativo: tipo === "modelo" ? !Number(l.variacoes) || Number(l.ativos) > 0 : fromDbBool(l.ativo), ficha };
            if (ficha) {
              const c = Precificacao.calcular(ficha, padroes, item.preco);
              item.resumo = { custo: c.custo, preco_sugerido: c.preco_sugerido, preco_minimo: c.preco_minimo, lucro: c.atual?.lucro ?? null, margem_pct: c.atual?.margem_pct ?? null, margem_desejada: c.percentuais.margem_pct, situacao: c.erro ? "erro" : c.atual?.situacao || "sem_custo", erro: c.erro };
            }
            return item;
          };
          res.json({ padroes, etapas: Precificacao.ETAPAS, unidades: Precificacao.UNIDADES, produtos: [...modelos.map((m) => montar("modelo", m)), ...pecas.map((p) => montar("peca", p))] });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.get("/api/precificacao/padroes", requireAuth, requireVer("precos"), async (req, res) => {
        try {
          res.json(await padroesDePreco());
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.put("/api/precificacao/padroes", requireAuth, requireEditar("precos"), async (req, res) => {
        const { erro, padroes } = Precificacao.validarPadroes(req.body);
        if (erro) return res.status(400).json({ error: erro });
        try {
          await all("INSERT INTO parametros (chave,valor,atualizado_por) VALUES (?,?,?) ON CONFLICT(chave) DO UPDATE SET valor=excluded.valor,atualizado_por=excluded.atualizado_por,atualizado_em=CURRENT_TIMESTAMP", [CHAVE_PADROES_PRECO, JSON.stringify(padroes), req.user.id]);
          res.json({ mensagem: "Padr\xF5es da loja salvos. As fichas sem percentual pr\xF3prio j\xE1 usam os novos valores.", padroes });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.get("/api/precificacao/:tipo/:id", requireAuth, requireVer("precos"), async (req, res) => {
        try {
          const produto = await produtoPrecificavel(req.params.tipo, req.params.id);
          if (!produto) return res.status(404).json({ error: "Produto n\xE3o encontrado." });
          const padroes = await padroesDePreco();
          const ficha = await lerFicha(produto.tipo, produto.id);
          res.json({ produto, ficha, padroes, calculo: ficha ? Precificacao.calcular(ficha, padroes, produto.preco) : null });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.put("/api/precificacao/:tipo/:id", requireAuth, requireEditar("precos"), async (req, res) => {
        const { erro, ficha } = Precificacao.validarFicha(req.body);
        if (erro) return res.status(400).json({ error: erro });
        if (!ficha.itens.length) return res.status(400).json({ error: "Lance pelo menos um custo (ex.: o tecido)." });
        try {
          const produto = await produtoPrecificavel(req.params.tipo, req.params.id);
          if (!produto) return res.status(404).json({ error: "Produto n\xE3o encontrado." });
          const padroes = await padroesDePreco();
          const calculo = Precificacao.calcular(ficha, padroes, produto.preco);
          if (calculo.erro) return res.status(400).json({ error: calculo.erro });
          const coluna = colunaFicha(produto.tipo);
          const campos = [ficha.imposto_pct, ficha.taxa_pct, ficha.comissao_pct, ficha.despesas_pct, ficha.margem_pct, ficha.arredondamento, ficha.observacoes, req.user.id];
          await transaction(async () => {
            const existente = await get(`SELECT id FROM ficha_custo WHERE ${coluna}=?`, [produto.id]);
            let fichaId;
            if (existente) {
              fichaId = Number(existente.id);
              await run("UPDATE ficha_custo SET imposto_pct=?,taxa_pct=?,comissao_pct=?,despesas_pct=?,margem_pct=?,arredondamento=?,observacoes=?,atualizado_por=?,atualizado_em=CURRENT_TIMESTAMP WHERE id=?", [...campos, fichaId]);
              await run("DELETE FROM ficha_custo_item WHERE ficha_id=?", [fichaId]);
            } else {
              fichaId = Number((await run(`INSERT INTO ficha_custo (${coluna},imposto_pct,taxa_pct,comissao_pct,despesas_pct,margem_pct,arredondamento,observacoes,atualizado_por) VALUES (?,?,?,?,?,?,?,?,?)${RETORNA_ID}`, [produto.id, ...campos])).lastID);
            }
            for (const [ordem, i] of ficha.itens.entries()) {
              await run(`INSERT INTO ficha_custo_item (ficha_id,ordem,etapa,descricao,quantidade,unidade,valor_unitario,rendimento) VALUES (?,?,?,?,?,?,?,?)${RETORNA_ID}`, [fichaId, ordem, i.etapa, i.descricao, i.quantidade, i.unidade, i.valor_unitario, i.rendimento]);
            }
          });
          res.json({ mensagem: `Ficha de custo de "${produto.nome}" salva.`, ficha: await lerFicha(produto.tipo, produto.id), calculo });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.delete("/api/precificacao/:tipo/:id", requireAuth, requireEditar("precos"), async (req, res) => {
        try {
          const produto = await produtoPrecificavel(req.params.tipo, req.params.id);
          if (!produto) return res.status(404).json({ error: "Produto n\xE3o encontrado." });
          const linha = await get(`SELECT id FROM ficha_custo WHERE ${colunaFicha(produto.tipo)}=?`, [produto.id]);
          if (!linha) return res.status(404).json({ error: "Este produto n\xE3o tem ficha de custo." });
          await transaction(async () => {
            await run("DELETE FROM ficha_custo_item WHERE ficha_id=?", [linha.id]);
            await run("DELETE FROM ficha_custo WHERE id=?", [linha.id]);
          });
          res.json({ mensagem: "Ficha de custo apagada. O pre\xE7o do produto n\xE3o mudou." });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.post("/api/precificacao/:tipo/:id/aplicar-preco", requireAuth, requireEditar("precos"), async (req, res) => {
        const preco = parseMoney(req.body.preco);
        if (preco === null || preco <= 0) return res.status(400).json({ error: "Informe um pre\xE7o maior que zero, com at\xE9 duas casas decimais." });
        try {
          const produto = await produtoPrecificavel(req.params.tipo, req.params.id);
          if (!produto) return res.status(404).json({ error: "Produto n\xE3o encontrado." });
          await transaction(async () => {
            if (produto.tipo === "modelo") {
              await run("UPDATE modelos SET preco=? WHERE id=?", [preco, produto.id]);
              await run("UPDATE produtos SET preco=? WHERE modelo_id=?", [preco, produto.id]);
            } else {
              await run("UPDATE produtos SET preco=? WHERE id=?", [preco, produto.id]);
            }
            await registrarLog(req.user, "PRODUTO", `Pre\xE7o de "${produto.nome}" mudou de ${formatarReais(produto.preco)} para ${formatarReais(preco)} pela forma\xE7\xE3o de pre\xE7o${produto.tipo === "modelo" ? ` (${produto.variacoes} varia\xE7\xF5es)` : ""}.`, { valor: preco });
          });
          res.json({ mensagem: `Pre\xE7o de "${produto.nome}" atualizado para ${formatarReais(preco)}.`, preco });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      var CATEGORIAS_PADRAO = ["Camiseta", "Moletom", "Cal\xE7a", "Acess\xF3rio", "Outros"];
      var TIPOS_EVENTO_PADRAO = [
        ["encontro", "Encontro de carros", "#e8212e"],
        ["corrida", "Corrida / track day", "#3b82f6"],
        ["feira", "Feira / exposi\xE7\xE3o", "#f59e0b"],
        ["promocao", "Promo\xE7\xE3o", "#22c55e"],
        ["lancamento", "Lan\xE7amento", "#a855f7"],
        ["outro", "Outro", "#94a3b8"]
      ];
      var CORES_TIPO_EVENTO = ["#e8212e", "#f97316", "#f59e0b", "#22c55e", "#14b8a6", "#3b82f6", "#6366f1", "#a855f7", "#ec4899", "#94a3b8"];
      var RETORNA_ID = USE_POSTGRES ? " RETURNING id" : "";
      async function prepararCatalogos() {
        if (!Number((await get("SELECT COUNT(*) AS n FROM categoria_produto")).n)) {
          for (const nome of CATEGORIAS_PADRAO) await run(`INSERT INTO categoria_produto (nome) VALUES (?)${RETORNA_ID}`, [nome]);
        }
        const usadas = await all("SELECT DISTINCT categoria FROM modelos WHERE categoria<>'' UNION SELECT DISTINCT categoria FROM produtos WHERE categoria<>''");
        for (const { categoria } of usadas) {
          if (!await get("SELECT id FROM categoria_produto WHERE lower(nome)=lower(?)", [categoria])) await run(`INSERT INTO categoria_produto (nome) VALUES (?)${RETORNA_ID}`, [String(categoria).slice(0, 40)]);
        }
        if (!Number((await get("SELECT COUNT(*) AS n FROM tipo_evento")).n)) {
          for (const [chave, nome, cor] of TIPOS_EVENTO_PADRAO) await run(`INSERT INTO tipo_evento (chave,nome,cor) VALUES (?,?,?)${RETORNA_ID}`, [chave, nome, cor]);
        }
        const tiposUsados = await all("SELECT DISTINCT tipo FROM eventos WHERE tipo<>'' UNION SELECT DISTINCT tipo FROM eventos_anuais WHERE tipo<>''");
        for (const { tipo } of tiposUsados) {
          if (await get("SELECT id FROM tipo_evento WHERE chave=?", [tipo])) continue;
          const padrao = TIPOS_EVENTO_PADRAO.find((t) => t[0] === tipo);
          let nome = padrao ? padrao[1] : String(tipo).replace(/[-_]+/g, " ").replace(/^./, (l) => l.toUpperCase()).slice(0, 40);
          if (await get("SELECT id FROM tipo_evento WHERE lower(nome)=lower(?)", [nome])) nome = `${nome} (${tipo})`.slice(0, 40);
          await run(`INSERT INTO tipo_evento (chave,nome,cor) VALUES (?,?,?)${RETORNA_ID}`, [tipo, nome, padrao ? padrao[2] : "#94a3b8"]);
        }
      }
      var nomeCatalogo = (v) => String(v ?? "").replace(/\s+/g, " ").trim();
      function lerNomeCatalogo(corpo, rotulo) {
        const nome = nomeCatalogo(corpo?.nome);
        if (!nome) return { erro: `Informe o nome ${rotulo}.` };
        if (nome.length > 40) return { erro: `O nome ${rotulo} pode ter at\xE9 40 caracteres.` };
        return { nome };
      }
      async function garantirCategoria(nome) {
        const existente = await get("SELECT nome FROM categoria_produto WHERE lower(nome)=lower(?)", [nome]);
        if (existente) return existente.nome;
        await run(`INSERT INTO categoria_produto (nome) VALUES (?)${RETORNA_ID}`, [nome.slice(0, 40)]);
        return nome.slice(0, 40);
      }
      var SQL_CATEGORIAS = `SELECT c.id, c.nome,
  (SELECT COUNT(*) FROM modelos m WHERE m.categoria=c.nome) AS modelos,
  (SELECT COUNT(*) FROM produtos p WHERE p.categoria=c.nome AND p.modelo_id IS NULL) AS pecas_unicas
  FROM categoria_produto c ORDER BY lower(c.nome)`;
      var linhaCategoria = (c) => ({ id: Number(c.id), nome: c.nome, modelos: Number(c.modelos), pecas_unicas: Number(c.pecas_unicas), em_uso: Number(c.modelos) + Number(c.pecas_unicas) });
      app.get("/api/categorias-produto", requireAuth, async (req, res) => {
        try {
          res.json((await all(SQL_CATEGORIAS)).map(linhaCategoria));
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.post("/api/categorias-produto", requireAuth, requireEditar("estoque"), async (req, res) => {
        const lido = lerNomeCatalogo(req.body, "da categoria");
        if (lido.erro) return res.status(400).json({ error: lido.erro });
        try {
          if (await get("SELECT id FROM categoria_produto WHERE lower(nome)=lower(?)", [lido.nome])) return res.status(409).json({ error: `A categoria "${lido.nome}" j\xE1 existe.` });
          const r = await transaction(async () => {
            const nova = await run(`INSERT INTO categoria_produto (nome) VALUES (?)${RETORNA_ID}`, [lido.nome]);
            await registrarLog(req.user, "PRODUTO", `Categoria de produto cadastrada: ${lido.nome}`);
            return nova;
          });
          res.status(201).json({ id: Number(r.lastID), nome: lido.nome, mensagem: `Categoria "${lido.nome}" cadastrada.` });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.put("/api/categorias-produto/:id", requireAuth, requireEditar("estoque"), async (req, res) => {
        const lido = lerNomeCatalogo(req.body, "da categoria");
        if (lido.erro) return res.status(400).json({ error: lido.erro });
        try {
          const atual = await get("SELECT id,nome FROM categoria_produto WHERE id=?", [req.params.id]);
          if (!atual) return res.status(404).json({ error: "Categoria n\xE3o encontrada." });
          if (await get("SELECT id FROM categoria_produto WHERE lower(nome)=lower(?) AND id<>?", [lido.nome, atual.id])) return res.status(409).json({ error: `J\xE1 existe a categoria "${lido.nome}". Para juntar as duas, exclua esta e mova os produtos para l\xE1.` });
          const alterados = await transaction(async () => {
            await run("UPDATE categoria_produto SET nome=? WHERE id=?", [lido.nome, atual.id]);
            const m = await run("UPDATE modelos SET categoria=? WHERE categoria=?", [lido.nome, atual.nome]);
            const p = await run("UPDATE produtos SET categoria=? WHERE categoria=?", [lido.nome, atual.nome]);
            if (atual.nome !== lido.nome) await registrarLog(req.user, "PRODUTO", `Categoria renomeada: ${atual.nome} \u2192 ${lido.nome}`);
            return Number(m.changes || 0) + Number(p.changes || 0);
          });
          res.json({ mensagem: atual.nome === lido.nome ? "Nada mudou." : `Categoria renomeada para "${lido.nome}"${alterados ? ` em ${alterados} ${alterados === 1 ? "cadastro" : "cadastros"}` : ""}.` });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.delete("/api/categorias-produto/:id", requireAuth, requireEditar("estoque"), async (req, res) => {
        try {
          const atual = (await all(SQL_CATEGORIAS)).map(linhaCategoria).find((c) => c.id === Number(req.params.id));
          if (!atual) return res.status(404).json({ error: "Categoria n\xE3o encontrada." });
          const destinoId = parseInteiro(req.query.mover_para ?? req.body?.mover_para);
          let destino = null;
          if (atual.em_uso) {
            if (!destinoId) return res.status(409).json({ error: `"${atual.nome}" tem ${atual.modelos} ${atual.modelos === 1 ? "modelo" : "modelos"}${atual.pecas_unicas ? ` e ${atual.pecas_unicas} ${atual.pecas_unicas === 1 ? "pe\xE7a \xFAnica" : "pe\xE7as \xFAnicas"}` : ""}. Escolha para qual categoria eles v\xE3o.`, em_uso: atual.em_uso });
            destino = await get("SELECT id,nome FROM categoria_produto WHERE id=?", [destinoId]);
            if (!destino || Number(destino.id) === atual.id) return res.status(400).json({ error: "Escolha outra categoria para receber os produtos." });
          }
          if (Number((await get("SELECT COUNT(*) AS n FROM categoria_produto")).n) <= 1) return res.status(409).json({ error: "\xC9 preciso ter pelo menos uma categoria." });
          await transaction(async () => {
            if (destino) {
              await run("UPDATE modelos SET categoria=? WHERE categoria=?", [destino.nome, atual.nome]);
              await run("UPDATE produtos SET categoria=? WHERE categoria=?", [destino.nome, atual.nome]);
            }
            await run("DELETE FROM categoria_produto WHERE id=?", [atual.id]);
            await registrarLog(req.user, "PRODUTO", `Categoria exclu\xEDda: ${atual.nome}${destino ? ` (produtos movidos para ${destino.nome})` : ""}`);
          });
          res.json({ mensagem: `Categoria "${atual.nome}" exclu\xEDda${destino ? `. Os produtos foram para "${destino.nome}"` : ""}.` });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      var SQL_TIPOS_EVENTO = `SELECT t.id, t.chave, t.nome, t.cor,
  (SELECT COUNT(*) FROM eventos e WHERE e.tipo=t.chave) AS eventos,
  (SELECT COUNT(*) FROM eventos_anuais a WHERE a.tipo=t.chave) AS anuais
  FROM tipo_evento t ORDER BY t.id`;
      var linhaTipoEvento = (t) => ({ id: Number(t.id), chave: t.chave, nome: t.nome, cor: t.cor, eventos: Number(t.eventos), anuais: Number(t.anuais), em_uso: Number(t.eventos) + Number(t.anuais) });
      function lerTipoEvento(corpo) {
        const lido = lerNomeCatalogo(corpo, "do tipo");
        if (lido.erro) return lido;
        const cor = String(corpo?.cor || "").toLowerCase();
        if (!/^#[0-9a-f]{6}$/.test(cor)) return { erro: "Escolha uma cor para o tipo." };
        return { nome: lido.nome, cor };
      }
      async function chaveDoTipo(nome) {
        const base = nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "tipo";
        let chave = base, n = 2;
        while (await get("SELECT id FROM tipo_evento WHERE chave=?", [chave])) chave = `${base}-${n++}`;
        return chave;
      }
      app.get("/api/tipos-evento", requireAuth, async (req, res) => {
        try {
          res.json({ tipos: (await all(SQL_TIPOS_EVENTO)).map(linhaTipoEvento), cores: CORES_TIPO_EVENTO });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.post("/api/tipos-evento", requireAuth, requireEditar("eventos"), async (req, res) => {
        const lido = lerTipoEvento(req.body);
        if (lido.erro) return res.status(400).json({ error: lido.erro });
        try {
          if (await get("SELECT id FROM tipo_evento WHERE lower(nome)=lower(?)", [lido.nome])) return res.status(409).json({ error: `O tipo "${lido.nome}" j\xE1 existe.` });
          const chave = await chaveDoTipo(lido.nome);
          const r = await run(`INSERT INTO tipo_evento (chave,nome,cor) VALUES (?,?,?)${RETORNA_ID}`, [chave, lido.nome, lido.cor]);
          res.status(201).json({ id: Number(r.lastID), chave, nome: lido.nome, cor: lido.cor, mensagem: `Tipo "${lido.nome}" cadastrado.` });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.put("/api/tipos-evento/:id", requireAuth, requireEditar("eventos"), async (req, res) => {
        const lido = lerTipoEvento(req.body);
        if (lido.erro) return res.status(400).json({ error: lido.erro });
        try {
          const atual = await get("SELECT id FROM tipo_evento WHERE id=?", [req.params.id]);
          if (!atual) return res.status(404).json({ error: "Tipo n\xE3o encontrado." });
          if (await get("SELECT id FROM tipo_evento WHERE lower(nome)=lower(?) AND id<>?", [lido.nome, atual.id])) return res.status(409).json({ error: `J\xE1 existe o tipo "${lido.nome}".` });
          await run("UPDATE tipo_evento SET nome=?, cor=? WHERE id=?", [lido.nome, lido.cor, atual.id]);
          res.json({ mensagem: "Tipo de evento atualizado." });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.delete("/api/tipos-evento/:id", requireAuth, requireEditar("eventos"), async (req, res) => {
        try {
          const atual = (await all(SQL_TIPOS_EVENTO)).map(linhaTipoEvento).find((t) => t.id === Number(req.params.id));
          if (!atual) return res.status(404).json({ error: "Tipo n\xE3o encontrado." });
          if (Number((await get("SELECT COUNT(*) AS n FROM tipo_evento")).n) <= 1) return res.status(409).json({ error: "\xC9 preciso ter pelo menos um tipo de evento." });
          const usados = Number((await get("SELECT COUNT(*) AS n FROM eventos WHERE tipo=?", [atual.chave])).n) + Number((await get("SELECT COUNT(*) AS n FROM eventos_anuais WHERE tipo=?", [atual.chave])).n);
          const destinoId = parseInteiro(req.query.mover_para ?? req.body?.mover_para);
          let destino = null;
          if (usados) {
            if (!destinoId) return res.status(409).json({ error: `"${atual.nome}" est\xE1 em ${atual.eventos} ${atual.eventos === 1 ? "evento" : "eventos"}. Escolha para qual tipo eles v\xE3o.`, em_uso: usados });
            destino = await get("SELECT id,chave,nome FROM tipo_evento WHERE id=?", [destinoId]);
            if (!destino || Number(destino.id) === atual.id) return res.status(400).json({ error: "Escolha outro tipo para receber os eventos." });
          }
          await transaction(async () => {
            if (destino) {
              await run("UPDATE eventos SET tipo=? WHERE tipo=?", [destino.chave, atual.chave]);
              await run("UPDATE eventos_anuais SET tipo=? WHERE tipo=?", [destino.chave, atual.chave]);
            }
            await run("DELETE FROM tipo_evento WHERE id=?", [atual.id]);
          });
          res.json({ mensagem: `Tipo "${atual.nome}" exclu\xEDdo${destino ? `. Os eventos agora s\xE3o "${destino.nome}"` : ""}.` });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      var DURACAO_MAXIMA_EVENTO = 30;
      var horaValida = (h) => /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(h);
      var SQL_VENDA_VALIDA = "NOT EXISTS (SELECT 1 FROM vendas_canceladas vc WHERE vc.venda_id=v.id) AND COALESCE(v.status_pagamento,'') NOT IN ('cancelado','recusado')";
      function lerEvento(corpo) {
        const data = String(corpo.data || "");
        const titulo = String(corpo.titulo || "").trim();
        const descricao = String(corpo.descricao || "").trim();
        const local = String(corpo.local || "").trim();
        const dataFimBruta = String(corpo.data_fim || "").trim();
        const horaInicio = String(corpo.hora_inicio || "").trim();
        const horaFim = String(corpo.hora_fim || "").trim();
        const tipo = String(corpo.tipo || "outro");
        if (!validDate(data) || !titulo) return { erro: "Selecione uma data e informe o t\xEDtulo do evento." };
        if (titulo.length > 120) return { erro: "O t\xEDtulo deve ter no m\xE1ximo 120 caracteres." };
        if (descricao.length > 500) return { erro: "A descri\xE7\xE3o deve ter no m\xE1ximo 500 caracteres." };
        if (local.length > 120) return { erro: "O local deve ter no m\xE1ximo 120 caracteres." };
        if (!tipo || tipo.length > 40) return { erro: "Tipo de evento inv\xE1lido." };
        let dataFim = null;
        if (dataFimBruta && dataFimBruta !== data) {
          if (!validDate(dataFimBruta) || dataFimBruta < data) return { erro: "O \xFAltimo dia do evento n\xE3o pode ser antes do primeiro." };
          if (diasEntreDatas(data, dataFimBruta) > DURACAO_MAXIMA_EVENTO) return { erro: `Um evento pode durar no m\xE1ximo ${DURACAO_MAXIMA_EVENTO + 1} dias.` };
          dataFim = dataFimBruta;
        }
        if (horaInicio && !horaValida(horaInicio) || horaFim && !horaValida(horaFim)) return { erro: "Informe o hor\xE1rio no formato HH:MM." };
        if (horaFim && !horaInicio) return { erro: "Informe tamb\xE9m o hor\xE1rio de in\xEDcio." };
        if (!dataFim && horaInicio && horaFim && horaFim <= horaInicio) return { erro: "O hor\xE1rio de t\xE9rmino deve ser depois do in\xEDcio." };
        return { data, dataFim, horaInicio: horaInicio || null, horaFim: horaFim || null, local, tipo, titulo, descricao };
      }
      function horaAgoraLoja(agora = /* @__PURE__ */ new Date()) {
        return new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(agora);
      }
      function eventoAoVivo(e, hoje = dataDeHoje(), hora = horaAgoraLoja()) {
        const inicio = diaIso(e.data);
        const fim = diaIso(e.data_fim || e.data);
        const hi = e.hora_inicio || null;
        const hf = e.hora_fim || null;
        const viraNoite = Boolean(hi && hf && hf <= hi);
        if (hoje < inicio || hoje > fim) return viraNoite && hoje === somarDiasData(fim, 1) && hora < hf;
        if (!hi) return true;
        if (!hf) return hora >= hi;
        if (!viraNoite) return hora >= hi && hora < hf;
        return hora >= hi || hoje !== inicio && hora < hf;
      }
      function estadoDoEventoHoje(e, hoje = dataDeHoje(), hora = horaAgoraLoja()) {
        if (eventoAoVivo(e, hoje, hora)) return "ao_vivo";
        if (e.hora_inicio && hora < e.hora_inicio && hoje >= diaIso(e.data) && hoje <= diaIso(e.data_fim || e.data)) return "antes";
        return "encerrado";
      }
      function normalizarEvento(e) {
        return {
          ...e,
          data: diaIso(e.data),
          data_fim: e.data_fim ? diaIso(e.data_fim) : null,
          local: e.local || "",
          tipo: e.tipo || "outro",
          vendas_count: Number(e.vendas_count || 0),
          faturamento: Number(e.faturamento || 0),
          pecas: Number(e.pecas || 0)
        };
      }
      var SQL_RESUMO_EVENTO = `
  (SELECT COUNT(*) FROM vendas v WHERE v.evento_id=e.id AND ${SQL_VENDA_VALIDA}) AS vendas_count,
  (SELECT COALESCE(SUM(v.total),0) FROM vendas v WHERE v.evento_id=e.id AND ${SQL_VENDA_VALIDA}) AS faturamento,
  (SELECT COALESCE(SUM(i.quantidade),0) FROM venda_item i JOIN vendas v ON v.id=i.venda_id WHERE v.evento_id=e.id AND i.tipo='VENDA' AND ${SQL_VENDA_VALIDA}) AS pecas`;
      app.get("/api/eventos", requireAuth, requireVer("eventos", "dashboard"), async (req, res) => {
        try {
          await tentarGerarRecorrencias();
          const mes = /^[0-9]{4}-(0[1-9]|1[0-2])$/.test(String(req.query.mes || "")) ? String(req.query.mes) : "";
          const filtros = [];
          const params = [];
          if (mes) {
            params.push(mes, mes);
            filtros.push("substr(CAST(e.data AS TEXT),1,7)<=? AND substr(CAST(COALESCE(e.data_fim,e.data) AS TEXT),1,7)>=?");
          }
          const where = filtros.length ? `WHERE ${filtros.join(" AND ")}` : "";
          const linhas = await all(`SELECT e.*, u.nome AS criado_por_nome,
      (SELECT a.ativo FROM eventos_anuais a WHERE a.id=e.anual_id) AS anual_ativo, ${SQL_RESUMO_EVENTO}
      FROM eventos e LEFT JOIN usuarios_erp u ON u.id=e.criado_por ${where} ORDER BY e.data ASC, e.hora_inicio ASC, e.id ASC`, params);
          res.json(linhas.map((linha) => ({ ...normalizarEvento(linha), anual_ativo: Boolean(linha.anual_id) && fromDbBool(linha.anual_ativo) })));
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.get("/api/eventos/hoje", requireAuth, requireVer("vendas", "eventos", "dashboard", "movimentar"), async (req, res) => {
        try {
          const hoje = dataDeHoje();
          const hora = horaAgoraLoja();
          const linhas = await all(`SELECT e.id,e.titulo,e.local,e.tipo,e.data,e.data_fim,e.hora_inicio,e.hora_fim FROM eventos e
      WHERE CAST(e.data AS TEXT)<=? AND CAST(COALESCE(e.data_fim,e.data) AS TEXT)>=? ORDER BY e.hora_inicio ASC, e.id ASC`, [hoje, somarDiasData(hoje, -1)]);
          const doDia = linhas.map(normalizarEvento).filter((e) => e.data <= hoje && hoje <= (e.data_fim || e.data) || eventoAoVivo(e, hoje, hora));
          res.json(doDia.map((e) => ({ ...e, estado: estadoDoEventoHoje(e, hoje, hora), ao_vivo: eventoAoVivo(e, hoje, hora) })));
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.get("/api/eventos/:id", requireAuth, requireVer("eventos", "dashboard"), async (req, res) => {
        try {
          const evento = await get(`SELECT e.*, u.nome AS criado_por_nome, (SELECT a.ativo FROM eventos_anuais a WHERE a.id=e.anual_id) AS anual_ativo, ${SQL_RESUMO_EVENTO}
      FROM eventos e LEFT JOIN usuarios_erp u ON u.id=e.criado_por WHERE e.id=?`, [req.params.id]);
          if (!evento) return res.status(404).json({ error: "Evento n\xE3o encontrado." });
          const vendas = await all(`SELECT v.id,v.total,v.desconto_valor,v.forma_pagamento,v.parcelas,v.criado_em,v.data_venda,uv.nome AS vendedor_nome,
        CASE WHEN ${SQL_VENDA_VALIDA} THEN 0 ELSE 1 END AS cancelada
      FROM vendas v LEFT JOIN usuarios_erp uv ON uv.id=v.usuario_id WHERE v.evento_id=? ORDER BY v.id DESC`, [evento.id]);
          const itensPorVenda = await itensDasVendas(vendas.map((v) => v.id));
          const partesPorVenda = await partesDasVendas(vendas);
          const validas = vendas.filter((v) => !Number(v.cancelada));
          const produtos = /* @__PURE__ */ new Map();
          const pagamentos = /* @__PURE__ */ new Map();
          const vendedores = /* @__PURE__ */ new Map();
          const porDia = /* @__PURE__ */ new Map();
          let brindes = 0;
          let descontos = 0;
          for (const v of validas) {
            descontos += Number(v.desconto_valor || 0);
            somarPorForma(pagamentos, v, partesPorVenda);
            const nome = v.vendedor_nome || "Sem registro";
            const vd = vendedores.get(nome) || { nome, vendas: 0, valor: 0 };
            vd.vendas += 1;
            vd.valor += Number(v.total);
            vendedores.set(nome, vd);
            const dia = diaIso(v.data_venda);
            const d = porDia.get(dia) || { dia, vendas: 0, valor: 0 };
            d.vendas += 1;
            d.valor += Number(v.total);
            porDia.set(dia, d);
            for (const i of itensPorVenda.get(Number(v.id)) || []) {
              if (i.tipo === "BRINDE") {
                brindes += i.quantidade;
                continue;
              }
              const linha = produtos.get(Number(i.produto_id)) || { produto_id: Number(i.produto_id), produto_nome: i.produto_nome, quantidade: 0, valor: 0 };
              linha.quantidade += i.quantidade;
              linha.valor += i.quantidade * i.preco_unitario;
              produtos.set(Number(i.produto_id), linha);
            }
          }
          const centavos2 = (n) => Math.round(Number(n || 0) * 100) / 100;
          const base = normalizarEvento(evento);
          res.json({
            ...base,
            anual_ativo: Boolean(evento.anual_id) && fromDbBool(evento.anual_ativo),
            resultado: {
              vendas: base.vendas_count,
              faturamento: centavos2(base.faturamento),
              pecas: base.pecas,
              brindes,
              descontos: centavos2(descontos),
              ticket_medio: base.vendas_count ? centavos2(base.faturamento / base.vendas_count) : 0,
              canceladas: vendas.length - validas.length,
              produtos: [...produtos.values()].map((p) => ({ ...p, valor: centavos2(p.valor) })).sort((a, b) => b.quantidade - a.quantidade || b.valor - a.valor),
              por_pagamento: [...pagamentos.values()].map((p) => ({ ...p, valor: centavos2(p.valor) })).sort((a, b) => b.valor - a.valor),
              por_vendedor: [...vendedores.values()].map((p) => ({ ...p, valor: centavos2(p.valor) })).sort((a, b) => b.valor - a.valor),
              por_dia: [...porDia.values()].map((p) => ({ ...p, valor: centavos2(p.valor) })).sort((a, b) => a.dia.localeCompare(b.dia))
            },
            vendas: vendas.map((v) => ({ id: Number(v.id), total: Number(v.total), forma_pagamento: v.forma_pagamento, parcelas: Number(v.parcelas || 1), vendedor_nome: v.vendedor_nome || "", criado_em: v.criado_em, cancelada: Boolean(Number(v.cancelada)), itens: (itensPorVenda.get(Number(v.id)) || []).map((i) => ({ produto_nome: i.produto_nome, quantidade: i.quantidade, tipo: i.tipo })) }))
          });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.post("/api/eventos", requireAuth, requireEditar("eventos"), async (req, res) => {
        const ev = lerEvento(req.body);
        if (ev.erro) return res.status(400).json({ error: ev.erro });
        try {
          if (!await get("SELECT id FROM tipo_evento WHERE chave=?", [ev.tipo])) return res.status(400).json({ error: "Tipo de evento inv\xE1lido. Escolha um da lista." });
        } catch (e) {
          return errorResponse(res, e);
        }
        const repetir = req.body.repetir_anualmente === true;
        if (repetir && !dataReal(ev.data)) return res.status(400).json({ error: "Informe uma data v\xE1lida para repetir o evento todo ano." });
        try {
          const id = await transaction(async () => {
            const anualId = repetir ? await criarEventoAnual({ titulo: ev.titulo, descricao: ev.descricao, data: ev.data, usuarioId: req.user.id, dataFim: ev.dataFim, horaInicio: ev.horaInicio, horaFim: ev.horaFim, local: ev.local, tipo: ev.tipo }) : null;
            const novo = await run(
              "INSERT INTO eventos (data,data_fim,hora_inicio,hora_fim,local,tipo,titulo,descricao,criado_por,anual_id,ano_ocorrencia) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
              [ev.data, ev.dataFim, ev.horaInicio, ev.horaFim, ev.local, ev.tipo, ev.titulo, ev.descricao, req.user.id, anualId, anualId ? Number(ev.data.slice(0, 4)) : null]
            );
            return novo.lastID;
          });
          if (repetir) await tentarGerarRecorrencias(true);
          res.status(201).json({ id, anual: repetir, mensagem: repetir ? "Evento criado e salvo para se repetir todo ano na mesma data." : "Evento criado.", data: ev.data, titulo: ev.titulo });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.put("/api/eventos/:id", requireAuth, requireEditar("eventos"), async (req, res) => {
        const ev = lerEvento(req.body);
        if (ev.erro) return res.status(400).json({ error: ev.erro });
        try {
          if (!await get("SELECT id FROM tipo_evento WHERE chave=?", [ev.tipo])) return res.status(400).json({ error: "Tipo de evento inv\xE1lido. Escolha um da lista." });
        } catch (e) {
          return errorResponse(res, e);
        }
        try {
          const aviso = await transaction(async () => {
            const existente = await get("SELECT * FROM eventos WHERE id=?", [req.params.id]);
            if (!existente) throw Object.assign(new Error("Evento n\xE3o encontrado."), { statusCode: 404 });
            const faixa = await get("SELECT MIN(data_venda) AS primeira, MAX(data_venda) AS ultima FROM vendas WHERE evento_id=?", [existente.id]);
            if (faixa?.primeira && (diaIso(faixa.primeira) < ev.data || diaIso(faixa.ultima) > (ev.dataFim || ev.data))) {
              throw Object.assign(new Error(`Este evento tem vendas de ${diaIso(faixa.primeira).split("-").reverse().join("/")}${faixa.primeira !== faixa.ultima ? ` a ${diaIso(faixa.ultima).split("-").reverse().join("/")}` : ""}. As datas precisam continuar incluindo esses dias.`), { statusCode: 409 });
            }
            await run("UPDATE eventos SET data=?,data_fim=?,hora_inicio=?,hora_fim=?,local=?,tipo=?,titulo=?,descricao=? WHERE id=?", [ev.data, ev.dataFim, ev.horaInicio, ev.horaFim, ev.local, ev.tipo, ev.titulo, ev.descricao, existente.id]);
            if (existente.anual_id && req.body.aplicar_serie === true) {
              const duracao = ev.dataFim ? diasEntreDatas(ev.data, ev.dataFim) : 0;
              await run("UPDATE eventos_anuais SET titulo=?,descricao=?,local=?,tipo=?,hora_inicio=?,hora_fim=?,duracao_dias=? WHERE id=?", [ev.titulo, ev.descricao, ev.local, ev.tipo, ev.horaInicio, ev.horaFim, duracao, existente.anual_id]);
              const futuros = await all("SELECT id,data FROM eventos WHERE anual_id=? AND data>? AND id<>?", [existente.anual_id, dataDeHoje(), existente.id]);
              for (const futuro of futuros) await run("UPDATE eventos SET titulo=?,descricao=?,local=?,tipo=?,hora_inicio=?,hora_fim=?,data_fim=? WHERE id=?", [ev.titulo, ev.descricao, ev.local, ev.tipo, ev.horaInicio, ev.horaFim, duracao ? somarDiasData(diaIso(futuro.data), duracao) : null, futuro.id]);
              return futuros.length ? ` As mudan\xE7as valem tamb\xE9m para ${futuros.length === 1 ? "o pr\xF3ximo ano" : `os pr\xF3ximos ${futuros.length} anos`} j\xE1 salvos.` : " As mudan\xE7as passam a valer nos pr\xF3ximos anos.";
            }
            if (!existente.anual_id && req.body.repetir_anualmente === true) {
              if (!dataReal(ev.data)) throw Object.assign(new Error("Informe uma data v\xE1lida para repetir o evento todo ano."), { statusCode: 400 });
              const anualId = await criarEventoAnual({ titulo: ev.titulo, descricao: ev.descricao, data: ev.data, usuarioId: req.user.id, dataFim: ev.dataFim, horaInicio: ev.horaInicio, horaFim: ev.horaFim, local: ev.local, tipo: ev.tipo });
              await run("UPDATE eventos SET anual_id=?,ano_ocorrencia=? WHERE id=?", [anualId, Number(ev.data.slice(0, 4)), existente.id]);
              return " O evento foi salvo para se repetir todo ano na mesma data.";
            }
            return "";
          });
          if (aviso) await tentarGerarRecorrencias(true);
          res.json({ mensagem: `Evento atualizado.${aviso}` });
        } catch (e) {
          if (e.statusCode) return res.status(e.statusCode).json({ error: e.message });
          errorResponse(res, e);
        }
      });
      app.delete("/api/eventos/:id", requireAuth, requireEditar("eventos"), async (req, res) => {
        try {
          await transaction(async () => {
            const existente = await get("SELECT id FROM eventos WHERE id=?", [req.params.id]);
            if (!existente) throw Object.assign(new Error("Evento n\xE3o encontrado."), { statusCode: 404 });
            const ligadas = Number((await get("SELECT COUNT(*) AS n FROM vendas WHERE evento_id=?", [existente.id])).n || 0);
            if (ligadas) throw Object.assign(new Error(`Este evento tem ${ligadas === 1 ? "1 venda ligada" : `${ligadas} vendas ligadas`} e n\xE3o pode ser exclu\xEDdo: as vendas s\xE3o hist\xF3rico. Voc\xEA pode editar o t\xEDtulo ou as datas.`), { statusCode: 409 });
            await run("DELETE FROM eventos WHERE id=?", [existente.id]);
          });
          res.json({ mensagem: "Evento exclu\xEDdo." });
        } catch (e) {
          if (e.statusCode) return res.status(e.statusCode).json({ error: e.message });
          errorResponse(res, e);
        }
      });
      app.get("/api/relatorios/eventos", requireAuth, requireVer("relatorios"), async (req, res) => {
        const inicio = filtroData(req.query.inicio), fim = filtroData(req.query.fim);
        if (!inicio || !fim) return res.status(400).json({ error: "Informe a data inicial e a final (AAAA-MM-DD)." });
        if (fim < inicio) return res.status(400).json({ error: "A data final n\xE3o pode ser anterior \xE0 inicial." });
        if ((/* @__PURE__ */ new Date(`${fim}T00:00:00Z`) - /* @__PURE__ */ new Date(`${inicio}T00:00:00Z`)) / 864e5 > 366) return res.status(400).json({ error: "Escolha um per\xEDodo de at\xE9 um ano." });
        const so = parseInteiro(req.query.evento_id);
        try {
          const params = [fim, inicio];
          let filtro = "";
          if (so) {
            filtro = " AND e.id=?";
            params.push(so);
          }
          const eventos = await all(`SELECT e.id,e.titulo,e.tipo,e.local,e.data,e.data_fim,e.hora_inicio,e.hora_fim FROM eventos e
      WHERE CAST(e.data AS TEXT)<=? AND CAST(COALESCE(e.data_fim,e.data) AS TEXT)>=?${filtro} ORDER BY e.data ASC, e.id ASC`, params);
          const ids = eventos.map((e) => Number(e.id));
          const vendas = ids.length ? await all(`SELECT v.id,v.evento_id,v.total,v.desconto_valor,v.forma_pagamento,v.data_venda,
        CASE WHEN ${SQL_VENDA_VALIDA} THEN 0 ELSE 1 END AS cancelada
      FROM vendas v WHERE v.evento_id IN (${ids.map(() => "?").join(",")}) AND v.data_venda>=? AND v.data_venda<=?`, [...ids, inicio, fim]) : [];
          const itens = await itensDasVendas(vendas.filter((v) => !Number(v.cancelada)).map((v) => v.id));
          const partesPorVenda = await partesDasVendas(vendas);
          const avulsos = ids.length ? await all(`SELECT m.evento_id,m.tipo,m.quantidade,m.criado_em FROM movimentacao_estoque m
      WHERE m.venda_id IS NULL AND m.tipo IN ('BRINDE','DOACAO') AND m.evento_id IN (${ids.map(() => "?").join(",")})`, ids) : [];
          const avulsosNoPeriodo = avulsos.filter((m) => {
            const instante = instanteDe(m.criado_em);
            if (!instante) return false;
            const d = diaNaLoja(instante);
            return d >= inicio && d <= fim;
          });
          const c2 = (n) => Math.round(Number(n || 0) * 100) / 100;
          const produtosGeral = /* @__PURE__ */ new Map();
          const linhas = eventos.map((e) => {
            const minhas = vendas.filter((v) => Number(v.evento_id) === Number(e.id));
            const validas = minhas.filter((v) => !Number(v.cancelada));
            const produtos = /* @__PURE__ */ new Map();
            const pagamentos = /* @__PURE__ */ new Map();
            let pecas = 0;
            let brindes = 0;
            for (const v of validas) {
              for (const p of partesDe(v, partesPorVenda)) {
                const pg = pagamentos.get(p.forma) || { forma: p.forma, valor: 0 };
                pg.valor += p.valor;
                pagamentos.set(p.forma, pg);
              }
              for (const i of itens.get(Number(v.id)) || []) {
                if (i.tipo === "BRINDE") {
                  brindes += i.quantidade;
                  continue;
                }
                pecas += i.quantidade;
                for (const mapa of [produtos, produtosGeral]) {
                  const p = mapa.get(Number(i.produto_id)) || { produto_id: Number(i.produto_id), produto_nome: i.produto_nome, categoria: i.produto_categoria || "", quantidade: 0, valor: 0 };
                  p.quantidade += i.quantidade;
                  p.valor += i.quantidade * i.preco_unitario;
                  mapa.set(Number(i.produto_id), p);
                }
              }
            }
            const meus = avulsosNoPeriodo.filter((m) => Number(m.evento_id) === Number(e.id));
            const brindesAvulsos = meus.filter((m) => m.tipo === "BRINDE").reduce((t, m) => t + Math.abs(Number(m.quantidade)), 0);
            const doacoes = meus.filter((m) => m.tipo === "DOACAO").reduce((t, m) => t + Math.abs(Number(m.quantidade)), 0);
            const brindesEmVendas = brindes;
            brindes += brindesAvulsos;
            const faturamento = c2(validas.reduce((t, v) => t + Number(v.total), 0));
            return {
              id: Number(e.id),
              titulo: e.titulo,
              tipo: e.tipo || "outro",
              local: e.local || "",
              data: diaIso(e.data),
              data_fim: e.data_fim ? diaIso(e.data_fim) : null,
              hora_inicio: e.hora_inicio || null,
              hora_fim: e.hora_fim || null,
              vendas: validas.length,
              canceladas: minhas.length - validas.length,
              faturamento,
              pecas,
              brindes,
              brindes_em_vendas: brindesEmVendas,
              brindes_avulsos: brindesAvulsos,
              doacoes,
              descontos: c2(validas.reduce((t, v) => t + Number(v.desconto_valor || 0), 0)),
              ticket_medio: validas.length ? c2(faturamento / validas.length) : 0,
              produtos: [...produtos.values()].map((p) => ({ ...p, valor: c2(p.valor) })).sort((a, b) => b.quantidade - a.quantidade || b.valor - a.valor),
              por_pagamento: [...pagamentos.values()].map((p) => ({ ...p, valor: c2(p.valor) })).sort((a, b) => b.valor - a.valor)
            };
          });
          const loja = await get(`SELECT COUNT(*) AS vendas, COALESCE(SUM(v.total),0) AS faturamento FROM vendas v WHERE v.evento_id IS NULL AND v.data_venda>=? AND v.data_venda<=? AND ${SQL_VENDA_VALIDA}`, [inicio, fim]);
          const lojaPecas = await get(`SELECT COALESCE(SUM(i.quantidade),0) AS pecas FROM venda_item i JOIN vendas v ON v.id=i.venda_id WHERE i.tipo='VENDA' AND v.evento_id IS NULL AND v.data_venda>=? AND v.data_venda<=? AND ${SQL_VENDA_VALIDA}`, [inicio, fim]);
          const totalEventos = c2(linhas.reduce((t, l) => t + l.faturamento, 0));
          const vendasEventos = linhas.reduce((t, l) => t + l.vendas, 0);
          const lojaFaturamento = c2(loja?.faturamento);
          res.json({
            periodo: { inicio, fim },
            resumo: {
              eventos: linhas.length,
              eventos_com_vendas: linhas.filter((l) => l.vendas).length,
              faturamento: totalEventos,
              vendas: vendasEventos,
              pecas: linhas.reduce((t, l) => t + l.pecas, 0),
              brindes: linhas.reduce((t, l) => t + l.brindes, 0),
              doacoes: linhas.reduce((t, l) => t + l.doacoes, 0),
              ticket_medio: vendasEventos ? c2(totalEventos / vendasEventos) : 0,
              loja: { vendas: Number(loja?.vendas || 0), faturamento: lojaFaturamento, pecas: Number(lojaPecas?.pecas || 0) },
              participacao: totalEventos + lojaFaturamento > 0 ? Math.round(totalEventos / (totalEventos + lojaFaturamento) * 1e3) / 10 : 0
            },
            eventos: linhas,
            produtos: [...produtosGeral.values()].map((p) => ({ ...p, valor: c2(p.valor) })).sort((a, b) => b.quantidade - a.quantidade || b.valor - a.valor)
          });
        } catch (e) {
          errorResponse(res, e);
        }
      });
      app.use("/api", (req, res) => res.status(404).json({ error: "Rota n\xE3o encontrada." }));
      var ready = initialize();
      if (false) {
        ready.then(() => app.listen(PORT, "0.0.0.0", () => console.log(`Servidor ERP iniciado na porta ${PORT}.`))).catch((err) => {
          console.error("Falha ao inicializar o banco:", err);
          process.exit(1);
        });
        process.on("SIGINT", () => db.close(() => process.exit(0)));
      }
      module.exports = { app, db, ready, recorrencias: { somaMeses, dataNoMes, dataNoAno, ultimoDiaDoMes }, eventos: { eventoAoVivo, estadoDoEventoHoje } };
    }
  });

  // entrada.js
  var require_entrada = __commonJS({
    "entrada.js"(exports, module) {
      init_globais();
      var express = require_express();
      module.exports = { iniciar: () => require_server(), criarRes: express.criarRes };
    }
  });
  return require_entrada();
})();
