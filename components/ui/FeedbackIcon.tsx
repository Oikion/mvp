"use client";

import { cn } from "@/lib/utils";
import type { HTMLMotionProps, Variants } from "motion/react";
import { motion, useAnimation, useReducedMotion } from "motion/react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

export interface FeedbackIconHandle {
	startAnimation: () => void;
	stopAnimation: () => void;
}

interface FeedbackIconProps extends HTMLMotionProps<"div"> {
	size?: number;
	duration?: number;
}

const FeedbackIcon = forwardRef<FeedbackIconHandle, FeedbackIconProps>(
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
				if (!isControlled.current) controls.start("animate");
				else onMouseEnter?.(e as any);
			},
			[controls, reduced, onMouseEnter],
		);

		const handleLeave = useCallback(
			(e?: React.MouseEvent<HTMLDivElement>) => {
				if (!isControlled.current) controls.start("normal");
				else onMouseLeave?.(e as any);
			},
			[controls, onMouseLeave],
		);

		const containerVariants: Variants = {
			normal: { scale: 1, rotate: 0 },
			animate: {
				scale: [1, 1.05, 1],
				rotate: [0, -2, 2, 0],
				transition: {
					duration: 0.6 * duration,
					ease: "easeInOut" as const,
				},
			},
		};

		const messageVariants: Variants = {
			normal: { pathLength: 1, opacity: 1 },
			animate: {
				pathLength: [0.8, 1],
				opacity: [0.7, 1],
				transition: {
					duration: 0.5 * duration,
					ease: "easeInOut" as const,
				},
			},
		};

		const lineVariants: Variants = {
			normal: { scaleX: 1, opacity: 1 },
			animate: {
				scaleX: [0, 1.1, 1],
				opacity: [0, 1],
				transition: {
					duration: 0.4 * duration,
					delay: 0.2,
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
					className="lucide lucide-message-square"
					variants={containerVariants}
					initial="normal"
					animate={controls}
				>
					<motion.path
						d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
						variants={messageVariants}
						initial="normal"
						animate={controls}
					/>
					<motion.line
						x1="9"
						y1="10"
						x2="15"
						y2="10"
						variants={lineVariants}
						initial="normal"
						animate={controls}
					/>
				</motion.svg>
			</motion.div>
		);
	},
);

FeedbackIcon.displayName = "FeedbackIcon";
export { FeedbackIcon };

