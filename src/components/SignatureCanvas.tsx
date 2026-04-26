/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useEffect, useState, MouseEvent, TouchEvent } from "react";
import { PenTool, Eraser, RotateCcw } from "lucide-react";

interface Props {
  onSave: (dataUrl: string) => void;
  onClear: () => void;
}

export default function SignatureCanvas({ onSave, onClear }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set display size and internal coordinate system
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.5;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = "#000000";
    }

    // Add event listeners with passive: false to allow preventDefault
    const handleTouchStart = (e: any) => e.preventDefault();
    const handleTouchMove = (e: any) => e.preventDefault();
    
    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  const getPos = (e: MouseEvent | TouchEvent | any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: MouseEvent | TouchEvent) => {
    if ("touches" in e) e.preventDefault();
    isDrawing.current = true;
    const pos = getPos(e);
    lastPos.current = pos;
    
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const draw = (e: MouseEvent | TouchEvent) => {
    if (!isDrawing.current) return;
    if ("touches" in e) e.preventDefault();
    
    const pos = getPos(e);
    const ctx = canvasRef.current?.getContext("2d");
    
    if (ctx) {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      if (isEmpty) setIsEmpty(false);
      lastPos.current = pos;
    }
  };

  const stopDrawing = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    if (!isEmpty) {
      onSave(canvasRef.current!.toDataURL());
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && canvas) {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      setIsEmpty(true);
      onClear();
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative group">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="h-48 w-full cursor-crosshair rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 touch-none transition-all group-hover:border-blue-300 shadow-inner"
        ></canvas>
        <div className="absolute right-3 top-3 flex gap-2">
          <button 
            type="button"
            onClick={clearCanvas} 
            className="rounded-lg bg-white p-2 text-gray-500 shadow-sm border border-gray-100 hover:text-red-500"
            title="지우기"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
        {isEmpty && (
          <div className="absolute inset-0 flex pointer-events-none items-center justify-center opacity-30">
            <div className="text-center">
              <PenTool className="mx-auto h-8 w-8 mb-2" />
              <p className="text-sm font-medium">여기에 서명을 해주세요</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
