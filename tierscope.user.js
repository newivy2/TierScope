// ==UserScript==
// @name         TierScope - Chaturbate Viewers Visualizer
// @namespace    http://tampermonkey.net/
// @version      3.25.0
// @description  TierScope - Viewer visualizer with trend tracking, reports, and GIF export
// @author       newivy
// @match        https://chaturbate.com/*
// @match        https://*.chaturbate.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @run-at       document-end
// ==/UserScript==

// Generated from src/main.js. Edit src/ and run npm run build.
"use strict";

/*!
TierScope includes omggif 1.0.10 (MIT) by Dean McNamee.
Source: https://github.com/deanm/omggif
Bundled from the exact package and integrity recorded in package-lock.json.

(c) Dean McNamee <dean@gmail.com>, 2013.

https://github.com/deanm/omggif

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.

omggif is a JavaScript implementation of a GIF 89a encoder and decoder,
including animation and compression.  It does not rely on any specific
underlying system, so should run in the browser, Node, or Plask.
*/
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
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

  // node_modules/omggif/omggif.js
  var require_omggif = __commonJS({
    "node_modules/omggif/omggif.js"(exports) {
      "use strict";
      function GifWriter2(buf, width, height, gopts) {
        var p = 0;
        var gopts = gopts === void 0 ? {} : gopts;
        var loop_count = gopts.loop === void 0 ? null : gopts.loop;
        var global_palette = gopts.palette === void 0 ? null : gopts.palette;
        if (width <= 0 || height <= 0 || width > 65535 || height > 65535)
          throw new Error("Width/Height invalid.");
        function check_palette_and_num_colors(palette) {
          var num_colors = palette.length;
          if (num_colors < 2 || num_colors > 256 || num_colors & num_colors - 1) {
            throw new Error(
              "Invalid code/color length, must be power of 2 and 2 .. 256."
            );
          }
          return num_colors;
        }
        buf[p++] = 71;
        buf[p++] = 73;
        buf[p++] = 70;
        buf[p++] = 56;
        buf[p++] = 57;
        buf[p++] = 97;
        var gp_num_colors_pow2 = 0;
        var background = 0;
        if (global_palette !== null) {
          var gp_num_colors = check_palette_and_num_colors(global_palette);
          while (gp_num_colors >>= 1) ++gp_num_colors_pow2;
          gp_num_colors = 1 << gp_num_colors_pow2;
          --gp_num_colors_pow2;
          if (gopts.background !== void 0) {
            background = gopts.background;
            if (background >= gp_num_colors)
              throw new Error("Background index out of range.");
            if (background === 0)
              throw new Error("Background index explicitly passed as 0.");
          }
        }
        buf[p++] = width & 255;
        buf[p++] = width >> 8 & 255;
        buf[p++] = height & 255;
        buf[p++] = height >> 8 & 255;
        buf[p++] = (global_palette !== null ? 128 : 0) | // Global Color Table Flag.
        gp_num_colors_pow2;
        buf[p++] = background;
        buf[p++] = 0;
        if (global_palette !== null) {
          for (var i = 0, il = global_palette.length; i < il; ++i) {
            var rgb = global_palette[i];
            buf[p++] = rgb >> 16 & 255;
            buf[p++] = rgb >> 8 & 255;
            buf[p++] = rgb & 255;
          }
        }
        if (loop_count !== null) {
          if (loop_count < 0 || loop_count > 65535)
            throw new Error("Loop count invalid.");
          buf[p++] = 33;
          buf[p++] = 255;
          buf[p++] = 11;
          buf[p++] = 78;
          buf[p++] = 69;
          buf[p++] = 84;
          buf[p++] = 83;
          buf[p++] = 67;
          buf[p++] = 65;
          buf[p++] = 80;
          buf[p++] = 69;
          buf[p++] = 50;
          buf[p++] = 46;
          buf[p++] = 48;
          buf[p++] = 3;
          buf[p++] = 1;
          buf[p++] = loop_count & 255;
          buf[p++] = loop_count >> 8 & 255;
          buf[p++] = 0;
        }
        var ended = false;
        this.addFrame = function(x, y, w, h, indexed_pixels, opts) {
          if (ended === true) {
            --p;
            ended = false;
          }
          opts = opts === void 0 ? {} : opts;
          if (x < 0 || y < 0 || x > 65535 || y > 65535)
            throw new Error("x/y invalid.");
          if (w <= 0 || h <= 0 || w > 65535 || h > 65535)
            throw new Error("Width/Height invalid.");
          if (indexed_pixels.length < w * h)
            throw new Error("Not enough pixels for the frame size.");
          var using_local_palette = true;
          var palette = opts.palette;
          if (palette === void 0 || palette === null) {
            using_local_palette = false;
            palette = global_palette;
          }
          if (palette === void 0 || palette === null)
            throw new Error("Must supply either a local or global palette.");
          var num_colors = check_palette_and_num_colors(palette);
          var min_code_size = 0;
          while (num_colors >>= 1) ++min_code_size;
          num_colors = 1 << min_code_size;
          var delay = opts.delay === void 0 ? 0 : opts.delay;
          var disposal = opts.disposal === void 0 ? 0 : opts.disposal;
          if (disposal < 0 || disposal > 3)
            throw new Error("Disposal out of range.");
          var use_transparency = false;
          var transparent_index = 0;
          if (opts.transparent !== void 0 && opts.transparent !== null) {
            use_transparency = true;
            transparent_index = opts.transparent;
            if (transparent_index < 0 || transparent_index >= num_colors)
              throw new Error("Transparent color index.");
          }
          if (disposal !== 0 || use_transparency || delay !== 0) {
            buf[p++] = 33;
            buf[p++] = 249;
            buf[p++] = 4;
            buf[p++] = disposal << 2 | (use_transparency === true ? 1 : 0);
            buf[p++] = delay & 255;
            buf[p++] = delay >> 8 & 255;
            buf[p++] = transparent_index;
            buf[p++] = 0;
          }
          buf[p++] = 44;
          buf[p++] = x & 255;
          buf[p++] = x >> 8 & 255;
          buf[p++] = y & 255;
          buf[p++] = y >> 8 & 255;
          buf[p++] = w & 255;
          buf[p++] = w >> 8 & 255;
          buf[p++] = h & 255;
          buf[p++] = h >> 8 & 255;
          buf[p++] = using_local_palette === true ? 128 | min_code_size - 1 : 0;
          if (using_local_palette === true) {
            for (var i2 = 0, il2 = palette.length; i2 < il2; ++i2) {
              var rgb2 = palette[i2];
              buf[p++] = rgb2 >> 16 & 255;
              buf[p++] = rgb2 >> 8 & 255;
              buf[p++] = rgb2 & 255;
            }
          }
          p = GifWriterOutputLZWCodeStream(
            buf,
            p,
            min_code_size < 2 ? 2 : min_code_size,
            indexed_pixels
          );
          return p;
        };
        this.end = function() {
          if (ended === false) {
            buf[p++] = 59;
            ended = true;
          }
          return p;
        };
        this.getOutputBuffer = function() {
          return buf;
        };
        this.setOutputBuffer = function(v) {
          buf = v;
        };
        this.getOutputBufferPosition = function() {
          return p;
        };
        this.setOutputBufferPosition = function(v) {
          p = v;
        };
      }
      function GifWriterOutputLZWCodeStream(buf, p, min_code_size, index_stream) {
        buf[p++] = min_code_size;
        var cur_subblock = p++;
        var clear_code = 1 << min_code_size;
        var code_mask = clear_code - 1;
        var eoi_code = clear_code + 1;
        var next_code = eoi_code + 1;
        var cur_code_size = min_code_size + 1;
        var cur_shift = 0;
        var cur = 0;
        function emit_bytes_to_buffer(bit_block_size) {
          while (cur_shift >= bit_block_size) {
            buf[p++] = cur & 255;
            cur >>= 8;
            cur_shift -= 8;
            if (p === cur_subblock + 256) {
              buf[cur_subblock] = 255;
              cur_subblock = p++;
            }
          }
        }
        function emit_code(c) {
          cur |= c << cur_shift;
          cur_shift += cur_code_size;
          emit_bytes_to_buffer(8);
        }
        var ib_code = index_stream[0] & code_mask;
        var code_table = {};
        emit_code(clear_code);
        for (var i = 1, il = index_stream.length; i < il; ++i) {
          var k = index_stream[i] & code_mask;
          var cur_key = ib_code << 8 | k;
          var cur_code = code_table[cur_key];
          if (cur_code === void 0) {
            cur |= ib_code << cur_shift;
            cur_shift += cur_code_size;
            while (cur_shift >= 8) {
              buf[p++] = cur & 255;
              cur >>= 8;
              cur_shift -= 8;
              if (p === cur_subblock + 256) {
                buf[cur_subblock] = 255;
                cur_subblock = p++;
              }
            }
            if (next_code === 4096) {
              emit_code(clear_code);
              next_code = eoi_code + 1;
              cur_code_size = min_code_size + 1;
              code_table = {};
            } else {
              if (next_code >= 1 << cur_code_size) ++cur_code_size;
              code_table[cur_key] = next_code++;
            }
            ib_code = k;
          } else {
            ib_code = cur_code;
          }
        }
        emit_code(ib_code);
        emit_code(eoi_code);
        emit_bytes_to_buffer(1);
        if (cur_subblock + 1 === p) {
          buf[cur_subblock] = 0;
        } else {
          buf[cur_subblock] = p - cur_subblock - 1;
          buf[p++] = 0;
        }
        return p;
      }
      function GifReader(buf) {
        var p = 0;
        if (buf[p++] !== 71 || buf[p++] !== 73 || buf[p++] !== 70 || buf[p++] !== 56 || (buf[p++] + 1 & 253) !== 56 || buf[p++] !== 97) {
          throw new Error("Invalid GIF 87a/89a header.");
        }
        var width = buf[p++] | buf[p++] << 8;
        var height = buf[p++] | buf[p++] << 8;
        var pf0 = buf[p++];
        var global_palette_flag = pf0 >> 7;
        var num_global_colors_pow2 = pf0 & 7;
        var num_global_colors = 1 << num_global_colors_pow2 + 1;
        var background = buf[p++];
        buf[p++];
        var global_palette_offset = null;
        var global_palette_size = null;
        if (global_palette_flag) {
          global_palette_offset = p;
          global_palette_size = num_global_colors;
          p += num_global_colors * 3;
        }
        var no_eof = true;
        var frames = [];
        var delay = 0;
        var transparent_index = null;
        var disposal = 0;
        var loop_count = null;
        this.width = width;
        this.height = height;
        while (no_eof && p < buf.length) {
          switch (buf[p++]) {
            case 33:
              switch (buf[p++]) {
                case 255:
                  if (buf[p] !== 11 || // 21 FF already read, check block size.
                  // NETSCAPE2.0
                  buf[p + 1] == 78 && buf[p + 2] == 69 && buf[p + 3] == 84 && buf[p + 4] == 83 && buf[p + 5] == 67 && buf[p + 6] == 65 && buf[p + 7] == 80 && buf[p + 8] == 69 && buf[p + 9] == 50 && buf[p + 10] == 46 && buf[p + 11] == 48 && // Sub-block
                  buf[p + 12] == 3 && buf[p + 13] == 1 && buf[p + 16] == 0) {
                    p += 14;
                    loop_count = buf[p++] | buf[p++] << 8;
                    p++;
                  } else {
                    p += 12;
                    while (true) {
                      var block_size = buf[p++];
                      if (!(block_size >= 0)) throw Error("Invalid block size");
                      if (block_size === 0) break;
                      p += block_size;
                    }
                  }
                  break;
                case 249:
                  if (buf[p++] !== 4 || buf[p + 4] !== 0)
                    throw new Error("Invalid graphics extension block.");
                  var pf1 = buf[p++];
                  delay = buf[p++] | buf[p++] << 8;
                  transparent_index = buf[p++];
                  if ((pf1 & 1) === 0) transparent_index = null;
                  disposal = pf1 >> 2 & 7;
                  p++;
                  break;
                case 254:
                  while (true) {
                    var block_size = buf[p++];
                    if (!(block_size >= 0)) throw Error("Invalid block size");
                    if (block_size === 0) break;
                    p += block_size;
                  }
                  break;
                default:
                  throw new Error(
                    "Unknown graphic control label: 0x" + buf[p - 1].toString(16)
                  );
              }
              break;
            case 44:
              var x = buf[p++] | buf[p++] << 8;
              var y = buf[p++] | buf[p++] << 8;
              var w = buf[p++] | buf[p++] << 8;
              var h = buf[p++] | buf[p++] << 8;
              var pf2 = buf[p++];
              var local_palette_flag = pf2 >> 7;
              var interlace_flag = pf2 >> 6 & 1;
              var num_local_colors_pow2 = pf2 & 7;
              var num_local_colors = 1 << num_local_colors_pow2 + 1;
              var palette_offset = global_palette_offset;
              var palette_size = global_palette_size;
              var has_local_palette = false;
              if (local_palette_flag) {
                var has_local_palette = true;
                palette_offset = p;
                palette_size = num_local_colors;
                p += num_local_colors * 3;
              }
              var data_offset = p;
              p++;
              while (true) {
                var block_size = buf[p++];
                if (!(block_size >= 0)) throw Error("Invalid block size");
                if (block_size === 0) break;
                p += block_size;
              }
              frames.push({
                x,
                y,
                width: w,
                height: h,
                has_local_palette,
                palette_offset,
                palette_size,
                data_offset,
                data_length: p - data_offset,
                transparent_index,
                interlaced: !!interlace_flag,
                delay,
                disposal
              });
              break;
            case 59:
              no_eof = false;
              break;
            default:
              throw new Error("Unknown gif block: 0x" + buf[p - 1].toString(16));
              break;
          }
        }
        this.numFrames = function() {
          return frames.length;
        };
        this.loopCount = function() {
          return loop_count;
        };
        this.frameInfo = function(frame_num) {
          if (frame_num < 0 || frame_num >= frames.length)
            throw new Error("Frame index out of range.");
          return frames[frame_num];
        };
        this.decodeAndBlitFrameBGRA = function(frame_num, pixels) {
          var frame = this.frameInfo(frame_num);
          var num_pixels = frame.width * frame.height;
          var index_stream = new Uint8Array(num_pixels);
          GifReaderLZWOutputIndexStream(
            buf,
            frame.data_offset,
            index_stream,
            num_pixels
          );
          var palette_offset2 = frame.palette_offset;
          var trans = frame.transparent_index;
          if (trans === null) trans = 256;
          var framewidth = frame.width;
          var framestride = width - framewidth;
          var xleft = framewidth;
          var opbeg = (frame.y * width + frame.x) * 4;
          var opend = ((frame.y + frame.height) * width + frame.x) * 4;
          var op = opbeg;
          var scanstride = framestride * 4;
          if (frame.interlaced === true) {
            scanstride += width * 4 * 7;
          }
          var interlaceskip = 8;
          for (var i = 0, il = index_stream.length; i < il; ++i) {
            var index = index_stream[i];
            if (xleft === 0) {
              op += scanstride;
              xleft = framewidth;
              if (op >= opend) {
                scanstride = framestride * 4 + width * 4 * (interlaceskip - 1);
                op = opbeg + (framewidth + framestride) * (interlaceskip << 1);
                interlaceskip >>= 1;
              }
            }
            if (index === trans) {
              op += 4;
            } else {
              var r = buf[palette_offset2 + index * 3];
              var g = buf[palette_offset2 + index * 3 + 1];
              var b = buf[palette_offset2 + index * 3 + 2];
              pixels[op++] = b;
              pixels[op++] = g;
              pixels[op++] = r;
              pixels[op++] = 255;
            }
            --xleft;
          }
        };
        this.decodeAndBlitFrameRGBA = function(frame_num, pixels) {
          var frame = this.frameInfo(frame_num);
          var num_pixels = frame.width * frame.height;
          var index_stream = new Uint8Array(num_pixels);
          GifReaderLZWOutputIndexStream(
            buf,
            frame.data_offset,
            index_stream,
            num_pixels
          );
          var palette_offset2 = frame.palette_offset;
          var trans = frame.transparent_index;
          if (trans === null) trans = 256;
          var framewidth = frame.width;
          var framestride = width - framewidth;
          var xleft = framewidth;
          var opbeg = (frame.y * width + frame.x) * 4;
          var opend = ((frame.y + frame.height) * width + frame.x) * 4;
          var op = opbeg;
          var scanstride = framestride * 4;
          if (frame.interlaced === true) {
            scanstride += width * 4 * 7;
          }
          var interlaceskip = 8;
          for (var i = 0, il = index_stream.length; i < il; ++i) {
            var index = index_stream[i];
            if (xleft === 0) {
              op += scanstride;
              xleft = framewidth;
              if (op >= opend) {
                scanstride = framestride * 4 + width * 4 * (interlaceskip - 1);
                op = opbeg + (framewidth + framestride) * (interlaceskip << 1);
                interlaceskip >>= 1;
              }
            }
            if (index === trans) {
              op += 4;
            } else {
              var r = buf[palette_offset2 + index * 3];
              var g = buf[palette_offset2 + index * 3 + 1];
              var b = buf[palette_offset2 + index * 3 + 2];
              pixels[op++] = r;
              pixels[op++] = g;
              pixels[op++] = b;
              pixels[op++] = 255;
            }
            --xleft;
          }
        };
      }
      function GifReaderLZWOutputIndexStream(code_stream, p, output, output_length) {
        var min_code_size = code_stream[p++];
        var clear_code = 1 << min_code_size;
        var eoi_code = clear_code + 1;
        var next_code = eoi_code + 1;
        var cur_code_size = min_code_size + 1;
        var code_mask = (1 << cur_code_size) - 1;
        var cur_shift = 0;
        var cur = 0;
        var op = 0;
        var subblock_size = code_stream[p++];
        var code_table = new Int32Array(4096);
        var prev_code = null;
        while (true) {
          while (cur_shift < 16) {
            if (subblock_size === 0) break;
            cur |= code_stream[p++] << cur_shift;
            cur_shift += 8;
            if (subblock_size === 1) {
              subblock_size = code_stream[p++];
            } else {
              --subblock_size;
            }
          }
          if (cur_shift < cur_code_size)
            break;
          var code = cur & code_mask;
          cur >>= cur_code_size;
          cur_shift -= cur_code_size;
          if (code === clear_code) {
            next_code = eoi_code + 1;
            cur_code_size = min_code_size + 1;
            code_mask = (1 << cur_code_size) - 1;
            prev_code = null;
            continue;
          } else if (code === eoi_code) {
            break;
          }
          var chase_code = code < next_code ? code : prev_code;
          var chase_length = 0;
          var chase = chase_code;
          while (chase > clear_code) {
            chase = code_table[chase] >> 8;
            ++chase_length;
          }
          var k = chase;
          var op_end = op + chase_length + (chase_code !== code ? 1 : 0);
          if (op_end > output_length) {
            console.log("Warning, gif stream longer than expected.");
            return;
          }
          output[op++] = k;
          op += chase_length;
          var b = op;
          if (chase_code !== code)
            output[op++] = k;
          chase = chase_code;
          while (chase_length--) {
            chase = code_table[chase];
            output[--b] = chase & 255;
            chase >>= 8;
          }
          if (prev_code !== null && next_code < 4096) {
            code_table[next_code++] = prev_code << 8 | k;
            if (next_code >= code_mask + 1 && cur_code_size < 12) {
              ++cur_code_size;
              code_mask = code_mask << 1 | 1;
            }
          }
          prev_code = code;
        }
        if (op !== output_length) {
          console.log("Warning, gif stream shorter than expected.");
        }
        return output;
      }
      try {
        exports.GifWriter = GifWriter2;
        exports.GifReader = GifReader;
      } catch (e) {
      }
    }
  });

  // src/runtime.js
  var runtime = {};

  // src/record-validation.js
  function getStorageKey(model) {
    return runtime.STORAGE_KEY_PREFIX + model.toLowerCase();
  }
  function isStorageObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }
  function hasStorageField(data, field) {
    return Object.prototype.hasOwnProperty.call(data, field);
  }
  function isStorageNumber(value) {
    return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER;
  }
  function isStorageTimestamp(value) {
    return Number.isSafeInteger(value) && value >= 0 && value <= 864e13;
  }
  function makeStorageId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2) + "-" + Math.random().toString(36).slice(2);
  }

  // src/ath-retention.js
  var ATH_VISIT_PREFIX = "tierscope:ath-visit:v1:";
  var ATH_LEASE_PREFIX = "tierscope:ath-active:v1:";
  var ATH_RETENTION_MS = 90 * 864e5;
  var ATH_LEASE_MS = 5 * 6e4;
  function roomKey(room2) {
    if (typeof room2 !== "string" || !/^[a-z0-9_-]{1,100}$/i.test(room2) || room2.toLowerCase() === "unknown") throw new Error("Invalid ATH room.");
    return room2.toLowerCase();
  }
  function readAthVisit(room2) {
    const raw = GM_getValue(ATH_VISIT_PREFIX + roomKey(room2), void 0);
    if (raw === void 0) return null;
    const value = JSON.parse(raw);
    if (!value || value.schemaVersion !== 1 || !isStorageTimestamp(value.graceStartedAt) || !(value.lastVisitedAt === null || isStorageTimestamp(value.lastVisitedAt))) throw new Error("Unreadable ATH visit record.");
    return value;
  }
  function ensureAthGrace(room2, now = Date.now()) {
    const previous = readAthVisit(room2);
    if (previous) return previous;
    const value = { schemaVersion: 1, graceStartedAt: now, lastVisitedAt: null };
    const raw = JSON.stringify(value), key = ATH_VISIT_PREFIX + roomKey(room2);
    GM_setValue(key, raw);
    const stored = readAthVisit(room2);
    if (!stored) throw new Error("ATH grace period could not be saved.");
    return stored;
  }
  function noteAthVisit(room2, lease2, now = Date.now()) {
    room2 = roomKey(room2);
    const leaseKey = ATH_LEASE_PREFIX + room2 + ":" + lease2;
    const active = JSON.stringify({ schemaVersion: 1, lastSeenAt: now });
    GM_setValue(leaseKey, active);
    if (GM_getValue(leaseKey, void 0) !== active) throw new Error("ATH activity could not be saved.");
    const previous = ensureAthGrace(room2, now);
    const value = __spreadProps(__spreadValues({}, previous), { lastVisitedAt: Math.max(now, previous.lastVisitedAt || 0) });
    GM_setValue(ATH_VISIT_PREFIX + room2, JSON.stringify(value));
    const stored = readAthVisit(room2);
    if (!stored || stored.lastVisitedAt < value.lastVisitedAt) throw new Error("ATH visit could not be saved.");
  }
  function releaseAthLease(room2, lease2) {
    if (room2) GM_deleteValue(ATH_LEASE_PREFIX + roomKey(room2) + ":" + lease2);
  }
  function athActivity(room2, now = Date.now()) {
    const visit = readAthVisit(room2);
    if (!visit) throw new Error("ATH visit history is not initialized.");
    const prefix = ATH_LEASE_PREFIX + roomKey(room2) + ":";
    let latest = Math.max(visit.graceStartedAt, visit.lastVisitedAt || 0), active = false;
    for (const key of GM_listValues().filter((key2) => key2.startsWith(prefix))) {
      const raw = GM_getValue(key, void 0);
      if (raw === void 0) continue;
      const value = JSON.parse(raw);
      if (!value || value.schemaVersion !== 1 || !isStorageTimestamp(value.lastSeenAt)) throw new Error("Unreadable ATH activity record.");
      latest = Math.max(latest, value.lastSeenAt);
      if (now - value.lastSeenAt <= ATH_LEASE_MS) active = true;
    }
    return { latest, active };
  }

  // src/room-context.js
  var NON_ROOM_PATHS = /* @__PURE__ */ new Set([
    "b",
    "followed",
    "featured",
    "tags",
    "accounts",
    "login",
    "register",
    "supporter",
    "settings",
    "apps",
    "explore",
    "trending",
    "new",
    "female",
    "male",
    "couple",
    "trans",
    "hd",
    "north-american",
    "european",
    "asian",
    "south-american",
    "exhibitionist",
    "followed-cams",
    "female-cams",
    "trans-cams",
    "male-cams",
    "couple-cams",
    "unknown"
  ]);
  function roomFromUrl(url) {
    try {
      const path = new URL(url).pathname;
      const match = path.match(/^\/b\/([a-z0-9_-]{1,100})\/?$/i) || path.match(/^\/([a-z0-9_-]{1,100})\/cam\/?$/i) || path.match(/^\/([a-z0-9_-]{1,100})\/?$/i);
      return match && !NON_ROOM_PATHS.has(match[1].toLowerCase()) ? match[1] : null;
    } catch (error) {
      return null;
    }
  }

  // src/diagnostics.js
  function diagnostic(level, message, ...details) {
    try {
      console[level]("[TierScope " + runtime.TIERSCOPE_VERSION + "] " + message, ...details);
    } catch (error) {
    }
  }

  // src/ath-activity.js
  var room = null, lease = null, clock = null;
  function stopAthActivity() {
    if (clock !== null) clearInterval(clock);
    clock = null;
    try {
      releaseAthLease(room, lease);
    } catch (error) {
    }
    room = null;
  }
  function observeAthRoom() {
    stopAthActivity();
    const current = roomFromUrl(location.href);
    if (!current) return;
    room = current.toLowerCase();
    lease = makeStorageId();
    function heartbeat() {
      var _a;
      if (((_a = roomFromUrl(location.href)) == null ? void 0 : _a.toLowerCase()) !== room) {
        stopAthActivity();
        return;
      }
      try {
        noteAthVisit(room, lease);
      } catch (error) {
        diagnostic("warn", "ATH visit tracking unavailable: " + error.message);
      }
    }
    heartbeat();
    clock = setInterval(heartbeat, 6e4);
  }

  // src/acquisition-state.js
  var ACQUISITION_FIELDS = Object.freeze([
    "scanEpoch",
    "initGuard",
    "isScanning",
    "lastAcquisitionAttemptSource",
    "domHealthStatus",
    "domFallbackReadyAtByRoom",
    "requestPolicyCache",
    "requestPolicyUnsaved",
    "scanIntervalSeconds",
    "countdownSeconds",
    "lastScheduledIntervalSeconds",
    "nextScanAt",
    "countdownInterval",
    "trackingTimerInterval",
    "healthCheckInterval"
  ]);
  var acquisitionState;
  var acquisitionClockEffects;
  var acquisitionClockVersions = /* @__PURE__ */ new Map();
  function initializeAcquisitionState(target, effects) {
    acquisitionState = __spreadProps(__spreadValues(
      {},
      /** @type {AcquisitionState} */
      Object.fromEntries(ACQUISITION_FIELDS.map((key) => [key, target[key]]))
    ), {
      domHealthStatus: __spreadValues({}, target.domHealthStatus),
      requestPolicyCache: __spreadValues({}, target.requestPolicyCache),
      domFallbackReadyAtByRoom: new Map(target.domFallbackReadyAtByRoom)
    });
    acquisitionClockEffects = effects;
    acquisitionClockVersions.clear();
    const fallbackView = Object.freeze({
      get: (room2) => acquisitionState.domFallbackReadyAtByRoom.get(room2),
      has: (room2) => acquisitionState.domFallbackReadyAtByRoom.has(room2),
      get size() {
        return acquisitionState.domFallbackReadyAtByRoom.size;
      },
      [Symbol.iterator]: () => acquisitionState.domFallbackReadyAtByRoom[Symbol.iterator]()
    });
    for (const key of ACQUISITION_FIELDS) Object.defineProperty(target, key, {
      enumerable: true,
      configurable: false,
      get: () => key === "domFallbackReadyAtByRoom" ? fallbackView : key === "domHealthStatus" || key === "requestPolicyCache" ? Object.freeze(__spreadValues({}, acquisitionState[key])) : acquisitionState[key]
    });
  }
  function invalidateAcquisition() {
    acquisitionState.scanEpoch++;
    acquisitionState.isScanning = false;
  }
  function beginAcquisitionGeneration() {
    acquisitionState.initGuard++;
    invalidateAcquisition();
    return acquisitionState.initGuard;
  }
  function beginAcquisition(url, room2, policy, now, stopped) {
    if (acquisitionState.isScanning || stopped || policy.blocked || policy.until > now) return null;
    acquisitionState.isScanning = true;
    return Object.freeze({ epoch: ++acquisitionState.scanEpoch, generation: acquisitionState.initGuard, url, room: room2, policyRevision: policy.revision });
  }
  function acquisitionContextIsCurrent(context, url) {
    return context.epoch === acquisitionState.scanEpoch && context.generation === acquisitionState.initGuard && context.url === url;
  }
  function finishAcquisition(context, url) {
    if (!acquisitionContextIsCurrent(context, url)) return false;
    acquisitionState.isScanning = false;
    return true;
  }
  function noteAcquisitionSource(source) {
    acquisitionState.lastAcquisitionAttemptSource = source;
  }
  function clearDOMFailures() {
    acquisitionState.domHealthStatus.consecutiveFailures = 0;
  }
  function noteDOMHealth(now, hasUserList, hasNames) {
    const health = acquisitionState.domHealthStatus;
    health.isHealthy = hasUserList && hasNames;
    health.lastCheck = now;
    health.userListTabFound = hasUserList;
    if (!health.isHealthy) health.consecutiveFailures++;
  }
  function deferDOMFallback(room2, readyAt) {
    const key = room2.toLowerCase();
    acquisitionState.domFallbackReadyAtByRoom.set(key, Math.max(acquisitionState.domFallbackReadyAtByRoom.get(key) || 0, readyAt));
  }
  function selectScanInterval(seconds) {
    if (Number.isFinite(seconds)) acquisitionState.scanIntervalSeconds = Math.max(30, Math.min(300, seconds));
  }
  function restoreScheduledInterval(seconds) {
    acquisitionState.lastScheduledIntervalSeconds = seconds;
  }
  function scheduleNextAcquisition(seconds, now, restrictedUntil, stopped) {
    acquisitionState.lastScheduledIntervalSeconds = seconds;
    acquisitionState.countdownSeconds = seconds;
    acquisitionState.nextScanAt = stopped ? 0 : Math.max(now + seconds * 1e3, restrictedUntil);
  }
  function schedulePresenceAcquisition(now, restrictedUntil) {
    acquisitionState.nextScanAt = Math.max(now, restrictedUntil);
  }
  function clearAcquisitionDeadline() {
    acquisitionState.nextScanAt = 0;
  }
  function resetAcquisitionForRoom() {
    beginAcquisitionGeneration();
    clearAcquisitionDeadline();
    acquisitionState.countdownSeconds = acquisitionState.scanIntervalSeconds;
    noteAcquisitionSource("API");
    clearDOMFailures();
    stopAcquisitionClock("healthCheckInterval");
  }
  function refreshAcquisitionCountdown(now, restrictedUntil, automatic) {
    if (!automatic) return;
    acquisitionState.nextScanAt = Math.max(acquisitionState.nextScanAt, restrictedUntil);
    if (!acquisitionState.isScanning && acquisitionState.nextScanAt) {
      acquisitionState.countdownSeconds = Math.max(0, Math.ceil((acquisitionState.nextScanAt - now) / 1e3));
    }
  }
  function stopAcquisitionClock(name) {
    acquisitionClockVersions.set(name, (acquisitionClockVersions.get(name) || 0) + 1);
    const handle = acquisitionState[name];
    acquisitionState[name] = null;
    if (handle !== null) acquisitionClockEffects.stop(handle);
  }
  function startAcquisitionClock(name, tick, delay) {
    stopAcquisitionClock(name);
    const version = acquisitionClockVersions.get(name);
    acquisitionState[name] = acquisitionClockEffects.start(() => {
      if (acquisitionClockVersions.get(name) === version) tick();
    }, delay);
  }
  function emptyRequestPolicy() {
    return { until: 0, failures: 0, blocked: 0, status: 0, revision: "" };
  }
  function reconcileRequestPolicy(value) {
    if (value === null) {
      if (!acquisitionState.requestPolicyUnsaved) acquisitionState.requestPolicyCache = emptyRequestPolicy();
      return;
    }
    const local = acquisitionState.requestPolicyCache;
    acquisitionState.requestPolicyCache = acquisitionState.requestPolicyUnsaved ? __spreadProps(__spreadValues({}, value), {
      until: Math.max(value.until, local.until),
      serverUntil: Math.max(value.serverUntil || 0, local.serverUntil || 0),
      failures: Math.max(value.failures, local.failures),
      blocked: local.blocked || value.blocked,
      status: local.until >= value.until ? local.status : value.status,
      revision: local.revision
    }) : __spreadValues({}, value);
  }
  function stageRequestPolicy(policy) {
    acquisitionState.requestPolicyCache = __spreadValues({}, policy);
    acquisitionState.requestPolicyUnsaved = true;
  }
  function confirmRequestPolicySaved(revision) {
    if (acquisitionState.requestPolicyCache.revision === revision) acquisitionState.requestPolicyUnsaved = false;
  }
  function clearOwnedRequestFailures(revision) {
    const current = acquisitionState.requestPolicyCache;
    if (current.revision !== revision || current.blocked || !current.failures) return false;
    acquisitionState.requestPolicyCache = emptyRequestPolicy();
    acquisitionState.requestPolicyUnsaved = false;
    return true;
  }

  // src/highs-store.js
  function allTimeRoom(room2) {
    return typeof room2 === "string" && /^[a-z0-9_-]{1,100}$/i.test(room2) && room2.toLowerCase() !== "unknown" ? room2.toLowerCase() : null;
  }
  function emptyAllTimeHighs() {
    var highs = {};
    runtime.ALL_TIME_SERIES.forEach(function(key) {
      highs[key] = { value: 0, time: null, source: null };
    });
    return highs;
  }
  function mergeAllTimeHighs(target, incoming) {
    var changed = 0;
    runtime.ALL_TIME_SERIES.forEach(function(key) {
      var old = target[key], next = incoming[key];
      if (!next || !next.source) return;
      if (!old.source || next.value > old.value || next.value === old.value && next.time !== null && (old.time === null || next.time < old.time)) {
        target[key] = { value: next.value, time: next.time, source: next.source };
        changed++;
      }
    });
    return changed;
  }
  function validateAllTimeRecord(data, room2) {
    if (!isStorageObject(data) || data.schemaVersion !== 1 || data.room !== room2 || typeof data.epoch !== "string" || !isStorageObject(data.highs)) throw new Error("Unsupported all-time record");
    runtime.ALL_TIME_SERIES.forEach(function(key) {
      var high = data.highs[key];
      if (!isStorageObject(high) || !Number.isSafeInteger(high.value) || high.value < 0 || !(high.time === null || isStorageTimestamp(high.time)) || [null, "live", "saved", "file"].indexOf(high.source) === -1 || high.source === null && (high.value !== 0 || high.time !== null)) throw new Error("Invalid all-time high");
    });
  }
  function readAllTimeHighs(room2) {
    room2 = allTimeRoom(room2);
    var previous = runtime.allTimeCache.get(room2);
    var state = { room: room2, epoch: "initial", highs: emptyAllTimeHighs(), keys: [], skipped: 0, error: "", pending: false };
    if (!room2) return state;
    try {
      state.epoch = GM_getValue(runtime.ALL_TIME_EPOCH_PREFIX + room2, "initial");
      if (typeof state.epoch !== "string") throw new Error("Invalid all-time records generation");
      var prefix = runtime.ALL_TIME_PREFIX + room2 + ":";
      GM_listValues().filter(function(key) {
        return key.indexOf(prefix) === 0;
      }).forEach(function(key) {
        try {
          var raw = GM_getValue(key, void 0);
          if (raw === void 0) return;
          var data = JSON.parse(raw);
          validateAllTimeRecord(data, room2);
          if (data.epoch !== state.epoch) return;
          mergeAllTimeHighs(state.highs, data.highs);
          state.keys.push(key);
        } catch (error) {
          state.skipped++;
        }
      });
      if (previous && previous.pending && previous.epoch === state.epoch) {
        mergeAllTimeHighs(state.highs, previous.highs);
        state.pending = true;
      }
    } catch (error) {
      if (previous) {
        state = Object.assign({}, previous, { highs: emptyAllTimeHighs() });
        mergeAllTimeHighs(state.highs, previous.highs);
      }
      state.error = "All-time records could not be read. Showing locally available records.";
    }
    runtime.allTimeCache.set(room2, state);
    return state;
  }
  function storeAllTimeHighs(room2, incoming) {
    var state = readAllTimeHighs(room2);
    if (!state.room) return { state, changed: 0, saved: false };
    try {
      validateAllTimeRecord({ schemaVersion: 1, room: state.room, epoch: state.epoch, highs: incoming }, state.room);
    } catch (error) {
      state.error = "All-time highs were not updated: invalid record values.";
      return { state, changed: 0, saved: false };
    }
    var changed = mergeAllTimeHighs(state.highs, incoming);
    if (!changed && !state.pending && state.keys.length < 2) return { state, changed: 0, saved: !state.error };
    state.pending = true;
    try {
      if (state.error) throw new Error(state.error);
      var data = { schemaVersion: 1, room: state.room, epoch: state.epoch, highs: state.highs };
      validateAllTimeRecord(data, state.room);
      var key = runtime.ALL_TIME_PREFIX + state.room + ":" + state.epoch + ":" + makeStorageId();
      try {
        ensureAthGrace(state.room);
      } catch (error) {
      }
      var raw = JSON.stringify(data);
      GM_setValue(key, raw);
      if (GM_getValue(key, void 0) !== raw) throw new Error("ATH snapshot could not be verified.");
      if (GM_getValue(runtime.ALL_TIME_EPOCH_PREFIX + state.room, "initial") !== state.epoch) {
        return { state: readAllTimeHighs(state.room), changed: 0, saved: false };
      }
      state.pending = false;
      state.keys.forEach(function(old) {
        try {
          GM_deleteValue(old);
        } catch (error) {
        }
      });
      state.keys = [key];
    } catch (error) {
      state.error = "All-time highs are local only: saving is unavailable. Keep this tab open to retry.";
    }
    return { state: state.pending ? state : readAllTimeHighs(state.room), changed, saved: !state.pending };
  }
  function sessionAllTimeHighs(data, source) {
    var highs = emptyAllTimeHighs();
    runtime.STORAGE_HISTORY_SERIES.forEach(function(key) {
      var high = data.sessionHighs[key];
      highs[key] = { value: high.value, time: high.time, source };
    });
    highs.roomTotal = { value: data.roomTotalHigh, time: data.roomTotalHighTime, source };
    data.history.timestamps.forEach(function(time, i) {
      var total = data.history.total[i] + data.history.anonymous[i];
      if (total > highs.roomTotal.value || total === highs.roomTotal.value && highs.roomTotal.time === null) {
        highs.roomTotal = { value: total, time, source };
      }
    });
    return highs;
  }
  function retireInactiveAllTimeRecord(candidate, guard) {
    const state = readAllTimeHighs(candidate.room);
    if (state.error || state.skipped || state.pending || state.epoch !== candidate.epoch || state.keys.length !== candidate.records.length || candidate.records.some((record) => !state.keys.includes(record.key) || GM_getValue(record.key, void 0) !== record.raw) || !guard()) return "changed";
    const epochKey = runtime.ALL_TIME_EPOCH_PREFIX + state.room, epoch = makeStorageId();
    const key = runtime.ALL_TIME_PREFIX + state.room + ":" + epoch + ":" + makeStorageId();
    const raw = JSON.stringify({ schemaVersion: 1, room: state.room, epoch, highs: state.highs });
    GM_setValue(key, raw);
    if (GM_getValue(key, void 0) !== raw) throw new Error("ATH safety copy could not be verified.");
    if (!guard() || GM_getValue(epochKey, "initial") !== candidate.epoch) {
      GM_deleteValue(key);
      return "changed";
    }
    if (candidate.records.some((record) => GM_getValue(record.key, void 0) !== record.raw) || readAllTimeHighs(state.room).keys.some((other) => !candidate.records.some((record) => record.key === other))) {
      GM_deleteValue(key);
      return "changed";
    }
    GM_setValue(epochKey, epoch);
    if (GM_getValue(epochKey, "initial") !== epoch) throw new Error("ATH clear could not be verified.");
    runtime.allTimeCache.delete(state.room);
    const preserveConcurrent = () => {
      const prefix = runtime.ALL_TIME_PREFIX + state.room + ":";
      const highs = emptyAllTimeHighs();
      let changed = false;
      for (const other of GM_listValues().filter((other2) => other2.startsWith(prefix) && other2 !== key)) {
        const value = GM_getValue(other, void 0);
        if (value === void 0) continue;
        const data = JSON.parse(value);
        validateAllTimeRecord(data, state.room);
        if (data.epoch !== candidate.epoch || candidate.records.some((record) => record.key === other && record.raw === value)) continue;
        mergeAllTimeHighs(highs, data.highs);
        changed = true;
      }
      if (changed && GM_getValue(epochKey, "initial") === epoch) {
        const result = storeAllTimeHighs(state.room, highs);
        if (!result.saved) throw new Error("Concurrent ATH records could not be preserved.");
      }
      return changed;
    };
    const unchanged = () => !preserveConcurrent() && guard() && GM_getValue(epochKey, "initial") === epoch && GM_getValue(key, void 0) === raw && !GM_listValues().some((other) => other !== key && other.startsWith(runtime.ALL_TIME_PREFIX + state.room + ":" + epoch + ":"));
    if (!unchanged()) return "changed";
    for (const record of candidate.records) {
      if (!unchanged()) return "changed";
      if (GM_getValue(record.key, void 0) !== record.raw) return "changed";
      GM_deleteValue(record.key);
      if (GM_getValue(record.key, void 0) !== void 0) throw new Error("An old ATH snapshot could not be removed.");
    }
    if (!unchanged()) return "changed";
    GM_deleteValue(key);
    if (GM_getValue(key, void 0) !== void 0) throw new Error("ATH clear could not be completed.");
    if (preserveConcurrent() || !guard()) {
      if (GM_getValue(epochKey, "initial") === epoch) {
        const result = storeAllTimeHighs(state.room, state.highs);
        if (!result.saved) throw new Error("ATH records could not be retained after a concurrent visit.");
      }
      return "changed";
    }
    runtime.allTimeCache.delete(state.room);
    return "cleared";
  }

  // src/ath-maintenance.js
  function initializeAthGrace(now = Date.now()) {
    const rooms = new Set(GM_listValues().filter((key) => key.startsWith(runtime.ALL_TIME_PREFIX)).map((key) => allTimeRoom(key.slice(runtime.ALL_TIME_PREFIX.length).split(":")[0])).filter((room2) => room2 !== null));
    let skipped = 0;
    for (const room2 of rooms) {
      try {
        ensureAthGrace(room2, now);
      } catch (error) {
        skipped++;
      }
    }
    return skipped;
  }
  function inactive(room2, cutoff, now) {
    var _a;
    if (((_a = roomFromUrl(location.href)) == null ? void 0 : _a.toLowerCase()) === room2) return false;
    const activity = athActivity(room2, now);
    return !activity.active && activity.latest < cutoff;
  }
  function prepareAthCleanup(now = Date.now()) {
    initializeAthGrace(now);
    const rooms = new Set(GM_listValues().filter((key) => key.startsWith(runtime.ALL_TIME_PREFIX)).map((key) => allTimeRoom(key.slice(runtime.ALL_TIME_PREFIX.length).split(":")[0])).filter((room2) => room2 !== null));
    const cutoff = now - ATH_RETENTION_MS, candidates = [];
    let skipped = 0;
    for (const room2 of rooms) {
      try {
        if (!inactive(room2, cutoff, now)) continue;
        const state = readAllTimeHighs(room2);
        if (state.error || state.skipped || state.pending) {
          skipped++;
          continue;
        }
        if (state.keys.length) candidates.push({
          room: room2,
          epoch: state.epoch,
          records: state.keys.map((key) => ({ key, raw: GM_getValue(key, void 0) }))
        });
      } catch (error) {
        skipped++;
      }
    }
    return { cutoff, candidates, skipped };
  }
  function applyAthCleanup(plan) {
    let cleared = 0, changed = 0, failed = 0;
    for (const candidate of plan.candidates) {
      try {
        const guard = () => inactive(candidate.room, plan.cutoff, Date.now());
        if (!guard()) {
          changed++;
          continue;
        }
        const result = retireInactiveAllTimeRecord(candidate, guard);
        if (result === "cleared") cleared++;
        else if (result === "changed") changed++;
        else failed++;
      } catch (error) {
        failed++;
      }
    }
    return { cleared, changed, failed };
  }

  // src/high-feedback.js
  function setAllTimeActionStatus(message, replayLabel) {
    var status = document.getElementById("all-time-action-status");
    if (status) status.textContent = message;
    var button = document.getElementById("btn-playback-add-all-time");
    if (button) {
      button.textContent = replayLabel || "Add to all-time highs";
      button.title = message || "Add this file's highs to the room named beside this button";
      button.setAttribute("aria-label", replayLabel ? replayLabel + ". " + message : "Add to all-time highs");
    }
  }

  // src/format.js
  function compactNumber(value) {
    return value >= 1e6 ? (value / 1e6).toFixed(1).replace(/\.0$/, "") + "m" : value >= 1e4 ? (value / 1e3).toFixed(1).replace(/\.0$/, "") + "k" : String(value);
  }

  // src/live-session.js
  var LIVE_SESSION_FIELDS = Object.freeze(["users", "roomTotal", "previousUserCount", "previousRoomTotal", "previousCounts", "hasTrendBaseline", "lastAcceptedAcquisition", "restoredDisplayFrame", "history", "pendingHistoryGap", "roomTotalHigh", "roomTotalHighTime", "tierHighTimes", "withTokensHighTime", "totalHighTime", "anonHighTime", "femaleTransHighTime", "sessionStartedAt", "sessionStartEstimated", "sessionHighs", "newHighTiers", "trackingStartTime", "isPaused", "isStopped", "stoppedAt", "stopReason", "broadcasterAbsence", "absencePausedAt", "absenceOverrideActive", "pausedElapsedTime", "isAutoRefreshOn"]);
  var liveSessionState;
  var sessionConfig;
  var pendingSample = null;
  var sessionRevision = 0;
  function initializeLiveSession(target) {
    liveSessionState = {
      users: target.users,
      roomTotal: target.roomTotal,
      previousUserCount: target.previousUserCount,
      previousRoomTotal: target.previousRoomTotal,
      previousCounts: target.previousCounts,
      hasTrendBaseline: target.hasTrendBaseline,
      lastAcceptedAcquisition: target.lastAcceptedAcquisition,
      restoredDisplayFrame: target.restoredDisplayFrame,
      history: target.history,
      pendingHistoryGap: target.pendingHistoryGap,
      roomTotalHigh: target.roomTotalHigh,
      roomTotalHighTime: target.roomTotalHighTime,
      tierHighTimes: target.tierHighTimes,
      withTokensHighTime: target.withTokensHighTime,
      totalHighTime: target.totalHighTime,
      anonHighTime: target.anonHighTime,
      femaleTransHighTime: target.femaleTransHighTime,
      sessionStartedAt: target.sessionStartedAt,
      sessionStartEstimated: target.sessionStartEstimated,
      sessionHighs: target.sessionHighs,
      newHighTiers: target.newHighTiers,
      trackingStartTime: target.trackingStartTime,
      isPaused: target.isPaused,
      isStopped: target.isStopped,
      stoppedAt: target.stoppedAt,
      stopReason: target.stopReason,
      broadcasterAbsence: target.broadcasterAbsence,
      absencePausedAt: target.absencePausedAt,
      absenceOverrideActive: target.absenceOverrideActive,
      pausedElapsedTime: target.pausedElapsedTime,
      isAutoRefreshOn: target.isAutoRefreshOn
    };
    sessionConfig = { series: target.STORAGE_HISTORY_SERIES.slice(), tiers: (
      /** @type {import('./session-types').Tier[]} */
      Object.keys(target.TIERS)
    ), maxHistory: target.MAX_HISTORY_LENGTH };
    for (const key of LIVE_SESSION_FIELDS) {
      Object.defineProperty(target, key, { enumerable: true, configurable: false, get: () => liveSessionState[key] });
    }
  }
  function invalidateSample() {
    if (pendingSample) liveSessionState = pendingSample.before;
    pendingSample = null;
    sessionRevision++;
  }
  function emptyCounts() {
    return (
      /** @type {Counts} */
      Object.fromEntries(sessionConfig.series.map((key) => [key, 0]))
    );
  }
  function copyHistory(history) {
    return (
      /** @type {History} */
      Object.fromEntries(Object.entries(history).map(([key, values]) => [key, values.slice()]))
    );
  }
  function copyHighs(highs) {
    return Object.fromEntries(Object.entries(highs).map(([key, high]) => [key, __spreadValues({}, high)]));
  }
  function readSessionHigh(key, current = 0) {
    let high = liveSessionState.sessionHighs[key];
    if (!high) {
      const values = liveSessionState.history[key] || [];
      const value = Math.max(0, ...values);
      high = { value, time: value > 0 ? liveSessionState.history.timestamps[values.indexOf(value)] : null };
    }
    return { value: Math.max(high.value, current || 0), time: high.time };
  }
  function synchronizeSessionHighTimes() {
    const state = liveSessionState;
    state.tierHighTimes = Object.fromEntries(sessionConfig.tiers.map((key) => [key, readSessionHigh(key).time]));
    state.withTokensHighTime = readSessionHigh("withTokens").time;
    state.totalHighTime = readSessionHigh("total").time;
    state.anonHighTime = readSessionHigh("anonymous").time;
    state.femaleTransHighTime = readSessionHigh("female-trans").time;
  }
  function sessionAnonymousCount() {
    const state = liveSessionState;
    if (state.lastAcceptedAcquisition && state.lastAcceptedAcquisition.source === "API") return state.lastAcceptedAcquisition.api.anonymousCount;
    return Math.max(0, state.roomTotal - state.users.size);
  }
  function sessionCounts() {
    const counts = emptyCounts();
    for (const user of liveSessionState.users.values()) {
      if (counts[user.tier] !== void 0) counts[user.tier]++;
      if (user.gender === "female" || user.gender === "trans") counts["female-trans"]++;
    }
    counts.total = liveSessionState.users.size;
    counts.withTokens = sessionConfig.tiers.filter((key) => key !== "gray" && key !== "female-trans").reduce((sum, key) => sum + counts[key], 0);
    counts.anonymous = sessionAnonymousCount();
    return counts;
  }
  function noteSessionRoomHigh(value, now) {
    if (value > liveSessionState.roomTotalHigh) {
      liveSessionState.roomTotalHigh = value;
      liveSessionState.roomTotalHighTime = now;
    }
  }
  function appendCurrentSessionSample(now, policy) {
    const state = liveSessionState, counts = sessionCounts();
    noteSessionRoomHigh(Math.max(state.roomTotal, counts.total + counts.anonymous), now);
    if (state.sessionStartedAt === null) state.sessionStartedAt = now;
    for (const key of sessionConfig.series) {
      const previous = readSessionHigh(key), value = counts[key];
      if (value > previous.value) state.sessionHighs[key] = { value, time: now };
      else if (!state.sessionHighs[key]) state.sessionHighs[key] = previous;
      if (value > 0 && value >= state.sessionHighs[key].value) state.newHighTiers[key] = true;
      else delete state.newHighTiers[key];
    }
    synchronizeSessionHighTimes();
    if (!state.history.breaks || state.history.breaks.length !== state.history.timestamps.length) state.history.breaks = policy.breaks.slice();
    const lastTime = state.history.timestamps.length ? state.history.timestamps.at(-1) : null;
    state.history.breaks.push(lastTime !== null && (state.pendingHistoryGap || now - lastTime > Math.max(policy.intervalSeconds, policy.lastIntervalSeconds) * 2e3 + policy.timeoutMs));
    state.pendingHistoryGap = false;
    state.history.timestamps.push(now);
    for (const key of sessionConfig.series) state.history[key].push(counts[key]);
    if (state.history.timestamps.length > sessionConfig.maxHistory) {
      state.history.timestamps.shift();
      state.history.breaks.shift();
      for (const key of sessionConfig.series) state.history[key].shift();
    }
    return counts;
  }
  function beginAcceptedSample(snapshot, room2, now, policy) {
    if (pendingSample) throw new Error("A sample is already pending.");
    if (liveSessionState.isStopped) throw new Error("The session is stopped.");
    const state = liveSessionState;
    const before = __spreadProps(__spreadValues({}, state), {
      history: copyHistory(state.history),
      sessionHighs: copyHighs(state.sessionHighs),
      tierHighTimes: __spreadValues({}, state.tierHighTimes),
      newHighTiers: __spreadValues({}, state.newHighTiers)
    });
    const receipt = { before, revision: sessionRevision, counts: null, diagnostics: null };
    pendingSample = receipt;
    try {
      state.restoredDisplayFrame = null;
      state.users = new Map(snapshot.users.map((user) => [user.username, user]));
      state.roomTotal = snapshot.roomTotal;
      state.lastAcceptedAcquisition = { source: snapshot.source, timestamp: snapshot.timestamp, api: null };
      if (snapshot.source === "API") {
        const owners = snapshot.users.filter((user) => user.isOwner), unknownClasses = snapshot.diagnostics.unknownClasses, unknownGenders = snapshot.diagnostics.unknownGenders;
        const tierSum = snapshot.users.filter((user) => user.tier !== null).length;
        state.lastAcceptedAcquisition.api = { anonymousCount: snapshot.anonymousCount, registeredCount: snapshot.registeredCount, totalUsers: snapshot.totalUsers, ownerCount: owners.length };
        receipt.diagnostics = {
          room: room2,
          anonymousCount: snapshot.anonymousCount,
          registeredCount: snapshot.registeredCount,
          totalUsers: snapshot.totalUsers,
          ownerCount: owners.length,
          unknownClasses: Object.values(unknownClasses).reduce((a, b) => a + b, 0),
          unknownGenders: Object.values(unknownGenders).reduce((a, b) => a + b, 0),
          unknownClassCodes: unknownClasses,
          unknownGenderCodes: unknownGenders,
          viewerTierSum: tierSum,
          registeredMinusTierSum: state.users.size - tierSum,
          viewerTierGapExplanation: "Owner and unknown-class records count toward Registered, outside the seven viewer tiers",
          timestamp: new Date(snapshot.timestamp).toISOString()
        };
      }
      state.previousUserCount = state.users.size;
      state.previousRoomTotal = state.roomTotal;
      receipt.counts = appendCurrentSessionSample(now, policy);
      state.hasTrendBaseline = true;
      return receipt;
    } catch (error) {
      abortAcceptedSample(receipt);
      throw error;
    }
  }
  function commitAcceptedSample(receipt) {
    if (pendingSample !== receipt || receipt.revision !== sessionRevision) return false;
    liveSessionState.previousCounts = receipt.counts;
    pendingSample = null;
    return true;
  }
  function abortAcceptedSample(receipt) {
    if (pendingSample !== receipt || receipt.revision !== sessionRevision) return false;
    liveSessionState = receipt.before;
    pendingSample = null;
    return true;
  }
  function markSessionGap() {
    liveSessionState.pendingHistoryGap = true;
  }
  function clearRestoredSessionFrame() {
    liveSessionState.restoredDisplayFrame = null;
  }
  function prepareSessionHighsForSave() {
    for (const key of sessionConfig.series) if (!liveSessionState.sessionHighs[key]) liveSessionState.sessionHighs[key] = readSessionHigh(key);
  }
  function restoreLiveSession(data, frame) {
    invalidateSample();
    const state = liveSessionState;
    state.users = /* @__PURE__ */ new Map();
    state.roomTotal = 0;
    state.previousUserCount = 0;
    state.previousRoomTotal = 0;
    state.lastAcceptedAcquisition = null;
    state.newHighTiers = {};
    state.pendingHistoryGap = true;
    for (const key of [
      "roomTotalHigh",
      "roomTotalHighTime",
      "trackingStartTime",
      "sessionStartedAt",
      "sessionStartEstimated",
      "isPaused",
      "isStopped",
      "stoppedAt",
      "stopReason",
      "absencePausedAt",
      "absenceOverrideActive",
      "pausedElapsedTime",
      "hasTrendBaseline"
    ]) state[key] = data[key];
    state.history = copyHistory(data.history);
    state.sessionHighs = copyHighs(data.sessionHighs);
    state.previousCounts = __spreadValues({}, data.previousCounts);
    state.broadcasterAbsence = __spreadValues({}, data.broadcasterAbsence);
    synchronizeSessionHighTimes();
    state.restoredDisplayFrame = frame;
    if (frame) {
      frame.isRestored = true;
      frame.playbackNewHighTiers = {};
      for (const key of sessionConfig.series) {
        const value = state.history[key].at(-1);
        if (value > 0 && value >= readSessionHigh(key).value) frame.playbackNewHighTiers[key] = true;
      }
      frame.roomTotalHigh = Math.max(state.roomTotalHigh, frame.roomTotalHigh);
    }
  }
  function configureSessionTracking(loaded, isRoom) {
    liveSessionState.isAutoRefreshOn = loaded ? !liveSessionState.isStopped && (!liveSessionState.isPaused || liveSessionState.absencePausedAt !== null) : isRoom;
  }
  function resetLiveSession(mode) {
    invalidateSample();
    const state = liveSessionState;
    if (mode === "start") state.isAutoRefreshOn = true;
    state.isStopped = false;
    state.stoppedAt = null;
    state.stopReason = null;
    state.broadcasterAbsence = { since: null, missing: 0 };
    state.absencePausedAt = null;
    state.absenceOverrideActive = false;
    state.trackingStartTime = null;
    state.sessionStartedAt = null;
    state.sessionStartEstimated = false;
    state.pausedElapsedTime = 0;
    state.isPaused = mode === "navigate" ? false : !state.isAutoRefreshOn;
    state.users = /* @__PURE__ */ new Map();
    state.roomTotal = 0;
    state.lastAcceptedAcquisition = null;
    state.restoredDisplayFrame = null;
    state.previousUserCount = 0;
    state.previousRoomTotal = 0;
    state.previousCounts = emptyCounts();
    state.hasTrendBaseline = false;
    state.roomTotalHigh = 0;
    state.roomTotalHighTime = null;
    state.sessionHighs = {};
    state.newHighTiers = {};
    state.tierHighTimes = {};
    state.withTokensHighTime = null;
    state.totalHighTime = null;
    state.anonHighTime = null;
    state.femaleTransHighTime = null;
    state.history = /** @type {History} */
    Object.fromEntries(["timestamps", "breaks", ...sessionConfig.series].map((key) => [key, []]));
    state.pendingHistoryGap = false;
  }
  function startSessionClock(now) {
    if (liveSessionState.isStopped) return false;
    if (liveSessionState.sessionStartedAt === null) liveSessionState.sessionStartedAt = now;
    if (liveSessionState.isPaused) {
      liveSessionState.isPaused = false;
      liveSessionState.trackingStartTime = now - liveSessionState.pausedElapsedTime;
    } else if (!liveSessionState.trackingStartTime) liveSessionState.trackingStartTime = now;
    return true;
  }
  function pauseSessionClock(now) {
    if (liveSessionState.isPaused) return false;
    liveSessionState.pendingHistoryGap = true;
    liveSessionState.isPaused = true;
    liveSessionState.pausedElapsedTime = liveSessionState.trackingStartTime ? Math.max(0, now - liveSessionState.trackingStartTime) : 0;
    return true;
  }
  function pauseSessionRecording(now) {
    liveSessionState.absencePausedAt = null;
    liveSessionState.broadcasterAbsence = { since: null, missing: 0 };
    liveSessionState.isAutoRefreshOn = false;
    pauseSessionClock(now);
  }
  function resumeSessionRecording(now, overrideAbsence) {
    if (overrideAbsence) liveSessionState.absenceOverrideActive = true;
    liveSessionState.absencePausedAt = null;
    liveSessionState.broadcasterAbsence = { since: null, missing: 0 };
    liveSessionState.isAutoRefreshOn = true;
    startSessionClock(now);
  }
  function nextSessionAbsence(snapshot) {
    const state = liveSessionState;
    if (snapshot.source !== "API") return state.broadcasterAbsence;
    if (snapshot.users.some((user) => user.isOwner === true)) {
      state.absenceOverrideActive = false;
      return { since: null, missing: 0 };
    }
    if (state.absenceOverrideActive || !state.isAutoRefreshOn || state.isPaused || state.isStopped) return state.broadcasterAbsence;
    return { since: state.broadcasterAbsence.since === null ? snapshot.observedAt : state.broadcasterAbsence.since, missing: Math.min(1e6, state.broadcasterAbsence.missing + 1) };
  }
  function observeSessionPresence(snapshot, now) {
    liveSessionState.broadcasterAbsence = nextSessionAbsence(__spreadProps(__spreadValues({}, snapshot), { observedAt: now }));
  }
  function resumeSessionForOwnerReturn(now) {
    liveSessionState.broadcasterAbsence = { since: null, missing: 0 };
    liveSessionState.absencePausedAt = null;
    liveSessionState.absenceOverrideActive = false;
    startSessionClock(now);
  }
  function pauseSessionForAbsence(now, pauseMs) {
    const state = liveSessionState;
    if (state.isStopped || !state.isAutoRefreshOn || state.absenceOverrideActive || state.absencePausedAt !== null || state.isPaused || state.broadcasterAbsence.missing < 2 || state.broadcasterAbsence.since === null || now - state.broadcasterAbsence.since < pauseMs) return false;
    state.absencePausedAt = state.broadcasterAbsence.since + pauseMs;
    state.pausedElapsedTime = state.trackingStartTime ? Math.max(0, state.absencePausedAt - state.trackingStartTime) : 0;
    state.isPaused = true;
    state.pendingHistoryGap = true;
    return true;
  }
  function stopLiveSession(reason, now, absenceStopMs) {
    if (liveSessionState.isStopped) return false;
    invalidateSample();
    const state = liveSessionState;
    state.stopReason = reason === "absence" ? "absence" : "manual";
    state.stoppedAt = state.stopReason === "absence" && state.broadcasterAbsence.since !== null ? Math.min(now, (state.absencePausedAt !== null ? state.absencePausedAt : state.broadcasterAbsence.since) + absenceStopMs) : now;
    state.isStopped = true;
    state.isAutoRefreshOn = false;
    if (!state.isPaused) state.pausedElapsedTime = state.trackingStartTime ? Math.max(0, state.stoppedAt - state.trackingStartTime) : 0;
    state.isPaused = true;
    state.pendingHistoryGap = false;
    return true;
  }

  // src/history-data.js
  function getChartTimes(times) {
    var cached = runtime.chartTimeCache.get(times);
    var last = times.length ? times[times.length - 1] : 0;
    if (cached && cached.length === times.length && cached.last === last && cached.first === times[0]) return cached.axis;
    var axis = [];
    times.forEach(function(time, i) {
      axis.push(i ? Math.max(axis[i - 1], time) : time);
    });
    runtime.chartTimeCache.set(times, { length: times.length, first: times[0], last, axis });
    return axis;
  }
  function getHistoryBreaks(data) {
    if (data.breaks && data.breaks.length === data.timestamps.length) return data.breaks;
    var times = getChartTimes(data.timestamps), intervals = [];
    for (var i = 1; i < times.length; i++) if (times[i] > times[i - 1]) intervals.push(times[i] - times[i - 1]);
    intervals.sort(function(a, b) {
      return a - b;
    });
    var typical = intervals.length ? intervals[Math.floor((intervals.length - 1) / 2)] : 6e4;
    var threshold = Math.max(12e4, typical * 2 + runtime.API_TIMEOUT_MS);
    return times.map(function(time, i2) {
      return i2 > 0 && time - times[i2 - 1] > threshold;
    });
  }

  // src/immutable-data.js
  function freezeRecordingData(value) {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      for (const item of Object.values(value)) freezeRecordingData(item);
      Object.freeze(value);
    }
    return value;
  }

  // src/utils.js
  function getTierMarker(tier) {
    var config = runtime.TIERS[tier];
    if (tier === "female-trans") return config.name;
    return '<span role="img" aria-label="' + config.name + '" title="' + config.name + '" style="display:inline-block;width:10px;height:10px;border-radius:50%;vertical-align:middle;background:' + config.color + ';"></span>';
  }
  function log(msg) {
    diagnostic("log", msg);
  }
  function getModelNameFromUrl(url) {
    return roomFromUrl(url) || "unknown";
  }
  function isBroadcastRoom() {
    return roomFromUrl(location.href) !== null;
  }
  function formatElapsedTime(ms) {
    ms = Math.max(0, ms);
    var totalSeconds = Math.floor(ms / 1e3);
    var hours = Math.floor(totalSeconds / 3600);
    var minutes = Math.floor(totalSeconds % 3600 / 60);
    var seconds = totalSeconds % 60;
    return (hours < 10 ? "0" : "") + hours + ":" + (minutes < 10 ? "0" : "") + minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
  }
  function formatDateTime(timestamp) {
    return new Date(timestamp).toLocaleString();
  }
  function formatSampleAge(timestamp) {
    var seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1e3));
    if (seconds < 60) return seconds + "s";
    var minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + "m";
    var hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + "h" + (minutes % 60 ? " " + minutes % 60 + "m" : "");
    var days = Math.floor(hours / 24);
    return days + "d" + (hours % 24 ? " " + hours % 24 + "h" : "");
  }
  function getModelName() {
    return getModelNameFromUrl(location.href);
  }

  // src/playback-data.js
  function createPlaybackSnapshot(sourceHistory) {
    var copiedHistory = { timestamps: sourceHistory.timestamps.slice(), breaks: getHistoryBreaks(sourceHistory).slice() };
    var timeline = [];
    var highs = { roomTotal: [] };
    var firstTimestamp = copiedHistory.timestamps.length ? copiedHistory.timestamps[0] : 0;
    runtime.STORAGE_HISTORY_SERIES.forEach(function(key) {
      copiedHistory[key] = sourceHistory[key].slice();
      highs[key] = [];
    });
    copiedHistory.timestamps.forEach(function(timestamp, index) {
      timeline.push(Math.max(index ? timeline[index - 1] : 0, timestamp - firstTimestamp));
      runtime.STORAGE_HISTORY_SERIES.forEach(function(key) {
        highs[key].push(Math.max(index ? highs[key][index - 1] : 0, copiedHistory[key][index]));
      });
      var total = copiedHistory.total[index] + copiedHistory.anonymous[index];
      highs.roomTotal.push(Math.max(index ? highs.roomTotal[index - 1] : 0, total));
    });
    var durationMs = timeline.length ? timeline[timeline.length - 1] : 0;
    return freezeRecordingData({
      history: copiedHistory,
      timeline,
      highs,
      // Recording gaps affect the chart's time axis, not how long Replay
      // waits for its next sample. Keep one second per step, capped at 30s.
      durationMs,
      replayDurationMs: Math.min(3e4, Math.max(0, timeline.length - 1) * 1e3)
    });
  }
  function getPlaybackSampleIndex(snapshot, positionMs, exactIndex) {
    if (!snapshot || !snapshot.timeline.length) return -1;
    var position = Number(positionMs);
    position = Number.isFinite(position) ? Math.max(0, Math.min(snapshot.durationMs, position)) : 0;
    var low = 0;
    var high = snapshot.timeline.length;
    while (low < high) {
      var middle = Math.floor((low + high) / 2);
      if (snapshot.timeline[middle] <= position) low = middle + 1;
      else high = middle;
    }
    return Number.isInteger(exactIndex) ? Math.max(0, Math.min(snapshot.timeline.length - 1, exactIndex)) : Math.max(0, low - 1);
  }
  function getPlaybackFrame(snapshot, positionMs, exactIndex) {
    var index = getPlaybackSampleIndex(snapshot, positionMs, exactIndex);
    if (index < 0) return null;
    var frameHistory = snapshot.history;
    var frameHighs = {};
    var counts = {};
    var playbackNewHighTiers = {};
    runtime.STORAGE_HISTORY_SERIES.forEach(function(key) {
      frameHighs[key] = snapshot.highs[key][index];
      var count = snapshot.history[key][index];
      if (Object.prototype.hasOwnProperty.call(runtime.TIERS, key)) counts[key] = count;
      if (count > 0 && count >= snapshot.highs[key][index]) {
        playbackNewHighTiers[key] = true;
      }
    });
    frameHighs.roomTotal = snapshot.highs.roomTotal[index];
    var total = snapshot.history.total[index];
    var anonymousCount = snapshot.history.anonymous[index];
    return {
      counts,
      total,
      withTokens: snapshot.history.withTokens[index],
      anonymousCount,
      fullRoomTotal: total + anonymousCount,
      roomTotalHigh: frameHighs.roomTotal,
      history: frameHistory,
      historyEndIndex: index,
      highs: frameHighs,
      index,
      timestamp: snapshot.history.timestamps[index],
      playbackNewHighTiers
    };
  }
  function isPlaybackCurrent(state) {
    return !!state && state === runtime.playback && runtime.presentationMode === "PLAYBACK" && state.url === location.href && runtime.lastUrl === location.href && state.generation === runtime.initGuard && state.key === runtime.activeSessionStorageKey && (state.imported || state.key === getStorageKey(getModelName()));
  }

  // src/high-selectors.js
  function displayedHighRoom() {
    return allTimeRoom(isPlaybackCurrent(runtime.playback) && runtime.playback.archive ? runtime.playback.archive.room : getModelName());
  }
  function displayedAllTimeState() {
    if (isPlaybackCurrent(runtime.playback) && runtime.playback.allTimeState) return runtime.playback.allTimeState;
    var room2 = displayedHighRoom();
    return runtime.allTimeCache.get(room2) || readAllTimeHighs(room2);
  }
  function getSessionHigh(key, current) {
    return readSessionHigh(key, current);
  }
  function getDisplayHigh(frame, key, current) {
    if (runtime.highMode === "ath") return displayedAllTimeState().highs[key];
    if (key === "roomTotal") return { value: frame.roomTotalHigh, time: frame.isPlayback ? null : runtime.roomTotalHighTime };
    return frame.isPlayback ? { value: Math.max(frame.highs[key] || 0, current || 0), isNew: false } : getSessionHigh(key, current);
  }
  function highLabel(high, compact) {
    return runtime.highMode.toUpperCase() + ":" + (runtime.highMode === "ath" && !high.source ? "—" : compact ? compactNumber(high.value) : high.value.toLocaleString());
  }
  function highDescription(high) {
    var label = runtime.highMode === "ath" ? "All-time high for " + displayedHighRoom() : "Session high";
    if (runtime.highMode === "ath" && !high.source) return label + ": no record yet";
    return label + ": " + high.value.toLocaleString() + (high.time != null ? " · " + new Date(high.time).toLocaleString() : "") + (runtime.highMode === "ath" ? (high.source === "file" ? " · Added from a session file" : high.source === "saved" ? " · Restored local session" : " · Recorded live") + (displayedAllTimeState().pending ? " · Local only, not saved" : "") : "");
  }
  function getHighValue(data, currentValue, timestamp) {
    var historyMax = data && data.length > 0 ? Math.max.apply(null, data) : 0;
    var newHigh = Math.max(historyMax, currentValue || 0);
    if (timestamp && newHigh > historyMax) {
      return { value: newHigh, isNew: true, time: timestamp };
    }
    return { value: newHigh, isNew: false };
  }

  // src/high-pulses.js
  function cancelHighPulse(key) {
    var animation = runtime.highPulseAnimations.get(key);
    runtime.highPulseAnimations.delete(key);
    if (animation) {
      try {
        animation.cancel();
      } catch (error) {
      }
    }
  }
  function cancelHighPulses() {
    Array.from(runtime.highPulseAnimations.keys()).forEach(cancelHighPulse);
  }
  function pulseAcceptedHighs(priorState) {
    try {
      if (runtime.presentationMode !== "LIVE" || runtime.isMinimized || runtime.restoredDisplayFrame || document.visibilityState === "hidden" || runtime.highPulseMotion && runtime.highPulseMotion.matches) {
        cancelHighPulses();
        return;
      }
      runtime.PANEL_ROWS.forEach(function(row) {
        var key = row.key === "withtokens" ? "withTokens" : row.key === "anon" ? "anonymous" : row.key;
        var atHigh = runtime.newHighTiers[key], wasAtHigh = priorState.newHighTiers[key];
        var previousHigh = priorState.sessionHighs[key];
        var raisedHigh = key === "roomTotal" ? runtime.roomTotalHigh > priorState.roomTotalHigh : runtime.sessionHighs[key].value > (previousHigh ? previousHigh.value : 0);
        if (key === "roomTotal") {
          var currentRoom = runtime.history.total.at(-1) + runtime.history.anonymous.at(-1);
          var previousRoom = priorState.history.total.at(-1) + priorState.history.anonymous.at(-1);
          atHigh = currentRoom > 0 && currentRoom >= runtime.roomTotalHigh;
          wasAtHigh = previousRoom > 0 && previousRoom >= priorState.roomTotalHigh;
        }
        if (runtime.highMode === "ath") {
          var high = displayedAllTimeState().highs[key], before = priorState.allTimeHighs[key];
          var current = key === "roomTotal" ? currentRoom : runtime.history[key].at(-1);
          var oldValue = key === "roomTotal" ? previousRoom : priorState.history[key].at(-1);
          atHigh = high.source && current > 0 && current >= high.value;
          wasAtHigh = priorState.lastAcceptedAcquisition && before.source && oldValue > 0 && oldValue >= before.value;
          raisedHigh = high.value > before.value;
        }
        if (!atHigh) {
          cancelHighPulse(row.key);
          return;
        }
        if (wasAtHigh && !raisedHigh) return;
        var target = document.getElementById((runtime.collapsedRows.has(row.key) ? "restore-row-" : "tier-row-") + row.key);
        if (!target || typeof target.animate !== "function") return;
        cancelHighPulse(row.key);
        var animation = target.animate([
          { backgroundColor: "rgba(50, 205, 50, 0.22)", boxShadow: "inset 0 0 0 1px rgba(105, 190, 69, 0)", offset: 0 },
          { backgroundColor: "rgba(50, 205, 50, 0.40)", boxShadow: "inset 0 0 0 1px rgba(105, 190, 69, 0.75)", offset: 0.5 },
          { backgroundColor: "rgba(50, 205, 50, 0.22)", boxShadow: "inset 0 0 0 1px rgba(105, 190, 69, 0)", offset: 1 }
        ], { duration: 850, iterations: 2, easing: "ease-in-out", fill: "none" });
        runtime.highPulseAnimations.set(row.key, animation);
        animation.onfinish = animation.oncancel = function() {
          if (runtime.highPulseAnimations.get(row.key) === animation) runtime.highPulseAnimations.delete(row.key);
        };
      });
    } catch (error) {
      log("High pulse unavailable: " + error.message);
    }
  }

  // src/panel-preferences.js
  var PANEL_PREFERENCE_FIELDS = Object.freeze([
    "highMode",
    "panelGeometry",
    "isDarkMode",
    "miniMetric",
    "collapsedRows",
    "chartWindowMode",
    "currentScale",
    "panelBackgroundPercent",
    "isMinimized",
    "trendComparisonMode",
    "autoTrendEscalation"
  ]);
  var panelPreferenceState;
  var preferenceChoices;
  function initializePanelPreferences(target) {
    panelPreferenceState = __spreadProps(__spreadValues(
      {},
      /** @type {PanelPreferences} */
      Object.fromEntries(PANEL_PREFERENCE_FIELDS.map((key) => [key, target[key]]))
    ), {
      collapsedRows: new Set(target.collapsedRows),
      panelGeometry: target.panelGeometry ? __spreadValues({}, target.panelGeometry) : null
    });
    preferenceChoices = {
      rows: new Set(target.PANEL_ROWS.map((row) => row.key)),
      metrics: target.MINI_METRICS.slice(),
      windows: new Set(Object.keys(target.CHART_WINDOWS)),
      trends: new Set(Object.keys(target.TREND_PRESETS))
    };
    const rowsView = Object.freeze({
      has: (key) => panelPreferenceState.collapsedRows.has(key),
      get size() {
        return panelPreferenceState.collapsedRows.size;
      },
      [Symbol.iterator]: () => panelPreferenceState.collapsedRows[Symbol.iterator]()
    });
    for (const key of PANEL_PREFERENCE_FIELDS) Object.defineProperty(target, key, {
      enumerable: true,
      configurable: false,
      get: () => key === "collapsedRows" ? rowsView : key === "panelGeometry" && panelPreferenceState.panelGeometry ? Object.freeze(__spreadValues({}, panelPreferenceState.panelGeometry)) : panelPreferenceState[key]
    });
  }
  function switchHighPreference() {
    panelPreferenceState.highMode = panelPreferenceState.highMode === "sh" ? "ath" : "sh";
  }
  function selectPanelTheme(dark) {
    panelPreferenceState.isDarkMode = !!dark;
  }
  function cycleMiniMetric() {
    panelPreferenceState.miniMetric = preferenceChoices.metrics[(preferenceChoices.metrics.indexOf(panelPreferenceState.miniMetric) + 1) % preferenceChoices.metrics.length];
  }
  function selectCollapsedRow(key, collapsed) {
    if (!preferenceChoices.rows.has(key)) return;
    if (collapsed) panelPreferenceState.collapsedRows.add(key);
    else panelPreferenceState.collapsedRows.delete(key);
  }
  function selectChartWindow(mode) {
    if (preferenceChoices.windows.has(mode)) panelPreferenceState.chartWindowMode = mode;
  }
  function selectPanelScale(scale) {
    if (Number.isFinite(scale) && scale > 0) panelPreferenceState.currentScale = scale;
  }
  function rememberPanelGeometry(geometry) {
    panelPreferenceState.panelGeometry = __spreadValues({}, geometry);
  }
  function selectPanelOpacity(percent) {
    if (Number.isFinite(percent)) panelPreferenceState.panelBackgroundPercent = Math.max(30, Math.min(100, percent));
  }
  function selectPanelMinimized(minimized) {
    panelPreferenceState.isMinimized = !!minimized;
  }
  function selectTrendMode(mode) {
    if (preferenceChoices.trends.has(mode)) panelPreferenceState.trendComparisonMode = mode;
  }
  function selectAutomaticTrends(automatic) {
    panelPreferenceState.autoTrendEscalation = !!automatic;
  }
  function restoreTrendPreferences(mode, automatic) {
    selectTrendMode(mode);
    selectAutomaticTrends(automatic);
  }
  function resetTrendPreferences() {
    restoreTrendPreferences("last", true);
  }

  // src/playback-state.js
  var PLAYBACK_FIELDS = Object.freeze(["playback", "presentationMode", "sessionFileLoadGeneration"]);
  var playbackState;
  var playbackClock;
  var playbackRecords = /* @__PURE__ */ new WeakMap();
  function initializePlaybackState(target, clock2) {
    playbackState = {
      playback: target.playback,
      presentationMode: target.presentationMode,
      sessionFileLoadGeneration: target.sessionFileLoadGeneration
    };
    playbackClock = clock2;
    for (const key of PLAYBACK_FIELDS) {
      Object.defineProperty(target, key, { enumerable: true, configurable: false, get: () => playbackState[key] });
    }
  }
  function copyPlaybackData(value) {
    if (Array.isArray(value)) return (
      /** @type {T} */
      Object.freeze(value.map((item) => copyPlaybackData(item)))
    );
    if (value && typeof value === "object") return (
      /** @type {T} */
      Object.freeze(Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, copyPlaybackData(item)])
      ))
    );
    return value;
  }
  function activePlaybackData(view) {
    return view && view === playbackState.playback ? playbackRecords.get(view) : null;
  }
  function openOwnedPlayback(options, now, playing) {
    closeOwnedPlayback();
    const data = {
      url: options.url,
      key: options.key,
      generation: options.generation,
      imported: options.imported === true,
      archive: copyPlaybackData(options.archive),
      snapshot: copyPlaybackData(options.snapshot),
      allTimeState: copyPlaybackData(options.allTimeState),
      positionMs: 0,
      samplePosition: 0,
      stepIndex: 0,
      speed: 1,
      lastTickAt: now,
      playing: playing && options.snapshot.replayDurationMs > 0,
      timer: null,
      paintedPosition: void 0,
      paintLayout: void 0
    };
    const view = (
      /** @type {PlaybackView} */
      /* @__PURE__ */ Object.create(null)
    );
    for (const key of Object.keys(data)) Object.defineProperty(view, key, { enumerable: true, get: () => data[key] });
    Object.freeze(view);
    playbackRecords.set(view, data);
    playbackState.playback = view;
    playbackState.presentationMode = "PLAYBACK";
    return view;
  }
  function nextSessionFileRequest() {
    return ++playbackState.sessionFileLoadGeneration;
  }
  function closeOwnedPlayback() {
    stopOwnedPlaybackClock(playbackState.playback);
    playbackState.playback = null;
    playbackState.presentationMode = "LIVE";
  }
  function stopOwnedPlaybackClock(view) {
    const data = view && playbackRecords.get(view);
    if (!data || data.timer === null) return;
    playbackClock.stop(data.timer);
    data.timer = null;
  }
  function startOwnedPlaybackClock(view, tick) {
    const data = activePlaybackData(view);
    if (!data || !data.playing || data.timer !== null) return;
    data.timer = playbackClock.start(() => {
      if (activePlaybackData(view)) tick(view);
    });
  }
  function movePlaybackPosition(data, position) {
    const last = data.snapshot.timeline.length - 1;
    data.samplePosition = Math.max(0, Math.min(last, position));
    if (Math.abs(data.samplePosition - Math.round(data.samplePosition)) < 1e-9) data.samplePosition = Math.round(data.samplePosition);
    data.stepIndex = Math.floor(data.samplePosition);
    const time = data.snapshot.timeline[data.stepIndex], nextTime = data.snapshot.timeline[Math.min(last, data.stepIndex + 1)];
    data.positionMs = time + (nextTime - time) * (data.samplePosition - data.stepIndex);
  }
  function moveOwnedPlayback(view, position) {
    const data = activePlaybackData(view);
    if (!data || !Number.isFinite(position)) return false;
    movePlaybackPosition(data, position);
    return true;
  }
  function advanceOwnedPlayback(view, now) {
    const data = activePlaybackData(view);
    if (!data || !data.playing) return false;
    const elapsed = Math.max(0, now - data.lastTickAt);
    data.lastTickAt = now;
    const last = data.snapshot.timeline.length - 1;
    const rate = data.snapshot.replayDurationMs > 0 ? last / data.snapshot.replayDurationMs : 0;
    movePlaybackPosition(data, data.samplePosition + elapsed * rate * data.speed);
    if (data.samplePosition >= last) pauseOwnedPlayback(view);
    return true;
  }
  function pauseOwnedPlayback(view) {
    const data = activePlaybackData(view);
    if (!data) return false;
    data.playing = false;
    stopOwnedPlaybackClock(view);
    return true;
  }
  function resumeOwnedPlayback(view, now) {
    const data = activePlaybackData(view);
    if (!data || !data.snapshot.replayDurationMs) return false;
    if (data.samplePosition >= data.snapshot.timeline.length - 1) movePlaybackPosition(data, 0);
    data.playing = true;
    data.lastTickAt = now;
    return true;
  }
  function seekOwnedPlayback(view, position, now) {
    const data = activePlaybackData(view);
    if (!data || !Number.isFinite(position)) return false;
    pauseOwnedPlayback(view);
    movePlaybackPosition(data, position);
    data.lastTickAt = now;
    return true;
  }
  function changeOwnedPlaybackSpeed(view, speed, now) {
    const data = activePlaybackData(view);
    if (!data || ![0.5, 1, 2].includes(speed)) return false;
    data.speed = speed;
    data.lastTickAt = now;
    return true;
  }
  function markPlaybackPainted(view, revision) {
    const data = activePlaybackData(view);
    if (!data) return;
    data.paintedPosition = data.samplePosition;
    data.paintLayout = revision;
  }
  function setPlaybackAllTimeState(view, records) {
    const data = activePlaybackData(view);
    if (!data) return false;
    data.allTimeState = copyPlaybackData(records);
    return true;
  }

  // src/library-models.js
  var MODEL_FAVORITE_PREFIX = "tierscope:library-model:v1:";
  function modelFavoriteKey(room2) {
    const normalized = allTimeRoom(room2);
    if (!normalized) throw new Error("Invalid favorite model.");
    return MODEL_FAVORITE_PREFIX + normalized;
  }
  function validateFavoriteModels(value) {
    if (!Array.isArray(value) || value.length > 1e4 || value.some((room2) => !allTimeRoom(room2))) throw new Error("Invalid favorite models.");
    return [...new Set(value.map(allTimeRoom))].sort();
  }
  function readModelFavorite(room2) {
    const key = modelFavoriteKey(room2), normalized = allTimeRoom(room2), raw = GM_getValue(key, void 0);
    if (raw === void 0) return { favorite: false, autoKeep: false };
    const record = JSON.parse(raw);
    if (record.schemaVersion !== 1 || record.room !== normalized || typeof record.favorite !== "boolean" || record.autoKeep !== void 0 && typeof record.autoKeep !== "boolean") throw new Error("Invalid favorite model record.");
    return { favorite: record.favorite, autoKeep: record.favorite && record.autoKeep === true };
  }
  function readModelFavorites(entries = []) {
    const favorites = new Set(entries.filter((entry) => entry.favorite).map((entry) => entry.archive.room.toLowerCase()));
    const errors = [], automatic = /* @__PURE__ */ new Set();
    for (const key of GM_listValues().filter((key2) => key2.startsWith(MODEL_FAVORITE_PREFIX))) {
      const room2 = key.slice(MODEL_FAVORITE_PREFIX.length);
      try {
        if (modelFavoriteKey(room2) !== key) throw new Error("Invalid favorite model key.");
        const record = readModelFavorite(room2);
        if (record.favorite) favorites.add(room2);
        else favorites.delete(room2);
        if (record.autoKeep) automatic.add(room2);
      } catch (error) {
        favorites.delete(room2);
        errors.push(room2);
      }
    }
    return { favorites, automatic, errors };
  }
  function planModelFavoriteWrites(rooms) {
    const writes = [];
    for (const room2 of validateFavoriteModels(rooms)) {
      const key = modelFavoriteKey(room2);
      if (GM_getValue(key, void 0) === void 0) writes.push({
        key,
        expectedBefore: void 0,
        value: JSON.stringify({ schemaVersion: 1, room: room2, favorite: true })
      });
    }
    return writes;
  }
  function setModelFavorite(room2, favorite, autoKeep = false) {
    const key = modelFavoriteKey(room2);
    if (typeof favorite !== "boolean" || typeof autoKeep !== "boolean" || autoKeep && !favorite) throw new Error("Invalid favorite model choice.");
    const before = GM_getValue(key, void 0), value = JSON.stringify({ schemaVersion: 1, room: allTimeRoom(room2), favorite, autoKeep });
    try {
      GM_setValue(key, value);
      if (GM_getValue(key, void 0) !== value) throw new Error("Favorite changed in another tab. Refresh the library.");
    } catch (error) {
      try {
        if (GM_getValue(key, void 0) === value) {
          if (before === void 0) GM_deleteValue(key);
          else GM_setValue(key, before);
        }
      } catch (rollbackError) {
        throw new Error("The favorite could not be saved or restored. Refresh the library before retrying.");
      }
      throw error;
    }
  }
  function migrateRecordingFavorites(entries) {
    const rooms = entries.filter((entry) => entry.favorite).map((entry) => entry.archive.room);
    for (const write of planModelFavoriteWrites(rooms)) {
      if (GM_getValue(write.key, void 0) === void 0) setModelFavorite(write.key.slice(MODEL_FAVORITE_PREFIX.length), true);
    }
  }

  // src/presentation-data.js
  function captureDisplayHistory(history) {
    if (Object.isFrozen(history)) return history;
    return freezeRecordingData(
      /** @type {History} */
      Object.fromEntries(
        Object.entries(history).map(([key, values]) => [key, values.slice()])
      )
    );
  }
  function liveDisplayData(session, tiers) {
    const counts = (
      /** @type {Record<import('./session-types').Tier, number>} */
      Object.fromEntries(tiers.map((key) => [key, 0]))
    );
    const genderCounts = { female: 0, trans: 0 };
    for (const user of session.users.values()) {
      if (counts[user.tier] !== void 0) counts[user.tier]++;
      if (user.gender === "female" || user.gender === "trans") {
        counts["female-trans"]++;
        genderCounts[user.gender]++;
      }
    }
    const total = session.users.size;
    const withTokens = tiers.filter((key) => key !== "gray" && key !== "female-trans").reduce((sum, key) => sum + counts[key], 0);
    const acquisition = session.lastAcceptedAcquisition;
    const anonymousCount = acquisition && acquisition.source === "API" ? acquisition.api.anonymousCount : Math.max(0, session.roomTotal - total);
    return {
      counts,
      genderCounts,
      total,
      withTokens,
      anonymousCount,
      fullRoomTotal: Math.max(session.roomTotal, total + anonymousCount),
      roomTotalHigh: session.roomTotalHigh,
      history: session.history,
      isPlayback: false
    };
  }

  // src/session-selectors.js
  function getComparisonCounts() {
    var comparisonNow = runtime.isStopped ? runtime.history.timestamps[runtime.history.timestamps.length - 1] || runtime.stoppedAt : Date.now();
    if (runtime.trendComparisonMode === "last") {
      if (runtime.history.timestamps.length < 2) {
        return { counts: null, short: false, actualMinutes: 0 };
      }
      var lastIdx = runtime.history.timestamps.length - 2;
      var actualMinutes = Math.round((comparisonNow - runtime.history.timestamps[lastIdx]) / 6e4);
      return {
        counts: {
          "red": runtime.history["red"][lastIdx] || 0,
          "green": runtime.history["green"][lastIdx] || 0,
          "purple": runtime.history["purple"][lastIdx] || 0,
          "pink": runtime.history["pink"][lastIdx] || 0,
          "dark-blue": runtime.history["dark-blue"][lastIdx] || 0,
          "light-blue": runtime.history["light-blue"][lastIdx] || 0,
          "gray": runtime.history["gray"][lastIdx] || 0,
          "female-trans": runtime.history["female-trans"][lastIdx] || 0,
          "withTokens": runtime.history["withTokens"][lastIdx] || 0,
          "total": runtime.history["total"][lastIdx] || 0,
          "anonymous": runtime.history["anonymous"][lastIdx] || 0
        },
        short: false,
        actualMinutes
      };
    }
    if (runtime.trendComparisonMode === "start") {
      if (runtime.history.timestamps.length === 0) {
        return {
          counts: {
            "red": 0,
            "green": 0,
            "purple": 0,
            "pink": 0,
            "dark-blue": 0,
            "light-blue": 0,
            "gray": 0,
            "female-trans": 0,
            "withTokens": 0,
            "total": 0,
            "anonymous": 0
          },
          short: false,
          actualMinutes: 0
        };
      }
      var startMinutes = Math.round((comparisonNow - runtime.history.timestamps[0]) / 6e4);
      return {
        counts: {
          "red": runtime.history["red"][0] || 0,
          "green": runtime.history["green"][0] || 0,
          "purple": runtime.history["purple"][0] || 0,
          "pink": runtime.history["pink"][0] || 0,
          "dark-blue": runtime.history["dark-blue"][0] || 0,
          "light-blue": runtime.history["light-blue"][0] || 0,
          "gray": runtime.history["gray"][0] || 0,
          "female-trans": runtime.history["female-trans"][0] || 0,
          "withTokens": runtime.history["withTokens"][0] || 0,
          "total": runtime.history["total"][0] || 0,
          "anonymous": runtime.history["anonymous"][0] || 0
        },
        short: false,
        actualMinutes: startMinutes
      };
    }
    var preset = runtime.TREND_PRESETS[runtime.trendComparisonMode];
    if (!preset || preset.ms <= 0) return { counts: runtime.previousCounts, short: false, actualMinutes: 0 };
    var targetTime = comparisonNow - preset.ms;
    var idx = -1;
    for (var i = 0; i < runtime.history.timestamps.length; i++) {
      if (runtime.history.timestamps[i] <= targetTime) {
        idx = i;
      } else {
        break;
      }
    }
    var short = idx === -1;
    if (short) idx = 0;
    if (idx === -1 || runtime.history.timestamps.length === 0) {
      return { counts: runtime.previousCounts, short: false, actualMinutes: 0 };
    }
    var actualMs = comparisonNow - runtime.history.timestamps[idx];
    var actualMinutes = Math.round(actualMs / 6e4);
    return {
      counts: {
        "red": runtime.history["red"][idx] || 0,
        "green": runtime.history["green"][idx] || 0,
        "purple": runtime.history["purple"][idx] || 0,
        "pink": runtime.history["pink"][idx] || 0,
        "dark-blue": runtime.history["dark-blue"][idx] || 0,
        "light-blue": runtime.history["light-blue"][idx] || 0,
        "gray": runtime.history["gray"][idx] || 0,
        "female-trans": runtime.history["female-trans"][idx] || 0,
        "withTokens": runtime.history["withTokens"][idx] || 0,
        "total": runtime.history["total"][idx] || 0,
        "anonymous": runtime.history["anonymous"][idx] || 0
      },
      short,
      actualMinutes
    };
  }
  function isAbsencePaused() {
    return runtime.absencePausedAt !== null && runtime.isPaused && runtime.isAutoRefreshOn && !runtime.isStopped;
  }
  function absencePauseDescription() {
    return "Recording and elapsed time paused after 15 minutes without the broadcaster. API return checks every minute, subject to retry restrictions. A confirmed return resumes recording. Automatic Stop at " + new Date(runtime.absencePausedAt + runtime.ABSENCE_STOP_MS).toLocaleString() + " (3 hours after auto-pause). Use Resume to keep recording during this absence.";
  }
  function getEffectiveScanIntervalSeconds() {
    if (isAbsencePaused()) return runtime.ABSENCE_CHECK_SECONDS;
    if (runtime.absenceOverrideActive) return runtime.scanIntervalSeconds;
    if (runtime.broadcasterAbsence.missing < 2 || runtime.broadcasterAbsence.since === null) return runtime.scanIntervalSeconds;
    return Math.max(runtime.scanIntervalSeconds, Date.now() - runtime.broadcasterAbsence.since >= 10 * 6e4 ? 300 : 120);
  }
  function stopDescription() {
    return runtime.stopReason === "absence" ? runtime.absencePausedAt !== null ? "Stopped after 3 hours auto-paused for broadcaster absence" : "Stopped after 3 hours of broadcaster absence" : "Session stopped";
  }
  function getAnonymousCount() {
    return sessionAnonymousCount();
  }

  // src/request-policy.js
  function readRequestPolicy() {
    try {
      var raw = GM_getValue(runtime.REQUEST_POLICY_KEY, null);
      if (raw === null) reconcileRequestPolicy(null);
      else {
        var value = JSON.parse(raw);
        if (value && Number.isFinite(value.until) && value.until >= 0 && Number.isInteger(value.failures) && value.failures >= 0 && (value.blocked === 0 || value.blocked === 401 || value.blocked === 403) && Number.isInteger(value.status) && (!value.serverUntil || isStorageTimestamp(value.serverUntil)) && typeof value.revision === "string") {
          reconcileRequestPolicy(value);
        }
      }
    } catch (error) {
    }
    return runtime.requestPolicyCache;
  }
  function writeRequestPolicy(policy) {
    policy.revision = makeStorageId();
    stageRequestPolicy(policy);
    try {
      GM_setValue(runtime.REQUEST_POLICY_KEY, JSON.stringify(policy));
      confirmRequestPolicySaved(policy.revision);
    } catch (error) {
      log("Request restriction is local to this tab: " + error.message);
    }
  }
  function retryAfterTime(value, now) {
    if (typeof value !== "string" || !value.trim()) return 0;
    value = value.trim();
    if (/^\d+$/.test(value)) {
      var until = now + Number(value) * 1e3;
      return Number.isSafeInteger(until) && until <= 864e13 ? until : 0;
    }
    var parsed = Date.parse(value);
    return Number.isFinite(parsed) && parsed > now ? parsed : 0;
  }
  function recordRequestFailure(error) {
    var old = readRequestPolicy();
    var failures = Math.min(20, old.failures + 1);
    var status = error.status || 0;
    var delay = Math.min(9e5, Math.max(6e4, runtime.scanIntervalSeconds * 1e3) * Math.pow(2, failures - 1));
    var policy = {
      until: Math.max(old.until, Date.now() + delay, error.retryAt || 0),
      failures,
      blocked: status === 401 || status === 403 ? status : old.blocked,
      status,
      serverUntil: Math.max(old.serverUntil || 0, error.retryAt || 0, status === 429 ? Date.now() + delay : 0),
      revision: ""
    };
    writeRequestPolicy(policy);
    return policy;
  }
  function clearRequestFailures(revision) {
    readRequestPolicy();
    if (!clearOwnedRequestFailures(revision)) return;
    try {
      GM_deleteValue(runtime.REQUEST_POLICY_KEY);
    } catch (error) {
    }
  }
  function requestPolicyMessage(policy) {
    if (policy.blocked) return "Access denied (" + policy.blocked + ")";
    var seconds = Math.max(0, Math.ceil((policy.until - Date.now()) / 1e3));
    if (!seconds) return "";
    return (policy.status === 429 ? "Rate limited · " : "Retry in ") + (seconds >= 60 ? Math.ceil(seconds / 60) + "m" : seconds + "s");
  }
  function getDOMFallbackWaitSeconds(modelName) {
    var readyAt = runtime.domFallbackReadyAtByRoom.get(modelName.toLowerCase()) || 0;
    return Math.max(0, Math.ceil((readyAt - Date.now()) / 1e3));
  }

  // src/library-capacity-data.js
  var LIBRARY_MEGABYTE = 1024 * 1024;
  var DEFAULT_LIBRARY_LIMITS = Object.freeze({ maxSessions: 1e3, maxMegabytes: 50 });
  var LIBRARY_LIMIT_RANGES = Object.freeze({ maxSessions: 1e4, maxMegabytes: 250 });
  var LIBRARY_TRANSFER_MAX_COUNT = LIBRARY_LIMIT_RANGES.maxSessions;
  var LIBRARY_TRANSFER_MAX_BYTES = 300 * LIBRARY_MEGABYTE;
  function validateLibraryLimits(value) {
    if (!value || typeof value !== "object" || Array.isArray(value) || !("maxSessions" in value) || !("maxMegabytes" in value) || typeof value.maxSessions !== "number" || !Number.isSafeInteger(value.maxSessions) || value.maxSessions < 1 || value.maxSessions > LIBRARY_LIMIT_RANGES.maxSessions || typeof value.maxMegabytes !== "number" || !Number.isSafeInteger(value.maxMegabytes) || value.maxMegabytes < 1 || value.maxMegabytes > LIBRARY_LIMIT_RANGES.maxMegabytes) {
      throw new Error("Use whole numbers: 1–10,000 sessions and 1–250 MB.");
    }
    return { maxSessions: value.maxSessions, maxMegabytes: value.maxMegabytes };
  }
  function libraryCapacityNotice(usage, limits) {
    var _a;
    if ((_a = usage.unavailable) == null ? void 0 : _a.length) return "Some sessions could not be read. Storage usage is incomplete; new saves wait until they can be read or removed.";
    const ratio = Math.max(usage.count / limits.maxSessions, usage.bytes / (limits.maxMegabytes * LIBRARY_MEGABYTE));
    if (ratio >= 1) return "Library limit reached. Existing sessions are kept. Raise the limits or export and remove sessions to make room.";
    if (ratio >= 0.8) return "Library is nearing its limit. Raise the limits or export and remove sessions before it fills up.";
    return "";
  }

  // src/library-capacity.js
  var LIBRARY_LIMITS_KEY = "tierscope:library-limits:v1";
  function readLibraryLimits() {
    try {
      const raw = GM_getValue(LIBRARY_LIMITS_KEY, void 0);
      if (raw === void 0) return __spreadValues({}, DEFAULT_LIBRARY_LIMITS);
      const record = JSON.parse(raw);
      if (record.schemaVersion !== 1) throw new Error("Unsupported storage limits.");
      return validateLibraryLimits(record);
    } catch (error) {
      throw new Error("Library storage limits could not be read. Open Storage limits to save them again, or refresh to retry.");
    }
  }
  function saveLibraryLimits(value) {
    const limits = validateLibraryLimits(value), before = GM_getValue(LIBRARY_LIMITS_KEY, void 0);
    const raw = JSON.stringify(__spreadValues({ schemaVersion: 1 }, limits));
    try {
      GM_setValue(LIBRARY_LIMITS_KEY, raw);
      if (GM_getValue(LIBRARY_LIMITS_KEY, void 0) !== raw) throw new Error("Storage limits could not be verified. Refresh and retry.");
    } catch (error) {
      try {
        if (GM_getValue(LIBRARY_LIMITS_KEY, void 0) === raw) {
          if (before === void 0) GM_deleteValue(LIBRARY_LIMITS_KEY);
          else GM_setValue(LIBRARY_LIMITS_KEY, before);
        }
      } catch (rollbackError) {
        throw new Error("Storage limits could not be saved or restored. Refresh to check the current limits.");
      }
      throw error;
    }
    return limits;
  }
  var AUTOMATIC_KEEPING_KEY = "tierscope:automatic-keeping:v1";
  function readAutomaticKeepingMinutes() {
    try {
      const raw = GM_getValue(AUTOMATIC_KEEPING_KEY, void 0);
      if (raw === void 0) return 5;
      const record = JSON.parse(raw);
      if (record.schemaVersion !== 1) throw new Error("Unsupported automatic keeping settings.");
      return validateAutomaticKeepingMinutes(record.minimumMinutes);
    } catch (error) {
      throw new Error("Automatic keeping settings could not be read. Save them again in Library → Storage limits → Automatic keeping.");
    }
  }
  function validateAutomaticKeepingMinutes(value) {
    if (!Number.isInteger(value) || value < 0 || value > 1440) throw new Error("Choose a whole number from 0 to 1,440 minutes.");
    return value;
  }
  function saveAutomaticKeepingMinutes(value) {
    const minutes = validateAutomaticKeepingMinutes(value), before = GM_getValue(AUTOMATIC_KEEPING_KEY, void 0);
    const raw = JSON.stringify({ schemaVersion: 1, minimumMinutes: minutes });
    try {
      GM_setValue(AUTOMATIC_KEEPING_KEY, raw);
      if (GM_getValue(AUTOMATIC_KEEPING_KEY, void 0) !== raw) throw new Error("Automatic keeping settings could not be verified.");
    } catch (error) {
      if (GM_getValue(AUTOMATIC_KEEPING_KEY, void 0) === raw) {
        if (before === void 0) GM_deleteValue(AUTOMATIC_KEEPING_KEY);
        else GM_setValue(AUTOMATIC_KEEPING_KEY, before);
      }
      throw error;
    }
    return minutes;
  }

  // src/library-query.js
  function recordedCoverageMs(history) {
    var _a;
    let previous = 0, coveredMs = 0;
    const origin = history.timestamps[0];
    for (let i = 1; i < history.timestamps.length; i++) {
      const next = Math.max(previous, history.timestamps[i] - origin, 0);
      if (!((_a = history.breaks) == null ? void 0 : _a[i])) coveredMs += next - previous;
      previous = next;
    }
    return coveredMs;
  }
  function createModelCardReader() {
    const cache = /* @__PURE__ */ new WeakMap();
    function coverage(history) {
      const immutable = Object.isFrozen(history) && Object.isFrozen(history.timestamps) && (!history.breaks || Object.isFrozen(history.breaks));
      if (immutable && cache.has(history)) return cache.get(history);
      const coveredMs = recordedCoverageMs(history);
      if (immutable) cache.set(history, coveredMs);
      return coveredMs;
    }
    function read(entries) {
      let first = Infinity, latest = -Infinity, coveredMs = 0;
      for (const entry of entries) {
        const history = entry.archive.session.history, start = history.timestamps[0];
        if (start === void 0) continue;
        first = Math.min(first, start);
        latest = Math.max(latest, start);
        coveredMs += coverage(history);
      }
      return { first: first === Infinity ? null : first, latest: latest === -Infinity ? null : latest, coveredMs };
    }
    return { read };
  }
  function libraryDateBoundary(text, after = false) {
    if (!text) return after ? Infinity : -Infinity;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error("Use a valid calendar date.");
    const [year, month, day] = text.split("-").map(Number);
    const date = /* @__PURE__ */ new Date(0);
    date.setFullYear(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) throw new Error("Use a valid calendar date.");
    if (after) {
      date.setDate(date.getDate() + 1);
      date.setHours(0, 0, 0, 0);
    }
    return date.getTime();
  }
  function filterLibraryEntries(entries, filters = {}) {
    const start = libraryDateBoundary(filters.from || ""), end = libraryDateBoundary(filters.to || "", true);
    if (start >= end) throw new Error("The start date must not be after the end date.");
    const query = (filters.query || "").trim().toLowerCase(), room2 = (filters.room || "").toLowerCase();
    const result = entries.filter((entry) => {
      const time = entry.archive.session.history.timestamps[0];
      return (!room2 || room2 === "*" || entry.archive.room.toLowerCase() === room2) && time >= start && time < end && (!filters.favorites || entry.modelFavorite) && (!query || (entry.title + " " + entry.archive.room + " " + (entry.notes || "")).toLowerCase().includes(query));
    });
    const byDate = (a, b) => b.archive.session.history.timestamps[0] - a.archive.session.history.timestamps[0] || a.id.localeCompare(b.id);
    const sessionCounts2 = /* @__PURE__ */ new Map();
    if (filters.sort === "mostSessions" || filters.sort === "fewestSessions") {
      for (const entry of result) {
        const room3 = entry.archive.room.toLowerCase();
        sessionCounts2.set(room3, (sessionCounts2.get(room3) || 0) + 1);
      }
    }
    return result.sort((a, b) => {
      const roomA = a.archive.room.toLowerCase(), roomB = b.archive.room.toLowerCase();
      if (filters.sort === "mostSessions" || filters.sort === "fewestSessions") {
        const count = sessionCounts2.get(roomB) - sessionCounts2.get(roomA);
        return (filters.sort === "fewestSessions" ? -count : count) || roomA.localeCompare(roomB) || byDate(a, b);
      }
      if (filters.sort === "alphabetical") return roomA.localeCompare(roomB) || byDate(a, b);
      return filters.sort === "oldest" ? -byDate(a, b) : filters.sort === "title" ? a.title.localeCompare(b.title) || byDate(a, b) : filters.sort === "model" ? roomA.localeCompare(roomB) || byDate(a, b) : filters.sort === "favorites" ? Number(!!b.modelFavorite) - Number(!!a.modelFavorite) || byDate(a, b) : byDate(a, b);
    });
  }

  // src/storage.js
  function roomEpochKey(key) {
    return runtime.ROOM_EPOCH_PREFIX + key.slice(runtime.STORAGE_KEY_PREFIX.length);
  }
  function roomTabPrefix(key) {
    return runtime.TAB_RECORD_PREFIX + key.slice(runtime.STORAGE_KEY_PREFIX.length) + ":";
  }
  function getRoomEpoch(key) {
    return GM_getValue(roomEpochKey(key), "legacy");
  }
  function readSavedSession(key) {
    var epoch = getRoomEpoch(key);
    var keys = GM_listValues().filter(function(candidate) {
      return candidate.indexOf(roomTabPrefix(key)) === 0;
    });
    if (epoch === "legacy") keys.unshift(key);
    var selected;
    var warnings = [];
    keys.forEach(function(candidate) {
      try {
        var raw = GM_getValue(candidate, void 0);
        if (typeof raw === "undefined") return;
        if (typeof raw !== "string") throw new Error("Saved session must be JSON text");
        var parsed = JSON.parse(raw);
        var data = migrateStoredSession(parsed, determineStorageSchema(parsed));
        validateStoredSession(data);
        if (candidate !== key && typeof data.roomEpoch !== "string") throw new Error("Missing tab record epoch");
        if (hasStorageField(parsed, "sessionUniqueUsers") || hasStorageField(parsed, "sessionFemaleTransUsers")) {
          delete parsed.sessionUniqueUsers;
          delete parsed.sessionFemaleTransUsers;
          raw = JSON.stringify(parsed);
        }
        if (Date.now() - data.timestamp > runtime.STORAGE_MAX_AGE_MS) {
          if (candidate !== key) GM_deleteValue(candidate);
          return;
        }
        if (candidate !== key && data.roomEpoch !== epoch) return;
        var times = data.history.timestamps;
        var sampleTime = times.length ? Math.max.apply(null, times) : -1;
        var rank = [sampleTime, times.length, data.timestamp, candidate === key ? 0 : 1, candidate];
        if (!selected || rank.some(function(value, i) {
          return value > selected.rank[i] && rank.slice(0, i).every(function(v, j) {
            return v === selected.rank[j];
          });
        })) selected = { raw, rank };
      } catch (error) {
        warnings.push(candidate + ": " + error.message);
      }
    });
    var previous = runtime.sessionRecordWarnings.get(key) || [];
    warnings.forEach(function(warning) {
      if (previous.indexOf(warning) === -1) log("Saved record skipped and retained: " + warning);
    });
    runtime.sessionRecordWarnings.set(key, warnings);
    return selected ? selected.raw : void 0;
  }
  function determineStorageSchema(data) {
    if (!isStorageObject(data)) throw new Error("Saved session must be an object");
    if (!hasStorageField(data, "schemaVersion")) return { version: 1, legacy: true };
    if (!Number.isSafeInteger(data.schemaVersion) || data.schemaVersion < 0) {
      throw new Error("Invalid storage schemaVersion");
    }
    return { version: data.schemaVersion, legacy: false };
  }
  function migrateStoredSession(data, schema) {
    if (schema.version > runtime.STORAGE_SCHEMA_VERSION) {
      throw new Error("Newer storage schema " + schema.version + "; this build supports " + runtime.STORAGE_SCHEMA_VERSION);
    }
    if (schema.version === 1) return Object.assign({}, data, { schemaVersion: runtime.STORAGE_SCHEMA_VERSION });
    if (schema.version !== runtime.STORAGE_SCHEMA_VERSION) {
      throw new Error("Unsupported storage schema " + schema.version + "; no migration path to " + runtime.STORAGE_SCHEMA_VERSION);
    }
    return data;
  }
  function validateStoredSession(data) {
    function requireField(condition, field) {
      if (!condition) throw new Error("Invalid saved-session field: " + field);
    }
    requireField(isStorageObject(data), "record");
    if (hasStorageField(data, "schemaVersion")) {
      requireField(data.schemaVersion === runtime.STORAGE_SCHEMA_VERSION, "schemaVersion");
    }
    if (hasStorageField(data, "producerVersion")) {
      requireField(typeof data.producerVersion === "string", "producerVersion");
    }
    requireField(isStorageTimestamp(data.timestamp), "timestamp");
    requireField(isStorageObject(data.history), "history");
    requireField(Array.isArray(data.history.timestamps), "history.timestamps");
    requireField(data.history.timestamps.length <= runtime.MAX_HISTORY_LENGTH, "history length");
    requireField(data.history.timestamps.every(isStorageTimestamp), "history.timestamps");
    runtime.STORAGE_HISTORY_SERIES.forEach(function(field) {
      var series = data.history[field];
      requireField(Array.isArray(series) && series.length === data.history.timestamps.length && series.every(isStorageNumber), "history." + field);
    });
    if (hasStorageField(data.history, "breaks")) {
      requireField(Array.isArray(data.history.breaks) && data.history.breaks.length === data.history.timestamps.length && data.history.breaks.every(function(value) {
        return typeof value === "boolean";
      }), "history.breaks");
    }
    if (hasStorageField(data, "previousCounts")) {
      requireField(isStorageObject(data.previousCounts), "previousCounts");
      runtime.STORAGE_HISTORY_SERIES.forEach(function(field) {
        requireField(isStorageNumber(data.previousCounts[field]), "previousCounts." + field);
      });
    }
    if (hasStorageField(data, "tierHighTimes")) {
      requireField(isStorageObject(data.tierHighTimes), "tierHighTimes");
      Object.keys(data.tierHighTimes).forEach(function(tier) {
        requireField(hasStorageField(runtime.TIERS, tier) && (data.tierHighTimes[tier] === null || isStorageTimestamp(data.tierHighTimes[tier])), "tierHighTimes." + tier);
      });
    }
    runtime.STORAGE_NULLABLE_TIMES.forEach(function(field) {
      if (hasStorageField(data, field)) {
        requireField(data[field] === null || isStorageTimestamp(data[field]), field);
      }
    });
    if (hasStorageField(data, "roomEpoch")) requireField(typeof data.roomEpoch === "string", "roomEpoch");
    if (hasStorageField(data, "sessionStartEstimated")) requireField(typeof data.sessionStartEstimated === "boolean", "sessionStartEstimated");
    if (hasStorageField(data, "sessionHighs")) {
      requireField(isStorageObject(data.sessionHighs), "sessionHighs");
      runtime.STORAGE_HISTORY_SERIES.forEach(function(key) {
        var high = data.sessionHighs[key];
        requireField(isStorageObject(high) && isStorageNumber(high.value) && (high.time === null || isStorageTimestamp(high.time)), "sessionHighs." + key);
        requireField(high.value >= Math.max.apply(null, [0].concat(data.history[key])), "sessionHighs." + key + " below retained history");
        requireField(high.value === 0 || high.time !== null, "sessionHighs." + key + ".time");
      });
    }
    if (hasStorageField(data, "roomTotalHigh")) requireField(isStorageNumber(data.roomTotalHigh), "roomTotalHigh");
    if (hasStorageField(data, "pausedElapsedTime")) {
      requireField(isStorageTimestamp(data.pausedElapsedTime) && data.pausedElapsedTime <= Math.min(data.timestamp, Date.now()), "pausedElapsedTime");
    }
    if (hasStorageField(data, "trendComparisonMode")) {
      requireField(typeof data.trendComparisonMode === "string" && hasStorageField(runtime.TREND_PRESETS, data.trendComparisonMode), "trendComparisonMode");
    }
    ["isPaused", "isStopped", "hasTrendBaseline", "autoTrendEscalation", "absenceOverrideActive"].forEach(function(field) {
      if (hasStorageField(data, field)) requireField(typeof data[field] === "boolean", field);
    });
    if (data.isStopped) {
      requireField(data.isPaused === true && isStorageTimestamp(data.stoppedAt), "stopped state");
      requireField(data.stopReason === "manual" || data.stopReason === "absence", "stopReason");
    }
    if (hasStorageField(data, "absencePausedAt") && data.absencePausedAt !== null) {
      requireField(isStorageTimestamp(data.absencePausedAt) && data.absencePausedAt <= data.timestamp && data.isPaused === true && data.absenceOverrideActive !== true && isStorageObject(data.broadcasterAbsence) && data.broadcasterAbsence.missing >= 2 && isStorageTimestamp(data.broadcasterAbsence.since) && data.absencePausedAt === data.broadcasterAbsence.since + runtime.ABSENCE_PAUSE_MS, "absencePausedAt");
    }
    if (hasStorageField(data, "broadcasterAbsence")) {
      var absence = data.broadcasterAbsence;
      requireField(isStorageObject(absence) && Number.isSafeInteger(absence.missing) && absence.missing >= 0 && absence.missing <= 1e6 && (absence.missing === 0 ? absence.since === null : isStorageTimestamp(absence.since) && absence.since <= data.timestamp), "broadcasterAbsence");
    }
  }
  function normalizeStoredSession(data) {
    var normalized = {
      timestamp: data.timestamp,
      history: Object.fromEntries(["timestamps"].concat(runtime.STORAGE_HISTORY_SERIES).map(function(field) {
        return [field, data.history[field].slice()];
      })),
      previousCounts: Object.fromEntries(runtime.STORAGE_HISTORY_SERIES.map(function(field) {
        return [field, hasStorageField(data, "previousCounts") ? data.previousCounts[field] : 0];
      })),
      hasTrendBaseline: hasStorageField(data, "previousCounts") && data.hasTrendBaseline === true,
      isPaused: data.isPaused === true,
      isStopped: data.isStopped === true,
      stoppedAt: data.isStopped ? data.stoppedAt : null,
      stopReason: data.isStopped ? data.stopReason : null,
      absencePausedAt: hasStorageField(data, "absencePausedAt") ? data.absencePausedAt : null,
      absenceOverrideActive: data.absenceOverrideActive === true,
      broadcasterAbsence: data.broadcasterAbsence ? Object.assign({}, data.broadcasterAbsence) : { since: null, missing: 0 },
      trendComparisonMode: hasStorageField(data, "trendComparisonMode") ? data.trendComparisonMode : "last",
      autoTrendEscalation: !hasStorageField(data, "autoTrendEscalation") || data.autoTrendEscalation,
      roomTotalHigh: hasStorageField(data, "roomTotalHigh") ? data.roomTotalHigh : 0,
      pausedElapsedTime: hasStorageField(data, "pausedElapsedTime") ? data.pausedElapsedTime : 0
    };
    ["tierHighTimes"].forEach(function(field) {
      normalized[field] = hasStorageField(data, field) ? Object.fromEntries(Object.entries(data[field])) : {};
    });
    runtime.STORAGE_NULLABLE_TIMES.forEach(function(field) {
      normalized[field] = hasStorageField(data, field) ? data[field] : null;
    });
    normalized.history.breaks = getHistoryBreaks(data.history).slice();
    normalized.sessionHighs = {};
    runtime.STORAGE_HISTORY_SERIES.forEach(function(key) {
      if (data.sessionHighs && data.sessionHighs[key]) {
        normalized.sessionHighs[key] = Object.assign({}, data.sessionHighs[key]);
      } else {
        var values = normalized.history[key];
        var value = Math.max.apply(null, [0].concat(values));
        normalized.sessionHighs[key] = {
          value,
          time: value > 0 ? normalized.history.timestamps[values.indexOf(value)] : null
        };
      }
    });
    normalized.sessionStartEstimated = data.sessionStartEstimated === true;
    if (!hasStorageField(data, "sessionStartedAt")) {
      var knownTimes = [data.trackingStartTime, data.roomTotalHighTime].concat(normalized.history.timestamps).filter(function(time) {
        return typeof time === "number" && time > 0;
      });
      normalized.sessionStartedAt = knownTimes.length ? Math.min.apply(null, knownTimes) : null;
      normalized.sessionStartEstimated = knownTimes.length > 0;
    }
    return normalized;
  }
  function protectSessionStorage(key, reason, producerVersion) {
    var prior = runtime.sessionStorageStatus.get(key);
    if (prior && prior.protected) return prior;
    var status = { protected: true, reason, producerVersion: producerVersion == null ? null : producerVersion };
    runtime.sessionStorageStatus.set(key, status);
    log("Storage protected for " + key + ": " + reason + ". Saved data retained; automatic writes disabled until explicit Reset. Using a clean in-memory session on load.");
    return status;
  }
  function inspectStoredSession(model, restore) {
    var key = getStorageKey(model);
    var prior = runtime.sessionStorageStatus.get(key);
    if (prior && prior.protected) return prior;
    var producerVersion = null;
    try {
      var raw = readSavedSession(key);
      if (!restore && prior && prior.raw === raw) return prior;
      if (typeof raw === "undefined") {
        var empty = { protected: false, raw, producerVersion: null };
        runtime.sessionStorageStatus.set(key, empty);
        return empty;
      }
      if (typeof raw !== "string") throw new Error("Saved session must be JSON text");
      var parsed = JSON.parse(raw);
      if (isStorageObject(parsed) && typeof parsed.producerVersion === "string") producerVersion = parsed.producerVersion;
      var schema = determineStorageSchema(parsed);
      var migrated = migrateStoredSession(parsed, schema);
      validateStoredSession(migrated);
      var status = { protected: false, raw, producerVersion, legacy: schema.legacy };
      runtime.sessionStorageStatus.set(key, status);
      return restore ? Object.assign({}, status, { data: normalizeStoredSession(migrated) }) : status;
    } catch (e) {
      return protectSessionStorage(key, e.message, producerVersion);
    }
  }
  function getStorageReportStatus(model) {
    if (!model || model === "unknown") return { producer: "Unknown (no saved session)", access: "No room" };
    var status = inspectStoredSession(model, false);
    var warnings = runtime.sessionRecordWarnings.get(getStorageKey(model)) || [];
    return {
      producer: status.producerVersion === null ? status.legacy ? "Unknown (legacy session)" : "Unknown" : status.producerVersion || "(empty string)",
      access: status.protected ? "Protected / read-only: " + status.reason : (runtime.sessionStorageNotice || (runtime.activeSessionStorageKey === getStorageKey(model) ? "Writable (separate tab record)" : "Not initialized")) + (warnings.length ? "; " + warnings.length + " skipped record(s) retained; see console" : "")
    };
  }
  function deleteSession(model) {
    if (!model || model === "unknown") return;
    var key = getStorageKey(model);
    try {
      runtime.activeRoomEpoch = makeStorageId();
      GM_setValue(roomEpochKey(key), runtime.activeRoomEpoch);
      GM_listValues().filter(function(candidate) {
        return candidate.indexOf(roomTabPrefix(key)) === 0;
      }).forEach(function(candidate) {
        GM_deleteValue(candidate);
      });
      GM_deleteValue(key);
      runtime.sessionStorageStatus.delete(key);
      runtime.sessionRecordWarnings.delete(key);
      runtime.sessionStorageNotice = "";
      log("Session deleted for " + model);
    } catch (e) {
      protectSessionStorage(
        key,
        "Explicit Reset could not delete saved session: " + e.message,
        (runtime.sessionStorageStatus.get(key) || {}).producerVersion
      );
      log("Reset cleared live tracking but saved storage remains protected: " + e.message);
    }
  }
  function getSessionWriteStatus(model) {
    try {
      if (!model || model === "unknown") return { status: "inactive" };
      var key = getStorageKey(model);
      if (runtime.activeSessionStorageKey !== key) return { status: "inactive" };
      if (inspectStoredSession(model, false).protected) return { status: "protected" };
      if (getRoomEpoch(key) !== runtime.activeRoomEpoch) return {
        status: "reset",
        message: "Reset in another tab — local data only; export TXT/CSV before reloading"
      };
      return { status: "ready" };
    } catch (error) {
      return { status: "failed", error: error.message || String(error) };
    }
  }
  function writeSessionRecord(model, saveData) {
    var access = getSessionWriteStatus(model);
    if (access.status !== "ready") return access;
    try {
      var key = getStorageKey(model);
      if (saveData.roomEpoch !== runtime.activeRoomEpoch) return { status: "stale" };
      validateStoredSession(saveData);
      var raw = JSON.stringify(saveData);
      var tabRecord = runtime.tabRecords.get(key);
      if (!tabRecord || Date.now() - tabRecord.savedAt > runtime.STORAGE_MAX_AGE_MS) {
        tabRecord = { id: makeStorageId(), savedAt: Date.now() };
      }
      GM_setValue(roomTabPrefix(key) + tabRecord.id, raw);
      tabRecord.savedAt = Date.now();
      runtime.tabRecords.set(key, tabRecord);
      runtime.sessionStorageStatus.set(key, { protected: false, raw, producerVersion: saveData.producerVersion, legacy: false });
      log("Session saved for " + model + " (storage schema " + runtime.STORAGE_SCHEMA_VERSION + ", producer " + saveData.producerVersion + ")");
      return { status: "saved" };
    } catch (error) {
      return { status: "failed", error: error.message || String(error) };
    }
  }

  // src/session-file-format.js
  function validateSessionFile(file) {
    if (!isStorageObject(file) || file.format !== runtime.SESSION_FILE_FORMAT || file.formatVersion !== runtime.SESSION_FILE_VERSION) {
      throw new Error("This is not a supported TierScope session file.");
    }
    if (typeof file.room !== "string" || !/^[a-z0-9_-]{1,100}$/i.test(file.room) || typeof file.producerVersion !== "string" || file.producerVersion.length > 40) {
      throw new Error("Invalid session file information.");
    }
    var data = file.session;
    validateStoredSession(data);
    if (data.schemaVersion !== runtime.STORAGE_SCHEMA_VERSION || !data.history.timestamps.length || !isStorageObject(data.sessionHighs) || !isStorageNumber(data.roomTotalHigh) || !(data.sessionStartedAt === null || isStorageTimestamp(data.sessionStartedAt)) || typeof data.sessionStartEstimated !== "boolean" || !isStorageTimestamp(data.pausedElapsedTime) || typeof data.isPaused !== "boolean" || typeof data.isStopped !== "boolean" || !(data.roomTotalHighTime === null || isStorageTimestamp(data.roomTotalHighTime))) {
      throw new Error("Session file is incomplete.");
    }
    runtime.STORAGE_HISTORY_SERIES.forEach(function(key) {
      if (!data.history[key].every(Number.isSafeInteger) || !Number.isSafeInteger(data.sessionHighs[key].value)) {
        throw new Error("Session counts must be whole numbers.");
      }
    });
    var roomPeak = 0;
    data.history.timestamps.forEach(function(_, i) {
      var total = data.history.total[i] + data.history.anonymous[i];
      if (!Number.isSafeInteger(total)) throw new Error("Invalid session room total.");
      roomPeak = Math.max(roomPeak, total);
    });
    if (!Number.isSafeInteger(data.roomTotalHigh) || data.roomTotalHigh < roomPeak) throw new Error("Invalid session room high.");
    var normalized = normalizeStoredSession(data);
    var clean = { schemaVersion: runtime.STORAGE_SCHEMA_VERSION };
    [
      "timestamp",
      "history",
      "sessionStartedAt",
      "sessionStartEstimated",
      "sessionHighs",
      "roomTotalHigh",
      "roomTotalHighTime",
      "pausedElapsedTime",
      "isPaused",
      "isStopped",
      "stoppedAt",
      "stopReason"
    ].forEach(function(key) {
      clean[key] = normalized[key];
    });
    return {
      format: runtime.SESSION_FILE_FORMAT,
      formatVersion: runtime.SESSION_FILE_VERSION,
      producerVersion: file.producerVersion,
      room: file.room,
      session: clean
    };
  }

  // src/session-capture.js
  function captureSessionFile() {
    if (isPlaybackCurrent(runtime.playback) && runtime.playback.archive) return runtime.playback.archive;
    if (location.href !== runtime.lastUrl) throw new Error("No recorded session to save yet.");
    return captureLiveSessionFile();
  }
  function captureLiveSessionFile(room2 = getModelName()) {
    if (!runtime.history.timestamps.length || room2 === "unknown" || runtime.activeSessionStorageKey !== getStorageKey(room2) || room2 !== getModelNameFromUrl(runtime.lastUrl)) {
      throw new Error("No recorded session to save yet.");
    }
    var now = Date.now();
    var data = {
      schemaVersion: runtime.STORAGE_SCHEMA_VERSION,
      timestamp: now,
      history: { timestamps: runtime.history.timestamps.slice(), breaks: getHistoryBreaks(runtime.history).slice() },
      sessionStartedAt: runtime.sessionStartedAt,
      sessionStartEstimated: runtime.sessionStartEstimated,
      sessionHighs: {},
      roomTotalHigh: runtime.roomTotalHigh,
      roomTotalHighTime: runtime.roomTotalHighTime,
      pausedElapsedTime: runtime.isPaused ? runtime.pausedElapsedTime : runtime.trackingStartTime ? Math.max(0, now - runtime.trackingStartTime) : 0,
      isPaused: runtime.isPaused,
      isStopped: runtime.isStopped,
      stoppedAt: runtime.stoppedAt,
      stopReason: runtime.stopReason
    };
    runtime.STORAGE_HISTORY_SERIES.forEach(function(key) {
      data.history[key] = runtime.history[key].slice();
      data.sessionHighs[key] = getSessionHigh(key, 0);
    });
    runtime.history.timestamps.forEach(function(time, i) {
      var total = runtime.history.total[i] + runtime.history.anonymous[i];
      if (total > data.roomTotalHigh) {
        data.roomTotalHigh = total;
        data.roomTotalHighTime = time;
      }
    });
    return validateSessionFile({
      format: runtime.SESSION_FILE_FORMAT,
      formatVersion: runtime.SESSION_FILE_VERSION,
      producerVersion: runtime.TIERSCOPE_VERSION,
      room: room2,
      session: data
    });
  }

  // src/session-library.js
  var LIBRARY_PREFIX = "tierscope:library:v1:";
  var LIBRARY_CACHE_MAX_COUNT = 500;
  var LIBRARY_CACHE_MAX_BYTES = 25 * LIBRARY_MEGABYTE;
  function libraryRecordKey(id) {
    if (typeof id !== "string" || !/^[a-z0-9_-]{1,100}$/i.test(id)) throw new Error("Invalid library record.");
    return LIBRARY_PREFIX + id;
  }
  function libraryTitle(title) {
    if (typeof title !== "string" || title.length > 80 || /[\x00-\x1f]/.test(title)) throw new Error("Use a title of up to 80 characters.");
    return title.trim();
  }
  function libraryMetadata(value) {
    const favorite = value.favorite === void 0 ? false : value.favorite, notes = value.notes === void 0 ? "" : value.notes;
    if (typeof favorite !== "boolean" || typeof notes !== "string" || notes.length > 2e3 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(notes)) {
      throw new Error("Session notes must be plain text of up to 2,000 characters; favorite must be true or false.");
    }
    return __spreadProps(__spreadValues({}, value.favorite === void 0 ? {} : { favorite }), { notes });
  }
  function libraryIdentity(archive) {
    return JSON.stringify({ room: archive.room.toLowerCase(), session: __spreadProps(__spreadValues({}, archive.session), { timestamp: 0 }) });
  }
  function librarySessionKey(archive) {
    var _a;
    return archive.room.toLowerCase() + ":" + ((_a = archive.session.sessionStartedAt) != null ? _a : archive.session.history.timestamps[0]);
  }
  function compareLibrarySessions(existing, incoming) {
    if (librarySessionKey(existing) !== librarySessionKey(incoming)) return null;
    if (libraryIdentity(existing) === libraryIdentity(incoming)) return 0;
    const a = existing.session, b = incoming.session, ah = a.history, bh = b.history;
    const at = ah.timestamps, bt = bh.timestamps;
    let ai = at.indexOf(bt[0]), bi = 0;
    if (ai < 0) {
      ai = 0;
      bi = bt.indexOf(at[0]);
    }
    if (bi < 0) {
      if (a.sessionStartEstimated || b.sessionStartEstimated || !(at.at(-1) < bt[0] || bt.at(-1) < at[0])) return null;
    } else {
      const series = Object.keys(ah).filter((key) => key !== "timestamps" && key !== "breaks");
      for (; ai < at.length && bi < bt.length; ai++, bi++) {
        if (at[ai] !== bt[bi] || series.some((key) => ah[key][ai] !== bh[key][bi]) || ai > 0 && bi > 0 && ah.breaks[ai] !== bh.breaks[bi]) return null;
      }
    }
    const dominates = (left, right) => left.history.timestamps.length >= right.history.timestamps.length && left.history.timestamps.at(-1) >= right.history.timestamps.at(-1) && left.roomTotalHigh >= right.roomTotalHigh && Object.keys(right.sessionHighs).every((key) => left.sessionHighs[key].value >= right.sessionHighs[key].value);
    const newer = dominates(b, a), older = dominates(a, b);
    if (newer && older) return b.timestamp > a.timestamp ? 1 : -1;
    return newer ? 1 : older ? -1 : null;
  }
  function createLibraryReader() {
    const cache = /* @__PURE__ */ new Map();
    return { read: () => readSessionLibrary(cache), clear: () => cache.clear() };
  }
  function readSessionLibrary(cache = null) {
    const entries = [], damaged = [], unavailable = [], sessions = /* @__PURE__ */ new Map();
    let bytes = 0, cachedBytes = 0, cachedCount = 0;
    let keys;
    try {
      keys = GM_listValues().filter((key) => key.startsWith(LIBRARY_PREFIX));
    } catch (error) {
      if (cache) cache.clear();
      throw error;
    }
    if (cache) {
      const present = new Set(keys);
      for (const key of cache.keys()) if (!present.has(key)) cache.delete(key);
    }
    for (const key of keys) {
      let raw;
      try {
        raw = GM_getValue(key, void 0);
      } catch (error) {
        if (cache) cache.delete(key);
        damaged.push(key);
        unavailable.push(key);
        continue;
      }
      let cached = cache && cache.get(key);
      if (cached && cached.raw !== raw) {
        cache.delete(key);
        cached = null;
      }
      if (raw === void 0) {
        if (cache) cache.delete(key);
        continue;
      }
      let recordBytes;
      try {
        recordBytes = cached ? cached.bytes : new TextEncoder().encode(typeof raw === "string" ? raw : JSON.stringify(raw)).byteLength;
        bytes += recordBytes;
      } catch (error) {
        if (cache) cache.delete(key);
        damaged.push(key);
        unavailable.push(key);
        continue;
      }
      try {
        const id = key.slice(LIBRARY_PREFIX.length);
        let data = cached && cached.data;
        if (!data) {
          const record = JSON.parse(raw);
          if (record.schemaVersion !== 1 || !Number.isSafeInteger(record.addedAt) || record.addedAt < 0) throw new Error("Invalid library record.");
          libraryRecordKey(id);
          const lineage = record.lineage === void 0 ? id : record.lineage;
          libraryRecordKey(lineage);
          data = __spreadProps(__spreadValues({ title: libraryTitle(record.title) }, libraryMetadata(record)), { lineage, addedAt: record.addedAt, archive: validateSessionFile(record.archive) });
        }
        if (cache) {
          if (typeof raw === "string" && cachedCount < LIBRARY_CACHE_MAX_COUNT && cachedBytes + recordBytes <= LIBRARY_CACHE_MAX_BYTES) {
            if (!cached) {
              for (const values of Object.values(data.archive.session.history)) Object.freeze(values);
              cache.set(key, { raw, bytes: recordBytes, data: freezeRecordingData(data) });
            }
            cachedBytes += recordBytes;
            cachedCount++;
          } else cache.delete(key);
        }
        const entry = __spreadProps(__spreadValues({ id }, data), { records: [{ key, value: raw }] });
        const sessionKey = librarySessionKey(entry.archive), siblings = sessions.get(sessionKey) || [];
        const previous = siblings.find((other) => compareLibrarySessions(other.archive, entry.archive) !== null);
        if (previous) {
          const records = previous.records.concat(entry.records), addedAt = Math.min(previous.addedAt, entry.addedAt);
          if (compareLibrarySessions(previous.archive, entry.archive) === 1) Object.assign(previous, entry);
          previous.records = records;
          previous.addedAt = addedAt;
        } else {
          entries.push(entry);
          siblings.push(entry);
          sessions.set(sessionKey, siblings);
        }
      } catch (error) {
        if (cache) cache.delete(key);
        damaged.push(key);
      }
    }
    entries.sort((a, b) => b.archive.session.history.timestamps[0] - a.archive.session.history.timestamps[0] || b.addedAt - a.addedAt || a.id.localeCompare(b.id));
    return { entries, damaged, unavailable, bytes, count: entries.length + damaged.length };
  }
  function planLibraryAdditions(incoming, library = readSessionLibrary()) {
    const limits = readLibraryLimits();
    if (library.unavailable && library.unavailable.length) throw new Error("Some library records could not be read. Refresh the list before saving more sessions.");
    const entries = library.entries.slice(), writes = [];
    let bytes = library.bytes;
    for (const entry of incoming) {
      const archive = validateSessionFile(entry.archive);
      const index = entries.findIndex((saved) => compareLibrarySessions(saved.archive, archive) !== null);
      const previous = index >= 0 ? entries[index] : null;
      if (previous && compareLibrarySessions(previous.archive, archive) !== 1) continue;
      const title = previous ? previous.title : libraryTitle(entry.title || archive.room);
      const metadata = libraryMetadata(previous || entry);
      const id = makeStorageId();
      const addedAt = previous ? previous.addedAt : Date.now();
      const lineage = previous ? previous.lineage || previous.id : id;
      const raw = JSON.stringify(__spreadProps(__spreadValues({ schemaVersion: 1, addedAt, title }, metadata), { lineage, archive })), key = libraryRecordKey(id);
      bytes += new Blob([raw]).size;
      writes.push({ key, value: raw, id, updated: !!previous, replaces: previous ? previous.records : [] });
      const next = __spreadProps(__spreadValues({ id, title }, metadata), { lineage, addedAt, archive, records: [{ key, value: raw }] });
      if (previous) entries[index] = next;
      else entries.push(next);
    }
    if (library.count - library.entries.length + entries.length > limits.maxSessions || bytes > limits.maxMegabytes * LIBRARY_MEGABYTE) {
      throw new Error("Library full (" + limits.maxSessions.toLocaleString() + " sessions / " + limits.maxMegabytes + " MB). Raise Storage limits or export and remove sessions before saving more. Updates also need temporary space.");
    }
    return writes;
  }
  function finalizeLibraryWrites(writes) {
    for (const write of writes) for (const old of write.replaces) {
      try {
        if (GM_getValue(old.key, null) === old.value) GM_deleteValue(old.key);
      } catch (error) {
      }
    }
  }
  function keepSessionInLibrary(archive, title = "", reader2 = null) {
    const library = reader2 ? reader2.read() : readSessionLibrary(), clean = validateSessionFile(archive);
    const writes = planLibraryAdditions([{ archive: clean, title }], library);
    if (!writes.length) return {
      added: false,
      updated: false,
      id: library.entries.find((entry) => compareLibrarySessions(entry.archive, clean) !== null).id
    };
    function unchangedSource() {
      for (const old of writes[0].replaces) if (GM_getValue(old.key, void 0) !== old.value) {
        throw new Error("This session changed in another tab. Refresh or retry keeping it.");
      }
    }
    try {
      unchangedSource();
      GM_setValue(writes[0].key, writes[0].value);
      if (GM_getValue(writes[0].key, void 0) !== writes[0].value) throw new Error("The library save could not be verified. Try again.");
      verifyLibraryCapacity(reader2);
      unchangedSource();
    } catch (error) {
      try {
        if (GM_getValue(writes[0].key, null) === writes[0].value) GM_deleteValue(writes[0].key);
      } catch (cleanupError) {
        throw new Error("Library save could not be completed or undone. Refresh the list before retrying.");
      }
      throw error;
    }
    finalizeLibraryWrites(writes);
    return { added: !writes[0].updated, updated: writes[0].updated, id: writes[0].id };
  }
  function verifyLibraryCapacity(reader2 = null) {
    const limits = readLibraryLimits(), state = reader2 ? reader2.read() : readSessionLibrary();
    if (state.unavailable.length) throw new Error("Library capacity could not be checked because some records could not be read.");
    if (state.count > limits.maxSessions || state.bytes > limits.maxMegabytes * LIBRARY_MEGABYTE) throw new Error("Library limit reached, possibly by another tab. Refresh the list, raise Storage limits or remove sessions before retrying.");
  }
  function removeLibrarySession(id) {
    const key = libraryRecordKey(id), state = readSessionLibrary();
    const entry = state.entries.find((entry2) => entry2.records.some((record) => record.key === key));
    if (!entry) {
      if (state.damaged.includes(key)) GM_deleteValue(key);
      return;
    }
    for (const record of entry.records) if (GM_getValue(record.key, null) === record.value) GM_deleteValue(record.key);
  }
  function renameLibrarySession(id, title) {
    return updateLibraryMetadata(id, { title });
  }
  function updateLibraryMetadata(id, patch) {
    const limits = readLibraryLimits();
    if (!patch || Object.keys(patch).some((key2) => !["title", "notes"].includes(key2))) throw new Error("Invalid session metadata.");
    const key = libraryRecordKey(id), state = readSessionLibrary();
    if (state.unavailable.length) throw new Error("Some library records could not be read. Refresh the list before editing.");
    const entry = state.entries.find((entry2) => entry2.records.some((record) => record.key === key));
    if (!entry) throw new Error("This session changed in another tab. Refresh the list.");
    const clean = __spreadProps(__spreadValues({}, libraryMetadata(__spreadValues(__spreadValues({}, entry), patch))), { title: libraryTitle(patch.title === void 0 ? entry.title : patch.title) });
    const writes = entry.records.map((record) => __spreadProps(__spreadValues({}, record), { next: JSON.stringify(__spreadValues(__spreadValues({}, JSON.parse(record.value)), clean)) }));
    const bytes = state.bytes + writes.reduce((total, write) => total + new Blob([write.next]).size - new Blob([write.value]).size, 0);
    if (bytes > limits.maxMegabytes * LIBRARY_MEGABYTE) throw new Error("Library full. Raise Storage limits, use shorter notes or a shorter title, or remove a session.");
    const touched = [];
    try {
      for (const write of writes) {
        if (GM_getValue(write.key, null) !== write.value) throw new Error("This session changed in another tab. Refresh the list.");
        touched.push(write);
        GM_setValue(write.key, write.next);
      }
      verifyLibraryCapacity();
    } catch (error) {
      let failed = false;
      for (const write of touched.reverse()) {
        try {
          if (GM_getValue(write.key, null) === write.next) GM_setValue(write.key, write.value);
        } catch (rollbackError) {
          failed = true;
        }
      }
      if (failed) throw new Error("Some session edits could not be undone. Refresh the library before retrying.");
      throw error;
    }
  }

  // src/automatic-library.js
  var checkpointInterval = 6e4;
  var reader = createLibraryReader();
  var checkpoint = { room: "", identity: "", signature: "", phase: "", attemptedAt: null, savedAt: null, error: "" };
  function automaticLibraryStatus(room2) {
    return checkpoint.room === room2 && checkpoint.identity === room2 + ":" + runtime.sessionStartedAt + ":" + runtime.activeRoomEpoch ? __spreadValues({}, checkpoint) : { savedAt: null, error: "" };
  }
  function automaticLibraryWarning(room2) {
    const state = automaticLibraryStatus(room2);
    return state.error ? {
      saveWarning: true,
      text: "Library save pending",
      color: "var(--panel-warning)",
      title: "Automatic Library keeping could not finish. Live data remains in this tab. Open Library to retry or download a session file. " + state.error
    } : null;
  }
  function clearAutomaticLibraryStatus(room2) {
    if (checkpoint.room === room2) checkpoint = { room: room2, identity: "", signature: "", phase: "", attemptedAt: null, savedAt: null, error: "" };
    reader.clear();
  }
  function keepFavoriteSession(room2, force = false) {
    if (!room2 || room2 === "unknown" || !runtime.history.timestamps.length) return;
    try {
      const key = getStorageKey(room2);
      if (runtime.activeSessionStorageKey !== key) return;
      const identity = room2 + ":" + runtime.sessionStartedAt + ":" + runtime.activeRoomEpoch;
      if (checkpoint.identity !== identity) checkpoint = { room: room2, identity, signature: "", phase: "", attemptedAt: null, savedAt: null, error: "" };
      const preference = readModelFavorite(room2);
      if (!preference.autoKeep) {
        clearAutomaticLibraryStatus(room2);
        return;
      }
      if (getRoomEpoch(key) !== runtime.activeRoomEpoch) return;
      const history = runtime.history;
      const minimumMinutes = readAutomaticKeepingMinutes();
      checkpoint.minimumMinutes = minimumMinutes;
      checkpoint.coveredMs = recordedCoverageMs(history);
      checkpoint.waiting = checkpoint.coveredMs < minimumMinutes * 6e4;
      if (checkpoint.waiting) {
        checkpoint.error = "";
        return;
      }
      const signature = [
        history.timestamps[0],
        history.timestamps.at(-1),
        history.timestamps.length,
        runtime.isPaused,
        runtime.isStopped,
        runtime.stoppedAt
      ].join(":");
      const phase = [runtime.isPaused, runtime.isStopped, runtime.stoppedAt].join(":");
      const transition = checkpoint.phase && checkpoint.phase !== phase;
      if (!force && (signature === checkpoint.signature && !checkpoint.error || !transition && checkpoint.attemptedAt !== null && Date.now() - checkpoint.attemptedAt < checkpointInterval)) return;
      checkpoint.attemptedAt = Date.now();
      checkpoint.phase = phase;
      const archive = captureLiveSessionFile(room2);
      const result = keepSessionInLibrary(archive, "", reader);
      checkpoint.signature = signature;
      checkpoint.savedAt = Date.now();
      checkpoint.error = "";
      return result;
    } catch (error) {
      checkpoint.room = room2;
      checkpoint.error = error.message || String(error);
      return { error: checkpoint.error };
    }
  }

  // src/presentation-health.js
  var presentationFailure = null;
  function notePresentationFailure(history, generation, url, error) {
    presentationFailure = { history, generation, url, error: String(error && error.message || error) };
  }
  function getPresentationFailure(history, generation, url) {
    if (presentationFailure && (presentationFailure.history !== history || presentationFailure.generation !== generation || presentationFailure.url !== url)) presentationFailure = null;
    return presentationFailure ? presentationFailure.error : "";
  }
  function clearPresentationFailure(history, generation, url) {
    getPresentationFailure(history, generation, url);
    presentationFailure = null;
  }
  function presentationWarningModel(history, generation, url) {
    const error = getPresentationFailure(history, generation, url);
    return error ? {
      saveWarning: true,
      text: "Display needs refresh",
      color: "var(--panel-warning)",
      title: "Recorded data is retained in this tab. Drawing will retry automatically; saving is handled separately. " + error
    } : null;
  }

  // src/session-health.js
  var sessionSaveStates = /* @__PURE__ */ new Map();
  function noteSessionSave(room2, error = "") {
    const previous = sessionSaveStates.get(room2);
    sessionSaveStates.set(room2, { savedAt: error ? previous ? previous.savedAt : null : Date.now(), error });
  }
  function getSessionSaveState(room2) {
    return sessionSaveStates.get(room2) || { savedAt: null, error: "" };
  }
  function sessionSaveWarningModel(state) {
    return state.error ? {
      saveWarning: true,
      text: "Session not saved",
      title: "The latest session data is only in this tab. Keep it open and use Save to download a session file. Saving will retry on the next scan. " + state.error,
      color: "var(--panel-warning)"
    } : null;
  }

  // src/status-model.js
  function buildAcquisitionStatusModel() {
    var model = { text: "", title: "", color: null, saveWarning: false };
    if (!isBroadcastRoom()) return __spreadProps(__spreadValues({}, model), { text: "No room", title: "Live tracking is inactive on this page. Open a broadcast room to track; Library and saved-file Replay remain available." });
    var warning = sessionSaveWarningModel(getSessionSaveState(getModelName())) || automaticLibraryWarning(getModelName()) || presentationWarningModel(runtime.history, runtime.initGuard, location.href);
    if (warning) return warning;
    if (runtime.isStopped) {
      model.text = "Stopped";
      model.title = stopDescription() + " at " + new Date(runtime.stoppedAt).toLocaleString() + ". History and elapsed time are frozen.";
      return model;
    }
    if (runtime.sessionStorageNotice) {
      model.text = "Local only • room reset";
      model.title = runtime.sessionStorageNotice;
      return model;
    }
    var policyMessage = requestPolicyMessage(readRequestPolicy());
    if (policyMessage) {
      var sample = runtime.lastAcceptedAcquisition || runtime.restoredDisplayFrame;
      model.text = policyMessage;
      model.title = policyMessage + (sample ? ". Last sample: " + new Date(sample.timestamp).toISOString() : ". No accepted sample.");
      return model;
    }
    if (isAbsencePaused()) {
      model.text = "Auto-paused • return checks";
      model.title = absencePauseDescription();
      return model;
    }
    if (!runtime.lastAcceptedAcquisition) {
      if (runtime.restoredDisplayFrame) {
        model.text = "Saved • " + formatSampleAge(runtime.restoredDisplayFrame.timestamp);
        model.title = "Saved sample recorded at: " + new Date(runtime.restoredDisplayFrame.timestamp).toISOString() + ". Age is measured from the sample time, not the session save time. Waiting for the first fresh sample since restore.";
      } else {
        model.text = "No sample";
        model.title = "No accepted sample in this page session";
      }
      return model;
    }
    model.text = runtime.lastAcceptedAcquisition.source + " • " + formatSampleAge(runtime.lastAcceptedAcquisition.timestamp);
    model.title = "Last accepted sample: " + new Date(runtime.lastAcceptedAcquisition.timestamp).toISOString() + ". TierScope and the USERS tab refresh independently.";
    return model;
  }
  function buildFreshnessModel() {
    var model = { text: "", title: "", color: null, saveWarning: false };
    if (!isBroadcastRoom()) return __spreadProps(__spreadValues({}, model), { text: "No room", title: "Live tracking is inactive on this page. Open a broadcast room to track; Library and saved-file Replay remain available." });
    var warning = sessionSaveWarningModel(getSessionSaveState(getModelName())) || automaticLibraryWarning(getModelName()) || presentationWarningModel(runtime.history, runtime.initGuard, location.href);
    if (warning) return warning;
    if (runtime.isStopped) {
      model.text = "Stopped";
      model.title = stopDescription() + ". Start begins a new session.";
      model.color = "var(--panel-muted)";
      return model;
    }
    if (isAbsencePaused() && !runtime.sessionStorageNotice) {
      var waitingPolicy = requestPolicyMessage(readRequestPolicy());
      model.text = waitingPolicy || "Auto-paused";
      model.title = absencePauseDescription() + (waitingPolicy ? " " + waitingPolicy + "." : " Next return check: " + runtime.countdownSeconds + "s.");
      model.color = "var(--panel-warning)";
      return model;
    }
    var sample = runtime.lastAcceptedAcquisition || runtime.restoredDisplayFrame;
    var source = runtime.lastAcceptedAcquisition ? runtime.lastAcceptedAcquisition.source : sample ? "Saved" : "No sample";
    model.text = runtime.sessionStorageNotice ? "Local only" : (runtime.isAutoRefreshOn ? source : "Paused") + (sample ? " · " + formatSampleAge(sample.timestamp) : "");
    model.color = runtime.sessionStorageNotice ? "var(--panel-warning)" : runtime.isAutoRefreshOn ? "var(--panel-muted)" : "var(--panel-paused)";
    var policyMessage = requestPolicyMessage(readRequestPolicy());
    if (policyMessage && !runtime.sessionStorageNotice) {
      model.text = policyMessage;
      model.color = "var(--panel-warning)";
    }
    if (!policyMessage && runtime.isAutoRefreshOn && getEffectiveScanIntervalSeconds() > runtime.scanIntervalSeconds) {
      model.text = "Reduced · " + getEffectiveScanIntervalSeconds() / 60 + "m";
    }
    model.title = runtime.sessionStorageNotice || (policyMessage ? policyMessage + ". " : "") + source + (sample ? ": " + new Date(sample.timestamp).toISOString() : "") + ". Age of the last accepted sample. " + (runtime.isAutoRefreshOn ? "Next attempt: " + runtime.countdownSeconds + "s." : "Automatic scans paused.");
    return model;
  }

  // src/theme-values.js
  function themeColor(token) {
    return runtime.PANEL_THEME_COLORS[token][runtime.isDarkMode ? 0 : 1];
  }
  function setThemeVariables(element) {
    if (!element) return;
    Object.keys(runtime.PANEL_THEME_COLORS).forEach(function(token) {
      element.style.setProperty("--panel-" + token, themeColor(token));
    });
    element.style.colorScheme = runtime.isDarkMode ? "dark" : "light";
  }

  // src/display-model.js
  function buildLiveDisplayFrame() {
    return runtime.restoredDisplayFrame || liveDisplayData(runtime, Object.keys(runtime.TIERS));
  }
  function buildPanelDisplayModel(frame) {
    const displayHighs = {};
    const highlights = __spreadValues({}, frame.isPlayback || frame.isRestored ? frame.playbackNewHighTiers : runtime.newHighTiers);
    if (runtime.highMode === "ath") for (const key of Object.keys(highlights)) delete highlights[key];
    for (const key of runtime.ALL_TIME_SERIES) {
      const value = key === "roomTotal" ? frame.fullRoomTotal : key === "withTokens" ? frame.withTokens : key === "total" ? frame.total : key === "anonymous" ? frame.anonymousCount : frame.counts[key];
      const high = getDisplayHigh(frame, key, value);
      displayHighs[key] = __spreadProps(__spreadValues({}, high), { label: highLabel(high), shortLabel: highLabel(high, true), description: highDescription(high) });
      if (runtime.highMode === "ath" && high.source && value > 0 && value >= high.value) highlights[key] = true;
    }
    const comparison = !frame.isRestored && runtime.hasTrendBaseline ? getComparisonCounts().counts : null;
    const modelName = frame.isPlayback && runtime.playback && runtime.playback.archive ? runtime.playback.archive.room : getModelName();
    let favorite = { favorite: false, autoKeep: false };
    if (modelName !== "unknown") {
      try {
        favorite = readModelFavorite(modelName);
      } catch (error) {
        favorite = __spreadProps(__spreadValues({}, favorite), { error: "Favorite unavailable. Open Library and refresh to retry." });
      }
    }
    if (runtime.highMode !== "ath" && frame.fullRoomTotal > 0 && frame.fullRoomTotal >= frame.roomTotalHigh) highlights.roomTotal = true;
    return freezeRecordingData({
      counts: __spreadValues({}, frame.counts),
      genderCounts: frame.genderCounts ? __spreadValues({}, frame.genderCounts) : null,
      total: frame.total,
      withTokens: frame.withTokens,
      anonymousCount: frame.anonymousCount,
      fullRoomTotal: frame.fullRoomTotal,
      roomTotalHigh: frame.roomTotalHigh,
      history: captureDisplayHistory(frame.history),
      historyEndIndex: frame.historyEndIndex,
      isPlayback: frame.isPlayback === true,
      isRestored: frame.isRestored === true,
      displayHighs,
      highlights,
      stopped: runtime.isStopped,
      minimized: runtime.isMinimized,
      replayRoom: frame.isPlayback && runtime.playback && runtime.playback.archive ? runtime.playback.archive.room : "",
      imported: !!(frame.isPlayback && runtime.playback && runtime.playback.imported),
      tierKeys: Object.keys(runtime.TIERS),
      rows: runtime.PANEL_ROWS.map((row) => __spreadValues({}, row)),
      roomName: getModelName(),
      modelName,
      favorite,
      miniMetric: runtime.miniMetric,
      highMode: runtime.highMode,
      textColor: themeColor("text"),
      withTokensColor: themeColor("warning"),
      roomTotalColor: themeColor("accent"),
      comparison: comparison ? __spreadValues({}, comparison) : null,
      comparisonLabel: runtime.trendComparisonMode === "last" ? "previous sample" : runtime.trendComparisonMode === "start" ? "first retained sample" : runtime.trendComparisonMode,
      freshness: runtime.isMinimized ? buildFreshnessModel() : null
    });
  }
  function buildTrendDisplayModel() {
    const frame = buildLiveDisplayFrame(), comparison = getComparisonCounts();
    return freezeRecordingData({
      isPlayback: runtime.presentationMode === "PLAYBACK",
      isRestored: !!runtime.restoredDisplayFrame,
      stopped: runtime.isStopped,
      hasTrendBaseline: runtime.hasTrendBaseline,
      counts: __spreadValues({}, frame.counts),
      total: frame.total,
      withTokens: frame.withTokens,
      anonymousCount: frame.anonymousCount,
      fullRoomTotal: frame.fullRoomTotal,
      historyLength: runtime.history.timestamps.length,
      comparison: __spreadProps(__spreadValues({}, comparison), { counts: comparison.counts ? __spreadValues({}, comparison.counts) : null }),
      tierLabels: Object.fromEntries(runtime.PANEL_ROWS.map((row) => [row.key, row.label])),
      tierMarkers: Object.fromEntries(Object.keys(runtime.TIERS).map((key) => [key, getTierMarker(key)]))
    });
  }

  // src/chart-view.js
  var chartSampleCache = /* @__PURE__ */ new WeakMap();
  function chartSamples(values) {
    if (!values || !Object.isFrozen(values)) return values;
    let cached = chartSampleCache.get(values);
    if (!cached) {
      cached = Array.from(values);
      chartSampleCache.set(values, cached);
    }
    return cached;
  }
  function buildChartPlot(values, times, breaks, width, lastIndex, windowMs, replayProgress) {
    values = chartSamples(values);
    breaks = chartSamples(breaks);
    var end = Math.min(values.length, times.length) - 1;
    if (Number.isInteger(lastIndex)) end = Math.min(end, lastIndex);
    if (end < 0) return { points: [], min: 0, max: 0, end: -1 };
    var axis = getChartTimes(times);
    var progress = end + 1 < Math.min(values.length, times.length) && Number.isFinite(replayProgress) ? Math.max(0, Math.min(1, replayProgress)) : 0;
    var endTime = axis[end] + (progress ? (axis[end + 1] - axis[end]) * progress : 0);
    var startTime = windowMs ? Math.max(axis[0], endTime - windowMs) : axis[0];
    var start = 0;
    while (start < end && axis[start] < startTime) start++;
    var firstDrawn = start > 0 && axis[start] > startTime ? start - 1 : start, span = endTime - startTime;
    var min = Infinity, max = -Infinity, points = [], bucket = null, breakNext = true;
    function flush() {
      if (!bucket) return;
      var indices = [bucket.first, bucket.low, bucket.high, bucket.last].sort(function(a, b) {
        return a - b;
      });
      indices.forEach(function(index, j) {
        if (j && index === indices[j - 1]) return;
        points.push({
          index,
          x: span ? (axis[index] - startTime) / span * width : width / 2,
          value: values[index],
          move: breakNext
        });
        breakNext = false;
      });
      bucket = null;
    }
    for (var i = firstDrawn; i <= end; i++) {
      var value = values[i];
      min = Math.min(min, value);
      max = Math.max(max, value);
      var column = span ? Math.floor((axis[i] - startTime) / span * width) : 0;
      if (breaks && breaks[i]) {
        flush();
        breakNext = true;
      }
      if (!bucket || bucket.column !== column) {
        flush();
        bucket = { column, first: i, last: i, low: i, high: i };
      } else {
        bucket.last = i;
        if (value < values[bucket.low]) bucket.low = i;
        if (value > values[bucket.high]) bucket.high = i;
      }
    }
    flush();
    var continuation = progress ? {
      fromX: span ? (axis[end] - startTime) / span * width : width / 2,
      toX: span ? width : width / 2,
      fromValue: values[end],
      value: values[end] + (values[end + 1] - values[end]) * progress,
      gap: !!(breaks && breaks[end + 1]),
      progress
    } : null;
    return {
      points,
      min,
      max,
      start,
      end,
      startTime,
      endTime,
      continuation
    };
  }
  function hideChartTooltip() {
    var tooltip = document.getElementById("tierscope-chart-tooltip");
    if (tooltip) tooltip.style.display = "none";
  }
  function nearestChartSample(times, end, target) {
    var low = 0, high = end + 1;
    while (low < high) {
      var middle = Math.floor((low + high) / 2);
      if (times[middle] <= target) low = middle + 1;
      else high = middle;
    }
    if (low === 0) return 0;
    if (low > end) return end;
    return target - times[low - 1] <= times[low] - target ? low - 1 : low;
  }
  function showChartTooltip(canvas, index, clientX, clientY, gapIndex) {
    var model = canvas._tierScopeChart;
    if (!model || model.plot.end < 0) return;
    var firstIndex = model.firstIndex || 0;
    index = Math.max(firstIndex, Math.min(model.plot.end, index));
    canvas._tierScopeIndex = index;
    var tooltip = document.getElementById("tierscope-chart-tooltip");
    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.id = "tierscope-chart-tooltip";
      tooltip.setAttribute("role", "tooltip");
      tooltip.style.cssText = "position:fixed;z-index:2147483647;pointer-events:none;max-width:310px;padding:7px 9px;background:var(--panel-tooltip);color:var(--panel-text);border:1px solid #a36acb;border-radius:5px;font:12px/1.5 Arial,sans-serif;white-space:pre-line;box-shadow:0 3px 12px #0008;";
      document.body.appendChild(tooltip);
    }
    setThemeVariables(tooltip);
    tooltip.textContent = gapIndex > 0 ? model.label + "\nNo samples recorded during this interval.\n" + new Date(model.times[gapIndex - 1]).toLocaleString() + " – " + new Date(model.times[gapIndex]).toLocaleString() + "\nOrange dashes connect recorded endpoints only." : model.label + " · " + model.values[index].toLocaleString() + "\n" + new Date(model.times[index]).toLocaleString() + "\nRange: " + model.plot.min.toLocaleString() + "–" + model.plot.max.toLocaleString() + " · Sample " + (index - firstIndex + 1) + "/" + (model.plot.end - firstIndex + 1);
    tooltip.style.display = "block";
    var rect = tooltip.getBoundingClientRect();
    tooltip.style.left = Math.max(4, Math.min(clientX + 12, window.innerWidth - rect.width - 4)) + "px";
    tooltip.style.top = Math.max(4, Math.min(clientY + 12, window.innerHeight - rect.height - 4)) + "px";
  }
  function bindChartInspection(canvas, model) {
    canvas._tierScopeChart = model;
    canvas.setAttribute("tabindex", "0");
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-describedby", "tierscope-chart-tooltip");
    canvas.setAttribute("aria-label", model.label + " history. " + (model.plot.end < 0 ? "No samples." : "Range " + model.plot.min + " to " + model.plot.max + ". " + (model.plot.end - (model.firstIndex || 0) + 1) + " samples. Orange dashes mark intervals with no recorded samples. Use Left and Right arrows to inspect samples; Home and End to jump; Escape to close."));
    if (canvas._tierScopeBound) return;
    canvas._tierScopeBound = true;
    canvas.addEventListener("pointermove", function(event) {
      var m = canvas._tierScopeChart;
      if (m.plot.end < 0) return;
      var rect = canvas.getBoundingClientRect();
      var fraction = Math.max(0, Math.min(1, ((event.clientX - rect.left) / rect.width * m.width - 2) / (m.width - 4)));
      var time = m.plot.startTime + fraction * (m.plot.endTime - m.plot.startTime);
      var axis = getChartTimes(m.times), index = nearestChartSample(axis, m.plot.end, time);
      var next = axis[index] > time ? index : index + 1;
      var gapEnd = m.plot.end + (m.plot.continuation ? 1 : 0);
      var gap = next > 0 && next <= gapEnd && m.breaks[next] && time > axis[next - 1] && time < axis[next];
      showChartTooltip(canvas, index, event.clientX, event.clientY, gap ? next : 0);
    });
    canvas.addEventListener("pointerleave", hideChartTooltip);
    canvas.addEventListener("blur", hideChartTooltip);
    canvas.addEventListener("focus", function() {
      var rect = canvas.getBoundingClientRect();
      showChartTooltip(canvas, canvas._tierScopeChart.plot.end, rect.left + rect.width / 2, rect.top + rect.height, false);
    });
    canvas.addEventListener("keydown", function(event) {
      if (event.key === "Escape") {
        hideChartTooltip();
        event.stopPropagation();
        return;
      }
      var end = canvas._tierScopeChart.plot.end, index = canvas._tierScopeIndex === void 0 ? end : canvas._tierScopeIndex;
      if (event.key === "ArrowLeft") index--;
      else if (event.key === "ArrowRight") index++;
      else if (event.key === "Home") index = 0;
      else if (event.key === "End") index = end;
      else return;
      event.preventDefault();
      event.stopPropagation();
      var rect = canvas.getBoundingClientRect();
      showChartTooltip(canvas, index, rect.left + rect.width / 2, rect.top + rect.height, false);
    });
  }
  function drawCanvasChart(ctx, points, color) {
    ctx.save();
    ctx.strokeStyle = themeColor("gap");
    ctx.lineWidth = 1.5;
    ctx.lineCap = "butt";
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    points.forEach(function(point, i) {
      if (i && point.move) {
        ctx.moveTo(points[i - 1].x, points[i - 1].y);
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.setLineDash([]);
    ctx.beginPath();
    points.forEach(function(point, i) {
      if (point.move) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
      if (point.move && (i === points.length - 1 || points[i + 1].move)) ctx.fillRect(point.x - 1.5, point.y - 1.5, 3, 3);
    });
    ctx.stroke();
  }
  function drawSparkline(canvasId, data, color, customHeight, times, breaks, lastIndex, label, replayProgress) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var scale = Math.max(1, (runtime.currentScale || 1) * (window.devicePixelRatio || 1));
    var height = customHeight || 28;
    canvas.style.width = "105px";
    canvas.style.minWidth = "0";
    canvas.style.height = height + "px";
    var width = canvas.clientWidth || 105;
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    ctx.scale(scale, scale);
    ctx.clearRect(0, 0, width, height);
    var plot = buildChartPlot(data, times, breaks, Math.max(1, width - 4), lastIndex, runtime.CHART_WINDOWS[runtime.chartWindowMode], replayProgress);
    bindChartInspection(canvas, { values: data, times, breaks, firstIndex: plot.start || 0, plot, width, label });
    var continuation = plot.continuation;
    var min = continuation ? Math.min(plot.min, continuation.value) : plot.min;
    var max = continuation ? Math.max(plot.max, continuation.value) : plot.max;
    function y(value) {
      return max === min ? height / 2 : height - 2 - (value - min) / (max - min) * (height - 4);
    }
    ctx.strokeStyle = color;
    ctx.save();
    ctx.beginPath();
    ctx.rect(2, 0, width - 2, height);
    ctx.clip();
    drawCanvasChart(ctx, plot.points.map(function(point) {
      return {
        x: 2 + point.x,
        y: y(point.value),
        move: point.move
      };
    }), color);
    if (continuation) {
      ctx.save();
      ctx.strokeStyle = continuation.gap ? themeColor("gap") : color;
      ctx.lineWidth = continuation.gap ? 1.5 : 2;
      ctx.setLineDash(continuation.gap ? [4, 3] : []);
      ctx.lineDashOffset = continuation.gap ? -continuation.progress * 14 : 0;
      ctx.beginPath();
      ctx.moveTo(2 + continuation.fromX, y(continuation.fromValue));
      ctx.lineTo(2 + continuation.toX, y(continuation.value));
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // src/display-values.js
  function displayHigh(frame, key) {
    return frame.displayHighs[key];
  }
  function displayHighLabel(high, compact) {
    return compact ? high.shortLabel : high.label;
  }
  function displayHighDescription(high) {
    return high.description;
  }
  function anonymousRegisteredRatio(anonymous, registered) {
    if (!Number.isFinite(anonymous) || !Number.isFinite(registered) || anonymous < 0 || registered <= 0) return "—";
    const ratio = anonymous / registered;
    return ratio >= 0.95 && ratio <= 1.05 ? "1:1" : ratio.toFixed(1) + "x";
  }
  function femaleTransDescription(frame) {
    return frame.genderCounts ? "Female: " + frame.genderCounts.female.toLocaleString() + "\nTrans: " + frame.genderCounts.trans.toLocaleString() : "Female / trans: " + frame.counts["female-trans"].toLocaleString() + "\nSeparate female/trans counts unavailable in this saved sample.";
  }

  // src/status-view.js
  function renderStatus(element, model) {
    if (!element) return;
    if (model.saveWarning) element.dataset.sessionSaveWarning = "true";
    else if (element.dataset.sessionSaveWarning) {
      element.style.color = "";
      delete element.dataset.sessionSaveWarning;
    }
    element.textContent = model.text;
    element.title = model.title;
    if (model.color !== null) element.style.color = model.color;
  }

  // src/compact-view.js
  function updateCompactDashboard(frame) {
    if (!frame.minimized) return;
    var comparison = frame.comparison;
    var mode = frame.comparisonLabel;
    function delta(id, value, old) {
      var el = document.getElementById(id);
      if (!el) return "";
      var change = comparison ? value - old : null;
      var text = change === null ? "" : change > 0 ? "+" + compactNumber(change) : change < 0 ? "−" + compactNumber(-change) : "0";
      el.textContent = text;
      el.style.color = change > 0 ? "var(--panel-delta-up)" : change < 0 ? "var(--panel-delta-down)" : "var(--panel-warning)";
      el.title = change === null ? "Waiting for a fresh sample and comparison history" : "Change versus " + mode + ": " + change;
      return text;
    }
    delta("mini-withtokens-change", frame.withTokens, comparison && comparison.withTokens);
    delta("mini-total-change", frame.total, comparison && comparison.total);
    var roomChange = delta("mini-room-change", frame.fullRoomTotal, comparison && comparison.total + comparison.anonymous);
    var roomCount = document.getElementById("mini-room-count");
    if (roomCount) {
      roomCount.textContent = compactNumber(frame.fullRoomTotal);
      roomCount.title = frame.roomName + " — Room total: " + frame.fullRoomTotal.toLocaleString() + "; " + displayHighDescription(displayHigh(frame, "roomTotal", frame.fullRoomTotal)) + (roomChange ? "; change: " + roomChange + " versus " + mode : "");
    }
    ["withtokens", "total"].forEach(function(key) {
      var el = document.getElementById("mini-" + key);
      var value = key === "total" ? frame.total : frame.withTokens;
      if (el) {
        el.textContent = compactNumber(value);
        el.title = value.toLocaleString() + (key === "total" ? " registered users" : " users in token-classified tiers");
      }
    });
    var label = document.getElementById("mini-metric");
    var names = { room: "Room total", withTokens: "With Tokens", total: "Registered" };
    if (label) {
      label.textContent = (frame.miniMetric === "room" ? "Room total" : frame.miniMetric === "withTokens" ? "💎" : "📊") + " ▾";
      label.setAttribute("aria-label", names[frame.miniMetric] + " chart. Activate to change metric.");
      label.title = "Click to cycle Room total, With Tokens, and Registered. Showing the last 15 recorded minutes.";
    }
    var high = document.getElementById("mini-high");
    var peak = displayHigh(
      frame,
      frame.miniMetric === "room" ? "roomTotal" : frame.miniMetric,
      frame.miniMetric === "room" ? frame.fullRoomTotal : frame[frame.miniMetric]
    );
    if (high) {
      high.textContent = displayHighLabel(peak, true);
      high.title = displayHighDescription(peak) + ". Click to switch SH/ATH.";
      high.setAttribute("aria-label", high.title);
      high.setAttribute("aria-pressed", String(frame.highMode === "ath"));
    }
    var canvas = document.getElementById("mini-chart");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var width = 140, height = 36, scale = window.devicePixelRatio || 1;
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    ctx.scale(scale, scale);
    ctx.clearRect(0, 0, width, height);
    var times = frame.history.timestamps;
    canvas.title = names[frame.miniMetric] + " — last 15 recorded minutes; vertical scale fits the plotted values";
    if (!times.length) {
      bindChartInspection(canvas, { values: [], times: [], breaks: [], plot: { end: -1 }, width, label: names[frame.miniMetric] });
      return;
    }
    var end = times[times.length - 1], start = end - 15 * 6e4;
    var breaks = getHistoryBreaks(frame.history);
    var points = [], firstVisible = times.findIndex(function(time) {
      return time >= start;
    });
    var firstDrawn = firstVisible > 0 && breaks[firstVisible] ? firstVisible - 1 : firstVisible;
    times.forEach(function(time, i) {
      if (i >= firstDrawn && time <= end) points.push({ time, move: breaks[i], value: frame.miniMetric === "room" ? frame.history.total[i] + frame.history.anonymous[i] : frame.history[frame.miniMetric][i] });
    });
    var values = points.map(function(p) {
      return p.value;
    });
    var firstIndex = points[0].time < start ? 1 : 0;
    var visibleValues = values.slice(firstIndex);
    var min = Math.min.apply(null, values), max = Math.max.apply(null, values);
    canvas.title += "; range " + min + "–" + max + "; " + visibleValues.length + " samples through " + new Date(end).toISOString() + ". Orange dashes: no samples recorded during the interval.";
    bindChartInspection(canvas, {
      values,
      times: points.map(function(p) {
        return p.time;
      }),
      breaks: points.map(function(p) {
        return p.move;
      }),
      firstIndex,
      plot: { min, max, end: points.length - 1, startTime: start, endTime: end },
      width,
      label: names[frame.miniMetric]
    });
    points.forEach(function(point, i) {
      point.x = 2 + (point.time - start) / (15 * 6e4) * (width - 4);
      point.y = max === min ? height / 2 : height - 3 - (point.value - min) / (max - min) * (height - 6);
      point.move = i === 0 || point.move;
    });
    var color = frame.miniMetric === "withTokens" ? frame.withTokensColor : frame.miniMetric === "total" ? frame.textColor : frame.roomTotalColor;
    ctx.strokeStyle = color;
    ctx.save();
    ctx.beginPath();
    ctx.rect(2, 0, width - 2, height);
    ctx.clip();
    drawCanvasChart(ctx, points, color);
    ctx.restore();
    renderStatus(document.getElementById("mini-freshness"), frame.freshness);
  }

  // src/favorite-view.js
  function paintFavoriteButton(button, room2, state) {
    button.dataset.favoriteRoom = room2;
    button.textContent = state.favorite ? "★" : "☆";
    button.disabled = room2 === "unknown" || !!state.error;
    button.setAttribute("aria-pressed", String(!!state.favorite));
    button.setAttribute("aria-label", (state.favorite ? "Remove favorite " : "Favorite ") + room2);
    button.title = state.error || (state.favorite ? state.autoKeep ? "Favorite · automatic keeping on. Click to remove favorite." : "Favorite · automatic keeping off. Enable in Library, or click to remove favorite." : "Favorite this model and automatically keep live sessions in Library. Asks for confirmation.");
    button.style.color = state.favorite ? "var(--panel-accent)" : "var(--panel-muted)";
  }

  // src/panel-view.js
  function paintPanelFrame(frame) {
    var counts = frame.counts;
    var total = frame.total;
    var withTokens = frame.withTokens;
    var anonymousCount = frame.anonymousCount;
    var fullRoomTotal = frame.fullRoomTotal;
    var roomTotalHigh = frame.roomTotalHigh;
    var displayHistory = frame.history;
    var highlights = frame.highlights;
    updateCollapsedRowStatus(frame, highlights);
    var genderRow = document.getElementById("tier-row-female-trans");
    if (genderRow) genderRow.title = femaleTransDescription(frame);
    var withTokensPct = total > 0 ? Math.round(withTokens / total * 100) + "%" : "0%";
    var registeredPct = fullRoomTotal > 0 ? Math.round(total / fullRoomTotal * 100) + "%" : "0%";
    var headerText = document.getElementById("header-text");
    if (headerText) {
      headerText.textContent = frame.modelName === "unknown" ? "TierScope" : frame.modelName;
      headerText.title = (frame.isPlayback ? "Replay: " : frame.stopped ? "Stopped session: " : frame.isRestored ? "Saved session: " : "Live room: ") + frame.modelName;
    }
    var favorite = document.getElementById("btn-model-favorite");
    if (favorite) paintFavoriteButton(favorite, frame.modelName, frame.favorite);
    var miniWithTokens = document.getElementById("mini-withtokens");
    var miniWithTokensPct = document.getElementById("mini-withtokens-pct");
    var miniTotal = document.getElementById("mini-total");
    var miniTotalPct = document.getElementById("mini-total-pct");
    if (miniWithTokens) miniWithTokens.textContent = withTokens;
    if (miniWithTokensPct) miniWithTokensPct.textContent = withTokensPct;
    if (miniTotal) miniTotal.textContent = total;
    if (miniTotalPct) miniTotalPct.textContent = registeredPct;
    var miniChange = document.getElementById("mini-room-change");
    if (miniChange) miniChange.style.display = frame.minimized ? "inline" : "none";
    if (miniWithTokens) miniWithTokens.parentElement && (miniWithTokens.parentElement.title = "With Tokens: " + withTokens.toLocaleString() + " (" + withTokensPct + " of registered users)");
    if (miniTotal) miniTotal.parentElement && (miniTotal.parentElement.title = "Registered: " + total.toLocaleString() + " (" + registeredPct + " of room total)");
    updateCompactDashboard(frame);
    if (!frame.minimized) {
      var roomCount = document.getElementById("count-roomTotal"), roomHigh = document.getElementById("high-roomTotal");
      var roomRow = document.getElementById("tier-row-roomTotal"), roomResult = displayHigh(frame, "roomTotal");
      if (roomCount) {
        roomCount.textContent = fullRoomTotal.toLocaleString();
        roomCount.style.fontSize = fullRoomTotal >= 1e5 ? "9px" : fullRoomTotal >= 1e4 ? "11px" : "14px";
      }
      if (roomHigh) {
        roomHigh.textContent = displayHighLabel(roomResult, true);
        roomHigh.title = displayHighDescription(roomResult);
      }
      if (roomRow) roomRow.style.background = highlights.roomTotal ? "rgba(50, 205, 50, 0.22)" : "rgba(255,105,180,.08)";
      frame.tierKeys.forEach(function(tier) {
        var countEl = document.getElementById("count-" + tier);
        var highEl = document.getElementById("high-" + tier);
        var rowEl = document.getElementById("tier-row-" + tier);
        var currentVal = counts[tier];
        var highResult = displayHigh(frame, tier, currentVal);
        if (countEl) countEl.textContent = currentVal;
        if (highEl) {
          highEl.textContent = displayHighLabel(highResult, true);
          highEl.title = displayHighDescription(highResult);
        }
        if (rowEl) {
          if (highlights && highlights[tier]) {
            rowEl.style.background = "rgba(50, 205, 50, 0.22)";
          } else {
            rowEl.style.background = "rgba(var(--panel-row-rgb),calc(0.05 * var(--tier-background-scale, 1)))";
          }
        }
      });
      var withTokensCountEl = document.getElementById("count-withtokens");
      var withTokensPctEl = document.getElementById("pct-withtokens");
      var withTokensHighEl = document.getElementById("high-withtokens");
      var withTokensRowEl = document.getElementById("tier-row-withtokens");
      var withTokensResult = displayHigh(frame, "withTokens", withTokens);
      if (withTokensCountEl) withTokensCountEl.textContent = withTokens;
      if (withTokensPctEl) withTokensPctEl.textContent = withTokensPct;
      if (withTokensHighEl) {
        withTokensHighEl.textContent = displayHighLabel(withTokensResult, true);
        withTokensHighEl.title = displayHighDescription(withTokensResult);
      }
      if (withTokensRowEl) {
        if (highlights && highlights["withTokens"]) {
          withTokensRowEl.style.background = "rgba(50, 205, 50, 0.22)";
        } else {
          withTokensRowEl.style.background = "rgba(255,212,59,0.15)";
        }
      }
      var totalEl = document.getElementById("count-total");
      var totalHighEl = document.getElementById("high-total");
      var totalRowEl = document.getElementById("tier-row-total");
      var totalResult = displayHigh(frame, "total", total);
      if (totalEl) totalEl.textContent = total;
      if (totalHighEl) {
        totalHighEl.textContent = displayHighLabel(totalResult, true);
        totalHighEl.title = displayHighDescription(totalResult);
      }
      if (totalRowEl) {
        if (highlights && highlights["total"]) {
          totalRowEl.style.background = "rgba(50, 205, 50, 0.22)";
        } else {
          totalRowEl.style.background = "rgba(var(--panel-row-rgb),0.1)";
        }
      }
      var fullAnonText = document.getElementById("anon-ratio-full");
      var anonHighEl = document.getElementById("high-anon");
      var anonRowEl = document.getElementById("tier-row-anon");
      var anonResult = displayHigh(frame, "anonymous", anonymousCount);
      if (fullAnonText) {
        var anonLabel = anonymousCount > 0 ? anonymousCount.toLocaleString() : "0";
        var digits = String(Math.abs(anonymousCount)).length;
        fullAnonText.textContent = anonLabel;
        fullAnonText.style.fontSize = digits >= 6 ? "9px" : digits === 5 ? "11px" : "13px";
      }
      var anonRatio = document.getElementById("anon-registered-ratio");
      if (anonRatio) {
        var ratioLabel = anonymousRegisteredRatio(anonymousCount, total);
        anonRatio.textContent = ratioLabel;
        anonRatio.style.fontSize = ratioLabel.length > 7 ? "8px" : "9px";
        anonRatio.title = "Anons / registered viewers: " + ratioLabel + ". " + (total > 0 ? anonymousCount.toLocaleString() + " / " + total.toLocaleString() + ". 1:1 means within 5% of equal." : "No registered viewers; ratio unavailable.");
        anonRatio.setAttribute("aria-label", anonRatio.title);
      }
      if (anonHighEl) {
        anonHighEl.textContent = displayHighLabel(anonResult, true);
        anonHighEl.title = displayHighDescription(anonResult);
      }
      if (anonRowEl) {
        if (highlights && highlights["anonymous"]) {
          anonRowEl.style.background = "rgba(50, 205, 50, 0.22)";
        } else {
          anonRowEl.style.background = "rgba(136,136,136,0.15)";
        }
      }
    }
  }
  function updateCollapsedRowStatus(frame, highlights) {
    frame.rows.forEach(function(row) {
      var button = document.getElementById("restore-row-" + row.key);
      if (!button) return;
      var value = row.key === "withtokens" ? frame.withTokens : row.key === "total" ? frame.total : row.key === "anon" ? frame.anonymousCount : row.key === "roomTotal" ? frame.fullRoomTotal : frame.counts[row.key];
      var historyKey = row.key === "withtokens" ? "withTokens" : row.key === "anon" ? "anonymous" : row.key;
      var high = displayHigh(frame, historyKey, value);
      var context = frame.isPlayback ? "Replay" : frame.isRestored ? "Saved sample" : "Latest sample";
      button.title = row.label + ": " + value.toLocaleString() + " (" + displayHighLabel(high) + "). " + displayHighDescription(high) + ". " + context + ". Click to restore row.";
      if (row.key === "female-trans") button.title += "\n" + femaleTransDescription(frame);
      button.setAttribute("aria-label", "Restore " + row.label + " row. " + context + ": " + value.toLocaleString());
      button.style.background = highlights && highlights[historyKey] ? "rgba(50, 205, 50, 0.22)" : "rgba(var(--panel-row-rgb),calc(0.05 * var(--tier-background-scale, 1)))";
    });
  }

  // src/trend-view.js
  function renderTrendDisplay(model) {
    if (model.isPlayback) return;
    var trendContainer = document.getElementById("trend-container");
    var trendHeaderLabel = document.getElementById("trend-header-label");
    if (!trendContainer) return;
    if (model.isRestored) {
      trendContainer.innerHTML = '<div style="font-size:8px;color:var(--panel-muted);text-align:center;padding:8px;">' + (model.stopped ? "Session stopped — history remains available in Replay." : "Saved snapshot — trends resume after a new sample.") + "</div>";
      if (trendHeaderLabel) trendHeaderLabel.textContent = "📈 TREND";
      return;
    }
    if (!model.hasTrendBaseline) {
      trendContainer.innerHTML = '<div style="font-size:8px;color:var(--panel-faint);text-align:center;padding:8px;">Waiting for scan...</div>';
      if (trendHeaderLabel) trendHeaderLabel.textContent = "📈 TREND";
      return;
    }
    var counts = model.counts, total = model.total, withTokens = model.withTokens, anonymousCount = model.anonymousCount;
    var comparison = model.comparison;
    var comparisonCounts = comparison.counts;
    var shortSession = comparison.short;
    var actualMinutes = comparison.actualMinutes;
    if (!comparisonCounts) {
      var waitingText = model.historyLength === 1 ? "Waiting for second scan..." : "Waiting for scan...";
      trendContainer.innerHTML = '<div style="font-size:8px;color:var(--panel-faint);text-align:center;padding:8px;">' + waitingText + "</div>";
      if (trendHeaderLabel) trendHeaderLabel.textContent = "📈 TREND";
      return;
    }
    var getShortLabel = function() {
      if (!shortSession || actualMinutes <= 0) return "";
      if (actualMinutes < 60) return " vs " + actualMinutes + "m";
      var hours = Math.floor(actualMinutes / 60);
      var mins = actualMinutes % 60;
      return " vs " + hours + "h" + (mins > 0 ? mins : "");
    };
    function buildTrendItem(key2, name, current, prev, isLarge = false, border = "transparent") {
      var diff = current - prev;
      var deltaText = diff !== 0 ? (diff > 0 ? "+" : "−") + compactNumber(Math.abs(diff)) : "";
      var deltaColor = diff > 0 ? "var(--panel-positive)" : "var(--panel-negative)";
      var bgStyle;
      if (diff > 0) {
        bgStyle = "background:rgba(50, 205, 50, 0.22);";
      } else if (diff < 0) {
        bgStyle = "background:rgba(255, 85, 85, 0.15);";
      } else {
        bgStyle = "background:rgba(255, 215, 0, 0.15);";
      }
      bgStyle += "border:1px solid " + border + ";";
      var padding = isLarge ? "6px 4px" : "2px 4px";
      var fontSize = isLarge ? "12px" : "10px";
      var deltaFont = Math.min(isLarge ? 12 : 10, Math.max(7, 14 - deltaText.length)) + "px";
      var label = { withTokens: "With Tokens", total: "Registered viewers", anonymous: "Anons", roomTotal: "Room Total" }[key2] || model.tierLabels[key2];
      var description = label + ": " + current.toLocaleString() + ". Change " + (diff > 0 ? "+" : "") + diff.toLocaleString() + " from " + prev.toLocaleString() + ".";
      return '<div data-trend-key="' + key2 + '" role="img" aria-label="' + description + '" title="' + description + '" style="display:flex;justify-content:center;align-items:center;gap:3px;min-width:0;min-height:' + (isLarge ? 32 : 20) + "px;box-sizing:border-box;white-space:nowrap;" + bgStyle + "padding:" + padding + ';border-radius:4px;"><span aria-hidden="true" style="flex-shrink:0;font-size:' + fontSize + ';line-height:14px;">' + name + "</span>" + (deltaText ? '<span data-trend-delta aria-hidden="true" style="min-width:0;overflow:hidden;text-overflow:ellipsis;font-size:' + deltaFont + ";line-height:14px;font-weight:bold;color:" + deltaColor + ';">' + deltaText + "</span>" : "") + "</div>";
    }
    var headerLabel = "📈 TREND";
    var shortLabel = getShortLabel();
    var rowStart = '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;padding:4px 0;">';
    var html = "";
    for (var keys of [["red", "green", "purple", "pink"], ["dark-blue", "light-blue", "gray", "female-trans"]]) {
      html += rowStart;
      for (var key of keys) html += buildTrendItem(key, model.tierMarkers[key], counts[key] || 0, comparisonCounts[key] || 0);
      html += "</div>";
    }
    html += rowStart;
    html += buildTrendItem("withTokens", "💎", withTokens || 0, comparisonCounts.withTokens || 0, true, "var(--panel-warning)");
    html += buildTrendItem("total", "📊", total || 0, comparisonCounts.total || 0, true);
    html += buildTrendItem("anonymous", "👻", anonymousCount || 0, comparisonCounts.anonymous || 0, true);
    html += buildTrendItem("roomTotal", "👥", model.fullRoomTotal || 0, (comparisonCounts.total || 0) + (comparisonCounts.anonymous || 0), true, "var(--panel-accent)");
    html += "</div>";
    trendContainer.innerHTML = html;
    if (trendHeaderLabel) {
      trendHeaderLabel.textContent = headerLabel + shortLabel;
    }
  }

  // src/presentation.js
  var presentationEffects;
  function initializePresentation(effects) {
    presentationEffects = effects;
  }
  function updateDisplay() {
    presentationEffects.refreshReplayAvailability();
    if (runtime.presentationMode !== "PLAYBACK") renderDisplayFrame(buildLiveDisplayFrame());
  }
  function renderDisplayFrame(frame) {
    presentationEffects.refreshOptions();
    paintPanelFrame(buildPanelDisplayModel(frame));
  }
  function updateTrendDisplay() {
    if (runtime.presentationMode === "PLAYBACK") return;
    renderTrendDisplay(buildTrendDisplayModel());
  }
  function refreshPanelOptions() {
    presentationEffects.refreshOptions();
  }
  function refreshScanCountdown() {
    presentationEffects.refreshCountdown();
  }

  // src/row-layout.js
  function panelRowMarker(row) {
    return row.icon || getTierMarker(row.key);
  }
  function collapseMarkerHtml(key) {
    var row = runtime.PANEL_ROWS.find(function(item) {
      return item.key === key;
    });
    return '<button type="button" class="tier-collapse-marker" id="collapse-row-' + key + '" aria-controls="tier-row-' + key + '" aria-expanded="true" aria-label="Collapse ' + row.label + ' row" title="Collapse ' + row.label + ' row" style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:24px;padding:0;border:0;border-radius:3px;background:transparent;color:inherit;font-size:14px;line-height:1;cursor:pointer;">' + panelRowMarker(row) + "</button>";
  }
  function collapsedTrayHtml() {
    return '<div id="collapsed-tier-tray" role="group" aria-label="Collapsed rows. Click an icon to restore its row." style="display:none;flex-wrap:wrap;align-items:center;gap:3px;margin-bottom:4px;">' + runtime.PANEL_ROWS.map(function(row) {
      return '<button type="button" id="restore-row-' + row.key + '" aria-controls="tier-row-' + row.key + '" aria-expanded="false" aria-label="Restore ' + row.label + ' row" title="Restore ' + row.label + ' row" style="display:none;align-items:center;justify-content:center;flex:0 0 22px;width:22px;height:22px;box-sizing:border-box;padding:0;border:1px solid ' + (row.key === "total" ? "var(--panel-text)" : row.color) + ';border-radius:3px;background:rgba(var(--panel-row-rgb),0.05);color:var(--panel-text);font-size:12px;line-height:1;cursor:pointer;">' + panelRowMarker(row) + "</button>";
    }).join("") + "</div>";
  }
  function applyRowLayout() {
    runtime.chartLayoutRevision++;
    var region = document.getElementById("tier-chart-region");
    var tray = document.getElementById("collapsed-tier-tray");
    var group = document.getElementById("summary-tier-rows");
    var measurable = region && region.offsetHeight > 0;
    var visibleCount = runtime.PANEL_ROWS.length - runtime.collapsedRows.size;
    if (region) region.style.height = "auto";
    runtime.PANEL_ROWS.forEach(function(row) {
      runtime.panelChartHeights[row.key] = row.height;
      var canvas = document.getElementById("spark-" + row.key);
      if (canvas) canvas.style.height = row.height + "px";
      var element = document.getElementById("tier-row-" + row.key);
      if (measurable && element) element.style.display = row.display;
    });
    if (measurable && tray) tray.style.display = "none";
    if (measurable && group) group.style.display = "block";
    if (measurable) {
      runtime.PANEL_ROWS.forEach(function(row) {
        var canvas = document.getElementById("spark-" + row.key);
        if (!canvas) return;
        var parent = canvas.parentElement;
        var style = window.getComputedStyle(parent);
        var minimum = parent.clientHeight - (parseFloat(style.paddingTop) || 0) - (parseFloat(style.paddingBottom) || 0);
        runtime.panelChartHeights[row.key] = Math.max(row.height, minimum);
        canvas.style.height = runtime.panelChartHeights[row.key] + "px";
      });
      if (runtime.panelChartRegionHeight === null) runtime.panelChartRegionHeight = region.offsetHeight;
    }
    if (tray) tray.style.display = runtime.collapsedRows.size ? "flex" : "none";
    runtime.PANEL_ROWS.forEach(function(row) {
      var collapsed = runtime.collapsedRows.has(row.key);
      var element = document.getElementById("tier-row-" + row.key);
      if (element) element.style.display = collapsed ? "none" : row.display;
      var restore = document.getElementById("restore-row-" + row.key);
      if (restore) restore.style.display = collapsed ? "inline-flex" : "none";
      var collapse = document.getElementById("collapse-row-" + row.key);
      if (collapse) collapse.setAttribute("aria-expanded", String(!collapsed));
    });
    if (group) group.style.display = runtime.collapsedRows.has("withtokens") && runtime.collapsedRows.has("total") ? "none" : "block";
    var extra = measurable && visibleCount ? Math.max(0, runtime.panelChartRegionHeight - region.offsetHeight) / visibleCount : 0;
    runtime.PANEL_ROWS.forEach(function(row) {
      if (runtime.collapsedRows.has(row.key)) return;
      runtime.panelChartHeights[row.key] += extra;
      var canvas = document.getElementById("spark-" + row.key);
      if (canvas) canvas.style.height = runtime.panelChartHeights[row.key] + "px";
    });
    if (region && visibleCount && runtime.panelChartRegionHeight !== null) {
      region.style.height = runtime.panelChartRegionHeight + "px";
    }
    runtime.rowLayoutNeedsMeasure = !measurable;
  }

  // src/room-total-series.js
  var roomSeries = /* @__PURE__ */ new WeakMap();
  function roomTotalSeries(history) {
    if (roomSeries.has(history)) return roomSeries.get(history);
    const values = history.total.map((value, index) => value + history.anonymous[index]);
    if (Object.isFrozen(history) && Object.isFrozen(history.total) && Object.isFrozen(history.anonymous)) {
      Object.freeze(values);
      roomSeries.set(history, values);
    }
    return values;
  }

  // src/charts.js
  function drawAllSparklines() {
    if (runtime.presentationMode === "PLAYBACK") return;
    drawHistorySparklines(runtime.history);
  }
  function drawHistorySparklines(displayHistory, lastIndex, replayProgress) {
    hideChartTooltip();
    if (runtime.rowLayoutNeedsMeasure) applyRowLayout();
    var breaks = getHistoryBreaks(displayHistory);
    runtime.PANEL_ROWS.forEach(function(row) {
      if (runtime.collapsedRows.has(row.key)) return;
      var key = row.key === "withtokens" ? "withTokens" : row.key === "anon" ? "anonymous" : row.key;
      drawSparkline(
        "spark-" + row.key,
        key === "roomTotal" ? roomTotalSeries(displayHistory) : displayHistory[key],
        row.key === "total" ? themeColor("text") : row.key === "roomTotal" ? themeColor("accent") : row.key === "withtokens" ? themeColor("warning") : row.color,
        runtime.panelChartHeights[row.key] || row.height,
        displayHistory.timestamps,
        breaks,
        lastIndex,
        row.label,
        replayProgress
      );
    });
  }

  // src/gif.js
  var import_omggif = __toESM(require_omggif(), 1);
  function createGifSurface(palette) {
    var canvas = document.createElement("canvas");
    canvas.width = runtime.GIF_WIDTH;
    canvas.height = runtime.GIF_HEIGHT;
    var ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas is unavailable.");
    var pixels = new Uint8Array(runtime.GIF_WIDTH * runtime.GIF_HEIGHT);
    var colors = palette.map(function(color) {
      return "#" + color.toString(16).padStart(6, "0");
    });
    function rect(x, y, width, height, color) {
      x = Math.round(x);
      y = Math.round(y);
      width = Math.round(width);
      height = Math.round(height);
      var left = Math.max(0, x), top = Math.max(0, y);
      var right = Math.min(runtime.GIF_WIDTH, x + width), bottom = Math.min(runtime.GIF_HEIGHT, y + height);
      if (right <= left || bottom <= top) return;
      ctx.fillStyle = colors[color];
      ctx.fillRect(left, top, right - left, bottom - top);
      for (var row = top; row < bottom; row++) {
        pixels.fill(color, row * runtime.GIF_WIDTH + left, row * runtime.GIF_WIDTH + right);
      }
    }
    function text(value, x, y, color, scale, rightAlign) {
      scale = scale || 1;
      value = String(value).toUpperCase();
      if (rightAlign) x -= (value.length * 6 - 1) * scale;
      for (var i = 0; i < value.length; i++) {
        var glyph = runtime.GIF_FONT[value[i]] || runtime.GIF_FONT["?"];
        for (var row = 0; row < 7; row++) {
          for (var col = 0; col < 5; col++) {
            if (glyph[row] & 1 << 4 - col) {
              rect(x + (i * 6 + col) * scale, y + row * scale, scale, scale, color);
            }
          }
        }
      }
    }
    return { canvas, pixels, rect, text };
  }
  function gifCount(value) {
    value = Math.max(0, Number(value) || 0);
    var text = String(Math.round(value));
    return text.length <= 10 ? text : value.toExponential(2);
  }
  function getGifSampleIndex(snapshot, frameIndex, frameCount) {
    var last = snapshot.timeline.length - 1;
    if (snapshot.timeline.length <= runtime.GIF_MAX_FRAMES) return frameIndex;
    if (frameIndex === 0) return 0;
    if (frameIndex === frameCount - 1) return last;
    var position = snapshot.durationMs * frameIndex / (frameCount - 1);
    var low = 0, high = snapshot.timeline.length;
    while (low < high) {
      var middle = Math.floor((low + high) / 2);
      if (snapshot.timeline[middle] <= position) low = middle + 1;
      else high = middle;
    }
    return Math.max(0, low - 1);
  }
  function drawGifSparkline(surface, values, lastIndex, color, bounds, times, breaks) {
    var left = bounds.left, top = bounds.top;
    var plotWidth = bounds.width - 2, plotHeight = bounds.height - 2;
    var minimum = values[0], maximum = values[0];
    for (var i = 1; i <= lastIndex; i++) {
      minimum = Math.min(minimum, values[i]);
      maximum = Math.max(maximum, values[i]);
    }
    var range = maximum - minimum || 1;
    function y(value) {
      return maximum === minimum ? top + Math.round(plotHeight / 2) : top + plotHeight - Math.round((value - minimum) / range * plotHeight);
    }
    function line(x0, y0, x1, y1, strokeColor, dashed) {
      var dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
      var dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
      var error = dx + dy, step = 0;
      var distancePerStep = Math.hypot(dx, dy) / Math.max(dx, -dy, 1);
      while (true) {
        if (!dashed || step * distancePerStep % 10 < 6) surface.rect(x0, y0, dashed ? 1 : 2, dashed ? 1 : 2, strokeColor);
        if (x0 === x1 && y0 === y1) break;
        var twiceError = 2 * error;
        if (twiceError >= dy) {
          error += dy;
          x0 += sx;
        }
        if (twiceError <= dx) {
          error += dx;
          y0 += sy;
        }
        step++;
      }
    }
    var plot = buildChartPlot(values, times || values.map(function(_, i2) {
      return i2;
    }), breaks || [], plotWidth, lastIndex);
    for (var p = 1; p < plot.points.length; p++) {
      if (!plot.points[p].move) continue;
      var before = plot.points[p - 1], after = plot.points[p];
      line(left + Math.round(before.x), y(before.value), left + Math.round(after.x), y(after.value), runtime.GIF_GAP_COLOR_INDEX, true);
    }
    var previous = null;
    plot.points.forEach(function(point) {
      var x = left + Math.round(point.x), nextY = y(point.value);
      if (previous && !point.move) line(previous.x, previous.y, x, nextY, color, false);
      else surface.rect(x, nextY, 2, 2, color);
      previous = { x, y: nextY };
    });
  }
  function drawGifSummary(surface, snapshot, index, tiers) {
    var data = snapshot.history;
    var breaks = getHistoryBreaks(data);
    var margin = 16, rowStart = 90, rowStep = 44, groupGap = 12;
    var chartLeft = 176, countWidth = 70, columnGap = 10;
    var chartWidth = runtime.GIF_WIDTH - chartLeft - margin - countWidth - columnGap;
    surface.rect(0, 0, runtime.GIF_WIDTH, runtime.GIF_HEIGHT, 0);
    surface.text("TIERSCOPE REPLAY", margin, 12, 1, 3);
    surface.text(formatElapsedTime(snapshot.timeline[index]) + " / " + formatElapsedTime(snapshot.durationMs), margin, 46, 1, 2);
    surface.text("LINES SCALED PER SERIES", margin, 67, 1, 1);
    if (breaks.some(function(gap, i) {
      return gap && i > 0 && i <= index;
    })) {
      surface.text("ORANGE DASHES: NO SAMPLES", runtime.GIF_WIDTH - margin, 67, runtime.GIF_GAP_COLOR_INDEX, 1, true);
    }
    surface.rect(margin, 80, runtime.GIF_WIDTH - margin * 2, 2, 1);
    function drawRow(label, values, top, color) {
      surface.rect(margin, top + 14, 6, 14, color);
      surface.text(label, 30, top + 14, 1, 2);
      drawGifSparkline(
        surface,
        values,
        index,
        color,
        { left: chartLeft, top: top + 2, width: chartWidth, height: 36 },
        data.timestamps,
        breaks
      );
      var count = gifCount(values[index]);
      var countScale = (count.length * 6 - 1) * 2 <= countWidth ? 2 : 1;
      surface.text(count, runtime.GIF_WIDTH - margin, top + (countScale === 2 ? 14 : 18), color, countScale, true);
    }
    tiers.forEach(function(tier, row) {
      drawRow(
        tier === "female-trans" ? "FEMALE/TRANS" : runtime.TIERS[tier].name,
        data[tier],
        rowStart + row * rowStep,
        row + 2
      );
    });
    var totalsStart = rowStart + tiers.length * rowStep;
    surface.rect(margin, totalsStart, runtime.GIF_WIDTH - margin * 2, 2, 1);
    totalsStart += groupGap;
    var roomTotals = data.total.map(function(value, i) {
      return value + data.anonymous[i];
    });
    drawRow("TOTAL", roomTotals, totalsStart, 1);
    drawRow("WITH TOKENS", data.withTokens, totalsStart + rowStep, 10);
    drawRow("REGISTERED", data.total, totalsStart + rowStep * 2, 1);
    drawRow("ANONYMOUS", data.anonymous, totalsStart + rowStep * 3, 11);
  }
  function cancelGifExport() {
    if (runtime.gifExportJob) runtime.gifExportJob.cancelled = true;
  }
  async function generateGifFromHistory(recording) {
    if (runtime.gifExportJob) return;
    var button = document.getElementById("btn-export-gif");
    var buttons = Array.from(document.querySelectorAll("[data-gif]"));
    if (button && !buttons.includes(button)) buttons.push(button);
    var status = document.getElementById("gif-export-status");
    var cancel = document.getElementById("btn-cancel-gif");
    var progress = document.getElementById("gif-export-controls");
    var job = {
      cancelled: false,
      url: location.href,
      generation: runtime.initGuard,
      key: runtime.activeSessionStorageKey
    };
    runtime.gifExportJob = job;
    buttons.forEach((control) => {
      control.disabled = true;
    });
    if (progress) progress.style.display = "flex";
    if (cancel) cancel.hidden = false;
    if (status) status.textContent = "Preparing GIF…";
    function checkJob() {
      if (job.cancelled || location.href !== job.url || runtime.initGuard !== job.generation || runtime.activeSessionStorageKey !== job.key) throw new Error("GIF export cancelled.");
    }
    try {
      if (!recording && !isPlaybackCurrent(runtime.playback)) throw new Error("Open Replay before downloading a GIF.");
      var archive = recording ? validateSessionFile(recording) : runtime.playback.archive;
      var model = archive ? archive.room : getModelName();
      var snapshot = recording ? createPlaybackSnapshot(archive.session.history) : runtime.playback.snapshot;
      if (!snapshot.timeline.length) throw new Error("No recorded history to export yet.");
      var tiers = Object.keys(runtime.TIERS);
      var palette = [1315870, 16777215].concat(tiers.map(function(tier) {
        return parseInt(runtime.TIERS[tier].color.slice(1), 16);
      }));
      palette.push(16738740, 8947848);
      palette.push(15244101);
      while ((palette.length & palette.length - 1) !== 0) palette.push(palette[0]);
      var surface = createGifSurface(palette);
      var frameCount = Math.min(runtime.GIF_MAX_FRAMES, snapshot.timeline.length);
      var bytes = new Uint8Array(256 * 1024);
      var writer = new import_omggif.GifWriter(bytes, runtime.GIF_WIDTH, runtime.GIF_HEIGHT, { palette, loop: 0 });
      for (var i = 0; i < frameCount; i++) {
        await new Promise(function(resolve) {
          setTimeout(resolve, 0);
        });
        checkJob();
        var index = getGifSampleIndex(snapshot, i, frameCount);
        drawGifSummary(surface, snapshot, index, tiers);
        var needed = writer.getOutputBufferPosition() + runtime.GIF_WIDTH * runtime.GIF_HEIGHT * 2 + 1024;
        if (needed > bytes.length) {
          var grown = new Uint8Array(Math.max(bytes.length * 2, needed));
          grown.set(bytes);
          bytes = grown;
          writer.setOutputBuffer(bytes);
        }
        var delay = Math.round((i + 1) * runtime.GIF_DURATION_CS / frameCount) - Math.round(i * runtime.GIF_DURATION_CS / frameCount);
        writer.addFrame(0, 0, runtime.GIF_WIDTH, runtime.GIF_HEIGHT, surface.pixels, { delay, disposal: 1 });
        if (status) status.textContent = "GIF " + Math.round((i + 1) / frameCount * 100) + "%";
      }
      checkJob();
      var length = writer.end();
      if (length > bytes.length) throw new Error("GIF output buffer overflow.");
      var blob = new Blob([bytes.subarray(0, length)], { type: "image/gif" });
      var url = URL.createObjectURL(blob);
      try {
        var link = document.createElement("a");
        link.href = url;
        link.download = model.replace(/[^a-z0-9_-]/gi, "_") + "-replay-" + (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) + ".gif";
        document.body.appendChild(link);
        try {
          link.click();
        } finally {
          link.remove();
        }
      } finally {
        setTimeout(function() {
          URL.revokeObjectURL(url);
        }, 6e4);
      }
      if (status) status.textContent = "GIF downloaded";
      log("GIF export complete: " + frameCount + " frames, " + length + " bytes");
    } catch (error) {
      if (status) status.textContent = error.message;
      log("GIF export: " + error.message);
      if (!job.cancelled && location.href === job.url && runtime.initGuard === job.generation) alert(error.message);
    } finally {
      buttons.forEach((control) => {
        control.disabled = control.dataset.currentAvailable === "false";
      });
      if (cancel) cancel.hidden = true;
      if (progress) progress.style.display = "none";
      if (button && status) button.title = status.textContent;
      if (runtime.gifExportJob === job) runtime.gifExportJob = null;
    }
  }

  // src/presentation-status.js
  function updateMiniFreshness() {
    var element = document.getElementById("mini-freshness");
    if (element) renderStatus(element, buildFreshnessModel());
  }
  function updateAcquisitionStatus() {
    updateMiniFreshness();
    var element = document.getElementById("acquisition-status");
    if (element) renderStatus(element, buildAcquisitionStatusModel());
  }

  // src/replay.js
  function setPlaybackSamplePosition(state, position) {
    return moveOwnedPlayback(state, position);
  }
  function stopPlaybackClock(state) {
    stopOwnedPlaybackClock(state);
  }
  function startPlaybackClock(state) {
    startOwnedPlaybackClock(state, tickPlayback);
  }
  function paintPlayback(state) {
    if (!isPlaybackCurrent(state)) return false;
    try {
      var index = getPlaybackSampleIndex(state.snapshot, state.positionMs, state.stepIndex);
      if (state.paintedPosition !== state.samplePosition || state.paintLayout !== runtime.chartLayoutRevision) {
        renderPlaybackFrame(getPlaybackFrame(state.snapshot, state.positionMs, state.stepIndex), state.samplePosition - index);
        markPlaybackPainted(state, runtime.chartLayoutRevision);
      }
      updatePlaybackControls();
      return true;
    } catch (error) {
      pauseOwnedPlayback(state);
      log("Playback paused after a presentation error: " + error.message);
      try {
        updatePlaybackControls();
      } catch (controlError) {
      }
      return false;
    }
  }
  function enterPlayback() {
    if (runtime.playback) {
      if (isPlaybackCurrent(runtime.playback)) return true;
      leavePlayback(false);
    }
    var model = getModelName();
    if (!model || model === "unknown" || runtime.lastUrl !== location.href || runtime.activeSessionStorageKey !== getStorageKey(model) || !runtime.history.timestamps.length) return false;
    try {
      var archive = captureSessionFile();
      var snapshot = createPlaybackSnapshot(archive.session.history);
      openOwnedPlayback({
        url: location.href,
        key: runtime.activeSessionStorageKey,
        generation: runtime.initGuard,
        archive,
        snapshot,
        allTimeState: readAllTimeHighs(model)
      }, Date.now(), true);
      cancelHighPulses();
      setPlaybackLayout(true);
      if (!paintPlayback(runtime.playback)) return false;
      startPlaybackClock(runtime.playback);
      return true;
    } catch (error) {
      if (runtime.playback) {
        pauseOwnedPlayback(runtime.playback);
      }
      log("Could not start playback: " + error.message);
      return false;
    }
  }
  function leavePlayback(renderLive) {
    nextSessionFileRequest();
    setAllTimeActionStatus("");
    hideChartTooltip();
    cancelHighPulses();
    cancelGifExport();
    if (typeof renderLive === "undefined") renderLive = true;
    if (!runtime.playback && runtime.presentationMode === "LIVE") return false;
    var canRenderLive = renderLive && isPlaybackCurrent(runtime.playback);
    closeOwnedPlayback();
    try {
      setPlaybackLayout(false);
      if (canRenderLive) repaintLivePresentation();
      else clearPlaybackPresentation();
    } catch (error) {
      log("Could not repaint after playback: " + error.message);
    }
    return true;
  }
  function tickPlayback(expectedState) {
    if (expectedState && expectedState !== runtime.playback) return false;
    var state = runtime.playback;
    if (!isPlaybackCurrent(state)) {
      if (state) leavePlayback(false);
      return false;
    }
    if (!advanceOwnedPlayback(state, Date.now())) return false;
    return paintPlayback(state);
  }
  function togglePlayback() {
    var state = runtime.playback;
    if (!isPlaybackCurrent(state)) {
      if (state) leavePlayback(false);
      return false;
    }
    if (!state.snapshot.replayDurationMs) return false;
    if (state.playing) {
      tickPlayback(state);
      pauseOwnedPlayback(state);
    } else {
      resumeOwnedPlayback(state, Date.now());
    }
    if (!paintPlayback(state)) return false;
    startPlaybackClock(state);
    return true;
  }
  function scrubPlayback(samplePosition) {
    var state = runtime.playback;
    if (!isPlaybackCurrent(state)) {
      if (state) leavePlayback(false);
      return false;
    }
    var position = Number(samplePosition);
    if (!Number.isFinite(position)) return false;
    seekOwnedPlayback(state, position, Date.now());
    return paintPlayback(state);
  }
  function stepPlayback(direction) {
    var state = runtime.playback;
    if (!isPlaybackCurrent(state)) return false;
    var index = getPlaybackSampleIndex(state.snapshot, state.positionMs, state.stepIndex);
    if (index < 0) return false;
    seekOwnedPlayback(state, index + direction, Date.now());
    return paintPlayback(state);
  }
  function setPlaybackSpeed(value) {
    var state = runtime.playback;
    if (!isPlaybackCurrent(state)) {
      if (state) leavePlayback(false);
      return false;
    }
    var speed = Number(value);
    if ([0.5, 1, 2].indexOf(speed) === -1) return false;
    if (state.playing) tickPlayback(state);
    changeOwnedPlaybackSpeed(state, speed, Date.now());
    return paintPlayback(state);
  }
  function updateReplayAvailability() {
    var button = document.getElementById("btn-replay");
    if (!button) return;
    button.disabled = !runtime.history.timestamps.length || runtime.activeSessionStorageKey !== getStorageKey(getModelName()) || location.href !== runtime.lastUrl;
    button.title = button.disabled ? "No recorded history for this room yet" : "Replay recorded history; live acquisition continues";
  }
  function bindPlaybackControls() {
    var bindings = {
      "btn-replay": enterPlayback,
      "playback-play": togglePlayback,
      "playback-previous": function() {
        stepPlayback(-1);
      },
      "playback-next": function() {
        stepPlayback(1);
      },
      "playback-return": function() {
        leavePlayback(true);
      }
    };
    Object.keys(bindings).forEach(function(id) {
      var button = document.getElementById(id);
      if (button) button.onclick = bindings[id];
    });
    var slider = document.getElementById("playback-scrubber");
    if (slider) slider.oninput = function() {
      scrubPlayback(Number(this.value));
    };
    var speed = document.getElementById("playback-speed");
    if (speed) speed.onchange = function() {
      setPlaybackSpeed(Number(this.value));
    };
  }
  function setPlaybackLayout(active) {
    if (active) {
      runtime.playbackLayoutState = [];
      var toggle = document.getElementById("btn-toggle");
      if (toggle) toggle.disabled = true;
      [
        ["live-trend", "visibility", "hidden"],
        ["control-field", "visibility", "hidden"],
        ["acquisition-status", "visibility", "hidden"],
        ["btn-toggle", "visibility", "hidden"],
        ["playback-controls", "display", "grid"]
      ].forEach(function(change) {
        var element = document.getElementById(change[0]);
        if (!element) return;
        runtime.playbackLayoutState.push({ element, property: change[1], value: element.style[change[1]] || "" });
        element.style[change[1]] = change[2];
      });
    } else if (runtime.playbackLayoutState) {
      runtime.playbackLayoutState.forEach(function(saved) {
        saved.element.style[saved.property] = saved.value;
      });
      runtime.playbackLayoutState = null;
      var toggle = document.getElementById("btn-toggle");
      if (toggle) toggle.disabled = false;
    }
  }
  function updatePlaybackControls() {
    if (!runtime.playback) return;
    refreshPanelOptions();
    var label = document.getElementById("playback-label");
    if (label) {
      label.textContent = runtime.playback.imported ? "FILE REPLAY" : "PLAYBACK";
      label.title = runtime.playback.archive ? runtime.playback.archive.room : "";
    }
    var room2 = document.getElementById("playback-room");
    if (room2) {
      var sourceRoom = runtime.playback.imported && runtime.playback.archive ? runtime.playback.archive.room : "";
      room2.textContent = sourceRoom ? "Room: " + sourceRoom : "";
      room2.title = sourceRoom ? "Saved session from " + sourceRoom : "";
      room2.style.display = sourceRoom ? "block" : "none";
    }
    var fileControls = document.getElementById("playback-file-controls");
    if (fileControls) fileControls.style.display = runtime.playback.imported ? "flex" : "none";
    var controls = document.getElementById("playback-controls");
    if (controls) controls.style.minHeight = runtime.playback.imported ? "66px" : "";
    var back = document.getElementById("playback-return");
    if (back) {
      back.textContent = runtime.playback.imported ? "Close Replay" : "Return to Live";
      back.title = runtime.playback.imported ? "Close this file and return to the current room session" : "Return to the current room session";
    }
    var index = getPlaybackSampleIndex(runtime.playback.snapshot, runtime.playback.positionMs, runtime.playback.stepIndex);
    var previous = document.getElementById("playback-previous");
    var next = document.getElementById("playback-next");
    if (previous) previous.disabled = index <= 0;
    if (next) next.disabled = index < 0 || index === runtime.playback.snapshot.timeline.length - 1;
    var button = document.getElementById("playback-play");
    if (button) {
      button.textContent = runtime.playback.playing ? "Pause" : "Play";
      button.disabled = runtime.playback.snapshot.replayDurationMs === 0;
      button.title = runtime.playback.playing ? "Pause playback only" : "Play recorded samples at an even pace";
    }
    var slider = document.getElementById("playback-scrubber");
    if (slider) {
      slider.max = String(Math.max(0, runtime.playback.snapshot.timeline.length - 1));
      slider.value = String(runtime.playback.samplePosition);
      slider.disabled = runtime.playback.snapshot.replayDurationMs === 0;
      slider.setAttribute("aria-valuetext", "Sample " + (index + 1) + " of " + runtime.playback.snapshot.timeline.length);
    }
    var speed = document.getElementById("playback-speed");
    if (speed) speed.value = String(runtime.playback.speed);
    var position = document.getElementById("playback-position");
    if (position) {
      position.textContent = formatElapsedTime(runtime.playback.positionMs) + " / " + formatElapsedTime(runtime.playback.snapshot.durationMs);
      position.title = "Sample " + (index + 1) + " of " + runtime.playback.snapshot.timeline.length + ". Samples play at an even pace; the time display and chart gaps retain recorded timing. The moving line connects recorded samples; counts and highs change only at a recorded sample. Live acquisition continues independently.";
      if (runtime.playback.archive) position.title += "\n" + runtime.playback.archive.room + " · " + new Date(runtime.playback.archive.session.timestamp).toLocaleString() + " · Active time: " + formatElapsedTime(runtime.playback.archive.session.pausedElapsedTime) + (runtime.playback.archive.session.isStopped ? " · Stopped session" : runtime.playback.archive.session.isPaused ? " · Paused session" : " · Running session snapshot");
    }
  }
  function renderPlaybackFrame(frame, progress) {
    renderDisplayFrame(Object.assign({}, frame, { isPlayback: true }));
    drawHistorySparklines(frame.history, frame.historyEndIndex, progress);
  }
  function clearPlaybackPresentation() {
    var emptyHistory = { timestamps: [] };
    var counts = {};
    runtime.STORAGE_HISTORY_SERIES.forEach(function(key) {
      emptyHistory[key] = [];
      counts[key] = 0;
    });
    renderDisplayFrame({
      counts,
      total: 0,
      withTokens: 0,
      anonymousCount: 0,
      fullRoomTotal: 0,
      roomTotalHigh: 0,
      history: emptyHistory,
      isPlayback: false
    });
    drawHistorySparklines(emptyHistory);
  }
  function repaintLivePresentation() {
    updateDisplay();
    updateTrendDisplay();
    drawAllSparklines();
    updateAcquisitionStatus();
    refreshScanCountdown();
  }

  // src/highs.js
  function repaintHighMode() {
    cancelHighPulses();
    runtime.chartLayoutRevision++;
    if (isPlaybackCurrent(runtime.playback)) paintPlayback(runtime.playback);
    else updateDisplay();
    updateHighControls();
  }
  function toggleHighMode() {
    switchHighPreference();
    var state = readAllTimeHighs(displayedHighRoom());
    if (isPlaybackCurrent(runtime.playback)) setPlaybackAllTimeState(runtime.playback, state);
    try {
      GM_setValue(runtime.HIGH_MODE_KEY, runtime.highMode);
    } catch (error) {
    }
    repaintHighMode();
  }
  function addFileToAllTimeHighs() {
    if (!isPlaybackCurrent(runtime.playback) || !runtime.playback.imported) return;
    try {
      var archive = validateSessionFile(runtime.playback.archive);
      var result = storeAllTimeHighs(archive.room, sessionAllTimeHighs(archive.session, "file"));
      setPlaybackAllTimeState(runtime.playback, result.state);
      repaintHighMode();
      setAllTimeActionStatus(
        result.saved ? (result.changed ? "Records updated for " : "No higher records in this file for ") + archive.room + "." : result.state.error || "Records changed in another tab. Try adding this file again.",
        result.saved ? result.changed ? "Added to ATH" : "Already in ATH" : "Retry adding to ATH"
      );
    } catch (error) {
      alert("Could not add all-time highs: " + error.message);
    }
  }
  function clearAllTimeHighs() {
    var room2 = displayedHighRoom();
    if (!room2 || !confirm("Clear all-time highs for " + room2 + "?\n\nSession history and saved files will remain. New accepted samples will start new all-time records.")) return;
    try {
      var prefix = runtime.ALL_TIME_PREFIX + room2 + ":";
      var keys = GM_listValues().filter(function(key) {
        return key.indexOf(prefix) === 0;
      });
      GM_setValue(runtime.ALL_TIME_EPOCH_PREFIX + room2, makeStorageId());
      runtime.allTimeCache.delete(room2);
      keys.forEach(function(key) {
        try {
          GM_deleteValue(key);
        } catch (error) {
        }
      });
      var state = readAllTimeHighs(room2);
      if (isPlaybackCurrent(runtime.playback)) setPlaybackAllTimeState(runtime.playback, state);
      repaintHighMode();
      setAllTimeActionStatus("All-time highs cleared for " + room2 + ".");
    } catch (error) {
      alert("Could not clear all-time highs: " + error.message);
    }
  }
  function updateHighControls() {
    var state = displayedAllTimeState();
    var warning = state.error || (state.pending ? "All-time highs are local only: saving is pending. Keep this tab open to retry." : "");
    var toggle = document.getElementById("btn-high-mode");
    if (toggle) {
      toggle.style.display = runtime.isMinimized ? "none" : "";
      toggle.textContent = runtime.highMode.toUpperCase();
      toggle.setAttribute("aria-pressed", String(runtime.highMode === "ath"));
      toggle.setAttribute("aria-label", runtime.highMode === "ath" ? "All-time highs. Switch to session highs" : "Session highs. Switch to all-time highs");
      toggle.title = (runtime.highMode === "ath" ? "All-time highs for this room in this browser; survive session Reset and expiry" : "Session highs; cleared by Reset. Saved sessions expire 3 hours after their last save. Downloaded files do not expire") + ". Click to switch. " + warning;
    }
    ["btn-add-all-time", "btn-playback-add-all-time"].forEach(function(id) {
      var add = document.getElementById(id);
      if (add) add.style.display = isPlaybackCurrent(runtime.playback) && runtime.playback.imported ? "block" : "none";
    });
    var clear = document.getElementById("btn-clear-all-time");
    if (clear) {
      clear.disabled = !state.room;
      clear.title = state.room ? "Clear all-time records for " + state.room + " only" : "Open a room or session file first";
    }
    var info = document.getElementById("all-time-info");
    if (info) info.textContent = warning || (state.skipped ? state.skipped + " unreadable all-time record(s) were skipped and retained." : "All-time highs are saved per room in this browser and survive session Reset.");
  }
  function recordAcceptedAllTimeHighs(room2) {
    var index = runtime.history.timestamps.length - 1;
    if (index < 0) return;
    var incoming = emptyAllTimeHighs(), time = runtime.history.timestamps[index];
    runtime.ALL_TIME_SERIES.forEach(function(key) {
      incoming[key] = {
        value: key === "roomTotal" ? runtime.history.total[index] + runtime.history.anonymous[index] : runtime.history[key][index],
        time,
        source: "live"
      };
    });
    storeAllTimeHighs(room2, incoming);
  }
  function clearInactiveAllTimeHighs() {
    try {
      const plan = prepareAthCleanup();
      if (!plan.candidates.length) {
        setAllTimeActionStatus("No rooms with ATH qualify for the 90-day cleanup." + (plan.skipped ? " " + plan.skipped + " unreadable room(s) were skipped." : ""));
        return;
      }
      if (!confirm("Clear all-time highs for " + plan.candidates.length + " room(s) not visited in over 90 days?\n\nExisting records receive a 90-day grace period. Active rooms are protected. Saved Library sessions and session highs will remain." + (plan.skipped ? "\n\n" + plan.skipped + " unreadable room(s) will be skipped." : ""))) return;
      const result = applyAthCleanup(plan);
      if (isPlaybackCurrent(runtime.playback)) setPlaybackAllTimeState(runtime.playback, readAllTimeHighs(displayedHighRoom()));
      repaintHighMode();
      setAllTimeActionStatus("Cleared ATH for " + result.cleared + " room(s)." + (result.changed ? " " + result.changed + " room(s) changed or became active and were skipped." : "") + (result.failed ? " " + result.failed + " room(s) could not be cleared; retained records remain available." : ""));
    } catch (error) {
      setAllTimeActionStatus("Could not inspect old ATH records: " + error.message);
    }
  }

  // src/layout.js
  function loadCollapsedRows() {
    try {
      var raw = GM_getValue(runtime.COLLAPSED_ROWS_KEY, null);
      if (raw !== null && typeof raw !== "undefined") {
        var saved = JSON.parse(raw);
        if (!Array.isArray(saved) || !saved.every(function(key) {
          return runtime.PANEL_ROWS.some(function(row) {
            return row.key === key;
          });
        })) throw new Error("Invalid collapsed-row preferences");
        return new Set(saved);
      }
    } catch (error) {
      log("Could not restore row preferences: " + error.message);
    }
    return /* @__PURE__ */ new Set(["red", "anon", "roomTotal"]);
  }
  function setRowCollapsed(key, collapsed) {
    cancelHighPulse(key);
    if (!runtime.PANEL_ROWS.some(function(row) {
      return row.key === key;
    })) return;
    selectCollapsedRow(key, collapsed);
    try {
      GM_setValue(runtime.COLLAPSED_ROWS_KEY, JSON.stringify(Array.from(runtime.collapsedRows)));
    } catch (error) {
      log("Could not save row preferences: " + error.message);
    }
    applyRowLayout();
    if (runtime.presentationMode === "PLAYBACK") {
      paintPlayback(runtime.playback);
    } else {
      updateDisplay();
      drawAllSparklines();
    }
    constrainPanelPosition();
    var target = document.getElementById((collapsed ? "restore-row-" : "collapse-row-") + key);
    if (target) target.focus({ preventScroll: true });
  }
  function bindRowControls() {
    runtime.panelChartRegionHeight = null;
    runtime.PANEL_ROWS.forEach(function(row) {
      [false, true].forEach(function(collapsed) {
        var button = document.getElementById((collapsed ? "collapse-row-" : "restore-row-") + row.key);
        if (button) button.onclick = function(event) {
          event.stopPropagation();
          setRowCollapsed(row.key, collapsed);
        };
      });
    });
    var container = document.getElementById("tracker-container");
    if (container) container.addEventListener("transitionend", function(event) {
      if (event.target === container && event.propertyName === "width") {
        redrawPanelCharts();
        constrainPanelPosition();
      }
    });
    applyRowLayout();
  }
  function redrawPanelCharts() {
    if (runtime.isMinimized) return;
    runtime.chartLayoutRevision++;
    if (runtime.presentationMode === "PLAYBACK") paintPlayback(runtime.playback);
    else drawAllSparklines();
  }
  function cleanupDragListeners() {
    for (var i = 0; i < runtime.dragListeners.length; i++) {
      var listener = runtime.dragListeners[i];
      document.removeEventListener(listener.type, listener.fn, listener.options);
    }
    runtime.dragListeners = [];
  }
  function addDragListener(type, fn, options) {
    document.addEventListener(type, fn, options);
    runtime.dragListeners.push({ type, fn, options });
  }
  function loadPanelGeometry() {
    try {
      var raw = GM_getValue(runtime.PANEL_GEOMETRY_KEY, null);
      if (raw === null) return null;
      var data = JSON.parse(raw);
      if (!data || !Number.isFinite(data.left) || !Number.isFinite(data.top) || !Number.isFinite(data.scale) || data.scale < 0.5 || data.scale > 3) return null;
      return { left: data.left, top: data.top, scale: data.scale };
    } catch (error) {
      return null;
    }
  }
  function constrainPanelPosition() {
    var container = document.getElementById("tracker-container");
    if (!container) return;
    var rect = container.getBoundingClientRect();
    container.style.left = Math.max(0, Math.min(rect.left, Math.max(0, window.innerWidth - rect.width))) + "px";
    container.style.top = Math.max(0, Math.min(rect.top, Math.max(0, window.innerHeight - rect.height))) + "px";
    container.style.right = "auto";
  }
  function savePanelGeometry() {
    var container = document.getElementById("tracker-container");
    if (!container) return;
    var rect = container.getBoundingClientRect();
    rememberPanelGeometry({ left: rect.left, top: rect.top, scale: runtime.currentScale });
    try {
      GM_setValue(runtime.PANEL_GEOMETRY_KEY, JSON.stringify(runtime.panelGeometry));
    } catch (error) {
      log("Could not save panel position/scale: " + error.message);
    }
  }
  function restorePanelGeometry() {
    var container = document.getElementById("tracker-container");
    if (!container) return;
    if (runtime.panelGeometry) {
      container.style.left = runtime.panelGeometry.left + "px";
      container.style.top = runtime.panelGeometry.top + "px";
      container.style.right = "auto";
      applyScale(runtime.panelGeometry.scale);
    } else applyScale(runtime.currentScale);
    constrainPanelPosition();
    redrawPanelCharts();
  }
  function restoreStandardSize() {
    applyScale(1);
    redrawPanelCharts();
    constrainPanelPosition();
    savePanelGeometry();
  }
  function applyScale(scale) {
    selectPanelScale(scale);
    var container = document.getElementById("tracker-container");
    if (!container) return;
    container.style.transform = "scale(" + scale + ")";
    container.style.transformOrigin = "top left";
    container.dataset.scale = scale;
  }
  function setupResizable() {
    var container = document.getElementById("tracker-container");
    if (!container) return;
    var resizeHandle = document.createElement("div");
    resizeHandle.id = "resize-handle";
    resizeHandle.style.cssText = "position:absolute;top:0;left:0;width:16px;height:16px;background:linear-gradient(135deg, #ff69b4 50%, transparent 50%);cursor:nw-resize;z-index:999999;border-top-left-radius:6px;opacity:0.8;transition:opacity 0.2s;";
    resizeHandle.addEventListener("mouseenter", function() {
      this.style.opacity = "1";
    });
    resizeHandle.addEventListener("mouseleave", function() {
      this.style.opacity = "0.8";
    });
    container.appendChild(resizeHandle);
    var startResize = function(e) {
      if (runtime.isDragging) return;
      runtime.isResizing = true;
      runtime.resizeStartX = e.clientX;
      runtime.resizeStartY = e.clientY;
      var rect = container.getBoundingClientRect();
      runtime.resizeStartWidth = rect.width;
      runtime.resizeStartHeight = rect.height;
      e.preventDefault();
      e.stopPropagation();
    };
    var doResize = function(e) {
      if (!runtime.isResizing) return;
      var deltaX = runtime.resizeStartX - e.clientX;
      var deltaY = runtime.resizeStartY - e.clientY;
      var newWidth = runtime.resizeStartWidth + deltaX;
      var baseWidth = container.offsetWidth;
      var newScale = Math.max(0.5, Math.min(3, newWidth / baseWidth));
      applyScale(newScale);
    };
    var stopResize = function() {
      if (!runtime.isResizing) return;
      runtime.isResizing = false;
      redrawPanelCharts();
      constrainPanelPosition();
      savePanelGeometry();
    };
    resizeHandle.addEventListener("mousedown", startResize);
    document.addEventListener("mousemove", doResize);
    document.addEventListener("mouseup", stopResize);
    window._trackerResizeCleanup = function() {
      resizeHandle.removeEventListener("mousedown", startResize);
      document.removeEventListener("mousemove", doResize);
      document.removeEventListener("mouseup", stopResize);
    };
  }
  function setupResizeHandler() {
    if (runtime.windowResizeHandler) {
      window.removeEventListener("resize", runtime.windowResizeHandler);
      runtime.windowResizeHandler = null;
    }
    var resizeTimeout;
    runtime.windowResizeHandler = function() {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(function() {
        constrainPanelPosition();
        redrawPanelCharts();
      }, 100);
    };
    window.addEventListener("resize", runtime.windowResizeHandler);
  }
  function setupDraggable() {
    var container = document.getElementById("tracker-container");
    var dragHandle = document.getElementById("drag-handle");
    if (!container || !dragHandle) return;
    var startDrag = function(e) {
      if (runtime.isResizing || e.target.closest && e.target.closest("button, input, select, a")) return;
      runtime.isDragging = true;
      var rect = container.getBoundingClientRect();
      var scale = runtime.currentScale || 1;
      runtime.dragOffsetX = (e.clientX - rect.left) / scale;
      runtime.dragOffsetY = (e.clientY - rect.top) / scale;
      if (container.style.right !== "auto") {
        container.style.left = rect.left + "px";
        container.style.right = "auto";
      }
      addDragListener("mousemove", doDrag, false);
      addDragListener("mouseup", stopDrag, false);
      e.preventDefault();
    };
    var doDrag = function(e) {
      if (!runtime.isDragging) return;
      var scale = runtime.currentScale || 1;
      var newX = e.clientX - runtime.dragOffsetX * scale;
      var newY = e.clientY - runtime.dragOffsetY * scale;
      var maxX = window.innerWidth - container.offsetWidth * scale;
      var maxY = window.innerHeight - container.offsetHeight * scale;
      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));
      container.style.left = newX + "px";
      container.style.top = newY + "px";
    };
    var stopDrag = function() {
      runtime.isDragging = false;
      cleanupDragListeners();
      savePanelGeometry();
    };
    dragHandle.addEventListener("mousedown", startDrag, false);
  }
  function toggleView() {
    hideChartTooltip();
    if (runtime.presentationMode === "PLAYBACK") return;
    cancelHighPulses();
    selectPanelMinimized(!runtime.isMinimized);
    var fullView = document.getElementById("full-view");
    var miniView = document.getElementById("minimized-view");
    var toggleBtn = document.getElementById("btn-toggle");
    var container = document.getElementById("tracker-container");
    var headerText = document.getElementById("header-text");
    var resizeHandle = document.getElementById("resize-handle");
    var anonymousCount = getAnonymousCount();
    var previousTransition = container ? container.style.transition : "";
    if (container) container.style.transition = "none";
    if (runtime.isMinimized) {
      if (fullView) fullView.style.display = "none";
      if (miniView) miniView.style.display = "block";
      if (toggleBtn) toggleBtn.textContent = "+";
      if (container) container.style.width = runtime.BASE_WIDTH_MINI + "px";
      if (resizeHandle) resizeHandle.style.display = "none";
      if (runtime.isResizing) runtime.isResizing = false;
      var currentTotal = runtime.roomTotal > 0 ? runtime.roomTotal : runtime.users.size + anonymousCount;
      if (headerText) headerText.textContent = currentTotal.toLocaleString() + " (H:" + runtime.roomTotalHigh.toLocaleString() + ")";
    } else {
      if (fullView) fullView.style.display = "block";
      if (miniView) miniView.style.display = "none";
      if (toggleBtn) toggleBtn.textContent = "−";
      if (container) container.style.width = runtime.BASE_WIDTH_FULL + "px";
      if (resizeHandle) resizeHandle.style.display = "block";
      var currentTotal = runtime.roomTotal > 0 ? runtime.roomTotal : runtime.users.size + anonymousCount;
      if (headerText) headerText.textContent = "USERS: " + currentTotal.toLocaleString() + " (H:" + runtime.roomTotalHigh.toLocaleString() + ")";
    }
    var settings = document.getElementById("mini-settings");
    if (settings) settings.style.display = "none";
    var settingsButton = document.getElementById("mini-settings-toggle");
    if (settingsButton) settingsButton.setAttribute("aria-expanded", "false");
    updateDisplay();
    if (!runtime.isMinimized) {
      drawAllSparklines();
      constrainPanelPosition();
    }
    constrainPanelPosition();
    if (container) container.style.transition = previousTransition;
  }

  // src/session-replay.js
  function openSessionReplay(file) {
    var archive = validateSessionFile(file);
    leavePlayback(false);
    if (runtime.isMinimized) toggleView();
    openOwnedPlayback({
      url: location.href,
      key: runtime.activeSessionStorageKey,
      generation: runtime.initGuard,
      imported: true,
      archive,
      snapshot: createPlaybackSnapshot(archive.session.history),
      allTimeState: readAllTimeHighs(archive.room)
    }, Date.now(), false);
    cancelHighPulses();
    setPlaybackLayout(true);
    return paintPlayback(runtime.playback);
  }
  async function readSessionFile(file) {
    if (!file) return false;
    var request = nextSessionFileRequest(), url = location.href, generation = runtime.initGuard;
    function current() {
      return request === runtime.sessionFileLoadGeneration && url === location.href && generation === runtime.initGuard;
    }
    try {
      if (file.size > runtime.SESSION_FILE_MAX_BYTES) throw new Error("Session files must be 8 MB or smaller.");
      var text = await file.text();
      if (!current()) return false;
      if (text.length > runtime.SESSION_FILE_MAX_BYTES) throw new Error("Session file is too large.");
      return openSessionReplay(JSON.parse(text.replace(/^\uFEFF/, "")));
    } catch (error) {
      if (current()) alert("Could not open session file: " + error.message);
      return false;
    }
  }

  // src/analysis-chart-data.js
  function analysisSampleIndex(times, time) {
    let left = 0, right = times.length;
    while (left < right) {
      const mid = left + right >>> 1;
      if (times[mid] <= time) left = mid + 1;
      else right = mid;
    }
    return left - 1;
  }
  function inspectAnalysisSample(series, time) {
    const index = analysisSampleIndex(series.times, time);
    if (index < 0 || time > series.times.at(-1)) return { kind: "outside", index: -1, value: null, timestamp: null };
    if (series.times[index] !== time && series.breaks[index + 1]) return { kind: "gap", index, value: null, timestamp: null };
    return { kind: series.times[index] === time ? "sample" : "held", index, value: series.values[index], timestamp: series.timestamps[index] };
  }
  function buildAnalysisPlot(series, start, end, width) {
    const { times, values, breaks } = series;
    const points = [];
    let bucket = null, move = true, maximum = 1, last = -1;
    function flush() {
      if (!bucket) return;
      const indices = [bucket.first, bucket.low, bucket.high, bucket.last].sort((a, b) => a - b);
      indices.forEach((index, i) => {
        if (i && index === indices[i - 1]) return;
        points.push({ time: Math.max(start, times[index]), value: values[index], index, move });
        move = false;
      });
      bucket = null;
    }
    let first = Math.max(0, analysisSampleIndex(times, start));
    while (first > 0 && times[first - 1] === start) first--;
    for (let i = first; i < times.length && times[i] <= end; i++) {
      if (times[i] < start && (i + 1 === times.length || breaks[i + 1])) continue;
      const column = end > start ? Math.floor((Math.max(start, times[i]) - start) / (end - start) * width) : 0;
      if (breaks[i]) {
        flush();
        move = true;
      }
      if (!bucket || bucket.column !== column) {
        flush();
        bucket = { column, first: i, last: i, low: i, high: i };
      } else {
        bucket.last = i;
        if (values[i] < values[bucket.low]) bucket.low = i;
        if (values[i] > values[bucket.high]) bucket.high = i;
      }
      maximum = Math.max(maximum, values[i]);
      last = i;
    }
    flush();
    if (last >= 0 && last + 1 < times.length && !breaks[last + 1] && times[last + 1] > end && times[last] < end) {
      points.push({ time: end, value: values[last], index: last, move: false });
    }
    return { points, maximum };
  }
  function zoomAnalysisWindow(span, start, end, factor, anchor) {
    if (!Number.isFinite(span) || span < 0 || !Number.isFinite(factor) || factor <= 0) throw new Error("Invalid chart range.");
    if (!span) return [0, 0];
    const width = Math.min(span, Math.max(Math.min(1e3, span), (end - start) * factor));
    const center = Math.max(start, Math.min(end, anchor));
    const ratio = end > start ? (center - start) / (end - start) : 0.5;
    const left = Math.max(0, Math.min(span - width, center - width * ratio));
    return [left, left + width];
  }

  // src/analysis-clock-data.js
  var CLOCK_DAY_MS = 24 * 60 * 60 * 1e3;
  function clockTime(timestamp) {
    const date = new Date(timestamp);
    return ((date.getHours() * 60 + date.getMinutes()) * 60 + date.getSeconds()) * 1e3 + date.getMilliseconds();
  }
  function clockSessionDuration(archive) {
    const { timestamps } = archive.session.history;
    if (!timestamps.length) return 0;
    let first = Infinity, last = -Infinity;
    for (const time of timestamps) {
      first = Math.min(first, time);
      last = Math.max(last, time);
    }
    const start = archive.session.sessionStartedAt;
    if (typeof start === "number") first = Math.min(first, start);
    return Math.max(last - first, archive.session.pausedElapsedTime || 0);
  }
  function clockPieces(from, to) {
    const pieces = [];
    while (from < to) {
      const date = new Date(from), offset = date.getTimezoneOffset();
      date.setHours(24, 0, 0, 0);
      let end = Math.min(to, date.getTime());
      if (new Date(end - 1).getTimezoneOffset() !== offset) {
        let lo = from, hi = end;
        while (hi - lo > 1) {
          const mid = Math.floor((lo + hi) / 2);
          if (new Date(mid).getTimezoneOffset() === offset) lo = mid;
          else hi = mid;
        }
        end = hi;
      }
      const start = clockTime(from);
      pieces.push({ start, end: Math.min(CLOCK_DAY_MS, start + end - from) });
      from = end;
    }
    return pieces;
  }
  function projectClockSeries(source) {
    const result = { segments: [], gaps: [], navigation: [], clockChanged: false };
    let segment = null;
    function begin() {
      segment = { times: [], values: [], breaks: [], timestamps: [], indices: [], real: [] };
      result.segments.push(segment);
    }
    function add(time, index, real) {
      segment.times.push(time);
      segment.values.push(source.values[index]);
      segment.breaks.push(false);
      segment.timestamps.push(source.timestamps[index]);
      segment.indices.push(index);
      segment.real.push(real);
    }
    for (let i = 0; i < source.timestamps.length; i++) {
      const current = source.timestamps[i], time = clockTime(current);
      result.navigation.push(time);
      if (!i) {
        begin();
        add(time, i, true);
        continue;
      }
      const previous = source.timestamps[i - 1];
      if (current < previous) {
        result.clockChanged = true;
        begin();
        add(time, i, true);
        continue;
      }
      if (current === previous) {
        if (source.breaks[i]) begin();
        add(time, i, true);
        continue;
      }
      const pieces = clockPieces(previous, current);
      if (new Date(previous).getTimezoneOffset() !== new Date(current).getTimezoneOffset()) result.clockChanged = true;
      if (source.breaks[i]) {
        result.gaps.push(...pieces);
        begin();
        add(time, i, true);
        continue;
      }
      pieces.forEach((piece, j) => {
        if (j) {
          begin();
          add(piece.start, i - 1, false);
        }
        add(piece.end, i - 1, false);
      });
      if (time !== segment.times.at(-1)) begin();
      add(time, i, true);
    }
    result.navigation = [...new Set(result.navigation)].sort((a, b) => a - b);
    return result;
  }
  function inspectClockSample(projection, time) {
    const matches = [];
    for (const segment of projection.segments) {
      if (time === segment.times.at(-1) && !segment.real.at(-1)) continue;
      const sample = inspectAnalysisSample(segment, time);
      if (sample.value === null) continue;
      const index = segment.indices[sample.index], timestamp = sample.timestamp;
      const kind = sample.kind === "sample" && segment.real[sample.index] ? "sample" : "held";
      if (!matches.some((match) => match.index === index)) matches.push({ kind, index, value: sample.value, timestamp });
    }
    return { matches, kind: matches.length ? "covered" : projection.gaps.some((gap) => time >= gap.start && time <= gap.end) ? "gap" : "outside" };
  }
  function buildClockPlot(projection, start, end, width) {
    const points = [];
    let maximum = 1;
    for (const segment of projection.segments) {
      if (segment.times[0] > end || segment.times.at(-1) < start) continue;
      const plot = buildAnalysisPlot(segment, start, end, width);
      points.push(...plot.points);
      maximum = Math.max(maximum, plot.maximum);
    }
    return { points, maximum };
  }

  // src/analysis-follow.js
  function createAnalysisFollower() {
    let enabled = true, identity = null, signature = "", expired = false;
    const snapshots = /* @__PURE__ */ new Map();
    return {
      get enabled() {
        return enabled;
      },
      get expired() {
        return expired;
      },
      get identity() {
        return identity;
      },
      get(id) {
        return snapshots.get(id);
      },
      forget(id) {
        snapshots.delete(id);
      },
      toggle(value) {
        enabled = value;
        signature = "";
      },
      reset() {
        identity = null;
        signature = "";
        expired = false;
        snapshots.clear();
      },
      check(nextIdentity) {
        if (identity !== null && identity !== nextIdentity) {
          enabled = false;
          expired = true;
        }
        return !expired;
      },
      update(nextIdentity, nextSignature, entries, archive) {
        if (!enabled || !this.check(nextIdentity) || !entries.length) return false;
        if (signature === nextSignature && entries.every((entry) => {
          var _a;
          return ((_a = snapshots.get(entry.id)) == null ? void 0 : _a.archive) === archive;
        })) return false;
        identity = nextIdentity;
        signature = nextSignature;
        for (const entry of entries) snapshots.set(entry.id, __spreadProps(__spreadValues({}, entry), { archive }));
        return true;
      },
      project(entries) {
        return entries.map((entry) => snapshots.has(entry.id) ? __spreadProps(__spreadValues({}, entry), { archive: snapshots.get(entry.id).archive }) : entry);
      },
      // Only storage-proven lineage may carry a selection through an Auto
      // replacement. Deleted/reimported and conflicting recordings don't match.
      reconcile(entries) {
        const aliases = /* @__PURE__ */ new Map();
        for (const [id, snapshot] of snapshots) {
          if (!snapshot.lineage) continue;
          const next = entries.find((entry) => entry.lineage === snapshot.lineage);
          if (!next || next.id === id) continue;
          snapshots.delete(id);
          snapshots.set(next.id, __spreadProps(__spreadValues({}, next), { archive: snapshot.archive }));
          aliases.set(id, next.id);
        }
        return aliases;
      }
    };
  }

  // src/tools-view-helpers.js
  function toolNode(parent, tag, text, className) {
    const node = document.createElement(tag);
    if (text !== void 0) node.textContent = text;
    if (className) node.className = className;
    parent.appendChild(node);
    return node;
  }
  function toolButton(parent, text, action, id) {
    const button = toolNode(parent, "button", text);
    button.type = "button";
    button.onclick = action;
    if (id) button.id = id;
    return button;
  }
  function recordingFilters(parent, entries, state, prefix, changed, organization = false) {
    const controls = toolNode(parent, "div", void 0, "tools-filters");
    const modelRow = toolNode(controls, "div", void 0, "tools-model-filters");
    const label = toolNode(modelRow, "label", "Model ", "tools-model-filter"), model = toolNode(label, "select");
    model.id = prefix + "-model";
    const rooms = [...new Set(entries.map((entry) => entry.archive.room.toLowerCase()))].sort();
    for (const [value, name] of [["", organization ? "All models (folders)" : "All models"], ...organization ? [["*", "All sessions"]] : [], ...rooms.map((room2) => [room2, room2])]) {
      const option = toolNode(model, "option", name);
      option.value = value;
    }
    if (![...model.options].some((option) => option.value === (state.room || ""))) state.room = "";
    model.value = state.room || "";
    model.onchange = () => {
      state.room = model.value;
      changed();
    };
    if (organization) {
      const label2 = toolNode(modelRow, "label", "Sort ", "tools-sort-filter"), sort = toolNode(label2, "select");
      sort.id = prefix + "-sort";
      for (const [value, name] of [["newest", "Newest First"], ["oldest", "Oldest First"], ["alphabetical", "Alphabetical"], ["favorites", "Favorites First"], ["mostSessions", "Highest number of sessions"], ["fewestSessions", "Lowest number of sessions"]]) {
        const option = toolNode(sort, "option", name);
        option.value = value;
      }
      sort.value = state.sort || "newest";
      sort.onchange = () => {
        state.sort = sort.value;
        changed();
      };
      const favoriteLabel = toolNode(modelRow, "label", void 0, "tools-favorites-filter"), favorite = toolNode(favoriteLabel, "input");
      favorite.type = "checkbox";
      favorite.id = prefix + "-favorites";
      favorite.checked = !!state.favorites;
      toolNode(favoriteLabel, "span", "Favorites only");
      favorite.onchange = () => {
        state.favorites = favorite.checked;
        changed();
      };
    }
    const dates = toolNode(controls, "div", void 0, "tools-date-filters");
    dates.title = "First retained sample, in your browser’s local timezone. Through includes the whole day.";
    for (const [key, name] of [["from", "From"], ["to", "Through"]]) {
      const label2 = toolNode(dates, "label", name + " "), input = toolNode(label2, "input");
      input.type = "date";
      input.id = prefix + "-" + key;
      input.value = state[key] || "";
      input.onchange = () => {
        state[key] = input.value;
        changed();
      };
    }
    const searchLabel = toolNode(controls, "label", "Find ", "tools-search"), search = toolNode(searchLabel, "input");
    search.type = "search";
    search.id = prefix + "-search";
    search.placeholder = "Title, model or notes";
    search.value = state.query || "";
    search.oninput = () => {
      state.query = search.value;
      changed();
    };
    toolButton(controls, "Clear filters", () => {
      Object.assign(state, { room: "", from: "", to: "", query: "", favorites: false, sort: "newest" });
      model.value = "";
      search.value = "";
      controls.querySelectorAll("input[type=date]").forEach((input) => {
        input.value = "";
      });
      if (organization) {
        controls.querySelector("input[type=checkbox]").checked = false;
        controls.querySelector("#" + prefix + "-sort").value = "newest";
      }
      changed();
    }, prefix + "-clear");
    return { model, search };
  }

  // src/analysis-metric-view.js
  function renderMetricStrip(parent, choices, selected, changed, id = "tools-metric") {
    const group = toolNode(parent, "div", void 0, "tools-metric-strip");
    group.id = id;
    group.setAttribute("role", "radiogroup");
    group.setAttribute("aria-label", "Chart metric");
    const caption = toolNode(parent, "p", void 0, "tools-metric-caption");
    caption.id = id + "-caption";
    group.setAttribute("aria-describedby", caption.id);
    const radios = [];
    function select(index, focus = false) {
      radios.forEach((radio, i) => {
        radio.setAttribute("aria-checked", String(i === index));
        radio.tabIndex = i === index ? 0 : -1;
      });
      caption.textContent = choices[index].label;
      if (focus) radios[index].focus();
    }
    choices.forEach((choice, index) => {
      const radio = toolButton(group, "", () => {
        if (radio.getAttribute("aria-checked") === "true") return;
        select(index);
        changed(choice.key);
      }, id + "-" + choice.key);
      radios.push(radio);
      radio.dataset.metric = choice.key;
      radio.setAttribute("role", "radio");
      radio.setAttribute("aria-label", choice.label);
      radio.title = choice.label;
      const icon = toolNode(radio, "span", choice.icon || "", choice.icon ? "tools-metric-icon" : "tools-metric-circle");
      icon.setAttribute("aria-hidden", "true");
      icon.style.setProperty("--metric-color", choice.color);
      radio.onkeydown = (event) => {
        let next = index;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % choices.length;
        else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index + choices.length - 1) % choices.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = choices.length - 1;
        else return;
        event.preventDefault();
        select(next, true);
        changed(choices[next].key);
      };
    });
    select(Math.max(0, choices.findIndex((choice) => choice.key === selected)));
    return group;
  }

  // src/favorite-controls.js
  function changeModelFavorite(room2, enableOnly = false) {
    const previous = readModelFavorite(room2);
    if (previous.favorite && !enableOnly) {
      setModelFavorite(room2, false);
      clearAutomaticLibraryStatus(room2);
      return true;
    }
    const limits = readLibraryLimits(), minimumMinutes = readAutomaticKeepingMinutes();
    if (!confirm("Favorite " + room2 + " and automatically keep their live sessions?\n\nWhile TierScope is recording this model, sessions will be kept in this browser’s Library after " + minimumMinutes + " minutes of recorded coverage (excluding pauses and gaps). Change this in Library → Storage limits → Automatic keeping. The same session is updated as it grows, at most once per minute as samples arrive, and on pause, Stop or leaving the room. The current live session qualifies once it reaches this minimum. Replay files are never added automatically.\n\nLibrary limits still apply (" + limits.maxSessions.toLocaleString() + " sessions / " + limits.maxMegabytes + " MB). Nothing is deleted automatically. Removing the star stops automatic keeping; sessions already kept remain.")) return false;
    setModelFavorite(room2, true, true);
    keepFavoriteSession(room2, true);
    return true;
  }

  // src/session-analysis.js
  var ANALYSIS_METRICS = Object.freeze({
    room: "Room audience",
    total: "Registered viewers",
    withTokens: "Viewers with tokens",
    red: "Moderators",
    green: "Fan club",
    purple: "Dark purple",
    pink: "Light purple",
    "dark-blue": "Dark blue",
    "light-blue": "Light blue",
    gray: "Grey",
    "female-trans": "Female / trans",
    anonymous: "Anonymous viewers"
  });
  function analysisSeries(archive, metric) {
    if (!Object.prototype.hasOwnProperty.call(ANALYSIS_METRICS, metric)) throw new Error("Unknown analysis metric.");
    const history = archive.session.history;
    const values = metric === "room" ? (
      /** @type {number[]} */
      history.total.map((v, i) => v + /** @type {number[]} */
      history.anonymous[i])
    ) : (
      /** @type {number[]} */
      history[metric]
    );
    const origin = history.timestamps[0];
    const times = history.timestamps.map((time) => time - origin);
    for (let i = 0; i < times.length; i++) times[i] = Math.max(0, times[i], i ? times[i - 1] : 0);
    return { times, values, breaks: history.breaks || times.map(() => false) };
  }
  function summarizeSession(archive, metric = "room", threshold = 100, limitMs = Infinity) {
    if (!Number.isFinite(threshold) || threshold < 0 || !(limitMs >= 0)) throw new Error("Invalid summary range or threshold.");
    const { times, values, breaks } = analysisSeries(archive, metric);
    const end = Math.min(times.length ? times[times.length - 1] : 0, limitMs);
    let coveredMs = 0, weighted = 0, registeredWeight = 0, tokenWeight = 0, atOrAboveMs = 0, peak = 0, samples = 0;
    let peakTime = null;
    for (let i = 0; i < times.length && times[i] <= end; i++) {
      samples++;
      if (peakTime === null || values[i] > peak) {
        peak = values[i];
        peakTime = archive.session.history.timestamps[i];
      }
      if (i + 1 >= times.length || breaks[i + 1]) continue;
      const duration = Math.max(0, Math.min(end, times[i + 1]) - times[i]);
      coveredMs += duration;
      weighted += duration * values[i];
      registeredWeight += duration * /** @type {number[]} */
      archive.session.history.total[i];
      tokenWeight += duration * /** @type {number[]} */
      archive.session.history.withTokens[i];
      if (values[i] >= threshold) atOrAboveMs += duration;
    }
    return {
      samples,
      spanMs: end,
      coveredMs,
      gapMs: end - coveredMs,
      peak,
      peakTime,
      sessionPeak: metric === "room" ? archive.session.roomTotalHigh : archive.session.sessionHighs[metric].value,
      mean: coveredMs ? weighted / coveredMs : null,
      tokenShare: registeredWeight ? tokenWeight / registeredWeight * 100 : null,
      atOrAboveMs,
      coverage: end ? coveredMs / end * 100 : null
    };
  }
  function summarizeAudience(archive) {
    const audience = ["room", "total", "withTokens", "anonymous"].map((metric) => __spreadValues({ metric }, summarizeSession(archive, metric)));
    const [room2, registered, tokens, anonymous] = audience;
    return {
      audience,
      tokenShareRegistered: registered.tokenShare,
      tokenShareRoom: room2.mean && tokens.mean !== null ? tokens.mean / room2.mean * 100 : null,
      anonymousShareRoom: room2.mean && anonymous.mean !== null ? anonymous.mean / room2.mean * 100 : null
    };
  }
  var ANALYSIS_MAX_THRESHOLDS = 8;
  function averageAnalysisThresholds(mean) {
    if (mean === null) return [];
    if (!Number.isFinite(mean) || mean < 0) throw new Error("Invalid session average.");
    return [...new Set([0.75, 1, 1.25].map((factor) => Math.min(Number.MAX_SAFE_INTEGER, Math.round(mean * factor))))];
  }
  function parseAnalysisThresholds(text) {
    const parts = text.split(",").map((part) => part.trim());
    if (!parts.length || parts.length > ANALYSIS_MAX_THRESHOLDS || parts.some((part) => !/^\d+$/.test(part) || !Number.isSafeInteger(Number(part)))) {
      throw new Error("Enter 1–" + ANALYSIS_MAX_THRESHOLDS + " non-negative whole numbers separated by commas, without thousands separators.");
    }
    return [...new Set(parts.map(Number))].sort((a, b) => a - b);
  }
  function summarizeThresholds(archive, metric, thresholds) {
    if (!thresholds.length || thresholds.length > ANALYSIS_MAX_THRESHOLDS || thresholds.some((value) => !Number.isSafeInteger(value) || value < 0)) {
      throw new Error("Invalid analysis thresholds.");
    }
    return thresholds.map((threshold) => {
      const summary = summarizeSession(archive, metric, threshold);
      return {
        threshold,
        durationMs: summary.coveredMs ? summary.atOrAboveMs : null,
        percent: summary.coveredMs ? summary.atOrAboveMs / summary.coveredMs * 100 : null
      };
    });
  }
  function compareSessions(a, b, metric = "room", threshold = 100, sharedLength = true) {
    const sa = analysisSeries(a, metric), sb = analysisSeries(b, metric);
    const spanA = sa.times.length ? sa.times[sa.times.length - 1] : 0;
    const spanB = sb.times.length ? sb.times[sb.times.length - 1] : 0;
    const limitMs = sharedLength ? Math.min(spanA, spanB) : Infinity;
    return {
      a: summarizeSession(a, metric, threshold, limitMs),
      b: summarizeSession(b, metric, threshold, limitMs),
      limitMs,
      axisMs: sharedLength ? limitMs : Math.max(spanA, spanB)
    };
  }
  var MAX_COMPARE_RECORDINGS = 12;
  function compareRecordingSet(archives, metric = "room", threshold = 100, sharedLength = true) {
    if (!archives.length || archives.length > MAX_COMPARE_RECORDINGS) throw new Error("Compare up to twelve sessions.");
    const spans = archives.map((archive) => analysisSeries(archive, metric).times.at(-1) || 0);
    const limitMs = sharedLength ? Math.min(...spans) : Infinity;
    return {
      summaries: archives.map((archive) => summarizeSession(archive, metric, threshold, limitMs)),
      axisMs: sharedLength ? limitMs : Math.max(...spans),
      limitMs
    };
  }

  // src/analysis-preference-data.js
  var ANALYSIS_PREFERENCE_KEY = "tierscope:ui:analysis:v1";
  var DEFAULT_ANALYSIS_PREFERENCES = Object.freeze({
    metric: "room",
    threshold: 100,
    summaryThresholds: Object.freeze([25, 50, 100]),
    sharedLength: true
  });
  function validateAnalysisPreferences(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid analysis preferences.");
    const value = (
      /** @type {Record<string, any>} */
      input
    );
    if (Object.keys(value).some((key) => !Object.hasOwn(DEFAULT_ANALYSIS_PREFERENCES, key)) || !Object.hasOwn(ANALYSIS_METRICS, value.metric) || !Number.isSafeInteger(value.threshold) || value.threshold < 0 || typeof value.sharedLength !== "boolean" || !Array.isArray(value.summaryThresholds) || !value.summaryThresholds.length || value.summaryThresholds.length > ANALYSIS_MAX_THRESHOLDS || value.summaryThresholds.some((number) => !Number.isSafeInteger(number) || number < 0)) throw new Error("Invalid analysis preferences.");
    return Object.freeze({
      metric: String(value.metric),
      threshold: Number(value.threshold),
      sharedLength: value.sharedLength,
      summaryThresholds: Object.freeze([...new Set(
        /** @type {number[]} */
        value.summaryThresholds
      )].sort((a, b) => a - b))
    });
  }

  // src/backup.js
  var BACKUP_MAX_BYTES = LIBRARY_TRANSFER_MAX_BYTES;
  var preferenceKeys = Object.freeze({
    theme: "tierscope:ui:theme:v1",
    highMode: "tierscope:ui:highMode:v1",
    miniMetric: "tierscope:ui:miniMetric:v1",
    chartWindow: "tierscope:ui:chartWindow:v1",
    collapsedRows: "tierscope:ui:collapsedRows:v1",
    geometry: "tierscope:ui:geometry:v1"
  });
  function validateBackupPreferences(preferences) {
    if (!preferences || typeof preferences !== "object" || Array.isArray(preferences)) throw new Error("Invalid saved preferences.");
    const clean = {};
    for (const [name, value] of Object.entries(preferences)) {
      if (!Object.prototype.hasOwnProperty.call(preferenceKeys, name)) throw new Error("Unknown saved preference: " + name);
      const choices = {
        theme: ["dark", "bright"],
        highMode: ["sh", "ath"],
        miniMetric: ["room", "withTokens", "total"],
        chartWindow: ["full", "fourHours", "twoHours", "hour", "halfHour", "quarter"]
      };
      if (name === "geometry") {
        if (!value || !Number.isFinite(value.left) || !Number.isFinite(value.top) || !Number.isFinite(value.scale) || value.scale < 0.5 || value.scale > 3) throw new Error("Invalid panel geometry.");
        clean[name] = { left: value.left, top: value.top, scale: value.scale };
      } else if (name === "collapsedRows") {
        if (!Array.isArray(value) || value.length > runtime.PANEL_ROWS.length || value.some((key) => !runtime.PANEL_ROWS.some((row) => row.key === key))) throw new Error("Invalid collapsed rows.");
        clean[name] = [...new Set(value)];
      } else {
        if (!choices[name].includes(value)) throw new Error("Invalid preference: " + name);
        clean[name] = value;
      }
    }
    return clean;
  }
  function validateTierScopeBackup(input) {
    if (!input || input.format !== "TierScopeBackup" || input.formatVersion !== 1 || typeof input.producerVersion !== "string" || input.producerVersion.length > 40 || !Array.isArray(input.rooms) || input.rooms.length > LIBRARY_TRANSFER_MAX_COUNT || !Array.isArray(input.library) || input.library.length > LIBRARY_TRANSFER_MAX_COUNT) {
      throw new Error("This is not a supported TierScope backup.");
    }
    const seen = /* @__PURE__ */ new Set();
    const rooms = input.rooms.map((record) => {
      const room2 = record && allTimeRoom(record.room);
      if (!room2 || seen.has(room2)) throw new Error("Invalid or duplicate room in backup.");
      seen.add(room2);
      validateAllTimeRecord({ schemaVersion: 1, room: room2, epoch: "backup", highs: record.highs }, room2);
      const highs = emptyAllTimeHighs();
      mergeAllTimeHighs(highs, record.highs);
      return { room: room2, highs };
    });
    const library = input.library.map((entry) => __spreadProps(__spreadValues({ title: libraryTitle(entry.title) }, libraryMetadata(entry)), { archive: validateSessionFile(entry.archive) }));
    const backup = {
      format: "TierScopeBackup",
      formatVersion: 1,
      producerVersion: input.producerVersion,
      rooms,
      preferences: validateBackupPreferences(input.preferences),
      library
    };
    backup.favoriteModels = validateFavoriteModels(input.favoriteModels === void 0 ? library.filter((entry) => entry.favorite).map((entry) => entry.archive.room) : input.favoriteModels);
    if (input.analysisPreferences !== void 0) backup.analysisPreferences = validateAnalysisPreferences(input.analysisPreferences);
    if (input.recovery !== void 0) {
      const keys = input.recovery && input.recovery.omittedLibraryKeys;
      if (!Array.isArray(keys) || !keys.length || keys.length > 1e4 || keys.some((key) => typeof key !== "string" || !key.startsWith(LIBRARY_PREFIX) || key.length > 256) || new Set(keys).size !== keys.length) throw new Error("Invalid partial-backup recovery notice.");
      backup.recovery = { omittedLibraryKeys: keys.slice() };
    }
    if (new Blob([JSON.stringify(backup)]).size > BACKUP_MAX_BYTES) throw new Error("Backup exceeds 300 MB.");
    return backup;
  }
  function createTierScopeBackup(includeLibrary = true, allowPartialLibrary = false) {
    const rooms = /* @__PURE__ */ new Set();
    for (const key of GM_listValues()) {
      if (key.startsWith(runtime.ALL_TIME_PREFIX)) {
        const room2 = allTimeRoom(key.slice(runtime.ALL_TIME_PREFIX.length).split(":")[0]);
        if (room2) rooms.add(room2);
      }
    }
    for (const room2 of runtime.allTimeCache.keys()) if (allTimeRoom(room2)) rooms.add(room2);
    const records = [...rooms].sort().map((room2) => {
      const state = readAllTimeHighs(room2);
      if (state.error || state.skipped) throw new Error("Could not read all ATH records for " + room2 + ". Existing data was left intact.");
      return { room: room2, highs: state.highs };
    });
    const preferences = {
      theme: runtime.isDarkMode ? "dark" : "bright",
      highMode: runtime.highMode,
      miniMetric: runtime.miniMetric,
      chartWindow: runtime.chartWindowMode,
      collapsedRows: [...runtime.collapsedRows]
    };
    if (runtime.panelGeometry) preferences.geometry = runtime.panelGeometry;
    for (const [name, key] of Object.entries(preferenceKeys)) {
      const saved = GM_getValue(key, null);
      if (saved !== null) preferences[name] = name === "geometry" || name === "collapsedRows" ? JSON.parse(saved) : saved;
    }
    const library = includeLibrary ? readSessionLibrary() : { entries: [], damaged: [] };
    if (library.damaged.length && !allowPartialLibrary) throw new Error("The library contains unreadable sessions. Choose the healthy-sessions option to make a partial backup, or export ATH/preferences separately.");
    const rawAnalysis = GM_getValue(ANALYSIS_PREFERENCE_KEY, null);
    const modelState = includeLibrary ? readModelFavorites(library.entries) : { favorites: /* @__PURE__ */ new Set(), errors: [] };
    if (modelState.errors.length) throw new Error("Some model favorites could not be read. Refresh the library or back up without Library until they can be read.");
    return validateTierScopeBackup(__spreadValues(__spreadValues({
      format: "TierScopeBackup",
      formatVersion: 1,
      producerVersion: runtime.TIERSCOPE_VERSION,
      rooms: records,
      preferences,
      library: library.entries.map((entry) => ({ title: entry.title, notes: entry.notes, archive: entry.archive })),
      favoriteModels: [...modelState.favorites]
    }, rawAnalysis === null ? {} : { analysisPreferences: validateAnalysisPreferences(JSON.parse(rawAnalysis)) }), library.damaged.length ? { recovery: { omittedLibraryKeys: library.damaged } } : {}));
  }
  function createLibraryRecoveryExport() {
    const state = readSessionLibrary();
    const records = state.damaged.map((key) => {
      try {
        const value = GM_getValue(key, void 0);
        if (value === void 0) return { key, error: "Record no longer present." };
        if (JSON.stringify(value) === void 0) throw new Error("Value is not JSON data.");
        return { key, value };
      } catch (error) {
        return { key, error: "Record could not be read or exported: " + String(error.message || error) };
      }
    });
    return { format: "TierScopeLibraryRecovery", formatVersion: 1, producerVersion: runtime.TIERSCOPE_VERSION, records };
  }
  function restoreTierScopeBackup(input, options = { highs: true, preferences: true, library: true }) {
    const backup = validateTierScopeBackup(input), writes = [], epochs = [];
    const newLibrary = options.library ? planLibraryAdditions(backup.library) : [];
    if (options.highs) for (const record of backup.rooms) {
      const state = readAllTimeHighs(record.room);
      if (state.error || state.skipped) throw new Error("Cannot safely merge ATH for " + record.room + ". No backup data was written.");
      const highs = emptyAllTimeHighs();
      mergeAllTimeHighs(highs, state.highs);
      if (mergeAllTimeHighs(highs, record.highs)) {
        const key = runtime.ALL_TIME_PREFIX + record.room + ":" + state.epoch + ":" + makeStorageId();
        writes.push({ key, value: JSON.stringify({ schemaVersion: 1, room: record.room, epoch: state.epoch, highs }) });
        epochs.push({ room: record.room, epoch: state.epoch });
      }
    }
    writes.push(...newLibrary);
    const modelWrites = options.library ? planModelFavoriteWrites(backup.favoriteModels) : [];
    writes.push(...modelWrites);
    if (options.preferences) for (const [name, value] of Object.entries(backup.preferences)) {
      writes.push({ key: preferenceKeys[name], value: name === "geometry" || name === "collapsedRows" ? JSON.stringify(value) : value });
    }
    if (options.preferences && backup.analysisPreferences) writes.push({ key: ANALYSIS_PREFERENCE_KEY, value: JSON.stringify(backup.analysisPreferences) });
    const touched = [];
    try {
      for (const write of writes) {
        const before = GM_getValue(write.key, void 0);
        if (Object.prototype.hasOwnProperty.call(write, "expectedBefore") && before !== write.expectedBefore) throw new Error("Model favorites changed in another tab. Refresh and retry.");
        touched.push(__spreadProps(__spreadValues({}, write), { before }));
        GM_setValue(write.key, write.value);
      }
      for (const { room: room2, epoch } of epochs) {
        if (GM_getValue(runtime.ALL_TIME_EPOCH_PREFIX + room2, "initial") !== epoch) throw new Error("ATH was cleared in another tab during restore.");
      }
      if (newLibrary.length) verifyLibraryCapacity();
    } catch (error) {
      let rollbackFailed = false;
      for (const write of touched.reverse()) {
        try {
          if (GM_getValue(write.key, null) !== write.value) continue;
          if (write.before === void 0) GM_deleteValue(write.key);
          else GM_setValue(write.key, write.before);
        } catch (rollbackError) {
          rollbackFailed = true;
        }
      }
      backup.rooms.forEach((record) => readAllTimeHighs(record.room));
      throw new Error((rollbackFailed ? "Restore incomplete; some changes may remain. Keep the backup and retry. " : "Restore failed; its writes were rolled back. ") + error.message);
    }
    finalizeLibraryWrites(newLibrary);
    backup.rooms.forEach((record) => readAllTimeHighs(record.room));
    return {
      rooms: epochs.length,
      recordings: newLibrary.filter((write) => !write.updated).length,
      updatedRecordings: newLibrary.filter((write) => write.updated).length,
      favoriteModels: modelWrites.length,
      preferences: options.preferences ? Object.keys(backup.preferences).length + (backup.analysisPreferences ? 1 : 0) : 0
    };
  }

  // src/analysis-preferences.js
  var analysisPreferences = DEFAULT_ANALYSIS_PREFERENCES;
  var analysisPreferencesPending = false;
  var analysisPreferencesError = "";
  function readAnalysisPreferences() {
    if (!analysisPreferencesPending) {
      try {
        const raw = GM_getValue(ANALYSIS_PREFERENCE_KEY, null);
        analysisPreferences = raw === null ? DEFAULT_ANALYSIS_PREFERENCES : validateAnalysisPreferences(JSON.parse(raw));
        analysisPreferencesError = "";
      } catch (error) {
        analysisPreferencesError = "Saved analysis preferences could not be read. Using the choices available in this tab.";
      }
    }
    return { preferences: analysisPreferences, error: analysisPreferencesError };
  }
  function rememberAnalysisPreferences(patch) {
    const current = readAnalysisPreferences().preferences;
    analysisPreferences = validateAnalysisPreferences(__spreadValues(__spreadValues({}, current), patch));
    analysisPreferencesPending = true;
    try {
      GM_setValue(ANALYSIS_PREFERENCE_KEY, JSON.stringify(analysisPreferences));
      analysisPreferencesPending = false;
      analysisPreferencesError = "";
    } catch (error) {
      analysisPreferencesError = "Analysis choices are kept in this tab only. Saving will retry when you change a choice.";
    }
    return { preferences: analysisPreferences, error: analysisPreferencesError };
  }

  // src/data-io.js
  function downloadDataFile(value, filename) {
    const blob = new Blob([JSON.stringify(value)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob), link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    try {
      link.click();
    } finally {
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 6e4);
    }
  }
  async function readDataFile(file, maxBytes) {
    if (!file || file.size > maxBytes) throw new Error("File is too large (maximum " + Math.round(maxBytes / 1024 / 1024) + " MB).");
    const text = await file.text();
    if (new Blob([text]).size > maxBytes) throw new Error("File is too large.");
    return JSON.parse(text.replace(/^\uFEFF/, ""));
  }

  // src/library-dock.js
  function attachLibraryDock(panel, library, onTheme) {
    const original = { left: panel.style.left, top: panel.style.top, right: panel.style.right };
    let lastPosition = __spreadValues({}, original), movedByUser = false, borrowed = false, frame = 0, closed = false;
    let previousTheme = "";
    let previousBackground = "";
    const position = () => ({ left: panel.style.left, top: panel.style.top, right: panel.style.right });
    function arrange() {
      frame = 0;
      if (closed || !panel.isConnected || !library.isConnected) return;
      const now = position();
      if (Object.keys(now).some((key) => now[key] !== lastPosition[key])) movedByUser = true;
      let rect = panel.getBoundingClientRect();
      const scale = Math.max(0.9, Math.min(1.6, Number(panel.dataset.scale) || 1));
      const width = Math.round(370 * scale), margin = 8;
      const docked = window.innerWidth >= rect.width + width + margin * 2;
      if (docked) {
        const left = Math.max(width + margin - 1, Math.min(rect.left, window.innerWidth - rect.width - margin));
        if (Math.abs(left - rect.left) > 0.5) {
          panel.style.left = left + "px";
          panel.style.right = "auto";
          borrowed = true;
          rect = panel.getBoundingClientRect();
        }
      }
      lastPosition = position();
      const height = Math.min(window.innerHeight - margin * 2, Math.max(420, rect.height));
      const top = Math.max(margin, Math.min(rect.top, window.innerHeight - height - margin));
      const styles = {
        left: (docked ? rect.left - width + 1 : margin) + "px",
        top: top + "px",
        width: (docked ? width : Math.min(window.innerWidth - margin * 2, 520)) + "px",
        height: height + "px",
        fontSize: 11 * scale + "px"
      };
      for (const [key, value] of Object.entries(styles)) if (library.style[key] !== value) library.style[key] = value;
      const mode = docked ? "docked" : "sheet";
      if (panel.dataset.libraryOpen !== mode) panel.dataset.libraryOpen = mode;
      if (library.dataset.layout !== mode) library.dataset.layout = mode;
      const background = window.getComputedStyle(panel).backgroundColor;
      if (background !== previousBackground) {
        previousBackground = background;
        library.style.backgroundColor = background;
      }
      const theme = panel.getAttribute("data-theme") || "dark";
      if (theme !== previousTheme) {
        previousTheme = theme;
        library.dataset.theme = theme;
        setThemeVariables(library);
        if (onTheme) onTheme();
      }
    }
    function schedule() {
      if (!closed && !frame) frame = window.requestAnimationFrame(arrange);
    }
    const resize = window.ResizeObserver ? new window.ResizeObserver(schedule) : null;
    if (resize) resize.observe(panel);
    const mutation = new window.MutationObserver(schedule);
    mutation.observe(panel, { attributes: true, attributeFilter: ["style", "data-scale", "data-theme"] });
    window.addEventListener("resize", schedule);
    arrange();
    return () => {
      closed = true;
      if (frame) window.cancelAnimationFrame(frame);
      if (resize) resize.disconnect();
      mutation.disconnect();
      window.removeEventListener("resize", schedule);
      delete panel.dataset.libraryOpen;
      if (borrowed && !movedByUser) for (const [key, value] of Object.entries(original)) panel.style[key] = value;
    };
  }

  // src/library-capacity-view.js
  function renderLibraryCapacity(parent, usage, limits, error, save) {
    const section = toolNode(parent, "section");
    section.id = "tools-library-storage";
    const counter = toolNode(section, "p", "", "tools-muted");
    counter.id = "tools-library-usage";
    const notice = toolNode(section, "p", "", "tools-capacity-warning");
    notice.id = "tools-library-capacity-warning";
    notice.setAttribute("role", "status");
    function refresh(nextUsage, nextLimits, nextError) {
      counter.textContent = nextUsage.count.toLocaleString() + " / " + (nextLimits ? nextLimits.maxSessions.toLocaleString() : "?") + " sessions · " + (nextUsage.bytes / LIBRARY_MEGABYTE).toFixed(2) + " / " + (nextLimits ? nextLimits.maxMegabytes : "?") + " MB";
      notice.textContent = nextError || (nextLimits ? libraryCapacityNotice(nextUsage, nextLimits) : "");
      notice.hidden = !notice.textContent;
    }
    refresh(usage, limits, error);
    const settings = toolNode(section, "details");
    settings.id = "tools-storage-settings";
    toolNode(settings, "summary", "Storage limits");
    const form = toolNode(settings, "form");
    form.id = "tools-storage-form";
    toolNode(form, "p", "For all models in this browser. Sessions are kept until you delete them.", "tools-muted");
    const fields = toolNode(form, "div", void 0, "tools-capacity-fields");
    const inputs = {};
    for (const [key, label, id] of [["maxSessions", "Sessions", "tools-storage-sessions"], ["maxMegabytes", "Storage (MB)", "tools-storage-megabytes"]]) {
      const wrapper = toolNode(fields, "label", label), input = toolNode(wrapper, "input");
      input.type = "number";
      input.id = id;
      input.min = "1";
      input.max = String(LIBRARY_LIMIT_RANGES[key]);
      input.step = "1";
      input.required = true;
      input.value = String((limits || DEFAULT_LIBRARY_LIMITS)[key]);
      inputs[key] = input;
    }
    toolNode(form, "p", "Defaults: 1,000 sessions / 50 MB. Choose up to 10,000 sessions / 250 MB. Larger libraries can take longer to open and back up.", "tools-muted");
    toolNode(form, "p", "Lowering limits never deletes sessions. Saves wait if usage exceeds a limit. Updates need spare space; browser storage can fill before these limits.", "tools-muted");
    const actions = toolNode(form, "div", void 0, "tools-actions");
    const submit = toolButton(actions, "Save limits", null, "tools-storage-save");
    submit.type = "submit";
    submit.className = "tools-primary";
    toolButton(actions, "Use defaults", () => {
      for (const [key, input] of Object.entries(inputs)) input.value = String(DEFAULT_LIBRARY_LIMITS[key]);
      inputs.maxSessions.focus();
    }, "tools-storage-defaults");
    const feedback = toolNode(form, "p", "", "tools-capacity-warning");
    feedback.id = "tools-storage-error";
    feedback.setAttribute("role", "alert");
    feedback.hidden = true;
    form.onsubmit = (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      try {
        save({ maxSessions: inputs.maxSessions.valueAsNumber, maxMegabytes: inputs.maxMegabytes.valueAsNumber });
      } catch (failure) {
        feedback.textContent = "Storage limit save failed. " + failure.message;
        feedback.hidden = false;
      }
    };
    return refresh;
  }
  function renderAutomaticKeepingSettings(parent, minutes, error, save) {
    const settings = toolNode(parent, "section");
    settings.id = "tools-automatic-settings";
    settings.style.borderTop = "1px solid var(--panel-divider)";
    settings.style.marginTop = "10px";
    const heading = toolNode(settings, "h4", "Automatic keeping");
    heading.style.margin = "10px 0 5px";
    const form = toolNode(settings, "form");
    toolNode(form, "p", "For favorite models in this browser. Short sessions stay live without being added automatically. Manual Keep in Library works at any length.", "tools-muted");
    const label = toolNode(form, "label", "Minimum recorded duration (minutes) "), input = toolNode(label, "input");
    label.style.display = "grid";
    input.style.width = "100%";
    input.id = "tools-automatic-minutes";
    input.type = "number";
    input.min = "0";
    input.max = "1440";
    input.step = "1";
    input.required = true;
    input.value = String(minutes != null ? minutes : 5);
    toolNode(form, "p", "Default: 5 minutes of retained sample coverage. Pauses and recording gaps do not count. Use 0 to keep from the first sample. Existing saved sessions are never removed.", "tools-muted");
    const submit = toolButton(form, "Save automatic keeping", null, "tools-automatic-save");
    submit.type = "submit";
    const feedback = toolNode(form, "p", error || "", "tools-capacity-warning");
    feedback.setAttribute("role", "alert");
    feedback.hidden = !error;
    form.onsubmit = (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      try {
        save(input.valueAsNumber);
      } catch (failure) {
        feedback.textContent = failure.message;
        feedback.hidden = false;
      }
    };
  }

  // src/library-shell.js
  function libraryShell() {
    return `<style>
#tracker-container[data-library-open=docked]{border-top-left-radius:0!important;border-bottom-left-radius:0!important}
#tierscope-session-tools{position:fixed;inset:auto;margin:0;padding:0;box-sizing:border-box;max-width:none;max-height:none;min-width:0;border:1px solid #ff69b4;border-radius:7px 0 0 7px;background:var(--panel-solid);color:var(--panel-text);font:11px/1.45 Arial,sans-serif;z-index:999998;box-shadow:-8px 5px 24px #0004;overflow:hidden;display:flex;flex-direction:column;container:tierscope-library / inline-size}
#tierscope-session-tools[data-layout=sheet]{border-radius:7px;box-shadow:0 8px 32px #0007}
#tierscope-session-tools[data-layout=docked]::after{content:'';position:absolute;pointer-events:none;inset:0 0 0 auto;width:9px;background:linear-gradient(90deg,transparent,#0002);border-right:1px solid #ff69b450}
#tierscope-session-tools *{box-sizing:border-box}
#tierscope-session-tools button,#tierscope-session-tools select,#tierscope-session-tools input,#tierscope-session-tools textarea,#tierscope-session-tools summary{font:inherit;color:var(--panel-text);background:var(--panel-button);border:1px solid var(--panel-divider);border-radius:3px;padding:4px 7px;max-width:100%;min-width:0}
#tierscope-session-tools button,#tierscope-session-tools summary{cursor:pointer}
#tierscope-session-tools button:hover,#tierscope-session-tools summary:hover{border-color:var(--panel-accent)}
#tierscope-session-tools button:disabled{opacity:.45;cursor:default}
#tierscope-session-tools :is(button,select,input,textarea,summary):focus-visible{outline:2px solid #ff69b4;outline-offset:2px}
#tierscope-session-tools .tools-primary{background:#ff69b420;border-color:#ff69b4;color:var(--panel-accent);font-weight:bold}
#tierscope-session-tools .tools-quiet,#tierscope-session-tools .tools-quiet:hover{border-color:transparent;background:transparent}
#tierscope-session-tools .tools-follow{padding:5px 0;border-bottom:1px solid var(--panel-divider)}
#tierscope-session-tools .tools-follow>label{color:var(--panel-accent);font-weight:bold}
#tierscope-session-tools .tools-danger{color:var(--panel-negative)}
#tierscope-session-tools .tools-head{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:9px 12px;border-bottom:1px solid #ff69b4;background:rgba(255,105,180,.06);flex-shrink:0}
#tierscope-session-tools h2{font-size:1.15em;letter-spacing:.04em;margin:0;color:var(--panel-accent)}
#tierscope-session-tools .tools-subtitle{font-size:.9em;color:var(--panel-muted)}
#tierscope-session-tools nav{display:flex;gap:3px;padding:8px 10px 0;flex-shrink:0}
#tierscope-session-tools nav button{flex:1;padding:5px 2px;font-size:.95em;background:transparent;border-color:transparent;border-bottom:2px solid transparent;border-radius:3px 3px 0 0}
#tierscope-session-tools nav button[aria-pressed=true]{color:var(--panel-accent);background:#ff69b412;border-bottom-color:#ff69b4}
#tools-content{padding:10px 12px 14px;overflow:auto;min-height:0;flex:1;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#ff69b470 transparent}
#tools-message:not(:empty){padding:7px 12px;border-bottom:1px solid var(--panel-divider);font-size:.95em;white-space:pre-line;overflow-wrap:anywhere;flex-shrink:0}
#tierscope-session-tools .tools-actions{display:flex;gap:5px;flex-wrap:wrap;align-items:center;margin:8px 0}
#tierscope-session-tools .tools-muted{color:var(--panel-muted);font-size:.92em;line-height:1.45}
#tierscope-session-tools p{margin:6px 0 9px}
#tierscope-session-tools h3{font-size:1em;margin:8px 0;color:var(--panel-secondary)}
#tierscope-session-tools .tools-current{border:1px solid #4169e170;background:rgba(65,105,225,.08);border-radius:4px;padding:9px;margin-bottom:10px}
#tierscope-session-tools .tools-current strong{display:block;font-size:1.1em;overflow-wrap:anywhere}
#tierscope-session-tools .tools-eyebrow{color:var(--panel-accent);text-transform:uppercase;font-size:.8em;letter-spacing:.08em;margin-bottom:3px}
#tierscope-session-tools .tools-row{border:1px solid var(--panel-divider);border-left:3px solid #ff69b480;background:rgba(var(--panel-row-rgb),.035);border-radius:4px;padding:8px;margin:6px 0;overflow-wrap:anywhere}
#tierscope-session-tools .tools-row strong{font-size:1.05em}
#tierscope-session-tools .tools-folder{margin:5px 0;display:flex;gap:5px;align-items:stretch}
#tierscope-session-tools .tools-folder .tools-folder-open{display:flex;flex-direction:column;gap:4px;flex:1;min-width:0;text-align:left;padding:9px;border-left:3px solid #ff69b480;background:rgba(var(--panel-row-rgb),.04)}
#tierscope-session-tools .tools-folder-actions{display:flex;flex-direction:column;justify-content:center;gap:4px;flex-shrink:0}
#tierscope-session-tools .tools-folder-name{font-weight:bold;color:var(--panel-text);overflow-wrap:anywhere}
#tierscope-session-tools .tools-folder-meta{font-size:.9em;color:var(--panel-muted)}
#tierscope-session-tools .tools-search{display:flex;width:100%;gap:6px;align-items:center;margin:8px 0}
#tools-library-search{flex:1;width:100%}
#tierscope-session-tools .tools-more{margin-left:auto}
#tierscope-session-tools .tools-more[open]{flex-basis:100%;margin:0}
#tierscope-session-tools .tools-more[open] summary{display:inline-block;margin-bottom:4px}
#tierscope-session-tools .tools-more-actions{display:flex;gap:4px;flex-wrap:wrap;border-top:1px solid var(--panel-divider);padding-top:6px}
#tierscope-session-tools table{width:100%;border-collapse:collapse;font-size:.93em}
#tierscope-session-tools th,#tierscope-session-tools td{text-align:left;padding:6px 4px;border-bottom:1px solid var(--panel-divider)}
#tierscope-session-tools caption{text-align:left;font-weight:bold;padding:7px 0;color:var(--panel-secondary)}
#tierscope-session-tools .tools-scroll{overflow-x:auto}
#tierscope-session-tools canvas{display:block;width:100%;height:200px}
#tierscope-session-tools .tools-history-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin:8px 0}
#tierscope-session-tools .tools-history-stats>div{padding:7px;border:1px solid var(--panel-divider);border-radius:4px;background:rgba(var(--panel-row-rgb),.035)}
#tierscope-session-tools .tools-history-stats dt{font-size:.9em;color:var(--panel-muted)}
#tierscope-session-tools .tools-history-stats dd{margin:3px 0 0;font-weight:bold;color:var(--panel-secondary);overflow-wrap:anywhere}
#tools-history-recording{width:100%}
#tools-room-shortcuts button{overflow-wrap:anywhere;text-align:left}
#tools-history-table button{max-width:155px;text-align:left;overflow-wrap:anywhere}
#tools-history-table button[aria-pressed=true]{color:var(--panel-accent);border-color:var(--panel-accent)}
#tools-history-chart{cursor:crosshair}
#tierscope-session-tools label{display:inline-flex;gap:5px;align-items:center;flex-wrap:wrap;min-width:0;max-width:100%}
#tierscope-session-tools select{width:auto;max-width:100%}
#tools-source-a,#tools-source-b{width:100%}
#tierscope-session-tools .tools-filters{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;padding:9px 0;border-block:1px solid var(--panel-divider);margin-top:8px}
#tierscope-session-tools .tools-model-filters{grid-column:1/-1;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,.8fr);gap:6px 10px;align-items:end}
#tierscope-session-tools .tools-model-filter,#tierscope-session-tools .tools-sort-filter{display:grid;gap:3px;color:var(--panel-muted)}
#tierscope-session-tools .tools-favorites-filter{grid-column:1/-1;font-size:.95em}
#tierscope-session-tools .tools-date-filters{grid-column:1/-1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
#tierscope-session-tools .tools-date-filters label{display:flex;flex-wrap:nowrap;gap:4px;font-size:.9em}
#tierscope-session-tools .tools-date-filters input[type=date]{width:100%;min-width:0;flex:1;padding:4px 2px}
#tierscope-session-tools .tools-current[hidden],#tierscope-session-tools #tools-threshold-controls[hidden]{display:none}
#tierscope-session-tools [data-card-enable][hidden],#tierscope-session-tools [data-card-retry][hidden]{display:none}
#tierscope-session-tools .tools-model-name{display:flex;align-items:center;gap:5px;margin-bottom:4px}
#tierscope-session-tools .tools-model-name strong{min-width:0}
#tierscope-session-tools [data-card-star]{font-size:1.5em;padding:0 3px;border:0;background:transparent;line-height:1.2}
#tierscope-session-tools .tools-exports{gap:4px;margin:5px 0 8px}
#tierscope-session-tools .tools-exports button{padding:2px 5px;font-size:.9em}
#tierscope-session-tools .tools-history-shortcut button,#tierscope-session-tools .tools-history-keep{color:var(--panel-accent)}
#tierscope-session-tools .tools-history-shortcut[hidden]{display:none}
#tierscope-session-tools #session-save-info{font-size:.85em;margin-top:4px}
#tierscope-session-tools .tools-library-bulk{gap:4px;font-size:.9em}
#tierscope-session-tools .tools-library-bulk button{padding:3px 5px}
#tierscope-session-tools #tools-library-storage{margin:7px 0;font-size:.95em}
#tierscope-session-tools #tools-library-storage>p{margin:4px 0}
#tierscope-session-tools #tools-storage-settings>summary{display:inline-block;padding:1px 0;color:var(--panel-accent);background:transparent;border:0;font-size:.95em}
#tierscope-session-tools #tools-storage-settings[open]{border:1px solid var(--panel-divider);border-radius:4px;padding:7px;margin-top:5px}
#tierscope-session-tools .tools-capacity-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
#tierscope-session-tools .tools-capacity-fields label{display:grid;gap:3px}
#tierscope-session-tools .tools-capacity-fields input{width:100%}
#tierscope-session-tools .tools-capacity-warning{color:var(--panel-warning);font-size:.95em}
#tools-library-selected{flex-basis:100%}
#tools-library-selection{margin-top:8px}
#tierscope-session-tools #tools-sessions-book{margin-top:10px}
#tierscope-session-tools #tools-sessions-book>summary{padding:7px 9px;color:var(--panel-accent);font-weight:bold;background:#ff69b412;border-color:#ff69b470}
#tools-library-search-menu{margin-top:8px}
#tierscope-session-tools #tools-library-search-menu>summary{background:transparent;color:var(--panel-muted)}
#tierscope-session-tools #tools-library-search-menu .tools-filters{margin-top:0;border-top:0}
#tierscope-session-tools .tools-auto-keep{display:inline-flex;align-items:center;gap:5px;margin:0 0 0 5px;font-size:.92em}
#tierscope-session-tools .tools-auto-keep[data-locked=true]{color:var(--panel-accent)}
#tierscope-session-tools .tools-auto-keep input:disabled{opacity:1}
#tierscope-session-tools .tools-library-management{border-top:1px solid var(--panel-divider);padding-top:9px;margin-top:12px}
#tools-library-selection>summary{font-size:.9em;background:transparent;color:var(--panel-muted)}

#tierscope-session-tools .tools-filters select{width:100%}
#tierscope-session-tools .tools-filters .tools-search{margin:0}
#tierscope-session-tools .tools-search input{flex:1;width:100%}
#tierscope-session-tools textarea{display:block;width:100%;resize:vertical}
#tierscope-session-tools .tools-recording-note{white-space:pre-wrap;overflow-wrap:anywhere;max-height:85px;overflow:auto;color:var(--panel-muted)}
#tierscope-session-tools .tools-chart-legend{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px}
#tierscope-session-tools .tools-chart-legend label{flex-wrap:nowrap;min-width:0}
#tierscope-session-tools .tools-chart-legend span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#tierscope-session-tools .tools-chart-legend .tools-series-swatch{width:13px;flex-shrink:0;border-top:2px solid currentColor}
#tierscope-session-tools .tools-metric-strip{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:3px;margin:9px 0 3px}
#tierscope-session-tools .tools-metric-strip button{display:flex;align-items:center;justify-content:center;padding:2px 0;height:2.5em;background:transparent;border-color:transparent}
#tierscope-session-tools .tools-metric-strip button:hover{border-color:var(--panel-muted);background:rgba(var(--panel-row-rgb),.06)}
#tierscope-session-tools .tools-metric-strip button[aria-checked=true]{border-color:var(--panel-accent);background:#ff69b420;box-shadow:inset 0 -2px var(--panel-accent)}
#tierscope-session-tools .tools-metric-strip button:focus-visible{outline:2px solid var(--panel-accent);outline-offset:1px}
#tierscope-session-tools .tools-metric-icon{font-size:1.3em;line-height:1;color:var(--metric-color);white-space:nowrap}
#tierscope-session-tools .tools-metric-circle{width:1.1em;height:1.1em;border-radius:50%;background:var(--metric-color);box-shadow:0 0 0 1px var(--panel-muted)}
@container tierscope-library (max-width:30em){#tierscope-session-tools .tools-metric-strip{grid-template-columns:repeat(6,minmax(0,1fr))}}
#tierscope-session-tools .tools-metric-caption{color:var(--panel-secondary);font-weight:bold;margin:0 0 7px}
#tierscope-session-tools .tools-comparison-range{margin:8px 0}
#tools-analysis-chart{touch-action:pan-y;cursor:crosshair}
#tools-analysis-chart:focus-visible{outline:2px solid var(--panel-accent);outline-offset:2px}
#tools-review-notes{margin:6px 12px 0;text-align:left;color:var(--panel-accent)!important;flex-shrink:0}
#tools-review-notes[hidden]{display:none}
#gif-export-controls{padding:8px 12px;gap:6px;align-items:center;flex-shrink:0;border-bottom:1px solid var(--panel-divider)}
</style>
<div class="tools-head"><div><h2 id="tools-title">Library</h2><div class="tools-subtitle">Session Storage and Analysis</div></div><button id="tools-close" type="button" aria-label="Close library" title="Close library (Escape)">×</button></div>
<nav aria-label="Session tools"><button data-tools-tab="library">Sessions</button><button data-tools-tab="summary">Summary</button><button data-tools-tab="compare">Compare</button><button data-tools-tab="backup">Backup</button></nav>
<button id="tools-review-notes" type="button" hidden></button>
<div id="tools-message" role="status" aria-live="polite"></div>
<div id="gif-export-controls" style="display:none"><span id="gif-export-status" role="status"></span><button id="btn-cancel-gif" hidden type="button">Cancel</button></div>
<div id="tools-content"></div>`;
  }

  // src/library-drafts.js
  function createLibraryDrafts() {
    const drafts = /* @__PURE__ */ new Map();
    function find(entry) {
      return drafts.get(entry.id) || (entry.lineage ? [...drafts.values()].find((draft) => draft.lineage === entry.lineage) : null);
    }
    function read(entry) {
      const draft = find(entry);
      return draft ? __spreadProps(__spreadValues({}, draft), { conflict: draft.base !== (entry.notes || "") }) : { id: entry.id, value: entry.notes || "", base: entry.notes || "", dirty: false, conflict: false };
    }
    function edit(entry, value) {
      const previous = find(entry);
      if (previous) drafts.delete(previous.id);
      if (value === (entry.notes || "")) drafts.delete(entry.id);
      else drafts.set(entry.id, __spreadProps(__spreadValues({}, previous), {
        id: entry.id,
        title: entry.title || entry.archive.room,
        lineage: entry.lineage || entry.id,
        room: entry.archive.room,
        time: entry.archive.session.history.timestamps[0],
        base: previous ? previous.base : entry.notes || "",
        value,
        dirty: true
      }));
    }
    function reconcile(entries) {
      for (const [id, draft] of drafts) {
        const entry = entries.find((entry2) => {
          var _a;
          return entry2.id === id || draft.lineage && entry2.lineage === draft.lineage || ((_a = entry2.records) == null ? void 0 : _a.some((record) => record.key === "tierscope:library:v1:" + id));
        });
        if (!entry) continue;
        if (entry.notes === draft.value) {
          drafts.delete(id);
          continue;
        }
        if (entry.id !== id && !drafts.has(entry.id)) {
          drafts.delete(id);
          drafts.set(entry.id, __spreadProps(__spreadValues({}, draft), { id: entry.id }));
        }
      }
    }
    return {
      read,
      edit,
      reconcile,
      list: () => [...drafts.values()].map((draft) => __spreadValues({}, draft)),
      discard: (id) => drafts.delete(id),
      get size() {
        return drafts.size;
      }
    };
  }

  // src/library-browser-view.js
  function renderLibraryBrowser(parent, entries, filters, selected, actions, disclosures, comparisonLimit) {
    const present = new Set(entries.map((entry) => entry.id));
    for (const id of selected) if (!present.has(id)) selected.delete(id);
    let shown = 50;
    const book = toolNode(parent, "details");
    book.id = "tools-sessions-book";
    book.open = disclosures.book;
    const bookSummary = toolNode(book, "summary", "Sessions Book");
    bookSummary.id = "tools-sessions-book-toggle";
    const search = toolNode(book, "details");
    search.id = "tools-library-search-menu";
    search.open = disclosures.search;
    const searchSummary = toolNode(search, "summary", "Search & sort");
    searchSummary.id = "tools-library-search-toggle";
    const inputs = recordingFilters(search, entries, filters, "tools-library", () => {
      shown = 50;
      actions.room(filters.room);
      rows();
    }, true);
    const selectionTools = toolNode(book, "details");
    selectionTools.id = "tools-library-selection";
    selectionTools.open = selected.size > 0;
    toolNode(selectionTools, "summary", "Select sessions for Compare or export");
    const bulk = toolNode(selectionTools, "div", void 0, "tools-actions tools-library-bulk"), selection = toolNode(bulk, "span");
    selection.id = "tools-library-selected";
    let matching = [];
    toolButton(bulk, "Select matching", () => {
      matching.forEach((entry) => selected.add(entry.id));
      updateSelection();
    }, "tools-select-matching");
    toolButton(bulk, "Clear", () => {
      selected.clear();
      updateSelection();
    }, "tools-clear-selection");
    const compare = toolButton(bulk, "Compare", () => actions.compare([...selected]), "tools-compare-selected");
    const download = toolButton(bulk, "Export", () => actions.export([...selected]), "tools-export-selected");
    download.title = "Download one library bundle, including titles, notes and favorite models";
    const list = toolNode(book, "div");
    list.id = "tools-library-list";
    function favoriteButton(parent2, room2, compact = false) {
      const active = entries.some((entry) => entry.archive.room.toLowerCase() === room2 && entry.modelFavorite);
      const control = toolButton(parent2, (active ? "★" : "☆") + (compact ? "" : " Favorite model"), () => actions.favoriteModel(room2), "tools-model-favorite-" + room2);
      control.setAttribute("aria-pressed", String(active));
      control.setAttribute("aria-label", (active ? "Unfavorite " : "Favorite ") + room2);
      control.title = (active ? "Unfavorite model " : "Favorite model ") + room2;
      if (active) control.className = "tools-primary";
      if (active && !compact && !entries.some((entry) => entry.archive.room.toLowerCase() === room2 && entry.autoKeep)) {
        toolButton(parent2, "Enable automatic keeping…", () => actions.enableAutomatic(room2), "tools-model-enable-" + room2);
      }
    }
    function updateSelection() {
      if (selected.size) selectionTools.open = true;
      selection.textContent = selected.size + " selected" + ([...selected].some((id) => !matching.some((entry) => entry.id === id)) ? " · includes hidden sessions" : "");
      compare.disabled = selected.size < 2 || selected.size > comparisonLimit;
      compare.title = "Select 2–" + comparisonLimit + " sessions to compare";
      download.disabled = !selected.size;
      for (const row of list.querySelectorAll("[data-library-id]")) row.querySelector("input[type=checkbox]").checked = selected.has(row.dataset.libraryId);
    }
    function rows() {
      list.replaceChildren();
      matching = [];
      try {
        matching = filterLibraryEntries(entries, filters);
      } catch (error) {
        toolNode(list, "p", error.message);
      }
      searchSummary.textContent = "Search & sort" + (filters.query || filters.from || filters.to || filters.favorites ? " · Filters active" : "");
      updateSelection();
      const folders = /* @__PURE__ */ new Map();
      for (const entry of matching) {
        const room3 = entry.archive.room.toLowerCase();
        if (!folders.has(room3)) folders.set(room3, []);
        folders.get(room3).push(entry);
      }
      const browsingFolders = !filters.room && !filters.query;
      const visible = browsingFolders ? [...folders.keys()] : matching;
      const heading = toolNode(list, "div", void 0, "tools-actions");
      if (!browsingFolders) toolButton(heading, "‹ All models", () => {
        const previous = filters.room;
        filters.room = "";
        filters.query = "";
        inputs.model.value = "";
        inputs.search.value = "";
        shown = 50;
        actions.room(null);
        rows();
        (document.getElementById("tools-folder-" + previous) || searchSummary).focus();
      }, "tools-library-all-models");
      const room2 = filters.room && filters.room !== "*" ? filters.room : null;
      toolNode(heading, "h3", room2 ? "Folder: " + room2 : browsingFolders ? "Model folders" : "Search results — all models");
      if (room2) {
        favoriteButton(heading, room2);
        toolButton(heading, "History overview", () => actions.history(room2), "tools-model-history").className = "tools-primary";
      }
      if (!matching.length) toolNode(list, "p", entries.length ? "No matching sessions." : "Your library is empty. Keep a session above or import a session file.", "tools-muted");
      if (browsingFolders) for (const room3 of visible.slice(0, shown)) {
        const recordings = folders.get(room3), row = toolNode(list, "div", void 0, "tools-folder");
        const open = toolButton(row, "", () => {
          filters.room = room3;
          inputs.model.value = room3;
          shown = 50;
          actions.room(room3);
          rows();
          document.getElementById("tools-library-all-models").focus();
        }, "tools-folder-" + room3);
        open.className = "tools-folder-open";
        open.setAttribute("aria-label", "Open sessions for " + room3);
        toolNode(open, "span", "▱  " + room3, "tools-folder-name");
        const summary = actions.cardSummary(recordings);
        toolNode(open, "span", recordings.length + (recordings.length === 1 ? " session" : " sessions") + " · First " + new Date(summary.first).toLocaleDateString() + " · Latest " + new Date(summary.latest).toLocaleDateString(), "tools-folder-meta");
        const covered = toolNode(open, "span", "Total covered time " + actions.duration(summary.coveredMs), "tools-folder-meta");
        covered.title = "Sum of covered intervals in sessions matching the current filters. Gaps and time after the final sample are excluded; overlapping sessions are counted separately.";
        const controls = toolNode(row, "div", void 0, "tools-folder-actions");
        favoriteButton(controls, room3, true);
        const ids = actions.modelComparisonIds(room3);
        const compareModel = toolButton(controls, "Compare", () => actions.compareModel(room3), "tools-folder-compare-" + room3);
        compareModel.disabled = ids.length < 2;
        compareModel.setAttribute("aria-label", "Compare stored sessions for " + room3);
        compareModel.title = ids.length < 2 ? "Keep at least two sessions for this model to compare." : "Compare the " + ids.length + " latest stored sessions for " + room3 + ", independently of the search filters.";
      }
      else for (const entry of visible.slice(0, shown)) {
        const row = toolNode(list, "article", void 0, "tools-row");
        row.dataset.libraryId = entry.id;
        const title = toolNode(row, "label"), check = toolNode(title, "input");
        check.type = "checkbox";
        check.checked = selected.has(entry.id);
        check.setAttribute("aria-label", "Select " + (entry.title || entry.archive.room));
        check.onchange = () => {
          if (check.checked) selected.add(entry.id);
          else selected.delete(entry.id);
          updateSelection();
        };
        toolNode(title, "strong", entry.title || entry.archive.room);
        toolNode(row, "div", entry.archive.room + " · " + new Date(entry.archive.session.history.timestamps[0]).toLocaleString() + " · " + entry.archive.session.history.timestamps.length + " samples", "tools-muted");
        if (entry.notes) toolNode(row, "p", entry.notes, "tools-recording-note");
        const controls = toolNode(row, "div", void 0, "tools-actions");
        toolButton(controls, "Replay", () => actions.replay(entry)).className = "tools-primary";
        toolButton(controls, "Summary", () => actions.summary(entry));
        const more = toolNode(controls, "details", void 0, "tools-more");
        toolNode(more, "summary", "More…");
        const extras = toolNode(more, "div", void 0, "tools-more-actions");
        for (const [label, key] of [["Save file", "save"], ["TXT", "txt"], ["CSV", "csv"], ["GIF", "gif"], ["Add to all-time highs", "highs"], ["Rename", "rename"], ["Delete", "delete"]]) {
          const action = toolButton(extras, label, () => actions[key](entry));
          if (key === "delete") action.className = "tools-danger";
        }
        renderRecordingNotes(more, entry, actions);
      }
      if (visible.length > 50) toolNode(list, "p", "Showing " + Math.min(shown, visible.length) + " of " + visible.length + (browsingFolders ? " model folders." : " matching sessions."), "tools-muted");
      if (shown < visible.length) toolButton(list, "Show " + Math.min(50, visible.length - shown) + " more", () => {
        shown += 50;
        rows();
        (document.getElementById("tools-library-more") || bookSummary).focus();
      }, "tools-library-more");
    }
    rows();
  }
  function renderRecordingNotes(parent, entry, actions, missing = false) {
    const label = toolNode(parent, "label", "Session notes "), note = toolNode(label, "textarea");
    note.maxLength = 2e3;
    note.rows = 3;
    note.value = actions.note(entry).value;
    const status = toolNode(parent, "p", "", "tools-muted");
    status.setAttribute("role", "status");
    const controls = toolNode(parent, "div", void 0, "tools-actions");
    const save = toolButton(controls, "Save notes", () => actions.saveNote(entry), "tools-notes-save-" + entry.id);
    const discard = toolButton(controls, "Discard changes", () => actions.discardNote(entry), "tools-notes-discard-" + entry.id);
    function update() {
      const draft = actions.note(entry);
      save.disabled = missing || !draft.dirty;
      discard.disabled = !draft.dirty;
      status.textContent = missing ? "Session changed or unavailable. Copy this draft before discarding it." : draft.conflict ? "Saved notes changed elsewhere. Your draft is still here; saving will ask before replacing them." : draft.dirty ? "Unsaved note — kept in this tab until you save or discard it." : "Notes saved.";
    }
    note.oninput = () => {
      actions.editNote(entry, note.value);
      update();
    };
    update();
  }

  // src/library-transfer.js
  function libraryImportBundle(values, version) {
    if (!Array.isArray(values) || !values.length || values.length > LIBRARY_TRANSFER_MAX_COUNT) throw new Error("Choose 1–10,000 session files or library bundles.");
    if (new Blob([JSON.stringify(values)]).size > BACKUP_MAX_BYTES) throw new Error("Selected files exceed 300 MB.");
    const library = [], favoriteModels = /* @__PURE__ */ new Set();
    for (const value of values) {
      if (value && value.format === "TierScopeBackup") {
        const backup = validateTierScopeBackup(value);
        if (backup.recovery) throw new Error("Use Backup to review and restore a partial backup with missing sessions.");
        library.push(...backup.library);
        backup.favoriteModels.forEach((room2) => favoriteModels.add(room2));
      } else {
        const archive = validateSessionFile(value);
        library.push({ title: archive.room, archive });
      }
      if (library.length > LIBRARY_TRANSFER_MAX_COUNT) throw new Error("Import up to 10,000 sessions at once.");
    }
    if (!library.length) throw new Error("These files contain no library sessions.");
    return validateTierScopeBackup({ format: "TierScopeBackup", formatVersion: 1, producerVersion: version, rooms: [], preferences: {}, library, favoriteModels: [...favoriteModels] });
  }
  function importLibraryBundle(bundle) {
    return restoreTierScopeBackup(bundle, { highs: false, preferences: false, library: true });
  }
  function exportLibrarySelection(ids, version) {
    if (!ids.length || new Set(ids).size !== ids.length) throw new Error("Select one or more sessions.");
    const state = readSessionLibrary();
    const library = ids.map((id) => {
      const entry = state.entries.find((entry2) => entry2.id === id);
      if (!entry) throw new Error("A selected session changed or could not be read. Refresh and select it again.");
      return { title: entry.title, notes: libraryMetadata(entry).notes, archive: entry.archive };
    });
    const rooms = new Set(library.map((entry) => entry.archive.room.toLowerCase())), models = readModelFavorites(state.entries);
    if (models.errors.some((room2) => rooms.has(room2))) throw new Error("A selected model’s favorite could not be read. Refresh and try again.");
    return validateTierScopeBackup({
      format: "TierScopeBackup",
      formatVersion: 1,
      producerVersion: version,
      rooms: [],
      preferences: {},
      library,
      favoriteModels: [...models.favorites].filter((room2) => rooms.has(room2))
    });
  }

  // src/analysis-chart-view.js
  function renderAnalysisChart(parent, series, labels, axisMs, metricLabel, savedState = null, axisMode = "elapsed") {
    const element = toolNode(parent, "div");
    element.id = "tools-chart-view";
    parent = element;
    let start = 0, end = axisMs, cursor = 0, pinned = false, drag = null, disposed = false;
    const hidden = /* @__PURE__ */ new Set(), controls = toolNode(parent, "div", void 0, "tools-actions");
    if (savedState && (savedState.axisMode || "elapsed") === axisMode) {
      ({ start, end, cursor, pinned } = savedState);
      savedState.hidden.forEach((index) => {
        if (index >= 0 && index < series.length) hidden.add(index);
      });
      if (hidden.size === series.length) hidden.delete(0);
      fitWindow(savedState.axisMs);
    }
    let plotCache = null;
    const number = (value) => value.toLocaleString(void 0, { maximumFractionDigits: 2 });
    const elapsed = (ms) => number(ms / 6e4) + "m";
    const clock2 = (ms) => {
      const seconds = Math.floor(ms / 1e3), pad = (n) => String(n).padStart(2, "0");
      return pad(Math.floor(seconds / 3600)) + ":" + pad(Math.floor(seconds / 60) % 60) + (end - start < 6e4 ? ":" + pad(seconds % 60) : "");
    };
    const axisLabel = (ms) => axisMode === "clock" ? clock2(ms) : elapsed(ms);
    const chartLabel = () => metricLabel + (axisMode === "clock" ? " by local time of day, 00:00 to 24:00." : " by real elapsed time.") + " Arrow keys inspect samples; plus and minus zoom; Home and End jump to visible endpoints.";
    const zoomIn = toolButton(controls, "Zoom +", () => zoom(0.5), "tools-chart-zoom-in");
    const zoomOut = toolButton(controls, "Zoom −", () => zoom(2), "tools-chart-zoom-out");
    const panLeft = toolButton(controls, "‹", () => pan(-1), "tools-chart-pan-left");
    panLeft.setAttribute("aria-label", "Pan earlier");
    const panRight = toolButton(controls, "›", () => pan(1), "tools-chart-pan-right");
    panRight.setAttribute("aria-label", "Pan later");
    toolButton(controls, "Full range", () => {
      start = 0;
      end = axisMs;
      draw();
    }, "tools-chart-reset");
    const pin = toolButton(controls, "Pin cursor", () => {
      pinned = !pinned;
      inspect();
    }, "tools-chart-pin");
    const legend = toolNode(parent, "div", void 0, "tools-chart-legend");
    const dark = ["#ff69b4", "#79baff", "#68d391", "#ffd166", "#c4a3ff", "#ff987d"];
    const bright = ["#b42370", "#175db0", "#176f36", "#835900", "#7140a6", "#a23c20"];
    const newestFirst = series.map((s, i) => i).sort((a, b) => series[b].timestamps[0] - series[a].timestamps[0] || a - b);
    const ranks = series.map((s, i) => newestFirst.indexOf(i));
    const colorIndices = ranks.map((rank) => rank < 6 ? rank : 1 + (rank - 6) % 5);
    const opacities = ranks.map((rank) => rank < 6 ? 1 : Math.max(0.35, 0.85 - (rank - 6) * 0.1));
    const newest = newestFirst[0];
    const legendLabels = labels.map((label, i) => {
      const control = toolNode(legend, "label"), check = toolNode(control, "input");
      check.type = "checkbox";
      check.checked = !hidden.has(i);
      check.dataset.analysisSeries = String(i);
      const swatch = toolNode(control, "span", "", "tools-series-swatch");
      swatch.setAttribute("aria-hidden", "true");
      swatch.style.borderTopStyle = i === newest ? "solid" : "dashed";
      swatch.style.opacity = String(opacities[i]);
      toolNode(control, "span", String.fromCharCode(65 + i) + (series.length > 1 && i === newest ? " · Latest" : "") + " · " + label);
      control.title = (series.length > 1 ? i === newest ? "Latest session — solid pink: " : "Earlier session — dashed" + (ranks[i] >= 6 ? ", " + Math.round(opacities[i] * 100) + "% opacity" : "") + ": " : "") + label;
      check.onchange = () => {
        if (!check.checked && hidden.size === series.length - 1) {
          check.checked = true;
          return;
        }
        if (check.checked) hidden.delete(i);
        else hidden.add(i);
        draw();
      };
      return control;
    });
    const canvas = toolNode(parent, "canvas");
    canvas.id = "tools-analysis-chart";
    canvas.tabIndex = 0;
    canvas.setAttribute("role", "img");
    parent.insertBefore(canvas, legend);
    canvas.setAttribute("aria-label", chartLabel());
    const range = toolNode(parent, "p", "", "tools-muted");
    range.id = "tools-chart-range";
    parent.insertBefore(range, legend);
    const settings = toolNode(parent, "div");
    const hint = toolNode(parent, "p", "", "tools-muted");
    const scroll = toolNode(parent, "div", void 0, "tools-scroll"), table = toolNode(scroll, "table");
    table.id = "tools-chart-inspection";
    const caption = toolNode(table, "caption");
    const header = toolNode(toolNode(table, "thead"), "tr");
    ["Session", "Count", "Sample timestamp / status"].forEach((text) => {
      toolNode(header, "th", text).scope = "col";
    });
    const body = toolNode(table, "tbody");
    const rows = series.map((s, i) => {
      const row = toolNode(body, "tr");
      toolNode(row, "th", String.fromCharCode(65 + i)).scope = "row";
      return { row, value: toolNode(row, "td"), detail: toolNode(row, "td") };
    });
    const bitmap = document.createElement("canvas");
    let width = 260, height = 200, ratio = 1, left = 52, right = 248, top = 15, bottom = 164;
    const timeAt = (event) => {
      const bounds = canvas.getBoundingClientRect(), x = (event.clientX - bounds.left) * width / bounds.width;
      return start + Math.max(0, Math.min(1, (x - left) / (right - left))) * (end - start);
    };
    function zoom(factor) {
      [start, end] = zoomAnalysisWindow(axisMs, start, end, factor, cursor);
      cursor = Math.max(start, Math.min(end, cursor));
      draw();
    }
    function pan(direction) {
      const span = end - start, next = Math.max(0, Math.min(axisMs - span, start + direction * span / 2));
      start = next;
      end = next + span;
      cursor = Math.max(start, Math.min(end, cursor));
      draw();
    }
    function inspect() {
      if (disposed) return;
      caption.textContent = "Cursor " + axisLabel(cursor) + (pinned ? " · pinned" : "");
      pin.textContent = pinned ? "Unpin" : "Pin";
      pin.setAttribute("aria-label", pinned ? "Unpin inspection cursor" : "Pin inspection cursor");
      pin.setAttribute("aria-pressed", String(pinned));
      series.forEach((s, i) => {
        const row = rows[i];
        row.row.hidden = hidden.has(i);
        if (axisMode === "clock") {
          const sample = inspectClockSample(s.clock, cursor);
          row.value.textContent = sample.matches.length ? sample.matches.map((match) => number(match.value)).join(" / ") : "—";
          row.detail.textContent = sample.matches.length ? sample.matches.map((match) => new Date(match.timestamp).toLocaleString(void 0, { timeZoneName: "shortOffset" }) + " · sample " + (match.index + 1) + (match.kind === "held" ? " (held until next sample)" : "")).join(" ; ") : sample.kind === "gap" ? "Session gap — no sample" : "Outside session at this clock time";
        } else {
          const sample = inspectAnalysisSample(s, cursor);
          row.value.textContent = sample.value === null ? "—" : number(sample.value);
          row.detail.textContent = sample.kind === "gap" ? "Session gap — no sample" : sample.kind === "outside" ? "Outside session" : new Date(sample.timestamp).toLocaleString() + " · sample " + (sample.index + 1) + (sample.kind === "held" ? " (held until next sample)" : "");
        }
      });
      const ctx = canvas.getContext("2d");
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(bitmap, 0, 0, width, height);
      const style = window.getComputedStyle(parent);
      const x = left + (cursor - start) / (end - start || 1) * (right - left);
      ctx.strokeStyle = style.getPropertyValue("--panel-text").trim();
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      if (cursor >= start && cursor <= end) {
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x, bottom);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      if (drag) {
        ctx.fillStyle = "#ff69b433";
        const from = left + (drag.from - start) / (end - start || 1) * (right - left);
        ctx.fillRect(Math.min(from, x), top, Math.abs(x - from), bottom - top);
      }
    }
    function draw() {
      var _a;
      if (disposed) return;
      width = Math.max(260, canvas.clientWidth);
      right = width - 14;
      ratio = window.devicePixelRatio || 1;
      canvas.width = bitmap.width = width * ratio;
      canvas.height = bitmap.height = height * ratio;
      const ctx = bitmap.getContext("2d");
      ctx.scale(ratio, ratio);
      const style = window.getComputedStyle(parent), isDark = ((_a = parent.closest("[data-theme]")) == null ? void 0 : _a.dataset.theme) !== "bright";
      const colors = isDark ? dark : bright;
      if (!plotCache || plotCache.series !== series || plotCache.start !== start || plotCache.end !== end || plotCache.width !== right - left) {
        plotCache = { series, start, end, width: right - left, plots: new Array(series.length) };
      }
      const plots = series.map((s, j) => {
        var _a2;
        return hidden.has(j) ? null : (_a2 = plotCache.plots)[j] || (_a2[j] = axisMode === "clock" ? buildClockPlot(s.clock, start, end, right - left) : buildAnalysisPlot(s, start, end, right - left));
      });
      const maximum = Math.max(1, ...plots.map((plot) => plot ? plot.maximum : 1));
      ctx.strokeStyle = style.getPropertyValue("--panel-divider").trim();
      ctx.fillStyle = style.getPropertyValue("--panel-muted").trim();
      ctx.font = "10px Arial";
      for (let step = 0; step <= 2; step++) {
        const y = bottom - step / 2 * (bottom - top);
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
        ctx.stroke();
        ctx.textAlign = "right";
        ctx.fillText(number(maximum * step / 2), left - 5, y + 3);
      }
      if (axisMode === "clock") {
        for (let step = 0; step <= 4; step++) {
          ctx.textAlign = step === 0 ? "left" : step === 4 ? "right" : "center";
          ctx.fillText(clock2(start + (end - start) * step / 4), left + (right - left) * step / 4, bottom + 20);
        }
      } else {
        ctx.textAlign = "left";
        ctx.fillText(elapsed(start), left, bottom + 20);
        ctx.textAlign = "right";
        ctx.fillText(elapsed(end), right, bottom + 20);
      }
      for (const j of newestFirst.slice().reverse()) {
        const color = colors[colorIndices[j]];
        legendLabels[j].style.color = color;
        legendLabels[j].querySelector("input").disabled = hidden.size === series.length - 1 && !hidden.has(j);
        if (hidden.has(j)) continue;
        ctx.globalAlpha = opacities[j];
        ctx.strokeStyle = ctx.fillStyle = color;
        ctx.lineWidth = 1.8;
        ctx.lineCap = "butt";
        ctx.setLineDash(j === newest ? [] : [6, 4]);
        ctx.beginPath();
        let previousY = 0;
        const dots = [];
        const points = plots[j].points;
        points.forEach((point, i) => {
          const x = left + (point.time - start) / (end - start || 1) * (right - left), y = bottom - point.value / maximum * (bottom - top);
          if (point.move) ctx.moveTo(x, y);
          else {
            ctx.lineTo(x, previousY);
            ctx.lineTo(x, y);
          }
          if (point.move && (i + 1 === points.length || points[i + 1].move)) dots.push([x, y]);
          previousY = y;
        });
        ctx.stroke();
        ctx.setLineDash([]);
        dots.forEach(([x, y]) => {
          ctx.beginPath();
          ctx.arc(x, y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      ctx.globalAlpha = 1;
      range.textContent = "Chart window " + axisLabel(start) + " – " + axisLabel(end) + (axisMode === "clock" ? " · 24h local clock" : " · full comparison/session range " + elapsed(axisMs));
      hint.textContent = (axisMode === "clock" ? "Aligned by local time of day. Midnight crossings continue at the start of the chart. Clock changes are separate segments; repeated clock times can show multiple dated values. Statistics use full sessions." : "Aligned from each session’s first retained sample, using real elapsed time. Hidden lines and zoom do not change summary totals or the shared comparison length.") + " Move to inspect; click to pin, drag to zoom, or use the buttons and arrow keys. Gaps have no assumed samples.";
      zoomIn.disabled = end - start <= Math.min(1e3, axisMs);
      zoomOut.disabled = end - start >= axisMs;
      panLeft.disabled = start <= 0;
      panRight.disabled = end >= axisMs;
      inspect();
    }
    canvas.onpointermove = (event) => {
      if (!pinned || drag) {
        cursor = timeAt(event);
        inspect();
      }
    };
    canvas.onpointerdown = (event) => {
      if (event.button !== 0) return;
      canvas.focus();
      drag = { from: timeAt(event), x: event.clientX, pinned };
      canvas.setPointerCapture(event.pointerId);
      cursor = drag.from;
      inspect();
    };
    canvas.onpointerup = (event) => {
      if (!drag) return;
      const origin = drag;
      cursor = timeAt(event);
      drag = null;
      if (Math.abs(event.clientX - origin.x) > 5 && Math.abs(cursor - origin.from) >= Math.min(1e3, axisMs)) {
        start = Math.min(cursor, origin.from);
        end = Math.max(cursor, origin.from);
        pinned = origin.pinned;
        draw();
      } else {
        pinned = !origin.pinned;
        inspect();
      }
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };
    canvas.onpointercancel = () => {
      drag = null;
      inspect();
    };
    canvas.onkeydown = (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End", "+", "=", "-", "Escape"].includes(event.key)) return;
      event.preventDefault();
      if (event.key === "+" || event.key === "=") {
        zoom(0.5);
        return;
      }
      if (event.key === "-") {
        zoom(2);
        return;
      }
      if (event.key === "Escape") {
        pinned = false;
        inspect();
        return;
      }
      if (event.key === "Home") cursor = start;
      else if (event.key === "End") cursor = end;
      else {
        let target = event.key === "ArrowRight" ? end : start;
        for (let j = 0; j < series.length; j++) if (!hidden.has(j)) {
          const times = axisMode === "clock" ? series[j].clock.navigation : series[j].times, index = analysisSampleIndex(times, cursor);
          if (event.key === "ArrowRight" && index + 1 < times.length) target = Math.min(target, times[index + 1]);
          if (event.key === "ArrowLeft") {
            let i = index;
            while (i >= 0 && times[i] >= cursor) i--;
            if (i >= 0) target = Math.max(target, times[i]);
          }
        }
        cursor = Math.max(start, Math.min(end, target));
      }
      pinned = true;
      inspect();
    };
    function fitWindow(previousAxis) {
      if (start === 0 && end === previousAxis) {
        start = 0;
        end = axisMs;
      } else {
        const span = Math.min(Math.max(0, end - start), axisMs);
        start = Math.max(0, Math.min(start, axisMs - span));
        end = start + span;
      }
      cursor = Math.max(start, Math.min(end, cursor));
    }
    draw();
    return {
      element,
      canvas,
      settings,
      draw,
      capture: () => ({ start, end, cursor, pinned, axisMs, axisMode, hidden: [...hidden] }),
      update(nextSeries, nextAxis, nextMetricLabel, nextMode = "elapsed") {
        if (disposed) return;
        const previousAxis = axisMs;
        series = nextSeries;
        axisMs = nextAxis;
        metricLabel = nextMetricLabel;
        if (axisMode !== nextMode) {
          axisMode = nextMode;
          start = 0;
          end = axisMs;
          cursor = 0;
          pinned = false;
        } else fitWindow(previousAxis);
        drag = null;
        canvas.setAttribute("aria-label", chartLabel());
        draw();
      },
      dispose() {
        disposed = true;
        drag = null;
        plotCache = null;
        bitmap.width = bitmap.height = 0;
      }
    };
  }

  // src/model-history.js
  function createModelHistoryReader() {
    let cache = /* @__PURE__ */ new WeakMap();
    function summary(archive, metric) {
      if (!Object.isFrozen(archive)) return summarizeSession(archive, metric);
      let metrics = cache.get(archive);
      if (!metrics) {
        metrics = /* @__PURE__ */ new Map();
        cache.set(archive, metrics);
      }
      if (!metrics.has(metric)) metrics.set(metric, summarizeSession(archive, metric));
      return metrics.get(metric);
    }
    function read(entries, room2, metric = "room", limit = Infinity) {
      if (!Object.prototype.hasOwnProperty.call(ANALYSIS_METRICS, metric)) throw new Error("Unknown analysis metric.");
      if (limit !== Infinity && (!Number.isSafeInteger(limit) || limit < 1)) throw new Error("Invalid history limit.");
      const matching = entries.filter((entry) => entry.archive.room.toLowerCase() === room2.toLowerCase()).sort((a, b) => a.archive.session.history.timestamps[0] - b.archive.session.history.timestamps[0] || a.id.localeCompare(b.id));
      const selected = limit === Infinity ? matching : matching.slice(-limit);
      let coveredMs = 0, gapMs = 0, weighted = 0, registeredWeight = 0, tokenWeight = 0, latestEnd = -Infinity, overlaps = false;
      let peak = null;
      const recordings = selected.map((entry, index) => {
        const stats = summary(entry.archive, metric), registered = summary(entry.archive, "total");
        const time = entry.archive.session.history.timestamps[0];
        coveredMs += stats.coveredMs;
        gapMs += stats.gapMs;
        weighted += (stats.mean || 0) * stats.coveredMs;
        const weight = (registered.mean || 0) * registered.coveredMs;
        registeredWeight += weight;
        tokenWeight += weight * (registered.tokenShare || 0) / 100;
        peak = peak === null ? stats.peak : Math.max(peak, stats.peak);
        if (time < latestEnd) overlaps = true;
        latestEnd = Math.max(latestEnd, time + stats.spanMs);
        const position = matching.length - selected.length + index;
        const comparisonIds = matching.slice(Math.max(0, position - MAX_COMPARE_RECORDINGS + 1), position + 1).reverse().map((record) => record.id);
        return __spreadValues({ id: entry.id, title: entry.title || entry.archive.room, time, comparisonIds }, stats);
      });
      return {
        room: room2.toLowerCase(),
        metric,
        totalCount: matching.length,
        recordings,
        overlaps,
        coveredMs,
        gapMs,
        peak,
        mean: coveredMs ? weighted / coveredMs : null,
        tokenShare: registeredWeight ? tokenWeight / registeredWeight * 100 : null
      };
    }
    return { read, clear() {
      cache = /* @__PURE__ */ new WeakMap();
    } };
  }
  function recordingStart(archive) {
    var _a;
    return (_a = archive.session.sessionStartedAt) != null ? _a : archive.session.history.timestamps[0];
  }
  function previousModelSessionIds(entries, archive) {
    const start = recordingStart(archive), room2 = archive.room.toLowerCase();
    return entries.filter((entry) => entry.archive.room.toLowerCase() === room2 && recordingStart(entry.archive) < start).sort((a, b) => recordingStart(b.archive) - recordingStart(a.archive) || b.id.localeCompare(a.id)).slice(0, MAX_COMPARE_RECORDINGS - 1).map((entry) => entry.id);
  }
  function latestModelSessionIds(entries, room2) {
    return entries.filter((entry) => entry.archive.room.toLowerCase() === room2.toLowerCase()).sort((a, b) => b.archive.session.history.timestamps[0] - a.archive.session.history.timestamps[0] || b.id.localeCompare(a.id)).slice(0, MAX_COMPARE_RECORDINGS).map((entry) => entry.id);
  }

  // src/model-history-view.js
  function renderModelHistoryView(parent, overview, actions) {
    let { recordings } = overview;
    const number = (value) => value === null ? "Not enough data" : value.toLocaleString(void 0, { maximumFractionDigits: 1 });
    const percent = (value) => value === null ? "Not enough data" : number(value) + "%";
    const date = (time) => new Date(time).toLocaleString();
    function node(target, tag, text, className) {
      const element = document.createElement(tag);
      if (text !== void 0) element.textContent = text;
      if (className) element.className = className;
      target.appendChild(element);
      return element;
    }
    function button(target, text, click, id) {
      const element = node(target, "button", text);
      element.type = "button";
      element.onclick = click;
      if (id) element.id = id;
      return element;
    }
    if (!recordings.length) {
      node(parent, "p", "No saved sessions for this model. Return to Sessions to keep or import one.", "tools-muted");
      return null;
    }
    const controls = node(parent, "div", void 0, "tools-actions");
    const label = node(controls, "label", "Session "), select = node(label, "select");
    select.id = "tools-history-recording";
    for (const record of [...recordings].reverse()) {
      const option = node(select, "option", date(record.time) + " · " + record.title);
      option.value = record.id;
    }
    if (recordings.some((record) => record.id === actions.selected)) select.value = actions.selected;
    const buttons = node(parent, "div", void 0, "tools-actions");
    buttons.id = "tools-history-actions";
    const selected = () => recordings.find((record) => record.id === select.value);
    const compare = button(buttons, "Compare with previous", () => {
      const ids = selected().comparisonIds;
      if (ids.length > 1) actions.compare(ids);
    }, "tools-history-compare");
    compare.className = "tools-primary";
    button(buttons, "Summary", () => actions.summary(select.value), "tools-history-summary");
    button(buttons, "Replay", () => actions.replay(select.value), "tools-history-replay");
    const comparisonHint = node(parent, "p", "", "tools-muted");
    comparisonHint.id = "tools-history-compare-hint";
    compare.setAttribute("aria-describedby", comparisonHint.id);
    if (actions.metricControl) actions.metricControl(parent);
    const legend = node(parent, "p", "● Average · ◆ Peak in session", "tools-history-legend");
    legend.id = "tools-history-legend";
    const canvas = node(parent, "canvas");
    canvas.id = "tools-history-chart";
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", actions.metricLabel + " across saved sessions, positioned by the date of their first retained sample. Use the session selector above or the table below for the values.");
    canvas.setAttribute("aria-describedby", legend.id);
    node(parent, "p", "One point per session, using its first retained sample date. Averages use real covered time; gaps and time after the final sample are excluded. Select a point or use the session selector above.", "tools-muted");
    node(parent, "h3", "Across these sessions");
    const cards = node(parent, "dl", void 0, "tools-history-stats");
    cards.id = "tools-history-stats";
    function updateCards() {
      cards.replaceChildren();
      for (const [label2, value] of [
        ["Sessions", recordings.length + " / " + overview.totalCount],
        ["Time-weighted average", number(overview.mean)],
        ["Peak in sessions", number(overview.peak)],
        ["Token holders / registered", percent(overview.tokenShare)],
        ["Covered time (sum)", actions.duration(overview.coveredMs)],
        ["Excluded gaps (sum)", actions.duration(overview.gapMs)]
      ]) {
        const card = node(cards, "div");
        node(card, "dt", label2);
        node(card, "dd", value);
      }
    }
    updateCards();
    node(parent, "p", "Based on the sessions shown here, including new scans while Follow live is on. Token share uses registered-viewer time. These peaks are not ATH. Full-session highs may predate retained samples.", "tools-muted");
    const warning = node(parent, "p", "Some session time ranges overlap. Totals sum sessions and may count the same period more than once.", "tools-muted");
    warning.id = "tools-history-overlap";
    warning.hidden = !overview.overlaps;
    const detail = node(parent, "section", void 0, "tools-current");
    detail.id = "tools-history-detail";
    detail.setAttribute("aria-label", "Selected session");
    const heading = node(detail, "strong"), meta = node(detail, "p", void 0, "tools-muted");
    const values = node(detail, "p");
    values.setAttribute("aria-live", "polite");
    let positions = [], shown = 50;
    function draw() {
      const width = Math.max(240, canvas.clientWidth), height = 200, ratio = window.devicePixelRatio || 1;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      const ctx = canvas.getContext("2d");
      ctx.scale(ratio, ratio);
      const style = window.getComputedStyle(parent), color = (name) => style.getPropertyValue(name).trim();
      const accent = color("--panel-accent"), secondary = color("--panel-secondary");
      const left = 48, right = width - 16, top = 16, bottom = height - 45;
      const first = recordings[0].time, last = recordings[recordings.length - 1].time;
      const max = Math.max(1, ...recordings.map((record) => record.peak));
      ctx.strokeStyle = color("--panel-divider");
      ctx.lineWidth = 1;
      ctx.fillStyle = color("--panel-muted");
      ctx.font = "10px Arial";
      for (let step = 0; step <= 2; step++) {
        const y = bottom - step / 2 * (bottom - top);
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
        ctx.stroke();
        ctx.textAlign = "right";
        ctx.fillText(number(max * step / 2), left - 6, y + 3);
      }
      ctx.textAlign = first === last ? "center" : "left";
      const shortDate = (time) => new Date(time).toLocaleDateString(void 0, { year: "2-digit", month: "short", day: "numeric" });
      ctx.fillText(shortDate(first), first === last ? (left + right) / 2 : left, bottom + 19);
      if (first !== last) {
        ctx.textAlign = "right";
        ctx.fillText(shortDate(last), right, bottom + 19);
      }
      positions = [];
      for (const record of recordings) {
        const x = first === last ? (left + right) / 2 : left + (record.time - first) / (last - first) * (right - left);
        if (record.id === select.value) {
          ctx.strokeStyle = color("--panel-muted");
          ctx.setLineDash([2, 3]);
          ctx.beginPath();
          ctx.moveTo(x, top);
          ctx.lineTo(x, bottom);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        for (const [value, peak] of [[record.peak, true], [record.mean, false]]) {
          if (value === null) continue;
          const y = bottom - value / max * (bottom - top), radius = record.id === select.value ? 5 : 3;
          ctx.fillStyle = peak ? secondary : accent;
          ctx.beginPath();
          if (peak) {
            ctx.moveTo(x, y - radius);
            ctx.lineTo(x + radius, y);
            ctx.lineTo(x, y + radius);
            ctx.lineTo(x - radius, y);
            ctx.closePath();
          } else ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
          positions.push({ x, y, id: record.id });
        }
      }
      legend.style.color = accent;
      legend.replaceChildren();
      node(legend, "span", "● Average");
      node(legend, "span", " ◆ Peak in session").style.color = secondary;
    }
    function updateSelection() {
      const record = selected();
      actions.select(record.id);
      heading.textContent = record.title;
      meta.textContent = date(record.time) + " · " + record.samples.toLocaleString() + " samples";
      values.textContent = "Average " + number(record.mean) + " · Peak in session " + number(record.peak) + " · Full-session high " + number(record.sessionPeak) + " · Token holders / registered " + percent(record.tokenShare) + " · Covered " + actions.duration(record.coveredMs) + " · Gaps " + actions.duration(record.gapMs);
      const previousCount = record.comparisonIds.length - 1;
      compare.disabled = previousCount === 0;
      comparisonHint.textContent = previousCount ? "Compare this session with " + previousCount + " earlier " + (previousCount === 1 ? "session" : "sessions") + " from this model (" + (previousCount + 1) + " total)." : "No earlier saved sessions for this model.";
      table.querySelectorAll("button[data-history-id]").forEach((button2) => button2.setAttribute("aria-pressed", String(button2.dataset.historyId === record.id)));
      draw();
    }
    select.onchange = updateSelection;
    canvas.onclick = (event) => {
      const bounds = canvas.getBoundingClientRect(), width = Math.max(240, canvas.clientWidth);
      const x = (event.clientX - bounds.left) * width / bounds.width, y = (event.clientY - bounds.top) * 200 / bounds.height;
      let closest = null, distance = 15 * 15;
      for (const point of positions) {
        const d = (point.x - x) ** 2 + (point.y - y) ** 2;
        if (d <= distance) {
          closest = point;
          distance = d;
        }
      }
      if (closest) {
        select.value = closest.id;
        updateSelection();
      }
    };
    const scroll = node(parent, "div", void 0, "tools-scroll"), table = node(scroll, "table");
    table.id = "tools-history-table";
    node(table, "caption", actions.metricLabel + " · newest session first");
    const head = node(node(table, "thead"), "tr");
    ["Session", "Average", "Peak", "Token share¹", "Covered"].forEach((text) => {
      node(head, "th", text).scope = "col";
    });
    const body = node(table, "tbody");
    const more = button(parent, "Show more sessions", () => {
      shown += 50;
      rows();
      updateSelection();
      if (more.hidden) select.focus();
    }, "tools-history-more");
    function rows() {
      const previous = new Map([...body.children].map((row) => [row.querySelector("button").dataset.historyId, row]));
      const retained = /* @__PURE__ */ new Set();
      for (const [index, record] of [...recordings].reverse().slice(0, shown).entries()) {
        retained.add(record.id);
        let row = previous.get(record.id);
        if (row) {
          row.querySelector("button").textContent = record.title;
          row.querySelector("th div").textContent = date(record.time);
          const cells = row.querySelectorAll("td");
          cells[0].textContent = number(record.mean);
          cells[1].textContent = number(record.peak);
          cells[1].title = "First recorded at " + date(record.peakTime);
          cells[2].textContent = percent(record.tokenShare);
          cells[3].textContent = actions.duration(record.coveredMs);
          continue;
        }
        row = node(body, "tr");
        if (body.children[index] !== row) body.insertBefore(row, body.children[index]);
        const cell = node(row, "th");
        cell.scope = "row";
        const choose = button(cell, record.title, () => {
          select.value = record.id;
          updateSelection();
          select.focus();
        });
        choose.dataset.historyId = record.id;
        node(cell, "div", date(record.time), "tools-muted");
        node(row, "td", number(record.mean));
        node(row, "td", number(record.peak)).title = "First recorded at " + date(record.peakTime);
        node(row, "td", percent(record.tokenShare));
        node(row, "td", actions.duration(record.coveredMs));
      }
      for (const [id, row] of previous) if (!retained.has(id)) row.remove();
      more.hidden = shown >= recordings.length;
      more.textContent = "Show " + Math.min(50, recordings.length - shown) + " more (" + Math.min(shown, recordings.length) + " / " + recordings.length + ")";
    }
    node(parent, "p", "¹ Token holders as a proportion of registered viewers. Sessions with no covered interval have no average; recorded peaks remain available. Overlapping dates can be selected individually in the list.", "tools-muted");
    rows();
    updateSelection();
    return { canvas, draw, update(next, selectedId = select.value) {
      overview = next;
      recordings = next.recordings;
      const currentOptions = [...select.options];
      const nextRecords = [...recordings].reverse();
      if (currentOptions.length !== nextRecords.length || currentOptions.some((option, i) => option.value !== nextRecords[i].id)) {
        select.replaceChildren();
        for (const record of nextRecords) {
          const option = node(select, "option", date(record.time) + " · " + record.title);
          option.value = record.id;
        }
      }
      [...select.options].forEach((option, i) => {
        const record = nextRecords[i];
        option.textContent = date(record.time) + " · " + record.title;
      });
      if (recordings.some((record) => record.id === selectedId)) select.value = selectedId;
      updateCards();
      warning.hidden = !overview.overlaps;
      rows();
      updateSelection();
    } };
  }

  // src/recording-export-data.js
  function recordingCSV(archive) {
    const h = archive.session.history;
    function cell(value) {
      let text = String(value);
      if (typeof value === "string" && /^[\s]*[=+@-]/.test(text)) text = "'" + text;
      return '"' + text.replace(/"/g, '""') + '"';
    }
    const rows = [[
      "room",
      "sample_index",
      "timestamp_utc",
      "elapsed_seconds",
      "room_total",
      "registered",
      "anonymous",
      "with_tokens",
      "moderators",
      "fan_club",
      "dark_purple",
      "light_purple",
      "dark_blue",
      "light_blue",
      "grey",
      "female_trans"
    ]];
    h.timestamps.forEach((time, i) => rows.push([
      archive.room,
      i + 1,
      new Date(time).toISOString(),
      Math.max(0, time - h.timestamps[0]) / 1e3,
      h.total[i] + h.anonymous[i],
      h.total[i],
      h.anonymous[i],
      h.withTokens[i],
      h.red[i],
      h.green[i],
      h.purple[i],
      h.pink[i],
      h["dark-blue"][i],
      h["light-blue"][i],
      h.gray[i],
      h["female-trans"][i]
    ]));
    return "\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";
  }
  function recordingText(archive, version, generatedAt) {
    const s = archive.session, h = s.history, last = h.timestamps.length - 1;
    const time = (value) => value === null ? "Not recorded" : new Date(value).toISOString();
    const report = [
      "================================",
      "TIERSCOPE RECORDING REPORT",
      "================================",
      "",
      "Model: " + archive.room,
      "TierScope Version: " + version,
      "Recording Producer Version: " + archive.producerVersion,
      "Report Generated: " + time(generatedAt),
      "Session Start: " + time(s.sessionStartedAt) + (s.sessionStartEstimated ? " (estimated)" : ""),
      "Recording State: " + (s.isStopped ? "Stopped" : s.isPaused ? "Paused snapshot" : "Running snapshot"),
      "Recorded Active Seconds: " + s.pausedElapsedTime / 1e3,
      "Retained Samples: " + h.timestamps.length,
      "First Retained Sample: " + time(h.timestamps[0]),
      "Last Retained Sample: " + time(h.timestamps[last]),
      "Recording Gaps: " + (h.breaks || []).filter((value) => value).length,
      "",
      "--- SESSION HIGHS ---",
      "High timestamps use real recording time, including pauses.",
      "Room Total High: " + s.roomTotalHigh + " at " + time(s.roomTotalHighTime)
    ];
    const names = {
      red: "Moderators",
      green: "Fan Club",
      purple: "Dark Purple",
      pink: "Light Purple",
      "dark-blue": "Dark Blue",
      "light-blue": "Light Blue",
      gray: "Grey",
      "female-trans": "Female / Trans",
      withTokens: "With Tokens",
      total: "Registered",
      anonymous: "Anonymous"
    };
    for (const [key, label] of Object.entries(names)) {
      const high = s.sessionHighs[key];
      report.push(label + " High: " + high.value + " at " + time(high.time));
    }
    report.push("", "--- LAST RECORDED SAMPLE ---", "Room Total: " + (h.total[last] + h.anonymous[last]));
    for (const [key, label] of Object.entries(names)) report.push(label + ": " + h[key][last]);
    report.push("", "This report describes the full selected recording, not the replay cursor or another live room.", "");
    return report.join("\n");
  }

  // src/recording-exports.js
  function downloadRecording(archive, format) {
    const recording = validateSessionFile(archive);
    const now = Date.now();
    const content = format === "csv" ? recordingCSV(recording) : recordingText(recording, runtime.TIERSCOPE_VERSION, now);
    const blob = new Blob([content], { type: format === "csv" ? "text/csv;charset=utf-8" : "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob), link = document.createElement("a");
    link.href = url;
    link.download = recording.room + "-" + (format === "csv" ? "history-" : "recording-report-") + new Date(now).toISOString().replace(/[:.]/g, "-") + "." + format;
    document.body.appendChild(link);
    try {
      link.click();
    } finally {
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 6e4);
    }
  }

  // src/reports.js
  function downloadTrackingReport() {
    var modelName = getModelName();
    var restored = runtime.restoredDisplayFrame;
    var sessionStart = runtime.sessionStartedAt !== null ? formatDateTime(runtime.sessionStartedAt) : "Not started";
    var totalTime = runtime.trackingStartTime ? formatElapsedTime(runtime.isPaused ? runtime.pausedElapsedTime : Date.now() - runtime.trackingStartTime) : "00:00:00";
    var now = Date.now();
    var storageReport = getStorageReportStatus(modelName);
    var report = [
      "================================",
      "CHATURBATE TRACKING REPORT",
      "================================",
      "",
      "Model: " + modelName,
      "Session Start: " + sessionStart + (runtime.sessionStartEstimated ? " (estimated from legacy data)" : ""),
      "Report Generated: " + formatDateTime(now),
      "TierScope Version: " + runtime.TIERSCOPE_VERSION,
      "Storage Schema Version: " + runtime.STORAGE_SCHEMA_VERSION,
      "Saved Session Producer Version: " + storageReport.producer,
      "Session Storage: " + storageReport.access,
      "Last Accepted Acquisition Source: " + (runtime.lastAcceptedAcquisition ? runtime.lastAcceptedAcquisition.source : "None"),
      "Last Accepted Sample Time: " + (runtime.lastAcceptedAcquisition ? new Date(runtime.lastAcceptedAcquisition.timestamp).toISOString() : "None"),
      "Total Tracking Time: " + totalTime,
      ""
    ];
    if (runtime.isStopped) {
      report.push("Session State: STOPPED — " + stopDescription());
      report.push("Stopped At: " + new Date(runtime.stoppedAt).toISOString());
      report.push("Displayed Data: Final retained sample; this session is closed.");
      report.push("");
    } else if (isAbsencePaused()) {
      report.push("Session State: AUTO-PAUSED — broadcaster absent");
      report.push("Auto-paused At: " + new Date(runtime.absencePausedAt).toISOString());
      report.push("Displayed Data: Last retained sample; presence checks do not record audience counts.");
      report.push(absencePauseDescription());
      report.push("");
    }
    if (runtime.absenceOverrideActive) report.push("Absence Automation: Manually overridden until the broadcaster is detected again.", "");
    if (restored) {
      report.push("Displayed Data: Last saved snapshot; no fresh sample accepted since restore.");
      report.push("Saved Snapshot Time: " + new Date(restored.timestamp).toISOString());
      report.push("");
    }
    if (runtime.lastAcceptedAcquisition && runtime.lastAcceptedAcquisition.api) {
      report.push("API Anonymous Count: " + runtime.lastAcceptedAcquisition.api.anonymousCount);
      report.push("API Registered Record Count: " + runtime.lastAcceptedAcquisition.api.registeredCount);
      report.push("API Total Users: " + runtime.lastAcceptedAcquisition.api.totalUsers);
      report.push("API Owner Record Present: " + (runtime.lastAcceptedAcquisition.api.ownerCount > 0 ? "yes" : "no"));
      report.push("Registered includes broadcaster/owner and unclassified records outside the seven viewer tiers.");
      report.push("");
    }
    report.push("--- SESSION HIGHS ---");
    report.push("Offsets below are wall time since session start, including pauses.");
    if (runtime.sessionStartEstimated) report.push("Legacy tier highs were recovered from retained samples; older discarded peaks are unavailable.");
    report.push("");
    if (runtime.roomTotalHigh > 0 && runtime.roomTotalHighTime) {
      var elapsed = formatElapsedTime(runtime.roomTotalHighTime - runtime.sessionStartedAt);
      report.push("Room Total High: " + runtime.roomTotalHigh.toLocaleString() + " users");
      report.push("  Recorded at: " + formatDateTime(runtime.roomTotalHighTime) + " (" + elapsed + " into session)");
      report.push("");
    }
    Object.keys(runtime.TIERS).forEach(function(tier) {
      var highResult = getSessionHigh(tier, 0);
      var highVal = highResult.value;
      var highTime = runtime.tierHighTimes[tier];
      if (highVal > 0 && highTime) {
        var elapsed2 = formatElapsedTime(highTime - runtime.sessionStartedAt);
        report.push(runtime.TIERS[tier].name + " High: " + highVal.toLocaleString());
        report.push("  Recorded at: " + formatDateTime(highTime) + " (" + elapsed2 + " into session)");
        report.push("");
      }
    });
    var withTokensResult = getSessionHigh("withTokens", 0);
    var withTokensHigh = withTokensResult.value;
    if (withTokensHigh > 0 && runtime.withTokensHighTime) {
      var elapsed = formatElapsedTime(runtime.withTokensHighTime - runtime.sessionStartedAt);
      report.push("With Tokens High: " + withTokensHigh.toLocaleString());
      report.push("  Recorded at: " + formatDateTime(runtime.withTokensHighTime) + " (" + elapsed + " into session)");
      report.push("");
    }
    var totalResult = getSessionHigh("total", 0);
    var totalHigh = totalResult.value;
    if (totalHigh > 0 && runtime.totalHighTime) {
      var elapsed = formatElapsedTime(runtime.totalHighTime - runtime.sessionStartedAt);
      report.push("Registered Users High: " + totalHigh.toLocaleString());
      report.push("  Recorded at: " + formatDateTime(runtime.totalHighTime) + " (" + elapsed + " into session)");
      report.push("");
    }
    var anonResult = getSessionHigh("anonymous", 0);
    var anonHigh = anonResult.value;
    if (anonHigh > 0 && runtime.anonHighTime) {
      var elapsed = formatElapsedTime(runtime.anonHighTime - runtime.sessionStartedAt);
      report.push("Anonymous High: " + anonHigh.toLocaleString());
      report.push("  Recorded at: " + formatDateTime(runtime.anonHighTime) + " (" + elapsed + " into session)");
      report.push("");
    }
    report.push(runtime.isStopped ? "--- STOPPED SESSION STATS (NOT A LIVE SAMPLE) ---" : isAbsencePaused() ? "--- AUTO-PAUSED STATS (NOT A LIVE SAMPLE) ---" : restored ? "--- LAST SAVED STATS (NOT A LIVE SAMPLE) ---" : "--- CURRENT STATS ---");
    report.push("");
    var counts = { "red": 0, "green": 0, "purple": 0, "pink": 0, "dark-blue": 0, "light-blue": 0, "gray": 0, "female-trans": 0 };
    runtime.users.forEach(function(data) {
      if (counts[data.tier] !== void 0) counts[data.tier]++;
      if (data.gender === "female" || data.gender === "trans") {
        counts["female-trans"]++;
      }
    });
    var total = runtime.users.size;
    var withTokens = counts["red"] + counts["green"] + counts["purple"] + counts["pink"] + counts["dark-blue"] + counts["light-blue"];
    var anonymousCount = getAnonymousCount();
    var fullRoomTotal = runtime.roomTotal > total ? runtime.roomTotal : total + anonymousCount;
    if (restored) {
      counts = restored.counts;
      total = restored.total;
      withTokens = restored.withTokens;
      anonymousCount = restored.anonymousCount;
      fullRoomTotal = restored.fullRoomTotal;
    }
    var totalHighCurrent = getSessionHigh("total", total).value;
    var withTokensHighCurrent = getSessionHigh("withTokens", withTokens).value;
    var anonHighCurrent = getSessionHigh("anonymous", anonymousCount).value;
    var statsLabel = runtime.isStopped ? "Final " : restored ? "Saved " : "Current ";
    var reportedRoomHigh = restored ? restored.roomTotalHigh : runtime.roomTotalHigh;
    report.push(statsLabel + "Room Total: " + fullRoomTotal.toLocaleString() + " (High: " + reportedRoomHigh.toLocaleString() + ")");
    report.push(statsLabel + "Registered: " + total.toLocaleString() + " (High: " + totalHighCurrent.toLocaleString() + ")");
    report.push(statsLabel + "With Tokens: " + withTokens.toLocaleString() + " (High: " + withTokensHighCurrent.toLocaleString() + ")");
    report.push(statsLabel + "Anonymous: " + anonymousCount.toLocaleString() + " (High: " + anonHighCurrent.toLocaleString() + ")");
    report.push("");
    report.push(restored ? "--- SAVED TIER BREAKDOWN ---" : "--- TIER BREAKDOWN ---");
    report.push("");
    Object.keys(runtime.TIERS).forEach(function(tier) {
      var current = counts[tier] || 0;
      var high = getSessionHigh(tier, current).value;
      report.push(runtime.TIERS[tier].name + ": " + current.toLocaleString() + " (High: " + high.toLocaleString() + ")");
    });
    report.push("");
    report.push("================================");
    report.push("End of Report");
    report.push("================================");
    var date = /* @__PURE__ */ new Date();
    var dateStr = date.toISOString().slice(0, 10);
    var timeStr = date.getHours().toString().padStart(2, "0") + "-" + date.getMinutes().toString().padStart(2, "0") + "-" + date.getSeconds().toString().padStart(2, "0");
    var filename = modelName + "-tracking-report-" + dateStr + "-" + timeStr + ".txt";
    var blob = new Blob([report.join("\n")], { type: "text/plain" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  function downloadTrackingCSV() {
    if (!runtime.history.timestamps.length) {
      alert("No recorded history to export yet.");
      return;
    }
    var model = getModelName();
    function cell(value) {
      var text = String(value);
      if (typeof value === "string" && /^[\s]*[=+@-]/.test(text)) text = "'" + text;
      return '"' + text.replace(/"/g, '""') + '"';
    }
    var rows = [[
      "room",
      "sample_index",
      "timestamp_utc",
      "elapsed_seconds",
      "room_total",
      "registered",
      "anonymous",
      "with_tokens",
      "moderators",
      "fan_club",
      "dark_purple",
      "light_purple",
      "dark_blue",
      "light_blue",
      "grey",
      "female_trans"
    ]];
    runtime.history.timestamps.forEach(function(timestamp, i) {
      rows.push([
        model,
        i + 1,
        new Date(timestamp).toISOString(),
        Math.max(0, timestamp - runtime.history.timestamps[0]) / 1e3,
        runtime.history.total[i] + runtime.history.anonymous[i],
        runtime.history.total[i],
        runtime.history.anonymous[i],
        runtime.history.withTokens[i],
        runtime.history.red[i],
        runtime.history.green[i],
        runtime.history.purple[i],
        runtime.history.pink[i],
        runtime.history["dark-blue"][i],
        runtime.history["light-blue"][i],
        runtime.history.gray[i],
        runtime.history["female-trans"][i]
      ]);
    });
    var blob = new Blob(
      ["\uFEFF" + rows.map(function(row) {
        return row.map(cell).join(",");
      }).join("\r\n") + "\r\n"],
      { type: "text/csv;charset=utf-8" }
    );
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = model.replace(/[^a-z0-9_-]/gi, "_") + "-history-" + (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-") + ".csv";
    document.body.appendChild(link);
    try {
      link.click();
    } finally {
      link.remove();
      setTimeout(function() {
        URL.revokeObjectURL(url);
      }, 6e4);
    }
  }

  // src/session-tools.js
  var noteDrafts = createLibraryDrafts();
  var draftUnloadAttached = false;
  function warnUnsavedNotes(event) {
    if (noteDrafts.size) {
      event.preventDefault();
      event.returnValue = "";
    }
  }
  function syncDraftWarning() {
    if (noteDrafts.size && !draftUnloadAttached) window.addEventListener("beforeunload", warnUnsavedNotes);
    if (!noteDrafts.size && draftUnloadAttached) window.removeEventListener("beforeunload", warnUnsavedNotes);
    draftUnloadAttached = noteDrafts.size > 0;
  }
  var closeSessionTools = null;
  var refreshSessionTools = null;
  function updateSessionToolsStatus(reload = false) {
    if (refreshSessionTools) refreshSessionTools(reload);
    const element = document.getElementById("session-save-info");
    if (!element) return;
    const state = getSessionSaveState(getModelName());
    const warning = state.error || runtime.sessionStorageNotice;
    element.textContent = warning ? "Session saving unavailable. Keep this tab open or download a session file." : state.savedAt ? "Session saved in this browser at " + new Date(state.savedAt).toLocaleTimeString() + "." : "No session saved in this tab yet.";
    element.style.color = warning ? "var(--panel-warning)" : "var(--panel-muted)";
    element.hidden = !warning;
  }
  function bindSessionTools() {
    for (const id of ["btn-control-library", "btn-playback-library"]) {
      const button = document.getElementById(id);
      if (button) button.onclick = () => {
        if (closeSessionTools) closeSessionTools();
        else openSessionTools(button);
      };
    }
    return () => {
      if (closeSessionTools) closeSessionTools();
    };
  }
  function openSessionTools(focusTarget) {
    if (closeSessionTools) closeSessionTools();
    const origin = location.href, generation = runtime.initGuard, focusBefore = focusTarget || document.getElementById("btn-control-library") || document.activeElement;
    const dialog = document.createElement("dialog");
    dialog.id = "tierscope-session-tools";
    dialog.setAttribute("aria-labelledby", "tools-title");
    dialog.setAttribute("aria-modal", "false");
    dialog.innerHTML = libraryShell();
    document.body.appendChild(dialog);
    let currentArchive = null, liveComparisonArchive = null, library = null, tab = "library", fileRequest = 0, chartObserver = null;
    const libraryReader = createLibraryReader();
    const modelHistoryReader = createModelHistoryReader();
    const modelCardReader = createModelCardReader();
    let historyLimit = Infinity, historySelected = "", compareAxis = "elapsed";
    let optionsLibrary = null, optionsArchive = null, optionsLiveArchive = null, options = [];
    const savedAnalysis = readAnalysisPreferences();
    let { metric, threshold, sharedLength } = savedAnalysis.preferences;
    let summaryThresholds = [], summaryThresholdSource = null, summaryAutomatic = true, thresholdDirty = false;
    let selectedA = "current", selectedB = "", selectedExtra = [], pendingBackup = null;
    const libraryFilters = { room: "", query: "", from: "", to: "", sort: "newest", favorites: false }, librarySelection = /* @__PURE__ */ new Set();
    const libraryDisclosures = { book: false, search: false };
    const analysisFilters = { room: "", query: "", from: "", to: "" };
    let filteredSources = null, chartDispose = null;
    const pickerOpen = { summary: false, compare: true };
    let analysisView = null, analysisOutput = null, analysisSources = null, analysisReports = null;
    const analysisStates = /* @__PURE__ */ new Map();
    let libraryRoom = null, chartDraw = null, analysisPreferenceError = savedAnalysis.error;
    let observedSource = null, observedSignature = "";
    let refreshCapacity = null, capacityCheckpoint = "";
    let detachDock = null, historyView = null, followControls = null, liveCapture = null, historyDiscovery = "";
    let currentArchiveIsReplay = isPlaybackCurrent(runtime.playback);
    const followers = { summary: createAnalysisFollower(), compare: createAnalysisFollower(), history: createAnalysisFollower() };
    try {
      currentArchive = captureSessionFile();
    } catch (error) {
    }
    const content = dialog.querySelector("#tools-content"), message = dialog.querySelector("#tools-message");
    const current = () => dialog.isConnected && dialog.open && origin === location.href && generation === runtime.initGuard;
    function tell(text, error = false) {
      message.textContent = text;
      message.style.color = error ? "var(--panel-negative)" : "var(--panel-positive)";
    }
    function rememberAnalysis(patch) {
      const result = rememberAnalysisPreferences(patch);
      ({ metric, threshold, sharedLength } = result.preferences);
      analysisPreferenceError = result.error;
    }
    function downloadUnreadableRecords() {
      const recovery = createLibraryRecoveryExport();
      if (!recovery.records.length) {
        tell("No unreadable library records remain. Refresh the list.");
        return;
      }
      downloadDataFile(recovery, "TierScope-library-recovery-" + (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) + ".json");
      const missing = recovery.records.filter((record) => record.error).length;
      tell("Recovery download requested. Originals were kept. This file is for manual recovery, not normal backup restore." + (missing ? " " + missing + " record(s) could not be exported; the file lists those errors." : ""), !!missing);
    }
    function action(fn) {
      return (...args) => {
        try {
          return fn(...args);
        } catch (error) {
          tell(error.message, true);
        }
      };
    }
    function button(parent, text, fn, id) {
      const element = document.createElement("button");
      element.type = "button";
      element.textContent = text;
      if (id) element.id = id;
      element.onclick = action(fn);
      parent.appendChild(element);
      return element;
    }
    function node(parent, tag, text, className) {
      const element = document.createElement(tag);
      if (text !== void 0) element.textContent = text;
      if (className) element.className = className;
      parent.appendChild(element);
      return element;
    }
    function chooseFile(maxBytes, accept, multiple = false) {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,application/json";
      input.hidden = true;
      input.multiple = multiple;
      const request = ++fileRequest, playbackAtRequest = runtime.playback;
      dialog.appendChild(input);
      const stillSelected = () => current() && request === fileRequest && runtime.playback === playbackAtRequest;
      input.onchange = async () => {
        const files = Array.from(input.files || []);
        if (!files.length) {
          input.remove();
          return;
        }
        try {
          if (files.length > (multiple ? LIBRARY_TRANSFER_MAX_COUNT : 1) || files.reduce((total, file) => total + file.size, 0) > maxBytes) throw new Error("Choose " + (multiple ? "up to 10,000 files" : "one file") + " totaling at most " + Math.round(maxBytes / 1024 / 1024) + " MB.");
          const values = [];
          for (const file of files) {
            values.push(await readDataFile(file, maxBytes));
            if (!stillSelected()) return;
          }
          const value = multiple ? values : values[0];
          if (stillSelected()) accept(value);
        } catch (error) {
          if (stillSelected()) tell(error.message, true);
        } finally {
          input.remove();
        }
      };
      input.addEventListener("cancel", () => input.remove(), { once: true });
      input.click();
    }
    function readLibrary() {
      library = libraryReader.read();
      options = [];
      optionsLibrary = null;
      optionsArchive = null;
      let migrationError = "";
      try {
        migrateRecordingFavorites(library.entries);
      } catch (error) {
        migrationError = "Previous stars could not yet be saved as model favorites. Refresh to retry.";
      }
      try {
        const models = readModelFavorites(library.entries);
        library.favoriteModels = models.favorites;
        library.automaticModels = models.automatic;
        library.favoriteError = migrationError || (models.errors.length ? "Some model favorites could not be read. Refresh to retry; sessions remain available." : "");
      } catch (error) {
        library.favoriteModels = /* @__PURE__ */ new Set();
        library.favoriteError = "Model favorites could not be read. Refresh to retry; sessions remain available.";
      }
      library.entries = library.entries.map((entry) => {
        var _a;
        return __spreadProps(__spreadValues({}, entry), { modelFavorite: library.favoriteModels.has(entry.archive.room.toLowerCase()), autoKeep: ((_a = library.automaticModels) == null ? void 0 : _a.has(entry.archive.room.toLowerCase())) || false });
      });
      for (const follower of Object.values(followers)) {
        const aliases = follower.reconcile(library.entries), remap = (id) => aliases.get(id) || id;
        selectedA = remap(selectedA);
        selectedB = remap(selectedB);
        selectedExtra = selectedExtra.map(remap);
        historySelected = remap(historySelected);
        if (summaryThresholdSource) summaryThresholdSource.id = remap(summaryThresholdSource.id);
        for (const saved of analysisStates.values()) saved.ids = saved.ids.map(remap);
      }
      noteDrafts.reconcile(library.entries);
      updateDraftNotice();
      return library;
    }
    function updateDraftNotice() {
      syncDraftWarning();
      const notice = dialog.querySelector("#tools-review-notes");
      notice.hidden = !noteDrafts.size;
      notice.textContent = noteDrafts.size + " unsaved " + (noteDrafts.size === 1 ? "note" : "notes") + " · Review";
    }
    const noteActions = {
      note: (entry) => noteDrafts.read(entry),
      editNote: (entry, value) => {
        noteDrafts.edit(entry, value);
        updateDraftNotice();
      },
      discardNote: (entry) => {
        noteDrafts.discard(noteDrafts.read(entry).id);
        updateDraftNotice();
        render(tab);
      },
      saveNote: action((entry) => {
        const draft = noteDrafts.read(entry);
        if (!draft.dirty) return;
        const fresh = libraryReader.read();
        const latest = fresh.entries.find((item) => item.id === draft.id || draft.lineage && item.lineage === draft.lineage || item.records.some((record) => record.key === LIBRARY_PREFIX + draft.id));
        if (!latest) throw new Error("This session changed or is unavailable. Your draft is kept in Review unsaved notes.");
        if ((latest.notes || "") !== draft.base && latest.notes !== draft.value && !confirm("Saved notes for this session changed in another tab. Replace them with your draft?")) return;
        updateLibraryMetadata(latest.id, { notes: draft.value });
        noteDrafts.discard(draft.id);
        updateDraftNotice();
        render(tab);
        tell("Session notes saved.");
      })
    };
    function renderDrafts() {
      const state = readLibrary();
      button(content, "‹ Sessions", () => render("library"), "tools-drafts-back");
      node(content, "h3", "Unsaved notes");
      node(content, "p", "Drafts stay in this tab when Library closes. Save them before refreshing or leaving the site.", "tools-muted");
      if (!noteDrafts.size) node(content, "p", "All notes are saved or discarded.", "tools-muted");
      for (const draft of noteDrafts.list()) {
        const entry = state.entries.find((entry2) => entry2.id === draft.id);
        const card = node(content, "section", void 0, "tools-row");
        node(card, "strong", draft.title);
        node(card, "p", draft.room + " · " + new Date(draft.time).toLocaleString(), "tools-muted");
        renderRecordingNotes(card, entry || {
          id: draft.id,
          title: draft.title,
          notes: draft.base,
          archive: { room: draft.room, session: { history: { timestamps: [draft.time] } } }
        }, noteActions, !entry);
      }
    }
    function sourceOptions() {
      if (optionsLibrary === library && optionsArchive === currentArchive && optionsLiveArchive === liveComparisonArchive) return followers[tab] ? followers[tab].project(options) : options;
      const items = [];
      if (liveComparisonArchive) items.push({ id: "live", title: "Live snapshot — " + liveComparisonArchive.room, archive: liveComparisonArchive });
      if (currentArchive) items.push({ id: "current", title: "Current / replayed snapshot — " + currentArchive.room, archive: currentArchive });
      for (const entry of library.entries) {
        const title = entry.title && entry.title.trim().toLowerCase() !== entry.archive.room.toLowerCase() ? " — " + entry.title : "";
        items.push(__spreadProps(__spreadValues({}, entry), { title: entry.archive.room + title + " — " + new Date(entry.archive.session.history.timestamps[0]).toLocaleString() }));
      }
      optionsLibrary = library;
      optionsArchive = currentArchive;
      optionsLiveArchive = liveComparisonArchive;
      options = items;
      return followers[tab] ? followers[tab].project(options) : options;
    }
    function selectSource(parent, label, id, selected, changed) {
      const wrapper = node(parent, "label", label), select = node(wrapper, "select");
      select.id = id;
      const matches = filteredSources || sourceOptions(), choices = matches.slice();
      const retained = sourceOptions().find((item) => item.id === selected);
      if (retained && !choices.some((item) => item.id === selected)) choices.unshift(__spreadProps(__spreadValues({}, retained), { title: retained.title + " (selected; outside filters)" }));
      if (selected && selected !== "current" && selected !== "live" && !retained) choices.unshift({ id: selected, title: "Session changed or removed — choose another" });
      for (const item of choices) {
        const option = node(select, "option", item.title);
        option.value = item.id;
      }
      if (choices.some((item) => item.id === selected)) select.value = selected;
      select.onchange = () => changed(select.value);
      return select.value;
    }
    function archiveName(archive) {
      return archive.room + "-session-" + new Date(archive.session.timestamp).toISOString().replace(/[:.]/g, "-") + ".tierscope.json";
    }
    function addArchiveHighs(archive) {
      const result = storeAllTimeHighs(archive.room, sessionAllTimeHighs(archive.session, "file"));
      if (isPlaybackCurrent(runtime.playback) && runtime.playback.archive.room.toLowerCase() === archive.room.toLowerCase()) {
        setPlaybackAllTimeState(runtime.playback, result.state);
      }
      repaintHighMode();
      tell(result.saved ? (result.changed ? "All-time highs updated for " : "No higher records for ") + archive.room + "." : result.state.error || "Records changed in another tab. Try again.", !result.saved);
    }
    function followContext() {
      const room2 = getModelName(), history = runtime.history;
      const identity = room2 + ":" + runtime.sessionStartedAt + ":" + runtime.activeRoomEpoch;
      if (!current() || room2 === "unknown" || location.href !== runtime.lastUrl || runtime.activeSessionStorageKey !== getStorageKey(room2) || !history.timestamps.length) {
        return { identity, reason: "Waiting for a live session in this room." };
      }
      try {
        if (!readModelFavorite(room2).autoKeep) return { identity, reason: "Confirm this model as a favorite to follow their live session." };
      } catch (error) {
        return { identity, reason: "Favorite setting unavailable; this view is frozen." };
      }
      return { identity, room: room2, signature: [identity, history.timestamps[0], history.timestamps.at(-1), history.timestamps.length, runtime.isPaused, runtime.isStopped, runtime.stoppedAt].join(":") };
    }
    function followedEntries() {
      return followers.history.project(library.entries);
    }
    function updateFollowing() {
      const follower = followers[tab];
      if (!follower) return false;
      const context = followContext();
      let reason = context.reason || "", changed = false, candidates = [];
      if (!follower.check(context.identity)) reason = "Session changed. Choose or refresh a session to follow the new session.";
      if (reason && follower.identity) follower.toggle(false);
      if (!reason) {
        if (tab === "history" && follower.enabled && !follower.identity) {
          const saved = automaticLibraryStatus(context.room).savedAt;
          if (saved && historyDiscovery !== String(saved)) {
            historyDiscovery = String(saved);
            readLibrary();
          }
        }
        const items = tab === "history" ? followedEntries() : sourceOptions().filter((item) => (tab === "summary" ? [selectedA] : [selectedA, selectedB, ...selectedExtra]).includes(item.id));
        candidates = items.filter((item) => !(item.id === "current" && currentArchiveIsReplay) && item.archive.room.toLowerCase() === context.room.toLowerCase() && item.archive.session.sessionStartedAt === runtime.sessionStartedAt && (tab !== "history" || libraryRoom === context.room.toLowerCase()));
        if (!candidates.length) reason = "Choose this favorite model’s current live session to follow new scans.";
        if (candidates.length && follower.enabled) {
          if (!liveCapture || liveCapture.signature !== context.signature || liveCapture.source !== runtime.history) {
            liveCapture = { signature: context.signature, source: runtime.history, archive: freezeRecordingData(captureLiveSessionFile()) };
          }
          candidates = candidates.filter((item) => {
            var _a;
            if (item.archive === liveCapture.archive || follower.identity === context.identity && ((_a = follower.get(item.id)) == null ? void 0 : _a.archive) === item.archive) return true;
            const order = compareLibrarySessions(item.archive, liveCapture.archive);
            return order === 0 || order === 1;
          });
          if (!candidates.length) reason = "This session differs from the live session. Its snapshot is kept.";
          else changed = follower.update(context.identity, context.signature, candidates, liveCapture.archive);
        }
      }
      if (followControls) {
        const { check, status } = followControls;
        check.disabled = !!reason;
        check.checked = follower.enabled && !reason;
        status.textContent = reason || (!follower.enabled ? "Frozen for inspection. Turn on to catch up." : (runtime.isStopped ? "Stopped" : runtime.isPaused ? "Paused" : "Following live") + " · latest sample " + new Date(runtime.history.timestamps.at(-1)).toLocaleTimeString() + (automaticLibraryStatus(context.room).error ? " · Library save pending; showing live data." : "") + (tab === "compare" && compareAxis === "elapsed" && sharedLength ? " · Match shared length limits the chart to the shortest session." : ""));
      }
      return changed;
    }
    function followControl(parent) {
      const row = node(parent, "div", void 0, "tools-actions tools-follow");
      const check = checkbox(row, "tools-follow-live", "Follow live");
      const status = node(row, "span", "", "tools-muted");
      status.id = "tools-follow-status";
      check.setAttribute("aria-describedby", status.id);
      followControls = { check, status };
      check.onchange = action(() => {
        followers[tab].toggle(check.checked);
        const changed = updateFollowing();
        if (changed) refreshFollowedView();
      });
      updateFollowing();
    }
    function refreshFollowedView() {
      const scrollTop = content.scrollTop;
      if (tab === "history" && historyView) historyView.update(modelHistoryReader.read(followedEntries(), libraryRoom, metric, historyLimit), historySelected);
      else if (tab === "history") render("history");
      else if ((tab === "summary" || tab === "compare") && analysisOutput) refreshAnalysis(true, true);
      content.scrollTop = scrollTop;
    }
    function selectNewFollowSource() {
      if (followers[tab]) followers[tab].reset();
    }
    function refreshCurrent() {
      var _a;
      if (followers[tab] && updateFollowing()) refreshFollowedView();
      const checkpoint2 = automaticLibraryStatus(getModelName());
      const checkpointSignature = [checkpoint2.identity, checkpoint2.signature, checkpoint2.savedAt, checkpoint2.error].join(":");
      if (refreshCapacity && capacityCheckpoint !== checkpointSignature) {
        capacityCheckpoint = checkpointSignature;
        try {
          refreshCapacity(libraryReader.read(), readLibraryLimits(), "");
        } catch (error) {
          refreshCapacity(library, null, error.message);
        }
      }
      const playback = isPlaybackCurrent(runtime.playback) ? runtime.playback : null;
      const source = playback ? playback.archive : runtime.history;
      const history = playback ? source.session.history : runtime.history;
      const room2 = playback ? source.room : getModelName();
      const available = history.timestamps.length > 0 && (playback || runtime.activeSessionStorageKey === getStorageKey(room2) && runtime.lastUrl === location.href);
      const signature = [room2, !!playback, history.timestamps.length, history.timestamps.at(-1), runtime.isPaused, runtime.isStopped].join(":");
      if (source === observedSource && signature === observedSignature) {
        refreshCards();
        return;
      }
      const replaced = source !== observedSource, firstCapture = !currentArchive && available;
      observedSource = source;
      observedSignature = signature;
      if (replaced || !currentArchive) {
        const replayChanged = !!playback !== currentArchiveIsReplay;
        if (!((_a = followers[tab]) == null ? void 0 : _a.identity) || replayChanged || playback) {
          currentArchiveIsReplay = !!playback;
          try {
            currentArchive = captureSessionFile();
          } catch (error) {
            currentArchive = null;
          }
          if (replayChanged || playback) for (const follower of Object.values(followers)) follower.forget("current");
        }
      }
      refreshCards();
      if ((replaced || firstCapture) && (tab === "summary" && selectedA === "current" || tab === "compare" && [selectedA, selectedB, ...selectedExtra].includes("current"))) render(tab);
    }
    function favoriteAction(room2, enableOnly = false) {
      if (!changeModelFavorite(room2, enableOnly)) return;
      const state = readModelFavorite(room2);
      document.querySelectorAll("[data-favorite-room]").forEach((button2) => {
        if (button2.dataset.favoriteRoom === room2) paintFavoriteButton(button2, room2, state);
      });
      render("library");
      const pending = automaticLibraryStatus(room2).error;
      tell(pending ? "Favorite saved; Library save pending. " + pending : state.autoKeep ? "Favorite saved. Automatic keeping is on for " + room2 + "." : "Favorite removed. Kept sessions remain in Library.", !!pending);
    }
    function refreshCards() {
      for (const replay of [false, true]) {
        const suffix = replay ? "-replay" : "", card = dialog.querySelector("#tools-current-card" + suffix);
        if (!card) continue;
        const playback = isPlaybackCurrent(runtime.playback) ? runtime.playback : null;
        card.hidden = replay && !playback;
        if (card.hidden) continue;
        const room2 = replay ? playback.archive.room : getModelName();
        const history = replay ? playback.archive.session.history : runtime.history;
        const available = !!history.timestamps.length && (replay || runtime.activeSessionStorageKey === getStorageKey(room2) && runtime.lastUrl === location.href);
        card.querySelector("[data-card-kind]").textContent = replay ? playback.imported ? "File / Library Replay" : "Replay Snapshot" : "Current Live Session";
        card.querySelector("[data-card-room]").textContent = room2 === "unknown" ? "Open a model’s room" : room2;
        card.querySelector("[data-card-meta]").textContent = (replay ? "" : runtime.isStopped ? "Stopped · " : runtime.isPaused ? "Paused · " : "") + (available ? history.timestamps.length.toLocaleString() + " samples · " + new Date(history.timestamps[0]).toLocaleString() : "Waiting for the first recorded sample.");
        card.querySelectorAll("[data-current-action]").forEach((button2) => {
          button2.dataset.currentAvailable = String(available);
          button2.disabled = !available || button2.dataset.gif === "true" && !!runtime.gifExportJob;
        });
        const star = card.querySelector("[data-card-star]"), info = card.querySelector("[data-card-auto]");
        let preference = { favorite: false, autoKeep: false };
        try {
          if (room2 !== "unknown") preference = readModelFavorite(room2);
        } catch (error) {
          preference.error = "Favorites unavailable. Refresh to retry.";
        }
        paintFavoriteButton(star, room2, preference);
        const status = automaticLibraryStatus(room2);
        info.textContent = replay ? "Replay is a snapshot. Keep it explicitly to add or update it in Library." : preference.error || (status.error ? "Automatic keep pending: " + status.error : preference.autoKeep ? status.waiting ? "Automatic keeping requires " + status.minimumMinutes + " minutes of recorded coverage · " + formatElapsedTime(status.coveredMs) + " recorded." : status.savedAt ? "Automatically kept at " + new Date(status.savedAt).toLocaleTimeString() + ". Updates as you record." : "Automatic keeping on · waiting for a recorded sample." : preference.favorite ? "Favorite · automatic keeping is off until you confirm." : "Favorite this model to automatically keep their live sessions.");
        info.style.color = !replay && status.error ? "var(--panel-warning)" : "var(--panel-muted)";
        const automatic = card.querySelector("#tools-auto-keep");
        if (automatic) {
          automatic.checked = preference.autoKeep;
          automatic.disabled = preference.autoKeep || room2 === "unknown" || !!preference.error;
          automatic.parentElement.dataset.locked = String(preference.autoKeep);
          automatic.parentElement.title = preference.error || (preference.autoKeep ? "Automatic keeping is on for this favorite. Remove the star to turn it off; kept sessions stay in Library." : "Favorite this model and confirm to automatically keep their live sessions.");
          automatic.parentElement.querySelector("[data-auto-lock]").hidden = !preference.autoKeep;
        }
        const compare = card.querySelector("#tools-compare-previous");
        if (compare) {
          const previous = available ? previousModelSessionIds((library == null ? void 0 : library.entries) || [], { room: room2, session: {
            sessionStartedAt: runtime.sessionStartedAt,
            history: { timestamps: history.timestamps }
          } }) : [];
          compare.disabled = !available || !previous.length;
          compare.title = !available ? "Record a sample first." : previous.length ? "Compare this live snapshot with " + previous.length + " earlier saved session(s) for " + room2 + "." : "Keep an earlier session for this model to compare with.";
        }
        const retry = card.querySelector("[data-card-retry]");
        retry.hidden = replay || !status.error;
        const historyButton = card.querySelector("[data-card-history]");
        historyButton.disabled = room2 === "unknown";
        historyButton.parentElement.hidden = room2 === "unknown";
        const count = (library == null ? void 0 : library.entries.filter((entry) => entry.archive.room.toLowerCase() === room2.toLowerCase()).length) || 0;
        historyButton.textContent = "History · " + count;
        historyButton.title = count + " saved sessions for " + room2;
      }
    }
    function currentCard(replay = false) {
      const suffix = replay ? "-replay" : "";
      const card = node(content, "section", void 0, "tools-current");
      card.id = "tools-current-card" + suffix;
      card.setAttribute("aria-label", replay ? "Replayed session" : "Current Live Session");
      const kind = node(card, "div", "", "tools-eyebrow");
      kind.id = "tools-current-kind" + suffix;
      kind.dataset.cardKind = "";
      const name = node(card, "div", void 0, "tools-model-name");
      const title = node(name, "strong", "");
      title.id = "tools-current-room" + suffix;
      title.dataset.cardRoom = "";
      const star = button(name, "☆", () => favoriteAction(star.dataset.favoriteRoom), "tools-current-favorite" + suffix);
      star.dataset.cardStar = "";
      const meta = node(card, "div", "", "tools-muted");
      meta.id = "tools-current-meta" + suffix;
      meta.dataset.cardMeta = "";
      const capture = replay ? () => {
        if (!isPlaybackCurrent(runtime.playback)) throw new Error("Replay has closed.");
        return runtime.playback.archive;
      } : () => captureLiveSessionFile();
      const actions = node(card, "div", void 0, "tools-actions");
      function currentButton(parent, text, fn, id) {
        const control = button(parent, text, () => fn(capture()), id + suffix);
        control.dataset.currentAction = "true";
        return control;
      }
      currentButton(actions, "Keep in Library", (archive) => {
        const result = keepSessionInLibrary(archive);
        libraryRoom = archive.room.toLowerCase();
        Object.assign(libraryFilters, { room: libraryRoom, query: "", from: "", to: "", favorites: false });
        render("library", true);
        tell(result.added ? "Session kept in the library." : result.updated ? "Library session updated; its name and notes were preserved." : "An equal or fuller session is already in the library.");
      }, "tools-keep").className = "tools-history-keep";
      if (replay) currentButton(actions, "Save file", (archive) => downloadDataFile(archive, archiveName(archive)), "tools-save-session");
      else {
        const label = node(actions, "label", void 0, "tools-auto-keep"), check = node(label, "input");
        check.type = "checkbox";
        check.id = "tools-auto-keep";
        node(label, "span", "Auto");
        const lock = node(label, "span", "🔒");
        lock.dataset.autoLock = "";
        lock.setAttribute("aria-hidden", "true");
        check.onchange = action(() => {
          const room2 = star.dataset.favoriteRoom;
          try {
            refreshCards();
            if (!readModelFavorite(room2).autoKeep) favoriteAction(room2, true);
          } finally {
            refreshCards();
          }
        });
      }
      const shortcuts = node(replay ? actions : card, replay ? "span" : "div", void 0, replay ? "tools-history-shortcut" : "tools-actions tools-history-shortcut");
      shortcuts.id = "tools-room-shortcuts" + suffix;
      if (!replay) button(shortcuts, "Compare with previous", compareLiveWithPrevious, "tools-compare-previous").className = "tools-primary";
      const history = button(shortcuts, "History · 0", () => openHistory(star.dataset.favoriteRoom.toLowerCase()), "tools-room-history" + suffix);
      history.dataset.cardHistory = "";
      if (replay) {
        const exports = node(card, "div", void 0, "tools-actions tools-exports");
        node(exports, "span", "Download", "tools-muted");
        currentButton(exports, "TXT", (archive) => downloadRecording(archive, "txt"), "tools-export-txt").title = "Download a text report for this session";
        currentButton(exports, "CSV", (archive) => downloadRecording(archive, "csv"), "tools-export-csv").title = "Download every retained sample with its real timestamp";
        const gif = currentButton(exports, "GIF", (archive) => generateGifFromHistory(archive), "btn-export-gif");
        gif.dataset.gif = "true";
        currentButton(exports, "Add to ATH", addArchiveHighs, "tools-add-all-time").title = "Add this session’s highs to all-time highs";
      }
      const automatic = node(card, "div", "", "tools-muted");
      automatic.dataset.cardAuto = "";
      automatic.setAttribute("role", "status");
      const retry = button(card, "Retry keeping", () => {
        keepFavoriteSession(star.dataset.favoriteRoom, true);
        render("library");
      }, "tools-retry-automatic" + suffix);
      retry.dataset.cardRetry = "";
      if (!replay) {
        const status = node(card, "div", "", "tools-muted");
        status.id = "session-save-info";
        status.setAttribute("role", "status");
      }
    }
    function compareLiveWithPrevious() {
      var _a;
      const snapshot = captureLiveSessionFile();
      const state = readLibrary(), ids = previousModelSessionIds(state.entries, snapshot);
      if (!ids.length) {
        refreshCards();
        tell("No earlier saved sessions for " + snapshot.room + ". Keep a session in Library to compare with a later one.");
        return;
      }
      liveComparisonArchive = snapshot;
      followers.compare.reset();
      selectedA = "live";
      selectedB = ids[0];
      selectedExtra = ids.slice(1);
      Object.assign(analysisFilters, { room: snapshot.room.toLowerCase(), query: "", from: "", to: "" });
      pickerOpen.compare = false;
      render("compare");
      (_a = dialog.querySelector("#tools-analysis-chart") || dialog.querySelector("#tools-session-picker > summary")) == null ? void 0 : _a.focus();
    }
    function openHistory(room2) {
      readLibrary();
      libraryRoom = room2;
      render("history");
      dialog.querySelector("#tools-history-back").focus();
    }
    function renderLibrary() {
      const state = readLibrary();
      currentCard();
      currentCard(true);
      observedSignature = "";
      refreshCurrent();
      updateSessionToolsStatus();
      let limits = null, capacityError = "";
      try {
        limits = readLibraryLimits();
      } catch (error) {
        capacityError = error.message;
      }
      const checkpoint2 = automaticLibraryStatus(getModelName());
      capacityCheckpoint = [checkpoint2.identity, checkpoint2.signature, checkpoint2.savedAt, checkpoint2.error].join(":");
      refreshCapacity = renderLibraryCapacity(content, state, limits, capacityError, (value) => {
        saveLibraryLimits(value);
        render("library");
        tell("Storage limits saved for this browser. Existing sessions were kept.");
        dialog.querySelector("#tools-storage-settings > summary").focus();
      });
      let automaticMinutes = null, automaticError = "";
      try {
        automaticMinutes = readAutomaticKeepingMinutes();
      } catch (error) {
        automaticError = error.message;
      }
      renderAutomaticKeepingSettings(dialog.querySelector("#tools-storage-settings"), automaticMinutes, automaticError, (value) => {
        saveAutomaticKeepingMinutes(value);
        keepFavoriteSession(getModelName(), true);
        render("library");
        tell("Automatic keeping minimum saved for this browser. Existing sessions were kept.");
        dialog.querySelector("#tools-storage-settings > summary").focus();
      });
      if (state.favoriteError) node(content, "p", state.favoriteError, "tools-muted");
      libraryFilters.room = libraryRoom || "";
      if (libraryRoom && libraryRoom !== "*" && !state.entries.some((entry) => entry.archive.room.toLowerCase() === libraryRoom)) libraryFilters.room = libraryRoom = "";
      const callbacks = __spreadProps(__spreadValues({
        cardSummary: (entries) => modelCardReader.read(entries),
        modelComparisonIds: (room2) => latestModelSessionIds(state.entries, room2),
        compareModel: (room2) => {
          var _a;
          const ids = latestModelSessionIds(state.entries, room2);
          if (ids.length < 2) return;
          [selectedA, selectedB] = ids;
          selectedExtra = ids.slice(2);
          Object.assign(analysisFilters, { room: room2, query: "", from: "", to: "" });
          pickerOpen.compare = false;
          render("compare");
          (_a = dialog.querySelector("#tools-analysis-chart")) == null ? void 0 : _a.focus();
        },
        duration: formatElapsedTime,
        room: (room2) => {
          libraryRoom = room2;
        },
        history: openHistory,
        compare: (ids) => {
          selectedA = ids[0];
          selectedB = ids[1];
          selectedExtra = ids.slice(2);
          Object.assign(analysisFilters, { room: "", query: "", from: "", to: "" });
          render("compare");
        },
        export: (ids) => {
          downloadDataFile(exportLibrarySelection(ids, runtime.TIERSCOPE_VERSION), "TierScope-library-selection-" + (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) + ".json");
          tell("Selected sessions exported, including titles, notes and favorite models.");
        },
        favoriteModel: (room2) => {
          if (state.favoriteError) throw new Error("Model favorites are not fully available. Refresh before changing them.");
          favoriteAction(room2);
        },
        enableAutomatic: (room2) => favoriteAction(room2, true),
        replay: (entry) => {
          openSessionReplay(entry.archive);
          observedSignature = "";
          refreshCurrent();
          tell("Replaying " + (entry.title || entry.archive.room) + ".");
        },
        summary: (entry) => {
          selectedA = entry.id;
          render("summary");
        },
        save: (entry) => downloadDataFile(entry.archive, archiveName(entry.archive)),
        txt: (entry) => downloadRecording(entry.archive, "txt"),
        csv: (entry) => downloadRecording(entry.archive, "csv"),
        gif: (entry) => generateGifFromHistory(entry.archive),
        highs: (entry) => addArchiveHighs(entry.archive)
      }, noteActions), {
        rename: (entry) => {
          const title = window.prompt("Session title (up to 80 characters):", entry.title);
          if (title !== null) {
            renameLibrarySession(entry.id, title);
            render("library");
          }
        },
        delete: (entry) => {
          if (confirm("Delete this library session: " + (entry.title || entry.archive.room) + "?\n\nLive tracking, ATH and downloaded files are unchanged.")) {
            removeLibrarySession(entry.id);
            render("library");
            tell("Library session deleted.");
          }
        }
      });
      renderLibraryBrowser(content, state.entries, libraryFilters, librarySelection, Object.fromEntries(Object.entries(callbacks).map(([key, fn]) => [key, action(fn)])), libraryDisclosures, MAX_COMPARE_RECORDINGS);
      if (state.damaged.length) {
        node(content, "p", state.damaged.length + " unreadable library record(s) were retained.", "tools-muted");
        if (state.unavailable.length) node(content, "p", "Some records could not be read. The displayed storage size excludes them; saving new sessions waits until they can be read.", "tools-muted");
        button(content, "Download unreadable records", downloadUnreadableRecords, "tools-recovery-download");
        button(content, "Remove unreadable library records…", () => {
          if (!confirm("Delete the " + state.damaged.length + " unreadable library record(s)? This cannot be undone.")) return;
          for (const key of state.damaged) removeLibrarySession(key.slice(LIBRARY_PREFIX.length));
          render("library");
        });
      }
      const actions = node(content, "div", void 0, "tools-actions tools-library-management");
      actions.id = "tools-library-management";
      button(actions, "Open saved file…", () => chooseFile(runtime.SESSION_FILE_MAX_BYTES, (value) => {
        openSessionReplay(validateSessionFile(value));
        observedSignature = "";
        refreshCurrent();
        tell("File opened in replay. Use Keep in library to store it here.");
      }), "tools-open-session");
      button(actions, "Import to library…", () => chooseFile(BACKUP_MAX_BYTES, (values) => {
        const bundle = libraryImportBundle(values, runtime.TIERSCOPE_VERSION), result = importLibraryBundle(bundle);
        const rooms = new Set(bundle.library.map((entry) => entry.archive.room.toLowerCase()));
        libraryRoom = rooms.size === 1 ? [...rooms][0] : "*";
        Object.assign(libraryFilters, { room: libraryRoom, query: "", from: "", to: "", favorites: false });
        render("library", true);
        tell("Imported: " + result.recordings + " new, " + result.updatedRecordings + " updated, " + result.favoriteModels + " favorite models added; existing sessions and model choices were preserved.");
      }, true), "tools-import-session").title = "Import session files or Library bundles. Imported favorites need confirmation before automatic keeping.";
      button(actions, "Refresh", () => render("library"), "tools-refresh-library").title = "Refresh list from this browser";
    }
    function metricStrip(parent, changed, id = "tools-metric") {
      const rowKeys = { room: "roomTotal", withTokens: "withtokens", anonymous: "anon" };
      const choices = Object.entries(ANALYSIS_METRICS).map(([key, label]) => {
        const row = runtime.PANEL_ROWS.find((row2) => row2.key === (rowKeys[key] || key));
        return {
          key,
          label,
          icon: row.icon || (key === "female-trans" ? "♀⚧" : ""),
          color: key === "total" ? "var(--panel-secondary)" : row.color
        };
      });
      return renderMetricStrip(parent, choices, metric, action((value) => {
        rememberAnalysis({ metric: value });
        changed();
      }), id);
    }
    function comparisonAxis(parent) {
      const controls = node(parent, "div", void 0, "tools-actions");
      const label = node(controls, "label", "X axis "), select = node(label, "select");
      select.id = "tools-compare-axis";
      for (const [value, text] of [["elapsed", "Elapsed time"], ["clock", "24h time of day"]]) {
        const option = node(select, "option", text);
        option.value = value;
      }
      select.value = compareAxis;
      const hint = node(parent, "p", "", "tools-muted");
      hint.id = "tools-compare-axis-hint";
      select.setAttribute("aria-describedby", hint.id);
      select.onchange = () => {
        compareAxis = select.value;
        updateFollowing();
        refreshAnalysis();
      };
    }
    function syncComparisonAxis() {
      if (tab !== "compare") return;
      const clock2 = compareAxis === "clock", check = dialog.querySelector("#tools-shared-length");
      check.disabled = clock2;
      check.checked = sharedLength;
      check.title = clock2 ? "Match shared length applies to elapsed-time comparison." : "";
      dialog.querySelector("#tools-compare-axis-hint").textContent = clock2 ? "24h uses your local time (" + Intl.DateTimeFormat().resolvedOptions().timeZone + "). Statistics use full sessions; Match shared length applies in elapsed mode." : "";
    }
    function clearAnalysisChart() {
      if (!analysisView) return;
      const hadFocus = analysisView.element.contains(document.activeElement);
      analysisStates.set(tab, __spreadProps(__spreadValues({}, analysisSources), { state: analysisView.capture() }));
      const range = dialog.querySelector("#tools-comparison-range");
      if (range) content.insertBefore(range, analysisOutput);
      if (chartObserver) {
        chartObserver.disconnect();
        chartObserver = null;
      }
      if (chartDispose) chartDispose();
      analysisView.element.remove();
      analysisView = null;
      analysisSources = null;
      chartDraw = null;
      chartDispose = null;
      if (hadFocus) dialog.querySelector("#tools-compare-axis").focus({ preventScroll: true });
    }
    function comparisonRange() {
      const controls = node(content, "div", void 0, "tools-comparison-range");
      controls.id = "tools-comparison-range";
      const label = node(controls, "label"), check = node(label, "input");
      check.type = "checkbox";
      check.checked = sharedLength;
      check.id = "tools-shared-length";
      node(label, "span", "Match shared length");
      check.onchange = () => {
        rememberAnalysis({ sharedLength: check.checked });
        updateFollowing();
        refreshAnalysis();
      };
      return controls;
    }
    function thresholdSelection(parent, comparing) {
      const controls = node(parent, "div", void 0, "tools-actions");
      controls.id = "tools-threshold-controls";
      const thresholdLabel = node(controls, "label", comparing ? "Threshold " : "Thresholds "), input = node(thresholdLabel, "input");
      input.id = "tools-threshold";
      input.style.width = comparing ? "105px" : "200px";
      if (comparing) {
        input.type = "number";
        input.min = "0";
        input.max = "9007199254740991";
        input.step = "1";
        input.value = threshold;
      } else {
        input.type = "text";
        input.maxLength = 160;
        input.value = summaryThresholds.join(", ");
        input.placeholder = "Not enough covered time";
        input.title = "Defaults: session average −25%, average, +25%, rounded to whole viewers. Or enter up to 8 counts separated by commas for this session and metric.";
      }
      input.oninput = () => {
        thresholdDirty = true;
        input.setCustomValidity("");
      };
      function applyThreshold() {
        try {
          if (comparing) {
            if (!Number.isSafeInteger(input.valueAsNumber) || input.valueAsNumber < 0) throw new Error("Enter a non-negative whole number.");
            rememberAnalysis({ threshold: input.valueAsNumber });
          } else {
            summaryThresholds = parseAnalysisThresholds(input.value);
            summaryAutomatic = false;
          }
        } catch (error) {
          input.setCustomValidity(error.message);
          input.reportValidity();
          return;
        }
        input.setCustomValidity("");
        thresholdDirty = false;
        refreshAnalysis(false);
      }
      input.onkeydown = (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          applyThreshold();
        }
      };
      button(controls, comparing ? "Apply threshold" : "Apply thresholds", applyThreshold, "tools-apply-threshold");
      if (!comparing) button(controls, "Use average", () => {
        summaryThresholdSource = null;
        summaryAutomatic = true;
        thresholdDirty = false;
        refreshAnalysis(false);
      }, "tools-average-thresholds").title = "Recalculate from this session: average −25%, average, +25%";
      return controls;
    }
    function analysisControls(comparing) {
      if (!library) readLibrary();
      if (!sourceOptions().length) {
        node(content, "p", "Record a session or import one into the library to see analysis.");
        return null;
      }
      const pickerTab = comparing ? "compare" : "summary";
      const picker = node(content, "details");
      picker.id = "tools-recording-picker";
      picker.open = pickerOpen[pickerTab];
      node(picker, "summary", "Choose sessions & filters");
      picker.ontoggle = () => {
        if (picker.isConnected) pickerOpen[pickerTab] = picker.open;
      };
      recordingFilters(picker, sourceOptions(), analysisFilters, "tools-analysis", () => render(tab));
      try {
        filteredSources = filterLibraryEntries(sourceOptions(), analysisFilters);
      } catch (error) {
        filteredSources = [];
        tell(error.message, true);
      }
      node(picker, "p", filteredSources.length + " matching sessions. Existing selections stay available when outside the filters.", "tools-muted");
      const sourceControls = node(picker, "div", void 0, "tools-actions");
      if (liveComparisonArchive) button(sourceControls, "Refresh live snapshot", () => {
        liveComparisonArchive = captureLiveSessionFile();
        selectNewFollowSource();
        render(tab);
      }, "tools-refresh-live-snapshot");
      if (currentArchive) button(sourceControls, "Refresh current / replayed snapshot", () => {
        currentArchive = captureSessionFile();
        currentArchiveIsReplay = isPlaybackCurrent(runtime.playback);
        selectNewFollowSource();
        render(tab);
      }, "tools-refresh-snapshot");
      selectedA = selectSource(sourceControls, comparing ? "A " : "Session ", "tools-source-a", selectedA, (value) => {
        selectedA = value;
        selectNewFollowSource();
        render(tab);
      });
      if (comparing) {
        if (!selectedB) selectedB = (sourceOptions().find((item) => item.id !== selectedA) || sourceOptions()[0]).id;
        selectedB = selectSource(sourceControls, "B ", "tools-source-b", selectedB, (value) => {
          selectedB = value;
          selectNewFollowSource();
          render(tab);
        });
        selectedExtra.forEach((id, index) => {
          selectedExtra[index] = selectSource(sourceControls, String.fromCharCode(67 + index) + " ", "tools-source-" + String.fromCharCode(99 + index), id, (value) => {
            selectedExtra[index] = value;
            selectNewFollowSource();
            render(tab);
          });
          button(sourceControls, "Remove " + String.fromCharCode(67 + index), () => {
            selectedExtra.splice(index, 1);
            render(tab);
          });
        });
        const used = /* @__PURE__ */ new Set([selectedA, selectedB, ...selectedExtra]);
        const next = filteredSources.find((item) => !used.has(item.id));
        button(sourceControls, "Add session", () => {
          if (next && selectedExtra.length < MAX_COMPARE_RECORDINGS - 2) {
            selectedExtra.push(next.id);
            render(tab);
          }
        }, "tools-compare-add").disabled = selectedExtra.length >= MAX_COMPARE_RECORDINGS - 2 || !next;
        node(sourceControls, "span", 2 + selectedExtra.length + " / " + MAX_COMPARE_RECORDINGS + " slots", "tools-muted");
      }
      followControl(content);
      if (comparing) comparisonAxis(content);
      metricStrip(content, refreshAnalysis);
      return sourceOptions();
    }
    const number = (value) => value === null ? "Not enough data" : value.toLocaleString(void 0, { maximumFractionDigits: 1 });
    const percent = (value) => value === null ? "Not enough data" : number(value) + "%";
    function renderHistory() {
      if (!library) readLibrary();
      const heading = node(content, "div", void 0, "tools-actions");
      button(heading, "‹ Sessions", () => {
        render("library", true);
        (dialog.querySelector("#tools-model-history") || dialog.querySelector("#tools-sessions-book-toggle")).focus();
      }, "tools-history-back");
      node(heading, "h3", "Model history · " + libraryRoom);
      const controls = node(content, "div", void 0, "tools-actions");
      const rangeLabel = node(controls, "label", "Show "), range = node(rangeLabel, "select");
      range.id = "tools-history-range";
      for (const [value, label] of [["Infinity", "All sessions"], ["30", "Latest 30"], ["10", "Latest 10"]]) {
        const option = node(range, "option", label);
        option.value = value;
      }
      range.value = String(historyLimit);
      range.onchange = () => {
        historyLimit = Number(range.value);
        render("history");
      };
      button(controls, "Refresh", () => {
        readLibrary();
        followers.history.reset();
        render("history");
      }, "tools-history-refresh").title = "Read the latest saved sessions from this browser";
      followControl(content);
      const overview = modelHistoryReader.read(followedEntries(), libraryRoom, metric, historyLimit);
      const view = renderModelHistoryView(content, overview, {
        metricLabel: ANALYSIS_METRICS[metric],
        duration: formatElapsedTime,
        selected: historySelected,
        select: (id) => {
          historySelected = id;
        },
        summary: action((id) => {
          selectedA = id;
          render("summary");
        }),
        replay: action((id) => {
          const entry = followedEntries().find((entry2) => entry2.id === id);
          openSessionReplay(entry.archive);
          observedSignature = "";
          refreshCurrent();
          tell("Replaying " + (entry.title || entry.archive.room) + ".");
        }),
        metricControl: (parent) => metricStrip(parent, () => render("history"), "tools-history-metric"),
        compare: (ids) => {
          var _a;
          [selectedA, selectedB] = ids;
          selectedExtra = ids.slice(2);
          Object.assign(analysisFilters, { room: libraryRoom, query: "", from: "", to: "" });
          pickerOpen.compare = false;
          render("compare");
          (_a = dialog.querySelector("#tools-analysis-chart") || dialog.querySelector("#tools-session-picker > summary")) == null ? void 0 : _a.focus();
        }
      });
      historyView = view;
      if (view) {
        chartDraw = view.draw;
        if (window.ResizeObserver) {
          chartObserver = new window.ResizeObserver(view.draw);
          chartObserver.observe(view.canvas);
        }
      }
      if (library.damaged.length) node(content, "p", library.damaged.length + " unreadable library record(s) are excluded. Return to Sessions for recovery options.", "tools-muted");
    }
    function audienceOverview(archive, parent) {
      const overview = summarizeAudience(archive), coverage = overview.audience[0];
      node(parent, "h3", "Audience overview");
      node(parent, "p", archive.room + " · " + coverage.samples + " samples · Covered time " + formatElapsedTime(coverage.coveredMs) + " · Excluded gaps " + formatElapsedTime(coverage.gapMs) + " · Coverage " + percent(coverage.coverage), "tools-muted");
      const scroll = node(parent, "div", void 0, "tools-scroll"), table = node(scroll, "table");
      table.id = "tools-audience-table";
      node(table, "caption", "Audience across the retained session");
      const head = node(node(table, "thead"), "tr");
      ["Audience", "Time-weighted average", "Peak in session", "Full-session high"].forEach((label) => {
        node(head, "th", label).scope = "col";
      });
      const body = node(table, "tbody");
      for (const summary of overview.audience) {
        const row = node(body, "tr");
        node(row, "th", ANALYSIS_METRICS[summary.metric]).scope = "row";
        node(row, "td", number(summary.mean));
        const peak = node(row, "td", number(summary.peak));
        if (summary.peakTime !== null) peak.title = "First recorded at " + new Date(summary.peakTime).toLocaleString();
        node(row, "td", number(summary.sessionPeak));
      }
      node(parent, "p", "Room audience = registered + anonymous viewers. A full-session high may predate retained history. Hover a session peak for its first recorded time.", "tools-muted");
      const shares = node(parent, "div");
      shares.id = "tools-audience-shares";
      node(shares, "h3", "Audience proportions");
      node(shares, "p", "Token holders / registered viewers: " + percent(overview.tokenShareRegistered));
      node(shares, "p", "Token holders / whole room: " + percent(overview.tokenShareRoom));
      node(shares, "p", "Anonymous / whole room: " + percent(overview.anonymousShareRoom));
      node(shares, "p", "Shares use viewer-time over covered intervals. A crowded interval contributes more than a quiet interval of the same length; gaps contribute nothing.", "tools-muted");
    }
    function thresholdTable(archive, parent) {
      if (!summaryThresholds.length) {
        node(parent, "p", "Not enough covered session time to calculate average-based thresholds.", "tools-muted");
        return;
      }
      const scroll = node(parent, "div", void 0, "tools-scroll"), table = node(scroll, "table");
      table.id = "tools-threshold-table";
      node(table, "caption", ANALYSIS_METRICS[metric] + " — time at or above selected thresholds");
      const head = node(node(table, "thead"), "tr");
      ["Threshold", "Time at or above", "% of covered time"].forEach((label) => {
        node(head, "th", label).scope = "col";
      });
      const body = node(table, "tbody");
      for (const result of summarizeThresholds(archive, metric, summaryThresholds)) {
        const row = node(body, "tr");
        node(row, "th", number(result.threshold)).scope = "row";
        node(row, "td", result.durationMs === null ? "Not enough data" : formatElapsedTime(result.durationMs));
        node(row, "td", percent(result.percent));
      }
      node(parent, "p", "Includes samples equal to the threshold. Percentages use covered session time; gaps and time after the final sample are excluded.", "tools-muted");
    }
    function summaryTable(summaries, labels, comparing, parent) {
      const scroll = node(parent, "div", void 0, "tools-scroll"), table = node(scroll, "table");
      table.id = "tools-summary-table";
      node(table, "caption", ANALYSIS_METRICS[metric] + " — retained session statistics");
      const head = node(table, "thead"), headRow = node(head, "tr");
      node(headRow, "th", "Measure");
      labels.forEach((label) => node(headRow, "th", label));
      const body = node(table, "tbody");
      const rows = [
        ["Samples in range", (s) => number(s.samples)],
        ["Elapsed span", (s) => formatElapsedTime(s.spanMs)],
        ["Covered session time", (s) => formatElapsedTime(s.coveredMs)],
        ["Excluded gaps", (s) => formatElapsedTime(s.gapMs)],
        ["Coverage", (s) => s.coverage === null ? "Not enough data" : number(s.coverage) + "%"],
        ["Time-weighted average", (s) => number(s.mean)],
        ["Peak in range", (s) => number(s.peak)],
        ["Full-session high", (s) => number(s.sessionPeak)],
        ["Token-holder share of registered viewers", (s) => s.tokenShare === null ? "Not enough data" : number(s.tokenShare) + "%"]
      ];
      if (comparing) rows.push(["Time at or above " + threshold.toLocaleString(), (s) => s.coveredMs ? formatElapsedTime(s.atOrAboveMs) : "Not enough data"]);
      for (const [label, value] of rows) {
        const row = node(body, "tr");
        const cell = node(row, "th", label);
        cell.scope = "row";
        summaries.forEach((summary) => node(row, "td", value(summary)));
      }
      node(parent, "p", "The full-session high can predate retained history and is not limited by “Match shared length.” Token-holder share is weighted by recorded registered-viewer time.", "tools-muted");
    }
    function chart(archives, labels, endMs, ids) {
      const axisMode = tab === "compare" ? compareAxis : "elapsed";
      const series = archives.map((archive) => {
        const source = __spreadProps(__spreadValues({}, analysisSeries(archive, metric)), { timestamps: archive.session.history.timestamps });
        return axisMode === "clock" ? __spreadProps(__spreadValues({}, source), { clock: projectClockSeries(source) }) : source;
      });
      if (analysisView) {
        analysisSources = { archives, ids };
        analysisView.update(series, endMs, ANALYSIS_METRICS[metric], axisMode);
        return;
      }
      const saved = analysisStates.get(tab);
      const same = saved && (saved.state.axisMode || "elapsed") === axisMode && saved.ids.length === ids.length && ids.every((id, index) => saved.archives[saved.ids.indexOf(id)] === archives[index]);
      const restored = same ? __spreadProps(__spreadValues({}, saved.state), { hidden: saved.state.hidden.map((index) => ids.indexOf(saved.ids[index])) }) : null;
      const view = renderAnalysisChart(content, series, labels, endMs, ANALYSIS_METRICS[metric], restored, axisMode);
      const range = dialog.querySelector("#tools-comparison-range");
      if (range) view.settings.appendChild(range);
      content.appendChild(analysisOutput);
      analysisView = view;
      analysisSources = { archives, ids };
      chartDraw = view.draw;
      chartDispose = view.dispose;
      if (window.ResizeObserver) {
        chartObserver = new window.ResizeObserver(view.draw);
        chartObserver.observe(view.canvas);
      }
    }
    function renderAnalysis(comparing) {
      const options2 = analysisControls(comparing);
      if (!options2) return;
      if (comparing) comparisonRange();
      analysisOutput = node(content, "div");
      analysisOutput.id = "tools-analysis-output";
      analysisReports = { overview: node(analysisOutput, "div"), controls: thresholdSelection(analysisOutput, comparing), results: node(analysisOutput, "div") };
      refreshAnalysis();
    }
    function refreshAnalysis(redrawChart = true, liveUpdate = false) {
      const comparing = tab === "compare", options2 = sourceOptions();
      if (!analysisOutput) return;
      const { overview, controls, results } = analysisReports;
      syncComparisonAxis();
      overview.replaceChildren();
      results.replaceChildren();
      controls.hidden = false;
      message.textContent = "";
      const a = options2.find((item) => item.id === selectedA), b = options2.find((item) => item.id === selectedB);
      if (!a || comparing && (!b || selectedExtra.some((id) => !options2.some((item) => item.id === id)))) {
        controls.hidden = true;
        node(overview, "p", "Choose available sessions in each slot. A previous selection may have changed or been removed; clear filters to find another session.");
        return;
      }
      if (comparing) {
        if ((/* @__PURE__ */ new Set([selectedA, selectedB, ...selectedExtra])).size !== 2 + selectedExtra.length) {
          controls.hidden = true;
          node(overview, "p", "Choose a different session in each comparison slot.");
          return;
        }
        const ids = [.../* @__PURE__ */ new Set([selectedA, selectedB, ...selectedExtra])], recordings = ids.map((id) => options2.find((item) => item.id === id)).filter((item) => !!item);
        const archives = recordings.map((item) => item.archive), clock2 = compareAxis === "clock";
        const result = compareRecordingSet(archives, metric, threshold, !clock2 && sharedLength);
        const tooLong = clock2 ? archives.flatMap((archive, index) => clockSessionDuration(archive) > CLOCK_DAY_MS ? [String.fromCharCode(65 + index)] : []) : [];
        if (tooLong.length) {
          clearAnalysisChart();
          node(overview, "p", "24h chart unavailable: session" + (tooLong.length > 1 ? "s " : " ") + tooLong.join(", ") + " exceed" + (tooLong.length === 1 ? "s" : "") + " 24 hours. Choose Elapsed time or select shorter sessions.", "tools-muted");
        } else if (redrawChart) chart(archives, recordings.map((item) => item.title), clock2 ? CLOCK_DAY_MS : result.axisMs, ids);
        summaryTable(result.summaries, recordings.map((item, index) => String.fromCharCode(65 + index)), true, results);
      } else {
        const summary = summarizeSession(a.archive, metric, threshold);
        const continuing = liveUpdate && (summaryThresholdSource == null ? void 0 : summaryThresholdSource.id) === a.id && summaryThresholdSource.metric === metric;
        if (!summaryThresholdSource || summaryThresholdSource.archive !== a.archive || summaryThresholdSource.id !== a.id || summaryThresholdSource.metric !== metric) {
          if (!continuing) {
            summaryAutomatic = true;
            thresholdDirty = false;
          }
          summaryThresholdSource = { archive: a.archive, id: a.id, metric };
          if (summaryAutomatic) summaryThresholds = averageAnalysisThresholds(summary.mean);
          const input = dialog.querySelector("#tools-threshold");
          if (!thresholdDirty) {
            input.value = summaryThresholds.join(", ");
            input.setCustomValidity("");
          }
        }
        dialog.querySelector("#tools-average-thresholds").disabled = summary.mean === null;
        if (redrawChart) chart([a.archive], [a.title], summary.spanMs, [a.id]);
        audienceOverview(a.archive, overview);
        thresholdTable(a.archive, results);
        node(results, "h3", ANALYSIS_METRICS[metric] + " — details");
        summaryTable([summary], [a.archive.room], false, results);
      }
      if (analysisPreferenceError) tell(analysisPreferenceError, true);
    }
    function checkbox(parent, id, text, checked = true) {
      const label = node(parent, "label"), input = node(label, "input");
      input.type = "checkbox";
      input.id = id;
      input.checked = checked;
      node(label, "span", text);
      return input;
    }
    function renderBackup() {
      node(content, "h3", "Back up this browser");
      node(content, "p", "Download ATH for every room and your saved preferences: theme, panel size/position, collapsed rows, compact metric, chart window, SH/ATH mode and analysis choices. Keep this file somewhere safe. Session-only controls such as the scan interval are not saved preferences.", "tools-muted");
      const include = checkbox(content, "tools-backup-library", "Include library sessions and favorite models");
      const state = readLibrary();
      let partial = null;
      if (state.damaged.length) {
        node(content, "p", state.damaged.length + " unreadable library record(s) are retained. You can back up healthy sessions and download the unreadable values separately for recovery.", "tools-muted");
        partial = checkbox(content, "tools-backup-partial", "Back up healthy sessions; omit unreadable entries", false);
        button(content, "Download unreadable records", downloadUnreadableRecords, "tools-backup-recovery");
      }
      const actions = node(content, "div", void 0, "tools-actions");
      button(actions, "Download backup", () => {
        const backup = createTierScopeBackup(include.checked, !!(partial && partial.checked));
        const omitted = backup.recovery ? backup.recovery.omittedLibraryKeys.length : 0;
        downloadDataFile(backup, "TierScope-" + (omitted ? "partial-backup-" : "backup-") + (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) + ".json");
        tell(omitted ? "Partial backup download requested: " + backup.library.length + " healthy sessions included; " + omitted + " unreadable entries omitted and left untouched. Download unreadable records separately for recovery." : "Backup download requested. Check your browser downloads.", !!omitted);
      }, "tools-backup-download");
      node(content, "h3", "Restore a backup");
      node(content, "p", "ATH is merged without lowering existing records. New library sessions are added; fuller versions of the same session update its entry and keep its name. Saved preferences take effect after refreshing your room tabs. Storage limits stay local to this browser; raise them in Sessions → Storage limits if the sessions need more room. Backups up to 300 MB / 10,000 sessions can be opened.", "tools-muted");
      button(content, "Choose backup…", () => {
        pendingBackup = null;
        render("backup");
        chooseFile(BACKUP_MAX_BYTES, (value) => {
          pendingBackup = validateTierScopeBackup(value);
          render("backup");
          tell("Backup validated. Review the contents and choose what to restore.");
        });
      }, "tools-backup-open");
      if (pendingBackup) {
        if (pendingBackup.recovery) node(content, "p", "This is a partial backup. " + pendingBackup.recovery.omittedLibraryKeys.length + " unreadable library entries were excluded when it was created; they cannot be restored from this file.", "tools-muted");
        node(content, "p", pendingBackup.rooms.length + " rooms · " + (Object.keys(pendingBackup.preferences).length + (pendingBackup.analysisPreferences ? 1 : 0)) + " saved preferences · " + pendingBackup.library.length + " sessions", "tools-muted");
        node(content, "p", pendingBackup.favoriteModels.length + " favorite models. Restoring Library adds these where no local model choice exists.", "tools-muted");
        const choices = node(content, "div", void 0, "tools-actions");
        const highs = checkbox(choices, "tools-restore-highs", "Merge ATH"), preferences = checkbox(choices, "tools-restore-preferences", "Restore preferences"), recordings = checkbox(choices, "tools-restore-library", "Add sessions and favorite models");
        button(content, "Restore selected data", () => {
          if (!highs.checked && !preferences.checked && !recordings.checked) throw new Error("Choose at least one kind of data to restore.");
          if (!confirm("Restore the selected backup data?\n\nATH will be merged, library sessions added or updated with fuller versions, and selected saved preferences replaced. Your live session is not replaced." + (pendingBackup.recovery ? "\n\nThis partial backup excludes " + pendingBackup.recovery.omittedLibraryKeys.length + " unreadable library entries." : ""))) return;
          const result = restoreTierScopeBackup(pendingBackup, { highs: highs.checked, preferences: preferences.checked, library: recordings.checked });
          library = null;
          if (runtime.playback) setPlaybackAllTimeState(runtime.playback, readAllTimeHighs(displayedHighRoom()));
          repaintHighMode();
          tell("Restored: " + result.rooms + " room ATH updates, " + result.recordings + " new sessions, " + result.updatedRecordings + " updated sessions, " + result.favoriteModels + " favorite models, " + result.preferences + " preferences." + (result.preferences ? "\nRefresh your room tabs when convenient to apply preferences." : ""));
        }, "tools-backup-restore");
      }
    }
    function render(next, revealSessions = false) {
      var _a;
      refreshCapacity = null;
      historyView = null;
      followControls = null;
      const focusedId = dialog.contains(document.activeElement) ? document.activeElement.id : "";
      for (const [key, id] of [["book", "tools-sessions-book"], ["search", "tools-library-search-menu"]]) {
        const details = dialog.querySelector("#" + id);
        if (details) libraryDisclosures[key] = details.open;
      }
      if (revealSessions) libraryDisclosures.book = true;
      const existingPicker = dialog.querySelector("#tools-recording-picker");
      if (existingPicker) pickerOpen[tab] = existingPicker.open;
      if (analysisView) analysisStates.set(tab, __spreadProps(__spreadValues({}, analysisSources), { state: analysisView.capture() }));
      analysisView = null;
      analysisSources = null;
      analysisOutput = null;
      analysisReports = null;
      if (next !== tab) library = null;
      tab = next;
      fileRequest++;
      chartDraw = null;
      if (chartDispose) {
        chartDispose();
        chartDispose = null;
      }
      if (chartObserver) {
        chartObserver.disconnect();
        chartObserver = null;
      }
      content.replaceChildren();
      message.textContent = "";
      dialog.querySelectorAll("[data-tools-tab]").forEach((button2) => button2.setAttribute("aria-pressed", String(button2.dataset.toolsTab === (tab === "history" || tab === "drafts" ? "library" : tab))));
      try {
        if (tab === "library") renderLibrary();
        else if (tab === "drafts") renderDrafts();
        else if (tab === "history") renderHistory();
        else if (tab === "backup") renderBackup();
        else renderAnalysis(tab === "compare");
        if ((tab === "summary" || tab === "compare" || tab === "history") && analysisPreferenceError) tell(analysisPreferenceError, true);
      } catch (error) {
        tell(error.message, true);
      }
      if (focusedId) {
        const target = document.getElementById(focusedId);
        if (target && dialog.contains(target)) {
          let ancestor = target.tagName === "SUMMARY" ? target.parentElement.parentElement : target;
          for (let details = ancestor.closest("details"); details; details = details.parentElement.closest("details")) details.open = true;
          target.focus();
        } else if (focusedId.startsWith("tools-model-favorite-")) (_a = dialog.querySelector("#tools-sessions-book-toggle")) == null ? void 0 : _a.focus();
      }
    }
    function close() {
      fileRequest++;
      refreshSessionTools = null;
      refreshCapacity = null;
      chartDraw = null;
      historyView = null;
      followControls = null;
      liveCapture = null;
      if (chartDispose) {
        chartDispose();
        chartDispose = null;
      }
      analysisStates.clear();
      analysisView = null;
      analysisSources = null;
      analysisOutput = null;
      analysisReports = null;
      libraryReader.clear();
      modelHistoryReader.clear();
      options = [];
      optionsLibrary = null;
      optionsArchive = null;
      optionsLiveArchive = null;
      library = null;
      currentArchive = null;
      liveComparisonArchive = null;
      cancelGifExport();
      if (detachDock) detachDock();
      document.removeEventListener("keydown", escape);
      for (const id of ["btn-control-library", "btn-playback-library"]) {
        const button2 = document.getElementById(id);
        if (button2) button2.setAttribute("aria-expanded", "false");
      }
      if (chartObserver) chartObserver.disconnect();
      if (dialog.open) dialog.close();
      dialog.remove();
      if (closeSessionTools === close) closeSessionTools = null;
      let focus = focusBefore;
      if (!focus || !focus.isConnected || !focus.getClientRects().length || window.getComputedStyle(focus).visibility === "hidden") {
        focus = document.getElementById(isPlaybackCurrent(runtime.playback) ? "btn-playback-library" : "btn-control-library");
      }
      if (focus) focus.focus();
    }
    function escape(event) {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        close();
      }
    }
    closeSessionTools = close;
    refreshSessionTools = (reload) => {
      if (reload && tab === "library") render("library");
      else refreshCurrent();
    };
    document.addEventListener("keydown", escape);
    dialog.querySelector("#btn-cancel-gif").onclick = cancelGifExport;
    for (const id of ["btn-control-library", "btn-playback-library"]) {
      const button2 = document.getElementById(id);
      if (button2) button2.setAttribute("aria-expanded", "true");
    }
    dialog.querySelector("#tools-close").onclick = close;
    dialog.querySelector("#tools-review-notes").onclick = () => render("drafts");
    updateDraftNotice();
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      close();
    });
    dialog.addEventListener("close", () => {
      if (dialog.isConnected) close();
    });
    dialog.querySelectorAll("[data-tools-tab]").forEach((button2) => {
      button2.onclick = () => render(button2.dataset.toolsTab);
    });
    dialog.show();
    detachDock = attachLibraryDock(document.getElementById("tracker-container"), dialog, () => {
      if (chartDraw) chartDraw();
    });
    render("library");
    dialog.querySelector("#tools-close").focus();
  }

  // src/files.js
  function setChartWindow(value) {
    if (!hasStorageField(runtime.CHART_WINDOWS, value)) return;
    selectChartWindow(value);
    try {
      GM_setValue(runtime.CHART_WINDOW_KEY, value);
    } catch (error) {
      log("Could not save chart window preference");
    }
    runtime.chartLayoutRevision++;
    updatePanelOptions();
    redrawPanelCharts();
  }
  function downloadSessionFile() {
    try {
      var archive = captureSessionFile();
      var blob = new Blob([JSON.stringify(archive)], { type: "application/json;charset=utf-8" });
      var url = URL.createObjectURL(blob), link = document.createElement("a");
      link.href = url;
      link.download = archive.room + "-session-" + new Date(archive.session.timestamp).toISOString().replace(/[:.]/g, "-") + ".tierscope.json";
      document.body.appendChild(link);
      try {
        link.click();
      } finally {
        link.remove();
        setTimeout(function() {
          URL.revokeObjectURL(url);
        }, 6e4);
      }
    } catch (error) {
      alert("Could not save session file: " + error.message);
    }
  }
  function updatePanelOptions() {
    updateSessionToolsStatus();
    updateHighControls();
    var button = document.getElementById("btn-panel-options");
    if (button) {
      button.style.display = runtime.isMinimized ? "none" : "";
      button.textContent = { full: "Full", fourHours: "4h", twoHours: "2h", hour: "1h", halfHour: "30m", quarter: "15m" }[runtime.chartWindowMode] + " ▾";
      button.title = "Chart window and highs. Showing " + { full: "full history", fourHours: "the last 4 hours", twoHours: "the last 2 hours", hour: "the last hour", halfHour: "the last 30 minutes", quarter: "the last 15 minutes" }[runtime.chartWindowMode] + ".";
    }
    var select = document.getElementById("chart-window-select");
    if (select) select.value = runtime.chartWindowMode;
    var info = document.getElementById("session-file-info");
    if (info) {
      var archive = isPlaybackCurrent(runtime.playback) && runtime.playback.imported ? runtime.playback.archive : null;
      info.style.display = archive ? "block" : "none";
      if (archive) info.textContent = archive.room + " · " + archive.session.history.timestamps.length + " samples\nSaved " + new Date(archive.session.timestamp).toLocaleString() + "\nSession room high: " + archive.session.roomTotalHigh.toLocaleString();
    }
  }
  function bindPanelOptions() {
    var button = document.getElementById("btn-panel-options"), menu = document.getElementById("panel-options");
    var cleanupSessionTools = bindSessionTools();
    var input = document.getElementById("session-file-input");
    function close(focus) {
      menu.style.display = "none";
      button.setAttribute("aria-expanded", "false");
      if (focus) button.focus();
    }
    button.onmousedown = function(event) {
      event.stopPropagation();
    };
    button.onclick = function(event) {
      event.stopPropagation();
      updatePanelOptions();
      var open = menu.style.display === "none";
      menu.style.display = open ? "block" : "none";
      button.setAttribute("aria-expanded", String(open));
      if (open) document.getElementById("chart-window-select").focus();
    };
    document.getElementById("panel-options-close").onclick = function() {
      close(true);
    };
    document.getElementById("chart-window-select").onchange = function() {
      setChartWindow(this.value);
    };
    document.getElementById("btn-high-mode").onclick = toggleHighMode;
    document.getElementById("mini-high").onclick = toggleHighMode;
    document.getElementById("btn-add-all-time").onclick = addFileToAllTimeHighs;
    document.getElementById("btn-clear-all-time").onclick = clearAllTimeHighs;
    document.getElementById("btn-clear-inactive-ath").onclick = clearInactiveAllTimeHighs;
    input.onchange = function() {
      var file = input.files && input.files[0];
      if (file) {
        close(false);
        readSessionFile(file);
      }
    };
    function outside(event) {
      if (!menu.contains(event.target) && !button.contains(event.target)) close(false);
    }
    function escape(event) {
      if (event.key === "Escape" && menu.style.display !== "none") {
        close(true);
        event.stopPropagation();
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape, true);
    runtime.panelOptionsCleanup = function() {
      cleanupSessionTools();
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape, true);
    };
    updatePanelOptions();
  }

  // src/acquisition-context.js
  function isAcquisitionCurrent(context) {
    return acquisitionContextIsCurrent(context, location.href);
  }

  // src/session-persistence.js
  function restoreSessionState(data) {
    var snapshot = createPlaybackSnapshot(data.history);
    restoreLiveSession(data, getPlaybackFrame(snapshot, snapshot.durationMs));
    restoreScheduledInterval(getEffectiveScanIntervalSeconds());
    restoreTrendPreferences(data.trendComparisonMode, data.autoTrendEscalation);
  }
  function saveSession(model, flushLibrary = false) {
    if (!model || model === "unknown") return;
    try {
      var result = getSessionWriteStatus(model);
      if (result.status === "ready") {
        prepareSessionHighsForSave();
        var saveData = {
          schemaVersion: runtime.STORAGE_SCHEMA_VERSION,
          producerVersion: runtime.TIERSCOPE_VERSION,
          timestamp: Date.now(),
          history: runtime.history,
          tierHighTimes: runtime.tierHighTimes,
          withTokensHighTime: runtime.withTokensHighTime,
          totalHighTime: runtime.totalHighTime,
          anonHighTime: runtime.anonHighTime,
          femaleTransHighTime: runtime.femaleTransHighTime,
          roomTotalHigh: runtime.roomTotalHigh,
          roomTotalHighTime: runtime.roomTotalHighTime,
          trackingStartTime: runtime.trackingStartTime,
          sessionStartedAt: runtime.sessionStartedAt,
          sessionStartEstimated: runtime.sessionStartEstimated,
          sessionHighs: runtime.sessionHighs,
          roomEpoch: runtime.activeRoomEpoch,
          isPaused: runtime.isPaused,
          isStopped: runtime.isStopped,
          stoppedAt: runtime.stoppedAt,
          stopReason: runtime.stopReason,
          broadcasterAbsence: runtime.broadcasterAbsence,
          absencePausedAt: runtime.absencePausedAt,
          absenceOverrideActive: runtime.absenceOverrideActive,
          pausedElapsedTime: runtime.pausedElapsedTime,
          previousCounts: runtime.previousCounts,
          hasTrendBaseline: runtime.hasTrendBaseline,
          trendComparisonMode: runtime.trendComparisonMode,
          autoTrendEscalation: runtime.autoTrendEscalation
        };
        result = writeSessionRecord(model, saveData);
      }
      if (result.status === "reset") {
        runtime.sessionStorageNotice = result.message;
        updateAcquisitionStatus();
      } else if (result.status === "saved") {
        noteSessionSave(model);
      } else if (result.status === "failed") {
        noteSessionSave(model, result.error);
        log("Failed to save session: " + result.error);
      }
      return result;
    } catch (e) {
      noteSessionSave(model, e.message || String(e));
      log("Failed to save session: " + e);
      return { status: "failed", error: e.message || String(e) };
    } finally {
      keepFavoriteSession(model, flushLibrary);
      try {
        updateAcquisitionStatus();
        refreshPanelOptions();
      } catch (error) {
        log("Save feedback unavailable: " + error.message);
      }
    }
  }
  function loadSession(model) {
    clearRestoredSessionFrame();
    if (!model || model === "unknown") return false;
    leavePlayback(false);
    var key = getStorageKey(model);
    runtime.activeSessionStorageKey = key;
    runtime.activeRoomEpoch = getRoomEpoch(key);
    runtime.sessionStorageNotice = "";
    var allTime = readAllTimeHighs(model);
    var saved = inspectStoredSession(model, true);
    if (saved.protected || !saved.data) return false;
    var age = Date.now() - saved.data.timestamp;
    restoreSessionState(saved.data);
    if (!allTime.error && allTime.epoch === "initial" && !allTime.keys.length && saved.data.history.timestamps.length) {
      storeAllTimeHighs(model, sessionAllTimeHighs(saved.data, "saved"));
    }
    log("Session restored for " + model + " (" + Math.round(age / 6e4) + " min old; " + (saved.legacy ? "validated legacy schema 1" : "storage schema " + runtime.STORAGE_SCHEMA_VERSION) + "; producer " + (saved.producerVersion === null ? "unknown" : saved.producerVersion) + ")");
    return true;
  }

  // src/trends.js
  function checkTrendAutoEscalation() {
    if (!runtime.autoTrendEscalation || !runtime.trackingStartTime) return;
    var elapsedMs = runtime.isPaused ? runtime.pausedElapsedTime : Date.now() - runtime.trackingStartTime;
    var elapsedMin = elapsedMs / 6e4;
    var targetMode = "last";
    if (elapsedMin >= 60) targetMode = "1hour";
    else if (elapsedMin >= 30) targetMode = "30min";
    else if (elapsedMin >= 15) targetMode = "15min";
    else if (elapsedMin >= 5) targetMode = "5min";
    if (targetMode !== runtime.trendComparisonMode) {
      log("Auto-escalating trend mode: " + runtime.trendComparisonMode + " -> " + targetMode + " (" + Math.floor(elapsedMin) + " min elapsed)");
      if (runtime.users.size === 0) {
        selectTrendMode(targetMode);
        updateTrendPresetButtons();
        updateAutoTrendButton();
        saveSession(getModelName());
        return;
      }
      setTrendComparisonMode(targetMode);
    }
  }
  function toggleAutoTrendEscalation() {
    selectAutomaticTrends(!runtime.autoTrendEscalation);
    updateAutoTrendButton();
    log("Auto trend escalation " + (runtime.autoTrendEscalation ? "enabled" : "disabled"));
    saveSession(getModelName());
    if (runtime.autoTrendEscalation) {
      checkTrendAutoEscalation();
    }
  }
  function updateAutoTrendButton() {
    var btn = document.getElementById("btn-trend-auto");
    if (btn) {
      if (runtime.autoTrendEscalation) {
        btn.style.background = "#32CD32";
        btn.style.color = "#fff";
        btn.style.borderColor = "#32CD32";
        btn.title = "Auto-escalation ON - Click to disable";
      } else {
        btn.style.background = "var(--panel-button)";
        btn.style.color = "var(--panel-muted)";
        btn.style.borderColor = "var(--panel-divider)";
        btn.title = "Auto-escalation OFF - Click to enable";
      }
    }
  }
  function setTrendComparisonMode(mode) {
    if (!runtime.TREND_PRESETS[mode] && mode !== "last") return;
    selectTrendMode(mode);
    updateTrendDisplay();
    updateTrendPresetButtons();
    saveSession(getModelName());
  }
  function updateTrendPresetButtons() {
    var buttons = document.querySelectorAll(".trend-preset-btn");
    buttons.forEach(function(btn) {
      var mode = btn.dataset.mode;
      if (mode === runtime.trendComparisonMode) {
        btn.style.background = "#4169E1";
        btn.style.color = "#fff";
        btn.style.borderColor = "#4169E1";
      } else {
        btn.style.background = "var(--panel-button)";
        btn.style.color = "var(--panel-muted)";
        btn.style.borderColor = "var(--panel-divider)";
      }
    });
  }

  // src/lifecycle.js
  function nextBroadcasterAbsence(snapshot) {
    return nextSessionAbsence(Object.assign({}, snapshot, { observedAt: Date.now() }));
  }
  function checkAbsenceStop() {
    if (runtime.isStopped || !runtime.isAutoRefreshOn || runtime.absenceOverrideActive) return false;
    if (pauseSessionForAbsence(Date.now(), runtime.ABSENCE_PAUSE_MS)) {
      invalidateAcquisition();
      stopTrackingTimer();
      cancelHighPulses();
      schedulePresenceAcquisition(Date.now(), readRequestPolicy().until);
      updateTrackingTimer();
      updateStopControls();
      updateAcquisitionStatus();
      saveSession(getModelName());
    }
    if (isAbsencePaused() && Date.now() - runtime.absencePausedAt >= runtime.ABSENCE_STOP_MS) {
      stopTracking("absence");
      return true;
    }
    return false;
  }
  function updateStopControls() {
    var reset = document.getElementById("btn-main-reset");
    if (reset) {
      reset.disabled = !isBroadcastRoom();
      reset.style.opacity = reset.disabled ? "0.5" : "1";
      reset.title = reset.disabled ? "Open a room to reset tracking" : "Reset all tracking data";
    }
    var stop = document.getElementById("btn-control-stop");
    if (stop) {
      stop.disabled = runtime.isStopped || !isBroadcastRoom();
      stop.style.opacity = stop.disabled ? "0.5" : "1";
    }
    ["btn-auto", "btn-control-auto"].forEach(function(id) {
      var button = document.getElementById(id);
      if (!button) return;
      button.disabled = !isBroadcastRoom();
      if (button.disabled) {
        button.title = "Open a broadcast room to track";
        button.setAttribute("aria-label", "Open a broadcast room to track");
        button.style.background = "var(--panel-button)";
        return;
      }
      button.innerHTML = runtime.isStopped ? "Start" : runtime.isAutoRefreshOn && !isAbsencePaused() ? "⏸" : "▶";
      button.title = runtime.isStopped ? "Start a new session (keeps this stopped record until normal cleanup)" : isAbsencePaused() ? "Resume recording now; cancel absence slowdown, automatic pause and Stop until the broadcaster returns" : runtime.isAutoRefreshOn ? "Pause scans and elapsed time" : "Resume this session";
      button.setAttribute("aria-label", runtime.isStopped ? "Start a new session" : isAbsencePaused() ? "Resume recording" : runtime.isAutoRefreshOn ? "Pause scans" : "Resume scans");
      button.style.background = runtime.isStopped ? "#4169E1" : isAbsencePaused() ? "#b86b00" : runtime.isAutoRefreshOn ? "#32CD32" : "#ff4444";
    });
  }
  function stopTracking(reason) {
    if (!stopLiveSession(reason, Date.now(), runtime.ABSENCE_STOP_MS)) return;
    invalidateAcquisition();
    stopCountdown();
    clearAcquisitionDeadline();
    stopTrackingTimer();
    cancelHighPulses();
    updateTrackingTimer();
    updateStopControls();
    updateDisplay();
    updateCountdownDisplay();
    updateAcquisitionStatus();
    saveSession(getModelName());
  }
  function startNewSession() {
    if (!runtime.isStopped) return;
    if (!confirm("Start a new session?\n\nThe chart and elapsed time will start from zero. Export this stopped session first if you want to keep a report, CSV or GIF. Its saved record is retained until normal storage cleanup.")) return;
    saveSession(getModelName());
    runtime.tabRecords.delete(getStorageKey(getModelName()));
    resetTrackingData(false);
  }
  function updateTrackingTimer() {
    var controlTimerEl = document.getElementById("control-tracking-timer");
    var displayTime = "00:00:00";
    var displayColor = "var(--panel-subtle)";
    if (runtime.isPaused) {
      displayTime = formatElapsedTime(runtime.pausedElapsedTime);
      displayColor = "var(--panel-negative)";
    } else if (runtime.trackingStartTime) {
      displayTime = formatElapsedTime(Date.now() - runtime.trackingStartTime);
      displayColor = "var(--panel-warning)";
    }
    if (controlTimerEl) {
      controlTimerEl.textContent = displayTime;
      controlTimerEl.style.color = displayColor;
    }
    checkTrendAutoEscalation();
  }
  function startTrackingTimer() {
    if (!isBroadcastRoom()) return;
    if (!startSessionClock(Date.now())) return;
    startAcquisitionClock("trackingTimerInterval", updateTrackingTimer, 1e3);
    updateTrackingTimer();
    saveSession(getModelName());
  }
  function pauseTrackingTimer() {
    if (!pauseSessionClock(Date.now())) return;
    stopAcquisitionClock("trackingTimerInterval");
    updateTrackingTimer();
    saveSession(getModelName());
  }
  function stopTrackingTimer() {
    stopAcquisitionClock("trackingTimerInterval");
  }
  function resetAllTracking() {
    if (!isBroadcastRoom()) return;
    if (!confirm("Reset all tracking data?\n\nThis will clear:\n- All session history\n- Trend tracking\n- Elapsed timer\n\nA new scan will start immediately.")) {
      return;
    }
    resetTrackingData(true);
  }
  function resetTrackingData(deleteSaved) {
    var modelName = getModelName();
    if (modelName === "unknown") return;
    saveSession(modelName, true);
    leavePlayback(false);
    cancelGifExport();
    log("Performing main reset...");
    if (deleteSaved) deleteSession(modelName);
    runtime.activeSessionStorageKey = getStorageKey(modelName);
    invalidateAcquisition();
    stopCountdown();
    stopTrackingTimer();
    resetLiveSession(deleteSaved ? "reset" : "start");
    noteAcquisitionSource("API");
    clearDOMFailures();
    resetTrendPreferences();
    updateAcquisitionStatus();
    resetCountdown();
    updateDisplay();
    updateTrendDisplay();
    updateTrackingTimer();
    updateCountdownDisplay();
    drawAllSparklines();
    if (runtime.isAutoRefreshOn) {
      startTrackingTimer();
      startCountdown();
    }
    saveSession(modelName);
    var resetContext = { epoch: runtime.scanEpoch, generation: runtime.initGuard, url: location.href };
    setTimeout(function() {
      if (isAcquisitionCurrent(resetContext)) lifecycleEffects.scan(true);
    }, 500);
    updateTrendPresetButtons();
    updateAutoTrendButton();
    updateStopControls();
    log("Reset complete - starting fresh scan (epoch: " + runtime.scanEpoch + ")");
  }
  function resetCountdown() {
    scheduleNextAcquisition(getEffectiveScanIntervalSeconds(), Date.now(), readRequestPolicy().until, runtime.isStopped);
    updateCountdownDisplay();
  }
  function updateCountdownDisplay() {
    if (!isBroadcastRoom()) {
      ["auto-status", "expanded-countdown", "control-next-scan"].forEach(function(id) {
        var element = document.getElementById(id);
        if (element) {
          element.textContent = "Open a room";
          element.title = "Tracking is inactive on this page. Library and saved-file Replay remain available.";
          element.style.color = "var(--panel-muted)";
        }
      });
      updateMiniFreshness();
      return;
    }
    if (checkAbsenceStop()) return;
    var policy = readRequestPolicy();
    if (policy.blocked && runtime.isAutoRefreshOn) pauseForAccessRestriction();
    var policyMessage = requestPolicyMessage(policy);
    refreshAcquisitionCountdown(Date.now(), policy.until, runtime.isAutoRefreshOn);
    updateMiniFreshness();
    var fallbackWait = getDOMFallbackWaitSeconds(getModelName());
    var timingTitle = "Next API attempt after the countdown. " + (fallbackWait > 0 ? "DOM fallback eligible in " + fallbackWait + "s if the API fails." : "DOM fallback eligible if the API fails.");
    var statusEl = document.getElementById("auto-status");
    var timerDisplay = document.getElementById("timer-display");
    var expandedCountdown = document.getElementById("expanded-countdown");
    var controlNextScan = document.getElementById("control-next-scan");
    if (runtime.isStopped) {
      [statusEl, expandedCountdown, controlNextScan].forEach(function(el) {
        if (el) {
          el.textContent = "Stopped";
          el.title = stopDescription();
          el.style.color = "var(--panel-muted)";
        }
      });
      updateStopControls();
      return;
    }
    if (isAbsencePaused()) {
      if (timerDisplay) timerDisplay.textContent = runtime.scanIntervalSeconds + "s";
      [statusEl, expandedCountdown, controlNextScan].forEach(function(el) {
        if (!el) return;
        el.textContent = policyMessage || (el === statusEl ? "Auto-paused" : runtime.isScanning ? "Checking..." : "Check: " + runtime.countdownSeconds + "s");
        el.title = absencePauseDescription() + (policyMessage ? " " + policyMessage + "." : " Next return check: " + runtime.countdownSeconds + "s.");
        el.style.color = "var(--panel-warning)";
      });
      updateStopControls();
      return;
    }
    var effectiveInterval = getEffectiveScanIntervalSeconds();
    var reduced = effectiveInterval > runtime.scanIntervalSeconds;
    timingTitle += " Selected interval: " + runtime.scanIntervalSeconds + "s. Effective interval: " + effectiveInterval + "s." + (reduced ? " Reduced scanning while the broadcaster is absent; auto-pause at 15 minutes, then return checks for up to 3 hours." : "") + (runtime.absenceOverrideActive ? " Absence automation manually overridden until the broadcaster is detected again." : "");
    [statusEl, expandedCountdown, controlNextScan].forEach(function(el) {
      if (el) el.title = runtime.isAutoRefreshOn ? timingTitle : "Automatic scans paused. An in-flight scan may finish. " + timingTitle;
    });
    if (timerDisplay) {
      timerDisplay.textContent = runtime.scanIntervalSeconds + "s";
    }
    if (expandedCountdown) {
      if (runtime.isScanning) {
        expandedCountdown.textContent = "scanning...";
        expandedCountdown.style.color = "var(--panel-warning)";
      } else if (runtime.isAutoRefreshOn) {
        expandedCountdown.textContent = "next: " + runtime.countdownSeconds + "s";
        expandedCountdown.style.color = "var(--panel-positive)";
      } else {
        expandedCountdown.textContent = "paused";
        expandedCountdown.style.color = "var(--panel-negative)";
      }
    }
    if (controlNextScan) {
      if (runtime.isScanning) {
        controlNextScan.textContent = "Scanning...";
        controlNextScan.style.color = "var(--panel-warning)";
      } else if (runtime.isAutoRefreshOn) {
        controlNextScan.textContent = (reduced ? "Reduced: " : "Next: ") + runtime.countdownSeconds + "s";
        controlNextScan.style.color = "var(--panel-positive)";
      } else {
        controlNextScan.textContent = "Paused";
        controlNextScan.style.color = "var(--panel-negative)";
      }
    }
    if (policyMessage) {
      [statusEl, expandedCountdown, controlNextScan].forEach(function(el) {
        if (!el) return;
        el.textContent = policyMessage;
        el.style.color = "var(--panel-warning)";
        el.title = policyMessage + (policy.blocked ? ". Automatic scans stopped. After resolving access, use Resume to retry." : ". No API or DOM acquisition before " + new Date(policy.until).toLocaleString() + ".");
      });
      return;
    }
    if (!statusEl) return;
    if (runtime.isScanning) {
      statusEl.textContent = "Scanning...";
      statusEl.style.color = "var(--panel-warning)";
    } else if (runtime.isAutoRefreshOn) {
      statusEl.textContent = "Next: " + runtime.countdownSeconds + "s";
      statusEl.style.color = "var(--panel-positive)";
    } else {
      statusEl.textContent = "Auto: OFF";
      statusEl.style.color = "var(--panel-negative)";
    }
  }
  function adjustTimer(delta) {
    var newValue = runtime.scanIntervalSeconds + delta;
    selectScanInterval(newValue);
    if (runtime.isAutoRefreshOn) {
      stopCountdown();
      resetCountdown();
      startCountdown();
    } else {
      resetCountdown();
      var timerDisplay = document.getElementById("timer-display");
      if (timerDisplay) {
        timerDisplay.textContent = runtime.scanIntervalSeconds + "s";
      }
    }
    updateCountdownDisplay();
  }
  function startCountdown() {
    stopAcquisitionClock("countdownInterval");
    if (!isBroadcastRoom() || runtime.isStopped) return;
    if (!runtime.nextScanAt) resetCountdown();
    updateCountdownDisplay();
    if (runtime.isStopped) return;
    startAcquisitionClock("countdownInterval", function() {
      if (!runtime.isAutoRefreshOn || runtime.isScanning) return;
      updateCountdownDisplay();
      if (runtime.countdownSeconds <= 0) {
        lifecycleEffects.scan(true);
      }
    }, 1e3);
  }
  function stopCountdown() {
    stopAcquisitionClock("countdownInterval");
  }
  function pauseAutoRefresh() {
    if (runtime.isStopped) return;
    if (isAbsencePaused()) {
      invalidateAcquisition();
    }
    pauseSessionRecording(Date.now());
    stopCountdown();
    stopTrackingTimer();
    updateTrackingTimer();
    updateStopControls();
    updateCountdownDisplay();
    updateAcquisitionStatus();
    saveSession(getModelName());
  }
  function toggleAutoRefresh() {
    if (!isBroadcastRoom()) {
      updateStopControls();
      updateCountdownDisplay();
      return;
    }
    if (runtime.isStopped) {
      startNewSession();
      return;
    }
    if (checkAbsenceStop()) return;
    var overridingAbsence = isAbsencePaused();
    if (runtime.isAutoRefreshOn && !overridingAbsence) {
      pauseAutoRefresh();
      return;
    }
    if (overridingAbsence) {
      invalidateAcquisition();
    }
    var policy = readRequestPolicy();
    if (policy.blocked) {
      writeRequestPolicy({ until: policy.serverUntil || 0, serverUntil: policy.serverUntil || 0, failures: 0, blocked: 0, status: 0, revision: "" });
    }
    resumeSessionRecording(Date.now(), overridingAbsence);
    startTrackingTimer();
    startCountdown();
    lifecycleEffects.scan(true);
    updateStopControls();
    updateAcquisitionStatus();
    saveSession(getModelName());
  }
  function pauseForAccessRestriction() {
    pauseAutoRefresh();
  }
  var lifecycleEffects;
  function initializeLifecycle(effects) {
    lifecycleEffects = effects;
  }

  // src/dom.js
  function getTierFromClassList(classList) {
    for (var i = 0; i < classList.length; i++) {
      var className = classList[i];
      var lower = className.toLowerCase();
      if (className === "tippedTonsRecently" || lower === "tippedtonsrecently") return "purple";
      if (className === "tippedALotRecently" || lower === "tippedalotrecently") return "pink";
      if (className === "tippedRecently" || lower === "tippedrecently") return "dark-blue";
      if (className === "inFanClub" || lower === "infanclub") return "green";
      if (className === "mod" || lower === "moderator") return "red";
      if (className === "hasTokens" || lower === "hastokens") return "light-blue";
      if (className === "defaultUser" || lower === "defaultuser") return "gray";
    }
    return null;
  }
  function getTierFromElement(el) {
    var tier = getTierFromClassList(el.classList);
    if (tier) return tier;
    var parent = el.parentElement;
    for (var i = 0; i < 4 && parent; i++) {
      tier = getTierFromClassList(parent.classList);
      if (tier) return tier;
      parent = parent.parentElement;
    }
    return "gray";
  }
  function getGenderFromElement(el) {
    var genderImg = el.querySelector('img[data-testid="gender-icon"], img[title="Trans"], img[title="Female"], img[title="Male"], img[title="Couple"]');
    if (!genderImg) {
      var parent = el.parentElement;
      for (var i = 0; i < 3 && parent; i++) {
        genderImg = parent.querySelector('img[data-testid="gender-icon"], img[title="Trans"], img[title="Female"], img[title="Male"], img[title="Couple"]');
        if (genderImg) break;
        parent = parent.parentElement;
      }
    }
    if (genderImg) {
      var src = genderImg.src || "";
      var title = genderImg.title || "";
      if (src.indexOf("female") !== -1 || title === "Female") return "female";
      if (src.indexOf("trans") !== -1 || title === "Trans") return "trans";
      if (src.indexOf("male") !== -1 || title === "Male") return "male";
      if (src.indexOf("couple") !== -1 || title === "Couple") return "couple";
    }
    return "unknown";
  }
  function getRoomTotal() {
    for (var i = 0; i < runtime.DOM_SELECTORS.roomTotal.length; i++) {
      var el = document.querySelector(runtime.DOM_SELECTORS.roomTotal[i]);
      if (el) {
        var text = el.textContent || "";
        var match = text.match(/USERS\s*\(?(\d[\d,]*)\)?/i);
        if (match) return parseInt(match[1].replace(/,/g, ""));
      }
    }
    return 0;
  }
  function extractUsername(text) {
    if (!text) return null;
    text = text.trim().split("\n")[0];
    var match = text.match(/^([^\s\(\[\<\,]+)/);
    if (match) {
      var candidate = match[1].trim();
      if (candidate.length >= 2 && candidate.length <= 30) {
        var clean = candidate.replace(/[^\w\-]+$/, "");
        if (clean.length >= 2) return clean;
      }
    }
    return null;
  }
  function findTab(tabName) {
    var selectors = runtime.DOM_SELECTORS.tabs[tabName.toLowerCase()] || [];
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (el) return el;
    }
    var buttons = document.querySelectorAll('button, div[role="tab"]');
    for (var j = 0; j < buttons.length; j++) {
      var btn = buttons[j];
      var text = (btn.textContent || "").toUpperCase();
      if (text.indexOf(tabName.toUpperCase()) !== -1) return btn;
    }
    return null;
  }
  function isScanValid(newUserCount, newRoomTotal) {
    if (runtime.previousRoomTotal === 0) return true;
    if (newRoomTotal === 0 && runtime.previousRoomTotal > 0) {
      log("Scan rejected: room total is 0 but previous was " + runtime.previousRoomTotal);
      return false;
    }
    var roomTotalChange = Math.abs(newRoomTotal - runtime.previousRoomTotal) / runtime.previousRoomTotal;
    if (roomTotalChange > 0.1) return true;
    var userDrop = runtime.previousUserCount > 0 ? (runtime.previousUserCount - newUserCount) / runtime.previousUserCount : 0;
    if (userDrop > 0.5) {
      log("Scan rejected: user count dropped " + Math.round(userDrop * 100) + "% (" + runtime.previousUserCount + " -> " + newUserCount + ") while room total stable (" + runtime.previousRoomTotal + " -> " + newRoomTotal + ")");
      return false;
    }
    return true;
  }
  function scanUsers() {
    var userListTab = document.querySelector(runtime.DOM_SELECTORS.userListTab);
    if (!userListTab) throw new Error("UserListTab not found");
    var snapshotUsers = /* @__PURE__ */ new Map();
    var snapshotRoomTotal = getRoomTotal();
    if (!snapshotRoomTotal) throw new Error("DOM room total missing or zero");
    var userElements = [];
    for (var i = 0; i < runtime.DOM_SELECTORS.usernameElements.length; i++) {
      var found = userListTab.querySelectorAll(runtime.DOM_SELECTORS.usernameElements[i]);
      for (var j = 0; j < found.length; j++) {
        userElements.push(found[j]);
      }
    }
    for (var i = 0; i < userElements.length; i++) {
      var el = userElements[i];
      var rawText = (el.textContent || "").trim() || (el.getAttribute("data-username") || "").trim();
      var username = extractUsername(rawText);
      if (username && !snapshotUsers.has(username)) {
        var tier = getTierFromElement(el);
        var gender = getGenderFromElement(el);
        snapshotUsers.set(username, {
          username,
          rawClass: null,
          tier,
          genderCode: null,
          gender,
          rawFlag: null,
          isOwner: null
        });
      }
    }
    if (!snapshotUsers.size) throw new Error("DOM sample contains no readable users");
    return {
      source: "DOM",
      timestamp: Date.now(),
      roomTotal: snapshotRoomTotal,
      users: Array.from(snapshotUsers.values())
    };
  }

  // src/history.js
  function getSessionSamplePolicy() {
    return {
      breaks: getHistoryBreaks(runtime.history),
      intervalSeconds: runtime.scanIntervalSeconds,
      lastIntervalSeconds: runtime.lastScheduledIntervalSeconds,
      timeoutMs: runtime.API_TIMEOUT_MS
    };
  }
  function saveToHistory() {
    appendCurrentSessionSample(Date.now(), getSessionSamplePolicy());
    if (!runtime.isMinimized) drawAllSparklines();
  }
  function syncHighTimes() {
    synchronizeSessionHighTimes();
  }

  // src/sample-presentation.js
  function presentAcceptedSample() {
    const history = runtime.history, generation = runtime.initGuard, url = location.href;
    const current = () => history === runtime.history && generation === runtime.initGuard && url === location.href;
    try {
      if (!runtime.isMinimized) drawAllSparklines();
      if (!current()) return false;
      updateDisplay();
      if (!current()) return false;
      updateTrendDisplay();
      if (!current()) return false;
      clearPresentationFailure(history, generation, url);
      updateAcquisitionStatus();
      return current();
    } catch (error) {
      if (current()) {
        const previous = getPresentationFailure(history, generation, url);
        notePresentationFailure(history, generation, url, error);
        const message = getPresentationFailure(history, generation, url);
        if (message !== previous) diagnostic("warn", "Display unavailable; committed data retained: " + message);
        try {
          updateAcquisitionStatus();
        } catch (statusError) {
        }
      }
      return false;
    }
  }
  function retrySamplePresentation() {
    if (getPresentationFailure(runtime.history, runtime.initGuard, location.href) && runtime.presentationMode !== "PLAYBACK") {
      presentAcceptedSample();
    }
  }

  // src/scanning.js
  function parseGetChatUserListResponse(text) {
    if (typeof text !== "string" || !text.trim()) throw new Error("Empty API response");
    var parts = text.trim().split(",");
    if (!/^\d+$/.test(parts[0])) throw new Error("Invalid API anonymous count");
    var anonymousCount = Number(parts[0]);
    if (!Number.isSafeInteger(anonymousCount)) throw new Error("Unsafe API anonymous count");
    var classTiers = { m: "red", f: "green", l: "purple", p: "pink", tr: "dark-blue", t: "light-blue", g: "gray" };
    var genders = { m: "male", f: "female", s: "trans", c: "couple" };
    var seen = /* @__PURE__ */ new Set();
    var parsedUsers = [];
    var unknownClasses = /* @__PURE__ */ Object.create(null);
    var unknownGenders = /* @__PURE__ */ Object.create(null);
    for (var i = 1; i < parts.length; i++) {
      var fields = parts[i].split("|");
      if (fields.length !== 4 || !/^[A-Za-z0-9_-]{2,30}$/.test(fields[0]) || fields.slice(1).some(function(field) {
        return !/^[^\s|,<>\x00-\x1f]+$/.test(field);
      })) {
        throw new Error("Malformed API record at index " + i);
      }
      var username = fields[0];
      var key = username.toLowerCase();
      if (seen.has(key)) throw new Error("Duplicate API username at index " + i);
      seen.add(key);
      var rawClass = fields[1];
      var genderCode = fields[2];
      var isOwner = rawClass === "o";
      var tier = Object.prototype.hasOwnProperty.call(classTiers, rawClass) ? classTiers[rawClass] : null;
      var gender = Object.prototype.hasOwnProperty.call(genders, genderCode) ? genders[genderCode] : "unknown";
      if (!tier && !isOwner) unknownClasses[rawClass] = (unknownClasses[rawClass] || 0) + 1;
      if (gender === "unknown") unknownGenders[genderCode] = (unknownGenders[genderCode] || 0) + 1;
      parsedUsers.push({
        username,
        rawClass,
        tier,
        genderCode,
        gender,
        rawFlag: fields[3],
        isOwner
      });
    }
    var registeredCount = parsedUsers.length;
    var totalUsers = anonymousCount + registeredCount;
    if (!Number.isSafeInteger(totalUsers)) throw new Error("Unsafe API total users");
    return {
      anonymousCount,
      registeredCount,
      totalUsers,
      users: parsedUsers,
      diagnostics: { unknownClasses, unknownGenders }
    };
  }
  function validateRoomSnapshot(snapshot) {
    if (!snapshot || !Number.isSafeInteger(snapshot.roomTotal) || snapshot.roomTotal < 0 || !Array.isArray(snapshot.users)) throw new Error("Invalid room snapshot");
    if (snapshot.source === "API" && (!Number.isSafeInteger(snapshot.anonymousCount) || snapshot.anonymousCount < 0 || snapshot.registeredCount !== snapshot.users.length || snapshot.totalUsers !== snapshot.anonymousCount + snapshot.registeredCount || snapshot.roomTotal !== snapshot.totalUsers)) {
      throw new Error("Inconsistent API anonymous, registered, or total user counts");
    }
    if (!isScanValid(snapshot.users.length, snapshot.roomTotal)) {
      throw new Error("Sample rejected by 3.0.0 scan-validity checks");
    }
  }
  async function acquireAPISnapshot(context) {
    if (!context.room || context.room === "unknown") throw new Error("No current room username");
    var url = new URL("/api/getchatuserlist/", location.origin);
    url.searchParams.set("roomname", context.room);
    url.searchParams.set("private", "false");
    url.searchParams.set("sort_by", "a");
    url.searchParams.set("exclude_staff", "false");
    var controller = new AbortController();
    var timeout;
    try {
      var text = await Promise.race([
        (async function() {
          var response = await fetch(url.href, {
            method: "GET",
            credentials: "same-origin",
            mode: "same-origin",
            cache: "no-store",
            redirect: "error",
            signal: controller.signal
          });
          if (!response.ok) {
            var error = new Error("API HTTP " + response.status);
            error.status = response.status;
            error.retryAt = retryAfterTime(response.headers && response.headers.get("Retry-After"), Date.now());
            throw error;
          }
          return response.text();
        })(),
        new Promise(function(resolve, reject) {
          timeout = setTimeout(function() {
            reject(new Error("API request timed out after " + runtime.API_TIMEOUT_MS + " ms"));
            controller.abort();
          }, runtime.API_TIMEOUT_MS);
        })
      ]);
      var snapshot = parseGetChatUserListResponse(text);
      snapshot.roomTotal = snapshot.totalUsers;
      snapshot.source = "API";
      snapshot.timestamp = Date.now();
      return snapshot;
    } finally {
      clearTimeout(timeout);
    }
  }
  async function acquireDOMSnapshot(context, returnToChat) {
    var usersTab = findTab("users");
    var chatTab = findTab("chat");
    if (!usersTab) throw new Error("USERS tab not found");
    var tabGroup = usersTab.closest('[role="tablist"]') || usersTab.parentElement;
    var tabs = Array.from(tabGroup ? tabGroup.querySelectorAll('button, [role="tab"], [data-tab]') : []);
    [usersTab, chatTab].forEach(function(tab) {
      if (tab && tabs.indexOf(tab) === -1) tabs.push(tab);
    });
    function selectedTab() {
      var selected = tabs.filter(function(tab) {
        return tab.getAttribute("aria-selected") === "true" || tab.getAttribute("data-state") === "active" || tab.classList.contains("active") || tab.classList.contains("selected");
      });
      return selected.length === 1 ? selected[0] : null;
    }
    var originalTab = selectedTab();
    if (!originalTab) throw new Error("Cannot safely identify the selected tab");
    if (originalTab === usersTab) return scanUsers();
    if (!returnToChat) throw new Error("DOM fallback skipped because tab restoration is disabled");
    var openedUsers = false;
    var userChangedTab = false;
    function onTabClick(event) {
      if (tabs.some(function(tab) {
        return tab === event.target || tab.contains(event.target);
      })) userChangedTab = true;
    }
    try {
      usersTab.click();
      openedUsers = true;
      if (tabGroup) tabGroup.addEventListener("click", onTabClick, true);
      await new Promise(function(resolve) {
        setTimeout(resolve, 800);
      });
      if (!isAcquisitionCurrent(context) || userChangedTab || selectedTab() !== usersTab) return null;
      return scanUsers();
    } finally {
      if (tabGroup) tabGroup.removeEventListener("click", onTabClick, true);
      if (openedUsers && !userChangedTab && isAcquisitionCurrent(context) && selectedTab() === usersTab && originalTab.isConnected) {
        try {
          originalTab.click();
        } catch (err) {
          log("DOM fallback could not restore the selected tab: " + err.message);
        }
      }
    }
  }
  async function checkBroadcasterReturn(context) {
    noteAcquisitionSource("API");
    try {
      var snapshot = await acquireAPISnapshot(context);
      if (!isAcquisitionCurrent(context) || checkAbsenceStop() || !isAbsencePaused()) return null;
      if (readRequestPolicy().blocked) {
        pauseForAccessRestriction();
        return null;
      }
      clearRequestFailures(context.policyRevision);
      if (!snapshot.users.some(function(user) {
        return user.isOwner === true;
      })) return null;
      resumeSessionForOwnerReturn(Date.now());
      startTrackingTimer();
      updateStopControls();
      validateRoomSnapshot(snapshot);
      return snapshot;
    } catch (error) {
      if (!isAcquisitionCurrent(context)) return null;
      if (isAbsencePaused()) {
        var policy = recordRequestFailure(error);
        if (policy.blocked) pauseForAccessRestriction();
      }
      log("Return check did not record a sample: " + error.message);
      return null;
    }
  }
  async function acquireRoomSnapshot(context, returnToChat) {
    noteAcquisitionSource("API");
    try {
      var snapshot = await acquireAPISnapshot(context);
      if (!isAcquisitionCurrent(context)) return null;
      if (checkAbsenceStop() || !isAcquisitionCurrent(context)) return null;
      observeSessionPresence(snapshot, Date.now());
      if (checkAbsenceStop() || !isAcquisitionCurrent(context)) return null;
      validateRoomSnapshot(snapshot);
      clearDOMFailures();
      clearRequestFailures(context.policyRevision);
      return snapshot;
    } catch (err) {
      if (!isAcquisitionCurrent(context)) return null;
      diagnostic("warn", "API failed: " + err.message);
      var policy = recordRequestFailure(err);
      if (policy.blocked) {
        pauseForAccessRestriction();
        return null;
      }
      if (err.status === 429 || err.retryAt > Date.now()) return null;
    }
    noteAcquisitionSource("DOM");
    var fallbackWait = getDOMFallbackWaitSeconds(context.room);
    if (fallbackWait > 0) {
      log("DOM fallback deferred for " + fallbackWait + "s; retaining previous valid data (no history point)");
      return null;
    }
    var roomKey2 = context.room.toLowerCase();
    var fallbackIntervalMs = Math.max(runtime.DOM_FALLBACK_INTERVAL_SECONDS, runtime.scanIntervalSeconds) * 1e3;
    deferDOMFallback(roomKey2, Date.now() + fallbackIntervalMs);
    log("Attempting DOM fallback; room=" + context.room);
    try {
      var fallback = await acquireDOMSnapshot(context, returnToChat);
      if (!isAcquisitionCurrent(context)) return null;
      validateRoomSnapshot(fallback);
      log("DOM fallback succeeded; room=" + context.room + " records=" + fallback.users.length);
      return fallback;
    } catch (err) {
      if (!isAcquisitionCurrent(context)) return null;
      diagnostic("warn", "DOM fallback failed: " + err.message + "; retaining previous valid data (no history point)");
      return null;
    } finally {
      deferDOMFallback(roomKey2, Date.now() + fallbackIntervalMs);
    }
  }
  function acceptRoomSnapshot(snapshot, modelName) {
    return beginAcceptedSample(snapshot, modelName, Date.now(), getSessionSamplePolicy());
  }
  async function performScanThenReturn(returnToChat) {
    if (!isBroadcastRoom()) return;
    if (typeof returnToChat === "undefined") returnToChat = true;
    if (checkAbsenceStop()) return;
    if (runtime.isScanning || runtime.isStopped) return;
    var policy = readRequestPolicy();
    if (policy.blocked) {
      pauseForAccessRestriction();
      updateCountdownDisplay();
      return;
    }
    if (policy.until > Date.now()) {
      updateCountdownDisplay();
      return;
    }
    var context = beginAcquisition(location.href, getModelName(), policy, Date.now(), runtime.isStopped);
    if (!context) return;
    var priorState = null;
    var sampleCommitted = false;
    var sampleReceipt = null;
    var priorAbsence = runtime.broadcasterAbsence;
    var checkingReturn = isAbsencePaused();
    var statusEl = document.getElementById("auto-status");
    try {
      updateCountdownDisplay();
    } catch (error) {
      log("Countdown display unavailable: " + error.message);
    }
    try {
      var snapshot = checkingReturn ? await checkBroadcasterReturn(context) : await acquireRoomSnapshot(context, returnToChat);
      if (!isAcquisitionCurrent(context)) return;
      if (checkAbsenceStop()) return;
      if (checkingReturn && isAbsencePaused()) return;
      if (!snapshot) {
        markSessionGap();
        if (statusEl) {
          statusEl.textContent = "Scan skipped (unreliable)";
          statusEl.style.color = "var(--panel-negative)";
        }
        return;
      }
      sampleReceipt = acceptRoomSnapshot(snapshot, context.room);
      sampleCommitted = isAcquisitionCurrent(context) && commitAcceptedSample(sampleReceipt);
      if (!sampleCommitted) {
        abortAcceptedSample(sampleReceipt);
        return;
      }
      priorState = sampleReceipt.before;
      try {
        priorState = Object.assign({}, priorState, { allTimeHighs: readAllTimeHighs(context.room).highs });
      } catch (error) {
        log("Could not read prior all-time highs: " + error.message);
      }
      if (!isAcquisitionCurrent(context)) return;
      try {
        saveSession(context.room);
      } catch (error) {
        log("Could not save accepted sample: " + error.message);
      }
      if (!isAcquisitionCurrent(context)) return;
      try {
        recordAcceptedAllTimeHighs(context.room);
      } catch (error) {
        log("Could not update all-time highs: " + error.message);
      }
      if (!isAcquisitionCurrent(context)) return;
      if (presentAcceptedSample() && isAcquisitionCurrent(context)) pulseAcceptedHighs(priorState);
      if (sampleReceipt.diagnostics) diagnostic("log", "API scan accepted", sampleReceipt.diagnostics);
    } catch (err) {
      if (!sampleCommitted) {
        if (sampleReceipt) abortAcceptedSample(sampleReceipt);
        if (isAcquisitionCurrent(context)) markSessionGap();
      }
      log((sampleCommitted ? "Accepted sample retained despite an effect failure: " : "Error during scan; retaining previous valid data: ") + err.message);
    } finally {
      if (finishAcquisition(context, location.href)) {
        try {
          resetCountdown();
        } catch (error) {
          log("Countdown refresh unavailable: " + error.message);
        }
        try {
          updateAcquisitionStatus();
        } catch (error) {
          log("Status display unavailable: " + error.message);
        }
        if (checkingReturn || !sampleReceipt && priorAbsence !== runtime.broadcasterAbsence) saveSession(context.room);
      }
    }
  }

  // src/dom-health.js
  function validateDOMHealth() {
    const now = Date.now();
    const container = document.getElementById("tracker-container");
    const userListTab = document.querySelector(runtime.DOM_SELECTORS.userListTab);
    const hasUserList = !!userListTab;
    let hasUsernameElements = false;
    for (let i = 0; i < runtime.DOM_SELECTORS.usernameElements.length; i++) {
      if (document.querySelector(runtime.DOM_SELECTORS.usernameElements[i])) {
        hasUsernameElements = true;
        break;
      }
    }
    const health = {
      timestamp: now,
      userListTab: hasUserList,
      usernameElements: hasUsernameElements,
      container: !!container,
      roomTotalSelectors: runtime.DOM_SELECTORS.roomTotal.some((sel) => !!document.querySelector(sel))
    };
    const wasHealthy = runtime.domHealthStatus.isHealthy;
    noteDOMHealth(now, hasUserList, hasUsernameElements);
    if (!runtime.domHealthStatus.isHealthy) {
      if (runtime.domHealthStatus.consecutiveFailures === 1 || runtime.domHealthStatus.consecutiveFailures % 10 === 0) {
        diagnostic("warn", "DOM health check failed:", health);
        if (container) {
          const statusEl = document.getElementById("auto-status");
          if (statusEl) {
            statusEl.textContent = "DOM mismatch - check console";
            statusEl.style.color = "var(--panel-negative)";
          }
        }
      }
      if (runtime.domHealthStatus.consecutiveFailures > 5 && runtime.isAutoRefreshOn) {
        diagnostic("warn", "Auto-pausing due to DOM health issues");
        pauseAutoRefresh();
      }
    } else {
      if (!wasHealthy && runtime.domHealthStatus.consecutiveFailures > 0) {
        log("DOM health restored");
        const statusEl = document.getElementById("auto-status");
        if (statusEl && runtime.isAutoRefreshOn) {
          statusEl.textContent = "Next: " + runtime.countdownSeconds + "s";
          statusEl.style.color = "var(--panel-positive)";
        }
      }
      clearDOMFailures();
    }
    return health;
  }

  // src/theme.js
  function applyPanelTheme(redraw) {
    var container = document.getElementById("tracker-container");
    if (!container) return;
    setThemeVariables(container);
    container.setAttribute("data-theme", runtime.isDarkMode ? "dark" : "bright");
    setThemeVariables(document.getElementById("tierscope-chart-tooltip"));
    var toggle = document.getElementById("dark-mode-toggle");
    if (toggle) toggle.checked = runtime.isDarkMode;
    var control = document.getElementById("dark-mode-control");
    if (control) control.title = runtime.isDarkMode ? "Dark mode on — switch to bright mode" : "Bright mode on — switch to dark mode";
    updateContainerOpacity(runtime.panelBackgroundPercent);
    if (redraw) {
      hideChartTooltip();
      updateDisplay();
      redrawPanelCharts();
    }
  }
  function updateContainerOpacity(value) {
    var numeric = Number(value);
    if (!Number.isFinite(numeric)) return;
    selectPanelOpacity(numeric);
    var container = document.getElementById("tracker-container");
    if (!container) return;
    container.style.backgroundColor = "rgba(" + themeColor("rgb") + "," + runtime.panelBackgroundPercent / 100 + ")";
    container.style.setProperty("--tier-background-scale", String(runtime.panelBackgroundPercent / 95));
    var slider = document.getElementById("opacity-slider");
    if (slider) {
      slider.value = String(runtime.panelBackgroundPercent);
      slider.setAttribute("aria-valuetext", runtime.panelBackgroundPercent + "% background opacity");
    }
    var label = document.getElementById("opacity-value");
    if (label) label.textContent = runtime.panelBackgroundPercent + "%";
  }

  // src/panel.js
  function createPanel() {
    if (runtime.panelOptionsCleanup) {
      runtime.panelOptionsCleanup();
      runtime.panelOptionsCleanup = null;
    }
    hideChartTooltip();
    cancelGifExport();
    leavePlayback(false);
    cleanupDragListeners();
    if (runtime.miniSettingsKeyHandler) {
      document.removeEventListener("keydown", runtime.miniSettingsKeyHandler, true);
      runtime.miniSettingsKeyHandler = null;
    }
    if (runtime.windowResizeHandler) {
      window.removeEventListener("resize", runtime.windowResizeHandler);
      runtime.windowResizeHandler = null;
    }
    if (window._trackerResizeCleanup) {
      window._trackerResizeCleanup();
      window._trackerResizeCleanup = null;
    }
    var existing = document.getElementById("cb-tier-tracker");
    if (existing) existing.remove();
    var div = document.createElement("div");
    div.id = "cb-tier-tracker";
    var html = '<div id="tracker-container" style="position:fixed;top:80px;right:20px;background:rgba(20,20,30,0.95);color:var(--panel-text);padding:5px;border-radius:6px;font-family:Arial,sans-serif;font-size:9px;z-index:999999;width:' + runtime.BASE_WIDTH_MINI + 'px;border:1px solid #ff69b4;transition:width 0.3s ease;cursor:default;user-select:none;"><div id="drag-handle" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;border-bottom:1px solid #ff69b4;padding-bottom:3px;cursor:move;"><div id="header-model" style="display:flex;flex:1;min-width:0;align-items:center;gap:3px;margin-left:14px;margin-right:4px;"><span id="header-text" style="flex:0 1 auto;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:bold;color:var(--panel-accent);font-size:13px;line-height:18px;">TierScope</span><button type="button" id="btn-model-favorite" aria-label="Favorite model" style="flex:0 0 18px;padding:0;border:0;background:transparent;color:var(--panel-muted);font-size:14px;line-height:18px;cursor:pointer;">☆</button></div><div style="display:flex;align-items:center;gap:3px;flex-shrink:0;"><button type="button" id="btn-high-mode" aria-pressed="false" aria-label="Session highs. Switch to all-time highs" style="display:none;min-width:29px;background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-text);border-radius:3px;cursor:pointer;font-size:8px;padding:1px 3px;">SH</button><button type="button" id="btn-panel-options" aria-label="Chart window and highs" aria-expanded="false" aria-controls="panel-options" style="display:none;background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-text);border-radius:3px;cursor:pointer;font-size:8px;padding:1px 3px;white-space:nowrap;">Full ▾</button><button type="button" id="btn-standard-size" title="Restore standard panel size (100%)" aria-label="Restore standard panel size" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-text);border-radius:3px;cursor:pointer;font-size:8px;padding:1px 3px;">100%</button><button id="btn-toggle" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-text);border-radius:3px;cursor:pointer;font-size:9px;padding:1px 4px;flex-shrink:0;">+</button></div></div><div id="panel-options" role="group" aria-label="Chart and high options" style="display:none;position:absolute;right:5px;top:29px;width:190px;max-width:calc(100% - 10px);box-sizing:border-box;z-index:5;padding:8px;background:var(--panel-solid);color:var(--panel-text);border:1px solid #ff69b4;border-radius:4px;font-size:11px;box-shadow:0 3px 12px #0008;"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:7px;"><strong>Charts &amp; highs</strong><button type="button" id="panel-options-close" aria-label="Close chart and high options" style="background:var(--panel-button);color:var(--panel-text);border:0;border-radius:3px;cursor:pointer;">×</button></div><label for="chart-window-select">Chart window</label><select id="chart-window-select" style="display:block;width:100%;margin:4px 0 6px;background:var(--panel-button);color:var(--panel-text);border:1px solid var(--panel-divider);font-size:11px;"><option value="full">Full history</option><option value="fourHours">Last 4 hours</option><option value="twoHours">Last 2 hours</option><option value="hour">Last hour</option><option value="halfHour">Last 30 minutes</option><option value="quarter">Last 15 minutes</option></select><div style="font-size:10px;color:var(--panel-muted);line-height:1.4;margin-bottom:8px;">Charts only. Downloads keep the full retained history.</div><input type="file" id="session-file-input" accept=".json,application/json" style="display:none;"><div id="session-file-info" style="display:none;margin-top:7px;font-size:10px;line-height:1.4;white-space:pre-line;overflow-wrap:anywhere;color:var(--panel-secondary);"></div><div style="border-top:1px solid var(--panel-divider);margin-top:8px;padding-top:6px;"><strong>All-time highs</strong><div id="all-time-info" style="font-size:10px;line-height:1.4;margin:4px 0;color:var(--panel-secondary);"></div><button type="button" id="btn-add-all-time" style="display:none;width:100%;margin:4px 0;padding:4px;background:#4169E1;color:#fff;border:0;border-radius:3px;cursor:pointer;">Add to all-time highs</button><button type="button" id="btn-clear-all-time" style="display:block;width:100%;margin:4px 0;padding:4px;background:var(--panel-button);color:var(--panel-text);border:1px solid var(--panel-divider);border-radius:3px;cursor:pointer;">Clear Room ATH…</button><button type="button" id="btn-clear-inactive-ath" style="display:block;width:100%;margin:4px 0;padding:4px;background:var(--panel-button);color:var(--panel-text);border:1px solid var(--panel-divider);border-radius:3px;cursor:pointer;" title="Preview and clear ATH for rooms not visited in over 90 days">Clear inactive ATH (90 days)…</button><div id="all-time-action-status" role="status" style="font-size:10px;line-height:1.4;overflow-wrap:anywhere;color:var(--panel-secondary);"></div></div></div><div id="minimized-view" style="display:block;position:relative;"><div style="display:flex;gap:4px;align-items:center;margin-bottom:3px;"><strong id="mini-room-count" style="color:var(--panel-accent);font-size:13px;">0</strong><span style="color:var(--panel-muted);font-size:8px;">in room</span><span id="mini-room-change" style="margin-left:auto;font-size:8px;"></span></div><div style="display:flex;align-items:center;justify-content:space-between;gap:3px;"><button type="button" id="mini-metric" style="background:transparent;border:0;color:var(--panel-secondary);font:inherit;cursor:pointer;padding:2px 0;" aria-label="Cycle chart metric">Room total ▾</button><button type="button" id="mini-high" style="background:transparent;border:0;padding:0;color:var(--panel-subtle);font-size:8px;cursor:pointer;"></button></div><canvas id="mini-chart" width="140" height="36" style="display:block;width:100%;height:36px;" role="img" aria-label="Recent audience history"></canvas><div style="display:flex;justify-content:space-between;gap:4px;margin:3px 0;"><span title="With Tokens">💎 <span id="mini-withtokens" style="color:var(--panel-warning);">0</span> <span id="mini-withtokens-change"></span></span><span title="Registered">📊 <span id="mini-total">0</span> <span id="mini-total-change"></span></span></div><div style="display:flex;align-items:center;gap:3px;"><span id="mini-freshness" style="flex:1;min-width:0;font-size:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">No sample</span><button type="button" id="btn-auto" style="background:var(--panel-button);border:0;color:var(--panel-text);border-radius:3px;cursor:pointer;" title="Pause or resume scans">⏸</button><button type="button" id="mini-settings-toggle" style="background:var(--panel-button);border:0;color:var(--panel-text);border-radius:3px;cursor:pointer;" aria-label="Scan interval settings" title="Scan interval settings — adjust how often TierScope scans" aria-expanded="false" aria-controls="mini-settings">◷</button><button type="button" id="btn-expand" style="background:var(--panel-button);border:0;color:var(--panel-text);border-radius:3px;font-size:9px;cursor:pointer;" title="Expand panel" aria-label="Expand panel">↗</button></div><div id="mini-settings" style="display:none;position:absolute;left:0;right:0;top:17px;background:var(--panel-settings);border:1px solid #ff69b4;border-radius:4px;padding:5px;z-index:2;" role="group" aria-label="Scan interval"><div style="display:flex;justify-content:space-between;align-items:center;font-size:9px;color:var(--panel-secondary);">Scan interval <button type="button" id="mini-settings-close" aria-label="Close scan interval settings" title="Close (Escape)" style="background:var(--panel-button);color:var(--panel-text);border:0;border-radius:3px;cursor:pointer;padding:1px 5px;font-size:13px;">×</button></div><div style="display:flex;align-items:center;justify-content:center;gap:3px;margin:3px 0;padding:2px;background:rgba(var(--panel-row-rgb),0.05);border-radius:3px;"><button id="btn-timer-down" style="background:var(--panel-button-strong);border:none;color:var(--panel-text);border-radius:2px;cursor:pointer;font-size:9px;padding:1px 4px;font-weight:bold;">−</button><span id="timer-display" style="font-size:11px;color:var(--panel-warning);font-weight:bold;min-width:28px;">60s</span><button id="btn-timer-up" style="background:var(--panel-button-strong);border:none;color:var(--panel-text);border-radius:2px;cursor:pointer;font-size:9px;padding:1px 4px;font-weight:bold;">+</button></div><div style="display:flex;gap:2px;justify-content:center;margin-top:3px;"><button class="timer-preset" data-time="30" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-muted);border-radius:2px;cursor:pointer;font-size:7px;padding:1px 3px;">30s</button><button class="timer-preset" data-time="60" style="background:#ff69b4;border:1px solid #ff69b4;color:#fff;border-radius:2px;cursor:pointer;font-size:7px;padding:1px 3px;">60s</button><button class="timer-preset" data-time="120" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-muted);border-radius:2px;cursor:pointer;font-size:7px;padding:1px 3px;">2m</button><button class="timer-preset" data-time="300" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-muted);border-radius:2px;cursor:pointer;font-size:7px;padding:1px 3px;">5m</button></div><div id="auto-status" style="margin-top:3px;font-size:8px;color:var(--panel-muted);">Starting...</div></div></div><div id="full-view" style="display:none;"><div id="tier-chart-region" style="display:flow-root;">' + collapsedTrayHtml();
    Object.keys(runtime.TIERS).forEach(function(key) {
      var t = runtime.TIERS[key];
      html += '<div id="tier-row-' + key + '" data-tier="' + key + '" style="display:flex;align-items:center;padding:1px 3px;margin:1px 0;background:rgba(var(--panel-row-rgb),calc(0.05 * var(--tier-background-scale, 1)));border-radius:3px;border-left:3px solid ' + t.color + ';"><div style="width:30px;flex-shrink:0;text-align:center;">' + collapseMarkerHtml(key) + '</div><canvas id="spark-' + key + '" width="105" height="28" style="flex:1;margin:0 4px;"></canvas><div style="text-align:right;width:48px;flex-shrink:0;"><span id="count-' + key + '" style="font-weight:bold;color:' + t.color + ';font-size:14px;">0</span><div id="high-' + key + '" style="font-size:8px;color:var(--panel-positive);margin-top:1px;white-space:nowrap;">SH:0</div></div></div>';
    });
    html += '<div id="summary-tier-rows" style="border-top:1px solid var(--panel-divider);margin-top:4px;padding-top:4px;"><div id="tier-row-withtokens" data-tier="withtokens" style="display:flex;align-items:center;padding:2px 3px;background:rgba(255,212,59,0.15);border-radius:3px;border:1px solid var(--panel-warning);margin-bottom:3px;"><div style="width:30px;flex-shrink:0;text-align:center;">' + collapseMarkerHtml("withtokens") + '</div><canvas id="spark-withtokens" width="105" height="28" style="flex:1;margin:0 4px;"></canvas><div style="text-align:right;width:48px;flex-shrink:0;"><span id="count-withtokens" style="font-weight:bold;color:var(--panel-warning);font-size:14px;">0</span><span id="pct-withtokens" style="font-size:8px;color:var(--panel-warning);margin-left:2px;">0%</span><div id="high-withtokens" style="font-size:8px;color:var(--panel-positive);margin-top:1px;white-space:nowrap;">SH:0</div></div></div><div id="tier-row-total" data-tier="total" style="display:flex;align-items:center;padding:2px 3px;background:rgba(var(--panel-row-rgb),0.1);border-radius:3px;"><div style="width:30px;flex-shrink:0;text-align:center;">' + collapseMarkerHtml("total") + '</div><canvas id="spark-total" width="105" height="28" style="flex:1;margin:0 4px;"></canvas><div style="text-align:right;width:48px;flex-shrink:0;"><span id="count-total" style="font-weight:bold;color:var(--panel-text);font-size:14px;">0</span><div id="high-total" style="font-size:8px;color:var(--panel-positive);margin-top:1px;white-space:nowrap;">SH:0</div></div></div></div><div id="tier-row-anon" data-tier="anonymous" style="margin-top:5px;padding:5px;background:rgba(136,136,136,0.15);border-radius:3px;border:1px solid #888;"><div style="display:flex;align-items:center;"><div style="width:30px;flex-shrink:0;text-align:center;">' + collapseMarkerHtml("anon") + '</div><canvas id="spark-anon" width="105" height="50" style="flex:1;margin:0 4px;"></canvas><div style="text-align:right;width:48px;flex-shrink:0;"><span id="anon-ratio-full" style="font-size:13px;font-weight:bold;color:#ff69b4;">--</span><div id="anon-registered-ratio" role="img" aria-label="Anons / registered viewers: unavailable" style="font-size:9px;line-height:12px;color:var(--panel-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">—</div><div id="high-anon" style="font-size:8px;color:var(--panel-positive);margin-top:1px;white-space:nowrap;">SH:0</div></div></div></div><div id="tier-row-roomTotal" data-tier="roomTotal" style="display:flex;align-items:center;padding:2px 3px;margin-top:3px;border:1px solid var(--panel-accent);border-radius:3px;background:rgba(255,105,180,.08);"><div style="width:30px;flex-shrink:0;text-align:center;">' + collapseMarkerHtml("roomTotal") + '</div><canvas id="spark-roomTotal" width="105" height="28" style="flex:1;margin:0 4px;"></canvas><div style="text-align:right;width:48px;flex-shrink:0;"><span id="count-roomTotal" style="font-weight:bold;color:var(--panel-accent);font-size:14px;">0</span><div id="high-roomTotal" style="font-size:8px;color:var(--panel-positive);margin-top:1px;white-space:nowrap;">SH:0</div></div></div></div><div id="trend-section" style="position:relative;border-top:1px solid #4169E1;margin-top:5px;padding-top:5px;"><div id="live-trend"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;flex-wrap:wrap;gap:2px;"><span id="trend-header-label" style="font-size:9px;font-weight:bold;color:#4169E1;">📈 TREND</span><div style="display:flex;gap:2px;flex-wrap:wrap;"><button class="trend-preset-btn" data-mode="last" style="background:#4169E1;border:1px solid #4169E1;color:#fff;border-radius:2px;cursor:pointer;font-size:7px;padding:1px 4px;">Last</button><button class="trend-preset-btn" data-mode="5min" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-muted);border-radius:2px;cursor:pointer;font-size:7px;padding:1px 4px;">5m</button><button class="trend-preset-btn" data-mode="15min" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-muted);border-radius:2px;cursor:pointer;font-size:7px;padding:1px 4px;">15m</button><button class="trend-preset-btn" data-mode="30min" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-muted);border-radius:2px;cursor:pointer;font-size:7px;padding:1px 4px;">30m</button><button class="trend-preset-btn" data-mode="1hour" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-muted);border-radius:2px;cursor:pointer;font-size:7px;padding:1px 4px;">1h</button><button class="trend-preset-btn" data-mode="start" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-muted);border-radius:2px;cursor:pointer;font-size:7px;padding:1px 4px;">Start</button><button id="btn-trend-auto" style="background:#32CD32;border:1px solid #32CD32;color:#fff;border-radius:2px;cursor:pointer;font-size:7px;padding:1px 4px;" title="Auto-escalation ON - Click to disable">AUTO</button></div></div><div id="trend-container" style="min-height:30px;"><div style="font-size:8px;color:var(--panel-faint);text-align:center;padding:8px;">Waiting for scan...</div></div></div><div id="playback-controls" style="display:none;position:absolute;top:5px;left:0;right:0;bottom:0;padding:0 2px;box-sizing:border-box;grid-template-rows:minmax(14px,1fr) 14px 12px;gap:2px;" aria-label="Playback controls"><div style="display:flex;flex-direction:column;justify-content:center;gap:4px;min-width:0;"><div id="playback-file-controls" style="display:none;align-items:center;gap:4px;min-width:0;"><div id="playback-room" style="display:none;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;line-height:12px;font-weight:bold;color:var(--panel-text);"></div></div><div style="display:flex;align-items:center;justify-content:space-between;gap:3px;"><strong id="playback-label" style="font-size:9px;color:var(--panel-warning);">PLAYBACK</strong><button id="playback-play" style="font-size:8px;line-height:12px;margin:0;padding:0 4px;background:#4169E1;color:white;border:1px solid var(--panel-divider);border-radius:2px;cursor:pointer;">Pause</button><select id="playback-speed" aria-label="Playback speed" style="font-size:8px;height:15px;margin:0;padding:0;background:var(--panel-button);color:var(--panel-text);border:1px solid var(--panel-divider);"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select><button type="button" id="btn-playback-library" aria-label="Open session library" aria-expanded="false" aria-controls="tierscope-session-tools" style="font-size:8px;line-height:12px;margin:0;padding:0 4px;background:var(--panel-button);color:var(--panel-accent);border:1px solid var(--panel-divider);border-radius:2px;cursor:pointer;">Library</button><button id="playback-return" style="font-size:8px;line-height:12px;margin:0;padding:0 4px;background:var(--panel-button);color:var(--panel-text);border:1px solid var(--panel-divider);border-radius:2px;cursor:pointer;">Return to Live</button></div></div><div style="display:flex;align-items:center;gap:4px;min-width:0;"><button type="button" id="playback-previous" title="Previous recorded sample (pauses Replay)" aria-label="Previous recorded sample" style="flex:0 0 20px;height:14px;padding:0;font-size:9px;line-height:10px;background:var(--panel-button);color:var(--panel-text);border:1px solid var(--panel-divider);border-radius:2px;cursor:pointer;">|&#9664;</button><input id="playback-scrubber" type="range" min="0" max="0" value="0" step="any" aria-label="Playback timeline" style="flex:1;min-width:0;width:100%;height:12px;margin:0;accent-color:var(--panel-warning);cursor:pointer;"><button type="button" id="playback-next" title="Next recorded sample (pauses Replay)" aria-label="Next recorded sample" style="flex:0 0 20px;height:14px;padding:0;font-size:9px;line-height:10px;background:var(--panel-button);color:var(--panel-text);border:1px solid var(--panel-divider);border-radius:2px;cursor:pointer;">&#9654;|</button></div><div id="playback-file-actions" style="display:flex;justify-content:center;min-width:0;"><div id="playback-position" style="font-size:9px;line-height:12px;text-align:center;white-space:nowrap;color:var(--panel-secondary);font-family:monospace;">00:00:00 / 00:00:00</div></div></div></div><div id="control-field" role="group" aria-label="Tracking controls" style="position:relative;margin-top:5px;padding:4px;background:rgba(65,105,225,0.15);border-radius:3px;border:1px solid #4169E1;"><div id="control-session-row" style="display:grid;grid-template-columns:minmax(78px,1fr) max-content minmax(0,1fr);align-items:center;gap:3px;margin-bottom:4px;white-space:nowrap;"><span aria-hidden="true" style="width:78px;"></span><span style="font-size:12px;color:var(--panel-warning);font-family:monospace;font-weight:bold;width:9ch;text-align:center;font-variant-numeric:tabular-nums;" id="control-tracking-timer">00:00:00</span><span style="min-width:0;text-align:right;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums;font-size:11px;color:var(--panel-positive);font-weight:bold;" id="control-next-scan">Next: 60s</span></div><div id="control-action-row" style="display:grid;grid-template-columns:minmax(max-content,1fr) auto minmax(0,1fr);align-items:center;gap:3px;"><div style="width:78px;height:14px;"><div id="control-session-buttons" style="position:absolute;top:4px;bottom:4px;left:4px;width:78px;display:grid;grid-template-columns:38px 38px;gap:2px;"><button type="button" id="btn-control-library" aria-expanded="false" aria-controls="tierscope-session-tools" aria-label="Open session library" title="Open model folders, session summaries, comparisons and backups" style="font-size:9px;font-weight:bold;line-height:12px;min-width:0;box-sizing:border-box;margin:0;padding:2px;background:rgba(255,105,180,0.2);color:var(--panel-accent);border:1px solid var(--panel-accent);border-radius:3px;cursor:pointer;">Library</button><button id="btn-replay" style="font-size:8px;line-height:10px;min-width:0;box-sizing:border-box;margin:0;padding:2px;background:var(--panel-button);color:var(--panel-text);border:1px solid var(--panel-divider);border-radius:3px;cursor:pointer;" title="Replay recorded history">Replay</button></div></div><div id="control-action-buttons" style="display:flex;gap:2px;align-items:center;"><button id="btn-control-auto" style="height:14px;box-sizing:border-box;line-height:10px;margin:0;background:#32CD32;border:none;color:#fff;border-radius:3px;cursor:pointer;font-size:8px;padding:2px 4px;min-width:24px;" title="Auto-Refresh ON">⏸</button><button type="button" id="btn-control-stop" aria-label="Stop this session" title="Stop this session and freeze its history and elapsed time" style="height:14px;box-sizing:border-box;line-height:10px;margin:0;background:#ff4444;border:none;color:#fff;border-radius:3px;cursor:pointer;font-size:8px;padding:2px 3px;white-space:nowrap;">■ Stop</button><button id="btn-main-reset" style="height:14px;box-sizing:border-box;line-height:10px;margin:0;background:#ff4444;border:none;color:#fff;border-radius:3px;cursor:pointer;font-size:8px;padding:2px 3px;display:flex;align-items:center;gap:2px;" title="Reset all tracking data"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12"/><path d="M3 3v9h9"/></svg>Reset</button></div><style>#dark-mode-control #dark-mode-track{position:relative;display:block;flex:0 0 22px;width:22px;height:12px;box-sizing:border-box;border:1px solid #9b701d;border-radius:7px;background:#e8b444;transition:background-color .16s ease;}#dark-mode-control #dark-mode-thumb{position:absolute;left:1px;top:1px;width:8px;height:8px;border-radius:50%;background:#4c3300;transform:translateX(10px);transition:transform .16s ease,background-color .16s ease;}#dark-mode-control #dark-mode-moon{color:var(--panel-muted);opacity:.55;}#dark-mode-control #dark-mode-sun{color:#825d00;}#dark-mode-control #dark-mode-toggle:checked~#dark-mode-track{background:#4169e1;border-color:#8ca8ff;}#dark-mode-control #dark-mode-toggle:checked~#dark-mode-track #dark-mode-thumb{transform:translateX(0);background:#fff;}#dark-mode-control #dark-mode-toggle:checked~#dark-mode-moon{color:#b4c5ff;opacity:1;}#dark-mode-control #dark-mode-toggle:checked~#dark-mode-sun{color:var(--panel-muted);opacity:.55;}#dark-mode-control #dark-mode-toggle:focus-visible~#dark-mode-track{outline:2px solid var(--panel-accent);outline-offset:2px;}@media(prefers-reduced-motion:reduce){#dark-mode-control #dark-mode-track,#dark-mode-control #dark-mode-thumb{transition:none;}}</style><label id="dark-mode-control" style="position:relative;justify-self:end;display:inline-flex;align-items:center;gap:2px;height:14px;cursor:pointer;line-height:1;"><input type="checkbox" role="switch" id="dark-mode-toggle" checked aria-label="Dark mode" style="position:absolute;inset:0;z-index:1;width:100%;height:100%;box-sizing:border-box;margin:0;padding:0;border:0;opacity:0;cursor:pointer;"><svg id="dark-mode-moon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true" style="flex:none;"><path d="M21 13a9 9 0 0 1-10-10 9 9 0 1 0 10 10Z"/></svg><span id="dark-mode-track" aria-hidden="true"><span id="dark-mode-thumb"></span></span><svg id="dark-mode-sun" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true" style="flex:none;"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg></label></div></div><div id="tracker-footer" style="display:grid;grid-template-columns:80px minmax(0,1fr) 60px;align-items:center;gap:4px;margin-top:5px;min-height:18px;"><div id="acquisition-status" style="width:100%;min-width:0;max-width:80px;font-variant-numeric:tabular-nums;font-size:7px;color:var(--panel-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="No accepted sample yet">No sample</div><div id="background-slider-controls" style="display:flex;align-items:center;gap:3px;min-width:0;"><svg width="11" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--panel-warning)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex-shrink:0;"><path d="M9 18h6M10 22h4M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 4H9c0-2 0-3-1-4Z"/></svg><input type="range" id="opacity-slider" min="30" max="100" value="95" aria-label="Background opacity" style="flex:1;min-width:0;width:100%;height:12px;margin:0;cursor:pointer;accent-color:#ff69b4;" title="Panel, Library and standard tier background opacity"><span id="opacity-value" style="font-size:8px;color:var(--panel-secondary);width:23px;flex:0 0 23px;text-align:right;font-variant-numeric:tabular-nums;">95%</span></div><div id="tierscope-logo" style="justify-self:end;display:flex;flex-direction:column;align-items:center;gap:0;white-space:nowrap;" onmouseenter="this.firstElementChild.style.opacity=1" onmouseleave="this.firstElementChild.style.opacity=0.6"><div style="display:flex;align-items:center;gap:3px;height:8px;opacity:0.6;transition:opacity 0.2s;"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#ff69b4" stroke-width="2" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg><span title="TierScope ' + runtime.TIERSCOPE_VERSION + `" style="font-size:7px;line-height:8px;font-family:'Courier New',monospace;font-weight:bold;color:var(--panel-accent);letter-spacing:1px;">TIERSCOPE</span></div><span id="tierscope-version" style="font:bold 8px/10px Arial,sans-serif;letter-spacing:.15px;color:var(--panel-secondary);">` + runtime.TIERSCOPE_VERSION + "</span></div></div></div>";
    div.innerHTML = html;
    document.body.appendChild(div);
    applyPanelTheme(false);
    document.getElementById("dark-mode-toggle").addEventListener("change", function() {
      selectPanelTheme(this.checked);
      try {
        GM_setValue(runtime.PANEL_THEME_KEY, runtime.isDarkMode ? "dark" : "bright");
      } catch (error) {
        log("Could not save theme preference");
      }
      applyPanelTheme(true);
    });
    var standardSize = document.getElementById("btn-standard-size");
    if (standardSize) {
      standardSize.onmousedown = function(event) {
        event.stopPropagation();
      };
      standardSize.onclick = function(event) {
        event.stopPropagation();
        restoreStandardSize();
      };
    }
    var btnMainReset = document.getElementById("btn-main-reset");
    var btnControlAuto = document.getElementById("btn-control-auto");
    var opacitySlider = document.getElementById("opacity-slider");
    if (btnMainReset) btnMainReset.addEventListener("click", resetAllTracking);
    if (btnControlAuto) btnControlAuto.addEventListener("click", toggleAutoRefresh);
    document.getElementById("btn-control-stop").onclick = function() {
      if (runtime.isStopped) return;
      if (!confirm("Stop this session?\n\nHistory will remain available for Replay and downloads, but this session cannot be resumed. Starting again begins a new session.")) return;
      stopTracking("manual");
    };
    updateContainerOpacity(runtime.panelBackgroundPercent);
    if (opacitySlider) {
      opacitySlider.addEventListener("input", function() {
        updateContainerOpacity(this.value);
      });
    }
    const modelFavorite = document.getElementById("btn-model-favorite");
    modelFavorite.onmousedown = (event) => event.stopPropagation();
    modelFavorite.onclick = (event) => {
      event.stopPropagation();
      const room2 = modelFavorite.dataset.favoriteRoom;
      try {
        if (room2 && room2 !== "unknown" && changeModelFavorite(room2)) {
          document.querySelectorAll("[data-favorite-room]").forEach((button) => {
            if (button.dataset.favoriteRoom === room2) paintFavoriteButton(button, room2, readModelFavorite(room2));
          });
          updateSessionToolsStatus(true);
        }
      } catch (error) {
        alert("Favorite could not be changed: " + error.message);
      }
    };
    bindPanelOptions();
    bindPlaybackControls();
    bindRowControls();
    updateReplayAvailability();
    setupDraggable();
    setupResizable();
    setupResizeHandler();
    var btnToggle = document.getElementById("btn-toggle");
    var btnExpand = document.getElementById("btn-expand");
    var btnAuto = document.getElementById("btn-auto");
    var btnTimerDown = document.getElementById("btn-timer-down");
    var btnTimerUp = document.getElementById("btn-timer-up");
    var miniMetricButton = document.getElementById("mini-metric");
    if (miniMetricButton) miniMetricButton.onclick = function() {
      cycleMiniMetric();
      try {
        GM_setValue(runtime.MINI_METRIC_KEY, runtime.miniMetric);
      } catch (error) {
        log("Could not save compact chart preference");
      }
      updateDisplay();
    };
    var miniSettingsButton = document.getElementById("mini-settings-toggle");
    var miniSettings = document.getElementById("mini-settings");
    if (miniSettingsButton && miniSettings) {
      let closeMiniSettings = function() {
        miniSettings.style.display = "none";
        miniSettingsButton.setAttribute("aria-expanded", "false");
        miniSettingsButton.focus();
      };
      var miniSettingsClose = document.getElementById("mini-settings-close");
      if (miniSettingsClose) miniSettingsClose.onclick = closeMiniSettings;
      miniSettingsButton.onclick = function() {
        if (miniSettings.style.display !== "none") {
          closeMiniSettings();
          return;
        }
        miniSettings.style.display = "block";
        miniSettingsButton.setAttribute("aria-expanded", "true");
        if (miniSettingsClose) miniSettingsClose.focus();
      };
      runtime.miniSettingsKeyHandler = function(event) {
        if (event.key === "Escape" && miniSettings.style.display !== "none") {
          event.preventDefault();
          event.stopPropagation();
          closeMiniSettings();
        }
      };
      document.addEventListener("keydown", runtime.miniSettingsKeyHandler, true);
    }
    if (btnToggle) btnToggle.onclick = toggleView;
    if (btnExpand) btnExpand.onclick = toggleView;
    if (btnAuto) btnAuto.onclick = toggleAutoRefresh;
    if (btnTimerDown) btnTimerDown.onclick = function() {
      adjustTimer(-10);
    };
    if (btnTimerUp) btnTimerUp.onclick = function() {
      adjustTimer(10);
    };
    var presetBtns = document.querySelectorAll(".timer-preset");
    for (var i = 0; i < presetBtns.length; i++) {
      presetBtns[i].onclick = function() {
        var time = parseInt(this.dataset.time);
        selectScanInterval(time);
        if (runtime.isAutoRefreshOn) {
          stopCountdown();
          resetCountdown();
          startCountdown();
        } else {
          resetCountdown();
        }
        updateCountdownDisplay();
        var allPresets = document.querySelectorAll(".timer-preset");
        for (var j = 0; j < allPresets.length; j++) {
          allPresets[j].style.background = "var(--panel-button)";
          allPresets[j].style.color = "var(--panel-muted)";
          allPresets[j].style.borderColor = "var(--panel-divider)";
        }
        this.style.background = "#ff69b4";
        this.style.color = "#fff";
        this.style.borderColor = "#ff69b4";
      };
    }
    var trendPresetBtns = document.querySelectorAll(".trend-preset-btn");
    for (var k = 0; k < trendPresetBtns.length; k++) {
      trendPresetBtns[k].onclick = function() {
        selectAutomaticTrends(false);
        updateAutoTrendButton();
        var mode = this.dataset.mode;
        setTrendComparisonMode(mode);
      };
    }
    var btnTrendAuto = document.getElementById("btn-trend-auto");
    if (btnTrendAuto) {
      btnTrendAuto.onclick = toggleAutoTrendEscalation;
    }
    updateTrendPresetButtons();
    updateAutoTrendButton();
    updateStopControls();
  }

  // src/startup.js
  function scheduleInit(delay) {
    var generation = runtime.initGuard;
    var url = location.href;
    setTimeout(function() {
      if (generation === runtime.initGuard && url === location.href) init();
    }, delay);
  }
  function init() {
    try {
      initializeAthGrace();
    } catch (error) {
      log("ATH grace initialization unavailable: " + error.message);
    }
    observeAthRoom();
    leavePlayback(false);
    var myGeneration = beginAcquisitionGeneration();
    log("Initializing... (generation " + myGeneration + ")");
    stopAcquisitionClock("healthCheckInterval");
    if (runtime.freshnessInterval) clearInterval(runtime.freshnessInterval);
    runtime.freshnessInterval = setInterval(function() {
      retrySamplePresentation();
      updateAcquisitionStatus();
      updateCountdownDisplay();
    }, 1e3);
    var isRoom = isBroadcastRoom();
    var modelName = getModelName();
    var loaded = false;
    if (isRoom && modelName !== "unknown") {
      loaded = loadSession(modelName);
    }
    if (!loaded) {
      selectPanelMinimized(!isRoom);
    } else {
      selectPanelMinimized(false);
    }
    configureSessionTracking(loaded, isRoom);
    try {
      createPanel();
    } catch (e) {
      log("Error creating panel: " + e);
      return;
    }
    var resizeHandle = document.getElementById("resize-handle");
    if (resizeHandle) {
      resizeHandle.style.display = runtime.isMinimized ? "none" : "block";
    }
    if (!runtime.isMinimized) {
      var fullView = document.getElementById("full-view");
      var miniView = document.getElementById("minimized-view");
      var toggleBtn = document.getElementById("btn-toggle");
      var container = document.getElementById("tracker-container");
      if (fullView) fullView.style.display = "block";
      if (miniView) miniView.style.display = "none";
      if (toggleBtn) toggleBtn.textContent = "−";
      if (container) container.style.width = runtime.BASE_WIDTH_FULL + "px";
      drawAllSparklines();
      updateDisplay();
    }
    updateDisplay();
    updateTrendDisplay();
    updateAcquisitionStatus();
    restorePanelGeometry();
    if (!isRoom) {
      stopCountdown();
      stopTrackingTimer();
      updateStopControls();
      updateCountdownDisplay();
      updateTrackingTimer();
      return;
    }
    if (runtime.isStopped) {
      updateStopControls();
      updateCountdownDisplay();
      updateTrackingTimer();
      return;
    }
    if (isRoom && isAbsencePaused()) {
      schedulePresenceAcquisition(Date.now(), readRequestPolicy().until);
      startCountdown();
      performScanThenReturn(true);
      updateTrackingTimer();
    } else if (isRoom && modelName !== "unknown" && !loaded && runtime.isAutoRefreshOn && !runtime.isPaused) {
      var initialScan = performScanThenReturn(true);
      var startupContext = { epoch: runtime.scanEpoch, generation: myGeneration, url: location.href };
      initialScan.then(function() {
        if (!isAcquisitionCurrent(startupContext) || !runtime.isAutoRefreshOn || runtime.isPaused) return;
        startTrackingTimer();
        startCountdown();
      }).catch(function(error) {
        log("Could not finish initial scan setup: " + error.message);
      });
    } else {
      var attempts = 0;
      var maxAttempts = 30;
      var checkInterval = setInterval(function() {
        if (myGeneration !== runtime.initGuard) {
          clearInterval(checkInterval);
          log("Init " + myGeneration + " superseded by newer generation");
          return;
        }
        attempts++;
        if (isRoom && modelName !== "unknown" || document.querySelector(runtime.DOM_SELECTORS.userListTab) || attempts >= maxAttempts) {
          clearInterval(checkInterval);
          if (!isRoom && attempts >= maxAttempts && !document.querySelector(runtime.DOM_SELECTORS.userListTab)) {
            log("UserListTab not found after 30s, giving up");
            var statusEl = document.getElementById("auto-status");
            if (statusEl) {
              statusEl.textContent = "No chat detected";
              statusEl.style.color = "var(--panel-negative)";
            }
            return;
          }
          if (!runtime.isPaused) {
            performScanThenReturn(true);
          }
          setTimeout(function() {
            if (myGeneration !== runtime.initGuard) return;
            if (runtime.isStopped) {
              updateStopControls();
              updateCountdownDisplay();
              return;
            }
            if (isAbsencePaused()) {
              startCountdown();
              updateStopControls();
              updateTrackingTimer();
            } else if (runtime.isAutoRefreshOn && !runtime.isPaused) {
              startTrackingTimer();
              startCountdown();
            } else {
              var btnAuto = document.getElementById("btn-auto");
              var btnControlAuto = document.getElementById("btn-control-auto");
              if (btnAuto) {
                btnAuto.style.background = "#ff4444";
                btnAuto.innerHTML = "▶";
                btnAuto.title = "Auto-Refresh OFF - Click to start";
              }
              if (btnControlAuto) {
                btnControlAuto.style.background = "#ff4444";
                btnControlAuto.innerHTML = "▶";
                btnControlAuto.title = "Auto-Refresh OFF - Click to start";
              }
              var statusEl2 = document.getElementById("auto-status");
              if (statusEl2) {
                statusEl2.textContent = runtime.isPaused ? "Paused (restored)" : "Paused";
                statusEl2.style.color = "var(--panel-negative)";
              }
              updateTrackingTimer();
            }
          }, 2002);
        }
      }, 1e3);
    }
    startAcquisitionClock("healthCheckInterval", function() {
      if (myGeneration === runtime.initGuard && !runtime.isStopped && !isAbsencePaused() && runtime.lastAcquisitionAttemptSource === "DOM" && !runtime.isScanning) {
        validateDOMHealth();
      }
    }, 3e4);
  }
  function checkUrlChange() {
    if (location.href !== runtime.lastUrl) {
      stopAthActivity();
      if (runtime.panelOptionsCleanup) {
        runtime.panelOptionsCleanup();
        runtime.panelOptionsCleanup = null;
      }
      leavePlayback(false);
      var oldModel = getModelNameFromUrl(runtime.lastUrl);
      if (oldModel && oldModel !== "unknown") {
        saveSession(oldModel, true);
      }
      runtime.lastUrl = location.href;
      runtime.activeSessionStorageKey = null;
      stopCountdown();
      resetAcquisitionForRoom();
      stopTrackingTimer();
      resetLiveSession("navigate");
      resetTrendPreferences();
      updateTrackingTimer();
      cleanupDragListeners();
      if (runtime.miniSettingsKeyHandler) {
        document.removeEventListener("keydown", runtime.miniSettingsKeyHandler, true);
        runtime.miniSettingsKeyHandler = null;
      }
      selectPanelScale(runtime.panelGeometry ? runtime.panelGeometry.scale : runtime.currentScale);
      updateAcquisitionStatus();
      scheduleInit(2002);
    }
  }

  // src/bootstrap.js
  function initializeRuntime() {
    runtime.TIERSCOPE_VERSION = "3.25.0";
    runtime.API_TIMEOUT_MS = 1e4;
    runtime.DEFAULT_API_INTERVAL_SECONDS = 60;
    runtime.DOM_FALLBACK_INTERVAL_SECONDS = 60;
    runtime.STORAGE_SCHEMA_VERSION = 2;
    runtime.STORAGE_KEY_PREFIX = "tierscope:v1:";
    runtime.STORAGE_MAX_AGE_MS = 3 * 60 * 60 * 1e3;
    runtime.STORAGE_HISTORY_SERIES = [
      "red",
      "green",
      "purple",
      "pink",
      "dark-blue",
      "light-blue",
      "gray",
      "female-trans",
      "withTokens",
      "total",
      "anonymous"
    ];
    runtime.STORAGE_NULLABLE_TIMES = [
      "withTokensHighTime",
      "totalHighTime",
      "anonHighTime",
      "femaleTransHighTime",
      "roomTotalHighTime",
      "trackingStartTime",
      "sessionStartedAt"
    ];
    runtime.sessionStorageStatus = /* @__PURE__ */ new Map();
    runtime.sessionRecordWarnings = /* @__PURE__ */ new Map();
    runtime.activeSessionStorageKey = null;
    runtime.TAB_RECORD_PREFIX = "tierscope:tab:v2:";
    runtime.ROOM_EPOCH_PREFIX = "tierscope:epoch:v2:";
    runtime.activeRoomEpoch = null;
    runtime.tabRecords = /* @__PURE__ */ new Map();
    runtime.sessionStorageNotice = "";
    runtime.sessionStartedAt = null;
    runtime.sessionStartEstimated = false;
    runtime.sessionHighs = {};
    runtime.ALL_TIME_PREFIX = "tierscope:ath:v1:";
    runtime.ALL_TIME_EPOCH_PREFIX = "tierscope:ath-epoch:v1:";
    runtime.HIGH_MODE_KEY = "tierscope:ui:highMode:v1";
    runtime.ALL_TIME_SERIES = runtime.STORAGE_HISTORY_SERIES.concat(["roomTotal"]);
    runtime.allTimeCache = /* @__PURE__ */ new Map();
    runtime.highMode = "sh";
    try {
      if (GM_getValue(runtime.HIGH_MODE_KEY, "sh") === "ath") runtime.highMode = "ath";
    } catch (error) {
    }
    runtime.gifExportJob = null;
    runtime.DOM_SELECTORS = {
      userListTab: "#UserListTab",
      usernameElements: [
        '[data-testid="username-label"]',
        '[data-testid="username"]',
        ".username",
        'a[href^="/b/"]',
        'a[href^="/p/"]'
      ],
      roomTotal: [
        '[data-testid="users-tab-default"]',
        ".users-tab",
        '[data-paction-name="USERS"]',
        'button[data-tab="users"]',
        '[class*="users"]'
      ],
      tabs: {
        users: [
          '[data-tab="users"]',
          '[data-testid="users-tab"]',
          '[data-testid="users-tab-default"]',
          ".users-tab",
          'button[data-paction-name="USERS"]'
        ],
        chat: [
          '[data-tab="chat"]',
          '[data-testid="chat-tab"]',
          '[data-testid="chat-tab-default"]',
          ".chat-tab",
          'button[data-paction-name="CHAT"]'
        ]
      }
    };
    runtime.domHealthStatus = {
      lastCheck: 0,
      userListTabFound: false,
      consecutiveFailures: 0,
      isHealthy: true
    };
    runtime.healthCheckInterval = null;
    runtime.initGuard = 0;
    runtime.urlCheckInterval = null;
    runtime.scanEpoch = 0;
    runtime.lastAcceptedAcquisition = null;
    runtime.restoredDisplayFrame = null;
    runtime.lastAcquisitionAttemptSource = "API";
    runtime.domFallbackReadyAtByRoom = /* @__PURE__ */ new Map();
    runtime.freshnessInterval = null;
    runtime.nextScanAt = 0;
    runtime.windowResizeHandler = null;
    runtime.miniSettingsKeyHandler = null;
    runtime.previousCounts = {
      "red": 0,
      "green": 0,
      "purple": 0,
      "pink": 0,
      "dark-blue": 0,
      "light-blue": 0,
      "gray": 0,
      "female-trans": 0,
      "withTokens": 0,
      "total": 0,
      "anonymous": 0
    };
    runtime.hasTrendBaseline = false;
    runtime.trendComparisonMode = "last";
    runtime.autoTrendEscalation = true;
    runtime.newHighTiers = {};
    runtime.highPulseAnimations = /* @__PURE__ */ new Map();
    runtime.highPulseMotion = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    if (runtime.highPulseMotion) {
      runtime.motionChanged = function(event) {
        if (event.matches) cancelHighPulses();
      };
      if (runtime.highPulseMotion.addEventListener) runtime.highPulseMotion.addEventListener("change", runtime.motionChanged);
      else if (runtime.highPulseMotion.addListener) runtime.highPulseMotion.addListener(runtime.motionChanged);
    }
    runtime.users = /* @__PURE__ */ new Map();
    runtime.previousUserCount = 0;
    runtime.previousRoomTotal = 0;
    runtime.isMinimized = true;
    runtime.roomTotal = 0;
    runtime.roomTotalHigh = 0;
    runtime.isDragging = false;
    runtime.dragOffsetX = 0;
    runtime.dragOffsetY = 0;
    runtime.countdownInterval = null;
    runtime.isAutoRefreshOn = true;
    runtime.isScanning = false;
    runtime.countdownSeconds = runtime.DEFAULT_API_INTERVAL_SECONDS;
    runtime.scanIntervalSeconds = runtime.DEFAULT_API_INTERVAL_SECONDS;
    runtime.trackingStartTime = null;
    runtime.trackingTimerInterval = null;
    runtime.isPaused = false;
    runtime.isStopped = false;
    runtime.stoppedAt = null;
    runtime.stopReason = null;
    runtime.broadcasterAbsence = { since: null, missing: 0 };
    runtime.absencePausedAt = null;
    runtime.absenceOverrideActive = false;
    runtime.lastScheduledIntervalSeconds = runtime.DEFAULT_API_INTERVAL_SECONDS;
    runtime.ABSENCE_PAUSE_MS = 15 * 60 * 1e3;
    runtime.ABSENCE_CHECK_SECONDS = 60;
    runtime.ABSENCE_STOP_MS = 3 * 60 * 60 * 1e3;
    runtime.pausedElapsedTime = 0;
    runtime.dragListeners = [];
    runtime.isResizing = false;
    runtime.resizeStartX = 0;
    runtime.resizeStartY = 0;
    runtime.resizeStartWidth = 0;
    runtime.resizeStartHeight = 0;
    runtime.currentScale = 1;
    runtime.PANEL_GEOMETRY_KEY = "tierscope:ui:geometry:v1";
    runtime.panelGeometry = loadPanelGeometry();
    runtime.PANEL_THEME_KEY = "tierscope:ui:theme:v1";
    runtime.isDarkMode = true;
    try {
      runtime.isDarkMode = GM_getValue(runtime.PANEL_THEME_KEY, "dark") !== "bright";
    } catch (error) {
    }
    runtime.PANEL_THEME_COLORS = {
      rgb: ["20,20,30", "248,249,252"],
      text: ["#ffffff", "#202330"],
      muted: ["#aaa", "#596174"],
      secondary: ["#ddd", "#41485a"],
      subtle: ["#888", "#626978"],
      faint: ["#666", "#687183"],
      button: ["#333", "#e3e6ed"],
      "button-strong": ["#444", "#d7dce6"],
      divider: ["#555", "#b6bdca"],
      "row-rgb": ["255,255,255", "0,0,0"],
      settings: ["#20202b", "#f0f2f7"],
      solid: ["#14141e", "#f8f9fc"],
      tooltip: ["#171722", "#ffffff"],
      positive: ["#32CD32", "#23751f"],
      warning: ["#ffd43b", "#825d00"],
      gap: ["#e89b45", "#ad5f10"],
      negative: ["#ff4444", "#b52332"],
      paused: ["#ff9999", "#b52332"],
      "delta-up": ["#69BE45", "#357b21"],
      "delta-down": ["#ff7777", "#b52332"],
      accent: ["#ff69b4", "#b42370"]
    };
    runtime.MINI_METRIC_KEY = "tierscope:ui:miniMetric:v1";
    runtime.MINI_METRICS = ["room", "withTokens", "total"];
    runtime.miniMetric = "room";
    try {
      runtime.savedMiniMetric = GM_getValue(runtime.MINI_METRIC_KEY, "room");
      if (runtime.MINI_METRICS.indexOf(runtime.savedMiniMetric) !== -1) runtime.miniMetric = runtime.savedMiniMetric;
    } catch (error) {
    }
    runtime.BASE_WIDTH_MINI = 140;
    runtime.BASE_WIDTH_FULL = 280;
    runtime.roomTotalHighTime = null;
    runtime.tierHighTimes = {};
    runtime.withTokensHighTime = null;
    runtime.totalHighTime = null;
    runtime.anonHighTime = null;
    runtime.femaleTransHighTime = null;
    runtime.pendingHistoryGap = false;
    runtime.history = {
      timestamps: [],
      breaks: [],
      "red": [],
      "green": [],
      "purple": [],
      "pink": [],
      "dark-blue": [],
      "light-blue": [],
      "gray": [],
      "female-trans": [],
      "withTokens": [],
      "total": [],
      "anonymous": []
    };
    runtime.MAX_HISTORY_LENGTH = 1e4;
    runtime.TIERS = {
      "red": { name: "Red", desc: "", color: "#DC0000" },
      "green": { name: "Green", desc: "", color: "#69BE45" },
      "purple": { name: "Dark Purple", desc: "", color: "#804BAA" },
      "pink": { name: "Light Purple", desc: "", color: "#BE6AFF" },
      "dark-blue": { name: "Dark Blue", desc: "", color: "#393993" },
      "light-blue": { name: "Light Blue", desc: "", color: "#1E5FC8" },
      "gray": { name: "Grey", desc: "", color: "#6B6A6F" },
      "female-trans": { name: "♀⚧", desc: "", color: "#FF1493" }
    };
    runtime.COLLAPSED_ROWS_KEY = "tierscope:ui:collapsedRows:v1";
    runtime.PANEL_ROWS = Object.keys(runtime.TIERS).map(function(key) {
      return {
        key,
        label: key === "red" ? "Moderators" : key === "green" ? "Fan Club" : key === "female-trans" ? "Female/Trans" : runtime.TIERS[key].name,
        color: runtime.TIERS[key].color,
        height: 28,
        display: "flex"
      };
    }).concat([
      { key: "withtokens", label: "With Tokens", icon: "💎", color: "var(--panel-warning)", height: 28, display: "flex" },
      { key: "total", label: "Registered", icon: "📊", color: "#ffffff", height: 28, display: "flex" },
      { key: "anon", label: "Anonymous", icon: "👻", color: "#888888", height: 50, display: "block" },
      { key: "roomTotal", label: "Room Total", icon: "👥", color: "var(--panel-accent)", height: 28, display: "flex" }
    ]);
    runtime.collapsedRows = loadCollapsedRows();
    runtime.panelChartHeights = {};
    runtime.rowLayoutNeedsMeasure = true;
    runtime.panelChartRegionHeight = null;
    runtime.chartLayoutRevision = 0;
    runtime.TREND_ICONS = {
      up: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--panel-positive)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>',
      down: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--panel-negative)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>',
      stable: '<svg width="16" height="16" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="var(--panel-warning)"/></svg>'
    };
    runtime.TREND_PRESETS = {
      "last": { label: "Last", ms: 0 },
      "5min": { label: "5m", ms: 5 * 60 * 1e3 },
      "15min": { label: "15m", ms: 15 * 60 * 1e3 },
      "30min": { label: "30m", ms: 30 * 60 * 1e3 },
      "1hour": { label: "1h", ms: 60 * 60 * 1e3 },
      "start": { label: "Start", ms: -1 }
    };
    runtime.presentationMode = "LIVE";
    runtime.playback = null;
    runtime.sessionFileLoadGeneration = 0;
    runtime.panelOptionsCleanup = null;
    runtime.SESSION_FILE_FORMAT = "TierScopeSession";
    runtime.SESSION_FILE_VERSION = 1;
    runtime.SESSION_FILE_MAX_BYTES = 8 * 1024 * 1024;
    runtime.CHART_WINDOW_KEY = "tierscope:ui:chartWindow:v1";
    runtime.CHART_WINDOWS = { full: 0, fourHours: 240 * 6e4, twoHours: 120 * 6e4, hour: 60 * 6e4, halfHour: 30 * 6e4, quarter: 15 * 6e4 };
    runtime.chartWindowMode = "full";
    try {
      runtime.savedWindow = GM_getValue(runtime.CHART_WINDOW_KEY, "full");
      if (typeof runtime.savedWindow === "string" && hasStorageField(runtime.CHART_WINDOWS, runtime.savedWindow)) runtime.chartWindowMode = runtime.savedWindow;
    } catch (error) {
    }
    runtime.playbackLayoutState = null;
    runtime.GIF_WIDTH = 480;
    runtime.GIF_HEIGHT = 640;
    runtime.GIF_MAX_FRAMES = 60;
    runtime.GIF_DURATION_CS = 1e3;
    runtime.GIF_GAP_COLOR_INDEX = 12;
    runtime.GIF_FONT = {
      " ": [0, 0, 0, 0, 0, 0, 0],
      A: [14, 17, 17, 31, 17, 17, 17],
      B: [30, 17, 17, 30, 17, 17, 30],
      C: [14, 17, 16, 16, 16, 17, 14],
      D: [30, 17, 17, 17, 17, 17, 30],
      E: [31, 16, 16, 30, 16, 16, 31],
      F: [31, 16, 16, 30, 16, 16, 16],
      G: [14, 17, 16, 23, 17, 17, 15],
      H: [17, 17, 17, 31, 17, 17, 17],
      I: [14, 4, 4, 4, 4, 4, 14],
      J: [7, 2, 2, 2, 18, 18, 12],
      K: [17, 18, 20, 24, 20, 18, 17],
      L: [16, 16, 16, 16, 16, 16, 31],
      M: [17, 27, 21, 21, 17, 17, 17],
      N: [17, 25, 21, 19, 17, 17, 17],
      O: [14, 17, 17, 17, 17, 17, 14],
      P: [30, 17, 17, 30, 16, 16, 16],
      Q: [14, 17, 17, 17, 21, 18, 13],
      R: [30, 17, 17, 30, 20, 18, 17],
      S: [15, 16, 16, 14, 1, 1, 30],
      T: [31, 4, 4, 4, 4, 4, 4],
      U: [17, 17, 17, 17, 17, 17, 14],
      V: [17, 17, 17, 17, 17, 10, 4],
      W: [17, 17, 17, 21, 21, 21, 10],
      X: [17, 17, 10, 4, 10, 17, 17],
      Y: [17, 17, 10, 4, 4, 4, 4],
      Z: [31, 1, 2, 4, 8, 16, 31],
      "0": [14, 17, 19, 21, 25, 17, 14],
      "1": [4, 12, 4, 4, 4, 4, 14],
      "2": [14, 17, 1, 2, 4, 8, 31],
      "3": [30, 1, 1, 14, 1, 1, 30],
      "4": [2, 6, 10, 18, 31, 2, 2],
      "5": [31, 16, 16, 30, 1, 1, 30],
      "6": [14, 16, 16, 30, 17, 17, 14],
      "7": [31, 1, 2, 4, 8, 8, 8],
      "8": [14, 17, 17, 14, 17, 17, 14],
      "9": [14, 17, 17, 15, 1, 1, 14],
      ":": [0, 4, 4, 0, 4, 4, 0],
      "/": [1, 2, 2, 4, 8, 8, 16],
      "-": [0, 0, 0, 31, 0, 0, 0],
      ".": [0, 0, 0, 0, 0, 6, 6],
      "+": [0, 4, 4, 31, 4, 4, 0],
      "?": [14, 17, 1, 2, 4, 0, 4]
    };
    runtime.REQUEST_POLICY_KEY = "tierscope:requests:v1:" + location.origin;
    runtime.requestPolicyUnsaved = false;
    runtime.requestPolicyCache = { until: 0, failures: 0, blocked: 0, status: 0, revision: "" };
    runtime.chartTimeCache = /* @__PURE__ */ new WeakMap();
    runtime.panelBackgroundPercent = 95;
    runtime.lastUrl = location.href;
    initializeLiveSession(runtime);
    initializePlaybackState(runtime, { start: (tick) => setInterval(tick, 50), stop: (handle) => clearInterval(handle) });
    initializeAcquisitionState(runtime, { start: (tick, delay) => setInterval(tick, delay), stop: (handle) => clearInterval(handle) });
    initializePanelPreferences(runtime);
    initializeLifecycle({ scan: performScanThenReturn });
    initializePresentation({ refreshOptions: updatePanelOptions, refreshReplayAvailability: updateReplayAvailability, refreshCountdown: updateCountdownDisplay });
    runtime.urlCheckInterval = setInterval(checkUrlChange, 500);
    window.addEventListener("beforeunload", function() {
      stopAthActivity();
      cancelGifExport();
      leavePlayback(false);
      var modelName = getModelName();
      if (modelName && modelName !== "unknown") {
        saveSession(modelName, true);
      }
    });
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function() {
        scheduleInit(2e3);
      });
    } else {
      scheduleInit(2e3);
    }
    log("Script loaded and waiting for init");
    return {
      downloadTrackingReport,
      downloadTrackingCSV,
      resetAllTracking,
      getHealth: function() {
        return runtime.domHealthStatus;
      },
      parseGetChatUserListResponse,
      generateGifFromHistory,
      cancelGifExport
    };
  }

  // src/main.js
  var ViewerTracker = initializeRuntime();
})();
