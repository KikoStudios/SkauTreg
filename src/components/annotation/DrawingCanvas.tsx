"use client";

import { useRef, useState, useEffect } from "react";
import styles from "./Annotator.module.css";

interface DrawingCanvasProps {
    imageWidth: number;
    imageHeight: number;
    color?: string;
    onDrawingComplete: (svgPath: string) => void;
}

export default function DrawingCanvas({
    imageWidth,
    imageHeight,
    color = "#fcd34d",
    onDrawingComplete
}: DrawingCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [path, setPath] = useState<{ x: number; y: number }[]>([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = imageWidth;
        canvas.height = imageHeight;
    }, [imageWidth, imageHeight]);

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setIsDrawing(true);
        setPath([{ x, y }]);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const newPath = [...path, { x, y }];
        setPath(newPath);

        // Draw on canvas
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        if (path.length > 0) {
            ctx.beginPath();
            ctx.moveTo(path[path.length - 1].x, path[path.length - 1].y);
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    };

    const endDrawing = () => {
        if (!isDrawing || path.length < 2) {
            setIsDrawing(false);
            setPath([]);
            return;
        }

        // Convert path to SVG
        const svgPath = `M ${path.map(p => `${p.x},${p.y}`).join(" L ")}`;
        onDrawingComplete(svgPath);

        setIsDrawing(false);
        setPath([]);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setPath([]);
    };

    return (
        <canvas
            ref={canvasRef}
            className={styles.canvas}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={endDrawing}
            onMouseLeave={endDrawing}
        />
    );
}
