/**
 * Copyright (C) 2026 Kibidango086
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * My Startpage —— 个人 Material You 风格起始页（by Kibidango086）。
 * 设计灵感来自 QUIK 2（https://github.com/quik-page/quik2，GPL-3.0），
 * 代码为 TypeScript + mdui v2 原创实现，未直接复制原项目代码。
 * 本项目以 GNU General Public License v3.0 发布，完整文本见根目录 LICENSE。
 */
/**
 * 表达式计算器（Sprint 3）。
 *
 * 手写递归下降解析器，不依赖 eval / Function，支持：
 *   - 运算符：+ - * / % ^（^ 为幂运算）
 *   - 括号与一元正负号
 *   - 常量：π / pi、e、τ / tau
 *   - 函数：sqrt、cbrt、abs、round、floor、ceil、sign、
 *          sin、cos、tan、asin、acos、atan、sinh、cosh、tanh、
 *          ln（自然对数）、log/log10、log2、exp
 *
 * 例：=1+2*3 → 7；=sqrt(16) → 4；=π^2 → 9.869604401…
 */

/**
 * 计算器：实现为原创的递归下降表达式解析器。
 * "= 表达式即算"交互灵感来自 QUIK 2（https://github.com/quik-page/quik2，GPL-3.0）。
 */
/** 表达式解析 / 求值失败时抛出的错误 */
export class CalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CalculationError';
  }
}

/** 支持的函数表 */
const FUNCTIONS: Readonly<Record<string, (...args: number[]) => number>> = {
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  abs: Math.abs,
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
  sign: Math.sign,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  ln: Math.log,
  log: Math.log10,
  log10: Math.log10,
  log2: Math.log2,
  exp: Math.exp,
};

/** 支持的常量表（含希腊字母 π / τ） */
const CONSTANTS: Readonly<Record<string, number>> = {
  pi: Math.PI,
  π: Math.PI,
  e: Math.E,
  tau: Math.PI * 2,
  τ: Math.PI * 2,
};

const IDENT_RE = /[a-zA-Zπτ]/;

/** 递归下降解析器 */
class Parser {
  private pos = 0;

  constructor(private readonly src: string) {}

  skipWhitespace(): void {
    while (this.pos < this.src.length && /\s/.test(this.src[this.pos])) {
      this.pos++;
    }
  }

  atEnd(): boolean {
    return this.pos >= this.src.length;
  }

  private peek(): string | undefined {
    return this.src[this.pos];
  }

  /** expression := term (('+' | '-') term)* */
  parse(): number {
    const value = this.parseAddSub();
    this.skipWhitespace();
    if (!this.atEnd()) {
      throw new CalculationError(`无法解析表达式剩余部分：「${this.src.slice(this.pos)}」`);
    }
    return value;
  }

  private parseAddSub(): number {
    let left = this.parseMulDiv();
    for (;;) {
      this.skipWhitespace();
      const ch = this.peek();
      if (ch === '+') {
        this.pos++;
        left += this.parseMulDiv();
      } else if (ch === '-') {
        this.pos++;
        left -= this.parseMulDiv();
      } else {
        return left;
      }
    }
  }

  private parseMulDiv(): number {
    let left = this.parsePower();
    for (;;) {
      this.skipWhitespace();
      const ch = this.peek();
      if (ch === '*') {
        this.pos++;
        left *= this.parsePower();
      } else if (ch === '/') {
        this.pos++;
        left /= this.parsePower();
      } else if (ch === '%') {
        this.pos++;
        left %= this.parsePower();
      } else {
        return left;
      }
    }
  }

  /** 幂运算：右结合（2^3^2 = 2^(3^2)） */
  private parsePower(): number {
    const base = this.parseUnary();
    this.skipWhitespace();
    if (this.peek() === '^') {
      this.pos++;
      const exponent = this.parsePower();
      return Math.pow(base, exponent);
    }
    return base;
  }

  private parseUnary(): number {
    this.skipWhitespace();
    const ch = this.peek();
    if (ch === '-') {
      this.pos++;
      return -this.parseUnary();
    }
    if (ch === '+') {
      this.pos++;
      return this.parseUnary();
    }
    return this.parsePrimary();
  }

  private parsePrimary(): number {
    this.skipWhitespace();
    const ch = this.peek();
    if (ch === '(') {
      this.pos++;
      const value = this.parseAddSub();
      this.skipWhitespace();
      if (this.peek() !== ')') {
        throw new CalculationError('缺少右括号');
      }
      this.pos++;
      return value;
    }
    if (ch === undefined) {
      throw new CalculationError('表达式不完整');
    }
    if (ch === '.' || (ch !== undefined && /\d/.test(ch))) {
      return this.parseNumber();
    }
    if (ch !== undefined && IDENT_RE.test(ch)) {
      return this.parseIdentifier();
    }
    throw new CalculationError(`无法识别的字符：「${ch}」`);
  }

  private parseNumber(): number {
    const start = this.pos;
    while (this.pos < this.src.length && /[\d.]/.test(this.src[this.pos])) {
      this.pos++;
    }
    const raw = this.src.slice(start, this.pos);
    if (raw === '.' || raw === '') {
      throw new CalculationError(`无效数字：「${raw}」`);
    }
    const value = Number(raw);
    if (Number.isNaN(value)) {
      throw new CalculationError(`无效数字：「${raw}」`);
    }
    return value;
  }

  private parseIdentifier(): number {
    const start = this.pos;
    while (
      this.pos < this.src.length &&
      IDENT_RE.test(this.src[this.pos])
    ) {
      this.pos++;
    }
    const name = this.src.slice(start, this.pos);
    this.skipWhitespace();

    // 函数调用：name(args…)
    if (this.peek() === '(') {
      const fn = FUNCTIONS[name];
      if (fn === undefined) {
        throw new CalculationError(`未知函数：「${name}」`);
      }
      this.pos++;
      const args: number[] = [];
      this.skipWhitespace();
      if (this.peek() === ')') {
        this.pos++;
      } else {
        for (;;) {
          args.push(this.parseAddSub());
          this.skipWhitespace();
          const ch = this.peek();
          if (ch === ',') {
            this.pos++;
            continue;
          }
          if (ch === ')') {
            this.pos++;
            break;
          }
          throw new CalculationError('函数参数格式错误');
        }
      }
      return fn(...args);
    }

    // 常量
    const constant = CONSTANTS[name];
    if (constant === undefined) {
      throw new CalculationError(`未知标识符：「${name}」`);
    }
    return constant;
  }
}

/**
 * 求值表达式（不含前导 =）。
 * 返回数值；NaN 视为错误抛出，±Infinity 原样返回（如 1/0）。
 */
export function evaluate(expression: string): number {
  const src = expression.trim();
  if (src === '') {
    throw new CalculationError('表达式为空');
  }
  const value = new Parser(src).parse();
  if (Number.isNaN(value)) {
    throw new CalculationError('计算结果无效');
  }
  return value;
}

/**
 * 结果格式化：消除浮点噪声（0.1+0.2 → 0.3），
 * 绝对值 < 1e-12 视为 0，保留至多 12 位有效数字。
 */
export function formatResult(value: number): string {
  if (!Number.isFinite(value)) {
    return String(value);
  }
  if (Math.abs(value) < 1e-12) {
    return '0';
  }
  return String(Number(value.toPrecision(12)));
}
