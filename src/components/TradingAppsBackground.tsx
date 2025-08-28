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
      const spacing = (dimensions.width - 100) / maxBalls;
      return {
        id: protocol.id,
        x: 50 + (index * spacing) + (Math.random() - 0.5) * 20,
        y: 100 + Math.random() * 200, // Start from top to drop down
        vx: 0, // No initial horizontal velocity
        vy: 0,
        radius,
        logo: `/assets/logos/${getProtocolLogoFilename(protocol.id)}`,
        name: protocol.name,
        mass: radius / 25, // Mass proportional to size
      };
    });

    ballsRef.current = balls;

    // Preload images immediately
    balls.forEach(ball => {
      const img = new Image();
      // Remove crossOrigin to avoid CORS issues with local assets
      
      // Set a placeholder first to prevent flickering
      const placeholderCanvas = document.createElement('canvas');
      placeholderCanvas.width = ball.radius * 2;
      placeholderCanvas.height = ball.radius * 2;
      const pCtx = placeholderCanvas.getContext('2d');
      if (pCtx) {
        pCtx.fillStyle = 'rgba(30, 30, 30, 0.8)';
        pCtx.beginPath();
        pCtx.arc(ball.radius, ball.radius, ball.radius, 0, Math.PI * 2);
        pCtx.fill();
        
        pCtx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        pCtx.font = `${ball.radius}px Arial`;
        pCtx.textAlign = 'center';
        pCtx.textBaseline = 'middle';
        pCtx.fillText(ball.name[0].toUpperCase(), ball.radius, ball.radius);
      }
      
      const placeholderImg = new Image();
      placeholderImg.src = placeholderCanvas.toDataURL();
      imagesRef.current.set(ball.id, placeholderImg);
      
      // Then load the actual image
      img.onload = () => {
        // Create a properly sized canvas for the logo
        const logoCanvas = document.createElement('canvas');
        logoCanvas.width = ball.radius * 2;
        logoCanvas.height = ball.radius * 2;
        const logoCtx = logoCanvas.getContext('2d');
        if (logoCtx) {
          logoCtx.drawImage(img, 0, 0, ball.radius * 2, ball.radius * 2);
        }
        
        const logoImg = new Image();
        logoImg.src = logoCanvas.toDataURL();
        logoImg.onload = () => {
          imagesRef.current.set(ball.id, logoImg);
        };
      };
      
      img.onerror = () => {
        // Keep the placeholder on error
        console.log(`Failed to load logo for ${ball.name}`);
      };
      
      img.src = ball.logo;
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

    const gravity = 0.15;
    const friction = 0.98;
    const groundFriction = 0.85; // Higher friction when on ground
    const mouseRadius = 100;
    const mouseForce = 30;
    const dampening = 0.7;
    const maxVelocity = 20;
    const restThreshold = 0.5; // Velocity threshold to consider ball at rest

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
        // Only apply gravity if not resting on ground
        const isOnGround = Math.abs(ball.y - (dimensions.height - ball.radius)) < 1;
        if (!isOnGround) {
          ball.vy += gravity;
        }
        
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
        
        // Apply friction (higher friction on ground)
        if (isOnGround) {
          ball.vx *= groundFriction;
          ball.vy *= friction;
          
          // Stop tiny movements when on ground
          if (Math.abs(ball.vx) < restThreshold) ball.vx = 0;
          if (Math.abs(ball.vy) < restThreshold) ball.vy = 0;
        } else {
          ball.vx *= friction;
          ball.vy *= friction;
        }
        
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
          
          // Stop bouncing if velocity is too small
          if (Math.abs(ball.vy) < restThreshold) {
            ball.vy = 0;
          }
        }
        
        // Draw ball with double buffering to prevent flicker
        const img = imagesRef.current.get(ball.id);
        
        ctx.save();
        
        // Always draw the ball background first
        ctx.fillStyle = 'rgba(20, 20, 20, 0.9)';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        
        if (img && img.complete && img.naturalWidth > 0) {
          // Create circular clipping path
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.radius - 1, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          
          // Draw the image
          try {
            ctx.drawImage(
              img,
              ball.x - ball.radius,
              ball.y - ball.radius,
              ball.radius * 2,
              ball.radius * 2
            );
          } catch (e) {
            // If image fails to draw, it will show the background
          }
        }
        
        ctx.restore();
        
        // Always add border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.stroke();
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
        opacity: 0.6,
        willChange: 'transform',
      }}
    />
  );
}