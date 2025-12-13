/*! Copyright jeffy-g 2025
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
export const isBrowser =
  typeof window !== "undefined" && typeof window.document !== "undefined";
let web_safe_list = Array.from({ length: 216 });
let gray_list = Array.from({ length: 24 });
export function getRgbFrom256Index(index) {
  if (index < 16 || index > 255) return null;
  if (index >= 232) {
    const level = index - 232;
    let rgb = gray_list[level];
    if (!rgb) {
      const n = 8 + level * 10;
      gray_list[level] = rgb = { r: n, g: n, b: n };
    }
    return rgb;
  }
  const cubeIndex = index - 16;
  let rgb = web_safe_list[cubeIndex];
  if (!rgb) {
    const hexNumA = [0, 0x33, 0x66, 0x99, 0xcc, 0xff];
    const bIndex = cubeIndex % 6;
    const gIndex = ((cubeIndex / 6) | 0) % 6;
    const rIndex = ((cubeIndex / 36) | 0) % 6;
    web_safe_list[cubeIndex] = rgb = {
      r: hexNumA[rIndex],
      g: hexNumA[gIndex],
      b: hexNumA[bIndex],
    };
  }
  return rgb;
}
const _tc = (color, isBg) =>
  `${/** @type {Rule} */ (isBg ? "background" : "color")}:${color};`;
const SGR_TO_CSS_Map = {
  [0]: "", // reset
  [1]: "font-weight: bold;", // bold
  [2]: "opacity: 0.6;", // dim (TODO: 2025/11/28 - opacity は browser console では無視される仕様)
  [3]: "font-style: italic;", // italic
  [4]: "text-decoration:underline;", // underline
  [53]: "text-decoration:overline;", // overline
  [7]: "filter: invert(1);", // inverse DEVNOTE: 厳密な再現は、現在の fg/bg 状態を持っておいて、7 を見たらスワップした CSS を生成する
  [8]: "color: transparent;", // hidden
  [9]: "text-decoration:line-through;", // strikethrough
  24: "underline", // share with **22**
  29: "line-through",
  55: "overline",
  [30]: _tc("#000"), // #000
  [31]: _tc("#cd3131"), // #cd3131
  [32]: _tc("#0dbc79"), // #0dbc79
  [33]: _tc("#e5e510"), // #e5e510
  [34]: _tc("#2472c8"), // #2472c8
  [35]: _tc("#bc3fbc"), // #bc3fbc
  [36]: _tc("#11a8cd"), // #11a8cd
  [37]: _tc("#e5e5e5"), // #e5e5e5
  [40]: _tc("#000", 1),
  [41]: _tc("#cd3131", 1),
  [42]: _tc("#0dbc79", 1),
  [43]: _tc("#e5e510", 1),
  [44]: _tc("#2472c8", 1),
  [45]: _tc("#bc3fbc", 1),
  [46]: _tc("#11a8cd", 1),
  [47]: _tc("#e5e5e5", 1),
  [90]: _tc("#666666"), // #666666
  [91]: _tc("#f14c4c"), // #f14c4c
  [92]: _tc("#23d18b"), // #23d18b
  [93]: _tc("#f5f543"), // #f5f543
  [94]: _tc("#3b8eea"), // #3b8eea
  [95]: _tc("#d670d6"), // #d670d6
  [96]: _tc("#29b8dB"), // #29b8dB
  [97]: _tc("#ededed"), // #e5e5e5
  [100]: _tc("#666666", 1),
  [101]: _tc("#f14c4c", 1),
  [102]: _tc("#23d18b", 1),
  [103]: _tc("#f5f543", 1),
  [104]: _tc("#3b8eea", 1),
  [105]: _tc("#d670d6", 1),
  [106]: _tc("#29b8dB", 1),
  [107]: _tc("#ededed", 1),
};
const SGR_TO_CSS = (() => {
  const ar = Array.from({ length: 108 });
  for (const idx in SGR_TO_CSS_Map) {
    ar[idx] = SGR_TO_CSS_Map[idx];
  }
  return ar;
})();
const pargeStyle = (token, cssState, tdCriteria) => {
  const finded = cssState.findIndex((state) => state.startsWith(token));
  if (finded !== -1) {
    if (tdCriteria) {
      // means "text-decoration" rule
      const tdValues = cssState[finded]
        .slice(16, -1)
        .split(" ")
        .filter((rule) => rule !== tdCriteria);
      if (tdValues.length) {
        // merge rules
        cssState[finded] = `text-decoration:${tdValues.join(" ")};`;
        return 1;
      }
    }
    cssState.splice(finded, 1);
    return 1;
  }
  return 0;
};
const handleResetCode = (cssState, code) => {
  if (code === 0) {
    cssState.length = 0;
    return true;
  }
  let tokens;
  let tdCriteria;
  switch (code) {
    case 22: {
      // font-weight, opacity (bold, dim)
      tokens = ["font-weight:", "opacity:"];
      break;
    }
    case 23: {
      // font-style: (italic)
      tokens = "font-style:";
      break;
    }
    case 24:
    case 29:
    case 55: {
      // text-decoration: (underline, overline, strikethrough)
      tokens = "text-decoration:";
      tdCriteria = SGR_TO_CSS[code];
      break;
    }
    case 27: {
      // filter: (invers)
      tokens = "filter:";
      break;
    }
    case 28:
    case 39: {
      // color: (hidden, Default foreground color)
      tokens = "color:";
      break;
    }
    case 49: {
      // color: (Default background color)
      tokens = "background:";
      break;
    }
    default:
      return false;
  }
  let isChanged;
  if (tokens) {
    if (Array.isArray(tokens)) {
      for (const token of tokens) {
        isChanged |= pargeStyle(token, cssState);
      }
    } else {
      isChanged |= pargeStyle(tokens, cssState, tdCriteria);
    }
  }
  return !!isChanged;
};
const updateCssState = (css, cssState) => {
  const comingPropName = css.slice(0, css.indexOf(":"));
  const isTextDecoration = comingPropName === "text-decoration";
  const reTdTest = /^text-decoration/;
  for (let i = 0, cssStateLen = cssState.length; i < cssStateLen; ) {
    const _css = cssState[i++];
    if (isTextDecoration && reTdTest.test(_css)) {
      const prev = _css.slice(16, -1).trim().split(" ");
      const next = css.slice(16, -1).trim();
      if (!prev.includes(next)) {
        prev.push(next);
        cssState[i - 1] = `text-decoration:${prev.join(" ")};`;
      }
      return;
    } else {
      const propName = _css.slice(0, _css.indexOf(":"));
      if (comingPropName === propName) {
        cssState[i - 1] = css;
        return;
      }
    }
  }
  cssState.push(css);
};
const resolveAnsiColor = (codeOffset, codes, sgr2css, cssState) => {
  const code = codes[codeOffset++];
  let css = sgr2css[code];
  if (!css) {
    const propName = code === "38" ? "color" : "background";
    const isRGB = codes[codeOffset++] === "2";
    if (isRGB) {
      css = `${propName}: rgb(${codes[codeOffset]} ${codes[codeOffset + 1]} ${codes[codeOffset + 2]});`;
      codeOffset += 3;
    } else {
      const color256Index = +codes[codeOffset++];
      let rgbEntry = getRgbFrom256Index(color256Index);
      if (rgbEntry) {
        css = `${propName}: rgb(${rgbEntry.r} ${rgbEntry.g} ${rgbEntry.b});`;
      } else {
        const shift = propName === "background" ? 10 : 0;
        const base = color256Index & 8 ? 82 : 30;
        css = sgr2css[color256Index + base + shift];
      }
    }
  }
  updateCssState(css, cssState);
  return codeOffset;
};
export function toConsoleArgsFromAnsi(format, ...comingArgs) {
  if (!isBrowser) return [format, comingArgs];
  const sgr2css = SGR_TO_CSS;
  let cssState = [];
  let isStyleApplied = false;
  let lastIndex = 0;
  let formatLine = "";
  const args = [];
  const updateFormatLine = (text) => {
    if (!text) return;
    if (!isStyleApplied) {
      text = "%c" + text;
      args.push(cssState.join(""));
      isStyleApplied = true;
    }
    formatLine += text;
  };
  const re = /(?:\x1b\[([0-9;]+)m|((?<!%)%[0-9.]*[sdifoOc]))/g;
  let matches;
  while ((matches = re.exec(format))) {
    let criteria = matches[2];
    if (criteria) {
      const fragment = format.slice(lastIndex, matches.index + criteria.length);
      if (isStyleApplied) {
        formatLine += fragment;
        args.push(comingArgs.shift());
      } else {
        formatLine += "%c" + fragment;
        args.push(cssState.join(""), comingArgs.shift());
        isStyleApplied = true;
      }
      lastIndex = re.lastIndex;
      continue;
    }
    if (lastIndex < matches.index) {
      // means will be empty string
      updateFormatLine(format.slice(lastIndex, matches.index));
    }
    lastIndex = re.lastIndex;
    isStyleApplied = false;
    const codes = matches[1].split(";");
    for (let idx = 0, codesLen = codes.length; idx < codesLen; ) {
      if (handleResetCode(cssState, +codes[idx])) {
        idx++;
      } else {
        idx = resolveAnsiColor(idx, codes, sgr2css, cssState);
      }
      /*/
            // これは若干 perf down する...
            idx = handleResetCode(cssState, +codes[idx]) ? idx + 1 : resolveAnsiColor(idx, codes, sgr2css, cssState);
            //*/
    }
  }
  updateFormatLine(format.slice(lastIndex));
  return [formatLine, args.concat(comingArgs)];
}
export const logAnsi = (() => {
  if (!isBrowser) return console.log;
  return (...argsIn) => {
    if (!argsIn.length) return console.log();
    let format = argsIn[0];
    if (typeof format !== "string") return console.log(...argsIn);
    let fmtArgs;
    [format, fmtArgs = []] = toConsoleArgsFromAnsi(format, ...argsIn.slice(1));
    console.log(format, ...fmtArgs);
  };
})();
