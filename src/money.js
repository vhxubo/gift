const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
const units = ['', '拾', '佰', '仟'];
const largeUnits = ['', '万', '亿'];

function formatGroup(value) {
  let result = '';
  let pendingZero = false;

  for (let index = 3; index >= 0; index -= 1) {
    const divisor = 10 ** index;
    const digit = Math.floor(value / divisor) % 10;
    if (digit) {
      if (pendingZero) result += digits[0];
      result += `${digits[digit]}${units[index]}`;
      pendingZero = false;
    } else if (result) {
      pendingZero = true;
    }
  }

  return result;
}

function formatInteger(value) {
  if (!value) return digits[0];
  const groups = [];
  while (value) {
    groups.push(value % 10000);
    value = Math.floor(value / 10000);
  }

  let result = '';
  let pendingZero = false;
  for (let index = groups.length - 1; index >= 0; index -= 1) {
    const group = groups[index];
    if (!group) {
      pendingZero = Boolean(result);
      continue;
    }
    if (result && (pendingZero || group < 1000)) result += digits[0];
    result += `${formatGroup(group)}${largeUnits[index]}`;
    pendingZero = false;
  }
  return result;
}

export function formatChineseMoney(input) {
  if (input === '') return '';
  const amount = Number(input);
  if (!Number.isFinite(amount) || amount < 0 || amount > 999999999999.99) return '';

  const cents = Math.round((amount + Number.EPSILON) * 100);
  const yuan = Math.floor(cents / 100);
  const jiao = Math.floor(cents % 100 / 10);
  const fen = cents % 10;
  let result = `${formatInteger(yuan)}元`;

  if (!jiao && !fen) return `${result}整`;
  if (jiao) result += `${digits[jiao]}角`;
  if (fen) result += `${yuan && !jiao ? digits[0] : ''}${digits[fen]}分`;
  return result;
}
