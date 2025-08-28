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

    // Create many small balls with random protocols
    const totalBalls = 80; // Many more balls
    const balls: Ball[] = [];
    
    for (let i = 0; i < totalBalls; i++) {
      const protocol = protocolConfigs[Math.floor(Math.random() * protocolConfigs.length)];
      const radius = 10 + Math.random() * 5; // Much smaller: 10-15
      
      balls.push({
        id: `${protocol.id}-${i}`,
        x: Math.random() * (dimensions.width - radius * 2) + radius,
        y: Math.random() * (dimensions.height - radius * 2) + radius, // Start at random positions
        vx: 0, // Start stationary
        vy: 0,
        radius,
        logo: `/assets/logos/${getProtocolLogoFilename(protocol.id)}`,
        name: protocol.name,
        mass: radius / 10,
      });
    }

    ballsRef.current = balls;

    // Preload images with simpler approach
    balls.forEach(ball => {
      const img = new Image();
      img.src = ball.logo;
      
      // Store image directly once loaded
      img.onload = () => {
        imagesRef.current.set(ball.id, img);
      };
      
      img.onerror = () => {
        // Don't set anything on error - let the fallback handle it
        console.log(`Failed to load logo for ${ball.name}`);
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

    const gravity = 0.05; // Much gentler gravity
    const friction = 0.99; // Higher friction for stability
    const groundFriction = 0.95; // Very high ground friction
    const mouseRadius = 50; // Smaller interaction radius
    const mouseForce = 8; // Gentler mouse force
    const dampening = 0.5; // More dampening
    const maxVelocity = 8; // Lower max velocity
    const restThreshold = 0.1; // Lower threshold for rest

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
        // Apply gravity only if not settled
        const isOnGround = ball.y >= (dimensions.height - ball.radius - 1);
        const isResting = isOnGround && Math.abs(ball.vy) < restThreshold && Math.abs(ball.vx) < restThreshold;
        
        if (!isResting) {
          ball.vy += gravity;
        } else {
          // Force to rest position
          ball.y = dimensions.height - ball.radius;
          ball.vy = 0;
          ball.vx *= 0.9; // Quick horizontal stop
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
        
        // Ball collision - stack like Tetris
        for (let j = 0; j < balls.length; j++) {
          if (j === index) continue;
          
          const other = balls[j];
          const dx = other.x - ball.x;
          const dy = other.y - ball.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDistance = ball.radius + other.radius;
          
          if (distance < minDistance && distance > 0) {
            // Check if ball is above the other (falling onto it)
            if (ball.y < other.y && ball.vy > 0) {
              // Stack on top
              ball.y = other.y - ball.radius - other.radius;
              ball.vy = 0;
              ball.vx *= 0.5; // Reduce horizontal movement when stacking
            } else if (distance < minDistance * 0.9) {
              // Side collision - just separate horizontally
              const overlap = minDistance - distance;
              const separationX = (dx / distance) * overlap;
              
              if (ball.x < other.x) {
                ball.x -= separationX * 0.5;
              } else {
                ball.x += separationX * 0.5;
              }
            }
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
        
        // Draw ball
        ctx.save();
        
        // Create circular clipping path first
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.closePath();
        
        // Fill background with solid color
        ctx.fillStyle = '#1a1a1a';
        ctx.fill();
        
        // Clip for image
        ctx.clip();
        
        if (img && img.complete && img.naturalWidth > 0) {
          // Enable image smoothing for better quality
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          // Draw the image with preserved aspect ratio
          try {
            // Calculate aspect ratio
            const imgAspect = img.naturalWidth / img.naturalHeight;
            let drawWidth = ball.radius * 2;
            let drawHeight = ball.radius * 2;
            let offsetX = 0;
            let offsetY = 0;
            
            if (imgAspect > 1) {
              // Wider than tall
              drawHeight = drawWidth / imgAspect;
              offsetY = (ball.radius * 2 - drawHeight) / 2;
            } else if (imgAspect < 1) {
              // Taller than wide
              drawWidth = drawHeight * imgAspect;
              offsetX = (ball.radius * 2 - drawWidth) / 2;
            }
            
            ctx.drawImage(
              img,
              ball.x - ball.radius + offsetX,
              ball.y - ball.radius + offsetY,
              drawWidth,
              drawHeight
            );
          } catch (e) {
            // If image fails to draw, show initial
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = `${ball.radius}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(ball.name[0].toUpperCase(), ball.x, ball.y);
          }
        } else {
          // Fallback - show initial
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.font = `${ball.radius}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(ball.name[0].toUpperCase(), ball.x, ball.y);
        }
        
        ctx.restore();
        
        // Add subtle border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.5;
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
        opacity: 0.4,
        willChange: 'transform',
      }}
    />
  );
}