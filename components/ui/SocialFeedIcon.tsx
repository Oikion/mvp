"use client";

import { cn } from "@/lib/utils";
import type { HTMLMotionProps, Variants } from "motion/react";
import { motion, useAnimation, useReducedMotion } from "motion/react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

export interface SocialFeedHandle {
	startAnimation: () => void;
	stopAnimation: () => void;
}

interface SocialFeedProps extends HTMLMotionProps<"div"> {
	size?: number;
	duration?: number;
}

const SocialFeedIcon = forwardRef<SocialFeedHandle, SocialFeedProps>(
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

		const waveVariants: Variants = {
			normal: { scale: 1, opacity: 1 },
			animate: (i: number) => ({
				scale: [1, 1.1, 1],
				opacity: [1, 0.7, 1],
				transition: {
					duration: 0.4 * duration,
					ease: "easeInOut" as const,
					delay: i * 0.15,
				},
			}),
		};

		const containerVariants: Variants = {
			normal: { rotate: 0 },
			animate: {
				rotate: [0, -3, 3, 0],
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
					className="lucide lucide-social-feed"
					variants={containerVariants}
					initial="normal"
					animate={controls}
				>
					{/* RSS/Broadcast style icon representing social sharing */}
					<motion.path
						d="M4 11a9 9 0 0 1 9 9"
						variants={waveVariants}
						initial="normal"
						animate={controls}
						custom={0}
					/>
					<motion.path
						d="M4 4a16 16 0 0 1 16 16"
						variants={waveVariants}
						initial="normal"
						animate={controls}
						custom={1}
					/>
					<motion.circle
						cx="5"
						cy="19"
						r="1"
						variants={waveVariants}
						initial="normal"
						animate={controls}
						custom={2}
					/>
				</motion.svg>
			</motion.div>
		);
	},
);

SocialFeedIcon.displayName = "SocialFeedIcon";
export { SocialFeedIcon };















