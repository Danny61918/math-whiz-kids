import { useEffect, useRef, type RefObject } from 'react';

/**
 * Dialog behaviour: focus the element marked data-autofocus (or the first button) on open,
 * close on Escape, lock body scroll, and restore focus on unmount.
 * Pass onClose = undefined to temporarily ignore Escape.
 */
export function useModal(containerRef: RefObject<HTMLElement | null>, onClose: (() => void) | undefined): void {
    const closeRef = useRef(onClose);
    useEffect(() => {
        closeRef.current = onClose;
    });

    useEffect(() => {
        const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const container = containerRef.current;
        const target = container?.querySelector<HTMLElement>('[data-autofocus]') ?? container?.querySelector<HTMLElement>('button');
        target?.focus();

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeRef.current?.();
        };
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = previousOverflow;
            previous?.focus();
        };
    }, [containerRef]);
}
