import React, { useEffect, useRef, useState, useCallback } from 'react';
import { protocolConfigs, getProtocolLogoFilename } from '../lib/protocol-config';

interface Ball {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  logo: string;
  name: string;
  mass: number;
}

interface TradingAppsBackgroundProps {
  className?: string;
}

export function TradingAppsBackground({ className = '' }: TradingAppsBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: -1000, y: -1000 });
  const ballsRef = useRef<Ball[]>([]);
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const animationRef = useRef<number>();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const lastTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);

  // Initialize balls
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateDimensions = () => {
      const rect = canvas.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    // Create balls for each protocol - limit to prevent performance issues
    const maxBalls = 15; // Limit number of balls for performance
    const selectedProtocols = protocolConfigs
      .sort(() => Math.random() - 0.5) // Randomize
      .slice(0, maxBalls);
    
    const balls: Ball[] = selectedProtocols.map((protocol, index) => {
      const radius = 25 + Math.random() * 15; // Smaller size range 25-40
      return {
        id: protocol.id,
        x: Math.random() * (dimensions.width - radius * 2) + radius,
        y: dimensions.height - radius - Math.random() * 50, // Start near bottom
        vx: (Math.random() - 0.5) * 0.3,
        vy: 0,
        radius,
        logo: `/assets/logos/${getProtocolLogoFilename(protocol.id)}`,
        name: protocol.name,
        mass: radius / 25, // Mass proportional to size
      };
    });

    ballsRef.current = balls;

    // Preload images
    balls.forEach(ball => {
      const img = new Image();
      img.src = ball.logo;
      img.onerror = () => {
        // Create a fallback canvas with the first letter
        const fallbackCanvas = document.createElement('canvas');
        fallbackCanvas.width = ball.radius * 2;
        fallbackCanvas.height = ball.radius * 2;
        const ctx = fallbackCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#1a1a1a';
          ctx.beginPath();
          ctx.arc(ball.radius, ball.radius, ball.radius, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = '#666';
          ctx.font = `${ball.radius}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(ball.name[0].toUpperCase(), ball.radius, ball.radius);
        }
        
        const fallbackImg = new Image();
        fallbackImg.src = fallbackCanvas.toDataURL();
        imagesRef.current.set(ball.id, fallbackImg);
      };
      img.onload = () => {
        imagesRef.current.set(ball.id, img);
      };
    });

    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // Mouse move handler
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  // Mouse leave handler
  const handleMouseLeave = useCallback(() => {
    mouseRef.current = { x: -1000, y: -1000 };
  }, []);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gravity = 0.08;
    const friction = 0.995;
    const mouseRadius = 80;
    const mouseForce = 20;
    const dampening = 0.92;
    const maxVelocity = 15;

    const animate = (currentTime: number) => {
      // Limit to 30 FPS for better performance
      const targetFPS = 30;
      const frameInterval = 1000 / targetFPS;
      
      if (currentTime - lastTimeRef.current < frameInterval) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      
      lastTimeRef.current = currentTime;
      frameCountRef.current++;
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);
      
      const balls = ballsRef.current;
      const mouse = mouseRef.current;
      
      // Update each ball
      balls.forEach((ball, index) => {
        // Apply gravity
        ball.vy += gravity;
        
        // Mouse interaction
        const dx = mouse.x - ball.x;
        const dy = mouse.y - ball.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < mouseRadius + ball.radius && distance > 0) {
          // Calculate repulsion force
          const force = (mouseRadius + ball.radius - distance) / distance * mouseForce;
          ball.vx -= (dx / distance) * force / ball.mass;
          ball.vy -= (dy / distance) * force / ball.mass;
        }
        
        // Ball collision
        for (let j = index + 1; j < balls.length; j++) {
          const other = balls[j];
          const dx = other.x - ball.x;
          const dy = other.y - ball.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDistance = ball.radius + other.radius;
          
          if (distance < minDistance && distance > 0) {
            // Elastic collision
            const overlap = minDistance - distance;
            const separationX = dx / distance * overlap * 0.5;
            const separationY = dy / distance * overlap * 0.5;
            
            ball.x -= separationX;
            ball.y -= separationY;
            other.x += separationX;
            other.y += separationY;
            
            // Update velocities
            const normalX = dx / distance;
            const normalY = dy / distance;
            const relativeVelocity = {
              x: other.vx - ball.vx,
              y: other.vy - ball.vy,
            };
            
            const speed = relativeVelocity.x * normalX + relativeVelocity.y * normalY;
            if (speed < 0) return;
            
            const impulse = 2 * speed / (ball.mass + other.mass);
            ball.vx += impulse * other.mass * normalX;
            ball.vy += impulse * other.mass * normalY;
            other.vx -= impulse * ball.mass * normalX;
            other.vy -= impulse * ball.mass * normalY;
          }
        }
        
        // Apply friction
        ball.vx *= friction;
        ball.vy *= friction;
        
        // Limit velocity
        const velocity = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        if (velocity > maxVelocity) {
          ball.vx = (ball.vx / velocity) * maxVelocity;
          ball.vy = (ball.vy / velocity) * maxVelocity;
        }
        
        // Update position
        ball.x += ball.vx;
        ball.y += ball.vy;
        
        // Boundary collision
        if (ball.x - ball.radius < 0) {
          ball.x = ball.radius;
          ball.vx = -ball.vx * dampening;
        } else if (ball.x + ball.radius > dimensions.width) {
          ball.x = dimensions.width - ball.radius;
          ball.vx = -ball.vx * dampening;
        }
        
        if (ball.y - ball.radius < 0) {
          ball.y = ball.radius;
          ball.vy = -ball.vy * dampening;
        } else if (ball.y + ball.radius > dimensions.height) {
          ball.y = dimensions.height - ball.radius;
          ball.vy = -ball.vy * dampening;
          
          // Add small random horizontal movement when hitting bottom
          if (Math.abs(ball.vy) < 0.1 && Math.abs(ball.vx) < 0.1) {
            ball.vx += (Math.random() - 0.5) * 0.3;
          }
        }
        
        // Draw ball
        const img = imagesRef.current.get(ball.id);
        if (img && img.complete) {
          ctx.save();
          
          // Create circular clipping path
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          
          // Draw the image
          ctx.drawImage(
            img,
            ball.x - ball.radius,
            ball.y - ball.radius,
            ball.radius * 2,
            ball.radius * 2
          );
          
          ctx.restore();
          
          // Add subtle border
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // Fallback circle
          ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    // Add event listeners
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [dimensions, handleMouseMove, handleMouseLeave]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-auto ${className}`}
      style={{ 
        opacity: 0.2,
        filter: 'blur(0.5px)',
        willChange: 'transform',
      }}
    />
  );
}