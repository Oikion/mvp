"use client";

import { cn } from "@/lib/utils";
import type { HTMLMotionProps, Variants } from "motion/react";
import { motion, useAnimation, useReducedMotion } from "motion/react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

export interface ClipboardListHandle {
	startAnimation: () => void;
	stopAnimation: () => void;
}

interface ClipboardListProps extends HTMLMotionProps<"div"> {
	size?: number;
	duration?: number;
}

const ClipboardListIcon = forwardRef<ClipboardListHandle, ClipboardListProps>(
	(
		{
			onMouseEnter,
			onMouseLeave,
			className,
			size = 28,
			duration = 1,
			...props
		},
		ref,
	) => {
		const controls = useAnimation();
		const reduced = useReducedMotion();
		const isControlled = useRef(false);

		useImperativeHandle(ref, () => {
			isControlled.current = true;
			return {
				startAnimation: () =>
					reduced ? controls.start("normal") : controls.start("animate"),
				stopAnimation: () => controls.start("normal"),
			};
		});

		const handleEnter = useCallback(
			(e?: React.MouseEvent<HTMLDivElement>) => {
				if (reduced) return;
				if (isControlled.current) {
					onMouseEnter?.(e as any);
				} else {
					controls.start("animate");
				}
			},
			[controls, reduced, onMouseEnter],
		);

		const handleLeave = useCallback(
			(e?: React.MouseEvent<HTMLDivElement>) => {
				if (isControlled.current) {
					onMouseLeave?.(e as any);
				} else {
					controls.start("normal");
				}
			},
			[controls, onMouseLeave],
		);

		const clipVariants: Variants = {
			normal: { scale: 1, y: 0 },
			animate: {
				scale: [1, 1.1, 1],
				y: [0, -1, 0],
				transition: {
					duration: 0.4 * duration,
					ease: "easeInOut" as const,
				},
			},
		};

		const boardVariants: Variants = {
			normal: { scale: 1, opacity: 1 },
			animate: {
				scale: [1, 1.05, 1],
				opacity: [1, 0.85, 1],
				transition: {
					duration: 0.5 * duration,
					ease: "easeInOut" as const,
				},
			},
		};

		const listItemVariants: Variants = {
			normal: { opacity: 1, x: 0 },
			animate: {
				opacity: [0, 1],
				x: [-3, 0],
				transition: {
					duration: 0.35 * duration,
					delay: 0.15,
					ease: "easeOut" as const,
				},
			},
		};

		const listItem2Variants: Variants = {
			normal: { opacity: 1, x: 0 },
			animate: {
				opacity: [0, 1],
				x: [-3, 0],
				transition: {
					duration: 0.35 * duration,
					delay: 0.25,
					ease: "easeOut" as const,
				},
			},
		};

		return (
			<motion.div
				className={cn("inline-flex items-center justify-center", className)}
				onMouseEnter={handleEnter}
				onMouseLeave={handleLeave}
				{...props}
			>
				<motion.svg
					xmlns="http://www.w3.org/2000/svg"
					width={size}
					height={size}
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					className="lucide lucide-clipboard-list"
				>
					{/* Clipboard clip (top tab) */}
					<motion.rect
						width="8"
						height="4"
						x="8"
						y="2"
						rx="1"
						ry="1"
						variants={clipVariants}
						initial="normal"
						animate={controls}
					/>
					{/* Board outline */}
					<motion.path
						d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"
						variants={boardVariants}
						initial="normal"
						animate={controls}
					/>
					{/* List item 1: bullet + line */}
					<motion.path
						d="M8 11h.01"
						variants={listItemVariants}
						initial="normal"
						animate={controls}
					/>
					<motion.path
						d="M12 11h4"
						variants={listItemVariants}
						initial="normal"
						animate={controls}
					/>
					{/* List item 2: bullet + line */}
					<motion.path
						d="M8 16h.01"
						variants={listItem2Variants}
						initial="normal"
						animate={controls}
					/>
					<motion.path
						d="M12 16h4"
						variants={listItem2Variants}
						initial="normal"
						animate={controls}
					/>
				</motion.svg>
			</motion.div>
		);
	},
);

ClipboardListIcon.displayName = "ClipboardListIcon";
export { ClipboardListIcon };
