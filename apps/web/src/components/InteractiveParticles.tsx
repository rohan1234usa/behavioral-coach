'use client';
import React, { useRef, useEffect } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseX: number;
  baseY: number;
  size: number;
  color: string;
}

export default function InteractiveParticles({ 
  text = "Retrieving Archive...", 
  subtext = ""
}: { 
  text?: string,
  subtext?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let particles: Particle[] = [];
    let animationFrameId: number;
    
    // Mouse interaction state
    const mouse = {
      x: -1000,
      y: -1000,
      radius: 120,    // How far the mouse repels
      isClicking: false
    };
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      // Density based on screen size
      const numberOfParticles = Math.floor((canvas.width * canvas.height) / 8000);
      
      for (let i = 0; i < numberOfParticles; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        particles.push({
          x,
          y,
          baseX: x,
          baseY: y,
          vx: (Math.random() - 0.5) * 0.5, // Slow drift
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 2 + 1,
          color: `rgba(255, 255, 255, ${Math.random() * 0.3 + 0.1})` // Subtle white/grey
        });
      }
    };
    
    const drawParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(p => {
        // Natural drift if moving very slowly
        if (Math.abs(p.vx) < 0.05 && Math.abs(p.vy) < 0.05) {
          p.vx += (Math.random() - 0.5) * 0.1;
          p.vy += (Math.random() - 0.5) * 0.1;
        }

        // Mouse interaction
        if (mouse.x !== -1000) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1; // Prevent div by 0
          
          if (mouse.isClicking) {
            // GRAVITY WELL (Attract) - Much larger radius to pull them in
            if (distance < mouse.radius * 4) {
              const forceDirectionX = dx / distance;
              const forceDirectionY = dy / distance;
              // Stronger pull the further away they are within the radius (elastic feel)
              const force = (distance / (mouse.radius * 4)) * 1.5;
              
              p.vx += forceDirectionX * force;
              p.vy += forceDirectionY * force;
            }
          } else {
            // REPULSION FIELD (Repel)
            if (distance < mouse.radius) {
              const forceDirectionX = dx / distance;
              const forceDirectionY = dy / distance;
              // Stronger push the closer they are
              const force = (mouse.radius - distance) / mouse.radius;
              
              p.vx -= forceDirectionX * force * 2;
              p.vy -= forceDirectionY * force * 2;
            }
          }
        }

        // Friction / Air Resistance
        p.vx *= 0.92;
        p.vy *= 0.92;

        // Apply velocity to position
        p.x += p.vx;
        p.y += p.vy;
        
        // Wrap around screen smoothly
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        
        // Draw
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });
      
      // Draw connecting lines for nearby particles
      ctx.lineWidth = 0.5;
      for (let a = 0; a < particles.length; a++) {
        for (let b = a; b < particles.length; b++) {
          const dx = particles[a].x - particles[b].x;
          const dy = particles[a].y - particles[b].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 70) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 - distance / 700})`;
            ctx.moveTo(particles[a].x, particles[a].y);
            ctx.lineTo(particles[b].x, particles[b].y);
            ctx.stroke();
          }
        }
      }
      
      animationFrameId = requestAnimationFrame(drawParticles);
    };
    
    // Event Listeners
    window.addEventListener('resize', resizeCanvas);
    
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
      }
    };
    
    const handleMouseDown = () => { mouse.isClicking = true; };
    const handleMouseUp = () => { mouse.isClicking = false; };
    const handleMouseLeave = () => { mouse.x = -1000; mouse.y = -1000; };
    
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('touchstart', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    
    // Initialization
    resizeCanvas();
    drawParticles();
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
      if (canvas) {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('mousedown', handleMouseDown);
        canvas.removeEventListener('touchstart', handleMouseDown);
        canvas.removeEventListener('mouseleave', handleMouseLeave);
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-background overflow-hidden z-[100] cursor-crosshair">
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full block"
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        
        {/* Subtle glowing ring behind the text */}
        <div className="absolute w-48 h-48 rounded-full border border-primary/10 bg-primary/5 animate-pulse blur-xl"></div>
        
        {/* Text Container */}
        <div className="relative z-10 flex flex-col items-center bg-background/50 backdrop-blur-md px-12 py-8 rounded-2xl border border-border shadow-2xl">
           <div className="w-10 h-10 border-2 border-border border-t-accent rounded-full animate-spin mb-6"></div>
           <h2 className="text-xl font-sans font-bold text-foreground tracking-tight mb-2">
             {text}
           </h2>
           <p className="text-sm font-mono text-muted-foreground opacity-80 animate-fade-in-up">
             {subtext}
           </p>
        </div>
      </div>
    </div>
  );
}
