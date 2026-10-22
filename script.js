const display = document.getElementById("result");
const expressionEl = document.getElementById("expression");
const keypad = document.querySelector(".keypad");
const themeToggle = document.getElementById("themeToggle");

const state = {
  current: "0",
  previous: null,
  operator: null,
  overwrite: false,
  expression: "",
};

const OPERATOR_SYMBOL = { "+": "+", "-": "−", "*": "×", "/": "÷" };

function formatNumber(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "0";

  const abs = Math.abs(value);
  if (abs >= 1e12) {
    return value.toExponential().replace(/(\.\d*?)0+e/, "$1e").replace(/\.e/, "e");
  }

  return value.toLocaleString("en-US", { maximumFractionDigits: 10 });
}

function formatEntry(raw) {
  if (raw === "Error") return "Error";

  const value = parseFloat(raw);
  if (!Number.isFinite(value)) return raw;
  if (Math.abs(value) >= 1e12) return formatNumber(value);

  const negative = raw.startsWith("-");
  const body = negative ? raw.slice(1) : raw;
  const [intPart, decPart] = body.split(".");

  if (intPart === "" && decPart === undefined) return raw;

  const grouped =
    intPart === ""
      ? ""
      : Number(intPart).toLocaleString("en-US", { maximumFractionDigits: 0 });

  return `${negative ? "-" : ""}${grouped}${decPart !== undefined ? `.${decPart}` : ""}`;
}

function updateDisplay() {
  const text = formatEntry(state.current);
  display.textContent = text;
  display.style.fontSize = text.length > 12 ? "1.6rem" : "";
  expressionEl.textContent = state.expression;
}

function inputNumber(digit) {
  if (state.overwrite) {
    state.current = digit === "." ? "0." : digit;
    state.overwrite = false;
    state.expression = "";
    return;
  }

  if (digit === ".") {
    if (state.current.includes(".")) return;
    state.current += ".";
    return;
  }

  if (state.current === "0") {
    state.current = digit;
    return;
  }

  const digits = state.current.replace(/[^0-9]/g, "").length;
  if (digits >= 15) return;

  state.current += digit;
}

function compute(a, b, op) {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
      return a * b;
    case "/":
      return b === 0 ? NaN : a / b;
    default:
      return b;
  }
}

function roundResult(value) {
  return String(parseFloat(value.toPrecision(12)));
}

function inputOperator(op) {
  if (state.current === "Error") return;

  const value = parseFloat(state.current);

  if (state.operator && !state.overwrite) {
    const result = compute(state.previous, value, state.operator);
    if (!Number.isFinite(result)) return handleError();
    state.previous = result;
    state.current = roundResult(result);
  } else {
    state.previous = value;
  }

  state.operator = op;
  state.overwrite = true;
  state.expression = `${formatNumber(state.previous)} ${OPERATOR_SYMBOL[op]}`;
}

function inputEquals() {
  if (state.operator === null || state.previous === null) return;
  if (state.current === "Error") return;

  const value = parseFloat(state.current);
  const result = compute(state.previous, value, state.operator);

  if (!Number.isFinite(result)) return handleError();

  state.expression = `${formatNumber(state.previous)} ${OPERATOR_SYMBOL[state.operator]} ${formatNumber(value)} =`;
  state.previous = result;
  state.current = roundResult(result);
  state.operator = null;
  state.overwrite = true;
  updateDisplay();
}

function handleError() {
  state.current = "Error";
  state.previous = null;
  state.operator = null;
  state.overwrite = true;
  state.expression = "Cannot divide by zero";
  updateDisplay();
}

function inputClear() {
  state.current = "0";
  state.previous = null;
  state.operator = null;
  state.overwrite = false;
  state.expression = "";
  updateDisplay();
}

function inputSign() {
  if (state.current === "Error") return;
  state.current = state.current.startsWith("-")
    ? state.current.slice(1)
    : `-${state.current}`;
}

function inputPercent() {
  if (state.current === "Error") return;

  const value = parseFloat(state.current);
  const base = state.operator && state.previous !== null ? state.previous : null;
  const result = base === null ? value / 100 : (base * value) / 100;

  state.current = roundResult(result);
  updateDisplay();
}

function handleInput(target) {
  const number = target.dataset.number;
  const op = target.dataset.op;
  const action = target.dataset.action;

  if (number !== undefined) inputNumber(number);
  else if (op !== undefined) inputOperator(op);
  else if (action === "equals") inputEquals();
  else if (action === "clear") inputClear();
  else if (action === "sign") inputSign();
  else if (action === "percent") inputPercent();

  updateDisplay();
}

keypad.addEventListener("click", (event) => {
  const key = event.target.closest(".key");
  if (!key) return;
  handleInput(key);
});

document.addEventListener("keydown", (event) => {
  const { key } = event;

  if (/^[0-9]$/.test(key)) {
    inputNumber(key);
  } else if (key === ".") {
    inputNumber(".");
  } else if (["+", "-", "*", "/"].includes(key)) {
    inputOperator(key);
  } else if (key === "Enter" || key === "=") {
    inputEquals();
  } else if (key === "Backspace") {
    state.current = state.current.length > 1 ? state.current.slice(0, -1) : "0";
  } else if (key === "Escape" || key.toLowerCase() === "c") {
    inputClear();
  } else if (key === "%") {
    inputPercent();
  } else {
    return;
  }

  event.preventDefault();
  updateDisplay();
});

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  themeToggle.textContent = theme === "dark" ? "\u{1F319}" : "\u2600\uFE0F";
  try {
    localStorage.setItem("calculator-theme", theme);
  } catch {
    /* storage unavailable */
  }
}

const savedTheme = (() => {
  try {
    return localStorage.getItem("calculator-theme");
  } catch {
    return null;
  }
})();

applyTheme(
  savedTheme ||
    (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
);

themeToggle.addEventListener("click", () => {
  const next =
    document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  applyTheme(next);
});

updateDisplay();
