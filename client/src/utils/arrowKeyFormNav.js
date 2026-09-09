import { useEffect } from "react";

// Lets a user move between form fields with arrow keys instead of having
// to click every field by hand — the whole reason this exists is that
// filling long forms (Admission Form, Information Sheet, etc.) one
// click-then-type at a time is slow.
//
//   Up / Down   — always jumps to the nearest field above/below, by visual
//                 position (not DOM order), so it works across multi-column
//                 row layouts the same way spreadsheet navigation does.
//   Left / Right — only jumps to the previous/next field when the text
//                 caret is already at the very start/end of the current
//                 field's text. Anywhere else, the arrow key still just
//                 moves the caret within the text, exactly like normal —
//                 this is what stops the feature from breaking in-place
//                 editing.
//
// <select> elements are valid *targets* (you can arrow into one from a
// neighboring field) but not a navigation *trigger* — once focus is on a
// select, arrow keys keep their native meaning (cycling its own options),
// since that's essential dropdown behavior. Leaving a select still works
// via Tab or a click. Checkboxes/radios are excluded entirely — arrow
// keys already navigate within a radio group natively.

const FOCUSABLE_SELECTOR = [
  'input[type="text"]',
  'input[type="number"]',
  'input[type="email"]',
  'input[type="tel"]',
  'input[type="search"]',
  'input[type="url"]',
  'input[type="password"]',
  'input[type="date"]',
  "input:not([type])",
  "select",
  "textarea",
].join(", ");

const TEXT_LIKE_SELECTOR = [
  'input[type="text"]',
  'input[type="number"]',
  'input[type="email"]',
  'input[type="tel"]',
  'input[type="search"]',
  'input[type="url"]',
  'input[type="password"]',
  "input:not([type])",
  "textarea",
].join(", ");

const getFocusableFields = (container) =>
  Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.disabled && !el.readOnly && el.offsetParent !== null
  );

// Nearest field above/below by actual screen position, preferring the
// closest row first and then the closest column within that row — this is
// what makes Up/Down feel right in a form laid out as a Bootstrap grid of
// rows/columns rather than one single vertical list.
const findVerticalTarget = (fields, current, direction) => {
  const currentRect = current.getBoundingClientRect();
  const candidates = fields
    .filter((el) => el !== current)
    .map((el) => ({ el, rect: el.getBoundingClientRect() }))
    .filter(({ rect }) =>
      direction === "up"
        ? rect.top < currentRect.top - 2
        : rect.top > currentRect.top + 2
    );
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    const vDiff = Math.abs(a.rect.top - currentRect.top) - Math.abs(b.rect.top - currentRect.top);
    if (Math.abs(vDiff) > 2) return vDiff;
    return Math.abs(a.rect.left - currentRect.left) - Math.abs(b.rect.left - currentRect.left);
  });
  return candidates[0].el;
};

// Number inputs don't reliably support selectionStart/selectionEnd in
// every browser — reading it can even throw. Treat "can't tell" as
// "let the arrow key navigate", same as an empty field would.
const caretAtStart = (el) => {
  try {
    return el.selectionStart === 0 && el.selectionEnd === 0;
  } catch {
    return true;
  }
};
const caretAtEnd = (el) => {
  try {
    return el.selectionStart === el.value.length && el.selectionEnd === el.value.length;
  } catch {
    return true;
  }
};

const onFirstLine = (el) => el.value.slice(0, el.selectionStart).indexOf("\n") === -1;
const onLastLine = (el) => el.value.slice(el.selectionEnd).indexOf("\n") === -1;

/**
 * Attaches arrow-key form navigation to every focusable field inside
 * `container`. Returns a cleanup function — call it on unmount.
 */
export const attachArrowKeyNavigation = (container) => {
  if (!container) return () => {};

  const handleKeyDown = (e) => {
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
    const target = e.target;
    if (!target.matches?.(FOCUSABLE_SELECTOR)) return;

    const fields = getFocusableFields(container);

    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      // Selects keep native Up/Down (change selected option). Textareas
      // only hand off to navigation once the caret is on the first/last
      // line, so multi-line editing still works normally in between.
      if (target.tagName === "SELECT") return;
      if (target.tagName === "TEXTAREA") {
        if (e.key === "ArrowUp" && !onFirstLine(target)) return;
        if (e.key === "ArrowDown" && !onLastLine(target)) return;
      }
      const next = findVerticalTarget(fields, target, e.key === "ArrowUp" ? "up" : "down");
      if (next) {
        e.preventDefault();
        next.focus();
      }
      return;
    }

    // Left/Right: only for text-like fields, and only at the caret boundary.
    if (!target.matches(TEXT_LIKE_SELECTOR)) return;
    const idx = fields.indexOf(target);
    if (e.key === "ArrowRight" && caretAtEnd(target)) {
      const next = fields[idx + 1];
      if (next) {
        e.preventDefault();
        next.focus();
      }
    } else if (e.key === "ArrowLeft" && caretAtStart(target)) {
      const prev = fields[idx - 1];
      if (prev) {
        e.preventDefault();
        prev.focus();
      }
    }
  };

  container.addEventListener("keydown", handleKeyDown);
  return () => container.removeEventListener("keydown", handleKeyDown);
};

/**
 * Convenience hook — attaches arrow-key navigation to a ref'd container for
 * the lifetime of the component. `containerRef.current` only needs to be
 * set once; the listener is delegated, so it keeps working as fields are
 * added/removed/re-rendered inside the container without re-attaching.
 */
export const useArrowKeyFormNav = (containerRef) => {
  useEffect(() => attachArrowKeyNavigation(containerRef.current), [containerRef]);
};
