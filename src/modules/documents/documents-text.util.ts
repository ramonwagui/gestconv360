const repairMojibakeUtf8 = (value: string) => {
  const hasSuspiciousEncoding = /[ÃÂ�\u0080-\u009F]/.test(value);
  if (!hasSuspiciousEncoding) {
    return value;
  }

  try {
    const bytes = Uint8Array.from(Array.from(value).map((char) => char.charCodeAt(0) & 0xff));
    const repaired = new TextDecoder("utf-8").decode(bytes);
    if (repaired.includes("\uFFFD")) {
      return value;
    }
    return repaired;
  } catch {
    return value;
  }
};

const stripInvalidControlChars = (value: string) => {
  return value.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
};

const collapseSpaces = (value: string) => {
  return value.replace(/\s+/g, " ").trim();
};

export const sanitizeDocumentTitle = (value: string, maxLength = 180) => {
  const repaired = repairMojibakeUtf8(value);
  const cleaned = collapseSpaces(stripInvalidControlChars(repaired));
  return cleaned.slice(0, maxLength);
};

export const sanitizeOptionalText = (value: string | null | undefined, maxLength = 1000) => {
  if (value === null || value === undefined) {
    return null;
  }

  const repaired = repairMojibakeUtf8(value);
  const cleaned = collapseSpaces(stripInvalidControlChars(repaired));
  return cleaned.length > 0 ? cleaned.slice(0, maxLength) : null;
};
