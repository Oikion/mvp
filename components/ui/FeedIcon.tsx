"use client";

import { cn } from "@/lib/utils";
import type { HTMLMotionProps, Variants } from "motion/react";
import { motion, useAnimation, useReducedMotion } from "motion/react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

export interface FeedHandle {
	startAnimation: () => void;
	stopAnimation: () => void;
}

interface FeedProps extends HTMLMotionProps<"div"> {
	size?: number;
	duration?: number;
}

const FeedIcon = forwardRef<FeedHandle, FeedProps>(
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

		const lineVariants: Variants = {
			normal: { scaleX: 1, opacity: 1, x: 0 },
			animate: (i: number) => ({
				scaleX: [1, 0.3, 1],
				opacity: [1, 0.5, 1],
				x: [0, -2, 0],
				transition: {
					duration: 0.4 * duration,
					ease: "easeInOut" as const,
					delay: i * 0.1,
				},
			}),
		};

		const containerVariants: Variants = {
			normal: { y: 0 },
			animate: {
				y: [0, -1, 0],
				transition: {
					duration: 0.5 * duration,
					ease: "easeInOut" as const,
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
					className="lucide lucide-activity-feed"
					variants={containerVariants}
					initial="normal"
					animate={controls}
				>
					{/* Activity/RSS Feed icon - stacked horizontal lines representing feed items */}
					<motion.path
						d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"
						variants={lineVariants}
						initial="normal"
						animate={controls}
						custom={0}
					/>
					<motion.path
						d="M18 14h-8"
						variants={lineVariants}
						initial="normal"
						animate={controls}
						custom={1}
					/>
					<motion.path
						d="M15 18h-5"
						variants={lineVariants}
						initial="normal"
						animate={controls}
						custom={2}
					/>
					<motion.path
						d="M10 6h8v4h-8V6Z"
						variants={lineVariants}
						initial="normal"
						animate={controls}
						custom={0}
					/>
				</motion.svg>
			</motion.div>
		);
	},
);

FeedIcon.displayName = "FeedIcon";
export { FeedIcon };




