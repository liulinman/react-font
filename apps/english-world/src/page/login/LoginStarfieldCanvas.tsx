import React, { useEffect, useRef } from "react";

type Star = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  phase: number;
  hue: number;
};

type PointerState = {
  active: boolean;
  x: number;
  y: number;
};

type Ripple = {
  x: number;
  y: number;
  age: number;
};

const LINK_DISTANCE = 142;
const POINTER_RANGE = 190;
const RIPPLE_LIFE = 54;

export const BLACK_HOLE_GRAVITY = {
  xRatio: 0.36,
  yRatio: 0.48,
  radius: 310,
  pull: 0.24,
  rotationSpeed: 0.00022,
};

function createStars(width: number, height: number): Star[] {
  const area = width * height;
  const targetCount = width < 640 ? 46 : Math.min(118, Math.max(72, area / 14500));

  return Array.from({ length: Math.round(targetCount) }, (_, index) => {
    const seed = index + 1;
    const x = ((seed * 73) % 997) / 997;
    const y = ((seed * 151) % 991) / 991;
    const direction = ((seed * 47) % 360) * (Math.PI / 180);
    const speed = 0.045 + ((seed * 19) % 30) / 1000;

    return {
      x: x * width,
      y: y * height,
      vx: Math.cos(direction) * speed,
      vy: Math.sin(direction) * speed,
      radius: 0.9 + ((seed * 29) % 17) / 10,
      phase: ((seed * 37) % 100) / 100,
      hue: seed % 3,
    };
  });
}

function getCanvasSize(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  return {
    width: Math.max(1, Math.round(rect.width || window.innerWidth)),
    height: Math.max(1, Math.round(rect.height || window.innerHeight)),
  };
}

function starColor(hue: number, alpha: number) {
  if (hue === 0) return `rgba(125, 211, 252, ${alpha})`;
  if (hue === 1) return `rgba(196, 181, 253, ${alpha})`;
  return `rgba(94, 234, 212, ${alpha})`;
}

function drawGravityWave(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  alpha: number,
) {
  context.save();
  context.translate(x, y);
  context.rotate(-0.18);
  context.scale(1.52, 0.52);
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.strokeStyle = `rgba(251, 191, 36, ${alpha})`;
  context.lineWidth = 1.4;
  context.stroke();
  context.restore();
}

function drawAccretionDisk(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  timestamp: number,
) {
  const rotation = timestamp * BLACK_HOLE_GRAVITY.rotationSpeed;
  const rings = [
    { radius: 118, alpha: 0.22, width: 2.4, offset: 0 },
    { radius: 158, alpha: 0.18, width: 1.7, offset: 1.7 },
    { radius: 210, alpha: 0.12, width: 1.2, offset: 3.2 },
  ];

  rings.forEach((ring, ringIndex) => {
    for (let segment = 0; segment < 3; segment += 1) {
      const start =
        rotation * (ringIndex % 2 === 0 ? 1 : -0.72) +
        ring.offset +
        segment * 2.08;
      const end = start + 0.82 + ringIndex * 0.08;

      context.save();
      context.translate(x, y);
      context.rotate(-0.2 + rotation * 0.12);
      context.scale(1.72, 0.45);
      context.beginPath();
      context.arc(0, 0, ring.radius, start, end);
      context.strokeStyle = `rgba(251, 191, 36, ${ring.alpha})`;
      context.lineWidth = ring.width;
      context.shadowColor = "rgba(251, 191, 36, 0.28)";
      context.shadowBlur = 12;
      context.stroke();
      context.restore();
    }
  });
}

const LoginStarfieldCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const starsRef = useRef<Star[]>([]);
  const pointerRef = useRef<PointerState>({ active: false, x: 0, y: 0 });
  const ripplesRef = useRef<Ripple[]>([]);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = reducedMotionQuery.matches;

    const resize = () => {
      const { width, height } = getCanvasSize(canvas);
      const ratio = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform?.(ratio, 0, 0, ratio, 0, 0);
      starsRef.current = createStars(width, height);
    };

    const draw = () => {
      const { width, height } = getCanvasSize(canvas);
      const pointer = pointerRef.current;
      const stars = starsRef.current;
      const timestamp = reducedMotionRef.current ? 0 : performance.now();
      const gravity = {
        x: width * BLACK_HOLE_GRAVITY.xRatio,
        y: height * BLACK_HOLE_GRAVITY.yRatio,
      };

      context.clearRect(0, 0, width, height);

      const accretionGlow = context.createRadialGradient(
        gravity.x,
        gravity.y,
        24,
        gravity.x,
        gravity.y,
        BLACK_HOLE_GRAVITY.radius,
      );
      accretionGlow.addColorStop(0, "rgba(0, 0, 0, 0)");
      accretionGlow.addColorStop(0.16, "rgba(251, 191, 36, 0.1)");
      accretionGlow.addColorStop(0.34, "rgba(245, 158, 11, 0.08)");
      accretionGlow.addColorStop(0.72, "rgba(59, 130, 246, 0.035)");
      accretionGlow.addColorStop(1, "rgba(2, 6, 23, 0)");
      context.fillStyle = accretionGlow;
      context.fillRect(0, 0, width, height);

      drawAccretionDisk(context, gravity.x, gravity.y, timestamp);
      drawGravityWave(context, gravity.x, gravity.y, 132, 0.16);
      drawGravityWave(context, gravity.x, gravity.y, 196, 0.1);

      const glow = context.createRadialGradient(
        pointer.active ? pointer.x : width * 0.55,
        pointer.active ? pointer.y : height * 0.52,
        0,
        pointer.active ? pointer.x : width * 0.55,
        pointer.active ? pointer.y : height * 0.52,
        pointer.active ? 280 : 180,
      );
      glow.addColorStop(0, "rgba(56, 189, 248, 0.1)");
      glow.addColorStop(0.45, "rgba(129, 140, 248, 0.04)");
      glow.addColorStop(1, "rgba(2, 6, 23, 0)");
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);

      stars.forEach((star, index) => {
        if (!reducedMotionRef.current) {
          star.x += star.vx;
          star.y += star.vy;

          if (star.x < -12) star.x = width + 12;
          if (star.x > width + 12) star.x = -12;
          if (star.y < -12) star.y = height + 12;
          if (star.y > height + 12) star.y = -12;

          if (pointer.active) {
            const dx = pointer.x - star.x;
            const dy = pointer.y - star.y;
            const distance = Math.hypot(dx, dy);
            if (distance < POINTER_RANGE && distance > 1) {
              const pull = (1 - distance / POINTER_RANGE) * 0.16;
              star.x += (dx / distance) * pull;
              star.y += (dy / distance) * pull;
            }
          }

          const gravityDx = gravity.x - star.x;
          const gravityDy = gravity.y - star.y;
          const gravityDistance = Math.hypot(gravityDx, gravityDy);
          if (
            gravityDistance < BLACK_HOLE_GRAVITY.radius &&
            gravityDistance > 36
          ) {
            const force =
              (1 - gravityDistance / BLACK_HOLE_GRAVITY.radius) *
              BLACK_HOLE_GRAVITY.pull;
            const tangent = force * 0.48;
            star.x += (gravityDx / gravityDistance) * force + (-gravityDy / gravityDistance) * tangent;
            star.y += (gravityDy / gravityDistance) * force + (gravityDx / gravityDistance) * tangent;
          }
        }

        for (let nextIndex = index + 1; nextIndex < stars.length; nextIndex += 1) {
          const next = stars[nextIndex];
          const distance = Math.hypot(star.x - next.x, star.y - next.y);

          if (distance < LINK_DISTANCE) {
            const midX = (star.x + next.x) / 2;
            const midY = (star.y + next.y) / 2;
            const pointerDistance = pointer.active
              ? Math.hypot(pointer.x - midX, pointer.y - midY)
              : POINTER_RANGE;
            const pointerBoost = pointer.active
              ? Math.max(0, 1 - pointerDistance / POINTER_RANGE)
              : 0;
            const gravityDistance = Math.hypot(gravity.x - midX, gravity.y - midY);
            const gravityBoost = Math.max(
              0,
              1 - gravityDistance / BLACK_HOLE_GRAVITY.radius,
            );
            const alpha =
              (1 - distance / LINK_DISTANCE) *
              (0.09 + pointerBoost * 0.34 + gravityBoost * 0.18);

            context.beginPath();
            context.moveTo(star.x, star.y);
            context.lineTo(next.x, next.y);
            context.strokeStyle =
              gravityBoost > 0.24
                ? `rgba(251, 191, 36, ${alpha})`
                : `rgba(125, 211, 252, ${alpha})`;
            context.lineWidth = 0.7 + pointerBoost * 0.9 + gravityBoost * 0.5;
            context.stroke();
          }
        }
      });

      stars.forEach((star) => {
        const distance = pointer.active
          ? Math.hypot(pointer.x - star.x, pointer.y - star.y)
          : POINTER_RANGE;
        const boost = pointer.active ? Math.max(0, 1 - distance / POINTER_RANGE) : 0;
        const gravityDistance = Math.hypot(gravity.x - star.x, gravity.y - star.y);
        const gravityBoost = Math.max(
          0,
          1 - gravityDistance / BLACK_HOLE_GRAVITY.radius,
        );
        const pulse = reducedMotionRef.current
          ? 0.45
          : 0.45 + Math.sin(timestamp / 700 + star.phase * 6.28) * 0.22;

        context.beginPath();
        context.arc(
          star.x,
          star.y,
          star.radius + boost * 1.9 + gravityBoost * 1.2,
          0,
          Math.PI * 2,
        );
        context.fillStyle =
          gravityBoost > 0.2
            ? `rgba(253, 186, 116, ${0.34 + pulse * 0.28 + gravityBoost * 0.38})`
            : starColor(star.hue, 0.38 + pulse * 0.32 + boost * 0.42);
        context.fill();
      });

      ripplesRef.current = ripplesRef.current
        .map((ripple) => ({ ...ripple, age: ripple.age + 1 }))
        .filter((ripple) => ripple.age < RIPPLE_LIFE);

      ripplesRef.current.forEach((ripple) => {
        const progress = ripple.age / RIPPLE_LIFE;
        const rippleRadius = 18 + progress * 150;

        drawGravityWave(
          context,
          ripple.x,
          ripple.y,
          rippleRadius,
          0.34 * (1 - progress),
        );
      });
    };

    const animate = () => {
      draw();
      if (!reducedMotionRef.current) {
        frameRef.current = window.requestAnimationFrame(animate);
      }
    };

    const handleMotionChange = (event: MediaQueryListEvent) => {
      reducedMotionRef.current = event.matches;
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      animate();
    };

    const updatePointerFromEvent = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerRef.current = {
        active: true,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    };

    const addRippleFromEvent = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      ripplesRef.current.push({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        age: 0,
      });
    };

    const resetPointer = () => {
      pointerRef.current = { active: false, x: 0, y: 0 };
    };

    resize();
    animate();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", updatePointerFromEvent);
    window.addEventListener("pointerdown", addRippleFromEvent);
    window.addEventListener("blur", resetPointer);
    reducedMotionQuery.addEventListener("change", handleMotionChange);

    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", updatePointerFromEvent);
      window.removeEventListener("pointerdown", addRippleFromEvent);
      window.removeEventListener("blur", resetPointer);
      reducedMotionQuery.removeEventListener("change", handleMotionChange);
    };
  }, []);

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    pointerRef.current = {
      active: true,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const handlePointerLeave = () => {
    pointerRef.current = { active: false, x: 0, y: 0 };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    ripplesRef.current.push({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      age: 0,
    });
  };

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="login-interactive-starfield"
      data-testid="login-starfield-canvas"
      onPointerDown={handlePointerDown}
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
    />
  );
};

export default LoginStarfieldCanvas;
