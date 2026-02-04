"use client";

import { cn } from "@/lib/utils";
import type { HTMLMotionProps, Variants } from "motion/react";
import { motion, useAnimation, useReducedMotion } from "motion/react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

export interface DashboardHandle {
	startAnimation: () => void;
	stopAnimation: () => void;
}

interface DashboardProps extends HTMLMotionProps<"div"> {
	size?: number;
	duration?: number;
}

const DashboardIcon = forwardRef<DashboardHandle, DashboardProps>(
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

		const rectVariants: Variants = {
			normal: { scale: 1, opacity: 1 },
			animate: {
				scale: [1, 0.9, 1.05, 1],
				opacity: [1, 0.8, 1],
				transition: {
					duration: 0.5 * duration,
					ease: "easeInOut" as const,
				},
			},
		};

		const containerVariants: Variants = {
			normal: { rotate: 0 },
			animate: {
				rotate: [0, -2, 2, 0],
				transition: {
					duration: 0.6 * duration,
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
					className="lucide lucide-dashboard"
					variants={containerVariants}
					initial="normal"
					animate={controls}
				>
					<motion.rect
						width="7"
						height="9"
						x="3"
						y="3"
						rx="1"
						variants={rectVariants}
						initial="normal"
						animate={controls}
					/>
					<motion.rect
						width="7"
						height="5"
						x="14"
						y="3"
						rx="1"
						variants={rectVariants}
						initial="normal"
						animate={controls}
						custom={1}
					/>
					<motion.rect
						width="7"
						height="9"
						x="14"
						y="12"
						rx="1"
						variants={rectVariants}
						initial="normal"
						animate={controls}
						custom={2}
					/>
					<motion.rect
						width="7"
						height="5"
						x="3"
						y="16"
						rx="1"
						variants={rectVariants}
						initial="normal"
						animate={controls}
						custom={3}
					/>
				</motion.svg>
			</motion.div>
		);
	},
);

DashboardIcon.displayName = "DashboardIcon";
export { DashboardIcon };

