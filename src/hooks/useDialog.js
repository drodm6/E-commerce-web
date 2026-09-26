import { useEffect, useRef, useState, useCallback } from "react";
import { prefersReducedMotion } from "../utils/helpers.js";

// Shared behaviour for every modal / drawer:
//  • locks page scroll (nested dialogs are reference-counted)
//  • moves focus inside, traps Tab, restores focus on close
//  • Esc closes only the top-most dialog

const stack = [];
let scrollLocks = 0;

function lockScroll() {
  if (scrollLocks++ === 0) {
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;
  }
}

function unlockScroll() {
  if (--scrollLocks <= 0) {
    scrollLocks = 0;
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
  }
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useDialog(ref, onRequestClose) {
  const closeRef = useRef(onRequestClose);
  closeRef.current = onRequestClose;

  useEffect(() => {
    const node = ref.current;
    const previouslyFocused = document.activeElement;
    const token = {};
    stack.push(token);
    lockScroll();

    const first = node?.querySelector("[data-autofocus]") || node;
    first?.focus({ preventScroll: true });

    function onKey(e) {
      if (stack[stack.length - 1] !== token || !node) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        closeRef.current?.();
      } else if (e.key === "Tab") {
        const items = [...node.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
        if (!items.length) return;
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === firstEl || document.activeElement === node)) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      const i = stack.indexOf(token);
      if (i >= 0) stack.splice(i, 1);
      unlockScroll();
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus?.({ preventScroll: true });
      }
    };
  }, [ref]);
}

// Plays a CSS exit animation before actually unmounting.
// Returns [closing, requestClose].
export function useExitAnimation(onClose, duration = 280) {
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const requestClose = useCallback(
    (...args) => {
      if (closingRef.current) return;
      closingRef.current = true;
      setClosing(true);
      setTimeout(() => onCloseRef.current?.(...args), prefersReducedMotion() ? 0 : duration);
    },
    [duration]
  );

  return [closing, requestClose];
}
