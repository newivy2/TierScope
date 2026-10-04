// ==UserScript==
// @name         TierScope - Chaturbate Viewers Visualizer
// @namespace    http://tampermonkey.net/
// @version      3.10.0
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
      get: (room) => acquisitionState.domFallbackReadyAtByRoom.get(room),
      has: (room) => acquisitionState.domFallbackReadyAtByRoom.has(room),
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
  function beginAcquisition(url, room, policy, now, stopped) {
    if (acquisitionState.isScanning || stopped || policy.blocked || policy.until > now) return null;
    acquisitionState.isScanning = true;
    return Object.freeze({ epoch: ++acquisitionState.scanEpoch, generation: acquisitionState.initGuard, url, room, policyRevision: policy.revision });
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
  function deferDOMFallback(room, readyAt) {
    const key = room.toLowerCase();
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

  // src/highs-store.js
  function allTimeRoom(room) {
    return typeof room === "string" && /^[a-z0-9_-]{1,100}$/i.test(room) && room.toLowerCase() !== "unknown" ? room.toLowerCase() : null;
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
  function validateAllTimeRecord(data, room) {
    if (!isStorageObject(data) || data.schemaVersion !== 1 || data.room !== room || typeof data.epoch !== "string" || !isStorageObject(data.highs)) throw new Error("Unsupported all-time record");
    runtime.ALL_TIME_SERIES.forEach(function(key) {
      var high = data.highs[key];
      if (!isStorageObject(high) || !Number.isSafeInteger(high.value) || high.value < 0 || !(high.time === null || isStorageTimestamp(high.time)) || [null, "live", "saved", "file"].indexOf(high.source) === -1 || high.source === null && (high.value !== 0 || high.time !== null)) throw new Error("Invalid all-time high");
    });
  }
  function readAllTimeHighs(room) {
    room = allTimeRoom(room);
    var previous = runtime.allTimeCache.get(room);
    var state = { room, epoch: "initial", highs: emptyAllTimeHighs(), keys: [], skipped: 0, error: "", pending: false };
    if (!room) return state;
    try {
      state.epoch = GM_getValue(runtime.ALL_TIME_EPOCH_PREFIX + room, "initial");
      if (typeof state.epoch !== "string") throw new Error("Invalid all-time records generation");
      var prefix = runtime.ALL_TIME_PREFIX + room + ":";
      GM_listValues().filter(function(key) {
        return key.indexOf(prefix) === 0;
      }).forEach(function(key) {
        try {
          var raw = GM_getValue(key, void 0);
          if (raw === void 0) return;
          var data = JSON.parse(raw);
          validateAllTimeRecord(data, room);
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
    runtime.allTimeCache.set(room, state);
    return state;
  }
  function storeAllTimeHighs(room, incoming) {
    var state = readAllTimeHighs(room);
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
      GM_setValue(key, JSON.stringify(data));
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
  function beginAcceptedSample(snapshot, room, now, policy) {
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
          room,
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

  // src/diagnostics.js
  function diagnostic(level, message, ...details) {
    try {
      console[level]("[TierScope " + runtime.TIERSCOPE_VERSION + "] " + message, ...details);
    } catch (error) {
    }
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
    var room = displayedHighRoom();
    return runtime.allTimeCache.get(room) || readAllTimeHighs(room);
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
        var raisedHigh = runtime.sessionHighs[key].value > (previousHigh ? previousHigh.value : 0);
        if (runtime.highMode === "ath") {
          var high = displayedAllTimeState().highs[key], before = priorState.allTimeHighs[key];
          var current = runtime.history[key][runtime.history[key].length - 1];
          var oldValue = priorState.history[key][priorState.history[key].length - 1];
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
  function initializePlaybackState(target, clock) {
    playbackState = {
      playback: target.playback,
      presentationMode: target.presentationMode,
      sessionFileLoadGeneration: target.sessionFileLoadGeneration
    };
    playbackClock = clock;
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
    for (const user of session.users.values()) {
      if (counts[user.tier] !== void 0) counts[user.tier]++;
      if (user.gender === "female" || user.gender === "trans") counts["female-trans"]++;
    }
    const total = session.users.size;
    const withTokens = tiers.filter((key) => key !== "gray" && key !== "female-trans").reduce((sum, key) => sum + counts[key], 0);
    const acquisition = session.lastAcceptedAcquisition;
    const anonymousCount = acquisition && acquisition.source === "API" ? acquisition.api.anonymousCount : Math.max(0, session.roomTotal - total);
    return {
      counts,
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

  // src/session-health.js
  var sessionSaveStates = /* @__PURE__ */ new Map();
  function noteSessionSave(room, error = "") {
    const previous = sessionSaveStates.get(room);
    sessionSaveStates.set(room, { savedAt: error ? previous ? previous.savedAt : null : Date.now(), error });
  }
  function getSessionSaveState(room) {
    return sessionSaveStates.get(room) || { savedAt: null, error: "" };
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
    var warning = sessionSaveWarningModel(getSessionSaveState(getModelName()));
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
    var warning = sessionSaveWarningModel(getSessionSaveState(getModelName()));
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
    return freezeRecordingData({
      counts: __spreadValues({}, frame.counts),
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
      miniMetric: runtime.miniMetric,
      highMode: runtime.highMode,
      textColor: themeColor("text"),
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
      historyLength: runtime.history.timestamps.length,
      comparison: __spreadProps(__spreadValues({}, comparison), { counts: comparison.counts ? __spreadValues({}, comparison.counts) : null }),
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
    var header = document.getElementById("header-text");
    if (header) {
      header.textContent = (frame.stopped ? "STOPPED: " : frame.isRestored ? "SAVED: " : "") + compactNumber(frame.fullRoomTotal);
      header.title = frame.roomName + " — Room total: " + frame.fullRoomTotal.toLocaleString() + "; " + displayHighDescription(displayHigh(frame, "roomTotal", frame.fullRoomTotal)) + (roomChange ? "; change: " + roomChange + " versus " + mode : "");
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
    var color = frame.miniMetric === "withTokens" ? "#ff69b4" : frame.miniMetric === "total" ? frame.textColor : "#69BE45";
    ctx.strokeStyle = color;
    ctx.save();
    ctx.beginPath();
    ctx.rect(2, 0, width - 2, height);
    ctx.clip();
    drawCanvasChart(ctx, points, color);
    ctx.restore();
    renderStatus(document.getElementById("mini-freshness"), frame.freshness);
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
    var withTokensPct = total > 0 ? Math.round(withTokens / total * 100) + "%" : "0%";
    var registeredPct = fullRoomTotal > 0 ? Math.round(total / fullRoomTotal * 100) + "%" : "0%";
    var headerText = document.getElementById("header-text");
    if (headerText) {
      var roomHigh = displayHigh(frame, "roomTotal", fullRoomTotal);
      var displayedRoomHigh = displayHighLabel(roomHigh);
      headerText.title = (frame.isPlayback && frame.replayRoom ? "Replay: " + frame.replayRoom + " · " : "") + "Room total: " + fullRoomTotal.toLocaleString() + " · " + displayHighDescription(roomHigh);
      if (frame.stopped && !frame.isPlayback) {
        headerText.textContent = "STOPPED: " + fullRoomTotal.toLocaleString() + " (" + displayedRoomHigh + ")";
      } else if (frame.minimized) {
        headerText.textContent = (frame.isPlayback ? "PLAYBACK: " : frame.isRestored ? "SAVED: " : "") + fullRoomTotal.toLocaleString() + " (" + displayedRoomHigh + ")";
      } else {
        headerText.textContent = (frame.isPlayback ? frame.imported ? "FILE: " : "PLAYBACK: " : frame.isRestored ? "SAVED: " : "USERS: ") + fullRoomTotal.toLocaleString() + " (" + displayedRoomHigh + ")";
      }
    }
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
          withTokensRowEl.style.background = "rgba(255,105,180,0.15)";
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
      var value = row.key === "withtokens" ? frame.withTokens : row.key === "total" ? frame.total : row.key === "anon" ? frame.anonymousCount : frame.counts[row.key];
      var historyKey = row.key === "withtokens" ? "withTokens" : row.key === "anon" ? "anonymous" : row.key;
      var high = displayHigh(frame, historyKey, value);
      var context = frame.isPlayback ? "Replay" : frame.isRestored ? "Saved sample" : "Latest sample";
      button.title = row.label + ": " + value.toLocaleString() + " (" + displayHighLabel(high) + "). " + displayHighDescription(high) + ". " + context + ". Click to restore row.";
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
    function buildTrendItem(name, current, prev, isSpecial, isLarge) {
      var diff = current - prev;
      var deltaText = diff !== 0 ? diff > 0 ? "+" + diff : diff : "";
      var deltaColor = diff > 0 ? "var(--panel-positive)" : "var(--panel-negative)";
      var bgStyle;
      if (diff > 0) {
        bgStyle = "background:rgba(50, 205, 50, 0.22);";
      } else if (diff < 0) {
        bgStyle = "background:rgba(255, 85, 85, 0.15);";
      } else {
        bgStyle = "background:rgba(255, 215, 0, 0.15);";
      }
      if (isSpecial) bgStyle += "border:1px solid #ff69b4;";
      var padding = isLarge ? "6px 12px" : "2px 6px";
      var fontSize = isLarge ? "12px" : "10px";
      var deltaFont = fontSize;
      if (deltaText) {
        var dlen = String(Math.abs(diff)).length;
        if (dlen >= 4) deltaFont = "8px";
        else if (dlen === 3) deltaFont = "10px";
      }
      return '<div style="display:flex;align-items:center;gap:4px;' + bgStyle + "padding:" + padding + ';border-radius:4px;"><span style="font-size:' + fontSize + ';">' + name + "</span>" + (deltaText ? '<span style="font-size:' + deltaFont + ";font-weight:bold;color:" + deltaColor + ';">' + deltaText + "</span>" : "") + "</div>";
    }
    var headerLabel = "📈 TREND";
    var shortLabel = getShortLabel();
    var html = '<div style="display:flex;justify-content:center;gap:6px;padding:4px 0;">';
    html += buildTrendItem(model.tierMarkers["red"], counts["red"] || 0, comparisonCounts["red"] || 0, false, false);
    html += buildTrendItem(model.tierMarkers["green"], counts["green"] || 0, comparisonCounts["green"] || 0, false, false);
    html += buildTrendItem(model.tierMarkers["purple"], counts["purple"] || 0, comparisonCounts["purple"] || 0, false, false);
    html += buildTrendItem(model.tierMarkers["pink"], counts["pink"] || 0, comparisonCounts["pink"] || 0, false, false);
    html += "</div>";
    html += '<div style="display:flex;justify-content:center;gap:6px;padding:4px 0;">';
    html += buildTrendItem(model.tierMarkers["dark-blue"], counts["dark-blue"] || 0, comparisonCounts["dark-blue"] || 0, false, false);
    html += buildTrendItem(model.tierMarkers["light-blue"], counts["light-blue"] || 0, comparisonCounts["light-blue"] || 0, false, false);
    html += buildTrendItem(model.tierMarkers["gray"], counts["gray"] || 0, comparisonCounts["gray"] || 0, false, false);
    html += buildTrendItem(model.tierMarkers["female-trans"], counts["female-trans"] || 0, comparisonCounts["female-trans"] || 0, false, false);
    html += "</div>";
    html += '<div style="display:flex;justify-content:center;gap:8px;padding:4px 0;">';
    html += buildTrendItem("💎", withTokens || 0, comparisonCounts.withTokens || 0, true, true);
    html += buildTrendItem("📊", total || 0, comparisonCounts.total || 0, false, true);
    html += buildTrendItem("👻", anonymousCount || 0, comparisonCounts.anonymous || 0, false, true);
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
        displayHistory[key],
        row.key === "total" ? themeColor("text") : row.color,
        runtime.panelChartHeights[row.key] || row.height,
        displayHistory.timestamps,
        breaks,
        lastIndex,
        row.label,
        replayProgress
      );
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
    if (button) button.disabled = true;
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
      if (button) button.disabled = button.dataset.currentAvailable === "false";
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

  // src/session-capture.js
  function captureSessionFile() {
    if (isPlaybackCurrent(runtime.playback) && runtime.playback.archive) return runtime.playback.archive;
    if (!runtime.history.timestamps.length || runtime.activeSessionStorageKey !== getStorageKey(getModelName()) || location.href !== runtime.lastUrl) {
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
      room: getModelName(),
      session: data
    });
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
    var room = document.getElementById("playback-room");
    if (room) {
      var sourceRoom = runtime.playback.imported && runtime.playback.archive ? runtime.playback.archive.room : "";
      room.textContent = sourceRoom ? "Room: " + sourceRoom : "";
      room.title = sourceRoom ? "Saved session from " + sourceRoom : "";
      room.style.display = sourceRoom ? "block" : "none";
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
    var room = displayedHighRoom();
    if (!room || !confirm("Clear all-time highs for " + room + "?\n\nSession history and saved files will remain. New accepted samples will start new all-time records.")) return;
    try {
      var prefix = runtime.ALL_TIME_PREFIX + room + ":";
      var keys = GM_listValues().filter(function(key) {
        return key.indexOf(prefix) === 0;
      });
      GM_setValue(runtime.ALL_TIME_EPOCH_PREFIX + room, makeStorageId());
      runtime.allTimeCache.delete(room);
      keys.forEach(function(key) {
        try {
          GM_deleteValue(key);
        } catch (error) {
        }
      });
      var state = readAllTimeHighs(room);
      if (isPlaybackCurrent(runtime.playback)) setPlaybackAllTimeState(runtime.playback, state);
      repaintHighMode();
      setAllTimeActionStatus("All-time highs cleared for " + room + ".");
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
  function recordAcceptedAllTimeHighs(room) {
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
    storeAllTimeHighs(room, incoming);
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
    return /* @__PURE__ */ new Set(["red", "green"]);
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

  // src/session-library.js
  var LIBRARY_PREFIX = "tierscope:library:v1:";
  var LIBRARY_MAX_COUNT = 500;
  var LIBRARY_MAX_BYTES = 25 * 1024 * 1024;
  function libraryRecordKey(id) {
    if (typeof id !== "string" || !/^[a-z0-9_-]{1,100}$/i.test(id)) throw new Error("Invalid library record.");
    return LIBRARY_PREFIX + id;
  }
  function libraryTitle(title) {
    if (typeof title !== "string" || title.length > 80 || /[\x00-\x1f]/.test(title)) throw new Error("Use a title of up to 80 characters.");
    return title.trim();
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
  function readSessionLibrary() {
    const entries = [], damaged = [], sessions = /* @__PURE__ */ new Map();
    let bytes = 0;
    for (const key of GM_listValues().filter((key2) => key2.startsWith(LIBRARY_PREFIX))) {
      const raw = GM_getValue(key, null);
      if (raw === null) continue;
      bytes += new Blob([typeof raw === "string" ? raw : JSON.stringify(raw)]).size;
      try {
        const record = JSON.parse(raw);
        if (record.schemaVersion !== 1 || !Number.isSafeInteger(record.addedAt) || record.addedAt < 0) throw new Error("Invalid library record.");
        const id = key.slice(LIBRARY_PREFIX.length);
        libraryRecordKey(id);
        const entry = { id, title: libraryTitle(record.title), addedAt: record.addedAt, archive: validateSessionFile(record.archive), records: [{ key, value: raw }] };
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
        damaged.push(key);
      }
    }
    entries.sort((a, b) => b.archive.session.history.timestamps[0] - a.archive.session.history.timestamps[0] || b.addedAt - a.addedAt || a.id.localeCompare(b.id));
    return { entries, damaged, bytes, count: entries.length + damaged.length };
  }
  function planLibraryAdditions(incoming, library = readSessionLibrary()) {
    const entries = library.entries.slice(), writes = [];
    let bytes = library.bytes;
    for (const entry of incoming) {
      const archive = validateSessionFile(entry.archive);
      const index = entries.findIndex((saved) => compareLibrarySessions(saved.archive, archive) !== null);
      const previous = index >= 0 ? entries[index] : null;
      if (previous && compareLibrarySessions(previous.archive, archive) !== 1) continue;
      const title = previous ? previous.title : libraryTitle(entry.title || archive.room);
      const id = makeStorageId();
      const addedAt = previous ? previous.addedAt : Date.now();
      const raw = JSON.stringify({ schemaVersion: 1, addedAt, title, archive }), key = libraryRecordKey(id);
      bytes += new Blob([raw]).size;
      writes.push({ key, value: raw, id, updated: !!previous, replaces: previous ? previous.records : [] });
      const next = { id, title, addedAt, archive, records: [{ key, value: raw }] };
      if (previous) entries[index] = next;
      else entries.push(next);
    }
    if (library.count - library.entries.length + entries.length > LIBRARY_MAX_COUNT || bytes > LIBRARY_MAX_BYTES) {
      throw new Error("Library full (" + LIBRARY_MAX_COUNT + " recordings / " + LIBRARY_MAX_BYTES / 1024 / 1024 + " MB). Export and remove recordings before adding more.");
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
  function keepSessionInLibrary(archive, title = "") {
    const library = readSessionLibrary(), clean = validateSessionFile(archive);
    const writes = planLibraryAdditions([{ archive: clean, title }], library);
    if (!writes.length) return {
      added: false,
      updated: false,
      id: library.entries.find((entry) => compareLibrarySessions(entry.archive, clean) !== null).id
    };
    try {
      GM_setValue(writes[0].key, writes[0].value);
      verifyLibraryCapacity();
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
  function verifyLibraryCapacity() {
    const state = readSessionLibrary();
    if (state.count > LIBRARY_MAX_COUNT || state.bytes > LIBRARY_MAX_BYTES) throw new Error("Library limit reached, possibly by another tab. Refresh the list and remove recordings before retrying.");
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
    const key = libraryRecordKey(id), state = readSessionLibrary();
    const entry = state.entries.find((entry2) => entry2.records.some((record) => record.key === key));
    if (!entry) throw new Error("This recording changed in another tab. Refresh the list.");
    const cleanTitle = libraryTitle(title);
    const writes = entry.records.map((record) => __spreadProps(__spreadValues({}, record), { next: JSON.stringify(__spreadProps(__spreadValues({}, JSON.parse(record.value)), { title: cleanTitle })) }));
    const bytes = state.bytes + writes.reduce((total, write) => total + new Blob([write.next]).size - new Blob([write.value]).size, 0);
    if (bytes > LIBRARY_MAX_BYTES) throw new Error("Library full. Use a shorter title or remove a recording.");
    for (const write of writes) {
      if (GM_getValue(write.key, null) !== write.value) throw new Error("This recording changed in another tab. Refresh the list.");
      GM_setValue(write.key, write.next);
    }
  }

  // src/backup.js
  var BACKUP_MAX_BYTES = 32 * 1024 * 1024;
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
    if (!input || input.format !== "TierScopeBackup" || input.formatVersion !== 1 || typeof input.producerVersion !== "string" || input.producerVersion.length > 40 || !Array.isArray(input.rooms) || input.rooms.length > 1e3 || !Array.isArray(input.library) || input.library.length > LIBRARY_MAX_COUNT) {
      throw new Error("This is not a supported TierScope backup.");
    }
    const seen = /* @__PURE__ */ new Set();
    const rooms = input.rooms.map((record) => {
      const room = record && allTimeRoom(record.room);
      if (!room || seen.has(room)) throw new Error("Invalid or duplicate room in backup.");
      seen.add(room);
      validateAllTimeRecord({ schemaVersion: 1, room, epoch: "backup", highs: record.highs }, room);
      const highs = emptyAllTimeHighs();
      mergeAllTimeHighs(highs, record.highs);
      return { room, highs };
    });
    const library = input.library.map((entry) => ({ title: libraryTitle(entry.title), archive: validateSessionFile(entry.archive) }));
    const backup = {
      format: "TierScopeBackup",
      formatVersion: 1,
      producerVersion: input.producerVersion,
      rooms,
      preferences: validateBackupPreferences(input.preferences),
      library
    };
    if (new Blob([JSON.stringify(backup)]).size > BACKUP_MAX_BYTES) throw new Error("Backup exceeds 32 MB.");
    return backup;
  }
  function createTierScopeBackup(includeLibrary = true) {
    const rooms = /* @__PURE__ */ new Set();
    for (const key of GM_listValues()) {
      if (key.startsWith(runtime.ALL_TIME_PREFIX)) {
        const room = allTimeRoom(key.slice(runtime.ALL_TIME_PREFIX.length).split(":")[0]);
        if (room) rooms.add(room);
      }
    }
    for (const room of runtime.allTimeCache.keys()) if (allTimeRoom(room)) rooms.add(room);
    const records = [...rooms].sort().map((room) => {
      const state = readAllTimeHighs(room);
      if (state.error || state.skipped) throw new Error("Could not read all ATH records for " + room + ". Existing data was left intact.");
      return { room, highs: state.highs };
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
    if (library.damaged.length) throw new Error("The library contains unreadable recordings. Export ATH/preferences separately or resolve those entries first.");
    return validateTierScopeBackup({
      format: "TierScopeBackup",
      formatVersion: 1,
      producerVersion: runtime.TIERSCOPE_VERSION,
      rooms: records,
      preferences,
      library: library.entries.map((entry) => ({ title: entry.title, archive: entry.archive }))
    });
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
    if (options.preferences) for (const [name, value] of Object.entries(backup.preferences)) {
      writes.push({ key: preferenceKeys[name], value: name === "geometry" || name === "collapsedRows" ? JSON.stringify(value) : value });
    }
    const touched = [];
    try {
      for (const write of writes) {
        const before = GM_getValue(write.key, void 0);
        touched.push(__spreadProps(__spreadValues({}, write), { before }));
        GM_setValue(write.key, write.value);
      }
      for (const { room, epoch } of epochs) {
        if (GM_getValue(runtime.ALL_TIME_EPOCH_PREFIX + room, "initial") !== epoch) throw new Error("ATH was cleared in another tab during restore.");
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
      preferences: options.preferences ? Object.keys(backup.preferences).length : 0
    };
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

  // src/library-shell.js
  function libraryShell() {
    return `<style>
#tracker-container[data-library-open=docked]{border-top-left-radius:0!important;border-bottom-left-radius:0!important}
#tierscope-session-tools{position:fixed;inset:auto;margin:0;padding:0;box-sizing:border-box;max-width:none;max-height:none;min-width:0;border:1px solid #ff69b4;border-radius:7px 0 0 7px;background:var(--panel-solid);color:var(--panel-text);font:11px/1.45 Arial,sans-serif;z-index:1000000;box-shadow:-8px 5px 24px #0004;overflow:hidden;display:flex;flex-direction:column}
#tierscope-session-tools[data-layout=sheet]{border-radius:7px;box-shadow:0 8px 32px #0007}
#tierscope-session-tools[data-layout=docked]::after{content:'';position:absolute;pointer-events:none;inset:0 0 0 auto;width:9px;background:linear-gradient(90deg,transparent,#0002);border-right:1px solid #ff69b450}
#tierscope-session-tools *{box-sizing:border-box}
#tierscope-session-tools button,#tierscope-session-tools select,#tierscope-session-tools input,#tierscope-session-tools summary{font:inherit;color:var(--panel-text);background:var(--panel-button);border:1px solid var(--panel-divider);border-radius:3px;padding:4px 7px;max-width:100%;min-width:0}
#tierscope-session-tools button,#tierscope-session-tools summary{cursor:pointer}
#tierscope-session-tools button:hover,#tierscope-session-tools summary:hover{border-color:var(--panel-accent)}
#tierscope-session-tools button:disabled{opacity:.45;cursor:default}
#tierscope-session-tools :is(button,select,input,summary):focus-visible{outline:2px solid #ff69b4;outline-offset:2px}
#tierscope-session-tools .tools-primary{background:#ff69b420;border-color:#ff69b4;color:var(--panel-accent);font-weight:bold}
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
#tierscope-session-tools .tools-folder{margin:5px 0}
#tierscope-session-tools .tools-folder button{display:flex;flex-direction:column;gap:4px;width:100%;text-align:left;padding:9px;border-left:3px solid #ff69b480;background:rgba(var(--panel-row-rgb),.04)}
#tierscope-session-tools .tools-folder-name{font-weight:bold;color:var(--panel-text)}
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
#tierscope-session-tools label{display:inline-flex;gap:5px;align-items:center;flex-wrap:wrap;min-width:0;max-width:100%}
#tierscope-session-tools select{width:auto;max-width:100%}
#tools-source-a,#tools-source-b{width:100%}
#gif-export-controls{padding:8px 12px;gap:6px;align-items:center;flex-shrink:0;border-bottom:1px solid var(--panel-divider)}
</style>
<div class="tools-head"><div><h2 id="tools-title">LIBRARY</h2><div class="tools-subtitle">Recordings &amp; session tools</div></div><button id="tools-close" type="button" aria-label="Close library" title="Close library (Escape)">×</button></div>
<nav aria-label="Session tools"><button data-tools-tab="library">Recordings</button><button data-tools-tab="summary">Summary</button><button data-tools-tab="compare">Compare</button><button data-tools-tab="backup">Backup</button></nav>
<div id="tools-message" role="status" aria-live="polite"></div>
<div id="gif-export-controls" style="display:none"><span id="gif-export-status" role="status"></span><button id="btn-cancel-gif" hidden type="button">Cancel</button></div>
<div id="tools-content"></div>`;
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
    const [room, registered, tokens, anonymous] = audience;
    return {
      audience,
      tokenShareRegistered: registered.tokenShare,
      tokenShareRoom: room.mean && tokens.mean !== null ? tokens.mean / room.mean * 100 : null,
      anonymousShareRoom: room.mean && anonymous.mean !== null ? anonymous.mean / room.mean * 100 : null
    };
  }
  var ANALYSIS_MAX_THRESHOLDS = 8;
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

  // src/session-tools.js
  var closeSessionTools = null;
  var refreshSessionTools = null;
  function updateSessionToolsStatus() {
    if (refreshSessionTools) refreshSessionTools();
    const element = document.getElementById("session-save-info");
    if (!element) return;
    if (isPlaybackCurrent(runtime.playback)) {
      element.textContent = "Replay snapshot — use Keep in library to retain it here.";
      element.style.color = "var(--panel-muted)";
      return;
    }
    const state = getSessionSaveState(getModelName());
    const warning = state.error || runtime.sessionStorageNotice;
    element.textContent = warning ? "Session saving unavailable. Keep this tab open or download a session file." : state.savedAt ? "Session saved in this browser at " + new Date(state.savedAt).toLocaleTimeString() + "." : "No session saved in this tab yet.";
    element.style.color = warning ? "var(--panel-warning)" : "var(--panel-muted)";
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
    let currentArchive = null, library = null, tab = "library", fileRequest = 0, chartObserver = null;
    let selectedA = "current", selectedB = "", metric = "room", threshold = 100, sharedLength = true, pendingBackup = null;
    let summaryThresholds = [25, 50, 100], libraryRoom = null, chartDraw = null;
    let observedSource = null, observedSignature = "";
    let detachDock = null;
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
    function action(fn) {
      return () => {
        try {
          fn();
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
    function chooseFile(maxBytes, accept) {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,application/json";
      input.hidden = true;
      const request = ++fileRequest, playbackAtRequest = runtime.playback;
      dialog.appendChild(input);
      const stillSelected = () => current() && request === fileRequest && runtime.playback === playbackAtRequest;
      input.onchange = async () => {
        const file = input.files && input.files[0];
        if (!file) {
          input.remove();
          return;
        }
        try {
          const value = await readDataFile(file, maxBytes);
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
      library = readSessionLibrary();
      return library;
    }
    function sourceOptions() {
      const items = [];
      if (currentArchive) items.push({ id: "current", title: "Current / replayed snapshot — " + currentArchive.room, archive: currentArchive });
      for (const entry of library.entries) items.push({ id: entry.id, title: (entry.title || entry.archive.room) + " — " + new Date(entry.archive.session.history.timestamps[0]).toLocaleString(), archive: entry.archive });
      return items;
    }
    function selectSource(parent, label, id, selected, changed) {
      const wrapper = node(parent, "label", label), select = node(wrapper, "select");
      select.id = id;
      for (const item of sourceOptions()) {
        const option = node(select, "option", item.title);
        option.value = item.id;
      }
      if (sourceOptions().some((item) => item.id === selected)) select.value = selected;
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
    function refreshCurrent() {
      const playback = isPlaybackCurrent(runtime.playback) ? runtime.playback : null;
      const source = playback ? playback.archive : runtime.history;
      const history = playback ? source.session.history : runtime.history;
      const room = playback ? source.room : getModelName();
      const available = history.timestamps.length > 0 && (playback || runtime.activeSessionStorageKey === getStorageKey(room) && runtime.lastUrl === location.href);
      const signature = [room, !!playback, history.timestamps.length, history.timestamps.at(-1), runtime.isPaused, runtime.isStopped].join(":");
      if (source === observedSource && signature === observedSignature) return;
      const replaced = source !== observedSource;
      observedSource = source;
      observedSignature = signature;
      if (replaced || !currentArchive) {
        try {
          currentArchive = captureSessionFile();
        } catch (error) {
          currentArchive = null;
        }
      }
      const title = dialog.querySelector("#tools-current-room"), meta = dialog.querySelector("#tools-current-meta"), label = dialog.querySelector("#tools-current-kind");
      if (title) title.textContent = room === "unknown" ? "No room session" : room;
      if (label) label.textContent = playback ? playback.imported ? "File / library replay" : "Replay snapshot" : runtime.isStopped ? "Stopped session" : runtime.isPaused ? "Paused session" : "Current live session";
      if (meta) meta.textContent = available ? history.timestamps.length.toLocaleString() + " samples · " + new Date(history.timestamps[0]).toLocaleString() : "Record a sample or open a saved session to get started.";
      dialog.querySelectorAll("[data-current-action]").forEach((button2) => {
        button2.dataset.currentAvailable = String(!!available);
        button2.disabled = !available || button2.id === "btn-export-gif" && !!runtime.gifExportJob;
      });
      if (replaced && tab !== "library" && tab !== "backup") render(tab);
    }
    function currentCard() {
      const card = node(content, "section", void 0, "tools-current");
      card.setAttribute("aria-label", "Current or replayed recording");
      node(card, "div", "", "tools-eyebrow").id = "tools-current-kind";
      node(card, "strong", "").id = "tools-current-room";
      node(card, "div", "", "tools-muted").id = "tools-current-meta";
      const actions = node(card, "div", void 0, "tools-actions");
      function currentButton(parent, text, fn, id) {
        const control = button(parent, text, () => fn(captureSessionFile()), id);
        control.dataset.currentAction = "true";
        return control;
      }
      currentButton(actions, "Keep in library", (archive) => {
        const result = keepSessionInLibrary(archive);
        currentArchive = archive;
        libraryRoom = archive.room.toLowerCase();
        render("library");
        tell(result.added ? "Recording kept in the library." : result.updated ? "Library recording updated; its name was preserved." : "An equal or fuller recording is already in the library.");
      }, "tools-keep").className = "tools-primary";
      currentButton(actions, "Save file", (archive) => downloadDataFile(archive, archiveName(archive)), "tools-save-session");
      const exports = node(card, "div", void 0, "tools-actions");
      currentButton(exports, "TXT", (archive) => {
        if (isPlaybackCurrent(runtime.playback)) downloadRecording(archive, "txt");
        else downloadTrackingReport();
      }, "tools-export-txt").title = "Download a text report for this recording";
      currentButton(exports, "CSV", (archive) => downloadRecording(archive, "csv"), "tools-export-csv").title = "Download every retained sample with its real timestamp";
      currentButton(exports, "GIF", (archive) => generateGifFromHistory(archive), "btn-export-gif").title = "Download an animated GIF of the full recording";
      currentButton(exports, "Add to all-time highs", addArchiveHighs, "tools-add-all-time");
      const status = node(card, "div", "", "tools-muted");
      status.id = "session-save-info";
      status.setAttribute("role", "status");
      observedSignature = "";
      refreshCurrent();
      updateSessionToolsStatus();
    }
    function renderLibrary() {
      const state = readLibrary();
      currentCard();
      const actions = node(content, "div", void 0, "tools-actions");
      button(actions, "Open saved file…", () => chooseFile(runtime.SESSION_FILE_MAX_BYTES, (value) => {
        openSessionReplay(validateSessionFile(value));
        observedSignature = "";
        refreshCurrent();
        tell("File opened in replay. Use Keep in library to store it here.");
      }), "tools-open-session");
      button(actions, "Import to library…", () => chooseFile(runtime.SESSION_FILE_MAX_BYTES, (value) => {
        const archive = validateSessionFile(value), result = keepSessionInLibrary(archive);
        libraryRoom = archive.room.toLowerCase();
        render("library");
        tell(result.added ? "Recording imported into the library." : result.updated ? "Library recording updated from the file." : "An equal or fuller recording is already in the library.");
      }), "tools-import-session");
      button(actions, "Refresh", () => render("library"), "tools-refresh-library").title = "Refresh list from this browser";
      node(content, "p", state.count + " / " + LIBRARY_MAX_COUNT + " recordings · " + (state.bytes / 1024 / 1024).toFixed(2) + " / " + LIBRARY_MAX_BYTES / 1024 / 1024 + " MB · Kept until you delete them.", "tools-muted");
      const folders = /* @__PURE__ */ new Map();
      for (const entry of state.entries) {
        const room = entry.archive.room.toLowerCase();
        if (!folders.has(room)) folders.set(room, []);
        folders.get(room).push(entry);
      }
      if (libraryRoom && !folders.has(libraryRoom)) libraryRoom = null;
      const searchLabel = node(content, "label", "Find ", "tools-search"), search = node(searchLabel, "input");
      search.type = "search";
      search.id = "tools-library-search";
      search.placeholder = "Model or recording title";
      search.title = "Search all recordings, including other model folders.";
      const list = node(content, "div");
      list.id = "tools-library-list";
      let shown = 50;
      function rows() {
        list.replaceChildren();
        const query = search.value.trim().toLowerCase(), browsingFolders = !query && !libraryRoom;
        const visible = query ? state.entries.filter((entry) => (entry.title + " " + entry.archive.room).toLowerCase().includes(query)) : libraryRoom ? folders.get(libraryRoom) : [...folders.keys()].sort((a, b) => a.localeCompare(b));
        const heading = node(list, "div", void 0, "tools-actions");
        if (!browsingFolders) button(heading, "‹ All models", () => {
          const previous = libraryRoom;
          libraryRoom = null;
          search.value = "";
          shown = 50;
          rows();
          (document.getElementById("tools-folder-" + previous) || search).focus();
        }, "tools-library-all-models");
        node(heading, "h3", query ? "Search results — all models" : libraryRoom ? "Folder: " + libraryRoom : "Model folders");
        if (!visible.length) node(list, "p", state.entries.length ? "No matching recordings." : "Your library is empty. Keep a recording above or import a session file.", "tools-muted");
        if (browsingFolders) for (const room of visible.slice(0, shown)) {
          const entries = folders.get(room), row = node(list, "div", void 0, "tools-folder");
          const open = button(row, "", () => {
            libraryRoom = room;
            shown = 50;
            rows();
            document.getElementById("tools-library-all-models").focus();
          }, "tools-folder-" + room);
          open.setAttribute("aria-label", "Open recordings for " + room);
          node(open, "span", "▱  " + room, "tools-folder-name");
          node(open, "span", entries.length + (entries.length === 1 ? " recording" : " recordings") + " · Latest " + new Date(entries[0].archive.session.history.timestamps[0]).toLocaleDateString(), "tools-folder-meta");
        }
        else for (const entry of visible.slice(0, shown)) {
          const row = node(list, "article", void 0, "tools-row");
          row.dataset.libraryId = entry.id;
          node(row, "strong", entry.title || entry.archive.room);
          node(row, "div", new Date(entry.archive.session.history.timestamps[0]).toLocaleString() + " · " + entry.archive.session.history.timestamps.length + " samples", "tools-muted");
          if (query) node(row, "div", entry.archive.room, "tools-muted");
          const actions2 = node(row, "div", void 0, "tools-actions");
          button(actions2, "Replay", () => {
            openSessionReplay(entry.archive);
            observedSignature = "";
            refreshCurrent();
            tell("Replaying " + (entry.title || entry.archive.room) + ".");
          }).className = "tools-primary";
          button(actions2, "Summary", () => {
            selectedA = entry.id;
            render("summary");
          });
          const more = node(actions2, "details", void 0, "tools-more");
          node(more, "summary", "More…");
          const extras = node(more, "div", void 0, "tools-more-actions");
          button(extras, "Save file", () => downloadDataFile(entry.archive, archiveName(entry.archive)));
          button(extras, "TXT", () => downloadRecording(entry.archive, "txt"));
          button(extras, "CSV", () => downloadRecording(entry.archive, "csv"));
          button(extras, "GIF", () => generateGifFromHistory(entry.archive));
          button(extras, "Add to all-time highs", () => addArchiveHighs(entry.archive));
          button(extras, "Rename", () => {
            const title = window.prompt("Recording title (up to 80 characters):", entry.title);
            if (title !== null) {
              renameLibrarySession(entry.id, title);
              render("library");
            }
          });
          button(extras, "Delete", () => {
            if (!confirm("Delete this library recording: " + (entry.title || entry.archive.room) + "?\n\nLive tracking, ATH and downloaded files are unchanged.")) return;
            removeLibrarySession(entry.id);
            render("library");
            tell("Library recording deleted.");
          }).className = "tools-danger";
        }
        if (visible.length > 50) node(list, "p", "Showing " + Math.min(shown, visible.length) + " of " + visible.length + (browsingFolders ? " model folders." : " matching recordings."), "tools-muted");
        if (shown < visible.length) button(list, "Show " + Math.min(50, visible.length - shown) + " more", () => {
          shown += 50;
          rows();
          (document.getElementById("tools-library-more") || search).focus();
        }, "tools-library-more");
      }
      search.oninput = () => {
        shown = 50;
        rows();
      };
      rows();
      if (state.damaged.length) {
        node(content, "p", state.damaged.length + " unreadable library record(s) were retained.", "tools-muted");
        button(content, "Remove unreadable library records…", () => {
          if (!confirm("Delete the " + state.damaged.length + " unreadable library record(s)? This cannot be undone.")) return;
          for (const key of state.damaged) removeLibrarySession(key.slice(LIBRARY_PREFIX.length));
          render("library");
        });
      }
    }
    function analysisControls(comparing) {
      if (!library) readLibrary();
      if (!sourceOptions().length) {
        node(content, "p", "Record a session or import one into the library to see analysis.");
        return null;
      }
      const controls = node(content, "div", void 0, "tools-actions");
      if (currentArchive) button(controls, "Refresh current / replayed snapshot", () => {
        currentArchive = captureSessionFile();
        render(tab);
      }, "tools-refresh-snapshot");
      selectedA = selectSource(controls, comparing ? "A " : "Recording ", "tools-source-a", selectedA, (value) => {
        selectedA = value;
        render(tab);
      });
      if (comparing) {
        if (!sourceOptions().some((item) => item.id === selectedB)) selectedB = (sourceOptions().find((item) => item.id !== selectedA) || sourceOptions()[0]).id;
        selectedB = selectSource(controls, "B ", "tools-source-b", selectedB, (value) => {
          selectedB = value;
          render(tab);
        });
      }
      const label = node(controls, "label", "Metric "), metricSelect = node(label, "select");
      metricSelect.id = "tools-metric";
      for (const [key, name] of Object.entries(ANALYSIS_METRICS)) {
        const option = node(metricSelect, "option", name);
        option.value = key;
      }
      metricSelect.value = metric;
      metricSelect.onchange = () => {
        metric = metricSelect.value;
        render(tab);
      };
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
        input.placeholder = "25, 50, 100";
        input.title = "Up to 8 counts separated by commas. Applies to the selected metric.";
      }
      input.oninput = () => input.setCustomValidity("");
      function applyThreshold() {
        try {
          if (comparing) {
            if (!Number.isSafeInteger(input.valueAsNumber) || input.valueAsNumber < 0) throw new Error("Enter a non-negative whole number.");
            threshold = input.valueAsNumber;
          } else summaryThresholds = parseAnalysisThresholds(input.value);
        } catch (error) {
          input.setCustomValidity(error.message);
          input.reportValidity();
          return;
        }
        input.setCustomValidity("");
        render(tab);
      }
      input.onkeydown = (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          applyThreshold();
        }
      };
      button(controls, comparing ? "Apply threshold" : "Apply thresholds", applyThreshold, "tools-apply-threshold");
      if (comparing) {
        const label2 = node(controls, "label"), check = node(label2, "input");
        check.type = "checkbox";
        check.checked = sharedLength;
        check.id = "tools-shared-length";
        node(label2, "span", "Match shared length");
        check.onchange = () => {
          sharedLength = check.checked;
          render(tab);
        };
      }
      node(content, "p", "Aligned from the first retained sample, using real elapsed time. Averages and threshold durations hold each sample until the next; recording gaps are excluded. The final sample has no assumed duration.", "tools-muted");
      if (comparing) node(content, "p", "A: " + sourceOptions().find((item) => item.id === selectedA).title + " · B: " + sourceOptions().find((item) => item.id === selectedB).title, "tools-muted");
      return sourceOptions();
    }
    const number = (value) => value === null ? "Not enough data" : value.toLocaleString(void 0, { maximumFractionDigits: 1 });
    const percent = (value) => value === null ? "Not enough data" : number(value) + "%";
    function audienceOverview(archive) {
      const overview = summarizeAudience(archive), coverage = overview.audience[0];
      node(content, "h3", "Audience overview");
      node(content, "p", archive.room + " · " + coverage.samples + " samples · Covered time " + formatElapsedTime(coverage.coveredMs) + " · Excluded gaps " + formatElapsedTime(coverage.gapMs) + " · Coverage " + percent(coverage.coverage), "tools-muted");
      const scroll = node(content, "div", void 0, "tools-scroll"), table = node(scroll, "table");
      table.id = "tools-audience-table";
      node(table, "caption", "Audience across the retained recording");
      const head = node(node(table, "thead"), "tr");
      ["Audience", "Time-weighted average", "Peak in recording", "Full-session high"].forEach((label) => {
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
      node(content, "p", "Room audience = registered + anonymous viewers. A full-session high may predate retained history. Hover a recording peak for its first recorded time.", "tools-muted");
      const shares = node(content, "div");
      shares.id = "tools-audience-shares";
      node(shares, "h3", "Audience proportions");
      node(shares, "p", "Token holders / registered viewers: " + percent(overview.tokenShareRegistered));
      node(shares, "p", "Token holders / whole room: " + percent(overview.tokenShareRoom));
      node(shares, "p", "Anonymous / whole room: " + percent(overview.anonymousShareRoom));
      node(shares, "p", "Shares use viewer-time over covered intervals. A crowded interval contributes more than a quiet interval of the same length; gaps contribute nothing.", "tools-muted");
    }
    function thresholdTable(archive) {
      const scroll = node(content, "div", void 0, "tools-scroll"), table = node(scroll, "table");
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
      node(content, "p", "Includes samples equal to the threshold. Percentages use covered recording time; gaps and time after the final sample are excluded.", "tools-muted");
    }
    function summaryTable(summaries, labels, comparing = true) {
      const scroll = node(content, "div", void 0, "tools-scroll"), table = node(scroll, "table");
      table.id = "tools-summary-table";
      node(table, "caption", ANALYSIS_METRICS[metric] + " — retained recording statistics");
      const head = node(table, "thead"), headRow = node(head, "tr");
      node(headRow, "th", "Measure");
      labels.forEach((label) => node(headRow, "th", label));
      const body = node(table, "tbody");
      const rows = [
        ["Samples in range", (s) => number(s.samples)],
        ["Elapsed span", (s) => formatElapsedTime(s.spanMs)],
        ["Covered recording time", (s) => formatElapsedTime(s.coveredMs)],
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
      node(content, "p", "The full-session high can predate retained history and is not limited by “Match shared length.” Token-holder share is weighted by recorded registered-viewer time.", "tools-muted");
    }
    function chart(archives, labels, endMs) {
      const legend = node(content, "p", labels.map((label, i) => (i ? "B (dashed blue): " : "A (pink): ") + label).join(" · "), "tools-muted");
      const canvas = node(content, "canvas");
      canvas.id = "tools-analysis-chart";
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", ANALYSIS_METRICS[metric] + " by minutes since the first retained sample. " + legend.textContent + ". Statistics are in the table below.");
      function draw() {
        const width = Math.max(260, canvas.clientWidth), height = 200, ratio = window.devicePixelRatio || 1;
        canvas.width = width * ratio;
        canvas.height = height * ratio;
        const ctx = canvas.getContext("2d");
        ctx.scale(ratio, ratio);
        const series = archives.map((archive) => analysisSeries(archive, metric));
        let max = 1;
        series.forEach((s) => s.values.forEach((value, i) => {
          if (s.times[i] <= endMs) max = Math.max(max, value);
        }));
        const left = 58, top = 16, right = width - 12, bottom = height - 38, span = endMs || 1;
        ctx.strokeStyle = runtime.isDarkMode ? "#686875" : "#b6bdca";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(left, top);
        ctx.lineTo(left, bottom);
        ctx.lineTo(right, bottom);
        ctx.stroke();
        ctx.fillStyle = runtime.isDarkMode ? "#ddd" : "#41485a";
        ctx.font = "11px Arial";
        ctx.textAlign = "left";
        ctx.fillText(number(max), 2, top + 8);
        ctx.fillText("0", 30, bottom);
        ctx.fillText("0m", left, bottom + 19);
        ctx.textAlign = "right";
        ctx.fillText(number(endMs / 6e4) + "m", right, bottom + 19);
        series.forEach((s, j) => {
          ctx.strokeStyle = j ? runtime.isDarkMode ? "#79baff" : "#175db0" : runtime.isDarkMode ? "#ff69b4" : "#b42370";
          ctx.lineWidth = 2;
          ctx.setLineDash(j ? [6, 4] : []);
          ctx.beginPath();
          const isolated = [];
          let previousX = null, previousY = null;
          for (let i = 0; i < s.times.length && s.times[i] <= endMs; i++) {
            const x = left + s.times[i] / span * (right - left), y = bottom - s.values[i] / max * (bottom - top);
            if (previousX === null || s.breaks[i]) ctx.moveTo(x, y);
            else {
              ctx.lineTo(x, previousY);
              ctx.lineTo(x, y);
            }
            previousX = x;
            previousY = y;
            if ((i === 0 || s.breaks[i]) && (i + 1 === s.times.length || s.breaks[i + 1] || s.times[i + 1] > endMs)) isolated.push([x, y]);
            if (i + 1 < s.times.length && s.times[i + 1] > endMs && !s.breaks[i + 1]) ctx.lineTo(right, y);
          }
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = ctx.strokeStyle;
          isolated.forEach(([x, y]) => {
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
          });
        });
      }
      chartDraw = draw;
      draw();
      if (window.ResizeObserver) {
        chartObserver = new window.ResizeObserver(draw);
        chartObserver.observe(canvas);
      }
    }
    function renderAnalysis(comparing) {
      const options = analysisControls(comparing);
      if (!options) return;
      const a = options.find((item) => item.id === selectedA), b = options.find((item) => item.id === selectedB);
      if (comparing) {
        if (a.id === b.id) node(content, "p", "Choose a second recording to make a comparison.", "tools-muted");
        const result = compareSessions(a.archive, b.archive, metric, threshold, sharedLength);
        chart([a.archive, b.archive], [a.archive.room, b.archive.room], result.axisMs);
        summaryTable([result.a, result.b], ["A", "B"]);
      } else {
        const summary = summarizeSession(a.archive, metric, threshold);
        chart([a.archive], [a.archive.room], summary.spanMs);
        audienceOverview(a.archive);
        thresholdTable(a.archive);
        node(content, "h3", ANALYSIS_METRICS[metric] + " — details");
        summaryTable([summary], [a.archive.room], false);
      }
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
      node(content, "p", "Download ATH for every room and your saved preferences: theme, panel size/position, collapsed rows, compact metric, chart window and SH/ATH mode. Keep this file somewhere safe. Session-only controls such as the scan interval are not saved preferences.", "tools-muted");
      const include = checkbox(content, "tools-backup-library", "Include library recordings");
      const actions = node(content, "div", void 0, "tools-actions");
      button(actions, "Download backup", () => {
        downloadDataFile(createTierScopeBackup(include.checked), "TierScope-backup-" + (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) + ".json");
        tell("Backup download requested. Check your browser downloads.");
      }, "tools-backup-download");
      node(content, "h3", "Restore a backup");
      node(content, "p", "ATH is merged without lowering existing records. New library sessions are added; fuller versions of the same session update its entry and keep its name. Saved preferences take effect after refreshing your room tabs.", "tools-muted");
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
        node(content, "p", pendingBackup.rooms.length + " rooms · " + Object.keys(pendingBackup.preferences).length + " saved preferences · " + pendingBackup.library.length + " recordings", "tools-muted");
        const choices = node(content, "div", void 0, "tools-actions");
        const highs = checkbox(choices, "tools-restore-highs", "Merge ATH"), preferences = checkbox(choices, "tools-restore-preferences", "Restore preferences"), recordings = checkbox(choices, "tools-restore-library", "Add library recordings");
        button(content, "Restore selected data", () => {
          if (!highs.checked && !preferences.checked && !recordings.checked) throw new Error("Choose at least one kind of data to restore.");
          if (!confirm("Restore the selected backup data?\n\nATH will be merged, library recordings added or updated with fuller versions, and selected saved preferences replaced. Your live session is not replaced.")) return;
          const result = restoreTierScopeBackup(pendingBackup, { highs: highs.checked, preferences: preferences.checked, library: recordings.checked });
          library = null;
          if (runtime.playback) setPlaybackAllTimeState(runtime.playback, readAllTimeHighs(displayedHighRoom()));
          repaintHighMode();
          tell("Restored: " + result.rooms + " room ATH updates, " + result.recordings + " new recordings, " + result.updatedRecordings + " updated recordings, " + result.preferences + " preferences." + (result.preferences ? "\nRefresh your room tabs when convenient to apply preferences." : ""));
        }, "tools-backup-restore");
      }
    }
    function render(next) {
      const focusedId = dialog.contains(document.activeElement) ? document.activeElement.id : "";
      if (next !== tab) library = null;
      tab = next;
      fileRequest++;
      chartDraw = null;
      if (chartObserver) {
        chartObserver.disconnect();
        chartObserver = null;
      }
      content.replaceChildren();
      message.textContent = "";
      dialog.querySelectorAll("[data-tools-tab]").forEach((button2) => button2.setAttribute("aria-pressed", String(button2.dataset.toolsTab === tab)));
      try {
        if (tab === "library") renderLibrary();
        else if (tab === "backup") renderBackup();
        else renderAnalysis(tab === "compare");
      } catch (error) {
        tell(error.message, true);
      }
      if (focusedId) {
        const target = document.getElementById(focusedId);
        if (target && dialog.contains(target)) target.focus();
      }
    }
    function close() {
      fileRequest++;
      refreshSessionTools = null;
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
    refreshSessionTools = refreshCurrent;
    document.addEventListener("keydown", escape);
    dialog.querySelector("#btn-cancel-gif").onclick = cancelGifExport;
    for (const id of ["btn-control-library", "btn-playback-library"]) {
      const button2 = document.getElementById(id);
      if (button2) button2.setAttribute("aria-expanded", "true");
    }
    dialog.querySelector("#tools-close").onclick = close;
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
  function saveSession(model) {
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
      stop.disabled = runtime.isStopped;
      stop.style.opacity = runtime.isStopped ? "0.5" : "1";
    }
    ["btn-auto", "btn-control-auto"].forEach(function(id) {
      var button = document.getElementById(id);
      if (!button) return;
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
    if (runtime.isStopped) return;
    stopAcquisitionClock("countdownInterval");
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
    var roomKey = context.room.toLowerCase();
    var fallbackIntervalMs = Math.max(runtime.DOM_FALLBACK_INTERVAL_SECONDS, runtime.scanIntervalSeconds) * 1e3;
    deferDOMFallback(roomKey, Date.now() + fallbackIntervalMs);
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
      deferDOMFallback(roomKey, Date.now() + fallbackIntervalMs);
    }
  }
  function acceptRoomSnapshot(snapshot, modelName) {
    return beginAcceptedSample(snapshot, modelName, Date.now(), getSessionSamplePolicy());
  }
  async function performScanThenReturn(returnToChat) {
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
    updateCountdownDisplay();
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
      priorState = Object.assign({}, sampleReceipt.before, {
        trendHTML: (document.getElementById("trend-container") || {}).innerHTML,
        trendHeaderText: (document.getElementById("trend-header-label") || {}).textContent,
        allTimeHighs: readAllTimeHighs(context.room).highs
      });
      var diagnostics = sampleReceipt.diagnostics;
      if (!runtime.isMinimized) drawAllSparklines();
      updateDisplay();
      updateTrendDisplay();
      updateAcquisitionStatus();
      sampleCommitted = isAcquisitionCurrent(context) && commitAcceptedSample(sampleReceipt);
      if (!sampleCommitted) abortAcceptedSample(sampleReceipt);
    } catch (err) {
      var rolledBack = sampleReceipt && abortAcceptedSample(sampleReceipt);
      if (rolledBack && priorState) {
        try {
          var trendEl = document.getElementById("trend-container");
          if (trendEl && typeof priorState.trendHTML === "string") trendEl.innerHTML = priorState.trendHTML;
          var trendHeader = document.getElementById("trend-header-label");
          if (trendHeader && typeof priorState.trendHeaderText === "string") trendHeader.textContent = priorState.trendHeaderText;
          updateDisplay();
          updateAcquisitionStatus();
          if (!runtime.isMinimized) drawAllSparklines();
        } catch (displayError) {
          log("Could not repaint previous data: " + displayError.message);
        }
      }
      if (isAcquisitionCurrent(context)) markSessionGap();
      log("Error during scan; retaining previous valid data: " + err.message);
    } finally {
      if (sampleCommitted) {
        try {
          saveSession(context.room);
        } catch (error) {
          log("Could not save accepted sample: " + error.message);
        }
        try {
          recordAcceptedAllTimeHighs(context.room);
          updateDisplay();
        } catch (error) {
          log("Could not update all-time highs: " + error.message);
        }
        pulseAcceptedHighs(priorState);
        if (diagnostics) diagnostic("log", "API scan accepted", diagnostics);
      }
      if (finishAcquisition(context, location.href)) {
        resetCountdown();
        updateAcquisitionStatus();
        if (checkingReturn || !priorState && priorAbsence !== runtime.broadcasterAbsence) saveSession(context.room);
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
    var html = '<div id="tracker-container" style="position:fixed;top:80px;right:20px;background:rgba(20,20,30,0.95);color:var(--panel-text);padding:5px;border-radius:6px;font-family:Arial,sans-serif;font-size:9px;z-index:999999;width:' + runtime.BASE_WIDTH_MINI + 'px;border:1px solid #ff69b4;transition:width 0.3s ease;cursor:default;user-select:none;"><div id="drag-handle" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;border-bottom:1px solid #ff69b4;padding-bottom:3px;cursor:move;"><span id="header-text" style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:bold;color:var(--panel-accent);font-size:10px;">USERS: 0 (SH:0)</span><span id="mini-room-change" style="font-size:8px;margin:0 3px;display:none;"></span><div style="display:flex;align-items:center;gap:3px;flex-shrink:0;"><button type="button" id="btn-high-mode" aria-pressed="false" aria-label="Session highs. Switch to all-time highs" style="display:none;min-width:29px;background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-text);border-radius:3px;cursor:pointer;font-size:8px;padding:1px 3px;">SH</button><button type="button" id="btn-panel-options" aria-label="Chart window and highs" aria-expanded="false" aria-controls="panel-options" style="display:none;background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-text);border-radius:3px;cursor:pointer;font-size:8px;padding:1px 3px;white-space:nowrap;">Full ▾</button><button type="button" id="btn-standard-size" title="Restore standard panel size (100%)" aria-label="Restore standard panel size" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-text);border-radius:3px;cursor:pointer;font-size:8px;padding:1px 3px;">100%</button><button id="btn-toggle" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-text);border-radius:3px;cursor:pointer;font-size:9px;padding:1px 4px;flex-shrink:0;">+</button></div></div><div id="panel-options" role="group" aria-label="Chart and high options" style="display:none;position:absolute;right:5px;top:29px;width:190px;max-width:calc(100% - 10px);box-sizing:border-box;z-index:5;padding:8px;background:var(--panel-solid);color:var(--panel-text);border:1px solid #ff69b4;border-radius:4px;font-size:11px;box-shadow:0 3px 12px #0008;"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:7px;"><strong>Charts &amp; highs</strong><button type="button" id="panel-options-close" aria-label="Close chart and high options" style="background:var(--panel-button);color:var(--panel-text);border:0;border-radius:3px;cursor:pointer;">×</button></div><label for="chart-window-select">Chart window</label><select id="chart-window-select" style="display:block;width:100%;margin:4px 0 6px;background:var(--panel-button);color:var(--panel-text);border:1px solid var(--panel-divider);font-size:11px;"><option value="full">Full history</option><option value="fourHours">Last 4 hours</option><option value="twoHours">Last 2 hours</option><option value="hour">Last hour</option><option value="halfHour">Last 30 minutes</option><option value="quarter">Last 15 minutes</option></select><div style="font-size:10px;color:var(--panel-muted);line-height:1.4;margin-bottom:8px;">Charts only. Downloads keep the full retained history.</div><input type="file" id="session-file-input" accept=".json,application/json" style="display:none;"><div id="session-file-info" style="display:none;margin-top:7px;font-size:10px;line-height:1.4;white-space:pre-line;overflow-wrap:anywhere;color:var(--panel-secondary);"></div><div style="border-top:1px solid var(--panel-divider);margin-top:8px;padding-top:6px;"><strong>All-time highs</strong><div id="all-time-info" style="font-size:10px;line-height:1.4;margin:4px 0;color:var(--panel-secondary);"></div><button type="button" id="btn-add-all-time" style="display:none;width:100%;margin:4px 0;padding:4px;background:#4169E1;color:#fff;border:0;border-radius:3px;cursor:pointer;">Add to all-time highs</button><button type="button" id="btn-clear-all-time" style="display:block;width:100%;margin:4px 0;padding:4px;background:var(--panel-button);color:var(--panel-text);border:1px solid var(--panel-divider);border-radius:3px;cursor:pointer;">Clear all-time highs…</button><div id="all-time-action-status" role="status" style="font-size:10px;line-height:1.4;overflow-wrap:anywhere;color:var(--panel-secondary);"></div></div></div><div id="minimized-view" style="display:block;position:relative;"><div style="display:flex;align-items:center;justify-content:space-between;gap:3px;"><button type="button" id="mini-metric" style="background:transparent;border:0;color:var(--panel-secondary);font:inherit;cursor:pointer;padding:2px 0;" aria-label="Cycle chart metric">Room total ▾</button><button type="button" id="mini-high" style="background:transparent;border:0;padding:0;color:var(--panel-subtle);font-size:8px;cursor:pointer;"></button></div><canvas id="mini-chart" width="140" height="36" style="display:block;width:100%;height:36px;" role="img" aria-label="Recent audience history"></canvas><div style="display:flex;justify-content:space-between;gap:4px;margin:3px 0;"><span title="With Tokens">💎 <span id="mini-withtokens">0</span> <span id="mini-withtokens-change"></span></span><span title="Registered">📊 <span id="mini-total">0</span> <span id="mini-total-change"></span></span></div><div style="display:flex;align-items:center;gap:3px;"><span id="mini-freshness" style="flex:1;min-width:0;font-size:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">No sample</span><button type="button" id="btn-auto" style="background:var(--panel-button);border:0;color:var(--panel-text);border-radius:3px;cursor:pointer;" title="Pause or resume scans">⏸</button><button type="button" id="mini-settings-toggle" style="background:var(--panel-button);border:0;color:var(--panel-text);border-radius:3px;cursor:pointer;" aria-label="Scan interval settings" title="Scan interval settings — adjust how often TierScope scans" aria-expanded="false" aria-controls="mini-settings">◷</button><button type="button" id="btn-expand" style="background:var(--panel-button);border:0;color:var(--panel-text);border-radius:3px;font-size:9px;cursor:pointer;" title="Expand panel" aria-label="Expand panel">↗</button></div><div id="mini-settings" style="display:none;position:absolute;left:0;right:0;top:17px;background:var(--panel-settings);border:1px solid #ff69b4;border-radius:4px;padding:5px;z-index:2;" role="group" aria-label="Scan interval"><div style="display:flex;justify-content:space-between;align-items:center;font-size:9px;color:var(--panel-secondary);">Scan interval <button type="button" id="mini-settings-close" aria-label="Close scan interval settings" title="Close (Escape)" style="background:var(--panel-button);color:var(--panel-text);border:0;border-radius:3px;cursor:pointer;padding:1px 5px;font-size:13px;">×</button></div><div style="display:flex;align-items:center;justify-content:center;gap:3px;margin:3px 0;padding:2px;background:rgba(var(--panel-row-rgb),0.05);border-radius:3px;"><button id="btn-timer-down" style="background:var(--panel-button-strong);border:none;color:var(--panel-text);border-radius:2px;cursor:pointer;font-size:9px;padding:1px 4px;font-weight:bold;">−</button><span id="timer-display" style="font-size:11px;color:var(--panel-warning);font-weight:bold;min-width:28px;">60s</span><button id="btn-timer-up" style="background:var(--panel-button-strong);border:none;color:var(--panel-text);border-radius:2px;cursor:pointer;font-size:9px;padding:1px 4px;font-weight:bold;">+</button></div><div style="display:flex;gap:2px;justify-content:center;margin-top:3px;"><button class="timer-preset" data-time="30" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-muted);border-radius:2px;cursor:pointer;font-size:7px;padding:1px 3px;">30s</button><button class="timer-preset" data-time="60" style="background:#ff69b4;border:1px solid #ff69b4;color:#fff;border-radius:2px;cursor:pointer;font-size:7px;padding:1px 3px;">60s</button><button class="timer-preset" data-time="120" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-muted);border-radius:2px;cursor:pointer;font-size:7px;padding:1px 3px;">2m</button><button class="timer-preset" data-time="300" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-muted);border-radius:2px;cursor:pointer;font-size:7px;padding:1px 3px;">5m</button></div><div id="auto-status" style="margin-top:3px;font-size:8px;color:var(--panel-muted);">Starting...</div></div></div><div id="full-view" style="display:none;"><div id="tier-chart-region" style="display:flow-root;">' + collapsedTrayHtml();
    Object.keys(runtime.TIERS).forEach(function(key) {
      var t = runtime.TIERS[key];
      html += '<div id="tier-row-' + key + '" data-tier="' + key + '" style="display:flex;align-items:center;padding:1px 3px;margin:1px 0;background:rgba(var(--panel-row-rgb),calc(0.05 * var(--tier-background-scale, 1)));border-radius:3px;border-left:3px solid ' + t.color + ';"><div style="width:30px;flex-shrink:0;text-align:center;">' + collapseMarkerHtml(key) + '</div><canvas id="spark-' + key + '" width="105" height="28" style="flex:1;margin:0 4px;"></canvas><div style="text-align:right;width:48px;flex-shrink:0;"><span id="count-' + key + '" style="font-weight:bold;color:' + t.color + ';font-size:14px;">0</span><div id="high-' + key + '" style="font-size:8px;color:var(--panel-positive);margin-top:1px;white-space:nowrap;">SH:0</div></div></div>';
    });
    html += '<div id="summary-tier-rows" style="border-top:1px solid var(--panel-divider);margin-top:4px;padding-top:4px;"><div id="tier-row-withtokens" data-tier="withtokens" style="display:flex;align-items:center;padding:2px 3px;background:rgba(255,105,180,0.15);border-radius:3px;border:1px solid #ff69b4;margin-bottom:3px;"><div style="width:30px;flex-shrink:0;text-align:center;">' + collapseMarkerHtml("withtokens") + '</div><canvas id="spark-withtokens" width="105" height="28" style="flex:1;margin:0 4px;"></canvas><div style="text-align:right;width:48px;flex-shrink:0;"><span id="count-withtokens" style="font-weight:bold;color:#ff69b4;font-size:14px;">0</span><span id="pct-withtokens" style="font-size:8px;color:#ff69b4;margin-left:2px;">0%</span><div id="high-withtokens" style="font-size:8px;color:var(--panel-positive);margin-top:1px;white-space:nowrap;">SH:0</div></div></div><div id="tier-row-total" data-tier="total" style="display:flex;align-items:center;padding:2px 3px;background:rgba(var(--panel-row-rgb),0.1);border-radius:3px;"><div style="width:30px;flex-shrink:0;text-align:center;">' + collapseMarkerHtml("total") + '</div><canvas id="spark-total" width="105" height="28" style="flex:1;margin:0 4px;"></canvas><div style="text-align:right;width:48px;flex-shrink:0;"><span id="count-total" style="font-weight:bold;color:var(--panel-text);font-size:14px;">0</span><div id="high-total" style="font-size:8px;color:var(--panel-positive);margin-top:1px;white-space:nowrap;">SH:0</div></div></div></div><div id="tier-row-anon" data-tier="anonymous" style="margin-top:5px;padding:5px;background:rgba(136,136,136,0.15);border-radius:3px;border:1px solid #888;"><div style="display:flex;align-items:center;"><div style="width:30px;flex-shrink:0;text-align:center;">' + collapseMarkerHtml("anon") + '</div><canvas id="spark-anon" width="105" height="50" style="flex:1;margin:0 4px;"></canvas><div style="text-align:right;width:48px;flex-shrink:0;"><span id="anon-ratio-full" style="font-size:13px;font-weight:bold;color:#ff69b4;">--</span><div id="high-anon" style="font-size:8px;color:var(--panel-positive);margin-top:1px;white-space:nowrap;">SH:0</div></div></div></div></div><div id="trend-section" style="position:relative;border-top:1px solid #4169E1;margin-top:5px;padding-top:5px;"><div id="live-trend"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;flex-wrap:wrap;gap:2px;"><span id="trend-header-label" style="font-size:9px;font-weight:bold;color:#4169E1;">📈 TREND</span><div style="display:flex;gap:2px;flex-wrap:wrap;"><button class="trend-preset-btn" data-mode="last" style="background:#4169E1;border:1px solid #4169E1;color:#fff;border-radius:2px;cursor:pointer;font-size:7px;padding:1px 4px;">Last</button><button class="trend-preset-btn" data-mode="5min" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-muted);border-radius:2px;cursor:pointer;font-size:7px;padding:1px 4px;">5m</button><button class="trend-preset-btn" data-mode="15min" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-muted);border-radius:2px;cursor:pointer;font-size:7px;padding:1px 4px;">15m</button><button class="trend-preset-btn" data-mode="30min" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-muted);border-radius:2px;cursor:pointer;font-size:7px;padding:1px 4px;">30m</button><button class="trend-preset-btn" data-mode="1hour" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-muted);border-radius:2px;cursor:pointer;font-size:7px;padding:1px 4px;">1h</button><button class="trend-preset-btn" data-mode="start" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-muted);border-radius:2px;cursor:pointer;font-size:7px;padding:1px 4px;">Start</button><button id="btn-trend-auto" style="background:#32CD32;border:1px solid #32CD32;color:#fff;border-radius:2px;cursor:pointer;font-size:7px;padding:1px 4px;" title="Auto-escalation ON - Click to disable">AUTO</button></div></div><div id="trend-container" style="min-height:30px;"><div style="font-size:8px;color:var(--panel-faint);text-align:center;padding:8px;">Waiting for scan...</div></div></div><div id="playback-controls" style="display:none;position:absolute;top:5px;left:0;right:0;bottom:0;padding:0 2px;box-sizing:border-box;grid-template-rows:minmax(14px,1fr) 14px 12px;gap:2px;" aria-label="Playback controls"><div style="display:flex;flex-direction:column;justify-content:center;gap:4px;min-width:0;"><div id="playback-file-controls" style="display:none;align-items:center;gap:4px;min-width:0;"><div id="playback-room" style="display:none;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;line-height:12px;font-weight:bold;color:var(--panel-text);"></div></div><div style="display:flex;align-items:center;justify-content:space-between;gap:3px;"><strong id="playback-label" style="font-size:9px;color:var(--panel-warning);">PLAYBACK</strong><button id="playback-play" style="font-size:8px;line-height:12px;margin:0;padding:0 4px;background:#4169E1;color:white;border:1px solid var(--panel-divider);border-radius:2px;cursor:pointer;">Pause</button><select id="playback-speed" aria-label="Playback speed" style="font-size:8px;height:15px;margin:0;padding:0;background:var(--panel-button);color:var(--panel-text);border:1px solid var(--panel-divider);"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select><button type="button" id="btn-playback-library" aria-label="Open session library" aria-expanded="false" aria-controls="tierscope-session-tools" style="font-size:8px;line-height:12px;margin:0;padding:0 4px;background:var(--panel-button);color:var(--panel-accent);border:1px solid var(--panel-divider);border-radius:2px;cursor:pointer;">Library</button><button id="playback-return" style="font-size:8px;line-height:12px;margin:0;padding:0 4px;background:var(--panel-button);color:var(--panel-text);border:1px solid var(--panel-divider);border-radius:2px;cursor:pointer;">Return to Live</button></div></div><div style="display:flex;align-items:center;gap:4px;min-width:0;"><button type="button" id="playback-previous" title="Previous recorded sample (pauses Replay)" aria-label="Previous recorded sample" style="flex:0 0 20px;height:14px;padding:0;font-size:9px;line-height:10px;background:var(--panel-button);color:var(--panel-text);border:1px solid var(--panel-divider);border-radius:2px;cursor:pointer;">|&#9664;</button><input id="playback-scrubber" type="range" min="0" max="0" value="0" step="any" aria-label="Playback timeline" style="flex:1;min-width:0;width:100%;height:12px;margin:0;accent-color:var(--panel-warning);cursor:pointer;"><button type="button" id="playback-next" title="Next recorded sample (pauses Replay)" aria-label="Next recorded sample" style="flex:0 0 20px;height:14px;padding:0;font-size:9px;line-height:10px;background:var(--panel-button);color:var(--panel-text);border:1px solid var(--panel-divider);border-radius:2px;cursor:pointer;">&#9654;|</button></div><div id="playback-file-actions" style="display:flex;justify-content:center;min-width:0;"><div id="playback-position" style="font-size:9px;line-height:12px;text-align:center;white-space:nowrap;color:var(--panel-secondary);font-family:monospace;">00:00:00 / 00:00:00</div></div></div></div><div id="control-field" style="margin-top:5px;padding:4px;background:rgba(65,105,225,0.15);border-radius:3px;border:1px solid #4169E1;"><div id="control-session-row" style="display:grid;grid-template-columns:max-content max-content minmax(0,1fr);align-items:center;gap:3px;margin-bottom:4px;white-space:nowrap;"><span style="font-size:9px;font-weight:bold;color:#4169E1;">🎛️ CONTROLS</span><span style="font-size:12px;color:var(--panel-warning);font-family:monospace;font-weight:bold;width:9ch;text-align:center;font-variant-numeric:tabular-nums;" id="control-tracking-timer">00:00:00</span><span style="min-width:0;text-align:right;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums;font-size:11px;color:var(--panel-positive);font-weight:bold;" id="control-next-scan">Next: 60s</span></div><div id="control-action-row" style="display:grid;grid-template-columns:minmax(max-content,1fr) auto minmax(0,1fr);align-items:center;gap:3px;"><div id="control-session-buttons" style="display:flex;gap:2px;align-items:center;"><button type="button" id="btn-control-library" aria-expanded="false" aria-controls="tierscope-session-tools" aria-label="Open session library" title="Open model folders, session summaries, comparisons and backups" style="font-size:8px;line-height:10px;height:14px;min-width:38px;box-sizing:border-box;margin:0;padding:2px 3px;background:var(--panel-button);color:var(--panel-accent);border:none;border-radius:3px;cursor:pointer;">Library</button><button id="btn-replay" style="font-size:8px;line-height:10px;height:14px;min-width:38px;box-sizing:border-box;margin:0;padding:2px 3px;background:var(--panel-button);color:var(--panel-warning);border:none;border-radius:3px;cursor:pointer;" title="Replay recorded history">Replay</button></div><div id="control-action-buttons" style="display:flex;gap:2px;align-items:center;"><button id="btn-control-auto" style="height:14px;box-sizing:border-box;line-height:10px;margin:0;background:#32CD32;border:none;color:#fff;border-radius:3px;cursor:pointer;font-size:8px;padding:2px 4px;min-width:24px;" title="Auto-Refresh ON">⏸</button><button type="button" id="btn-control-stop" aria-label="Stop this session" title="Stop this session and freeze its history and elapsed time" style="height:14px;box-sizing:border-box;line-height:10px;margin:0;background:#ff4444;border:none;color:#fff;border-radius:3px;cursor:pointer;font-size:8px;padding:2px 3px;white-space:nowrap;">■ Stop</button><button id="btn-main-reset" style="height:14px;box-sizing:border-box;line-height:10px;margin:0;background:#ff4444;border:none;color:#fff;border-radius:3px;cursor:pointer;font-size:8px;padding:2px 3px;display:flex;align-items:center;gap:2px;" title="Reset all tracking data"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12"/><path d="M3 3v9h9"/></svg>Reset</button></div><style>#dark-mode-control #dark-mode-track{position:relative;display:block;flex:0 0 22px;width:22px;height:12px;box-sizing:border-box;border:1px solid #9b701d;border-radius:7px;background:#e8b444;transition:background-color .16s ease;}#dark-mode-control #dark-mode-thumb{position:absolute;left:1px;top:1px;width:8px;height:8px;border-radius:50%;background:#4c3300;transform:translateX(10px);transition:transform .16s ease,background-color .16s ease;}#dark-mode-control #dark-mode-moon{color:var(--panel-muted);opacity:.55;}#dark-mode-control #dark-mode-sun{color:#825d00;}#dark-mode-control #dark-mode-toggle:checked~#dark-mode-track{background:#4169e1;border-color:#8ca8ff;}#dark-mode-control #dark-mode-toggle:checked~#dark-mode-track #dark-mode-thumb{transform:translateX(0);background:#fff;}#dark-mode-control #dark-mode-toggle:checked~#dark-mode-moon{color:#b4c5ff;opacity:1;}#dark-mode-control #dark-mode-toggle:checked~#dark-mode-sun{color:var(--panel-muted);opacity:.55;}#dark-mode-control #dark-mode-toggle:focus-visible~#dark-mode-track{outline:2px solid var(--panel-accent);outline-offset:2px;}@media(prefers-reduced-motion:reduce){#dark-mode-control #dark-mode-track,#dark-mode-control #dark-mode-thumb{transition:none;}}</style><label id="dark-mode-control" style="position:relative;justify-self:end;display:inline-flex;align-items:center;gap:2px;height:14px;cursor:pointer;line-height:1;"><input type="checkbox" role="switch" id="dark-mode-toggle" checked aria-label="Dark mode" style="position:absolute;inset:0;z-index:1;width:100%;height:100%;box-sizing:border-box;margin:0;padding:0;border:0;opacity:0;cursor:pointer;"><svg id="dark-mode-moon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true" style="flex:none;"><path d="M21 13a9 9 0 0 1-10-10 9 9 0 1 0 10 10Z"/></svg><span id="dark-mode-track" aria-hidden="true"><span id="dark-mode-thumb"></span></span><svg id="dark-mode-sun" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true" style="flex:none;"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg></label></div></div><div id="tracker-footer" style="display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:4px;margin-top:5px;min-height:14px;"><div id="acquisition-status" style="max-width:80px;font-size:7px;color:var(--panel-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="No accepted sample yet">No sample</div><div id="background-slider-controls" style="display:flex;align-items:center;gap:3px;min-width:0;"><svg width="11" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--panel-warning)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex-shrink:0;"><path d="M9 18h6M10 22h4M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 4H9c0-2 0-3-1-4Z"/></svg><input type="range" id="opacity-slider" min="30" max="100" value="95" aria-label="Background opacity" style="flex:1;min-width:0;width:100%;height:12px;margin:0;cursor:pointer;accent-color:#ff69b4;" title="Main and standard tier background opacity"><span id="opacity-value" style="font-size:8px;color:var(--panel-secondary);min-width:23px;">95%</span></div><div id="tierscope-logo" style="justify-self:end;display:flex;align-items:center;gap:3px;white-space:nowrap;opacity:0.6;transition:opacity 0.2s;" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0.6"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ff69b4" stroke-width="2" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg><span title="TierScope ' + runtime.TIERSCOPE_VERSION + `" style="font-size:7px;font-family:'Courier New',monospace;font-weight:bold;color:var(--panel-accent);letter-spacing:1px;">TIERSCOPE</span></div></div></div>`;
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
    leavePlayback(false);
    var myGeneration = beginAcquisitionGeneration();
    log("Initializing... (generation " + myGeneration + ")");
    stopAcquisitionClock("healthCheckInterval");
    if (runtime.freshnessInterval) clearInterval(runtime.freshnessInterval);
    runtime.freshnessInterval = setInterval(function() {
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
      if (runtime.panelOptionsCleanup) {
        runtime.panelOptionsCleanup();
        runtime.panelOptionsCleanup = null;
      }
      leavePlayback(false);
      var oldModel = getModelNameFromUrl(runtime.lastUrl);
      runtime.lastUrl = location.href;
      if (oldModel && oldModel !== "unknown") {
        saveSession(oldModel);
      }
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
    runtime.TIERSCOPE_VERSION = "3.10.0";
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
      { key: "withtokens", label: "With Tokens", icon: "💎", color: "#ff69b4", height: 28, display: "flex" },
      { key: "total", label: "Registered", icon: "📊", color: "#ffffff", height: 28, display: "flex" },
      { key: "anon", label: "Anonymous", icon: "👻", color: "#888888", height: 50, display: "block" }
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
      cancelGifExport();
      leavePlayback(false);
      var modelName = getModelName();
      if (modelName && modelName !== "unknown") {
        saveSession(modelName);
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
