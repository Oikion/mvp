"use client";

import { cn } from "@/lib/utils";
import type { HTMLMotionProps, Variants } from "motion/react";
import { motion, useAnimation, useReducedMotion } from "motion/react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

export interface ContactRoundHandle {
	startAnimation: () => void;
	stopAnimation: () => void;
}

interface ContactRoundProps extends HTMLMotionProps<"div"> {
	size?: number;
	duration?: number;
}

const ContactRoundIcon = forwardRef<ContactRoundHandle, ContactRoundProps>(
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

		const circleVariants: Variants = {
			normal: { scale: 1, opacity: 1 },
			animate: {
				scale: [1, 1.15, 1],
				opacity: [1, 0.8, 1],
				transition: {
					duration: 0.5 * duration,
					ease: "easeInOut" as const,
				},
			},
		};

		const headVariants: Variants = {
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

		const bodyVariants: Variants = {
			normal: { scale: 1, y: 0 },
			animate: {
				scale: [1, 1.05, 1],
				y: [0, 1, 0],
				transition: {
					duration: 0.4 * duration,
					delay: 0.1,
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
					className="lucide lucide-contact-round"
				>
					<motion.circle
						cx="12"
						cy="12"
						r="10"
						variants={circleVariants}
						initial="normal"
						animate={controls}
					/>
					<motion.circle
						cx="12"
						cy="10"
						r="3"
						variants={headVariants}
						initial="normal"
						animate={controls}
					/>
					<motion.path
						d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"
						variants={bodyVariants}
						initial="normal"
						animate={controls}
					/>
				</motion.svg>
			</motion.div>
		);
	},
);

ContactRoundIcon.displayName = "ContactRoundIcon";
export { ContactRoundIcon };

