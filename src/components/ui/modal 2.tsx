"use client";

import { ReactNode } from "react";

    type ModalProps = {
    open: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    };

    export function Modal({ open, onClose, title, children }: ModalProps) {
    if (!open) return null;

    return (
        <div
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        onClick={onClose}
        >
        <div
            className="bg-card border border-border rounded-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
        >
            <h2 className="text-lg font-semibold mb-4">{title}</h2>
            {children}
        </div>
        </div>
    );
    }